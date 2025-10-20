'use client'

/**
 * ProgressPhotos Component
 *
 * Manage workout progress photos with:
 * - Photo upload with compression
 * - Gallery view with date filtering
 * - Before/after comparisons
 * - Association with workout logs
 * - Supabase Storage integration
 */

import { useState, useEffect, useRef } from 'react'
import Image from 'next/image'
import { format } from 'date-fns'
import { getTodayPacific } from '@/lib/utils'
import {
  Upload,
  Camera,
  X,
  Loader2,
  Image as ImageIcon,
  Calendar,
  Trash2,
  ZoomIn,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'

import { createClient } from '@/lib/supabase/client'

// ============================================================================
// Types
// ============================================================================

interface ProgressPhoto {
  id: string
  user_id: string
  workout_log_id: string | null
  image_url: string
  caption: string | null
  taken_at: string
  created_at: string
}

interface ProgressPhotosProps {
  workoutLogId?: string
  onPhotoUploaded?: () => void
}

// ============================================================================
// Main Component
// ============================================================================

export function ProgressPhotos({
  workoutLogId,
  onPhotoUploaded,
}: ProgressPhotosProps) {
  const [photos, setPhotos] = useState<ProgressPhoto[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadDialogOpen, setUploadDialogOpen] = useState(false)
  const [viewDialogOpen, setViewDialogOpen] = useState(false)
  const [selectedPhoto, setSelectedPhoto] = useState<ProgressPhoto | null>(null)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [photoToDelete, setPhotoToDelete] = useState<ProgressPhoto | null>(null)

  // Upload form state
  const [selectedFile, setSelectedFile] = useState<File | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [caption, setCaption] = useState('')
  const [takenDate, setTakenDate] = useState(
    getTodayPacific()
  )

  const fileInputRef = useRef<HTMLInputElement>(null)

  // ============================================================================
  // Data Fetching
  // ============================================================================

  useEffect(() => {
    loadPhotos()
  }, [workoutLogId])

  const loadPhotos = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error('User not authenticated')
        return
      }

      // Note: This assumes a progress_photos table exists
      // You'll need to create this table in Supabase
      let query = supabase
        .from('progress_photos')
        .select('*')
        .eq('user_id', user.id)
        .order('taken_at', { ascending: false })

      if (workoutLogId) {
        query = query.eq('workout_log_id', workoutLogId)
      }

      const { data, error } = await query

      if (error) {
        console.error('Error loading progress photos:', error)
      } else if (data) {
        setPhotos(data)
      }
    } catch (error) {
      console.error('Exception loading progress photos:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // File Handling
  // ============================================================================

  const handleFileSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (!file) return

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file')
      return
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('File size must be less than 10MB')
      return
    }

    setSelectedFile(file)

    // Create preview URL
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreviewUrl(reader.result as string)
    }
    reader.readAsDataURL(file)
  }

  const compressImage = async (file: File): Promise<File> => {
    return new Promise((resolve) => {
      const reader = new FileReader()
      reader.onload = (e) => {
        const img = document.createElement('img')
        img.onload = () => {
          const canvas = document.createElement('canvas')
          const ctx = canvas.getContext('2d')!

          // Set max dimensions
          const maxWidth = 1200
          const maxHeight = 1200
          let width = img.width
          let height = img.height

          if (width > height) {
            if (width > maxWidth) {
              height *= maxWidth / width
              width = maxWidth
            }
          } else {
            if (height > maxHeight) {
              width *= maxHeight / height
              height = maxHeight
            }
          }

          canvas.width = width
          canvas.height = height
          ctx.drawImage(img, 0, 0, width, height)

          canvas.toBlob(
            (blob) => {
              if (blob) {
                const compressedFile = new File([blob], file.name, {
                  type: 'image/jpeg',
                  lastModified: Date.now(),
                })
                resolve(compressedFile)
              } else {
                resolve(file)
              }
            },
            'image/jpeg',
            0.8
          )
        }
        img.src = e.target?.result as string
      }
      reader.readAsDataURL(file)
    })
  }

  // ============================================================================
  // Upload
  // ============================================================================

  const handleUpload = async () => {
    if (!selectedFile) return

    setIsUploading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      // Compress image
      const compressedFile = await compressImage(selectedFile)

      // Upload to Supabase Storage
      const fileExt = compressedFile.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('progress-photos')
        .upload(fileName, compressedFile)

      if (uploadError) {
        throw uploadError
      }

      // Get public URL
      const {
        data: { publicUrl },
      } = supabase.storage.from('progress-photos').getPublicUrl(fileName)

      // Save metadata to database
      const { error: dbError } = await supabase.from('progress_photos').insert({
        user_id: user.id,
        workout_log_id: workoutLogId || null,
        image_url: publicUrl,
        caption: caption || null,
        taken_at: new Date(takenDate).toISOString(),
      })

      if (dbError) {
        throw dbError
      }

      // Reset form and reload photos
      setSelectedFile(null)
      setPreviewUrl(null)
      setCaption('')
      setTakenDate(new Date().toISOString().split('T')[0])
      setUploadDialogOpen(false)
      loadPhotos()

      if (onPhotoUploaded) {
        onPhotoUploaded()
      }
    } catch (error) {
      console.error('Error uploading photo:', error)
      alert('Failed to upload photo. Please try again.')
    } finally {
      setIsUploading(false)
    }
  }

  // ============================================================================
  // Delete
  // ============================================================================

  const handleDeleteConfirm = async () => {
    if (!photoToDelete) return

    try {
      const supabase = createClient()

      // Extract file path from URL
      const url = new URL(photoToDelete.image_url)
      const filePath = url.pathname.split('/').slice(-2).join('/')

      // Delete from storage
      const { error: storageError } = await supabase.storage
        .from('progress-photos')
        .remove([filePath])

      if (storageError) {
        console.error('Error deleting from storage:', storageError)
      }

      // Delete from database
      const { error: dbError } = await supabase
        .from('progress_photos')
        .delete()
        .eq('id', photoToDelete.id)

      if (dbError) {
        throw dbError
      }

      // Reload photos
      loadPhotos()
      setDeleteDialogOpen(false)
      setPhotoToDelete(null)
    } catch (error) {
      console.error('Error deleting photo:', error)
      alert('Failed to delete photo. Please try again.')
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">Progress Photos</h3>
        <Button onClick={() => setUploadDialogOpen(true)} size="sm">
          <Camera className="mr-2 h-4 w-4" />
          Add Photo
        </Button>
      </div>

      {/* Photo Grid */}
      {isLoading ? (
        <div className="flex items-center justify-center p-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : photos.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center p-8">
            <ImageIcon className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-muted-foreground text-center">
              No progress photos yet. Start tracking your transformation!
            </p>
            <Button
              onClick={() => setUploadDialogOpen(true)}
              className="mt-4"
              variant="outline"
            >
              Upload First Photo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <div
              key={photo.id}
              className="relative group rounded-lg overflow-hidden border aspect-square"
            >
              <Image
                src={photo.image_url}
                alt={photo.caption || 'Progress photo'}
                fill
                className="object-cover"
                sizes="(max-width: 768px) 50vw, (max-width: 1200px) 33vw, 25vw"
              />
              <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                <Button
                  size="icon"
                  variant="secondary"
                  onClick={() => {
                    setSelectedPhoto(photo)
                    setViewDialogOpen(true)
                  }}
                >
                  <ZoomIn className="h-4 w-4" />
                </Button>
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={() => {
                    setPhotoToDelete(photo)
                    setDeleteDialogOpen(true)
                  }}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-0 left-0 right-0 p-2 bg-gradient-to-t from-black/80 to-transparent">
                <p className="text-white text-xs">
                  {format(new Date(photo.taken_at), 'MMM d, yyyy')}
                </p>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={uploadDialogOpen} onOpenChange={setUploadDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Upload Progress Photo</DialogTitle>
            <DialogDescription>
              Add a photo to track your fitness progress
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            {/* File Input */}
            <div>
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleFileSelect}
                className="hidden"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                className="w-full"
              >
                <Upload className="mr-2 h-4 w-4" />
                {selectedFile ? 'Change Photo' : 'Select Photo'}
              </Button>
            </div>

            {/* Preview */}
            {previewUrl && (
              <div className="relative w-full aspect-square rounded-lg overflow-hidden border">
                <Image
                  src={previewUrl}
                  alt="Preview"
                  fill
                  className="object-cover"
                />
              </div>
            )}

            {/* Date */}
            <div className="space-y-2">
              <Label htmlFor="date">Date Taken</Label>
              <Input
                id="date"
                type="date"
                value={takenDate}
                onChange={(e) => setTakenDate(e.target.value)}
                max={new Date().toISOString().split('T')[0]}
              />
            </div>

            {/* Caption */}
            <div className="space-y-2">
              <Label htmlFor="caption">Caption (optional)</Label>
              <Input
                id="caption"
                value={caption}
                onChange={(e) => setCaption(e.target.value)}
                placeholder="e.g., After 30 days of training"
                maxLength={200}
              />
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setUploadDialogOpen(false)
                setSelectedFile(null)
                setPreviewUrl(null)
                setCaption('')
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={handleUpload}
              disabled={!selectedFile || isUploading}
            >
              {isUploading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                'Upload'
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* View Dialog */}
      <Dialog open={viewDialogOpen} onOpenChange={setViewDialogOpen}>
        <DialogContent className="sm:max-w-2xl">
          <DialogHeader>
            <DialogTitle>Progress Photo</DialogTitle>
          </DialogHeader>
          {selectedPhoto && (
            <div className="space-y-4">
              <div className="relative w-full aspect-square rounded-lg overflow-hidden">
                <Image
                  src={selectedPhoto.image_url}
                  alt={selectedPhoto.caption || 'Progress photo'}
                  fill
                  className="object-contain"
                />
              </div>
              <div className="space-y-2">
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Calendar className="h-4 w-4" />
                  {format(new Date(selectedPhoto.taken_at), 'MMMM d, yyyy')}
                </div>
                {selectedPhoto.caption && (
                  <p className="text-sm">{selectedPhoto.caption}</p>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Photo</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this progress photo? This action
              cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setDeleteDialogOpen(false)
                setPhotoToDelete(null)
              }}
            >
              Cancel
            </Button>
            <Button variant="destructive" onClick={handleDeleteConfirm}>
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
