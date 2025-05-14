#!/usr/bin/env python3
# filepath: /home/swayam/projects/AirAlert/run_fixed.py
"""
Fixed entry point for the AirAlert application.
Uses a fixed environment file to avoid encoding issues.
"""
import os
import logging
import uvicorn
import warnings
from dotenv import load_dotenv

# Filter out specific Pydantic warning about orm_mode
warnings.filterwarnings("ignore", message="Valid config keys have changed in V2.*'orm_mode' has been renamed.*")

# Set up logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger("airalert")

# Load environment variables from the fixed file
load_dotenv(dotenv_path=".env.fixed")

# Set environment variables directly
os.environ["DATABASE_URL"] = "sqlite:///./airalert.db"

# Set default port if not provided
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# Import API app
from backend.api.app import app

if __name__ == "__main__":
    logger.info(f"Starting AirAlert on {HOST}:{PORT}")
    uvicorn.run(
        "run_fixed:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info"
    )
