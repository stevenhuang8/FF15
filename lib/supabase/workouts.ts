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
  }
) {
  try {
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
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging workout:', error);
      return { data: null, error };
    }

    console.log('✅ Workout logged successfully:', data.id);
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
