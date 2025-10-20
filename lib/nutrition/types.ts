/**
 * Nutrition Types
 *
 * TypeScript interfaces for USDA FoodData Central API and nutrition tracking
 */

// ============================================================================
// USDA FoodData Central API Types
// ============================================================================

export interface USDAFoodSearchResult {
  totalHits: number;
  currentPage: number;
  totalPages: number;
  foods: USDAFood[];
}

export interface USDAFood {
  fdcId: number;
  description: string;
  dataType: string;
  brandOwner?: string;
  brandName?: string;
  ingredients?: string;
  servingSize?: number;
  servingSizeUnit?: string;
  foodNutrients: USDANutrient[];
}

export interface USDANutrient {
  nutrientId: number;
  nutrientName: string;
  nutrientNumber: string;
  unitName: string;
  value: number;
}

export interface USDAFoodDetails extends USDAFood {
  foodCategory?: string;
  allHighlightFields?: string;
  score?: number;
}

// ============================================================================
// Nutrition Data Types
// ============================================================================

export interface NutritionData {
  // Food identification
  foodName: string;
  fdcId?: number;

  // Macronutrients per serving
  calories: number;
  protein: number; // grams
  carbs: number; // grams
  fats: number; // grams
  fiber?: number; // grams
  sugar?: number; // grams

  // Micronutrients (optional)
  sodium?: number; // mg
  potassium?: number; // mg
  calcium?: number; // mg
  iron?: number; // mg
  vitaminC?: number; // mg
  vitaminA?: number; // IU

  // Serving information
  servingSize: number;
  servingUnit: string;

  // Metadata
  dataSource: 'usda' | 'manual' | 'user_override';
}

export interface FoodItem {
  name: string;
  quantity: number;
  unit: string;
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
}

// ============================================================================
// Meal Logging Types
// ============================================================================

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface MealLog {
  id: string;
  userId: string;
  mealType: MealType;
  foodItems: FoodItem[];
  recipeId?: string;
  totalCalories: number;
  totalProtein?: number;
  totalCarbs?: number;
  totalFats?: number;
  notes?: string;
  loggedAt: string;
  // Optional fields not in database schema
  imageUrl?: string;
  nutritionSource?: 'api' | 'manual' | 'recipe';
}

export interface CreateMealLogInput {
  userId: string;
  mealType: MealType;
  foodItems: FoodItem[];
  recipeId?: string;
  imageUrl?: string;
  notes?: string;
}

// ============================================================================
// Daily Nutrition Summary Types
// ============================================================================

export interface DailyNutrition {
  userId: string;
  date: string;
  totalCaloriesConsumed: number;
  totalProteinConsumed: number;
  totalCarbsConsumed: number;
  totalFatsConsumed: number;
  totalCaloriesBurned: number;
  netCalories: number;
}

export interface NutritionGoals {
  userId: string;
  dailyCalorieTarget: number;
  proteinTarget: number;
  carbsTarget: number;
  fatsTarget: number;
}

// ============================================================================
// Search and Cache Types
// ============================================================================

export interface FoodSearchOptions {
  query: string;
  pageSize?: number;
  pageNumber?: number;
  dataType?: string[]; // ['Foundation', 'Branded', 'Survey']
}

export interface NutritionCacheEntry {
  id: string;
  foodName: string;
  fdcId?: string; // Stored as TEXT in database
  calories: number;
  protein?: number;
  carbs?: number;
  fats?: number;
  fiber?: number;
  sugar?: number;
  sodium?: number;
  potassium?: number;
  calcium?: number;
  iron?: number;
  vitaminC?: number;
  vitaminA?: number;
  servingSize: number;
  servingUnit: string;
  dataSource: 'usda' | 'manual' | 'user_override';
  lastUpdated: string;
  apiResponse?: any; // Full USDA response
}

// ============================================================================
// Utility Types
// ============================================================================

export interface NutritionServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

export interface ScaledNutrition {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  fiber?: number;
  sugar?: number;
}
