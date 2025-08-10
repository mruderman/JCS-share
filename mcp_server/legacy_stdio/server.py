import sys
import os
# Add local venv site-packages to sys.path
venv_site_packages = os.path.join(
    os.path.dirname(__file__),
    ".venv",
    "lib",
    f"python{sys.version_info.major}.{sys.version_info.minor}",
    "site-packages"
)
if os.path.isdir(venv_site_packages):
    sys.path.insert(0, venv_site_packages)

import asyncio
from mcp.server.lowlevel import Server  # type: ignore
from mcp.server.models import InitializationOptions  # type: ignore
from mcp.server.lowlevel import NotificationOptions  # type: ignore
import mcp.server.stdio  # type: ignore
import mcp.types as types  # type: ignore
import os
from dotenv import load_dotenv
from convex import ConvexClient
from utils.async_wrapper import AsyncConvexClient

# Load environment variables from .env (or system) so CONVEX_URL persists
load_dotenv()  # searches for .env, .env.local, etc.
convex_url = os.getenv("CONVEX_URL", "https://adept-leopard-797.convex.cloud")

# Initialize synchronous Convex client and wrap it for async usage
convex_client = ConvexClient(convex_url)
async_convex_client = AsyncConvexClient(convex_client)

# Create MCP server
server = Server("cyan-science-journal")

@server.list_tools()
async def handle_list_tools() -> list[types.Tool]:
    return [
        types.Tool(
            name="authenticate_user",
            description="Authenticate a user with email and password",
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {"type": "string"},
                    "password": {"type": "string"}
                },
                "required": ["email", "password"]
            }
        ),
        types.Tool(
            name="create_user",
            description="Create a new user",
            inputSchema={
                "type": "object",
                "properties": {
                    "email": {"type": "string"},
                    "password": {"type": "string"}
                },
                "required": ["email", "password"]
            }
        )
    ]

@server.call_tool()
async def handle_call_tool(name: str, arguments: dict) -> list[types.TextContent]:
    if name == "authenticate_user":
        # Run synchronous Convex operations in a thread
        result = await asyncio.to_thread(
            authenticate_user_sync,
            arguments["email"],
            arguments["password"]
        )
        
        return [types.TextContent(
            type="text",
            text=str(result)
        )]
    elif name == "create_user":
        # Run synchronous Convex operations in a thread
        result = await asyncio.to_thread(
            create_user_sync,
            arguments["email"],
            arguments["password"]
        )
        
        return [types.TextContent(
            type="text",
            text=str(result)
        )]
    
    raise ValueError(f"Unknown tool: {name}")

def authenticate_user_sync(email: str, password: str) -> dict:
    """Synchronous authentication function"""
    try:
        # Replicating the exact logic from the successful test script
        local_client = ConvexClient(convex_url)
        result = local_client.action("auth:signIn", {
            "provider": "password",
            "params": {
                "email": email,
                "password": password,
                "flow": "signIn"
            }
        })
        
        if result and "tokens" in result and "token" in result["tokens"]:
            local_client.set_auth(result["tokens"]["token"])
            user_info = local_client.query("auth:loggedInUser")
            return {"success": True, "user": user_info}
        else:
            return {"success": False, "error": "Authentication failed, no token in result."}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

def create_user_sync(email: str, password: str) -> dict:
    """Synchronous user creation function"""
    try:
        # Replicating the exact logic from the successful test script
        local_client = ConvexClient(convex_url)
        result = local_client.action("auth:signIn", {
            "provider": "password",
            "params": {
                "email": email,
                "password": password,
                "flow": "signUp"
            }
        })
        return {"success": True, "result": result}
            
    except Exception as e:
        return {"success": False, "error": str(e)}

async def main():
    async with mcp.server.stdio.stdio_server() as (read_stream, write_stream):
        await server.run(
            read_stream,
            write_stream,
            InitializationOptions(
                server_name="cyan-science-journal",
                server_version="1.0.0",
                capabilities=server.get_capabilities(
                    notification_options=NotificationOptions(),
                    experimental_capabilities={},
                ),
            ),
        )

if __name__ == "__main__":
    asyncio.run(main())