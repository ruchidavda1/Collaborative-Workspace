#!/bin/bash

# Health check script for monitoring

API_URL="${API_URL:-http://localhost:3000}"
MAX_RETRIES=3
RETRY_DELAY=2

echo "[INFO] Running health checks..."

# Function to check service health
check_service() {
    local service_name=$1
    local check_command=$2
    
    echo -n "Checking $service_name... "
    
    if eval $check_command > /dev/null 2>&1; then
        echo "[OK]"
        return 0
    else
        echo "[FAILED]"
        return 1
    fi
}

# Check API Server
for i in $(seq 1 $MAX_RETRIES); do
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" $API_URL/health)
    if [ "$HTTP_CODE" = "200" ]; then
        echo "[SUCCESS] API Server is healthy"
        break
    elif [ $i -eq $MAX_RETRIES ]; then
        echo "[ERROR] API Server is unhealthy (HTTP $HTTP_CODE)"
        exit 1
    else
        echo "[RETRY] API Server check failed, retrying... ($i/$MAX_RETRIES)"
        sleep $RETRY_DELAY
    fi
done

# Check PostgreSQL
check_service "PostgreSQL" "docker-compose exec -T postgres pg_isready -U workspace_user" || exit 1

# Check MongoDB
check_service "MongoDB" "docker-compose exec -T mongodb mongosh --eval 'db.adminCommand(\"ping\")'" || exit 1

# Check Redis
check_service "Redis" "docker-compose exec -T redis redis-cli ping" || exit 1

# Check API Response Time
RESPONSE_TIME=$(curl -s -o /dev/null -w "%{time_total}" $API_URL/health)
echo "[INFO] API Response Time: ${RESPONSE_TIME}s"

# Check if response time is acceptable (< 1 second)
if (( $(echo "$RESPONSE_TIME < 1.0" | bc -l) )); then
    echo "[SUCCESS] Response time is acceptable"
else
    echo "[WARNING] Response time is slow"
fi

echo ""
echo "[SUCCESS] All health checks passed!"
exit 0
