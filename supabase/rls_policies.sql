-- ============================================================================
-- NotebookLM Reimagined - Row Level Security (RLS) Policies
-- ============================================================================
-- Run this AFTER schema.sql to enable data isolation per user.
-- ============================================================================

-- ============================================================================
-- ENABLE RLS ON ALL TABLES
-- ============================================================================
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE audio_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE video_overviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE research_tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE study_materials ENABLE ROW LEVEL SECURITY;
ALTER TABLE studio_outputs ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_keys ENABLE ROW LEVEL SECURITY;
ALTER TABLE api_key_usage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE usage_logs ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- PROFILES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own profile" ON profiles;
CREATE POLICY "Users can view own profile"
  ON profiles FOR SELECT
  USING (auth.uid() = id);

DROP POLICY IF EXISTS "Users can update own profile" ON profiles;
CREATE POLICY "Users can update own profile"
  ON profiles FOR UPDATE
  USING (auth.uid() = id);

-- ============================================================================
-- NOTEBOOKS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own notebooks" ON notebooks;
CREATE POLICY "Users can view own notebooks"
  ON notebooks FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own notebooks" ON notebooks;
CREATE POLICY "Users can create own notebooks"
  ON notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own notebooks" ON notebooks;
CREATE POLICY "Users can update own notebooks"
  ON notebooks FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own notebooks" ON notebooks;
CREATE POLICY "Users can delete own notebooks"
  ON notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- SOURCES POLICIES (access via notebook ownership)
-- ============================================================================
DROP POLICY IF EXISTS "Users can view sources in own notebooks" ON sources;
CREATE POLICY "Users can view sources in own notebooks"
  ON sources FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create sources in own notebooks" ON sources;
CREATE POLICY "Users can create sources in own notebooks"
  ON sources FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update sources in own notebooks" ON sources;
CREATE POLICY "Users can update sources in own notebooks"
  ON sources FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete sources in own notebooks" ON sources;
CREATE POLICY "Users can delete sources in own notebooks"
  ON sources FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- ============================================================================
-- CHAT SESSIONS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view chat sessions in own notebooks" ON chat_sessions;
CREATE POLICY "Users can view chat sessions in own notebooks"
  ON chat_sessions FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create chat sessions in own notebooks" ON chat_sessions;
CREATE POLICY "Users can create chat sessions in own notebooks"
  ON chat_sessions FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update chat sessions in own notebooks" ON chat_sessions;
CREATE POLICY "Users can update chat sessions in own notebooks"
  ON chat_sessions FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete chat sessions in own notebooks" ON chat_sessions;
CREATE POLICY "Users can delete chat sessions in own notebooks"
  ON chat_sessions FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- ============================================================================
