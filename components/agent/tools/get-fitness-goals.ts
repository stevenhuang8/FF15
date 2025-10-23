import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { calculateGoalProgress } from '@/lib/supabase/health-metrics';

/**
 * Get Fitness Goals Tool
 *
 * Retrieves user's fitness goals from the fitness_goals table, including target values,
 * current progress, and achievement status.
 *
 * NOTE: This retrieves structured goals from the fitness_goals table, which is different
 * from the fitness_goals array in user_profiles (which is just text labels).
 */

export const getFitnessGoalsTool = tool({
  description:
    'Get user fitness goals including target values, current progress, and achievement status. ' +
    'Returns structured goals with metrics like target weight, calorie goals, muscle gain targets, etc. ' +
    'Use this when user asks about their goals, progress towards goals, or wants to review their targets. ' +
    'Can filter by status (active, achieved, abandoned).',

  inputSchema: z.object({
    userId: z.string().describe('The ID of the user whose fitness goals to retrieve'),
    status: z.enum(['active', 'achieved', 'abandoned', 'all']).default('all').describe(
      'Filter goals by status: "active" for current goals, "achieved" for completed, "abandoned" for cancelled, "all" for everything'
    ),
  }),

  execute: async ({ userId, status }) => {
    console.log(`🎯 Getting fitness goals for user: ${userId} (status: ${status})`);

    try {
      const supabase = await createClient();

      // Build query with optional status filter
      let query = supabase
        .from('fitness_goals')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (status !== 'all') {
        query = query.eq('status', status);
      }

      const { data: goals, error } = await query;

      if (error) {
        console.error('❌ Error fetching fitness goals:', error);
        throw error;
      }

      if (!goals || goals.length === 0) {
        console.log('ℹ️  No fitness goals found');
        return {
          hasGoals: false,
          message: status === 'all'
            ? 'No fitness goals have been set yet.'
            : `No ${status} fitness goals found.`,
        };
      }

      console.log(`✅ Retrieved ${goals.length} fitness goal(s)`);

      // Format goals with progress calculation
      const formattedGoals = goals.map((goal) => {
        const progress = calculateGoalProgress(goal);
        const isOnTrack = goal.target_date
          ? new Date(goal.target_date) > new Date()
          : null;

        return {
          id: goal.id,
          goalType: goal.goal_type,
          targetValue: goal.target_value,
          currentValue: goal.current_value,
          startingValue: goal.starting_value,
          unit: goal.unit,
          targetDate: goal.target_date,
          status: goal.status,
          progress: Math.round(progress * 10) / 10, // Round to 1 decimal
          progressPercentage: `${Math.round(progress)}%`,
          isOnTrack,
          createdAt: goal.created_at,
          updatedAt: goal.updated_at,
        };
      });

      // Summary statistics
      const summary = {
        total: formattedGoals.length,
        active: formattedGoals.filter((g) => g.status === 'active').length,
        achieved: formattedGoals.filter((g) => g.status === 'achieved').length,
        abandoned: formattedGoals.filter((g) => g.status === 'abandoned').length,
        avgProgress: formattedGoals.length > 0
          ? Math.round(
              formattedGoals.reduce((sum, g) => sum + g.progress, 0) / formattedGoals.length
            )
          : 0,
      };

      return {
        hasGoals: true,
        summary,
        goals: formattedGoals,
      };

    } catch (error) {
      console.error('💥 Exception getting fitness goals:', error);
      throw new Error(
        `Failed to retrieve fitness goals: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
});
