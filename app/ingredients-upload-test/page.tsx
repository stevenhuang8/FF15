'use client'

import { useState } from 'react'
import Image from 'next/image'
import { IngredientUpload } from '@/components/ingredient/ingredient-upload'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle, Upload as UploadIcon } from 'lucide-react'
import type { UploadResult } from '@/lib/supabase/storage'

interface UploadHistoryItem {
  id: string
  result: UploadResult
  timestamp: Date
}

export default function IngredientsUploadTestPage() {
  const [uploadHistory, setUploadHistory] = useState<UploadHistoryItem[]>([])
  const [lastError, setLastError] = useState<Error | null>(null)

  const handleUploadComplete = (result: UploadResult) => {
    console.log('✅ Upload completed:', result)
    setLastError(null)

    const historyItem: UploadHistoryItem = {
      id: Date.now().toString(),
      result,
      timestamp: new Date(),
    }

    setUploadHistory(prev => [historyItem, ...prev])
  }

  const handleUploadError = (error: Error) => {
    console.error('❌ Upload error:', error)
    setLastError(error)
  }

  return (
    <div className="container mx-auto max-w-6xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Ingredient Upload Component Test</h1>
        <p className="text-muted-foreground">
          Test the image upload functionality with drag-and-drop and file selection
        </p>
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100 flex items-center gap-2">
            <AlertCircle className="h-5 w-5" />
            Setup Required
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-900 dark:text-amber-100 space-y-2 text-sm">
          <p className="font-medium">Before uploading works, you need to:</p>
          <ol className="list-decimal list-inside space-y-1 ml-2">
            <li>Create a Supabase Storage bucket named <code className="bg-amber-200 dark:bg-amber-900 px-1 rounded">ingredient-images</code></li>
            <li>Set the bucket to public or configure appropriate RLS policies</li>
            <li>Ensure your environment variables are set correctly</li>
          </ol>
          <p className="mt-3">
            You can still test the UI, drag-and-drop, validation, and preview features even without the bucket configured.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Test Scenarios</CardTitle>
          <CardDescription>Try these scenarios to verify functionality:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <strong>✓ Drag & Drop:</strong> Drag an image file onto the upload area
            </div>
            <div>
              <strong>✓ Click to Browse:</strong> Click the upload area to select a file
            </div>
            <div>
              <strong>✓ Preview:</strong> See image preview before uploading
            </div>
            <div>
              <strong>✓ Invalid Type:</strong> Try uploading a PDF or text file
            </div>
            <div>
              <strong>✓ Large File:</strong> Try a file larger than 5MB
            </div>
            <div>
              <strong>✓ Cancel:</strong> Preview then click Cancel
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Upload Component</CardTitle>
            <CardDescription>Test the ingredient image upload</CardDescription>
          </CardHeader>
          <CardContent>
            <IngredientUpload
              onUploadComplete={handleUploadComplete}
              onUploadError={handleUploadError}
              maxSizeMB={5}
            />

            {lastError && (
              <div className="mt-4 flex items-start gap-2 p-3 bg-destructive/10 text-destructive rounded-lg text-sm">
                <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium">Upload Error</p>
                  <p className="text-xs mt-1">{lastError.message}</p>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Upload History
              {uploadHistory.length > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {uploadHistory.length} upload{uploadHistory.length !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {uploadHistory.length > 0
                ? 'Successfully uploaded images in this session'
                : 'No uploads yet - try uploading an image'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {uploadHistory.length > 0 ? (
              <div className="space-y-4">
                {uploadHistory.map((item, index) => (
                  <div key={item.id}>
                    <div className="space-y-3">
                      <div className="flex items-center gap-2 text-sm">
                        <CheckCircle className="h-4 w-4 text-green-600" />
                        <span className="font-medium">
                          Upload #{uploadHistory.length - index}
                        </span>
                        <span className="text-muted-foreground">
                          {item.timestamp.toLocaleTimeString()}
                        </span>
                      </div>

                      <div className="relative w-full h-48 bg-muted rounded-lg overflow-hidden">
                        <Image
                          src={item.result.url}
                          alt={`Upload ${index + 1}`}
                          fill
                          className="object-contain"
                        />
                      </div>

                      <div className="space-y-1 text-xs text-muted-foreground">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Path:</span>
                          <code className="bg-muted px-1 rounded">{item.result.path}</code>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">URL:</span>
                          <a
                            href={item.result.url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-primary hover:underline truncate max-w-xs"
                          >
                            {item.result.url}
                          </a>
                        </div>
                      </div>
                    </div>
                    {index < uploadHistory.length - 1 && <Separator className="mt-4" />}
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <UploadIcon className="h-12 w-12 mx-auto mb-3 opacity-50" />
                <p>No uploads yet</p>
                <p className="text-sm mt-2">Upload an image to see it here</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-blue-200 bg-blue-50 dark:bg-blue-950/20">
        <CardHeader>
          <CardTitle className="text-blue-900 dark:text-blue-100">
            💡 Testing Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-blue-900 dark:text-blue-100 space-y-2 text-sm">
          <p>• Open browser console (F12) to see detailed upload logs and any errors</p>
          <p>• Try dragging a file from your desktop onto the upload area</p>
          <p>• Test with different image formats: JPEG, PNG, WebP</p>
          <p>• Try uploading an invalid file type to test validation</p>
          <p>• Watch the progress bar animate during upload</p>
          <p>• After successful upload, check the upload history on the right</p>
          <p>• Multiple uploads will accumulate in the history</p>
          <p className="mt-3 pt-3 border-t border-blue-300 dark:border-blue-800">
            <strong>Storage Bucket Error?</strong> This is expected if you haven't created the
            Supabase Storage bucket yet. The UI and validation will still work!
          </p>
        </CardContent>
      </Card>
    </div>
  )
}
