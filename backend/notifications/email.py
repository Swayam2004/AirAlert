"""
Email notification sender for AirAlert.
Handles sending notifications through email.
"""
import logging
import smtplib
import asyncio
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from datetime import datetime
from typing import Dict, Any, List, Optional, Tuple

from sqlalchemy import update
from sqlalchemy.ext.asyncio import AsyncSession

from .base import NotificationSender
from ..models.alerts import Notification
from ..models.users import User

class EmailSender(NotificationSender):
    """Sends notifications via email."""
    
    def __init__(self, config: Dict[str, Any], db_session: AsyncSession):
        """
        Initialize with configuration and database session.
        
        Args:
            config: Configuration parameters for the email sender
            db_session: SQLAlchemy async session for database updates
        """
        super().__init__(config)
        self.db_session = db_session
        
        # Email configuration
        self.host = config.get('email_host', 'smtp.gmail.com')
        self.port = config.get('email_port', 587)
        self.username = config.get('email_username', '')
        self.password = config.get('email_password', '')
        self.from_email = config.get('from_email', self.username)
        self.from_name = config.get('from_name', 'AirAlert')
        
        # Connection pooling
        self._connection = None
        self._connection_lock = asyncio.Lock()
    
    async def _get_connection(self) -> smtplib.SMTP:
        """
        Get SMTP connection from pool or create new one.
        
        Returns:
            SMTP connection
        """
        async with self._connection_lock:
            if self._connection is None:
                # Create new connection in a thread pool
                loop = asyncio.get_event_loop()
                self._connection = await loop.run_in_executor(
                    None,
                    self._create_smtp_connection
                )
            
            return self._connection
    
    def _create_smtp_connection(self) -> smtplib.SMTP:
        """
        Create a new SMTP connection.
        
        Returns:
            SMTP connection
        """
        try:
            self.logger.info(f"Connecting to SMTP server {self.host}:{self.port}")
            
            connection = smtplib.SMTP(self.host, self.port)
            connection.ehlo()
            connection.starttls()
            
            if self.username and self.password:
                connection.login(self.username, self.password)
                
            return connection
        except Exception as e:
            self.logger.error(f"Failed to connect to SMTP server: {str(e)}")
            raise
    
    async def send_notification(self, notification: Notification) -> bool:
        """
        Send notification via email.
        
        Args:
            notification: The notification to send
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        try:
            # Get user email
            from sqlalchemy import select
            
            user_stmt = select(User).where(User.id == notification.user_id)
            user_result = await self.db_session.execute(user_stmt)
            user = user_result.scalar_one_or_none()
            
            if not user or not user.email:
                self.logger.error(f"User {notification.user_id} has no email address")
                return False
                
            # Format email message
            subject, body = self._format_email_content(notification)
            
            # Send email
            success = await self._send_email(user.email, user.name, subject, body)
            
            if success:
                # Update notification status
                await self._update_notification_status(notification.id)
                
            return success
            
        except Exception as e:
            self.logger.error(f"Error sending email notification: {str(e)}")
            return False
    
    async def send_batch(self, notifications: List[Notification]) -> Dict[int, bool]:
        """
        Send a batch of email notifications.
        
        Args:
            notifications: List of notifications to send
            
        Returns:
            Dictionary mapping notification IDs to success/failure status
        """
        results = {}
        
        for notification in notifications:
            results[notification.id] = await self.send_notification(notification)
            
        return results
    
    def _format_email_content(self, notification: Notification) -> Tuple[str, str]:
        """
        Format email subject and body from notification.
        
        Args:
            notification: The notification to format
            
        Returns:
            Tuple of (subject, body)
        """
        # Default formatting, can be customized based on alert type
        severity_emoji = self._get_severity_emoji(notification.alert.severity_level)
        pollutant = notification.alert.pollutant.upper()
        severity_level = notification.alert.severity_level
        current_value = notification.alert.current_value
        threshold = notification.alert.threshold_value
        
        # Get health advice based on pollutant and severity
        health_advice = self._get_health_advice(pollutant, severity_level)
        
        # Format subject line
        subject = f"{severity_emoji} Air Quality Alert: {pollutant} levels are {self._get_severity_text(severity_level)}"
        
        # Create HTML body with styling
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #3498db; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ font-size: 12px; text-align: center; margin-top: 20px; color: #777; padding: 10px; background-color: #f1f1f1; border-radius: 0 0 5px 5px; }}
                .alert-level {{ font-weight: bold; }}
                .alert-details {{ background-color: #eaf2f8; padding: 15px; border-radius: 5px; margin: 15px 0; }}
                .health-advice {{ background-color: #e8f8f5; padding: 15px; border-radius: 5px; margin: 15px 0; border-left: 4px solid #3498db; }}
                .health-advice h3 {{ margin-top: 0; color: #16a085; }}
                .health-advice ul {{ padding-left: 20px; }}
                .value {{ font-weight: bold; color: {self._get_severity_color(severity_level)}; }}
                .button {{ display: inline-block; background-color: #3498db; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin-top: 15px; }}
                .aqi-scale {{ display: flex; margin: 15px 0; border-radius: 5px; overflow: hidden; }}
                .aqi-segment {{ height: 10px; flex-grow: 1; }}
                .aqi-good {{ background-color: #00e400; }}
                .aqi-moderate {{ background-color: #ffff00; }}
                .aqi-unhealthy-sensitive {{ background-color: #ff7e00; }}
                .aqi-unhealthy {{ background-color: #ff0000; }}
                .aqi-very-unhealthy {{ background-color: #8f3f97; }}
                .aqi-hazardous {{ background-color: #7e0023; }}
                .aqi-marker {{ width: 0; height: 0; border-left: 10px solid transparent; border-right: 10px solid transparent; border-bottom: 10px solid black; margin-left: calc({min(severity_level * 20, 100)}% - 10px); }}
            </style>
        </head>
        <body>
            <div class="container">
                <div class="header">
                    <h2>{severity_emoji} Air Quality Alert</h2>
                </div>
                <div class="content">
                    <p>Hello {notification.user.name or 'Resident'},</p>
                    
                    <p>{notification.message}</p>
                    
                    <div class="alert-details">
                        <h3>Alert Details:</h3>
                        <ul>
                            <li>Pollutant: <span class="value">{pollutant}</span></li>
                            <li>Current Value: <span class="value">{current_value}</span> (Threshold: {threshold})</li>
                            <li>Status: <span class="value">{self._get_severity_text(severity_level)}</span></li>
                            <li>Location: Your {notification.location_type} area</li>
                            <li>Alert Time: {notification.alert.created_at.strftime('%Y-%m-%d %H:%M')}</li>
                        </ul>
                        
                        <div class="aqi-scale">
                            <div class="aqi-segment aqi-good"></div>
                            <div class="aqi-segment aqi-moderate"></div>
                            <div class="aqi-segment aqi-unhealthy-sensitive"></div>
                            <div class="aqi-segment aqi-unhealthy"></div>
                            <div class="aqi-segment aqi-very-unhealthy"></div>
                            <div class="aqi-segment aqi-hazardous"></div>
                        </div>
                        <div class="aqi-marker"></div>
                    </div>
                    
                    <div class="health-advice">
                        <h3>Health Recommendations:</h3>
                        <ul>
                            {self._format_recommendations_list(health_advice)}
                        </ul>
                    </div>
                    
                    <p>Stay safe and take necessary precautions.</p>
                    
                    <p>Regards,<br/>AirAlert Team</p>
                    
                    <a href="https://airalert-dashboard.example.com/alerts/{notification.alert.id}" class="button">View on Dashboard</a>
                </div>
                <div class="footer">
                    <p>This is an automated message from the AirAlert air quality monitoring system.</p>
                    <p>To update your notification preferences, visit your <a href="https://airalert-dashboard.example.com/profile/settings">account settings</a>.</p>
                    <p>If you wish to unsubscribe from these alerts, <a href="https://airalert-dashboard.example.com/unsubscribe?token={self._generate_unsubscribe_token(notification.user_id)}">click here</a>.</p>
                </div>
            </div>
        </body>
        </html>
        """
        
        return subject, body
    
    def _get_severity_emoji(self, severity_level: int) -> str:
        """Get emoji for severity level."""
        emojis = {
            0: "✅",  # Good
            1: "🟢",  # Moderate
            2: "🟡",  # Unhealthy for Sensitive Groups
            3: "🟠",  # Unhealthy
            4: "🔴",  # Very Unhealthy
            5: "🟣",  # Hazardous
        }
        return emojis.get(severity_level, "⚠️")
    
    async def _send_email(self, to_email: str, to_name: Optional[str], subject: str, body: str) -> bool:
        """
        Send email using SMTP.
        
        Args:
            to_email: Recipient email address
            to_name: Recipient name (optional)
            subject: Email subject
            body: Email body (HTML)
            
        Returns:
            True if email was sent successfully, False otherwise
        """
        try:
            # Create message
            msg = MIMEMultipart('alternative')
            msg['Subject'] = subject
            msg['From'] = f"{self.from_name} <{self.from_email}>"
            msg['To'] = f"{to_name} <{to_email}>" if to_name else to_email
            
            # Attach HTML content
            html_part = MIMEText(body, 'html')
            msg.attach(html_part)
            
            # Get connection and send
            connection = await self._get_connection()
            
            # Run the actual sending in a thread pool to avoid blocking
            loop = asyncio.get_event_loop()
            await loop.run_in_executor(
                None,
                lambda: connection.send_message(msg)
            )
            
            self.logger.info(f"Sent email notification to {to_email}")
            return True
            
        except Exception as e:
            self.logger.error(f"Error sending email to {to_email}: {str(e)}")
            
            # Reset connection on error
            async with self._connection_lock:
                if self._connection:
                    try:
                        self._connection.quit()
                    except:
                        pass
                    self._connection = None
                    
            return False
    
    async def _update_notification_status(self, notification_id: int) -> None:
        """
        Update notification status after sending.
        
        Args:
            notification_id: ID of the sent notification
        """
        now = datetime.now()
        
        stmt = update(Notification).where(
            Notification.id == notification_id
        ).values(
            delivery_channel="email",
            sent_at=now
        )
        
        await self.db_session.execute(stmt)
        await self.db_session.commit()
    
    def _get_health_advice(self, pollutant: str, severity_level: int) -> List[str]:
        """
        Get health advice based on pollutant type and severity level.
        
        Args:
            pollutant: Type of pollutant (PM25, PM10, O3, NO2, SO2, CO)
            severity_level: Severity level (0-5)
            
        Returns:
            List of health advice strings
        """
        # Generic advice based on severity level
        generic_advice = {
            0: ["Air quality is good. No special precautions needed."],
            1: [
                "Sensitive individuals should consider limiting prolonged outdoor exertion.",
                "Consider keeping windows closed during peak pollution hours."
            ],
            2: [
                "People with respiratory or heart conditions should reduce outdoor activities.",
                "Children and elderly should limit prolonged outdoor exposure.",
                "Consider using air purifiers indoors."
            ],
            3: [
                "Avoid prolonged or heavy exertion outside.",
                "People with respiratory or heart conditions should stay indoors.",
                "Keep windows and doors closed.",
                "Use air purifiers if available."
            ],
            4: [
                "Everyone should avoid all outdoor activities.",
                "Wear N95 masks if you must go outside.",
                "Stay indoors with windows closed and air purifiers running.",
                "Seek medical attention if experiencing breathing difficulties."
            ],
            5: [
                "Health alert: everyone should stay indoors.",
                "Keep all windows and doors closed tightly.",
                "Avoid any physical exertion.",
                "Use air purifiers on highest setting.",
                "Contact healthcare provider if experiencing any respiratory symptoms."
            ]
        }.get(severity_level, ["Take precautions according to local health guidelines."])
        
        # Pollutant-specific advice
        pollutant_advice = {
            "PM25": {
                # PM2.5 specific advice by severity level
                1: ["PM2.5 can penetrate deep into the lungs; sensitive individuals should carry inhalers if prescribed."],
                2: ["PM2.5 can worsen asthma and other respiratory conditions; keep medications readily accessible."],
                3: ["PM2.5 can enter the bloodstream; consider wearing a properly fitted N95 mask outdoors."],
                4: ["High PM2.5 levels may cause respiratory distress even in healthy individuals; limit all outdoor exposure."],
                5: ["Extremely high PM2.5 levels; create a clean air room in your home using HEPA filters."]
            },
            "PM10": {
                # PM10 specific advice
                1: ["PM10 can irritate eyes and throat; rinse eyes with clean water if irritation occurs."],
                2: ["PM10 can trigger allergies; take prescribed allergy medication if needed."],
                3: ["High PM10 levels can cause significant respiratory irritation; consider wearing a mask outdoors."],
                4: ["Keep pets indoors; PM10 affects animals as well as humans."],
                5: ["Extremely high PM10 levels; avoid opening doors and windows to prevent dust intrusion."]
            },
            "O3": {
                # Ozone specific advice
                1: ["Ozone levels are elevated; consider outdoor activities in the morning when levels are lower."],
                2: ["Ozone can irritate the respiratory system; drink plenty of water to stay hydrated."],
                3: ["High ozone levels can reduce lung function; avoid exercising near high-traffic areas."],
                4: ["Very high ozone levels can cause chest pain and coughing; remain indoors."],
                5: ["Dangerous ozone levels; avoid any outdoor exposure and keep buildings well-sealed."]
            },
            "NO2": {
                # NO2 specific advice
                1: ["NO2 can irritate airways; avoid busy roads and high-traffic areas."],
                2: ["NO2 can worsen asthma symptoms; keep reliever medications accessible."],
                3: ["High NO2 levels can reduce immunity to lung infections; avoid crowded indoor spaces."],
                4: ["Very high NO2 levels; keep children and elderly well away from traffic areas."],
                5: ["Dangerous NO2 levels; consider temporarily relocating if you are in a high-traffic area."]
            },
            "SO2": {
                # SO2 specific advice
                1: ["SO2 can cause eye and throat irritation; rinse with clean water if irritation occurs."],
                2: ["SO2 can trigger asthma symptoms; use preventative inhalers as prescribed."],
                3: ["High SO2 levels can cause breathing problems; stay hydrated and keep medications accessible."],
                4: ["Very high SO2 levels can cause serious respiratory effects; remain indoors with windows closed."],
                5: ["Dangerous SO2 levels; if experiencing breathing difficulty, seek medical attention immediately."]
            },
            "CO": {
                # CO specific advice
                1: ["CO levels are elevated; ensure proper ventilation when using heating appliances."],
                2: ["CO is odorless but dangerous; check that your CO detector is working properly."],
                3: ["High CO levels can cause headaches and dizziness; ensure proper ventilation in enclosed spaces."],
                4: ["Very high CO levels; if experiencing headache, dizziness, or nausea, seek fresh air immediately."],
                5: ["Dangerous CO levels; evacuate the area and seek medical attention if experiencing symptoms."]
            },
            "AQI": {
                # General AQI advice
                1: ["Air quality is moderately affected; no special actions needed for most people."],
                2: ["Unhealthy for sensitive groups; those with respiratory conditions should reduce outdoor activity."],
                3: ["Unhealthy air quality; reduce time spent outdoors and strenuous activities."],
                4: ["Very unhealthy air quality; avoid outdoor activities and keep windows closed."],
                5: ["Hazardous air quality; everyone should avoid all outdoor exertion."]
            }
        }
        
        # Get specific advice for this pollutant and severity
        specific_advice = pollutant_advice.get(pollutant, {}).get(severity_level, [])
        
        # Combine generic and specific advice
        return generic_advice + specific_advice
    
    def _get_severity_text(self, severity_level: int) -> str:
        """Get text description for severity level."""
        descriptions = {
            0: "Good",
            1: "Moderate",
            2: "Unhealthy for Sensitive Groups",
            3: "Unhealthy",
            4: "Very Unhealthy",
            5: "Hazardous"
        }
        return descriptions.get(severity_level, "Unknown")
    
    def _get_severity_color(self, severity_level: int) -> str:
        """Get color for severity level."""
        colors = {
            0: "#00e400",  # Green
            1: "#ffff00",  # Yellow
            2: "#ff7e00",  # Orange
            3: "#ff0000",  # Red
            4: "#8f3f97",  # Purple
            5: "#7e0023"   # Maroon
        }
        return colors.get(severity_level, "#777777")
    
    def _format_recommendations_list(self, recommendations: List[str]) -> str:
        """Format list of recommendations as HTML list items."""
        return "".join([f"<li>{recommendation}</li>" for recommendation in recommendations])
    
    def _generate_unsubscribe_token(self, user_id: int) -> str:
        """Generate token for unsubscribe link."""
        import hashlib
        import time
        
        # Create a simple token using user_id and timestamp
        # In production, use a proper JWT or signed token
        timestamp = int(time.time())
        token_string = f"{user_id}:{timestamp}:{self.config.get('secret_key', 'airalert')}"
        return hashlib.sha256(token_string.encode()).hexdigest()

