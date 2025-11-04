# Feedback Image Upload Fix

## Issue
When users submitted feedback with an attached image, the API returned a 500 error: "File upload failed"

## Root Cause
The `uploadFeedbackAttachment()` function in `/lib/supabase/storage.ts` was using the browser Supabase client (`createClient()` from `./client`) instead of accepting a server-side client as a parameter. This caused the upload to fail when called from the server-side API route.

## Solution

### Code Changes

1. **Modified `/lib/supabase/storage.ts`**:
   - Updated `uploadFeedbackAttachment()` to accept an optional `supabaseClient` parameter
   - Falls back to browser client if not provided (for client-side usage)
   - Uses the provided server client when called from API routes

2. **Modified `/app/api/feedback/route.ts`**:
   - Now passes the server-side Supabase client to `uploadFeedbackAttachment()`
   - Ensures proper authentication and permissions during upload

### Changes Made

```typescript
// Before (storage.ts)
export async function uploadFeedbackAttachment(
  file: File,
  userId?: string
): Promise<UploadResult> {
  const supabase = createClient()  // Browser client only!
  // ...
}

// After (storage.ts)
export async function uploadFeedbackAttachment(
  file: File,
  userId: string,
  supabaseClient?: any
): Promise<UploadResult> {
  // Use provided client (server-side) or create browser client (client-side)
  const supabase = supabaseClient || createClient()
  // ...
}
```

```typescript
// In API route (route.ts)
const uploadResult = await uploadFeedbackAttachment(file, user.id, supabase)
```

## Testing

To test the fix:

1. **Ensure Supabase bucket exists**:
   - Bucket name: `feedback-attachments`
   - Public: YES
   - RLS policies configured (see `/NOTES/SUPABASE-SETUP-GUIDE.md`)

2. **Test feedback submission**:
   - Sign in to the app
   - Click the feedback button
   - Fill out the feedback form
   - Attach an image (JPEG, PNG, HEIC, etc.)
   - Submit feedback
   - Should succeed with a success message

3. **Verify upload**:
   - Check Supabase Dashboard → Storage → feedback-attachments
   - Should see the uploaded image in the user's folder

## Related Files

- `/lib/supabase/storage.ts` - Storage utilities
- `/app/api/feedback/route.ts` - Feedback API endpoint
- `/components/feedback/feedback-modal.tsx` - Feedback form UI
- `/NOTES/SUPABASE-SETUP-GUIDE.md` - Setup instructions
- `/docs/SUPABASE_STORAGE_SETUP.md` - Detailed storage configuration

## Additional Notes

- HEIC images are automatically converted to JPEG on the client side before upload
- File size limit: 5MB
- Supported formats: JPEG, PNG, GIF, WebP, HEIC/HEIF
- Feedback attachments are stored in public bucket for admin review access

## Other Issues in Logs

The terminal logs also showed UUID validation errors for "user123". This appears to be **unrelated** to the feedback upload issue and may be:
- A test user ID being used in development
- An issue with AI tool calls in the chat system
- Should be investigated separately from this fix

The feedback image upload should now work correctly regardless of those other errors.
