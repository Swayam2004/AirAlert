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
        
        subject = f"{severity_emoji} Air Quality Alert: {notification.alert.pollutant} levels are elevated"
        
        # Create HTML body with styling
        body = f"""
        <html>
        <head>
            <style>
                body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                .header {{ background-color: #3498db; color: white; padding: 10px; text-align: center; }}
                .content {{ padding: 20px; background-color: #f9f9f9; }}
                .footer {{ font-size: 12px; text-align: center; margin-top: 20px; color: #777; }}
                .alert-level {{ font-weight: bold; }}
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
                    
                    <p>Details:</p>
                    <ul>
                        <li>Pollutant: {notification.alert.pollutant}</li>
                        <li>Current Value: {notification.alert.current_value}</li>
                        <li>Threshold: {notification.alert.threshold_value}</li>
                        <li>Location: Your {notification.location_type} area</li>
                        <li>Alert Time: {notification.alert.created_at.strftime('%Y-%m-%d %H:%M')}</li>
                    </ul>
                    
                    <p>Stay safe and take necessary precautions.</p>
                    
                    <p>Regards,<br/>AirAlert Team</p>
                </div>
                <div class="footer">
                    <p>This is an automated message from the AirAlert air quality monitoring system.</p>
                    <p>To update your notification preferences, visit your account settings.</p>
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
