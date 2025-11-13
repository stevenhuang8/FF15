/**
 * Shared types for history views (workouts, meals)
 */

export interface WeekGroup<T> {
  weekLabel: string
  weekKey: string // Unique identifier for the week (e.g., "2025-W02")
  startDate: Date
  endDate: Date
  items: T[]
}

export interface WorkoutWeekStats {
  totalWorkouts: number
  totalDuration: number // in minutes
  totalCalories: number
  avgDuration: number
  avgCalories: number
}

export interface MealWeekStats {
  totalCalories: number
  avgDailyCalories: number
  totalProtein: number
  totalCarbs: number
  totalFats: number
  daysWithMeals: number
}

export interface DayGroup<T> {
  dateLabel: string
  date: Date
  items: T[]
}
