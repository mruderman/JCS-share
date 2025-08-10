# MCP Server Troubleshooting Guide

## Overview

This guide helps diagnose and resolve common issues with the Cyan Science Journal MCP Server.

## Quick Diagnostics

### Health Check
```bash
# Check if server is running
curl http://localhost:8080/health

# Expected response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "cyan-science-journal"
}
```

### Service Status
```bash
# Check systemd service
sudo systemctl status mcp-server

# Check process
ps aux | grep main.py

# Check port binding
netstat -tulpn | grep :8080
```

### Log Analysis
```bash
# View recent logs
sudo journalctl -u mcp-server -n 50

# Follow logs in real-time
sudo journalctl -u mcp-server -f

# Check application logs
tail -f /var/log/mcp-server/stdout.log
```

## Common Issues and Solutions

### 1. Server Won't Start

#### Symptoms
- Service fails to start
- Port binding errors
- Permission denied errors

#### Diagnosis
```bash
# Check service status
sudo systemctl status mcp-server

# Check logs for errors
sudo journalctl -u mcp-server -n 20

# Verify configuration
python main.py --check-config
```

#### Solutions

**Permission Issues:**
```bash
# Fix file permissions
sudo chown -R mcpserver:mcpserver /home/mcpserver/app
sudo chmod +x /home/mcpserver/app/mcp_server/main.py
```

**Port Already in Use:**
```bash
# Find process using port 8080
sudo lsof -i :8080

# Kill process if necessary
sudo kill -9 <PID>

# Or change port in configuration
export MCP_SERVER_PORT=8081
```

**Missing Dependencies:**
```bash
# Reinstall dependencies
source venv/bin/activate
pip install -r requirements.txt --force-reinstall
```

**Configuration Errors:**
```bash
# Validate configuration
python -c "
import os
from dotenv import load_dotenv
load_dotenv()
print('CONVEX_URL:', os.getenv('CONVEX_URL'))
print('MCP_SERVER_PORT:', os.getenv('MCP_SERVER_PORT'))
"
```

### 2. Authentication Failures

#### Symptoms
- "Authentication required" errors
- "Invalid or expired token" messages
- Users unable to login

#### Diagnosis
```bash
# Test authentication endpoint
curl -X POST http://localhost:8080/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"testpass"}'

# Check Convex backend connectivity
curl $CONVEX_URL/health

# Verify user exists in database
curl $CONVEX_URL/api/users?email=test@example.com
```

#### Solutions

**Backend Connectivity:**
```bash
# Test backend connection
ping your-backend.convex.cloud
curl -v $CONVEX_URL/health

# Check DNS resolution
nslookup your-backend.convex.cloud

# Verify SSL certificates
openssl s_client -connect your-backend.convex.cloud:443
```

**Session Management:**
```bash
# Clear session cache
rm -rf /tmp/mcp_sessions/*

# Restart server to clear memory sessions
sudo systemctl restart mcp-server
```

**Token Issues:**
```python
# Debug token validation
import base64
import json

# Decode JWT token (for debugging only)
token = "your.jwt.token"
header, payload, signature = token.split('.')
decoded_payload = base64.b64decode(payload + '==')
print(json.dumps(json.loads(decoded_payload), indent=2))
```

### 3. Connection Timeouts

#### Symptoms
- Tools timing out
- Slow response times
- Connection refused errors

#### Diagnosis
```bash
# Test response times
time curl http://localhost:8080/health

# Check backend response time
time curl $CONVEX_URL/health

# Monitor network connections
netstat -an | grep 8080

# Check system load
top
iostat -x 1 5
```

#### Solutions

**Increase Timeouts:**
```python
# In convex_client.py
self.client = httpx.AsyncClient(timeout=60.0)  # Increase from 30.0
```

**Connection Pooling:**
```python
# Optimize HTTP client
self.client = httpx.AsyncClient(
    timeout=30.0,
    limits=httpx.Limits(
        max_connections=100,
        max_keepalive_connections=20
    )
)
```

**Backend Performance:**
```bash
# Check backend status
curl $CONVEX_URL/api/health

# Monitor backend logs
# (Check your Convex dashboard)
```

### 4. File Upload Issues

#### Symptoms
- File upload failures
- "File too large" errors
- Corrupt file uploads

#### Diagnosis
```bash
# Check file size limits
grep MAX_FILE_SIZE .env

# Test upload endpoint
curl -X POST http://localhost:8080/api/upload \
  -H "Authorization: Bearer $TOKEN" \
  -F "file=@test.pdf"

# Check disk space
df -h
```

#### Solutions

