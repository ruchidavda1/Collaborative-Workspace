#!/bin/bash

# Startup script for local development

echo "[INFO] Starting Collaborative Workspace Backend..."

# Check if .env exists
if [ ! -f .env ]; then
    echo "[WARNING] .env file not found. Creating from .env.example..."
    cp .env.example .env
    echo "[SUCCESS] .env created. Please update with your configuration."
fi

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "[INFO] Installing dependencies..."
    npm install
fi

echo ""
echo "[INFO] Checking database services..."

# Check if using Docker or Homebrew
USE_DOCKER=false
if timeout 3 docker info > /dev/null 2>&1; then
    echo "[INFO] Docker detected. Attempting to start Docker services..."
    if timeout 10 docker-compose up -d postgres mongodb redis 2>/dev/null; then
        USE_DOCKER=true
        echo "[SUCCESS] Docker services started"
        sleep 5
    else
        echo "[WARNING] Docker not available. Checking Homebrew services..."
    fi
fi

# If not using Docker, check Homebrew services
if [ "$USE_DOCKER" = false ]; then
    echo "[INFO] Using Homebrew services for databases"
    echo ""
    
    # Check PostgreSQL
    if brew services list | grep -q "postgresql.*started"; then
        echo "[SUCCESS] PostgreSQL is running (Homebrew)"
    else
        echo "[INFO] Starting PostgreSQL..."
        brew services start postgresql@14 2>/dev/null || brew services start postgresql 2>/dev/null
        sleep 2
    fi
    
    # Check MongoDB
    if brew services list | grep -q "mongodb-community.*started"; then
        echo "[SUCCESS] MongoDB is running (Homebrew)"
    else
        echo "[INFO] Starting MongoDB..."
        brew services start mongodb-community 2>/dev/null || brew services start mongodb-community@6 2>/dev/null
        sleep 2
    fi
    
    # Check Redis
    if brew services list | grep -q "redis.*started"; then
        echo "[SUCCESS] Redis is running (Homebrew)"
    else
        echo "[INFO] Starting Redis..."
        brew services start redis
        sleep 2
    fi
fi

# Wait for databases to be ready
echo ""
echo "[INFO] Waiting for databases to initialize..."
sleep 3

# Verify connections
echo "[INFO] Verifying database connections..."

# PostgreSQL check
if [ "$USE_DOCKER" = true ]; then
    docker-compose exec -T postgres pg_isready -U workspace_user > /dev/null 2>&1
else
    pg_isready -h localhost -p 5432 > /dev/null 2>&1
fi

if [ $? -eq 0 ]; then
    echo "[SUCCESS] PostgreSQL is ready"
else
    echo "[WARNING] PostgreSQL connection check failed (may still work)"
fi

# MongoDB check
if [ "$USE_DOCKER" = true ]; then
    docker-compose exec -T mongodb mongosh --eval "db.adminCommand('ping')" > /dev/null 2>&1
else
    mongosh --eval "db.adminCommand('ping')" --quiet > /dev/null 2>&1
fi

if [ $? -eq 0 ]; then
    echo "[SUCCESS] MongoDB is ready"
else
    echo "[WARNING] MongoDB connection check failed (may still work)"
fi

# Redis check
if [ "$USE_DOCKER" = true ]; then
    docker-compose exec -T redis redis-cli ping > /dev/null 2>&1
else
    redis-cli ping > /dev/null 2>&1
fi

if [ $? -eq 0 ]; then
    echo "[SUCCESS] Redis is ready"
else
    echo "[WARNING] Redis connection check failed (may still work)"
fi

echo ""
echo "================================================"
echo "[SUCCESS] Development environment is ready!"
echo "================================================"
echo ""
echo "Available URLs:"
echo "  - API Server: http://localhost:3000"
echo "  - API Documentation: http://localhost:3000/api-docs"
echo "  - Demo Page: http://localhost:3000/demo.html"
echo "  - Health Check: http://localhost:3000/health"
echo ""
echo "Next steps:"
echo "  1. Start the API server:"
echo "     npm run dev"
echo ""
echo "  2. Start the worker (in another terminal):"
echo "     npm run worker"
echo ""
echo "  3. Open the demo page:"
echo "     open http://localhost:3000/demo.html"
echo ""
