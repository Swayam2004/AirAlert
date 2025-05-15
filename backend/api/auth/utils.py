"""
Authentication utility functions for AirAlert API.
"""
import logging
import secrets
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, Tuple

import bcrypt
from jose import jwt, JWTError
from fastapi import HTTPException, status, Depends, Request
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import Session
from pydantic import BaseModel

from ..config import settings
from ...models.users import User
from ...models.database import get_db

# Set up logging
logger = logging.getLogger("airalert.auth.utils")

# Password hashing context
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")

# Token blacklist (in-memory for now, should be replaced with Redis in production)
token_blacklist = set()

def get_password_hash(password: str) -> str:
    """Generate a password hash using bcrypt"""
    # Generate a salt and hash the password
    salt = bcrypt.gensalt()
    hashed_password = bcrypt.hashpw(password.encode('utf-8'), salt)
    return hashed_password.decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify a password against a hash"""
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: Dict[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Create JWT access token"""
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=settings.jwt_access_token_expire_minutes)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt

def create_refresh_token(data: Dict[str, Any]) -> str:
    """Create JWT refresh token with longer expiration time"""
    to_encode = data.copy()
    expire = datetime.utcnow() + timedelta(days=7)  # 7 days expiration
    to_encode.update({"exp": expire, "type": "refresh"})
    
    encoded_jwt = jwt.encode(
        to_encode,
        settings.jwt_secret_key,  # Using the same secret for simplicity
        algorithm=settings.jwt_algorithm
    )
    return encoded_jwt

def revoke_token(token: str) -> None:
    """Add a token to the blacklist"""
    token_blacklist.add(token)

def is_token_blacklisted(token: str) -> bool:
    """Check if a token is blacklisted"""
    return token in token_blacklist

def decode_token(token: str) -> Dict[str, Any]:
    """Decode a JWT token"""
    try:
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        return payload
    except JWTError as e:
        logger.error(f"Error decoding token: {e}")
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials",
            headers={"WWW-Authenticate": "Bearer"},
        )

def generate_verification_token() -> Tuple[str, datetime]:
    """Generate an email verification token and expiration time"""
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(days=1)
    return token, expires

def generate_password_reset_token() -> Tuple[str, datetime]:
    """Generate a password reset token and expiration time"""
    token = secrets.token_urlsafe(32)
    expires = datetime.utcnow() + timedelta(hours=1)
    return token, expires

async def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: AsyncSession = Depends(get_db)
) -> User:
    """Get current authenticated user"""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    # Check if token is blacklisted
    if is_token_blacklisted(token):
        raise credentials_exception
    
    try:
        # Decode JWT token
        payload = decode_token(token)
        username: str = payload.get("sub")
        token_type: str = payload.get("type", "access")
        
        if username is None:
            raise credentials_exception
        
        # Don't allow using refresh token for authentication
        if token_type == "refresh":
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token type",
                headers={"WWW-Authenticate": "Bearer"},
            )
            
    except JWTError:
        raise credentials_exception
        
    # Get user from database
    query = select(User).where(User.username == username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if user is None:
        raise credentials_exception
        
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
            headers={"WWW-Authenticate": "Bearer"},
        )
        
    # Update last token refresh time
    user.last_token_refresh = datetime.utcnow()
    await db.commit()
        
    return user

async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Get current authenticated admin or superuser"""
    if current_user.role not in ["admin", "superuser"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return current_user

async def get_superuser(current_user: User = Depends(get_current_user)) -> User:
    """Get current authenticated superuser"""
    if current_user.role != "superuser":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Insufficient permissions",
        )
    return current_user
