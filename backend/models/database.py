"""
Database configuration for the AirAlert system.
"""
import os
import sqlite3
from sqlalchemy import create_engine, event, Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
# Remove async imports
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy

# Load environment variables
load_dotenv()

# Get database URL from environment or use a default SQLite database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./airalert.db")  # Changed to sync SQLite

# Handle potential encoding/escaping issues
if "\\x" in DATABASE_URL:
    try:
        print(f"Found escaped characters in DATABASE_URL: {repr(DATABASE_URL)}")
        # Try to decode any escaped hex characters
        DATABASE_URL = bytes(DATABASE_URL, 'utf-8').decode('unicode_escape')
        print(f"Decoded DATABASE_URL: {repr(DATABASE_URL)}")
    except Exception as e:
        print(f"Error decoding DATABASE_URL: {e}")
        # Use hardcoded default as fallback
        DATABASE_URL = "sqlite:///./airalert.db"

# Remove any quotes that might be surrounding the URL
if DATABASE_URL.startswith('"') and DATABASE_URL.endswith('"'):
    DATABASE_URL = DATABASE_URL[1:-1]
    
# Ensure we have a proper SQLite URL format
if "sqlite" in DATABASE_URL and "///" in DATABASE_URL:
    # URL has correct format but might be missing the dot
    if DATABASE_URL == "sqlite:///airalert.db":
        DATABASE_URL = "sqlite:///./airalert.db"
else:
    print(f"Invalid DATABASE_URL format: {DATABASE_URL}")
    # Use hardcoded default as fallback
    DATABASE_URL = "sqlite:///./airalert.db"
    
# Debugging: Print the DATABASE_URL to verify its value
print(f"Using DATABASE_URL: {DATABASE_URL}")

# Debugging: Ensure DATABASE_URL is correctly formatted
if not DATABASE_URL.startswith("sqlite://"):
    # As a last resort, use the hardcoded default
    print("Invalid DATABASE_URL, falling back to default")
    DATABASE_URL = "sqlite:///./airalert.db"

# Create engine
engine = create_engine(  # Changed to synchronous engine
    DATABASE_URL,
    echo=False,  # Set to True to see SQL queries
    future=True,
)

# SpatiaLite support
@event.listens_for(Engine, "connect")
def load_spatialite(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        dbapi_connection.enable_load_extension(True)
        dbapi_connection.load_extension("mod_spatialite")
        dbapi_connection.enable_load_extension(False)

# Create session factory
SessionLocal = sessionmaker(  # Changed to synchronous session
    bind=engine,
    expire_on_commit=False,
)

# Create base class for models
Base = declarative_base()

# Initialize SQLAlchemy
db = SQLAlchemy()

def init_app(app):
    """Initialize the database with the FastAPI app."""
    pass  # No Flask-Migrate setup needed for FastAPI

# Dependency to get database session
def get_db():  # Changed to synchronous get_db
    """
    Get database session dependency.
    Used as a FastAPI dependency to provide database sessions to routes.
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        session.close()  # Removed await
