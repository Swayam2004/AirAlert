"""
Routes for alerts and notifications.
"""
import logging
from typing import Optional, List
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, Query
from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..dependencies import get_current_user, get_valid_pollutants
from ...models.database import get_db
from ...models.users import User
from ...models.alerts import Alert, Notification
from ...gis_processing.threshold import ThresholdAnalyzer
from ...alerts.trigger import AlertTrigger
from ...alerts.message_generator import LLMAlertGenerator
from ...notifications.manager import NotificationManager

# Set up logging
logger = logging.getLogger("airalert.api.alerts")

# Create router
router = APIRouter(tags=["alerts"])


@router.get("/alerts")
async def get_alerts(
    active_only: bool = True,
    severity_min: int = 0,
    db: AsyncSession = Depends(get_db)
):
    """
    Get list of alerts.
    
    Parameters:
    - active_only: Only return active alerts
    - severity_min: Minimum severity level (0-5)
    """
    # Build query with filters
    filters = []
    if active_only:
        filters.append(Alert.is_active == True)
        
    if severity_min > 0:
        filters.append(Alert.severity_level >= severity_min)
    
    query = select(Alert).where(and_(*filters) if filters else True)
    
    # Execute query
    result = await db.execute(query.order_by(Alert.created_at.desc()))
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
            "is_active": alert.is_active,
            "message": alert.message
        })
    
    return {
        "count": len(formatted_alerts),
        "alerts": formatted_alerts
    }


