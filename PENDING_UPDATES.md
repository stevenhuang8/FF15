# Pending Major Version Updates

This document tracks major version updates that were deferred during the dependency update on 2025-12-01.

## Deferred Updates

### 1. Next.js 16.0.6 (Currently: 15.5.3)
- **Type**: Major version update (15 → 16)
- **Status**: Deferred for separate testing
- **Considerations**:
  - Major version updates in Next.js can introduce breaking changes
  - Requires thorough testing of all routes, API endpoints, and middleware
  - May affect Turbopack configuration
  - Review [Next.js 16 upgrade guide](https://nextjs.org/docs/app/building-your-application/upgrading/version-16)

**Recommended Testing Steps**:
1. Review Next.js 16 changelog and breaking changes
2. Update to 16.0.6 in a separate branch
3. Test all pages render correctly
4. Verify API routes (/api/chat, /api/rag-agent, etc.)
5. Test authentication flows (login, signup, password reset)
6. Test MCP server integration
7. Verify Turbopack build still works
8. Check middleware functionality
9. Test edge runtime pages

### 2. react-syntax-highlighter 16.1.0 (Currently: 15.6.6)
- **Type**: Major version update (15 → 16)
- **Status**: Deferred for separate testing
- **Considerations**:
  - Used in chat components for code highlighting
  - May have API or prop changes
  - Check if syntax highlighting styles are affected

**Recommended Testing Steps**:
1. Review changelog for breaking changes
2. Update in a separate branch
3. Test code blocks in chat interface
4. Verify syntax highlighting works for common languages (JS, Python, etc.)
5. Check if custom styling still applies

### 3. @types/node 24.10.1 (Currently: 20.19.14)
- **Type**: Major version update (20 → 24)
- **Status**: Deferred for separate testing
- **Considerations**:
  - Node.js type definitions major update
  - May expose new type errors in existing code
  - Ensure Node.js runtime version is compatible (check `.nvmrc` or engines field)
  - Review if any deprecated Node.js APIs are used

**Recommended Testing Steps**:
1. Check current Node.js version in project
2. Verify Node.js 24.x compatibility
3. Update types in a separate branch
4. Run `pnpm tsc --noEmit` to check for new type errors
5. Fix any type errors that surface
6. Test build process

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

## Next Steps

When ready to tackle major version updates:

1. Create a new branch: `git checkout -b update/next-js-16`
2. Update one major package at a time
3. Follow the recommended testing steps for each package
4. Run full test suite if available
5. Test manually in development environment
6. Verify production build works
7. Deploy to staging environment for thorough testing
8. Merge to main only after confirming everything works

## Notes

- All completed updates are backward compatible
- No breaking changes were introduced in Phases 1-4
- Application is stable and production-ready with current updates
- Major version updates can be done incrementally when time permits

---

# Progress Photos Storage Setup

## Issue
The progress photos feature requires a Supabase Storage bucket that may not be configured yet.

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
