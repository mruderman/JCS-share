#!/usr/bin/env python3
"""
Connect Cyan Science Journal MCP Server to Self-Hosted Letta Server

This script connects the Cyan Science Journal MCP server to the self-hosted Letta
server using Streamable HTTP transport. It configures the MCP server connection
and validates the integration.

Usage:
    python connect_to_letta.py
    python connect_to_letta.py --test-connection
    python connect_to_letta.py --list-servers
"""

import os
import sys
import asyncio
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv(Path(__file__).parent.parent / "mcp_server" / ".env")

try:
    from letta import Letta
    from letta.types import StreamableHTTPServerConfig
except ImportError:
    print("❌ Letta client not installed. Install with: pip install letta")
    sys.exit(1)


class LettaConnector:
    """Manages connection between Cyan Science Journal MCP server and Letta."""
    
    def __init__(self):
        """Initialize Letta connector with configuration from environment."""
        self.letta_server_url = os.getenv("LETTA_SERVER_URL", "https://cyansociety.a.pinggy.link/")
        self.letta_password = os.getenv("LETTA_PASSWORD")
        self.mcp_server_name = os.getenv("LETTA_MCP_SERVER_NAME", "cyan-science-journal")
        self.mcp_auth_token = os.getenv("LETTA_MCP_AUTH_TOKEN")
        self.mcp_server_host = os.getenv("MCP_SERVER_HOST", "127.0.0.1")
        self.mcp_server_port = int(os.getenv("MCP_SERVER_PORT", "3001"))
        self.mcp_server_path = os.getenv("MCP_SERVER_PATH", "/mcp")
        
        # Use Tailscale IP for cross-machine connections
        tailscale_ip = os.getenv("TAILSCALE_IP")
        if tailscale_ip and self.mcp_server_host == "0.0.0.0":
            connection_host = tailscale_ip
        else:
            connection_host = self.mcp_server_host
        
        # Construct MCP server URL
        self.mcp_server_url = f"http://{connection_host}:{self.mcp_server_port}{self.mcp_server_path}"
        
        # Validate configuration
        if not self.letta_password:
            raise ValueError("LETTA_PASSWORD not set in environment")
        if not self.mcp_auth_token:
            raise ValueError("LETTA_MCP_AUTH_TOKEN not set in environment")
            
        print(f"🔧 Letta Server: {self.letta_server_url}")
        print(f"🔧 MCP Server: {self.mcp_server_url}")
        print(f"🔧 MCP Server Name: {self.mcp_server_name}")
    
    async def connect_to_letta(self):
        """Connect to the self-hosted Letta server."""
        try:
            print("🔗 Connecting to self-hosted Letta server...")
            
            # Initialize Letta client
            # Note: For self-hosted servers, authentication may vary
            # This assumes password-based authentication
            client = Letta(
                base_url=self.letta_server_url,
                token=self.letta_password  # Using password as token for self-hosted
            )
            
            print("✅ Connected to Letta server successfully")
            return client
            
        except Exception as e:
            print(f"❌ Failed to connect to Letta server: {e}")
            raise
    
    async def configure_mcp_server(self, client):
        """Configure the MCP server connection in Letta."""
        try:
            print("🔧 Configuring MCP server connection...")
            
            # Create Streamable HTTP server configuration
            streamable_config = StreamableHTTPServerConfig(
                server_name=self.mcp_server_name,
                server_url=self.mcp_server_url,
                auth_token=self.mcp_auth_token,
                custom_headers={
                    "Content-Type": "application/json",
                    "Accept": "application/json, text/event-stream"
                }
            )
            
            print(f"📝 Adding MCP server '{self.mcp_server_name}' to Letta...")
            
            # Add MCP server to Letta
            result = await client.tools.add_mcp_server(request=streamable_config)
            
            print("✅ MCP server configured successfully in Letta")
            return result
            
        except Exception as e:
            print(f"❌ Failed to configure MCP server: {e}")
            raise
    
    async def list_mcp_servers(self, client):
        """List all configured MCP servers in Letta."""
        try:
            print("📋 Listing configured MCP servers...")
            servers = await client.tools.list_mcp_servers()
            
            if not servers:
                print("📭 No MCP servers configured")
                return []
            
            for server in servers:
                print(f"  🔧 {server.get('name', 'Unknown')}: {server.get('url', 'Unknown URL')}")
            
            return servers
            
        except Exception as e:
            print(f"❌ Failed to list MCP servers: {e}")
            raise
    
    async def list_mcp_tools(self, client):
        """List available tools from the MCP server."""
        try:
            print(f"🔍 Listing tools from MCP server '{self.mcp_server_name}'...")
            tools = await client.tools.list_mcp_tools_by_server(mcp_server_name=self.mcp_server_name)
            
            if not tools:
                print("📭 No tools available from MCP server")
                return []
            
            print(f"🔧 Found {len(tools)} tools:")
            
            # Group tools by category
            categories = {}
            for tool in tools:
                name = tool.get('name', 'unknown')
                if '_' in name:
                    category = name.split('_')[0]
                else:
                    category = 'general'
                
                if category not in categories:
                    categories[category] = []
                categories[category].append(name)
            
            for category, tool_names in categories.items():
                print(f"  📂 {category.title()}: {len(tool_names)} tools")
                for tool_name in tool_names[:3]:  # Show first 3 tools
                    print(f"    🔧 {tool_name}")
                if len(tool_names) > 3:
                    print(f"    ... and {len(tool_names) - 3} more")
            
            return tools
            
        except Exception as e:
            print(f"❌ Failed to list MCP tools: {e}")
            raise
    
    async def test_connection(self, client):
        """Test the connection between Letta and the MCP server."""
        try:
            print("🧪 Testing MCP server connection...")
            
            # Test MCP server connection
            test_result = await client.tools.test_mcp_server(mcp_server_name=self.mcp_server_name)
            
            if test_result.get('success', False):
                print("✅ MCP server connection test successful")
            else:
                print(f"❌ MCP server connection test failed: {test_result.get('error', 'Unknown error')}")
            
            return test_result
            
        except Exception as e:
            print(f"❌ Connection test failed: {e}")
            raise
    
    async def setup_complete_integration(self):
        """Complete setup: connect to Letta, configure MCP server, and validate."""
        try:
            print("🚀 Starting complete Letta-MCP integration setup...")
            
            # Step 1: Connect to Letta
            client = await self.connect_to_letta()
            
            # Step 2: Configure MCP server
            await self.configure_mcp_server(client)
            
            # Step 3: List configured servers
            await self.list_mcp_servers(client)
            
            # Step 4: List available tools
            await self.list_mcp_tools(client)
            
            # Step 5: Test connection
            await self.test_connection(client)
            
            print("🎉 Letta-MCP integration setup completed successfully!")
            print(f"🔗 Your Cyan Science Journal MCP server is now connected to Letta")
            print(f"🚀 You can now create agents that use the 47 available journal tools")
            
            return client
            
        except Exception as e:
            print(f"❌ Integration setup failed: {e}")
            raise


async def main():
    """Main entry point for the Letta connector."""
    parser = argparse.ArgumentParser(description="Connect Cyan Science Journal MCP Server to Letta")
    parser.add_argument("--test-connection", action="store_true", help="Test existing MCP connection")
    parser.add_argument("--list-servers", action="store_true", help="List configured MCP servers")
    parser.add_argument("--list-tools", action="store_true", help="List available MCP tools")
    
    args = parser.parse_args()
    
    try:
        connector = LettaConnector()
        
        if args.test_connection:
            client = await connector.connect_to_letta()
            await connector.test_connection(client)
        elif args.list_servers:
            client = await connector.connect_to_letta()
            await connector.list_mcp_servers(client)
        elif args.list_tools:
            client = await connector.connect_to_letta()
            await connector.list_mcp_tools(client)
        else:
            # Full setup
            await connector.setup_complete_integration()
            
    except KeyboardInterrupt:
        print("\n⚠️  Setup interrupted by user")
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())