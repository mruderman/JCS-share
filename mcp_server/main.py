"""
Main FastMCP server for Cyan Science Journal.
Provides comprehensive MCP tools for peer review system interaction.
"""

import os
import sys
import asyncio
from pathlib import Path
from dotenv import load_dotenv
from fastmcp import FastMCP

# Add project root to path
project_root = Path(__file__).parent
sys.path.insert(0, str(project_root))

# Load environment variables
load_dotenv()

# Import all tool modules
from tools import auth
from tools import author
from tools import reviewer
from tools import editor
from utils.convex_client import cleanup_convex_client
from utils.security import security_config, validate_auth_token, sanitize_input, require_rate_limit, validate_file_upload

# Create FastMCP server
mcp = FastMCP("Cyan Science Journal MCP Server")

# =============================================================================
# AUTHENTICATION TOOLS
# =============================================================================

@mcp.tool()
@require_rate_limit()
async def authenticate_user(email: str, password: str) -> dict:
    """
    Authenticate user with email and password.
    
    Args:
        email: User's email address
        password: User's password
        
    Returns:
        Authentication result with user data and token
    """
    try:
        # Sanitize inputs
        email = sanitize_input(email, max_length=255)
        password = sanitize_input(password, max_length=128)
        
        return await auth.authenticate_user(email, password)
    except ValueError as e:
        return {"success": False, "error": f"Invalid input: {str(e)}"}

@mcp.tool()
async def get_current_user(auth_token: str) -> dict:
    """
    Get current authenticated user information.
    
    Args:
        auth_token: Authentication token from login
        
    Returns:
        Current user data including roles and permissions
    """
    try:
        # Validate auth token format
        validate_auth_token(auth_token)
        
        return await auth.get_current_user(auth_token)
    except ValueError as e:
        return {"success": False, "error": f"Invalid token: {str(e)}"}

@mcp.tool()
async def logout_user(auth_token: str) -> dict:
    """
    Logout user and invalidate authentication session.
    
    Args:
        auth_token: Authentication token to invalidate
        
    Returns:
        Logout confirmation
    """
    return await auth.logout_user(auth_token)

@mcp.tool()
async def refresh_session(auth_token: str) -> dict:
    """
    Refresh user session with updated data from backend.
    
    Args:
        auth_token: Current authentication token
        
    Returns:
        Refreshed session data
    """
    return await auth.refresh_session(auth_token)

@mcp.tool()
async def check_permissions(auth_token: str, required_roles: list) -> dict:
    """
    Check if authenticated user has required permissions.
    
    Args:
        auth_token: Authentication token
        required_roles: List of roles required for access
        
    Returns:
        Permission check result
    """
    return await auth.check_permissions(auth_token, required_roles)

@mcp.tool()
async def create_user_account(email: str, password: str, name: str, roles: list = None) -> dict:
    """
    Create new user account in the system.
    
    Args:
        email: User's email address
        password: User's password
        name: User's full name
        roles: List of roles to assign (optional, defaults to ["author"])
        
    Returns:
        Account creation result
    """
    return await auth.create_user_account(email, password, name, roles)

@mcp.tool()
async def request_role_elevation(auth_token: str, requested_role: str, reason: str) -> dict:
    """
    Request elevation to reviewer or editor role.
    
    Args:
        auth_token: Authentication token
        requested_role: Role being requested (reviewer/editor)
        reason: Justification for role request
        
    Returns:
        Role request submission result
    """
    return await auth.request_role_elevation(auth_token, requested_role, reason)

@mcp.tool()
async def get_session_info(auth_token: str) -> dict:
    """
    Get detailed session information for authenticated user.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        Detailed session information
    """
    return await auth.get_session_info(auth_token)

@mcp.tool()
async def validate_token(auth_token: str) -> dict:
    """
    Validate authentication token.
    
    Args:
        auth_token: Token to validate
        
    Returns:
        Token validation result
    """
    return await auth.validate_token(auth_token)

# =============================================================================
# AUTHOR TOOLS
# =============================================================================

