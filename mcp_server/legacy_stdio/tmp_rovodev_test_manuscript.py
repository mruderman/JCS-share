#!/usr/bin/env python3
"""
Test manuscript submission workflow for Cyan Science Journal MCP Server.
Tests the complete author workflow from authentication to manuscript submission.
"""

import asyncio
import base64
import sys
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

from dotenv import load_dotenv
load_dotenv()

from tools.auth import authenticate_user
from tools.author import submit_manuscript, get_my_manuscripts, check_manuscript_status


def create_sample_pdf_content():
    """Create a sample PDF content for testing (base64 encoded)."""
    # This is a minimal PDF content for testing
    # In real usage, you'd read an actual PDF file
    sample_pdf = b"""%PDF-1.4
1 0 obj
<<
/Type /Catalog
/Pages 2 0 R
>>
endobj

2 0 obj
<<
/Type /Pages
/Kids [3 0 R]
/Count 1
>>
endobj

3 0 obj
<<
/Type /Page
/Parent 2 0 R
/MediaBox [0 0 612 792]
/Contents 4 0 R
>>
endobj

4 0 obj
<<
/Length 44
>>
stream
BT
/F1 12 Tf
72 720 Td
(Sample Research Paper) Tj
ET
endstream
endobj

xref
0 5
0000000000 65535 f 
0000000009 00000 n 
0000000058 00000 n 
0000000115 00000 n 
0000000206 00000 n 
trailer
<<
/Size 5
/Root 1 0 R
>>
startxref
300
%%EOF"""
    
    return base64.b64encode(sample_pdf).decode('utf-8')


async def test_manuscript_submission():
    """Test the complete manuscript submission workflow."""
    print("📄 Testing Manuscript Submission Workflow")
    print("=" * 60)
    
    # Demo author credentials
    author_email = "author@demo.com"
    author_password = "demo123"
    
    try:
        # Step 1: Authenticate
        print("1. Authenticating author...")
        auth_result = await authenticate_user(author_email, author_password)
        print(f"   ✅ Authenticated: {auth_result['user']['name']}")
        print(f"   Roles: {auth_result['user']['roles']}")
        
        auth_token = auth_result['auth_token']
        
        # Step 2: Check existing manuscripts
        print("\n2. Checking existing manuscripts...")
        manuscripts_result = await get_my_manuscripts(auth_token)
        print(f"   📚 Current manuscript count: {manuscripts_result['total_count']}")
        
        # Step 3: Prepare manuscript data
        print("\n3. Preparing manuscript data...")
        manuscript_data = {
            "title": "Advanced Machine Learning Techniques for Scientific Research",
            "abstract": """This paper presents novel machine learning approaches for analyzing 
scientific data. We introduce a new algorithm that combines deep learning with traditional 
statistical methods to improve accuracy in scientific predictions. Our experiments show 
significant improvements over existing methods.""",
            "keywords": ["machine learning", "deep learning", "scientific research", "data analysis"],
            "language": "en",
            "file_data": create_sample_pdf_content(),
            "file_name": "ml_research_paper.pdf",
            "content_type": "application/pdf"
        }
        
        print(f"   📝 Title: {manuscript_data['title']}")
        print(f"   📄 File: {manuscript_data['file_name']}")
        print(f"   🔤 Keywords: {', '.join(manuscript_data['keywords'])}")
        
        # Step 4: Submit manuscript
        print("\n4. Submitting manuscript...")
        submission_result = await submit_manuscript(
            auth_token=auth_token,
            **manuscript_data
        )
        
        print(f"   ✅ Submission successful!")
        print(f"   📋 Manuscript ID: {submission_result['manuscript_id']}")
        print(f"   📅 Status: {submission_result['status']}")
        
        manuscript_id = submission_result['manuscript_id']
        
        # Step 5: Check manuscript status
        print("\n5. Checking manuscript status...")
        status_result = await check_manuscript_status(manuscript_id, auth_token)
        
        print(f"   📊 Status: {status_result['status']}")
        print(f"   📝 Description: {status_result['description']}")
        print(f"   ✏️  Can edit: {status_result['can_edit']}")
        print(f"   🗑️  Can withdraw: {status_result['can_withdraw']}")
        
        # Step 6: Check updated manuscript list
        print("\n6. Checking updated manuscript list...")
        updated_manuscripts = await get_my_manuscripts(auth_token)
        print(f"   📚 Total manuscripts: {updated_manuscripts['total_count']}")
        
        if updated_manuscripts['manuscripts']:
            print(f"   📄 Recent manuscripts:")
            for ms in updated_manuscripts['manuscripts'][-3:]:  # Show last 3
                print(f"      - {ms.get('title', 'Untitled')} ({ms.get('status', 'unknown')})")
        
        print(f"\n🎉 Manuscript submission workflow completed successfully!")
        return manuscript_id
        
    except Exception as e:
        print(f"❌ Manuscript submission failed: {str(e)}")
        return None