-- CHAT MESSAGES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view messages in own sessions" ON chat_messages;
CREATE POLICY "Users can view messages in own sessions"
  ON chat_messages FOR SELECT
  USING (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN notebooks n ON cs.notebook_id = n.id
    WHERE n.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can create messages in own sessions" ON chat_messages;
CREATE POLICY "Users can create messages in own sessions"
  ON chat_messages FOR INSERT
  WITH CHECK (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN notebooks n ON cs.notebook_id = n.id
    WHERE n.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Users can delete messages in own sessions" ON chat_messages;
CREATE POLICY "Users can delete messages in own sessions"
  ON chat_messages FOR DELETE
  USING (session_id IN (
    SELECT cs.id FROM chat_sessions cs
    JOIN notebooks n ON cs.notebook_id = n.id
    WHERE n.user_id = auth.uid()
  ));

-- ============================================================================
-- AUDIO OVERVIEWS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view audio in own notebooks" ON audio_overviews;
CREATE POLICY "Users can view audio in own notebooks"
  ON audio_overviews FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create audio in own notebooks" ON audio_overviews;
CREATE POLICY "Users can create audio in own notebooks"
  ON audio_overviews FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update audio in own notebooks" ON audio_overviews;
CREATE POLICY "Users can update audio in own notebooks"
  ON audio_overviews FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete audio in own notebooks" ON audio_overviews;
CREATE POLICY "Users can delete audio in own notebooks"
  ON audio_overviews FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- ============================================================================
-- VIDEO OVERVIEWS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view video in own notebooks" ON video_overviews;
CREATE POLICY "Users can view video in own notebooks"
  ON video_overviews FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create video in own notebooks" ON video_overviews;
CREATE POLICY "Users can create video in own notebooks"
  ON video_overviews FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update video in own notebooks" ON video_overviews;
CREATE POLICY "Users can update video in own notebooks"
  ON video_overviews FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete video in own notebooks" ON video_overviews;
CREATE POLICY "Users can delete video in own notebooks"
  ON video_overviews FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- ============================================================================
-- RESEARCH TASKS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view research in own notebooks" ON research_tasks;
CREATE POLICY "Users can view research in own notebooks"
  ON research_tasks FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create research in own notebooks" ON research_tasks;
CREATE POLICY "Users can create research in own notebooks"
  ON research_tasks FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update research in own notebooks" ON research_tasks;
CREATE POLICY "Users can update research in own notebooks"
  ON research_tasks FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete research in own notebooks" ON research_tasks;
CREATE POLICY "Users can delete research in own notebooks"
  ON research_tasks FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- ============================================================================
-- NOTES POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view notes in own notebooks" ON notes;
CREATE POLICY "Users can view notes in own notebooks"
  ON notes FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create notes in own notebooks" ON notes;
CREATE POLICY "Users can create notes in own notebooks"
  ON notes FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update notes in own notebooks" ON notes;
CREATE POLICY "Users can update notes in own notebooks"
  ON notes FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete notes in own notebooks" ON notes;
CREATE POLICY "Users can delete notes in own notebooks"
  ON notes FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- ============================================================================
-- STUDY MATERIALS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view study materials in own notebooks" ON study_materials;
CREATE POLICY "Users can view study materials in own notebooks"
  ON study_materials FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create study materials in own notebooks" ON study_materials;
CREATE POLICY "Users can create study materials in own notebooks"
  ON study_materials FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update study materials in own notebooks" ON study_materials;
CREATE POLICY "Users can update study materials in own notebooks"
  ON study_materials FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete study materials in own notebooks" ON study_materials;
CREATE POLICY "Users can delete study materials in own notebooks"
  ON study_materials FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- ============================================================================
-- STUDIO OUTPUTS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view studio outputs in own notebooks" ON studio_outputs;
CREATE POLICY "Users can view studio outputs in own notebooks"
  ON studio_outputs FOR SELECT
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create studio outputs in own notebooks" ON studio_outputs;
CREATE POLICY "Users can create studio outputs in own notebooks"
  ON studio_outputs FOR INSERT
  WITH CHECK (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can update studio outputs in own notebooks" ON studio_outputs;
CREATE POLICY "Users can update studio outputs in own notebooks"
  ON studio_outputs FOR UPDATE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can delete studio outputs in own notebooks" ON studio_outputs;
CREATE POLICY "Users can delete studio outputs in own notebooks"
  ON studio_outputs FOR DELETE
  USING (notebook_id IN (SELECT id FROM notebooks WHERE user_id = auth.uid()));

-- ============================================================================
-- API KEYS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own api keys" ON api_keys;
CREATE POLICY "Users can view own api keys"
  ON api_keys FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own api keys" ON api_keys;
CREATE POLICY "Users can create own api keys"
  ON api_keys FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can update own api keys" ON api_keys;
CREATE POLICY "Users can update own api keys"
  ON api_keys FOR UPDATE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can delete own api keys" ON api_keys;
CREATE POLICY "Users can delete own api keys"
  ON api_keys FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- API KEY USAGE LOGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own api key usage" ON api_key_usage_logs;
CREATE POLICY "Users can view own api key usage"
  ON api_key_usage_logs FOR SELECT
  USING (api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid()));

DROP POLICY IF EXISTS "Users can create own api key usage" ON api_key_usage_logs;
CREATE POLICY "Users can create own api key usage"
  ON api_key_usage_logs FOR INSERT
  WITH CHECK (api_key_id IN (SELECT id FROM api_keys WHERE user_id = auth.uid()));

-- ============================================================================
-- USAGE LOGS POLICIES
-- ============================================================================
DROP POLICY IF EXISTS "Users can view own usage logs" ON usage_logs;
CREATE POLICY "Users can view own usage logs"
  ON usage_logs FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users can create own usage logs" ON usage_logs;
CREATE POLICY "Users can create own usage logs"
  ON usage_logs FOR INSERT
  WITH CHECK (auth.uid() = user_id);
