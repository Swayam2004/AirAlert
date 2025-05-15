"""
Configuration settings for the AirAlert API.
"""
import os
from pydantic_settings import BaseSettings

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
    # CORS settings
    cors_origins: list = ["http://localhost:8001", "http://127.0.0.1:8001"]
    
    # JWT settings
    jwt_secret_key: str = os.environ.get("JWT_SECRET_KEY", "supersecretkey")  # Replace with actual secret in production
    jwt_refresh_secret_key: str = os.environ.get("JWT_REFRESH_SECRET_KEY", "refreshsupersecretkey")  # Replace with actual secret in production
    jwt_algorithm: str = os.environ.get("JWT_ALGORITHM", "HS256")
    jwt_access_token_expire_minutes: int = int(os.environ.get("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", 30))
    jwt_refresh_token_expire_days: int = int(os.environ.get("JWT_REFRESH_TOKEN_EXPIRE_DAYS", 7))
    
    # Email settings
    email_host: str = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
    email_port: int = int(os.environ.get("EMAIL_PORT", 587))
    email_username: str = os.environ.get("EMAIL_USERNAME", "")
    email_password: str = os.environ.get("EMAIL_PASSWORD", "")
    email_from: str = os.environ.get("EMAIL_FROM", "noreply@airalert.com")
    
    # Web push settings
    vapid_public_key: str = os.environ.get("VAPID_PUBLIC_KEY", "")
    vapid_private_key: str = os.environ.get("VAPID_PRIVATE_KEY", "")
    vapid_claims_sub: str = os.environ.get("VAPID_CLAIMS_SUB", "mailto:admin@airalert.com")
    
    # Database settings
    db_url: str = os.environ.get("DATABASE_URL", "sqlite:///airalert.db")
    
    # Frontend URL for links in emails
    frontend_url: str = os.environ.get("FRONTEND_URL", "http://localhost:3000")
    
    # Host and port settings
    host: str = os.environ.get("HOST", "127.0.0.1")
    port: str = os.environ.get("PORT", "8000")
    debug: str = os.environ.get("DEBUG", "False")
    
    # Database settings
    database_url: str = os.environ.get("DATABASE_URL", "sqlite:///airalert.db")
    postgres_user: str = os.environ.get("POSTGRES_USER", "postgres")
    postgres_password: str = os.environ.get("POSTGRES_PASSWORD", "postgres")
    postgres_db: str = os.environ.get("POSTGRES_DB", "airalert")
    
    # API keys
    openaq_api_key: str = os.environ.get("OPENAQ_API_KEY", "")
    mapbox_access_token: str = os.environ.get("MAPBOX_ACCESS_TOKEN", "")
    
    # GIS settings
    cell_size: str = os.environ.get("CELL_SIZE", "0.01")
    default_country: str = os.environ.get("DEFAULT_COUNTRY", "IN")
    
    # Email settings
    email_host: str = os.environ.get("EMAIL_HOST", "smtp.gmail.com")
    email_port: str = os.environ.get("EMAIL_PORT", "587")
    email_username: str = os.environ.get("EMAIL_USERNAME", "")
    email_password: str = os.environ.get("EMAIL_PASSWORD", "")
    
    model_config = {
        "env_file": ".env",
        "case_sensitive": False,
        "extra": "allow"  # Allow extra fields
    }

# Create a global instance of settings
settings = Settings()
