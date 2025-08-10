import asyncio
from functools import wraps
from typing import Any, Callable, TypeVar

T = TypeVar('T')

def sync_to_async(func: Callable[..., T]) -> Callable[..., T]:
    """
    Decorator to safely convert synchronous functions to async.
    Uses asyncio.to_thread() to avoid blocking the event loop.
    """
    @wraps(func)
    async def wrapper(*args, **kwargs) -> T:
        # Use asyncio.to_thread for Python 3.9+
        return await asyncio.to_thread(func, *args, **kwargs)
    return wrapper

class AsyncConvexClient:
    def __init__(self, client):
        self.client = client
    
    @sync_to_async
    def query(self, function_name: str, arguments: dict = None):
        return self.client.query(function_name, arguments or {})
    
    @sync_to_async
    def mutation(self, function_name: str, arguments: dict = None):
        return self.client.mutation(function_name, arguments or {})
    
    @sync_to_async
    def action(self, function_name: str, arguments: dict = None):
        """
        Call a Convex action function asynchronously.
        """
        return self.client.action(function_name, arguments or {})
    
    @sync_to_async
    def set_auth(self, token: str):
        return self.client.set_auth(token)