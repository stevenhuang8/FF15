# Implementation Notes: Storage Security with Private Buckets

## Problem

Users were getting "upstream image response failed" 400 errors when uploading images to Supabase Storage. The code was generating public URLs for images stored in a bucket that wasn't configured for public access. Additionally, using public buckets meant that anyone with the exact URL could access any user's uploaded images, creating a security and privacy concern. There was no user-level isolation or access control on uploaded ingredient images.

## Solution

Implement private bucket approach with signed URLs and Row Level Security (RLS) policies in Supabase Storage. This ensures:

1. **Replace public URLs with signed URLs** - Updated `/lib/supabase/storage.ts` to use `createSignedUrl()` instead of `getPublicUrl()`, generating temporary access tokens that expire after 1 hour
2. **User-level file isolation** - Maintain folder structure `{userId}/{filename}` to organize files by owner
3. **RLS policies** - Configure Supabase Storage policies to enforce that users can only upload, view, update, and delete their own files
4. **Private bucket configuration** - Keep the `ingredient-images` bucket private, preventing any public listing or browsing

## Rabbit Holes

- Over-engineering URL expiry logic with multiple time windows for different use cases (1 hour is sufficient for the image upload flow)
- Implementing client-side caching of signed URLs before they expire (adds complexity without clear benefit since images are re-fetched on page load anyway)
- Building a background job to pre-generate signed URLs for all user images (unnecessary overhead, generate on-demand is fine)
- Adding admin override policies before they're actually needed for the application

## No Gos

- Making the bucket public to "fix" the 400 error - this would compromise security
- Removing user ID from the file path structure - this breaks the RLS policy isolation model
- Implementing custom authentication middleware instead of using Supabase's built-in RLS - reinventing the wheel
- Supporting anonymous uploads - all uploads must be authenticated for proper access control
- Extending signed URL expiry beyond 24 hours - shorter expiry (1 hour) is more secure
