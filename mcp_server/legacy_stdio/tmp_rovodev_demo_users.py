#!/usr/bin/env python3
"""
Demo user creation script for Cyan Science Journal.
Creates test users for different roles (author, reviewer, editor).
"""

import asyncio
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv()

from tools.auth import create_user_account, authenticate_user


# Demo users to create
DEMO_USERS = [
    {
        "email": "author@demo.com",
        "password": "demo123",
        "name": "Dr. Alice Author",
        "roles": ["author"]
    },
    {
        "email": "reviewer@demo.com", 
        "password": "demo123",
        "name": "Dr. Bob Reviewer",
        "roles": ["reviewer", "author"]
    },
    {
        "email": "editor@demo.com",
        "password": "demo123", 
        "name": "Dr. Carol Editor",
        "roles": ["editor", "reviewer", "author"]
    },
    {
        "email": "admin@demo.com",
        "password": "demo123",
        "name": "Dr. David Admin", 
        "roles": ["admin", "editor", "reviewer", "author"]
    }
]


async def create_demo_user(user_data):
    """Create a single demo user."""
    try:
        print(f"Creating user: {user_data['name']} ({user_data['email']})")
        
        result = await create_user_account(
            email=user_data['email'],
            password=user_data['password'],
            name=user_data['name'],
            roles=user_data['roles']
        )
        
        print(f"   ✅ Created successfully!")
        print(f"   User ID: {result.get('user_id', 'N/A')}")
        print(f"   Roles: {result.get('roles', [])}")
        
        # Test authentication
        print(f"   🔍 Testing authentication...")
        auth_result = await authenticate_user(user_data['email'], user_data['password'])
        print(f"   ✅ Authentication successful!")
        
        return True
        
    except Exception as e:
        error_msg = str(e)
        if "already exists" in error_msg.lower():
            print(f"   ⚠️  User already exists, testing authentication...")
            try:
                auth_result = await authenticate_user(user_data['email'], user_data['password'])
                print(f"   ✅ Existing user authentication successful!")
                return True
            except Exception as auth_e:
                print(f"   ❌ Authentication failed: {str(auth_e)}")
                return False
        else:
            print(f"   ❌ Creation failed: {error_msg}")
            return False


async def create_all_demo_users():
    """Create all demo users."""
    print("👥 Creating Demo Users for Cyan Science Journal")
    print("=" * 60)
    
    success_count = 0
    
    for i, user_data in enumerate(DEMO_USERS, 1):
        print(f"\n{i}. {user_data['name']}")
        print(f"   Email: {user_data['email']}")
        print(f"   Roles: {', '.join(user_data['roles'])}")
        
        if await create_demo_user(user_data):
            success_count += 1
    
    print(f"\n📊 Summary:")
    print(f"   Successfully created/verified: {success_count}/{len(DEMO_USERS)} users")
    
    if success_count > 0:
        print(f"\n🎉 Demo users are ready!")
        print(f"\n📋 Login Credentials:")
        for user in DEMO_USERS:
            print(f"   {user['name']}: {user['email']} / {user['password']}")
    
    return success_count


async def test_demo_users():
    """Test all demo users can authenticate."""
    print("\n🧪 Testing Demo User Authentication")
    print("=" * 60)
    
    for user_data in DEMO_USERS:
        try:
            print(f"\nTesting: {user_data['name']} ({user_data['email']})")
            
            auth_result = await authenticate_user(user_data['email'], user_data['password'])
            
            print(f"   ✅ Authentication successful!")
            print(f"   Token: {auth_result['auth_token'][:20]}...")
            print(f"   Roles: {auth_result['user']['roles']}")
            
        except Exception as e:
            print(f"   ❌ Authentication failed: {str(e)}")


