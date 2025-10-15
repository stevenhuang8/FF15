/**
 * Ingredient Comparison Utilities
 *
 * Functions for comparing recipe ingredients against user's inventory
 * to detect missing ingredients and suggest alternatives.
 */

import type { Ingredient } from '@/types/ingredient'

/**
 * Normalize ingredient name for comparison
 * Handles plurals, common variations, and formatting differences
 */
export function normalizeIngredientName(name: string): string {
  let normalized = name.toLowerCase().trim()

  // Remove common measurement words that might be part of the name
  const measurementWords = ['fresh', 'dried', 'chopped', 'diced', 'sliced', 'minced', 'whole', 'ground', 'crushed']
  measurementWords.forEach(word => {
    normalized = normalized.replace(new RegExp(`\\b${word}\\b`, 'gi'), '').trim()
  })

  // Handle plurals - simple approach for common cases
  if (normalized.endsWith('es')) {
    normalized = normalized.slice(0, -2) // tomatoes -> tomat
  } else if (normalized.endsWith('s') && normalized.length > 3) {
    normalized = normalized.slice(0, -1) // carrots -> carrot
  }

  // Remove extra whitespace
  normalized = normalized.replace(/\s+/g, ' ').trim()

  return normalized
}

/**
 * Check if a recipe ingredient matches any ingredient in the user's inventory
 */
export function findMatchingIngredient(
  recipeIngredient: string,
  userIngredients: Ingredient[]
): Ingredient | null {
  const normalizedRecipe = normalizeIngredientName(recipeIngredient)

  // Try exact match first
  for (const ingredient of userIngredients) {
    const normalizedUser = normalizeIngredientName(ingredient.name)
    if (normalizedUser === normalizedRecipe) {
      return ingredient
    }
  }

  // Try partial match (recipe ingredient contains user ingredient or vice versa)
  for (const ingredient of userIngredients) {
    const normalizedUser = normalizeIngredientName(ingredient.name)
    if (
      normalizedRecipe.includes(normalizedUser) ||
      normalizedUser.includes(normalizedRecipe)
    ) {
      return ingredient
    }
  }

  return null
}

/**
 * Parse ingredients from recipe text
 * Attempts to extract ingredient names from various recipe formats
 */
export function parseIngredientsFromRecipe(recipeText: string): string[] {
  const ingredients: string[] = []

  // Look for "Ingredients:" section
  const ingredientsMatch = recipeText.match(/ingredients:?\s*\n([\s\S]*?)(?:\n\n|instructions:|directions:|method:|$)/i)

  if (ingredientsMatch) {
    const ingredientsSection = ingredientsMatch[1]

    // Split by lines and extract ingredient names
    const lines = ingredientsSection.split('\n')

    for (const line of lines) {
      // Remove bullet points, numbers, and measurements
      let cleaned = line.trim()

      // Remove common list prefixes (-, *, •, numbers with periods/parentheses)
      cleaned = cleaned.replace(/^[-*•]\s*/, '')
      cleaned = cleaned.replace(/^\d+\.?\)?\s*/, '')

      // Remove measurements (approximate matching)
      // This is a simple approach - could be enhanced with more sophisticated parsing
      cleaned = cleaned.replace(/^\d+[\s/\-]*\d*\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lbs?|pounds?|g|grams?|kg|ml|l|liters?)\s+/i, '')

      // Extract the ingredient name (usually the first few words after measurements)
      const words = cleaned.split(' ')
      if (words.length > 0 && words[0].length > 2) {
        // Take first 1-3 words as the ingredient name
        const ingredientName = words.slice(0, Math.min(3, words.length)).join(' ')
        if (ingredientName.trim()) {
          ingredients.push(ingredientName.trim())
        }
      }
    }
  }

  return ingredients
}

/**
 * Compare recipe ingredients against user's inventory
 */
export interface IngredientComparison {
  available: Array<{ name: string; inventory: Ingredient }>
  missing: string[]
  totalRequired: number
}

export function compareIngredients(
  recipeIngredients: string[],
  userIngredients: Ingredient[]
): IngredientComparison {
  const available: Array<{ name: string; inventory: Ingredient }> = []
  const missing: string[] = []

  for (const recipeIngredient of recipeIngredients) {
    const match = findMatchingIngredient(recipeIngredient, userIngredients)

    if (match) {
      available.push({
        name: recipeIngredient,
        inventory: match
      })
    } else {
      missing.push(recipeIngredient)
    }
  }

  return {
    available,
    missing,
    totalRequired: recipeIngredients.length
  }
}

/**
 * Calculate ingredient coverage percentage
 */
export function calculateCoverage(comparison: IngredientComparison): number {
  if (comparison.totalRequired === 0) return 100
  return Math.round((comparison.available.length / comparison.totalRequired) * 100)
}
