"""
Authentication routes for AirAlert API.
"""
import secrets
import logging
from datetime import datetime, timedelta
from typing import Any, Optional, List

from fastapi import APIRouter, Depends, HTTPException, BackgroundTasks, status, Request, Response
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer
from sqlalchemy import select, update, delete
from sqlalchemy.ext.asyncio import AsyncSession
from slowapi import Limiter
from slowapi.util import get_remote_address
from jose import jwt, JWTError

from ..config import settings
from .utils import (
    get_password_hash,
    verify_password,
    create_access_token,
    create_refresh_token,
    get_current_user,
    get_admin_user,
    revoke_token,
    is_token_blacklisted,
    generate_verification_token,
    generate_password_reset_token
)
from .models import Token, UserCreate, UserResponse, PasswordResetRequest, PasswordReset
from ...models.database import get_db
from ...models.users import User
from ...notifications.email import EmailSender
from ...notifications.manager import NotificationManager

# Set up logging
logger = logging.getLogger("airalert.api.auth")

# Create router
router = APIRouter(prefix="/auth", tags=["auth"])

# Set up rate limiter
limiter = Limiter(key_func=get_remote_address)

# Helper function for sending verification emails
async def send_verification_email(
    user_id: int, 
    email: str, 
    name: str, 
    token: str,
    db: AsyncSession
):
    """Send verification email to user"""
    # Create notification manager
    notification_manager = NotificationManager()
    
    # Prepare verification URL
    verification_url = f"{settings.frontend_url}/verify-email?token={token}"
    
    # Email content
    subject = "AirAlert: Verify your email address"
    html_content = f"""
    <h1>Welcome to AirAlert!</h1>
    <p>Hello {name},</p>
    <p>Thank you for signing up. Please verify your email address by clicking the link below:</p>
    <p><a href="{verification_url}">Verify Email Address</a></p>
    <p>Or copy and paste this URL into your browser:</p>
    <p>{verification_url}</p>
    <p>This link will expire in 24 hours.</p>
    <p>If you didn't create this account, you can safely ignore this email.</p>
    <p>Best regards,<br>The AirAlert Team</p>
    """
    
    # Create notification
    await notification_manager.send_email_notification(
        recipient_email=email,
        subject=subject,
        html_content=html_content,
        user_id=user_id,
        db_session=db
    )

# Helper function for sending password reset emails
async def send_password_reset_email(
    user_id: int,
    email: str,
    name: str,
    token: str,
    db: AsyncSession
):
    """Send password reset email to user"""
    # Create notification manager
    notification_manager = NotificationManager()
    
    # Prepare reset URL
    reset_url = f"{settings.frontend_url}/reset-password?token={token}"
    
    # Email content
    subject = "AirAlert: Password Reset Request"
    html_content = f"""
    <h1>Password Reset</h1>
    <p>Hello {name},</p>
    <p>We received a request to reset your password. Click the link below to create a new password:</p>
    <p><a href="{reset_url}">Reset Password</a></p>
    <p>Or copy and paste this URL into your browser:</p>
    <p>{reset_url}</p>
    <p>This link will expire in 1 hour.</p>
    <p>If you didn't request a password reset, you can safely ignore this email.</p>
    <p>Best regards,<br>The AirAlert Team</p>
    """
    
    # Create notification
    await notification_manager.send_email_notification(
        recipient_email=email,
        subject=subject,
        html_content=html_content,
        user_id=user_id,
        db_session=db
    )

@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
@limiter.limit("5/minute")
async def register_user(
    user_data: UserCreate,
    background_tasks: BackgroundTasks,
    request: Request,
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
        phone=user_data.phone if hasattr(user_data, 'phone') else None,
        hashed_password=hashed_password,
        created_at=datetime.utcnow(),
        updated_at=datetime.utcnow(),
    )
    
    # Generate verification token if email provided
    if user_data.email:
        token, expires = generate_verification_token()
        new_user.verification_token = token
        new_user.verification_token_expires = expires
    
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
            new_user.name or new_user.username,
            new_user.verification_token,
            db
        )
    
    return new_user


