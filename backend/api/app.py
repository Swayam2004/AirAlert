"""
Main FastAPI application for AirAlert.
Defines routes and dependencies for the API.
"""
import os
import logging
from typing import Dict, List, Any, Optional
from datetime import datetime, timedelta
import json

from fastapi import FastAPI, Depends, HTTPException, Query, BackgroundTasks
from fastapi.middleware.cors import CORSMiddleware
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from passlib.context import CryptContext
from jose import JWTError, jwt
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession
import geopandas as gpd

from ..models.database import get_db, Base, engine, init_app
from ..models.air_quality import MonitoringStation, PollutantReading
from ..models.alerts import Alert, Notification
from ..models.users import User

from ..data_acquisition.integrator import DataIntegrator
from ..data_acquisition.fetchers.openaq import OpenAQFetcher
from ..gis_processing.interpolation import SpatialInterpolator
from ..gis_processing.dispersion import GaussianPlumeModel
from ..gis_processing.threshold import ThresholdAnalyzer
from ..alerts.trigger import AlertTrigger
from ..alerts.message_generator import LLMAlertGenerator

from ..models.database import db
from sqlalchemy import func

# Update logging configuration to write logs to a file
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("airalert.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("airalert")

# Initialize FastAPI
app = FastAPI(
    title="AirAlert API",
    description="AI-powered early warning system for air pollution",
    version="0.1.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # Allows all origins in development
    allow_credentials=True,
    allow_methods=["*"],  # Allows all methods
    allow_headers=["*"],  # Allows all headers
)

# Configuration
config = {
    "openai_api_key": os.environ.get("OPENAI_API_KEY"),
    "llm_model": os.environ.get("LLM_MODEL", "gpt-4o"),
    "alert_expiry_hours": int(os.environ.get("ALERT_EXPIRY_HOURS", 6)),
    "default_radius_km": 25,
    "gis_output_dir": os.environ.get("GIS_OUTPUT_DIR", "output"),
    "message_templates": {
        "default_alert": "Air quality alert: {pollutant} levels are {severity} in your area. Current value: {current_value}. Take necessary precautions."
    }
}

# JWT settings from environment variables
SECRET_KEY = os.environ.get("JWT_SECRET_KEY")
ALGORITHM = os.environ.get("JWT_ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30))

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

def verify_password(plain_password, hashed_password):
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    return pwd_context.hash(password)

# OAuth2 scheme
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/token")

# User model
class User(BaseModel):
    username: str
    password: str

# In-memory user store (for demonstration purposes)
users_db = {}

@app.post("/api/register")
def register(user: User):
    if user.username in users_db:
        raise HTTPException(status_code=400, detail="Username already registered")
    hashed_password = get_password_hash(user.password)
    users_db[user.username] = {"username": user.username, "password": hashed_password}
    return {"message": "User registered successfully"}

@app.post("/api/token")
def login(form_data: OAuth2PasswordRequestForm = Depends()):
    user = users_db.get(form_data.username)
    if not user or not verify_password(form_data.password, user["password"]):
        raise HTTPException(status_code=401, detail="Invalid username or password")
    access_token_expires = timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = jwt.encode({"sub": form_data.username, "exp": datetime.utcnow() + access_token_expires}, SECRET_KEY, algorithm=ALGORITHM)
    return {"access_token": access_token, "token_type": "bearer"}

@app.get("/api/users/me")
def read_users_me(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        username = payload.get("sub")
        if username is None:
            raise HTTPException(status_code=401, detail="Invalid token")
        return {"username": username}
    except JWTError:
        raise HTTPException(status_code=401, detail="Invalid token")

# Initialize database
@app.on_event("startup")
def startup_db_client():  # Changed from async to sync
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)  # Changed to synchronous approach
    logger.info("Database initialized")

@app.on_event("shutdown")
def shutdown_db_client():  # Changed from async to sync
    # No need to dispose engine in synchronous mode
    logger.info("Database connection closed")

# Initialize Flask-Migrate with the app
init_app(app)

# Health check route
@app.get("/health")
def health_check():  # Changed from async to sync
    """Simple health check endpoint to verify API is running."""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}

# Air quality data routes
@app.get("/api/monitoring_stations")
def get_monitoring_stations(  # Changed from async to sync
    db = Depends(get_db),  # Removed AsyncSession type hint
    limit: int = 100,
    offset: int = 0
):
    """
    Get list of air quality monitoring stations.
    
    Parameters:
    - limit: Maximum number of stations to return
    - offset: Number of stations to skip for pagination
    """
    from sqlalchemy import select
    
    query = select(MonitoringStation).limit(limit).offset(offset)
    result = db.execute(query)  # Changed from await db.execute
    stations = result.scalars().all()

    # Serialize response
    serialized_stations = [
        {
            "id": station.id,
            "name": station.station_name,
            "latitude": station.latitude,
            "longitude": station.longitude,
            "location": f"POINT({station.longitude} {station.latitude})" if station.latitude and station.longitude else None,
            "last_updated": station.last_updated.isoformat() if station.last_updated else None,
        }
        for station in stations
    ]

    return {
        "count": len(serialized_stations),
        "stations": serialized_stations
    }

@app.get("/api/air_quality")
def get_air_quality(
    station_id: Optional[int] = None,
    pollutant: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db = Depends(get_db)
):
    """
    Get air quality data for specific stations, pollutants, and time ranges.
    
    Parameters:
    - station_id: Filter by monitoring station ID
    - pollutant: Filter by pollutant (pm25, pm10, o3, no2, so2, co)
    - start_date: Filter from this date (ISO format)
    - end_date: Filter to this date (ISO format)
    """
    from sqlalchemy import select, and_, outerjoin
    
    logger.info(f"API request: /api/air_quality with params station_id={station_id}, pollutant={pollutant}, start_date={start_date}, end_date={end_date}")
    
    # Build query with joined WeatherData
    from ..models.air_quality import WeatherData
    
    # Build query with weather data join
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
    if station_id is not None:
        filters.append(PollutantReading.station_id == station_id)
        logger.info(f"Filtering by station_id: {station_id}")
        
    if start_date is not None:
        try:
            # Handle UTC timezone indicator 'Z'
            clean_start_date = start_date
            if clean_start_date.endswith('Z'):
                clean_start_date = clean_start_date[:-1]  # Remove the 'Z'
                logger.info(f"Removed UTC indicator 'Z' from start_date: {clean_start_date}")
                
            # Try multiple date formats
            formats = ["%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]
            
            start_dt = None
            for fmt in formats:
                try:
                    start_dt = datetime.strptime(clean_start_date, fmt)
                    logger.info(f"Successfully parsed start_date using format: {fmt}")
                    break
                except ValueError:
                    continue
                    
            if not start_dt:
                raise ValueError(f"Could not parse date format for: {clean_start_date}")
                
            filters.append(PollutantReading.timestamp >= start_dt)
            logger.info(f"Filtering by start_date: {start_dt}")
        except ValueError as e:
            logger.error(f"Error parsing start_date: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or YYYY-MM-DD")
            
    if end_date is not None:
        try:
            # Handle UTC timezone indicator 'Z'
            clean_end_date = end_date
            if clean_end_date.endswith('Z'):
                clean_end_date = clean_end_date[:-1]  # Remove the 'Z'
                logger.info(f"Removed UTC indicator 'Z' from end_date: {clean_end_date}")
                
            # Try multiple date formats
            formats = ["%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]
            
            end_dt = None
            for fmt in formats:
                try:
                    end_dt = datetime.strptime(clean_end_date, fmt)
                    logger.info(f"Successfully parsed end_date using format: {fmt}")
                    break
                except ValueError:
                    continue
                    
            if not end_dt:
                raise ValueError(f"Could not parse date format for: {clean_end_date}")
                
            filters.append(PollutantReading.timestamp <= end_dt)
            logger.info(f"Filtering by end_date: {end_dt}")
        except ValueError as e:
            logger.error(f"Error parsing end_date: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or YYYY-MM-DD")
    
    if filters:
        query = query.where(and_(*filters))
    
    # Log the query - Fixed version for newer SQLAlchemy
    try:
        from sqlalchemy.dialects import sqlite
        # In newer versions of SQLAlchemy, Select objects are directly compilable
        query_str = str(query.compile(dialect=sqlite.dialect(), compile_kwargs={"literal_binds": True}))
        logger.info(f"Executing query: {query_str}")
    except Exception as e:
        logger.warning(f"Could not compile query to string: {str(e)}")
    
    # Execute query
    result = db.execute(query.order_by(PollutantReading.timestamp.desc()).limit(1000))
    readings_with_weather = result.all()
    logger.info(f"Query returned {len(readings_with_weather)} readings with weather data")
    
    # If pollutant is specified, filter the results
    if pollutant is not None:
        valid_pollutants = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'aqi']
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

# Task to fetch new air quality data
async def fetch_air_quality_data_task():
    """
    Task to fetch new air quality data from sources.
    """
    # Create a new database session for this task
    async with AsyncSession(engine) as session:
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
            logger.error(f"Error fetching air quality data: {str(e)}")
            return {"success": False, "error": str(e)}

@app.post("/api/fetch_data")
async def fetch_air_quality_data(background_tasks: BackgroundTasks):
    """
    Trigger a background task to fetch new air quality data.
    """
    background_tasks.add_task(fetch_air_quality_data_task)
    return {"message": "Data fetch task started"}

# Task to generate interpolation map
async def generate_interpolation_map_task(
    pollutant: str, 
    output_path: Optional[str] = None
):
    """
    Task to generate interpolation map for a pollutant.
    """
    # Create a new database session for this task
    async with AsyncSession(engine) as session:
        # Get recent readings for this pollutant
        from sqlalchemy import select, func, and_
        from sqlalchemy.orm import selectinload
        
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
            return {"success": False, "error": "No readings found"}
        
        # Prepare data for interpolation
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
            return {"success": False, "error": f"No {pollutant} readings found"}
        
        # Convert to GeoDataFrame
        import pandas as pd
        from shapely.geometry import Point
        
        df = pd.DataFrame(data)
        geometry = [Point(xy) for xy in zip(df["longitude"], df["latitude"])]
        gdf = gpd.GeoDataFrame(df, geometry=geometry, crs="EPSG:4326")
        
        # Create interpolator
        interpolator = SpatialInterpolator({
            "cell_size": 0.01,
            "output_dir": config["gis_output_dir"]
        })
        
        # Generate interpolation
        try:
            output_path = interpolator.generate_interpolation_map(
                gdf, 
                pollutant, 
                output_path
            )
            logger.info(f"Generated interpolation map: {output_path}")
            return {"success": True, "path": output_path}
        except Exception as e:
            logger.error(f"Error generating interpolation map: {str(e)}")
            return {"success": False, "error": str(e)}

@app.post("/api/generate_map")
async def generate_map(
    background_tasks: BackgroundTasks,
    pollutant: str = Query(..., description="Pollutant to map (pm25, pm10, o3, no2, so2, co, aqi)")
):
    """
    Trigger a background task to generate an interpolation map for a pollutant.
    """
    valid_pollutants = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'aqi']
    if pollutant not in valid_pollutants:
        raise HTTPException(status_code=400, detail=f"Invalid pollutant. Must be one of: {', '.join(valid_pollutants)}")
        
    output_path = os.path.join(config["gis_output_dir"], f"{pollutant}_interpolation.png")
    background_tasks.add_task(generate_interpolation_map_task, pollutant, output_path)
    
    return {
        "message": f"Map generation for {pollutant} started",
        "expected_path": output_path
    }

# Task to check for threshold exceedances and create alerts
async def check_threshold_exceedances_task(pollutant: str):
    """
    Task to check for threshold exceedances and create alerts.
    """
    # Create a new database session for this task
    async with AsyncSession(engine) as session:
        # Create threshold analyzer
        analyzer = ThresholdAnalyzer({})  # Use default thresholds
        
        # Generate interpolation for analysis
        interpolator = SpatialInterpolator({
            "cell_size": 0.01,
            "output_dir": config["gis_output_dir"]
        })
        
        # Get recent readings as in the map generation task
        from sqlalchemy import select, func, and_
        from sqlalchemy.orm import selectinload
        
        subquery = (
            select(
                PollutantReading.station_id,
                func.max(PollutantReading.timestamp).label("max_timestamp")
            )
            .group_by(PollutantReading.station_id)
            .subquery()
        )
        
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
            logger.warning("No readings found for threshold analysis")
            return {"success": False, "error": "No readings found"}
        
        # Prepare data for interpolation
        data = []
        for reading, station in readings_with_stations:
            value = getattr(reading, pollutant, None)
            if value is not None:
                data.append({
                    "latitude": station.latitude,
                    "longitude": station.longitude,
                    pollutant: value
                })
        
        if not data:
            logger.warning(f"No {pollutant} readings found for threshold analysis")
            return {"success": False, "error": f"No {pollutant} readings found"}
        
        # Convert to GeoDataFrame
        import pandas as pd
        from shapely.geometry import Point
        
        df = pd.DataFrame(data)
        geometry = [Point(xy) for xy in zip(df["longitude"], df["latitude"])]
        gdf = gpd.GeoDataFrame(df, geometry=geometry, crs="EPSG:4326")
        
        try:
            # Perform interpolation
            raster, transform, bounds = interpolator.interpolate_pollutant(gdf, pollutant)
            
            # Identify exceedances
            exceedances = analyzer.identify_threshold_exceedances(pollutant, raster, transform)
            
            # Generate visualization of exceedances
            if exceedances:
                analyzer.visualize_threshold_exceedances(
                    exceedances,
                    None,
                    os.path.join(config["gis_output_dir"], f"{pollutant}_exceedances.png"),
                    pollutant
                )
            
            # Create alerts for exceedances
            if exceedances:
                # Create alert trigger
                trigger = AlertTrigger(session, config)
                alert_ids = await trigger.process_exceedances(pollutant, exceedances)
                
                # Generate alert messages
                if alert_ids:
                    generator = LLMAlertGenerator(session, config)
                    message_count = await generator.generate_alert_messages()
                    logger.info(f"Generated {message_count} alert messages")
                
                return {
                    "success": True,
                    "exceedance_levels": list(exceedances.keys()),
                    "alert_count": len(alert_ids)
                }
            else:
                return {
                    "success": True,
                    "exceedance_levels": [],
                    "alert_count": 0
                }
                
        except Exception as e:
            logger.error(f"Error in threshold analysis: {str(e)}")
            return {"success": False, "error": str(e)}

@app.post("/api/check_alerts")
async def check_alerts(
    background_tasks: BackgroundTasks,
    pollutant: str = Query(None, description="Pollutant to check (pm25, pm10, o3, no2, so2, co, aqi)")
):
    """
    Trigger a background task to check for threshold exceedances and create alerts.
    This endpoint supports checking for all supported pollutants.
    """
    valid_pollutants = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'aqi']
    
    if pollutant and pollutant not in valid_pollutants:
        raise HTTPException(status_code=400, detail=f"Invalid pollutant. Must be one of: {', '.join(valid_pollutants)}")

    if not pollutant:
        # If no specific pollutant is provided, check all pollutants
        logger.info("No specific pollutant provided. Checking all pollutants.")
        for p in valid_pollutants:
            background_tasks.add_task(check_threshold_exceedances_task, p)
        return {
            "message": "Alert check started for all pollutants",
            "pollutants": valid_pollutants
        }
    else:
        # Check just the specified pollutant
        logger.info(f"Checking alerts for pollutant: {pollutant}")
        background_tasks.add_task(check_threshold_exceedances_task, pollutant)
        return {
            "message": f"Alert check for {pollutant} started"
        }

