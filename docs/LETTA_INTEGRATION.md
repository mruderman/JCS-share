# Letta Integration with Cyan Science Journal MCP Server

This document provides comprehensive instructions for integrating the Cyan Science Journal MCP server with a self-hosted Letta server using Streamable HTTP transport.

## Overview

The Cyan Science Journal MCP server provides 47 specialized tools for managing peer review workflows, manuscript submissions, and editorial processes. This integration enables Letta AI agents to automate and assist with journal operations.

### Architecture

```
┌─────────────────┐    Streamable HTTP    ┌─────────────────┐
│   Letta Server  │ ←─────────────────→   │   MCP Server    │
│  (AI Agents)    │     (Port 3001)       │ (Journal Tools) │
└─────────────────┘                       └─────────────────┘
         │                                          │
         │                                          │
         ▼                                          ▼
┌─────────────────┐                       ┌─────────────────┐
│  Agent Memory   │                       │  Convex Backend │
│  & Context      │                       │ (Journal Data)  │
└─────────────────┘                       └─────────────────┘
```

## Prerequisites

1. **Self-hosted Letta server** running at `https://cyansociety.a.pinggy.link/`
2. **Cyan Science Journal MCP server** (this repository)
3. **Network connectivity** between Letta and MCP servers
4. **Valid authentication credentials** for both systems

## Configuration

### Environment Variables

The following environment variables must be configured in `mcp_server/.env`:

```bash
# MCP Server Configuration
MCP_SERVER_HOST=127.0.0.1
MCP_SERVER_PORT=3001
MCP_SERVER_PATH=/mcp
MCP_API_TOKEN=XW2BZ4I84rWzUbmNCv3EpObxZSuchFYyod7EykCkWIU

# Letta Integration Configuration
LETTA_SERVER_URL=https://cyansociety.a.pinggy.link/
LETTA_PASSWORD=TWIJftq/ufbbxo8w51m/BQ1wBNrZb/JT
LETTA_MCP_SERVER_NAME=cyan-science-journal
LETTA_MCP_AUTH_TOKEN=XW2BZ4I84rWzUbmNCv3EpObxZSuchFYyod7EykCkWIU

# Convex Backend Configuration
CONVEX_URL=https://adept-leopard-797.convex.cloud
CONVEX_DEPLOYMENT_URL=https://adept-leopard-797.convex.cloud
```

## Setup Instructions

### Step 1: Start the MCP Server

```bash
cd mcp_server
python main.py
```

The server will start with Streamable HTTP transport on `http://127.0.0.1:3001/mcp`.

### Step 2: Connect to Letta Server

Use the provided integration script to establish the connection:

```bash
cd letta_integration
python connect_to_letta.py
```

This script will:
- Connect to the self-hosted Letta server
- Configure the MCP server connection using `StreamableHTTPServerConfig`
- Validate the connection and list available tools

### Step 3: Create Journal Agents

Set up specialized agents for different journal roles:

```bash
# Create a general journal assistant
python setup_journal_agent.py

# Create role-specific agents
python setup_journal_agent.py --agent-type author --agent-name "Author Assistant"
python setup_journal_agent.py --agent-type reviewer --agent-name "Peer Review Assistant"
python setup_journal_agent.py --agent-type editor --agent-name "Editorial Assistant"
```

### Step 4: Test Integration

Validate the complete integration:

```bash
python test_integration.py --start-server
```

## Available Tools

The MCP server provides 47 tools organized into categories:

### Authentication Tools (10 tools)
- `authenticate_user` - User login and session management
- `get_current_user` - Retrieve user information and roles
- `logout_user` - Session termination
- `refresh_session` - Update session data
- `check_permissions` - Role-based access control
- `create_user_account` - New user registration
- `request_role_elevation` - Role upgrade requests
- `get_session_info` - Detailed session information
- `validate_token` - Token verification

### Author Tools (5 tools)
- `submit_manuscript` - Upload and submit research papers
- `get_my_manuscripts` - View submitted manuscripts
- `get_manuscript_details` - Detailed manuscript information
- `check_manuscript_status` - Track review progress
- `download_manuscript_file` - Access submitted files

