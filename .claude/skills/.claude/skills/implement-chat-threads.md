# Skill: Implement Enhanced Chat Threads UI

Use this skill to implement the Multiple Parallel Chat Threads feature for NotebookLM Reimagined.

## Overview

Add a polished chat thread management UI that allows users to:
- See all chat threads in a sidebar/tabs view
- Switch between threads seamlessly
- Rename threads
- Search/filter threads
- Create new threads with one click

## Codebase Context

### Project Structure
```
frontend/src/
├── components/chat/chat-panel.tsx    # MAIN FILE TO MODIFY
├── app/notebooks/[id]/page.tsx       # Parent page (read-only reference)
└── lib/api.ts                        # API client (read-only reference)

backend/app/
├── routers/chat.py                   # Already has sessions API (no changes needed)
└── models/schemas.py                 # Existing schemas (no changes needed)
```

### Database Schema (Already Exists)
```sql
-- chat_sessions table (already exists, no migration needed)
- id: uuid
- notebook_id: uuid
- title: text (nullable)
- created_at: timestamptz
- updated_at: timestamptz

-- chat_messages table (already exists)
- id: uuid
- session_id: uuid (FK to chat_sessions)
- role: text
- content: text
- citations: jsonb
- ...
```

### Existing API Endpoints (Already Working)
- `GET /api/notebooks/{id}/chat/sessions` - List all sessions
- `GET /api/notebooks/{id}/chat/sessions/{sessionId}` - Get session with messages
- `DELETE /api/notebooks/{id}/chat/sessions/{sessionId}` - Delete session
- `POST /api/notebooks/{id}/chat` - Send message (creates session if needed)

### Current UI State
The `chat-panel.tsx` already has:
- A dropdown menu showing sessions
- `onLoadSession`, `onNewChat`, `onDeleteSession` handlers
- Session switching works

What's MISSING:
- Sidebar view for threads (currently just a dropdown)
- Rename thread capability
- Thread search/filter
- Better visual hierarchy

## Implementation Plan

### Step 1: Add Rename Session Endpoint (Backend)
File: `backend/app/routers/chat.py`

Add a PATCH endpoint:
```python
@router.patch("/sessions/{session_id}", response_model=ApiResponse)
async def rename_session(
    notebook_id: UUID,
    session_id: UUID,
    title: str,
    user: dict = Depends(get_current_user),
):
    """Rename a chat session."""
    await verify_notebook_access(notebook_id, user["id"])
    supabase = get_supabase_client()

    result = (
        supabase.table("chat_sessions")
        .update({"title": title})
        .eq("id", str(session_id))
        .eq("notebook_id", str(notebook_id))
        .execute()
    )

    if not result.data:
        raise HTTPException(status_code=404, detail="Session not found")

    return ApiResponse(data=result.data[0])
```

### Step 2: Add Frontend API Route
File: `frontend/src/app/api/notebooks/[id]/chat/sessions/[sessionId]/route.ts`

Add PATCH handler for rename.

### Step 3: Enhance Chat Panel UI
File: `frontend/src/components/chat/chat-panel.tsx`

Key changes:
1. Add a collapsible sidebar mode (toggle between dropdown and sidebar)
2. Add inline rename (double-click to edit)
3. Add search input to filter threads
4. Add visual indicators for active thread
5. Show message preview in thread list

### UI Design Guidelines
- Use existing design system variables: `var(--bg-primary)`, `var(--accent-primary)`, etc.
- Use Phosphor-style icons (already using lucide-react)
- Animations with framer-motion
- Follow existing component patterns

## Files to Modify

| File | Action |
|------|--------|
| `backend/app/routers/chat.py` | Add PATCH endpoint for rename |
| `frontend/src/app/api/notebooks/[id]/chat/sessions/[sessionId]/route.ts` | Add PATCH handler |
| `frontend/src/components/chat/chat-panel.tsx` | Enhance UI |

## Files NOT to Touch
- `three-panel-layout.tsx`
- `sources-panel.tsx`
- `studio-panel.tsx`
- Any database migrations (schema already exists)

## Testing Checklist
- [ ] Can create new chat thread
- [ ] Can switch between threads
- [ ] Messages persist when switching
- [ ] Can rename thread (double-click or edit button)
- [ ] Can delete thread
- [ ] Search filters threads correctly
- [ ] UI is responsive
- [ ] No console errors

## Definition of Done
1. All tests pass
2. UI matches existing design system
3. No breaking changes to existing chat functionality
4. Code follows existing patterns in codebase
