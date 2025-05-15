"""
Notification manager for AirAlert.
Orchestrates notifications across multiple delivery channels.
"""
import logging
import asyncio
import smtplib
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart

from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, update, and_
from pydantic import BaseModel, Field

from .base import NotificationSender, SMSNotificationSender, WebNotificationSender, EmailNotificationSender
from ..models.alerts import Alert, Notification
from ..models.users import User
from .email import EmailSender
from ..api.config import settings

async def send_email(recipient: str, subject: str, html_content: str) -> bool:
    """
    Simple function to send an email using SMTP.
    
    Args:
        recipient: Email address to send to
        subject: Email subject
        html_content: HTML content of the email
        
    Returns:
        bool: True if sent successfully, False otherwise
    """
    try:
        # Create message
        message = MIMEMultipart('alternative')
        message['Subject'] = subject
        message['From'] = settings.email_from or "noreply@airalert.com"
        message['To'] = recipient
        
        # Attach HTML content
        html_part = MIMEText(html_content, 'html')
        message.attach(html_part)
        
        # Connect to SMTP server and send
        smtp_host = settings.email_host or "smtp.gmail.com"
        smtp_port = settings.email_port or 587
        
        # Check if we have SMTP credentials configured
        if not settings.email_username or not settings.email_password:
            # For development, just log the email
            logging.info(f"Would send email to {recipient}: {subject}")
            logging.info(f"Content: {html_content}")
            return True
        
        # Send the email
        with smtplib.SMTP(smtp_host, smtp_port) as server:
            server.starttls()
            server.login(settings.email_username, settings.email_password)
            server.send_message(message)
        
        return True
        
    except Exception as e:
        logging.error(f"Error sending email: {e}")
        return False
from .web_push import send_web_push
from backend.models.database import get_db
from sqlalchemy.orm import Session

class NotificationPreferences(BaseModel):
    """User notification preferences model."""
    email: bool = True
    sms: bool = True
    web: bool = True
    minimum_severity: int = Field(1, ge=1, le=5)

