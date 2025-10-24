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

// Health metrics logging tools
export { logHealthMetricsPreview, confirmHealthMetricsLog } from './log-health-metrics';

// Pantry management tools
export { addPantryItemPreview, confirmAddPantryItem } from './add-pantry-item';

// User context retrieval
export { getUserContext } from './get-user-context';

// Dashboard data access tools
export { getDashboardSummary } from './get-dashboard-summary';
export { getHealthMetricsTool } from './get-health-metrics';
export { getFitnessGoalsTool } from './get-fitness-goals';
export { getWorkoutStreakTool } from './get-workout-streak';

// Structured fitness goal management
export { createFitnessGoalTool } from './create-fitness-goal';
export { updateStructuredGoalTool } from './update-structured-goal';