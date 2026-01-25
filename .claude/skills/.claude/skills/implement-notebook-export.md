# Skill: Implement Full Notebook Export

Use this skill to implement the One-Click Full Notebook Export feature for NotebookLM Reimagined.

## Overview

Add the ability to export an entire notebook as a downloadable bundle containing:
- All sources (files, text content, URLs)
- All chat conversations with citations
- All notes
- All generated content (audio scripts, study materials, reports, etc.)
- Notebook metadata

Export formats: ZIP (with JSON + files) or single PDF document.

## Codebase Context

### Project Structure
```
frontend/src/
├── lib/export-utils.ts              # EXPAND THIS FILE
├── app/notebooks/[id]/page.tsx      # Add export button (minor)
├── components/studio/studio-panel.tsx # Alternative location for export button
└── lib/supabase.ts                  # Supabase client reference

backend/app/
├── routers/                         # CREATE: export.py
├── main.py                          # Register new router
└── services/supabase_client.py      # Reference for storage access
```

### Database Tables to Export
```sql
-- notebooks: id, name, description, emoji, settings, created_at
-- sources: id, name, type, status, metadata, source_guide, file_path
-- chat_sessions: id, title, created_at
-- chat_messages: session_id, role, content, citations, created_at
-- notes: id, title, content, tags, is_pinned, created_at
-- audio_overviews: id, format, script, audio_file_path, status
-- video_overviews: id, style, script, video_file_path, status
-- study_materials: id, type, data
-- studio_outputs: id, type, title, content
-- research_tasks: id, query, report_content, report_citations
```

### Existing Export Utils
File `frontend/src/lib/export-utils.ts` already has:
- `downloadAsExcel()` - Excel export
- `downloadAsPDF()` - PDF generation with jsPDF
- `exportSVGToPNG()` - Image export
- `downloadBlob()` - Generic blob download
- Various study material exporters

## Implementation Plan

### Step 1: Create Backend Export Router
File: `backend/app/routers/export.py`

```python
from fastapi import APIRouter, HTTPException, Depends
from fastapi.responses import StreamingResponse
from typing import Optional
from uuid import UUID
import json
import zipfile
import io

from app.services.auth import get_current_user
from app.services.supabase_client import get_supabase_client

router = APIRouter(prefix="/notebooks/{notebook_id}/export", tags=["export"])

@router.get("/json")
async def export_notebook_json(
    notebook_id: UUID,
    include_sources: bool = True,
    include_chats: bool = True,
    include_notes: bool = True,
    include_generated: bool = True,
    user: dict = Depends(get_current_user),
):
    """Export notebook data as JSON."""
    # Verify access, gather all data, return JSON
    pass

@router.get("/zip")
async def export_notebook_zip(
    notebook_id: UUID,
    include_sources: bool = True,
    include_chats: bool = True,
    include_notes: bool = True,
    include_generated: bool = True,
    user: dict = Depends(get_current_user),
):
    """Export notebook as ZIP with all files."""
    # Create ZIP in memory with:
    # - notebook.json (metadata)
    # - sources/ folder with actual files from storage
    # - chats.json
    # - notes.json
    # - generated/ folder
    pass
```

### Step 2: Register Router in main.py
```python
from app.routers import export
app.include_router(export.router)
```

### Step 3: Add Frontend API Route
File: `frontend/src/app/api/notebooks/[id]/export/route.ts`

Proxy to backend export endpoints.

### Step 4: Expand export-utils.ts
Add new functions:
```typescript
export async function exportNotebookAsZip(
  notebookId: string,
  options: ExportOptions
): Promise<void> {
  // Call backend /export/zip endpoint
  // Trigger download
}

export async function exportNotebookAsPDF(
  notebookId: string,
  options: ExportOptions
): Promise<void> {
  // Fetch all data via /export/json
  // Generate comprehensive PDF client-side
}

interface ExportOptions {
  includeSources?: boolean
  includeChats?: boolean
  includeNotes?: boolean
  includeGenerated?: boolean
  format: 'zip' | 'pdf'
}
```

### Step 5: Add Export UI
Location: `frontend/src/components/studio/studio-panel.tsx` OR notebook header

Add:
- Export button with dropdown (ZIP / PDF)
- Options dialog for include/exclude toggles
- Progress indicator for large exports

## ZIP Structure
```
notebook-export-{name}-{date}/
├── notebook.json           # Metadata: name, description, settings
├── sources/
│   ├── index.json         # Source metadata
│   ├── document1.pdf      # Actual files from storage
│   └── document2.txt
├── chats/
│   ├── index.json         # All sessions and messages
│   └── session-{id}.json  # Individual session files
├── notes/
│   └── index.json         # All notes
├── generated/
│   ├── audio/
│   │   └── podcast.mp3
│   ├── study-materials/
│   │   ├── flashcards.json
│   │   └── quiz.json
│   └── studio/
│       ├── report.json
│       └── slides.json
└── README.md              # Export info and instructions
```

## Files to Create/Modify

| File | Action |
|------|--------|
| `backend/app/routers/export.py` | CREATE - Export endpoints |
| `backend/app/main.py` | MODIFY - Register router |
| `frontend/src/app/api/notebooks/[id]/export/route.ts` | CREATE - API route |
| `frontend/src/lib/export-utils.ts` | MODIFY - Add notebook export functions |
| `frontend/src/components/studio/studio-panel.tsx` | MODIFY - Add export button |

## Files NOT to Touch
- `chat-panel.tsx`
- `sources-panel.tsx`
- Database schema (read-only)
- Any other routers

## Testing Checklist
- [ ] ZIP export downloads correctly
- [ ] ZIP contains all expected folders/files
- [ ] Source files are included from storage
- [ ] Chat history exports with citations
- [ ] Notes export correctly
- [ ] Generated content (audio, study materials) included
- [ ] Large notebooks don't timeout
- [ ] Empty notebooks export gracefully
- [ ] PDF export generates readable document

## Definition of Done
1. User can export notebook as ZIP with one click
2. ZIP contains organized folder structure
3. All notebook data is included based on options
4. Export works for notebooks of any size
5. Clear error handling for edge cases
