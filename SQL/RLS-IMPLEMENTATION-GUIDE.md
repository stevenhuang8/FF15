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

This test ensures that non-admin users cannot add themselves or others to the `admin_users` table, even if they have valid authentication credentials.

#### Prerequisites

1. **Test non-admin user exists**:
   - Create via Supabase Dashboard → Authentication → Invite User
   - Or sign up through your application
   - Verify user is NOT in `admin_users` table:
     ```sql
     SELECT * FROM admin_users WHERE user_id = 'your-user-uuid';
     -- Should return 0 rows
     ```

2. **User authentication**:
   - User must be authenticated (have valid JWT token)
   - Not required to be an admin (this is what we're testing)

#### Method 1: SQL Editor Testing

**Limitations**: SQL Editor runs with service role privileges by default, making it difficult to simulate RLS policies directly. This method demonstrates the concept but may not enforce RLS as expected.

**Conceptual Test**:

```sql
-- Note: This demonstrates policy logic but SQL Editor bypasses RLS
-- For true RLS testing, use Method 2 (Dashboard) or Method 3 (Automated)

-- Simulate context (educational purposes):
SET request.jwt.claims TO '{"sub": "non-admin-user-uuid"}';

-- Attempt to insert as non-admin
INSERT INTO public.admin_users (user_id, display_name, email)
VALUES ('non-admin-user-uuid', 'Hacker', 'hacker@example.com');

-- In real RLS enforcement, expected error:
-- ERROR: new row violates row-level security policy for table "admin_users"
-- PostgreSQL Error Code: 42501
```

**Expected Result** (with RLS properly enforced):
- **Error Message**: `new row violates row-level security policy for table "admin_users"`
- **Error Code**: `42501` (insufficient privilege)
- **No row inserted**: `INSERT 0 0`

#### Method 2: Supabase Dashboard Testing

**Step-by-step**:

1. **Login as non-admin user**:
   - Ensure you're authenticated as a user who is NOT in `admin_users` table
   - You can verify by checking: Dashboard → Table Editor → admin_users

2. **Attempt to insert via Table Editor**:
   - Navigate to: Table Editor → `admin_users` table
   - Click **Insert Row** button
   - Fill in fields:
     - `user_id`: Your non-admin user UUID
     - `display_name`: "Test Admin"
     - `email`: "test@example.com"
   - Click **Save**

3. **Expected Result**:
   - **Error dialog appears**: "Failed to insert row"
   - **Error message**: "new row violates row-level security policy"
   - **No row created** in the table

4. **Verification**:
   - Refresh the table view
   - Confirm no new admin row was added

**Note**: If the insert succeeds, RLS is not properly enabled. See Troubleshooting section.

#### Method 3: Automated Integration Test

**Test File**: `__tests__/rls/admin-users-insert-blocked.test.ts`

**Setup** (if vitest not installed):
```bash
pnpm add -D vitest @vitejs/plugin-react @supabase/supabase-js
```

**Complete Test Code**:

```typescript
import { describe, it, expect, beforeAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('RLS: Non-Admin Cannot Add Admins', () => {
  let supabase: ReturnType<typeof createClient>
  let nonAdminUserId: string

  beforeAll(async () => {
    // Create authenticated client (uses anon key, RLS enforced)
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Login as non-admin test user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'nonadmin@test.com',
      password: 'testpassword123'
    })

    if (error) throw new Error(`Auth failed: ${error.message}`)
    nonAdminUserId = data.user!.id

    // Verify user is NOT an admin
    const { data: adminCheck } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', nonAdminUserId)
      .single()

    expect(adminCheck).toBeNull() // User should NOT be in admin_users
  })

  it('should block non-admin from inserting into admin_users table', async () => {
    // Attempt to insert self as admin
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        user_id: nonAdminUserId,
        display_name: 'Hacker Admin',
        email: 'hacker@test.com'
      })
      .select()
      .single()

    // Should fail with RLS policy violation
    expect(error).toBeTruthy()
    expect(error?.code).toBe('PGRST301') // PostgREST insufficient privileges
    expect(error?.message).toContain('row-level security policy')
    expect(data).toBeNull()

    // Verify no row was actually inserted
    const { data: verifyData, count } = await supabase
      .from('admin_users')
      .select('user_id', { count: 'exact' })
      .eq('user_id', nonAdminUserId)

    expect(count).toBe(0) // No matching row
    expect(verifyData).toEqual([])
  })

  it('should block non-admin from inserting OTHER users as admins', async () => {
    const fakeUserId = '00000000-0000-0000-0000-000000000000'

    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        user_id: fakeUserId,
        display_name: 'Fake Admin',
        email: 'fake@test.com'
      })
      .select()
      .single()

    expect(error).toBeTruthy()
    expect(error?.code).toBe('PGRST301')
    expect(data).toBeNull()
  })
})
```

**Expected Test Output**:
```
✓ RLS: Non-Admin Cannot Add Admins (2)
  ✓ should block non-admin from inserting into admin_users table
  ✓ should block non-admin from inserting OTHER users as admins

Test Files  1 passed (1)
Tests  2 passed (2)
```

#### Troubleshooting

**Issue**: Insert succeeds when it should fail

- **Cause**: RLS not enabled on `admin_users` table
- **Solution**:
  ```sql
  -- Verify RLS is enabled
  SELECT tablename, rowsecurity
  FROM pg_tables
  WHERE tablename = 'admin_users';
  -- rowsecurity should be TRUE

  -- If FALSE, enable RLS:
  ALTER TABLE public.admin_users ENABLE ROW LEVEL SECURITY;
  ```

**Issue**: Different error message than expected

- **Cause**: INSERT policy syntax error or wrong policy applied
- **Solution**:
  ```sql
  -- Check active policies
  SELECT policyname, cmd, qual, with_check
  FROM pg_policies
  WHERE tablename = 'admin_users' AND cmd = 'INSERT';

  -- Expected policy:
  -- policyname: "Only admins can add admins"
  -- with_check: "(EXISTS ( SELECT 1 FROM admin_users WHERE (user_id = auth.uid())))"
  ```

**Issue**: Can't obtain JWT token for testing

- **Cause**: User not authenticated or session expired
- **Solution**:
  ```javascript
  // In browser console
  const { data } = await supabase.auth.getSession()
  console.log(data.session?.access_token)

  // Or re-login
  await supabase.auth.signInWithPassword({
    email: 'test@example.com',
    password: 'password'
  })
  ```

**Issue**: SQL Editor test doesn't enforce RLS

- **Cause**: SQL Editor uses service role by default, which bypasses RLS
- **Solution**: Use Method 2 (Dashboard) or Method 3 (Automated tests) for true RLS validation

**Issue**: Automated test fails with "User not found"

- **Cause**: Test user doesn't exist in auth.users table
- **Solution**: Create test user first:
  ```sql
  -- Via SQL (service role)
  INSERT INTO auth.users (id, email, encrypted_password, email_confirmed_at)
  VALUES (
    gen_random_uuid(),
    'nonadmin@test.com',
    crypt('testpassword123', gen_salt('bf')),
    NOW()
  );

  -- Or use Supabase Dashboard → Authentication → Invite User
  ```

### Test Case 3: Admin Can Add Admins

**Purpose**: Verify existing admins can create new admins

This test validates that users who are already in the `admin_users` table can successfully add new administrators, demonstrating the circular dependency solution in the INSERT policy.

#### Prerequisites

1. **At least one admin exists**:
   - Verify existing admin: `SELECT * FROM admin_users;`
   - If no admins exist, create the first one via service role:
     ```sql
     -- Bootstrap first admin (use service role client)
     INSERT INTO admin_users (user_id, display_name, email)
     VALUES (
       'your-user-uuid-from-auth-users',
       'Admin Name',
       'admin@example.com'
     );
     ```

2. **Admin authentication**:
   - Admin user must be logged in
   - Have valid JWT token
   - User's UUID matches a row in `admin_users` table

3. **New admin user data**:
   - `user_id`: Must exist in `auth.users` table (create user first if needed)
   - `display_name`: Descriptive name for the new admin
   - `email`: Valid email address

#### Method 1: SQL Editor Testing

**Limitations**: Similar to Test Case 2, SQL Editor uses service role and bypasses RLS. This method demonstrates the logic conceptually.

**Conceptual Test**:

```sql
-- Note: This demonstrates policy logic but SQL Editor bypasses RLS
-- For true RLS testing, use Method 2 (Dashboard) or Method 3 (Automated)

-- Simulate admin context (educational purposes):
-- Replace 'existing-admin-uuid' with actual admin user ID from admin_users table
SET request.jwt.claims TO '{"sub": "existing-admin-uuid"}';

-- Insert new admin
INSERT INTO public.admin_users (user_id, display_name, email)
VALUES ('new-admin-user-uuid', 'New Admin', 'newadmin@example.com');

-- Expected result: INSERT 0 1 (1 row inserted successfully)

-- Verify insertion
SELECT * FROM admin_users WHERE user_id = 'new-admin-user-uuid';
-- Should return the newly inserted row

-- Cleanup (for testing):
DELETE FROM admin_users WHERE user_id = 'new-admin-user-uuid';
```

**Policy Evaluation**:
The INSERT policy checks:
```sql
EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
```
- `auth.uid()` returns the current authenticated user's UUID
- Query checks if this UUID exists in `admin_users` table
- If TRUE → INSERT allowed
- If FALSE → INSERT blocked

**Expected Result** (with RLS properly enforced):
- **Success Message**: `INSERT 0 1`
- **New row created** in `admin_users` table
- **No errors**

#### Method 2: Supabase Dashboard Testing

**Step-by-step**:

1. **Login as admin user**:
   - Authenticate to Supabase Dashboard or your application
   - Verify you're logged in as a user who IS in `admin_users` table
   - Navigate to: Dashboard → Table Editor → admin_users
   - Confirm your user_id appears in the list

2. **Prepare new admin user**:
   - The new admin's `user_id` must exist in `auth.users`
   - Create via: Dashboard → Authentication → Invite User
   - Or use existing user UUID

3. **Insert new admin via Table Editor**:
   - Navigate to: Table Editor → `admin_users` table
   - Click **Insert Row** button
   - Fill in fields:
     - `user_id`: UUID of user from auth.users (copy from Authentication tab)
     - `display_name`: "New Admin Name"
     - `email`: "newadmin@example.com"
   - Click **Save**

4. **Expected Result**:
   - **Success notification**: "Row inserted successfully" or "1 row inserted"
   - **New admin appears** in table immediately
   - **No error dialogs**

5. **Verification**:
   - Refresh the `admin_users` table
   - Confirm new row with specified `user_id` exists
   - Check `created_at` timestamp is recent

6. **Cleanup** (optional):
   - Select the test admin row
   - Click **Delete Row**
   - Confirm deletion

**Note**: If you receive a permission error, verify you're logged in as an existing admin user.

#### Method 3: Automated Integration Test

**Test File**: `__tests__/rls/admin-users-insert-allowed.test.ts`

**Setup** (if vitest not installed):
```bash
pnpm add -D vitest @vitejs/plugin-react @supabase/supabase-js
```

**Complete Test Code**:

```typescript
import { describe, it, expect, beforeAll, afterEach } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('RLS: Admin Can Add Admins', () => {
  let supabase: ReturnType<typeof createClient>
  let adminUserId: string
  const testAdminIds: string[] = [] // Track test admins for cleanup

  beforeAll(async () => {
    // Create authenticated client (uses anon key, RLS enforced)
    supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )

    // Login as existing admin user
    const { data, error } = await supabase.auth.signInWithPassword({
      email: 'admin@test.com', // Must be in admin_users table
      password: 'adminpassword123'
    })

    if (error) throw new Error(`Admin auth failed: ${error.message}`)
    adminUserId = data.user!.id

    // Verify user IS an admin
    const { data: adminCheck, error: checkError } = await supabase
      .from('admin_users')
      .select('user_id')
      .eq('user_id', adminUserId)
      .single()

    if (checkError || !adminCheck) {
      throw new Error('Test user is not an admin. Create admin first.')
    }
  })

  afterEach(async () => {
    // Cleanup: Delete test admins created during tests
    if (testAdminIds.length > 0) {
      const { error } = await supabase
        .from('admin_users')
        .delete()
        .in('user_id', testAdminIds)

      if (error) console.warn('Cleanup warning:', error.message)
      testAdminIds.length = 0 // Clear array
    }
  })

  it('should allow admin to insert new admin', async () => {
    // Create test user in auth.users first (or use existing)
    const newAdminId = '11111111-1111-1111-1111-111111111111' // Use real UUID

    // Attempt to insert new admin
    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        user_id: newAdminId,
        display_name: 'Test Admin',
        email: 'testadmin@example.com'
      })
      .select()
      .single()

    // Should succeed
    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data?.user_id).toBe(newAdminId)
    expect(data?.display_name).toBe('Test Admin')

    // Track for cleanup
    testAdminIds.push(newAdminId)

    // Verify row exists in table
    const { data: verifyData, count } = await supabase
      .from('admin_users')
      .select('*', { count: 'exact' })
      .eq('user_id', newAdminId)

    expect(count).toBe(1)
    expect(verifyData).toHaveLength(1)
  })

  it('should allow admin to insert multiple new admins', async () => {
    const newAdmin1 = '22222222-2222-2222-2222-222222222222'
    const newAdmin2 = '33333333-3333-3333-3333-333333333333'

    const { data, error } = await supabase
      .from('admin_users')
      .insert([
        {
          user_id: newAdmin1,
          display_name: 'Admin One',
          email: 'admin1@example.com'
        },
        {
          user_id: newAdmin2,
          display_name: 'Admin Two',
          email: 'admin2@example.com'
        }
      ])
      .select()

    expect(error).toBeNull()
    expect(data).toHaveLength(2)

    testAdminIds.push(newAdmin1, newAdmin2)
  })

  it('should enforce foreign key constraint on user_id', async () => {
    const nonExistentUserId = '99999999-9999-9999-9999-999999999999'

    const { data, error } = await supabase
      .from('admin_users')
      .insert({
        user_id: nonExistentUserId,
        display_name: 'Invalid Admin',
        email: 'invalid@example.com'
      })
      .select()
      .single()

    // Should fail with foreign key violation
    expect(error).toBeTruthy()
    expect(error?.code).toContain('23503') // Foreign key violation
    expect(data).toBeNull()
  })
})
```

**Expected Test Output**:
```
✓ RLS: Admin Can Add Admins (3)
  ✓ should allow admin to insert new admin
  ✓ should allow admin to insert multiple new admins
  ✓ should enforce foreign key constraint on user_id

Test Files  1 passed (1)
Tests  3 passed (3)
```

#### Troubleshooting

**Issue**: Insert fails with permission denied even as admin

- **Cause**: User is not actually in `admin_users` table or `auth.uid()` doesn't match
- **Solution**:
  ```sql
  -- Verify current user is admin
  SELECT * FROM admin_users WHERE user_id = auth.uid();
  -- Should return 1 row

  -- If empty, add yourself as admin (via service role):
  INSERT INTO admin_users (user_id, display_name, email)
  VALUES (auth.uid(), 'Your Name', 'your@email.com');
  ```

**Issue**: Insert fails with foreign key violation

- **Cause**: `user_id` doesn't exist in `auth.users` table
- **Solution**: Create the user first:
  ```sql
  -- Check if user exists
  SELECT id, email FROM auth.users WHERE id = 'target-user-uuid';

  -- If empty, create user via Supabase Dashboard → Authentication → Invite User
  -- Or use service role to insert into auth.users (advanced, not recommended)
  ```

**Issue**: Automated test fails due to cleanup issues

- **Cause**: Previous test run left orphaned admin data
- **Solution**: Manual cleanup:
  ```sql
  -- Remove test admins
  DELETE FROM admin_users WHERE email LIKE '%test%' OR email LIKE '%example.com';

  -- Or specific cleanup:
  DELETE FROM admin_users WHERE user_id IN (
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222'
  );
  ```

**Issue**: Test user authentication fails

- **Cause**: Test admin user doesn't exist or password is wrong
- **Solution**: Create test admin account:
  ```bash
  # Via Supabase Dashboard:
  # 1. Authentication → Invite User → admin@test.com
  # 2. User confirms email and sets password
  # 3. Run SQL to add to admin_users:
  INSERT INTO admin_users (user_id, display_name, email)
  VALUES (
    (SELECT id FROM auth.users WHERE email = 'admin@test.com'),
    'Test Admin',
    'admin@test.com'
  );
  ```

**Issue**: Dashboard insert succeeds but automated test fails

- **Cause**: Dashboard may use service role, while test uses authenticated client
- **Solution**: Ensure test authenticates correctly and user is in admin_users table before testing

### Test Case 4: Admin Feedback API

**Purpose**: Verify admin API routes continue to work with RLS enabled

This test ensures that the admin feedback management API (`/api/admin/feedback`) correctly enforces admin-only access through the `isUserAdmin()` function, which queries the `admin_users` table with RLS enabled.

#### Prerequisites

1. **Feedback table contains test data**:
   - At least 2-3 feedback entries for testing
   - Create test feedback if needed:
     ```sql
     INSERT INTO feedback (user_id, message, category, status)
     VALUES
       (auth.uid(), 'Test feedback 1', 'bug', 'pending'),
       (auth.uid(), 'Test feedback 2', 'feature', 'pending'),
       (auth.uid(), 'Test feedback 3', 'question', 'pending');
     ```

2. **Admin user logged into application**:
   - Admin user exists in `admin_users` table
   - User is authenticated with valid session
   - Can obtain JWT token for API testing

3. **Non-admin user available** (for negative testing):
   - Regular authenticated user NOT in `admin_users`
   - For testing unauthorized access scenarios

4. **Testing tools** (choose one):
   - Browser DevTools (Network tab)
   - API client: Postman, Insomnia, or HTTPie
   - Command line: curl

#### Method 1: SQL Testing (Verify Data)

**Note**: This method verifies the underlying data, not the API itself.

```sql
-- Verify feedback data exists
SELECT id, user_id, message, category, status, created_at
FROM feedback
ORDER BY created_at DESC
LIMIT 10;

-- Expected: At least 2-3 feedback entries returned

-- Check admin can read all feedback (via RLS policy)
-- The feedback table has RLS that allows admins to see all feedback
SELECT COUNT(*) FROM feedback;
-- Admin should see all feedback entries
```

**Verify Admin Status**:
```sql
-- Confirm current user is admin
SELECT * FROM admin_users WHERE user_id = auth.uid();
-- Should return 1 row if you're an admin
```

#### Method 2: Browser/API Client Testing

##### Obtaining JWT Token

**Method A: Browser DevTools**

1. Login to your application as admin
2. Open DevTools (F12) → **Application** tab
3. Navigate to **Cookies** → Select your domain
4. Find cookie: `sb-access-token` or similar
5. Copy the token value

**Method B: JavaScript Console**

```javascript
// In browser console on your app
const { data } = await supabase.auth.getSession()
console.log('JWT Token:', data.session?.access_token)

// Or from localStorage
localStorage.getItem('supabase.auth.token')
```

**Method C: Network Tab**

1. Open DevTools → **Network** tab
2. Make any authenticated request
3. Click the request → **Headers**
4. Find `Authorization: Bearer <token>` header
5. Copy token value after "Bearer "

##### Testing GET /api/admin/feedback

**Using curl**:

```bash
# Set your JWT token as variable
export JWT_TOKEN="your-jwt-token-here"

# Get all feedback (admin only)
curl -X GET 'http://localhost:3000/api/admin/feedback' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -v

# Expected Response (200 OK):
# {
#   "feedback": [
#     {
#       "id": "uuid-here",
#       "user_id": "user-uuid",
#       "message": "Test feedback",
#       "category": "bug",
#       "status": "pending",
#       "created_at": "2025-12-02T10:00:00Z",
#       "user_profiles": { "display_name": "User Name" }
#     }
#   ]
# }

# Test with query parameters (filtering)
curl -X GET 'http://localhost:3000/api/admin/feedback?status=pending' \
  -H "Authorization: Bearer $JWT_TOKEN"

# Expected: Only feedback with status='pending'
```

**Using Postman/Insomnia**:

1. **Create new request**:
   - Method: `GET`
   - URL: `http://localhost:3000/api/admin/feedback`

2. **Set Headers**:
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
   - `Content-Type`: `application/json`

3. **Send request**

4. **Expected Response**:
   - Status: `200 OK`
   - Body: JSON array of feedback objects

##### Testing PATCH /api/admin/feedback

**Using curl**:

```bash
# Get a feedback ID first
curl -X GET 'http://localhost:3000/api/admin/feedback' \
  -H "Authorization: Bearer $JWT_TOKEN" | jq '.[0].id'

# Update feedback status
curl -X PATCH 'http://localhost:3000/api/admin/feedback' \
  -H "Authorization: Bearer $JWT_TOKEN" \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "feedback-uuid-here",
    "status": "resolved"
  }' \
  -v

# Expected Response (200 OK):
# {
#   "feedback": {
#     "id": "feedback-uuid-here",
#     "status": "resolved",
#     "updated_at": "2025-12-02T10:30:00Z",
#     ...
#   }
# }
```

**Using Postman/Insomnia**:

1. **Create new request**:
   - Method: `PATCH`
   - URL: `http://localhost:3000/api/admin/feedback`

2. **Set Headers**:
   - `Authorization`: `Bearer YOUR_JWT_TOKEN`
   - `Content-Type`: `application/json`

3. **Set Body** (JSON):
   ```json
   {
     "id": "actual-feedback-uuid",
     "status": "resolved"
   }
   ```

4. **Send request**

5. **Expected Response**:
   - Status: `200 OK`
   - Body: Updated feedback object with new status

##### Negative Test: Non-Admin Access

**Test unauthorized access**:

```bash
# Login as non-admin and get their JWT token
# Then attempt to access admin endpoint

curl -X GET 'http://localhost:3000/api/admin/feedback' \
  -H "Authorization: Bearer $NON_ADMIN_JWT_TOKEN" \
  -v

# Expected Response (401 or 403):
# Status: 401 Unauthorized or 403 Forbidden
# Body: { "error": "Unauthorized: Admin access required" }
# or similar error message
```

**Expected Behaviors**:
- **Admin user**: `200 OK` with feedback data
- **Non-admin user**: `401 Unauthorized` or `403 Forbidden`
- **No auth token**: `401 Unauthorized`
- **Invalid token**: `401 Unauthorized`

#### Method 3: Automated Integration Test

**Test File**: `__tests__/api/admin/feedback.test.ts`

**Note**: This requires mocking the Next.js API route environment. For simplicity, this example mocks the `isUserAdmin()` function.

**Setup** (if vitest not installed):
```bash
pnpm add -D vitest @vitejs/plugin-react @supabase/supabase-js
pnpm add -D @testing-library/react @testing-library/jest-dom
```

**Complete Test Code**:

```typescript
import { describe, it, expect, beforeEach, vi } from 'vitest'
import { GET, PATCH } from '@/app/api/admin/feedback/route'
import { NextRequest } from 'next/server'

// Mock the admin auth helper
vi.mock('@/lib/supabase/admin-auth', () => ({
  isUserAdmin: vi.fn(),
  getAdminUser: vi.fn()
}))

// Mock Supabase client
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn(() => ({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          single: vi.fn(() => Promise.resolve({ data: mockFeedbackData[0], error: null }))
        })),
        data: mockFeedbackData,
        error: null
      })),
      update: vi.fn(() => ({
        eq: vi.fn(() => ({
          select: vi.fn(() => ({
            single: vi.fn(() => Promise.resolve({
              data: { ...mockFeedbackData[0], status: 'resolved' },
              error: null
            }))
          }))
        }))
      }))
    }))
  }))
}))

const mockFeedbackData = [
  {
    id: 'feedback-1',
    user_id: 'user-1',
    message: 'Test feedback 1',
    category: 'bug',
    status: 'pending',
    created_at: '2025-12-01T10:00:00Z'
  },
  {
    id: 'feedback-2',
    user_id: 'user-2',
    message: 'Test feedback 2',
    category: 'feature',
    status: 'pending',
    created_at: '2025-12-01T11:00:00Z'
  }
]

describe('API: /api/admin/feedback', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('GET /api/admin/feedback', () => {
    it('should return feedback array when user is admin', async () => {
      const { isUserAdmin } = await import('@/lib/supabase/admin-auth')
      vi.mocked(isUserAdmin).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/feedback')
      const response = await GET(request)

      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.feedback).toBeDefined()
      expect(Array.isArray(json.feedback)).toBe(true)
      expect(isUserAdmin).toHaveBeenCalled()
    })

    it('should return 401 when user is not admin', async () => {
      const { isUserAdmin } = await import('@/lib/supabase/admin-auth')
      vi.mocked(isUserAdmin).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/admin/feedback')
      const response = await GET(request)

      expect(response.status).toBe(401)

      const json = await response.json()
      expect(json.error).toContain('Unauthorized')
      expect(isUserAdmin).toHaveBeenCalled()
    })

    it('should handle query parameters for filtering', async () => {
      const { isUserAdmin } = await import('@/lib/supabase/admin-auth')
      vi.mocked(isUserAdmin).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/feedback?status=pending')
      const response = await GET(request)

      expect(response.status).toBe(200)
      // Verify filter was applied in actual implementation
    })
  })

  describe('PATCH /api/admin/feedback', () => {
    it('should update feedback status when user is admin', async () => {
      const { isUserAdmin } = await import('@/lib/supabase/admin-auth')
      vi.mocked(isUserAdmin).mockResolvedValue(true)

      const request = new NextRequest('http://localhost:3000/api/admin/feedback', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'feedback-1',
          status: 'resolved'
        })
      })

      const response = await PATCH(request)

      expect(response.status).toBe(200)

      const json = await response.json()
      expect(json.feedback).toBeDefined()
      expect(json.feedback.status).toBe('resolved')
      expect(isUserAdmin).toHaveBeenCalled()
    })

    it('should return 401 when user is not admin', async () => {
      const { isUserAdmin } = await import('@/lib/supabase/admin-auth')
      vi.mocked(isUserAdmin).mockResolvedValue(false)

      const request = new NextRequest('http://localhost:3000/api/admin/feedback', {
        method: 'PATCH',
        body: JSON.stringify({
          id: 'feedback-1',
          status: 'resolved'
        })
      })

      const response = await PATCH(request)

      expect(response.status).toBe(401)
      expect(isUserAdmin).toHaveBeenCalled()
    })

    it('should validate request body', async () => {
      const { isUserAdmin } = await import('@/lib/supabase/admin-auth')
      vi.mocked(isUserAdmin).mockResolvedValue(true)

      // Missing required fields
      const request = new NextRequest('http://localhost:3000/api/admin/feedback', {
        method: 'PATCH',
        body: JSON.stringify({ id: 'feedback-1' }) // Missing status
      })

      const response = await PATCH(request)

      expect(response.status).toBe(400)

      const json = await response.json()
      expect(json.error).toBeDefined()
    })
  })
})
```

**Expected Test Output**:
```
✓ API: /api/admin/feedback (6)
  ✓ GET /api/admin/feedback (3)
    ✓ should return feedback array when user is admin
    ✓ should return 401 when user is not admin
    ✓ should handle query parameters for filtering
  ✓ PATCH /api/admin/feedback (3)
    ✓ should update feedback status when user is admin
    ✓ should return 401 when user is not admin
    ✓ should validate request body

Test Files  1 passed (1)
Tests  6 passed (6)
```

#### Troubleshooting

**Issue**: 401/403 error even when logged in as admin

- **Cause**: `isUserAdmin()` returning false, JWT expired, or user not in admin_users table
- **Solution**:
  ```sql
  -- Verify admin status in database
  SELECT * FROM admin_users WHERE user_id = auth.uid();

  -- If empty, add yourself:
  INSERT INTO admin_users (user_id, display_name, email)
  VALUES (auth.uid(), 'Your Name', 'your@email.com');

  -- Then re-login to get fresh JWT token
  ```

**Issue**: Can't get JWT token from browser

- **Cause**: Token stored in httpOnly cookie or different storage location
- **Solution**:
  - Check DevTools → Application → Cookies
  - Check DevTools → Application → Local Storage
  - Check DevTools → Network → Headers for Authorization header
  - Use JavaScript console method: `supabase.auth.getSession()`

**Issue**: API returns empty feedback array

- **Cause**: No feedback data exists in database or RLS filtering all results
- **Solution**:
  ```sql
  -- Insert test feedback
  INSERT INTO feedback (user_id, message, category, status)
  VALUES (auth.uid(), 'Test feedback for admin review', 'bug', 'pending');

  -- Verify feedback exists
  SELECT COUNT(*) FROM feedback;

  -- Check RLS policies on feedback table
  SELECT policyname, cmd FROM pg_policies WHERE tablename = 'feedback';
  ```

**Issue**: curl command fails with "Connection refused"

- **Cause**: Development server not running or wrong port
- **Solution**:
  ```bash
  # Start development server
  pnpm dev

  # Verify server is running on port 3000
  # Try http://localhost:3000 in browser

  # Check port in use
  lsof -i :3000
  ```

**Issue**: Automated tests can't mock Supabase client

- **Cause**: Mock setup incomplete or import path wrong
- **Solution**:
  - Use vitest `vi.mock()` for all Supabase modules
  - Mock at module level before imports
  - Verify mock paths match actual file structure
  - See test file example above for complete mock setup

**Issue**: PATCH request returns 400 "Invalid request body"

- **Cause**: Missing required fields or wrong content type
- **Solution**:
  ```bash
  # Ensure Content-Type header is set
  curl -X PATCH 'http://localhost:3000/api/admin/feedback' \
    -H 'Authorization: Bearer TOKEN' \
    -H 'Content-Type: application/json' \  # Important!
    -d '{"id": "uuid", "status": "resolved"}'  # Include both fields
  ```

**Issue**: RLS policy blocks admin from seeing feedback

- **Cause**: Feedback table RLS policy might not include admin exception
- **Solution**:
  ```sql
  -- Check feedback SELECT policy
  SELECT policyname, qual
  FROM pg_policies
  WHERE tablename = 'feedback' AND cmd = 'SELECT';

  -- Policy should allow admins to see all:
  -- (user_id = auth.uid()) OR
  -- EXISTS (SELECT 1 FROM admin_users WHERE user_id = auth.uid())
  ```

### Test Case 5: Service Role Bypass

**Purpose**: Verify service role operations bypass RLS

This test confirms that the service role key allows backend operations to bypass all RLS policies on the `admin_users` table, which is essential for administrative operations, data seeding, and migrations.

**⚠️ CRITICAL SECURITY WARNING**: The service role key bypasses ALL Row Level Security policies. It should:
- **NEVER** be exposed to client-side code
- **NEVER** be committed to version control (use `.gitignore`)
- **NEVER** be used in browser/frontend applications
- **ONLY** be used in secure backend environments (API routes, server actions, admin scripts)

If your service role key is ever exposed, **IMMEDIATELY rotate it** in Supabase Dashboard → Settings → API → Service Role Key → Regenerate.

#### Prerequisites

1. **`SUPABASE_SERVICE_ROLE_KEY` configured**:
   - Located in `.env.local` file
   - Obtain from: Supabase Dashboard → Settings → API → Project API keys → `service_role` secret
   - Never commit to git (add `.env.local` to `.gitignore`)

2. **Understanding service role vs authenticated client**:
   - **Service Role**: Bypasses ALL RLS policies, full database access
   - **Authenticated Client** (anon key): Subject to RLS policies based on user's auth state
   - **Use Cases**:
     - Service Role: Admin tools, migrations, seeding, backend-only operations
     - Authenticated Client: All user-facing operations, API endpoints with user context

3. **Backend environment** (for testing):
   - Server-side code (API routes, Server Actions)
   - Admin scripts (Node.js, not browser)
   - Build-time operations

#### Method 1: SQL Testing (Not Applicable)

**Note**: Service role is used programmatically via Supabase client libraries, not directly in SQL Editor. The SQL Editor itself uses service role privileges by default.

**Conceptual verification**:

```sql
-- SQL Editor already runs as service role
-- To see current PostgreSQL role:
SELECT current_user, current_role, session_user;
-- Output: postgres (superuser) or service_role

-- Service role can perform any operation:
SELECT * FROM admin_users; -- Works regardless of RLS
INSERT INTO admin_users VALUES (...); -- Works regardless of RLS
DELETE FROM admin_users WHERE user_id = '...'; -- Works regardless of RLS
```

**To verify RLS is actually enabled** (but not enforcing on service role):

```sql
-- Check RLS is enabled
SELECT tablename, rowsecurity
FROM pg_tables
WHERE tablename = 'admin_users';
-- rowsecurity should be TRUE

-- But service role bypasses it
SELECT COUNT(*) FROM admin_users;
-- Returns all rows without restriction
```

#### Method 2: Backend Code Testing

**Test 1: Service Role Can Read admin_users Regardless of RLS**

```typescript
// File: scripts/test-service-role.ts
// Run with: npx tsx scripts/test-service-role.ts

import { createClient } from '@supabase/supabase-js'

// Create service role client (bypasses RLS)
const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!, // Service role key
  {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  }
)

// Test: Read all admins without authentication
const { data, error } = await serviceClient
  .from('admin_users')
  .select('*')

console.log('Service Role SELECT Test:')
console.log('Error:', error) // Should be null
console.log('Data:', data)   // Should return ALL rows
console.log('Row count:', data?.length || 0)
```

**Expected Output**:
```
Service Role SELECT Test:
Error: null
Data: [
  { user_id: '...', display_name: 'Admin 1', email: '...', created_at: '...' },
  { user_id: '...', display_name: 'Admin 2', email: '...', created_at: '...' }
]
Row count: 2
```

**Test 2: Service Role Can INSERT Without Being Admin**

```typescript
// Continuing in scripts/test-service-role.ts

// Create test admin (no auth context needed)
const newAdminId = crypto.randomUUID()

const { data: insertData, error: insertError } = await serviceClient
  .from('admin_users')
  .insert({
    user_id: newAdminId,
    display_name: 'Service Role Test Admin',
    email: 'service-test@example.com'
  })
  .select()
  .single()

console.log('\nService Role INSERT Test:')
console.log('Error:', insertError) // Should be null
console.log('Inserted:', insertData) // Should return inserted row
console.log('Success:', !insertError) // Should be true

// Cleanup: Delete test admin
await serviceClient
  .from('admin_users')
  .delete()
  .eq('user_id', newAdminId)

console.log('\nCleanup: Test admin deleted')
```

**Expected Output**:
```
Service Role INSERT Test:
Error: null
Inserted: { user_id: '...', display_name: 'Service Role Test Admin', ... }
Success: true

Cleanup: Test admin deleted
```

**Test 3: Compare with Authenticated Client (Should Respect RLS)**

```typescript
// Create authenticated client (uses anon key, RLS enforced)
const authedClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // Anon key (not service role)
)

// Attempt INSERT without being admin (should fail)
const testUserId = crypto.randomUUID()

const { data: authedData, error: authedError } = await authedClient
  .from('admin_users')
  .insert({
    user_id: testUserId,
    display_name: 'Hacker',
    email: 'hacker@example.com'
  })
  .select()
  .single()

console.log('\nAuthenticated Client INSERT Test (should fail):')
console.log('Error:', authedError) // Should have error
console.log('Error Code:', authedError?.code) // PGRST301
console.log('Data:', authedData) // Should be null
console.log('RLS Enforced:', !!authedError) // Should be true
```

**Expected Output**:
```
Authenticated Client INSERT Test (should fail):
Error: {
  code: 'PGRST301',
  details: null,
  hint: null,
  message: 'new row violates row-level security policy for table "admin_users"'
}
Error Code: PGRST301
Data: null
RLS Enforced: true
```

**Test 4: Real-World Use Case - Admin Seeding Script**

```typescript
// File: scripts/seed-first-admin.ts
// Purpose: Bootstrap first admin when none exist
// Run with: npx tsx scripts/seed-first-admin.ts

import { createClient } from '@supabase/supabase-js'

const serviceClient = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

async function seedFirstAdmin() {
  const adminEmail = process.argv[2]
  if (!adminEmail) {
    console.error('Usage: npx tsx scripts/seed-first-admin.ts <admin-email>')
    process.exit(1)
  }

  // Get user ID from auth.users by email
  const { data: authUser, error: authError } = await serviceClient.auth.admin.listUsers()
  const user = authUser?.users.find(u => u.email === adminEmail)

  if (!user) {
    console.error(`User not found: ${adminEmail}`)
    console.log('Create user first via Supabase Dashboard → Authentication → Invite User')
    process.exit(1)
  }

  // Check if already admin
  const { data: existing } = await serviceClient
    .from('admin_users')
    .select('user_id')
    .eq('user_id', user.id)
    .single()

  if (existing) {
    console.log(`✓ User ${adminEmail} is already an admin`)
    return
  }

  // Insert as admin (bypasses RLS policy that requires existing admin)
  const { data, error } = await serviceClient
    .from('admin_users')
    .insert({
      user_id: user.id,
      display_name: user.user_metadata?.display_name || user.email,
      email: user.email
    })
    .select()
    .single()

  if (error) {
    console.error('Failed to create admin:', error.message)
    process.exit(1)
  }

  console.log(`✓ Successfully added ${adminEmail} as admin`)
  console.log(`  User ID: ${data.user_id}`)
  console.log(`  Name: ${data.display_name}`)
}

seedFirstAdmin().catch(console.error)
```

**Usage**:
```bash
npx tsx scripts/seed-first-admin.ts admin@example.com
```

**Expected Output**:
```
✓ Successfully added admin@example.com as admin
  User ID: a1b2c3d4-5678-90ab-cdef-1234567890ab
  Name: Admin User
```

#### Method 3: Automated Integration Test

**Test File**: `__tests__/rls/service-role-bypass.test.ts`

**Setup** (if vitest not installed):
```bash
pnpm add -D vitest @vitejs/plugin-react @supabase/supabase-js
```

**Complete Test Code**:

```typescript
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { createClient } from '@supabase/supabase-js'

describe('RLS: Service Role Bypass', () => {
  let serviceClient: ReturnType<typeof createClient>
  let authedClient: ReturnType<typeof createClient>
  const testAdminIds: string[] = []

  beforeAll(() => {
    // Service role client (bypasses RLS)
    serviceClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    )

    // Authenticated client (enforces RLS)
    authedClient = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    )
  })

  afterAll(async () => {
    // Cleanup test admins using service role
    if (testAdminIds.length > 0) {
      await serviceClient
        .from('admin_users')
        .delete()
        .in('user_id', testAdminIds)
    }
  })

  it('service role should bypass SELECT policy', async () => {
    // Service role can read all admins without auth
    const { data, error } = await serviceClient
      .from('admin_users')
      .select('*')

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(Array.isArray(data)).toBe(true)
    // Should return rows (if any exist)
  })

  it('service role should bypass INSERT policy', async () => {
    const testAdminId = crypto.randomUUID()
    testAdminIds.push(testAdminId)

    // Service role can insert admin without being admin
    const { data, error } = await serviceClient
      .from('admin_users')
      .insert({
        user_id: testAdminId,
        display_name: 'Test Service Role Admin',
        email: 'service-test@example.com'
      })
      .select()
      .single()

    expect(error).toBeNull()
    expect(data).toBeTruthy()
    expect(data?.user_id).toBe(testAdminId)
  })

  it('service role should bypass UPDATE policy', async () => {
    const testAdminId = crypto.randomUUID()
    testAdminIds.push(testAdminId)

    // Create admin
    await serviceClient
      .from('admin_users')
      .insert({
        user_id: testAdminId,
        display_name: 'Original Name',
        email: 'update-test@example.com'
      })

    // Update admin (bypasses policy)
    const { data, error } = await serviceClient
      .from('admin_users')
      .update({ display_name: 'Updated Name' })
      .eq('user_id', testAdminId)
      .select()
      .single()

    expect(error).toBeNull()
    expect(data?.display_name).toBe('Updated Name')
  })

  it('service role should bypass DELETE policy', async () => {
    const testAdminId = crypto.randomUUID()

    // Create admin
    await serviceClient
      .from('admin_users')
      .insert({
        user_id: testAdminId,
        display_name: 'To Be Deleted',
        email: 'delete-test@example.com'
      })

    // Delete admin (bypasses policy)
    const { error } = await serviceClient
      .from('admin_users')
      .delete()
      .eq('user_id', testAdminId)

    expect(error).toBeNull()

    // Verify deletion
    const { data: checkData } = await serviceClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', testAdminId)
      .single()

    expect(checkData).toBeNull()
  })

  it('authenticated client should respect RLS policies', async () => {
    const testUserId = crypto.randomUUID()

    // Authenticated client (without admin privileges) should fail
    const { data, error } = await authedClient
      .from('admin_users')
      .insert({
        user_id: testUserId,
        display_name: 'Unauthorized',
        email: 'unauthorized@example.com'
      })
      .select()
      .single()

    // Should fail with RLS policy violation
    expect(error).toBeTruthy()
    expect(error?.code).toBe('PGRST301')
    expect(data).toBeNull()
  })

  it('should not accidentally use service role in production code', () => {
    // This test ensures service role key is only used in appropriate contexts
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

    expect(serviceRoleKey).toBeDefined()
    expect(serviceRoleKey).not.toBe(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY)

    // Verify it's not exposed to client (environment variable check)
    expect(process.env.NEXT_PUBLIC_SUPABASE_SERVICE_ROLE_KEY).toBeUndefined()
  })
})
```

**Expected Test Output**:
```
✓ RLS: Service Role Bypass (6)
  ✓ service role should bypass SELECT policy
  ✓ service role should bypass INSERT policy
  ✓ service role should bypass UPDATE policy
  ✓ service role should bypass DELETE policy
  ✓ authenticated client should respect RLS policies
  ✓ should not accidentally use service role in production code

Test Files  1 passed (1)
Tests  6 passed (6)
```

#### Troubleshooting

**Issue**: Service role operations still blocked by RLS

- **Cause**: Using wrong client (anon key instead of service role key)
- **Solution**:
  ```typescript
  // WRONG: Using anon key
  const client = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY! // This enforces RLS
  )

  // CORRECT: Using service role key
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!, // This bypasses RLS
    { auth: { autoRefreshToken: false, persistSession: false } }
  )

  // Verify which key you're using
  console.log('Using service role:', !!process.env.SUPABASE_SERVICE_ROLE_KEY)
  ```

**Issue**: Service role key not working / undefined

- **Cause**: Key not set in environment or incorrect variable name
- **Solution**:
  1. Check `.env.local` file exists:
     ```bash
     cat .env.local | grep SUPABASE_SERVICE_ROLE_KEY
     ```
  2. Get key from Supabase Dashboard:
     - Navigate to: Settings → API → Project API keys
     - Copy `service_role` secret (not `anon` public)
  3. Add to `.env.local`:
     ```
     SUPABASE_SERVICE_ROLE_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
     ```
  4. Restart development server:
     ```bash
     pnpm dev
     ```

**Issue**: Security concern - service role key exposed

- **Cause**: Service role key detected in client-side code, commits, or logs
- **Solution**:
  1. **IMMEDIATE ACTION**: Rotate key in Supabase Dashboard → Settings → API → Service Role Key → Regenerate
  2. **Audit codebase** for leaks:
     ```bash
     # Search for service role key in code
     git grep -i "service.*role.*key"

     # Check git history for commits
     git log -p -S "SUPABASE_SERVICE_ROLE_KEY"

     # Verify .gitignore includes .env files
     cat .gitignore | grep ".env"
     ```
  3. **Never expose to client**:
     - Don't use `NEXT_PUBLIC_` prefix for service role key
     - Only use in server-side code (API routes, Server Actions)
     - Never import in client components
  4. **Best practices**:
     - Add `.env.local` to `.gitignore`
     - Use environment variables in CI/CD (Vercel, GitHub Actions)
     - Rotate key periodically (every 6-12 months)

**Issue**: When should I use service role vs authenticated client?

- **Use Service Role** (bypasses RLS):
  - ✅ Admin seeding scripts (first admin creation)
  - ✅ Data migrations (backend-only)
  - ✅ Batch operations on admin data
  - ✅ System maintenance tasks
  - ✅ Server-side operations where RLS check already happened in app logic
  - **Location**: API routes (server-side), Server Actions, Node.js scripts

- **Use Authenticated Client** (enforces RLS):
  - ✅ All user-facing operations
  - ✅ API endpoints with user context
  - ✅ Operations that should respect user permissions
  - ✅ Any operation where RLS is part of security model
  - **Location**: Client components, API routes handling user requests

**Issue**: Tests pass but RLS doesn't seem enabled

- **Cause**: Tests might be using service role client accidentally
- **Solution**:
  ```typescript
  // In tests, explicitly verify RLS is enabled
  it('should confirm RLS is enabled on admin_users', async () => {
    const { data } = await serviceClient
      .from('pg_tables')
      .select('rowsecurity')
      .eq('tablename', 'admin_users')
      .single()

    expect(data?.rowsecurity).toBe(true)
  })

  // And verify authenticated client respects it
  it('should verify authed client enforces RLS', async () => {
    const { error } = await authedClient
      .from('admin_users')
      .insert({ ... })

    expect(error?.code).toBe('PGRST301') // RLS policy violation
  })
  ```

**Issue**: Service role client in lib/supabase/admin-auth.ts - is this secure?

- **Cause**: Concern about `createServiceClient()` usage in `isUserAdmin()`
- **Explanation**: This is secure because:
  1. `lib/supabase/admin-auth.ts` is server-side only (not imported by client)
  2. Used in API routes that run on the server
  3. The admin check itself (querying `admin_users`) needs to bypass RLS to avoid circular dependency
  4. Application-level auth (`auth.getUser()`) is checked first
- **Verify it's server-only**:
  ```bash
  # Search for imports of admin-auth
  git grep -l "from '@/lib/supabase/admin-auth'"

  # Should only appear in:
  # - app/api/*/route.ts (API routes)
  # - Server Actions
  # - NOT in client components
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
