-- ============================================================================
-- NotebookLM Reimagined - Complete Supabase Schema
-- ============================================================================
-- Run this file to set up all database tables for a new Supabase project.
--
-- Usage with Supabase MCP:
--   mcp__supabase__apply_migration with name="initial_schema" and this content
--
-- Or run directly in Supabase SQL Editor.
-- ============================================================================

-- ============================================================================
-- 1. PROFILES (extends Supabase Auth users)
-- ============================================================================
CREATE TABLE IF NOT EXISTS profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  name TEXT,
  avatar_url TEXT,
  settings JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, name)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'name', ''));
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- ============================================================================
-- 2. NOTEBOOKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  emoji TEXT DEFAULT '📓',
  settings JSONB DEFAULT '{}',
  file_search_store_id TEXT,
  source_count INT DEFAULT 0,
  is_featured BOOLEAN DEFAULT FALSE,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_is_featured ON notebooks(is_featured) WHERE is_featured = true;
CREATE INDEX IF NOT EXISTS idx_notebooks_is_archived ON notebooks(is_archived) WHERE is_archived = true;

-- ============================================================================
-- 3. SOURCES
-- ============================================================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL,  -- 'pdf', 'docx', 'txt', 'youtube', 'url', 'audio', 'text'
  name TEXT NOT NULL,
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'ready', 'failed'
  file_path TEXT,
  original_filename TEXT,
  mime_type TEXT,
  file_size_bytes BIGINT,
  token_count INT,
  metadata JSONB DEFAULT '{}',
  source_guide JSONB,  -- { summary, topics, suggested_questions }
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_sources_notebook_id ON sources(notebook_id);

-- ============================================================================
-- 4. CHAT SESSIONS
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  title TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_notebook_id ON chat_sessions(notebook_id);

-- ============================================================================
-- 5. CHAT MESSAGES
-- ============================================================================
CREATE TABLE IF NOT EXISTS chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES chat_sessions(id) ON DELETE CASCADE NOT NULL,
  role TEXT NOT NULL,  -- 'user', 'assistant'
  content TEXT NOT NULL,
  citations JSONB DEFAULT '[]',
  source_ids_used JSONB DEFAULT '[]',
  model_used TEXT,
  input_tokens INT,
  output_tokens INT,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id ON chat_messages(session_id);

-- ============================================================================
-- 6. AUDIO OVERVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS audio_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  format TEXT NOT NULL,  -- 'deep_dive', 'brief', 'critique', 'debate'
  status TEXT DEFAULT 'pending',  -- 'pending', 'processing', 'completed', 'failed'
  progress_percent INT DEFAULT 0,
  custom_instructions TEXT,
  source_ids JSONB DEFAULT '[]',
  script TEXT,
  audio_file_path TEXT,
  duration_seconds INT,
  model_used TEXT,
  cost_usd DECIMAL(10,4),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_audio_overviews_notebook_id ON audio_overviews(notebook_id);

-- ============================================================================
-- 7. VIDEO OVERVIEWS
-- ============================================================================
CREATE TABLE IF NOT EXISTS video_overviews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  style TEXT NOT NULL,  -- 'documentary', 'explainer', 'presentation'
  status TEXT DEFAULT 'pending',
  progress_percent INT DEFAULT 0,
  source_ids JSONB DEFAULT '[]',
  script TEXT,
  video_file_path TEXT,
  thumbnail_path TEXT,
  duration_seconds INT,
  model_used TEXT,
  cost_usd DECIMAL(10,4),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_video_overviews_notebook_id ON video_overviews(notebook_id);

-- ============================================================================
-- 8. RESEARCH TASKS
-- ============================================================================
CREATE TABLE IF NOT EXISTS research_tasks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  query TEXT NOT NULL,
  mode TEXT DEFAULT 'fast',  -- 'fast', 'deep'
  status TEXT DEFAULT 'pending',
  progress_message TEXT,
  sources_found_count INT DEFAULT 0,
  sources_analyzed_count INT DEFAULT 0,
  report_content TEXT,
  report_citations JSONB DEFAULT '[]',
  model_used TEXT,
  cost_usd DECIMAL(10,4),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_research_tasks_notebook_id ON research_tasks(notebook_id);

