# Supabase Storage Setup - Private Bucket with RLS

## Overview

This project uses Supabase Storage with **private buckets** and **signed URLs** for secure image storage. This ensures:
- Only authenticated users can upload images
- Only authorized users can access images
- URLs expire after 1 hour for additional security
- No public browsing or listing of files

## Bucket Configuration

### 1. Create the Bucket (if not exists)

1. Go to **Supabase Dashboard** → **Storage**
2. Click **New bucket**
3. Name: `ingredient-images`
4. **Public bucket**: **OFF** (keep it private)
5. **File size limit**: 5 MB (optional)
6. Click **Create bucket**

### 2. Set Up Row Level Security (RLS) Policies

Navigate to **Storage** → **Policies** for the `ingredient-images` bucket.

#### Policy 1: Allow Authenticated Users to Upload Their Own Files

```sql
-- Policy Name: Users can upload their own images
-- Operation: INSERT
-- Target roles: authenticated

CREATE POLICY "Users can upload their own images"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'ingredient-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**What this does:**
- Allows authenticated users to upload files
- Files must be uploaded to a folder matching their user ID
- Path structure: `ingredient-images/{user_id}/{filename}`

#### Policy 2: Allow Users to View Their Own Files

```sql
-- Policy Name: Users can view their own images
-- Operation: SELECT
-- Target roles: authenticated

CREATE POLICY "Users can view their own images"
ON storage.objects
FOR SELECT
TO authenticated
USING (
  bucket_id = 'ingredient-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**What this does:**
- Allows users to generate signed URLs for their own files
- Users cannot access other users' files
- Required for `createSignedUrl()` to work

#### Policy 3: Allow Users to Delete Their Own Files

```sql
-- Policy Name: Users can delete their own images
-- Operation: DELETE
-- Target roles: authenticated

CREATE POLICY "Users can delete their own images"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'ingredient-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**What this does:**
- Allows users to delete only their own uploaded files
- Prevents deletion of other users' files

#### Policy 4: Allow Users to Update Their Own Files

```sql
-- Policy Name: Users can update their own images
-- Operation: UPDATE
-- Target roles: authenticated

CREATE POLICY "Users can update their own images"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'ingredient-images' AND
  (storage.foldername(name))[1] = auth.uid()::text
);
```

**What this does:**
- Allows users to update metadata of their own files
- Prevents modification of other users' files

## How It Works

### Upload Flow

1. User uploads an image via `uploadIngredientImage(file, userId)`
2. File is stored at: `ingredient-images/{userId}/{timestamp}.{ext}`
3. A signed URL is generated with 1-hour expiry
4. Signed URL is returned to the client for display

### Access Flow

1. Client receives signed URL from upload response
2. Next.js Image component fetches the image using the signed URL
3. Supabase validates the signature and user permissions
4. Image is served if all checks pass

### Security Features

- **Private Bucket**: Files are not publicly accessible
- **Signed URLs**: Temporary, time-limited access (1 hour)
- **RLS Policies**: User-level isolation (users only access their own files)
- **Folder Structure**: Each user has their own folder (`{userId}/`)

## Troubleshooting

### Error: "new row violates row-level security policy"

**Cause**: User trying to upload to another user's folder or RLS policies not set up correctly.

**Fix**:
1. Verify RLS policies are created and enabled
2. Check file path matches user ID: `{userId}/{filename}`
3. Ensure user is authenticated

### Error: "Failed to generate signed URL"

**Cause**: SELECT policy is missing or user doesn't have permission to view the file.

**Fix**:
1. Add the "Users can view their own images" SELECT policy
2. Verify the user owns the file being accessed

### Error: "Bucket must be public"

**Cause**: Trying to use `getPublicUrl()` on a private bucket.

**Fix**:
- Use `createSignedUrl()` instead (already implemented in `storage.ts`)

## Migration from Public to Private Bucket

If you previously had a public bucket:

1. **Disable public access** in Supabase Dashboard → Storage → Bucket Settings
2. **Add RLS policies** (see above)
3. Code is already updated to use signed URLs (no changes needed)
4. Restart your dev server: `pnpm dev`

## Testing

Test the implementation:

```bash
# Start dev server
pnpm dev

# Navigate to ingredient upload page
# Try uploading an image
# Verify image displays correctly
# Check browser network tab - URL should include `?token=...`
```

## Configuration Files

- Implementation: `/lib/supabase/storage.ts`
- Upload component: `/components/ingredient/ingredient-upload.tsx`
- Next.js config: `/next.config.ts`
