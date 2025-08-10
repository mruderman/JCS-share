# Legacy stdio Transport Implementation

This directory contains the archived stdio transport implementation that was replaced by HTTP transport to resolve authentication event loop conflicts.

## Archived Files

- `server.py` - Original stdio MCP server implementation
- `tmp_rovodev_*.py` - Temporary development and testing scripts
- `cc-mcp-httpx.txt` - Development notes and logs
- `server.log` - Server logs from stdio implementation

## Why These Files Were Archived

The stdio transport implementation had persistent authentication issues:

- **Event Loop Conflicts**: MCP stdio transport interfered with convex-py WebSocket connections
- **Authentication Failures**: `Could not find public function for 'signIn'` errors
- **Unreliable Behavior**: Worked in standalone scripts but failed within MCP server context

## Migration to HTTP Transport

The new HTTP transport implementation (`main.py`) resolves these issues by:

- **Event Loop Isolation**: HTTP server runs in independent context
- **Reliable Authentication**: No conflicts with Convex backend
- **Better Debugging**: Standard HTTP request/response format
- **Network Accessibility**: Can be deployed remotely

## Restoration (If Needed)

To temporarily restore stdio transport:

1. Copy `server.py` back to parent directory
2. Update client configuration to use stdio transport
3. Run: `python3 server.py`

**Note**: Authentication issues will return with stdio transport.

## Recommendation

**Use the new HTTP transport implementation** (`main.py`) for all development and production deployments. The stdio implementation is preserved only for reference and emergency rollback scenarios.