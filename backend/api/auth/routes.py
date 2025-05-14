"""
Authentication routes for AirAlert API.
"""
import secrets
import logging
from datetime import datetime, timedelta
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy import select, update
from sqlalchemy.ext.asyncio import AsyncSession

from ..config import settings
from ..dependencies import (
    get_password_hash, 
    verify_password, 
    create_access_token,
    get_current_user,
)
from ..auth.models import Token, UserCreate, UserResponse
from ...models.database import get_db
from ...models.users import User
from ...notifications.email import EmailSender

# Set up logging
logger = logging.getLogger("airalert.api.auth")

# Create router
router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
async def register_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Register a new user.
    """
    # Check if username already exists
    query = select(User).where(User.username == user_data.username)
    result = await db.execute(query)
    if result.scalar_one_or_none():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Username already registered"
        )
    
    # Check if email already exists if provided
    if user_data.email:
        query = select(User).where(User.email == user_data.email)
        result = await db.execute(query)
        if result.scalar_one_or_none():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )
    
    # Hash the password
    hashed_password = get_password_hash(user_data.password)
    
    # Create new user
    new_user = User(
        username=user_data.username,
        email=user_data.email,
        name=user_data.name,
        hashed_password=hashed_password,
    )
    
    # Generate verification token if email provided
    if user_data.email:
        new_user.verification_token = secrets.token_hex(16)
        new_user.verification_token_expires = datetime.utcnow() + timedelta(days=1)
    
    # Save user to database
    db.add(new_user)
    await db.commit()
    await db.refresh(new_user)
    
    # Send verification email in background if email provided
    if user_data.email and new_user.verification_token:
        background_tasks.add_task(
            send_verification_email, 
            new_user.id, 
            new_user.email,
            new_user.name,
            new_user.verification_token
        )
    
    return new_user


@router.post("/token", response_model=Token)
async def login_for_access_token(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    OAuth2 compatible token login, get an access token for future requests.
    """
    # Authenticate user
    query = select(User).where(User.username == form_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Inactive user"
        )
    
    # Create access token
    access_token_expires = timedelta(minutes=settings.jwt_access_token_expire_minutes)
    access_token = create_access_token(
        data={"sub": user.username},
        expires_delta=access_token_expires
    )
    
    return {"access_token": access_token, "token_type": "bearer"}


@router.get("/me", response_model=UserResponse)
async def read_users_me(current_user: User = Depends(get_current_user)):
    """
    Get current user.
    """
    return current_user


@router.post("/verify-email")
async def verify_email(
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Verify email with token.
    """
    # Find user with this token
    query = select(User).where(User.verification_token == token)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification token"
        )
    
    if user.is_verified:
        return {"message": "Email already verified"}
    
    # Check if token is expired
    if not user.verification_token_expires or user.verification_token_expires < datetime.utcnow():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Verification token has expired"
        )
    
    # Mark as verified
    stmt = update(User).where(User.id == user.id).values(
        is_verified=True,
        verification_token=None,
        verification_token_expires=None
    )
    await db.execute(stmt)
    await db.commit()
    
    return {"message": "Email verified successfully"}


@router.post("/request-verification")
async def request_verification_email(
    background_tasks: BackgroundTasks,
    username: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Request a new verification email.
    """
    # Find user
    query = select(User).where(User.username == username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user or not user.email:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found or no email associated"
        )
    
    if user.is_verified:
        return {"message": "Email already verified"}
    
    # Generate new verification token
    token = secrets.token_hex(16)
    expires = datetime.utcnow() + timedelta(days=1)
    
    # Update user
    stmt = update(User).where(User.id == user.id).values(
        verification_token=token,
        verification_token_expires=expires
    )
    await db.execute(stmt)
    await db.commit()
    
    # Send verification email
    background_tasks.add_task(
        send_verification_email, 
        user.id, 
        user.email,
        user.name,
        token
    )
    
    return {"message": "Verification email sent"}


async def send_verification_email(user_id: int, email: str, name: str, token: str):
    """
    Send verification email to user.
    """
    try:
        # Create email sender
        async with AsyncSession(get_db()) as session:
            email_sender = EmailSender(settings, session)
            
            # Create verification link
            verification_link = f"{settings.frontend_url}/verify-email?token={token}"
            
            # Create HTML email body
            body = f"""
            <html>
            <head>
                <style>
                    body {{ font-family: Arial, sans-serif; line-height: 1.6; color: #333; }}
                    .container {{ max-width: 600px; margin: 0 auto; padding: 20px; }}
                    .header {{ background-color: #3498db; color: white; padding: 10px; text-align: center; border-radius: 5px 5px 0 0; }}
                    .content {{ padding: 20px; background-color: #f9f9f9; }}
                    .button {{ display: inline-block; background-color: #3498db; color: white; text-decoration: none; padding: 10px 20px; border-radius: 5px; margin-top: 15px; }}
                    .footer {{ font-size: 12px; text-align: center; margin-top: 20px; color: #777; padding: 10px; background-color: #f1f1f1; border-radius: 0 0 5px 5px; }}
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>Email Verification</h2>
                    </div>
                    <div class="content">
                        <p>Hello {name or 'User'},</p>
                        
                        <p>Thank you for registering with AirAlert! Please verify your email address by clicking the button below:</p>
                        
                        <p style="text-align: center;">
                            <a href="{verification_link}" class="button">Verify Email</a>
                        </p>
                        
                        <p>If you didn't register for an AirAlert account, you can safely ignore this email.</p>
                        
                        <p>This verification link will expire in 24 hours.</p>
                        
                        <p>Regards,<br/>AirAlert Team</p>
                    </div>
                    <div class="footer">
                        <p>This is an automated message from the AirAlert air quality monitoring system.</p>
                    </div>
                </div>
            </body>
            </html>
            """
            
            # Send email
            await email_sender._send_email(
                email,
                name,
                "AirAlert - Verify Your Email",
                body
            )
            logger.info(f"Verification email sent to {email}")
            
    except Exception as e:
        logger.error(f"Failed to send verification email: {str(e)}", exc_info=True)
