/**
 * Supabase Health Metrics Operations
 *
 * Database functions for managing health metrics, fitness goals, and progress snapshots
 */

import { createClient } from '@/lib/supabase/client';
import type { TablesInsert, TablesUpdate, Tables } from '@/types/supabase';

// ============================================================================
// Health Metrics Operations
// ============================================================================

/**
 * Log health metrics for a specific date
 */
export async function logHealthMetrics(params: {
  userId: string;
  date: string; // ISO date string (YYYY-MM-DD)
  weight?: number;
  bodyFatPercentage?: number;
  waist?: number;
  chest?: number;
  hips?: number;
  arms?: number;
  thighs?: number;
  notes?: string;
}) {
  const supabase = createClient();

  try {
    const metricsData: TablesInsert<'health_metrics'> = {
      user_id: params.userId,
      date: params.date,
      weight: params.weight || null,
      body_fat_percentage: params.bodyFatPercentage || null,
      waist: params.waist || null,
      chest: params.chest || null,
      hips: params.hips || null,
      arms: params.arms || null,
      thighs: params.thighs || null,
      notes: params.notes || null,
    };

    const { data, error } = await supabase
      .from('health_metrics')
      .upsert(metricsData, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error logging health metrics:', error);
      return { data: null, error };
    }

    console.log('✅ Health metrics logged successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('Exception logging health metrics:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error logging health metrics'),
    };
  }
}

/**
 * Get health metrics for a user within a date range
 */
export async function getHealthMetrics(
  userId: string,
  startDate?: string,
  endDate?: string,
  limit = 100
) {
  const supabase = createClient();

  try {
    let query = supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching health metrics:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching health metrics:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching health metrics'),
    };
  }
}

/**
 * Get health metrics for a specific date
 */
export async function getHealthMetricsByDate(userId: string, date: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', userId)
      .eq('date', date)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return { data: null, error: null };
      }
      console.error('Error fetching health metrics:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching health metrics:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching health metrics'),
    };
  }
}

/**
 * Get the most recent health metrics
 */
export async function getLatestHealthMetrics(userId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('health_metrics')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(1)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return { data: null, error: null };
      }
      console.error('Error fetching latest health metrics:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching latest health metrics:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching latest health metrics'),
    };
  }
}

/**
 * Delete health metrics for a specific date
 */
export async function deleteHealthMetrics(userId: string, date: string) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('health_metrics')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);

    if (error) {
      console.error('Error deleting health metrics:', error);
      return { error };
    }

    console.log('✅ Health metrics deleted successfully for date:', date);
    return { error: null };
  } catch (error) {
    console.error('Exception deleting health metrics:', error);
    return {
      error: error instanceof Error ? error : new Error('Unknown error deleting health metrics'),
    };
  }
}

// ============================================================================
// Fitness Goals Operations
// ============================================================================

/**
 * Create a new fitness goal
 */
export async function createFitnessGoal(params: {
  userId: string;
  goalType: string;
  targetValue: number;
  currentValue?: number;
  unit?: string;
  targetDate?: string;
}) {
  const supabase = createClient();

  try {
    const goalData: TablesInsert<'fitness_goals'> = {
      user_id: params.userId,
      goal_type: params.goalType,
      target_value: params.targetValue,
      current_value: params.currentValue || null,
      unit: params.unit || null,
      target_date: params.targetDate || null,
      status: 'active',
    };

    const { data, error } = await supabase
      .from('fitness_goals')
      .insert(goalData)
      .select()
      .single();

    if (error) {
      console.error('Error creating fitness goal:', error);
      return { data: null, error };
    }

    console.log('✅ Fitness goal created successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('Exception creating fitness goal:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error creating fitness goal'),
    };
  }
}

/**
 * Get all fitness goals for a user
 */
export async function getFitnessGoals(userId: string, status?: string) {
  const supabase = createClient();

  try {
    let query = supabase
      .from('fitness_goals')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (status) {
      query = query.eq('status', status);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching fitness goals:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching fitness goals:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching fitness goals'),
    };
  }
}

/**
 * Get a specific fitness goal
 */
export async function getFitnessGoal(goalId: string, userId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('fitness_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching fitness goal:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching fitness goal:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching fitness goal'),
    };
  }
}

/**
 * Update a fitness goal
 */
export async function updateFitnessGoal(
  goalId: string,
  userId: string,
  updates: TablesUpdate<'fitness_goals'>
) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('fitness_goals')
      .update(updates)
      .eq('id', goalId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating fitness goal:', error);
      return { data: null, error };
    }

    console.log('✅ Fitness goal updated successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('Exception updating fitness goal:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error updating fitness goal'),
    };
  }
}

/**
 * Delete a fitness goal
 */
