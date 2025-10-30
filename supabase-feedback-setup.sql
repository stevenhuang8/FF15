-- ============================================
-- Food & Fitness AI - Feedback System Setup
-- ============================================
-- Run this script in your Supabase SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new

-- ============================================
-- 1. CREATE FEEDBACK TABLE
-- ============================================

CREATE TABLE IF NOT EXISTS public.feedback (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  feedback_type TEXT NOT NULL CHECK (feedback_type IN ('bug', 'feature', 'complaint', 'general')),
  description TEXT NOT NULL,
  email TEXT,
  attachment_url TEXT,
  attachment_path TEXT,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'reviewed', 'resolved', 'closed')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================
-- 2. CREATE INDEXES FOR PERFORMANCE
-- ============================================

CREATE INDEX IF NOT EXISTS idx_feedback_user_id ON public.feedback(user_id);
CREATE INDEX IF NOT EXISTS idx_feedback_status ON public.feedback(status);
CREATE INDEX IF NOT EXISTS idx_feedback_created_at ON public.feedback(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_feedback_type ON public.feedback(feedback_type);

-- ============================================
-- 3. ENABLE ROW LEVEL SECURITY (RLS)
-- ============================================

ALTER TABLE public.feedback ENABLE ROW LEVEL SECURITY;

-- ============================================
-- 4. CREATE RLS POLICIES
-- ============================================

-- Policy: Allow authenticated users to insert feedback
CREATE POLICY "Authenticated users can submit feedback"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can view their own feedback
CREATE POLICY "Users can view their own feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (auth.uid() = user_id);

-- Policy: Users can update their own feedback (optional - currently not used in app)
CREATE POLICY "Users can update their own feedback"
ON public.feedback
FOR UPDATE
TO authenticated
USING (auth.uid() = user_id)
WITH CHECK (auth.uid() = user_id);

-- Policy: Users can delete their own feedback (optional - currently not used in app)
CREATE POLICY "Users can delete their own feedback"
ON public.feedback
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- ============================================
-- 5. CREATE UPDATED_AT TRIGGER
-- ============================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger to automatically update updated_at
CREATE TRIGGER set_feedback_updated_at
  BEFORE UPDATE ON public.feedback
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- ============================================
-- 6. VERIFY SETUP
-- ============================================

-- Check if table was created successfully
SELECT
  table_name,
  column_name,
  data_type,
  is_nullable
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'feedback'
ORDER BY ordinal_position;

-- Check if indexes were created
SELECT
  indexname,
  indexdef
FROM pg_indexes
WHERE tablename = 'feedback'
  AND schemaname = 'public';

-- Check if RLS is enabled
SELECT
  tablename,
  rowsecurity
FROM pg_tables
WHERE tablename = 'feedback'
  AND schemaname = 'public';

-- ============================================
-- DONE! Table setup complete.
-- Next: Set up Storage Bucket (see instructions below)
-- ============================================
