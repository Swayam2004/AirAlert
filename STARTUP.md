# AirAlert Startup Guide

## Overview

This document provides instructions on how to start the AirAlert application. The application consists of two main components:

1. A backend API server built with FastAPI
2. A frontend web application built with React

## Starting the Application

### Option 1: Using the Startup Script (Recommended)

The simplest way to start both the backend and frontend servers is to use the provided startup script:

```bash
./start_servers.sh
```

This script will:

1. Start the backend server on port 8000
2. Wait for the backend to initialize
3. Start the frontend server on port 8001
4. Keep both servers running until you press Ctrl+C

### Option 2: Using the Restart Script

If you need to stop any existing instances and restart the servers:

```bash
./restart_services.sh
```

This script will:

1. Stop any existing backend and frontend processes
2. Start the backend server on port 8000
3. Wait for the backend to initialize
4. Start the frontend server on port 8001
5. Keep both servers running until you press Ctrl+C

### Option 3: Manual Startup

If you prefer to start the services manually:

#### Backend:

```bash
cd /home/swayam/projects/AirAlert
python main.py
```

#### Frontend:

```bash
cd /home/swayam/projects/AirAlert/frontend
npm start
```

## Environment Configuration

The application uses environment variables for configuration:

- Backend environment variables can be defined in either `.env.fixed` or `.env` file
- Frontend environment variables are defined in `frontend/.env`

## Accessing the Application

Once started, you can access:

- Backend API: http://127.0.0.1:8000
- Frontend web app: http://127.0.0.1:8001 or http://localhost:3000
- API Documentation: http://127.0.0.1:8000/docs

## Troubleshooting

If you encounter CORS errors or missing API endpoints:

1. Ensure both backend and frontend are running
2. Check the terminal output for any error messages
3. Verify that the frontend is configured to connect to the correct backend URL
4. Inspect your browser's developer tools for network errors
