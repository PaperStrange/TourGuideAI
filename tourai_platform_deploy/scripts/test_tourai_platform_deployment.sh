#!/bin/bash
# Automated test script for TourAI Platform deployment (Linux/macOS)
# Tests backend and frontend in tourai_platform_deploy

set -e

BACKEND_DIR="tourai_platform_deploy/backend"
FRONTEND_DIR="tourai_platform_deploy/frontend"

# Helper to check if a port is open
wait_for_port() {
  local port=$1
  local retries=20
  local wait=2
  for i in $(seq 1 $retries); do
    if nc -z localhost $port; then
      return 0
    fi
    sleep $wait
  done
  return 1
}

# Start backend
cd "$BACKEND_DIR"
echo "[Backend] Installing dependencies..."
npm install
if [ ! -f .env ] && [ -f .env.example ]; then
  cp .env.example .env
  echo "[Backend] Copied .env.example to .env. Please edit .env if secrets are needed."
fi
echo "[Backend] Starting backend server..."
npm start &
BACKEND_PID=$!
cd - > /dev/null

# Wait for backend
echo "[Backend] Waiting for backend to be available on port 3001..."
if wait_for_port 3001; then
  echo "[Backend] Backend is running on port 3001."
else
  echo "[Backend] ERROR: Backend did not start on port 3001."
  kill $BACKEND_PID
  exit 1
fi

# Start frontend
cd "$FRONTEND_DIR"
echo "[Frontend] Installing dependencies..."
npm install
if [ ! -f .env ]; then
  echo "REACT_APP_API_URL=http://localhost:3001" > .env
  echo "[Frontend] Created .env with REACT_APP_API_URL."
fi
echo "[Frontend] Starting frontend..."
npm start &
FRONTEND_PID=$!
cd - > /dev/null

# Wait for frontend
echo "[Frontend] Waiting for frontend to be available on port 3000..."
if wait_for_port 3000; then
  echo "[Frontend] Frontend is running on port 3000."
else
  echo "[Frontend] ERROR: Frontend did not start on port 3000."
  kill $BACKEND_PID $FRONTEND_PID
  exit 1
fi

echo "[SUCCESS] Both backend and frontend are running. Test at http://localhost:3000 and http://localhost:3001."

echo "Press Ctrl+C to stop both servers."
trap "kill $BACKEND_PID $FRONTEND_PID" EXIT
wait 