"""
Security configuration for MCP server.
Handles CORS, rate limiting, and other security settings.
"""

import os
from typing import List, Dict, Any
from functools import wraps
import time
from collections import defaultdict, deque

class SecurityConfig:
    """Security configuration settings."""
    
    def __init__(self):
        self.cors_origins = self._parse_list(os.getenv("CORS_ORIGINS", ""))
        self.cors_methods = self._parse_list(os.getenv("CORS_METHODS", "GET,POST,OPTIONS"))
        self.cors_headers = self._parse_list(os.getenv("CORS_HEADERS", "Content-Type,Accept"))
        self.rate_limit_requests = int(os.getenv("RATE_LIMIT_REQUESTS", "100"))
        self.rate_limit_window = int(os.getenv("RATE_LIMIT_WINDOW", "60000")) / 1000  # Convert to seconds
        self.max_file_size = int(os.getenv("MAX_FILE_SIZE", "10485760"))
        self.allowed_file_types = self._parse_list(os.getenv("ALLOWED_FILE_TYPES", "application/pdf"))
    
    def _parse_list(self, value: str) -> List[str]:
        """Parse comma-separated string into list."""
        if not value:
            return []
        return [item.strip() for item in value.split(",") if item.strip()]
    
    def get_cors_headers(self) -> Dict[str, str]:
        """Get CORS headers for HTTP responses."""
        if not self.cors_origins:
            return {}
        
        return {
            "Access-Control-Allow-Origin": ",".join(self.cors_origins),
            "Access-Control-Allow-Methods": ",".join(self.cors_methods),
            "Access-Control-Allow-Headers": ",".join(self.cors_headers),
            "Access-Control-Max-Age": "86400"  # 24 hours
        }

class RateLimiter:
    """Simple in-memory rate limiter."""
    
    def __init__(self, max_requests: int = 100, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests = defaultdict(deque)
    
    def is_allowed(self, client_id: str) -> bool:
        """Check if request is allowed for client."""
        now = time.time()
        client_requests = self.requests[client_id]
        
        # Remove old requests outside the window
        while client_requests and client_requests[0] < now - self.window_seconds:
            client_requests.popleft()
        
        # Check if limit exceeded
        if len(client_requests) >= self.max_requests:
            return False
        
        # Record this request
        client_requests.append(now)
        return True
    
    def get_reset_time(self, client_id: str) -> int:
        """Get timestamp when rate limit resets for client."""
        client_requests = self.requests[client_id]
        if not client_requests:
            return int(time.time())
        
        return int(client_requests[0] + self.window_seconds)

# Global instances
security_config = SecurityConfig()
rate_limiter = RateLimiter(
    max_requests=security_config.rate_limit_requests,
    window_seconds=int(security_config.rate_limit_window)
)

def require_rate_limit(client_id_func=None):
    """Decorator to apply rate limiting to functions."""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # Extract client ID (could be IP, auth token, etc.)
            client_id = "default"
            if client_id_func:
                try:
                    client_id = client_id_func(*args, **kwargs)
                except:
                    pass
            
            if not rate_limiter.is_allowed(client_id):
                reset_time = rate_limiter.get_reset_time(client_id)
                raise Exception(f"Rate limit exceeded. Reset at: {reset_time}")
            
            return await func(*args, **kwargs)
        return wrapper
    return decorator

def validate_file_upload(file_data: str, file_name: str, content_type: str) -> None:
    """Validate file upload security."""
    # Check file size (base64 encoded, so actual size is ~75% of string length)
    estimated_size = len(file_data) * 0.75
    if estimated_size > security_config.max_file_size:
        raise ValueError(f"File too large. Max size: {security_config.max_file_size} bytes")
    
    # Check file type
    if content_type not in security_config.allowed_file_types:
        raise ValueError(f"File type not allowed. Allowed types: {security_config.allowed_file_types}")
    
    # Basic file name validation
    if not file_name or ".." in file_name or "/" in file_name or "\\" in file_name:
        raise ValueError("Invalid file name")

def sanitize_input(value: str, max_length: int = 1000) -> str:
    """Sanitize string input."""
    if not isinstance(value, str):
        raise ValueError("Input must be a string")
    
    if len(value) > max_length:
        raise ValueError(f"Input too long. Max length: {max_length}")
    
    # Remove null bytes and control characters
    sanitized = "".join(char for char in value if ord(char) >= 32 or char in "\n\r\t")
    
    return sanitized.strip()

def validate_auth_token(token: str) -> None:
    """Validate authentication token format."""
    if not token or not isinstance(token, str):
        raise ValueError("Invalid token format")
    
    if len(token) < 10 or len(token) > 500:
        raise ValueError("Token length invalid")
    
    # Basic format validation (should be base64-like)
    allowed_chars = set("abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789+/=-_.")
    if not all(c in allowed_chars for c in token):
        raise ValueError("Token contains invalid characters")

def get_client_identifier(request_headers: Dict[str, str]) -> str:
    """Extract client identifier for rate limiting."""
    # In a real implementation, you might use:
    # - IP address from X-Forwarded-For or X-Real-IP headers
    # - User agent fingerprint
    # - API key or authentication token
    
    # For now, use a simple approach
    user_agent = request_headers.get("User-Agent", "unknown")
    x_forwarded_for = request_headers.get("X-Forwarded-For", "")
    
    if x_forwarded_for:
        return f"ip_{x_forwarded_for.split(',')[0].strip()}"
    
    return f"ua_{hash(user_agent) % 10000}"