'use client'

import { useState } from 'react'
import { IngredientInput } from '@/components/ingredient/ingredient-input'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import type { IngredientInput as IngredientInputType } from '@/types/ingredient'

export default function IngredientsTestPage() {
  const [submittedData, setSubmittedData] = useState<IngredientInputType | null>(null)
  const [submissionCount, setSubmissionCount] = useState(0)

  const handleSubmit = async (data: IngredientInputType) => {
    console.log('🎉 Ingredient submitted:', data)
    setSubmittedData(data)
    setSubmissionCount(prev => prev + 1)

    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500))
  }

  return (
    <div className="container mx-auto max-w-4xl py-8 space-y-8">
      <div>
        <h1 className="text-3xl font-bold mb-2">Ingredient Input Component Test</h1>
        <p className="text-muted-foreground">
          Test the IngredientInput component functionality before database integration
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Test Scenarios</CardTitle>
          <CardDescription>Try these scenarios to verify functionality:</CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
            <div>
              <strong>✓ Auto-complete:</strong> Type "tom" to see tomato suggestions
            </div>
            <div>
              <strong>✓ Custom ingredient:</strong> Type something not in the list
            </div>
            <div>
              <strong>✓ Validation:</strong> Try submitting empty or invalid data
            </div>
            <div>
              <strong>✓ Date picker:</strong> Select an expiry date
            </div>
            <div>
              <strong>✓ Units:</strong> Try different measurement units
            </div>
            <div>
              <strong>✓ Categories:</strong> Select various ingredient categories
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        <Card>
          <CardHeader>
            <CardTitle>Ingredient Input Form</CardTitle>
            <CardDescription>Fill out the form and submit to test</CardDescription>
          </CardHeader>
          <CardContent>
            <IngredientInput
              onSubmit={handleSubmit}
              submitButtonText="Test Submit"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>
              Submission Results
              {submissionCount > 0 && (
                <Badge className="ml-2" variant="secondary">
                  {submissionCount} submission{submissionCount !== 1 ? 's' : ''}
                </Badge>
              )}
            </CardTitle>
            <CardDescription>
              {submittedData
                ? 'Latest submitted data (also logged to console)'
                : 'Submit the form to see results here'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            {submittedData ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Name</p>
                  <p className="text-lg font-semibold">{submittedData.name}</p>
                </div>

                <Separator />

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Quantity</p>
                    <p className="text-lg">{submittedData.quantity}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Unit</p>
                    <p className="text-lg">{submittedData.unit}</p>
                  </div>
                </div>

                <Separator />

                {submittedData.category && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Category</p>
                      <Badge variant="outline" className="mt-1">
                        {submittedData.category}
                      </Badge>
                    </div>
                    <Separator />
                  </>
                )}

                {submittedData.expiryDate && (
                  <>
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Expiry Date</p>
                      <p className="text-lg">
                        {new Date(submittedData.expiryDate).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </p>
                    </div>
                    <Separator />
                  </>
                )}

                {submittedData.notes && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">Notes</p>
                    <p className="text-sm mt-1">{submittedData.notes}</p>
                  </div>
                )}

                <div className="pt-4">
                  <details className="text-sm">
                    <summary className="cursor-pointer text-muted-foreground hover:text-foreground">
                      View Raw JSON
                    </summary>
                    <pre className="mt-2 p-3 bg-muted rounded-lg overflow-auto">
                      {JSON.stringify(submittedData, null, 2)}
                    </pre>
                  </details>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-muted-foreground">
                <p>No data submitted yet</p>
                <p className="text-sm mt-2">Fill out and submit the form to see results</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <Card className="border-amber-200 bg-amber-50 dark:bg-amber-950/20">
        <CardHeader>
          <CardTitle className="text-amber-900 dark:text-amber-100">
            💡 Testing Tips
          </CardTitle>
        </CardHeader>
        <CardContent className="text-amber-900 dark:text-amber-100 space-y-2 text-sm">
          <p>• Open browser console (F12) to see detailed submission logs</p>
          <p>• Try submitting with only required fields (name, quantity, unit)</p>
          <p>• Test form validation by leaving fields empty or entering invalid values</p>
          <p>• Test the auto-complete by typing partial ingredient names like "chi", "tom", "oni"</p>
          <p>• Verify the form resets after successful submission</p>
          <p>• Check that past dates are disabled in the date picker</p>
        </CardContent>
      </Card>
    </div>
  )
}
