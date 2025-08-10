import sys
import os
from pathlib import Path

# Add project root to path for imports
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from typing import Dict, List, Any, Optional
from utils.auth_manager import require_auth, require_reviewer
from utils.convex_client import ConvexClient

# Initialize client
client = ConvexClient()

@require_reviewer
async def get_reviewer_dashboard(auth_token: str) -> Dict[str, Any]:
    """Get reviewer dashboard with assigned reviews and statistics"""
    try:
        # Get current user data
        user_response = await client.get_current_user_data(auth_token)
        if not user_response.success:
            return {"success": False, "error": user_response.error}
        
        # Get assigned reviews
        reviews_response = await client.get_assigned_reviews(auth_token)
        if not reviews_response.success:
            return {"success": False, "error": reviews_response.error}
        
        assigned_reviews = reviews_response.data or []
        
        # Calculate statistics
        total_reviews = len(assigned_reviews)
        pending_reviews = [r for r in assigned_reviews if r.get('status') == 'pending']
        completed_reviews = [r for r in assigned_reviews if r.get('status') == 'submitted']
        
        # Find overdue reviews
        current_time = client.get_current_time()
        overdue_reviews = [r for r in pending_reviews if r.get('deadline', 0) < current_time]
        
        return {
            "success": True,
            "user": user_response.data,
            "stats": {
                "total_assigned": total_reviews,
                "pending": len(pending_reviews),
                "overdue": len(overdue_reviews),
                "completed": len(completed_reviews)
            },
            "pending_reviews": pending_reviews,
            "completed_reviews": completed_reviews,
            "overdue_reviews": overdue_reviews
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def get_assigned_reviews(auth_token: str) -> Dict[str, Any]:
    """Get all reviews assigned to the current reviewer"""
    try:
        response = await client.get_assigned_reviews(auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
            
        assigned_reviews = response.data or []
        
        return {
            "success": True,
            "reviews": assigned_reviews,
            "count": len(assigned_reviews)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def get_review_details(review_id: str, auth_token: str) -> Dict[str, Any]:
    """Get details of a specific review assignment"""
    try:
        response = await client.get_review(review_id, auth_token)
        
        if not response.success:
            return {"success": False, "error": response.error or "Review not found or not authorized"}
        
        return {
            "success": True,
            "review": response.data["review"],
            "manuscript": response.data["manuscript"]
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def get_pending_reviews(auth_token: str) -> Dict[str, Any]:
    """Get all pending reviews for the current reviewer"""
    try:
        response = await client.get_assigned_reviews(auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
            
        assigned_reviews = response.data or []
        pending_reviews = [r for r in assigned_reviews if r.get('status') == 'pending']
        
        return {
            "success": True,
            "pending_reviews": pending_reviews,
            "count": len(pending_reviews)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def get_completed_reviews(auth_token: str) -> Dict[str, Any]:
    """Get all completed reviews for the current reviewer"""
    try:
        response = await client.get_assigned_reviews(auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
            
        assigned_reviews = response.data or []
        completed_reviews = [r for r in assigned_reviews if r.get('status') == 'submitted']
        
        return {
            "success": True,
            "completed_reviews": completed_reviews,
            "count": len(completed_reviews)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def get_overdue_reviews(auth_token: str) -> Dict[str, Any]:
    """Get all overdue reviews for the current reviewer"""
    try:
        response = await client.get_assigned_reviews(auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
            
        assigned_reviews = response.data or []
        current_time = client.get_current_time()
        
        overdue_reviews = [
            r for r in assigned_reviews 
            if r.get('status') == 'pending' and r.get('deadline', 0) < current_time
        ]
        
        return {
            "success": True,
            "overdue_reviews": overdue_reviews,
            "count": len(overdue_reviews)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def submit_review(
    review_id: str,
    score: int,
    comments: str,
    recommendation: str,
    auth_token: str
) -> Dict[str, Any]:
    """Submit a peer review for an assigned manuscript"""
    try:
        # Validate inputs
        if not all([review_id, score, comments, recommendation]):
            return {"success": False, "error": "All fields are required"}
        
        if not isinstance(score, int) or score < 1 or score > 10:
            return {"success": False, "error": "Score must be an integer between 1 and 10"}
        
        valid_recommendations = ["accept", "minor", "major", "reject"]
        if recommendation not in valid_recommendations:
            return {
                "success": False, 
                "error": f"Recommendation must be one of: {', '.join(valid_recommendations)}"
            }
        
        # Submit the review
        response = await client.submit_review(
            review_id=review_id,
            score=score,
            comments_md=comments,
            recommendation=recommendation,
            auth_token=auth_token
        )
        
        if not response.success:
            return {"success": False, "error": response.error}
        
        return {
            "success": True,
            "message": "Review submitted successfully",
            "review_id": review_id
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def update_review_draft(
    review_id: str,
    score: Optional[int] = None,
    comments: Optional[str] = None,
    recommendation: Optional[str] = None
) -> Dict[str, Any]:
    """Update a draft review (for saving progress)"""
    try:
        # Note: This would require a backend function to save drafts
        # For now, return guidance on how to save drafts
        return {
            "success": False,
            "error": "Draft saving not implemented in backend yet",
            "guidance": "Keep your review content saved locally until ready to submit"
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def get_review_history(auth_token: str) -> Dict[str, Any]:
    """Get the reviewer's complete review history"""
    try:
        response = await client.get_assigned_reviews(auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
            
        assigned_reviews = response.data or []
        
        # Sort by deadline (most recent first)
        sorted_reviews = sorted(
            assigned_reviews, 
            key=lambda x: x.get('deadline', 0), 
            reverse=True
        )
        
        return {
            "success": True,
            "review_history": sorted_reviews,
            "total_reviews": len(assigned_reviews)
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def get_review_statistics(auth_token: str) -> Dict[str, Any]:
    """Get reviewer's performance statistics"""
    try:
        response = await client.get_assigned_reviews(auth_token)
        if not response.success:
            return {"success": False, "error": response.error}
            
        assigned_reviews = response.data or []
        current_time = client.get_current_time()
        
        total_reviews = len(assigned_reviews)
        completed_reviews = [r for r in assigned_reviews if r.get('status') == 'submitted']
        pending_reviews = [r for r in assigned_reviews if r.get('status') == 'pending']
        overdue_reviews = [r for r in pending_reviews if r.get('deadline', 0) < current_time]
        
        # Calculate average score (for completed reviews)
        scores = [r.get('score') for r in completed_reviews if r.get('score')]
        avg_score = sum(scores) / len(scores) if scores else 0
        
        # Count recommendations
        recommendations = [r.get('recommendation') for r in completed_reviews if r.get('recommendation')]
        recommendation_counts = {
            'accept': recommendations.count('accept'),
            'minor': recommendations.count('minor'), 
            'major': recommendations.count('major'),
            'reject': recommendations.count('reject')
        }
        
        return {
            "success": True,
            "statistics": {
                "total_assigned": total_reviews,
                "completed": len(completed_reviews),
                "pending": len(pending_reviews),
                "overdue": len(overdue_reviews),
                "completion_rate": len(completed_reviews) / total_reviews if total_reviews > 0 else 0,
                "average_score": round(avg_score, 2),
                "recommendation_breakdown": recommendation_counts
            }
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def download_manuscript(review_id: str, auth_token: str) -> Dict[str, Any]:
    """Get download URL for a manuscript under review"""
    try:
        response = await client.get_review(review_id, auth_token)
        
        if not response.success:
            return {"success": False, "error": response.error or "Review not found or not authorized"}
        
        manuscript = response.data["manuscript"]
        file_url = manuscript.get("fileUrl")
        
        if not file_url:
            return {"success": False, "error": "Manuscript file not available"}
        
        return {
            "success": True,
            "download_url": file_url,
            "manuscript_title": manuscript.get("title", "Unknown"),
            "manuscript_id": manuscript.get("_id")
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}

@require_reviewer
async def get_review_guidelines() -> Dict[str, Any]:
    """Get peer review guidelines and best practices"""
    try:
        guidelines = {
            "review_criteria": [
                "Scientific accuracy and methodology",
                "Originality and significance of contribution",
                "Clarity of presentation and writing quality",
                "Adequate literature review and citations",
                "Appropriate conclusions supported by data",
                "Ethical considerations and compliance"
            ],
            "scoring_guide": {
                "9-10": "Exceptional work, ready for publication",
                "7-8": "Good work with minor issues",
                "5-6": "Acceptable work with significant issues",
                "3-4": "Poor work requiring major revisions",
                "1-2": "Fundamentally flawed, recommend rejection"
            },
            "recommendation_guide": {
                "accept": "Manuscript is ready for publication with no or minimal changes",
                "minor": "Manuscript requires minor revisions before publication",
                "major": "Manuscript requires substantial revisions and re-review",
                "reject": "Manuscript has fundamental flaws and should be rejected"
            },
            "review_process": {
                "confidentiality": "All reviews are confidential and double-blind",
                "deadline_importance": "Please submit reviews by the deadline",
                "constructive_feedback": "Provide specific, constructive feedback to authors",
                "professional_tone": "Maintain a professional and respectful tone"
            }
        }
        
        return {
            "success": True,
            "guidelines": guidelines
        }
        
    except Exception as e:
        return {"success": False, "error": str(e)}