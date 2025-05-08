"""
OpenAQ data fetcher for AirAlert.
Fetches air quality data from OpenAQ's API.
"""
import logging
import asyncio
import aiohttp
from typing import Dict, List, Any, Tuple, Optional
from datetime import datetime, timedelta

from .base import DataFetcher

class OpenAQFetcher(DataFetcher):
    """Fetches air quality data from OpenAQ API."""
    
    BASE_URL = "https://api.openaq.org/v2"
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration.
        
        Args:
            config: Configuration parameters for the OpenAQ fetcher
                - api_key: Optional API key for OpenAQ
                - limit: Maximum number of results to fetch (default: 1000)
                - page: Page number for pagination (default: 1)
                - country: Two-letter country code to filter by (optional)
                - has_geo: Whether to only fetch stations with geo coordinates (default: True)
        """
        super().__init__(config)
        self.api_key = config.get('api_key', None)
        self.limit = config.get('limit', 1000)
        self.page = config.get('page', 1)
        self.country = config.get('country', None)
        self.has_geo = config.get('has_geo', True)
        
        # Default headers
        self.headers = {
            'Accept': 'application/json',
            'Content-Type': 'application/json'
        }
        
        # Add API key to headers if provided
        if self.api_key:
            self.headers['X-API-Key'] = self.api_key
    
    async def fetch_data(self) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
        """
        Fetch data from OpenAQ API.
        
        Returns:
            Tuple of (stations, readings):
              - stations: List of dicts with station information
              - readings: List of dicts with pollutant readings
        """
        try:
            self.logger.info("Fetching data from OpenAQ API...")
            
            # First, fetch locations with geo coordinates
            locations = await self._fetch_locations()
            
            if not locations:
                self.logger.warning("No locations found")
                return [], []
                
            self.logger.info(f"Found {len(locations)} locations")
            
            # Then fetch latest measurements for each location
            readings = await self._fetch_measurements(locations)
            
            return locations, readings
        
        except Exception as e:
            self.logger.error(f"Error fetching data from OpenAQ: {str(e)}")
            return [], []
    
    async def _fetch_locations(self) -> List[Dict[str, Any]]:
        """
        Fetch monitoring station locations from OpenAQ API.
        
        Returns:
            List of location dicts
        """
        endpoint = f"{self.BASE_URL}/locations"
        
        # Build query parameters
        params = {
            'limit': self.limit,
            'page': self.page,
            'has_geo': 'true' if self.has_geo else 'false'
        }
        
        if self.country:
            params['country'] = self.country
        
        # Make API request
        async with aiohttp.ClientSession() as session:
            async with session.get(endpoint, params=params, headers=self.headers) as response:
                if response.status != 200:
                    self.logger.error(f"API error: {response.status}")
                    return []
                
                data = await response.json()
                
                if not self._validate_response(data):
                    return []
                
                # Extract and transform locations
                locations = []
                for loc in data.get('results', []):
                    # Skip locations without geo coordinates
                    if not loc.get('coordinates', {}).get('latitude'):
                        continue
                    
                    # Transform to our internal format
                    location = {
                        'station_code': loc.get('id'),
                        'station_name': loc.get('name'),
                        'latitude': loc.get('coordinates', {}).get('latitude'),
                        'longitude': loc.get('coordinates', {}).get('longitude'),
                        'city': loc.get('city'),
                        'country': loc.get('country'),
                        'source': 'openaq'
                    }
                    
                    locations.append(location)
                
                return locations
    
    async def _fetch_measurements(self, locations: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """
        Fetch latest measurements for locations.
        
        Args:
            locations: List of location dicts
            
        Returns:
            List of measurement dicts
        """
        readings = []
        
        # Group locations in batches to avoid too many concurrent requests
        batch_size = 10
        location_batches = [
            locations[i:i + batch_size] 
            for i in range(0, len(locations), batch_size)
        ]
        
        self.logger.info(f"Fetching measurements in {len(location_batches)} batches")
        
        async with aiohttp.ClientSession() as session:
            for batch in location_batches:
                tasks = []
                for location in batch:
                    task = self._fetch_location_measurements(
                        session, 
                        location['station_code']
                    )
                    tasks.append(task)
                
                # Run tasks concurrently and collect results
                batch_results = await asyncio.gather(*tasks, return_exceptions=True)
                
                for result in batch_results:
                    if isinstance(result, Exception):
                        self.logger.warning(f"Error fetching measurements: {str(result)}")
                    elif result:
                        readings.extend(result)
        
        self.logger.info(f"Fetched {len(readings)} measurements")
        return readings
    
    async def _fetch_location_measurements(self, session: aiohttp.ClientSession, 
                                         location_id: str) -> List[Dict[str, Any]]:
        """
        Fetch measurements for a specific location.
        
        Args:
            session: aiohttp ClientSession
            location_id: OpenAQ location ID
            
        Returns:
            List of measurement dicts
        """
        endpoint = f"{self.BASE_URL}/measurements"
        
        # Build query parameters
        params = {
            'location_id': location_id,
            'limit': 100,  # Get recent measurements for all parameters
            'order_by': 'datetime',
            'sort': 'desc'
        }
        
        try:
            async with session.get(endpoint, params=params, headers=self.headers) as response:
                if response.status != 200:
                    self.logger.warning(f"API error for location {location_id}: {response.status}")
                    return []
                
                data = await response.json()
                
                if not self._validate_response(data):
                    return []
                
                # Extract and transform measurements
                readings = []
                
                # Group measurements by datetime to combine multiple pollutants
                measurements_by_date = {}
                
                for m in data.get('results', []):
                    datetime_str = m.get('date', {}).get('utc')
                    if not datetime_str:
                        continue
                        
                    # Parse datetime
                    try:
                        dt = datetime.fromisoformat(datetime_str.replace('Z', '+00:00'))
                    except ValueError:
                        continue
                    
                    # Create or update measurement for this datetime
                    if dt not in measurements_by_date:
                        measurements_by_date[dt] = {
                            'station_code': location_id,
                            'timestamp': dt,
                            'pm25': None,
                            'pm10': None,
                            'o3': None,
                            'no2': None,
                            'so2': None,
                            'co': None
                        }
                    
                    # Add pollutant value
                    parameter = m.get('parameter', '').lower()
                    value = m.get('value')
                    
                    if parameter == 'pm25':
                        measurements_by_date[dt]['pm25'] = value
                    elif parameter == 'pm10':
                        measurements_by_date[dt]['pm10'] = value
                    elif parameter == 'o3':
                        measurements_by_date[dt]['o3'] = value
                    elif parameter == 'no2':
                        measurements_by_date[dt]['no2'] = value
                    elif parameter == 'so2':
                        measurements_by_date[dt]['so2'] = value
                    elif parameter == 'co':
                        measurements_by_date[dt]['co'] = value
                
                # Convert back to list
                readings.extend(measurements_by_date.values())
                
                return readings
                
        except Exception as e:
            self.logger.warning(f"Error fetching measurements for location {location_id}: {str(e)}")
            return []
    
    def _validate_response(self, data: Any) -> bool:
        """
        Validate response data from OpenAQ API.
        
        Args:
            data: Response data to validate
            
        Returns:
            True if data is valid, False otherwise
        """
        if not data or not isinstance(data, dict):
            self.logger.warning("Invalid response format")
            return False
            
        meta = data.get('meta')
        results = data.get('results')
        
        if not meta or not results or not isinstance(results, list):
            self.logger.warning("Invalid response structure")
            return False
            
        return True
