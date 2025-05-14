"""
Routes for monitoring stations and air quality data.
"""
import logging
from typing import Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import select, and_, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..dependencies import parse_date_flexible, get_valid_pollutants
from ...models.database import get_db
from ...models.air_quality import MonitoringStation, PollutantReading, WeatherData

# Set up logging
logger = logging.getLogger("airalert.api.monitoring")

# Create router
router = APIRouter(tags=["monitoring"])


@router.get("/monitoring_stations")
async def get_monitoring_stations(
    db: AsyncSession = Depends(get_db),
    limit: int = 100,
    offset: int = 0
):
    """
    Get list of air quality monitoring stations.
    
    Parameters:
    - limit: Maximum number of stations to return
    - offset: Number of stations to skip for pagination
    """
    # Build query
    query = select(MonitoringStation).limit(limit).offset(offset)
    
    # Execute query
    result = db.execute(query)  # Remove await here
    stations = result.scalars().all()

    # Serialize response
    serialized_stations = [
        {
            "id": station.id,
            "name": station.station_name,
            "station_code": station.station_code,
            "latitude": station.latitude,
            "longitude": station.longitude,
            "location": f"POINT({station.longitude} {station.latitude})" if station.latitude and station.longitude else None,
            "city": station.city,
            "state": station.state,
            "country": station.country,
            "source": station.source,
            "last_updated": station.last_updated.isoformat() if station.last_updated else None,
        }
        for station in stations
    ]

    return {
        "count": len(serialized_stations),
        "stations": serialized_stations
    }


@router.get("/air_quality")
async def get_air_quality(
    station_id: Optional[int] = None,
    pollutant: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db: AsyncSession = Depends(get_db)
):
    """
    Get air quality data for specific stations, pollutants, and time ranges.
    
    Parameters:
    - station_id: Filter by monitoring station ID
    - pollutant: Filter by pollutant (pm25, pm10, o3, no2, so2, co, aqi)
    - start_date: Filter from this date (ISO format)
    - end_date: Filter to this date (ISO format)
    """
    # logger.info(f"API request: /air_quality with params station_id={station_id}, pollutant={pollutant}, start_date={start_date}, end_date={end_date}")
    
    # Build query with joined WeatherData
    query = (
        select(PollutantReading, WeatherData)
        .outerjoin(
            WeatherData,
            and_(
                PollutantReading.timestamp == WeatherData.timestamp,
                PollutantReading.station_id == WeatherData.station_id
            )
        )
    )
    
    # Apply filters
    filters = []
    
    # Filter by station
    if station_id is not None:
        filters.append(PollutantReading.station_id == station_id)
        logger.info(f"Filtering by station_id: {station_id}")
    
    # Filter by start date
    if start_date is not None:
        try:
            start_dt = parse_date_flexible(start_date)
            filters.append(PollutantReading.timestamp >= start_dt)
            logger.info(f"Filtering by start_date: {start_dt}")
        except ValueError as e:
            logger.error(f"Error parsing start_date: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or YYYY-MM-DD")
    
    # Filter by end date
    if end_date is not None:
        try:
            end_dt = parse_date_flexible(end_date)
            filters.append(PollutantReading.timestamp <= end_dt)
            logger.info(f"Filtering by end_date: {end_dt}")
        except ValueError as e:
            logger.error(f"Error parsing end_date: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or YYYY-MM-DD")
    
    # Apply all filters
    if filters:
        query = query.where(and_(*filters))
    
    # Log the query
    try:
        from sqlalchemy.dialects import sqlite
        query_str = str(query.compile(dialect=sqlite.dialect(), compile_kwargs={"literal_binds": True}))
        # logger.info(f"Executing query: {query_str}")
    except Exception as e:
        logger.warning(f"Could not compile query to string: {str(e)}")
    
    # Execute query with proper synchronization handling
    # Add limit and order to the query before execution
    query = query.order_by(PollutantReading.timestamp.desc()).limit(1000)
    result = db.execute(query)  # Remove await here
    readings_with_weather = result.all()
    logger.info(f"Query returned {len(readings_with_weather)} readings with weather data")
    
    # If pollutant is specified, filter the results
    if pollutant is not None:
        valid_pollutants = get_valid_pollutants()
        if pollutant not in valid_pollutants:
            logger.warning(f"Invalid pollutant specified: {pollutant}")
            raise HTTPException(status_code=400, detail=f"Invalid pollutant. Must be one of: {', '.join(valid_pollutants)}")
            
        # Filter out null values for the specified pollutant
        filtered_readings = []
        for reading, weather in readings_with_weather:
            value = getattr(reading, pollutant)
            if value is not None:
                filtered_readings.append((reading, weather))
        
        logger.info(f"Filtered to {len(filtered_readings)} readings with non-null {pollutant} values")
        readings_with_weather = filtered_readings
    
    # Format response
    formatted_readings = []
    for reading, weather in readings_with_weather:
        reading_data = {
            "id": reading.id,
            "station_id": reading.station_id,
            "timestamp": reading.timestamp.isoformat(),
            "pm25": reading.pm25,
            "pm10": reading.pm10,
            "o3": reading.o3,
            "no2": reading.no2,
            "so2": reading.so2,
            "co": reading.co,
            "aqi": reading.aqi,
            # Add weather data from joined WeatherData if available
            "temperature": weather.temperature if weather else None,
            "humidity": weather.humidity if weather else None,
            "wind_speed": weather.wind_speed if weather else None,
            "wind_direction": weather.wind_direction if weather else None,
            "pressure": weather.pressure if weather else None
        }
        formatted_readings.append(reading_data)
    
    logger.info(f"Returning {len(formatted_readings)} formatted readings with weather data")
    return {
        "count": len(formatted_readings),
        "readings": formatted_readings
    }