async def test_with_real_file():
    """Test manuscript submission with a real PDF file."""
    print("\n📁 Testing with Real PDF File")
    print("=" * 60)
    
    # Ask user for PDF file
    pdf_path = input("Enter path to PDF file (or press Enter to skip): ").strip()
    
    if not pdf_path:
        print("Skipping real file test.")
        return
    
    pdf_file = Path(pdf_path)
    if not pdf_file.exists():
        print(f"❌ File not found: {pdf_path}")
        return
    
    if not pdf_file.suffix.lower() == '.pdf':
        print(f"❌ File must be a PDF: {pdf_path}")
        return
    
    try:
        # Read and encode file
        print(f"📖 Reading file: {pdf_file.name}")
        with open(pdf_file, 'rb') as f:
            file_content = f.read()
        
        file_data = base64.b64encode(file_content).decode('utf-8')
        file_size_mb = len(file_content) / (1024 * 1024)
        
        print(f"   📏 File size: {file_size_mb:.2f} MB")
        
        if file_size_mb > 10:
            print(f"⚠️  Warning: File is larger than 10MB limit")
            proceed = input("Proceed anyway? (y/n): ").strip().lower()
            if proceed != 'y':
                return
        
        # Get manuscript details
        title = input("Enter manuscript title: ").strip()
        abstract = input("Enter abstract: ").strip()
        keywords_str = input("Enter keywords (comma-separated): ").strip()
        keywords = [k.strip() for k in keywords_str.split(',') if k.strip()]
        
        # Authenticate
        author_email = input("Enter author email: ").strip()
        author_password = input("Enter author password: ").strip()
        
        print(f"\n🔐 Authenticating...")
        auth_result = await authenticate_user(author_email, author_password)
        auth_token = auth_result['auth_token']
        
        # Submit manuscript
        print(f"📤 Submitting manuscript...")
        result = await submit_manuscript(
            auth_token=auth_token,
            title=title,
            abstract=abstract,
            keywords=keywords,
            language="en",
            file_data=file_data,
            file_name=pdf_file.name,
            content_type="application/pdf"
        )
        
        print(f"✅ Real file submission successful!")
        print(f"   📋 Manuscript ID: {result['manuscript_id']}")
        
    except Exception as e:
        print(f"❌ Real file submission failed: {str(e)}")


def print_claude_desktop_config():
    """Print Claude Desktop configuration."""
    print("\n🤖 Claude Desktop Configuration")
    print("=" * 60)
    
    current_dir = Path(__file__).parent.absolute()
    
    config = f'''{{
  "mcpServers": {{
    "cyan-science-journal": {{
      "command": "python",
      "args": ["{current_dir}/main.py"],
      "env": {{
        "CONVEX_URL": "https://your-deployment.convex.cloud"
      }}
    }}
  }}
}}'''
    
    print("Add this to your Claude Desktop configuration file:")
    print("(Usually located at ~/.claude/claude_desktop_config.json)")
    print()
    print(config)
    
    print(f"\n💡 Steps to configure Claude Desktop:")
    print(f"   1. Open Claude Desktop")
    print(f"   2. Go to Settings > Developer")
    print(f"   3. Edit the MCP configuration file")
    print(f"   4. Add the configuration above")
    print(f"   5. Update CONVEX_URL with your actual deployment URL")
    print(f"   6. Restart Claude Desktop")


def print_usage_in_claude():
    """Print usage examples for Claude."""
    print("\n💬 Using in Claude Desktop")
    print("=" * 60)
    
    print("Once configured, you can use these commands in Claude:")
    print()
    print("1. Authenticate:")
    print('   "Please authenticate me with email author@demo.com and password demo123"')
    print()
    print("2. Check manuscripts:")
    print('   "Show me my manuscripts"')
    print()
    print("3. Submit manuscript:")
    print('   "Help me submit a new manuscript titled \'My Research\' with abstract \'...\'"')
    print()
    print("4. Check status:")
    print('   "What is the status of manuscript ID xyz123?"')


async def main():
    """Main test function."""
    print("🚀 Cyan Science Journal - Manuscript Submission Test")
    print("=" * 60)
    
    print("\n📋 Test Options:")
    print("1. Test with sample PDF (automated)")
    print("2. Test with real PDF file (interactive)")
    print("3. Show Claude Desktop configuration")
    print("4. All of the above")
    
    choice = input("\nChoose option (1-4): ").strip()
    
    if choice in ["1", "4"]:
        manuscript_id = await test_manuscript_submission()
        
    if choice in ["2", "4"]:
        await test_with_real_file()
        
    if choice in ["3", "4"]:
        print_claude_desktop_config()
        print_usage_in_claude()
    
    print(f"\n🎯 Next Steps:")
    print(f"   1. Configure your MCP client (Claude Desktop, VS Code, etc.)")
    print(f"   2. Test authentication with demo users")
    print(f"   3. Try the complete manuscript workflow")
    print(f"   4. Test reviewer and editor workflows")


if __name__ == "__main__":
    asyncio.run(main())