@app.get("/api/alerts")
def get_alerts(  # Changed from async to sync
    active_only: bool = True,
    severity_min: int = 0,
    db = Depends(get_db)  # Removed AsyncSession type hint
):
    """
    Get list of active alerts.
    
    Parameters:
    - active_only: Only return active alerts
    - severity_min: Minimum severity level (0-5)
    """
    from sqlalchemy import select, and_
    
    # Build query with filters
    filters = []
    if active_only:
        filters.append(Alert.is_active == True)
        
    if severity_min > 0:
        filters.append(Alert.severity_level >= severity_min)
    
    query = select(Alert).where(and_(*filters) if filters else True)
    
    # Execute query
    result = db.execute(query.order_by(Alert.created_at.desc()))  # Changed from await db.execute
    alerts = result.scalars().all()
    
    # Format response
    formatted_alerts = []
    for alert in alerts:
        formatted_alerts.append({
            "id": alert.id,
            "alert_type": alert.alert_type,
            "severity_level": alert.severity_level,
            "pollutant": alert.pollutant,
            "threshold_value": alert.threshold_value,
            "current_value": alert.current_value,
            "created_at": alert.created_at.isoformat(),
            "expires_at": alert.expires_at.isoformat(),
            "is_active": alert.is_active
        })
    
    return {
        "count": len(formatted_alerts),
        "alerts": formatted_alerts
    }

