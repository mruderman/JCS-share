#!/usr/bin/env python3
"""
Test Cyan Science Journal MCP Server Integration with Letta

This script validates that the MCP server is properly configured for
Streamable HTTP transport and ready for Letta integration. It tests
the server without requiring the Letta client to be installed.

Usage:
    python test_integration.py
    python test_integration.py --start-server
    python test_integration.py --test-tools
"""

import os
import sys
import json
import asyncio
import aiohttp
import argparse
import subprocess
import time
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv(Path(__file__).parent.parent / "mcp_server" / ".env")


class MCPIntegrationTester:
    """Tests MCP server integration readiness for Letta."""
    
    def __init__(self):
        """Initialize tester with configuration."""
        self.mcp_server_host = os.getenv("MCP_SERVER_HOST", "127.0.0.1")
        self.mcp_server_port = int(os.getenv("MCP_SERVER_PORT", "3001"))
        self.mcp_server_path = os.getenv("MCP_SERVER_PATH", "/mcp")
        self.mcp_auth_token = os.getenv("LETTA_MCP_AUTH_TOKEN")
        self.session_id = None  # Track session ID for tool calls
        self.cookie_jar = aiohttp.CookieJar()  # Persistent cookies for session
        
        # Construct server URL
        self.server_url = f"http://{self.mcp_server_host}:{self.mcp_server_port}{self.mcp_server_path}"
        
        print(f"🔧 Testing MCP Server: {self.server_url}")
        print(f"🔧 Auth Token: {'✅ Set' if self.mcp_auth_token else '❌ Not Set'}")
    
    async def test_server_health(self):
        """Test basic server connectivity and health."""
        try:
            print("🏥 Testing server health...")
            
            async with aiohttp.ClientSession() as session:
                # Test GET request (should return method not allowed or proper response)
                async with session.get(self.server_url) as response:
                    print(f"   GET {self.server_url}: {response.status}")
                    
                    if response.status == 405:
                        print("   ✅ Server responds (method not allowed expected for GET)")
                    elif response.status == 200:
                        content_type = response.headers.get('content-type', '')
                        if 'text/event-stream' in content_type:
                            print("   ✅ Server responds with SSE stream")
                        else:
                            print("   ✅ Server responds")
                    else:
                        print(f"   ⚠️  Unexpected status: {response.status}")
            
            return True
            
        except Exception as e:
            print(f"   ❌ Server health check failed: {e}")
            return False
    
    async def test_mcp_initialization(self):
        """Test MCP protocol initialization."""
        try:
            print("🔗 Testing MCP initialization...")
            
            # MCP initialization request
            init_request = {
                "jsonrpc": "2.0",
                "id": 1,
                "method": "initialize",
                "params": {
                    "protocolVersion": "2024-11-05",
                    "capabilities": {
                        "roots": {
                            "listChanged": True
                        },
                        "sampling": {}
                    },
                    "clientInfo": {
                        "name": "letta-integration-test",
                        "version": "1.0.0"
                    }
                }
            }
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream"
            }
            
            if self.mcp_auth_token:
                headers["Authorization"] = f"Bearer {self.mcp_auth_token}"
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.server_url,
                    json=init_request,
                    headers=headers
                ) as response:
                    
                    print(f"   POST {self.server_url}: {response.status}")
                    
                    if response.status == 200:
                        content_type = response.headers.get('content-type', '')
                        
                        if 'application/json' in content_type:
                            result = await response.json()
                            print("   ✅ JSON response received")
                            
                            if 'result' in result:
                                capabilities = result['result'].get('capabilities', {})
                                tools = capabilities.get('tools', {})
                                resources = capabilities.get('resources', {})
                                
                                print(f"   🔧 Tools available: {'✅' if tools else '❌'}")
                                print(f"   📚 Resources available: {'✅' if resources else '❌'}")
                                print(f"   📋 Protocol version: {result['result'].get('protocolVersion', 'Unknown')}")
                                
                                return result
                            
                        elif 'text/event-stream' in content_type:
                            print("   ✅ SSE stream response received")
                            
                            # Extract session ID from response headers  
                            self.session_id = response.headers.get('mcp-session-id')
                            if self.session_id:
                                print(f"   🔑 Session ID captured from headers: {self.session_id}")
                            else:
                                print("   ⚠️  No session ID found in headers")
                            
                            # Read SSE events to get initialization result
                            chunk_count = 0
                            session_data = None
                            async for chunk in response.content.iter_chunked(1024):
                                chunk_text = chunk.decode('utf-8')
                                if chunk_text.strip():
                                    print(f"   📡 SSE chunk {chunk_count}: {chunk_text[:100]}...")
                                    
                                    # Try to extract initialization result from SSE data
                                    if 'data:' in chunk_text and '"result"' in chunk_text:
                                        try:
                                            data_line = chunk_text.split('data:')[1].strip()
                                            json_data = json.loads(data_line)
                                            if 'result' in json_data:
                                                session_data = json_data
                                                capabilities = json_data['result'].get('capabilities', {})
                                                tools = capabilities.get('tools', {})
                                                resources = capabilities.get('resources', {})
                                                print(f"   🔧 Tools available: {'✅' if tools else '❌'}")
                                                print(f"   📚 Resources available: {'✅' if resources else '❌'}")
                                        except (json.JSONDecodeError, IndexError):
                                            pass
                                    
                                    chunk_count += 1
                                    if chunk_count >= 3:  # Read enough to get initialization
                                        break
                            
                            return session_data or {"status": "sse_stream"}
                    
                    else:
                        error_text = await response.text()
                        print(f"   ❌ Initialization failed: {response.status}")
                        print(f"   📄 Response: {error_text[:200]}...")
                        return None
            
        except Exception as e:
            print(f"   ❌ MCP initialization failed: {e}")
            return None
    
    async def test_tools_listing(self):
        """Test listing available tools."""
        try:
            print("🔧 Testing tools listing...")
            
            tools_request = {
                "jsonrpc": "2.0",
                "id": 2,
                "method": "tools/list",
                "params": {}
            }
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream"
            }
            
            if self.mcp_auth_token:
                headers["Authorization"] = f"Bearer {self.mcp_auth_token}"
            
            # Add session ID if available
            if self.session_id:
                headers["mcp-session-id"] = self.session_id
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.server_url,
                    json=tools_request,
                    headers=headers
                ) as response:
                    
                    if response.status == 200:
                        content_type = response.headers.get('content-type', '')
                        
                        if 'application/json' in content_type:
                            result = await response.json()
                            
                            if 'result' in result and 'tools' in result['result']:
                                tools = result['result']['tools']
                                print(f"   ✅ Found {len(tools)} tools")
                        elif 'text/event-stream' in content_type:
                            print("   ✅ SSE stream response received for tools")
                            
                            # Read SSE stream for tools data
                            tools = []
                            chunk_count = 0
                            async for chunk in response.content.iter_chunked(1024):
                                chunk_text = chunk.decode('utf-8')
                                if chunk_text.strip():
                                    print(f"   📡 Tools SSE chunk {chunk_count}: {chunk_text[:100]}...")
                                    
                                    # Try to extract tools from SSE data
                                    if 'data:' in chunk_text and '"result"' in chunk_text:
                                        try:
                                            data_line = chunk_text.split('data:')[1].strip()
                                            json_data = json.loads(data_line)
                                            if 'result' in json_data and 'tools' in json_data['result']:
                                                tools = json_data['result']['tools']
                                                print(f"   ✅ Found {len(tools)} tools")
                                                break
                                        except (json.JSONDecodeError, IndexError):
                                            pass
                                    
                                    chunk_count += 1
                                    if chunk_count >= 5:  # Limit output
                                        break
                            
                            if tools:
                                tools = tools  # Use extracted tools
                            else:
                                print("   ⚠️  Could not extract tools from SSE stream")
                                return None
                            
                            # Group tools by category
                            categories = {}
                            for tool in tools:
                                name = tool.get('name', 'unknown')
                                if '_' in name or any(cat in name for cat in ['auth', 'submit', 'get', 'assign']):
                                    if 'auth' in name:
                                        category = 'authentication'
                                    elif any(word in name for word in ['submit', 'manuscript']):
                                        category = 'author'
                                    elif any(word in name for word in ['review', 'reviewer']):
                                        category = 'reviewer'  
                                    elif any(word in name for word in ['editor', 'editorial', 'assign']):
                                        category = 'editor'
                                    else:
                                        category = 'general'
                                else:
                                    category = 'general'
                                
                                if category not in categories:
                                    categories[category] = []
                                categories[category].append(name)
                            
                            for category, tool_names in categories.items():
                                print(f"   📂 {category.title()}: {len(tool_names)} tools")
                                for tool_name in tool_names[:2]:  # Show first 2
                                    print(f"      🔧 {tool_name}")
                                if len(tool_names) > 2:
                                    print(f"      ... and {len(tool_names) - 2} more")
                            
                            return tools
                        else:
                            print("   ❌ No tools found in response")
                            return []
                    else:
                        print(f"   ❌ Tools listing failed: {response.status}")
                        return None
            
        except Exception as e:
            print(f"   ❌ Tools listing failed: {e}")
            return None
    
    async def test_authentication_tool(self):
        """Test authentication tool functionality."""
        try:
            print("🔐 Testing authentication tool...")
            
            auth_request = {
                "jsonrpc": "2.0",
                "id": 3,
                "method": "tools/call",
                "params": {
                    "name": "authenticate_user",
                    "arguments": {
                        "email": "michael.ruderman@cyansociety.org",
                        "password": "sirloins"
                    }
                }
            }
            
            headers = {
                "Content-Type": "application/json",
                "Accept": "application/json, text/event-stream"
            }
            
            if self.mcp_auth_token:
                headers["Authorization"] = f"Bearer {self.mcp_auth_token}"
            
            # Add session ID if available
            if self.session_id:
                headers["mcp-session-id"] = self.session_id
            
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    self.server_url,
                    json=auth_request,
                    headers=headers
                ) as response:
                    
                    if response.status == 200:
                        content_type = response.headers.get('content-type', '')
                        
                        if 'application/json' in content_type:
                            result = await response.json()
                            
                            if 'result' in result:
                                auth_result = result['result']
                                print(f"   📋 Authentication result: {json.dumps(auth_result, indent=2)[:200]}...")
                                
                                if auth_result.get('success'):
                                    print("   ✅ Authentication successful")
                                else:
                                    print("   ⚠️  Authentication failed (may be expected)")
                                
                                return auth_result
                            else:
                                print("   ❌ No result in authentication response")
                                return None
                        elif 'text/event-stream' in content_type:
                            print("   ✅ SSE stream response received for authentication")
                            
                            # Read SSE stream for auth result
                            auth_result = None
                            chunk_count = 0
                            async for chunk in response.content.iter_chunked(1024):
                                chunk_text = chunk.decode('utf-8')
                                if chunk_text.strip():
                                    print(f"   📡 Auth SSE chunk {chunk_count}: {chunk_text[:100]}...")
                                    
                                    # Try to extract auth result from SSE data
                                    if 'data:' in chunk_text and '"result"' in chunk_text:
                                        try:
                                            data_line = chunk_text.split('data:')[1].strip()
                                            json_data = json.loads(data_line)
                                            if 'result' in json_data:
                                                auth_result = json_data['result']
                                                print(f"   📋 Authentication result: {json.dumps(auth_result, indent=2)[:200]}...")
                                                
                                                if auth_result.get('success'):
                                                    print("   ✅ Authentication successful")
                                                else:
                                                    print("   ⚠️  Authentication failed (may be expected)")
                                                break
                                        except (json.JSONDecodeError, IndexError):
                                            pass
                                    
                                    chunk_count += 1
                                    if chunk_count >= 5:  # Limit output
                                        break
                            
                            return auth_result
                    else:
                        print(f"   ❌ Authentication tool test failed: {response.status}")
                        error_text = await response.text()
                        print(f"   📄 Error: {error_text[:200]}...")
                        return None
            
        except Exception as e:
            print(f"   ❌ Authentication test failed: {e}")
            return None
    
    def start_server_background(self):
        """Start the MCP server in the background."""
        try:
            print("🚀 Starting MCP server in background...")
            
            server_path = Path(__file__).parent.parent / "mcp_server" / "main.py"
            
            process = subprocess.Popen(
                [sys.executable, str(server_path)],
                stdout=subprocess.PIPE,
                stderr=subprocess.PIPE,
                cwd=server_path.parent
            )
            
            # Wait a moment for server to start
            time.sleep(3)
            
            if process.poll() is None:
                print("   ✅ Server started successfully")
                return process
            else:
                stdout, stderr = process.communicate()
                print(f"   ❌ Server failed to start")
                print(f"   📄 stdout: {stdout.decode()[:200]}...")
                print(f"   📄 stderr: {stderr.decode()[:200]}...")
                return None
            
        except Exception as e:
            print(f"   ❌ Failed to start server: {e}")
            return None
    
    async def run_complete_test(self, start_server=False):
        """Run complete integration test suite."""
        server_process = None
        
        try:
            print("🧪 Starting MCP-Letta Integration Test Suite")
            print("=" * 50)
            
            if start_server:
                server_process = self.start_server_background()
                if not server_process:
                    print("❌ Cannot proceed without server")
                    return False
            
            # Use persistent session for all requests
            async with aiohttp.ClientSession() as persistent_session:
                self.persistent_session = persistent_session
                
                # Test 1: Server Health
                health_ok = await self.test_server_health()
                if not health_ok:
                    print("❌ Server health check failed - cannot proceed")
                    return False
                
                # Test 2: MCP Initialization (establishes session)
                init_result = await self.test_mcp_initialization()
                if not init_result:
                    print("⚠️  MCP initialization test failed")
                    # Don't proceed without proper initialization
                    return False
                
                # Test 3: Tools Listing
                tools = await self.test_tools_listing()
                if not tools:
                    print("⚠️  Tools listing test failed")
                
                # Test 4: Authentication Tool  
                auth_result = await self.test_authentication_tool()
                if not auth_result:
                    print("⚠️  Authentication tool test failed")
            
            print("\n" + "=" * 50)
            print("🎉 Integration Test Summary:")
            print(f"   🏥 Server Health: {'✅' if health_ok else '❌'}")
            print(f"   🔗 MCP Protocol: {'✅' if init_result else '❌'}")
            print(f"   🔧 Tools Available: {'✅' if tools else '❌'}")
            print(f"   🔐 Authentication: {'✅' if auth_result else '❌'}")
            
            if health_ok and tools:
                print("\n✅ MCP Server is ready for Letta integration!")
                print("🔗 Letta can connect using StreamableHTTPServerConfig")
                print(f"   📡 Server URL: {self.server_url}")
                print(f"   🔑 Auth Token: {'Available' if self.mcp_auth_token else 'Not Set'}")
                return True
            else:
                print("\n❌ MCP Server needs configuration before Letta integration")
                return False
            
        except Exception as e:
            print(f"❌ Test suite failed: {e}")
            return False
            
        finally:
            if server_process:
                print("🛑 Stopping background server...")
                server_process.terminate()
                try:
                    server_process.wait(timeout=5)
                except subprocess.TimeoutExpired:
                    server_process.kill()


async def main():
    """Main entry point for integration testing."""
    parser = argparse.ArgumentParser(description="Test MCP-Letta Integration")
    parser.add_argument("--start-server", action="store_true", help="Start MCP server in background")
    parser.add_argument("--test-tools", action="store_true", help="Test tools listing only")
    
    args = parser.parse_args()
    
    try:
        tester = MCPIntegrationTester()
        
        if args.test_tools:
            await tester.test_tools_listing()
        else:
            success = await tester.run_complete_test(start_server=args.start_server)
            sys.exit(0 if success else 1)
            
    except KeyboardInterrupt:
        print("\n⚠️  Test interrupted by user")
    except Exception as e:
        print(f"❌ Test failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())