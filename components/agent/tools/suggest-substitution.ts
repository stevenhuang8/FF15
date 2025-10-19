/**
 * AI Tool: Suggest Ingredient Substitution
 *
 * Context-aware ingredient substitution suggestions
 * Considers: recipe type (baking/cooking/raw), dietary restrictions, allergies
 */

import { tool } from 'ai'
import { z } from 'zod'
import { getSubstitutionsForIngredient, getUserDietaryPreferences } from '@/lib/supabase/substitutions'

export const suggestSubstitution = tool({
  description: `Suggest ingredient substitutions based on dietary restrictions, allergies, and recipe context.

  Use this tool when:
  - User has dietary restrictions or allergies
  - User asks for alternatives to specific ingredients
  - Recipe contains allergens for the user
  - User wants to adapt a recipe for dietary needs

  Context types:
  - baking: For baked goods (cakes, cookies, bread) where chemical reactions matter
  - cooking: For cooked dishes (stir-fries, soups, sauces) where flavor/texture matter
  - raw: For raw/no-cook recipes (salads, smoothies, dressings)
  - all: General substitutions that work in any context`,

  inputSchema: z.object({
    ingredient: z.string().describe('The ingredient to find substitutes for (e.g., "eggs", "milk", "butter")'),
    recipeContext: z.enum(['baking', 'cooking', 'raw', 'all']).describe('The type of recipe this ingredient is being used in'),
    userId: z.string().optional().describe('User ID to check dietary restrictions and preferences'),
    quantity: z.string().optional().describe('Original quantity to help with ratio conversion'),
    unit: z.string().optional().describe('Original unit (cups, tbsp, etc.)'),
  }),

  execute: async ({ ingredient, recipeContext, userId, quantity, unit }) => {
    console.log(`🔄 Suggesting substitution for: "${ingredient}" in ${recipeContext} context`)

    try {
      // Get reference substitutions from database
      const { data: dbSubstitutions, error: dbError } = await getSubstitutionsForIngredient(
        ingredient,
        recipeContext
      )

      let userRestrictions: string[] = []
      let userAllergies: string[] = []

      // Get user's dietary preferences if userId provided
      if (userId) {
        const { data: dietaryPrefs } = await getUserDietaryPreferences(userId)
        if (dietaryPrefs) {
          userRestrictions = dietaryPrefs.dietary_restrictions || []
          userAllergies = dietaryPrefs.allergies || []
        }
      }

      // Build response with substitutions
      const substitutions = dbSubstitutions || []

      // Filter out substitutions that contain user's allergens
      const safeSubstitutions = substitutions.filter((sub) => {
        const subIngredient = sub.substitute_ingredient.toLowerCase()
        return !userAllergies.some((allergen) =>
          subIngredient.includes(allergen.toLowerCase())
        )
      })

      const response = {
        originalIngredient: ingredient,
        context: recipeContext,
        userDietaryRestrictions: userRestrictions,
        userAllergies: userAllergies,
        substitutions: safeSubstitutions.map((sub) => ({
          substitute: sub.substitute_ingredient,
          ratio: sub.ratio || '1:1',
          reason: sub.reason || 'Common substitution',
          context: sub.context,
          calculatedQuantity: quantity && unit ? calculateSubstitutionQuantity(quantity, unit, sub.ratio || '1:1') : null,
        })),
        recommendedChoice: safeSubstitutions.length > 0
          ? safeSubstitutions[0].substitute_ingredient
          : null,
        additionalNotes: generateSubstitutionNotes(ingredient, recipeContext, safeSubstitutions.length),
      }

      console.log(`✅ Found ${safeSubstitutions.length} safe substitutions for ${ingredient}`)

      return response
    } catch (error) {
      console.error('💥 Error in suggestSubstitution tool:', error)
      return {
        originalIngredient: ingredient,
        context: recipeContext,
        error: 'Unable to fetch substitutions at this time',
        substitutions: [],
        recommendedChoice: null,
        additionalNotes: 'Please consult a nutritionist for dietary substitutions.',
      }
    }
  },
})

/**
 * Calculate substitution quantity based on ratio
 */
function calculateSubstitutionQuantity(
  originalQuantity: string,
  originalUnit: string,
  ratio: string
): string {
  // Parse ratio (e.g., "1:1", "3:4", "2:1")
  const [num, denom] = ratio.split(':').map(Number)
  if (!num || !denom) return `${originalQuantity} ${originalUnit}`

  const quantity = parseFloat(originalQuantity)
  if (isNaN(quantity)) return `${originalQuantity} ${originalUnit}`

  const newQuantity = (quantity * num) / denom

  // Format nicely
  if (newQuantity % 1 === 0) {
    return `${newQuantity} ${originalUnit}`
  } else if (newQuantity < 1) {
    // Convert to fractions for common values
    const fraction = toFraction(newQuantity)
    return `${fraction} ${originalUnit}`
  } else {
    return `${newQuantity.toFixed(2)} ${originalUnit}`
  }
}

/**
 * Convert decimal to fraction for common cooking measurements
 */
function toFraction(decimal: number): string {
  const commonFractions: Record<string, string> = {
    '0.25': '1/4',
    '0.33': '1/3',
    '0.5': '1/2',
    '0.66': '2/3',
    '0.75': '3/4',
  }

  const rounded = decimal.toFixed(2)
  return commonFractions[rounded] || rounded
}

/**
 * Generate context-specific notes for substitutions
 */
function generateSubstitutionNotes(
  ingredient: string,
  context: string,
  substitutionCount: number
): string {
  if (substitutionCount === 0) {
    return `No direct substitutions found for ${ingredient} in ${context} context. Consider consulting a recipe expert or nutritionist.`
  }

  const contextNotes: Record<string, string> = {
    baking: 'In baking, substitutions may affect texture and rise. Test before making large batches.',
    cooking: 'Substitutions in cooking primarily affect flavor and texture. Adjust seasoning to taste.',
    raw: 'Raw substitutions are generally straightforward. Consider flavor profile and consistency.',
    all: 'These substitutions work in most contexts. Adjust based on your specific recipe.',
  }

  return contextNotes[context] || 'Adjust quantities and cooking times as needed when substituting.'
}
