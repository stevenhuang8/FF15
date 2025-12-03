/**
 * Supabase Workout Operations
 *
 * Database functions for saving and managing workout plans
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { ExtractedWorkout } from '@/types/workout';
import type { TablesInsert } from '@/types/supabase';

/**
 * Saves an extracted workout to the database
 */
export async function saveWorkout(params: {
  workout: ExtractedWorkout;
  userId: string;
  conversationId?: string;
  messageId?: string;
}) {
  const { workout, userId, conversationId, messageId } = params;

  const supabase = createClient();

  try {
    // Convert duration to minutes for database storage
    const estimatedDurationMinutes = parseTimeToMinutes(workout.metadata.estimatedDuration);

    // Prepare the workout data for insertion
    const workoutData: TablesInsert<'workout_plans'> = {
      user_id: userId,
      title: workout.title,
      description: workout.description || null,
      category: workout.category,
      exercises: workout.exercises as any, // JSON type
      conversation_id: conversationId || null,
      message_id: messageId || null,
      estimated_duration_minutes: estimatedDurationMinutes,
      difficulty: workout.metadata.difficulty || null,
    };

    const { data, error } = await supabase
      .from('workout_plans')
      .insert(workoutData)
      .select()
      .single();

    if (error) {
      console.error('Error saving workout:', error);
      return { data: null, error };
    }

    console.log('✅ Workout saved successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('Exception saving workout:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error saving workout'),
    };
  }
}

/**
 * Retrieves all saved workout plans for a user
 */
export async function getWorkouts(userId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching workouts:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching workouts:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching workouts'),
    };
  }
}

/**
 * Retrieves a single workout plan by ID
 */
export async function getWorkout(workoutId: string, userId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('id', workoutId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching workout:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching workout:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching workout'),
    };
  }
}

/**
 * Updates a saved workout plan
 */
export async function updateWorkout(
  workoutId: string,
  userId: string,
  updates: Partial<TablesInsert<'workout_plans'>>
) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .update(updates)
      .eq('id', workoutId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating workout:', error);
      return { data: null, error };
    }

    console.log('✅ Workout updated successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('Exception updating workout:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error updating workout'),
    };
  }
}

/**
 * Deletes a saved workout plan
 */
export async function deleteWorkout(workoutId: string, userId: string) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('workout_plans')
      .delete()
      .eq('id', workoutId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting workout:', error);
      return { error };
    }

    console.log('✅ Workout deleted successfully:', workoutId);
    return { error: null };
  } catch (error) {
    console.error('Exception deleting workout:', error);
    return {
      error: error instanceof Error ? error : new Error('Unknown error deleting workout'),
    };
  }
}

/**
 * Searches workout plans by title or category
 */
export async function searchWorkouts(userId: string, query: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('workout_plans')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,category.eq.${query.toLowerCase()}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching workouts:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception searching workouts:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error searching workouts'),
    };
  }
}

/**
 * Logs a completed workout session
 */
export async function logWorkout(
  supabase: SupabaseClient,
  params: {
    userId: string;
    workoutPlanId?: string;
    title: string;
    exercisesPerformed: any[]; // JSON type from DB
    totalDurationMinutes: number;
    caloriesBurned?: number;
    intensity: 'low' | 'medium' | 'high';
    notes?: string;
    completedAt?: Date; // NEW: Optional date for when workout was completed
  }
) {
  try {
    // Use provided completedAt date or default to current time
    const workoutDate = params.completedAt || new Date();

    const { data, error } = await supabase
      .from('workout_logs')
      .insert({
        user_id: params.userId,
        workout_plan_id: params.workoutPlanId || null,
        title: params.title,
        exercises_performed: params.exercisesPerformed,
        total_duration_minutes: params.totalDurationMinutes,
        calories_burned: params.caloriesBurned || null,
        intensity: params.intensity,
        notes: params.notes || null,
        completed_at: workoutDate.toISOString(), // NEW: Set the completion date
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging workout:', error);
      return { data: null, error };
    }

    console.log('✅ Workout logged successfully:', data.id, 'for date:', workoutDate.toISOString());

    // Update daily calorie tracking (pass the authenticated supabase client)
    // Use the workout date for calorie tracking, not "now"
    const { updateDailyCalorieTracking } = await import('@/lib/nutrition/meal-logging');
    await updateDailyCalorieTracking(params.userId, workoutDate, supabase);

    return { data, error: null };
  } catch (error) {
    console.error('Exception logging workout:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error logging workout'),
    };
  }
}

/**
 * Retrieves workout logs for a user
 */
export async function getWorkoutLogs(userId: string, limit = 50) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .select('*')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Error fetching workout logs:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching workout logs:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching workout logs'),
    };
  }
}

/**
 * Gets the count of workouts completed in the current week (Monday-Sunday)
 * Used for real-time dashboard statistics
 * Aligns with workout frequency chart week grouping
 */
export async function getWorkoutCountThisWeek(userId: string): Promise<number> {
  const supabase = createClient();

  try {
    // Import shared week calculation utility
    const { getWeekStart } = await import('@/lib/utils');

    // Get start of current week (Monday at 00:00:00)
    const now = new Date();
    const weekStart = getWeekStart(now);
    const weekStartISO = weekStart.toISOString();

    const { count, error } = await supabase
      .from('workout_logs')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .gte('completed_at', weekStartISO);

    if (error) {
      console.error('Error counting workouts this week:', error);
      return 0;
    }

    return count || 0;
  } catch (error) {
    console.error('Exception counting workouts this week:', error);
    return 0;
  }
}

