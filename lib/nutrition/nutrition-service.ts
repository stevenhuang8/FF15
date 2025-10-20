/**
 * Nutrition Service
 *
 * Main service for nutrition data with Supabase caching layer
 * Integrates USDA API with local database cache
 */

import { createClient } from '@/lib/supabase/client';
import { searchAndParseFoods, scaleNutrition } from './usda-api';
import type {
  NutritionData,
  NutritionCacheEntry,
  NutritionServiceResponse,
  FoodItem,
} from './types';

// ============================================================================
// Cache Operations
// ============================================================================

/**
 * Get nutrition data from cache
 */
export async function getNutritionFromCache(
  foodName: string
): Promise<NutritionCacheEntry | null> {
  const supabase = createClient();

  try {
    // Normalize to lowercase for consistent matching
    const normalizedName = foodName.toLowerCase().trim();

    const { data, error } = await supabase
      .from('nutrition_cache')
      .select('*')
      .eq('food_name', normalizedName)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // Not found
        return null;
      }
      console.error('Error fetching from cache:', error);
      return null;
    }

    return data as NutritionCacheEntry;
  } catch (error) {
    console.error('Exception fetching from cache:', error);
    return null;
  }
}

/**
 * Save nutrition data to cache
 */
export async function saveNutritionToCache(
  nutrition: NutritionData
): Promise<NutritionServiceResponse<NutritionCacheEntry>> {
  const supabase = createClient();

  try {
    // Normalize food name to lowercase for consistent matching
    const normalizedName = nutrition.foodName.toLowerCase().trim();

    const cacheData = {
      food_name: normalizedName,
      fdc_id: nutrition.fdcId?.toString() || null,
      calories: nutrition.calories,
      protein: nutrition.protein,
      carbs: nutrition.carbs,
      fats: nutrition.fats,
      fiber: nutrition.fiber || null,
      sugar: nutrition.sugar || null,
      sodium: nutrition.sodium || null,
      potassium: nutrition.potassium || null,
      calcium: nutrition.calcium || null,
      iron: nutrition.iron || null,
      vitamin_c: nutrition.vitaminC || null,
      vitamin_a: nutrition.vitaminA || null,
      serving_size: nutrition.servingSize,
      serving_unit: nutrition.servingUnit,
      data_source: nutrition.dataSource,
      last_updated: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('nutrition_cache')
      .upsert(cacheData, {
        onConflict: 'food_name',
        ignoreDuplicates: false,
      })
      .select()
      .single();

    if (error) {
      console.error('Error saving to cache:', error);
      return { data: null, error };
    }

    return { data: data as NutritionCacheEntry, error: null };
  } catch (error) {
    console.error('Exception saving to cache:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error saving to cache'),
    };
  }
}

// ============================================================================
// Food Search with Caching
// ============================================================================

/**
 * Search for food with automatic caching
 * Checks cache first, falls back to USDA API
 */
export async function searchFood(
  query: string
): Promise<NutritionServiceResponse<NutritionData[]>> {
  try {
    // Check cache first for exact match
    const cached = await getNutritionFromCache(query);
    if (cached) {
      console.log('✅ Cache hit for:', query);
      return {
        data: [cacheEntryToNutritionData(cached)],
        error: null,
      };
    }

    // Cache miss, query USDA API
    console.log('🔍 Cache miss, querying USDA API for:', query);
    const results = await searchAndParseFoods(query, 10);

    // Cache the top result if available
    if (results.length > 0) {
      await saveNutritionToCache(results[0]);
    }

    return { data: results, error: null };
  } catch (error) {
    console.error('Error searching food:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error searching food'),
    };
  }
}

/**
 * Get nutrition data for a specific food item with serving size
 */
export async function getFoodNutrition(
  foodName: string,
  servingSize: number,
  servingUnit: string
): Promise<NutritionServiceResponse<NutritionData>> {
  try {
    const { data: results, error } = await searchFood(foodName);

    if (error || !results || results.length === 0) {
      return {
        data: null,
        error: error || new Error('No nutrition data found'),
      };
    }

    // Take the first (most relevant) result
    const baseNutrition = results[0];

    // Scale to requested serving size
    const scaled = scaleNutrition(baseNutrition, servingSize, servingUnit);

    return { data: scaled, error: null };
  } catch (error) {
    console.error('Error getting food nutrition:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error getting food nutrition'),
    };
  }
}

