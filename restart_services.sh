#!/bin/bash

# Stop any existing running processes
echo "Stopping existing processes..."
pkill -f "python main.py" || true
pkill -f "python run_fixed.py" || true
pkill -f "npm start" || true

# Wait for processes to terminate
sleep 2

# Start the backend server
echo "Starting AirAlert backend server..."
cd /home/swayam/projects/AirAlert
python main.py &
BACKEND_PID=$!
echo "Backend server started with PID $BACKEND_PID"

# Wait for backend to start
echo "Waiting for backend to initialize..."
sleep 5

# Start the frontend server 
echo "Starting AirAlert frontend server..."
cd /home/swayam/projects/AirAlert/frontend
npm start &
FRONTEND_PID=$!
echo "Frontend server started with PID $FRONTEND_PID"

echo ""
echo "Services restarted!"
echo "Backend: http://127.0.0.1:8000"
echo "Frontend: http://127.0.0.1:8001 or http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop both servers"

# Wait for Ctrl+C
trap "kill $BACKEND_PID $FRONTEND_PID; exit" SIGINT
wait
