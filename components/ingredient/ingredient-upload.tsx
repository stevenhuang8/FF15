'use client'

import { useState, useCallback, useRef } from 'react'
import Image from 'next/image'
import { Upload, X, Image as ImageIcon, Loader2, AlertCircle, Sparkles } from 'lucide-react'
import { createClient } from '@/lib/supabase/client'
import { uploadIngredientImage, type UploadResult } from '@/lib/supabase/storage'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { cn } from '@/lib/utils'
import type { IngredientExtractionResponse } from '@/types/ingredient'

interface IngredientUploadProps {
  onUploadComplete?: (result: UploadResult) => void
  onUploadError?: (error: Error) => void
  onExtractComplete?: (extraction: IngredientExtractionResponse) => void
  maxSizeMB?: number
}

export function IngredientUpload({
  onUploadComplete,
  onUploadError,
  onExtractComplete,
  maxSizeMB = 5,
}: IngredientUploadProps) {
  const [isDragging, setIsDragging] = useState(false)
  const [preview, setPreview] = useState<string | null>(null)
  const [file, setFile] = useState<File | null>(null)
  const [isUploading, setIsUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)
  const [uploadResult, setUploadResult] = useState<UploadResult | null>(null)
  const [isExtracting, setIsExtracting] = useState(false)
  const [extractionResult, setExtractionResult] = useState<IngredientExtractionResponse | null>(null)

  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }, [])

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }, [])

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.stopPropagation()
  }, [])

  const validateFile = (file: File): string | null => {
    // Check file type
    const validTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!validTypes.includes(file.type)) {
      return 'Please upload a JPEG, PNG, or WebP image'
    }

    // Check file size
    const maxSize = maxSizeMB * 1024 * 1024
    if (file.size > maxSize) {
      return `File size must be less than ${maxSizeMB}MB`
    }

    return null
  }

  const handleFile = useCallback((selectedFile: File) => {
    // Validate file
    const validationError = validateFile(selectedFile)
    if (validationError) {
      setError(validationError)
      return
    }

    setError(null)
    setFile(selectedFile)
    setUploadResult(null)

    // Create preview
    const reader = new FileReader()
    reader.onloadend = () => {
      setPreview(reader.result as string)
    }
    reader.readAsDataURL(selectedFile)
  }, [maxSizeMB])

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsDragging(false)

      const droppedFile = e.dataTransfer.files[0]
      if (droppedFile) {
        handleFile(droppedFile)
      }
    },
    [handleFile]
  )

  const handleFileSelect = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const selectedFile = e.target.files?.[0]
      if (selectedFile) {
        handleFile(selectedFile)
      }
    },
    [handleFile]
  )

  const handleUpload = async () => {
    if (!file) return

    setIsUploading(true)
    setError(null)
    setUploadProgress(0)

    try {
      // Get current user
      const supabase = createClient()
      const {
        data: { user },
        error: userError,
      } = await supabase.auth.getUser()

      if (userError || !user) {
        throw new Error('You must be logged in to upload images')
      }

      // Simulate progress updates (since Supabase doesn't provide native progress)
      const progressInterval = setInterval(() => {
        setUploadProgress((prev) => Math.min(prev + 10, 90))
      }, 200)

      const result = await uploadIngredientImage(file, user.id)

      clearInterval(progressInterval)
      setUploadProgress(100)
      setUploadResult(result)

      if (onUploadComplete) {
        onUploadComplete(result)
      }

      console.log('✅ Upload successful:', result)

      // Automatically extract ingredients after successful upload
      setIsExtracting(true)
      try {
        console.log('🔍 Extracting ingredients from:', result.url)

        const extractResponse = await fetch('/api/extract-ingredients', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ imageUrl: result.url }),
        })

        if (!extractResponse.ok) {
          throw new Error(`Extraction failed: ${extractResponse.statusText}`)
        }

        const extraction: IngredientExtractionResponse = await extractResponse.json()
        setExtractionResult(extraction)

        if (onExtractComplete) {
          onExtractComplete(extraction)
        }

        console.log('✅ Extraction complete:', extraction)
      } catch (extractErr) {
        console.error('❌ Extraction error:', extractErr)
        // Don't throw - extraction failure shouldn't prevent upload success display
        setError(extractErr instanceof Error ? `Extraction failed: ${extractErr.message}` : 'Failed to extract ingredients')
      } finally {
        setIsExtracting(false)
      }
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Upload failed'
      setError(errorMessage)
      console.error('❌ Upload error:', err)

      if (onUploadError && err instanceof Error) {
        onUploadError(err)
      }
    } finally {
      setIsUploading(false)
    }
  }

  const handleClear = () => {
    setFile(null)
    setPreview(null)
    setError(null)
    setUploadProgress(0)
    setUploadResult(null)
    setExtractionResult(null)
    setIsExtracting(false)
    if (fileInputRef.current) {
      fileInputRef.current.value = ''
    }
  }

  const handleChooseFile = () => {
    fileInputRef.current?.click()
  }

  return (
    <div className="space-y-4">
      {/* Upload Area */}
      {!preview && !uploadResult && (
        <Card
          className={cn(
            'border-2 border-dashed transition-colors cursor-pointer',
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-muted-foreground/25 hover:border-primary/50'
          )}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={handleChooseFile}
        >
          <CardContent className="flex flex-col items-center justify-center py-12 space-y-4">
            <div className="p-4 bg-primary/10 rounded-full">
              <Upload className="h-8 w-8 text-primary" />
            </div>
            <div className="text-center">
              <p className="text-sm font-medium">
                Drag and drop an image here, or click to browse
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                JPEG, PNG, or WebP (max {maxSizeMB}MB)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/jpg,image/png,image/webp"
              onChange={handleFileSelect}
              className="hidden"
            />
          </CardContent>
        </Card>
      )}

      {/* Preview and Upload */}
      {preview && !uploadResult && (
        <Card>
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium">Preview</p>
                <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={preview}
                    alt="Preview"
                    fill
                    className="object-contain"
                  />
                </div>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <ImageIcon className="h-4 w-4" />
                  <span>{file?.name}</span>
                  <span>({((file?.size || 0) / 1024 / 1024).toFixed(2)} MB)</span>
                </div>
              </div>
            </div>

            {isUploading && (
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span>Uploading...</span>
                  <span>{uploadProgress}%</span>
                </div>
                <Progress value={uploadProgress} />
              </div>
            )}

            {error && (
              <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <div className="flex gap-2">
              <Button
                onClick={handleUpload}
                disabled={isUploading}
                className="flex-1"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Uploading...
                  </>
                ) : (
                  <>
                    <Upload className="mr-2 h-4 w-4" />
                    Upload Image
                  </>
                )}
              </Button>
              <Button
                onClick={handleClear}
                variant="outline"
                disabled={isUploading}
              >
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Success State with Extraction Results */}
      {uploadResult && (
        <Card className="border-green-200 bg-green-50 dark:bg-green-950/20">
          <CardContent className="p-4 space-y-4">
            <div className="flex items-start justify-between">
              <div className="flex-1 space-y-2">
                <p className="text-sm font-medium text-green-900 dark:text-green-100">
                  Upload Successful!
                </p>
                <div className="relative w-full h-64 bg-muted rounded-lg overflow-hidden">
                  <Image
                    src={uploadResult.url}
                    alt="Uploaded image"
                    fill
                    className="object-contain"
                  />
                </div>
              </div>
            </div>

            {/* Extraction Status */}
            {isExtracting && (
              <div className="flex items-center gap-2 p-3 bg-blue-50 dark:bg-blue-950/20 rounded-lg text-sm">
                <Loader2 className="h-4 w-4 animate-spin text-blue-600 dark:text-blue-400" />
                <span className="text-blue-900 dark:text-blue-100">
                  Extracting ingredients with AI...
                </span>
              </div>
            )}

            {/* Extraction Results */}
            {extractionResult && !isExtracting && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-purple-600 dark:text-purple-400" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-100">
                    Extracted {extractionResult.ingredients.length} ingredient{extractionResult.ingredients.length !== 1 ? 's' : ''}
                  </span>
                  <span className="text-xs text-green-700 dark:text-green-300">
                    ({Math.round(extractionResult.overallConfidence * 100)}% confidence)
                  </span>
                </div>

                {/* Ingredient List */}
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {extractionResult.ingredients.map((ingredient, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-3 bg-white dark:bg-gray-900 rounded-lg border border-green-200 dark:border-green-800"
                    >
                      <div className="flex-1">
                        <p className="text-sm font-medium text-gray-900 dark:text-gray-100">
                          {ingredient.name}
                        </p>
                        {ingredient.notes && (
                          <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                            {ingredient.notes}
                          </p>
                        )}
                      </div>
                      <div className="text-right ml-4">
                        <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                          {ingredient.quantity} {ingredient.unit}
                        </p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                          {Math.round(ingredient.confidence * 100)}% sure
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Warnings */}
                {extractionResult.warnings && extractionResult.warnings.length > 0 && (
                  <div className="p-3 bg-yellow-50 dark:bg-yellow-950/20 rounded-lg">
                    <p className="text-xs font-medium text-yellow-900 dark:text-yellow-100 mb-1">
                      Notes:
                    </p>
                    <ul className="text-xs text-yellow-800 dark:text-yellow-200 space-y-1">
                      {extractionResult.warnings.map((warning, index) => (
                        <li key={index}>• {warning}</li>
                      ))}
                    </ul>
                  </div>
                )}

                <p className="text-xs text-green-700 dark:text-green-300">
                  Image Type: {extractionResult.imageType.replace('_', ' ')}
                </p>
              </div>
            )}

            <Button onClick={handleClear} variant="outline" className="w-full">
              Upload Another Image
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Error State (when no preview) */}
      {error && !preview && (
        <div className="flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <p>{error}</p>
        </div>
      )}
    </div>
  )
}
