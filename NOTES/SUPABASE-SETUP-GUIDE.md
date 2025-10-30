# Supabase Feedback System Setup Guide

This guide will help you set up the database and storage for the feedback system.

## Prerequisites

- Access to your Supabase project dashboard
- Project URL and keys already configured in `.env.local`

---

## Part 1: Database Setup

### Step 1: Run the SQL Script

1. **Open Supabase Dashboard**
   - Go to https://supabase.com/dashboard
   - Select your project

2. **Navigate to SQL Editor**
   - Click "SQL Editor" in the left sidebar
   - Click "New query"

3. **Copy and Run the SQL Script**
   - Open the file `supabase-feedback-setup.sql` in this project
   - Copy the entire contents
   - Paste into the SQL Editor
   - Click "Run" or press `Cmd/Ctrl + Enter`

4. **Verify Success**
   - You should see results from the verification queries at the bottom
   - Check that the table, indexes, and policies were created

### What This Creates

- ✅ `feedback` table with proper schema
- ✅ Indexes for performance (user_id, status, created_at, type)
- ✅ Row Level Security (RLS) enabled
- ✅ RLS policies for:
  - Authenticated users can submit feedback
  - Users can view their own feedback
  - Users can update their own feedback
  - Users can delete their own feedback
- ✅ Automatic `updated_at` timestamp trigger

---

## Part 2: Storage Bucket Setup

### Step 2: Create Storage Bucket

1. **Navigate to Storage**
   - In Supabase Dashboard, click "Storage" in the left sidebar
   - Click "New bucket"

2. **Configure Bucket**
   - **Name**: `feedback-attachments`
   - **Public bucket**: ✅ **YES** (Enable this)
   - **File size limit**: 5 MB
   - **Allowed MIME types**: Leave blank (we validate on client/server)
   - Click "Create bucket"

### Step 3: Set Up Storage Policies

1. **Click on the `feedback-attachments` bucket**
2. **Click "Policies" tab**
3. **Add the following policies:**

#### Policy 1: Allow Public Read Access

```sql
-- Name: Allow public to read attachments
-- Operation: SELECT
-- Target roles: public

CREATE POLICY "Allow public to read attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback-attachments');
```

#### Policy 2: Allow Authenticated Users to Upload

```sql
-- Name: Allow authenticated users to upload
-- Operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-attachments');
```

#### Policy 3: Allow Users to Delete Their Own Files

```sql
-- Name: Allow users to delete their own attachments
-- Operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Allow users to delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'feedback-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

### Alternative: Quick Setup via SQL

You can also run these policies in the SQL Editor:

```sql
-- Storage Policies for feedback-attachments bucket

-- Allow public read access
CREATE POLICY "Allow public to read attachments"
ON storage.objects FOR SELECT
TO public
USING (bucket_id = 'feedback-attachments');

-- Allow authenticated users to upload
CREATE POLICY "Allow authenticated users to upload"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'feedback-attachments');

-- Allow users to delete their own attachments
CREATE POLICY "Allow users to delete their own attachments"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'feedback-attachments'
  AND (storage.foldername(name))[1] = auth.uid()::text
);
```

---

## Part 3: Verify Setup

### Test Database

1. **Check Table Exists**
   ```sql
   SELECT * FROM public.feedback LIMIT 1;
   ```
   - Should return empty result (no error)

2. **Test Insert (Optional)**
   ```sql
   INSERT INTO public.feedback (feedback_type, description, email)
   VALUES ('general', 'Test feedback from SQL', 'test@example.com')
   RETURNING *;
   ```
   - Should return the inserted row

3. **Clean Up Test Data (Optional)**
   ```sql
   DELETE FROM public.feedback WHERE description = 'Test feedback from SQL';
   ```

### Test Storage

1. **Navigate to Storage > feedback-attachments**
2. **Click "Upload file"**
3. **Try uploading a small image**
4. **Verify you can see the uploaded file**
5. **Delete the test file**

---

## Part 4: Test the App

### 1. Start Development Server

```bash
pnpm dev
```

### 2. Test Feedback Submission (Authenticated)

1. Navigate to http://localhost:3000
2. **Log in to your app**
3. Click the Help button (? icon) in the navbar
4. Fill out the form:
   - Type: Bug Report
   - Description: "Test feedback submission"
   - Email: your-email@example.com (optional)
   - Upload a screenshot (optional)
5. Click "Submit Feedback"
6. Should see success message

### 3. Verify in Supabase

1. Go to Supabase Dashboard > Table Editor > feedback
2. You should see your test submission with `user_id` populated

### 4. Test Feedback History Page

1. While logged in, navigate to http://localhost:3000/feedback
2. You should see your submitted feedback
3. Verify status badges, dates, and descriptions display correctly

### 5. Test HEIC Upload (iPhone/Mac Only)

1. Try uploading a .heic photo from your iPhone/Mac
2. Should automatically convert to JPEG and upload successfully

---

## Troubleshooting

### Issue: "Failed to fetch feedback history"

**Cause**: User not authenticated or RLS policies not set up correctly

**Solution**:
1. Make sure you're logged in
2. Verify RLS policies were created (check Part 1, Step 1)
3. Run this to check policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'feedback';
   ```

