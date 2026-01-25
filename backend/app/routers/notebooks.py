from fastapi import APIRouter, HTTPException, Depends
from typing import List
from uuid import UUID

from app.models.schemas import (
    NotebookCreate,
    NotebookUpdate,
    NotebookResponse,
    ApiResponse,
)
from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/notebooks", tags=["notebooks"])


@router.post(
    "",
    response_model=ApiResponse,
    summary="Create a new notebook",
    description="""Create a new research notebook for organizing sources and AI-powered conversations.

## Request Body

| Field | Type | Required | Default | Description |
|-------|------|----------|---------|-------------|
| `name` | string | Yes | - | Notebook name |
| `description` | string | No | null | Optional description |
| `emoji` | string | No | "📓" | Notebook icon/emoji |

## Response Format

```json
{
  "data": {
    "id": "uuid",
    "user_id": "uuid",
    "name": "My Research Notebook",
    "description": "Research on AI topics",
    "emoji": "📓",
    "settings": {},
    "file_search_store_id": null,
    "source_count": 0,
    "created_at": "2024-01-15T10:30:00Z",
    "updated_at": "2024-01-15T10:30:00Z"
  }
}
```

## Notebook Settings

Notebooks support customizable settings for AI behavior:
- **Persona**: Custom AI personality and response style
- **Tone**: Formal, casual, academic, etc.
- **Language**: Response language preference
- **Complexity**: Response complexity level

Settings can be updated via the PATCH endpoint.
""",
    responses={
        200: {
            "description": "Notebook created successfully",
            "content": {
                "application/json": {
                    "example": {
                        "data": {
                            "id": "550e8400-e29b-41d4-a716-446655440000",
                            "user_id": "440e8400-e29b-41d4-a716-446655440000",
                            "name": "AI Research Notebook",
                            "description": "Research on artificial intelligence",
                            "emoji": "🤖",
                            "settings": {},
                            "file_search_store_id": None,
                            "source_count": 0,
                            "created_at": "2024-01-15T10:30:00Z",
                            "updated_at": "2024-01-15T10:30:00Z"
                        }
                    }
                }
            }
        },
        400: {
            "description": "Invalid request data",
            "content": {
                "application/json": {
                    "example": {
                        "error": {
                            "code": 400,
                            "message": "Failed to create notebook"
                        }
                    }
                }
            }
        }
    }
)
async def create_notebook(
    notebook: NotebookCreate,
    user: dict = Depends(get_current_user),
):
    """Create a new notebook for organizing research sources and conversations."""
    supabase = get_supabase_client()

    # Create notebook record
    data = {
        "user_id": user["id"],
        "name": notebook.name,
        "description": notebook.description,
        "emoji": notebook.emoji,
        "settings": {},
    }

    result = supabase.table("notebooks").insert(data).execute()

    if not result.data:
        raise HTTPException(status_code=400, detail="Failed to create notebook")

    return ApiResponse(data=result.data[0])


@router.get("", response_model=ApiResponse)
async def list_notebooks(
    user: dict = Depends(get_current_user),
):
    """List all notebooks for the current user."""
    supabase = get_supabase_client()

    result = (
        supabase.table("notebooks")
        .select("*")
        .eq("user_id", user["id"])
        .order("created_at", desc=True)
        .execute()
    )

    return ApiResponse(data=result.data)


@router.get("/{notebook_id}", response_model=ApiResponse)
async def get_notebook(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Get a specific notebook."""
    supabase = get_supabase_client()

    result = (
        supabase.table("notebooks")
        .select("*")
        .eq("id", str(notebook_id))
        .eq("user_id", user["id"])
        .single()
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")

    return ApiResponse(data=result.data)


@router.patch("/{notebook_id}", response_model=ApiResponse)
async def update_notebook(
    notebook_id: UUID,
    notebook: NotebookUpdate,
    user: dict = Depends(get_current_user),
):
    """Update a notebook."""
    supabase = get_supabase_client()

    # Build update data (only include non-None fields)
    update_data = {}
    if notebook.name is not None:
        update_data["name"] = notebook.name
    if notebook.description is not None:
        update_data["description"] = notebook.description
    if notebook.emoji is not None:
        update_data["emoji"] = notebook.emoji
    if notebook.settings is not None:
        update_data["settings"] = notebook.settings

    if not update_data:
        raise HTTPException(status_code=400, detail="No fields to update")

    result = (
        supabase.table("notebooks")
        .update(update_data)
        .eq("id", str(notebook_id))
        .eq("user_id", user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")

    return ApiResponse(data=result.data[0])


@router.delete("/{notebook_id}", response_model=ApiResponse)
async def delete_notebook(
    notebook_id: UUID,
    user: dict = Depends(get_current_user),
):
    """Delete a notebook and all its contents."""
    supabase = get_supabase_client()

    # Delete notebook (cascades to sources, sessions, etc.)
    result = (
        supabase.table("notebooks")
        .delete()
        .eq("id", str(notebook_id))
        .eq("user_id", user["id"])
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Notebook not found")

    return ApiResponse(data={"deleted": True, "id": str(notebook_id)})
