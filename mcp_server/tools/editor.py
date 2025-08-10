import sys
import os
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from typing import Dict, List, Any, Optional
from utils.auth_manager import require_auth, require_editor
from utils.convex_client import ConvexClient

# Initialize client
client = ConvexClient()

@require_editor
async def get_editor_dashboard(auth_token: str) -> Dict[str, Any]:
    """Get editor dashboard with manuscripts and review management"""
    try:
        # Get current user data
        user_response = await client.get_current_user_data(auth_token)
        if not user_response.success:
            return {"success": False, "error": user_response.error}
        
        # Get manuscripts for editor
        manuscripts_response = await client.get_manuscripts_for_editor(auth_token)
        if not manuscripts_response.success:
            return {"success": False, "error": manuscripts_response.error}
        
        # Get reviews for editor
        reviews_response = await client.get_reviews_for_editor(auth_token)
        if not reviews_response.success:
            return {"success": False, "error": reviews_response.error}
        
        # Get proofing tasks
        proofing_response = await client.get_proofing_tasks(auth_token)
        if not proofing_response.success:
            return {"success": False, "error": proofing_response.error}
        
        manuscripts = manuscripts_response.data or []
        reviews = reviews_response.data or []
        proofing_tasks = proofing_response.data or []
        
        # Calculate statistics
        stats = {
            "manuscripts": {
                "total": len(manuscripts),
                "submitted": len([m for m in manuscripts if m.get('status') == 'submitted']),
                "in_review": len([m for m in manuscripts if m.get('status') == 'inReview']),
                "pending_decision": len([m for m in manuscripts if m.get('status') == 'inReview'])
            },
            "reviews": {
                "total": len(reviews),
                "pending": len([r for r in reviews if r.get('status') == 'pending']),
                "submitted": len([r for r in reviews if r.get('status') == 'submitted'])
            },
            "proofing": {
                "total": len(proofing_tasks),
                "pending": len([p for p in proofing_tasks if p.get('status') == 'pending']),
                "completed": len([p for p in proofing_tasks if p.get('status') == 'completed'])
            }
        }
        
        return {
            "success": True,
            "user": user_response.data,
            "stats": stats,
            "manuscripts": manuscripts,
            "reviews": reviews,
            "proofing_tasks": proofing_tasks
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def get_manuscripts_for_editor(auth_token: str) -> Dict[str, Any]:
    """Get all manuscripts available for editorial review"""
    try:
        response = await client.get_manuscripts_for_editor(auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
        
        return {
            "success": True,
            "manuscripts": response.data or []
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def assign_reviewer(
    manuscript_id: str,
    reviewer_id: str,
    deadline_days: int,
    auth_token: str
) -> Dict[str, Any]:
    """Assign a reviewer to a manuscript"""
    try:
        # Calculate deadline timestamp
        import time
        deadline = int((time.time() + (deadline_days * 24 * 60 * 60)) * 1000)
        
        response = await client.assign_reviewer(
            manuscript_id=manuscript_id,
            reviewer_id=reviewer_id,
            deadline=deadline,
            auth_token=auth_token
        )
        
        if not response.success:
            return {"success": False, "error": response.error}
        
        return {
            "success": True,
            "message": f"Reviewer assigned successfully with {deadline_days} day deadline"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def remove_reviewer(review_id: str, auth_token: str) -> Dict[str, Any]:
    """Remove a reviewer from a manuscript"""
    try:
        response = await client.remove_reviewer(review_id, auth_token)
        
        if not response.success:
            return {"success": False, "error": response.error}
        
        return {
            "success": True,
            "message": "Reviewer removed successfully"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def make_editorial_decision(
    manuscript_id: str,
    decision: str,
    comments: Optional[str] = None,
    auth_token: str = None
) -> Dict[str, Any]:
    """Make final editorial decision on a manuscript"""
    try:
        # Validate decision
        valid_decisions = ["proofing", "minorRevisions", "majorRevisions", "reject"]
        if decision not in valid_decisions:
            return {
                "success": False, 
                "error": f"Decision must be one of: {', '.join(valid_decisions)}"
            }
        
        response = await client.make_editorial_decision(
            manuscript_id=manuscript_id,
            decision=decision,
            comments=comments,
            auth_token=auth_token
        )
        
        if not response.success:
            return {"success": False, "error": response.error}
        
        decision_messages = {
            "proofing": "Manuscript accepted for proofing",
            "minorRevisions": "Manuscript requires minor revisions",
            "majorRevisions": "Manuscript requires major revisions", 
            "reject": "Manuscript rejected"
        }
        
        return {
            "success": True,
            "message": decision_messages.get(decision, "Editorial decision made"),
            "decision": decision
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def get_reviews_for_editor(auth_token: str) -> Dict[str, Any]:
    """Get all reviews for editorial oversight"""
    try:
        response = await client.get_reviews_for_editor(auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
        
        return {
            "success": True,
            "reviews": response.data or []
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def get_proofing_tasks(auth_token: str) -> Dict[str, Any]:
    """Get all proofing tasks for editorial management"""
    try:
        response = await client.get_proofing_tasks(auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
        
        proofing_tasks = response.data or []
        
        # Categorize tasks
        pending_tasks = [t for t in proofing_tasks if t.get('status') == 'pending']
        completed_tasks = [t for t in proofing_tasks if t.get('status') == 'completed']
        published_tasks = [t for t in proofing_tasks if t.get('status') == 'published']
        
        return {
            "success": True,
            "proofing_tasks": proofing_tasks,
            "pending_tasks": pending_tasks,
            "completed_tasks": completed_tasks,
            "published_tasks": published_tasks,
            "stats": {
                "total": len(proofing_tasks),
                "pending": len(pending_tasks),
                "completed": len(completed_tasks),
                "published": len(published_tasks)
            }
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def upload_proofed_file(
    proofing_task_id: str,
    file_data: str,
    file_name: str,
    proofing_notes: Optional[str] = None,
    auth_token: str = None,
    content_type: str = "application/pdf"
) -> Dict[str, Any]:
    """Upload a proofed manuscript file"""
    try:
        # Get upload URL
        upload_response = await client.generate_proofed_file_upload_url(auth_token)
        if not upload_response.success:
            return {"success": False, "error": upload_response.error}
        
        upload_url = upload_response.data.get("uploadUrl")
        if not upload_url:
            return {"success": False, "error": "Failed to get upload URL"}
        
        # Decode base64 file data
        import base64
        try:
            file_bytes = base64.b64decode(file_data)
        except Exception as e:
            return {"success": False, "error": f"Invalid file data encoding: {str(e)}"}
        
        # Upload file
        file_response = await client.upload_file(upload_url, file_bytes, content_type)
        if not file_response.success:
            return {"success": False, "error": file_response.error}
        
        file_id = file_response.data.get("storageId")
        if not file_id:
            return {"success": False, "error": "Failed to get file ID after upload"}
        
        # Complete proofing task
        complete_response = await client.upload_proofed_file(
            proofing_task_id=proofing_task_id,
            file_id=file_id,
            proofing_notes=proofing_notes,
            auth_token=auth_token
        )
        
        if not complete_response.success:
            return {"success": False, "error": complete_response.error}
        
        return {
            "success": True,
            "message": "Proofed file uploaded successfully",
            "file_id": file_id
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def publish_article(
    proofing_task_id: str,
    doi: Optional[str] = None,
    volume: Optional[str] = None,
    issue: Optional[str] = None,
    page_numbers: Optional[str] = None,
    auth_token: str = None
) -> Dict[str, Any]:
    """Publish a completed proofed manuscript as an article"""
    try:
        response = await client.publish_article(
            proofing_task_id=proofing_task_id,
            doi=doi,
            volume=volume,
            issue=issue,
            page_numbers=page_numbers,
            auth_token=auth_token
        )
        
        if not response.success:
            return {"success": False, "error": response.error}
        
        return {
            "success": True,
            "message": "Article published successfully",
            "article_id": response.data
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def get_published_articles(
    limit: int = 20,
    auth_token: str = None
) -> Dict[str, Any]:
    """Get list of published articles"""
    try:
        response = await client.get_published_articles(limit, auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
        
        return {
            "success": True,
            "articles": response.data or [],
            "count": len(response.data or [])
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def get_available_reviewers(auth_token: str) -> Dict[str, Any]:
    """Get list of available reviewers for assignment"""
    try:
        response = await client.get_users(auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
        
        users = response.data or []
        
        # Filter for users with reviewer role
        reviewers = [
            user for user in users 
            if user.get('userData', {}).get('roles', []) and 
            'reviewer' in user.get('userData', {}).get('roles', [])
        ]
        
        return {
            "success": True,
            "reviewers": reviewers,
            "count": len(reviewers)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def get_manuscript_review_status(
    manuscript_id: str, 
    auth_token: str
) -> Dict[str, Any]:
    """Get detailed review status for a specific manuscript"""
    try:
        # Get manuscript details
        manuscript_response = await client.get_manuscript(manuscript_id, auth_token)
        if not manuscript_response.success:
            return {"success": False, "error": manuscript_response.error}
        
        # Get reviews for this manuscript
        reviews_response = await client.get_reviews_for_manuscript(manuscript_id, auth_token)
        reviews = reviews_response.data if reviews_response.success else []
        
        manuscript = manuscript_response.data
        
        # Calculate review statistics
        total_reviews = len(reviews)
        pending_reviews = len([r for r in reviews if r.get('status') == 'pending'])
        submitted_reviews = len([r for r in reviews if r.get('status') == 'submitted'])
        
        # Check if ready for decision
        ready_for_decision = (
            manuscript.get('status') == 'inReview' and 
            pending_reviews == 0 and 
            submitted_reviews >= 2
        )
        
        return {
            "success": True,
            "manuscript": manuscript,
            "reviews": reviews,
            "review_stats": {
                "total": total_reviews,
                "pending": pending_reviews,
                "submitted": submitted_reviews,
                "ready_for_decision": ready_for_decision
            }
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_editor
async def get_editorial_guidelines() -> Dict[str, Any]:
    """Get editorial decision guidelines and best practices"""
    try:
        guidelines = {
            "editorial_decisions": {
                "proofing": {
                    "description": "Accept manuscript for final proofing and publication",
                    "criteria": [
                        "Strong positive reviews from peer reviewers",
                        "Significant contribution to the field",
                        "Methodologically sound research",
                        "Clear and well-written presentation",
                        "Appropriate for journal scope"
                    ]
                },
                "minorRevisions": {
                    "description": "Require minor revisions before acceptance",
                    "criteria": [
                        "Generally positive reviews with minor concerns",
                        "Small issues with methodology or presentation",
                        "Minor gaps in literature review",
                        "Formatting or clarity improvements needed"
                    ]
                },
                "majorRevisions": {
                    "description": "Require substantial revisions and re-review",
                    "criteria": [
                        "Mixed reviews with significant concerns",
                        "Major methodological issues to address",
                        "Substantial gaps in analysis or interpretation",
                        "Significant presentation problems"
                    ]
                },
                "reject": {
                    "description": "Reject manuscript for publication",
                    "criteria": [
                        "Predominantly negative reviews",
                        "Fundamental methodological flaws",
                        "Insufficient novelty or significance",
                        "Out of scope for journal",
                        "Ethical concerns"
                    ]
                }
            },
            "review_process": {
                "minimum_reviewers": 2,
                "preferred_reviewers": 3,
                "review_deadline_days": 14,
                "decision_timeline": "1-2 weeks after all reviews received"
            },
            "publication_process": {
                "proofing_guidelines": [
                    "Check formatting and layout",
                    "Verify citations and references",
                    "Ensure figures and tables are clear",
                    "Review for any remaining errors",
                    "Confirm author information is correct"
                ],
                "publication_metadata": [
                    "DOI assignment (optional)",
                    "Volume and issue numbers",
                    "Page number ranges",
                    "Publication date"
                ]
            }
        }
        
        return {
            "success": True,
            "guidelines": guidelines
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}