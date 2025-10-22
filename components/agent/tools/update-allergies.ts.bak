/**
 * Update Allergies Tool
 * Allows users to manage their food allergies through conversation
 */

import { tool } from 'ai';
import { z } from 'zod';
import {
  updateAllergies,
  getUserDietaryPreferences,
} from '@/lib/supabase/substitutions';
import { createClient } from '@/lib/supabase/server';

const updateAllergiesSchema = z.object({
  operation: z
    .enum(['add', 'remove', 'replace'])
    .describe(
      'Operation type: "add" (add new allergies), "remove" (remove allergies), or "replace" (completely replace all allergies)'
    ),
  allergies: z
    .array(z.string())
    .describe(
      'Array of food allergies (e.g., ["peanuts", "shellfish", "dairy", "eggs"])'
    ),
});

/**
 * Tool for updating user's food allergies
 * Supports add/remove/replace operations
 */
export const updateAllergiesPreview = tool({
  description:
    'Update user food allergies (peanuts, shellfish, dairy, etc.). IMPORTANT: This tool returns a PREVIEW of changes. Ask user to CONFIRM before calling confirmAllergiesUpdate.',
  inputSchema: updateAllergiesSchema,
  execute: async ({ operation, allergies }: z.infer<typeof updateAllergiesSchema>) => {
    console.log(`🚨 Updating allergies: ${operation} [${allergies.join(', ')}]`);

    try {
      // Get current user
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: 'User not authenticated. Please sign in to update allergies.',
        };
      }

      // Get current allergies
      const { data: currentPrefs, error: fetchError } =
        await getUserDietaryPreferences(user.id);

      if (fetchError) {
        return {
          success: false,
          error: `Error fetching current allergies: ${fetchError.message}`,
        };
      }

      const currentAllergies = currentPrefs?.allergies || [];

      // Calculate new allergies based on operation
      let newAllergies: string[];

      switch (operation) {
        case 'add':
          // Add new allergies, avoiding duplicates
          newAllergies = [
            ...currentAllergies,
            ...allergies.filter(
              (a: string) => !currentAllergies.some(
                (curr: string) => curr.toLowerCase() === a.toLowerCase()
              )
            ),
          ];
          break;

        case 'remove':
          // Remove specified allergies (case-insensitive)
          newAllergies = currentAllergies.filter(
            (curr: string) =>
              !allergies.some((a: string) => a.toLowerCase() === curr.toLowerCase())
          );
          break;

        case 'replace':
          // Replace all allergies
          newAllergies = allergies;
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
        currentAllergies,
        newAllergies,
        changes: {
          added: newAllergies.filter(
            (a: string) => !currentAllergies.some(
              (curr: string) => curr.toLowerCase() === a.toLowerCase()
            )
          ),
          removed: currentAllergies.filter(
            (curr: string) =>
              !newAllergies.some((a: string) => a.toLowerCase() === curr.toLowerCase())
          ),
        },
        message: `Ready to update allergies. Current: [${currentAllergies.join(', ') || 'none'}]. New: [${newAllergies.join(', ') || 'none'}]. Please ask the user to CONFIRM this change before saving.`,
        userId: user.id,
      };
    } catch (error) {
      console.error('❌ Error in updateAllergiesPreview tool:', error);
      return {
        success: false,
        error: `Error updating allergies: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

/**
 * Confirmation tool - actually saves the allergies after user confirms
 */
const confirmAllergiesUpdateSchema = z.object({
  allergies: z
    .array(z.string())
    .describe('The new allergies to save (from preview)'),
});

export const confirmAllergiesUpdate = tool({
  description:
    'Confirm and save allergies update after user approves the preview. Only call this after updateAllergiesPreview and user confirmation.',
  inputSchema: confirmAllergiesUpdateSchema,
  execute: async ({ allergies }: z.infer<typeof confirmAllergiesUpdateSchema>) => {
    console.log(`✅ Confirming allergies update: [${allergies.join(', ')}]`);

    try {
      // Get current user
      const supabase = await createClient();
      const {
        data: { user },
        error: authError,
      } = await supabase.auth.getUser();

      if (authError || !user) {
        return {
          success: false,
          error: 'User not authenticated.',
        };
      }

      // Save to database
      const { data, error } = await updateAllergies(user.id, allergies);

      if (error) {
        return {
          success: false,
          error: `Failed to save allergies: ${error.message}`,
        };
      }

      return {
        success: true,
        saved: true,
        newAllergies: allergies,
        message: `✅ Allergies updated successfully! Your allergies: ${allergies.length > 0 ? allergies.join(', ') : 'none'}.`,
      };
    } catch (error) {
      console.error('❌ Error confirming allergies update:', error);
      return {
        success: false,
        error: `Error saving: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