@router.post("/login", response_model=Token)
@limiter.limit("10/minute")
async def login(
    request: Request,
    response: Response,
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: AsyncSession = Depends(get_db)
):
    """
    Authenticate user and return JWT token.
    """
    # Get user from database
    query = select(User).where(User.username == form_data.username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    # Check if user exists and password is correct
    if not user or not verify_password(form_data.password, user.hashed_password):
        # Increment failed login attempts
        if user:
            user.failed_login_attempts += 1
            
            # Lock account after 5 failed attempts
            if user.failed_login_attempts >= 5:
                user.lock_until = datetime.utcnow() + timedelta(minutes=15)
                
            await db.commit()
            
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if account is locked
    if user.lock_until and user.lock_until > datetime.utcnow():
        # Calculate remaining lock time
        remaining = (user.lock_until - datetime.utcnow()).total_seconds() / 60
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=f"Account is locked. Try again in {int(remaining)} minutes",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Check if user is active
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User account is disabled",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    # Reset failed login attempts on successful login
    user.failed_login_attempts = 0
    user.last_login = datetime.utcnow()
    await db.commit()
    
    # Create access token payload
    token_data = {
        "sub": user.username,
        "role": user.role,
        "type": "access"
    }
    
    # Create refresh token payload
    refresh_token_data = {
        "sub": user.username,
        "type": "refresh"
    }
    
    # Create tokens
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(refresh_token_data)
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_token_expire_minutes * 60,
        "refresh_token": refresh_token
    }


@router.get("/verify-email/{token}", response_model=UserResponse)
async def verify_email(token: str, db: AsyncSession = Depends(get_db)):
    """
    Verify user email with token.
    """
    # Get user by verification token
    query = select(User).where(
        (User.verification_token == token) & 
        (User.verification_token_expires > datetime.utcnow())
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    # Check if token is valid
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired verification token"
        )
    
    # Update user verification status
    user.is_verified = True
    user.verification_token = None
    user.verification_token_expires = None
    await db.commit()
    await db.refresh(user)
    
    return user


@router.post("/reset-password-request", status_code=status.HTTP_202_ACCEPTED)
@limiter.limit("5/hour")
async def request_password_reset(
    request: Request,
    reset_request: PasswordResetRequest,
    background_tasks: BackgroundTasks,
    db: AsyncSession = Depends(get_db)
):
    """
    Request password reset token.
    """
    # Get user by email
    query = select(User).where(User.email == reset_request.email)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    # Always return success even if user not found (security)
    if not user:
        return {"message": "If account exists, a password reset email has been sent"}
    
    # Generate password reset token
    token, expires = generate_password_reset_token()
    user.password_reset_token = token
    user.password_reset_expires = expires
    await db.commit()
    
    # Send password reset email
    background_tasks.add_task(
        send_password_reset_email,
        user.id,
        user.email,
        user.name or user.username,
        token,
        db
    )
    
    return {"message": "If account exists, a password reset email has been sent"}


@router.post("/reset-password/{token}", status_code=status.HTTP_200_OK)
async def reset_password(
    token: str, 
    password_data: PasswordReset,
    db: AsyncSession = Depends(get_db)
):
    """
    Reset password with token.
    """
    # Get user by reset token
    query = select(User).where(
        (User.password_reset_token == token) & 
        (User.password_reset_expires > datetime.utcnow())
    )
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    # Check if token is valid
    if not user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired password reset token"
        )
    
    # Hash the new password
    hashed_password = get_password_hash(password_data.password)
    
    # Update user password
    user.hashed_password = hashed_password
    user.password_reset_token = None
    user.password_reset_expires = None
    user.failed_login_attempts = 0
    user.lock_until = None
    await db.commit()
    
    return {"message": "Password has been successfully reset"}


@router.get("/me", response_model=UserResponse)
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user info.
    """
    return current_user


@router.post("/logout")
async def logout(
    token: str = Depends(OAuth2PasswordBearer(tokenUrl="/api/auth/login")),
):
    """
    Logout user by blacklisting their token.
    """
    revoke_token(token)
    return {"message": "Successfully logged out"}


@router.post("/refresh-token", response_model=Token)
async def refresh_access_token(
    request: Request,
    token: str,
    db: AsyncSession = Depends(get_db)
):
    """
    Refresh access token using refresh token.
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Decode JWT token
        payload = jwt.decode(
            token, 
            settings.jwt_secret_key, 
            algorithms=[settings.jwt_algorithm]
        )
        
        username: str = payload.get("sub")
        token_type: str = payload.get("type")
        
        # Check if token is refresh token
        if not username or token_type != "refresh":
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Check if token is blacklisted
    if is_token_blacklisted(token):
        raise credentials_exception
    
    # Get user from database
    query = select(User).where(User.username == username)
    result = await db.execute(query)
    user = result.scalar_one_or_none()
    
    if not user or not user.is_active:
        raise credentials_exception
    
    # Revoke old refresh token
    revoke_token(token)
    
    # Create new tokens
    token_data = {
        "sub": user.username,
        "role": user.role,
        "type": "access"
    }
    refresh_token_data = {
        "sub": user.username,
        "type": "refresh"
    }
    
    # Create tokens
    access_token = create_access_token(token_data)
    refresh_token = create_refresh_token(refresh_token_data)
    
    # Update last token refresh time
    user.last_token_refresh = datetime.utcnow()
    await db.commit()
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "expires_in": settings.jwt_access_token_expire_minutes * 60,
        "refresh_token": refresh_token
    }
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