@mcp.tool()
@require_rate_limit()
async def submit_manuscript(
    auth_token: str,
    title: str,
    abstract: str,
    keywords: list,
    language: str,
    file_data: str,
    file_name: str,
    content_type: str = "application/pdf"
) -> dict:
    """
    Submit a new manuscript for peer review.
    
    Args:
        auth_token: Authentication token
        title: Manuscript title
        abstract: Manuscript abstract
        keywords: List of keywords
        language: Manuscript language
        file_data: Base64 encoded file content
        file_name: Original file name
        content_type: MIME type of the file
        
    Returns:
        Submission result with manuscript ID
    """
    try:
        # Validate authentication token
        validate_auth_token(auth_token)
        
        # Sanitize text inputs
        title = sanitize_input(title, max_length=500)
        abstract = sanitize_input(abstract, max_length=5000)
        language = sanitize_input(language, max_length=10)
        
        # Validate file upload
        validate_file_upload(file_data, file_name, content_type)
        
        return await author.submit_manuscript(
            title, abstract, keywords, language, file_data, file_name, content_type, auth_token
        )
    except ValueError as e:
        return {"success": False, "error": f"Validation failed: {str(e)}"}

@mcp.tool()
async def get_my_manuscripts(auth_token: str) -> dict:
    """
    Get all manuscripts submitted by the current author.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        List of author's manuscripts
    """
    return await author.get_my_manuscripts(auth_token)

@mcp.tool()
async def get_manuscript_details(auth_token: str, manuscript_id: str) -> dict:
    """
    Get detailed information about a specific manuscript.
    
    Args:
        auth_token: Authentication token
        manuscript_id: ID of the manuscript
        
    Returns:
        Detailed manuscript information
    """
    return await author.get_manuscript_details(manuscript_id, auth_token)

@mcp.tool()
async def check_manuscript_status(auth_token: str, manuscript_id: str) -> dict:
    """
    Check the current status of a manuscript.
    
    Args:
        auth_token: Authentication token
        manuscript_id: ID of the manuscript
        
    Returns:
        Current status and description
    """
    return await author.check_manuscript_status(manuscript_id, auth_token)

@mcp.tool()
async def download_manuscript_file(auth_token: str, manuscript_id: str) -> dict:
    """
    Get download URL for manuscript file.
    
    Args:
        auth_token: Authentication token
        manuscript_id: ID of the manuscript
        
    Returns:
        File download information
    """
    return await author.download_manuscript_file(manuscript_id, auth_token)

# =============================================================================
# REVIEWER TOOLS
# =============================================================================

@mcp.tool()
async def get_reviewer_dashboard(auth_token: str) -> dict:
    """
    Get reviewer dashboard with assigned reviews and statistics.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        Dashboard data with reviews and stats
    """
    return await reviewer.get_reviewer_dashboard(auth_token)

@mcp.tool()
async def get_assigned_reviews(auth_token: str) -> dict:
    """
    Get all reviews assigned to the current reviewer.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        List of assigned reviews
    """
    return await reviewer.get_assigned_reviews(auth_token)

@mcp.tool()
async def get_review_details(auth_token: str, review_id: str) -> dict:
    """
    Get details of a specific review assignment.
    
    Args:
        auth_token: Authentication token
        review_id: ID of the review
        
    Returns:
        Review and manuscript details
    """
    return await reviewer.get_review_details(review_id, auth_token)

@mcp.tool()
async def get_pending_reviews(auth_token: str) -> dict:
    """
    Get all pending reviews for the current reviewer.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        List of pending reviews
    """
    return await reviewer.get_pending_reviews(auth_token)

@mcp.tool()
async def get_completed_reviews(auth_token: str) -> dict:
    """
    Get all completed reviews for the current reviewer.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        List of completed reviews
    """
    return await reviewer.get_completed_reviews(auth_token)

@mcp.tool()
async def get_overdue_reviews(auth_token: str) -> dict:
    """
    Get all overdue reviews for the current reviewer.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        List of overdue reviews
    """
    return await reviewer.get_overdue_reviews(auth_token)

@mcp.tool()
async def submit_review(
    auth_token: str,
    review_id: str,
    score: int,
    comments: str,
    recommendation: str
) -> dict:
    """
    Submit a peer review for an assigned manuscript.
    
    Args:
        auth_token: Authentication token
        review_id: ID of the review
        score: Review score (1-10)
        comments: Review comments in Markdown
        recommendation: accept, minor, major, or reject
        
    Returns:
        Submission result
    """
    return await reviewer.submit_review(review_id, score, comments, recommendation, auth_token)

