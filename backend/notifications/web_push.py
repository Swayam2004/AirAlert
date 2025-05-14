"""
Web Push notification sender for AirAlert.
Handles sending notifications through web push.
"""
import json
import logging
from typing import Dict, Any, List, Optional
from datetime import datetime
import asyncio

from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from pywebpush import webpush, WebPushException

from .base import NotificationSender
from ..models.alerts import Notification
from ..models.users import User, WebPushSubscription

class WebPushSender(NotificationSender):
    """Sends notifications via web push."""
    
    def __init__(self, config: Dict[str, Any], db_session: AsyncSession):
        """
        Initialize with configuration and database session.
        
        Args:
            config: Configuration parameters for the web push sender
            db_session: SQLAlchemy async session for database updates
        """
        super().__init__(config)
        self.db_session = db_session
        
        # Web Push configuration
        self.vapid_private_key = config.get('vapid_private_key', '')
        self.vapid_public_key = config.get('vapid_public_key', '')
        self.vapid_claims = {
            'sub': f"mailto:{config.get('vapid_contact_email', 'admin@airalert.example.com')}"
        }
        
        # Check if we have valid VAPID keys
        if not self.vapid_private_key or not self.vapid_public_key:
            self.logger.warning("VAPID keys not configured. Web push notifications will not work.")
    
    async def send_notification(self, notification: Notification) -> bool:
        """
        Send notification via web push.
        
        Args:
            notification: The notification to send
            
        Returns:
            True if web push was sent successfully, False otherwise
        """
        try:
            # Get user's web push subscriptions
            subscription_query = select(WebPushSubscription).where(
                WebPushSubscription.user_id == notification.user_id,
                WebPushSubscription.is_active == True
            )
            subscription_result = await self.db_session.execute(subscription_query)
            subscriptions = subscription_result.scalars().all()
            
            if not subscriptions:
                self.logger.warning(f"User {notification.user_id} has no active web push subscriptions")
                return False
            
            # Prepare notification payload
            payload = {
                'title': f"AirAlert: {notification.alert.pollutant.upper()} Alert",
                'body': notification.message,
                'icon': '/icons/alert-icon-192.png',
                'badge': '/icons/alert-badge-96.png',
                'data': {
                    'url': f"/alerts/{notification.alert_id}",
                    'alert_id': notification.alert_id,
                    'severity': notification.alert.severity_level,
                    'pollutant': notification.alert.pollutant,
                },
                'vibrate': [100, 50, 100],  # Vibration pattern
                'tag': f"airalert-{notification.alert.pollutant}-{notification.alert.severity_level}",
                'actions': [
                    {
                        'action': 'view',
                        'title': 'View Details'
                    },
                    {
                        'action': 'dismiss',
                        'title': 'Dismiss'
                    }
                ]
            }
            
            # Send to all of the user's subscriptions
            success = False
            for subscription in subscriptions:
                try:
                    # Convert subscription from database to the format required by pywebpush
                    subscription_info = json.loads(subscription.subscription_json)
                    
                    # Send the notification (run in executor to avoid blocking)
                    loop = asyncio.get_event_loop()
                    await loop.run_in_executor(
                        None,
                        lambda: self._send_web_push(subscription_info, json.dumps(payload), subscription.id)
                    )
                    
                    success = True  # At least one succeeded
                except Exception as e:
                    self.logger.error(f"Error sending web push to subscription {subscription.id}: {str(e)}")
                    # If we get a subscription expired error, mark it as inactive
                    if isinstance(e, WebPushException) and e.response and e.response.status_code in (404, 410):
                        await self._deactivate_subscription(subscription.id)
            
            if success:
                # Update notification status
                await self._update_notification_status(notification.id)
                
            return success
            
        except Exception as e:
            self.logger.error(f"Error sending web push notification: {str(e)}")
            return False
    
    async def send_batch(self, notifications: List[Notification]) -> Dict[int, bool]:
        """
        Send a batch of web push notifications.
        
        Args:
            notifications: List of notifications to send
            
        Returns:
            Dictionary mapping notification IDs to success/failure status
        """
        results = {}
        
        for notification in notifications:
            results[notification.id] = await self.send_notification(notification)
            
        return results
    
    def _send_web_push(self, subscription_info: Dict, payload: str, subscription_id: int) -> bool:
        """
        Send a web push notification using pywebpush.
        
        Args:
            subscription_info: Push subscription information
            payload: JSON string payload to send
            subscription_id: ID of the subscription for logging
            
        Returns:
            True if successful
        """
        try:
            response = webpush(
                subscription_info=subscription_info,
                data=payload,
                vapid_private_key=self.vapid_private_key,
                vapid_claims=self.vapid_claims
            )
            
            self.logger.info(f"Web push to subscription {subscription_id} response: {response.status_code}")
            return response.status_code == 201
        except WebPushException as e:
            if e.response and e.response.status_code in (404, 410):
                self.logger.warning(f"Subscription {subscription_id} no longer valid")
            else:
                self.logger.error(f"Web Push failed: {e}", exc_info=True)
            raise
        except Exception as e:
            self.logger.error(f"Error in _send_web_push: {str(e)}", exc_info=True)
            raise
    
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
            delivery_channel="web",
            sent_at=now
        )
        
        await self.db_session.execute(stmt)
        await self.db_session.commit()
    
    async def _deactivate_subscription(self, subscription_id: int) -> None:
        """
        Mark a subscription as inactive.
        
        Args:
            subscription_id: ID of the subscription to deactivate
        """
        stmt = update(WebPushSubscription).where(
            WebPushSubscription.id == subscription_id
        ).values(
            is_active=False,
            updated_at=datetime.now()
        )
        
        await self.db_session.execute(stmt)
        await self.db_session.commit()
