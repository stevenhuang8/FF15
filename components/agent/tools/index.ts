// Existing tools
export { retrieveKnowledgeBase } from './retrieve-knowledge-base';
export { retrieveKnowledgeBaseSimple } from './retrieve-knowledge-base-simple';
export { generateRecipeFromIngredients } from './generate-recipe-from-ingredients';
export { recommendWorkout } from './recommend-workout';
export { suggestSubstitution } from './suggest-substitution';

// Food nutrition search
export { searchFoodNutrition } from './search-food-nutrition';

// Profile management tools
export {
  updateDietaryPreferences,
  confirmDietaryPreferencesUpdate,
} from './update-dietary-preferences';
export { updateAllergiesPreview, confirmAllergiesUpdate } from './update-allergies';
export {
  updateFitnessGoalsPreview,
  confirmFitnessGoalsUpdate,
} from './update-fitness-goals';

// Meal logging tools
export { logMealPreview, confirmMealLog } from './log-meal';

// Workout logging tools
export { logWorkoutPreview, confirmWorkoutLog } from './log-workout';

// User context retrieval
export { getUserContext } from './get-user-context';