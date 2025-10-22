'use client'

/**
 * MealLogForm Component
 *
 * Comprehensive meal logging form with:
 * - Meal type selection (breakfast, lunch, dinner, snack)
 * - Food search with auto-complete
 * - Quantity and unit inputs
 * - Automatic nutritional calculations
 * - Form validation
 */

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Search, Loader2, CheckCircle2 } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

import { createClient } from '@/lib/supabase/client'
import { createMealLog } from '@/lib/nutrition/meal-logging'
import type { NutritionData, MealType, FoodItem } from '@/lib/nutrition/types'

// ============================================================================
// Form Schema
// ============================================================================

const foodItemSchema = z.object({
  name: z.string().min(1, 'Food name is required'),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  calories: z.number().nonnegative(),
  protein: z.number().nonnegative().optional(),
  carbs: z.number().nonnegative().optional(),
  fats: z.number().nonnegative().optional(),
})

const mealLogFormSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  foodItems: z.array(foodItemSchema).min(1, 'Add at least one food item'),
  notes: z.string().optional(),
})

type MealLogFormData = z.infer<typeof mealLogFormSchema>

// ============================================================================
// Component Types
// ============================================================================

interface MealLogFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  defaultMealType?: MealType
}

interface FoodSearchState {
  query: string
  results: NutritionData[]
  isSearching: boolean
  isOpen: boolean
}

interface FoodInputState {
  name: string
  quantity: string
  unit: string
  nutrition: NutritionData | null
}

// ============================================================================
// Main Component
// ============================================================================

