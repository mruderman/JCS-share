# MCP Server API Reference

## Overview

The Cyan Science Journal MCP Server provides comprehensive access to all peer review system functionality through 47 tools organized into 4 main categories:

1. **Authentication & Session Management** (10 tools)
2. **Author Workflow Tools** (5 tools)
3. **Reviewer Workflow Tools** (12 tools)
4. **Editor Workflow Tools** (15 tools)
5. **Resources** (5 resources)

## Authentication & Session Management

### `authenticate_user`
Authenticate user with email and password.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password

**Returns:**
```json
{
  "success": true,
  "message": "Authentication successful",
  "auth_token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "roles": ["author", "reviewer"]
  }
}
```

**Example:**
```python
result = await mcp.call_tool("authenticate_user", {
    "email": "researcher@university.edu",
    "password": "secure_password"
})
```

### `get_current_user`
Get current authenticated user information.

**Parameters:**
- `auth_token` (string): Authentication token from login

**Returns:**
```json
{
  "success": true,
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "roles": ["author", "reviewer"],
    "orcid": "0000-0000-0000-0000",
    "created_at": "2024-01-01T00:00:00Z"
  }
}
```

### `logout_user`
Logout user and invalidate authentication session.

**Parameters:**
- `auth_token` (string): Authentication token to invalidate

**Returns:**
```json
{
  "success": true,
  "message": "User logged out successfully"
}
```

### `refresh_session`
Refresh user session with updated data from backend.

**Parameters:**
- `auth_token` (string): Current authentication token

**Returns:**
```json
{
  "success": true,
  "message": "Session refreshed successfully",
  "user": {
    "id": "user_id",
    "email": "user@example.com",
    "name": "User Name",
    "roles": ["author", "reviewer", "editor"]
  }
}
```

### `check_permissions`
Check if authenticated user has required permissions.

**Parameters:**
- `auth_token` (string): Authentication token
- `required_roles` (array): List of roles required for access

**Returns:**
```json
{
  "success": true,
  "has_permission": true,
  "user_roles": ["author", "reviewer"],
  "required_roles": ["reviewer"]
}
```

### `create_user_account`
Create new user account in the system.

**Parameters:**
- `email` (string): User's email address
- `password` (string): User's password
- `name` (string): User's full name
- `roles` (array, optional): List of roles to assign (defaults to ["author"])

**Returns:**
```json
{
  "success": true,
  "message": "User account created successfully",
  "user_id": "new_user_id"
}
```

### `request_role_elevation`
Request elevation to reviewer or editor role.

**Parameters:**
- `auth_token` (string): Authentication token
- `requested_role` (string): Role being requested (reviewer/editor)
- `reason` (string): Justification for role request

**Returns:**
```json
{
  "success": true,
  "message": "Role elevation request submitted",
  "request_id": "request_id"
}
```

### `get_session_info`
Get detailed session information for authenticated user.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "session": {
    "user_id": "user_id",
    "email": "user@example.com",
    "expires_at": "2024-01-02T00:00:00Z",
    "roles": ["author", "reviewer"],
    "permissions": ["submit_manuscript", "review_papers"]
  }
}
```

### `validate_token`
Validate authentication token.

**Parameters:**
- `auth_token` (string): Token to validate

**Returns:**
```json
{
  "success": true,
  "valid": true,
  "expires_at": "2024-01-02T00:00:00Z"
}
```

## Author Workflow Tools

### `submit_manuscript`
Submit a new manuscript for peer review.

**Parameters:**
- `auth_token` (string): Authentication token
- `title` (string): Manuscript title
- `abstract` (string): Manuscript abstract
- `keywords` (array): List of keywords
- `language` (string): Manuscript language
- `file_data` (string): Base64 encoded file content
- `file_name` (string): Original file name
- `content_type` (string, optional): MIME type of the file (default: "application/pdf")

**Returns:**
```json
{
  "success": true,
  "message": "Manuscript submitted successfully",
  "manuscript_id": "manuscript_id",
  "status": "submitted"
}
```

### `get_my_manuscripts`
Get all manuscripts submitted by the current author.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "manuscripts": [
    {
      "id": "manuscript_id",
      "title": "Research Paper Title",
      "status": "inReview",
      "submitted_at": "2024-01-01T00:00:00Z",
      "abstract": "Paper abstract...",
      "keywords": ["research", "science"]
    }
  ]
}
```

### `get_manuscript_details`
Get detailed information about a specific manuscript.

**Parameters:**
- `auth_token` (string): Authentication token
- `manuscript_id` (string): ID of the manuscript

