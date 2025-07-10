"""
Main entry point for the AirAlert application.
Starts the FastAPI server and initializes the application.
Consolidated from both original main.py and run_fixed.py.
"""
import os
import logging
import asyncio
import uvicorn
import warnings
from dotenv import load_dotenv
import pathlib

# Filter out specific Pydantic warning about orm_mode
warnings.filterwarnings("ignore", message="Valid config keys have changed in V2.*'orm_mode' has been renamed.*")

# Filter out specific Pydantic warning about orm_mode
warnings.filterwarnings("ignore", message="Valid config keys have changed in V2.*'orm_mode' has been renamed.*")

# Set up logging
logging.basicConfig(
    level=logging.DEBUG,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("airalert")
# Set SQLAlchemy logging to info level
logging.getLogger('sqlalchemy.engine').setLevel(logging.INFO)

# Try to load environment variables from .env.fixed first, fall back to .env
env_fixed_path = pathlib.Path(".env.fixed")
if env_fixed_path.exists():
    logger.info("Loading environment from .env.fixed")
    load_dotenv(dotenv_path=".env.fixed")
else:
    logger.info("Loading environment from .env")
    load_dotenv()

# Ensure DATABASE_URL is set
if not os.environ.get("DATABASE_URL"):
    logger.info("Setting default DATABASE_URL")
    os.environ["DATABASE_URL"] = "sqlite:///./airalert.db"

# Set default port if not provided
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# Import API app
from backend.api.app import app

if __name__ == "__main__":
    logger.info(f"Starting AirAlert on {HOST}:{PORT}")
    logger.info(f"Using database: {os.environ.get('DATABASE_URL')}")
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info"
    )