@app.get("/api/notifications/{user_id}")
def get_user_notifications(  # Changed from async to sync
    user_id: int,
    unread_only: bool = False,
    db = Depends(get_db)  # Removed AsyncSession type hint
):
    """
    Get notifications for a specific user.
    
    Parameters:
    - user_id: User ID
    - unread_only: Only return unread notifications
    """
    from sqlalchemy import select, and_
    from sqlalchemy.orm import selectinload
    
    # Check if user exists
    user_query = select(User).where(User.id == user_id)
    user_result = db.execute(user_query)  # Changed from await db.execute
    user = user_result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Build notification query
    filters = [Notification.user_id == user_id]
    
    if unread_only:
        filters.append(Notification.read_at == None)
    
    query = select(Notification, Alert).join(
        Alert, 
        Notification.alert_id == Alert.id
    ).where(and_(*filters))
    
    # Execute query
    result = db.execute(query.order_by(Notification.sent_at.desc()))  # Changed from await db.execute
    notifications_with_alerts = result.all()
    
    # Format response
    formatted_notifications = []
    for notification, alert in notifications_with_alerts:
        formatted_notifications.append({
            "id": notification.id,
            "alert_id": notification.alert_id,
            "message": notification.message,
            "delivery_channel": notification.delivery_channel,
            "sent_at": notification.sent_at.isoformat() if notification.sent_at else None,
            "received_at": notification.received_at.isoformat() if notification.received_at else None,
            "read_at": notification.read_at.isoformat() if notification.read_at else None,
            "alert": {
                "pollutant": alert.pollutant,
                "severity_level": alert.severity_level,
                "current_value": alert.current_value,
                "threshold_value": alert.threshold_value
            }
        })
    
    return {
        "count": len(formatted_notifications),
        "notifications": formatted_notifications
    }

