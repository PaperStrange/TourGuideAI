#!/bin/bash

echo "TourGuideAI Deployment Script"
echo "============================"
echo ""

# Stop any running servers
echo "Stopping any running servers..."
pkill -f "node server.js" || true
echo ""

# Build the frontend
echo "Building frontend..."
npm run build
echo ""

# Start the server in production mode
echo "Starting server in production mode..."
cd server
NODE_ENV=production npm start 