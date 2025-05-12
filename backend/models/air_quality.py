"""
Air quality models for the AirAlert system.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from datetime import datetime
import logging
from geoalchemy2.shape import to_shape

from .database import Base

logger = logging.getLogger(__name__)

class MonitoringStation(Base):
    """Air quality monitoring station."""
    
    __tablename__ = "monitoring_stations"
    
    id = Column(Integer, primary_key=True)
    station_code = Column(String, unique=True, nullable=False)
    station_name = Column(String)
    location = Column(Geometry("POINT", srid=4326))
    city = Column(String)
    state = Column(String)
    country = Column(String)
    source = Column(String)  # e.g., 'openaq', 'government', etc.
    last_updated = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Virtual columns for easier access
    @property
    def latitude(self):
        if self.location:
            try:
                shape = to_shape(self.location)  # Convert WKB to Shapely geometry
                logger.info(f"Extracting latitude from location: {shape}")
                return shape.y
            except AttributeError as e:
                logger.error(f"Error extracting latitude: {str(e)}")
                return None
        return None

    @property
    def longitude(self):
        if self.location:
            try:
                shape = to_shape(self.location)  # Convert WKB to Shapely geometry
                logger.info(f"Extracting longitude from location: {shape}")
                return shape.x
            except AttributeError as e:
                logger.error(f"Error extracting longitude: {str(e)}")
                return None
        return None
    
    # Relationships
    readings = relationship("PollutantReading", back_populates="station")
    
    def __repr__(self):
        return f"<MonitoringStation(id={self.id}, code='{self.station_code}', name='{self.station_name}')>"

class PollutantReading(Base):
    """Air quality reading at a specific time and location."""
    
    __tablename__ = "pollutant_readings"
    
    id = Column(Integer, primary_key=True)
    station_id = Column(Integer, ForeignKey("monitoring_stations.id"), nullable=False)
    timestamp = Column(DateTime, nullable=False)
    
    # Common air pollutants
    pm25 = Column(Float)  # PM2.5 in µg/m³
    pm10 = Column(Float)  # PM10 in µg/m³
    o3 = Column(Float)    # Ozone in ppb
    no2 = Column(Float)   # Nitrogen dioxide in ppb
    so2 = Column(Float)   # Sulfur dioxide in ppb
    co = Column(Float)    # Carbon monoxide in ppm
    
    # Overall air quality index
    aqi = Column(Float)
    
    # Meteorological data
    temperature = Column(Float)     # °C
    humidity = Column(Float)        # %
    wind_speed = Column(Float)      # m/s
    wind_direction = Column(Float)  # degrees
    pressure = Column(Float)        # hPa
    
    # Relationship
    station = relationship("MonitoringStation", back_populates="readings")
    
    def __repr__(self):
        return f"<PollutantReading(id={self.id}, station={self.station_id}, timestamp='{self.timestamp}')>"

class AQICalculationParams(Base):
    """Parameters for calculating Air Quality Index (AQI)."""
    
    __tablename__ = "aqi_calculation_params"
    
    id = Column(Integer, primary_key=True)
    pollutant = Column(String, nullable=False)
    index_level = Column(String, nullable=False)  # 'good', 'moderate', etc.
    min_conc = Column(Float, nullable=False)
    max_conc = Column(Float, nullable=False)
    min_aqi = Column(Float, nullable=False)
    max_aqi = Column(Float, nullable=False)
    
    def __repr__(self):
        return f"<AQICalculationParams(pollutant='{self.pollutant}', level='{self.index_level}')>"

class DemographicData(Base):
    """Demographic data for vulnerability analysis."""
    __tablename__ = 'demographic_data'

    id = Column(Integer, primary_key=True)
    region = Column(String, nullable=False)
    population_density = Column(Float, nullable=False)
    vulnerability_index = Column(Float, nullable=False)

class WeatherData(Base):
    """Weather data model for storing meteorological information."""

    __tablename__ = "weather_data"

    id = Column(Integer, primary_key=True)
    timestamp = Column(DateTime, nullable=False)
    temperature = Column(Float, nullable=True)
    humidity = Column(Float, nullable=True)
    wind_speed = Column(Float, nullable=True)
    wind_direction = Column(Float, nullable=True)
    pressure = Column(Float, nullable=True)
    location = Column(Geometry("POINT", srid=4326), nullable=False)

    def __repr__(self):
        return f"<WeatherData(id={self.id}, timestamp={self.timestamp}, location={self.location})>"