### Reviewer Tools (12 tools)
- `get_reviewer_dashboard` - Review assignments overview
- `get_assigned_reviews` - Current review assignments
- `get_review_details` - Specific review information
- `get_pending_reviews` - Outstanding review tasks
- `get_completed_reviews` - Review history
- `get_overdue_reviews` - Late review tracking
- `submit_review` - Submit peer review evaluations
- `get_review_history` - Complete review history
- `get_review_statistics` - Performance metrics
- `download_manuscript_for_review` - Access manuscripts for review
- `get_review_guidelines` - Review criteria and standards

### Editor Tools (20 tools)
- `get_editor_dashboard` - Editorial overview and statistics
- `get_manuscripts_for_editor` - Editorial queue management
- `assign_reviewer_to_manuscript` - Reviewer assignment
- `remove_reviewer_from_manuscript` - Reviewer management
- `get_available_reviewers` - Reviewer database
- `get_reviews_for_manuscript` - Review compilation
- `make_editorial_decision` - Final publication decisions
- `get_proofing_tasks` - Post-acceptance workflow
- `get_proofing_task_details` - Proofing management
- `upload_proofed_manuscript` - Final manuscript processing
- `publish_article` - Publication release
- `get_published_articles` - Published content management
- `get_editorial_statistics` - Editorial performance metrics
- `get_editorial_guidelines` - Editorial policies and procedures

## Workflow Examples

### Author Workflow

```python
# 1. Agent authenticates user
response = await agent.call_tool("authenticate_user", {
    "email": "researcher@university.edu",
    "password": "secure_password"
})

# 2. Agent provides submission guidelines  
guidelines = await agent.call_tool("get_submission_guidelines")

# 3. Agent submits manuscript
submission = await agent.call_tool("submit_manuscript", {
    "title": "Research Paper Title",
    "abstract": "Paper abstract...",
    "keywords": ["keyword1", "keyword2"],
    "language": "en",
    "file_data": "base64_encoded_pdf",
    "file_name": "paper.pdf"
})

# 4. Agent tracks status
status = await agent.call_tool("check_manuscript_status", {
    "manuscript_id": submission["manuscript_id"]
})
```

### Reviewer Workflow

```python
# 1. Agent gets review assignments
reviews = await agent.call_tool("get_assigned_reviews")

# 2. Agent accesses review guidelines
guidelines = await agent.call_tool("get_review_guidelines")

# 3. Agent downloads manuscript
manuscript = await agent.call_tool("download_manuscript_for_review", {
    "review_id": "review_123"
})

# 4. Agent submits review
review_result = await agent.call_tool("submit_review", {
    "review_id": "review_123",
    "score": 8,
    "comments": "Detailed review comments...",
    "recommendation": "minor"
})
```

### Editor Workflow

```python
# 1. Agent views editorial dashboard
dashboard = await agent.call_tool("get_editor_dashboard")

# 2. Agent finds available reviewers
reviewers = await agent.call_tool("get_available_reviewers")

# 3. Agent assigns reviewer
assignment = await agent.call_tool("assign_reviewer_to_manuscript", {
    "manuscript_id": "ms_456",
    "reviewer_id": "reviewer_789",
    "deadline_days": 21
})

# 4. Agent makes editorial decision
decision = await agent.call_tool("make_editorial_decision", {
    "manuscript_id": "ms_456", 
    "decision": "accept",
    "comments": "Editorial comments..."
})
```

## Agent Configuration

### Letta Agent Setup

When creating agents in Letta, use the following configuration:

```python
from letta import Letta
from letta.types import StreamableHTTPServerConfig

client = Letta(
    base_url="https://cyansociety.a.pinggy.link/",
    token="TWIJftq/ufbbxo8w51m/BQ1wBNrZb/JT"
)

# Configure MCP server connection
mcp_config = StreamableHTTPServerConfig(
    server_name="cyan-science-journal",
    server_url="http://127.0.0.1:3001/mcp",
    auth_token="XW2BZ4I84rWzUbmNCv3EpObxZSuchFYyod7EykCkWIU",
    custom_headers={
        "Content-Type": "application/json",
        "Accept": "application/json, text/event-stream"
    }
)

# Add MCP server to Letta
await client.tools.add_mcp_server(request=mcp_config)

# Create journal agent
agent = await client.agents.create(
    name="Journal Assistant",
    model="gpt-4o-mini",
    embedding="text-embedding-3-small",
    instructions="""You are an AI assistant for the Cyan Science Journal.
    Help users with manuscript submissions, peer reviews, and editorial tasks.
    Always maintain academic integrity and confidentiality."""
)
```

