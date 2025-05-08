"""
Configuration module for AirAlert.
Centralizes application configuration from environment variables and defaults.
"""
import os
from typing import Dict, Any
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

class Config:
    """Configuration manager for AirAlert."""
    
    # API and server settings
    HOST = os.getenv("HOST", "0.0.0.0")
    PORT = int(os.getenv("PORT", 8000))
    DEBUG = os.getenv("DEBUG", "False").lower() in ("true", "1", "t")
    
    # Database settings
    DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./airalert.db")
    
    # API keys
    OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
    OPENAQ_API_KEY = os.getenv("OPENAQ_API_KEY")
    MAPBOX_ACCESS_TOKEN = os.getenv("MAPBOX_ACCESS_TOKEN")
    
    # LLM settings
    LLM_MODEL = os.getenv("LLM_MODEL", "gpt-4o")
    
    # GIS processing settings
    GIS_OUTPUT_DIR = os.getenv("GIS_OUTPUT_DIR", "output")
    CELL_SIZE = float(os.getenv("CELL_SIZE", "0.01"))  # Default cell size for spatial interpolation (degrees)
    
    # Alert settings
    ALERT_EXPIRY_HOURS = int(os.getenv("ALERT_EXPIRY_HOURS", "6"))
    
    # Data sources
    DEFAULT_COUNTRY = os.getenv("DEFAULT_COUNTRY", "IN")  # Default country for data fetching
    
    # Notification settings
    EMAIL_HOST = os.getenv("EMAIL_HOST", "smtp.gmail.com")
    EMAIL_PORT = int(os.getenv("EMAIL_PORT", "587"))
    EMAIL_USERNAME = os.getenv("EMAIL_USERNAME", "")
    EMAIL_PASSWORD = os.getenv("EMAIL_PASSWORD", "")
    
    # Message templates for alerts
    MESSAGE_TEMPLATES = {
        "default_alert": "Air quality alert: {pollutant} levels are {severity} in your area. Current value: {current_value}. Take necessary precautions.",
        "pm25_unhealthy": "PM2.5 Alert: Unhealthy levels detected. Current concentration: {current_value} µg/m³, above the {threshold_value} µg/m³ threshold. Limit outdoor activities.",
        "pm10_unhealthy": "PM10 Alert: Unhealthy levels detected. Current concentration: {current_value} µg/m³, above the {threshold_value} µg/m³ threshold. Limit outdoor activities.",
        "o3_unhealthy": "Ozone Alert: Unhealthy levels detected. Current concentration: {current_value} ppb, above the {threshold_value} ppb threshold. Limit outdoor activities.",
    }
    
    # Health recommendations based on severity
    HEALTH_RECOMMENDATIONS = {
        "general": [
            "Stay informed about air quality conditions.",
            "Keep windows and doors closed when air quality is poor.",
            "Consider using air purifiers indoors."
        ],
        "moderate": [
            "Consider limiting prolonged outdoor activities.",
            "Keep indoor air clean using air purifiers."
        ],
        "unhealthy_sensitive": [
            "Sensitive groups should reduce outdoor activities.",
            "Consider wearing an N95 mask outdoors if you belong to a vulnerable group.",
            "Keep medications handy if you have respiratory conditions."
        ],
        "unhealthy": [
            "Everyone should reduce outdoor exertion.",
            "Sensitive groups should avoid outdoor activities.",
            "Use air purifiers indoors.",
            "Keep windows and doors closed."
        ],
        "very_unhealthy": [
            "Everyone should avoid outdoor activities.",
            "Wear N95 masks if you must go outside.",
            "Stay indoors with windows closed and air purifiers running."
        ],
        "hazardous": [
            "Everyone should stay indoors.",
            "Wear N95 masks if you must go outside.",
            "Use air purifiers and keep all windows and doors sealed."
        ]
    }
    
    @classmethod
    def get_all(cls) -> Dict[str, Any]:
        """Get all configuration values as a dictionary."""
        return {
            key: value for key, value in cls.__dict__.items()
            if not key.startswith('_') and key.isupper()
        }
    
    @classmethod
    def get_openaq_config(cls) -> Dict[str, Any]:
        """Get configuration for OpenAQ data fetcher."""
        return {
            "api_key": cls.OPENAQ_API_KEY,
            "limit": 10000,
            "country": cls.DEFAULT_COUNTRY,
            "has_geo": True
        }
    
    @classmethod
    def get_interpolator_config(cls) -> Dict[str, Any]:
        """Get configuration for spatial interpolation."""
        return {
            "cell_size": cls.CELL_SIZE,
            "output_dir": cls.GIS_OUTPUT_DIR
        }
    
    @classmethod
    def get_alert_config(cls) -> Dict[str, Any]:
        """Get configuration for alert system."""
        return {
            "openai_api_key": cls.OPENAI_API_KEY,
            "llm_model": cls.LLM_MODEL,
            "alert_expiry_hours": cls.ALERT_EXPIRY_HOURS,
            "message_templates": cls.MESSAGE_TEMPLATES,
            "health_recommendations": cls.HEALTH_RECOMMENDATIONS,
        }

# Create a global instance for easy imports
config = Config()
