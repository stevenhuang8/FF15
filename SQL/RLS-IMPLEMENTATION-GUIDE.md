# Row Level Security Implementation Guide
## admin_users Table RLS Migration

### Overview

This guide walks through enabling Row Level Security (RLS) on the `admin_users` table to fix the Supabase security warning:

> **Issue**: Table public.admin_users is public, but RLS has not been enabled

### Files Involved

- **Migration File**: `SQL/supabase-admin-enable-rls.sql`
- **Admin Auth Helper**: `lib/supabase/admin-auth.ts` (no changes needed)
- **Admin API Route**: `app/api/admin/feedback/route.ts` (no changes needed)

---

## Part 1: Apply the Migration

### Option A: Supabase Dashboard (Recommended)

1. **Open Supabase Dashboard**
   - Navigate to your project: https://supabase.com/dashboard/project/YOUR_PROJECT_ID
   - Go to **SQL Editor** in the left sidebar

2. **Run the Migration**
   - Click **New Query**
   - Copy and paste the contents of `SQL/supabase-admin-enable-rls.sql`
   - Click **Run** or press `Cmd/Ctrl + Enter`

3. **Verify Success**
   - You should see: `Success. No rows returned`
   - If there are errors, check the error message and fix any issues

### Option B: Supabase CLI

```bash
# 1. Ensure Supabase CLI is installed
npx supabase --version

# 2. Login to Supabase
npx supabase login

# 3. Link to your project
npx supabase link --project-ref YOUR_PROJECT_REF

# 4. Create migration file
npx supabase migration new enable_admin_users_rls

# 5. Copy SQL content to the generated file
# File will be in: supabase/migrations/TIMESTAMP_enable_admin_users_rls.sql

# 6. Apply the migration
npx supabase db push
```

---

## Part 2: Verify RLS Configuration

### Check RLS Status

Run this query in Supabase SQL Editor:

```sql
-- Verify RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'admin_users';

-- Expected result:
-- tablename: admin_users
-- rowsecurity: true
```

### View Policies

Run this query to see all policies on admin_users:

```sql
SELECT
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
FROM pg_policies
WHERE tablename = 'admin_users';
```

**Expected policies:**
1. `Authenticated users can view admin list` (SELECT)
2. `Only admins can add admins` (INSERT)
3. `Only admins can update admins` (UPDATE)
4. `Only admins can remove admins` (DELETE)

---

## Part 3: Testing

### Prerequisites

- At least one admin user exists in the `admin_users` table
- Test with both admin and non-admin user accounts

### Test Case 1: Admin Check (Authenticated User)

**Purpose**: Verify authenticated users can query admin_users for permission checks

**Test**: Login as any authenticated user and navigate to a page that uses `isUserAdmin()`

**Expected Result**: ✅ No errors, function returns true/false correctly

**Implementation Note**: The SELECT policy allows this without circular dependency

### Test Case 2: Non-Admin Cannot Add Admins

**Purpose**: Verify INSERT policy blocks unauthorized admin creation

**Test via SQL Editor**:

```sql
-- Simulate non-admin user trying to insert
-- (Must use authenticated user's JWT token)
SET request.jwt.claims TO '{"sub": "non-admin-user-id"}';

INSERT INTO public.admin_users (user_id, display_name, email)
VALUES ('non-admin-user-id', 'Hacker', 'hacker@example.com');

-- Expected result: Permission denied error
```

**Test via Application**:
- Attempt to call admin-only API endpoints as non-admin user
- Expected: 403 Forbidden or similar error

### Test Case 3: Admin Can Add Admins

**Purpose**: Verify existing admins can create new admins

**Test via SQL Editor**:

```sql
-- Using admin user's JWT token
SET request.jwt.claims TO '{"sub": "existing-admin-user-id"}';

INSERT INTO public.admin_users (user_id, display_name, email)
VALUES ('new-admin-user-id', 'New Admin', 'newadmin@example.com');

-- Expected result: Success, 1 row inserted
```

**Test via Application**:
- Create admin management UI/API endpoint (future feature)
- Existing admin should be able to add new admins

### Test Case 4: Admin Feedback API

**Purpose**: Verify admin API routes continue to work

**Test Steps**:

1. Login as admin user
2. Navigate to admin feedback page (if available)
3. Or test API endpoint directly:

```bash
# Get feedback (requires admin)
curl -X GET 'http://localhost:3000/api/admin/feedback' \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN'

# Expected: 200 OK with feedback data

# Update feedback status (requires admin)
curl -X PATCH 'http://localhost:3000/api/admin/feedback' \
  -H 'Authorization: Bearer YOUR_ADMIN_JWT_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"id": "feedback-id", "status": "resolved"}'

# Expected: 200 OK with updated feedback
```

### Test Case 5: Service Role Bypass

**Purpose**: Verify service role operations bypass RLS

**Test**: Backend operations using `SUPABASE_SERVICE_ROLE_KEY` should work without restrictions

```typescript
// Example: Server-side operation with service role
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role bypasses RLS
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// This should work regardless of RLS policies
const { data, error } = await supabase
  .from('admin_users')
  .select('*')
```

---

## Part 4: Monitoring

### Check Supabase Security Advisor

After applying the migration:

1. Navigate to: **Project Settings → Database → Security Advisor**
2. Verify the RLS warning for `admin_users` is resolved
3. Expected: ✅ No more warnings about RLS being disabled

### Application Logs

Monitor application logs for any RLS-related errors:

```bash
# Development
pnpm dev

# Check for errors like:
# - "permission denied for table admin_users"
# - "new row violates row-level security policy"
```

If errors occur, verify:
- User is authenticated before querying admin_users
- Admin operations use proper authentication
- Service role key is used where appropriate

---

## Part 5: Rollback (If Needed)

If issues arise after enabling RLS, you can rollback:

### Rollback SQL

```sql
-- Disable RLS on admin_users table
ALTER TABLE public.admin_users DISABLE ROW LEVEL SECURITY;

-- Drop all policies
DROP POLICY IF EXISTS "Authenticated users can view admin list" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can add admins" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can update admins" ON public.admin_users;
DROP POLICY IF EXISTS "Only admins can remove admins" ON public.admin_users;
```

### Verify Rollback

```sql
-- Check RLS is disabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE schemaname = 'public'
  AND tablename = 'admin_users';

-- Expected result: rowsecurity = false
```

---

## Security Benefits

### Before (RLS Disabled)

- ❌ Any authenticated user could query admin list via PostgREST API
- ❌ No database-level protection against unauthorized writes
- ❌ Potential privilege escalation via direct database access
- ⚠️ Security relies entirely on application-level checks

### After (RLS Enabled)

- ✅ Anonymous users completely blocked from admin_users table
- ✅ Authenticated users can read admin list (needed for permission checks)
- ✅ Only existing admins can modify admin_users table
- ✅ Defense-in-depth: Both database-level AND application-level security
- ✅ PostgREST API automatically enforces RLS policies
- ✅ Supabase security advisor satisfied

---

## Troubleshooting

### Issue: "permission denied for table admin_users"

**Cause**: User is not authenticated or RLS policy is blocking access

**Solution**:
- Verify user is authenticated before querying admin_users
- Check that SELECT policy allows authenticated users
- Use service role key for backend operations

### Issue: "new row violates row-level security policy"

**Cause**: Non-admin user trying to INSERT/UPDATE/DELETE

**Solution**:
- This is expected behavior - RLS is working correctly
- Only existing admins can modify admin_users table
- Use admin account or service role key for admin operations

### Issue: Admin check fails after enabling RLS

**Cause**: Circular dependency in admin check logic

**Solution**:
- Our SELECT policy allows authenticated users to query admin_users
- This prevents circular dependency issues
- Verify `lib/supabase/admin-auth.ts` uses authenticated client (not anon)

---

## Next Steps

After successful RLS implementation:

1. ✅ Mark Supabase security warning as resolved
2. Consider implementing admin management UI
3. Add audit logging for admin table changes
4. Review other tables for RLS requirements
5. Document admin onboarding process

---

## References

- **Supabase RLS Documentation**: https://supabase.com/docs/guides/auth/row-level-security
- **PostgreSQL RLS**: https://www.postgresql.org/docs/current/ddl-rowsecurity.html
- **Supabase Auth Helpers**: https://supabase.com/docs/guides/auth/server-side/nextjs
- **PostgREST API**: https://supabase.com/docs/guides/api

---

**Migration Date**: 2025-12-02
**Applied By**: [Your Name]
**Status**: ✅ Ready to apply
