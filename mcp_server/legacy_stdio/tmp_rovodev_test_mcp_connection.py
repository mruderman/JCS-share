#!/usr/bin/env python3
"""
Test MCP server connection and diagnose issues.
"""

import subprocess
import sys
import time
import json
from pathlib import Path

def test_mcp_server_stdio():
    """Test MCP server via STDIO (how MCP clients connect)."""
    print("🔍 Testing MCP Server STDIO Connection")
    print("=" * 40)
    
    try:
        # Start the MCP server process
        process = subprocess.Popen(
            [sys.executable, "main.py"],
            stdin=subprocess.PIPE,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            cwd=Path(__file__).parent
        )
        
        # Send MCP initialization message
        init_message = {
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
                    "name": "test-client",
                    "version": "1.0.0"
                }
            }
        }
        
        print("📤 Sending initialization message...")
        process.stdin.write(json.dumps(init_message) + "\n")
        process.stdin.flush()
        
        # Wait for response
        print("📥 Waiting for response...")
        time.sleep(2)
        
        # Check if process is still running
        if process.poll() is None:
            print("✅ Server is running and accepting connections")
            
            # Try to read response
            try:
                # Set a short timeout for reading
                import select
                ready, _, _ = select.select([process.stdout], [], [], 1)
                if ready:
                    response = process.stdout.readline()
                    if response:
                        print(f"📨 Received response: {response.strip()}")
                    else:
                        print("⚠️  No response received")
                else:
                    print("⚠️  Timeout waiting for response")
            except Exception as e:
                print(f"⚠️  Error reading response: {e}")
            
            # Terminate the process
            process.terminate()
            process.wait()
            return True
        else:
            # Process exited
            stdout, stderr = process.communicate()
            print(f"❌ Server exited with code: {process.returncode}")
            if stdout:
                print(f"📤 STDOUT: {stdout}")
            if stderr:
                print(f"📤 STDERR: {stderr}")
            return False
            
    except Exception as e:
        print(f"❌ Error testing server: {e}")
        return False

def check_environment():
    """Check environment configuration."""
    print("\n🔧 Checking Environment Configuration")
    print("=" * 40)
    
    from dotenv import load_dotenv
    import os
    
    load_dotenv()
    
    # Check required environment variables
    required_vars = ["CONVEX_URL"]
    optional_vars = ["LOG_LEVEL", "DEBUG", "MCP_SERVER_PORT"]
    
    print("Required variables:")
    for var in required_vars:
        value = os.getenv(var)
        if value:
            print(f"  ✅ {var}: {value}")
        else:
            print(f"  ❌ {var}: Not set")
    
    print("\nOptional variables:")
    for var in optional_vars:
        value = os.getenv(var)
        if value:
            print(f"  ✅ {var}: {value}")
        else:
            print(f"  ⚪ {var}: Not set (using default)")

def generate_correct_config():
    """Generate the correct MCP client configuration."""
    print("\n📝 Generating Correct MCP Configuration")
    print("=" * 40)
    
    current_path = Path(__file__).parent.absolute()
    main_py_path = current_path / "main.py"
    
    # Claude Desktop configuration
    claude_config = {
        "mcpServers": {
            "cyan-science-journal": {
                "command": "python",
                "args": [str(main_py_path)],
                "env": {
                    "CONVEX_URL": "http://localhost:3000",
                    "LOG_LEVEL": "INFO"
                }
            }
        }
    }
    
    print("✅ Claude Desktop Configuration:")
    print(json.dumps(claude_config, indent=2))
    
    # Common issues and fixes
    print(f"\n🔧 Common Issues & Fixes:")
    print(f"1. Path issues:")
    print(f"   ❌ Wrong: Relative paths or ~ in paths")
    print(f"   ✅ Correct: {main_py_path}")
    print(f"")
    print(f"2. Python executable:")
    print(f"   ❌ Wrong: 'python3' if not in PATH")
    print(f"   ✅ Correct: 'python' or full path like '/usr/bin/python3'")
    print(f"")
    print(f"3. Environment variables:")
    print(f"   ✅ Make sure CONVEX_URL is set correctly")
    print(f"   ✅ Add LOG_LEVEL for debugging")

if __name__ == "__main__":
    print("🚀 MCP Connection Diagnostics")
    print("=" * 50)
    
    # Check environment
    check_environment()
    
    # Test server connection
    server_ok = test_mcp_server_stdio()
    
    # Generate correct config
    generate_correct_config()
    
    print(f"\n📊 Diagnostic Results")
    print("=" * 25)
    print(f"Server STDIO: {'✅' if server_ok else '❌'}")
    
    if server_ok:
        print(f"\n🎉 Server is working correctly!")
        print(f"The issue is likely in your MCP client configuration.")
        print(f"Use the configuration shown above.")
    else:
        print(f"\n❌ Server has startup issues.")
        print(f"Check the error messages above.")