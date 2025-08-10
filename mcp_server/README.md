# Cyan Science Journal MCP Server

This directory contains a Model Context Protocol (MCP) server for the Cyan Science Journal. It provides a programmatic interface for AI agents to interact with the journal's peer review system.

## Overview

This server is built using **FastMCP** with **HTTP Transport** and provides a comprehensive interface to the journal's peer review system. It offers 47 tools across authentication, author, reviewer, and editor workflows, plus 5 resource endpoints.

## Architecture

The MCP server runs as an HTTP service that communicates with the Convex backend.

```
┌───────────────┐      ┌─────────────────────┐
│   AI Agents   │◄─────►│    MCP Server       │
│ (Claude, etc) │ HTTP │ (FastMCP + HTTP)    │
└───────────────┘      │ Port: 3001          │
                       └─────────────────────┘
                           │
                           │ Convex WebSocket
                           ▼
                     ┌────────────────┐
                     │ Convex Backend │
                     │ (TypeScript)   │
                     └────────────────┘
```

## ✅ HTTP Transport Migration Complete

This server has been **successfully migrated** from stdio to streamable HTTP transport to resolve authentication event loop conflicts. The migration provides:

- **🔧 Event Loop Isolation**: Authentication now runs in HTTP context without conflicts
- **🌐 Network Accessibility**: Server accessible via HTTP endpoints  
- **⚡ Concurrent Support**: Multiple simultaneous requests handled properly
- **🛡️ Session Management**: Secure JWT-based authentication system

## Installation

### Prerequisites

*   Python 3.8+
*   A running Convex backend deployment
*   A configured `.env` file in this directory

### Setup

1.  **Install dependencies:**
    ```bash
    # It is recommended to use a virtual environment
    python3 -m venv .venv
    source .venv/bin/activate
    
    pip install -r requirements.txt
    ```

2.  **Configure environment:**
    Copy `.env.example` to `.env` and update with your configuration:
    ```bash
    cp .env.example .env
    ```
    
    Key configuration variables:
    ```env
    # Convex Backend
    CONVEX_URL=https://your-convex-deployment-url.convex.cloud
    
    # HTTP Server Configuration  
    MCP_SERVER_HOST=0.0.0.0
    MCP_SERVER_PORT=3001
    
    # Security (auto-generated secure tokens)
    JWT_SECRET=your-jwt-secret-here
    MCP_API_TOKEN=your-api-token-here
    ```

3.  **Start the HTTP server:**
    ```bash
    # From the mcp_server directory
    python3 main.py
    ```
    
    Server will be available at: `http://localhost:3001/mcp/`

## Available Tools

The server exposes **47 comprehensive tools** across all journal workflows:

### Authentication & Session Management (10 tools)
- `authenticate_user` - Authenticate with email/password
- `get_current_user` - Get authenticated user info
- `logout_user` - Invalidate user session
- `refresh_session` - Refresh user session data
- `check_permissions` - Verify user permissions
- `validate_token` - Validate authentication token
- `create_user_account` - Create new user account
- `request_role_elevation` - Request reviewer/editor role
- `get_session_info` - Get detailed session info

### Author Workflow (5 tools)
- `submit_manuscript` - Submit paper for review
- `get_my_manuscripts` - Get author's manuscripts
- `get_manuscript_details` - Get manuscript details
- `check_manuscript_status` - Check submission status
- `download_manuscript_file` - Download manuscript PDF

### Reviewer Workflow (12 tools)
- `get_reviewer_dashboard` - Reviewer dashboard data
- `get_assigned_reviews` - Get assigned review tasks
- `get_review_details` - Get specific review details
- `get_pending_reviews` - Get pending reviews
- `get_completed_reviews` - Get completed reviews
- `get_overdue_reviews` - Get overdue reviews  
- `submit_review` - Submit peer review
- `get_review_history` - Get review history
- `get_review_statistics` - Get performance stats
- `download_manuscript_for_review` - Download for review
- `get_review_guidelines` - Get review guidelines

### Editor Workflow (15 tools)
- `get_editor_dashboard` - Editorial dashboard
- `get_manuscripts_for_editor` - Get assigned manuscripts
- `assign_reviewer_to_manuscript` - Assign reviewers
- `remove_reviewer_from_manuscript` - Remove reviewers
- `get_available_reviewers` - Get reviewer list
- `get_reviews_for_manuscript` - Get manuscript reviews
- `make_editorial_decision` - Make final decisions
- `get_proofing_tasks` - Get proofing tasks
- `get_proofing_task_details` - Get proofing details
- `upload_proofed_manuscript` - Upload proofed files
- `publish_article` - Publish final articles
- `get_published_articles` - Get published articles
- `get_editorial_statistics` - Get editorial stats
- `get_editorial_guidelines` - Get editorial guidelines

### Resources (5 endpoints)
- `resource://journal/info` - Journal information
- `resource://submission/guidelines` - Submission guidelines  
- `resource://review/criteria` - Review criteria
- `manuscripts://{id}` - Dynamic manuscript details
- `articles://{id}` - Dynamic article details

## Client Configuration

### MCP Client Setup

Configure your MCP client to use HTTP transport:

```json
{
  "cyan-science-journal": {
    "url": "http://localhost:3001/mcp",
    "transport": "streamable-http",
    "timeout": 30000
  }
}
```

### Testing HTTP Transport

Test the server using the provided test scripts:

```bash
# Test basic HTTP functionality
python3 test_simple_auth.py

# Test tool inventory
python3 test_tool_inventory.py
```

## Development

### Adding New Tools

1. **Add tool decorator** in `main.py`:
   ```python
   @mcp.tool()
   async def your_new_tool(auth_token: str, param: str) -> dict:
       return await your_module.your_function(param, auth_token)
   ```

2. **Implement in tool module** (e.g., `tools/auth.py`):
   ```python
   async def your_function(param: str, auth_token: str) -> Dict[str, Any]:
       # Implementation here
       return {"success": True, "data": result}
   ```

3. **Test via HTTP**:
   ```bash
   curl -X POST http://localhost:3001/mcp/ \
     -H "Content-Type: application/json" \
     -H "Accept: application/json, text/event-stream" \
     -d '{"jsonrpc": "2.0", "id": 1, "method": "tools/call", "params": {"name": "your_new_tool", "arguments": {"param": "value"}}}'
   ```

## Troubleshooting

### Common Issues

**Server won't start:**
- Check port 3001 is available: `lsof -i :3001`
- Verify virtual environment: `source .venv/bin/activate`
- Check environment file: `cat .env`

**Authentication Issues (RESOLVED):**
- ✅ **Event loop conflicts have been resolved** by migrating to HTTP transport
- ✅ Authentication now works reliably in HTTP context
- ✅ No more WebSocket conflicts with MCP stdio transport

**HTTP Transport Issues:**
- Verify server is running: `curl http://localhost:3001/mcp/`
- Check headers include: `Accept: application/json, text/event-stream`
- Use proper JSON-RPC 2.0 format for requests

**Convex Connection:**
- Verify `CONVEX_URL` in `.env` is correct
- Ensure Convex deployment is accessible
- Test with: `python3 -c "from utils.convex_client import get_convex_client; print('OK')"`

### Migration Notes

This server has been **successfully migrated** from stdio to HTTP transport to resolve persistent authentication issues. The migration provides:

- **Stable Authentication**: No more event loop conflicts
- **Better Debugging**: HTTP requests are easier to inspect
- **Network Flexibility**: Can be deployed remotely
- **Concurrent Support**: Multiple clients can connect simultaneously

For legacy stdio support, see the archived `server.py` implementation.