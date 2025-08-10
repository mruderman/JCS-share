"""
Author tools for MCP server.
Handles manuscript submission, tracking, and author workflows.
"""

import base64
from typing import Dict, Any, List, Optional
import sys
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from utils.auth_manager import require_author, UserSession
from utils.convex_client import get_convex_client


@require_author
async def submit_manuscript(
    title: str,
    abstract: str,
    keywords: List[str],
    language: str,
    file_data: str,  # Base64 encoded file
    file_name: str,
    content_type: str = "application/pdf",
    auth_token: str = None,
    session: UserSession = None
) -> Dict[str, Any]:
    """
    Submit a new manuscript for peer review.
    
    Args:
        title: Manuscript title
        abstract: Manuscript abstract
        keywords: List of keywords
        language: Manuscript language
        file_data: Base64 encoded file content
        file_name: Original file name
        content_type: MIME type of the file
        auth_token: Authentication token (handled by decorator)
        session: User session (injected by decorator)
        
    Returns:
        Dictionary containing submission result
        
    Raises:
        ValueError: If submission fails
    """
    convex_client = get_convex_client()
    
    try:
        # Decode file data
        file_bytes = base64.b64decode(file_data)
        
        # Generate upload URL
        upload_response = await convex_client.generate_upload_url(auth_token)
        if not upload_response.success:
            raise ValueError(f"Failed to generate upload URL: {upload_response.error}")
            
        upload_url = upload_response.data.get("uploadUrl")
        if not upload_url:
            raise ValueError("No upload URL received")
            
        # Upload file
        upload_result = await convex_client.upload_file(upload_url, file_bytes, content_type)
        if not upload_result.success:
            raise ValueError(f"Failed to upload file: {upload_result.error}")
            
        storage_id = upload_result.data.get("storageId")
        if not storage_id:
            raise ValueError("No storage ID received after upload")
            
        # Create manuscript record
        manuscript_data = {
            "title": title,
            "abstract": abstract,
            "keywords": keywords,
            "language": language,
            "fileId": storage_id
        }
        
        create_response = await convex_client.create_manuscript(auth_token, manuscript_data)
        if not create_response.success:
            raise ValueError(f"Failed to create manuscript record: {create_response.error}")
            
        manuscript_id = create_response.data.get("manuscriptId")
        
        return {
            "success": True,
            "message": "Manuscript submitted successfully",
            "manuscript_id": manuscript_id,
            "title": title,
            "status": "submitted",
            "file_name": file_name,
            "submission_date": __import__("time").time()
        }
        
    except Exception as e:
        raise ValueError(f"Manuscript submission failed: {str(e)}")


@require_author
async def get_my_manuscripts(
    auth_token: str = None,
    session: UserSession = None
) -> Dict[str, Any]:
    """
    Get all manuscripts submitted by the current author.
    
    Args:
        auth_token: Authentication token (handled by decorator)
        session: User session (injected by decorator)
        
    Returns:
        Dictionary containing author's manuscripts
        
    Raises:
        ValueError: If retrieval fails
    """
    convex_client = get_convex_client()
    
    try:
        # Get manuscripts for current user
        filters = {"authorId": session.user_id}
        response = await convex_client.get_manuscripts(auth_token, filters)
        
        if not response.success:
            raise ValueError(f"Failed to retrieve manuscripts: {response.error}")
            
        manuscripts = response.data.get("manuscripts", [])
        
        return {
            "success": True,
            "total_count": len(manuscripts),
            "manuscripts": manuscripts,
            "author_id": session.user_id,
            "author_name": session.name
        }
        
    except Exception as e:
        raise ValueError(f"Failed to retrieve manuscripts: {str(e)}")


@require_author
async def get_manuscript_details(
    manuscript_id: str,
    auth_token: str = None,
    session: UserSession = None
) -> Dict[str, Any]:
    """
    Get detailed information about a specific manuscript.
    
    Args:
        manuscript_id: ID of the manuscript
        auth_token: Authentication token (handled by decorator)
        session: User session (injected by decorator)
        
    Returns:
        Dictionary containing manuscript details
        
    Raises:
        ValueError: If retrieval fails
    """
    convex_client = get_convex_client()
    
    try:
        response = await convex_client.get_manuscript(manuscript_id, auth_token)
        
        if not response.success:
            raise ValueError(f"Failed to retrieve manuscript: {response.error}")
            
        manuscript = response.data
        if not manuscript:
            raise ValueError("Manuscript not found")
            
        # Check if user is author or has permission to view
        if session.user_id not in manuscript.get("authorIds", []):
            if not any(role in session.roles for role in ["editor", "reviewer"]):
                raise ValueError("Access denied: not authorized to view this manuscript")
        
        return {
            "success": True,
            "manuscript": manuscript,
            "can_edit": session.user_id in manuscript.get("authorIds", []),
            "can_withdraw": manuscript.get("status") in ["submitted", "inReview"]
        }
        
    except Exception as e:
        raise ValueError(f"Failed to retrieve manuscript details: {str(e)}")