@mcp.tool()
async def get_review_history(auth_token: str) -> dict:
    """
    Get the reviewer's complete review history.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        Complete review history
    """
    return await reviewer.get_review_history(auth_token)

@mcp.tool()
async def get_review_statistics(auth_token: str) -> dict:
    """
    Get reviewer's performance statistics.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        Performance statistics
    """
    return await reviewer.get_review_statistics(auth_token)

@mcp.tool()
async def download_manuscript_for_review(auth_token: str, review_id: str) -> dict:
    """
    Get download URL for a manuscript under review.
    
    Args:
        auth_token: Authentication token
        review_id: ID of the review
        
    Returns:
        Download URL and manuscript info
    """
    return await reviewer.download_manuscript(review_id, auth_token)

@mcp.tool()
async def get_review_guidelines() -> dict:
    """
    Get peer review guidelines and best practices.
    
    Returns:
        Comprehensive review guidelines
    """
    return await reviewer.get_review_guidelines()

# =============================================================================
# EDITOR TOOLS
# =============================================================================

@mcp.tool()
async def get_editor_dashboard(auth_token: str) -> dict:
    """
    Get editor dashboard with manuscripts, reviews, and statistics.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        Dashboard data with editorial overview
    """
    return await editor.get_editor_dashboard(auth_token)

@mcp.tool()
async def get_manuscripts_for_editor(auth_token: str) -> dict:
    """
    Get manuscripts assigned to current editor.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        List of manuscripts in editorial workflow
    """
    return await editor.get_manuscripts_for_editor(auth_token)

@mcp.tool()
async def assign_reviewer_to_manuscript(
    auth_token: str,
    manuscript_id: str,
    reviewer_id: str,
    deadline_days: int = 14
) -> dict:
    """
    Assign a reviewer to a manuscript.
    
    Args:
        auth_token: Authentication token
        manuscript_id: ID of the manuscript
        reviewer_id: ID of the reviewer
        deadline_days: Review deadline in days (default: 14)
        
    Returns:
        Assignment result
    """
    return await editor.assign_reviewer_to_manuscript(manuscript_id, reviewer_id, deadline_days, auth_token)

@mcp.tool()
async def remove_reviewer_from_manuscript(
    auth_token: str,
    review_id: str,
    reason: str = None
) -> dict:
    """
    Remove a reviewer from a manuscript.
    
    Args:
        auth_token: Authentication token
        review_id: ID of the review assignment
        reason: Reason for removal (optional)
        
    Returns:
        Removal result
    """
    return await editor.remove_reviewer_from_manuscript(review_id, reason, auth_token)

@mcp.tool()
async def get_available_reviewers(auth_token: str) -> dict:
    """
    Get list of available reviewers for assignment.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        List of reviewers with their expertise and availability
    """
    return await editor.get_available_reviewers(auth_token)

@mcp.tool()
async def get_reviews_for_manuscript(
    auth_token: str,
    manuscript_id: str
) -> dict:
    """
    Get all reviews for a specific manuscript.
    
    Args:
        auth_token: Authentication token
        manuscript_id: ID of the manuscript
        
    Returns:
        List of reviews with details
    """
    return await editor.get_reviews_for_manuscript(manuscript_id, auth_token)

@mcp.tool()
async def make_editorial_decision(
    auth_token: str,
    manuscript_id: str,
    decision: str,
    comments: str = None
) -> dict:
    """
    Make final editorial decision on a manuscript.
    
    Args:
        auth_token: Authentication token
        manuscript_id: ID of the manuscript
        decision: Editorial decision (proofing, minorRevisions, majorRevisions, reject)
        comments: Editorial comments (optional)
        
    Returns:
        Decision result
    """
    return await editor.make_editorial_decision(manuscript_id, decision, comments, auth_token)

@mcp.tool()
async def get_proofing_tasks(auth_token: str) -> dict:
    """
    Get proofing tasks for manuscripts accepted for publication.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        List of proofing tasks
    """
    return await editor.get_proofing_tasks(auth_token)

