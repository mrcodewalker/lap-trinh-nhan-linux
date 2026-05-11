#!/bin/bash

# Linux Dashboard - Startup Script
# Supports both development and production modes

set -e

echo "╔════════════════════════════════════════╗"
echo "║  Linux Dashboard - System Startup      ║"
echo "║  Cyberpunk Linux Programming Center    ║"
echo "╚════════════════════════════════════════╝"
echo ""

# Check if running on Linux
if [[ "$OSTYPE" != "linux-gnu"* ]]; then
    echo "⚠️  Warning: This dashboard is optimized for Linux systems"
    echo "   Some features may not work on $OSTYPE"
fi

# Parse arguments
MODE=${1:-dev}
PORT=${2:-3001}

if [ "$MODE" = "dev" ]; then
    echo "🚀 Starting in DEVELOPMENT mode..."
    echo ""
    
    # Backend
    echo "📦 Installing backend dependencies..."
    cd backend
    npm install
    echo "✅ Backend dependencies installed"
    echo ""
    
    # Frontend
    echo "📦 Installing frontend dependencies..."
    cd ../frontend
    npm install
    echo "✅ Frontend dependencies installed"
    echo ""
    
    echo "🔧 Starting services..."
    echo "   Backend:  http://localhost:$PORT"
    echo "   Frontend: http://localhost:5173"
    echo ""
    
    # Start backend in background
    cd ../backend
    npm run dev &
    BACKEND_PID=$!
    
    # Start frontend
    cd ../frontend
    npm run dev -- --no-open
    
    # Cleanup
    kill $BACKEND_PID 2>/dev/null || true

elif [ "$MODE" = "prod" ]; then
    echo "🚀 Starting in PRODUCTION mode..."
    echo ""
    
    # Check for Docker
    if ! command -v docker &> /dev/null; then
        echo "❌ Docker is required for production mode"
        echo "   Install Docker: https://docs.docker.com/get-docker/"
        exit 1
    fi
    
    echo "🐳 Building Docker images..."
    docker-compose build
    
    echo "🚀 Starting containers..."
    docker-compose up -d
    
    echo "✅ Services started!"
    echo "   Frontend: http://localhost:5173"
    echo "   Backend:  http://localhost:$PORT"
    echo ""
    echo "📋 View logs: docker-compose logs -f"
    echo "🛑 Stop services: docker-compose down"

elif [ "$MODE" = "pm2" ]; then
    echo "🚀 Starting with PM2..."
    echo ""
    
    if ! command -v pm2 &> /dev/null; then
        echo "📦 Installing PM2..."
        npm install -g pm2
    fi
    
    cd backend
    npm install
    pm2 start src/index.js --name "linux-dashboard-api"
    
    cd ../frontend
    npm install
    npm run build
    
    echo "✅ Services started with PM2"
    echo "📋 View status: pm2 status"
    echo "📋 View logs: pm2 logs"

else
    echo "Usage: ./start.sh [dev|prod|pm2] [port]"
    echo ""
    echo "Examples:"
    echo "  ./start.sh dev          # Development mode"
    echo "  ./start.sh prod         # Production with Docker"
    echo "  ./start.sh pm2 3001     # PM2 production"
    exit 1
fi