**File Size Limits:**
```bash
# Increase file size limit
echo "MAX_FILE_SIZE=104857600" >> .env  # 100MB

# Restart server
sudo systemctl restart mcp-server
```

**Disk Space:**
```bash
# Free up space
sudo apt autoremove
sudo apt autoclean

# Clean log files
sudo logrotate -f /etc/logrotate.d/mcp-server
```

**Upload Validation:**
```python
# Add file validation
def validate_file(file_data, content_type):
    if not content_type.startswith('application/pdf'):
        raise ValueError("Only PDF files allowed")
    
    # Decode and validate file
    import base64
    file_bytes = base64.b64decode(file_data)
    if len(file_bytes) > MAX_FILE_SIZE:
        raise ValueError("File too large")
```

### 5. Permission Errors

#### Symptoms
- "Insufficient permissions" errors
- Role-based access failures
- Authorization denied messages

#### Diagnosis
```bash
# Check user roles
curl -H "Authorization: Bearer $TOKEN" \
  http://localhost:8080/api/user/info

# Test permission checking
python -c "
from utils.auth_manager import get_auth_manager
import asyncio

async def test():
    auth = get_auth_manager()
    session = await auth.get_session_by_token('$TOKEN')
    if session:
        print('Roles:', session.roles)
        print('Has editor:', auth.check_permission(session, 'editor'))
    else:
        print('Invalid session')

asyncio.run(test())
"
```

#### Solutions

**Role Assignment:**
```bash
# Verify user roles in database
# Update user roles through admin interface
curl -X PATCH $CONVEX_URL/api/users/$USER_ID/roles \
  -H "Authorization: Bearer $ADMIN_TOKEN" \
  -d '{"roles": ["author", "reviewer", "editor"]}'
```

**Permission Decorators:**
```python
# Check decorator usage
@require_editor  # Correct
async def editor_tool(auth_token: str = None, session: UserSession = None):
    pass

# vs incorrect usage
@require_auth(["editor"])  # Also correct but more verbose
async def editor_tool(auth_token: str = None, session: UserSession = None):
    pass
```

### 6. Database Connection Issues

#### Symptoms
- Database query failures
- Data not found errors
- Inconsistent data

#### Diagnosis
```bash
# Test database connectivity through backend
curl $CONVEX_URL/api/manuscripts

# Check backend logs for database errors
# (Check Convex dashboard)

# Verify data consistency
curl -H "Authorization: Bearer $TOKEN" \
  $CONVEX_URL/api/user/manuscripts
```

#### Solutions

**Backend Health:**
```bash
# Check Convex backend status
curl $CONVEX_URL/health

# Verify database migrations
# (Check Convex dashboard for schema changes)
```

**Data Consistency:**
```bash
# Clear caches
redis-cli FLUSHALL  # If using Redis

# Restart backend services
# (Redeploy Convex functions if needed)
```

### 7. Memory Issues

#### Symptoms
- Out of memory errors
- Slow performance
- Server crashes

#### Diagnosis
```bash
# Check memory usage
free -h
ps aux --sort=-%mem | head -10

# Monitor memory over time
top -p $(pgrep -f main.py)

# Check for memory leaks
valgrind --tool=memcheck python main.py
```

#### Solutions

**Increase Memory:**
```bash
# Add swap space
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile
```

**Memory Optimization:**
```python
# Implement connection pooling
import asyncio
import weakref

class ConnectionPool:
    def __init__(self, max_size=10):
        self.connections = weakref.WeakSet()
        self.max_size = max_size
```

**Garbage Collection:**
```python
# Force garbage collection
import gc
gc.collect()

# Monitor garbage collection
gc.set_debug(gc.DEBUG_STATS)
```

## Performance Issues

### Slow Response Times

#### Diagnosis
```bash
# Profile API endpoints
time curl -w "@curl-format.txt" http://localhost:8080/api/manuscripts

# curl-format.txt content:
# time_namelookup: %{time_namelookup}\n
# time_connect: %{time_connect}\n
# time_appconnect: %{time_appconnect}\n
# time_pretransfer: %{time_pretransfer}\n
# time_redirect: %{time_redirect}\n
# time_starttransfer: %{time_starttransfer}\n
# time_total: %{time_total}\n

# Monitor system resources
iostat -x 1
sar -u 1
```

#### Solutions

**Async Optimization:**
```python
# Use async/await properly
async def batch_requests():
    tasks = [
        fetch_manuscripts(),
        fetch_reviews(),
        fetch_users()
    ]
    results = await asyncio.gather(*tasks)
    return results
```

