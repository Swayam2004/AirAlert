"""
Alert trigger system for AirAlert.
Analyzes air quality data to trigger alerts when thresholds are exceeded.
"""
import logging
import asyncio
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from sqlalchemy import select, and_, update
from sqlalchemy.ext.asyncio import AsyncSession
from geoalchemy2.functions import ST_Intersects
from shapely.geometry import shape

from ..models.air_quality import PollutantReading, MonitoringStation
from ..models.alerts import Alert, Notification
from ..models.users import User
from ..notifications.base import SMSNotificationSender, WebNotificationSender

class AlertTrigger:
    """Triggers alerts based on threshold exceedances"""
    
    def __init__(self, db_session: AsyncSession, config: Dict[str, Any]):
        """
        Initialize with database session and configuration.
        
        Args:
            db_session: SQLAlchemy async session
            config: Configuration dictionary
        """
        self.db_session = db_session
        self.config = config
        self.logger = logging.getLogger("AlertTrigger")
        
        # Set up severity mapping from threshold levels
        self.severity_levels = config.get('severity_levels', {
            'hazardous': 5,
            'very_unhealthy': 4,
            'unhealthy': 3,
            'unhealthy_sensitive': 2,
            'moderate': 1,
            'good': 0
        })
    
    async def process_exceedances(self, pollutant: str, exceedance_data: Dict[str, Any]) -> List[int]:
        """
        Process threshold exceedances and create alerts.
        
        Args:
            pollutant: Name of pollutant
            exceedance_data: Dict of GeoDataFrames by threshold level
            
        Returns:
            List of created alert IDs
        """
        alert_ids = []
        
        # Process each threshold level
        for level_name, gdf in exceedance_data.items():
            if len(gdf) == 0:
                continue
                
            # Get severity level from config or use default mapping
            severity = self.severity_levels.get(level_name, 3)
            
            # Process each polygon in the GeoDataFrame
            for _, row in gdf.iterrows():
                # Create alert
                alert_id = await self._create_alert(
                    pollutant=pollutant,
                    severity_level=severity,
                    affected_area=row.geometry,
                    threshold_value=row['threshold'],
                    level_name=level_name
                )
                
                if alert_id:
                    alert_ids.append(alert_id)
                    
                    # Find users in affected area
                    await self._notify_affected_users(alert_id)
        
        return alert_ids
    
    async def _create_alert(self, pollutant: str, severity_level: int, 
                           affected_area: Any, threshold_value: float, 
                           level_name: str) -> Optional[int]:
        """
        Create alert record in database.
        
        Args:
            pollutant: Name of pollutant
            severity_level: Alert severity (1-5)
            affected_area: Shapely geometry of affected area
            threshold_value: Threshold value that was exceeded
            level_name: Name of the threshold level
            
        Returns:
            Alert ID if created, None otherwise
        """
        try:
            # Get current max value in the area
            current_value, center_coordinates = await self._get_current_max_value(pollutant, affected_area)
            
            # Create alert with 6-hour expiration by default
            expires_at = datetime.now() + timedelta(hours=self.config.get('alert_expiry_hours', 6))
            
            # Determine message template based on level
            template_key = f"{pollutant.lower()}_{level_name}"
            message_template = self.config.get('message_templates', {}).get(
                template_key, 
                'default_alert'
            )
            
            # Ensure we have a valid affected area WKT
            try:
                affected_area_wkt = affected_area.wkt
            except (AttributeError, TypeError) as e:
                self.logger.warning(f"Invalid geometry for affected area: {e}. Using fallback.")
                # Use a circular area around the center coordinates as fallback
                if center_coordinates:
                    from shapely.geometry import Point
                    radius_degrees = 0.05  # Approximately 5 km at equator
                    center_point = Point(center_coordinates)
                    affected_area_wkt = center_point.buffer(radius_degrees).wkt
                else:
                    self.logger.error("Cannot create alert without coordinates")
                    return None
            
            # Add center coordinates for easier frontend rendering
            center_lat, center_lon = center_coordinates if center_coordinates else (None, None)
            
            # Calculate impact radius based on severity (for UI visualization)
            # Higher severity = larger radius for visual impact
            impact_radius_km = severity_level * 2.5  # 2.5km per severity level
            
            # Create alert record
            alert = Alert(
                alert_type='pollution',
                severity_level=severity_level,
                affected_area=affected_area_wkt,
                center_latitude=center_lat,
                center_longitude=center_lon,
                impact_radius_km=impact_radius_km,  
                pollutant=pollutant,
                threshold_value=threshold_value,
                current_value=current_value,
                message_template=message_template,
                created_at=datetime.now(),
                expires_at=expires_at,
                is_active=True
            )
            
            self.db_session.add(alert)
            await self.db_session.flush()
            
            self.logger.info(
                f"Created alert {alert.id}: {pollutant} {level_name} "
                f"(severity {severity_level}, coords: {center_lat}, {center_lon})"
            )
            
            return alert.id
            
        except Exception as e:
            self.logger.error(f"Error creating alert: {str(e)}")
            return None
    
    async def _get_current_max_value(self, pollutant: str, affected_area: Any) -> Tuple[float, Optional[Tuple[float, float]]]:
        """
        Get current maximum value of pollutant in affected area and center coordinates.
        
        Args:
            pollutant: Name of pollutant
            affected_area: Shapely geometry of affected area
            
        Returns:
            Tuple of (maximum pollutant value, (latitude, longitude) coordinates)
        """
        try:
            # Get center coordinates from geometry if possible
            center_coordinates = None
            try:
                if hasattr(affected_area, 'centroid'):
                    centroid = affected_area.centroid
                    center_coordinates = (centroid.y, centroid.x)  # (latitude, longitude)
                    self.logger.info(f"Calculated centroid: {center_coordinates}")
            except Exception as e:
                self.logger.warning(f"Could not calculate centroid: {str(e)}")

            # Convert pollutant name to column name
            pollutant_column = pollutant.lower()
            
            # Find all stations in the affected area with recent readings
            one_hour_ago = datetime.now() - timedelta(hours=1)
            
            # Construct query to find stations in the affected area
            stations_query = None
            try:
                # Try using the WKT representation if available
                if hasattr(affected_area, 'wkt'):
                    stations_stmt = select(MonitoringStation).where(
                        ST_Intersects(MonitoringStation.location, affected_area.wkt)
                    )
                    stations_result = await self.db_session.execute(stations_stmt)
                    stations = stations_result.scalars().all()
                else:
                    # Fallback: get all stations
                    stations_stmt = select(MonitoringStation)
                    stations_result = await self.db_session.execute(stations_stmt)
                    stations = stations_result.scalars().all()
                    self.logger.warning("No valid geometry for spatial query, fetching all stations")
            except Exception as e:
                # Fallback: get all stations
                stations_stmt = select(MonitoringStation)
                stations_result = await self.db_session.execute(stations_stmt)
                stations = stations_result.scalars().all()
                self.logger.warning(f"Error in spatial query: {str(e)}, fetching all stations")
            
            if not stations:
                self.logger.warning(f"No stations found for the area")
                return 0.0, center_coordinates
            
            # If we don't have center coordinates yet, use the average of station coordinates
            if not center_coordinates and stations:
                valid_coords = [(s.latitude, s.longitude) for s in stations if s.latitude and s.longitude]
                if valid_coords:
                    avg_lat = sum(lat for lat, _ in valid_coords) / len(valid_coords)
                    avg_lon = sum(lon for _, lon in valid_coords) / len(valid_coords)
                    center_coordinates = (avg_lat, avg_lon)
                    self.logger.info(f"Using average station coordinates: {center_coordinates}")
            
            # Get station IDs
            station_ids = [s.id for s in stations]
            
            if not station_ids:
                self.logger.warning("No station IDs available")
                return 0.0, center_coordinates
            
            # Find recent readings from these stations
            readings_stmt = select(PollutantReading).where(
                and_(
                    PollutantReading.station_id.in_(station_ids),
                    PollutantReading.timestamp >= one_hour_ago
                )
            )
            readings_result = await self.db_session.execute(readings_stmt)
            readings = readings_result.scalars().all()
            
            # Extract values and coordinates for the specific pollutant
            max_value = 0.0
            max_value_station_id = None
            
            for reading in readings:
                value = getattr(reading, pollutant_column, None)
                if value is not None and value > max_value:
                    max_value = value
                    max_value_station_id = reading.station_id
            
            # If we found a maximum value, get its coordinates
            if max_value_station_id and not center_coordinates:
                max_station_stmt = select(MonitoringStation).where(
                    MonitoringStation.id == max_value_station_id
                )
                max_station_result = await self.db_session.execute(max_station_stmt)
                max_station = max_station_result.scalar_one_or_none()
                
                if max_station and max_station.latitude and max_station.longitude:
                    center_coordinates = (max_station.latitude, max_station.longitude)
                    self.logger.info(f"Using coordinates of max value station: {center_coordinates}")
            
            # Return max value and center coordinates
            if max_value > 0:
                self.logger.info(f"Maximum {pollutant} value in area: {max_value}")
                return max_value, center_coordinates
            else:
                self.logger.warning(f"No {pollutant} readings found in area")
                return 0.0, center_coordinates
                
        except Exception as e:
            self.logger.error(f"Error getting current pollutant value: {str(e)}")
            return 0.0, None
    
    async def _notify_affected_users(self, alert_id: int) -> int:
        """
        Find users in affected area and create notifications.
        
        Args:
            alert_id: ID of the alert
            
        Returns:
            Number of notifications created
        """
        try:
            # Get alert details
            alert_stmt = select(Alert).where(Alert.id == alert_id)
            alert_result = await self.db_session.execute(alert_stmt)
            alert = alert_result.scalar_one_or_none()
            
            if not alert:
                self.logger.error(f"Alert {alert_id} not found")
                return 0
            
            # Find users with homes in affected area
            home_stmt = select(User).where(
                ST_Intersects(User.home_location, alert.affected_area)
            )
            home_result = await self.db_session.execute(home_stmt)
            home_users = home_result.scalars().all()
            
            # Also find users with work location in area
            work_stmt = select(User).where(
                ST_Intersects(User.work_location, alert.affected_area)
            )
            work_result = await self.db_session.execute(work_stmt)
            work_users = work_result.scalars().all()
            
            # Combine users and remove duplicates
            all_users = home_users + work_users
            unique_users = {u.id: u for u in all_users}.values()
            
            # Create notifications for each user
            notification_count = 0
            for user in unique_users:
                # Skip users who have opted out of alerts
                if not user.is_active:
                    continue
                    
                # Determine location type for better personalization
                location_type = 'home' if user in home_users else 'work'
                
                # Create notification record
                notification = Notification(
                    alert_id=alert_id,
                    user_id=user.id,
                    message="",  # Will be generated by LLM
                    delivery_channel="pending",  # Will be set by delivery service
                    sent_at=None,
                    received_at=None,
                    read_at=None,
                    location_type=location_type
                )
                
                self.db_session.add(notification)
                notification_count += 1
            
            await self.db_session.flush()
            self.logger.info(f"Created {notification_count} notifications for alert {alert_id}")
            
            return notification_count
            
        except Exception as e:
            self.logger.error(f"Error creating notifications: {str(e)}")
            return 0

    async def prioritize_alerts(self, alerts: List[Alert]):
        """Prioritize alerts based on vulnerability index and severity."""
        try:
            for alert in alerts:
                # Fetch vulnerability index for the affected area (pseudo-code)
                vulnerability_index = await self.get_vulnerability_index(alert.affected_area)
                
                # Adjust priority based on severity and vulnerability
                alert.priority = alert.severity_level * (1 + (vulnerability_index / 100))
                
                # Update alert in the database
                await self.db_session.execute(
                    update(Alert).where(Alert.id == alert.id).values(priority=alert.priority)
                )
            
            await self.db_session.commit()
            self.logger.info("Alerts prioritized successfully.")
        except Exception as e:
            self.logger.error(f"Error prioritizing alerts: {str(e)}")

    async def get_vulnerability_index(self, affected_area):
        """Fetch vulnerability index for a given area."""
        # Example: Query census data for the affected area (pseudo-code)
        # vulnerability_index = await self.db_session.query(CensusData).filter(...).first()
        return 50  # Placeholder value

    async def send_notifications(self, alert: Alert):
        """Send notifications for a given alert."""
        email_sender = EmailSender(self.db_session, self.config)
        sms_sender = SMSNotificationSender(self.config)
        web_sender = WebNotificationSender(self.config)

        # Fetch users in the affected area (pseudo-code)
        users = await self.get_users_in_affected_area(alert)

        for user in users:
            notification = Notification(
                user_id=user.id,
                alert_id=alert.id,
                message=f"{alert.alert_type}: {alert.pollutant} levels are {alert.severity_level}",
                delivery_channel="email",
            )
            await email_sender.send_notification(notification)

            if user.phone_number:
                notification.delivery_channel = "sms"
                await sms_sender.send_notification(notification)

            notification.delivery_channel = "web"
            await web_sender.send_notification(notification)