// ============================================================================
// Batch Operations
// ============================================================================

/**
 * Get nutrition data for multiple food items
 */
export async function getBatchNutrition(
  foods: Array<{ name: string; quantity: number; unit: string }>
): Promise<NutritionServiceResponse<FoodItem[]>> {
  try {
    const results: FoodItem[] = [];

    for (const food of foods) {
      const { data: nutrition, error } = await getFoodNutrition(
        food.name,
        food.quantity,
        food.unit
      );

      if (nutrition && !error) {
        results.push({
          name: food.name,
          quantity: food.quantity,
          unit: food.unit,
          calories: nutrition.calories,
          protein: nutrition.protein,
          carbs: nutrition.carbs,
          fats: nutrition.fats,
        });
      } else {
        // If no nutrition data found, add with zero calories
        console.warn(`No nutrition data found for: ${food.name}`);
        results.push({
          name: food.name,
          quantity: food.quantity,
          unit: food.unit,
          calories: 0,
          protein: 0,
          carbs: 0,
          fats: 0,
        });
      }
    }

    return { data: results, error: null };
  } catch (error) {
    console.error('Error getting batch nutrition:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error getting batch nutrition'),
    };
  }
}

// ============================================================================
// Manual Entry
// ============================================================================

/**
 * Create manual nutrition entry (user-provided data)
 */
export async function createManualNutrition(
  foodName: string,
  calories: number,
  protein?: number,
  carbs?: number,
  fats?: number,
  servingSize: number = 100,
  servingUnit: string = 'g'
): Promise<NutritionServiceResponse<NutritionData>> {
  // Normalize food name to lowercase
  const normalizedName = foodName.toLowerCase().trim();

  const nutrition: NutritionData = {
    foodName: normalizedName,
    calories,
    protein: protein || 0,
    carbs: carbs || 0,
    fats: fats || 0,
    servingSize,
    servingUnit,
    dataSource: 'manual',
  };

  // Save to cache for future use
  const { error } = await saveNutritionToCache(nutrition);

  return {
    data: nutrition,
    error,
  };
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Convert cache entry to NutritionData type
 */
function cacheEntryToNutritionData(entry: NutritionCacheEntry): NutritionData {
  return {
    foodName: entry.foodName,
    fdcId: entry.fdcId ? parseInt(entry.fdcId) : undefined,
    calories: entry.calories,
    protein: entry.protein || 0,
    carbs: entry.carbs || 0,
    fats: entry.fats || 0,
    fiber: entry.fiber || undefined,
    sugar: entry.sugar || undefined,
    sodium: entry.sodium || undefined,
    potassium: entry.potassium || undefined,
    calcium: entry.calcium || undefined,
    iron: entry.iron || undefined,
    vitaminC: entry.vitaminC || undefined,
    vitaminA: entry.vitaminA || undefined,
    servingSize: entry.servingSize,
    servingUnit: entry.servingUnit,
    dataSource: entry.dataSource,
  };
}

/**
 * Calculate total nutrition from multiple food items
 */
export function calculateTotalNutrition(foodItems: FoodItem[]): {
  totalCalories: number;
  totalProtein: number;
  totalCarbs: number;
  totalFats: number;
} {
  return foodItems.reduce(
    (totals, item) => ({
      totalCalories: totals.totalCalories + (item.calories || 0),
      totalProtein: totals.totalProtein + (item.protein || 0),
      totalCarbs: totals.totalCarbs + (item.carbs || 0),
      totalFats: totals.totalFats + (item.fats || 0),
    }),
    { totalCalories: 0, totalProtein: 0, totalCarbs: 0, totalFats: 0 }
  );
}

/**
 * Clear old cache entries (90+ days old)
 */
export async function cleanupOldCache(): Promise<NutritionServiceResponse<void>> {
  const supabase = createClient();

  try {
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const { error } = await supabase
      .from('nutrition_cache')
      .delete()
      .eq('data_source', 'usda')
      .lt('last_updated', ninetyDaysAgo.toISOString());

    if (error) {
      console.error('Error cleaning up cache:', error);
      return { data: null, error };
    }

    console.log('✅ Cache cleanup completed');
    return { data: null, error: null };
  } catch (error) {
    console.error('Exception cleaning up cache:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error cleaning up cache'),
    };
  }
}