@app.get("/api/map")
async def get_interactive_map():
    """Serve an interactive map showing air quality data."""
    return {"message": "Interactive map endpoint under construction."}

@app.get("/api/get_monitoring_stations")
def get_monitoring_stations():
    """
    Retrieve a list of monitoring stations.
    """
    from sqlalchemy.orm import Session
    db = Session(engine)
    try:
        logger.info("Fetching monitoring stations from the database.")
        stations = db.query(MonitoringStation).all()
        logger.info(f"Query executed successfully. Retrieved {len(stations)} stations.")
        serialized_stations = []
        for station in stations:
            try:
                logger.info(f"Serializing station: {station}")
                serialized_stations.append({
                    "id": station.id,
                    "station_code": station.station_code,
                    "station_name": station.station_name,
                    "latitude": station.latitude,
                    "longitude": station.longitude,
                    "city": station.city,
                    "state": station.state,
                    "country": station.country,
                    "source": station.source,
                    "last_updated": station.last_updated.isoformat() if station.last_updated else None
                })
            except Exception as e:
                logger.error(f"Error serializing station {station.id}: {str(e)}", exc_info=True)
        logger.info(f"Serialization completed. Returning {len(serialized_stations)} stations.")
        return {"stations": serialized_stations}
    except Exception as e:
        logger.error(f"Error fetching monitoring stations: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch monitoring stations")
    finally:
        db.close()

