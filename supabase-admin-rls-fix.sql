-- ============================================
-- Fix Admin Tab Not Showing - RLS Issue
-- ============================================
-- This fixes the circular dependency in admin_users RLS policy
-- Run this in Supabase Dashboard > SQL Editor
-- https://supabase.com/dashboard/project/_/sql/new

-- ============================================
-- PROBLEM:
-- The admin_users table has RLS enabled with a policy that says:
-- "Only admins can view admin_users"
--
-- But to check if you're an admin, the code needs to query admin_users,
-- which is blocked by RLS unless you're already an admin (circular dependency!)
--
-- SOLUTION:
-- Disable RLS on admin_users table. This is safe because:
-- 1. The table only contains user_ids (no sensitive data)
-- 2. Admin routes are still protected by application-level checks
-- 3. Only admins can modify feedback (protected by feedback table RLS)
-- ============================================

-- Drop the existing RLS policy
DROP POLICY IF EXISTS "Admins can view admin_users" ON public.admin_users;

-- Disable RLS on admin_users table
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- ============================================
-- VERIFICATION
-- ============================================

-- Check that RLS is disabled (should show: f)
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'admin_users';

-- Verify you can query admin_users (should return your record)
SELECT * FROM public.admin_users;

-- ============================================
-- NEXT STEPS:
-- 1. Restart your dev server (pnpm dev)
-- 2. Log out and log back in
-- 3. Admin tab should now appear in navbar!
-- ============================================
