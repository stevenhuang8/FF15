import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Get Workout Streak Tool
 *
 * Retrieves user's workout streak information including current consecutive days
 * with workouts and their longest streak ever.
 *
 * Also provides this week's workout count for motivation and tracking.
 */

export const getWorkoutStreakTool = tool({
  description:
    'Get user workout streak information including current streak (consecutive days with workouts), ' +
    'longest streak ever achieved, and number of workouts completed this week. ' +
    'Use this when user asks about their consistency, workout streak, or how active they\'ve been recently.',

  inputSchema: z.object({
    userId: z.string().describe('The ID of the user whose workout streak to retrieve'),
  }),

  execute: async ({ userId }) => {
    console.log(`🔥 Getting workout streak for user: ${userId}`);

    try {
      const supabase = await createClient();

      // Fetch data in parallel
      const [thisWeekResult, allLogsResult] = await Promise.all([
        // This week's workout count
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

      if (thisWeekResult.error) {
        console.error('❌ Error fetching this week workouts:', thisWeekResult.error);
      }
      if (allLogsResult.error) {
        console.error('❌ Error fetching workout logs:', allLogsResult.error);
        throw allLogsResult.error;
      }

      const thisWeekCount = thisWeekResult.count || 0;
      const workoutLogs = allLogsResult.data || [];

      // Calculate streaks
      const { currentStreak, longestStreak } = calculateWorkoutStreak(workoutLogs);

      console.log(`✅ Workout streak retrieved: ${currentStreak} current, ${longestStreak} longest`);

      return {
        currentStreak,
        longestStreak,
        thisWeekWorkouts: thisWeekCount,
        streakStatus: getStreakStatus(currentStreak),
        encouragement: getEncouragementMessage(currentStreak, longestStreak),
      };

    } catch (error) {
      console.error('💥 Exception getting workout streak:', error);
      throw new Error(
        `Failed to retrieve workout streak: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
});

/**
 * Calculate workout streak from workout logs
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

/**
 * Get streak status description
 */
function getStreakStatus(currentStreak: number): string {
  if (currentStreak === 0) return 'No active streak';
  if (currentStreak === 1) return 'Streak just started!';
  if (currentStreak < 7) return 'Building momentum';
  if (currentStreak < 14) return 'On fire!';
  if (currentStreak < 30) return 'Incredible consistency';
  return 'Legendary streak!';
}

/**
 * Get encouragement message based on streak
 */
function getEncouragementMessage(currentStreak: number, longestStreak: number): string {
  if (currentStreak === 0) {
    if (longestStreak > 0) {
      return `You've had a ${longestStreak}-day streak before - you can do it again!`;
    }
    return 'Start your streak today!';
  }

  if (currentStreak === longestStreak && currentStreak > 0) {
    return `This is your longest streak ever! Keep it going! 🔥`;
  }

  if (currentStreak > 0 && longestStreak > currentStreak) {
    const daysToRecord = longestStreak - currentStreak;
    return `${daysToRecord} more day${daysToRecord === 1 ? '' : 's'} to match your record!`;
  }

  return 'Keep up the great work!';
}
