'use client'

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Upload, AlertCircle } from 'lucide-react'
import { useForm, Controller } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { feedbackSchema, type FeedbackFormData } from './feedback-schema'
import { useState } from 'react'
import heic2any from 'heic2any'

interface FeedbackModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

export function FeedbackModal({ open, onOpenChange }: FeedbackModalProps) {
  const [selectedFile, setSelectedFile] = useState<File | null>(null)

  const {
    register,
    handleSubmit,
    control,
    setValue,
    formState: { errors, isSubmitting },
    reset,
  } = useForm<FeedbackFormData>({
    resolver: zodResolver(feedbackSchema),
    defaultValues: {
      feedbackType: undefined,
      description: '',
      email: '',
      file: null,
    },
  })

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0] || null
    setSelectedFile(file)
    setValue('file', file, { shouldValidate: true })
  }

  const onSubmit = async (data: FeedbackFormData) => {
    try {
      // Prepare form data
      const formData = new FormData()
      formData.append('feedbackType', data.feedbackType)
      formData.append('description', data.description)
      if (data.email) {
        formData.append('email', data.email)
      }

      // Handle file - convert HEIC to JPEG if needed
      if (data.file) {
        let fileToUpload = data.file

        // Check if file is HEIC/HEIF and convert to JPEG
        if (data.file.type === 'image/heic' || data.file.type === 'image/heif') {
          try {
            console.log('🔄 Converting HEIC to JPEG...')
            const convertedBlob = await heic2any({
              blob: data.file,
              toType: 'image/jpeg',
              quality: 0.9,
            })

            // heic2any can return Blob or Blob[], handle both cases
            const blob = Array.isArray(convertedBlob) ? convertedBlob[0] : convertedBlob

            // Create a new File from the converted blob
            const fileName = data.file.name.replace(/\.(heic|heif)$/i, '.jpg')
            fileToUpload = new File([blob], fileName, { type: 'image/jpeg' })
            console.log('✅ HEIC converted to JPEG successfully')
          } catch (conversionError) {
            console.error('❌ HEIC conversion failed:', conversionError)
            throw new Error('Failed to convert HEIC image. Please try a different format.')
          }
        }

        formData.append('file', fileToUpload)
      }

      // Submit feedback
      const response = await fetch('/api/feedback', {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Failed to submit feedback')
      }

      const result = await response.json()
      console.log('✅ Feedback submitted successfully:', result)

      // Reset form and close modal
      reset()
      setSelectedFile(null)
      onOpenChange(false)

      // Show success message (could add toast notification here)
      alert('Thank you for your feedback! We\'ll review it shortly.')
    } catch (error) {
      console.error('❌ Error submitting feedback:', error)
      alert(error instanceof Error ? error.message : 'Failed to submit feedback. Please try again.')
    }
  }

  const handleClose = (isOpen: boolean) => {
    if (!isOpen) {
      reset()
      setSelectedFile(null)
    }
    onOpenChange(isOpen)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-[600px]">
        <DialogHeader>
          <DialogTitle>Help & Feedback</DialogTitle>
          <DialogDescription>
            Submit bug reports, feature requests, or general feedback. We'd love to hear from you!
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 mt-4">
          {/* Feedback Type */}
          <div className="space-y-2">
            <Label htmlFor="feedback-type">Feedback Type *</Label>
            <Controller
              name="feedbackType"
              control={control}
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger id="feedback-type" className={errors.feedbackType ? 'border-destructive' : ''}>
                    <SelectValue placeholder="Select a feedback type" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bug">Bug Report</SelectItem>
                    <SelectItem value="feature">Feature Request</SelectItem>
                    <SelectItem value="complaint">Complaint</SelectItem>
                    <SelectItem value="general">General Feedback</SelectItem>
                  </SelectContent>
                </Select>
              )}
            />
            {errors.feedbackType && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.feedbackType.message}
              </p>
            )}
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Description *</Label>
            <Textarea
              id="description"
              placeholder="Describe your feedback in detail..."
              {...register('description')}
              rows={6}
              className={`resize-none ${errors.description ? 'border-destructive' : ''}`}
            />
            {errors.description && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.description.message}
              </p>
            )}
          </div>

          {/* Email (Optional) */}
          <div className="space-y-2">
            <Label htmlFor="email">Email (Optional)</Label>
            <Input
              id="email"
              type="email"
              placeholder="your.email@example.com"
              {...register('email')}
              className={errors.email ? 'border-destructive' : ''}
            />
            {errors.email ? (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.email.message}
              </p>
            ) : (
              <p className="text-xs text-muted-foreground">
                Provide your email if you'd like us to follow up with you.
              </p>
            )}
          </div>

          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="file-upload">Attachment (Optional)</Label>
            <div className="flex items-center gap-2">
              <Input
                id="file-upload"
                type="file"
                accept="image/jpeg,image/jpg,image/png,image/gif,image/webp,image/heic,image/heif,.heic,.heif"
                onChange={handleFileChange}
                className="hidden"
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('file-upload')?.click()}
                className="w-full"
              >
                <Upload className="h-4 w-4 mr-2" />
                {selectedFile ? selectedFile.name : 'Upload Screenshot'}
              </Button>
            </div>
            {selectedFile && !errors.file && (
              <p className="text-xs text-muted-foreground">
                File selected: {selectedFile.name} ({(selectedFile.size / 1024).toFixed(2)} KB)
              </p>
            )}
            {errors.file && (
              <p className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3 w-3" />
                {errors.file.message}
              </p>
            )}
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleClose(false)}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="bg-gradient-primary"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Feedback'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
