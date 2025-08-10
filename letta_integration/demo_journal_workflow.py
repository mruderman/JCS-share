#!/usr/bin/env python3
"""
Demonstration of Cyan Science Journal Workflow with Letta

This script demonstrates how a Letta agent would interact with the 
Cyan Science Journal MCP server to complete common journal workflows.
It shows the step-by-step process that would be automated by an AI agent.

Usage:
    python demo_journal_workflow.py
    python demo_journal_workflow.py --scenario author
    python demo_journal_workflow.py --scenario reviewer
    python demo_journal_workflow.py --scenario editor
"""

import os
import sys
import json
import asyncio
import argparse
from pathlib import Path
from dotenv import load_dotenv

# Add parent directory to path for imports
sys.path.insert(0, str(Path(__file__).parent.parent))

# Load environment variables
load_dotenv(Path(__file__).parent.parent / "mcp_server" / ".env")


class JournalWorkflowDemo:
    """Demonstrates journal workflows using MCP tools."""
    
    def __init__(self):
        """Initialize the demo."""
        self.mcp_server_url = f"http://{os.getenv('MCP_SERVER_HOST', '127.0.0.1')}:{os.getenv('MCP_SERVER_PORT', '3001')}{os.getenv('MCP_SERVER_PATH', '/mcp')}"
        self.auth_token = os.getenv("LETTA_MCP_AUTH_TOKEN")
        
        print("🎭 Cyan Science Journal Workflow Demonstration")
        print("=" * 50)
        print(f"🔗 MCP Server: {self.mcp_server_url}")
        print(f"🔑 Auth Token: {'✅ Available' if self.auth_token else '❌ Missing'}")
    
    def demonstrate_author_workflow(self):
        """Demonstrate typical author workflow."""
        print("\n👩‍🔬 Author Workflow Demonstration")
        print("-" * 30)
        
        steps = [
            {
                "step": 1,
                "title": "User Authentication", 
                "tool": "authenticate_user",
                "description": "Author logs into the journal system",
                "params": {
                    "email": "jane.researcher@university.edu",
                    "password": "secure_password"
                }
            },
            {
                "step": 2,
                "title": "Review Submission Guidelines",
                "tool": "get_submission_guidelines",
                "description": "Agent provides submission requirements and formatting guidelines",
                "params": {}
            },
            {
                "step": 3,
                "title": "Submit Manuscript",
                "tool": "submit_manuscript",
                "description": "Upload research paper with metadata",
                "params": {
                    "title": "Novel Approach to Machine Learning in Scientific Research",
                    "abstract": "This study presents a novel machine learning framework...",
                    "keywords": ["machine learning", "scientific research", "data analysis"],
                    "language": "en",
                    "file_data": "base64_encoded_pdf_content...",
                    "file_name": "ml_research_paper.pdf"
                }
            },
            {
                "step": 4,
                "title": "Track Submission Status",
                "tool": "check_manuscript_status",
                "description": "Monitor review progress and receive updates",
                "params": {
                    "manuscript_id": "ms_12345"
                }
            },
            {
                "step": 5,
                "title": "View My Manuscripts",
                "tool": "get_my_manuscripts", 
                "description": "See all submitted papers and their current status",
                "params": {}
            }
        ]
        
        self._display_workflow_steps(steps, "👩‍🔬 Author")
    
    def demonstrate_reviewer_workflow(self):
        """Demonstrate typical reviewer workflow.""" 
        print("\n🔍 Reviewer Workflow Demonstration")
        print("-" * 30)
        
        steps = [
            {
                "step": 1,
                "title": "Reviewer Authentication",
                "tool": "authenticate_user",
                "description": "Reviewer logs into the system",
                "params": {
                    "email": "prof.reviewer@institution.edu",
                    "password": "reviewer_password"
                }
            },
            {
                "step": 2,
                "title": "View Assigned Reviews",
                "tool": "get_assigned_reviews",
                "description": "Check manuscripts assigned for peer review",
                "params": {}
            },
            {
                "step": 3,
                "title": "Review Guidelines",
                "tool": "get_review_guidelines",
                "description": "Access evaluation criteria and best practices",
                "params": {}
            },
            {
                "step": 4,
                "title": "Download Manuscript",
                "tool": "download_manuscript_for_review",
                "description": "Access the paper for detailed review",
                "params": {
                    "review_id": "rev_67890"
                }
            },
            {
                "step": 5,
                "title": "Submit Review",
                "tool": "submit_review",
                "description": "Provide evaluation, score, and recommendation",
                "params": {
                    "review_id": "rev_67890",
                    "score": 8,
                    "comments": "Well-structured paper with novel contributions...",
                    "recommendation": "minor"
                }
            },
            {
                "step": 6,
                "title": "Review Statistics",
                "tool": "get_review_statistics",
                "description": "Track review performance and history",
                "params": {}
            }
        ]
        
        self._display_workflow_steps(steps, "🔍 Reviewer")
    
    def demonstrate_editor_workflow(self):
        """Demonstrate typical editor workflow."""
        print("\n✏️ Editor Workflow Demonstration") 
        print("-" * 30)
        
        steps = [
            {
                "step": 1,
                "title": "Editor Authentication",
                "tool": "authenticate_user",
                "description": "Editor accesses the editorial dashboard",
                "params": {
                    "email": "chief.editor@journal.org",
                    "password": "editor_password"
                }
            },
            {
                "step": 2,
                "title": "Editorial Dashboard",
                "tool": "get_editor_dashboard",
                "description": "Overview of manuscripts, reviews, and statistics",
                "params": {}
            },
            {
                "step": 3,
                "title": "View Available Reviewers",
                "tool": "get_available_reviewers", 
                "description": "Find qualified reviewers for manuscript assignment",
                "params": {}
            },
            {
                "step": 4,
                "title": "Assign Reviewer",
                "tool": "assign_reviewer_to_manuscript",
                "description": "Match expert reviewers to submitted manuscripts",
                "params": {
                    "manuscript_id": "ms_12345",
                    "reviewer_id": "reviewer_456",
                    "deadline_days": 21
                }
            },
            {
                "step": 5,
                "title": "Review Completed Reviews",
                "tool": "get_reviews_for_manuscript",
                "description": "Examine all peer reviews for a manuscript",
                "params": {
                    "manuscript_id": "ms_12345"
                }
            },
            {
                "step": 6,
                "title": "Make Editorial Decision",
                "tool": "make_editorial_decision",
                "description": "Final decision based on peer reviews",
                "params": {
                    "manuscript_id": "ms_12345",
                    "decision": "accept",
                    "comments": "Strong contribution, minor revisions addressed..."
                }
            },
            {
                "step": 7,
                "title": "Manage Proofing",
                "tool": "get_proofing_tasks",
                "description": "Coordinate final publication preparation",
                "params": {}
            },
            {
                "step": 8,
                "title": "Publish Article",
                "tool": "publish_article",
                "description": "Release accepted article to public",
                "params": {
                    "task_id": "proof_789",
                    "doi": "10.1000/journal.2025.001",
                    "volume": "15",
                    "issue": "3"
                }
            }
        ]
        
        self._display_workflow_steps(steps, "✏️ Editor")
    
    def demonstrate_letta_agent_interaction(self):
        """Show how a Letta agent would interact with these tools."""
        print("\n🤖 Letta Agent Interaction Demonstration")
        print("-" * 40)
        
        print("🎯 Scenario: AI agent helping an author submit a manuscript")
        print()
        
        conversation_flow = [
            {
                "role": "user",
                "message": "I want to submit my research paper to the Cyan Science Journal. Can you help me?"
            },
            {
                "role": "agent",
                "message": "I'd be happy to help you submit your manuscript! First, let me authenticate you with the journal system.",
                "tools_used": ["authenticate_user"],
                "reasoning": "Need to establish user identity and permissions before proceeding"
            },
            {
                "role": "agent", 
                "message": "Great! You're authenticated. Let me get the current submission guidelines for you.",
                "tools_used": ["get_submission_guidelines"],
                "reasoning": "Providing current requirements ensures compliance with journal standards"
            },
            {
                "role": "user",
                "message": "Perfect. My paper is about AI applications in climate research. It's a 15-page PDF."
            },
            {
                "role": "agent",
                "message": "Excellent topic! Based on the guidelines, your paper fits the research article category. Let me help you submit it now.",
                "tools_used": ["submit_manuscript"],
                "reasoning": "Using metadata provided to create proper submission entry"
            },
            {
                "role": "agent",
                "message": "Your manuscript has been submitted successfully! Here's your tracking ID: ms_98765. I'll check the status for you.",
                "tools_used": ["check_manuscript_status", "get_my_manuscripts"],
                "reasoning": "Providing immediate confirmation and status tracking"
            },
            {
                "role": "user",
                "message": "How long does the review process typically take?"
            },
            {
                "role": "agent",
                "message": "Based on the journal's process, initial editorial screening takes 1-2 weeks, peer review assignment 2-4 weeks, and review completion 4-6 weeks. I can check your status anytime - just ask!",
                "tools_used": [],
                "reasoning": "Drawing from submission guidelines and journal information resource"
            }
        ]
        
        for i, interaction in enumerate(conversation_flow, 1):
            if interaction["role"] == "user":
                print(f"👤 User: {interaction['message']}")
            else:
                print(f"🤖 Agent: {interaction['message']}")
                if interaction.get("tools_used"):
                    print(f"   🔧 Tools used: {', '.join(interaction['tools_used'])}")
                if interaction.get("reasoning"):
                    print(f"   💭 Reasoning: {interaction['reasoning']}")
            print()
    
    def _display_workflow_steps(self, steps, workflow_type):
        """Display workflow steps in a formatted manner."""
        print(f"\n{workflow_type} Workflow Steps:")
        
        for step in steps:
            print(f"\n{step['step']}. {step['title']}")
            print(f"   🔧 Tool: {step['tool']}")
            print(f"   📝 Description: {step['description']}")
            
            if step['params']:
                print(f"   ⚙️  Parameters:")
                for key, value in step['params'].items():
                    if isinstance(value, str) and len(value) > 50:
                        value = value[:47] + "..."
                    print(f"      {key}: {value}")
        
        print(f"\n✅ {workflow_type} workflow demonstrates {len(steps)} key interactions")
    
    def demonstrate_sequential_thinking_integration(self):
        """Show how sequential thinking would be used in complex workflows."""
        print("\n🧠 Sequential Thinking Integration")
        print("-" * 35)
        
        print("🎯 Scenario: AI agent planning a complex editorial decision")
        print()
        
        thinking_process = [
            {
                "thought": 1,
                "content": "I need to make an editorial decision on manuscript ms_12345. Let me gather all the information first."
            },
            {
                "thought": 2, 
                "content": "First, I should get the manuscript details and all completed reviews to understand the full context."
            },
            {
                "thought": 3,
                "content": "The reviews show scores of 8, 7, and 9 with recommendations of 'minor', 'minor', and 'accept'. This is very positive."
            },
            {
                "thought": 4,
                "content": "All reviewers noted the strong methodology and novel contributions. Minor concerns were about clarity in section 3."
            },
            {
                "thought": 5,
                "content": "Based on the consistently positive reviews and high scores, this merits acceptance with minor revisions."
            },
            {
                "thought": 6,
                "content": "I'll make the editorial decision for 'minor revisions' and provide specific guidance based on reviewer feedback."
            }
        ]
        
        print("🤖 Agent's Sequential Thinking Process:")
        for thought in thinking_process:
            print(f"   💭 Thought {thought['thought']}: {thought['content']}")
        
        print("\n🔧 Tools that would be used in this process:")
        tools_sequence = [
            "get_manuscript_details",
            "get_reviews_for_manuscript", 
            "make_editorial_decision"
        ]
        
        for i, tool in enumerate(tools_sequence, 1):
            print(f"   {i}. {tool}")
        
        print("\n✅ This demonstrates how AI agents use structured thinking to make informed decisions")
    
    def run_complete_demonstration(self, scenario=None):
        """Run the complete workflow demonstration."""
        print("🎬 Starting Complete Journal Workflow Demonstration")
        
        if scenario == "author" or scenario is None:
            self.demonstrate_author_workflow()
        
        if scenario == "reviewer" or scenario is None:
            self.demonstrate_reviewer_workflow()
        
        if scenario == "editor" or scenario is None:
            self.demonstrate_editor_workflow()
        
        if scenario is None:
            self.demonstrate_letta_agent_interaction()
            self.demonstrate_sequential_thinking_integration()
        
        print("\n" + "=" * 50)
        print("🎉 Demonstration Complete!")
        print()
        print("Key Benefits of Letta + MCP Integration:")
        print("✅ 47 specialized journal management tools")
        print("✅ Complete workflow automation")
        print("✅ Role-based access and permissions") 
        print("✅ Intelligent decision support")
        print("✅ Streamlined peer review process")
        print("✅ Real-time status tracking")
        print()
        print("🚀 Ready for production use with self-hosted Letta server!")


def main():
    """Main entry point for the demonstration."""
    parser = argparse.ArgumentParser(description="Demonstrate Journal Workflows")
    parser.add_argument("--scenario", choices=["author", "reviewer", "editor"], 
                       help="Demonstrate specific workflow")
    
    args = parser.parse_args()
    
    try:
        demo = JournalWorkflowDemo()
        demo.run_complete_demonstration(args.scenario)
        
    except KeyboardInterrupt:
        print("\n⚠️  Demonstration interrupted by user")
    except Exception as e:
        print(f"❌ Demonstration failed: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()