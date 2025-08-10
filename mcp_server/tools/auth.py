"""
Authentication tools for MCP server.
Handles user login, session management, and authentication.
"""

from typing import Dict, Any, Optional
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from utils.auth_manager import get_auth_manager, UserSession
from utils.convex_client import get_convex_client


async def authenticate_user(email: str, password: str) -> Dict[str, Any]:
    """
    Authenticate user with email and password.
    
    Args:
        email: User's email address
        password: User's password
        
    Returns:
        Dictionary containing authentication result and user data
        
    Raises:
        ValueError: If authentication fails
    """
    auth_manager = get_auth_manager()
    
    try:
        session = await auth_manager.authenticate_user(email, password)
        if not session:
            raise ValueError("Invalid email or password")
            
        return {
            "success": True,
            "message": "Authentication successful",
            "user": {
                "id": session.user_id,
                "email": session.email,
                "name": session.name,
                "roles": session.roles
            },
            "auth_token": session.auth_token,
            "expires_at": session.expires_at
        }
        
    except Exception as e:
        raise ValueError(f"Authentication failed: {str(e)}")


async def get_current_user(auth_token: str) -> Dict[str, Any]:
    """
    Get current user information.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        Dictionary containing user information
        
    Raises:
        ValueError: If token is invalid
    """
    auth_manager = get_auth_manager()
    
    session = await auth_manager.validate_token(auth_token)
    if not session:
        raise ValueError("Invalid or expired authentication token")
        
    return {
        "id": session.user_id,
        "email": session.email,
        "name": session.name,
        "roles": session.roles,
        "auth_token": session.auth_token,
        "expires_at": session.expires_at
    }


async def logout_user(auth_token: str) -> Dict[str, Any]:
    """
    Logout user and invalidate session.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        Dictionary containing logout result
    """
    auth_manager = get_auth_manager()
    
    success = await auth_manager.logout_user(auth_token)
    
    return {
        "success": success,
        "message": "Logout successful" if success else "Session not found"
    }


async def refresh_session(auth_token: str) -> Dict[str, Any]:
    """
    Refresh user session with updated data from backend.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        Dictionary containing refreshed session data
        
    Raises:
        ValueError: If token is invalid
    """
    auth_manager = get_auth_manager()
    
    session = await auth_manager.refresh_session(auth_token)
    if not session:
        raise ValueError("Invalid or expired authentication token")
        
    return {
        "success": True,
        "message": "Session refreshed successfully",
        "user": {
            "id": session.user_id,
            "email": session.email,
            "name": session.name,
            "roles": session.roles
        },
        "auth_token": session.auth_token,
        "expires_at": session.expires_at
    }


async def check_permissions(auth_token: str, required_roles: list) -> Dict[str, Any]:
    """
    Check if user has required permissions.
    
    Args:
        auth_token: Authentication token
        required_roles: List of required roles
        
    Returns:
        Dictionary containing permission check result
        
    Raises:
        ValueError: If token is invalid
    """
    auth_manager = get_auth_manager()
    
    session = await auth_manager.validate_token(auth_token)
    if not session:
        raise ValueError("Invalid or expired authentication token")
        
    has_permission = auth_manager.check_permissions(session, required_roles)
    
    return {
        "has_permission": has_permission,
        "user_roles": session.roles,
        "required_roles": required_roles,
        "message": "Permission granted" if has_permission else "Insufficient permissions"
    }


async def create_user_account(
    email: str,
    password: str,
    name: str,
    roles: Optional[list] = None
) -> Dict[str, Any]:
    """
    Create new user account.
    
    Args:
        email: User's email address
        password: User's password
        name: User's full name
        roles: List of roles to assign (defaults to ["author"])
        
    Returns:
        Dictionary containing account creation result
        
    Raises:
        ValueError: If account creation fails
    """
    if roles is None:
        roles = ["author"]
        
    convex_client = get_convex_client()
    
    try:
        # Create user via Convex API
        response = await convex_client.create_user_account(email, password)
        
        if not response.success:
            raise ValueError(response.error or "Failed to create account")
            
        return {
            "success": True,
            "message": "Account created successfully",
            "user_id": response.data.get("user_id"),
            "email": email,
            "name": name,
            "roles": roles
        }
        
    except Exception as e:
        raise ValueError(f"Account creation failed: {str(e)}")


async def request_role_elevation(
    auth_token: str,
    requested_role: str,
    reason: str
) -> Dict[str, Any]:
    """
    Request role elevation (e.g., author to reviewer/editor).
    
    Args:
        auth_token: Authentication token
        requested_role: Role being requested
        reason: Reason for role request
        
    Returns:
        Dictionary containing request result
        
    Raises:
        ValueError: If request fails
    """
    auth_manager = get_auth_manager()
    
    session = await auth_manager.validate_token(auth_token)
    if not session:
        raise ValueError("Invalid or expired authentication token")
        
    convex_client = get_convex_client()
    
    try:
        # This function needs to be implemented in the ConvexClient
        # response = await convex_client.request_role_elevation(auth_token, requested_role, reason)
        
        # if not response.success:
        #     raise ValueError(response.error or "Failed to submit role request")
            
        return {
            "success": False,
            "message": "Not implemented"
        }
        
    except Exception as e:
        raise ValueError(f"Role request failed: {str(e)}")


async def get_session_info(auth_token: str) -> Dict[str, Any]:
    """
    Get detailed session information.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        Dictionary containing session information
        
    Raises:
        ValueError: If token is invalid
    """
    auth_manager = get_auth_manager()
    
    session = await auth_manager.validate_token(auth_token)
    if not session:
        raise ValueError("Invalid or expired authentication token")
        
    return {
        "user_id": session.user_id,
        "email": session.email,
        "name": session.name,
        "roles": session.roles,
        "expires_at": session.expires_at,
        "time_remaining": session.expires_at - __import__("time").time(),
        "active_sessions": auth_manager.get_session_count()
    }


async def validate_token(auth_token: str) -> Dict[str, Any]:
    """
    Validate authentication token.
    
    Args:
        auth_token: Authentication token to validate
        
    Returns:
        Dictionary containing validation result
    """
    auth_manager = get_auth_manager()
    
    session = await auth_manager.validate_token(auth_token)
    
    return {
        "valid": session is not None,
        "message": "Token is valid" if session else "Invalid or expired token",
        "user_id": session.user_id if session else None,
        "email": session.email if session else None,
        "roles": session.roles if session else None
    }