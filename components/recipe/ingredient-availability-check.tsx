'use client'

import { useState, useEffect } from 'react'
import { Check, X, AlertCircle, Package, Loader2 } from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Alert, AlertDescription } from '@/components/ui/alert'
import {
  parseIngredientsFromRecipe,
  compareIngredients,
  calculateCoverage,
  type IngredientComparison
} from '@/lib/ingredient-comparison'
import type { Ingredient } from '@/types/ingredient'
import { cn } from '@/lib/utils'

interface IngredientAvailabilityCheckProps {
  /** The recipe text containing ingredients */
  recipeText: string
  /** Optional className for styling */
  className?: string
}

/**
 * Component that checks ingredient availability for a recipe
 * against the user's inventory and displays the results.
 *
 * Features:
 * - Automatically parses ingredients from recipe text
 * - Fetches user's inventory
 * - Compares and displays available vs. missing ingredients
 * - Shows coverage percentage
 * - Visual indicators for each ingredient status
 */
export function IngredientAvailabilityCheck({
  recipeText,
  className
}: IngredientAvailabilityCheckProps) {
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [comparison, setComparison] = useState<IngredientComparison | null>(null)
  const [userIngredients, setUserIngredients] = useState<Ingredient[]>([])

  useEffect(() => {
    const checkIngredients = async () => {
      setIsLoading(true)
      setError(null)

      try {
        // Parse ingredients from recipe
        const recipeIngredients = parseIngredientsFromRecipe(recipeText)

        if (recipeIngredients.length === 0) {
          setError('Could not parse ingredients from recipe')
          setIsLoading(false)
          return
        }

        // Fetch user's ingredients
        const response = await fetch('/api/ingredients')

        if (!response.ok) {
          if (response.status === 401) {
            setError('Please log in to check ingredient availability')
          } else {
            setError('Failed to fetch your ingredients')
          }
          setIsLoading(false)
          return
        }

        const data = await response.json()
        const ingredients: Ingredient[] = data.ingredients || []

        // Convert snake_case to camelCase
        const formattedIngredients: Ingredient[] = ingredients.map(ing => ({
          id: ing.id,
          userId: (ing as any).user_id,
          name: ing.name,
          quantity: ing.quantity,
          unit: ing.unit,
          expiryDate: (ing as any).expiry_date ? new Date((ing as any).expiry_date) : null,
          category: ing.category,
          notes: ing.notes,
          createdAt: new Date((ing as any).created_at),
          updatedAt: new Date((ing as any).updated_at)
        }))

        setUserIngredients(formattedIngredients)

        // Compare ingredients
        const result = compareIngredients(recipeIngredients, formattedIngredients)
        setComparison(result)

      } catch (err) {
        console.error('Error checking ingredients:', err)
        setError('An unexpected error occurred')
      } finally {
        setIsLoading(false)
      }
    }

    if (recipeText) {
      checkIngredients()
    }
  }, [recipeText])

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <div className="flex items-center gap-2 text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Checking ingredient availability...</span>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Alert variant="destructive" className={className}>
        <AlertCircle className="h-4 w-4" />
        <AlertDescription>{error}</AlertDescription>
      </Alert>
    )
  }

  if (!comparison) {
    return null
  }

  const coverage = calculateCoverage(comparison)

  return (
    <Card className={cn('border-2', className)}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg">Ingredient Check</CardTitle>
          <Badge
            variant={coverage === 100 ? 'default' : coverage >= 75 ? 'secondary' : 'outline'}
            className="text-sm"
          >
            {coverage}% available
          </Badge>
        </div>
        <CardDescription>
          {comparison.available.length} of {comparison.totalRequired} ingredients in your pantry
        </CardDescription>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Progress Bar */}
        <div className="space-y-2">
          <Progress value={coverage} className="h-2" />
        </div>

        {/* Available Ingredients */}
        {comparison.available.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <Check className="h-4 w-4 text-green-600 dark:text-green-400" />
              <span>You have ({comparison.available.length})</span>
            </h4>
            <div className="space-y-1">
              {comparison.available.map((item, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm text-muted-foreground bg-green-50 dark:bg-green-950/20 px-3 py-1.5 rounded-md"
                >
                  <Check className="h-3 w-3 text-green-600 dark:text-green-400 flex-shrink-0" />
                  <span>{item.name}</span>
                  <span className="text-xs ml-auto">
                    {item.inventory.quantity} {item.inventory.unit}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missing Ingredients */}
        {comparison.missing.length > 0 && (
          <div className="space-y-2">
            <h4 className="text-sm font-medium flex items-center gap-2">
              <X className="h-4 w-4 text-red-600 dark:text-red-400" />
              <span>You need ({comparison.missing.length})</span>
            </h4>
            <div className="space-y-1">
              {comparison.missing.map((ingredient, idx) => (
                <div
                  key={idx}
                  className="flex items-center gap-2 text-sm text-muted-foreground bg-red-50 dark:bg-red-950/20 px-3 py-1.5 rounded-md"
                >
                  <X className="h-3 w-3 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <span>{ingredient}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* No Ingredients in Inventory */}
        {userIngredients.length === 0 && (
          <Alert>
            <Package className="h-4 w-4" />
            <AlertDescription>
              You don't have any ingredients in your inventory yet. Add some to see what you can make!
            </AlertDescription>
          </Alert>
        )}
      </CardContent>
    </Card>
  )
}
