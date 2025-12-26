#!/bin/bash

# Project Setup Verification Script

echo "[INFO] Verifying Collaborative Workspace Backend Setup..."
echo ""

ERRORS=0
WARNINGS=0

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check function
check() {
    local name=$1
    local command=$2
    local required=$3
    
    echo -n "Checking $name... "
    
    if eval $command > /dev/null 2>&1; then
        echo -e "${GREEN}[OK]${NC}"
        return 0
    else
        if [ "$required" = "true" ]; then
            echo -e "${RED}[FAILED] (Required)${NC}"
            ERRORS=$((ERRORS + 1))
        else
            echo -e "${YELLOW}[WARNING] (Optional)${NC}"
            WARNINGS=$((WARNINGS + 1))
        fi
        return 1
    fi
}

echo "=== Prerequisites ==="
check "Node.js v18+" "node --version | grep -E 'v1[8-9]|v[2-9][0-9]'" true
check "npm" "npm --version" true
check "Docker" "docker --version" true
check "Docker Compose" "docker-compose --version" true
check "Git" "git --version" false

echo ""
echo "=== Project Files ==="
check "package.json" "test -f package.json" true
check "tsconfig.json" "test -f tsconfig.json" true
check "Docker Compose config" "test -f docker-compose.yml" true
check "Dockerfile" "test -f Dockerfile" true
check "README.md" "test -f README.md" true
check ".env.example" "test -f .env.example" true

echo ""
echo "=== Source Code ==="
check "src directory" "test -d src" true
check "Controllers" "test -d src/controllers" true
check "Services" "test -d src/services" true
check "Routes" "test -d src/routes" true
check "Database entities" "test -d src/database/entities" true
check "Tests" "test -d src/tests" true
check "Workers" "test -d src/workers" true

echo ""
echo "=== Configuration Files ==="
check "ESLint config" "test -f .eslintrc.json" true
check "Jest config" "test -f jest.config.js" true
check "Prettier config" "test -f .prettierrc.json" true
check "CI/CD workflow" "test -f .github/workflows/ci-cd.yml" true

echo ""
echo "=== Documentation ==="
check "README" "test -f README.md" true
check "Documentation" "test -f DOCUMENTATION.md" true

echo ""
echo "=== Dependencies ==="
if [ -d "node_modules" ]; then
    echo -e "Node modules: ${GREEN}[INSTALLED]${NC}"
else
    echo -e "Node modules: ${YELLOW}[NOT INSTALLED] (run: npm install)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "=== Environment Setup ==="
if [ -f ".env" ]; then
    echo -e ".env file: ${GREEN}[PRESENT]${NC}"
else
    echo -e ".env file: ${YELLOW}[NOT FOUND] (copy from .env.example)${NC}"
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "=== Code Quality Checks ==="
if [ -d "node_modules" ]; then
    check "TypeScript compilation" "npx tsc --noEmit" false
    check "ESLint rules" "npx eslint --print-config src/server.ts" false
fi

echo ""
echo "=== Docker Services ==="

# Check Docker with timeout to prevent hanging
if timeout 5 docker info > /dev/null 2>&1; then
    echo -e "Docker daemon: ${GREEN}[RUNNING]${NC}"
    
    # Check if services are running
    if timeout 5 docker-compose ps 2>/dev/null | grep -q "Up"; then
        echo -e "Docker services: ${GREEN}[RUNNING]${NC}"
        docker-compose ps 2>/dev/null
    else
        echo -e "Docker services: ${YELLOW}[NOT RUNNING] (Optional - using Homebrew databases)${NC}"
        WARNINGS=$((WARNINGS + 1))
    fi
else
    echo -e "Docker daemon: ${YELLOW}[NOT RUNNING] (Optional - using Homebrew databases)${NC}"
    echo -e "Note: Docker is optional for this project. You can use Homebrew services instead."
    WARNINGS=$((WARNINGS + 1))
fi

echo ""
echo "=== Summary ==="
echo "================================================"

if [ $ERRORS -eq 0 ] && [ $WARNINGS -eq 0 ]; then
    echo -e "${GREEN}[SUCCESS] All checks passed!${NC}"
    echo "Your project is ready to run."
    echo ""
    echo "Next steps:"
    echo "  1. cp .env.example .env  # If not done"
    echo "  2. docker-compose up -d  # Start services"
    echo "  3. npm run dev           # Start development server"
elif [ $ERRORS -eq 0 ]; then
    echo -e "${YELLOW}[WARNING] Setup complete with $WARNINGS warning(s)${NC}"
    echo "Your project should work, but some optional items are missing."
else
    echo -e "${RED}[ERROR] Setup incomplete with $ERRORS error(s) and $WARNINGS warning(s)${NC}"
    echo "Please fix the errors above before proceeding."
fi

echo "================================================"
echo ""

exit $ERRORS
