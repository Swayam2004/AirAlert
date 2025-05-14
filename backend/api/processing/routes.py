"""
Routes for data processing and map generation.
"""
import os
import logging
from typing import Optional

from fastapi import APIRouter, Depends, BackgroundTasks, Query
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..dependencies import get_valid_pollutants
from ...models.database import get_db
from ...data_acquisition.fetchers.openaq import OpenAQFetcher
from ...data_acquisition.integrator import DataIntegrator
from ...gis_processing.interpolation import SpatialInterpolator

# Set up logging
logger = logging.getLogger("airalert.api.processing")

# Create router
router = APIRouter(tags=["processing"])


@router.post("/fetch_data")
async def fetch_air_quality_data(background_tasks: BackgroundTasks):
    """
    Trigger a background task to fetch new air quality data.
    """
    background_tasks.add_task(fetch_air_quality_data_task)
    return {"message": "Data fetch task started"}


@router.post("/generate_map")
async def generate_map(
    background_tasks: BackgroundTasks,
    pollutant: str = Query(..., description="Pollutant to map (pm25, pm10, o3, no2, so2, co, aqi)")
):
    """
    Trigger a background task to generate an interpolation map for a pollutant.
    
    Parameters:
    - pollutant: Pollutant to generate a map for
    """
    valid_pollutants = get_valid_pollutants()
    if pollutant not in valid_pollutants:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid pollutant. Must be one of: {', '.join(valid_pollutants)}"
        )
        
    output_path = os.path.join(settings.gis_output_dir, f"{pollutant}_interpolation.png")
    background_tasks.add_task(generate_interpolation_map_task, pollutant, output_path)
    
    return {
        "message": f"Map generation for {pollutant} started",
        "expected_path": output_path
    }


@router.get("/map")
async def get_interactive_map():
    """
    Serve an interactive map showing air quality data.
    This endpoint will be expanded to provide GeoJSON data for client-side map rendering.
    """
    # Placeholder for now, will be implemented in future
    return {"message": "Interactive map endpoint under construction."}


async def fetch_air_quality_data_task():
    """
    Task to fetch new air quality data from sources.
    """
    # Create a new database session for this task
    from sqlalchemy.ext.asyncio import AsyncSession
    from ...models.database import engine
    
    async with AsyncSession(engine) as session:
        logger.info("Starting air quality data fetch task")
        
        # Create OpenAQ fetcher
        openaq_config = {
            "limit": 10000,
            "country": "IN",  # Example: fetch data for India
            "has_geo": True
        }
        openaq_fetcher = OpenAQFetcher(openaq_config)
        
        # Create data integrator
        integrator = DataIntegrator(session, [openaq_fetcher])
        
        # Fetch and store data
        try:
            count = await integrator.collect_and_store_data()
            logger.info(f"Fetched and stored {count} new data points")
            return {"success": True, "count": count}
        except Exception as e:
            logger.error(f"Error fetching air quality data: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}


async def generate_interpolation_map_task(
    pollutant: str, 
    output_path: Optional[str] = None
):
    """
    Task to generate interpolation map for a pollutant.
    
    Parameters:
    - pollutant: Pollutant to interpolate
    - output_path: Path to save the generated map
    """
    # Create a new database session for this task
    from sqlalchemy.ext.asyncio import AsyncSession
    from ...models.database import engine
    import geopandas as gpd
    
    async with AsyncSession(engine) as session:
        logger.info(f"Starting interpolation map generation for {pollutant}")
        
        try:
            # Get recent readings for this pollutant
            from sqlalchemy import select, func, and_
            from ...models.air_quality import PollutantReading, MonitoringStation
            
            # Get most recent readings for each station
            subquery = (
                select(
                    PollutantReading.station_id,
                    func.max(PollutantReading.timestamp).label("max_timestamp")
                )
                .group_by(PollutantReading.station_id)
                .subquery()
            )
            
            # Join with the main table
            query = (
                select(PollutantReading, MonitoringStation)
                .join(
                    subquery,
                    and_(
                        PollutantReading.station_id == subquery.c.station_id,
                        PollutantReading.timestamp == subquery.c.max_timestamp
                    )
                )
                .join(
                    MonitoringStation,
                    PollutantReading.station_id == MonitoringStation.id
                )
            )
            
            result = await session.execute(query)
            readings_with_stations = result.all()
            
            if not readings_with_stations:
                logger.warning("No readings found for interpolation map generation")
                return {"success": False, "error": "No readings found"}
            
            # Prepare data for interpolation
            import pandas as pd
            from shapely.geometry import Point
            
            data = []
            for reading, station in readings_with_stations:
                # Check if the pollutant value exists
                value = getattr(reading, pollutant, None)
                if value is not None:
                    data.append({
                        "latitude": station.latitude,
                        "longitude": station.longitude,
                        pollutant: value
                    })
            
            if not data:
                logger.warning(f"No {pollutant} readings found for interpolation map")
                return {"success": False, "error": f"No {pollutant} readings found"}
            
            # Convert to GeoDataFrame
            df = pd.DataFrame(data)
            geometry = [Point(xy) for xy in zip(df["longitude"], df["latitude"])]
            gdf = gpd.GeoDataFrame(df, geometry=geometry, crs="EPSG:4326")
            
            # Create interpolator
            interpolator = SpatialInterpolator({
                "cell_size": 0.01,
                "output_dir": settings.gis_output_dir
            })
            
            # Generate interpolation
            map_path = interpolator.generate_interpolation_map(
                gdf, 
                pollutant, 
                output_path
            )
            logger.info(f"Generated interpolation map: {map_path}")
            return {"success": True, "path": map_path}
            
        except Exception as e:
            logger.error(f"Error generating interpolation map: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
