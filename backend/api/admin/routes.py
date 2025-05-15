"""
Admin routes for user management.
"""
import logging
from datetime import datetime
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, status, Query
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession

from ..auth.utils import get_admin_user
from ..auth.models import UserResponse
from ...models.database import get_db
from ...models.users import User

# Set up logging
logger = logging.getLogger("airalert.api.admin")

# Create router
router = APIRouter(prefix="/admin", tags=["admin"])

@router.get("/users", response_model=List[UserResponse])
async def list_users(
    skip: int = 0,
    limit: int = 100,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    search: Optional[str] = None,
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users with filtering options (admin only).
    """
    # Build the query
    query = select(User)
    
    # Apply filters
    if role:
        query = query.where(User.role == role)
        
    if is_active is not None:
        query = query.where(User.is_active == is_active)
        
    if search:
        search_term = f"%{search}%"
        query = query.where(
            (User.username.ilike(search_term)) | 
            (User.email.ilike(search_term)) |
            (User.name.ilike(search_term))
        )
    
    # Apply pagination
    query = query.offset(skip).limit(limit)
    
    # Execute query
    result = await db.execute(query)
    users = result.scalars().all()
    
    return users

@router.get("/users/{user_id}", response_model=UserResponse)
async def get_user(
    user_id: int,
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user details (admin only).
    """
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return user

@router.put("/users/{user_id}/role", response_model=UserResponse)
async def update_user_role(
    user_id: int,
    role: str,
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update user role (admin only).
    """
    # Only superusers can assign admin or superuser roles
    if role in ["admin", "superuser"] and current_admin.role != "superuser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can assign admin or superuser roles"
        )
    
    # Validate role
    if role not in ["user", "admin", "superuser"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be 'user', 'admin', or 'superuser'."
        )
    
    # Get user
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent changing role of superusers unless you're a superuser
    if user.role == "superuser" and current_admin.role != "superuser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot change role of a superuser"
        )
    
    # Update user role
    user.role = role
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    
    return user

@router.put("/users/{user_id}/status", response_model=UserResponse)
async def update_user_status(
    user_id: int,
    is_active: bool,
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Activate or deactivate a user (admin only).
    """
    # Get user
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Prevent deactivating superusers unless you're a superuser
    if user.role == "superuser" and not is_active and current_admin.role != "superuser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Cannot deactivate a superuser"
        )
    
    # Update user status
    user.is_active = is_active
    user.updated_at = datetime.utcnow()
    await db.commit()
    await db.refresh(user)
    
    return user

@router.get("/users/stats")
async def get_user_stats(
    current_admin: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user statistics (admin only).
    """
    # Get total users count
    total_query = select(func.count()).select_from(User)
    total_result = await db.execute(total_query)
    total_users = total_result.scalar()
    
    # Get active users count
    active_query = select(func.count()).select_from(User).where(User.is_active == True)
    active_result = await db.execute(active_query)
    active_users = active_result.scalar()
    
    # Get verified users count
    verified_query = select(func.count()).select_from(User).where(User.is_verified == True)
    verified_result = await db.execute(verified_query)
    verified_users = verified_result.scalar()
    
    # Get users by role
    role_counts = {}
    for role in ["user", "admin", "superuser"]:
        role_query = select(func.count()).select_from(User).where(User.role == role)
        role_result = await db.execute(role_query)
        role_counts[role] = role_result.scalar()
    
    return {
        "total_users": total_users,
        "active_users": active_users,
        "verified_users": verified_users,
        "users_by_role": role_counts
    }
