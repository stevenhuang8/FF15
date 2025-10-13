/**
 * Recipe Type Definitions
 *
 * Types for recipe data structure used throughout the application
 */

export interface RecipeIngredient {
  item: string;
  quantity?: string;
  unit?: string;
  notes?: string;
}

export interface RecipeInstruction {
  step: number;
  text: string;
}

export interface RecipeNutrition {
  calories?: number;
  protein?: string;
  carbs?: string;
  fat?: string;
  fiber?: string;
  sugar?: string;
  sodium?: string;
}

export interface RecipeMetadata {
  prepTime?: string;
  cookTime?: string;
  totalTime?: string;
  servings?: string;
  difficulty?: 'easy' | 'medium' | 'hard';
  cuisine?: string;
  course?: string; // e.g., breakfast, lunch, dinner, dessert, snack
}

export interface ExtractedRecipe {
  title: string;
  description?: string;
  ingredients: RecipeIngredient[];
  instructions: RecipeInstruction[];
  metadata: RecipeMetadata;
  nutrition?: RecipeNutrition;
  tags?: string[];
  originalText: string;
  extractedAt: Date;
  isComplete: boolean; // Whether all required fields were extracted
  missingFields?: string[]; // List of fields that couldn't be extracted
}

export interface SavedRecipe extends ExtractedRecipe {
  id: string;
  userId: string;
  conversationId?: string;
  messageId?: string;
  savedAt: Date;
  updatedAt?: Date;
  notes?: string; // User's personal notes
  rating?: number; // 1-5 stars
  isFavorite?: boolean;
}

/**
 * Validation result for extracted recipes
 */
export interface RecipeValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number; // 0-100 percentage of required fields present
}
