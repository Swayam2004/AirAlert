"""
Authentication models for the AirAlert API.
"""
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, validator
from typing import Optional, List
import re


class Token(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str
    expires_in: int
    refresh_token: Optional[str] = None


class TokenData(BaseModel):
    """Token data model"""
    username: Optional[str] = None
    role: Optional[str] = None
    exp: Optional[datetime] = None
    

class UserBase(BaseModel):
    """Base user model"""
    username: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    

class UserCreate(UserBase):
    """User creation model"""
    password: str = Field(..., min_length=8)
    
    @validator('password')
    def password_complexity(cls, v):
        """Validate password complexity"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[^a-zA-Z\d\s]', v):
            raise ValueError('Password must contain at least one special character')
        return v


class UserLogin(BaseModel):
    """User login model"""
    username: str
    password: str
    stay_logged_in: bool = False


class UserResponse(UserBase):
    """User response model"""
    id: int
    is_active: bool
    is_verified: bool
    role: str
    created_at: datetime
    last_login: Optional[datetime] = None
    
    class Config:
        orm_mode = True


class PasswordResetRequest(BaseModel):
    """Password reset request model"""
    email: EmailStr


class PasswordReset(BaseModel):
    """Password reset model"""
    password: str = Field(..., min_length=8)
    confirm_password: str
    
    @validator('password')
    def password_complexity(cls, v):
        """Validate password complexity"""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters')
        if not re.search(r'[A-Z]', v):
            raise ValueError('Password must contain at least one uppercase letter')
        if not re.search(r'[a-z]', v):
            raise ValueError('Password must contain at least one lowercase letter')
        if not re.search(r'\d', v):
            raise ValueError('Password must contain at least one digit')
        if not re.search(r'[^a-zA-Z\d\s]', v):
            raise ValueError('Password must contain at least one special character')
        return v
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'password' in values and v != values['password']:
            raise ValueError('Passwords do not match')
        return v


class TokenRefresh(BaseModel):
    """Token refresh model"""
    refresh_token: str


class UserUpdate(BaseModel):
    """User update model"""
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    phone: Optional[str] = None
    preferred_channel: Optional[str] = None
    language: Optional[str] = None
    
    class Config:
        orm_mode = True


class AdminUserUpdate(UserUpdate):
    """Admin user update model with additional fields that only admins can update"""
    role: Optional[str] = None
    is_active: Optional[bool] = None
    is_verified: Optional[bool] = None