@app.get("/api/get_air_quality")
def get_air_quality(station_id: int, start_time: str, end_time: str):
    """
    Retrieve air quality data for a specific station and time range.
    """
    from sqlalchemy.orm import Session
    from datetime import datetime
    db = Session(engine)
    try:
        logger.info(f"Fetching air quality data for station_id={station_id}, start_time={start_time}, end_time={end_time}.")
        try:
            # More flexible date parsing - try multiple formats if needed
            formats = ["%Y-%m-%dT%H:%M:%S", "%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]
            
            start = None
            for fmt in formats:
                try:
                    start = datetime.strptime(start_time, fmt)
                    break
                except ValueError:
                    continue
            
            end = None
            for fmt in formats:
                try:
                    end = datetime.strptime(end_time, fmt)
                    break
                except ValueError:
                    continue
            
            if not start or not end:
                raise ValueError("Could not parse date format")
                
            logger.info(f"Parsed date range: {start} to {end}")
        except ValueError as e:
            logger.error(f"Date parsing error: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid date format. Try ISO format (YYYY-MM-DDTHH:MM:SS) or YYYY-MM-DD")

        # Check if station exists
        station = db.query(MonitoringStation).filter(MonitoringStation.id == station_id).first()
        if not station:
            logger.warning(f"Station with ID {station_id} not found")
            raise HTTPException(status_code=404, detail=f"Station with ID {station_id} not found")
        
        logger.info(f"Found station: {station.station_name} (ID: {station_id})")
        
        # Build query with logging
        query = db.query(PollutantReading).filter(
            PollutantReading.station_id == station_id,
            PollutantReading.timestamp >= start,
            PollutantReading.timestamp <= end
        )
        
        # Log the SQL query
        from sqlalchemy.dialects import sqlite
        query_str = str(query.statement.compile(dialect=sqlite.dialect(), compile_kwargs={"literal_binds": True}))
        logger.info(f"Executing query: {query_str}")
        
        readings = query.all()
        logger.info(f"Fetched {len(readings)} air quality readings.")
        
        if len(readings) == 0:
            # Debug: Check if there are any readings at all for this station
            total_readings = db.query(PollutantReading).filter(PollutantReading.station_id == station_id).count()
            logger.info(f"Total readings for station {station_id}: {total_readings}")
            
            if total_readings > 0:
                # Debug: Get the earliest and latest timestamp
                earliest = db.query(func.min(PollutantReading.timestamp)).filter(
                    PollutantReading.station_id == station_id
                ).scalar()
                latest = db.query(func.max(PollutantReading.timestamp)).filter(
                    PollutantReading.station_id == station_id
                ).scalar()
                logger.info(f"Available data range for station {station_id}: {earliest} to {latest}")
                logger.info(f"Query range: {start} to {end}")
                
                # Check if timestamps are of the same type
                logger.info(f"Timestamp types - earliest: {type(earliest)}, query start: {type(start)}")

        serialized_readings = [
            {
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
                "temperature": reading.temperature,
                "humidity": reading.humidity,
                "wind_speed": reading.wind_speed,
                "wind_direction": reading.wind_direction,
                "pressure": reading.pressure
            }
            for reading in readings
        ]

        return {"readings": serialized_readings}
    except Exception as e:
        logger.error(f"Error fetching air quality data: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail="Failed to fetch air quality data")
    finally:
        db.close()

# Add route aliases for backward compatibility with frontend
@app.get("/api/monitoring_stations")
def get_monitoring_stations_compatible(limit: int = 100, offset: int = 0):
    """
    Route for monitoring stations to maintain compatibility with frontend.
    """
    logger.info(f"Frontend compatible monitoring stations endpoint called with limit={limit}, offset={offset}")
    return get_monitoring_stations()

@app.get("/api/air_quality")
def get_air_quality_compatible(
    station_id: Optional[int] = None,
    pollutant: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db = Depends(get_db)
):
    """
    Route for air quality to maintain compatibility with frontend.
    This ensures both old and new frontend code works properly.
    """
    logger.info(f"Frontend compatible air quality endpoint called with params: station_id={station_id}, pollutant={pollutant}, start_date={start_date}, end_date={end_date}")
    
    # Build query with joined WeatherData
    from sqlalchemy import select, and_, outerjoin
    from ..models.air_quality import WeatherData
    
    # Build query with weather data join
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
    if station_id is not None:
        filters.append(PollutantReading.station_id == station_id)
        logger.info(f"Filtering by station_id: {station_id}")
        
    if start_date is not None:
        try:
            # Handle UTC timezone indicator 'Z'
            if start_date.endswith('Z'):
                start_date = start_date[:-1]  # Remove the 'Z'
                logger.info(f"Removed UTC indicator 'Z' from start_date: {start_date}")
                
            # Try multiple date formats
            formats = ["%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]
            
            start_dt = None
            for fmt in formats:
                try:
                    start_dt = datetime.strptime(start_date, fmt)
                    logger.info(f"Successfully parsed start_date using format: {fmt}")
                    break
                except ValueError:
                    continue
                    
            if not start_dt:
                raise ValueError(f"Could not parse date format for: {start_date}")
                
            filters.append(PollutantReading.timestamp >= start_dt)
            logger.info(f"Filtering by start_date: {start_dt}")
        except ValueError as e:
            logger.error(f"Error parsing start_date: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid start_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or YYYY-MM-DD")
            
    if end_date is not None:
        try:
            # Handle UTC timezone indicator 'Z'
            if end_date.endswith('Z'):
                end_date = end_date[:-1]  # Remove the 'Z'
                logger.info(f"Removed UTC indicator 'Z' from end_date: {end_date}")
                
            # Try multiple date formats
            formats = ["%Y-%m-%dT%H:%M:%S.%f", "%Y-%m-%dT%H:%M:%S", "%Y-%m-%d %H:%M:%S", "%Y-%m-%d"]
            
            end_dt = None
            for fmt in formats:
                try:
                    end_dt = datetime.strptime(end_date, fmt)
                    logger.info(f"Successfully parsed end_date using format: {fmt}")
                    break
                except ValueError:
                    continue
                    
            if not end_dt:
                raise ValueError(f"Could not parse date format for: {end_date}")
                
            filters.append(PollutantReading.timestamp <= end_dt)
            logger.info(f"Filtering by end_date: {end_dt}")
        except ValueError as e:
            logger.error(f"Error parsing end_date: {str(e)}")
            raise HTTPException(status_code=400, detail="Invalid end_date format. Use ISO format (YYYY-MM-DDTHH:MM:SS) or YYYY-MM-DD")
    
    if filters:
        query = query.where(and_(*filters))
    
    # Log the query
    try:
        from sqlalchemy.dialects import sqlite
        # In newer versions of SQLAlchemy, Select objects are directly compilable
        query_str = str(query.compile(dialect=sqlite.dialect(), compile_kwargs={"literal_binds": True}))
        logger.info(f"Executing query: {query_str}")
    except Exception as e:
        logger.warning(f"Could not compile query to string: {str(e)}")
    
    # Execute query
    result = db.execute(query.order_by(PollutantReading.timestamp.desc()).limit(1000))
    readings_with_weather = result.all()
    logger.info(f"Query returned {len(readings_with_weather)} readings with weather data")
    
    # If pollutant is specified, filter the results
    if pollutant is not None:
        valid_pollutants = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'aqi']
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
    
    logger.info(f"Returning {len(formatted_readings)} formatted readings")
    return {
        "count": len(formatted_readings),
        "readings": formatted_readings
    }

@app.post("/api/notifications/process")
async def process_notifications(
    background_tasks: BackgroundTasks,
    alert_id: Optional[int] = None
):
    """
    Process pending notifications. If alert_id is provided, only process
    notifications for that specific alert.
    """
    from ..notifications.manager import NotificationManager

    logger.info("Processing notifications endpoint called")
    
    async def process_notifications_task(alert_id=None):
        async with AsyncSession(engine) as session:
            manager = NotificationManager(session, config)
            
            if alert_id:
                # Process notifications for specific alert
                logger.info(f"Processing notifications for alert {alert_id}")
                result = await manager.send_alert_notifications(alert_id)
                logger.info(f"Notification processing complete: {result}")
            else:
                # Process all pending notifications
                logger.info("Processing all pending notifications")
                result = await manager.process_pending_notifications()
                logger.info(f"Notification processing complete: {result}")
                
            return result
    
    background_tasks.add_task(process_notifications_task, alert_id)
    
    if alert_id:
        return {"message": f"Notification processing started for alert {alert_id}"}
    else:
        return {"message": "Notification processing started for all pending notifications"}

@app.post("/api/verify_email")
async def send_verification_email(
    background_tasks: BackgroundTasks,
    email: str = Query(..., description="Email to verify"),
    db = Depends(get_db)
):
    """
    Send a verification email to the user.
    
    Parameters:
    - email: Email address to verify
    """
    from sqlalchemy import select, update
    from ..notifications.email import EmailSender
    import secrets
    import time
    import hashlib
    
    # Check if the user with this email exists
    user_query = select(User).where(User.email == email)
    result = db.execute(user_query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Generate verification token
    token = secrets.token_urlsafe(32)
    expires = int(time.time()) + 86400  # 24 hours
    
    # Store verification token in user's profile
    update_stmt = update(User).where(User.id == user.id).values(
        verification_token=token,
        verification_token_expires=datetime.fromtimestamp(expires)
    )
    db.execute(update_stmt)
    db.commit()
    
    # Function to send verification email in the background
    async def send_verification_email_task(user_id: int, email: str, token: str):
        async with AsyncSession(engine) as session:
            # Create email sender
            email_sender = EmailSender(config, session)
            
            # Create verification link
            verification_link = f"{os.environ.get('FRONTEND_URL', 'http://localhost:3000')}/verify-email?token={token}"
            
            # Create HTML email body
            body = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #3498db; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; }}
                    .button {{ display: inline-block; background-color: #3498db; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin-top: 15px; }}
                    .footer {{ font-size: 12px; text-align: center; margin-top: 20px; color: #777; padding: 10px; background-color: #f1f1f1; border-radius: 0 0 5px 5px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Email Verification</h2>
                    </div>
                    <div class="content">
                        <p>Hello {user.name or 'User'},</p>
                        
                        <p>Thank you for registering with AirAlert! Please verify your email address by clicking the button below:</p>
                        
                        <p style="text-align: center;">
                            <a href="{verification_link}" class="button">Verify Email</a>
                        </p>
                        
                        <p>If you didn't register for an AirAlert account, you can safely ignore this email.</p>
                        
                        <p>This verification link will expire in 24 hours.</p>
                        
                        <p>Regards,<br/>AirAlert Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from the AirAlert air quality monitoring system.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Send email
            try:
                await email_sender._send_email(
                    email,
                    user.name,
                    "AirAlert - Verify Your Email",
                    body
                )
                logger.info(f"Verification email sent to {email}")
            except Exception as e:
                logger.error(f"Failed to send verification email: {str(e)}")
    
    # Add the email sending task to background tasks
    background_tasks.add_task(send_verification_email_task, user.id, email, token)
    
    return {"message": "Verification email sent"}

@app.get("/api/verify_email/{token}")
def verify_email(token: str, db = Depends(get_db)):
    """
    Verify a user's email using the token sent to them.
    
    Parameters:
    - token: The verification token
    """
    from sqlalchemy import select, update
    
    # Find user with this verification token
    user_query = select(User).where(User.verification_token == token)
    result = db.execute(user_query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=400, detail="Invalid or expired verification token")
    
    # Check if token is expired
    if not user.verification_token_expires or user.verification_token_expires < datetime.now():
        raise HTTPException(status_code=400, detail="Verification token has expired")
    
    # Update user to verified status
    update_stmt = update(User).where(User.id == user.id).values(
        is_verified=True,
        verification_token=None,
        verification_token_expires=None
    )
    db.execute(update_stmt)
    db.commit()
    
    return {"message": "Email verified successfully"}

@app.get("/api/users/{user_id}/preferences")
def get_user_preferences(user_id: int, db = Depends(get_db)):
    """
    Get a user's notification preferences.
    
    Parameters:
    - user_id: User ID
    """
    from sqlalchemy import select
    
    # Check if user exists
    user_query = select(User).where(User.id == user_id)
    result = db.execute(user_query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's alert subscriptions
    from ..models.users import AlertSubscription
    
    subscription_query = select(AlertSubscription).where(AlertSubscription.user_id == user_id)
    subscription_result = db.execute(subscription_query)
    subscriptions = subscription_result.scalars().all()
    
    # Get health profile if exists
    from ..models.users import HealthProfile
    
    health_query = select(HealthProfile).where(HealthProfile.user_id == user_id)
    health_result = db.execute(health_query)
    health_profile = health_result.scalar_one_or_none()
    
    # Format response
    preferences = {
        "user_id": user.id,
        "notification_channels": {
            "email": user.preferred_channel == "email" or user.preferred_channel == "all",
            "sms": user.preferred_channel == "sms" or user.preferred_channel == "all",
            "app": user.preferred_channel == "app" or user.preferred_channel == "all"
        },
        "language": user.language,
        "sensitivity_level": user.sensitivity_level,
        "is_active": user.is_active,
        "alert_subscriptions": [
            {
                "id": sub.id,
                "alert_type": sub.alert_type,
                "min_severity": sub.min_severity,
                "is_active": sub.is_active
            } for sub in subscriptions
        ],
        "health_profile": None if not health_profile else {
            "has_asthma": health_profile.has_asthma,
            "has_copd": health_profile.has_copd,
            "has_heart_disease": health_profile.has_heart_disease,
            "has_diabetes": health_profile.has_diabetes,
            "has_pregnancy": health_profile.has_pregnancy,
            "age_category": health_profile.age_category
        },
        "locations": {
            "home": {
                "latitude": user.home_latitude,
                "longitude": user.home_longitude
            } if user.home_latitude and user.home_longitude else None,
            "work": {
                "latitude": user.work_latitude,
                "longitude": user.work_longitude
            } if user.work_latitude and user.work_longitude else None
        }
    }
    
    return preferences

@app.put("/api/users/{user_id}/preferences")
def update_user_preferences(
    user_id: int, 
    preferences: dict,
    db = Depends(get_db)
):
    """
    Update a user's notification preferences.
    
    Parameters:
    - user_id: User ID
    - preferences: Updated preference settings
    """
    from sqlalchemy import select, update
    
    # Check if user exists
    user_query = select(User).where(User.id == user_id)
    result = db.execute(user_query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    try:
        # Update user's basic preferences
        user_updates = {}
        
        # Process notification channels
        if "notification_channels" in preferences:
            channels = preferences["notification_channels"]
            if all(channels.get(c, False) for c in ["email", "sms", "app"]):
                user_updates["preferred_channel"] = "all"
            elif channels.get("email", False):
                user_updates["preferred_channel"] = "email"
            elif channels.get("sms", False):
                user_updates["preferred_channel"] = "sms"
            elif channels.get("app", False):
                user_updates["preferred_channel"] = "app"
        
        # Process other basic preferences
        if "language" in preferences:
            user_updates["language"] = preferences["language"]
        
        if "sensitivity_level" in preferences:
            user_updates["sensitivity_level"] = preferences["sensitivity_level"]
        
        if "is_active" in preferences:
            user_updates["is_active"] = preferences["is_active"]
        
        # Update user record if we have changes
        if user_updates:
            update_stmt = update(User).where(User.id == user_id).values(**user_updates)
            db.execute(update_stmt)
        
        # Update alert subscriptions if provided
        if "alert_subscriptions" in preferences:
            from ..models.users import AlertSubscription
            
            for sub in preferences["alert_subscriptions"]:
                if "id" in sub and sub["id"]:
                    # Update existing subscription
                    sub_updates = {}
                    if "min_severity" in sub:
                        sub_updates["min_severity"] = sub["min_severity"]
                    if "is_active" in sub:
                        sub_updates["is_active"] = sub["is_active"]
                        
                    if sub_updates:
                        sub_update_stmt = update(AlertSubscription).where(
                            AlertSubscription.id == sub["id"],
                            AlertSubscription.user_id == user_id  # Ensure user ownership
                        ).values(**sub_updates)
                        db.execute(sub_update_stmt)
                elif "alert_type" in sub:
                    # Create new subscription
                    new_sub = AlertSubscription(
                        user_id=user_id,
                        alert_type=sub["alert_type"],
                        min_severity=sub.get("min_severity", 1),
                        is_active=sub.get("is_active", True)
                    )
                    db.add(new_sub)
        
        # Update health profile if provided
        if "health_profile" in preferences:
            from ..models.users import HealthProfile
            
            health_data = preferences["health_profile"]
            
            # Check if health profile already exists
            health_query = select(HealthProfile).where(HealthProfile.user_id == user_id)
            health_result = db.execute(health_query)
            health_profile = health_result.scalar_one_or_none()
            
            if health_profile:
                # Update existing profile
                health_updates = {}
                for field in ["has_asthma", "has_copd", "has_heart_disease", "has_diabetes", "has_pregnancy", "age_category"]:
                    if field in health_data:
                        health_updates[field] = health_data[field]
                
                if health_updates:
                    health_update_stmt = update(HealthProfile).where(
                        HealthProfile.id == health_profile.id
                    ).values(**health_updates)
                    db.execute(health_update_stmt)
            else:
                # Create new health profile
                new_health = HealthProfile(
                    user_id=user_id,
                    has_asthma=health_data.get("has_asthma", False),
                    has_copd=health_data.get("has_copd", False),
                    has_heart_disease=health_data.get("has_heart_disease", False),
                    has_diabetes=health_data.get("has_diabetes", False),
                    has_pregnancy=health_data.get("has_pregnancy", False),
                    age_category=health_data.get("age_category", "adult")
                )
                db.add(new_health)
        
        # Process location updates
        if "locations" in preferences:
            locations = preferences["locations"]
            
            # Update home location if provided
            if "home" in locations and locations["home"]:
                from geoalchemy2.elements import WKTElement
                home = locations["home"]
                if "latitude" in home and "longitude" in home:
                    # Create WKT point for GeoAlchemy
                    wkt_point = f"POINT({home['longitude']} {home['latitude']})"
                    user_update = update(User).where(User.id == user_id).values(
                        home_location=WKTElement(wkt_point, srid=4326)
                    )
                    db.execute(user_update)
            
            # Update work location if provided
            if "work" in locations and locations["work"]:
                from geoalchemy2.elements import WKTElement
                work = locations["work"]
                if "latitude" in work and "longitude" in work:
                    # Create WKT point for GeoAlchemy
                    wkt_point = f"POINT({work['longitude']} {work['latitude']})"
                    user_update = update(User).where(User.id == user_id).values(
                        work_location=WKTElement(wkt_point, srid=4326)
                    )
                    db.execute(user_update)
        
        # Commit all changes
        db.commit()
        
        return {"message": "Preferences updated successfully"}
    
    except Exception as e:
        db.rollback()
        logger.error(f"Error updating user preferences: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")

@app.post("/api/users/{user_id}/alert_subscriptions")
def create_alert_subscription(user_id: int, subscription: dict, db = Depends(get_db)):
    """
    Create a new alert subscription for a user.
    
    Parameters:
    - user_id: User ID
    - subscription: Alert subscription details
    """
    from sqlalchemy import select
    
    # Check if user exists
    user_query = select(User).where(User.id == user_id)
    result = db.execute(user_query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate required fields
    if "alert_type" not in subscription:
        raise HTTPException(status_code=400, detail="alert_type is required")
    
    # Create new subscription
    from ..models.users import AlertSubscription
    
    try:
        new_sub = AlertSubscription(
            user_id=user_id,
            alert_type=subscription["alert_type"],
            min_severity=subscription.get("min_severity", 1),
            is_active=subscription.get("is_active", True)
        )
        db.add(new_sub)
        db.commit()
        db.refresh(new_sub)
        
        return {
            "id": new_sub.id,
            "user_id": new_sub.user_id,
            "alert_type": new_sub.alert_type,
            "min_severity": new_sub.min_severity,
            "is_active": new_sub.is_active,
            "created_at": new_sub.created_at.isoformat()
        }
    except Exception as e:
        db.rollback()
        logger.error(f"Error creating alert subscription: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create subscription: {str(e)}")

@app.delete("/api/users/{user_id}/alert_subscriptions/{subscription_id}")
def delete_alert_subscription(user_id: int, subscription_id: int, db = Depends(get_db)):
    """
    Delete an alert subscription.
    
    Parameters:
    - user_id: User ID
    - subscription_id: Subscription ID to delete
    """
    from sqlalchemy import select, delete
    from ..models.users import AlertSubscription
    
    # Check if subscription exists and belongs to the user
    subscription_query = select(AlertSubscription).where(
        AlertSubscription.id == subscription_id,
        AlertSubscription.user_id == user_id
    )
    result = db.execute(subscription_query)
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found or doesn't belong to the user")
    
    try:
        # Delete the subscription
        from sqlalchemy import delete
        delete_stmt = delete(AlertSubscription).where(
            AlertSubscription.id == subscription_id,
            AlertSubscription.user_id == user_id
        )
        db.execute(delete_stmt)
        db.commit()
        
        return {"message": "Subscription deleted successfully"}
    except Exception as e:
        db.rollback()
        logger.error(f"Error deleting subscription: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete subscription: {str(e)}")

@app.post("/api/web-push/subscribe")
async def subscribe_web_push(
    subscription: Dict[str, Any],
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Subscribe to web push notifications.
    
    Parameters:
    - subscription: Web Push subscription object from the browser
    """
    from ..models.users import WebPushSubscription
    
    # Convert subscription to JSON string
    subscription_json = json.dumps(subscription)
    
    # Get user agent header
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    # Check if this subscription already exists
    from sqlalchemy import select
    existing_query = select(WebPushSubscription).where(
        WebPushSubscription.user_id == user.id,
        WebPushSubscription.subscription_json == subscription_json
    )
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalar_one_or_none()
    
    if existing:
        # If it exists but was inactive, reactivate it
        if not existing.is_active:
            existing.is_active = True
            existing.updated_at = datetime.now()
            await db.commit()
        
        return {"status": "success", "message": "Subscription updated", "id": existing.id}
    
    # Create new subscription
    new_subscription = WebPushSubscription(
        user_id=user.id,
        subscription_json=subscription_json,
        user_agent=user_agent
    )
    db.add(new_subscription)
    await db.commit()
    await db.refresh(new_subscription)
    
    return {"status": "success", "message": "Subscription created", "id": new_subscription.id}

@app.post("/api/web-push/unsubscribe")
async def unsubscribe_web_push(
    subscription: Dict[str, Any],
    user = Depends(get_current_user),
    db: AsyncSession = Depends(get_async_db)
):
    """
    Unsubscribe from web push notifications.
    
    Parameters:
    - subscription: Web Push subscription object to unsubscribe
    """
    from ..models.users import WebPushSubscription
    
    # Convert subscription to JSON string
    subscription_json = json.dumps(subscription)
    
    # Find the subscription
    from sqlalchemy import select
    subscription_query = select(WebPushSubscription).where(
        WebPushSubscription.user_id == user.id,
        WebPushSubscription.subscription_json == subscription_json
    )
    subscription_result = await db.execute(subscription_query)
    existing_subscription = subscription_result.scalar_one_or_none()
    
    if not existing_subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Mark as inactive (soft delete)
    existing_subscription.is_active = False
    existing_subscription.updated_at = datetime.now()
    await db.commit()
    
    return {"status": "success", "message": "Unsubscribed successfully"}

@app.get("/api/web-push/vapid-public-key")
async def get_vapid_public_key():
    """Get the VAPID public key for web push subscriptions."""
    vapid_public_key = os.environ.get("VAPID_PUBLIC_KEY", "")
    
    if not vapid_public_key:
        return {"status": "error", "message": "Web push notifications not configured"}
    
    return {"status": "success", "vapidPublicKey": vapid_public_key}

@app.post("/api/users/{user_id}/verify-email")
async def verify_user_email(
    user_id: int,
    token: str,
    db: AsyncSession = Depends(get_async_db)
):
    """
    Verify a user's email address using a verification token.
    
    Parameters:
    - user_id: User ID
    - token: Verification token sent to the user's email
    """
    from sqlalchemy import select, update
    
    # In a real implementation, validate the token against a stored token
    # Here, we'll use a simple validation for demonstration
    # You should implement a proper token verification system
    
    # Verify token format (in production, verify against stored token)
    import re
    if not re.match(r'^[a-f0-9]{32}$', token):
        raise HTTPException(status_code=400, detail="Invalid verification token")
    
    # Get user
    user_query = select(User).where(User.id == user_id)
    result = await db.execute(user_query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    if user.is_verified:
        return {"status": "success", "message": "Email already verified"}
    
    # Mark email as verified
    stmt = update(User).where(User.id == user_id).values(is_verified=True)
    await db.execute(stmt)
    await db.commit()
    
    return {"status": "success", "message": "Email verified successfully"}
