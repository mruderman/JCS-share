# Phase 1 Startup and Verification Scripts

## Environment Validation Script

Create the following file as `validate_env.sh`:

```bash
#!/bin/bash
# Phase 1 Environment Validation Script
# Usage: ./validate_env.sh

set -e

echo "=== Cyan Science Journal MCP Server - Phase 1 Validation ==="
echo "Validating environment configuration and security setup..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Function to check environment variable
check_env_var() {
    local var_name=$1
    local var_value=${!var_name}
    
    if [[ -z "$var_value" ]]; then
        echo -e "${RED}❌ Missing required environment variable: $var_name${NC}"
        return 1
    else
        echo -e "${GREEN}✅ $var_name is set${NC}"
        return 0
    fi
}

# Function to check port availability
check_port() {
    local port=$1
    if lsof -i :$port >/dev/null 2>&1; then
        echo -e "${RED}❌ Port $port is already in use${NC}"
        return 1
    else
        echo -e "${GREEN}✅ Port $port is available${NC}"
        return 0
    fi
}

# Function to test URL accessibility
test_url() {
    local url=$1
    local description=$2
    
    if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ $description is accessible${NC}"
        return 0
    else
        echo -e "${RED}❌ $description is not accessible${NC}"
        return 1
    fi
}

# Check required environment variables
echo "🔍 Checking environment variables..."
echo ""

required_vars=(
    "CONVEX_URL"
    "MCP_SERVER_HOST"
    "MCP_SERVER_PORT"
    "JWT_SECRET"
    "MCP_API_TOKEN"
    "SESSION_TIMEOUT"
    "RATE_LIMIT_REQUESTS"
    "CORS_ORIGINS"
)

env_errors=0
for var in "${required_vars[@]}"; do
    if ! check_env_var "$var"; then
        env_errors=$((env_errors + 1))
    fi
done

# Validate JWT secret length
if [[ ${#JWT_SECRET} -lt 32 ]]; then
    echo -e "${RED}❌ JWT_SECRET should be at least 32 characters${NC}"
    env_errors=$((env_errors + 1))
else
    echo -e "${GREEN}✅ JWT_SECRET length is adequate${NC}"
fi

# Validate API token
if [[ ${#MCP_API_TOKEN} -lt 32 ]]; then
    echo -e "${RED}❌ MCP_API_TOKEN should be at least 32 characters${NC}"
    env_errors=$((env_errors + 1))
else
    echo -e "${GREEN}✅ MCP_API_TOKEN length is adequate${NC}"
fi

# Check port availability
echo ""
echo "🔍 Checking port availability..."
echo ""
if ! check_port "$MCP_SERVER_PORT"; then
    env_errors=$((env_errors + 1))
fi

# Validate numeric configurations
echo ""
echo "🔍 Validating configuration values..."
echo ""
if [[ $SESSION_TIMEOUT -lt 3600 ]]; then
    echo -e "${YELLOW}⚠️  SESSION_TIMEOUT is very short (< 1 hour)${NC}"
fi

if [[ $RATE_LIMIT_REQUESTS -lt 10 ]]; then
    echo -e "${YELLOW}⚠️  RATE_LIMIT_REQUESTS is very low${NC}"
fi

# Check Convex URL format
if [[ "$CONVEX_URL" =~ ^https://.*\.convex\.cloud$ ]]; then
    echo -e "${GREEN}✅ CONVEX_URL format looks correct${NC}"
else
    echo -e "${YELLOW}⚠️  CONVEX_URL format may need review${NC}"
fi

# Test Convex connectivity
echo ""
echo "🔍 Testing Convex connectivity..."
echo ""
if ! test_url "$CONVEX_URL" "Convex backend"; then
    echo -e "${YELLOW}⚠️  Note: Convex URL may need valid authentication${NC}"
fi

# Summary
echo ""
echo "=== Validation Summary ==="
if [[ $env_errors -eq 0 ]]; then
    echo -e "${GREEN}✅ All environment checks passed!${NC}"
    echo "Environment is ready for Phase 1 deployment."
    exit 0
else
    echo -e "${RED}❌ Found $env_errors environment issues${NC}"
    echo "Please fix the issues above before proceeding."
    exit 1
fi
```

## Server Health Check Script

Create the following file as `health_check.sh`:

```bash
#!/bin/bash
# MCP Server Health Check Script
# Usage: ./health_check.sh

set -e

echo "=== MCP Server Health Check ==="
echo "Testing server startup and basic functionality..."
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Load environment variables
source .env 2>/dev/null || true

# Default values
MCP_SERVER_HOST=${MCP_SERVER_HOST:-127.0.0.1}
MCP_SERVER_PORT=${MCP_SERVER_PORT:-3001}
MCP_SERVER_PATH=${MCP_SERVER_PATH:-/mcp}

# Server URL
SERVER_URL="http://${MCP_SERVER_HOST}:${MCP_SERVER_PORT}${MCP_SERVER_PATH}"

# Function to test server
test_server() {
    local url=$1
    
    echo "🔍 Testing server at: $url"
    
    # Test 1: Basic HTTP response
    if curl -s --max-time 5 "$url" >/dev/null 2>&1; then
        echo -e "${GREEN}✅ Server is responding${NC}"
    else
        echo -e "${RED}❌ Server is not responding${NC}"
        return 1
    fi
    
    # Test 2: Tools list
    echo "🔍 Testing tools list..."
    if curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}' \
        2>/dev/null | grep -q "tools"; then
        echo -e "${GREEN}✅ Tools endpoint is working${NC}"
    else
        echo -e "${RED}❌ Tools endpoint failed${NC}"
        return 1
    fi
    
    # Test 3: Resources list
    echo "🔍 Testing resources list..."
    if curl -s -X POST "$url" \
        -H "Content-Type: application/json" \
        -H "Accept: application/json, text/event-stream" \
        -d '{"jsonrpc": "2.0", "id": 1, "method": "resources/list"}' \
        2>/dev/null | grep -q "resources"; then
        echo -e "${GREEN}✅ Resources endpoint is working${NC}"
    else
        echo -e "${RED}❌ Resources endpoint failed${NC}"
        return 1
    fi
    
    return 0
}

# Test running server
if test_server "$SERVER_URL"; then
    echo ""
    echo -e "${GREEN}🎉 All health checks passed!${NC}"
    echo "MCP server is running correctly."
else
    echo ""
    echo -e "${YELLOW}⚠️  Server may not be running or not responding correctly${NC}"
    echo ""
    echo "To start the server:"
    echo "  python3 main.py"
    exit 1
fi
```

## Production Startup Script

Create the following file as `start_server.sh`:

```bash
#!/bin/bash
# Production MCP Server Startup Script
# Usage: ./start_server.sh [environment]

set -e

# Default to development environment
ENV=${1:-development}

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}=== Cyan Science Journal MCP Server ===${NC}"
echo -e "${BLUE}Starting server in $ENV mode...${NC}"
echo ""

# Check if .env exists
if [[ ! -f .env ]]; then
    echo -e "${RED}❌ .env file not found${NC}"
    echo "Please copy .env.example to .env and configure it"
    exit 1
fi

# Load environment variables
source .env

# Validate environment
echo "🔍 Validating environment..."
if ! ./validate_env.sh >/dev/null 2>&1; then
    echo -e "${RED}❌ Environment validation failed${NC}"
    ./validate_env.sh
    exit 1
fi

# Check for Python environment
if [[ -d .venv ]]; then
    echo "🔍 Activating virtual environment..."
    source .venv/bin/activate
fi

# Check Python version
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo -e "${GREEN}✅ Python version: $python_version${NC}"

# Install dependencies if needed
if [[ ! -f .requirements_installed ]]; then
    echo "🔍 Installing dependencies..."
    pip install -r requirements.txt
    touch .requirements_installed
fi

# Set log file
LOG_FILE="mcp_server_${ENV}_$(date +%Y%m%d_%H%M%S).log"

# Start server
echo -e "${GREEN}🚀 Starting MCP server...${NC}"
echo "Server URL: http://${MCP_SERVER_HOST}:${MCP_SERVER_PORT}${MCP_SERVER_PATH}"
echo "Log file: $LOG_FILE"
echo ""

# Trap to handle cleanup on exit
trap 'echo -e "\n${YELLOW}⚠️  Server stopped${NC}"' EXIT

# Start the server
python3 main.py 2>&1 | tee "$LOG_FILE"
```

## Usage Instructions

### 1. Make scripts executable:
```bash
chmod +x validate_env.sh
chmod +x health_check.sh
chmod +x start_server.sh
```

### 2. Run validation:
```bash
./validate_env.sh
```

### 3. Start server:
```bash
# Development
./start_server.sh development

# Production
./start_server.sh production
```

### 4. Health check:
```bash
# After server is running
./health_check.sh
```

## Quick Start Summary

For immediate Phase 1 completion:

```bash
# 1. Validate environment
./validate_env.sh

# 2. Start server
python3 main.py

# 3. In another terminal, test
curl -X POST http://localhost:3001/mcp/ \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/list"}'
```

## Phase 1 Completion Status

**Current Status**: ✅ **READY FOR FINAL VERIFICATION**

The environment configuration and security setup is complete. The final step is to run the verification scripts to confirm everything is working properly.