@require_author
async def update_manuscript(
    manuscript_id: str,
    title: Optional[str] = None,
    abstract: Optional[str] = None,
    keywords: Optional[List[str]] = None,
    language: Optional[str] = None,
    auth_token: str = None,
    session: UserSession = None
) -> Dict[str, Any]:
    """
    Update manuscript metadata (only allowed before review starts).
    
    Args:
        manuscript_id: ID of the manuscript
        title: New title (optional)
        abstract: New abstract (optional)
        keywords: New keywords (optional)
        language: New language (optional)
        auth_token: Authentication token (handled by decorator)
        session: User session (injected by decorator)
        
    Returns:
        Dictionary containing update result
        
    Raises:
        ValueError: If update fails
    """
    convex_client = get_convex_client()
    
    try:
        # First get current manuscript to check status and permissions
        manuscript_response = await convex_client.get_manuscript(manuscript_id, auth_token)
        
        if not manuscript_response.success:
            raise ValueError(f"Failed to retrieve manuscript: {manuscript_response.error}")
            
        manuscript = manuscript_response.data
        if not manuscript:
            raise ValueError("Manuscript not found")
            
        # Check permissions
        if session.user_id not in manuscript.get("authorIds", []):
            raise ValueError("Access denied: not an author of this manuscript")
            
        # Check if editing is allowed
        if manuscript.get("status") not in ["submitted"]:
            raise ValueError("Cannot edit manuscript after review has started")
            
        # Prepare update data
        update_data = {"manuscriptId": manuscript_id}
        if title is not None:
            update_data["title"] = title
        if abstract is not None:
            update_data["abstract"] = abstract
        if keywords is not None:
            update_data["keywords"] = keywords
        if language is not None:
            update_data["language"] = language
            
        # Update manuscript
        response = await convex_client._make_request(
            "PATCH",
            f"/api/mcp/manuscripts/{manuscript_id}",
            data=update_data,
            auth_token=auth_token
        )
        
        if not response.success:
            raise ValueError(f"Failed to update manuscript: {response.error}")
            
        return {
            "success": True,
            "message": "Manuscript updated successfully",
            "manuscript_id": manuscript_id,
            "updated_fields": list(update_data.keys())
        }
        
    except Exception as e:
        raise ValueError(f"Failed to update manuscript: {str(e)}")


@require_author
async def withdraw_manuscript(
    manuscript_id: str,
    reason: str,
    auth_token: str = None,
    session: UserSession = None
) -> Dict[str, Any]:
    """
    Withdraw a manuscript from review.
    
    Args:
        manuscript_id: ID of the manuscript
        reason: Reason for withdrawal
        auth_token: Authentication token (handled by decorator)
        session: User session (injected by decorator)
        
    Returns:
        Dictionary containing withdrawal result
        
    Raises:
        ValueError: If withdrawal fails
    """
    convex_client = get_convex_client()
    
    try:
        # Get manuscript to check status and permissions
        manuscript_response = await convex_client.get_manuscript(manuscript_id, auth_token)
        
        if not manuscript_response.success:
            raise ValueError(f"Failed to retrieve manuscript: {manuscript_response.error}")
            
        manuscript = manuscript_response.data
        if not manuscript:
            raise ValueError("Manuscript not found")
            
        # Check permissions
        if session.user_id not in manuscript.get("authorIds", []):
            raise ValueError("Access denied: not an author of this manuscript")
            
        # Check if withdrawal is allowed
        if manuscript.get("status") not in ["submitted", "inReview"]:
            raise ValueError("Cannot withdraw manuscript in current status")
            
        # Update status to withdrawn
        response = await convex_client.update_manuscript_status(
            manuscript_id, 
            "withdrawn", 
            auth_token
        )
        
        if not response.success:
            raise ValueError(f"Failed to withdraw manuscript: {response.error}")
            
        return {
            "success": True,
            "message": "Manuscript withdrawn successfully",
            "manuscript_id": manuscript_id,
            "reason": reason,
            "withdrawn_at": __import__("time").time()
        }
        
    except Exception as e:
        raise ValueError(f"Failed to withdraw manuscript: {str(e)}")


