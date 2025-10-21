/**
 * Search Food Nutrition Tool
 * Searches for food nutrition data using USDA API with AI estimation fallback
 */

import { tool } from 'ai';
import { z } from 'zod';
import { searchAndParseFoods, scaleNutrition } from '@/lib/nutrition/usda-api';
import { estimateNutritionWithAI } from '@/lib/nutrition/ai-nutrition-estimator';
import type { NutritionData } from '@/lib/nutrition/types';

/**
 * Tool for searching food nutrition information
 * Returns nutrition data with source indication (USDA or AI-estimated)
 */
export const searchFoodNutrition = tool({
  description:
    'Search for nutritional information about a food item. Tries USDA FoodData Central first for accurate data, falls back to AI estimation if not found. Always specify the data source in results.',
  inputSchema: z.object({
    foodName: z
      .string()
      .describe('Name of the food to search for (e.g., "grilled chicken breast", "apple", "brown rice")'),
    quantity: z
      .number()
      .optional()
      .describe('Quantity of the food (default: 1)'),
    unit: z
      .string()
      .optional()
      .describe('Unit of measurement (e.g., "cup", "oz", "g", "piece", "serving")'),
  }),
  execute: async ({ foodName, quantity = 1, unit = 'serving' }) => {
    console.log(`🔍 Searching nutrition for: ${foodName} (${quantity} ${unit})`);

    try {
      // Step 1: Try USDA API first
      const usdaResults = await searchAndParseFoods(foodName, 1);

      if (usdaResults.length > 0) {
        const usdaFood = usdaResults[0];
        console.log(`✅ Found USDA data for: ${usdaFood.foodName}`);

        // Scale nutrition based on requested quantity and unit
        let scaledNutrition: NutritionData;
        try {
          scaledNutrition = scaleNutrition(usdaFood, quantity, unit);
        } catch (error) {
          // If scaling fails (unit conversion issue), return as-is
          console.warn(`⚠️ Could not scale nutrition, using base serving`);
          scaledNutrition = usdaFood;
        }

        return {
          success: true,
          foodName: scaledNutrition.foodName,
          quantity,
          unit,
          nutrition: {
            calories: scaledNutrition.calories,
            protein: scaledNutrition.protein,
            carbs: scaledNutrition.carbs,
            fats: scaledNutrition.fats,
            fiber: scaledNutrition.fiber,
            sugar: scaledNutrition.sugar,
            sodium: scaledNutrition.sodium,
          },
          servingInfo: {
            servingSize: scaledNutrition.servingSize,
            servingUnit: scaledNutrition.servingUnit,
          },
          dataSource: 'USDA FoodData Central',
          estimated: false,
          fdcId: scaledNutrition.fdcId,
        };
      }

      // Step 2: Fallback to AI estimation
      console.log(`⚠️ No USDA data found for: ${foodName}, using AI estimation`);
      const aiEstimate = await estimateNutritionWithAI(foodName, quantity, unit);

      if (aiEstimate) {
        return {
          success: true,
          foodName: aiEstimate.foodName,
          quantity,
          unit,
          nutrition: {
            calories: aiEstimate.calories,
            protein: aiEstimate.protein,
            carbs: aiEstimate.carbs,
            fats: aiEstimate.fats,
            fiber: aiEstimate.fiber,
            sugar: aiEstimate.sugar,
            sodium: aiEstimate.sodium,
          },
          servingInfo: {
            servingSize: aiEstimate.servingSize,
            servingUnit: aiEstimate.servingUnit,
          },
          dataSource: 'AI Estimate',
          estimated: true,
          warning: 'This nutrition data is an AI estimate and may not be as accurate as USDA data',
        };
      }

      // Step 3: Both methods failed
      return {
        success: false,
        error: `Could not find nutrition data for "${foodName}". Please try a more specific food name or common food item.`,
      };
    } catch (error) {
      console.error('❌ Error in searchFoodNutrition tool:', error);
      return {
        success: false,
        error: `Error searching for nutrition data: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
