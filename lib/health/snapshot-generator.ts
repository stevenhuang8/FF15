/**
 * Progress Snapshot Generator
 *
 * Utility functions for generating and managing progress snapshots
 */

import { createClient } from '@/lib/supabase/client'
import {
  createProgressSnapshot,
  getLatestHealthMetrics,
} from '@/lib/supabase/health-metrics'

/**
 * Calculate average calories per day for a date range
 */
async function getAverageCalories(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<{ avgCalories: number; avgProtein: number }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('calorie_tracking')
    .select('total_calories_consumed, total_protein_consumed')
    .eq('user_id', userId)
    .gte('date', startDate.toISOString().split('T')[0])
    .lte('date', endDate.toISOString().split('T')[0])

  if (error || !data || data.length === 0) {
    return { avgCalories: 0, avgProtein: 0 }
  }

  const totalCalories = data.reduce((sum, day) => sum + (day.total_calories_consumed || 0), 0)
  const totalProtein = data.reduce((sum, day) => sum + (day.total_protein_consumed || 0), 0)

  return {
    avgCalories: Math.round(totalCalories / data.length),
    avgProtein: Math.round(totalProtein / data.length),
  }
}

/**
 * Count workouts in a date range
 */
async function countWorkouts(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<number> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('workout_logs')
    .select('id')
    .eq('user_id', userId)
    .gte('completed_at', startDate.toISOString())
    .lte('completed_at', endDate.toISOString())

  if (error || !data) {
    return 0
  }

  return data.length
}

/**
 * Generate a weekly progress snapshot
 */
export async function generateWeeklySnapshot(userId: string, date: Date = new Date()) {
  try {
    // Calculate date range (last 7 days)
    const endDate = new Date(date)
    const startDate = new Date(date)
    startDate.setDate(startDate.getDate() - 7)

    // Get latest health metrics
    const { data: latestMetrics } = await getLatestHealthMetrics(userId)

    // Get workout count for the week
    const workoutCount = await countWorkouts(userId, startDate, endDate)

    // Get average nutrition for the week
    const { avgCalories, avgProtein } = await getAverageCalories(userId, startDate, endDate)

    // Create the snapshot
    const snapshotData = {
      userId,
      date: endDate.toISOString().split('T')[0],
      weight: latestMetrics?.weight || undefined,
      bodyFatPercentage: latestMetrics?.body_fat_percentage || undefined,
      totalWorkoutsThisWeek: workoutCount,
      avgCaloriesPerDay: avgCalories || undefined,
      avgProteinPerDay: avgProtein || undefined,
      notes: `Auto-generated weekly snapshot`,
    }

    const { data, error } = await createProgressSnapshot(snapshotData)

    if (error) {
      console.error('Error creating weekly snapshot:', error)
      return { success: false, error }
    }

    console.log('✅ Weekly snapshot created successfully:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('Exception generating weekly snapshot:', error)
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Generate monthly snapshot
 */
export async function generateMonthlySnapshot(userId: string, date: Date = new Date()) {
  try {
    // Calculate date range (last 30 days)
    const endDate = new Date(date)
    const startDate = new Date(date)
    startDate.setDate(startDate.getDate() - 30)

    // Get latest health metrics
    const { data: latestMetrics } = await getLatestHealthMetrics(userId)

    // Get workout count for the month
    const workoutCount = await countWorkouts(userId, startDate, endDate)

    // Get average nutrition for the month
    const { avgCalories, avgProtein } = await getAverageCalories(userId, startDate, endDate)

    // Create the snapshot
    const snapshotData = {
      userId,
      date: endDate.toISOString().split('T')[0],
      weight: latestMetrics?.weight || undefined,
      bodyFatPercentage: latestMetrics?.body_fat_percentage || undefined,
      totalWorkoutsThisWeek: workoutCount, // Total for the month in this case
      avgCaloriesPerDay: avgCalories || undefined,
      avgProteinPerDay: avgProtein || undefined,
      notes: `Auto-generated monthly snapshot`,
    }

    const { data, error } = await createProgressSnapshot(snapshotData)

    if (error) {
      console.error('Error creating monthly snapshot:', error)
      return { success: false, error }
    }

    console.log('✅ Monthly snapshot created successfully:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('Exception generating monthly snapshot:', error)
    return {
      success: false,
      error: error instanceof Error ? error : new Error('Unknown error'),
    }
  }
}

/**
 * Check if a snapshot should be generated (e.g., weekly on Sundays)
 */
export function shouldGenerateWeeklySnapshot(lastSnapshotDate?: string): boolean {
  const today = new Date()
  const dayOfWeek = today.getDay() // 0 = Sunday

  // Generate on Sundays
  if (dayOfWeek !== 0) return false

  // If no last snapshot, generate one
  if (!lastSnapshotDate) return true

  // Check if last snapshot was more than 6 days ago
  const lastSnapshot = new Date(lastSnapshotDate)
  const daysSinceLastSnapshot = Math.floor(
    (today.getTime() - lastSnapshot.getTime()) / (1000 * 60 * 60 * 24)
  )

  return daysSinceLastSnapshot >= 7
}

/**
 * Auto-generate snapshot if needed
 */
export async function autoGenerateSnapshot(userId: string) {
  const supabase = createClient()

  // Get the most recent snapshot
  const { data: snapshots } = await supabase
    .from('progress_snapshots')
    .select('date')
    .eq('user_id', userId)
    .order('date', { ascending: false })
    .limit(1)

  const lastSnapshotDate = snapshots && snapshots.length > 0 ? snapshots[0].date : undefined

  if (shouldGenerateWeeklySnapshot(lastSnapshotDate)) {
    return await generateWeeklySnapshot(userId)
  }

  return { success: false, error: new Error('Snapshot not needed yet') }
}