def print_mcp_client_config():
    """Print MCP client configuration examples."""
    print("\n🔧 MCP Client Configuration")
    print("=" * 60)
    
    print("\n1. Claude Desktop Configuration (claude_desktop_config.json):")
    print("""
{
  "mcpServers": {
    "cyan-science-journal": {
      "command": "python",
      "args": ["/path/to/your/project/main.py"],
      "env": {
        "CONVEX_URL": "https://your-deployment.convex.cloud"
      }
    }
  }
}
""")
    
    print("\n2. VS Code MCP Extension Configuration:")
    print("""
{
  "name": "Cyan Science Journal",
  "command": "python",
  "args": ["/path/to/your/project/main.py"],
  "env": {
    "CONVEX_URL": "https://your-deployment.convex.cloud"
  }
}
""")
    
    print("\n3. Environment Variables (.env file):")
    print("""
CONVEX_URL=https://your-deployment.convex.cloud
MCP_SERVER_PORT=3001
SESSION_TIMEOUT=86400
LOG_LEVEL=INFO
""")


def print_usage_examples():
    """Print usage examples for the demo users."""
    print("\n📖 Usage Examples")
    print("=" * 60)
    
    print("\n1. Author Workflow:")
    print("""
# Authenticate as author
auth = await authenticate_user("author@demo.com", "demo123")
token = auth["auth_token"]

# Submit manuscript
result = await submit_manuscript(
    auth_token=token,
    title="My Research Paper",
    abstract="This paper presents...",
    keywords=["research", "science"],
    language="en",
    file_data="<base64-encoded-pdf>",
    file_name="paper.pdf"
)

# Check manuscripts
manuscripts = await get_my_manuscripts(auth_token=token)
""")
    
    print("\n2. Reviewer Workflow:")
    print("""
# Authenticate as reviewer  
auth = await authenticate_user("reviewer@demo.com", "demo123")
token = auth["auth_token"]

# Get assigned reviews
reviews = await get_assigned_reviews(auth_token=token)

# Submit review
result = await submit_review(
    auth_token=token,
    review_id="review_123",
    score=8,
    comments="This paper is well written...",
    recommendation="accept"
)
""")
    
    print("\n3. Editor Workflow:")
    print("""
# Authenticate as editor
auth = await authenticate_user("editor@demo.com", "demo123") 
token = auth["auth_token"]

# Get manuscripts for review
manuscripts = await get_manuscripts_for_editor(auth_token=token)

# Assign reviewer
result = await assign_reviewer_to_manuscript(
    auth_token=token,
    manuscript_id="ms_123",
    reviewer_id="reviewer_456"
)

# Make editorial decision
decision = await make_editorial_decision(
    auth_token=token,
    manuscript_id="ms_123", 
    decision="accept",
    comments="Excellent work!"
)
""")


async def main():
    """Main function."""
    print("🚀 Cyan Science Journal - Demo User Setup")
    print("=" * 60)
    
    print("\n📋 This script will:")
    print("   1. Create demo users with different roles")
    print("   2. Test authentication for each user")
    print("   3. Provide MCP client configuration examples")
    print("   4. Show usage examples")
    
    proceed = input("\nProceed with demo user creation? (y/n): ").strip().lower()
    
    if proceed != 'y':
        print("Demo user creation cancelled.")
        return
    
    # Create demo users
    success_count = await create_all_demo_users()
    
    if success_count > 0:
        # Test authentication
        await test_demo_users()
        
        # Print configuration examples
        print_mcp_client_config()
        
        # Print usage examples
        print_usage_examples()
        
        print(f"\n🎯 Next Steps:")
        print(f"   1. Configure your MCP client using the examples above")
        print(f"   2. Test authentication with demo credentials")
        print(f"   3. Try submitting a manuscript as author@demo.com")
        print(f"   4. Test reviewer workflow as reviewer@demo.com")
        print(f"   5. Test editor workflow as editor@demo.com")
    
    else:
        print(f"\n❌ No demo users were created successfully.")
        print(f"   Please check your Convex backend connection and try again.")


if __name__ == "__main__":
    asyncio.run(main())