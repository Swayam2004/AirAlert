"""
Routes for user preferences and profiles.
"""
import logging
from typing import Optional, Dict, Any
import json

from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..config import settings
from ..dependencies import get_current_user
from ...models.database import get_db
from ...models.users import (
    User, 
    AlertSubscription, 
    HealthProfile,
    WebPushSubscription,
    NotificationPreference
)

# Set up logging
logger = logging.getLogger("airalert.api.users")

# Create router
router = APIRouter(tags=["users"])


@router.get("/users/{user_id}/preferences")
async def get_user_preferences(
    user_id: int, 
    db: AsyncSession = Depends(get_db)
):
    """
    Get a user's notification preferences.
    
    Parameters:
    - user_id: User ID
    """
    # Check if user exists
    user_query = select(User).where(User.id == user_id)
    result = await db.execute(user_query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Get user's alert subscriptions
    subscription_query = select(AlertSubscription).where(
        AlertSubscription.user_id == user_id
    )
    subscription_result = await db.execute(subscription_query)
    subscriptions = subscription_result.scalars().all()
    
    # Get health profile if exists
    health_query = select(HealthProfile).where(HealthProfile.user_id == user_id)
    health_result = await db.execute(health_query)
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


@router.put("/users/{user_id}/preferences")
async def update_user_preferences(
    user_id: int, 
    preferences: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """
    Update a user's notification preferences.
    
    Parameters:
    - user_id: User ID
    - preferences: Updated preference settings
    """
    # Check if user exists
    user_query = select(User).where(User.id == user_id)
    result = await db.execute(user_query)
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
            await db.execute(update_stmt)
        
        # Update alert subscriptions if provided
        if "alert_subscriptions" in preferences:
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
                        await db.execute(sub_update_stmt)
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
            health_data = preferences["health_profile"]
            
            # Check if health profile already exists
            health_query = select(HealthProfile).where(HealthProfile.user_id == user_id)
            health_result = await db.execute(health_query)
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
                    await db.execute(health_update_stmt)
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
                home = locations["home"]
                if "latitude" in home and "longitude" in home:
                    user_update = update(User).where(User.id == user_id).values(
                        home_latitude=home["latitude"],
                        home_longitude=home["longitude"]
                    )
                    await db.execute(user_update)
            
            # Update work location if provided
            if "work" in locations and locations["work"]:
                work = locations["work"]
                if "latitude" in work and "longitude" in work:
                    user_update = update(User).where(User.id == user_id).values(
                        work_latitude=work["latitude"],
                        work_longitude=work["longitude"]
                    )
                    await db.execute(user_update)
        
        # Commit all changes
        await db.commit()
        
        return {"message": "Preferences updated successfully"}
    
    except Exception as e:
        await db.rollback()
        logger.error(f"Error updating user preferences: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to update preferences: {str(e)}")


@router.post("/users/{user_id}/alert_subscriptions")
async def create_alert_subscription(
    user_id: int, 
    subscription: Dict[str, Any],
    db: AsyncSession = Depends(get_db)
):
    """
    Create a new alert subscription for a user.
    
    Parameters:
    - user_id: User ID
    - subscription: Alert subscription details
    """
    # Check if user exists
    user_query = select(User).where(User.id == user_id)
    result = await db.execute(user_query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    
    # Validate required fields
    if "alert_type" not in subscription:
        raise HTTPException(status_code=400, detail="alert_type is required")
    
    try:
        # Create new subscription
        new_sub = AlertSubscription(
            user_id=user_id,
            alert_type=subscription["alert_type"],
            min_severity=subscription.get("min_severity", 1),
            is_active=subscription.get("is_active", True)
        )
        db.add(new_sub)
        await db.commit()
        await db.refresh(new_sub)
        
        return {
            "id": new_sub.id,
            "user_id": new_sub.user_id,
            "alert_type": new_sub.alert_type,
            "min_severity": new_sub.min_severity,
            "is_active": new_sub.is_active,
            "created_at": new_sub.created_at.isoformat()
        }
    except Exception as e:
        await db.rollback()
        logger.error(f"Error creating alert subscription: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to create subscription: {str(e)}")


@router.delete("/users/{user_id}/alert_subscriptions/{subscription_id}")
async def delete_alert_subscription(
    user_id: int, 
    subscription_id: int,
    db: AsyncSession = Depends(get_db)
):
    """
    Delete an alert subscription.
    
    Parameters:
    - user_id: User ID
    - subscription_id: Subscription ID to delete
    """
    # Check if subscription exists and belongs to the user
    subscription_query = select(AlertSubscription).where(
        AlertSubscription.id == subscription_id,
        AlertSubscription.user_id == user_id
    )
    result = await db.execute(subscription_query)
    subscription = result.scalar_one_or_none()
    
    if not subscription:
        raise HTTPException(status_code=404, detail="Subscription not found or doesn't belong to the user")
    
    try:
        # Delete the subscription
        delete_stmt = delete(AlertSubscription).where(
            AlertSubscription.id == subscription_id,
            AlertSubscription.user_id == user_id
        )
        await db.execute(delete_stmt)
        await db.commit()
        
        return {"message": "Subscription deleted successfully"}
    except Exception as e:
        await db.rollback()
        logger.error(f"Error deleting subscription: {str(e)}", exc_info=True)
        raise HTTPException(status_code=500, detail=f"Failed to delete subscription: {str(e)}")


@router.post("/web-push/subscribe")
async def subscribe_web_push(
    subscription: Dict[str, Any],
    request: Request,
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Subscribe to web push notifications.
    
    Parameters:
    - subscription: Web Push subscription object from the browser
    """
    # Convert subscription to JSON string
    subscription_json = json.dumps(subscription)
    
    # Get user agent header
    user_agent = request.headers.get("User-Agent", "Unknown")
    
    # Check if this subscription already exists
    existing_query = select(WebPushSubscription).where(
        WebPushSubscription.user_id == current_user.id,
        WebPushSubscription.subscription_json == subscription_json
    )
    existing_result = await db.execute(existing_query)
    existing = existing_result.scalar_one_or_none()
    
    if existing:
        # If it exists but was inactive, reactivate it
        if not existing.is_active:
            existing.is_active = True
            await db.commit()
        
        return {"status": "success", "message": "Subscription updated", "id": existing.id}
    
    # Create new subscription
    new_subscription = WebPushSubscription(
        user_id=current_user.id,
        subscription_json=subscription_json,
        user_agent=user_agent
    )
    db.add(new_subscription)
    await db.commit()
    await db.refresh(new_subscription)
    
    return {"status": "success", "message": "Subscription created", "id": new_subscription.id}


@router.post("/web-push/unsubscribe")
async def unsubscribe_web_push(
    subscription: Dict[str, Any],
    current_user: User = Depends(get_current_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Unsubscribe from web push notifications.
    
    Parameters:
    - subscription: Web Push subscription object to unsubscribe
    """
    # Convert subscription to JSON string
    subscription_json = json.dumps(subscription)
    
    # Find the subscription
    subscription_query = select(WebPushSubscription).where(
        WebPushSubscription.user_id == current_user.id,
        WebPushSubscription.subscription_json == subscription_json
    )
    subscription_result = await db.execute(subscription_query)
    existing_subscription = subscription_result.scalar_one_or_none()
    
    if not existing_subscription:
        raise HTTPException(status_code=404, detail="Subscription not found")
    
    # Mark as inactive (soft delete)
    existing_subscription.is_active = False
    await db.commit()
    
    return {"status": "success", "message": "Unsubscribed successfully"}


@router.get("/web-push/vapid-public-key")
async def get_vapid_public_key():
    """Get the VAPID public key for web push subscriptions."""
    if not settings.vapid_public_key:
        return {"status": "error", "message": "Web push notifications not configured"}
    
    return {"status": "success", "vapidPublicKey": settings.vapid_public_key}


class NotificationPreferenceRequest(BaseModel):
    user_id: int
    sensitivity_level: int
    preferred_pollutants: list[str]

@router.post("/preferences")
def set_notification_preferences(request: NotificationPreferenceRequest, db: Session = Depends(get_db)):
    """Set notification preferences for a user."""
    existing_preference = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == request.user_id
    ).first()

    if existing_preference:
        existing_preference.sensitivity_level = request.sensitivity_level
        existing_preference.preferred_pollutants = request.preferred_pollutants
    else:
        new_preference = NotificationPreference(
            user_id=request.user_id,
            sensitivity_level=request.sensitivity_level,
            preferred_pollutants=request.preferred_pollutants
        )
        db.add(new_preference)

    db.commit()
    return {"message": "Notification preferences updated successfully."}

@router.get("/preferences/{user_id}")
def get_notification_preferences(user_id: int, db: Session = Depends(get_db)):
    """Get notification preferences for a user."""
    preference = db.query(NotificationPreference).filter(
        NotificationPreference.user_id == user_id
    ).first()

    if not preference:
        raise HTTPException(status_code=404, detail="Preferences not found.")

    return preference
