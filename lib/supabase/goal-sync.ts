/**
 * Goal Synchronization Utilities
 *
 * Automatically sync fitness goal progress with latest health metrics.
 * This ensures goal current_value stays up-to-date with user's actual weight/measurements.
 */

import { createClient } from '@/lib/supabase/client';
import { getLatestHealthMetrics } from './health-metrics';

/**
 * Sync weight-based goals with latest health metrics
 *
 * Updates current_value for active weight loss/gain goals based on
 * the user's most recent weight entry in health_metrics.
 *
 * Call this function:
 * - After logging new health metrics
 * - Before displaying goal progress
 * - Periodically (e.g., daily background job)
 */
export async function syncGoalProgress(userId: string) {
  console.log(`🔄 Syncing goal progress for user: ${userId}`);

  try {
    const supabase = createClient();

    // Get user's latest weight
    const { data: latestMetrics, error: metricsError } = await getLatestHealthMetrics(userId);

    if (metricsError || !latestMetrics || !latestMetrics.weight) {
      console.log('ℹ️  No health metrics available for goal sync');
      return { synced: 0, error: null };
    }

    const latestWeight = latestMetrics.weight;

    // Get all active weight-based goals
    const { data: goals, error: goalsError } = await supabase
      .from('fitness_goals')
      .select('*')
      .eq('user_id', userId)
      .eq('status', 'active')
      .in('goal_type', ['weight_loss', 'weight_gain']);

    if (goalsError) {
      console.error('❌ Error fetching goals for sync:', goalsError);
      return { synced: 0, error: goalsError };
    }

    if (!goals || goals.length === 0) {
      console.log('ℹ️  No active weight goals to sync');
      return { synced: 0, error: null };
    }

    // Update current_value for each goal
    let syncCount = 0;
    for (const goal of goals) {
      // Skip if current_value is already up-to-date
      if (goal.current_value === latestWeight) {
        continue;
      }

      const { error: updateError } = await supabase
        .from('fitness_goals')
        .update({ current_value: latestWeight })
        .eq('id', goal.id)
        .eq('user_id', userId);

      if (updateError) {
        console.error(`❌ Error updating goal ${goal.id}:`, updateError);
      } else {
        console.log(`✅ Updated goal ${goal.id}: ${goal.current_value} → ${latestWeight} ${goal.unit}`);
        syncCount++;
      }
    }

    console.log(`✅ Synced ${syncCount} goal(s) with latest weight: ${latestWeight}`);
    return { synced: syncCount, error: null };

  } catch (error) {
    console.error('💥 Exception syncing goal progress:', error);
    return {
      synced: 0,
      error: error instanceof Error ? error : new Error('Unknown error syncing goals'),
    };
  }
}

/**
 * Check if a goal has been achieved and update status
 *
 * For weight loss: achieved when current_value <= target_value
 * For weight gain: achieved when current_value >= target_value
 */
export async function checkGoalAchievement(userId: string, goalId: string) {
  console.log(`🎯 Checking achievement for goal: ${goalId}`);

  try {
    const supabase = createClient();

    const { data: goal, error: goalError } = await supabase
      .from('fitness_goals')
      .select('*')
      .eq('id', goalId)
      .eq('user_id', userId)
      .eq('status', 'active')
      .single();

    if (goalError || !goal) {
      console.error('❌ Error fetching goal:', goalError);
      return { achieved: false, error: goalError };
    }

    if (!goal.current_value || !goal.target_value) {
      return { achieved: false, error: null };
    }

    let isAchieved = false;

    // Weight loss: achieved when current <= target
    if (goal.goal_type === 'weight_loss') {
      isAchieved = goal.current_value <= goal.target_value;
    }
    // Weight gain: achieved when current >= target
    else if (goal.goal_type === 'weight_gain') {
      isAchieved = goal.current_value >= goal.target_value;
    }
    // Other goals: simple >= check
    else {
      isAchieved = goal.current_value >= goal.target_value;
    }

    if (isAchieved && goal.status === 'active') {
      // Update status to achieved
      const { error: updateError } = await supabase
        .from('fitness_goals')
        .update({ status: 'achieved' })
        .eq('id', goalId)
        .eq('user_id', userId);

      if (updateError) {
        console.error('❌ Error updating goal status:', updateError);
        return { achieved: false, error: updateError };
      }

      console.log(`🎉 Goal ${goalId} marked as achieved!`);
      return { achieved: true, error: null };
    }

    return { achieved: isAchieved, error: null };

  } catch (error) {
    console.error('💥 Exception checking goal achievement:', error);
    return {
      achieved: false,
      error: error instanceof Error ? error : new Error('Unknown error checking achievement'),
    };
  }
}
