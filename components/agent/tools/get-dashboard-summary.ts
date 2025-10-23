import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { calculateGoalProgress } from '@/lib/supabase/health-metrics';

/**
 * Get Dashboard Summary Tool
 *
 * Retrieves comprehensive dashboard data including current weight, active fitness goals,
 * workout streak, weight trend, and progress metrics.
 *
 * This is the primary tool for understanding a user's current health and fitness status.
 */

export const getDashboardSummary = tool({
  description:
    'Get comprehensive dashboard summary including current weight, weight trend, active fitness goals with progress, workout streak (current and longest), and recent activity. ' +
    'Use this to understand the user\'s current health status, progress towards goals, and activity patterns. ' +
    'CRITICAL: Use this proactively when user asks about their progress, current status, goals, or wants to know how they\'re doing.',

  inputSchema: z.object({
    userId: z.string().describe('The ID of the user whose dashboard data to retrieve'),
  }),

  execute: async ({ userId }) => {
    console.log(`📊 Getting dashboard summary for user: ${userId}`);

    try {
      const supabase = await createClient();

      // Fetch all data in parallel
      const [
        latestMetricsResult,
        activeGoalsResult,
        weightTrendResult,
        thisWeekWorkoutsResult,
        workoutLogsResult,
      ] = await Promise.all([
        // Latest health metrics
        supabase
          .from('health_metrics')
          .select('*')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle(),

        // Active goals (including achieved for stats)
        supabase
          .from('fitness_goals')
          .select('*')
          .eq('user_id', userId)
          .order('created_at', { ascending: false }),

        // Weight trend (last 90 days)
        supabase
          .from('health_metrics')
          .select('date, weight')
          .eq('user_id', userId)
          .gte('date', new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString().split('T')[0])
          .not('weight', 'is', null)
          .order('date', { ascending: true }),

        // Workouts this week
        supabase
          .from('workout_logs')
          .select('id', { count: 'exact', head: true })
          .eq('user_id', userId)
          .gte('completed_at', new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),

        // All workout logs for streak calculation
        supabase
          .from('workout_logs')
          .select('completed_at')
          .eq('user_id', userId)
          .order('completed_at', { ascending: false }),
      ]);

      if (latestMetricsResult.error) {
        console.error('❌ Error fetching latest metrics:', latestMetricsResult.error);
      }
      if (activeGoalsResult.error) {
        console.error('❌ Error fetching goals:', activeGoalsResult.error);
      }
      if (weightTrendResult.error) {
        console.error('❌ Error fetching weight trend:', weightTrendResult.error);
      }
      if (thisWeekWorkoutsResult.error) {
        console.error('❌ Error fetching this week workouts:', thisWeekWorkoutsResult.error);
      }
      if (workoutLogsResult.error) {
        console.error('❌ Error fetching workout logs:', workoutLogsResult.error);
      }

      const latestMetrics = latestMetricsResult.data;
      const activeGoals = activeGoalsResult.data || [];
      const weightTrend = weightTrendResult.data || [];
      const thisWeekWorkoutsCount = thisWeekWorkoutsResult.count || 0;
      const workoutLogs = workoutLogsResult.data || [];

      // Calculate workout streak
      const { currentStreak, longestStreak } = calculateWorkoutStreak(workoutLogs);

      console.log('✅ Dashboard data retrieved successfully');

      // Format the dashboard summary in a structured way
      const summary = {
        hasData: !!(latestMetrics || activeGoals.length > 0 || workoutLogs.length > 0),

        // Current health metrics
        currentWeight: latestMetrics?.weight || null,
        currentBodyFat: latestMetrics?.body_fat_percentage || null,
        latestMetricsDate: latestMetrics?.date || null,

        // Body measurements (if available)
        measurements: latestMetrics ? {
          waist: latestMetrics.waist || null,
          chest: latestMetrics.chest || null,
          hips: latestMetrics.hips || null,
          arms: latestMetrics.arms || null,
          thighs: latestMetrics.thighs || null,
        } : null,

        // Weight trend (last 90 days)
        weightTrend: {
          data: weightTrend,
          changeFromStart: calculateWeightChange(weightTrend),
        },

        // Active fitness goals with proper progress calculation
        activeGoals: activeGoals.map((goal) => ({
          id: goal.id,
          goalType: goal.goal_type,
          targetValue: goal.target_value,
          currentValue: goal.current_value,
          startingValue: goal.starting_value,
          unit: goal.unit,
          targetDate: goal.target_date,
          status: goal.status,
          progress: Math.round(calculateGoalProgress(goal) * 10) / 10, // Round to 1 decimal
        })),

        // Workout activity
        workoutActivity: {
          thisWeekCount: thisWeekWorkoutsCount,
          currentStreak,
          longestStreak,
        },

        // Summary statistics
        statistics: {
          totalActiveGoals: activeGoals.filter((g) => g.status === 'active').length,
          totalAchievedGoals: activeGoals.filter((g) => g.status === 'achieved').length,
        },
      };

      return summary;

    } catch (error) {
      console.error('💥 Exception getting dashboard summary:', error);
      throw new Error(
        `Failed to retrieve dashboard summary: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
});

/**
 * Calculate weight change from trend data
 */
function calculateWeightChange(
  weightTrend: Array<{ date: string; weight: number | null }>
): number | null {
  if (weightTrend.length < 2) return null;

  const first = weightTrend[0]?.weight;
  const last = weightTrend[weightTrend.length - 1]?.weight;

  if (!first || !last) return null;

  return last - first;
}

/**
 * Calculate workout streak from workout logs
 * Inlined from lib/supabase/workouts.ts for server-side compatibility
 */
function calculateWorkoutStreak(workoutLogs: Array<{ completed_at: string | null }>): {
  currentStreak: number;
  longestStreak: number;
} {
  if (!workoutLogs || workoutLogs.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Group workouts by date (YYYY-MM-DD)
  const workoutDates = new Set(
    workoutLogs
      .map((log) => log.completed_at?.split('T')[0])
      .filter((date): date is string => !!date)
  );

  const sortedDates = Array.from(workoutDates).sort().reverse(); // Most recent first

  if (sortedDates.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Calculate current streak
  let currentStreak = 0;
  const today = new Date().toISOString().split('T')[0];
  let checkDate = new Date(today);

  for (const dateStr of sortedDates) {
    const workoutDate = dateStr;
    const checkDateStr = checkDate.toISOString().split('T')[0];

    if (workoutDate === checkDateStr) {
      currentStreak++;
      checkDate.setDate(checkDate.getDate() - 1);
    } else {
      break;
    }
  }

  // Calculate longest streak
  let longestStreak = 0;
  let tempStreak = 1;

  for (let i = 0; i < sortedDates.length - 1; i++) {
    const currentDate = new Date(sortedDates[i]);
    const nextDate = new Date(sortedDates[i + 1]);
    const diffDays = Math.floor((currentDate.getTime() - nextDate.getTime()) / (1000 * 60 * 60 * 24));

    if (diffDays === 1) {
      tempStreak++;
    } else {
      longestStreak = Math.max(longestStreak, tempStreak);
      tempStreak = 1;
    }
  }
  longestStreak = Math.max(longestStreak, tempStreak);

  return { currentStreak, longestStreak };
}
