'use client'

/**
 * TodaysMeals Component
 *
 * Displays today's logged meals grouped by meal type (breakfast, lunch, dinner, snacks)
 * with detailed nutritional information and delete functionality
 */

import { useEffect, useState } from 'react'
import { Plus, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'

import { createClient } from '@/lib/supabase/client'
import { getTodaysMealLogs, deleteMealLog } from '@/lib/nutrition/meal-logging'
import type { MealLog, MealType } from '@/lib/nutrition/types'

// ============================================================================
// Types
// ============================================================================

interface TodaysMealsProps {
  refreshKey?: number
  onLogMeal?: (mealType?: MealType) => void
  onMealDeleted?: () => void
}

interface GroupedMeals {
  breakfast: MealLog[]
  lunch: MealLog[]
  dinner: MealLog[]
  snack: MealLog[]
}

// ============================================================================
// Main Component
// ============================================================================

export function TodaysMeals({ refreshKey = 0, onLogMeal, onMealDeleted }: TodaysMealsProps) {
  const [meals, setMeals] = useState<GroupedMeals>({
    breakfast: [],
    lunch: [],
    dinner: [],
    snack: [],
  })
  const [loading, setLoading] = useState(true)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mealToDelete, setMealToDelete] = useState<MealLog | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ============================================================================
  // Fetch Meals
  // ============================================================================

  const fetchMeals = async () => {
    setLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error('User not authenticated')
        setLoading(false)
        return
      }

      const { data, error } = await getTodaysMealLogs(user.id)

      if (error) {
        console.error('Error fetching meals:', error)
        setLoading(false)
        return
      }

      // Group meals by type
      const grouped: GroupedMeals = {
        breakfast: [],
        lunch: [],
        dinner: [],
        snack: [],
      }

      if (data) {
        data.forEach((meal) => {
          if (meal.mealType in grouped) {
            grouped[meal.mealType].push(meal)
          }
        })
      }

      setMeals(grouped)
    } catch (error) {
      console.error('Exception fetching meals:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchMeals()
  }, [refreshKey])

  // ============================================================================
  // Delete Meal
  // ============================================================================

  const handleDeleteClick = (meal: MealLog) => {
    setMealToDelete(meal)
    setDeleteDialogOpen(true)
  }

  const handleDeleteConfirm = async () => {
    if (!mealToDelete) return

    setIsDeleting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error('User not authenticated')
        return
      }

      const { error } = await deleteMealLog(mealToDelete.id, user.id)

      if (error) {
        console.error('Error deleting meal:', error)
        alert('Failed to delete meal. Please try again.')
        return
      }

      // Refresh meals list
      await fetchMeals()

      // Notify parent component
      if (onMealDeleted) {
        onMealDeleted()
      }
    } catch (error) {
      console.error('Exception deleting meal:', error)
      alert('Failed to delete meal. Please try again.')
    } finally {
      setIsDeleting(false)
      setDeleteDialogOpen(false)
      setMealToDelete(null)
    }
  }

  // ============================================================================
  // Render Meal Type Section
  // ============================================================================

  const renderMealSection = (mealType: MealType, displayName: string) => {
    const mealList = meals[mealType]

    return (
      <div key={mealType} className="space-y-2">
        <div className="flex items-center justify-between py-2 px-3 rounded-md bg-muted/50">
          <div className="flex items-center gap-2">
            <span className="text-sm font-medium">{displayName}</span>
            {mealList.length > 0 && (
              <Badge variant="secondary" className="text-xs">
                {mealList.length}
              </Badge>
            )}
          </div>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => onLogMeal?.(mealType)}
            aria-label={`Add ${displayName.toLowerCase()}`}
          >
            <Plus className="h-4 w-4" />
          </Button>
        </div>

        {/* Display logged meals */}
        {mealList.length > 0 && (
          <div className="ml-4 space-y-2">
            {mealList.map((meal) => (
              <Card key={meal.id} className="p-3">
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 space-y-1">
                    {/* Food Items */}
                    <div className="space-y-1">
                      {meal.foodItems.map((item, index) => (
                        <div key={index} className="text-sm">
                          <span className="font-medium">{item.name}</span>
                          <span className="text-muted-foreground">
                            {' '}
                            - {item.quantity} {item.unit}
                          </span>
                        </div>
                      ))}
                    </div>

                    {/* Nutritional Info */}
                    <div className="flex gap-3 text-xs text-muted-foreground">
                      <span>{meal.totalCalories} cal</span>
                      {meal.totalProtein !== undefined && (
                        <span>{Math.round(meal.totalProtein)}g protein</span>
                      )}
                      {meal.totalCarbs !== undefined && (
                        <span>{Math.round(meal.totalCarbs)}g carbs</span>
                      )}
                      {meal.totalFats !== undefined && (
                        <span>{Math.round(meal.totalFats)}g fats</span>
                      )}
                    </div>

                    {/* Notes */}
                    {meal.notes && (
                      <p className="text-xs text-muted-foreground italic">{meal.notes}</p>
                    )}

                    {/* Time */}
                    <p className="text-xs text-muted-foreground">
                      {new Date(meal.loggedAt).toLocaleTimeString('en-US', {
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>

                  {/* Delete Button */}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDeleteClick(meal)}
                    aria-label="Delete meal"
                    className="text-destructive hover:text-destructive"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </div>
    )
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (loading) {
    return (
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Today's Meals</h3>
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      </div>
    )
  }

  return (
    <>
      <div className="rounded-lg border bg-card p-6">
        <h3 className="mb-4 text-lg font-semibold">Today's Meals</h3>
        <div className="space-y-3">
          {renderMealSection('breakfast', 'Breakfast')}
          {renderMealSection('lunch', 'Lunch')}
          {renderMealSection('dinner', 'Dinner')}
          {renderMealSection('snack', 'Snacks')}
        </div>
      </div>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Meal?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this meal? This action cannot be undone and will
              update your daily calorie totals.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isDeleting}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isDeleting}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Deleting...
                </>
              ) : (
                'Delete'
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
