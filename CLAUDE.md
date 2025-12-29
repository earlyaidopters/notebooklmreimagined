# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Auto-Compact Behavior

**IMPORTANT**: Proactively compact without asking:

1. After ~40-50 tool calls or when conversation feels long, run `/compact` automatically
2. Don't ask permission - just compact and continue working seamlessly
3. In the compact summary, always preserve:
   - Current task state and progress
   - File paths being worked on
   - Pending todos and next steps
   - Key decisions made
   - Any errors encountered and their fixes
4. After compacting, immediately continue the current task

This ensures conversations never hit context limits and work continues uninterrupted.

## Project Overview

NotebookLM Reimagined is an API-first research intelligence platform—Google's NotebookLM, reimagined for developers.

**Architecture**: `Next.js (Frontend) → FastAPI (Backend) → Supabase (Auth + DB + Storage) → Gemini API`

## Critical: Keeping Code in Sync

**IMPORTANT**: When modifying any router functions or service code:

1. **Test ALL affected endpoints** - Run programmatic tests after changes
2. **Check for null-safety patterns** - Database fields like `source_guide`, `metadata` can be `None`
   ```python
   # WRONG - fails if source_guide is None
   source.get("source_guide", {}).get("summary")

   # CORRECT - handles None values
   source_guide = source.get("source_guide") or {}
   source_guide.get("summary")
   ```
3. **Update documentation** - Keep `/docs` page in sync with API changes
4. **Register new routers** - Don't forget to add to `main.py` imports AND `include_router()` calls

Common files that share patterns (update ALL when fixing bugs):
- `chat.py`, `study.py`, `audio.py`, `video.py`, `studio.py`, `global_chat.py` - all have source content extraction

## Development with Supabase MCP

This project is designed to be built using Supabase MCP. Use these commands for direct database/infrastructure management:

```
mcp__supabase__list_projects              # Find project ID
mcp__supabase__list_tables                # View current schema
mcp__supabase__apply_migration            # Create/modify tables (for DDL)
mcp__supabase__execute_sql                # Run queries (for DML)
mcp__supabase__generate_typescript_types  # Generate frontend types
```

**No Docker, Redis, or Celery required** - Supabase handles all infrastructure.

## UI Testing with Chrome MCP

Use the built-in Chrome MCP tools to visually verify UI changes and test frontend functionality:

```
mcp__claude-in-chrome__tabs_context_mcp   # Get available browser tabs
mcp__claude-in-chrome__navigate           # Navigate to URLs
mcp__claude-in-chrome__computer           # Take screenshots, click, type
mcp__claude-in-chrome__read_page          # Get accessibility tree of page elements
mcp__claude-in-chrome__find               # Find elements by description
mcp__claude-in-chrome__form_input         # Fill form fields
```

Always verify UI changes visually after implementing frontend components.

## Technology Stack

| Layer | Technology |
|-------|------------|
| Database | Supabase PostgreSQL |
| Auth | Supabase Auth (JWT + RLS) |
| File Storage | Supabase Storage |
| API | FastAPI (Python) |
| Background Jobs | Supabase Edge Functions |
| Realtime Updates | Supabase Realtime |
| AI/RAG | Gemini API (File Search, TTS, Veo, Deep Research) |
| Frontend | Next.js 14+ with shadcn/ui + Tailwind |

## Database Schema (11 tables)

- **profiles** - Extends Supabase Auth users
- **notebooks** - Contains `file_search_store_id` linking to Gemini File Search Store
- **sources** - Documents stored in Supabase Storage, indexed in Gemini File Search
- **chat_sessions** / **chat_messages** - Conversations with citations
- **audio_overviews** / **video_overviews** - Generation jobs (subscribe via Realtime)
- **research_tasks** - Deep Research jobs
- **notes** - User notes and saved responses
- **usage_logs** - Cost tracking per operation

All tables require RLS policies for user data isolation.

## Planned Directory Structure

```
backend/
├── app/
│   ├── main.py              # FastAPI entry point
│   ├── config.py
│   ├── routers/             # notebooks, sources, chat, audio, video, research, study
│   ├── services/            # gemini, file_search, audio_gen, video_gen
│   └── models/schemas.py    # Pydantic models
└── requirements.txt

frontend/
├── app/
│   ├── layout.tsx
│   ├── page.tsx             # Dashboard
│   ├── auth/                # Login/register
│   └── notebooks/[id]/      # Three-panel notebook view
├── components/              # sources/, chat/, studio/, ui/
└── lib/                     # supabase.ts, api.ts
```

## Key Integration Patterns

### Gemini File Search (RAG)
Each notebook maps to a Gemini File Search Store—no custom vector database needed:
```python
# Create store on notebook creation
store = genai.FileSearchStore.create(name=f"notebook_{notebook_id}")

# Query with File Search tool
response = model.generate_content(
    contents=user_message,
    tools=[genai.Tool.from_file_search(store_id=store.id)]
)
```

### Response Format
All API responses include cost transparency:
```json
{
  "data": { ... },
  "usage": {
    "input_tokens": 1500,
    "output_tokens": 500,
    "cost_usd": 0.0023,
    "model_used": "gemini-2.5-flash"
  }
}
```

### Realtime Job Updates
Long-running jobs (audio, video, research) update database tables; clients subscribe via Supabase Realtime.

## Gemini Models Reference

| Feature | Model |
|---------|-------|
| Chat (fast) | gemini-2.5-flash |
| Chat (quality) | gemini-3-pro |
| Audio scripts | gemini-2.5-pro |
| TTS | gemini-2.5-pro-tts-preview |
| Video | veo-3.1-fast-preview |
| Deep Research | deep-research-pro-preview |

## Environment Variables

```bash
NEXT_PUBLIC_SUPABASE_URL=https://xxx.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
GOOGLE_API_KEY=AIza...
```

## MVP Implementation Order

1. Database schema setup (use Supabase MCP)
2. Notebooks CRUD endpoints
3. Source upload (Storage → Gemini File Search)
4. RAG Chat with citations
5. Basic frontend (dashboard + three-panel notebook view)
6. Audio Overview generation
7. Deploy

## Core Specification Documents

- `01_VISION_DOCUMENT.md` - High-level vision and philosophy
- `02_PROJECT_SPECIFICATION.md` - Complete technical spec (schema, 40+ endpoints, features)
- `IMPLEMENTATION_CHECKLIST.md` - Step-by-step implementation guide
