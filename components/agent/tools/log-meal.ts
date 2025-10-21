/**
 * Log Meal Tool
 * Allows users to log meals through conversation with nutrition data lookup
 */

import { tool } from 'ai';
import { z } from 'zod';
import { createMealLog } from '@/lib/nutrition/meal-logging';
import { searchAndParseFoods, scaleNutrition } from '@/lib/nutrition/usda-api';
import { estimateNutritionWithAI } from '@/lib/nutrition/ai-nutrition-estimator';
import { createClient } from '@/lib/supabase/server';
import type { FoodItem, MealType } from '@/lib/nutrition/types';

/**
 * Tool for logging meals with automatic nutrition lookup
 * Returns a preview of the meal to be logged
 */
const logMealSchema = z.object({
  mealType: z
    .enum(['breakfast', 'lunch', 'dinner', 'snack'])
    .describe('Type of meal'),
  foodItems: z
    .array(
      z.object({
        name: z.string().describe('Name of the food item'),
        quantity: z.number().describe('Quantity/amount'),
        unit: z.string().describe('Unit (cup, oz, g, piece, serving, etc.)'),
      })
    )
    .describe('Array of food items in the meal'),
  notes: z.string().optional().describe('Optional notes about the meal'),
});

export const logMealPreview = tool({
  description:
    'Log a meal with automatic nutrition data lookup. Searches USDA database or uses AI estimates for nutrition info. IMPORTANT: This tool returns a PREVIEW. Ask user to CONFIRM before calling confirmMealLog.',
  inputSchema: logMealSchema,
  execute: async ({ mealType, foodItems, notes }: z.infer<typeof logMealSchema>) => {
    console.log(`🍽️ Preparing meal log: ${mealType} with ${foodItems.length} items`);

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
          error: 'User not authenticated. Please sign in to log meals.',
        };
      }

      // Look up nutrition for each food item
      const foodItemsWithNutrition: (FoodItem & { dataSource: string })[] = [];
      const nutritionLookupDetails: string[] = [];

      for (const item of foodItems) {
        console.log(`🔍 Looking up nutrition for: ${item.name} (${item.quantity} ${item.unit})`);

        try {
          // Try USDA first
          const usdaResults = await searchAndParseFoods(item.name, 1);

          if (usdaResults.length > 0) {
            const usdaFood = usdaResults[0];
            const scaledNutrition = scaleNutrition(usdaFood, item.quantity, item.unit);

            foodItemsWithNutrition.push({
              name: item.name,
              quantity: item.quantity,
              unit: item.unit,
              calories: scaledNutrition.calories,
              protein: scaledNutrition.protein,
              carbs: scaledNutrition.carbs,
              fats: scaledNutrition.fats,
              dataSource: 'USDA',
            });

            nutritionLookupDetails.push(
              `${item.name}: ${scaledNutrition.calories} cal (USDA data)`
            );
          } else {
            // Fallback to AI estimation
            const aiEstimate = await estimateNutritionWithAI(item.name, item.quantity, item.unit);

            if (aiEstimate) {
              foodItemsWithNutrition.push({
                name: item.name,
                quantity: item.quantity,
                unit: item.unit,
                calories: aiEstimate.calories,
                protein: aiEstimate.protein,
                carbs: aiEstimate.carbs,
                fats: aiEstimate.fats,
                dataSource: 'AI Estimate',
              });

              nutritionLookupDetails.push(
                `${item.name}: ${aiEstimate.calories} cal (AI estimated)`
              );
            } else {
              // Could not get nutrition data
              return {
                success: false,
                error: `Could not find nutrition data for: ${item.name}. Please try a more specific food name.`,
              };
            }
          }
        } catch (error) {
          console.error(`Error looking up nutrition for ${item.name}:`, error);
          return {
            success: false,
            error: `Error looking up nutrition for ${item.name}: ${error instanceof Error ? error.message : 'Unknown error'}`,
          };
        }
      }

      // Calculate totals
      const totalCalories = foodItemsWithNutrition.reduce((sum: number, item) => sum + item.calories, 0);
      const totalProtein = foodItemsWithNutrition.reduce(
        (sum: number, item) => sum + (item.protein || 0),
        0
      );
      const totalCarbs = foodItemsWithNutrition.reduce((sum: number, item) => sum + (item.carbs || 0), 0);
      const totalFats = foodItemsWithNutrition.reduce((sum: number, item) => sum + (item.fats || 0), 0);

      // Return PREVIEW - don't save yet, wait for confirmation
      return {
        success: true,
        preview: true,
        mealType,
        foodItems: foodItemsWithNutrition,
        notes,
        totals: {
          calories: Math.round(totalCalories),
          protein: Math.round(totalProtein * 10) / 10,
          carbs: Math.round(totalCarbs * 10) / 10,
          fats: Math.round(totalFats * 10) / 10,
        },
        nutritionLookupDetails,
        message: `Ready to log ${mealType}:\n${nutritionLookupDetails.join('\n')}\n\nTotals: ${Math.round(totalCalories)} cal, ${Math.round(totalProtein)}g protein, ${Math.round(totalCarbs)}g carbs, ${Math.round(totalFats)}g fats\n\nPlease ask the user to CONFIRM before saving.`,
        userId: user.id,
      };
    } catch (error) {
      console.error('❌ Error in logMealPreview tool:', error);
      return {
        success: false,
        error: `Error preparing meal log: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

/**
 * Confirmation tool - actually saves the meal after user confirms
 */
const confirmMealLogSchema = z.object({
  mealType: z.enum(['breakfast', 'lunch', 'dinner', 'snack']),
  foodItems: z.array(
    z.object({
      name: z.string(),
      quantity: z.number(),
      unit: z.string(),
      calories: z.number(),
      protein: z.number().optional(),
      carbs: z.number().optional(),
      fats: z.number().optional(),
    })
  ),
  notes: z.string().optional(),
});

export const confirmMealLog = tool({
  description:
    'Confirm and save meal log after user approves the preview. Only call this after logMealPreview and user confirmation.',
  inputSchema: confirmMealLogSchema,
  execute: async ({ mealType, foodItems, notes }: z.infer<typeof confirmMealLogSchema>) => {
    console.log(`✅ Confirming meal log: ${mealType}`);

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

      // Save meal log
      const { data: mealLog, error } = await createMealLog({
        userId: user.id,
        mealType: mealType as MealType,
        foodItems: foodItems as FoodItem[],
        notes,
      });

      if (error) {
        return {
          success: false,
          error: `Failed to save meal log: ${error.message}`,
        };
      }

      // Calculate totals for success message
      const totalCalories = foodItems.reduce((sum: number, item) => sum + item.calories, 0);
      const totalProtein = foodItems.reduce((sum: number, item) => sum + (item.protein || 0), 0);

      return {
        success: true,
        saved: true,
        mealLog,
        message: `✅ ${mealType.charAt(0).toUpperCase() + mealType.slice(1)} logged successfully! ${Math.round(totalCalories)} calories, ${Math.round(totalProtein)}g protein. Your daily nutrition tracking has been updated.`,
      };
    } catch (error) {
      console.error('❌ Error confirming meal log:', error);
      return {
        success: false,
        error: `Error saving meal: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