export async function deleteFitnessGoal(goalId: string, userId: string) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('fitness_goals')
      .delete()
      .eq('id', goalId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting fitness goal:', error);
      return { error };
    }

    console.log('✅ Fitness goal deleted successfully:', goalId);
    return { error: null };
  } catch (error) {
    console.error('Exception deleting fitness goal:', error);
    return {
      error: error instanceof Error ? error : new Error('Unknown error deleting fitness goal'),
    };
  }
}

// ============================================================================
// Progress Snapshots Operations
// ============================================================================

/**
 * Create a progress snapshot
 */
export async function createProgressSnapshot(params: {
  userId: string;
  date: string;
  weight?: number;
  bodyFatPercentage?: number;
  totalWorkoutsThisWeek?: number;
  avgCaloriesPerDay?: number;
  avgProteinPerDay?: number;
  notes?: string;
}) {
  const supabase = createClient();

  try {
    const snapshotData: TablesInsert<'progress_snapshots'> = {
      user_id: params.userId,
      date: params.date,
      weight: params.weight || null,
      body_fat_percentage: params.bodyFatPercentage || null,
      total_workouts_this_week: params.totalWorkoutsThisWeek || null,
      avg_calories_per_day: params.avgCaloriesPerDay || null,
      avg_protein_per_day: params.avgProteinPerDay || null,
      notes: params.notes || null,
    };

    const { data, error } = await supabase
      .from('progress_snapshots')
      .upsert(snapshotData, {
        onConflict: 'user_id,date',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating progress snapshot:', error);
      return { data: null, error };
    }

    console.log('✅ Progress snapshot created successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('Exception creating progress snapshot:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error creating progress snapshot'),
    };
  }
}

/**
 * Get progress snapshots for a user
 */
export async function getProgressSnapshots(
  userId: string,
  startDate?: string,
  endDate?: string,
  limit = 52 // Default to 1 year of weekly snapshots
) {
  const supabase = createClient();

  try {
    let query = supabase
      .from('progress_snapshots')
      .select('*')
      .eq('user_id', userId)
      .order('date', { ascending: false })
      .limit(limit);

    if (startDate) {
      query = query.gte('date', startDate);
    }

    if (endDate) {
      query = query.lte('date', endDate);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching progress snapshots:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching progress snapshots:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching progress snapshots'),
    };
  }
}

/**
 * Delete a progress snapshot
 */
export async function deleteProgressSnapshot(userId: string, date: string) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('progress_snapshots')
      .delete()
      .eq('user_id', userId)
      .eq('date', date);

    if (error) {
      console.error('Error deleting progress snapshot:', error);
      return { error };
    }

    console.log('✅ Progress snapshot deleted successfully for date:', date);
    return { error: null };
  } catch (error) {
    console.error('Exception deleting progress snapshot:', error);
    return {
      error: error instanceof Error ? error : new Error('Unknown error deleting progress snapshot'),
    };
  }
}

// ============================================================================
// Analytics & Helper Functions
// ============================================================================

/**
 * Calculate goal progress percentage
 */
export function calculateGoalProgress(goal: Tables<'fitness_goals'>): number {
  if (!goal.current_value || !goal.target_value) return 0;

  const progress = (goal.current_value / goal.target_value) * 100;

  // For goals like weight loss, we may need to invert the calculation
  // This can be extended based on goal_type
  return Math.min(Math.max(progress, 0), 100); // Clamp between 0-100
}

/**
 * Get weight trend (last N days)
 */
export async function getWeightTrend(userId: string, days: number = 30) {
  const supabase = createClient();

  try {
    const startDate = new Date();
    startDate.setDate(startDate.getDate() - days);

    const { data, error } = await supabase
      .from('health_metrics')
      .select('date, weight')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .not('weight', 'is', null)
      .order('date', { ascending: true });

    if (error) {
      console.error('Error fetching weight trend:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching weight trend:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching weight trend'),
    };
  }
}

/**
 * Get comprehensive dashboard data
 */
export async function getDashboardData(userId: string) {
  const supabase = createClient();

  try {
    // Fetch all data in parallel
    const [
      { data: latestMetrics },
      { data: activeGoals },
      { data: recentSnapshots },
      { data: weightTrend },
    ] = await Promise.all([
      getLatestHealthMetrics(userId),
      getFitnessGoals(userId, 'active'),
      getProgressSnapshots(userId, undefined, undefined, 12), // Last 12 weeks
      getWeightTrend(userId, 90), // Last 90 days
    ]);

    return {
      data: {
        latestMetrics,
        activeGoals: activeGoals || [],
        recentSnapshots: recentSnapshots || [],
        weightTrend: weightTrend || [],
      },
      error: null,
    };
  } catch (error) {
    console.error('Exception fetching dashboard data:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching dashboard data'),
    };
  }
}
