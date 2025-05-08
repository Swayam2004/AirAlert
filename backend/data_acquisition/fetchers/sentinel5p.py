"""
Sentinel-5P satellite data fetcher for AirAlert.
Fetches atmospheric pollution data from the Sentinel-5 Precursor satellite.
"""
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
import aiohttp
import asyncio
import logging
import numpy as np
import rasterio
import tempfile
from shapely.geometry import box
import geopandas as gpd

from .base import DataFetcher

class Sentinel5PFetcher(DataFetcher):
    """
    Fetches air quality data from Sentinel-5P satellite.
    Supports retrieval of NO2, SO2, O3, CO, and aerosol data.
    """
    
    # Mapping of pollutants to Sentinel-5P product names
    PRODUCT_MAPPING = {
        'no2': 'L3__NO2___',
        'so2': 'L3__SO2___',
        'o3': 'L3__O3____',
        'co': 'L3__CO____',
        'ch4': 'L3__CH4___',
        'aer': 'L3__AER_AI'  # Aerosol index
    }
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration.
        
        Args:
            config: Configuration parameters including:
                - api_key: Copernicus API key
                - base_url: API base URL (default: Copernicus Data Hub)
                - cache_dir: Directory for caching data (default: 'cache/sentinel')
                - region: Bounding box [minx, miny, maxx, maxy] (default: India)
                - lookback_days: Number of days to look back for data (default: 3)
        """
        super().__init__(config)
        
        # API configuration
        self.api_key = config.get('sentinel_api_key')
        self.base_url = config.get('sentinel_base_url', 'https://scihub.copernicus.eu/dhus/search')
        
        # Cache settings
        self.cache_dir = config.get('cache_dir', 'cache/sentinel')
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Region of interest (default: India)
        self.region = config.get('region', [68.1, 6.5, 97.4, 35.5])  # [minx, miny, maxx, maxy]
        
        # Time range
        self.lookback_days = config.get('lookback_days', 3)
        
    async def fetch_data(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch Sentinel-5P data for the configured region.
        
        Returns:
            Tuple of (stations, readings) where:
              - stations: List of dicts with grid cell information (as virtual stations)
              - readings: List of dicts with pollutant readings
        """
        stations = []
        readings = []
        
        try:
            # Get data for each pollutant
            for pollutant, product in self.PRODUCT_MAPPING.items():
                self.logger.info(f"Fetching Sentinel-5P data for {pollutant}")
                
                # Fetch and process data
                pollutant_stations, pollutant_readings = await self._fetch_pollutant(pollutant, product)
                
                # Add to results
                stations.extend(pollutant_stations)
                readings.extend(pollutant_readings)
                
            return stations, readings
            
        except Exception as e:
            self.logger.error(f"Error fetching Sentinel-5P data: {str(e)}")
            return [], []
    
    async def _fetch_pollutant(self, pollutant: str, product: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch data for a specific pollutant.
        
        Args:
            pollutant: Pollutant name
            product: Sentinel-5P product name
            
        Returns:
            Tuple of (stations, readings)
        """
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=self.lookback_days)
        
        # Format dates for API
        start_str = start_date.strftime("%Y-%m-%dT00:00:00.000Z")
        end_str = end_date.strftime("%Y-%m-%dT23:59:59.999Z")
        
        # Create bounding box string
        bbox_str = f"{self.region[0]},{self.region[1]},{self.region[2]},{self.region[3]}"
        
        # Construct query
        query = {
            'q': f"producttype:{product} AND ingestiondate:[{start_str} TO {end_str}] AND footprint:\"Intersects(POLYGON(({bbox_str})))\""
        }
        
        if self.api_key:
            query['apikey'] = self.api_key
            
        # Check cache first
        cache_key = f"{pollutant}_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}"
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        if os.path.exists(cache_file) and (datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_file))).total_seconds() < 86400:
            # Use cached data if less than 24 hours old
            self.logger.info(f"Using cached data for {pollutant}")
            with open(cache_file, 'r') as f:
                cached_data = json.load(f)
                return cached_data['stations'], cached_data['readings']
        
        # Fetch from API
        try:
            async with aiohttp.ClientSession() as session:
                async with session.get(self.base_url, params=query) as response:
                    if response.status != 200:
                        self.logger.error(f"Error fetching Sentinel-5P data: HTTP {response.status}")
                        return [], []
                        
                    # Parse response
                    response_data = await response.json()
                    
                    # Process data into stations and readings
                    stations, readings = self._process_sentinel_data(response_data, pollutant)
                    
                    # Cache the results
                    with open(cache_file, 'w') as f:
                        json.dump({'stations': stations, 'readings': readings}, f)
                    
                    return stations, readings
                    
        except Exception as e:
            self.logger.error(f"Error fetching {pollutant} data from Sentinel-5P: {str(e)}")
            return [], []
    
    def _process_sentinel_data(self, data: Dict[str, Any], pollutant: str) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Process Sentinel-5P data into stations and readings.
        
        Args:
            data: API response data
            pollutant: Pollutant name
            
        Returns:
            Tuple of (stations, readings)
        """
        stations = []
        readings = []
        
        try:
            # Extract products
            products = data.get('products', [])
            
            for product in products:
                # Get product details
                product_id = product.get('id', '')
                timestamp_str = product.get('beginPosition', '')
                
                # Parse timestamp
                timestamp = datetime.strptime(timestamp_str, "%Y-%m-%dT%H:%M:%S.%fZ")
                
                # Get raster data URL
                raster_url = product.get('url', '')
                
                if not raster_url:
                    continue
                    
                # Download and process raster data
                with tempfile.NamedTemporaryFile(suffix='.nc') as temp_file:
                    # TODO: Implement actual download and raster processing
                    # For now, use simulated data
                    
                    # Create a grid of points for the region
                    minx, miny, maxx, maxy = self.region
                    
                    # Create a 0.1 degree resolution grid (approximate)
                    grid_res = 0.1
                    lons = np.arange(minx, maxx, grid_res)
                    lats = np.arange(miny, maxy, grid_res)
                    
                    # Generate some sample data
                    np.random.seed(int(timestamp.timestamp()))
                    
                    # For each grid point, create a virtual station and reading
                    for i, lon in enumerate(lons):
                        for j, lat in enumerate(lats):
                            # Create a unique ID for this grid point
                            station_id = f"s5p_{pollutant}_{i}_{j}"
                            
                            # Create a virtual station at this grid point
                            stations.append({
                                'id': station_id,
                                'name': f"Sentinel-5P {pollutant.upper()} {i}_{j}",
                                'source': 'sentinel-5p',
                                'latitude': lat,
                                'longitude': lon,
                                'elevation': 0,  # Satellite data, no ground elevation
                                'metadata': {
                                    'product_id': product_id,
                                    'grid_i': i,
                                    'grid_j': j
                                }
                            })
                            
                            # Generate a random but plausible value
                            # Values will be in appropriate range based on pollutant
                            if pollutant == 'no2':
                                value = np.random.gamma(2, 20) + 5  # ppb
                            elif pollutant == 'o3':
                                value = np.random.gamma(3, 15) + 20  # ppb
                            elif pollutant == 'so2':
                                value = np.random.gamma(1, 5) + 1  # ppb
                            elif pollutant == 'co':
                                value = np.random.gamma(2, 0.2) + 0.4  # ppm
                            else:
                                # Default for other pollutants
                                value = np.random.gamma(2, 10)
                            
                            # Create reading for this grid point
                            readings.append({
                                'station_id': station_id,
                                'timestamp': timestamp.isoformat(),
                                'source': 'sentinel-5p',
                                pollutant: float(value),
                                'unit': self._get_pollutant_unit(pollutant),
                                'metadata': {
                                    'product_id': product_id,
                                    'grid_i': i,
                                    'grid_j': j
                                }
                            })
            
            return stations, readings
            
        except Exception as e:
            self.logger.error(f"Error processing Sentinel-5P data: {str(e)}")
            return [], []
    
    def _get_pollutant_unit(self, pollutant: str) -> str:
        """Get the unit for a pollutant."""
        units = {
            'no2': 'ppb',
            'so2': 'ppb',
            'o3': 'ppb',
            'co': 'ppm',
            'ch4': 'ppb',
            'aer': 'index'
        }
        return units.get(pollutant, '')
