"""
Shared dependencies for the AirAlert API endpoints.
"""
import logging
from typing import Optional
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from passlib.context import CryptContext
from jose import JWTError, jwt
from sqlalchemy.ext.asyncio import AsyncSession

from .config import settings
from ..models.database import get_db
from ..models.users import User

# Set up logging
logger = logging.getLogger("airalert.api")

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/token")

def verify_password(plain_password, hashed_password):
    """Verify a password against a hash"""
    return pwd_context.verify(plain_password, hashed_password)

def get_password_hash(password):
    """Generate a password hash"""
    return pwd_context.hash(password)

def create_access_token(data: dict, expires_delta: Optional[timedelta] = None, include_role: bool = True):
    """Create a JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
        
    to_encode.update({"exp": expire})
    
    # Add additional claims if needed
    if include_role and "role" not in to_encode and "sub" in to_encode:
        from sqlalchemy import select
        from sqlalchemy.orm import Session
        from ..models.database import SessionLocal
        from ..models.users import User
        
        # Fetch user's role
        with SessionLocal() as db:
            result = db.execute(select(User.role).where(User.username == to_encode["sub"]))
            role = result.scalar_one_or_none()
            if role:
                to_encode.update({"role": role})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt


def create_refresh_token(data: dict):
    """Create a JWT refresh token with longer expiration"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=settings.jwt_refresh_token_expire_days)
    to_encode.update({"exp": expire})
    
    encoded_jwt = jwt.encode(
        to_encode, 
        settings.jwt_refresh_secret_key, 
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt

async def get_current_user(token: str = Depends(oauth2_scheme), db: AsyncSession = Depends(get_db)):
    """Get the current authenticated user from a JWT token"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode the JWT token
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        username: str = payload.get("sub")
        if username is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
        
    # Query the database for the user
    from sqlalchemy import select, update
    result = await db.execute(select(User).where(User.username == username))
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
    
    # Check if account is locked
    if user.lock_until and user.lock_until > datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail=f"Account locked. Try again after {user.lock_until}",
        )
    
    # Update last_token_refresh
    await db.execute(
        update(User)
        .where(User.id == user.id)
        .values(last_token_refresh=datetime.utcnow())
    )
    await db.commit()
    
    return user

async def get_active_user(current_user: User = Depends(get_current_user)):
    """Check if the current user is active"""
    if not current_user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Inactive user")
    return current_user


async def admin_required(current_user: User = Depends(get_current_user)):
    """Check if the current user is an admin or superuser"""
    if current_user.role not in ["admin", "superuser"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions"
        )
    return current_user


async def superuser_required(current_user: User = Depends(get_current_user)):
    """Check if the current user is a superuser"""
    if current_user.role != "superuser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Superuser privileges required"
        )
    return current_user


def require_auth(func):
    """Decorator to require authentication for a route"""
    return Depends(get_current_user)(func)


def require_active_user(func):
    """Decorator to require an active user for a route"""
    return Depends(get_active_user)(func)


def require_admin(func):
    """Decorator to require admin privileges for a route"""
    return Depends(admin_required)(func)


def require_superuser(func):
    """Decorator to require superuser privileges for a route"""
    return Depends(superuser_required)(func)

def parse_date_flexible(date_str: str) -> datetime:
    """
    Parse a date string in multiple possible formats
    
    Args:
        date_str: A date string in various formats
        
    Returns:
        A datetime object
        
    Raises:
        ValueError: If the date string cannot be parsed
    """
    # Handle UTC timezone indicator 'Z'
    clean_date = date_str
    if clean_date.endswith('Z'):
        clean_date = clean_date[:-1]  # Remove the 'Z'
        logger.debug(f"Removed UTC indicator 'Z' from date: {clean_date}")
        
    # Try multiple date formats
    formats = [
        "%Y-%m-%dT%H:%M:%S.%f", 
        "%Y-%m-%dT%H:%M:%S", 
        "%Y-%m-%d %H:%M:%S", 
        "%Y-%m-%d"
    ]
    
    for fmt in formats:
        try:
            date_obj = datetime.strptime(clean_date, fmt)
            logger.debug(f"Successfully parsed date using format: {fmt}")
            return date_obj
        except ValueError:
            continue
            
    raise ValueError(f"Could not parse date format for: {date_str}")

def get_valid_pollutants():
    """
    Get list of valid pollutant codes
    
    Returns:
        List of valid pollutant codes
    """
    return ['pm25', 'pm10', 'o3', 'no2', 'so2', 'co', 'aqi']
