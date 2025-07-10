"""
Admin broadcast models for the AirAlert system.
"""
from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime

from .database import Base

class AdminBroadcast(Base):
    """Admin broadcast messages for users"""
    
    __tablename__ = "admin_broadcasts"
    
    id = Column(Integer, primary_key=True)
    title = Column(String, nullable=False)
    message = Column(Text, nullable=False)
    priority_level = Column(String, nullable=False, default="info")  # info, warning, critical
    target_audience = Column(String, nullable=False, default="all_users")  # all_users, specific_regions, admin_only
    regions = Column(String, nullable=True)  # JSON string of regions
    created_at = Column(DateTime, default=datetime.now)
    expires_at = Column(DateTime)
    created_by = Column(Integer, ForeignKey("users.id"), nullable=False)
    notification_count = Column(Integer, default=0)
    
    # Relationships
    creator = relationship("User", foreign_keys=[created_by])
    
    def __repr__(self):
        return f"<AdminBroadcast(id={self.id}, title='{self.title}', level='{self.priority_level}')>"
