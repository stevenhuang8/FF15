/**
 * USDA FoodData Central API Client
 *
 * Integrates with USDA FoodData Central API for nutrition data
 * API Docs: https://fdc.nal.usda.gov/api-guide.html
 * Rate Limit: 1,000 requests per hour per IP address
 */

import type {
  USDAFoodSearchResult,
  USDAFoodDetails,
  FoodSearchOptions,
  NutritionData,
} from './types';
import { convertUnit, convertWeight, isWeightUnit, isVolumeUnit, type Unit } from './unit-conversion';

const USDA_API_BASE = 'https://api.nal.usda.gov/fdc/v1';
const USDA_API_KEY = process.env.USDA_API_KEY || 'DEMO_KEY';

// Nutrient ID mappings from USDA FoodData Central
const NUTRIENT_IDS = {
  ENERGY: 1008, // Calories (kcal)
  PROTEIN: 1003, // Protein (g)
  CARBS: 1005, // Carbohydrates (g)
  FAT: 1004, // Total lipid (fat) (g)
  FIBER: 1079, // Fiber, total dietary (g)
  SUGARS: 2000, // Sugars, total (g)
  SODIUM: 1093, // Sodium (mg)
  POTASSIUM: 1092, // Potassium (mg)
  CALCIUM: 1087, // Calcium (mg)
  IRON: 1089, // Iron (mg)
  VITAMIN_C: 1162, // Vitamin C (mg)
  VITAMIN_A: 1106, // Vitamin A (IU)
} as const;

/**
 * Search for foods in USDA database
 */
export async function searchFoods(
  options: FoodSearchOptions
): Promise<USDAFoodSearchResult> {
  const { query, pageSize = 25, pageNumber = 1, dataType } = options;

  const params = new URLSearchParams({
    query,
    pageSize: pageSize.toString(),
    pageNumber: pageNumber.toString(),
    api_key: USDA_API_KEY,
  });

  // Filter by data type if specified
  if (dataType && dataType.length > 0) {
    params.append('dataType', dataType.join(','));
  }

  try {
    const response = await fetch(`${USDA_API_BASE}/foods/search?${params}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      // Cache for 1 hour since food data rarely changes
      next: { revalidate: 3600 },
    });

    if (!response.ok) {
      console.error('USDA API error:', response.status, response.statusText);
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error searching USDA foods:', error);
    throw error;
  }
}

/**
 * Get detailed nutrition information for a specific food by FDC ID
 */
export async function getFoodDetails(fdcId: number): Promise<USDAFoodDetails> {
  try {
    const response = await fetch(
      `${USDA_API_BASE}/food/${fdcId}?api_key=${USDA_API_KEY}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        // Cache for 24 hours
        next: { revalidate: 86400 },
      }
    );

    if (!response.ok) {
      console.error('USDA API error:', response.status, response.statusText);
      throw new Error(`USDA API error: ${response.status}`);
    }

    const data = await response.json();
    return data;
  } catch (error) {
    console.error('Error fetching USDA food details:', error);
    throw error;
  }
}

/**
 * Parse USDA food data into our standardized NutritionData format
 */
export function parseUSDAFood(usdaFood: USDAFoodDetails): NutritionData {
  const nutrients = usdaFood.foodNutrients;

  // Helper function to find nutrient value by ID
  const getNutrientValue = (nutrientId: number): number => {
    const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
    return nutrient?.value || 0;
  };

  // Determine serving size (USDA typically provides per 100g)
  const servingSize = usdaFood.servingSize || 100;
  const servingUnit = usdaFood.servingSizeUnit || 'g';

  return {
    foodName: usdaFood.description,
    fdcId: usdaFood.fdcId,
    calories: getNutrientValue(NUTRIENT_IDS.ENERGY),
    protein: getNutrientValue(NUTRIENT_IDS.PROTEIN),
    carbs: getNutrientValue(NUTRIENT_IDS.CARBS),
    fats: getNutrientValue(NUTRIENT_IDS.FAT),
    fiber: getNutrientValue(NUTRIENT_IDS.FIBER) || undefined,
    sugar: getNutrientValue(NUTRIENT_IDS.SUGARS) || undefined,
    sodium: getNutrientValue(NUTRIENT_IDS.SODIUM) || undefined,
    potassium: getNutrientValue(NUTRIENT_IDS.POTASSIUM) || undefined,
    calcium: getNutrientValue(NUTRIENT_IDS.CALCIUM) || undefined,
    iron: getNutrientValue(NUTRIENT_IDS.IRON) || undefined,
    vitaminC: getNutrientValue(NUTRIENT_IDS.VITAMIN_C) || undefined,
    vitaminA: getNutrientValue(NUTRIENT_IDS.VITAMIN_A) || undefined,
    servingSize,
    servingUnit,
    dataSource: 'usda',
  };
}

/**
 * Search and parse foods in one call
 */
