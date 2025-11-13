'use client'

/**
 * CalorieTracker Dashboard Widget
 *
 * Displays daily calorie tracking with:
 * - Daily intake vs target with progress indicator
 * - Macro breakdown (protein, carbs, fats) with progress bars
 * - Net calories calculation (intake - burned)
 * - Color-coded progress (green, yellow, red)
 * - Remaining calories to goal
 */

import { useEffect, useState } from 'react'
import { Flame, TrendingUp, TrendingDown, Target, Utensils, Dumbbell } from 'lucide-react'

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

import { createClient } from '@/lib/supabase/client'
import { getDailyNutrition } from '@/lib/nutrition/meal-logging'
import type { DailyNutrition } from '@/lib/nutrition/types'

// ============================================================================
// Types
// ============================================================================

interface UserProfile {
  daily_calorie_target: number | null
  daily_protein_target: number | null
  daily_carbs_target: number | null
  daily_fats_target: number | null
}

interface CalorieTrackerProps {
  className?: string
}

interface MacroProgress {
  name: string
  current: number
  target: number
  unit: string
  color: string
}

// ============================================================================
// Main Component
// ============================================================================

export function CalorieTracker({ className }: CalorieTrackerProps) {
  const [dailyNutrition, setDailyNutrition] = useState<DailyNutrition | null>(null)
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchData()
  }, [])

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

      // Subscribe to changes in calorie_tracking table for this user
      // This table is updated when meals are logged or workouts are completed
      subscription = supabase
        .channel('calorie_tracking_changes')
        .on(
          'postgres_changes',
          {
            event: '*', // Listen to INSERT, UPDATE, DELETE
            schema: 'public',
            table: 'calorie_tracking',
            filter: `user_id=eq.${user.id}`,
          },
          (payload) => {
            console.log('🔄 Real-time calorie_tracking change:', payload.eventType)
            // Refresh calorie data when any change occurs
            fetchData()
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

  const fetchData = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const supabase = createClient()
      const {
        data: { user },
        error: authError
      } = await supabase.auth.getUser()

      if (authError) {
        console.error('Auth error in CalorieTracker:', authError)
        throw new Error('Authentication error')
      }

      if (!user) {
        console.warn('No user found in CalorieTracker - should be redirected by middleware')
        throw new Error('User not authenticated')
      }

      console.log('✅ CalorieTracker: User authenticated:', user.id)

      // Fetch user profile for targets
      const { data: profile, error: profileError } = await supabase
        .from('user_profiles')
        .select('daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fats_target')
        .eq('id', user.id)
        .single()

      if (profileError && profileError.code !== 'PGRST116') {
        throw profileError
      }

      setUserProfile(profile)

      // Fetch today's nutrition data
      const { data: nutrition, error: nutritionError } = await getDailyNutrition(
        user.id,
        new Date()
      )

      if (nutritionError) {
        throw nutritionError
      }

      setDailyNutrition(nutrition)
    } catch (err) {
      console.error('Error fetching calorie tracker data:', err)
      setError(err instanceof Error ? err.message : 'Failed to load data')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // Calculations
  // ============================================================================

  const calorieTarget = userProfile?.daily_calorie_target || 2000
  const caloriesConsumed = dailyNutrition?.totalCaloriesConsumed || 0
  const caloriesBurned = dailyNutrition?.totalCaloriesBurned || 0
  const netCalories = caloriesConsumed - caloriesBurned
  const remainingCalories = calorieTarget - caloriesConsumed

  const calorieProgress = Math.min((caloriesConsumed / calorieTarget) * 100, 150)

  // Color coding for progress
  const getProgressColor = (progress: number): string => {
    if (progress < 80) return 'bg-green-500' // Under target - good
    if (progress <= 110) return 'bg-yellow-500' // Close to target - ok
    return 'bg-red-500' // Over target - warning
  }

  const getProgressStatus = (progress: number): string => {
    if (progress < 80) return 'On Track'
    if (progress <= 110) return 'Close to Goal'
    return 'Over Target'
  }

  const progressColor = getProgressColor(calorieProgress)
  const progressStatus = getProgressStatus(calorieProgress)

  // Macro breakdown
  const macros: MacroProgress[] = [
    {
      name: 'Protein',
      current: dailyNutrition?.totalProteinConsumed || 0,
      target: userProfile?.daily_protein_target || 150,
      unit: 'g',
      color: 'bg-blue-500',
    },
    {
      name: 'Carbs',
      current: dailyNutrition?.totalCarbsConsumed || 0,
      target: userProfile?.daily_carbs_target || 200,
      unit: 'g',
      color: 'bg-orange-500',
    },
    {
      name: 'Fats',
      current: dailyNutrition?.totalFatsConsumed || 0,
      target: userProfile?.daily_fats_target || 70,
      unit: 'g',
      color: 'bg-purple-500',
    },
  ]

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Calorie Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <p className="text-sm text-muted-foreground">Loading...</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Flame className="h-5 w-5" />
            Calorie Tracker
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="rounded-lg bg-destructive/10 p-4 text-sm text-destructive">
            {error}
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Flame className="h-5 w-5" />
          Calorie Tracker
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Daily Calorie Progress */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <h3 className="font-semibold">Daily Calories</h3>
              <Badge
                variant={
                  calorieProgress < 80
                    ? 'default'
                    : calorieProgress <= 110
                      ? 'secondary'
                      : 'destructive'
                }
              >
                {progressStatus}
              </Badge>
            </div>
            <p className="text-sm text-muted-foreground">
              {caloriesConsumed.toLocaleString()} / {calorieTarget.toLocaleString()} kcal
            </p>
          </div>

          <Progress value={calorieProgress} className="h-3" indicatorClassName={progressColor} />

          <div className="grid grid-cols-3 gap-4 text-center">
            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Utensils className="h-3 w-3" />
                Consumed
              </div>
              <p className="mt-1 text-lg font-bold">{caloriesConsumed}</p>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Dumbbell className="h-3 w-3" />
                Burned
              </div>
              <p className="mt-1 text-lg font-bold">{caloriesBurned}</p>
            </div>

            <div className="rounded-lg bg-muted p-3">
              <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
                <Target className="h-3 w-3" />
                Remaining
              </div>
              <p
                className={`mt-1 text-lg font-bold ${
                  remainingCalories < 0 ? 'text-red-500' : 'text-green-600'
                }`}
              >
                {remainingCalories >= 0 ? remainingCalories : 0}
              </p>
            </div>
          </div>
        </div>

        {/* Net Calories */}
        <div className="rounded-lg border bg-muted/50 p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-sm font-medium">Net Calories</span>
              {netCalories > caloriesConsumed * 0.5 ? (
                <TrendingUp className="h-4 w-4 text-green-600" />
              ) : (
                <TrendingDown className="h-4 w-4 text-blue-600" />
              )}
            </div>
            <div className="text-right">
              <p className="text-2xl font-bold">{netCalories}</p>
              <p className="text-xs text-muted-foreground">
                {caloriesConsumed} - {caloriesBurned} kcal
              </p>
            </div>
          </div>
        </div>

        {/* Macro Breakdown */}
        <div className="space-y-4">
          <h3 className="font-semibold">Macros</h3>

          {macros.map((macro) => {
            const progress = Math.min((macro.current / macro.target) * 100, 150)

            return (
              <div key={macro.name} className="space-y-2">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium">{macro.name}</span>
                  <span className="text-muted-foreground">
                    {Math.round(macro.current)}
                    {macro.unit} / {macro.target}
                    {macro.unit}
                  </span>
                </div>
                <Progress value={progress} className="h-2" indicatorClassName={macro.color} />
              </div>
            )
          })}
        </div>

        {/* Quick Actions Suggestion */}
        {remainingCalories > 500 && (
          <div className="rounded-lg bg-blue-500/10 p-3 text-sm text-blue-600">
            You have {remainingCalories} calories remaining today. Consider adding another meal or
            snack.
          </div>
        )}

        {remainingCalories < 0 && (
          <div className="rounded-lg bg-red-500/10 p-3 text-sm text-red-600">
            You've exceeded your daily calorie target by {Math.abs(remainingCalories)} calories.
          </div>
        )}
      </CardContent>
    </Card>
  )
}
