-- Supabase Application Tables Migration
-- This script creates the required tables for NotebookLM Reimagined
-- Execute via: docker exec supabase-db psql -U postgres -d postgres -f migrations/001_create_application_tables.sql

-- ============================================
-- EXTENSIONS
-- ============================================
-- Ensure UUID generation is available
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- ============================================
-- NOTEBOOKS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS notebooks (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  settings JSONB DEFAULT '{
    "model": "claude-3.5-sonnet",
    "temperature": 0.7,
    "max_tokens": 4096
  }'::jsonb,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for user queries
CREATE INDEX IF NOT EXISTS idx_notebooks_user_id ON notebooks(user_id);
CREATE INDEX IF NOT EXISTS idx_notebooks_created_at ON notebooks(created_at DESC);

-- ============================================
-- CHATS TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS chats (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  model TEXT DEFAULT 'claude-3.5-sonnet',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_chats_notebook_id ON chats(notebook_id);
CREATE INDEX IF NOT EXISTS idx_chats_user_id ON chats(user_id);
CREATE INDEX IF NOT EXISTS idx_chats_created_at ON chats(created_at DESC);

-- ============================================
-- MESSAGES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  chat_id UUID NOT NULL REFERENCES chats(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('user', 'assistant', 'system')),
  content TEXT NOT NULL,
  metadata JSONB DEFAULT '{}'::jsonb,
  tokens INTEGER,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_messages_chat_id ON messages(chat_id);
CREATE INDEX IF NOT EXISTS idx_messages_created_at ON messages(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_role ON messages(role);

-- ============================================
-- SOURCES TABLE
-- ============================================
CREATE TABLE IF NOT EXISTS sources (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notebook_id UUID NOT NULL REFERENCES notebooks(id) ON DELETE CASCADE,
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT,
  url TEXT,
  type TEXT CHECK (type IN ('pdf', 'youtube', 'website', 'text', 'note')),
  metadata JSONB DEFAULT '{}'::jsonb,
  embedding_created BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_sources_notebook_id ON sources(notebook_id);
CREATE INDEX IF NOT EXISTS idx_sources_user_id ON sources(user_id);
CREATE INDEX IF NOT EXISTS idx_sources_type ON sources(type);
CREATE INDEX IF NOT EXISTS idx_sources_created_at ON sources(created_at DESC);

-- ============================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================

-- Enable RLS on all tables
ALTER TABLE notebooks ENABLE ROW LEVEL SECURITY;
ALTER TABLE chats ENABLE ROW LEVEL SECURITY;
ALTER TABLE messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE sources ENABLE ROW LEVEL SECURITY;

-- ============================================
-- RLS POLICIES: NOTEBOOKS
-- ============================================

-- Users can view their own notebooks
CREATE POLICY "Users can view own notebooks"
  ON notebooks FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create their own notebooks
CREATE POLICY "Users can create own notebooks"
  ON notebooks FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own notebooks
CREATE POLICY "Users can update own notebooks"
  ON notebooks FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own notebooks
CREATE POLICY "Users can delete own notebooks"
  ON notebooks FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: CHATS
-- ============================================

-- Users can view chats in their notebooks
CREATE POLICY "Users can view own chats"
  ON chats FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create chats in their notebooks
CREATE POLICY "Users can create own chats"
  ON chats FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own chats
CREATE POLICY "Users can update own chats"
  ON chats FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own chats
CREATE POLICY "Users can delete own chats"
  ON chats FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- RLS POLICIES: MESSAGES
-- ============================================

-- Users can view messages in their chats
CREATE POLICY "Users can view own messages"
  ON messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Users can create messages in their chats
CREATE POLICY "Users can create own messages"
  ON messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Users can update their own messages
CREATE POLICY "Users can update own messages"
  ON messages FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- Users can delete their own messages
CREATE POLICY "Users can delete own messages"
  ON messages FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM chats
      WHERE chats.id = messages.chat_id
      AND chats.user_id = auth.uid()
    )
  );

-- ============================================
-- RLS POLICIES: SOURCES
-- ============================================

-- Users can view sources in their notebooks
CREATE POLICY "Users can view own sources"
  ON sources FOR SELECT
  USING (auth.uid() = user_id);

-- Users can create sources in their notebooks
CREATE POLICY "Users can create own sources"
  ON sources FOR INSERT
  WITH CHECK (auth.uid() = user_id);

-- Users can update their own sources
CREATE POLICY "Users can update own sources"
  ON sources FOR UPDATE
  USING (auth.uid() = user_id);

-- Users can delete their own sources
CREATE POLICY "Users can delete own sources"
  ON sources FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================
-- FUNCTIONS AND TRIGGERS
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers for updated_at
CREATE TRIGGER update_notebooks_updated_at BEFORE UPDATE ON notebooks
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_chats_updated_at BEFORE UPDATE ON chats
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_sources_updated_at BEFORE UPDATE ON sources
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- HELPER FUNCTIONS
-- ============================================

-- Function to get notebook stats
CREATE OR REPLACE FUNCTION get_notebook_stats(p_notebook_id UUID)
RETURNS TABLE (
  chats_count BIGINT,
  messages_count BIGINT,
  sources_count BIGINT
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    (SELECT COUNT(*) FROM chats WHERE notebook_id = p_notebook_id),
    (SELECT COUNT(*) FROM messages WHERE chat_id IN (SELECT id FROM chats WHERE notebook_id = p_notebook_id)),
    (SELECT COUNT(*) FROM sources WHERE notebook_id = p_notebook_id);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SAMPLE DATA (Optional - for testing)
-- ============================================

-- Uncomment to insert sample data (requires a real user ID from auth.users)
/*
INSERT INTO notebooks (user_id, title, description) VALUES
  ('<user-uuid-here>', 'My First Notebook', 'A test notebook'),
  ('<user-uuid-here>', 'Research Notes', 'Notes for research project');

INSERT INTO chats (notebook_id, user_id, title) VALUES
  ((SELECT id FROM notebooks LIMIT 1), '<user-uuid-here>', 'Initial Chat');

INSERT INTO messages (chat_id, role, content) VALUES
  ((SELECT id FROM chats LIMIT 1), 'user', 'Hello, this is a test message'),
  ((SELECT id FROM chats LIMIT 1), 'assistant', 'Hello! I am your assistant.');
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================

-- Run these to verify the migration

-- Check tables were created
-- SELECT tablename FROM pg_tables WHERE schemaname = 'public';

-- Check RLS is enabled
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public';

-- Check policies
-- SELECT schemaname, tablename, policyname FROM pg_policies WHERE schemaname = 'public';

-- Check indexes
-- SELECT indexname, tablename FROM pg_indexes WHERE schemaname = 'public';

-- ============================================
-- COMPLETE
-- ============================================

-- Migration completed successfully
-- Run: python3 test_supabase_integration.py to verify