/**
 * Calculates the current workout streak (consecutive days with workouts)
 * Uses user's local timezone for date grouping
 * Strict rules: missing one day breaks the streak
 */
export async function calculateWorkoutStreak(userId: string): Promise<{
  currentStreak: number;
  longestStreak: number;
}> {
  const supabase = createClient();

  try {
    // Fetch all workout logs ordered by completion date descending
    const { data: workoutLogs, error } = await supabase
      .from('workout_logs')
      .select('completed_at')
      .eq('user_id', userId)
      .order('completed_at', { ascending: false });

    if (error) {
      console.error('Error fetching workout logs for streak:', error);
      return { currentStreak: 0, longestStreak: 0 };
    }

    if (!workoutLogs || workoutLogs.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Convert timestamps to local dates (YYYY-MM-DD format) and dedupe
    const workoutDates = Array.from(
      new Set(
        workoutLogs.map((log) => {
          const date = new Date(log.completed_at);
          // Convert to local date string (YYYY-MM-DD)
          return date.toLocaleDateString('en-CA'); // en-CA gives YYYY-MM-DD format
        })
      )
    ).sort((a, b) => b.localeCompare(a)); // Sort descending (most recent first)

    if (workoutDates.length === 0) {
      return { currentStreak: 0, longestStreak: 0 };
    }

    // Calculate current streak
    let currentStreak = 0;
    const today = new Date().toLocaleDateString('en-CA');
    const yesterday = new Date(Date.now() - 86400000).toLocaleDateString('en-CA');

    // Start from today or most recent workout
    let expectedDate = workoutDates[0];

    // Check if streak is active (last workout today or yesterday)
    if (expectedDate !== today && expectedDate !== yesterday) {
      // Streak is broken - last workout was 2+ days ago
      currentStreak = 0;
    } else {
      // Streak is active - count backwards
      expectedDate = today; // Start counting from today

      for (const workoutDate of workoutDates) {
        if (workoutDate === expectedDate) {
          currentStreak++;
          // Move to previous day
          const prevDate = new Date(expectedDate);
          prevDate.setDate(prevDate.getDate() - 1);
          expectedDate = prevDate.toLocaleDateString('en-CA');
        } else {
          // Check if there's a gap
          const workoutDateTime = new Date(workoutDate).getTime();
          const expectedDateTime = new Date(expectedDate).getTime();

          if (workoutDateTime < expectedDateTime) {
            // Gap found - streak ends
            break;
          }
        }
      }
    }

    // Calculate longest streak (scan through all dates)
    let longestStreak = 0;
    let tempStreak = 1;

    for (let i = 0; i < workoutDates.length - 1; i++) {
      const currentDate = new Date(workoutDates[i]);
      const nextDate = new Date(workoutDates[i + 1]);

      // Calculate difference in days
      const diffTime = currentDate.getTime() - nextDate.getTime();
      const diffDays = Math.round(diffTime / 86400000);

      if (diffDays === 1) {
        // Consecutive day
        tempStreak++;
      } else {
        // Gap found - check if this was the longest streak
        longestStreak = Math.max(longestStreak, tempStreak);
        tempStreak = 1;
      }
    }

    // Final check for longest streak
    longestStreak = Math.max(longestStreak, tempStreak);

    return { currentStreak, longestStreak };
  } catch (error) {
    console.error('Exception calculating workout streak:', error);
    return { currentStreak: 0, longestStreak: 0 };
  }
}

/**
 * Deletes a workout log
 */
export async function deleteWorkoutLog(workoutLogId: string, userId: string) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('workout_logs')
      .delete()
      .eq('id', workoutLogId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting workout log:', error);
      return { error };
    }

    console.log('✅ Workout log deleted successfully:', workoutLogId);

    // Update daily calorie tracking (pass the supabase client)
    const { updateDailyCalorieTracking } = await import('@/lib/nutrition/meal-logging');
    await updateDailyCalorieTracking(userId, new Date(), supabase);

    return { error: null };
  } catch (error) {
    console.error('Exception deleting workout log:', error);
    return {
      error: error instanceof Error ? error : new Error('Unknown error deleting workout log'),
    };
  }
}

/**
 * Updates a workout log
 */
export async function updateWorkoutLog(
  workoutLogId: string,
  userId: string,
  updates: {
    title?: string;
    exercises_performed?: any[];
    total_duration_minutes?: number;
    calories_burned?: number | null;
    intensity?: 'low' | 'medium' | 'high';
    notes?: string | null;
    completed_at?: string;
  }
) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('workout_logs')
      .update(updates)
      .eq('id', workoutLogId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating workout log:', error);
      return { data: null, error };
    }

    console.log('✅ Workout log updated successfully:', workoutLogId);

    // Update daily calorie tracking (pass the supabase client)
    const { updateDailyCalorieTracking } = await import('@/lib/nutrition/meal-logging');
    await updateDailyCalorieTracking(userId, new Date(), supabase);

    return { data, error: null };
  } catch (error) {
    console.error('Exception updating workout log:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error updating workout log'),
    };
  }
}

/**
 * Utility function to parse time strings like "30 minutes" or "1 hour" to minutes
 */
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;

  const lowerTime = timeStr.toLowerCase();

  // Parse hours
  const hoursMatch = lowerTime.match(/(\d+)\s*(?:hour|hr)/);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;

  // Parse minutes
  const minutesMatch = lowerTime.match(/(\d+)\s*(?:minute|min)/);
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}