class NotificationManager:
    """Manages notifications for AirAlert."""
    def send_sms_notification(self, to_number, message):
        """Send an SMS notification."""
        # Example: Use a service like Twilio to send SMS
        pass

    def send_web_notification(self, user_id, message):
        """Send a web notification."""
        # Example: Implement logic to send web notifications
        pass


async def send_email(to_email: str, subject: str, body: str, html_body: Optional[str] = None, from_email: Optional[str] = None, from_name: Optional[str] = None) -> bool:
    """
    Send an email to a recipient.
    
    Args:
        to_email: Email address of the recipient
        subject: Subject line of the email
        body: Plain text body of the email
        html_body: HTML version of the email body (optional)
        from_email: Sender's email address (optional)
        from_name: Sender's display name (optional)
        
    Returns:
        True if email was sent successfully, False otherwise
    """
    try:
        # Load environment variables for email config
        import os
        from dotenv import load_dotenv
        
        load_dotenv()
        
        host = os.getenv("EMAIL_HOST", "smtp.gmail.com")
        port = int(os.getenv("EMAIL_PORT", 587))
        username = os.getenv("EMAIL_USERNAME", "")
        password = os.getenv("EMAIL_PASSWORD", "")
        
        if not from_email:
            from_email = username
            
        if not from_name:
            from_name = "AirAlert"
            
        # Set up email message
        msg = MIMEMultipart('alternative')
        msg['Subject'] = subject
        msg['From'] = f"{from_name} <{from_email}>"
        msg['To'] = to_email
        
        # Add plain text part
        text_part = MIMEText(body, 'plain')
        msg.attach(text_part)
        
        # Add HTML part if provided
        if html_body:
            html_part = MIMEText(html_body, 'html')
            msg.attach(html_part)
        
        # Send email
        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: _send_email_sync(host, port, username, password, from_email, to_email, msg)
        )
    except Exception as e:
        logging.error(f"Failed to send email: {str(e)}")
        return False
        
def _send_email_sync(host, port, username, password, from_email, to_email, msg):
    """Helper function to send email synchronously for use with run_in_executor."""
    try:
        with smtplib.SMTP(host, port) as server:
            server.ehlo()
            server.starttls()
            
            if username and password:
                server.login(username, password)
                
            server.sendmail(from_email, [to_email], msg.as_string())
            return True
    except Exception as e:
        logging.error(f"SMTP server error: {str(e)}")
        return False