@router.get("/alerts/{alert_id}")
async def get_alert(
    alert_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Get a specific alert.
    
    Parameters:
    - alert_id: ID of the alert to retrieve
    """
    query = select(Alert).where(Alert.id == alert_id)
    result = await db.execute(query)
    alert = result.scalar_one_or_none()
    
    if not alert:
        raise HTTPException(status_code=404, detail="Alert not found")
    
    return {
        "id": alert.id,
        "alert_type": alert.alert_type,
        "severity_level": alert.severity_level,
        "pollutant": alert.pollutant,
        "threshold_value": alert.threshold_value,
        "current_value": alert.current_value,
        "created_at": alert.created_at.isoformat(),
        "expires_at": alert.expires_at.isoformat(),
        "is_active": alert.is_active,
        "message": alert.message,
        "affected_area_geojson": alert.affected_area_geojson
    }


@router.get("/users/{user_id}/notifications")
async def get_user_notifications(
    user_id: int,
    unread_only: bool = False,
    db: AsyncSession = Depends(get_db)
):
    """
    Get notifications for a specific user.
    
    Parameters:
    - user_id: User ID
    - unread_only: Only return unread notifications
    """
    # Check if user exists
    user_query = select(User).where(User.id == user_id)
    result = await db.execute(user_query)
    user = result.scalar_one_or_none()
    
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
    result = await db.execute(query.order_by(Notification.sent_at.desc()))
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


@router.put("/notifications/{notification_id}/mark-read")
async def mark_notification_read(
    notification_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Mark a notification as read.
    
    Parameters:
    - notification_id: ID of the notification to mark as read
    """
    # Check if notification exists
    query = select(Notification).where(Notification.id == notification_id)
    result = await db.execute(query)
    notification = result.scalar_one_or_none()
    
    if not notification:
        raise HTTPException(status_code=404, detail="Notification not found")
    
    # Mark as read if not already read
    if notification.read_at is None:
        stmt = update(Notification).where(
            Notification.id == notification_id
        ).values(
            read_at=datetime.utcnow()
        )
        await db.execute(stmt)
        await db.commit()
    
    return {"message": "Notification marked as read"}


@router.post("/check_alerts")
async def check_alerts(
    background_tasks: BackgroundTasks,
    pollutant: Optional[str] = Query(None, description="Pollutant to check (pm25, pm10, o3, no2, so2, co, aqi)")
):
    """
    Trigger a background task to check for threshold exceedances and create alerts.
    This endpoint supports checking for all supported pollutants.
    
    Parameters:
    - pollutant: Optional specific pollutant to check
    """
    valid_pollutants = get_valid_pollutants()
    
    if pollutant and pollutant not in valid_pollutants:
        raise HTTPException(
            status_code=400, 
            detail=f"Invalid pollutant. Must be one of: {', '.join(valid_pollutants)}"
        )

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


@router.post("/notifications/process")
async def process_notifications(
    background_tasks: BackgroundTasks,
    alert_id: Optional[int] = None
):
    """
    Process pending notifications. If alert_id is provided, only process
    notifications for that specific alert.
    
    Parameters:
    - alert_id: Optional alert ID to process notifications for
    """
    logger.info("Processing notifications endpoint called")
    
    background_tasks.add_task(process_notifications_task, alert_id)
    
    if alert_id:
        return {
            "message": f"Notification processing started for alert {alert_id}"
        }
    else:
        return {
            "message": "Notification processing started for all pending notifications"
        }


async def check_threshold_exceedances_task(pollutant: str):
    """
    Task to check for threshold exceedances and create alerts.
    
    Parameters:
    - pollutant: Pollutant to check for exceedances
    """
    # Create a new database session for this task
    from sqlalchemy.ext.asyncio import AsyncSession
    from ...models.database import engine
    
    async with AsyncSession(engine) as session:
        logger.info(f"Starting threshold exceedance check for {pollutant}")
        
        # Create threshold analyzer
        analyzer = ThresholdAnalyzer({})  # Use default thresholds
        
        # Generate interpolation for analysis
        from ...gis_processing.interpolation import SpatialInterpolator
        interpolator = SpatialInterpolator({
            "cell_size": 0.01,
            "output_dir": settings.gis_output_dir
        })
        
        # Get recent readings for the pollutant
        from ...models.air_quality import MonitoringStation, PollutantReading
        from sqlalchemy import select, func, and_
        
        try:
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
                logger.warning("No readings found for threshold analysis")
                return {"success": False, "error": "No readings found"}
            
            # Prepare data for interpolation
            import pandas as pd
            import geopandas as gpd
            from shapely.geometry import Point
            
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
            df = pd.DataFrame(data)
            geometry = [Point(xy) for xy in zip(df["longitude"], df["latitude"])]
            gdf = gpd.GeoDataFrame(df, geometry=geometry, crs="EPSG:4326")
            
            # Perform interpolation
            raster, transform, bounds = interpolator.interpolate_pollutant(gdf, pollutant)
            
            # Identify exceedances
            exceedances = analyzer.identify_threshold_exceedances(pollutant, raster, transform)
            
            # Generate visualization of exceedances if any found
            if exceedances:
                import os
                analyzer.visualize_threshold_exceedances(
                    exceedances,
                    None,
                    os.path.join(settings.gis_output_dir, f"{pollutant}_exceedances.png"),
                    pollutant
                )
                
                # Create alert trigger
                trigger = AlertTrigger(session, settings)
                alert_ids = await trigger.process_exceedances(pollutant, exceedances)
                
                # Generate alert messages if any alerts were created
                if alert_ids:
                    generator = LLMAlertGenerator(session, settings)
                    message_count = await generator.generate_alert_messages()
                    logger.info(f"Generated {message_count} alert messages")
                    
                logger.info(f"Found {len(alert_ids)} alerts for {len(exceedances)} exceedance levels")
                return {
                    "success": True,
                    "exceedance_levels": list(exceedances.keys()),
                    "alert_count": len(alert_ids)
                }
            else:
                logger.info(f"No threshold exceedances found for {pollutant}")
                return {
                    "success": True,
                    "exceedance_levels": [],
                    "alert_count": 0
                }
                
        except Exception as e:
            logger.error(f"Error in threshold analysis for {pollutant}: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}


async def process_notifications_task(alert_id: Optional[int] = None):
    """
    Process pending notifications.
    
    Parameters:
    - alert_id: Optional alert ID to process notifications for
    """
    from sqlalchemy.ext.asyncio import AsyncSession
    from ...models.database import engine
    
    async with AsyncSession(engine) as session:
        manager = NotificationManager(session, settings)
        
        try:
            if alert_id:
                # Process notifications for specific alert
                logger.info(f"Processing notifications for alert {alert_id}")
                result = await manager.send_alert_notifications(alert_id)
                logger.info(f"Notification processing complete for alert {alert_id}: {result}")
            else:
                # Process all pending notifications
                logger.info("Processing all pending notifications")
                result = await manager.process_pending_notifications()
                logger.info(f"Notification processing complete: {result}")
                
            return result
            
        except Exception as e:
            logger.error(f"Error processing notifications: {str(e)}", exc_info=True)
            return {"success": False, "error": str(e)}
