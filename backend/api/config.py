"""
Configuration settings for the AirAlert API.
"""
import os
from pydantic import BaseSettings

class Settings(BaseSettings):
    """Application settings"""
    openai_api_key: str = os.environ.get("OPENAI_API_KEY", "")
    llm_model: str = os.environ.get("LLM_MODEL", "gpt-4o")
    alert_expiry_hours: int = int(os.environ.get("ALERT_EXPIRY_HOURS", 6))
    default_radius_km: int = 25
    gis_output_dir: str = os.environ.get("GIS_OUTPUT_DIR", "output")
    message_templates: dict = {
        "default_alert": "Air quality alert: {pollutant} levels are {severity} in your area. Current value: {current_value}. Take necessary precautions."
    }
    
    # JWT settings
    jwt_secret_key: str = os.environ.get("JWT_SECRET_KEY", "")
    jwt_algorithm: str = os.environ.get("JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    
    # Web push settings
    vapid_public_key: str = os.environ.get("VAPID_PUBLIC_KEY", "")
    vapid_private_key: str = os.environ.get("VAPID_PRIVATE_KEY", "")
    vapid_claims_sub: str = os.environ.get("VAPID_CLAIMS_SUB", "mailto:admin@airalert.com")
    
    # Database settings
    db_url: str = os.environ.get("DATABASE_URL", "sqlite:///airalert.db")
    
    # Frontend URL for links in emails
    frontend_url: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    
    class Config:
        env_file = ".env"
        case_sensitive = False

# Create a global instance of settings
settings = Settings()
