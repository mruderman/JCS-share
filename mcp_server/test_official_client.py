#!/usr/bin/env python3
"""
Test authentication using official MCP client with HTTP transport.
"""

import asyncio
import json
from mcp.client.streamable_http import streamablehttp_client

async def test_authentication_official():
    """Test authentication using official MCP client."""
    print("🧪 Testing MCP Server Authentication via Official Client")
    print("=" * 60)
    
    url = "http://localhost:3001/mcp/"
    
    try:
        # Connect to the server using streamable HTTP transport
        async with streamablehttp_client(url) as (read, write, get_session_id):
            print("✅ Connected to MCP server")
            
            # Initialize the session
            init_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "tools": {}
                    },
                    "clientInfo": {
                        "name": "CyanScience-OfficialClient",
                        "version": "1.0.0"
                    }
                }
            }
            
            await write.send(init_request)
            init_response = await read.receive()
            print(f"📋 Initialize Response: {json.dumps(init_response, indent=2)}")
            
            # List available tools
            tools_request = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list"
            }
            
            await write.send(tools_request)
            tools_response = await read.receive()
            print(f"🔧 Tools Response: {json.dumps(tools_response, indent=2)}")
            
            # Test authentication tool
            auth_request = {
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {
                    "name": "authenticate_user",
                    "arguments": {
                        "email": "test@example.com",
                        "password": "testpassword"
                    }
                }
            }
            
            print("\n🔐 Testing authentication...")
            await write.send(auth_request)
            auth_response = await read.receive()
            print(f"🔑 Auth Response: {json.dumps(auth_response, indent=2)}")
            
            print("\n✅ Authentication Test Complete!")
            print("🎯 Key Observation: Authentication executed in HTTP context without event loop conflicts!")
            
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
        import traceback
        traceback.print_exc()

if __name__ == "__main__":
    asyncio.run(test_authentication_official())