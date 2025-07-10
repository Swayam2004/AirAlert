"""
User models for the AirAlert system.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, Boolean, Text, Enum, ForeignKey
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from datetime import datetime
import json
import enum

from .database import Base

class User(Base):
    """User profile for the AirAlert system."""
    
    __tablename__ = "users"
    
    id = Column(Integer, primary_key=True)
    username = Column(String, unique=True)
    email = Column(String, unique=True)
    name = Column(String)
    phone = Column(String)
    
    # User locations
    home_location = Column(Geometry("POINT", srid=4326))  # Home location
    work_location = Column(Geometry("POINT", srid=4326))  # Work location
    
    # User preferences
    preferred_channel = Column(String, default="app")  # Preferred notification channel: 'app', 'email', 'sms'
    language = Column(String, default="en")  # Preferred language for notifications
    sensitivity_level = Column(Integer, default=0)  # 0 (normal), 1 (sensitive), 2 (highly sensitive)
    is_active = Column(Boolean, default=True)  # Whether user receives alerts
    
    # Authentication related
    hashed_password = Column(String)
    is_verified = Column(Boolean, default=False)  # Whether email is verified
    verification_token = Column(String, nullable=True)  # Email verification token
    verification_token_expires = Column(DateTime, nullable=True)  # Expiration time for verification token
    password_reset_token = Column(String, nullable=True)  # Password reset token
    password_reset_expires = Column(DateTime, nullable=True)  # Expiration time for reset token
    failed_login_attempts = Column(Integer, default=0)  # Count of failed login attempts
    lock_until = Column(DateTime, nullable=True)  # Account locked until this time
    role = Column(String, default="user")  # Role type: 'user', 'admin', 'superuser'
    last_login = Column(DateTime)
    last_token_refresh = Column(DateTime, nullable=True)  # When was the token last refreshed
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Virtual properties for location access
    @property
    def home_latitude(self):
        if self.home_location:
            return self.home_location.y
        return None
        
    @property
    def home_longitude(self):
        if self.home_location:
            return self.home_location.x
        return None
        
    @property
    def work_latitude(self):
        if self.work_location:
            return self.work_location.y
        return None
        
    @property
    def work_longitude(self):
        if self.work_location:
            return self.work_location.x
        return None
    
    # Relationships
    notifications = relationship("Notification", back_populates="user")
    subscriptions = relationship("AlertSubscription", back_populates="user")
    alert_thresholds = relationship("AlertThreshold", back_populates="user")
    
    def __repr__(self):
        return f"<User(id={self.id}, username='{self.username}', email='{self.email}')>"

class AlertSubscription(Base):
    """User subscriptions for specific alert types."""
    
    __tablename__ = "alert_subscriptions"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    alert_type = Column(String, nullable=False)  # Type of alert to subscribe to
    min_severity = Column(Integer, default=0)  # Minimum severity level to notify
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    
    # Relationship
    user = relationship("User", back_populates="subscriptions")
    
    def __repr__(self):
        return f"<AlertSubscription(user={self.user_id}, type='{self.alert_type}', min_severity={self.min_severity})>"

class HealthProfile(Base):
    """User health profile for personalized health recommendations."""
    
    __tablename__ = "health_profiles"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    
    # Health conditions that increase sensitivity to air pollution
    has_asthma = Column(Boolean, default=False)
    has_copd = Column(Boolean, default=False)
    has_heart_disease = Column(Boolean, default=False)
    has_diabetes = Column(Boolean, default=False)
    has_pregnancy = Column(Boolean, default=False)
    
    # Age category affects sensitivity
    age_category = Column(String)  # 'child', 'adult', 'elderly'
    
    # Additional notes
    notes = Column(Text)
    
    # Timestamps
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship
    user = relationship("User")
    
    def __repr__(self):
        return f"<HealthProfile(user={self.user_id})>"

class WebPushSubscription(Base):
    """User's web push notification subscription."""
    
    __tablename__ = "web_push_subscriptions"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    subscription_json = Column(Text, nullable=False)  # Push subscription info as JSON
    user_agent = Column(String)  # Browser/device info
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship
    user = relationship("User")
    
    def __repr__(self):
        return f"<WebPushSubscription(id={self.id}, user={self.user_id})>"

class NotificationPreference(Base):
    """User's preferences for notification types and sensitivity."""
    
    __tablename__ = "notification_preferences"
    
    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    sensitivity_level = Column(Integer, default=1)  # 1 (low), 2 (medium), 3 (high)
    _preferred_pollutants = Column(Text, name="preferred_pollutants", default='["pm25", "pm10", "o3", "no2"]')
    created_at = Column(DateTime, default=datetime.now)
    updated_at = Column(DateTime, default=datetime.now, onupdate=datetime.now)
    
    # Relationship
    user = relationship("User")
    
    @property
    def preferred_pollutants(self):
        """Get the preferred pollutants as a list."""
        if self._preferred_pollutants:
            return json.loads(self._preferred_pollutants)
        return []
        
    @preferred_pollutants.setter
    def preferred_pollutants(self, value):
        """Store the preferred pollutants as a JSON string."""
        if value is None:
            self._preferred_pollutants = None
        else:
            self._preferred_pollutants = json.dumps(value)
    
    def __repr__(self):
        return f"<NotificationPreference(user={self.user_id}, sensitivity={self.sensitivity_level})>"