**Returns:**
```json
{
  "success": true,
  "manuscript": {
    "id": "manuscript_id",
    "title": "Research Paper Title",
    "abstract": "Paper abstract...",
    "keywords": ["research", "science"],
    "language": "English",
    "status": "inReview",
    "submitted_at": "2024-01-01T00:00:00Z",
    "file_url": "https://example.com/file.pdf",
    "reviews": [
      {
        "id": "review_id",
        "status": "submitted",
        "score": 8,
        "recommendation": "minor"
      }
    ]
  }
}
```

### `check_manuscript_status`
Check the current status of a manuscript.

**Parameters:**
- `auth_token` (string): Authentication token
- `manuscript_id` (string): ID of the manuscript

**Returns:**
```json
{
  "success": true,
  "status": "inReview",
  "description": "Manuscript is currently under peer review",
  "updated_at": "2024-01-01T00:00:00Z"
}
```

### `download_manuscript_file`
Get download URL for manuscript file.

**Parameters:**
- `auth_token` (string): Authentication token
- `manuscript_id` (string): ID of the manuscript

**Returns:**
```json
{
  "success": true,
  "download_url": "https://example.com/download/file.pdf",
  "file_name": "manuscript.pdf",
  "content_type": "application/pdf"
}
```

## Reviewer Workflow Tools

### `get_reviewer_dashboard`
Get reviewer dashboard with assigned reviews and statistics.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "dashboard": {
    "pending_reviews": 3,
    "completed_reviews": 15,
    "overdue_reviews": 1,
    "average_score": 7.2,
    "recent_reviews": [
      {
        "id": "review_id",
        "manuscript_title": "Research Paper",
        "deadline": "2024-01-15T00:00:00Z",
        "status": "pending"
      }
    ]
  }
}
```

### `get_assigned_reviews`
Get all reviews assigned to the current reviewer.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "review_id",
      "manuscript_id": "manuscript_id",
      "manuscript_title": "Research Paper Title",
      "assigned_at": "2024-01-01T00:00:00Z",
      "deadline": "2024-01-15T00:00:00Z",
      "status": "pending"
    }
  ]
}
```

### `get_review_details`
Get details of a specific review assignment.

**Parameters:**
- `auth_token` (string): Authentication token
- `review_id` (string): ID of the review

**Returns:**
```json
{
  "success": true,
  "review": {
    "id": "review_id",
    "manuscript": {
      "id": "manuscript_id",
      "title": "Research Paper Title",
      "abstract": "Paper abstract...",
      "keywords": ["research", "science"],
      "file_url": "https://example.com/file.pdf"
    },
    "assigned_at": "2024-01-01T00:00:00Z",
    "deadline": "2024-01-15T00:00:00Z",
    "status": "pending"
  }
}
```

### `get_pending_reviews`
Get all pending reviews for the current reviewer.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "pending_reviews": [
    {
      "id": "review_id",
      "manuscript_title": "Research Paper",
      "deadline": "2024-01-15T00:00:00Z",
      "days_remaining": 10
    }
  ]
}
```

### `get_completed_reviews`
Get all completed reviews for the current reviewer.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "completed_reviews": [
    {
      "id": "review_id",
      "manuscript_title": "Research Paper",
      "submitted_at": "2024-01-10T00:00:00Z",
      "score": 8,
      "recommendation": "minor"
    }
  ]
}
```

### `get_overdue_reviews`
Get all overdue reviews for the current reviewer.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "overdue_reviews": [
    {
      "id": "review_id",
      "manuscript_title": "Research Paper",
      "deadline": "2024-01-01T00:00:00Z",
      "days_overdue": 5
    }
  ]
}
```

### `submit_review`
Submit a peer review for an assigned manuscript.

**Parameters:**
- `auth_token` (string): Authentication token
- `review_id` (string): ID of the review
- `score` (integer): Review score (1-10)
- `comments` (string): Review comments in Markdown
- `recommendation` (string): accept, minor, major, or reject

**Returns:**
```json
{
  "success": true,
  "message": "Review submitted successfully",
  "review_id": "review_id",
  "submitted_at": "2024-01-10T00:00:00Z"
}
```

### `get_review_history`
Get the reviewer's complete review history.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "review_history": [
    {
      "id": "review_id",
      "manuscript_title": "Research Paper",
      "submitted_at": "2024-01-10T00:00:00Z",
      "score": 8,
      "recommendation": "minor"
    }
  ]
}
```