export async function searchAndParseFoods(
  query: string,
  limit: number = 10
): Promise<NutritionData[]> {
  try {
    const searchResults = await searchFoods({
      query,
      pageSize: limit,
      pageNumber: 1,
    });

    if (!searchResults.foods || searchResults.foods.length === 0) {
      return [];
    }

    // Parse each food result
    return searchResults.foods.map(food => {
      const nutrients = food.foodNutrients;
      const getNutrientValue = (nutrientId: number): number => {
        const nutrient = nutrients.find(n => n.nutrientId === nutrientId);
        return nutrient?.value || 0;
      };

      return {
        foodName: food.description,
        fdcId: food.fdcId,
        calories: getNutrientValue(NUTRIENT_IDS.ENERGY),
        protein: getNutrientValue(NUTRIENT_IDS.PROTEIN),
        carbs: getNutrientValue(NUTRIENT_IDS.CARBS),
        fats: getNutrientValue(NUTRIENT_IDS.FAT),
        fiber: getNutrientValue(NUTRIENT_IDS.FIBER) || undefined,
        sugar: getNutrientValue(NUTRIENT_IDS.SUGARS) || undefined,
        sodium: getNutrientValue(NUTRIENT_IDS.SODIUM) || undefined,
        potassium: getNutrientValue(NUTRIENT_IDS.POTASSIUM) || undefined,
        calcium: getNutrientValue(NUTRIENT_IDS.CALCIUM) || undefined,
        iron: getNutrientValue(NUTRIENT_IDS.IRON) || undefined,
        vitaminC: getNutrientValue(NUTRIENT_IDS.VITAMIN_C) || undefined,
        vitaminA: getNutrientValue(NUTRIENT_IDS.VITAMIN_A) || undefined,
        servingSize: food.servingSize || 100,
        servingUnit: food.servingSizeUnit || 'g',
        dataSource: 'usda',
      };
    });
  } catch (error) {
    console.error('Error searching and parsing foods:', error);
    throw error;
  }
}

/**
 * Scale nutrition values based on serving size with unit conversion
 */
export function scaleNutrition(
  nutrition: NutritionData,
  targetServingSize: number,
  targetServingUnit: string
): NutritionData {
  let scalingFactor: number;

  // Try to convert units if they're different
  if (targetServingUnit !== nutrition.servingUnit) {
    const converted = convertUnit(
      targetServingSize,
      targetServingUnit as Unit,
      nutrition.servingUnit as Unit
    );

    if (converted === null) {
      console.warn(
        `Cannot convert ${targetServingUnit} to ${nutrition.servingUnit}. Returning original values.`
      );
      return nutrition;
    }

    // Calculate scaling factor based on converted value
    scalingFactor = converted / nutrition.servingSize;
  } else {
    // Same units, simple scaling
    scalingFactor = targetServingSize / nutrition.servingSize;
  }

  // Scale all nutrition values
  return {
    ...nutrition,
    calories: Math.round(nutrition.calories * scalingFactor),
    protein: Math.round(nutrition.protein * scalingFactor * 10) / 10,
    carbs: Math.round(nutrition.carbs * scalingFactor * 10) / 10,
    fats: Math.round(nutrition.fats * scalingFactor * 10) / 10,
    fiber: nutrition.fiber
      ? Math.round(nutrition.fiber * scalingFactor * 10) / 10
      : undefined,
    sugar: nutrition.sugar
      ? Math.round(nutrition.sugar * scalingFactor * 10) / 10
      : undefined,
    sodium: nutrition.sodium
      ? Math.round(nutrition.sodium * scalingFactor * 10) / 10
      : undefined,
    potassium: nutrition.potassium
      ? Math.round(nutrition.potassium * scalingFactor * 10) / 10
      : undefined,
    calcium: nutrition.calcium
      ? Math.round(nutrition.calcium * scalingFactor * 10) / 10
      : undefined,
    iron: nutrition.iron
      ? Math.round(nutrition.iron * scalingFactor * 10) / 10
      : undefined,
    vitaminC: nutrition.vitaminC
      ? Math.round(nutrition.vitaminC * scalingFactor * 10) / 10
      : undefined,
    vitaminA: nutrition.vitaminA
      ? Math.round(nutrition.vitaminA * scalingFactor * 10) / 10
      : undefined,
    servingSize: targetServingSize,
    servingUnit: targetServingUnit,
  };
}

/**
 * Normalize nutrition data to per-100g for consistent comparison
 */
export function normalizeTo100g(nutrition: NutritionData): NutritionData {
  // If already per 100g, return as is
  if (nutrition.servingSize === 100 && nutrition.servingUnit === 'g') {
    return nutrition;
  }

  // Convert to grams if using weight units
  if (isWeightUnit(nutrition.servingUnit as any)) {
    const gramsServing = convertWeight(
      nutrition.servingSize,
      nutrition.servingUnit as any,
      'g'
    );
    return scaleNutrition(nutrition, 100, 'g');
  }

  // For volume units, we can't accurately convert without density
  console.warn(
    `Cannot normalize ${nutrition.servingUnit} to 100g without density information`
  );
  return nutrition;
}
