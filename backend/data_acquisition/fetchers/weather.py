"""
Weather data fetchers for AirAlert.
Fetches meteorological data from various sources like NOAA and IMD.
"""
import os
import json
from datetime import datetime, timedelta
from typing import Dict, List, Any, Tuple, Optional
import aiohttp
import asyncio
import logging
import numpy as np
import geopandas as gpd

from .base import DataFetcher

class NOAAWeatherFetcher(DataFetcher):
    """
    Fetches meteorological data from NOAA APIs.
    Supports temperature, humidity, wind speed, wind direction, and precipitation.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration.
        
        Args:
            config: Configuration parameters including:
                - api_key: NOAA API key
                - base_url: API base URL
                - cache_dir: Directory for caching data
                - region: Bounding box [minx, miny, maxx, maxy]
                - lookback_days: Number of days to look back for data
        """
        super().__init__(config)
        
        # API configuration
        self.api_key = config.get('noaa_api_key')
        self.base_url = config.get('noaa_base_url', 'https://www.ncdc.noaa.gov/cdo-web/api/v2')
        
        # Cache settings
        self.cache_dir = config.get('cache_dir', 'cache/weather')
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Region of interest (default: India)
        self.region = config.get('region', [68.1, 6.5, 97.4, 35.5])
        
        # Time range
        self.lookback_days = config.get('lookback_days', 3)
    
    async def fetch_data(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch weather data for the configured region.
        
        Returns:
            Tuple of (stations, readings) where:
              - stations: List of dicts with weather station information
              - readings: List of dicts with meteorological readings
        """
        stations = []
        readings = []
        
        try:
            # Check cache first
            cache_key = f"noaa_{datetime.now().strftime('%Y%m%d')}"
            cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
            
            if os.path.exists(cache_file) and (datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_file))).total_seconds() < 43200:  # 12 hours
                # Use cached data if less than 12 hours old
                self.logger.info("Using cached NOAA weather data")
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    return cached_data['stations'], cached_data['readings']
            
            # Fetch weather station data first
            stations = await self._fetch_stations()
            
            if not stations:
                return [], []
            
            # Fetch weather data for each station
            for station in stations:
                station_readings = await self._fetch_station_readings(station['id'])
                readings.extend(station_readings)
            
            # Cache the results
            with open(cache_file, 'w') as f:
                json.dump({'stations': stations, 'readings': readings}, f)
            
            return stations, readings
            
        except Exception as e:
            self.logger.error(f"Error fetching NOAA weather data: {str(e)}")
            return [], []
    
    async def _fetch_stations(self) -> List[Dict[str, Any]]:
        """
        Fetch weather stations in the region.
        
        Returns:
            List of station information dictionaries
        """
        stations = []
        
        minx, miny, maxx, maxy = self.region
        
        # In a real implementation, we would query the NOAA API
        # For now, generate some simulated weather stations
        
        # Generate random but plausible station locations within the region
        np.random.seed(42)  # For reproducibility
        
        # Create ~20 weather stations across the region
        num_stations = 20
        for i in range(num_stations):
            # Random location within the region
            lon = np.random.uniform(minx, maxx)
            lat = np.random.uniform(miny, maxy)
            
            station_id = f"noaa_ws_{i+1:02d}"
            
            stations.append({
                'id': station_id,
                'name': f"NOAA Weather Station {i+1}",
                'source': 'noaa',
                'latitude': float(lat),
                'longitude': float(lon),
                'elevation': float(np.random.uniform(0, 1000)),  # Random elevation
                'metadata': {
                    'station_type': 'meteorological',
                    'parameters': ['temperature', 'humidity', 'wind_speed', 'wind_direction', 'precipitation']
                }
            })
        
        return stations
    
    async def _fetch_station_readings(self, station_id: str) -> List[Dict[str, Any]]:
        """
        Fetch weather readings for a specific station.
        
        Args:
            station_id: ID of the weather station
            
        Returns:
            List of weather readings
        """
        readings = []
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=self.lookback_days)
        
        # In a real implementation, we would query the NOAA API
        # For now, generate some simulated weather data
        
        # Use station_id as seed for reproducible randomness
        seed = int(''.join([str(ord(c)) for c in station_id]))
        np.random.seed(seed)
        
        # Generate data for each hour in the range
        current_date = start_date
        while current_date <= end_date:
            # Generate random but plausible weather values
            temp_c = np.random.normal(25, 8)  # Mean 25°C with 8°C std dev
            humidity = np.random.beta(2, 2) * 100  # Beta distribution scaled to 0-100%
            wind_speed = np.random.gamma(2, 2)  # Gamma distribution for wind speed
            wind_direction = np.random.uniform(0, 360)  # Uniform distribution for direction
            precipitation = max(0, np.random.exponential(0.5))  # Exponential for precipitation
            
            # Add seasonal and diurnal variations
            hour = current_date.hour
            day_of_year = current_date.timetuple().tm_yday
            
            # Diurnal temperature variation (cooler at night, warmer during day)
            hour_factor = np.sin(np.pi * (hour - 6) / 12) * 5
            temp_c += hour_factor
            
            # Seasonal variation
            season_factor = np.sin(np.pi * (day_of_year - 80) / 182.5) * 10
            temp_c += season_factor
            
            # Create reading
            readings.append({
                'station_id': station_id,
                'timestamp': current_date.isoformat(),
                'source': 'noaa',
                'temperature': float(temp_c),
                'humidity': float(humidity),
                'wind_speed': float(wind_speed),
                'wind_direction': float(wind_direction),
                'precipitation': float(precipitation),
                'units': {
                    'temperature': 'celsius',
                    'humidity': 'percent',
                    'wind_speed': 'm/s',
                    'wind_direction': 'degrees',
                    'precipitation': 'mm'
                }
            })
            
            # Advance by 1 hour
            current_date += timedelta(hours=1)
        
        return readings


class IMDWeatherFetcher(DataFetcher):
    """
    Fetches meteorological data from India Meteorological Department.
    Supports temperature, humidity, wind speed, wind direction, and precipitation.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration.
        
        Args:
            config: Configuration parameters including:
                - api_key: IMD API credentials
                - cache_dir: Directory for caching data
                - region: Region to fetch data for (default: All India)
                - lookback_days: Number of days to look back for data
        """
        super().__init__(config)
        
        # API configuration - IMD requires authentication
        self.api_username = config.get('imd_username')
        self.api_password = config.get('imd_password')
        self.base_url = config.get('imd_base_url', 'https://imdaws.com/api')
        
        # Cache settings
        self.cache_dir = config.get('cache_dir', 'cache/weather')
        os.makedirs(self.cache_dir, exist_ok=True)
        
        # Region setting - IMD data is for India
        self.state = config.get('state', 'all')  # Can be specific state or 'all'
        
        # Time range
        self.lookback_days = config.get('lookback_days', 3)
    
    async def fetch_data(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch weather data for Indian states.
        
        Returns:
            Tuple of (stations, readings) where:
              - stations: List of dicts with IMD weather station information
              - readings: List of dicts with meteorological readings
        """
        stations = []
        readings = []
        
        try:
            # Check cache first
            cache_key = f"imd_{self.state}_{datetime.now().strftime('%Y%m%d')}"
            cache_file = os.path.join(self.cache_dir, f"{cache_key}.json")
            
            if os.path.exists(cache_file) and (datetime.now() - datetime.fromtimestamp(os.path.getmtime(cache_file))).total_seconds() < 21600:  # 6 hours
                # Use cached data if less than 6 hours old
                self.logger.info(f"Using cached IMD weather data for {self.state}")
                with open(cache_file, 'r') as f:
                    cached_data = json.load(f)
                    return cached_data['stations'], cached_data['readings']
            
            # In a real implementation, we would fetch data from IMD API
            # For now, generate simulated data for Indian weather stations
            
            # Major Indian cities with weather stations
            indian_cities = [
                {"name": "Delhi", "lat": 28.6139, "lon": 77.2090},
                {"name": "Mumbai", "lat": 19.0760, "lon": 72.8777},
                {"name": "Kolkata", "lat": 22.5726, "lon": 88.3639},
                {"name": "Chennai", "lat": 13.0827, "lon": 80.2707},
                {"name": "Bengaluru", "lat": 12.9716, "lon": 77.5946},
                {"name": "Hyderabad", "lat": 17.3850, "lon": 78.4867},
                {"name": "Ahmedabad", "lat": 23.0225, "lon": 72.5714},
                {"name": "Pune", "lat": 18.5204, "lon": 73.8567},
                {"name": "Jaipur", "lat": 26.9124, "lon": 75.7873},
                {"name": "Lucknow", "lat": 26.8467, "lon": 80.9462},
                {"name": "Bhopal", "lat": 23.2599, "lon": 77.4126},
                {"name": "Patna", "lat": 25.5941, "lon": 85.1376},
                {"name": "Kochi", "lat": 9.9312, "lon": 76.2673},
                {"name": "Guwahati", "lat": 26.1445, "lon": 91.7362},
                {"name": "Shimla", "lat": 31.1048, "lon": 77.1734},
            ]
            
            # Create weather stations
            for i, city in enumerate(indian_cities):
                station_id = f"imd_ws_{i+1:02d}"
                
                stations.append({
                    'id': station_id,
                    'name': f"IMD {city['name']} Weather Station",
                    'source': 'imd',
                    'latitude': city['lat'],
                    'longitude': city['lon'],
                    'elevation': float(np.random.uniform(0, 1000)),  # Placeholder elevation
                    'metadata': {
                        'station_type': 'meteorological',
                        'location': city['name'],
                        'parameters': ['temperature', 'humidity', 'wind_speed', 'wind_direction', 'precipitation']
                    }
                })
                
                # Generate hourly readings for each station
                station_readings = self._generate_station_readings(station_id, city['lat'])
                readings.extend(station_readings)
            
            # Cache the results
            with open(cache_file, 'w') as f:
                json.dump({'stations': stations, 'readings': readings}, f)
            
            return stations, readings
            
        except Exception as e:
            self.logger.error(f"Error fetching IMD weather data: {str(e)}")
            return [], []
    
    def _generate_station_readings(self, station_id: str, latitude: float) -> List[Dict[str, Any]]:
        """
        Generate simulated weather readings for an IMD station.
        
        Args:
            station_id: Station ID
            latitude: Station latitude for climate approximation
            
        Returns:
            List of weather readings
        """
        readings = []
        
        # Calculate date range
        end_date = datetime.now()
        start_date = end_date - timedelta(days=self.lookback_days)
        
        # Use station_id and latitude as seed
        seed = int(''.join([str(ord(c)) for c in station_id])) + int(latitude * 100)
        np.random.seed(seed)
        
        # Adjust baseline temperature based on latitude (cooler in north, warmer in south)
        base_temp = 35 - (latitude - 8) * 0.5  # Rough approximation
        
        # Generate data for each hour
        current_date = start_date
        while current_date <= end_date:
            # Generate random but plausible values for Indian weather
            hour = current_date.hour
            day_of_year = current_date.timetuple().tm_yday
            
            # Diurnal temperature variation
            hour_factor = np.sin(np.pi * (hour - 6) / 12) * 6
            
            # Seasonal variation
            season_factor = np.sin(np.pi * (day_of_year - 80) / 182.5) * 10
            
            # Calculate final temperature
            temp_c = base_temp + hour_factor + season_factor + np.random.normal(0, 2)
            
            # Other weather parameters
            humidity = min(100, max(10, np.random.normal(60, 15)))  # Normal distribution, capped
            wind_speed = max(0, np.random.gamma(2, 1.5))  # Gamma distribution for wind speed
            wind_direction = np.random.uniform(0, 360)  # Uniform distribution for direction
            
            # More rain in monsoon season (roughly June-September, days 152-273)
            is_monsoon = 152 <= day_of_year <= 273
            if is_monsoon:
                precipitation = max(0, np.random.exponential(5) if np.random.random() > 0.5 else 0)
            else:
                precipitation = max(0, np.random.exponential(0.2) if np.random.random() > 0.8 else 0)
            
            # Create reading
            readings.append({
                'station_id': station_id,
                'timestamp': current_date.isoformat(),
                'source': 'imd',
                'temperature': float(temp_c),
                'humidity': float(humidity),
                'wind_speed': float(wind_speed),
                'wind_direction': float(wind_direction),
                'precipitation': float(precipitation),
                'units': {
                    'temperature': 'celsius',
                    'humidity': 'percent',
                    'wind_speed': 'm/s',
                    'wind_direction': 'degrees',
                    'precipitation': 'mm'
                }
            })
            
            # Advance by 1 hour
            current_date += timedelta(hours=1)
        
        return readings