### Agent Memory and Context

Configure agents with appropriate context:

```python
journal_context = """I am an AI assistant for the Cyan Science Journal, a peer-reviewed 
academic publication. I help manage the complete editorial workflow including manuscript 
submissions, peer review coordination, and publication processes. I always maintain 
confidentiality and academic integrity standards.

Key capabilities:
- User authentication and role management
- Manuscript submission and tracking  
- Peer review assignment and coordination
- Editorial decision support
- Publication workflow management
"""
```

## Security Considerations

### Authentication and Authorization

1. **MCP Server Authentication**: Uses Bearer token authentication with rate limiting
2. **Session Management**: Streamable HTTP provides secure session handling
3. **Role-Based Access**: Tools enforce user permissions based on roles
4. **Data Privacy**: Maintains confidentiality of the peer review process

### Network Security

1. **HTTPS**: Use TLS for all production connections
2. **Firewall**: Restrict MCP server access to authorized hosts
3. **Token Security**: Rotate authentication tokens regularly
4. **Input Validation**: All tool inputs are sanitized and validated

## Troubleshooting

### Common Issues

1. **Connection Refused**
   - Verify MCP server is running on correct host:port
   - Check firewall settings and network connectivity

2. **Authentication Failed**
   - Validate `LETTA_PASSWORD` and `MCP_AUTH_TOKEN` 
   - Ensure tokens haven't expired

3. **Tools Not Available**
   - Confirm MCP server registration in Letta
   - Check tool permissions for user roles

4. **Session Errors**
   - MCP server requires proper session management
   - Ensure clients include `Mcp-Session-Id` headers

### Debug Commands

```bash
# Test MCP server health
curl -X GET http://127.0.0.1:3001/mcp

# Test authentication
curl -X POST http://127.0.0.1:3001/mcp \
  -H "Content-Type: application/json" \
  -H "Accept: application/json, text/event-stream" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"jsonrpc":"2.0","id":1,"method":"initialize","params":{}}'

# List available tools
python letta_integration/test_integration.py --test-tools
```

## Performance Optimization

### Server Configuration

- **Concurrent Requests**: FastMCP handles multiple simultaneous connections
- **Session Pooling**: Reuse sessions for better performance  
- **Tool Caching**: Cache frequently accessed data
- **Database Optimization**: Optimize Convex queries for speed

### Agent Configuration

- **Tool Selection**: Only add essential tools to agents
- **Memory Management**: Configure appropriate context window sizes
- **Model Selection**: Choose optimal models for different tasks
- **Batch Operations**: Group related tool calls when possible

## Monitoring and Logging

### MCP Server Logs

```bash
# View server logs
tail -f mcp_server/mcp_server.log

# Monitor performance
python letta_integration/test_integration.py --start-server
```

### Letta Agent Monitoring

Use Letta's built-in observability features to monitor agent performance:

- Response times and success rates
- Tool usage patterns and frequency
- Agent memory and context utilization
- Error rates and debugging information

## Support and Maintenance

### Regular Maintenance Tasks

1. **Token Rotation**: Update authentication tokens quarterly
2. **Log Rotation**: Archive and clean up old log files
3. **Database Maintenance**: Monitor Convex backend performance
4. **Agent Updates**: Refresh agent instructions and capabilities

### Getting Help

1. **Integration Issues**: Check this documentation and troubleshooting section
2. **MCP Server Issues**: Review server logs and configuration
3. **Letta Issues**: Consult Letta documentation and support channels
4. **Journal Workflow**: Review tool documentation and workflow examples

## Conclusion

This integration provides a powerful platform for automating academic journal operations using AI agents. The combination of Letta's agent capabilities with the Cyan Science Journal's specialized MCP tools enables sophisticated workflow automation while maintaining academic standards and security.

The system is designed to scale from simple author assistance to complex editorial decision support, making it suitable for journals of all sizes and complexity levels.