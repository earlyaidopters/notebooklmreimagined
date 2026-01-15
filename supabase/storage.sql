-- ============================================================================
-- NotebookLM Reimagined - Storage Buckets & Policies
-- ============================================================================
-- Run this AFTER schema.sql to set up file storage.
-- ============================================================================

-- ============================================================================
-- CREATE STORAGE BUCKETS
-- ============================================================================

-- Sources bucket (PDFs, documents, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'sources',
  'sources',
  false,
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain', 'audio/mpeg', 'audio/wav', 'audio/mp4']
) ON CONFLICT (id) DO NOTHING;

-- Audio bucket (generated audio overviews)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'audio',
  'audio',
  false,
  104857600,  -- 100MB limit
  ARRAY['audio/mpeg', 'audio/wav', 'audio/mp4', 'audio/webm']
) ON CONFLICT (id) DO NOTHING;

-- Video bucket (generated videos)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'video',
  'video',
  false,
  524288000,  -- 500MB limit
  ARRAY['video/mp4', 'video/webm', 'video/quicktime']
) ON CONFLICT (id) DO NOTHING;

-- Studio bucket (generated documents, slides, etc.)
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'studio',
  'studio',
  false,
  52428800,  -- 50MB limit
  ARRAY['application/pdf', 'application/vnd.openxmlformats-officedocument.presentationml.presentation', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'image/png', 'image/jpeg']
) ON CONFLICT (id) DO NOTHING;

-- ============================================================================
-- STORAGE POLICIES
-- ============================================================================
-- File path pattern: {user_id}/{notebook_id}/{filename}
-- This ensures users can only access their own files.
-- ============================================================================

-- SOURCES BUCKET POLICIES
DROP POLICY IF EXISTS "Users can upload to own sources folder" ON storage.objects;
CREATE POLICY "Users can upload to own sources folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'sources' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own sources" ON storage.objects;
CREATE POLICY "Users can view own sources"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'sources' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can update own sources" ON storage.objects;
CREATE POLICY "Users can update own sources"
  ON storage.objects FOR UPDATE
  USING (
    bucket_id = 'sources' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own sources" ON storage.objects;
CREATE POLICY "Users can delete own sources"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'sources' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- AUDIO BUCKET POLICIES
DROP POLICY IF EXISTS "Users can upload to own audio folder" ON storage.objects;
CREATE POLICY "Users can upload to own audio folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own audio" ON storage.objects;
CREATE POLICY "Users can view own audio"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own audio" ON storage.objects;
CREATE POLICY "Users can delete own audio"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'audio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- VIDEO BUCKET POLICIES
DROP POLICY IF EXISTS "Users can upload to own video folder" ON storage.objects;
CREATE POLICY "Users can upload to own video folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'video' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own video" ON storage.objects;
CREATE POLICY "Users can view own video"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'video' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own video" ON storage.objects;
CREATE POLICY "Users can delete own video"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'video' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- STUDIO BUCKET POLICIES
DROP POLICY IF EXISTS "Users can upload to own studio folder" ON storage.objects;
CREATE POLICY "Users can upload to own studio folder"
  ON storage.objects FOR INSERT
  WITH CHECK (
    bucket_id = 'studio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can view own studio files" ON storage.objects;
CREATE POLICY "Users can view own studio files"
  ON storage.objects FOR SELECT
  USING (
    bucket_id = 'studio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

DROP POLICY IF EXISTS "Users can delete own studio files" ON storage.objects;
CREATE POLICY "Users can delete own studio files"
  ON storage.objects FOR DELETE
  USING (
    bucket_id = 'studio' AND
    auth.uid()::text = (storage.foldername(name))[1]
  );

-- ============================================================================
-- ENABLE REALTIME FOR PROGRESS UPDATES
-- ============================================================================
-- These tables need realtime subscriptions for progress tracking

ALTER PUBLICATION supabase_realtime ADD TABLE audio_overviews;
ALTER PUBLICATION supabase_realtime ADD TABLE video_overviews;
ALTER PUBLICATION supabase_realtime ADD TABLE research_tasks;
ALTER PUBLICATION supabase_realtime ADD TABLE sources;
