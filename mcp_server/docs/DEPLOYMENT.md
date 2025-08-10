# MCP Server Deployment Guide

## Overview

This guide covers deploying the Cyan Science Journal MCP Server in various environments, from development to production.

## Prerequisites

### System Requirements
- Python 3.8 or higher
- 2GB RAM minimum (4GB recommended)
- 1GB disk space
- Network access to Convex backend

### Dependencies
- FastMCP framework
- httpx for HTTP requests
- pydantic for data validation
- python-dotenv for environment management

## Environment Setup

### Development Environment

1. **Clone the repository:**
   ```bash
   git clone <repository-url>
   cd cyan_science_backend/mcp_server
   ```

2. **Create virtual environment:**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install dependencies:**
   ```bash
   pip install -r requirements.txt
   ```

4. **Configure environment variables:**
   ```bash
   cp .env.example .env
   # Edit .env with your configuration
   ```

5. **Start development server:**
   ```bash
   python main.py
   ```

### Production Environment

#### Option 1: Direct Python Deployment

1. **Prepare production server:**
   ```bash
   sudo apt update
   sudo apt install python3 python3-pip python3-venv
   ```

2. **Create application user:**
   ```bash
   sudo useradd -m -s /bin/bash mcpserver
   sudo -u mcpserver -i
   ```

3. **Deploy application:**
   ```bash
   cd /home/mcpserver
   git clone <repository-url> app
   cd app/mcp_server
   python3 -m venv venv
   source venv/bin/activate
   pip install -r requirements.txt
   ```

4. **Configure environment:**
   ```bash
   cp .env.example .env
   # Edit production configuration
   nano .env
   ```

5. **Create systemd service:**
   ```bash
   sudo nano /etc/systemd/system/mcp-server.service
   ```

   Service file content:
   ```ini
   [Unit]
   Description=Cyan Science Journal MCP Server
   After=network.target

   [Service]
   Type=simple
   User=mcpserver
   WorkingDirectory=/home/mcpserver/app/mcp_server
   Environment=PATH=/home/mcpserver/app/mcp_server/venv/bin
   ExecStart=/home/mcpserver/app/mcp_server/venv/bin/python main.py
   Restart=always
   RestartSec=10

   [Install]
   WantedBy=multi-user.target
   ```

6. **Enable and start service:**
   ```bash
   sudo systemctl daemon-reload
   sudo systemctl enable mcp-server
   sudo systemctl start mcp-server
   ```

#### Option 2: Docker Deployment

1. **Create Dockerfile:**
   ```dockerfile
   FROM python:3.8-slim

   WORKDIR /app

   # Install system dependencies
   RUN apt-get update && apt-get install -y \
       gcc \
       && rm -rf /var/lib/apt/lists/*

   # Copy requirements and install Python dependencies
   COPY requirements.txt .
   RUN pip install --no-cache-dir -r requirements.txt

   # Copy application code
   COPY . .

   # Create non-root user
   RUN useradd -m -u 1000 mcpserver && chown -R mcpserver:mcpserver /app
   USER mcpserver

   # Expose port
   EXPOSE 8080

   # Start application
   CMD ["python", "main.py"]
   ```

2. **Create docker-compose.yml:**
   ```yaml
   version: '3.8'

   services:
     mcp-server:
       build: .
       ports:
         - "8080:8080"
       environment:
         - CONVEX_URL=${CONVEX_URL}
         - MCP_SERVER_PORT=8080
         - DEBUG=false
       restart: unless-stopped
       volumes:
         - ./logs:/app/logs
       healthcheck:
         test: ["CMD", "curl", "-f", "http://localhost:8080/health"]
         interval: 30s
         timeout: 10s
         retries: 3
   ```

3. **Deploy with Docker Compose:**
   ```bash
   docker-compose up -d
   ```

#### Option 3: Kubernetes Deployment

1. **Create namespace:**
   ```yaml
   apiVersion: v1
   kind: Namespace
   metadata:
     name: cyan-journal
   ```

2. **Create ConfigMap:**
   ```yaml
   apiVersion: v1
   kind: ConfigMap
   metadata:
     name: mcp-server-config
     namespace: cyan-journal
   data:
     CONVEX_URL: "https://your-convex-backend.convex.cloud"
     MCP_SERVER_PORT: "8080"
     DEBUG: "false"
   ```

