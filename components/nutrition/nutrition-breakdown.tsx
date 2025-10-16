'use client'

/**
 * NutritionBreakdown Component
 *
 * Displays comprehensive nutritional analysis for recipes:
 * - Total and per-serving nutritional information
 * - Macronutrient breakdown with visual ratios
 * - Calories, protein, carbs, fats, fiber, and other nutrients
 * - Dynamic calculation from ingredients or static display
 */

import { useEffect, useState } from 'react'
import { Loader2, Info } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip'

import { getBatchNutrition } from '@/lib/nutrition/nutrition-service'
import type { RecipeIngredient, RecipeNutrition } from '@/types/recipe'
import type { FoodItem } from '@/lib/nutrition/types'

// ============================================================================
// Types
// ============================================================================

interface NutritionBreakdownProps {
  // Option 1: Provide pre-calculated nutrition data (from saved recipe)
  nutrition?: RecipeNutrition | null
  calories?: number | null

  // Option 2: Calculate from ingredients dynamically
  ingredients?: RecipeIngredient[]

  // Common props
  servings?: number | string | null
  className?: string
  showPerServing?: boolean
  compact?: boolean
}

interface CalculatedNutrition {
  calories: number
  protein: number
  carbs: number
  fats: number
  fiber?: number
  sugar?: number
  sodium?: number
}

// ============================================================================
// Main Component
// ============================================================================