### `get_review_statistics`
Get reviewer's performance statistics.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "statistics": {
    "total_reviews": 25,
    "average_score": 7.2,
    "on_time_reviews": 23,
    "late_reviews": 2,
    "recommendations": {
      "accept": 5,
      "minor": 12,
      "major": 6,
      "reject": 2
    }
  }
}
```

### `download_manuscript_for_review`
Get download URL for a manuscript under review.

**Parameters:**
- `auth_token` (string): Authentication token
- `review_id` (string): ID of the review

**Returns:**
```json
{
  "success": true,
  "download_url": "https://example.com/download/file.pdf",
  "file_name": "manuscript.pdf",
  "content_type": "application/pdf"
}
```

### `get_review_guidelines`
Get peer review guidelines and best practices.

**Returns:**
```json
{
  "success": true,
  "guidelines": {
    "evaluation_criteria": {
      "scientific_merit": "Novelty and significance of findings",
      "methodology": "Appropriateness of research design",
      "clarity": "Writing quality and organization",
      "literature_review": "Comprehensive coverage of relevant work",
      "data_presentation": "Results clarity and completeness"
    },
    "scoring_guide": {
      "1-3": "Poor quality, major flaws",
      "4-6": "Below average, significant issues",
      "7-8": "Good quality, minor issues",
      "9-10": "Excellent quality, minimal issues"
    },
    "recommendations": {
      "accept": "High quality, minor revisions only",
      "minor": "Good quality, addressable issues",
      "major": "Significant issues requiring substantial work",
      "reject": "Fundamental flaws or poor quality"
    }
  }
}
```

## Editor Workflow Tools

### `get_editor_dashboard`
Get editor dashboard with manuscripts, reviews, and statistics.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "dashboard": {
    "pending_submissions": 5,
    "manuscripts_in_review": 12,
    "overdue_reviews": 3,
    "ready_for_decision": 2,
    "recent_submissions": [
      {
        "id": "manuscript_id",
        "title": "Research Paper",
        "submitted_at": "2024-01-01T00:00:00Z",
        "status": "submitted"
      }
    ]
  }
}
```

### `get_manuscripts_for_editor`
Get manuscripts assigned to current editor.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "manuscripts": [
    {
      "id": "manuscript_id",
      "title": "Research Paper Title",
      "authors": ["Author One", "Author Two"],
      "submitted_at": "2024-01-01T00:00:00Z",
      "status": "submitted",
      "keywords": ["research", "science"],
      "abstract": "Paper abstract..."
    }
  ]
}
```

### `assign_reviewer_to_manuscript`
Assign a reviewer to a manuscript.

**Parameters:**
- `auth_token` (string): Authentication token
- `manuscript_id` (string): ID of the manuscript
- `reviewer_id` (string): ID of the reviewer
- `deadline_days` (integer, optional): Review deadline in days (default: 14)

**Returns:**
```json
{
  "success": true,
  "message": "Reviewer assigned successfully",
  "review_id": "review_id",
  "deadline": "2024-01-15T00:00:00Z"
}
```

### `remove_reviewer_from_manuscript`
Remove a reviewer from a manuscript.

**Parameters:**
- `auth_token` (string): Authentication token
- `review_id` (string): ID of the review assignment
- `reason` (string, optional): Reason for removal

**Returns:**
```json
{
  "success": true,
  "message": "Reviewer removed successfully"
}
```

### `get_available_reviewers`
Get list of available reviewers for assignment.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "reviewers": [
    {
      "id": "reviewer_id",
      "name": "Dr. Jane Smith",
      "email": "jane.smith@university.edu",
      "expertise": ["machine learning", "data science"],
      "current_load": 2,
      "max_load": 5
    }
  ]
}
```

### `get_reviews_for_manuscript`
Get all reviews for a specific manuscript.

**Parameters:**
- `auth_token` (string): Authentication token
- `manuscript_id` (string): ID of the manuscript

**Returns:**
```json
{
  "success": true,
  "reviews": [
    {
      "id": "review_id",
      "reviewer_name": "Dr. Jane Smith",
      "status": "submitted",
      "score": 8,
      "recommendation": "minor",
      "comments": "Review comments...",
      "submitted_at": "2024-01-10T00:00:00Z"
    }
  ]
}
```

### `make_editorial_decision`
Make final editorial decision on a manuscript.

**Parameters:**
- `auth_token` (string): Authentication token
- `manuscript_id` (string): ID of the manuscript
- `decision` (string): Editorial decision (proofing, minorRevisions, majorRevisions, reject)
- `comments` (string, optional): Editorial comments

**Returns:**
```json
{
  "success": true,
  "message": "Editorial decision made successfully",
  "decision": "proofing",
  "decided_at": "2024-01-15T00:00:00Z"
}
```

