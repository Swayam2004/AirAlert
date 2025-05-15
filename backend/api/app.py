"""
Main FastAPI application for AirAlert.
Defines routes and dependencies for the API.
"""
import logging
from datetime import datetime

from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse

from .config import settings
from ..models.database import Base, engine, init_app

# Import routers from modular components
from .auth.routes import router as auth_router
from .monitoring.routes import router as monitoring_router
from .alerts.routes import router as alerts_router
from .users.routes import router as users_router
from .processing.routes import router as processing_router
from .admin.routes import router as admin_router

# Set up logging configuration
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
    handlers=[
        logging.FileHandler("airalert.log"),
        logging.StreamHandler()
    ]
)
logger = logging.getLogger("airalert")

# Initialize FastAPI
app = FastAPI(
    title="AirAlert API",
    description="AI-powered early warning system for air pollution",
    version="0.2.0"
)

# Add CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://127.0.0.1:8001", "http://localhost:8001", "http://localhost:3000"],  # Added frontend origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Add exception handling middleware
@app.middleware("http")
async def db_session_middleware(request, call_next):
    """
    Middleware to handle database session management and handle 
    SQLAlchemy ChunkedIteratorResult correctly for async operations.
    """
    try:
        response = await call_next(request)
        return response
    except TypeError as e:
        if "ChunkedIteratorResult" in str(e) and "await" in str(e):
            logger.error("SQLAlchemy ChunkedIteratorResult await error. Update route handlers to use .scalars().all() instead of await.")
            return JSONResponse(
                status_code=500,
                content={"detail": "Database query error. Please contact the administrator."},
            )
        logger.exception(f"TypeError in request: {str(e)}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "error_type": "TypeError"},
        )
    except Exception as e:
        logger.exception(f"Request error: {str(e)}")
        import traceback
        stack_trace = traceback.format_exc()
        logger.error(f"Stack trace: {stack_trace}")
        return JSONResponse(
            status_code=500,
            content={"detail": str(e), "stack_trace": stack_trace.split('\n')},
        )

# Include routers with prefixes
app.include_router(auth_router, prefix="/api")
app.include_router(monitoring_router, prefix="/api")
app.include_router(alerts_router, prefix="/api")
app.include_router(users_router, prefix="/api")
app.include_router(processing_router, prefix="/api")
app.include_router(admin_router, prefix="/api")

# Initialize database
@app.on_event("startup")
def startup_db_client():
    # Create all tables if they don't exist
    Base.metadata.create_all(bind=engine)
    logger.info("Database initialized")

@app.on_event("shutdown")
def shutdown_db_client():
    logger.info("Database connection closed")

# Initialize Flask-Migrate with the app
init_app(app)

# Health check route
@app.get("/health")
def health_check():
    """Simple health check endpoint to verify API is running."""
    return {"status": "ok", "timestamp": datetime.now().isoformat()}
