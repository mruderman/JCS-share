"""
Authentication manager for MCP server.
Handles session management and token validation.
"""

import os
import time
from typing import Optional, Dict, Any, List
import json
from pydantic import BaseModel
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from utils.convex_client import ConvexClient, get_convex_client


class UserSession(BaseModel):
    """User session data."""
    user_id: str
    email: str
    name: str
    roles: List[str]
    auth_token: str
    expires_at: float
    

class AuthManager:
    """Manages authentication sessions for MCP tools."""
    
    def __init__(self):
        self.sessions: Dict[str, UserSession] = {}
        self.convex_client: Optional[ConvexClient] = None
        
    async def get_client(self) -> ConvexClient:
        """Get or create Convex client."""
        if self.convex_client is None:
            self.convex_client = get_convex_client()
        return self.convex_client
    
    def _generate_session_key(self, email: str, auth_token: str) -> str:
        """Generate session key."""
        return f"{email}:{auth_token[:16]}"
    
    async def authenticate_user(self, email: str, password: str) -> Optional[UserSession]:
        """Authenticate user and create session."""
        client = await self.get_client()
        
        # Authenticate with Convex
        response = await client.authenticate_user(email, password)
        if not response.success:
            return None
            
        auth_data = response.data
        if not auth_data or "tokens" not in auth_data or "token" not in auth_data["tokens"]:
            return None
            
        auth_token = auth_data["tokens"]["token"]
        
        # Get user details
        user_response = await client.get_current_user(auth_token)
        if not user_response.success:
            return None
            
        user_data = user_response.data
        if not user_data:
            return None
            
        # Create session
        session = UserSession(
            user_id=user_data.get("_id", ""),
            email=user_data.get("email", email),
            name=user_data.get("name", ""),
            roles=user_data.get("userData", {}).get("roles", ["author"]),
            auth_token=auth_token,
            expires_at=time.time() + 24 * 3600  # 24 hours
        )
        
        session_key = self._generate_session_key(email, auth_token)
        self.sessions[session_key] = session
        
        return session
    
    async def get_session_by_token(self, auth_token: str) -> Optional[UserSession]:
        """Get session by auth token."""
        for session in self.sessions.values():
            if session.auth_token == auth_token:
                # Check if session is still valid
                if session.expires_at > time.time():
                    return session
                else:
                    # Remove expired session
                    self._remove_session(session)
                    break
        return None
    
    async def get_session_by_email(self, email: str) -> Optional[UserSession]:
        """Get active session by email."""
        for session in self.sessions.values():
            if session.email == email and session.expires_at > time.time():
                return session
        return None
    
    def _remove_session(self, session: UserSession):
        """Remove session."""
        session_key = self._generate_session_key(session.email, session.auth_token)
        if session_key in self.sessions:
            del self.sessions[session_key]
    
    async def logout_user(self, auth_token: str) -> bool:
        """Logout user and remove session."""
        session = await self.get_session_by_token(auth_token)
        if session:
            self._remove_session(session)
            return True
        return False
    
    async def validate_token(self, auth_token: str) -> Optional[UserSession]:
        """Validate auth token and return session."""
        session = await self.get_session_by_token(auth_token)
        if session:
            # Optionally refresh token with Convex
            client = await self.get_client()
            user_response = await client.get_current_user(auth_token)
            if user_response.success:
                return session
            else:
                # Token invalid, remove session
                self._remove_session(session)
        return None
    
    def check_permission(self, session: UserSession, required_role: str) -> bool:
        """Check if user has required role."""
        if required_role == "any":
            return True
        return required_role in session.roles
    
    def check_permissions(self, session: UserSession, required_roles: List[str]) -> bool:
        """Check if user has any of the required roles."""
        if "any" in required_roles:
            return True
        return any(role in session.roles for role in required_roles)
    
    async def refresh_session(self, auth_token: str) -> Optional[UserSession]:
        """Refresh session data from Convex."""
        session = await self.get_session_by_token(auth_token)
        if not session:
            return None
            
        client = await self.get_client()
        user_response = await client.get_current_user(auth_token)
        if not user_response.success:
            self._remove_session(session)
            return None
            
        user_data = user_response.data
        if not user_data:
            self._remove_session(session)
            return None
            
        # Update session with fresh data
        session.name = user_data.get("name", session.name)
        session.roles = user_data.get("userData", {}).get("roles", session.roles)
        session.expires_at = time.time() + 24 * 3600  # Extend expiry
        
        return session
    
    def cleanup_expired_sessions(self):
        """Remove expired sessions."""
        current_time = time.time()
        expired_keys = [
            key for key, session in self.sessions.items()
            if session.expires_at <= current_time
        ]
        for key in expired_keys:
            del self.sessions[key]
    
    def get_session_count(self) -> int:
        """Get number of active sessions."""
        self.cleanup_expired_sessions()
        return len(self.sessions)


# Global auth manager instance
_auth_manager: Optional[AuthManager] = None


def get_auth_manager() -> AuthManager:
    """Get or create global auth manager instance."""
    global _auth_manager
    if _auth_manager is None:
        _auth_manager = AuthManager()
    return _auth_manager


# Decorator for tools that require authentication
def require_auth(required_roles: List[str] = None):
    """Decorator to require authentication for MCP tools."""
    if required_roles is None:
        required_roles = ["any"]
        
    def decorator(func):
        async def wrapper(*args, **kwargs):
            # Extract auth_token from kwargs
            auth_token = kwargs.get("auth_token")
            if not auth_token:
                raise ValueError("Authentication required: auth_token parameter missing")
            
            # Validate token
            auth_manager = get_auth_manager()
            session = await auth_manager.validate_token(auth_token)
            if not session:
                raise ValueError("Authentication failed: invalid or expired token")
                
            # Check permissions
            if not auth_manager.check_permissions(session, required_roles):
                raise ValueError(f"Insufficient permissions: requires one of {required_roles}")
            
            # Add session to kwargs
            kwargs["session"] = session
            
            # Call original function
            return await func(*args, **kwargs)
            
        return wrapper
    return decorator


# Specific role decorators
def require_author(func):
    """Require author role."""
    return require_auth(["author", "editor", "reviewer"])(func)


def require_reviewer(func):
    """Require reviewer role."""
    return require_auth(["reviewer", "editor"])(func)


def require_editor(func):
    """Require editor role."""
    return require_auth(["editor"])(func)


def require_admin(func):
    """Require admin role (super admin)."""
    return require_auth(["admin"])(func)