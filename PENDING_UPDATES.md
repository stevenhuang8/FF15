# Pending Major Version Updates

All previously deferred updates have been completed. This document is kept for historical reference.

## All Deferred Updates Completed ✅

### ✅ Next.js 16 (15.5.3 → 16.1.6) — completed Feb 2026
### ✅ react-syntax-highlighter 16.1.0 — completed Feb 2026
### ✅ @types/node 25.2.1 — completed Feb 2026
### ✅ AI SDK 6 (ai 5.x → 6.0.73, @ai-sdk/openai 2.x → 3.x, @ai-sdk/react 2.x → 3.x) — completed Feb 2026

## Recent Updates Completed (2025-12-01)

### ✅ Phase 1: Safe Updates
- Updated 16 packages (Radix UI, Tailwind, TypeScript, utilities)
- All patch and minor version updates
- No breaking changes

### ✅ Phase 2: AI SDK Updates
- `ai`: 5.0.92 → 5.0.106
- `@ai-sdk/react`: 2.0.92 → 2.0.106
- `@ai-sdk/openai`: 2.0.65 → 2.0.75
- `@ai-sdk/mcp`: 0.0.8 → 0.0.11

### ✅ Phase 3: Supabase Updates
- `@supabase/supabase-js`: 2.81.1 → 2.86.0
- `@supabase/ssr`: 0.7.0 → 0.8.0

### ✅ Phase 4: Other Dependencies
- Updated 9 packages including:
  - `react-hook-form`: 7.64.0 → 7.67.0
  - `recharts`: 3.2.1 → 3.5.1
  - `shiki`: 3.13.0 → 3.17.1
  - `streamdown`: 1.2.0 → 1.6.9
  - `zod`: 4.1.11 → 4.1.13
  - `lucide-react`: 0.544.0 → 0.555.0
  - And more...

### ✅ Type Fixes
Fixed TypeScript errors in `components/ingredient/ingredient-input.tsx`:
- Added optional chaining for `field.value?.toLowerCase()`
- Fixed undefined handling in quantity input

### ✅ Verification
- ✅ TypeScript type checking passed (`pnpm tsc --noEmit`)
- ✅ Production build successful (`pnpm build`)

---

# Progress Photos Storage Setup — COMPLETED ✅

## Status
Supabase Storage bucket `progress-photos` has been configured and the feature is working.

## Setup That Was Required

## Required Setup

### 1. Create Storage Bucket
- Go to Supabase Dashboard → Storage
- Create a new bucket named: `progress-photos`
- Settings:
  - Public bucket: **Yes** (for public URL access)
  - File size limit: 10MB (or as needed)
  - Allowed MIME types: `image/*`

### 2. Set Bucket Policies

Add the following policies to the `progress-photos` bucket:

**Policy 1: Allow authenticated users to upload**
```sql
CREATE POLICY "Allow authenticated users to upload progress photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 2: Allow users to read their own photos**
```sql
CREATE POLICY "Allow users to read their own progress photos"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

**Policy 3: Allow users to delete their own photos**
```sql
CREATE POLICY "Allow users to delete their own progress photos"
ON storage.objects FOR DELETE
TO authenticated
USING (
  bucket_id = 'progress-photos'
  AND auth.uid()::text = (storage.foldername(name))[1]
);
```

## Testing

After setup, test the upload:
1. Select a photo
2. Check browser console for detailed logging:
   - "Starting photo upload for user: ..."
   - "Compressing image..."
   - "Uploading to storage: ..."
   - "Upload successful: ..."
   - "Public URL: ..."
   - "Photo upload complete!"

If upload fails, console will show specific error message.

## Recent Code Changes (2025-12-01)

- ✅ Fixed image preview using native `<img>` tag instead of Next.js Image
- ✅ Switched from FileReader data URLs to `URL.createObjectURL()` for preview
  - Solves Content Security Policy (CSP) issues with data URLs
  - More efficient memory usage (blob URLs vs base64)
  - Properly cleans up object URLs to prevent memory leaks
- ✅ Added `key={previewUrl}` prop to force React to create new DOM element
  - Prevents React from reusing element with revoked blob URL
  - Ensures fresh element for each new preview
- ✅ Added comprehensive logging to diagnose upload issues
- ✅ Fixed date reset to use `getTodayPacific()` helper
- ✅ Improved error messages to show specific failure points
- ✅ Added proper cleanup in Dialog close, Cancel button, and component unmount