export function MealLogForm({
  onSuccess,
  onCancel,
  defaultMealType = 'breakfast',
}: MealLogFormProps) {
  const [foodItems, setFoodItems] = useState<FoodItem[]>([])
  const [currentFood, setCurrentFood] = useState<FoodInputState>({
    name: '',
    quantity: '1',
    unit: 'serving',
    nutrition: null,
  })
  const [foodSearch, setFoodSearch] = useState<FoodSearchState>({
    query: '',
    results: [],
    isSearching: false,
    isOpen: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<MealLogFormData>({
    resolver: zodResolver(mealLogFormSchema),
    defaultValues: {
      mealType: defaultMealType,
      foodItems: [],
      notes: '',
    },
  })

  const mealType = watch('mealType')

  // ============================================================================
  // Food Search with Debounce
  // ============================================================================

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setFoodSearch((prev) => ({ ...prev, results: [], isSearching: false }))
        return
      }

      setFoodSearch((prev) => ({ ...prev, isSearching: true }))

      try {
        const response = await fetch(`/api/nutrition/search?query=${encodeURIComponent(query)}`)

        if (!response.ok) {
          throw new Error('Failed to search food')
        }

        const { data, error } = await response.json()

        if (!error && data) {
          setFoodSearch((prev) => ({
            ...prev,
            results: data,
            isSearching: false,
          }))
        } else {
          setFoodSearch((prev) => ({
            ...prev,
            results: [],
            isSearching: false,
          }))
        }
      } catch (error) {
        console.error('Error searching food:', error)
        setFoodSearch((prev) => ({
          ...prev,
          results: [],
          isSearching: false,
        }))
      }
    }, 500),
    []
  )

  useEffect(() => {
    debouncedSearch(foodSearch.query)
  }, [foodSearch.query, debouncedSearch])

  // ============================================================================
  // Food Item Management
  // ============================================================================

  const handleFoodSelect = (nutrition: NutritionData) => {
    setCurrentFood({
      name: nutrition.foodName,
      quantity: '1',
      unit: nutrition.servingUnit,
      nutrition,
    })
    setFoodSearch((prev) => ({ ...prev, query: nutrition.foodName, isOpen: false }))
  }

  const calculateFoodItemNutrition = (
    nutrition: NutritionData,
    quantity: number,
    unit: string
  ): FoodItem => {
    // Simple scaling - assume units match for now
    // In production, would need unit conversion logic
    const scale = quantity / nutrition.servingSize

    return {
      name: nutrition.foodName,
      quantity,
      unit,
      calories: Math.round(nutrition.calories * scale),
      protein: Math.round((nutrition.protein || 0) * scale),
      carbs: Math.round((nutrition.carbs || 0) * scale),
      fats: Math.round((nutrition.fats || 0) * scale),
    }
  }

  const handleAddFood = () => {
    if (!currentFood.name || !currentFood.quantity) {
      return
    }

    const quantity = parseFloat(currentFood.quantity)
    if (isNaN(quantity) || quantity <= 0) {
      return
    }

    let foodItem: FoodItem

    if (currentFood.nutrition) {
      // Use nutrition data from search result
      foodItem = calculateFoodItemNutrition(
        currentFood.nutrition,
        quantity,
        currentFood.unit
      )
    } else {
      // Create custom food item with default values
      foodItem = {
        name: currentFood.name,
        quantity,
        unit: currentFood.unit,
        calories: 0,
        protein: 0,
        carbs: 0,
        fats: 0,
      }
    }

    const newFoodItems = [...foodItems, foodItem]
    setFoodItems(newFoodItems)
    setValue('foodItems', newFoodItems)

    // Reset current food input
    setCurrentFood({
      name: '',
      quantity: '1',
      unit: 'serving',
      nutrition: null,
    })
    setFoodSearch({ query: '', results: [], isSearching: false, isOpen: false })
  }

  const handleRemoveFood = (index: number) => {
    const newFoodItems = foodItems.filter((_, i) => i !== index)
    setFoodItems(newFoodItems)
    setValue('foodItems', newFoodItems)
  }

  // ============================================================================
  // Nutritional Calculations
  // ============================================================================

  const calculateTotals = () => {
    return foodItems.reduce(
      (totals, item) => ({
        calories: totals.calories + (item.calories || 0),
        protein: totals.protein + (item.protein || 0),
        carbs: totals.carbs + (item.carbs || 0),
        fats: totals.fats + (item.fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    )
  }

  const totals = calculateTotals()

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (data: MealLogFormData) => {
    setIsSubmitting(true)
    setSubmitSuccess(false)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await createMealLog(supabase, {
        userId: user.id,
        mealType: data.mealType,
        foodItems: data.foodItems,
        notes: data.notes,
      })

      if (error) {
        throw error
      }

      setSubmitSuccess(true)

      // Reset form after 1 second
      setTimeout(() => {
        setFoodItems([])
        setValue('foodItems', [])
        setValue('notes', '')
        setSubmitSuccess(false)

        if (onSuccess) {
          onSuccess()
        }
      }, 1000)
    } catch (error) {
      console.error('Error logging meal:', error)
      alert('Failed to log meal. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Log a Meal</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Meal Type Selection */}
          <div className="space-y-2">
            <Label htmlFor="mealType">Meal Type</Label>
            <Select
              value={mealType}
              onValueChange={(value) => setValue('mealType', value as MealType)}
            >
              <SelectTrigger id="mealType">
                <SelectValue placeholder="Select meal type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="breakfast">Breakfast</SelectItem>
                <SelectItem value="lunch">Lunch</SelectItem>
                <SelectItem value="dinner">Dinner</SelectItem>
                <SelectItem value="snack">Snack</SelectItem>
              </SelectContent>
            </Select>
            {errors.mealType && (
              <p className="text-sm text-red-500">{errors.mealType.message}</p>
            )}
          </div>

          {/* Food Search and Add */}
          <div className="space-y-4">
            <Label>Add Food Items</Label>

            <div className="flex gap-2">
              {/* Food Search with Auto-complete */}
              <div className="flex-1 relative">
                <div className="relative">
                  <Input
                    placeholder="Search for food..."
                    value={foodSearch.query}
                    onChange={(e) => {
                      const value = e.target.value
                      setFoodSearch((prev) => ({
                        ...prev,
                        query: value,
                        isOpen: value.length >= 2,
                      }))
                      setCurrentFood((prev) => ({ ...prev, name: value, nutrition: null }))
                    }}
                    onFocus={() => {
                      if (foodSearch.query.length >= 2) {
                        setFoodSearch((prev) => ({ ...prev, isOpen: true }))
                      }
                    }}
                    onBlur={() => {
                      // Delay closing to allow clicking on items
                      setTimeout(() => {
                        setFoodSearch((prev) => ({ ...prev, isOpen: false }))
                      }, 200)
                    }}
                  />
                  {foodSearch.isSearching && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Dropdown Results */}
                {foodSearch.isOpen && foodSearch.results.length > 0 && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md">
                    <Command>
                      <CommandList>
                        <CommandGroup>
                          {foodSearch.results.map((result, index) => (
                            <CommandItem
                              key={index}
                              onSelect={() => handleFoodSelect(result)}
                              className="cursor-pointer"
                            >
                              <div className="flex flex-col">
                                <span className="font-medium">{result.foodName}</span>
                                <span className="text-xs text-muted-foreground">
                                  {result.calories} cal per {result.servingSize}
                                  {result.servingUnit}
                                </span>
                              </div>
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </div>
                )}
              </div>

              {/* Quantity Input */}
              <Input
                type="number"
                placeholder="Qty"
                value={currentFood.quantity}
                onChange={(e) =>
                  setCurrentFood((prev) => ({ ...prev, quantity: e.target.value }))
                }
                className="w-20"
                min="0"
                step="0.1"
              />

              {/* Unit Input */}
              <Input
                placeholder="Unit"
                value={currentFood.unit}
                onChange={(e) =>
                  setCurrentFood((prev) => ({ ...prev, unit: e.target.value }))
                }
                className="w-24"
              />

              {/* Add Button */}
              <Button
                type="button"
                onClick={handleAddFood}
                disabled={!currentFood.name || !currentFood.quantity}
                size="icon"
              >
                <Plus className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Food Items List */}
          {foodItems.length > 0 && (
            <div className="space-y-2">
              <Label>Food Items ({foodItems.length})</Label>
              <div className="space-y-2">
                {foodItems.map((item, index) => (
                  <div
                    key={index}
                    className="flex items-center justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1">
                      <p className="font-medium">{item.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {item.quantity} {item.unit} • {item.calories} cal
                      </p>
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveFood(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.foodItems && (
            <p className="text-sm text-red-500">{errors.foodItems.message}</p>
          )}

          {/* Nutritional Totals */}
          {foodItems.length > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-3 font-semibold">Nutritional Totals</h4>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <div>
                  <p className="text-sm text-muted-foreground">Calories</p>
                  <p className="text-2xl font-bold">{totals.calories}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Protein</p>
                  <p className="text-2xl font-bold">{totals.protein}g</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Carbs</p>
                  <p className="text-2xl font-bold">{totals.carbs}g</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Fats</p>
                  <p className="text-2xl font-bold">{totals.fats}g</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (optional)</Label>
            <textarea
              id="notes"
              {...register('notes')}
              placeholder="Add any notes about this meal..."
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || foodItems.length === 0}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging...
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Logged!
                </>
              ) : (
                'Log Meal'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}