### Issue: "Upload failed: 403 Forbidden"

**Cause**: Storage bucket policies not set up correctly

**Solution**:
1. Verify bucket is public (Part 2, Step 2)
2. Verify storage policies were created (Part 2, Step 3)
3. Run this to check storage policies:
   ```sql
   SELECT * FROM pg_policies WHERE tablename = 'objects' AND schemaname = 'storage';
   ```

### Issue: "Feedback table does not exist"

**Cause**: SQL script didn't run successfully

**Solution**:
1. Re-run the SQL script from `supabase-feedback-setup.sql`
2. Check for any error messages in the SQL Editor
3. Make sure you're running it on the correct project

### Issue: Users can't submit feedback while logged in

**Cause**: RLS policy for authenticated users not created properly

**Solution**:
```sql
-- Re-run the authenticated insert policy
CREATE POLICY "Authenticated users can submit feedback"
ON public.feedback
FOR INSERT
TO authenticated
WITH CHECK (auth.uid() = user_id);
```

---

## Next Steps

After successful setup:

1. ✅ Test feedback submission while authenticated
2. ✅ Test feedback history page for authenticated users
3. ✅ Test file uploads with various image formats (including HEIC)
4. ✅ Verify data appears correctly in Supabase dashboard
5. 🚀 Continue with Task 11.5: Admin Dashboard and Email Notifications

---

## Security Notes

- **Authentication required**: Only logged-in users can submit feedback
- **RLS is enabled**: Users can only see their own feedback
- **File uploads are validated**: Max 5MB, images only (JPEG, PNG, GIF, WebP, HEIC)
- **Storage is public**: Anyone with the URL can view attachments (acceptable for feedback screenshots)
- **User accountability**: All feedback is tied to a user account for better follow-up and spam prevention
- **Future enhancement**: Consider making storage private and using signed URLs for sensitive attachments

---

## Quick Reference

### Important Files Created

- `supabase-feedback-setup.sql` - Database setup script
- `SUPABASE-SETUP-GUIDE.md` - This guide
- `components/feedback/feedback-modal.tsx` - Feedback submission form
- `components/feedback/feedback-history.tsx` - Feedback history display
- `app/api/feedback/route.ts` - API endpoints
- `app/feedback/page.tsx` - Feedback history page

### Database Table: `feedback`

| Column | Type | Description |
|--------|------|-------------|
| id | UUID | Primary key |
| user_id | UUID | Foreign key to auth.users (required) |
| feedback_type | TEXT | bug, feature, complaint, general |
| description | TEXT | Feedback description |
| email | TEXT | Optional email for follow-up |
| attachment_url | TEXT | Public URL to attachment |
| attachment_path | TEXT | Storage path for cleanup |
| status | TEXT | pending, reviewed, resolved, closed |
| created_at | TIMESTAMPTZ | Creation timestamp |
| updated_at | TIMESTAMPTZ | Last update timestamp |

### Storage Bucket: `feedback-attachments`

- **Type**: Public bucket
- **Max file size**: 5MB
- **Allowed formats**: JPEG, PNG, GIF, WebP (HEIC converted on client)
- **Folder structure**: `{user_id}/{timestamp}.{ext}`

---

Need help? Check the troubleshooting section above or review the error messages in your browser console / Supabase logs.