@router.get("/station/{station_id}/latest")
async def get_station_latest_reading(
    station_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get the latest reading for a specific monitoring station.
    
    Parameters:
    - station_id: Station ID to get the latest reading for
    """
    # Check if station exists
    station_query = select(MonitoringStation).where(MonitoringStation.id == station_id)
    result = db.execute(station_query)  # Remove await
    station = result.scalar_one_or_none()
    
    if not station:
        raise HTTPException(status_code=404, detail=f"Station with ID {station_id} not found")
    
    # Get the latest reading with a subquery
    subquery = (
        select(func.max(PollutantReading.timestamp))
        .where(PollutantReading.station_id == station_id)
        .scalar_subquery()
    )
    
    query = (
        select(PollutantReading, WeatherData)
        .outerjoin(
            WeatherData,
            and_(
                PollutantReading.timestamp == WeatherData.timestamp,
                PollutantReading.station_id == WeatherData.station_id
            )
        )
        .where(
            and_(
                PollutantReading.station_id == station_id,
                PollutantReading.timestamp == subquery
            )
        )
    )
    
    result = db.execute(query)  # Remove await
    row = result.first()
    
    if not row:
        raise HTTPException(status_code=404, detail=f"No readings found for station {station_id}")
    
    reading, weather = row
    
    # Format response
    response = {
        "station": {
            "id": station.id,
            "name": station.station_name,
            "latitude": station.latitude,
            "longitude": station.longitude,
        },
        "reading": {
            "id": reading.id,
            "timestamp": reading.timestamp.isoformat(),
            "pm25": reading.pm25,
            "pm10": reading.pm10,
            "o3": reading.o3,
            "no2": reading.no2,
            "so2": reading.so2,
            "co": reading.co,
            "aqi": reading.aqi,
        },
        "weather": None
    }
    
    if weather:
        response["weather"] = {
            "temperature": weather.temperature,
            "humidity": weather.humidity,
            "wind_speed": weather.wind_speed,
            "wind_direction": weather.wind_direction,
            "pressure": weather.pressure
        }
    
    return response
