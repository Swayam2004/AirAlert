"""
Main entry point for the AirAlert application.
Starts the FastAPI server and initializes the application.
"""
import os
import logging
import asyncio
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

# Load environment variables
load_dotenv()

# Set default port if not provided
PORT = int(os.getenv("PORT", 8000))
HOST = os.getenv("HOST", "0.0.0.0")

# Import API app
from backend.api.app import app

if __name__ == "__main__":
    logger.info(f"Starting AirAlert on {HOST}:{PORT}")
    uvicorn.run(
        "main:app",
        host=HOST,
        port=PORT,
        reload=True,
        log_level="info"
    )
