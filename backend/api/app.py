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

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
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
    "llm_model": "gpt-4o",
    "alert_expiry_hours": 6,
    "default_radius_km": 25,
    "gis_output_dir": "output",
    "message_templates": {
        "default_alert": "Air quality alert: {pollutant} levels are {severity} in your area. Current value: {current_value}. Take necessary precautions."
    }
}

# Secret key for JWT
SECRET_KEY = "your_secret_key"
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30

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
    from sqlalchemy.orm import selectinload
    
    query = select(MonitoringStation).limit(limit).offset(offset)
    result = db.execute(query)  # Changed from await db.execute
    stations = result.scalars().all()
    
    return {
        "count": len(stations),
        "stations": stations
    }

@app.get("/api/air_quality")
def get_air_quality(  # Changed from async to sync
    station_id: Optional[int] = None,
    pollutant: Optional[str] = None,
    start_date: Optional[str] = None,
    end_date: Optional[str] = None,
    db = Depends(get_db)  # Removed AsyncSession type hint
):
    """
    Get air quality data for specific stations, pollutants, and time ranges.
    
    Parameters:
    - station_id: Filter by monitoring station ID
    - pollutant: Filter by pollutant (pm25, pm10, o3, no2, so2, co)
    - start_date: Filter from this date (ISO format)
    - end_date: Filter to this date (ISO format)
    """
    from sqlalchemy import select, and_
    
    # Build query
    query = select(PollutantReading)
    
    # Apply filters
    filters = []
    if station_id is not None:
        filters.append(PollutantReading.station_id == station_id)
        
    if start_date is not None:
        try:
            start_dt = datetime.fromisoformat(start_date)
            filters.append(PollutantReading.timestamp >= start_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid start_date format")
            
    if end_date is not None:
        try:
            end_dt = datetime.fromisoformat(end_date)
            filters.append(PollutantReading.timestamp <= end_dt)
        except ValueError:
            raise HTTPException(status_code=400, detail="Invalid end_date format")
    
    if filters:
        query = query.where(and_(*filters))
    
    # Execute query
    result = db.execute(query.order_by(PollutantReading.timestamp.desc()).limit(1000))  # Changed from await db.execute
    readings = result.scalars().all()
    
    # If pollutant is specified, filter the results
    if pollutant is not None:
        valid_pollutants = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'aqi']
        if pollutant not in valid_pollutants:
            raise HTTPException(status_code=400, detail=f"Invalid pollutant. Must be one of: {', '.join(valid_pollutants)}")
            
        # Filter out null values for the specified pollutant
        filtered_readings = []
        for reading in readings:
            value = getattr(reading, pollutant)
            if value is not None:
                filtered_readings.append(reading)
        readings = filtered_readings
    
    # Format response
    formatted_readings = []
    for reading in readings:
        formatted_readings.append({
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
        })
    
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
    pollutant: str = Query(..., description="Pollutant to check (pm25, pm10, o3, no2, so2, co, aqi)")
):
    """
    Trigger a background task to check for threshold exceedances and create alerts.
    """
    valid_pollutants = ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'aqi']
    if pollutant not in valid_pollutants:
        raise HTTPException(status_code=400, detail=f"Invalid pollutant. Must be one of: {', '.join(valid_pollutants)}")
    
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
    # Example: Use a library like Folium or Mapbox to generate the map
    return {"message": "Interactive map endpoint under construction."}