### `get_proofing_tasks`
Get proofing tasks for manuscripts accepted for publication.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "proofing_tasks": [
    {
      "id": "task_id",
      "manuscript_id": "manuscript_id",
      "manuscript_title": "Research Paper",
      "status": "pending",
      "created_at": "2024-01-15T00:00:00Z"
    }
  ]
}
```

### `get_proofing_task_details`
Get details of a specific proofing task.

**Parameters:**
- `auth_token` (string): Authentication token
- `task_id` (string): ID of the proofing task

**Returns:**
```json
{
  "success": true,
  "task": {
    "id": "task_id",
    "manuscript": {
      "id": "manuscript_id",
      "title": "Research Paper",
      "original_file_url": "https://example.com/original.pdf"
    },
    "status": "pending",
    "created_at": "2024-01-15T00:00:00Z",
    "proofing_notes": "Editorial notes..."
  }
}
```

### `upload_proofed_manuscript`
Upload proofed manuscript file.

**Parameters:**
- `auth_token` (string): Authentication token
- `task_id` (string): ID of the proofing task
- `file_data` (string): Base64 encoded file content
- `file_name` (string): Original file name
- `proofing_notes` (string, optional): Notes about the proofing process
- `content_type` (string, optional): MIME type of the file

**Returns:**
```json
{
  "success": true,
  "message": "Proofed manuscript uploaded successfully",
  "file_url": "https://example.com/proofed.pdf"
}
```

### `publish_article`
Publish article from completed proofing task.

**Parameters:**
- `auth_token` (string): Authentication token
- `task_id` (string): ID of the proofing task
- `doi` (string, optional): DOI for the article
- `volume` (string, optional): Volume number
- `issue` (string, optional): Issue number
- `page_numbers` (string, optional): Page numbers

**Returns:**
```json
{
  "success": true,
  "message": "Article published successfully",
  "article_id": "article_id",
  "published_at": "2024-01-20T00:00:00Z",
  "doi": "10.1000/example"
}
```

### `get_published_articles`
Get list of published articles.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "articles": [
    {
      "id": "article_id",
      "title": "Research Paper Title",
      "doi": "10.1000/example",
      "published_at": "2024-01-20T00:00:00Z",
      "volume": "1",
      "issue": "1",
      "page_numbers": "1-15"
    }
  ]
}
```

### `get_editorial_statistics`
Get editorial statistics and performance metrics.

**Parameters:**
- `auth_token` (string): Authentication token

**Returns:**
```json
{
  "success": true,
  "statistics": {
    "total_manuscripts": 50,
    "decisions_made": 45,
    "acceptance_rate": 0.6,
    "average_review_time": 21,
    "articles_published": 27
  }
}
```

### `get_editorial_guidelines`
Get editorial guidelines and best practices.

**Returns:**
```json
{
  "success": true,
  "guidelines": {
    "decision_criteria": {
      "acceptance": "High quality research with significant contribution",
      "minor_revisions": "Good research with addressable issues",
      "major_revisions": "Potential but requires substantial improvement",
      "rejection": "Fundamental flaws or insufficient contribution"
    },
    "review_management": {
      "reviewer_selection": "Match expertise with manuscript topic",
      "deadline_management": "Monitor review progress and send reminders",
      "quality_control": "Ensure reviews meet journal standards"
    },
    "publication_process": {
      "proofing": "Ensure final manuscript meets publication standards",
      "metadata": "Assign DOI, volume, issue, and page numbers",
      "publication": "Make article available to readers"
    }
  }
}
```

## Resources

### Static Resources

#### `resource://journal/info`
Provides comprehensive information about the Cyan Science Journal.

#### `resource://submission/guidelines`
Provides detailed manuscript submission guidelines.

#### `resource://review/criteria`
Provides peer review evaluation criteria and scoring guidelines.

### Dynamic Resources

#### `manuscripts://{manuscript_id}`
Provides detailed information about a specific manuscript.

#### `articles://{article_id}`
Provides detailed information about a published article.

## Error Handling

All tools return structured responses with consistent error handling:

### Success Response
```json
{
  "success": true,
  "message": "Operation completed successfully",
  "data": {...}
}
```

### Error Response
```json
{
  "success": false,
  "error": "Detailed error message",
  "code": "ERROR_CODE",
  "details": {...}
}
```

### Common Error Codes

- `AUTHENTICATION_REQUIRED`: Auth token missing or invalid
- `INSUFFICIENT_PERMISSIONS`: User lacks required role
- `RESOURCE_NOT_FOUND`: Requested resource does not exist
- `VALIDATION_ERROR`: Request parameters invalid
- `RATE_LIMIT_EXCEEDED`: Too many requests
- `SERVER_ERROR`: Internal server error

## Rate Limiting

The server implements rate limiting to prevent abuse:
- **Authentication**: 10 requests per minute
- **General tools**: 100 requests per minute
- **File operations**: 20 requests per minute

## File Upload/Download

### File Upload
Files are uploaded as base64-encoded strings in the `file_data` parameter.

### File Download
Download URLs are provided as signed URLs with expiration times.

### Supported Formats
- PDF (recommended)
- Microsoft Word (.doc, .docx)
- Text files (.txt, .md)

### Size Limits
- Maximum file size: 50MB
- Recommended size: Under 10MB for optimal performance