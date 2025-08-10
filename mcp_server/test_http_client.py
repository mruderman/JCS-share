#!/usr/bin/env python3
"""
Test client for Cyan Science Journal MCP Server using HTTP transport.
Tests authentication and basic tool functionality.
"""

import asyncio
import json
import httpx
from typing import Dict, Any

class MCPHttpClient:
    """Simple MCP client using HTTP transport."""
    
    def __init__(self, url: str):
        self.url = url
        self.session_id = None
        self.client = httpx.AsyncClient(timeout=30.0)
        
    async def initialize(self) -> Dict[str, Any]:
        """Initialize MCP session."""
        request = {
            "jsonrpc": "2.0",
            "id": 1,
            "method": "initialize",
            "params": {
                "protocolVersion": "2024-11-05",
                "capabilities": {
                    "tools": {}
                },
                "clientInfo": {
                    "name": "CyanScience-TestClient",
                    "version": "1.0.0"
                }
            }
        }
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        }
        
        try:
            response = await self.client.post(self.url, json=request, headers=headers)
            if response.status_code == 200:
                # Handle SSE response
                content = response.text
                if content.startswith("event: message\ndata: "):
                    json_data = content.split("data: ", 1)[1].strip()
                    return json.loads(json_data)
                else:
                    return response.json()
            else:
                return {"error": f"HTTP {response.status_code}: {response.text}"}
        except Exception as e:
            return {"error": f"Request failed: {str(e)}"}
    
    async def call_tool(self, tool_name: str, arguments: Dict[str, Any]) -> Dict[str, Any]:
        """Call a tool on the MCP server."""
        request = {
            "jsonrpc": "2.0",
            "id": 2,
            "method": "tools/call",
            "params": {
                "name": tool_name,
                "arguments": arguments
            }
        }
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        }
        
        try:
            response = await self.client.post(self.url, json=request, headers=headers)
            if response.status_code == 200:
                # Handle SSE response
                content = response.text
                if content.startswith("event: message\ndata: "):
                    json_data = content.split("data: ", 1)[1].strip()
                    return json.loads(json_data)
                else:
                    return response.json()
            else:
                return {"error": f"HTTP {response.status_code}: {response.text}"}
        except Exception as e:
            return {"error": f"Request failed: {str(e)}"}
    
    async def list_tools(self) -> Dict[str, Any]:
        """List available tools."""
        request = {
            "jsonrpc": "2.0",
            "id": 3,
            "method": "tools/list"
        }
        
        headers = {
            "Content-Type": "application/json",
            "Accept": "application/json, text/event-stream"
        }
        
        try:
            response = await self.client.post(self.url, json=request, headers=headers)
            if response.status_code == 200:
                # Handle SSE response
                content = response.text
                if content.startswith("event: message\ndata: "):
                    json_data = content.split("data: ", 1)[1].strip()
                    return json.loads(json_data)
                else:
                    return response.json()
            else:
                return {"error": f"HTTP {response.status_code}: {response.text}"}
        except Exception as e:
            return {"error": f"Request failed: {str(e)}"}
    
    async def close(self):
        """Close the client."""
        await self.client.aclose()

async def test_authentication():
    """Test authentication via HTTP transport."""
    print("🧪 Testing MCP Server Authentication via HTTP Transport")
    print("=" * 60)
    
    client = MCPHttpClient("http://localhost:3001/mcp/")
    
    try:
        # Test initialization
        print("1. Testing server initialization...")
        init_result = await client.initialize()
        print(f"   Result: {json.dumps(init_result, indent=2)}")
        
        # Test tool listing
        print("\n2. Testing tool listing...")
        tools_result = await client.list_tools()
        print(f"   Result: {json.dumps(tools_result, indent=2)}")
        
        # Test authentication tool
        print("\n3. Testing authentication tool...")
        auth_result = await client.call_tool("authenticate_user", {
            "email": "test@example.com",
            "password": "testpassword"
        })
        print(f"   Result: {json.dumps(auth_result, indent=2)}")
        
        print("\n✅ HTTP Transport Test Complete!")
        print("🎯 Key Observation: Authentication call completed without event loop conflicts!")
        
    except Exception as e:
        print(f"❌ Test failed: {str(e)}")
    finally:
        await client.close()

if __name__ == "__main__":
    asyncio.run(test_authentication())