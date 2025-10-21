/**
 * AI-Powered Nutrition Estimation
 * Fallback for when USDA API doesn't have data
 * Uses AI to estimate nutrition values based on food knowledge
 */

import { generateObject } from 'ai';
import { openai } from '@ai-sdk/openai';
import { z } from 'zod';
import type { NutritionData } from './types';

/**
 * Schema for AI-estimated nutrition data
 */
const nutritionEstimateSchema = z.object({
  foodName: z.string().describe('The food name being estimated'),
  calories: z.number().describe('Estimated calories per serving'),
  protein: z.number().describe('Estimated protein in grams per serving'),
  carbs: z.number().describe('Estimated carbohydrates in grams per serving'),
  fats: z.number().describe('Estimated total fats in grams per serving'),
  fiber: z.number().optional().describe('Estimated fiber in grams per serving'),
  sugar: z.number().optional().describe('Estimated sugar in grams per serving'),
  sodium: z.number().optional().describe('Estimated sodium in mg per serving'),
  servingSize: z.number().describe('Typical serving size'),
  servingSizeUnit: z.string().describe('Unit for serving size (e.g., g, oz, cup, item)'),
  confidence: z.enum(['high', 'medium', 'low']).describe('Confidence level of the estimate'),
  reasoning: z.string().describe('Brief explanation of how the estimate was derived'),
});

export type NutritionEstimate = z.infer<typeof nutritionEstimateSchema>;

/**
 * Estimate nutrition values using AI when USDA data is unavailable
 *
 * @param foodName - Name of the food to estimate nutrition for
 * @param quantity - Optional quantity (default: 1)
 * @param unit - Optional unit (default: 'serving')
 * @returns Estimated nutrition data or null if estimation fails
 */
export async function estimateNutritionWithAI(
  foodName: string,
  quantity: number = 1,
  unit: string = 'serving'
): Promise<NutritionData | null> {
  try {
    console.log(`🤖 Estimating nutrition for: "${foodName}" (${quantity} ${unit})`);

    const prompt = `Estimate the nutritional information for: ${quantity} ${unit} of ${foodName}.

Consider:
- Typical preparation methods for this food
- Standard serving sizes
- Common ingredient compositions
- Regional variations if applicable

Provide reasonable estimates based on nutritional databases and food science knowledge.
If the food name is vague or unclear, use the most common interpretation.

For the serving size, choose a practical, commonly-used serving unit (e.g., g, oz, cup, piece, slice).`;

    const result = await generateObject({
      model: openai('gpt-4o-mini'), // Use mini model for cost efficiency
      schema: nutritionEstimateSchema,
      prompt,
      temperature: 0.3, // Lower temperature for more consistent estimates
    });

    const estimate = result.object;

    console.log(`✅ AI estimate complete (confidence: ${estimate.confidence})`);
    console.log(`   ${estimate.reasoning}`);

    // Convert to NutritionData format
    const nutritionData: NutritionData = {
      foodName: estimate.foodName,
      calories: Math.round(estimate.calories),
      protein: Math.round(estimate.protein * 10) / 10,
      carbs: Math.round(estimate.carbs * 10) / 10,
      fats: Math.round(estimate.fats * 10) / 10,
      fiber: estimate.fiber ? Math.round(estimate.fiber * 10) / 10 : undefined,
      sugar: estimate.sugar ? Math.round(estimate.sugar * 10) / 10 : undefined,
      sodium: estimate.sodium ? Math.round(estimate.sodium * 10) / 10 : undefined,
      servingSize: estimate.servingSize,
      servingUnit: estimate.servingSizeUnit,
      dataSource: 'manual', // Mark as non-USDA data
    };

    return nutritionData;
  } catch (error) {
    console.error('❌ Error estimating nutrition with AI:', error);
    return null;
  }
}

/**
 * Batch estimate nutrition for multiple foods
 *
 * @param foods - Array of food names to estimate
 * @returns Array of nutrition data (null for failed estimates)
 */
export async function batchEstimateNutrition(
  foods: Array<{ name: string; quantity?: number; unit?: string }>
): Promise<(NutritionData | null)[]> {
  try {
    const results = await Promise.all(
      foods.map(food =>
        estimateNutritionWithAI(food.name, food.quantity, food.unit)
      )
    );
    return results;
  } catch (error) {
    console.error('Error batch estimating nutrition:', error);
    throw error;
  }
}

/**
 * Get nutrition data with hybrid approach: USDA first, AI fallback
 *
 * @param foodName - Name of the food
 * @param quantity - Quantity (default: 1)
 * @param unit - Unit (default: 'serving')
 * @param tryUSDA - Function to try USDA lookup first
 * @returns Nutrition data with source indication
 */
export async function getHybridNutrition(
  foodName: string,
  quantity: number,
  unit: string,
  tryUSDA: () => Promise<NutritionData | null>
): Promise<(NutritionData & { estimated: boolean }) | null> {
  // Try USDA first
  const usdaData = await tryUSDA();

  if (usdaData) {
    console.log(`✅ Using USDA data for: ${foodName}`);
    return {
      ...usdaData,
      estimated: false,
    };
  }

  // Fallback to AI estimation
  console.log(`⚠️ USDA data not found for: ${foodName}, using AI estimation`);
  const aiData = await estimateNutritionWithAI(foodName, quantity, unit);

  if (aiData) {
    return {
      ...aiData,
      estimated: true,
    };
  }

  console.error(`❌ Could not get nutrition data for: ${foodName}`);
  return null;
}
