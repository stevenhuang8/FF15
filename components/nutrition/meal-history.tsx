'use client'

/**
 * MealHistory Component
 *
 * Displays meal logging history grouped by week, then by day, then by meal type
 * with detailed nutritional summaries at each level
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  CalendarDays,
  ChevronDown,
  ChevronUp,
  Utensils,
  TrendingUp,
  Trash2,
  Apple,
  Flame,
} from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'
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
import { getMealLogs, deleteMealLog } from '@/lib/nutrition/meal-logging'
import { groupByWeek, groupByDay } from '@/lib/utils/date-grouping'
import type { MealLog, MealType } from '@/lib/nutrition/types'
import type { WeekGroup, DayGroup, MealWeekStats } from '@/types/history'
import { formatPacificTime } from '@/lib/utils'
import { Loader2 } from 'lucide-react'

// ============================================================================
// Types
// ============================================================================

interface GroupedMealsByType {
  breakfast: MealLog[]
  lunch: MealLog[]
  dinner: MealLog[]
  snack: MealLog[]
}

interface MealHistoryProps {
  weeksBack?: number
}

// ============================================================================
// Main Component
// ============================================================================

export function MealHistory({ weeksBack = 12 }: MealHistoryProps) {
  const [meals, setMeals] = useState<MealLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [expandedWeeks, setExpandedWeeks] = useState<Set<string>>(new Set())
  const [expandedDays, setExpandedDays] = useState<Set<string>>(new Set())
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [mealToDelete, setMealToDelete] = useState<MealLog | null>(null)
  const [isDeleting, setIsDeleting] = useState(false)

  // ============================================================================
  // Data Fetching
  // ============================================================================

  useEffect(() => {
    loadMealHistory()
  }, [weeksBack])

  // ============================================================================
  // Real-Time Subscription
  // ============================================================================

  useEffect(() => {
    const supabase = createClient()
    let subscription: any = null

    const setupSubscription = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      // Subscribe to changes in meal_logs table for this user
      subscription = supabase
        .channel('meal_logs_history_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'meal_logs',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔄 Real-time meal_logs change:', payload.eventType)
            // Refresh meal history when any change occurs
            loadMealHistory()
          }
        )
        .subscribe()
    }

    setupSubscription()

    // Cleanup subscription on unmount
    return () => {
      if (subscription) {
        subscription.unsubscribe()
      }
    }
  }, []) // Empty dependency array - set up once on mount

  const loadMealHistory = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error('User not authenticated')
        setIsLoading(false)
        return
      }

      // Calculate date range (last N weeks)
      const endDate = new Date()
      const startDate = new Date()
      startDate.setDate(startDate.getDate() - weeksBack * 7)

      const { data, error } = await getMealLogs(user.id, startDate, endDate)

      if (error) {
        console.error('Error loading meal history:', error)
      } else if (data) {
        setMeals(data)
      }
    } catch (error) {
      console.error('Exception loading meal history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // Grouping and Stats
  // ============================================================================

  const weeklyGroups = groupByWeek(meals, (meal) => meal.loggedAt)

  const calculateWeekStats = (weekMeals: MealLog[]): MealWeekStats => {
    if (weekMeals.length === 0) {
      return {
        totalCalories: 0,
        avgDailyCalories: 0,
        totalProtein: 0,
        totalCarbs: 0,
        totalFats: 0,
        daysWithMeals: 0,
      }
    }

    // Group by day to calculate daily average
    const dayGroups = groupByDay(weekMeals, (meal) => meal.loggedAt)

    const totalCalories = weekMeals.reduce((sum, meal) => sum + meal.totalCalories, 0)
    const totalProtein = weekMeals.reduce((sum, meal) => sum + (meal.totalProtein || 0), 0)
    const totalCarbs = weekMeals.reduce((sum, meal) => sum + (meal.totalCarbs || 0), 0)
    const totalFats = weekMeals.reduce((sum, meal) => sum + (meal.totalFats || 0), 0)

    return {
      totalCalories,
      avgDailyCalories: Math.round(totalCalories / dayGroups.length),
      totalProtein: Math.round(totalProtein),
      totalCarbs: Math.round(totalCarbs),
      totalFats: Math.round(totalFats),
      daysWithMeals: dayGroups.length,
    }
  }

  const calculateDayStats = (dayMeals: MealLog[]) => {
    return {
      totalCalories: dayMeals.reduce((sum, meal) => sum + meal.totalCalories, 0),
      totalProtein: Math.round(dayMeals.reduce((sum, meal) => sum + (meal.totalProtein || 0), 0)),
      totalCarbs: Math.round(dayMeals.reduce((sum, meal) => sum + (meal.totalCarbs || 0), 0)),
      totalFats: Math.round(dayMeals.reduce((sum, meal) => sum + (meal.totalFats || 0), 0)),
    }
  }

  const groupMealsByType = (dayMeals: MealLog[]): GroupedMealsByType => {
    const grouped: GroupedMealsByType = {
      breakfast: [],
      lunch: [],
      dinner: [],
      snack: [],
    }

    dayMeals.forEach((meal) => {
      if (meal.mealType in grouped) {
        grouped[meal.mealType].push(meal)
      }
    })

    return grouped
  }

  // ============================================================================
  // UI Handlers
  // ============================================================================

  const toggleWeekExpanded = (weekKey: string) => {
    const newExpanded = new Set(expandedWeeks)
    if (newExpanded.has(weekKey)) {
      newExpanded.delete(weekKey)
    } else {
      newExpanded.add(weekKey)
    }
    setExpandedWeeks(newExpanded)
  }

  const toggleDayExpanded = (dayKey: string) => {
    const newExpanded = new Set(expandedDays)
    if (newExpanded.has(dayKey)) {
      newExpanded.delete(dayKey)
    } else {
      newExpanded.add(dayKey)
    }
    setExpandedDays(newExpanded)
  }

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

      // Refresh meal history
      await loadMealHistory()
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
  // Render Helpers
  // ============================================================================

  const renderMealTypeSection = (
    mealType: MealType,
    displayName: string,
    mealList: MealLog[]
  ) => {
    if (mealList.length === 0) return null

    return (
      <div key={mealType} className="space-y-2">
        <div className="flex items-center gap-2 py-1 px-2 rounded-md bg-muted/30">
          <span className="text-sm font-medium">{displayName}</span>
          <Badge variant="secondary" className="text-xs">
            {mealList.length}
          </Badge>
        </div>

        <div className="ml-3 space-y-2">
          {mealList.map((meal) => (
            <Card key={meal.id} className="p-3 bg-background">
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
                  {meal.notes && <p className="text-xs text-muted-foreground italic">{meal.notes}</p>}

                  {/* Time */}
                  <p className="text-xs text-muted-foreground">
                    {formatPacificTime(meal.loggedAt, {
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
      </div>
    )
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (meals.length === 0) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="text-center text-muted-foreground">
            <Utensils className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No meal history found.</p>
            <p className="text-sm mt-1">Start logging your meals to track your nutrition!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <div className="space-y-6">
        {/* Summary Stats */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Nutrition Overview
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Meals</p>
                <p className="text-2xl font-bold">{meals.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Weeks Tracked</p>
                <p className="text-2xl font-bold">{weeklyGroups.length}</p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Total Calories</p>
                <p className="text-2xl font-bold">
                  {meals.reduce((sum, meal) => sum + meal.totalCalories, 0).toLocaleString()}
                </p>
              </div>
              <div className="space-y-1">
                <p className="text-sm text-muted-foreground">Avg Daily</p>
                <p className="text-2xl font-bold">
                  {Math.round(
                    meals.reduce((sum, meal) => sum + meal.totalCalories, 0) /
                      groupByDay(meals, (m) => m.loggedAt).length
                  )}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Meal History - Grouped by Week */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Utensils className="h-5 w-5" />
              Meal History
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {weeklyGroups.map((week) => {
                const weekStats = calculateWeekStats(week.items)
                const isWeekExpanded = expandedWeeks.has(week.weekKey)
                const dayGroups = groupByDay(week.items, (meal) => meal.loggedAt)

                return (
                  <Collapsible key={week.weekKey} open={isWeekExpanded}>
                    <div className="rounded-lg border">
                      {/* Week Header */}
                      <CollapsibleTrigger
                        onClick={() => toggleWeekExpanded(week.weekKey)}
                        className="w-full p-4 hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <CalendarDays className="h-5 w-5 text-muted-foreground" />
                            <div className="text-left">
                              <h3 className="font-semibold text-base">{week.weekLabel}</h3>
                              <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground mt-1">
                                <span className="flex items-center gap-1">
                                  <Utensils className="h-3 w-3" />
                                  {week.items.length} meal{week.items.length !== 1 ? 's' : ''}
                                </span>
                                <span className="flex items-center gap-1">
                                  <Flame className="h-3 w-3" />
                                  {weekStats.totalCalories.toLocaleString()} cal
                                </span>
                                <span className="flex items-center gap-1">
                                  <Apple className="h-3 w-3" />
                                  {weekStats.avgDailyCalories} avg/day
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <Badge variant="secondary">{weekStats.daysWithMeals} days</Badge>
                            {isWeekExpanded ? (
                              <ChevronUp className="h-5 w-5 text-muted-foreground" />
                            ) : (
                              <ChevronDown className="h-5 w-5 text-muted-foreground" />
                            )}
                          </div>
                        </div>
                      </CollapsibleTrigger>

                      {/* Week Content - Days */}
                      <CollapsibleContent>
                        <div className="border-t p-4 space-y-3 bg-muted/20">
                          {dayGroups.map((day) => {
                            const dayKey = format(day.date, 'yyyy-MM-dd')
                            const isDayExpanded = expandedDays.has(dayKey)
                            const dayStats = calculateDayStats(day.items)
                            const mealsByType = groupMealsByType(day.items)

                            return (
                              <Collapsible key={dayKey} open={isDayExpanded}>
                                <div className="rounded-lg border bg-background">
                                  {/* Day Header */}
                                  <CollapsibleTrigger
                                    onClick={() => toggleDayExpanded(dayKey)}
                                    className="w-full p-3 hover:bg-muted/30 transition-colors"
                                  >
                                    <div className="flex items-center justify-between">
                                      <div className="text-left">
                                        <h4 className="font-semibold text-sm">{day.dateLabel}</h4>
                                        <div className="flex gap-3 text-xs text-muted-foreground mt-1">
                                          <span>{dayStats.totalCalories} cal</span>
                                          <span>{dayStats.totalProtein}g protein</span>
                                          <span>{dayStats.totalCarbs}g carbs</span>
                                          <span>{dayStats.totalFats}g fats</span>
                                        </div>
                                      </div>
                                      <div className="flex items-center gap-2">
                                        <Badge variant="outline" className="text-xs">
                                          {day.items.length}
                                        </Badge>
                                        {isDayExpanded ? (
                                          <ChevronUp className="h-4 w-4 text-muted-foreground" />
                                        ) : (
                                          <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                        )}
                                      </div>
                                    </div>
                                  </CollapsibleTrigger>

                                  {/* Day Content - Meals by Type */}
                                  <CollapsibleContent>
                                    <div className="border-t p-3 space-y-3 bg-muted/10">
                                      {renderMealTypeSection('breakfast', 'Breakfast', mealsByType.breakfast)}
                                      {renderMealTypeSection('lunch', 'Lunch', mealsByType.lunch)}
                                      {renderMealTypeSection('dinner', 'Dinner', mealsByType.dinner)}
                                      {renderMealTypeSection('snack', 'Snacks', mealsByType.snack)}
                                    </div>
                                  </CollapsibleContent>
                                </div>
                              </Collapsible>
                            )
                          })}
                        </div>
                      </CollapsibleContent>
                    </div>
                  </Collapsible>
                )
              })}
            </div>
          </CardContent>
        </Card>
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