-- ============================================================================
-- 9. NOTES
-- ============================================================================
CREATE TABLE IF NOT EXISTS notes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  type TEXT DEFAULT 'written',  -- 'written', 'saved_response'
  title TEXT,
  content TEXT,
  tags JSONB DEFAULT '[]',
  is_pinned BOOLEAN DEFAULT FALSE,
  original_message_id UUID REFERENCES chat_messages(id),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notes_notebook_id ON notes(notebook_id);

-- ============================================================================
-- 10. STUDY MATERIALS
-- ============================================================================
CREATE TABLE IF NOT EXISTS study_materials (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('flashcards', 'quiz', 'study_guide', 'faq', 'mind_map')),
  source_ids UUID[] DEFAULT '{}',
  data JSONB NOT NULL,
  model_used TEXT,
  cost_usd DECIMAL(10,6),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_study_materials_notebook_id ON study_materials(notebook_id);

-- ============================================================================
-- 11. STUDIO OUTPUTS
-- ============================================================================
CREATE TABLE IF NOT EXISTS studio_outputs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID REFERENCES notebooks(id) ON DELETE CASCADE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('data_table', 'report', 'slide_deck', 'infographic')),
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processing', 'completed', 'failed')),
  title TEXT,
  custom_instructions TEXT,
  source_ids UUID[] DEFAULT '{}',
  content JSONB DEFAULT '{}',
  file_path TEXT,
  thumbnail_path TEXT,
  model_used TEXT,
  cost_usd DECIMAL(10,6),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ
);

CREATE INDEX IF NOT EXISTS idx_studio_outputs_notebook_id ON studio_outputs(notebook_id);

-- ============================================================================
-- 12. API KEYS
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_keys (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  name VARCHAR NOT NULL,
  description TEXT,
  key_prefix VARCHAR NOT NULL,
  key_hash VARCHAR NOT NULL,
  scopes TEXT[] DEFAULT ARRAY['*'],
  rate_limit_rpm INT DEFAULT 60,
  rate_limit_rpd INT DEFAULT 10000,
  allowed_ips TEXT[] DEFAULT '{}',
  is_active BOOLEAN DEFAULT TRUE,
  last_used_at TIMESTAMPTZ,
  expires_at TIMESTAMPTZ,
  total_requests BIGINT DEFAULT 0,
  total_tokens_in BIGINT DEFAULT 0,
  total_tokens_out BIGINT DEFAULT 0,
  total_cost_usd DECIMAL(10,6) DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_keys_user_id ON api_keys(user_id);
CREATE INDEX IF NOT EXISTS idx_api_keys_key_hash ON api_keys(key_hash);

-- ============================================================================
-- 13. API KEY USAGE LOGS
-- ============================================================================
CREATE TABLE IF NOT EXISTS api_key_usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  api_key_id UUID REFERENCES api_keys(id) ON DELETE CASCADE NOT NULL,
  endpoint VARCHAR NOT NULL,
  method VARCHAR NOT NULL,
  status_code INT NOT NULL,
  response_time_ms INT,
  input_tokens INT DEFAULT 0,
  output_tokens INT DEFAULT 0,
  cost_usd DECIMAL(10,6) DEFAULT 0,
  ip_address INET,
  user_agent TEXT,
  request_id VARCHAR,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_api_key_id ON api_key_usage_logs(api_key_id);
CREATE INDEX IF NOT EXISTS idx_api_key_usage_logs_created_at ON api_key_usage_logs(created_at);

-- ============================================================================
-- 14. USAGE LOGS (general usage tracking)
-- ============================================================================
CREATE TABLE IF NOT EXISTS usage_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  notebook_id UUID REFERENCES notebooks(id) ON DELETE SET NULL,
  operation_type TEXT NOT NULL,
  model_used TEXT,
  input_tokens INT,
  output_tokens INT,
  cost_usd DECIMAL(10,6),
  metadata JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_usage_logs_user_id ON usage_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_usage_logs_created_at ON usage_logs(created_at);
