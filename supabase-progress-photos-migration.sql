-- ============================================================================
-- PROGRESS PHOTOS TABLE MIGRATION
-- Adds progress photos tracking for workout journey visualization
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.progress_photos (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_log_id UUID REFERENCES public.workout_logs(id) ON DELETE SET NULL,

  image_url TEXT NOT NULL,
  caption TEXT,
  taken_at TIMESTAMPTZ NOT NULL,

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INDEXES
-- ============================================================================

CREATE INDEX IF NOT EXISTS idx_progress_photos_user_id ON public.progress_photos(user_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_workout_log_id ON public.progress_photos(workout_log_id);
CREATE INDEX IF NOT EXISTS idx_progress_photos_taken_at ON public.progress_photos(taken_at DESC);
CREATE INDEX IF NOT EXISTS idx_progress_photos_user_taken ON public.progress_photos(user_id, taken_at DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own progress photos"
  ON public.progress_photos FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own progress photos"
  ON public.progress_photos FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own progress photos"
  ON public.progress_photos FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own progress photos"
  ON public.progress_photos FOR DELETE
  USING (auth.uid() = user_id);

-- ============================================================================
-- STORAGE BUCKET
-- ============================================================================

-- Create storage bucket for progress photos (run this in Supabase Dashboard SQL Editor)
-- INSERT INTO storage.buckets (id, name, public)
-- VALUES ('progress-photos', 'progress-photos', true);

-- Storage policies (run after creating bucket)
-- CREATE POLICY "Users can upload own progress photos"
--   ON storage.objects FOR INSERT
--   WITH CHECK (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can view own progress photos"
--   ON storage.objects FOR SELECT
--   USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);

-- CREATE POLICY "Users can delete own progress photos"
--   ON storage.objects FOR DELETE
--   USING (bucket_id = 'progress-photos' AND auth.uid()::text = (storage.foldername(name))[1]);