export function NutritionBreakdown({
  nutrition,
  calories,
  ingredients,
  servings = 1,
  className,
  showPerServing = true,
  compact = false,
}: NutritionBreakdownProps) {
  const [calculatedNutrition, setCalculatedNutrition] = useState<CalculatedNutrition | null>(null)
  const [isCalculating, setIsCalculating] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const servingCount = typeof servings === 'string' ? parseInt(servings) || 1 : servings || 1

  // ============================================================================
  // Calculate Nutrition from Ingredients
  // ============================================================================

  useEffect(() => {
    // If we have pre-calculated nutrition, use it
    if (nutrition || calories !== undefined) {
      return
    }

    // If we have ingredients, calculate nutrition
    if (ingredients && ingredients.length > 0) {
      calculateNutritionFromIngredients()
    }
  }, [ingredients, nutrition, calories])

  const calculateNutritionFromIngredients = async () => {
    if (!ingredients || ingredients.length === 0) return

    setIsCalculating(true)
    setError(null)

    try {
      // Convert recipe ingredients to food items format
      const foodItems = ingredients
        .filter((ing) => ing.item && ing.quantity)
        .map((ing) => ({
          name: ing.item,
          quantity: parseFloat(ing.quantity || '1'),
          unit: ing.unit || 'serving',
        }))

      if (foodItems.length === 0) {
        setError('No valid ingredients with quantities found')
        return
      }

      const { data, error: nutritionError } = await getBatchNutrition(foodItems)

      if (nutritionError || !data) {
        throw nutritionError || new Error('Failed to calculate nutrition')
      }

      // Sum up all ingredient nutrition
      const totals = data.reduce(
        (acc, item: FoodItem) => ({
          calories: acc.calories + (item.calories || 0),
          protein: acc.protein + (item.protein || 0),
          carbs: acc.carbs + (item.carbs || 0),
          fats: acc.fats + (item.fats || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
      )

      setCalculatedNutrition(totals)
    } catch (err) {
      console.error('Error calculating nutrition:', err)
      setError('Unable to calculate nutrition data')
    } finally {
      setIsCalculating(false)
    }
  }

  // ============================================================================
  // Get Nutrition Data
  // ============================================================================

  const getNutritionData = (): CalculatedNutrition | null => {
    // Priority 1: Calculated from ingredients
    if (calculatedNutrition) {
      return calculatedNutrition
    }

    // Priority 2: Pre-calculated nutrition object
    if (nutrition) {
      return {
        calories: nutrition.calories || 0,
        protein: parseFloat(nutrition.protein || '0'),
        carbs: parseFloat(nutrition.carbs || '0'),
        fats: parseFloat(nutrition.fat || '0'),
        fiber: parseFloat(nutrition.fiber || '0'),
        sugar: parseFloat(nutrition.sugar || '0'),
        sodium: parseFloat(nutrition.sodium || '0'),
      }
    }

    // Priority 3: Just calories
    if (calories !== undefined && calories !== null) {
      return {
        calories: calories,
        protein: 0,
        carbs: 0,
        fats: 0,
      }
    }

    return null
  }

  const nutritionData = getNutritionData()

  // ============================================================================
  // Calculations
  // ============================================================================

  const getPerServing = (value: number): number => {
    return Math.round(value / servingCount)
  }

  const getMacroPercentages = () => {
    if (!nutritionData) return { protein: 0, carbs: 0, fats: 0 }

    const totalCaloriesFromMacros =
      nutritionData.protein * 4 + nutritionData.carbs * 4 + nutritionData.fats * 9

    if (totalCaloriesFromMacros === 0) {
      return { protein: 0, carbs: 0, fats: 0 }
    }

    return {
      protein: Math.round((nutritionData.protein * 4) / totalCaloriesFromMacros * 100),
      carbs: Math.round((nutritionData.carbs * 4) / totalCaloriesFromMacros * 100),
      fats: Math.round((nutritionData.fats * 9) / totalCaloriesFromMacros * 100),
    }
  }

  const macroPercentages = getMacroPercentages()

  // ============================================================================
  // Render States
  // ============================================================================

  if (isCalculating) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          <span className="ml-2 text-sm text-muted-foreground">Calculating nutrition...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">{error}</p>
        </CardContent>
      </Card>
    )
  }

  if (!nutritionData) {
    return (
      <Card className={className}>
        <CardContent className="py-4">
          <p className="text-sm text-muted-foreground">No nutrition data available</p>
        </CardContent>
      </Card>
    )
  }

  // ============================================================================
  // Compact View
  // ============================================================================

  if (compact) {
    return (
      <div className={className}>
        <div className="flex items-center gap-4 text-sm">
          <div className="flex items-center gap-1">
            <span className="font-semibold">{nutritionData.calories}</span>
            <span className="text-muted-foreground">cal</span>
          </div>
          {nutritionData.protein > 0 && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">{Math.round(nutritionData.protein)}g</span>
              <span className="text-muted-foreground">protein</span>
            </div>
          )}
          {nutritionData.carbs > 0 && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">{Math.round(nutritionData.carbs)}g</span>
              <span className="text-muted-foreground">carbs</span>
            </div>
          )}
          {nutritionData.fats > 0 && (
            <div className="flex items-center gap-1">
              <span className="font-semibold">{Math.round(nutritionData.fats)}g</span>
              <span className="text-muted-foreground">fat</span>
            </div>
          )}
        </div>
      </div>
    )
  }

  // ============================================================================
  // Full View
  // ============================================================================

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <span>Nutrition Facts</span>
          {servingCount > 1 && showPerServing && (
            <Badge variant="outline">{servingCount} servings</Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Calories */}
        <div className="border-b pb-4">
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold">{nutritionData.calories}</span>
            <span className="text-sm text-muted-foreground">calories</span>
          </div>
          {showPerServing && servingCount > 1 && (
            <p className="mt-1 text-sm text-muted-foreground">
              {getPerServing(nutritionData.calories)} per serving
            </p>
          )}
        </div>

        {/* Macronutrients */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm">Macronutrients</h4>

          {/* Protein */}
          {nutritionData.protein > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Protein</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{macroPercentages.protein}% of calories from protein</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{Math.round(nutritionData.protein)}g</span>
                  {showPerServing && servingCount > 1 && (
                    <span className="ml-2 text-muted-foreground">
                      ({getPerServing(nutritionData.protein)}g / serving)
                    </span>
                  )}
                </div>
              </div>
              <Progress
                value={macroPercentages.protein}
                className="h-2"
                indicatorClassName="bg-blue-500"
              />
            </div>
          )}

          {/* Carbs */}
          {nutritionData.carbs > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Carbohydrates</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{macroPercentages.carbs}% of calories from carbs</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{Math.round(nutritionData.carbs)}g</span>
                  {showPerServing && servingCount > 1 && (
                    <span className="ml-2 text-muted-foreground">
                      ({getPerServing(nutritionData.carbs)}g / serving)
                    </span>
                  )}
                </div>
              </div>
              <Progress
                value={macroPercentages.carbs}
                className="h-2"
                indicatorClassName="bg-orange-500"
              />
            </div>
          )}

          {/* Fats */}
          {nutritionData.fats > 0 && (
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center gap-2">
                  <span className="font-medium">Fats</span>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger>
                        <Info className="h-3 w-3 text-muted-foreground" />
                      </TooltipTrigger>
                      <TooltipContent>
                        <p>{macroPercentages.fats}% of calories from fats</p>
                      </TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
                <div className="text-right">
                  <span className="font-semibold">{Math.round(nutritionData.fats)}g</span>
                  {showPerServing && servingCount > 1 && (
                    <span className="ml-2 text-muted-foreground">
                      ({getPerServing(nutritionData.fats)}g / serving)
                    </span>
                  )}
                </div>
              </div>
              <Progress
                value={macroPercentages.fats}
                className="h-2"
                indicatorClassName="bg-purple-500"
              />
            </div>
          )}
        </div>

        {/* Additional Nutrients */}
        {(nutritionData.fiber || nutritionData.sugar || nutritionData.sodium) && (
          <div className="space-y-3 border-t pt-4">
            <h4 className="font-semibold text-sm">Other Nutrients</h4>

            {nutritionData.fiber !== undefined && nutritionData.fiber > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Fiber</span>
                <span className="font-medium">{Math.round(nutritionData.fiber)}g</span>
              </div>
            )}

            {nutritionData.sugar !== undefined && nutritionData.sugar > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sugar</span>
                <span className="font-medium">{Math.round(nutritionData.sugar)}g</span>
              </div>
            )}

            {nutritionData.sodium !== undefined && nutritionData.sodium > 0 && (
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Sodium</span>
                <span className="font-medium">{Math.round(nutritionData.sodium)}mg</span>
              </div>
            )}
          </div>
        )}

        {/* Macro Ratio Visual */}
        {(nutritionData.protein > 0 || nutritionData.carbs > 0 || nutritionData.fats > 0) && (
          <div className="border-t pt-4">
            <h4 className="mb-3 text-sm font-semibold">Macro Ratio</h4>
            <div className="flex h-4 w-full overflow-hidden rounded-full">
              {macroPercentages.protein > 0 && (
                <div
                  className="bg-blue-500"
                  style={{ width: `${macroPercentages.protein}%` }}
                  title={`Protein: ${macroPercentages.protein}%`}
                />
              )}
              {macroPercentages.carbs > 0 && (
                <div
                  className="bg-orange-500"
                  style={{ width: `${macroPercentages.carbs}%` }}
                  title={`Carbs: ${macroPercentages.carbs}%`}
                />
              )}
              {macroPercentages.fats > 0 && (
                <div
                  className="bg-purple-500"
                  style={{ width: `${macroPercentages.fats}%` }}
                  title={`Fats: ${macroPercentages.fats}%`}
                />
              )}
            </div>
            <div className="mt-2 flex justify-between text-xs text-muted-foreground">
              <span>Protein {macroPercentages.protein}%</span>
              <span>Carbs {macroPercentages.carbs}%</span>
              <span>Fats {macroPercentages.fats}%</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
