/**
 * Update Dietary Preferences Tool
 * Allows users to manage their dietary restrictions through conversation
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  updateDietaryRestrictions,
  getUserDietaryPreferences,
} from '@/lib/supabase/substitutions';
import { createClient } from '@/lib/supabase/server';

const updateDietaryPreferencesSchema = z.object({
  userId: z.string().describe('User ID (provided by system - REQUIRED for authentication)'),
  operation: z
    .enum(['add', 'remove', 'replace'])
    .describe(
      'Operation type: "add" (add new restrictions), "remove" (remove restrictions), or "replace" (completely replace all restrictions)'
    ),
  restrictions: z
    .array(z.string())
    .describe(
      'Array of dietary restrictions (e.g., ["vegetarian", "dairy-free", "gluten-free"])'
    ),
});

/**
 * Tool for updating user's dietary restrictions
 * Supports add/remove/replace operations
 */
export const updateDietaryPreferences = tool({
  description:
    'Update user dietary restrictions (vegetarian, vegan, gluten-free, etc.). IMPORTANT: This tool returns a PREVIEW of changes. Ask user to CONFIRM before calling confirmDietaryPreferencesUpdate.',
  inputSchema: updateDietaryPreferencesSchema,
  execute: async ({ userId, operation, restrictions }: z.infer<typeof updateDietaryPreferencesSchema>) => {
    console.log(`🥗 Updating dietary preferences for user ${userId}: ${operation} [${restrictions.join(', ')}]`);

    try {
      // userId is provided by the system (from authenticated request)
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required but was not provided.',
        };
      }

      // Get current dietary restrictions
      const supabase = await createClient();
      const { data: currentPrefs, error: fetchError} =
        await getUserDietaryPreferences(supabase, userId);

      if (fetchError) {
        return {
          success: false,
          error: `Error fetching current preferences: ${fetchError.message}`,
        };
      }

      const currentRestrictions = currentPrefs?.dietary_restrictions || [];

      // Calculate new restrictions based on operation
      let newRestrictions: string[];

      switch (operation) {
        case 'add':
          // Add new restrictions, avoiding duplicates
          newRestrictions = [
            ...currentRestrictions,
            ...restrictions.filter(
              (r: string) => !currentRestrictions.some(
                (curr: string) => curr.toLowerCase() === r.toLowerCase()
              )
            ),
          ];
          break;

        case 'remove':
          // Remove specified restrictions (case-insensitive)
          newRestrictions = currentRestrictions.filter(
            (curr: string) =>
              !restrictions.some((r: string) => r.toLowerCase() === curr.toLowerCase())
          );
          break;

        case 'replace':
          // Replace all restrictions
          newRestrictions = restrictions;
          break;

        default:
          return {
            success: false,
            error: `Invalid operation: ${operation}`,
          };
      }

      // Return PREVIEW - don't save yet, wait for confirmation
      return {
        success: true,
        preview: true,
        operation,
        currentRestrictions,
        newRestrictions,
        changes: {
          added: newRestrictions.filter(
            (r: string) => !currentRestrictions.some(
              (curr: string) => curr.toLowerCase() === r.toLowerCase()
            )
          ),
          removed: currentRestrictions.filter(
            (curr: string) =>
              !newRestrictions.some((r: string) => r.toLowerCase() === curr.toLowerCase())
          ),
        },
        message: `Ready to update dietary restrictions. Current: [${currentRestrictions.join(', ') || 'none'}]. New: [${newRestrictions.join(', ') || 'none'}]. Please ask the user to CONFIRM this change.`,
        userId: userId,
      };
    } catch (error) {
      console.error('❌ Error in updateDietaryPreferences tool:', error);
      return {
        success: false,
        error: `Error updating dietary preferences: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

/**
 * Confirmation tool - actually saves the dietary preferences after user confirms
 */
const confirmDietaryPreferencesUpdateSchema = z.object({
  userId: z.string().describe('User ID (provided by system - REQUIRED for authentication)'),
  restrictions: z
    .array(z.string())
    .describe('The new dietary restrictions to save (from preview)'),
});

export const confirmDietaryPreferencesUpdate = tool({
  description:
    'Confirm and save dietary preferences update after user approves the preview. Only call this after updateDietaryPreferences and user confirmation.',
  inputSchema: confirmDietaryPreferencesUpdateSchema,
  execute: async ({ userId, restrictions }: z.infer<typeof confirmDietaryPreferencesUpdateSchema>) => {
    console.log(`✅ Confirming dietary preferences update for user ${userId}: [${restrictions.join(', ')}]`);

    try {
      // userId is provided by the system (from authenticated request)
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required but was not provided.',
        };
      }

      // Save to database
      const supabase = await createClient();
      const { data, error } = await updateDietaryRestrictions(
        supabase,
        userId,
        restrictions
      );

      if (error) {
        return {
          success: false,
          error: `Failed to save dietary preferences: ${error.message}`,
        };
      }

      return {
        success: true,
        saved: true,
        newRestrictions: restrictions,
        message: `✅ Dietary restrictions updated successfully! Your restrictions: ${restrictions.length > 0 ? restrictions.join(', ') : 'none'}.`,
      };
    } catch (error) {
      console.error('❌ Error confirming dietary preferences:', error);
      return {
        success: false,
        error: `Error saving: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
