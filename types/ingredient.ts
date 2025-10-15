/**
 * Ingredient Type Definitions
 *
 * Types for ingredient data structure used throughout the application
 */

export interface Ingredient {
  id: string;
  userId: string;
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: Date | null;
  category?: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface IngredientInput {
  name: string;
  quantity: number;
  unit: string;
  expiryDate?: Date | null;
  category?: string;
  notes?: string;
}

/**
 * Extracted ingredient from Vision API
 */
export interface ExtractedIngredient {
  name: string;
  quantity: number;
  unit: IngredientUnit;
  confidence: number;
  notes?: string;
}

/**
 * Response from ingredient extraction API
 */
export interface IngredientExtractionResponse {
  ingredients: ExtractedIngredient[];
  imageType: 'receipt' | 'ingredient_photo' | 'packaging' | 'other';
  overallConfidence: number;
  warnings?: string[];
}

export type IngredientUnit =
  | 'g'
  | 'kg'
  | 'oz'
  | 'lb'
  | 'ml'
  | 'l'
  | 'cup'
  | 'tbsp'
  | 'tsp'
  | 'piece'
  | 'whole'
  | 'can'
  | 'package';

export const INGREDIENT_UNITS: IngredientUnit[] = [
  'g',
  'kg',
  'oz',
  'lb',
  'ml',
  'l',
  'cup',
  'tbsp',
  'tsp',
  'piece',
  'whole',
  'can',
  'package',
];

export type IngredientCategory =
  | 'vegetables'
  | 'fruits'
  | 'meat'
  | 'seafood'
  | 'dairy'
  | 'grains'
  | 'spices'
  | 'condiments'
  | 'oils'
  | 'beverages'
  | 'snacks'
  | 'frozen'
  | 'canned'
  | 'baking'
  | 'other';

export const INGREDIENT_CATEGORIES: IngredientCategory[] = [
  'vegetables',
  'fruits',
  'meat',
  'seafood',
  'dairy',
  'grains',
  'spices',
  'condiments',
  'oils',
  'beverages',
  'snacks',
  'frozen',
  'canned',
  'baking',
  'other',
];

/**
 * Common ingredients for auto-complete functionality
 */
export const COMMON_INGREDIENTS = [
  // Vegetables
  'tomato',
  'onion',
  'garlic',
  'potato',
  'carrot',
  'bell pepper',
  'broccoli',
  'spinach',
  'lettuce',
  'cucumber',
  'celery',
  'mushroom',
  'zucchini',
  'eggplant',
  'cauliflower',

  // Fruits
  'apple',
  'banana',
  'orange',
  'lemon',
  'lime',
  'strawberry',
  'blueberry',
  'avocado',
  'mango',
  'pineapple',

  // Meat & Seafood
  'chicken breast',
  'ground beef',
  'pork chop',
  'bacon',
  'salmon',
  'tuna',
  'shrimp',
  'eggs',

  // Dairy
  'milk',
  'butter',
  'cheese',
  'yogurt',
  'cream',
  'sour cream',
  'mozzarella',
  'parmesan',
  'cheddar cheese',

  // Grains & Pasta
  'rice',
  'pasta',
  'bread',
  'flour',
  'oats',
  'quinoa',
  'couscous',

  // Spices & Herbs
  'salt',
  'black pepper',
  'paprika',
  'cumin',
  'oregano',
  'basil',
  'thyme',
  'rosemary',
  'cinnamon',
  'ginger',
  'turmeric',
  'chili powder',

  // Condiments & Oils
  'olive oil',
  'vegetable oil',
  'soy sauce',
  'vinegar',
  'ketchup',
  'mustard',
  'mayonnaise',
  'honey',
  'maple syrup',

  // Baking
  'sugar',
  'brown sugar',
  'baking powder',
  'baking soda',
  'vanilla extract',
  'cocoa powder',
  'chocolate chips',

  // Canned & Packaged
  'tomato sauce',
  'canned tomatoes',
  'beans',
  'chickpeas',
  'coconut milk',
  'chicken broth',
  'vegetable broth',
] as const;
