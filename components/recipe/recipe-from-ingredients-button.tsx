'use client'

import { useState } from 'react'
import { ChefHat, Loader2, Package, AlertCircle } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Alert, AlertDescription } from '@/components/ui/alert'
import type { Ingredient } from '@/types/ingredient'

interface RecipeFromIngredientsButtonProps {
  /** Callback to send the generated message to the chat */
  onGenerateRecipe?: (message: string) => void
  /** Optional className for styling */
  className?: string
  /** Optional variant for the button */
  variant?: 'default' | 'outline' | 'secondary' | 'ghost'
  /** Show as icon button only (no text) */
  iconOnly?: boolean
}

/**
 * Button component that fetches user's available ingredients and triggers
 * AI recipe generation through the chat system.
 *
 * Features:
 * - Fetches ingredients from API
 * - Formats ingredients into natural language prompt
 * - Integrates with existing chat system
 * - Shows loading states during fetch
 * - Handles errors gracefully
 */
export function RecipeFromIngredientsButton({
  onGenerateRecipe,
  className,
  variant = 'default',
  iconOnly = false
}: RecipeFromIngredientsButtonProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const formatIngredientsMessage = (ingredients: Ingredient[]): string => {
    if (ingredients.length === 0) {
      return "I don't have any ingredients in my inventory yet. Can you suggest some recipes I could try and what ingredients I'd need?"
    }

    // Group ingredients by category for better readability
    const categorized: Record<string, Ingredient[]> = {}
    ingredients.forEach(ingredient => {
      const category = ingredient.category || 'other'
      if (!categorized[category]) {
        categorized[category] = []
      }
      categorized[category].push(ingredient)
    })

    let message = "I have the following ingredients in my kitchen:\n\n"

    // Add ingredients by category
    Object.entries(categorized).forEach(([category, items]) => {
      message += `**${category.charAt(0).toUpperCase() + category.slice(1)}:**\n`
      items.forEach(item => {
        message += `- ${item.name} (${item.quantity} ${item.unit})`
        if (item.expiryDate) {
          const daysUntilExpiry = Math.ceil(
            (new Date(item.expiryDate).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
          )
          if (daysUntilExpiry <= 3) {
            message += ` - **expires soon!**`
          }
        }
        message += '\n'
      })
      message += '\n'
    })

    message += `\nCan you suggest some recipes I can make with these ingredients? Please prioritize ingredients that are expiring soon if possible.`

    return message
  }

  const handleGenerateRecipe = async () => {
    setIsLoading(true)
    setError(null)

    try {
      // Fetch user's ingredients from API
      const response = await fetch('/api/ingredients')

      if (!response.ok) {
        if (response.status === 401) {
          throw new Error('Please log in to generate recipes from your ingredients')
        }
        throw new Error('Failed to fetch ingredients')
      }

      const data = await response.json()
      const ingredients: Ingredient[] = data.ingredients || []

      // Convert snake_case from database to camelCase for Ingredient type
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

      // Generate the message
      const message = formatIngredientsMessage(formattedIngredients)

      // Send to chat if callback provided
      if (onGenerateRecipe) {
        onGenerateRecipe(message)
      } else {
        // If no callback, log for debugging
        console.log('Generated recipe prompt:', message)
      }

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'An unexpected error occurred'
      setError(errorMessage)
      console.error('Error generating recipe from ingredients:', err)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="space-y-2">
      <Button
        onClick={handleGenerateRecipe}
        disabled={isLoading}
        variant={variant}
        className={className}
        size={iconOnly ? 'icon' : 'default'}
      >
        {isLoading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChefHat className="h-4 w-4" />
        )}
        {!iconOnly && (
          <span className="ml-2">
            {isLoading ? 'Loading ingredients...' : 'Generate Recipe from Ingredients'}
          </span>
        )}
      </Button>

      {error && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}
    </div>
  )
}