3. **Create Secret:**
   ```yaml
   apiVersion: v1
   kind: Secret
   metadata:
     name: mcp-server-secrets
     namespace: cyan-journal
   type: Opaque
   data:
     MCP_API_TOKEN: <base64-encoded-token>
   ```

4. **Create Deployment:**
   ```yaml
   apiVersion: apps/v1
   kind: Deployment
   metadata:
     name: mcp-server
     namespace: cyan-journal
   spec:
     replicas: 3
     selector:
       matchLabels:
         app: mcp-server
     template:
       metadata:
         labels:
           app: mcp-server
       spec:
         containers:
         - name: mcp-server
           image: cyan-journal/mcp-server:latest
           ports:
           - containerPort: 8080
           envFrom:
           - configMapRef:
               name: mcp-server-config
           - secretRef:
               name: mcp-server-secrets
           livenessProbe:
             httpGet:
               path: /health
               port: 8080
             initialDelaySeconds: 30
             periodSeconds: 10
           readinessProbe:
             httpGet:
               path: /health
               port: 8080
             initialDelaySeconds: 5
             periodSeconds: 5
   ```

5. **Create Service:**
   ```yaml
   apiVersion: v1
   kind: Service
   metadata:
     name: mcp-server-service
     namespace: cyan-journal
   spec:
     selector:
       app: mcp-server
     ports:
     - protocol: TCP
       port: 80
       targetPort: 8080
     type: ClusterIP
   ```

## Configuration

### Environment Variables

#### Required Variables
- `CONVEX_URL`: URL of the Convex backend
- `MCP_SERVER_PORT`: Port to run the server on (default: 8080)

#### Optional Variables
- `DEBUG`: Enable debug mode (default: false)
- `LOG_LEVEL`: Logging level (debug, info, warning, error)
- `MAX_FILE_SIZE`: Maximum file upload size in bytes
- `SESSION_TIMEOUT`: Session timeout in seconds
- `RATE_LIMIT_ENABLED`: Enable rate limiting (default: true)

#### Example .env file
```bash
# Backend Configuration
CONVEX_URL=https://your-convex-backend.convex.cloud

# Server Configuration
MCP_SERVER_PORT=8080
DEBUG=false
LOG_LEVEL=info

# Security Configuration
SESSION_TIMEOUT=86400
MAX_FILE_SIZE=52428800

# Feature Flags
RATE_LIMIT_ENABLED=true
```

### Reverse Proxy Configuration

#### Nginx Configuration
```nginx
server {
    listen 80;
    server_name mcp.cyansciencejournal.org;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

#### Apache Configuration
```apache
<VirtualHost *:80>
    ServerName mcp.cyansciencejournal.org
    
    ProxyPass / http://localhost:8080/
    ProxyPassReverse / http://localhost:8080/
    
    ProxyPreserveHost On
    ProxyAddHeaders On
</VirtualHost>
```

## SSL/TLS Configuration

### Let's Encrypt with Certbot
```bash
# Install certbot
sudo apt install certbot python3-certbot-nginx

# Obtain certificate
sudo certbot --nginx -d mcp.cyansciencejournal.org

