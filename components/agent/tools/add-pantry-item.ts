/**
 * Add Pantry Item Tool
 * Allows users to add ingredients to their pantry through conversation
 */

import { tool } from 'ai';
import { z } from 'zod';
import { addIngredient } from '@/lib/supabase/ingredients';
import { createClient } from '@/lib/supabase/server';

/**
 * Tool for adding items to pantry with preview
 * Returns a preview of the item to be added
 */
const addPantryItemSchema = z.object({
  userId: z.string().describe('User ID (provided by system - REQUIRED for authentication)'),
  name: z.string().describe('Name of the ingredient (e.g., "milk", "flour", "chicken breast")'),
  quantity: z.number().optional().describe('Quantity/amount (optional)'),
  unit: z
    .string()
    .optional()
    .describe('Unit of measurement (cup, oz, g, lbs, piece, etc.) - optional'),
  category: z
    .string()
    .optional()
    .describe(
      'Category for organization (dairy, meat, produce, pantry, spices, etc.) - optional'
    ),
  expiryDate: z
    .string()
    .optional()
    .describe('Expiry date in YYYY-MM-DD format - optional'),
  notes: z.string().optional().describe('Optional notes about the ingredient'),
});

export const addPantryItemPreview = tool({
  description:
    'Add an ingredient to the user\'s pantry inventory. Use this when the user wants to add items they have at home. IMPORTANT: This tool returns a PREVIEW. Ask user to CONFIRM before calling confirmAddPantryItem.',
  inputSchema: addPantryItemSchema,
  execute: async ({
    userId,
    name,
    quantity,
    unit,
    category,
    expiryDate,
    notes,
  }: z.infer<typeof addPantryItemSchema>) => {
    console.log(`🥫 Preparing to add pantry item for user ${userId}: ${name}`);

    try {
      // userId is provided by the system (from authenticated request)
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required but was not provided.',
        };
      }

      // Validate ingredient name
      if (!name || name.trim().length === 0) {
        return {
          success: false,
          error: 'Ingredient name is required.',
        };
      }

      // Build preview message
      let previewMessage = `Ready to add to your pantry:\n\n`;
      previewMessage += `**${name}**\n`;

      if (quantity && unit) {
        previewMessage += `- Quantity: ${quantity} ${unit}\n`;
      } else if (quantity) {
        previewMessage += `- Quantity: ${quantity}\n`;
      } else if (unit) {
        previewMessage += `- Unit: ${unit}\n`;
      }

      if (category) {
        previewMessage += `- Category: ${category}\n`;
      }

      if (expiryDate) {
        previewMessage += `- Expiry Date: ${expiryDate}\n`;
      }

      if (notes) {
        previewMessage += `- Notes: ${notes}\n`;
      }

      previewMessage += `\nPlease ask the user to CONFIRM before saving.`;

      // Return PREVIEW - don't save yet, wait for confirmation
      return {
        success: true,
        preview: true,
        ingredient: {
          name,
          quantity,
          unit,
          category,
          expiryDate,
          notes,
        },
        message: previewMessage,
        userId: userId,
      };
    } catch (error) {
      console.error('❌ Error in addPantryItemPreview tool:', error);
      return {
        success: false,
        error: `Error preparing pantry item: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

/**
 * Confirmation tool - actually saves the ingredient after user confirms
 */
const confirmAddPantryItemSchema = z.object({
  userId: z.string().describe('User ID (provided by system - REQUIRED for authentication)'),
  name: z.string(),
  quantity: z.number().optional(),
  unit: z.string().optional(),
  category: z.string().optional(),
  expiryDate: z.string().optional(),
  notes: z.string().optional(),
});

export const confirmAddPantryItem = tool({
  description:
    'Confirm and save pantry item after user approves the preview. Only call this after addPantryItemPreview and user confirmation.',
  inputSchema: confirmAddPantryItemSchema,
  execute: async ({
    userId,
    name,
    quantity,
    unit,
    category,
    expiryDate,
    notes,
  }: z.infer<typeof confirmAddPantryItemSchema>) => {
    console.log(`✅ Confirming pantry item for user ${userId}: ${name}`);

    try {
      // userId is provided by the system (from authenticated request)
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required but was not provided.',
        };
      }

      // Save ingredient to database
      const supabase = await createClient();
      const { data: ingredient, error } = await addIngredient(supabase, {
        userId,
        name,
        quantity,
        unit,
        category,
        expiryDate,
        notes,
      });

      if (error) {
        return {
          success: false,
          error: `Failed to add ingredient to pantry: ${error.message}`,
        };
      }

      // Build success message
      let successMessage = `✅ Added **${name}** to your pantry!`;

      if (quantity && unit) {
        successMessage += ` (${quantity} ${unit})`;
      }

      if (category) {
        successMessage += ` Your ${category} inventory has been updated.`;
      }

      return {
        success: true,
        saved: true,
        ingredient,
        message: successMessage,
      };
    } catch (error) {
      console.error('❌ Error confirming pantry item:', error);
      return {
        success: false,
        error: `Error saving ingredient: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