**Caching:**
```python
# Implement simple caching
from functools import lru_cache
import time

@lru_cache(maxsize=100)
def get_cached_data(key, timestamp):
    # Cache for 5 minutes
    if time.time() - timestamp > 300:
        get_cached_data.cache_clear()
    return fetch_data(key)
```

### High CPU Usage

#### Diagnosis
```bash
# Identify CPU-intensive processes
top -p $(pgrep -f main.py)
htop

# Profile Python application
python -m cProfile -o profile.out main.py
python -c "
import pstats
p = pstats.Stats('profile.out')
p.sort_stats('cumulative').print_stats(20)
"
```

#### Solutions

**Code Optimization:**
```python
# Use list comprehensions instead of loops
results = [process(item) for item in items if condition(item)]

# Use sets for membership testing
valid_ids = set(manuscript_ids)
if manuscript_id in valid_ids:  # O(1) instead of O(n)
    pass
```

## Debugging Techniques

### Enable Debug Mode
```bash
# Set debug environment variable
export DEBUG=true

# Or in .env file
echo "DEBUG=true" >> .env

# Restart server
sudo systemctl restart mcp-server
```

### Verbose Logging
```python
# In main.py
import logging

if os.getenv("DEBUG", "false").lower() == "true":
    logging.basicConfig(level=logging.DEBUG)
else:
    logging.basicConfig(level=logging.INFO)

logger = logging.getLogger(__name__)
```

### Request Tracing
```python
# Add request ID for tracing
import uuid

async def add_request_id(request):
    request.state.request_id = str(uuid.uuid4())
    
async def log_request(request):
    logger.info(f"Request {request.state.request_id}: {request.method} {request.url}")
```

## Log Analysis

### Common Error Patterns

**Authentication Errors:**
```bash
grep "Authentication" /var/log/mcp-server/stdout.log
grep "Invalid token" /var/log/mcp-server/stdout.log
```

**Connection Errors:**
```bash
grep "Connection" /var/log/mcp-server/stdout.log
grep "timeout" /var/log/mcp-server/stdout.log
```

**Permission Errors:**
```bash
grep "permission" /var/log/mcp-server/stdout.log
grep "Insufficient" /var/log/mcp-server/stdout.log
```

### Log Monitoring Script
```bash
#!/bin/bash
# monitor-logs.sh

LOG_FILE="/var/log/mcp-server/stdout.log"
ERROR_COUNT=$(tail -100 "$LOG_FILE" | grep -c "ERROR")
WARNING_COUNT=$(tail -100 "$LOG_FILE" | grep -c "WARNING")

if [ "$ERROR_COUNT" -gt 5 ]; then
    echo "High error count: $ERROR_COUNT"
    # Send alert
fi

if [ "$WARNING_COUNT" -gt 20 ]; then
    echo "High warning count: $WARNING_COUNT"
    # Send alert
fi
```

## Recovery Procedures

### Server Recovery
```bash
# Stop server
sudo systemctl stop mcp-server

# Clear temporary files
rm -rf /tmp/mcp_*
rm -rf /var/cache/mcp-server/*

# Check configuration
python main.py --check-config

# Start server
sudo systemctl start mcp-server

# Verify health
curl http://localhost:8080/health
```

### Database Recovery
```bash
# If using local cache/database
rm -rf /var/lib/mcp-server/cache/*

# Restart server to rebuild cache
sudo systemctl restart mcp-server

# Test functionality
python test_basic_operations.py
```

### Configuration Recovery
```bash
# Restore from backup
cp /backup/env-20240101 /home/mcpserver/app/mcp_server/.env

# Verify configuration
python -c "from dotenv import load_dotenv; load_dotenv(); import os; print(os.environ)"

# Restart services
sudo systemctl restart mcp-server
```

## Getting Help

### Support Channels
1. **Documentation**: Check README.md and docs/
2. **Logs**: Analyze server and application logs
3. **GitHub Issues**: Report bugs and feature requests
4. **Email Support**: support@cyansciencejournal.org

### Information to Include
When seeking help, provide:
1. **Server version**: `git rev-parse HEAD`
2. **Environment**: Production/staging/development
3. **Error messages**: Full error text and stack traces
4. **Configuration**: Sanitized environment variables
5. **Steps to reproduce**: Detailed reproduction steps
6. **Expected vs actual behavior**: Clear description

### Emergency Contacts
- **System Administrator**: admin@cyansciencejournal.org
- **Technical Lead**: tech@cyansciencejournal.org
- **Emergency Hotline**: [Emergency contact number]

This troubleshooting guide should help resolve most common issues with the MCP server. For persistent problems, don't hesitate to seek additional support.