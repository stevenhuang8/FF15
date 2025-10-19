/**
 * Recipe Allergen Filter
 *
 * Utilities for filtering recipes based on allergies and dietary restrictions
 */

import type { Tables } from '@/types/supabase'

type SavedRecipe = Tables<'saved_recipes'>

/**
 * Check if a recipe contains allergens
 */
export function recipeContainsAllergens(
  recipe: SavedRecipe,
  allergens: string[]
): { safe: boolean; foundAllergens: string[] } {
  if (allergens.length === 0) {
    return { safe: true, foundAllergens: [] }
  }

  const foundAllergens: string[] = []

  // Check title
  const titleLower = recipe.title.toLowerCase()
  for (const allergen of allergens) {
    if (titleLower.includes(allergen.toLowerCase())) {
      foundAllergens.push(allergen)
    }
  }

  // Check ingredients
  const ingredients = recipe.ingredients as any[]
  for (const ingredient of ingredients) {
    const ingredientName = ingredient.name?.toLowerCase() || ingredient.ingredient?.toLowerCase() || ''

    for (const allergen of allergens) {
      if (ingredientName.includes(allergen.toLowerCase())) {
        if (!foundAllergens.includes(allergen)) {
          foundAllergens.push(allergen)
        }
      }
    }
  }

  // Check tags
  if (recipe.tags) {
    const tagsLower = recipe.tags.map((t) => t.toLowerCase())
    for (const allergen of allergens) {
      if (tagsLower.some((tag) => tag.includes(allergen.toLowerCase()))) {
        if (!foundAllergens.includes(allergen)) {
          foundAllergens.push(allergen)
        }
      }
    }
  }

  return {
    safe: foundAllergens.length === 0,
    foundAllergens,
  }
}

/**
 * Check if a recipe meets dietary restrictions
 */
export function recipeMeetsDietaryRestrictions(
  recipe: SavedRecipe,
  dietaryRestrictions: string[]
): { compatible: boolean; violations: string[] } {
  if (dietaryRestrictions.length === 0) {
    return { compatible: true, violations: [] }
  }

  const violations: string[] = []
  const recipeTags = (recipe.tags || []).map((t) => t.toLowerCase())
  const ingredients = recipe.ingredients as any[]

  for (const restriction of dietaryRestrictions) {
    const restrictionLower = restriction.toLowerCase()

    // Check tags for positive indicators (e.g., recipe tagged as "vegan")
    if (recipeTags.includes(restrictionLower)) {
      continue // Recipe explicitly supports this restriction
    }

    // Check for violations based on restriction type
    switch (restrictionLower) {
      case 'vegan':
        if (
          hasAnimalProducts(ingredients) ||
          recipeTags.some((tag) => tag.includes('meat') || tag.includes('dairy') || tag.includes('egg'))
        ) {
          violations.push(restriction)
        }
        break

      case 'vegetarian':
        if (
          hasMeatProducts(ingredients) ||
          recipeTags.some((tag) => tag.includes('meat') || tag.includes('fish') || tag.includes('chicken'))
        ) {
          violations.push(restriction)
        }
        break

      case 'pescatarian':
        if (
          hasMeatProducts(ingredients, ['fish', 'seafood']) ||
          recipeTags.some((tag) => tag.includes('meat') || tag.includes('chicken') || tag.includes('beef'))
        ) {
          violations.push(restriction)
        }
        break

      case 'gluten-free':
        if (hasGlutenProducts(ingredients) || recipeTags.some((tag) => tag.includes('wheat') || tag.includes('bread'))) {
          violations.push(restriction)
        }
        break

      case 'dairy-free':
        if (hasDairyProducts(ingredients) || recipeTags.some((tag) => tag.includes('dairy') || tag.includes('cheese'))) {
          violations.push(restriction)
        }
        break

      case 'keto':
      case 'low-carb':
        // Check if carbs are high (this is approximate)
        if (recipe.carbs && recipe.carbs > 20) {
          violations.push(restriction)
        }
        break

      case 'low-fat':
        // Check if fat is high (this is approximate)
        if (recipe.fats && recipe.fats > 15) {
          violations.push(restriction)
        }
        break
    }
  }

  return {
    compatible: violations.length === 0,
    violations,
  }
}

/**
 * Filter recipes array based on allergies
 */
export function filterRecipesByAllergens(
  recipes: SavedRecipe[],
  allergens: string[]
): SavedRecipe[] {
  return recipes.filter((recipe) => {
    const { safe } = recipeContainsAllergens(recipe, allergens)
    return safe
  })
}

/**
 * Filter recipes array based on dietary restrictions
 */
export function filterRecipesByDiet(
  recipes: SavedRecipe[],
  dietaryRestrictions: string[]
): SavedRecipe[] {
  return recipes.filter((recipe) => {
    const { compatible } = recipeMeetsDietaryRestrictions(recipe, dietaryRestrictions)
    return compatible
  })
}

/**
 * Combined filter for both allergens and dietary restrictions
 */
export function filterRecipes(
  recipes: SavedRecipe[],
  allergens: string[],
  dietaryRestrictions: string[]
): {
  filteredRecipes: SavedRecipe[]
  removedCount: number
} {
  const filtered = recipes.filter((recipe) => {
    const { safe } = recipeContainsAllergens(recipe, allergens)
    if (!safe) return false

    const { compatible } = recipeMeetsDietaryRestrictions(recipe, dietaryRestrictions)
    return compatible
  })

  return {
    filteredRecipes: filtered,
    removedCount: recipes.length - filtered.length,
  }
}

// ============================================================================
// Helper Functions
// ============================================================================

const ANIMAL_PRODUCTS = [
  'meat',
  'beef',
  'pork',
  'chicken',
  'turkey',
  'lamb',
  'fish',
  'seafood',
  'shrimp',
  'crab',
  'lobster',
  'milk',
  'cheese',
  'butter',
  'cream',
  'yogurt',
  'egg',
  'honey',
  'gelatin',
]

const MEAT_PRODUCTS = [
  'meat',
  'beef',
  'pork',
  'chicken',
  'turkey',
  'lamb',
  'bacon',
  'sausage',
  'ham',
]

const GLUTEN_PRODUCTS = ['wheat', 'barley', 'rye', 'flour', 'bread', 'pasta', 'noodles', 'couscous']

const DAIRY_PRODUCTS = ['milk', 'cheese', 'butter', 'cream', 'yogurt', 'whey', 'casein']

function hasAnimalProducts(ingredients: any[]): boolean {
  return ingredients.some((ing) => {
    const name = ing.name?.toLowerCase() || ing.ingredient?.toLowerCase() || ''
    return ANIMAL_PRODUCTS.some((product) => name.includes(product))
  })
}

function hasMeatProducts(ingredients: any[], exceptions: string[] = []): boolean {
  return ingredients.some((ing) => {
    const name = ing.name?.toLowerCase() || ing.ingredient?.toLowerCase() || ''
    return MEAT_PRODUCTS.some((product) => {
      if (exceptions.some((ex) => product.includes(ex))) return false
      return name.includes(product)
    })
  })
}

function hasGlutenProducts(ingredients: any[]): boolean {
  return ingredients.some((ing) => {
    const name = ing.name?.toLowerCase() || ing.ingredient?.toLowerCase() || ''
    return GLUTEN_PRODUCTS.some((product) => name.includes(product))
  })
}

function hasDairyProducts(ingredients: any[]): boolean {
  return ingredients.some((ing) => {
    const name = ing.name?.toLowerCase() || ing.ingredient?.toLowerCase() || ''
    return DAIRY_PRODUCTS.some((product) => name.includes(product))
  })
}
