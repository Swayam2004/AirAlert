"""
Database configuration for the AirAlert system.
"""
import os
import sqlite3
from sqlalchemy import create_engine, event, Engine
from sqlalchemy.ext.declarative import declarative_base
from sqlalchemy.orm import sessionmaker
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from dotenv import load_dotenv
from flask_sqlalchemy import SQLAlchemy

# Load environment variables
load_dotenv()

# Get database URL from environment or use a default SQLite database
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite+aiosqlite:///./airalert.db")

# Create engine
engine = create_async_engine(
    DATABASE_URL,
    echo=False,  # Set to True to see SQL queries
    future=True,
)

# Replace aiosqlite with sqlite3 for SpatiaLite support
@event.listens_for(Engine, "connect")
def load_spatialite(dbapi_connection, connection_record):
    if isinstance(dbapi_connection, sqlite3.Connection):
        dbapi_connection.enable_load_extension(True)
        dbapi_connection.load_extension("mod_spatialite")
        dbapi_connection.enable_load_extension(False)

# Create session factory
SessionLocal = sessionmaker(
    bind=engine,
    class_=AsyncSession,
    expire_on_commit=False,
)

# Create base class for models
Base = declarative_base()

# Initialize SQLAlchemy
db = SQLAlchemy()

# Remove Flask-Migrate integration
# Delete the `migrate` object and its usage in `init_app`
def init_app(app):
    """Initialize the database with the FastAPI app."""
    pass  # No Flask-Migrate setup needed for FastAPI

# Dependency to get database session
async def get_db():
    """
    Get database session dependency.
    Used as a FastAPI dependency to provide database sessions to routes.
    """
    session = SessionLocal()
    try:
        yield session
    finally:
        await session.close()
