/**
 * Update Fitness Goals Tool
 * Allows users to manage their fitness goals and macro targets through conversation
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Tool for updating user's fitness goals and nutritional targets
 * Supports updating goals and macro targets
 */
export const updateFitnessGoalsPreview = tool({
  description:
    'Update user fitness goals and daily nutrition targets (calories, protein, carbs, fats). IMPORTANT: This tool returns a PREVIEW of changes. Ask user to CONFIRM before calling confirmFitnessGoalsUpdate.',
  inputSchema: z.object({
    userId: z.string().describe('User ID (provided by system - REQUIRED for authentication)'),
    fitnessGoals: z
      .array(z.string())
      .optional()
      .describe(
        'Array of fitness goals (e.g., ["lose weight", "build muscle", "improve endurance"]). Omit to keep current goals.'
      ),
    dailyCalorieTarget: z
      .number()
      .optional()
      .describe('Daily calorie target in kcal (e.g., 2000). Omit to keep current.'),
    dailyProteinTarget: z
      .number()
      .optional()
      .describe('Daily protein target in grams (e.g., 150). Omit to keep current.'),
    dailyCarbsTarget: z
      .number()
      .optional()
      .describe('Daily carbs target in grams (e.g., 200). Omit to keep current.'),
    dailyFatsTarget: z
      .number()
      .optional()
      .describe('Daily fats target in grams (e.g., 65). Omit to keep current.'),
  }),
  execute: async ({
    userId,
    fitnessGoals,
    dailyCalorieTarget,
    dailyProteinTarget,
    dailyCarbsTarget,
    dailyFatsTarget,
  }) => {
    console.log(`🎯 Updating fitness goals and targets for user ${userId}`);

    try {
      // userId is provided by the system (from authenticated request)
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required but was not provided.',
        };
      }

      // Get current profile (returns null if doesn't exist)
      const supabase = await createClient();
      const { data: profile, error: fetchError } = await supabase
        .from('user_profiles')
        .select('fitness_goals, daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fats_target')
        .eq('id', userId)
        .maybeSingle();

      if (fetchError) {
        return {
          success: false,
          error: `Error fetching current profile: ${fetchError.message}`,
        };
      }

      // Prepare current and new values (profile may be null if not created yet)
      const current = {
        fitnessGoals: profile?.fitness_goals || [],
        dailyCalorieTarget: profile?.daily_calorie_target || null,
        dailyProteinTarget: profile?.daily_protein_target || null,
        dailyCarbsTarget: profile?.daily_carbs_target || null,
        dailyFatsTarget: profile?.daily_fats_target || null,
      };

      const updated = {
        fitnessGoals: fitnessGoals !== undefined ? fitnessGoals : current.fitnessGoals,
        dailyCalorieTarget:
          dailyCalorieTarget !== undefined ? dailyCalorieTarget : current.dailyCalorieTarget,
        dailyProteinTarget:
          dailyProteinTarget !== undefined ? dailyProteinTarget : current.dailyProteinTarget,
        dailyCarbsTarget:
          dailyCarbsTarget !== undefined ? dailyCarbsTarget : current.dailyCarbsTarget,
        dailyFatsTarget:
          dailyFatsTarget !== undefined ? dailyFatsTarget : current.dailyFatsTarget,
      };

      // Determine what changed
      const changes: string[] = [];
      if (JSON.stringify(current.fitnessGoals) !== JSON.stringify(updated.fitnessGoals)) {
        changes.push(`Goals: [${current.fitnessGoals.join(', ') || 'none'}] → [${updated.fitnessGoals.join(', ') || 'none'}]`);
      }
      if (current.dailyCalorieTarget !== updated.dailyCalorieTarget) {
        changes.push(`Calories: ${current.dailyCalorieTarget || 'not set'} → ${updated.dailyCalorieTarget || 'not set'} kcal`);
      }
      if (current.dailyProteinTarget !== updated.dailyProteinTarget) {
        changes.push(`Protein: ${current.dailyProteinTarget || 'not set'} → ${updated.dailyProteinTarget || 'not set'} g`);
      }
      if (current.dailyCarbsTarget !== updated.dailyCarbsTarget) {
        changes.push(`Carbs: ${current.dailyCarbsTarget || 'not set'} → ${updated.dailyCarbsTarget || 'not set'} g`);
      }
      if (current.dailyFatsTarget !== updated.dailyFatsTarget) {
        changes.push(`Fats: ${current.dailyFatsTarget || 'not set'} → ${updated.dailyFatsTarget || 'not set'} g`);
      }

      // Return PREVIEW - don't save yet, wait for confirmation
      return {
        success: true,
        preview: true,
        current,
        updated,
        changes,
        message: changes.length > 0
          ? `Ready to update fitness goals and targets:\n${changes.join('\n')}\n\nPlease ask the user to CONFIRM this change.`
          : 'No changes detected.',
        userId: userId,
      };
    } catch (error) {
      console.error('❌ Error in updateFitnessGoalsPreview tool:', error);
      return {
        success: false,
        error: `Error updating fitness goals: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

/**
 * Confirmation tool - actually saves the fitness goals after user confirms
 */
export const confirmFitnessGoalsUpdate = tool({
  description:
    'Confirm and save fitness goals update after user approves the preview. Only call this after updateFitnessGoalsPreview and user confirmation.',
  inputSchema: z.object({
    userId: z.string().describe('User ID (provided by system - REQUIRED for authentication)'),
    fitnessGoals: z.array(z.string()).optional(),
    dailyCalorieTarget: z.number().nullable().optional(),
    dailyProteinTarget: z.number().nullable().optional(),
    dailyCarbsTarget: z.number().nullable().optional(),
    dailyFatsTarget: z.number().nullable().optional(),
  }),
  execute: async ({
    userId,
    fitnessGoals,
    dailyCalorieTarget,
    dailyProteinTarget,
    dailyCarbsTarget,
    dailyFatsTarget,
  }) => {
    console.log(`✅ Confirming fitness goals update for user ${userId}`);

    try {
      // userId is provided by the system (from authenticated request)
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required but was not provided.',
        };
      }

      // Build update object with only provided values
      const updates: any = { id: userId };
      if (fitnessGoals !== undefined) updates.fitness_goals = fitnessGoals;
      if (dailyCalorieTarget !== undefined) updates.daily_calorie_target = dailyCalorieTarget;
      if (dailyProteinTarget !== undefined) updates.daily_protein_target = dailyProteinTarget;
      if (dailyCarbsTarget !== undefined) updates.daily_carbs_target = dailyCarbsTarget;
      if (dailyFatsTarget !== undefined) updates.daily_fats_target = dailyFatsTarget;

      // Save to database (upsert creates profile if it doesn't exist)
      const supabase = await createClient();
      const { data, error } = await supabase
        .from('user_profiles')
        .upsert(updates)
        .eq('id', userId)
        .select()
        .single();

      if (error) {
        return {
          success: false,
          error: `Failed to save fitness goals: ${error.message}`,
        };
      }

      // Build success message
      const summaryParts: string[] = [];
      if (fitnessGoals !== undefined) {
        summaryParts.push(`Goals: ${fitnessGoals.length > 0 ? fitnessGoals.join(', ') : 'none'}`);
      }
      if (dailyCalorieTarget !== undefined && dailyCalorieTarget !== null) {
        summaryParts.push(`${dailyCalorieTarget} kcal/day`);
      }
      if (dailyProteinTarget !== undefined && dailyProteinTarget !== null) {
        summaryParts.push(`${dailyProteinTarget}g protein`);
      }
      if (dailyCarbsTarget !== undefined && dailyCarbsTarget !== null) {
        summaryParts.push(`${dailyCarbsTarget}g carbs`);
      }
      if (dailyFatsTarget !== undefined && dailyFatsTarget !== null) {
        summaryParts.push(`${dailyFatsTarget}g fats`);
      }

      return {
        success: true,
        saved: true,
        updated: {
          fitnessGoals: data.fitness_goals,
          dailyCalorieTarget: data.daily_calorie_target,
          dailyProteinTarget: data.daily_protein_target,
          dailyCarbsTarget: data.daily_carbs_target,
          dailyFatsTarget: data.daily_fats_target,
        },
        message: `✅ Fitness goals and targets updated successfully! ${summaryParts.join(', ')}`,
      };
    } catch (error) {
      console.error('❌ Error confirming fitness goals update:', error);
      return {
        success: false,
        error: `Error saving: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
