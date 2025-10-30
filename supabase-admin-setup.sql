-- ============================================
-- Food & Fitness AI - Admin Role Setup
-- ============================================
-- Run this script after the feedback table is created
-- https://supabase.com/dashboard/project/_/sql/new

-- ============================================
-- 1. ADD IS_ADMIN COLUMN TO USERS
-- ============================================

-- Note: This assumes you have a user_profiles or profiles table
-- If not, you can add a custom claims to auth.users via Supabase dashboard

-- Option 1: Add to profiles table (if you have one)
-- ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS is_admin BOOLEAN DEFAULT FALSE;

-- Option 2: Create admin_users table (recommended for separation)
CREATE TABLE IF NOT EXISTS public.admin_users (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  email TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create index for performance
CREATE INDEX IF NOT EXISTS idx_admin_users_user_id ON public.admin_users(user_id);

-- Note: RLS is NOT enabled on admin_users table
-- This table only contains user_ids (no sensitive data)
-- Admin operations are protected by application-level checks
-- Enabling RLS creates a circular dependency that breaks admin checks

-- ============================================
-- 2. UPDATE FEEDBACK RLS FOR ADMIN ACCESS
-- ============================================

-- Policy: Admins can view all feedback
CREATE POLICY "Admins can view all feedback"
ON public.feedback
FOR SELECT
TO authenticated
USING (
  auth.uid() = user_id OR
  auth.uid() IN (SELECT user_id FROM public.admin_users)
);

-- Policy: Admins can update all feedback
CREATE POLICY "Admins can update all feedback"
ON public.feedback
FOR UPDATE
TO authenticated
USING (auth.uid() IN (SELECT user_id FROM public.admin_users))
WITH CHECK (auth.uid() IN (SELECT user_id FROM public.admin_users));

-- ============================================
-- 3. ADD YOUR ADMIN USER
-- ============================================

-- Replace placeholders with your actual information
-- You can find your user ID by:
-- 1. Go to Authentication > Users in Supabase Dashboard
-- 2. Click on your user
-- 3. Copy the UUID and email

-- INSERT INTO public.admin_users (user_id, display_name, email)
-- VALUES ('YOUR_USER_ID_HERE', 'Your Name', 'your.email@example.com');

-- ============================================
-- 4. VERIFY ADMIN SETUP
-- ============================================

-- Check admin users table
SELECT * FROM public.admin_users;

-- Check RLS policies
SELECT
  tablename,
  policyname,
  cmd,
  roles
FROM pg_policies
WHERE schemaname = 'public'
  AND tablename IN ('feedback', 'admin_users')
ORDER BY tablename, policyname;

-- ============================================
-- DONE! Admin role setup complete.
-- Remember to add your user ID to admin_users table!
-- ============================================
