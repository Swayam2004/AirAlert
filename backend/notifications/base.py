"""
Base notification sender for AirAlert.
Defines the interface for all notification delivery channels.
"""
from abc import ABC, abstractmethod
import logging
from typing import Dict, Any, Optional, List

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
            return True
        except Exception as e:
            self.logger.error(f"Error sending SMS notification: {str(e)}")
            return False

class WebNotificationSender(NotificationSender):
    """Sends notifications via web push."""

    async def send_notification(self, notification: Notification) -> bool:
        try:
            # Simulate sending web notification
            self.logger.info(f"Sending web notification to user {notification.user_id}: {notification.message}")
            return True
        except Exception as e:
            self.logger.error(f"Error sending web notification: {str(e)}")
            return False