@require_author
async def get_manuscript_reviews(
    manuscript_id: str,
    auth_token: str = None,
    session: UserSession = None
) -> Dict[str, Any]:
    """
    Get reviews for a manuscript (available to authors after decision).
    
    Args:
        manuscript_id: ID of the manuscript
        auth_token: Authentication token (handled by decorator)
        session: User session (injected by decorator)
        
    Returns:
        Dictionary containing reviews
        
    Raises:
        ValueError: If retrieval fails
    """
    convex_client = get_convex_client()
    
    try:
        # Get manuscript to check permissions and status
        manuscript_response = await convex_client.get_manuscript(manuscript_id, auth_token)
        
        if not manuscript_response.success:
            raise ValueError(f"Failed to retrieve manuscript: {manuscript_response.error}")
            
        manuscript = manuscript_response.data
        if not manuscript:
            raise ValueError("Manuscript not found")
            
        # Check permissions
        if session.user_id not in manuscript.get("authorIds", []):
            raise ValueError("Access denied: not an author of this manuscript")
            
        # Check if reviews are available
        if manuscript.get("status") in ["submitted", "inReview"]:
            raise ValueError("Reviews not yet available")
            
        # Get reviews
        response = await convex_client.get_reviews(manuscript_id, auth_token)
        
        if not response.success:
            raise ValueError(f"Failed to retrieve reviews: {response.error}")
            
        reviews = response.data.get("reviews", [])
        
        # Filter out reviewer identities for authors
        anonymized_reviews = []
        for review in reviews:
            anonymized_review = {
                "review_id": review.get("_id"),
                "score": review.get("score"),
                "recommendation": review.get("recommendation"),
                "comments": review.get("commentsMd"),
                "submitted_at": review.get("_creationTime"),
                "status": review.get("status")
            }
            anonymized_reviews.append(anonymized_review)
            
        return {
            "success": True,
            "manuscript_id": manuscript_id,
            "manuscript_status": manuscript.get("status"),
            "review_count": len(anonymized_reviews),
            "reviews": anonymized_reviews
        }
        
    except Exception as e:
        raise ValueError(f"Failed to retrieve reviews: {str(e)}")


@require_author
async def check_manuscript_status(
    manuscript_id: str,
    auth_token: str = None,
    session: UserSession = None
) -> Dict[str, Any]:
    """
    Check the current status of a manuscript.
    
    Args:
        manuscript_id: ID of the manuscript
        auth_token: Authentication token (handled by decorator)
        session: User session (injected by decorator)
        
    Returns:
        Dictionary containing status information
        
    Raises:
        ValueError: If check fails
    """
    convex_client = get_convex_client()
    
    try:
        manuscript_response = await convex_client.get_manuscript(manuscript_id, auth_token)
        
        if not manuscript_response.success:
            raise ValueError(f"Failed to retrieve manuscript: {manuscript_response.error}")
            
        manuscript = manuscript_response.data
        if not manuscript:
            raise ValueError("Manuscript not found")
            
        # Check permissions
        if session.user_id not in manuscript.get("authorIds", []):
            raise ValueError("Access denied: not an author of this manuscript")
            
        status = manuscript.get("status")
        
        # Get status description
        status_descriptions = {
            "submitted": "Manuscript has been submitted and is awaiting editorial review",
            "inReview": "Manuscript is currently under peer review",
            "accepted": "Manuscript has been accepted for publication",
            "rejected": "Manuscript has been rejected",
            "majorRevisions": "Major revisions required before acceptance",
            "minorRevisions": "Minor revisions required before acceptance",
            "proofing": "Manuscript is being prepared for publication",
            "published": "Manuscript has been published",
            "withdrawn": "Manuscript has been withdrawn by authors"
        }
        
        return {
            "success": True,
            "manuscript_id": manuscript_id,
            "status": status,
            "description": status_descriptions.get(status, "Unknown status"),
            "title": manuscript.get("title"),
            "submitted_at": manuscript.get("_creationTime"),
            "can_view_reviews": status not in ["submitted", "inReview"],
            "can_edit": status == "submitted",
            "can_withdraw": status in ["submitted", "inReview"]
        }
        
    except Exception as e:
        raise ValueError(f"Failed to check manuscript status: {str(e)}")


@require_author
async def download_manuscript_file(
    manuscript_id: str,
    auth_token: str = None,
    session: UserSession = None
) -> Dict[str, Any]:
    """
    Get download URL for manuscript file.
    
    Args:
        manuscript_id: ID of the manuscript
        auth_token: Authentication token (handled by decorator)
        session: User session (injected by decorator)
        
    Returns:
        Dictionary containing file download information
        
    Raises:
        ValueError: If download fails
    """
    convex_client = get_convex_client()
    
    try:
        manuscript_response = await convex_client.get_manuscript(manuscript_id, auth_token)
        
        if not manuscript_response.success:
            raise ValueError(f"Failed to retrieve manuscript: {manuscript_response.error}")
            
        manuscript = manuscript_response.data
        if not manuscript:
            raise ValueError("Manuscript not found")
            
        # Check permissions
        if session.user_id not in manuscript.get("authorIds", []):
            if not any(role in session.roles for role in ["editor", "reviewer"]):
                raise ValueError("Access denied: not authorized to download this file")
        
        file_url = manuscript.get("fileUrl")
        if not file_url:
            raise ValueError("No file URL available for this manuscript")
            
        return {
            "success": True,
            "manuscript_id": manuscript_id,
            "file_url": file_url,
            "title": manuscript.get("title"),
            "file_type": "application/pdf",
            "message": "Use the file_url to download the manuscript file"
        }
        
    except Exception as e:
        raise ValueError(f"Failed to get file download URL: {str(e)}")