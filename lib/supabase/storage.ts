/**
 * Supabase Storage Utilities
 *
 * Functions for handling file uploads to Supabase Storage
 */

import { createClient } from './client'

const INGREDIENT_IMAGES_BUCKET = 'ingredient-images'

export interface UploadProgress {
  loaded: number
  total: number
  percentage: number
}

export interface UploadResult {
  path: string
  url: string
  fullPath: string
}

/**
 * Upload an ingredient image to Supabase Storage
 */
export async function uploadIngredientImage(
  file: File,
  userId: string,
  onProgress?: (progress: UploadProgress) => void
): Promise<UploadResult> {
  const supabase = createClient()

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const fileName = `${userId}/${timestamp}.${fileExt}`

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
  if (!validTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Supported: JPEG, PNG, WebP`)
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB')
  }

  // Upload with progress tracking
  const { data, error } = await supabase.storage
    .from(INGREDIENT_IMAGES_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    throw new Error(`Upload failed: ${error.message}`)
  }

  if (!data) {
    throw new Error('Upload failed: No data returned')
  }

  // Get signed URL (valid for 1 hour) - private bucket approach
  const { data: urlData, error: urlError } = await supabase.storage
    .from(INGREDIENT_IMAGES_BUCKET)
    .createSignedUrl(data.path, 3600) // 1 hour expiry

  if (urlError) {
    throw new Error(`Failed to generate signed URL: ${urlError.message}`)
  }

  if (!urlData?.signedUrl) {
    throw new Error('Failed to generate signed URL: No URL returned')
  }

  return {
    path: data.path,
    url: urlData.signedUrl,
    fullPath: `${INGREDIENT_IMAGES_BUCKET}/${data.path}`,
  }
}

/**
 * Delete an ingredient image from Supabase Storage
 */
export async function deleteIngredientImage(path: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from(INGREDIENT_IMAGES_BUCKET)
    .remove([path])

  if (error) {
    console.error('Delete error:', error)
    throw new Error(`Delete failed: ${error.message}`)
  }
}

/**
 * Get signed URL for an ingredient image (valid for 1 hour)
 */
export async function getIngredientImageUrl(path: string): Promise<string> {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(INGREDIENT_IMAGES_BUCKET)
    .createSignedUrl(path, 3600) // 1 hour expiry

  if (error || !data?.signedUrl) {
    throw new Error(`Failed to generate signed URL: ${error?.message || 'No URL returned'}`)
  }

  return data.signedUrl
}

/**
 * List all ingredient images for a user
 */
export async function listUserIngredientImages(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase.storage
    .from(INGREDIENT_IMAGES_BUCKET)
    .list(userId, {
      limit: 100,
      offset: 0,
      sortBy: { column: 'created_at', order: 'desc' },
    })

  if (error) {
    console.error('List error:', error)
    throw new Error(`Failed to list images: ${error.message}`)
  }

  return data
}

/**
 * Upload a feedback attachment to Supabase Storage
 */
const FEEDBACK_ATTACHMENTS_BUCKET = 'feedback-attachments'

export async function uploadFeedbackAttachment(
  file: File,
  userId?: string
): Promise<UploadResult> {
  const supabase = createClient()

  // Generate unique filename
  const fileExt = file.name.split('.').pop()
  const timestamp = Date.now()
  const userPrefix = userId || 'anonymous'
  const fileName = `${userPrefix}/${timestamp}.${fileExt}`

  // Validate file type
  const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/gif', 'image/webp']
  if (!validTypes.includes(file.type)) {
    throw new Error(`Invalid file type. Supported: JPEG, PNG, GIF, WebP`)
  }

  // Validate file size (max 5MB)
  const maxSize = 5 * 1024 * 1024 // 5MB
  if (file.size > maxSize) {
    throw new Error('File size must be less than 5MB')
  }

  // Upload file
  const { data, error } = await supabase.storage
    .from(FEEDBACK_ATTACHMENTS_BUCKET)
    .upload(fileName, file, {
      cacheControl: '3600',
      upsert: false,
    })

  if (error) {
    console.error('Upload error:', error)
    throw new Error(`Upload failed: ${error.message}`)
  }

  if (!data) {
    throw new Error('Upload failed: No data returned')
  }

  // Get public URL for feedback attachments
  const { data: urlData } = supabase.storage
    .from(FEEDBACK_ATTACHMENTS_BUCKET)
    .getPublicUrl(data.path)

  return {
    path: data.path,
    url: urlData.publicUrl,
    fullPath: `${FEEDBACK_ATTACHMENTS_BUCKET}/${data.path}`,
  }
}

/**
 * Delete a feedback attachment from Supabase Storage
 */
export async function deleteFeedbackAttachment(path: string): Promise<void> {
  const supabase = createClient()

  const { error } = await supabase.storage
    .from(FEEDBACK_ATTACHMENTS_BUCKET)
    .remove([path])

  if (error) {
    console.error('Delete error:', error)
    throw new Error(`Delete failed: ${error.message}`)
  }
}
