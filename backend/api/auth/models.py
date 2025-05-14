"""
Authentication models for the AirAlert API.
"""
from pydantic import BaseModel, EmailStr
from typing import Optional


class Token(BaseModel):
    """Token response model"""
    access_token: str
    token_type: str


class TokenData(BaseModel):
    """Token data model"""
    username: Optional[str] = None
    

class UserBase(BaseModel):
    """Base user model"""
    username: str
    email: Optional[EmailStr] = None
    name: Optional[str] = None
    

class UserCreate(UserBase):
    """User creation model"""
    password: str
    

class UserLogin(BaseModel):
    """User login model"""
    username: str
    password: str


class UserResponse(UserBase):
    """User response model"""
    id: int
    is_active: bool
    is_verified: bool
    
    class Config:
        orm_mode = True
