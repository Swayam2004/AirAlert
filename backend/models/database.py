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
        dbapi_connection.load_extension(r"E:\AirAlert\spatialite\mod_spatialite.dll")
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
