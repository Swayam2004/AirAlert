"""
User management endpoints for admin users.
"""
import logging
from typing import Dict, List, Optional
from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query, Body, status
from sqlalchemy import select, update, func
from sqlalchemy.ext.asyncio import AsyncSession
from pydantic import BaseModel, EmailStr

from ...models.database import get_db
from ...models.users import User
from ..auth.utils import get_admin_user

# Set up logging
logger = logging.getLogger("airalert.api.admin")

# Create router
router = APIRouter(prefix="/admin", tags=["admin"])

# --- Pydantic models ---
class UserUpdateRole(BaseModel):
    """Model for updating user role"""
    role: str

class UserUpdateStatus(BaseModel):
    """Model for updating user status"""
    is_active: bool

class UserListItem(BaseModel):
    """User item for listing"""
    id: int
    username: str
    email: Optional[str]
    name: Optional[str]
    role: str
    is_active: bool
    is_verified: bool
    created_at: datetime
    last_login: Optional[datetime]
    
    class Config:
        from_attributes = True

class UserListResponse(BaseModel):
    """Response model for user listing with pagination"""
    items: List[UserListItem]
    total: int
    page: int
    limit: int
    pages: int

class UserStatsResponse(BaseModel):
    """Response model for user statistics"""
    total: int
    active: int
    inactive: int
    verified: int
    unverified: int
    roles: Dict[str, int]

# --- API Endpoints ---
@router.get("/users", response_model=UserListResponse)
async def list_users(
    page: int = Query(1, ge=1, description="Page number"),
    limit: int = Query(10, ge=1, le=100, description="Items per page"),
    query: Optional[str] = None,
    role: Optional[str] = None,
    is_active: Optional[bool] = None,
    is_verified: Optional[bool] = None,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    List all users with pagination and filtering.
    Only accessible to admin users.
    """
    # Build query
    stmt = select(User)
    
    # Apply filters
    if query:
        stmt = stmt.where(
            (User.username.ilike(f"%{query}%")) |
            (User.email.ilike(f"%{query}%")) |
            (User.name.ilike(f"%{query}%"))
        )
    
    if role:
        stmt = stmt.where(User.role == role)
        
    if is_active is not None:
        stmt = stmt.where(User.is_active == is_active)
        
    if is_verified is not None:
        stmt = stmt.where(User.is_verified == is_verified)
    
    # Count total matching records
    count_stmt = select(func.count()).select_from(stmt.subquery())
    result = await db.execute(count_stmt)
    total_count = result.scalar()
    
    # Apply pagination
    offset = (page - 1) * limit
    stmt = stmt.offset(offset).limit(limit).order_by(User.id)
    
    # Execute query
    result = await db.execute(stmt)
    users = result.scalars().all()
    
    # Calculate total pages
    total_pages = (total_count + limit - 1) // limit
    
    return UserListResponse(
        items=users,
        total=total_count,
        page=page,
        limit=limit,
        pages=total_pages
    )

@router.get("/users/stats", response_model=UserStatsResponse)
async def get_user_statistics(
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Get user statistics.
    Only accessible to admin users.
    """
    # Get total users
    total_query = select(func.count()).select_from(User)
    result = await db.execute(total_query)
    total = result.scalar()
    
    # Get active/inactive counts
    active_query = select(func.count()).where(User.is_active == True).select_from(User)
    result = await db.execute(active_query)
    active = result.scalar()
    
    # Get verified/unverified counts
    verified_query = select(func.count()).where(User.is_verified == True).select_from(User)
    result = await db.execute(verified_query)
    verified = result.scalar()
    
    # Get role distribution
    roles_query = select(User.role, func.count()).group_by(User.role).select_from(User)
    result = await db.execute(roles_query)
    roles = {role: count for role, count in result}
    
    return UserStatsResponse(
        total=total,
        active=active,
        inactive=total - active,
        verified=verified,
        unverified=total - verified,
        roles=roles
    )

@router.put("/users/{user_id}/role")
async def update_user_role(
    user_id: int, 
    role_data: UserUpdateRole,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Update a user's role.
    Only accessible to admin users.
    """
    # Validate role
    if role_data.role not in ["user", "admin", "superuser"]:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid role. Must be one of: user, admin, superuser"
        )
    
    # Don't allow non-superusers to create superusers
    if role_data.role == "superuser" and admin_user.role != "superuser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can create or modify superuser accounts"
        )
    
    # Get the user
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Don't allow modifying superusers unless you're a superuser
    if user.role == "superuser" and admin_user.role != "superuser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can modify superuser accounts"
        )
    
    # Update the user's role
    user.role = role_data.role
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    return {"message": f"User role updated to {role_data.role}"}

@router.put("/users/{user_id}/status")
async def update_user_status(
    user_id: int, 
    status_data: UserUpdateStatus,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Activate or deactivate a user.
    Only accessible to admin users.
    """
    # Get the user
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Don't allow deactivating superusers unless you're a superuser
    if user.role == "superuser" and admin_user.role != "superuser" and not status_data.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can deactivate superuser accounts"
        )
    
    # Update the user's status
    user.is_active = status_data.is_active
    user.updated_at = datetime.utcnow()
    
    await db.commit()
    
    status_message = "activated" if status_data.is_active else "deactivated"
    return {"message": f"User {status_message}"}

@router.delete("/users/{user_id}")
async def delete_user(
    user_id: int,
    admin_user: User = Depends(get_admin_user),
    db: AsyncSession = Depends(get_db)
):
    """
    Delete a user.
    Only accessible to admin users.
    """
    # Get the user
    query = select(User).where(User.id == user_id)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=f"User with ID {user_id} not found"
        )
    
    # Don't allow deleting superusers unless you're a superuser
    if user.role == "superuser" and admin_user.role != "superuser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only superusers can delete superuser accounts"
        )
    
    # Don't allow self-deletion
    if user.id == admin_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="You cannot delete your own account"
        )
    
    # Delete the user
    await db.delete(user)
    await db.commit()
    
    return {"message": f"User deleted"}
