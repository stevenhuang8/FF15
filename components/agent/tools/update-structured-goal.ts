import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Update Structured Fitness Goal Tool
 *
 * Updates an existing structured fitness goal's target value, target date, or status.
 * Use this when the user wants to change their goal (e.g., "change my weight loss goal to 200 lbs").
 */

export const updateStructuredGoalTool = tool({
  description:
    'Update an existing structured fitness goal (change target value, target date, or status). ' +
    'Use this when user wants to modify their active goal, like "change my weight loss goal to 200 lbs" or "update target date". ' +
    'First use get-fitness-goals to find the goal ID, then update it.',

  inputSchema: z.object({
    userId: z.string().describe('The ID of the user'),
    goalId: z
      .string()
      .optional()
      .describe(
        'ID of the specific goal to update. If not provided, will update the most recent active goal of the specified type.'
      ),
    goalType: z
      .enum([
        'weight_loss',
        'weight_gain',
        'muscle_gain',
        'body_fat_reduction',
        'calorie_target',
        'workout_frequency',
      ])
      .optional()
      .describe('Type of goal to update (required if goalId not provided)'),
    targetValue: z.number().optional().describe('New target value'),
    targetDate: z.string().optional().describe('New target date in YYYY-MM-DD format'),
    status: z
      .enum(['active', 'achieved', 'abandoned'])
      .optional()
      .describe('Update goal status'),
  }),

  execute: async ({ userId, goalId, goalType, targetValue, targetDate, status }) => {
    console.log(`🎯 Updating structured fitness goal for user: ${userId}`);

    try {
      const supabase = await createClient();

      // If no goalId provided, find the most recent active goal of the specified type
      let finalGoalId = goalId;

      if (!finalGoalId && goalType) {
        const { data: goals, error: fetchError } = await supabase
          .from('fitness_goals')
          .select('id, goal_type, target_value, current_value, unit')
          .eq('user_id', userId)
          .eq('goal_type', goalType)
          .eq('status', 'active')
          .order('created_at', { ascending: false })
          .limit(1);

        if (fetchError) {
          return {
            success: false,
            error: `Failed to find goal: ${fetchError.message}`,
          };
        }

        if (!goals || goals.length === 0) {
          return {
            success: false,
            error: `No active ${goalType.replace('_', ' ')} goal found. Use create-fitness-goal to create a new one.`,
          };
        }

        finalGoalId = goals[0].id;
        console.log(`📍 Found ${goalType} goal with ID: ${finalGoalId}`);
      }

      if (!finalGoalId) {
        return {
          success: false,
          error: 'Either goalId or goalType must be provided.',
        };
      }

      // Build update object
      const updates: any = {};
      if (targetValue !== undefined) updates.target_value = targetValue;
      if (targetDate !== undefined) updates.target_date = targetDate;
      if (status !== undefined) updates.status = status;
      updates.updated_at = new Date().toISOString();

      if (Object.keys(updates).length === 1) {
        // Only updated_at, no actual changes
        return {
          success: false,
          error: 'No update values provided.',
        };
      }

      // Perform update
      const { data, error } = await supabase
        .from('fitness_goals')
        .update(updates)
        .eq('id', finalGoalId)
        .eq('user_id', userId)
        .select()
        .single();

      if (error) {
        console.error('❌ Error updating fitness goal:', error);
        return {
          success: false,
          error: `Failed to update goal: ${error.message}`,
        };
      }

      console.log('✅ Fitness goal updated successfully');

      const goalTypeLabels: Record<string, string> = {
        weight_loss: 'Weight Loss',
        weight_gain: 'Weight Gain',
        muscle_gain: 'Muscle Gain',
        body_fat_reduction: 'Body Fat Reduction',
        calorie_target: 'Daily Calorie Target',
        workout_frequency: 'Workout Frequency',
      };
      const goalTypeLabel = goalTypeLabels[data.goal_type] || data.goal_type;

      const changesSummary: string[] = [];
      if (targetValue !== undefined) {
        changesSummary.push(`Target: ${targetValue} ${data.unit}`);
      }
      if (targetDate !== undefined) {
        changesSummary.push(
          `Target date: ${targetDate ? new Date(targetDate).toLocaleDateString() : 'removed'}`
        );
      }
      if (status !== undefined) {
        changesSummary.push(`Status: ${status}`);
      }

      return {
        success: true,
        goal: {
          id: data.id,
          type: goalTypeLabel,
          targetValue: data.target_value,
          currentValue: data.current_value,
          unit: data.unit,
          targetDate: data.target_date,
          status: data.status,
        },
        message: `✅ ${goalTypeLabel} goal updated! ${changesSummary.join(', ')}`,
      };
    } catch (error) {
      console.error('💥 Exception updating fitness goal:', error);
      return {
        success: false,
        error: `Failed to update fitness goal: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
