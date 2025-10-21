import { tool } from 'ai';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

/**
 * Get User Context Tool
 *
 * Retrieves user profile information including dietary preferences, allergies,
 * fitness goals, and nutrition targets for personalized recommendations.
 *
 * This tool allows agents to access user context proactively to provide
 * personalized recipe suggestions, meal plans, and fitness advice.
 */

export const getUserContext = tool({
  description:
    'Get user profile context including dietary restrictions, allergies, fitness goals, and daily nutrition targets. ' +
    'Use this PROACTIVELY before making recipe suggestions, meal plans, or workout recommendations to ensure they align with user preferences and goals.',

  inputSchema: z.object({
    userId: z.string().describe('The ID of the user whose context to retrieve'),
  }),

  execute: async ({ userId }) => {
    console.log(`🔍 Getting user context for user: ${userId}`);

    try {
      const supabase = await createClient();

      // Fetch user profile with all preference fields
      const { data: profile, error } = await supabase
        .from('user_profiles')
        .select(`
          dietary_restrictions,
          allergies,
          fitness_goals,
          daily_calorie_target,
          daily_protein_target,
          daily_carbs_target,
          daily_fats_target,
          full_name
        `)
        .eq('id', userId)
        .single();

      if (error) {
        console.error('❌ Error fetching user profile:', error);

        // If no profile exists yet, return default context
        if (error.code === 'PGRST116') {
          console.log('ℹ️  No user profile found, returning default context');
          return {
            hasProfile: false,
            message: 'User has not set up their profile yet. No dietary restrictions or goals are configured.',
          };
        }

        throw error;
      }

      console.log('✅ User context retrieved successfully');

      // Format the context in a human-readable way for the agent
      const context = {
        hasProfile: true,
        name: profile.full_name || 'User',

        // Dietary restrictions (e.g., vegetarian, vegan, gluten-free)
        dietaryRestrictions: profile.dietary_restrictions && profile.dietary_restrictions.length > 0
          ? profile.dietary_restrictions
          : [],

        // Food allergies (critical for safety)
        allergies: profile.allergies && profile.allergies.length > 0
          ? profile.allergies
          : [],

        // Fitness goals (e.g., "lose weight", "build muscle")
        fitnessGoals: profile.fitness_goals && profile.fitness_goals.length > 0
          ? profile.fitness_goals
          : [],

        // Daily nutrition targets
        nutritionTargets: {
          calories: profile.daily_calorie_target || null,
          protein: profile.daily_protein_target || null,
          carbs: profile.daily_carbs_target || null,
          fats: profile.daily_fats_target || null,
        },

        // Summary message for agent
        summary: buildContextSummary(
          profile.full_name,
          profile.dietary_restrictions,
          profile.allergies,
          profile.fitness_goals,
          {
            calories: profile.daily_calorie_target,
            protein: profile.daily_protein_target,
            carbs: profile.daily_carbs_target,
            fats: profile.daily_fats_target,
          }
        ),
      };

      return context;

    } catch (error) {
      console.error('💥 Exception getting user context:', error);
      throw new Error(
        `Failed to retrieve user context: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  },
});

/**
 * Build a human-readable summary of user context for the agent
 */
function buildContextSummary(
  name: string | null,
  dietaryRestrictions: string[] | null,
  allergies: string[] | null,
  fitnessGoals: string[] | null,
  targets: {
    calories: number | null;
    protein: number | null;
    carbs: number | null;
    fats: number | null;
  }
): string {
  const parts: string[] = [];

  if (name) {
    parts.push(`User: ${name}`);
  }

  if (dietaryRestrictions && dietaryRestrictions.length > 0) {
    parts.push(`Dietary Restrictions: ${dietaryRestrictions.join(', ')}`);
  }

  if (allergies && allergies.length > 0) {
    parts.push(`⚠️ ALLERGIES (CRITICAL): ${allergies.join(', ')}`);
  }

  if (fitnessGoals && fitnessGoals.length > 0) {
    parts.push(`Fitness Goals: ${fitnessGoals.join(', ')}`);
  }

  if (targets.calories || targets.protein || targets.carbs || targets.fats) {
    const targetParts: string[] = [];
    if (targets.calories) targetParts.push(`${targets.calories} kcal/day`);
    if (targets.protein) targetParts.push(`${targets.protein}g protein`);
    if (targets.carbs) targetParts.push(`${targets.carbs}g carbs`);
    if (targets.fats) targetParts.push(`${targets.fats}g fats`);

    parts.push(`Daily Targets: ${targetParts.join(', ')}`);
  }

  if (parts.length === 0) {
    return 'No user preferences configured yet.';
  }

  return parts.join(' | ');
}