@mcp.tool()
async def get_proofing_task_details(
    auth_token: str,
    task_id: str
) -> dict:
    """
    Get details of a specific proofing task.
    
    Args:
        auth_token: Authentication token
        task_id: ID of the proofing task
        
    Returns:
        Proofing task details
    """
    return await editor.get_proofing_task_details(task_id, auth_token)

@mcp.tool()
async def upload_proofed_manuscript(
    auth_token: str,
    task_id: str,
    file_data: str,
    file_name: str,
    proofing_notes: str = None,
    content_type: str = "application/pdf"
) -> dict:
    """
    Upload proofed manuscript file.
    
    Args:
        auth_token: Authentication token
        task_id: ID of the proofing task
        file_data: Base64 encoded file content
        file_name: Original file name
        proofing_notes: Notes about the proofing process (optional)
        content_type: MIME type of the file
        
    Returns:
        Upload result
    """
    return await editor.upload_proofed_manuscript(task_id, file_data, file_name, proofing_notes, content_type, auth_token)

@mcp.tool()
async def publish_article(
    auth_token: str,
    task_id: str,
    doi: str = None,
    volume: str = None,
    issue: str = None,
    page_numbers: str = None
) -> dict:
    """
    Publish article from completed proofing task.
    
    Args:
        auth_token: Authentication token
        task_id: ID of the proofing task
        doi: DOI for the article (optional)
        volume: Volume number (optional)
        issue: Issue number (optional)
        page_numbers: Page numbers (optional)
        
    Returns:
        Publication result
    """
    return await editor.publish_article(task_id, doi, volume, issue, page_numbers, auth_token)

@mcp.tool()
async def get_published_articles(auth_token: str) -> dict:
    """
    Get list of published articles.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        List of published articles
    """
    return await editor.get_published_articles(auth_token)

@mcp.tool()
async def get_editorial_statistics(auth_token: str) -> dict:
    """
    Get editorial statistics and performance metrics.
    
    Args:
        auth_token: Authentication token
        
    Returns:
        Editorial statistics
    """
    return await editor.get_editorial_statistics(auth_token)

@mcp.tool()
async def get_editorial_guidelines() -> dict:
    """
    Get editorial guidelines and best practices.
    
    Returns:
        Comprehensive editorial guidelines
    """
    return await editor.get_editorial_guidelines()

# =============================================================================
# RESOURCES
# =============================================================================

@mcp.resource("resource://journal/info")
def get_journal_info() -> str:
    """Provides information about the Cyan Science Journal."""
    return """
# Cyan Science Journal

A peer-reviewed open access journal focused on advancing scientific knowledge and research excellence.

## Submission Guidelines
- Original research articles
- Review articles
- Short communications
- Technical notes

## Review Process
- Double-blind peer review
- Editorial oversight
- Quality assurance
- Open access publishing

## Contact
- Email: editor@cyansciencejournal.org
- Website: https://cyansciencejournal.org
"""

@mcp.resource("resource://submission/guidelines")
def get_submission_guidelines() -> str:
    """Provides manuscript submission guidelines."""
    return """
# Manuscript Submission Guidelines

## Manuscript Types
1. **Research Articles**: Original research findings (max 8,000 words)
2. **Review Articles**: Comprehensive reviews (max 10,000 words)  
3. **Short Communications**: Brief reports (max 3,000 words)
4. **Technical Notes**: Methodological advances (max 2,000 words)

## Format Requirements
- PDF format
- Double-spaced text
- 12-point font (Times New Roman recommended)
- Line numbers included
- Figures and tables embedded or separate files

## Required Sections
1. Title page with author information
2. Abstract (max 250 words)
3. Keywords (3-6 terms)
4. Introduction
5. Methods
6. Results
7. Discussion
8. Conclusions
9. References
10. Acknowledgments (if applicable)

## Review Process
- Initial editorial screening (1-2 weeks)
- Peer review assignment (2-4 weeks)
- Review completion (4-6 weeks)
- Editorial decision (1-2 weeks)
- Revision cycle if needed
- Final acceptance and publication

## Ethical Guidelines
- Original work only
- Proper attribution and citations
- No duplicate submissions
- Conflict of interest disclosure
- Research ethics approval when applicable
"""

