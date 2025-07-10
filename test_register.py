import logging

# Set up logging configuration
logging.basicConfig(
    level=logging.DEBUG,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.StreamHandler()
    ]
)
logger = logging.getLogger(__name__)

# Modify the content of run_fixed.py to diagnose 
# the SQLAlchemy issue with ChunkedIteratorResult
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession
from sqlalchemy.ext.asyncio import AsyncEngine
import asyncio
import sys

async def main():
    from backend.api.auth.routes import register_user
    logger.info("Testing the database queries to isolate the issue")
    
    # Create a temporary function to fix the registation issues
    from backend.models.database import get_db
    from fastapi import Request, BackgroundTasks
    from backend.api.auth.models import UserCreate
    
    # Create a mock request and user data
    mock_request = Request({"type": "http"})
    mock_bg = BackgroundTasks()
    
    # Create a test user
    test_user = UserCreate(
        username="TestUser123",
        email="test@example.com",
        name="Test User",
        phone="1234567890",
        password="TestPass123!"
    )
    
    # Get a database session
    db = next(get_db())
    
    # Call the register function
    try:
        user = await register_user(test_user, mock_bg, mock_request, db)
        logger.info(f"User registered successfully: {user}")
    except Exception as e:
        logger.error(f"Error registering user: {e}", exc_info=True)
        
if __name__ == "__main__":
    asyncio.run(main())
