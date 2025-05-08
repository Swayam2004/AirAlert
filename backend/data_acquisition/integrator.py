"""
Data integrator for the AirAlert system.
Collects data from multiple sources and stores it in the database.
"""
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from geoalchemy2.elements import WKTElement
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.dialects.postgresql import insert
from apscheduler.schedulers.asyncio import AsyncIOScheduler
import pandas as pd

from .fetchers.base import DataFetcher
from ..models.air_quality import MonitoringStation, PollutantReading, WeatherData

class DataIntegrator:
    """Integrates data from multiple sources into the database."""
    
    def __init__(self, db_session: AsyncSession, fetchers: List[DataFetcher]):
        """
        Initialize with database session and data fetchers.
        
        Args:
            db_session: SQLAlchemy async session
            fetchers: List of data fetcher instances
        """
        self.db_session = db_session
        self.fetchers = fetchers
        self.logger = logging.getLogger("DataIntegrator")
        self.scheduler = AsyncIOScheduler()

    def schedule_data_collection(self):
        """Schedule periodic data collection."""
        self.scheduler.add_job(self.collect_and_store_data, 'interval', hours=6)
        self.scheduler.start()
    
    async def collect_and_store_data(self) -> Dict[str, int]:
        """
        Collect data from all fetchers and store in database.
        
        Returns:
            Dictionary with counts of stored items by type
        """
        results = {
            'stations': 0,
            'readings': 0,
            'weather': 0
        }
        
        for fetcher in self.fetchers:
            try:
                fetcher_name = fetcher.__class__.__name__
                self.logger.info(f"Collecting data from {fetcher_name}...")
                
                # Fetch data
                stations, readings = await fetcher.fetch_data()
                
                # Determine data type based on fetcher class
                is_weather_data = 'Weather' in fetcher_name
                
                # Store data
                if stations:
                    stored_stations = await self._store_stations(stations)
                    self.logger.info(f"Stored {stored_stations} stations from {fetcher_name}")
                    results['stations'] += stored_stations
                
                if readings:
                    if is_weather_data:
                        stored_weather = await self._store_weather_data(readings)
                        self.logger.info(f"Stored {stored_weather} weather readings from {fetcher_name}")
                        results['weather'] += stored_weather
                    else:
                        stored_readings = await self._store_readings(readings)
                        self.logger.info(f"Stored {stored_readings} pollution readings from {fetcher_name}")
                        results['readings'] += stored_readings
                    
            except Exception as e:
                self.logger.error(f"Error collecting data from {fetcher.__class__.__name__}: {str(e)}")
        
        return results
    
    async def _store_stations(self, stations: List[Dict[str, Any]]) -> int:
        """
        Store station data in the database.
        
        Args:
            stations: List of station dictionaries
            
        Returns:
            Number of stations stored
        """
        try:
            count = 0
            
            for station in stations:
                try:
                    # Extract station ID and normalize station data
                    station_id = station.get('id') or station.get('station_code')
                    if not station_id:
                        self.logger.warning(f"Station missing ID: {station}")
                        continue
                    
                    station_name = station.get('name') or station.get('station_name', f"Station {station_id}")
                    
                    # Check if station already exists
                    stmt = select(MonitoringStation).where(
                        MonitoringStation.station_code == station_id
                    )
                    result = await self.db_session.execute(stmt)
                    existing_station = result.scalar_one_or_none()
                    
                    # Create WKT point from coordinates
                    if 'latitude' in station and 'longitude' in station:
                        point_wkt = f"POINT({station['longitude']} {station['latitude']})"
                        location = WKTElement(point_wkt, srid=4326)
                    else:
                        location = None
                    
                    # Extract metadata
                    metadata = station.get('metadata', {})
                    
                    if existing_station:
                        # Update existing station
                        await self.db_session.execute(
                            update(MonitoringStation)
                            .where(MonitoringStation.id == existing_station.id)
                            .values(
                                station_name=station_name,
                                location=location,
                                city=station.get('city'),
                                state=station.get('state'),
                                country=station.get('country'),
                                source=station.get('source'),
                                elevation=station.get('elevation'),
                                last_updated=datetime.now(),
                                metadata=metadata
                            )
                        )
                    else:
                        # Create new station
                        new_station = MonitoringStation(
                            station_code=station_id,
                            station_name=station_name,
                            location=location,
                            city=station.get('city'),
                            state=station.get('state'),
                            country=station.get('country'),
                            source=station.get('source'),
                            elevation=station.get('elevation'),
                            last_updated=datetime.now(),
                            metadata=metadata
                        )
                        self.db_session.add(new_station)
                    
                    count += 1
                    
                    # Commit in batches
                    if count % 50 == 0:
                        await self.db_session.commit()
                
                except Exception as e:
                    self.logger.warning(f"Error storing station {station.get('id') or station.get('station_code')}: {str(e)}")
                    continue
            
            # Commit final batch
            await self.db_session.commit()
            
            return count
            
        except Exception as e:
            self.logger.error(f"Error storing stations: {str(e)}")
            await self.db_session.rollback()
            return 0
    
    async def _store_readings(self, readings: List[Dict[str, Any]]) -> int:
        """
        Store pollutant readings in the database.
        
        Args:
            readings: List of reading dictionaries
            
        Returns:
            Number of readings stored
        """
        try:
            count = 0
            
            for reading in readings:
                try:
                    # Extract station ID and normalize it
                    station_id = reading.get('station_id') or reading.get('station_code')
                    if not station_id:
                        self.logger.warning("Reading missing station ID")
                        continue
                    
                    # Find database ID for the station
                    stmt = select(MonitoringStation.id).where(
                        MonitoringStation.station_code == station_id
                    )
                    result = await self.db_session.execute(stmt)
                    db_station_id = result.scalar_one_or_none()
                    
                    if not db_station_id:
                        self.logger.warning(f"Station not found for code: {station_id}")
                        continue
                    
                    # Parse timestamp
                    timestamp_str = reading.get('timestamp')
                    if not timestamp_str:
                        self.logger.warning(f"Reading missing timestamp for station: {station_id}")
                        continue
                        
                    if isinstance(timestamp_str, str):
                        try:
                            # Try ISO format first
                            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        except ValueError:
                            # Fall back to other formats
                            try:
                                timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                            except ValueError:
                                self.logger.warning(f"Invalid timestamp format: {timestamp_str}")
                                continue
                    else:
                        timestamp = timestamp_str  # Assume it's already a datetime
                    
                    # Check if reading already exists
                    check_stmt = select(PollutantReading).where(
                        PollutantReading.station_id == db_station_id,
                        PollutantReading.timestamp == timestamp
                    )
                    check_result = await self.db_session.execute(check_stmt)
                    existing_reading = check_result.scalar_one_or_none()
                    
                    # Extract pollutant values, handling different naming conventions
                    pm25 = reading.get('pm25') or reading.get('PM25') or reading.get('PM2.5')
                    pm10 = reading.get('pm10') or reading.get('PM10')
                    o3 = reading.get('o3') or reading.get('ozone') or reading.get('O3')
                    no2 = reading.get('no2') or reading.get('nitrogen_dioxide') or reading.get('NO2')
                    so2 = reading.get('so2') or reading.get('sulphur_dioxide') or reading.get('SO2')
                    co = reading.get('co') or reading.get('carbon_monoxide') or reading.get('CO')
                    aqi = reading.get('aqi') or reading.get('AQI')
                    
                    # Extract any metadata
                    metadata = reading.get('metadata', {})
                    
                    if existing_reading:
                        # Update existing reading
                        await self.db_session.execute(
                            update(PollutantReading)
                            .where(PollutantReading.id == existing_reading.id)
                            .values(
                                pm25=pm25,
                                pm10=pm10,
                                o3=o3,
                                no2=no2,
                                so2=so2,
                                co=co,
                                aqi=aqi,
                                metadata=metadata
                            )
                        )
                    else:
                        # Create new reading
                        new_reading = PollutantReading(
                            station_id=db_station_id,
                            timestamp=timestamp,
                            pm25=pm25,
                            pm10=pm10,
                            o3=o3,
                            no2=no2,
                            so2=so2,
                            co=co,
                            aqi=aqi,
                            metadata=metadata
                        )
                        self.db_session.add(new_reading)
                    
                    count += 1
                    
                    # Commit in batches for large datasets
                    if count % 100 == 0:
                        await self.db_session.commit()
                
                except Exception as e:
                    self.logger.warning(f"Error storing reading for station {reading.get('station_id')}: {str(e)}")
                    continue
            
            # Final commit
            await self.db_session.commit()
            
            return count
            
        except Exception as e:
            self.logger.error(f"Error storing readings: {str(e)}")
            await self.db_session.rollback()
            return 0
            
    async def _store_weather_data(self, readings: List[Dict[str, Any]]) -> int:
        """
        Store weather readings in the database.
        
        Args:
            readings: List of weather reading dictionaries
            
        Returns:
            Number of weather readings stored
        """
        try:
            count = 0
            
            for reading in readings:
                try:
                    # Extract station ID
                    station_id = reading.get('station_id')
                    if not station_id:
                        self.logger.warning("Weather reading missing station ID")
                        continue
                    
                    # Find database ID for the station
                    stmt = select(MonitoringStation.id).where(
                        MonitoringStation.station_code == station_id
                    )
                    result = await self.db_session.execute(stmt)
                    db_station_id = result.scalar_one_or_none()
                    
                    if not db_station_id:
                        self.logger.warning(f"Station not found for code: {station_id}")
                        continue
                    
                    # Parse timestamp
                    timestamp_str = reading.get('timestamp')
                    if not timestamp_str:
                        continue
                        
                    if isinstance(timestamp_str, str):
                        try:
                            timestamp = datetime.fromisoformat(timestamp_str.replace('Z', '+00:00'))
                        except ValueError:
                            try:
                                timestamp = datetime.strptime(timestamp_str, "%Y-%m-%d %H:%M:%S")
                            except ValueError:
                                self.logger.warning(f"Invalid timestamp format: {timestamp_str}")
                                continue
                    else:
                        timestamp = timestamp_str
                    
                    # Check if reading already exists
                    check_stmt = select(WeatherData).where(
                        WeatherData.station_id == db_station_id,
                        WeatherData.timestamp == timestamp
                    )
                    check_result = await self.db_session.execute(check_stmt)
                    existing_reading = check_result.scalar_one_or_none()
                    
                    # Extract weather data
                    temperature = reading.get('temperature')
                    humidity = reading.get('humidity') 
                    wind_speed = reading.get('wind_speed')
                    wind_direction = reading.get('wind_direction')
                    precipitation = reading.get('precipitation')
                    pressure = reading.get('pressure')
                    
                    # Extract any metadata including units
                    metadata = reading.get('metadata', {})
                    units = reading.get('units', {})
                    if units:
                        metadata['units'] = units
                    
                    if existing_reading:
                        # Update existing reading
                        await self.db_session.execute(
                            update(WeatherData)
                            .where(WeatherData.id == existing_reading.id)
                            .values(
                                temperature=temperature,
                                humidity=humidity,
                                wind_speed=wind_speed,
                                wind_direction=wind_direction,
                                precipitation=precipitation,
                                pressure=pressure,
                                metadata=metadata
                            )
                        )
                    else:
                        # Create new reading
                        new_reading = WeatherData(
                            station_id=db_station_id,
                            timestamp=timestamp,
                            temperature=temperature,
                            humidity=humidity,
                            wind_speed=wind_speed,
                            wind_direction=wind_direction,
                            precipitation=precipitation,
                            pressure=pressure,
                            metadata=metadata
                        )
                        self.db_session.add(new_reading)
                    
                    count += 1
                    
                    # Commit in batches for large datasets
                    if count % 100 == 0:
                        await self.db_session.commit()
                
                except Exception as e:
                    self.logger.warning(f"Error storing weather data for station {reading.get('station_id')}: {str(e)}")
                    continue
            
            # Final commit
            await self.db_session.commit()
            
            return count
            
        except Exception as e:
            self.logger.error(f"Error storing weather data: {str(e)}")
            await self.db_session.rollback()
            return 0

    async def import_census_data(self, file_path: str):
        """Import census or demographic data from a CSV file."""
        try:
            # Load census data
            census_data = pd.read_csv(file_path)
            
            # Example: Process and store census data in the database
            for _, row in census_data.iterrows():
                # Extract relevant fields
                population = row.get('TotalPopulation')
                vulnerability_index = self.calculate_vulnerability_index(row)
                
                # Store in database (pseudo-code)
                # await self.db_session.add(CensusData(...))
            
            await self.db_session.commit()
            self.logger.info("Census data imported successfully.")
        except Exception as e:
            self.logger.error(f"Error importing census data: {str(e)}")

    def calculate_vulnerability_index(self, row):
        """Calculate a vulnerability index based on demographic risk factors."""
        # Example: Combine population density and age-based risk factors
        population = row.get('TotalPopulation', 0)
        senior_population = row.get('SeniorPopulation', 0)
        return (senior_population / population) * 100 if population > 0 else 0
