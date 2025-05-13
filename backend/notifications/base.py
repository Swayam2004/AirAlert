"""
Base notification sender for AirAlert.
Defines the interface for all notification delivery channels.
"""
from abc import ABC, abstractmethod
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from ..models.alerts import Notification

class NotificationSender(ABC):
    """Base class for notification delivery channels."""
    
    def __init__(self, config: Dict[str, Any]):
        """
        Initialize with configuration.
        
        Args:
            config: Configuration parameters for the notification sender
        """
        self.config = config
        self.logger = logging.getLogger(f"NotificationSender.{self.__class__.__name__}")
    
    @abstractmethod
    async def send_notification(self, notification: Notification) -> bool:
        """
        Send a notification through this channel.
        
        Args:
            notification: The notification to send
            
        Returns:
            True if notification was sent successfully, False otherwise
        """
        pass
    
    @abstractmethod
    async def send_batch(self, notifications: List[Notification]) -> Dict[int, bool]:
        """
        Send a batch of notifications through this channel.
        
        Args:
            notifications: List of notifications to send
            
        Returns:
            Dictionary mapping notification IDs to success/failure status
        """
        pass
    
    def _format_message(self, notification: Notification) -> str:
        """
        Format a notification message for this channel.
        Default implementation just returns the message as is.
        
        Args:
            notification: The notification to format
            
        Returns:
            Formatted message string
        """
        return notification.message

class SMSNotificationSender(NotificationSender):
    """Sends notifications via SMS."""

    async def send_notification(self, notification: Notification) -> bool:
        try:
            # Example: Use Twilio API to send SMS
            phone_number = notification.user.phone_number
            if not phone_number:
                self.logger.error(f"User {notification.user_id} has no phone number")
                return False

            # Simulate sending SMS
            self.logger.info(f"Sending SMS to {phone_number}: {notification.message}")
            
            # Update notification status
            notification.delivery_channel = "sms"
            notification.sent_at = datetime.now()
            
            return True
        except Exception as e:
            self.logger.error(f"Error sending SMS notification: {str(e)}")
            return False
            
    async def send_batch(self, notifications: List[Notification]) -> Dict[int, bool]:
        """Send a batch of SMS notifications."""
        results = {}
        for notification in notifications:
            success = await self.send_notification(notification)
            results[notification.id] = success
        return results


class WebNotificationSender(NotificationSender):
    """Sends notifications via web push."""

    async def send_notification(self, notification: Notification) -> bool:
        try:
            # Simulate sending web notification
            self.logger.info(f"Sending web notification to user {notification.user_id}: {notification.message}")
            
            # Update notification status
            notification.delivery_channel = "web"
            notification.sent_at = datetime.now()
            
            return True
        except Exception as e:
            self.logger.error(f"Error sending web notification: {str(e)}")
            return False
            
    async def send_batch(self, notifications: List[Notification]) -> Dict[int, bool]:
        """Send a batch of web notifications."""
        results = {}
        for notification in notifications:
            success = await self.send_notification(notification)
            results[notification.id] = success
        return results


class EmailNotificationSender(NotificationSender):
    """Sends notifications via email."""

    async def send_notification(self, notification: Notification) -> bool:
        try:
            # Get user email
            email = notification.user.email
            if not email:
                self.logger.error(f"User {notification.user_id} has no email address")
                return False
                
            # Simulate sending email
            self.logger.info(f"Sending email to {email}: {notification.message}")
            
            # Update notification status
            notification.delivery_channel = "email"
            notification.sent_at = datetime.now()
            
            return True
        except Exception as e:
            self.logger.error(f"Error sending email notification: {str(e)}")
            return False
            
    async def send_batch(self, notifications: List[Notification]) -> Dict[int, bool]:
        """Send a batch of email notifications."""
        results = {}
        for notification in notifications:
            success = await self.send_notification(notification)
            results[notification.id] = success
        return results
