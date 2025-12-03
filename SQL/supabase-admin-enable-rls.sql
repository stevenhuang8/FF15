-- Migration: Enable Row Level Security on admin_users table
-- Date: 2025-12-02
-- Purpose: Fix Supabase security warning - Enable RLS on public.admin_users table
--
-- Security Model:
-- 1. Anonymous users: Completely blocked from admin_users table
-- 2. Authenticated users: Can SELECT (needed for isUserAdmin() checks in application)
-- 3. Admin users only: Can INSERT, UPDATE, DELETE admin records
-- 4. Service role: Bypasses all RLS policies (for backend operations)

-- Enable Row Level Security on admin_users table
ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;

-- Policy 1: Authenticated users can SELECT from admin_users
-- This allows admin checks without circular dependency
-- Any authenticated user can view the admin list to determine permissions
CREATE POLICY "Authenticated users can view admin list"
ON public.admin_users
FOR SELECT
TO authenticated
USING (true);

-- Policy 2: Only existing admins can INSERT new admins
-- Prevents privilege escalation - only admins can create new admins
CREATE POLICY "Only admins can add admins"
ON public.admin_users
FOR INSERT
TO authenticated
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.admin_users)
);

-- Policy 3: Only existing admins can UPDATE admin records
-- Restricts modifications to admin table to admins only
CREATE POLICY "Only admins can update admins"
ON public.admin_users
FOR UPDATE
TO authenticated
USING (
  auth.uid() IN (SELECT user_id FROM public.admin_users)
)
WITH CHECK (
  auth.uid() IN (SELECT user_id FROM public.admin_users)
);

-- Policy 4: Only existing admins can DELETE admin records
-- Prevents unauthorized removal of admin privileges
CREATE POLICY "Only admins can remove admins"
ON public.admin_users
FOR DELETE
TO authenticated
USING (
  auth.uid() IN (SELECT user_id FROM public.admin_users)
);

-- Verification query (run after applying migration):
-- SELECT tablename, rowsecurity FROM pg_tables WHERE schemaname = 'public' AND tablename = 'admin_users';
-- Expected result: rowsecurity = true

-- View all policies on admin_users:
-- SELECT * FROM pg_policies WHERE tablename = 'admin_users';

-- Note: Service role operations bypass RLS entirely
-- This ensures backend operations with SUPABASE_SERVICE_ROLE_KEY continue to work
-- without being affected by these policies.
