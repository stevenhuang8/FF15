-- ============================================
-- Admin Users Table - Add Name Fields Migration
-- ============================================
-- Run this if you already have the admin_users table
-- and want to add display_name and email columns
-- https://supabase.com/dashboard/project/_/sql/new

-- ============================================
-- 1. ADD COLUMNS TO EXISTING TABLE
-- ============================================

-- Add display_name column
ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS display_name TEXT;

-- Add email column
ALTER TABLE public.admin_users
ADD COLUMN IF NOT EXISTS email TEXT;

-- ============================================
-- 2. POPULATE NAMES FOR EXISTING ADMINS
-- ============================================

-- Option 1: Update manually for each admin
-- Replace placeholders with actual values
-- UPDATE public.admin_users
-- SET display_name = 'Your Name',
--     email = 'your.email@example.com'
-- WHERE user_id = 'YOUR_USER_ID_HERE';

-- Option 2: Auto-populate email from auth.users (if available)
-- This will set email from the auth.users table
-- UPDATE public.admin_users
-- SET email = (
--   SELECT email
--   FROM auth.users
--   WHERE auth.users.id = admin_users.user_id
-- )
-- WHERE email IS NULL;

-- Note: display_name must be set manually as it's not in auth.users by default
-- You can set it from auth metadata if you have it stored there

-- ============================================
-- 3. VERIFY MIGRATION
-- ============================================

-- Check that columns were added and data populated
SELECT
  user_id,
  display_name,
  email,
  created_at
FROM public.admin_users;

-- ============================================
-- DONE! Now your admin dashboard will show names
-- ============================================
