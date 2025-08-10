#!/usr/bin/env python3
"""
Setup Cyan Science Journal Agent in Letta

This script creates and configures a Letta agent specialized for managing
the Cyan Science Journal peer review workflow. It sets up the agent with
appropriate tools, memory, and context for journal operations.

Usage:
    python setup_journal_agent.py
    python setup_journal_agent.py --agent-name "Journal Editor"
    python setup_journal_agent.py --list-agents
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


class JournalAgentSetup:
    """Sets up and configures Letta agents for journal management."""
    
    def __init__(self):
        """Initialize agent setup with configuration."""
        self.letta_server_url = os.getenv("LETTA_SERVER_URL", "https://cyansociety.a.pinggy.link/")
        self.letta_password = os.getenv("LETTA_PASSWORD")
        self.mcp_server_name = os.getenv("LETTA_MCP_SERVER_NAME", "cyan-science-journal")
        
        if not self.letta_password:
            raise ValueError("LETTA_PASSWORD not set in environment")
    
    async def connect_to_letta(self):
        """Connect to the Letta server."""
        try:
            print("🔗 Connecting to Letta server...")
            client = Letta(
                base_url=self.letta_server_url,
                token=self.letta_password
            )
            print("✅ Connected to Letta server")
            return client
        except Exception as e:
            print(f"❌ Failed to connect to Letta: {e}")
            raise
    
    async def get_essential_tools(self, client):
        """Get the most essential journal management tools."""
        try:
            print("🔍 Retrieving essential journal tools...")
            
            # List all available MCP tools
            all_tools = await client.tools.list_mcp_tools_by_server(mcp_server_name=self.mcp_server_name)
            
            # Define essential tools for different user roles
            essential_tools = [
                # Authentication tools
                "authenticate_user",
                "get_current_user", 
                "logout_user",
                
                # Author tools
                "submit_manuscript",
                "get_my_manuscripts",
                "check_manuscript_status",
                "get_manuscript_details",
                
                # Reviewer tools
                "get_assigned_reviews",
                "get_review_details",
                "submit_review",
                "get_review_guidelines",
                
                # Editor tools
                "get_editor_dashboard",
                "get_manuscripts_for_editor",
                "assign_reviewer_to_manuscript",
                "make_editorial_decision",
                "get_available_reviewers",
                
                # General workflow
                "get_review_criteria",
                "get_submission_guidelines"
            ]
            
            # Filter to only include tools that exist
            available_tool_names = [tool.get('name', '') for tool in all_tools]
            existing_essential_tools = [tool for tool in essential_tools if tool in available_tool_names]
            
            print(f"📋 Found {len(existing_essential_tools)} essential tools out of {len(essential_tools)} requested")
            
            # Add the essential tools to Letta
            tool_ids = []
            for tool_name in existing_essential_tools:
                try:
                    tool = await client.tools.add_mcp_tool(
                        mcp_server_name=self.mcp_server_name,
                        mcp_tool_name=tool_name
                    )
                    tool_ids.append(tool.id)
                    print(f"  ✅ Added tool: {tool_name}")
                except Exception as e:
                    print(f"  ⚠️  Failed to add tool {tool_name}: {e}")
            
            return tool_ids
            
        except Exception as e:
            print(f"❌ Failed to get essential tools: {e}")
            raise
    
    def get_agent_persona(self, agent_type="general"):
        """Get agent persona and instructions based on type."""
        
        base_context = """You are an AI assistant specialized in managing the Cyan Science Journal, 
        a peer-reviewed academic publication. You have access to the complete journal management 
        system through MCP tools that allow you to handle manuscripts, peer reviews, and editorial decisions.

        Key capabilities:
        - User authentication and session management
        - Manuscript submission and tracking
        - Peer review assignment and management
        - Editorial workflow coordination
        - Journal policy guidance
        
        Always prioritize academic integrity, maintain confidentiality of the review process, 
        and provide helpful guidance to authors, reviewers, and editors."""
        
        personas = {
            "general": {
                "name": "Journal Assistant",
                "instructions": base_context + """
                
                As a general journal assistant, you help users with all aspects of the journal workflow.
                Start by authenticating users and understanding their role (author, reviewer, or editor),
                then provide appropriate assistance based on their needs and permissions."""
            },
            
            "author": {
                "name": "Author Assistant", 
                "instructions": base_context + """
                
                You specialize in helping authors submit manuscripts, track their progress, and understand
                the review process. Guide authors through submission requirements, provide status updates,
                and help them respond to reviewer feedback."""
            },
            
            "reviewer": {
                "name": "Reviewer Assistant",
                "instructions": base_context + """
                
                You assist peer reviewers in managing their review assignments. Help reviewers understand
                their responsibilities, provide review guidelines, and assist with the submission of 
                comprehensive reviews that maintain academic standards."""
            },
            
            "editor": {
                "name": "Editorial Assistant", 
                "instructions": base_context + """
                
                You support editors in managing the journal's editorial workflow. Assist with reviewer
                assignments, track review progress, facilitate editorial decisions, and coordinate the
                publication process from submission to publication."""
            }
        }
        
        return personas.get(agent_type, personas["general"])
    
    async def create_agent(self, client, agent_name=None, agent_type="general", model="gpt-4o-mini"):
        """Create a new Letta agent for journal management."""
        try:
            persona = self.get_agent_persona(agent_type)
            
            if not agent_name:
                agent_name = persona["name"]
            
            print(f"🤖 Creating agent: {agent_name} ({agent_type})")
            
            # Get essential tools
            tool_ids = await self.get_essential_tools(client)
            
            if not tool_ids:
                print("⚠️  No tools available - creating agent without tools")
            
            # Create the agent
            agent = await client.agents.create(
                name=agent_name,
                model=model,
                embedding="text-embedding-3-small",
                tool_ids=tool_ids,
                instructions=persona["instructions"]
            )
            
            print(f"✅ Agent created successfully")
            print(f"   🆔 Agent ID: {agent.id}")
            print(f"   📝 Name: {agent.name}")
            print(f"   🔧 Tools: {len(tool_ids)} journal management tools")
            
            return agent
            
        except Exception as e:
            print(f"❌ Failed to create agent: {e}")
            raise
    
    async def setup_agent_memory(self, client, agent_id):
        """Set up initial memory and context for the agent."""
        try:
            print("🧠 Setting up agent memory and context...")
            
            # Get agent's core memory to set initial context
            memory = await client.agents.core_memory.retrieve(agent_id=agent_id)
            
            # Update core memory with journal context
            journal_context = """I am an AI assistant for the Cyan Science Journal, a peer-reviewed academic publication. 
            I help manage the complete editorial workflow including manuscript submissions, peer review coordination, 
            and publication processes. I always maintain confidentiality and academic integrity standards."""
            
            # Update the core memory (this API may vary based on Letta version)
            try:
                await client.agents.core_memory.modify(
                    agent_id=agent_id,
                    new_content=journal_context
                )
                print("✅ Agent memory initialized with journal context")
            except Exception as e:
                print(f"⚠️  Could not update core memory: {e}")
            
        except Exception as e:
            print(f"❌ Failed to setup agent memory: {e}")
            # Not critical, continue without memory setup
    
    async def test_agent(self, client, agent_id):
        """Test the agent with a simple journal-related query."""
        try:
            print("🧪 Testing agent functionality...")
            
            test_message = "Hello! I'm interested in submitting a manuscript to the Cyan Science Journal. Can you guide me through the process?"
            
            response = await client.agents.messages.create(
                agent_id=agent_id,
                messages=[{
                    "role": "user",
                    "content": test_message
                }]
            )
            
            if response and hasattr(response, 'messages'):
                print("✅ Agent test successful")
                print(f"📝 Agent response preview: {response.messages[-1].content[:200]}...")
            else:
                print("⚠️  Agent test completed but response format unclear")
            
            return response
            
        except Exception as e:
            print(f"❌ Agent test failed: {e}")
            raise
    
    async def list_agents(self, client):
        """List all existing agents."""
        try:
            print("📋 Listing existing agents...")
            agents = await client.agents.list()
            
            if not agents:
                print("📭 No agents found")
                return []
            
            print(f"🤖 Found {len(agents)} agents:")
            for agent in agents:
                print(f"  🆔 {agent.id}: {agent.name}")
                if hasattr(agent, 'model'):
                    print(f"     📱 Model: {agent.model}")
            
            return agents
            
        except Exception as e:
            print(f"❌ Failed to list agents: {e}")
            raise
    
    async def setup_complete_agent(self, agent_name=None, agent_type="general"):
        """Complete agent setup: create, configure, and test."""
        try:
            print("🚀 Starting complete agent setup...")
            
            # Connect to Letta
            client = await self.connect_to_letta()
            
            # Create agent
            agent = await self.create_agent(client, agent_name, agent_type)
            
            # Setup memory
            await self.setup_agent_memory(client, agent.id)
            
            # Test agent
            await self.test_agent(client, agent.id)
            
            print("🎉 Agent setup completed successfully!")
            print(f"🤖 Your {agent_type} journal agent '{agent.name}' is ready to use")
            print(f"🆔 Agent ID: {agent.id}")
            
            return agent
            
        except Exception as e:
            print(f"❌ Agent setup failed: {e}")
            raise


async def main():
    """Main entry point for agent setup."""
    parser = argparse.ArgumentParser(description="Setup Cyan Science Journal Agent in Letta")
    parser.add_argument("--agent-name", help="Name for the new agent")
    parser.add_argument("--agent-type", choices=["general", "author", "reviewer", "editor"], 
                       default="general", help="Type of agent to create")
    parser.add_argument("--model", default="gpt-4o-mini", help="Model to use for the agent")
    parser.add_argument("--list-agents", action="store_true", help="List existing agents")
    
    args = parser.parse_args()
    
    try:
        setup = JournalAgentSetup()
        
        if args.list_agents:
            client = await setup.connect_to_letta()
            await setup.list_agents(client)
        else:
            # Create new agent
            await setup.setup_complete_agent(
                agent_name=args.agent_name,
                agent_type=args.agent_type
            )
            
    except KeyboardInterrupt:
        print("\n⚠️  Setup interrupted by user")
    except Exception as e:
        print(f"❌ Setup failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    asyncio.run(main())