class NotificationManager:
    """
    Manages notification delivery across all channels.
    Handles routing, batching, and retry logic.
    """
    
    def __init__(self, db_session: Optional[AsyncSession] = None, config: Optional[Dict[str, Any]] = None):
        """
        Initialize notification manager.
        
        Args:
            db_session: Database session (optional)
            config: Configuration dictionary (optional)
        """
        self.db_session = db_session
        self.config = config or {}
        self.logger = logging.getLogger("NotificationManager")
        
        # Initialize delivery channels if db_session is provided
        if db_session and config:
            self.sms_sender = SMSNotificationSender(config)
            self.web_sender = WebNotificationSender(config)
            self.email_sender = EmailSender(config, db_session)
            
    async def send_email_notification(
        self,
        recipient_email: str,
        subject: str,
        html_content: str,
        user_id: Optional[int] = None,
        db_session: Optional[AsyncSession] = None
    ) -> bool:
        """
        Send an email notification and record it in the database.
        
        Args:
            recipient_email: Email address to send to
            subject: Email subject
            html_content: HTML content of the email
            user_id: User ID to associate with notification (optional)
            db_session: Database session (optional) - if not provided, uses the instance's session
            
        Returns:
            bool: True if sent successfully, False otherwise
        """
        try:
            # Use provided session or instance session
            session = db_session or self.db_session
            
            # If we don't have a session, just try to send directly
            if not session:
                result = await send_email(recipient_email, subject, html_content)
                return result
            
            # Create notification record
            notification = Notification(
                user_id=user_id,
                channel="email",
                recipient=recipient_email,
                subject=subject,
                content=html_content,
                status="pending",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Add to database
            session.add(notification)
            await session.commit()
            await session.refresh(notification)
            
            # Send email
            result = await send_email(recipient_email, subject, html_content)
            
            # Update status based on result
            notification.status = "sent" if result else "failed"
            notification.sent_at = datetime.utcnow() if result else None
            await session.commit()
            
            return result
        except Exception as e:
            self.logger.error(f"Error sending email notification: {e}")
            return False
        
        # Notification preferences cache (user_id -> preferences)
        self._preferences_cache = {}
        
    async def process_pending_notifications(self) -> Dict[str, int]:
        """
        Process all pending notifications.
        
        Returns:
            Dictionary with counts of notifications processed by channel
        """
        self.logger.info("Processing pending notifications")
        
        # Get all unsent notifications
        query = select(Notification).where(
            Notification.sent_at == None
        ).order_by(
            Notification.created_at
        )
        
        result = await self.db_session.execute(query)
        notifications = result.scalars().all()
        
        if not notifications:
            self.logger.info("No pending notifications found")
            return {"total": 0}
        
        self.logger.info(f"Found {len(notifications)} pending notifications")
        
        # Group by user
        by_user: Dict[int, List[Notification]] = {}
        for notif in notifications:
            if notif.user_id not in by_user:
                by_user[notif.user_id] = []
            by_user[notif.user_id].append(notif)
            
        # Process each user's notifications
        results = {
            "total": len(notifications),
            "email": 0,
            "sms": 0,
            "web": 0,
            "failed": 0
        }
        
        for user_id, user_notifications in by_user.items():
            channels = await self._get_preferred_channels(user_id)
            
            for channel in channels:
                if channel == "email":
                    sent = await self.email_sender.send_batch(user_notifications)
                    results["email"] += sum(1 for success in sent.values() if success)
                    results["failed"] += sum(1 for success in sent.values() if not success)
                elif channel == "sms":
                    sent = await self.sms_sender.send_batch(user_notifications)
                    results["sms"] += sum(1 for success in sent.values() if success)
                    results["failed"] += sum(1 for success in sent.values() if not success)
                elif channel == "web":
                    sent = await self.web_sender.send_batch(user_notifications)
                    results["web"] += sum(1 for success in sent.values() if success)
                    results["failed"] += sum(1 for success in sent.values() if not success)
        
        return results
        
    async def send_alert_notifications(self, alert_id: int) -> Dict[str, int]:
        """
        Send notifications for a specific alert.
        
        Args:
            alert_id: ID of the alert
            
        Returns:
            Dictionary with counts of notifications sent by channel
        """
        # Get alert details
        alert_query = select(Alert).where(Alert.id == alert_id)
        alert_result = await self.db_session.execute(alert_query)
        alert = alert_result.scalar_one_or_none()
        
        if not alert:
            self.logger.error(f"Alert {alert_id} not found")
            return {"error": "Alert not found", "sent": 0}
            
        # Get notifications for this alert
        notif_query = select(Notification).where(
            and_(
                Notification.alert_id == alert_id,
                Notification.sent_at == None
            )
        )
        notif_result = await self.db_session.execute(notif_query)
        notifications = notif_result.scalars().all()
        
        if not notifications:
            self.logger.info(f"No pending notifications found for alert {alert_id}")
            return {"alert_id": alert_id, "sent": 0}
            
        # Group by user
        by_user: Dict[int, List[Notification]] = {}
        for notif in notifications:
            if notif.user_id not in by_user:
                by_user[notif.user_id] = []
            by_user[notif.user_id].append(notif)
            
        # Count sent notifications
        results = {
            "alert_id": alert_id,
            "total": len(notifications),
            "email": 0,
            "sms": 0,
            "web": 0,
            "failed": 0
        }
        
        # Process each user's notifications
        for user_id, user_notifications in by_user.items():
            channels = await self._get_preferred_channels(user_id)
            
            # Only send to channels the user has enabled
            for channel in channels:
                if channel == "email":
                    sent = await self.email_sender.send_batch(user_notifications)
                    results["email"] += sum(1 for success in sent.values() if success)
                    results["failed"] += sum(1 for success in sent.values() if not success)
                elif channel == "sms":
                    sent = await self.sms_sender.send_batch(user_notifications)
                    results["sms"] += sum(1 for success in sent.values() if success)
                    results["failed"] += sum(1 for success in sent.values() if not success)
                elif channel == "web":
                    sent = await self.web_sender.send_batch(user_notifications)
                    results["web"] += sum(1 for success in sent.values() if success)
                    results["failed"] += sum(1 for success in sent.values() if not success)
        
        return results
    
    async def _get_preferred_channels(self, user_id: int) -> Set[str]:
        """
        Get user's preferred notification channels.
        
        Args:
            user_id: User ID
            
        Returns:
            Set of channel names (email, sms, web)
        """
        # Check cache first
        if user_id in self._preferences_cache:
            prefs = self._preferences_cache[user_id]
        else:
            # Get user preferences from database
            user_query = select(User).where(User.id == user_id)
            user_result = await self.db_session.execute(user_query)
            user = user_result.scalar_one_or_none()
            
            if not user:
                self.logger.error(f"User {user_id} not found")
                return set()
                
            # Use defaults if user has no specific preferences
            prefs = NotificationPreferences(
                email=getattr(user, "pref_email", True),
                sms=getattr(user, "pref_sms", True),
                web=getattr(user, "pref_web", True),
                minimum_severity=getattr(user, "pref_min_severity", 1)
            )
            
            # Cache the preferences
            self._preferences_cache[user_id] = prefs
        
        # Return enabled channels
        channels = set()
        if prefs.email:
            channels.add("email")
        if prefs.sms:
            channels.add("sms")
        if prefs.web:
            channels.add("web")
            
        return channels

def notify_users(alert: Alert, db: Session = get_db()):
    """Send notifications to users for a given alert."""
    users = db.query(User).all()
    for user in users:
        # Send email notification
        send_email(
            to=user.email,
            subject=f"Air Quality Alert: {alert.pollutant}",
            body=f"The AQI for {alert.pollutant} has exceeded the threshold. Current value: {alert.value} {alert.unit}."
        )

        # Send web push notification
        send_web_push(
            user_id=user.id,
            title="Air Quality Alert",
            message=f"The AQI for {alert.pollutant} has exceeded the threshold. Current value: {alert.value} {alert.unit}."
        )
