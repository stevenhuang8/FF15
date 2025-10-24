import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Create Fitness Goal Tool
 *
 * Creates a structured fitness goal (weight loss, weight gain, etc.) that appears
 * in the Active Goals section of the dashboard with progress tracking.
 */

export const createFitnessGoalTool = tool({
  description:
    'Create a structured fitness goal with target values for the user. ' +
    'Use this when user wants to set a specific goal like "lose weight to 200 lbs" or "gain muscle to 180 lbs". ' +
    'The goal will appear in their Active Goals dashboard with progress tracking.',

  inputSchema: z.object({
    userId: z.string().describe('The ID of the user creating the goal'),
    goalType: z
      .enum([
        'weight_loss',
        'weight_gain',
        'muscle_gain',
        'body_fat_reduction',
        'calorie_target',
        'workout_frequency',
      ])
      .describe('Type of fitness goal'),
    targetValue: z.number().describe('Target value to achieve (e.g., 200 for 200 lbs)'),
    currentValue: z
      .number()
      .optional()
      .describe(
        'Current value (will auto-fetch latest weight for weight goals if not provided)'
      ),
    unit: z
      .string()
      .optional()
      .describe('Unit of measurement (e.g., "lbs", "%", "calories/day"). Auto-set based on goal type if omitted.'),
    targetDate: z
      .string()
      .optional()
      .describe('Optional target completion date in YYYY-MM-DD format'),
  }),

  execute: async ({ userId, goalType, targetValue, currentValue, unit, targetDate }) => {
    console.log(`🎯 Creating fitness goal for user: ${userId}, type: ${goalType}`);

    try {
      const supabase = await createClient();

      // Auto-set unit based on goal type if not provided
      const goalUnit =
        unit ||
        {
          weight_loss: 'lbs',
          weight_gain: 'lbs',
          muscle_gain: 'lbs',
          body_fat_reduction: '%',
          calorie_target: 'calories/day',
          workout_frequency: 'workouts/week',
        }[goalType];

      // For weight-based goals, fetch latest weight if current value not provided
      let finalCurrentValue = currentValue;

      if (!finalCurrentValue && (goalType === 'weight_loss' || goalType === 'weight_gain')) {
        const { data: latestMetric } = await supabase
          .from('health_metrics')
          .select('weight')
          .eq('user_id', userId)
          .order('date', { ascending: false })
          .limit(1)
          .maybeSingle();

        if (latestMetric?.weight) {
          finalCurrentValue = latestMetric.weight;
          console.log(`📊 Using latest weight as starting value: ${finalCurrentValue} ${goalUnit}`);
        }
      }

      // For weight-based goals, starting_value = current_value (the baseline)
      const isWeightGoal = goalType === 'weight_loss' || goalType === 'weight_gain';
      const startingValue = isWeightGoal ? finalCurrentValue : null;

      const goalData = {
        user_id: userId,
        goal_type: goalType,
        target_value: targetValue,
        current_value: finalCurrentValue || null,
        starting_value: startingValue,
        unit: goalUnit,
        target_date: targetDate || null,
        status: 'active',
      };

      const { data, error } = await supabase
        .from('fitness_goals')
        .insert(goalData)
        .select()
        .single();

      if (error) {
        console.error('❌ Error creating fitness goal:', error);
        return {
          success: false,
          error: `Failed to create goal: ${error.message}`,
        };
      }

      console.log('✅ Fitness goal created successfully:', data.id);

      const goalTypeLabel =
        {
          weight_loss: 'Weight Loss',
          weight_gain: 'Weight Gain',
          muscle_gain: 'Muscle Gain',
          body_fat_reduction: 'Body Fat Reduction',
          calorie_target: 'Daily Calorie Target',
          workout_frequency: 'Workout Frequency',
        }[goalType] || goalType;

      return {
        success: true,
        goal: {
          id: data.id,
          type: goalTypeLabel,
          targetValue: data.target_value,
          currentValue: data.current_value,
          startingValue: data.starting_value,
          unit: data.unit,
          targetDate: data.target_date,
          status: data.status,
        },
        message: `✅ ${goalTypeLabel} goal created! Target: ${data.target_value} ${data.unit}${data.current_value ? `, Starting: ${data.current_value} ${data.unit}` : ''}`,
      };
    } catch (error) {
      console.error('💥 Exception creating fitness goal:', error);
      return {
        success: false,
        error: `Failed to create fitness goal: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
