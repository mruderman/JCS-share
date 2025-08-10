"""
Convex client for MCP server integration.
Handles communication with the existing Convex backend.
"""

import os
from typing import Optional, Any
from convex import ConvexClient as ConvexPyClient
from .async_wrapper import AsyncConvexClient

class ConvexResponse:
    """Response model for Convex API calls."""
    def __init__(self, success: bool, data: Optional[Any] = None, error: Optional[str] = None):
        self.success = success
        self.data = data
        self.error = error

class ConvexClient:
    """Client for communicating with Convex backend."""

    def __init__(self, base_url: Optional[str] = None):
        self.base_url = base_url or os.getenv("CONVEX_URL", "http://localhost:3000")
        self.client = ConvexPyClient(self.base_url)
        self.async_client = AsyncConvexClient(self.client)

    async def authenticate_user(self, email: str, password: str) -> ConvexResponse:
        """Authenticate user with email/password via Convex Auth Password provider."""
        try:
            result = await self.async_client.action("auth:signIn", {"provider": "password", "params": {"email": email, "password": password, "flow": "signIn"}})
            return ConvexResponse(success=True, data=result)
        except Exception as e:
            return ConvexResponse(success=False, error=str(e))

    async def get_current_user(self, auth_token: str) -> ConvexResponse:
        """Get current authenticated user data."""
        try:
            await self.async_client.set_auth(auth_token)
            result = await self.async_client.query("auth:loggedInUser")
            return ConvexResponse(success=True, data=result)
        except Exception as e:
            return ConvexResponse(success=False, error=str(e))

    async def create_user_account(self, email: str, password: str) -> ConvexResponse:
        """Create a new user account using Convex Auth Password provider."""
        try:
            result = await self.async_client.action("auth:signIn", {"provider": "password", "params": {"email": email, "password": password, "flow": "signUp"}})
            return ConvexResponse(success=True, data=result)
        except Exception as e:
            return ConvexResponse(success=False, error=str(e))

# Global client instance
_convex_client: Optional[ConvexClient] = None

def get_convex_client() -> ConvexClient:
    """Get or create global Convex client instance."""
    global _convex_client
    if _convex_client is None:
        _convex_client = ConvexClient()
    return _convex_client

async def cleanup_convex_client():
    """Clean up global Convex client instance."""
    global _convex_client
    if _convex_client is not None:
        # Perform any necessary cleanup
        _convex_client = None