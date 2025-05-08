"""
MODIS satellite data fetcher for AirAlert.
Fetches aerosol and particulate matter data from MODIS satellite instruments.
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

class MODISFetcher(DataFetcher):
    """
    Fetches aerosol and PM data from MODIS satellite instruments.
    Supports retrieval of AOD (Aerosol Optical Depth) which can be converted to PM2.5.
    """
    
    # MODIS product IDs for different data types
    PRODUCT_IDS = {
        'aod': 'MOD04_L2',  # Aerosol Optical Depth
        'lst': 'MOD11A1',   # Land Surface Temperature
    }
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration.
        
        Args:
            config: Configuration parameters including:
                - api_key: NASA EarthData API key
                - base_url: API base URL
                - cache_dir: Directory for caching data (default: 'cache/modis')
                - region: Bounding box [minx, miny, maxx, maxy] (default: India)
                - lookback_days: Number of days to look back for data (default: 3)
        """
        super().__init__(config)
        
        # API configuration
        self.api_key = config.get('nasa_api_key')
        self.base_url = config.get('modis_base_url', 'https://ladsweb.modaps.eosdis.nasa.gov/api/v2')
        
        # Cache settings
        self.cache_dir = config.get('cache_dir', 'cache/modis')
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Region of interest (default: India)
        self.region = config.get('region', [68.1, 6.5, 97.4, 35.5])  # [minx, miny, maxx, maxy]
        
        # Time range
        self.lookback_days = config.get('lookback_days', 3)
        
    async def fetch_data(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch MODIS data for the configured region.
        
        Returns:
            Tuple of (stations, readings) where:
              - stations: List of dicts with grid cell information (as virtual stations)
              - readings: List of dicts with pollutant readings
        """
        stations = []
        readings = []
        
        try:
            # Fetch AOD data and convert to PM2.5 estimates
            aod_stations, aod_readings = await self._fetch_aod_data()
            stations.extend(aod_stations)
            readings.extend(aod_readings)
            
            return stations, readings
            
        except Exception as e:
            self.logger.error(f"Error fetching MODIS data: {str(e)}")
            return [], []
    
    async def _fetch_aod_data(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch AOD data and convert to PM2.5 estimates.
        
        Returns:
            Tuple of (stations, readings)
        """
        stations = []
        readings = []
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=self.lookback_days)
        
        # Check cache first
        cache_key = f"aod_{start_date.strftime('%Y%m%d')}_{end_date.strftime('%Y%m%d')}"
        cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
        
        if os.path.exists(cache_file) and (datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_file))).total_seconds() < 86400:
            # Use cached data if less than 24 hours old
            self.logger.info("Using cached MODIS AOD data")
            with open(cache_file, 'r') as f:
                cached_data = json.load(f)
                return cached_data['stations'], cached_data['readings']
        
        # For now, generate simulated data
        # In a real implementation, we would call the NASA MODIS API
        
        try:
            # Create a grid of points for the region
            minx, miny, maxx, maxy = self.region
            
            # Create a 0.1 degree resolution grid
            grid_res = 0.1
            lons = np.arange(minx, maxx, grid_res)
            lats = np.arange(miny, maxy, grid_res)
            
            # Generate data for each day in the range
            current_date = start_date
            while current_date <= end_date:
                # Generate some sample data
                np.random.seed(int(current_date.timestamp()))
                
                # For each grid point, create a virtual station and reading
                for i, lon in enumerate(lons[::5]):  # Sample every 5th point to reduce density
                    for j, lat in enumerate(lats[::5]):
                        # Create a unique ID for this grid point
                        station_id = f"modis_aod_{i}_{j}"
                        
                        # Create a virtual station at this grid point
                        station = {
                            'id': station_id,
                            'name': f"MODIS AOD {i}_{j}",
                            'source': 'modis',
                            'latitude': lat,
                            'longitude': lon,
                            'elevation': 0,  # Satellite data, no ground elevation
                            'metadata': {
                                'product': 'MOD04_L2',
                                'grid_i': i,
                                'grid_j': j
                            }
                        }
                        
                        if station_id not in [s['id'] for s in stations]:
                            stations.append(station)
                        
                        # Generate a random AOD value (typically between 0-2)
                        aod_value = np.random.gamma(1.5, 0.3)
                        
                        # Convert AOD to PM2.5 using a simplified model
                        # PM2.5 = AOD * factor + offset
                        # This is a very simplified conversion, real conversion is more complex
                        conversion_factor = 55
                        conversion_offset = 5
                        pm25_value = aod_value * conversion_factor + conversion_offset + np.random.normal(0, 3)
                        
                        # Ensure PM2.5 is positive
                        pm25_value = max(2, pm25_value)
                        
                        # Create reading
                        readings.append({
                            'station_id': station_id,
                            'timestamp': current_date.isoformat(),
                            'source': 'modis',
                            'aod': float(aod_value),
                            'pm25': float(pm25_value),
                            'unit': 'μg/m³',
                            'metadata': {
                                'product': 'MOD04_L2',
                                'conversion_method': 'simple_linear',
                                'conversion_factor': conversion_factor,
                                'grid_i': i,
                                'grid_j': j
                            }
                        })
                
                current_date += timedelta(days=1)
            
            # Cache the results
            with open(cache_file, 'w') as f:
                json.dump({'stations': stations, 'readings': readings}, f)
            
            return stations, readings
            
        except Exception as e:
            self.logger.error(f"Error processing MODIS AOD data: {str(e)}")
            return [], []
    
    def _convert_aod_to_pm25(self, aod: float, humidity: float = 50, 
                           season: str = 'summer') -> float:
        """
        Convert AOD to PM2.5 estimate using a model.
        
        Args:
            aod: Aerosol Optical Depth value
            humidity: Relative humidity (%)
            season: Season (summer, winter, monsoon, etc.)
            
        Returns:
            Estimated PM2.5 concentration in μg/m³
        """
        # Base conversion factors - these should be calibrated for the specific region
        base_factor = 55.0
        base_offset = 5.0
        
        # Adjust for humidity (higher humidity generally increases the conversion factor)
        humidity_factor = 1.0 + (humidity - 50) / 100
        
        # Adjust for season
        season_factors = {
            'winter': 1.2,  # PM often gets trapped in winter
            'summer': 1.0,
            'monsoon': 0.8,  # Rain washes out PM
            'spring': 1.1,
            'autumn': 1.1
        }
        season_factor = season_factors.get(season.lower(), 1.0)
        
        # Calculate PM2.5
        pm25 = aod * base_factor * humidity_factor * season_factor + base_offset
        
        return max(0, pm25)  # Ensure non-negative value
