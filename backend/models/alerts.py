"""
Alert and notification models for the AirAlert system.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from geoalchemy2 import Geometry
from datetime import datetime

from .database import Base

class Alert(Base):
    """Air quality alert based on threshold exceedance."""
    
    __tablename__ = "alerts"
    
    id = Column(Integer, primary_key=True)
    alert_type = Column(String, nullable=False)  # e.g., 'pollution', 'weather', etc.
    severity_level = Column(Integer, nullable=False)  # 0-5 scale
    affected_area = Column(Geometry("GEOMETRY", srid=4326))  # Polygon of affected area
    
    # Added center coordinates for easier frontend rendering
    center_latitude = Column(Float, nullable=True)
    center_longitude = Column(Float, nullable=True)
    impact_radius_km = Column(Float, nullable=True)  # Radius of impact area in kilometers
    
    pollutant = Column(String)  # Specific pollutant of concern
    threshold_value = Column(Float)  # Threshold value that triggered the alert
    current_value = Column(Float)  # Current measured value
    message_template = Column(String)  # Template key for alert message
    created_at = Column(DateTime, default=datetime.now)
    expires_at = Column(DateTime)  # When the alert expires
    is_active = Column(Boolean, default=True)  # Whether the alert is still active
    priority = Column(Float, default=0.0)  # Priority score for the alert (calculated from severity and vulnerability)
    
    # Relationships
    notifications = relationship("Notification", back_populates="alert", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<Alert(id={self.id}, type='{self.alert_type}', level={self.severity_level}, pollutant='{self.pollutant}')>"

class Notification(Base):
    """Notification sent to a user based on an alert."""
    
    __tablename__ = "notifications"
    
    id = Column(Integer, primary_key=True)
    alert_id = Column(Integer, ForeignKey("alerts.id"), nullable=False)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    message = Column(Text)  # Personalized message generated from template
    delivery_channel = Column(String)  # e.g., 'email', 'sms', 'app', etc.
    sent_at = Column(DateTime)  # When the notification was sent
    received_at = Column(DateTime)  # When the notification was received
    read_at = Column(DateTime)  # When the notification was read by user
    location_type = Column(String)  # 'home' or 'work' location affected
    
    # Relationships
    alert = relationship("Alert", back_populates="notifications")
    user = relationship("User", back_populates="notifications")
    
    def __repr__(self):
        return f"<Notification(id={self.id}, alert={self.alert_id}, user={self.user_id})>"
