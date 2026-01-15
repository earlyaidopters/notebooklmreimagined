# Supabase Database Setup

This directory contains everything needed to set up the Supabase database for NotebookLM Reimagined.

## Files

| File | Description |
|------|-------------|
| `schema.sql` | All 14 database tables with indexes |
| `rls_policies.sql` | Row Level Security policies for data isolation |
| `storage.sql` | Storage buckets and policies for file uploads |

## Setup Options

### Option 1: Using Claude Code with Supabase MCP (Recommended)

If you have the Supabase MCP configured in Claude Code, ask Claude to:

```
Set up the Supabase database using the SQL files in the supabase/ directory.
Apply schema.sql first, then rls_policies.sql, then storage.sql.
```

Claude will use these commands:
```
mcp__supabase__apply_migration  # For schema changes
mcp__supabase__execute_sql      # For policies and storage
```

### Option 2: Manual Setup via Supabase Dashboard

1. Go to your [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project
3. Navigate to **SQL Editor**
4. Run files in this order:
   - `schema.sql` - Creates all tables
   - `rls_policies.sql` - Enables security policies
   - `storage.sql` - Sets up file storage buckets

### Option 3: Using Supabase CLI

```bash
# Install Supabase CLI
npm install -g supabase

# Login
supabase login

# Link to your project
supabase link --project-ref YOUR_PROJECT_REF

# Run migrations
supabase db push
```

## Database Schema Overview

### Core Tables (14 total)

| Table | Purpose |
|-------|---------|
| `profiles` | User profiles (auto-created on signup) |
| `notebooks` | Research notebooks with settings |
| `sources` | Documents, URLs, YouTube videos, text |
| `chat_sessions` | Conversation threads per notebook |
| `chat_messages` | Individual messages with citations |
| `audio_overviews` | Generated podcast episodes |
| `video_overviews` | Generated video content |
| `research_tasks` | Deep research jobs |
| `notes` | User notes and saved responses |
| `study_materials` | Flashcards, quizzes, study guides |
| `studio_outputs` | Reports, slides, infographics |
| `api_keys` | Developer API keys |
| `api_key_usage_logs` | API usage tracking |
| `usage_logs` | General usage metrics |

### Storage Buckets

| Bucket | Purpose | Max Size |
|--------|---------|----------|
| `sources` | Uploaded documents | 50MB |
| `audio` | Generated audio files | 100MB |
| `video` | Generated video files | 500MB |
| `studio` | Generated documents | 50MB |

### Key Features

- **Row Level Security (RLS)**: All tables have RLS enabled. Users can only access their own data.
- **Auto Profile Creation**: Trigger automatically creates a profile when a user signs up.
- **Realtime Subscriptions**: `audio_overviews`, `video_overviews`, `research_tasks`, and `sources` support realtime updates.
- **Storage Policies**: Files are isolated by user ID path pattern: `{user_id}/{notebook_id}/{filename}`

## Environment Variables

After setup, add these to your `.env` files:

**Backend `.env`:**
```bash
SUPABASE_URL=https://YOUR_PROJECT.supabase.co
SUPABASE_ANON_KEY=eyJ...
SUPABASE_SERVICE_ROLE_KEY=eyJ...
```

**Frontend `.env.local`:**
```bash
NEXT_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJ...
```

## Verification

After running the migrations, verify setup:

1. **Check tables exist**: Go to Database > Tables in Supabase Dashboard
2. **Verify RLS is enabled**: Each table should show "RLS Enabled"
3. **Check storage buckets**: Go to Storage in Dashboard, verify 4 buckets exist
4. **Test auth**: Sign up a test user, verify profile is auto-created

## Troubleshooting

### "permission denied" errors
- Ensure RLS policies are applied (`rls_policies.sql`)
- Check the user is authenticated before making requests

### Storage upload fails
- Verify storage bucket exists
- Check file size limits
- Ensure file type is in allowed MIME types

### Realtime not working
- Verify tables are added to `supabase_realtime` publication
- Check Supabase Dashboard > Database > Replication