@mcp.resource("resource://review/criteria")
def get_review_criteria() -> str:
    """Provides peer review evaluation criteria."""
    return """
# Peer Review Evaluation Criteria

## Overall Quality Assessment (1-10 scale)
Rate the manuscript on the following criteria:

### 1. Scientific Merit (Weight: 30%)
- Novelty and significance of findings
- Advancement of knowledge in the field
- Theoretical or practical implications

### 2. Methodology (Weight: 25%)
- Appropriateness of research design
- Statistical analysis validity
- Experimental controls and procedures
- Data collection methods

### 3. Clarity and Organization (Weight: 20%)
- Logical flow and structure
- Writing quality and grammar
- Figure and table clarity
- Abstract accuracy

### 4. Literature Review (Weight: 15%)
- Comprehensive coverage of relevant work
- Proper citation practices
- Gap identification
- Context establishment

### 5. Data Presentation (Weight: 10%)
- Results clarity and completeness
- Appropriate visualization
- Statistical reporting
- Supporting evidence

## Recommendation Categories
- **Accept**: High quality, minor revisions only
- **Minor Revisions**: Good quality, addressable issues
- **Major Revisions**: Significant issues requiring substantial work
- **Reject**: Fundamental flaws, poor quality, or out of scope

## Review Timeline
- Initial review: 4-6 weeks from assignment
- Revision review: 2-3 weeks
- Final decision: 1-2 weeks after all reviews received
"""

@mcp.resource("manuscripts://{manuscript_id}")
def get_manuscript_details(manuscript_id: str) -> str:
    """
    Get detailed information about a specific manuscript.
    
    Args:
        manuscript_id: ID of the manuscript to retrieve
        
    Returns:
        Manuscript details in markdown format
    """
    # This will be implemented to fetch from Convex
    return f"""
# Manuscript Details: {manuscript_id}

This resource template will fetch manuscript details from the Convex backend.
Implementation pending for dynamic manuscript data retrieval.

## Available Data
- Title and abstract
- Author information
- Submission date
- Current status
- Review assignments
- Editorial decisions
- File attachments
"""

@mcp.resource("articles://{article_id}")
def get_article_details(article_id: str) -> str:
    """
    Get detailed information about a published article.
    
    Args:
        article_id: ID of the article to retrieve
        
    Returns:
        Article details in markdown format
    """
    return f"""
# Article Details: {article_id}

This resource template will fetch published article details.

## Available Data
- Title and abstract
- Author information
- Publication date
- DOI and citation info
- Download statistics
- Full text access
"""

# =============================================================================
# SERVER LIFECYCLE
# =============================================================================

async def startup():
    """Server startup tasks."""
    print("🚀 Starting Cyan Science Journal MCP Server...")
    print("🔗 Connecting to Convex backend...")
    # Additional startup tasks can be added here

async def shutdown():
    """Server shutdown tasks."""
    print("🛑 Shutting down MCP Server...")
    await cleanup_convex_client()
    print("✅ Cleanup complete")

# =============================================================================
# MAIN ENTRY POINT
# =============================================================================

if __name__ == "__main__":
    import signal
    import sys
    
    def signal_handler(sig, frame):
        print("\n⚠️  Received interrupt signal")
        asyncio.create_task(shutdown())
        sys.exit(0)

    signal.signal(signal.SIGINT, signal_handler)
    signal.signal(signal.SIGTERM, signal_handler)

    # Run startup tasks
    asyncio.run(startup())

    try:
        host = os.getenv("MCP_SERVER_HOST", "127.0.0.1")
        port = int(os.getenv("MCP_SERVER_PORT", "3001"))
        path = "/mcp"
        
        print(f"🚀 Starting Cyan Science Journal MCP Server")
        print(f"🌐 Streamable HTTP transport: http://{host}:{port}{path}")
        print(f"🔧 Available tools: 47 (auth, author, reviewer, editor)")
        
        # Use FastMCP's built-in Streamable HTTP transport
        mcp.run(
            transport="streamable-http",
            host=host,
            port=port,
            path=path,
            log_level="info"
        )
    except KeyboardInterrupt:
        print("\n⚠️  Server interrupted")
    finally:
        asyncio.run(shutdown())