# Auto-renewal
sudo crontab -e
# Add: 0 12 * * * /usr/bin/certbot renew --quiet
```

### Manual SSL Configuration
```nginx
server {
    listen 443 ssl http2;
    server_name mcp.cyansciencejournal.org;

    ssl_certificate /path/to/certificate.crt;
    ssl_certificate_key /path/to/private.key;
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-RSA-AES256-GCM-SHA512:DHE-RSA-AES256-GCM-SHA512;

    location / {
        proxy_pass http://localhost:8080;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Monitoring and Logging

### Application Logs
The server logs to stdout by default. In production, configure log rotation:

```bash
# Create log directory
sudo mkdir -p /var/log/mcp-server
sudo chown mcpserver:mcpserver /var/log/mcp-server

# Configure logrotate
sudo nano /etc/logrotate.d/mcp-server
```

Logrotate configuration:
```
/var/log/mcp-server/*.log {
    daily
    rotate 30
    compress
    delaycompress
    missingok
    notifempty
    create 644 mcpserver mcpserver
    postrotate
        systemctl reload mcp-server
    endscript
}
```

### Health Monitoring
The server provides a health check endpoint at `/health`:

```bash
# Check server health
curl http://localhost:8080/health

# Response
{
  "status": "healthy",
  "timestamp": "2024-01-01T00:00:00Z",
  "service": "cyan-science-journal"
}
```

### Process Monitoring with Supervisor
```ini
[program:mcp-server]
command=/home/mcpserver/app/mcp_server/venv/bin/python main.py
directory=/home/mcpserver/app/mcp_server
user=mcpserver
autostart=true
autorestart=true
redirect_stderr=true
stdout_logfile=/var/log/mcp-server/stdout.log
stdout_logfile_maxbytes=50MB
stdout_logfile_backups=10
```

## Performance Optimization

### Python Optimizations
1. **Use production WSGI server:**
   ```bash
   pip install gunicorn
   gunicorn -w 4 -b 0.0.0.0:8080 main:app
   ```

2. **Enable connection pooling:**
   ```python
   # In convex_client.py
   self.client = httpx.AsyncClient(
       timeout=30.0,
       limits=httpx.Limits(max_connections=100, max_keepalive_connections=20)
   )
   ```

### System Optimizations
1. **Increase file descriptor limits:**
   ```bash
   # In /etc/security/limits.conf
   mcpserver soft nofile 65535
   mcpserver hard nofile 65535
   ```

2. **Optimize TCP settings:**
   ```bash
   # In /etc/sysctl.conf
   net.core.somaxconn = 65535
   net.ipv4.tcp_max_syn_backlog = 65535
   ```

## Security Considerations

### Firewall Configuration
```bash
# Allow only necessary ports
sudo ufw default deny incoming
sudo ufw default allow outgoing
sudo ufw allow ssh
sudo ufw allow 80
sudo ufw allow 443
sudo ufw enable
```

### Application Security
1. **Run as non-root user**
2. **Use environment variables for secrets**
3. **Enable HTTPS in production**
4. **Implement rate limiting**
5. **Validate all inputs**
6. **Regular security updates**

## Backup and Recovery

### Database Backup
The MCP server doesn't store data directly, but ensure the Convex backend is properly backed up.

### Application Backup
```bash
# Backup application files
tar -czf mcp-server-backup-$(date +%Y%m%d).tar.gz /home/mcpserver/app

# Backup configuration
cp /home/mcpserver/app/mcp_server/.env /backup/env-$(date +%Y%m%d)
```

### Recovery Procedure
1. Restore application files
2. Restore configuration
3. Install dependencies
4. Start services
5. Verify functionality

## Troubleshooting

### Common Issues

#### Service Won't Start
```bash
# Check service status
sudo systemctl status mcp-server

# Check logs
sudo journalctl -u mcp-server -f

# Check file permissions
ls -la /home/mcpserver/app/mcp_server/
```

#### Connection Issues
```bash
# Test backend connectivity
curl -f $CONVEX_URL/health

# Check network configuration
netstat -tulpn | grep :8080

# Verify DNS resolution
nslookup your-convex-backend.convex.cloud
```

#### Performance Issues
```bash
# Monitor system resources
top
htop
iostat -x 1

# Check application metrics
curl http://localhost:8080/health

# Monitor logs for errors
tail -f /var/log/mcp-server/stdout.log
```

## Scaling Considerations

### Horizontal Scaling
- Deploy multiple instances behind a load balancer
- Use session-based authentication (stateless)
- Configure shared storage for logs

### Vertical Scaling
- Increase CPU and memory allocation
- Optimize connection pools
- Monitor resource usage

### Load Balancing
```nginx
upstream mcp_servers {
    server 127.0.0.1:8080;
    server 127.0.0.1:8081;
    server 127.0.0.1:8082;
}

server {
    listen 80;
    location / {
        proxy_pass http://mcp_servers;
    }
}
```

## Maintenance

### Regular Tasks
1. **Update dependencies:** `pip install -r requirements.txt --upgrade`
2. **Rotate logs:** Check logrotate configuration
3. **Monitor disk space:** Ensure adequate storage
4. **Review security:** Update dependencies, check for vulnerabilities
5. **Backup configuration:** Regular configuration backups

### Update Procedure
1. Create backup
2. Deploy new version to staging
3. Test functionality
4. Deploy to production
5. Monitor for issues
6. Rollback if necessary

This deployment guide provides comprehensive instructions for deploying the MCP server in various environments with proper security, monitoring, and maintenance considerations.