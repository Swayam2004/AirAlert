"""
Admin broadcast system for sending alerts to users.
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime, timedelta
from enum import Enum

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy import select, update, func, or_, Column, Integer, String, DateTime, ForeignKey, Text
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import relationship
from pydantic import BaseModel, Field

from ...models.database import get_db, Base
from ...models.users import User
from ...models.alerts import Alert, Notification
from ...models.admin import AdminBroadcast
from ..auth.utils import get_admin_user
from ...notifications.manager import NotificationManager

# Set up logging
logger = logging.getLogger("airalert.api.admin.broadcast")

# Create router
router = APIRouter(prefix="/admin", tags=["admin"])

# --- Pydantic models ---

class PriorityLevel(str, Enum):
    """Priority level for broadcast messages"""
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"

class DeliveryChannel(str, Enum):
    """Delivery channel for broadcast messages"""
    APP = "app"
    EMAIL = "email"
    SMS = "sms"
    ALL = "all"

class TargetAudience(str, Enum):
    """Target audience for broadcast messages"""
    ALL_USERS = "all_users"
    SPECIFIC_REGIONS = "specific_regions"
    ADMIN_ONLY = "admin_only"

class BroadcastCreate(BaseModel):
    """Model for creating a broadcast message"""
    title: str = Field(..., min_length=3, max_length=100)
    message: str = Field(..., min_length=10, max_length=2000)
    priority_level: PriorityLevel = PriorityLevel.INFO
    target_audience: TargetAudience = TargetAudience.ALL_USERS
    regions: Optional[List[str]] = None
    expiration_hours: int = Field(24, ge=1, le=168)  # 1 hour to 7 days
    delivery_channels: List[DeliveryChannel] = [DeliveryChannel.APP]

class BroadcastResponse(BaseModel):
    """Response model for broadcast creation"""
    id: int
    title: str
    message: str
    priority_level: str
    target_audience: str
    regions: Optional[List[str]]
    created_at: datetime
    expires_at: datetime
    created_by: int
    notification_count: int
    
    class Config:
        from_attributes = True

class BroadcastListItem(BaseModel):
    """Model for listing broadcast messages"""
    id: int
    title: str
    message: str
    priority_level: str
    target_audience: str
    created_at: datetime
    expires_at: datetime
    created_by: int
    notification_count: int
    
    class Config:
        from_attributes = True

class BroadcastListResponse(BaseModel):
    """Response model for listing broadcast messages"""
    items: List[BroadcastListItem]
    total: int
    page: int
    limit: int
    pages: int

# AdminBroadcast model is defined in models/admin.py

# --- API Endpoints ---

@router.post("/broadcast", response_model=BroadcastResponse)
async def create_broadcast(
    broadcast_data: BroadcastCreate,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Create a broadcast message to send to users.
    Only accessible to admin users.
    """
    # Validate target audience and regions
    if broadcast_data.target_audience == TargetAudience.SPECIFIC_REGIONS and not broadcast_data.regions:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Regions must be specified when target audience is 'specific_regions'"
        )
    
    # Calculate expiration time
    expires_at = datetime.utcnow() + timedelta(hours=broadcast_data.expiration_hours)
    
    # Create broadcast record
    broadcast = AdminBroadcast(
        title=broadcast_data.title,
        message=broadcast_data.message,
        priority_level=broadcast_data.priority_level,
        target_audience=broadcast_data.target_audience,
        regions=','.join(broadcast_data.regions) if broadcast_data.regions else None,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
        created_by=admin_user.id
    )
    
    db.add(broadcast)
    await db.flush()  # Get the ID without committing
    
    # Now create notifications for the target users
    users_query = select(User)
    
    # Filter users based on target audience
    if broadcast_data.target_audience == TargetAudience.ADMIN_ONLY:
        users_query = users_query.where(User.role.in_(["admin", "superuser"]))
    elif broadcast_data.target_audience == TargetAudience.SPECIFIC_REGIONS:
        # This is a simplified approach; in a real app, you would need more sophisticated geo-filtering
        # Here we're assuming some way to filter users by region
        regions_filter = or_(*[User.region.like(f"%{region}%") for region in broadcast_data.regions])
        users_query = users_query.where(regions_filter)
    
    # Always filter for active users
    users_query = users_query.where(User.is_active == True)
    
    # Execute the query
    result = await db.execute(users_query)
    users = result.scalars().all()
    
    # Prepare notification manager
    notification_manager = NotificationManager(db_session=db)
    
    # Create alert object for this broadcast
    alert = Alert(
        alert_type="admin_broadcast",
        severity_level={"info": 0, "warning": 1, "critical": 2}.get(broadcast_data.priority_level, 0),
        message_template=broadcast_data.message,
        created_at=datetime.utcnow(),
        expires_at=expires_at,
        is_active=True,
        priority={"info": 1.0, "warning": 2.0, "critical": 3.0}.get(broadcast_data.priority_level, 1.0)
    )
    
    db.add(alert)
    await db.flush()  # Get the alert ID
    
    # Create notifications for each user based on delivery channels
    notification_count = 0
    for user in users:
        for channel in broadcast_data.delivery_channels:
            if channel != DeliveryChannel.ALL:
                channels = [channel.value]
            else:
                channels = ["app", "email", "sms"]
                
            for c in channels:
                # Skip channels that the user hasn't enabled (simplified logic)
                if c == "email" and not user.email:
                    continue
                if c == "sms" and not user.phone:
                    continue
                
                notification = Notification(
                    alert_id=alert.id,
                    user_id=user.id,
                    message=f"{broadcast_data.title}: {broadcast_data.message}",
                    delivery_channel=c,
                    created_at=datetime.utcnow()
                )
                
                db.add(notification)
                notification_count += 1
    
    # Update notification count
    broadcast.notification_count = notification_count
    
    # Commit all the changes
    await db.commit()
    
    # Process notifications in background (in a real app, this would be a background task)
    # For simplicity, we're calling it directly
    try:
        await notification_manager.process_pending_notifications()
    except Exception as e:
        logger.error(f"Error processing notifications: {e}")
    
    return broadcast

@router.get("/broadcasts", response_model=BroadcastListResponse)
async def list_broadcasts(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all broadcast messages with pagination.
    Only accessible to admin users.
    """
    # Query broadcasts
    stmt = select(AdminBroadcast).order_by(AdminBroadcast.created_at.desc())
    
    # Count total
    count_stmt = select(func.count()).select_from(stmt.subquery())
    result = await db.execute(count_stmt)
    total_count = result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit)
    
    # Execute query
    result = await db.execute(stmt)
    broadcasts = result.scalars().all()
    
    # Calculate total pages
    total_pages = (total_count + limit - 1) // limit
    
    return BroadcastListResponse(
        items=broadcasts,
        total=total_count,
        page=page,
        limit=limit,
        pages=total_pages
    )

@router.get("/broadcasts/{broadcast_id}", response_model=BroadcastResponse)
async def get_broadcast(
    broadcast_id: int,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get details of a specific broadcast message.
    Only accessible to admin users.
    """
    query = select(AdminBroadcast).where(AdminBroadcast.id == broadcast_id)
    result = await db.execute(query)
    broadcast = result.scalar_one_or_none()
    
    if not broadcast:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"Broadcast with ID {broadcast_id} not found"
        )
    
    return broadcast
