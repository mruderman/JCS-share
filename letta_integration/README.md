# Letta Integration Scripts

This directory contains scripts for integrating the Cyan Science Journal MCP server with a self-hosted Letta server.

## Quick Start

1. **Start the MCP Server:**
   ```bash
   cd ../mcp_server
   python main.py
   ```

2. **Connect to Letta:**
   ```bash
   python connect_to_letta.py
   ```

3. **Create an Agent:**
   ```bash
   python setup_journal_agent.py
   ```

4. **Test Integration:**
   ```bash
   python test_integration.py --start-server
   ```

5. **View Workflow Demo:**
   ```bash
   python demo_journal_workflow.py
   ```

## Scripts Overview

### `connect_to_letta.py`
Establishes connection between MCP server and self-hosted Letta server using Streamable HTTP transport.

**Usage:**
```bash
python connect_to_letta.py                    # Full setup
python connect_to_letta.py --test-connection  # Test existing connection
python connect_to_letta.py --list-servers     # List MCP servers
python connect_to_letta.py --list-tools       # List available tools
```

### `setup_journal_agent.py`
Creates and configures Letta agents specialized for journal management workflows.

**Usage:**
```bash
python setup_journal_agent.py                              # General agent
python setup_journal_agent.py --agent-type author         # Author assistant
python setup_journal_agent.py --agent-type reviewer       # Reviewer assistant  
python setup_journal_agent.py --agent-type editor         # Editorial assistant
python setup_journal_agent.py --list-agents               # List existing agents
```

### `test_integration.py`
Validates MCP server configuration and tests Streamable HTTP protocol compatibility.

**Usage:**
```bash
python test_integration.py                    # Test with external server
python test_integration.py --start-server     # Start server and test
python test_integration.py --test-tools       # Test tools listing only
```

### `demo_journal_workflow.py`
Demonstrates how Letta agents would interact with journal workflows.

**Usage:**
```bash
python demo_journal_workflow.py               # Complete demonstration
python demo_journal_workflow.py --scenario author     # Author workflow only
python demo_journal_workflow.py --scenario reviewer   # Reviewer workflow only
python demo_journal_workflow.py --scenario editor     # Editor workflow only
```

## Configuration

Ensure these environment variables are set in `../mcp_server/.env`:

```bash
# Letta Integration
LETTA_SERVER_URL=https://cyansociety.a.pinggy.link/
LETTA_PASSWORD=TWIJftq/ufbbxo8w51m/BQ1wBNrZb/JT
LETTA_MCP_SERVER_NAME=cyan-science-journal
LETTA_MCP_AUTH_TOKEN=XW2BZ4I84rWzUbmNCv3EpObxZSuchFYyod7EykCkWIU

# MCP Server
MCP_SERVER_HOST=127.0.0.1
MCP_SERVER_PORT=3001
MCP_SERVER_PATH=/mcp
```

## Requirements

- Python 3.8+
- aiohttp (for HTTP testing)
- letta (for Letta client - install separately if needed)
- All MCP server dependencies

## Troubleshooting

**Connection Issues:**
- Verify MCP server is running: `curl http://127.0.0.1:3001/mcp`
- Check network connectivity to Letta server
- Validate authentication tokens

**Tool Access Issues:**
- Confirm MCP server registration in Letta
- Check user permissions and roles
- Verify session management headers

**See the main documentation:** `../docs/LETTA_INTEGRATION.md`

## Integration Architecture

```
Letta Server ←→ MCP Server ←→ Convex Backend
(AI Agents)     (47 Tools)    (Journal Data)
```

The integration provides:
- ✅ 47 specialized journal management tools
- ✅ Complete workflow automation (author, reviewer, editor)
- ✅ Role-based access control
- ✅ Real-time session management
- ✅ Secure Streamable HTTP transport