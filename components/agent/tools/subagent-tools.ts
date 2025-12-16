/**
 * Subagent Tool Implementations
 *
 * Each subagent is implemented as a tool that runs its own streamText() with:
 * - Isolated context (separate prompt and message history)
 * - Restricted tools (only what that subagent needs)
 * - Stream merging (subagent output streams into main conversation)
 *
 * This pattern enables true multi-agent orchestration with GPT-5.2 while
 * keeping the familiar Vercel AI SDK architecture.
 */

import { tool, streamText, stepCountIs } from 'ai';
import { z } from 'zod';
import { openai } from '@ai-sdk/openai';

// Import subagent definitions
import { cookingAssistant } from '../subagents/cooking-assistant';
import { recipeResearcher } from '../subagents/recipe-researcher';
import { ingredientSpecialist } from '../subagents/ingredient-specialist';
import { nutritionAnalyst } from '../subagents/nutrition-analyst';
import { mealPlanner } from '../subagents/meal-planner';
import { pantryManager } from '../subagents/pantry-manager';
import { workoutPlanner } from '../subagents/workout-planner';
import { profileManager } from '../subagents/profile-manager';

// Import tools for subagent restriction
import { getUserContext } from './get-user-context';
import { retrieveKnowledgeBaseSimple } from './retrieve-knowledge-base-simple';
import { suggestSubstitution } from './suggest-substitution';
import { searchFoodNutrition } from './search-food-nutrition';
import { generateRecipeFromIngredients } from './generate-recipe-from-ingredients';
import { recommendWorkout } from './recommend-workout';
import { logMealPreview, confirmMealLog } from './log-meal';
import { logWorkoutPreview, confirmWorkoutLog } from './log-workout';
import { updateDietaryPreferences, confirmDietaryPreferencesUpdate } from './update-dietary-preferences';
import { updateAllergiesPreview, confirmAllergiesUpdate } from './update-allergies';
import { updateFitnessGoalsPreview, confirmFitnessGoalsUpdate } from './update-fitness-goals';

/**
 * Helper: Map tool names to actual tool implementations
 * This allows subagent definitions to specify tools by name
 */
const toolRegistry: Record<string, any> = {
  getUserContext,
  retrieveKnowledgeBase: retrieveKnowledgeBaseSimple,
  suggestSubstitution,
  searchFoodNutrition,
  generateRecipeFromIngredients,
  recommendWorkout,
  logMealPreview,
  confirmMealLog,
  logWorkoutPreview,
  confirmWorkoutLog,
  updateDietaryPreferences,
  confirmDietaryPreferencesUpdate,
  updateAllergiesPreview,
  confirmAllergiesUpdate,
  updateFitnessGoalsPreview,
  confirmFitnessGoalsUpdate,
  web_search: openai.tools.webSearch({ searchContextSize: 'low' }),
};

/**
 * Helper function to create a subagent tool
 * Reduces code duplication across all 8 subagents
 */
function createSubagentTool(
  name: string,
  description: string,
  prompt: string,
  allowedTools: string[]
) {
  return tool({
    description,
    inputSchema: z.object({
      query: z.string().describe('The specific question or task to delegate to this specialized subagent'),
      userId: z.string().optional().describe('User ID for personalized context (passed from main agent)'),
      currentDate: z.string().optional().describe('Current date in user timezone (passed from main agent)'),
      currentTime: z.string().optional().describe('Current time in user timezone (passed from main agent)'),
    }),
    execute: async ({ query, userId, currentDate, currentTime }) => {
      console.log(`\n🤖 Delegating to ${name} subagent`);
      console.log(`   Query: "${query}"`);
      console.log(`   Allowed tools: ${allowedTools.join(', ')}`);
      if (currentDate) console.log(`   Current date: ${currentDate}`);

      // Build restricted tools object for this subagent
      const restrictedTools: Record<string, any> = {};
      for (const toolName of allowedTools) {
        if (toolRegistry[toolName]) {
          restrictedTools[toolName] = toolRegistry[toolName];
        } else {
          console.warn(`⚠️  Tool "${toolName}" not found in registry for ${name}`);
        }
      }

      // Inject userId and current date/time into prompt
      let systemPrompt = prompt;

      if (userId) {
        systemPrompt += `\n\n**CRITICAL - User ID**: The authenticated user's ID is: ${userId}. Always include userId: "${userId}" when calling tools that require it.`;
      }

      if (currentDate && currentTime) {
        systemPrompt += `\n\n**CRITICAL - Current Date & Time**: The current date is ${currentDate} at ${currentTime} in the user's local timezone. When users say "today", this is the date they mean. When logging meals or workouts without a specified date, use "today" (which means ${currentDate}).`;
      }

      try {
        // Run subagent with isolated context
        const subResult = streamText({
          model: openai('gpt-5.2'), // ✅ Use GPT-5.2
          system: systemPrompt,
          messages: [{ role: 'user', content: query }],
          tools: restrictedTools,
          stopWhen: stepCountIs(5), // Limit to 5 steps for subagent tasks
          providerOptions: {
            openai: {
              reasoning_effort: 'medium',
              textVerbosity: 'low',
              reasoningSummary: 'detailed',
            },
          },
        });

        // Await the final text result from subagent
        // The main orchestrator will display this in the conversation
        const finalText = await subResult.text;
        console.log(`✅ ${name} completed (${finalText.length} chars)`);

        return {
          success: true,
          response: finalText,
          subagent: name,
          summary: `Subagent '${name}' completed the task successfully.`,
        };
      } catch (error) {
        console.error(`💥 ${name} error:`, error);
        return {
          success: false,
          error: `Failed to complete ${name} task: ${error}`,
          subagent: name,
        };
      }
    },
  });
}

/**
 * Cooking Assistant Subagent Tool
 * Real-time cooking guidance, techniques, and troubleshooting
 */
export const invokeCookingAssistant = createSubagentTool(
  'cooking-assistant',
  cookingAssistant.description,
  cookingAssistant.prompt,
  cookingAssistant.tools || []
);

/**
 * Recipe Researcher Subagent Tool
 * Deep research on recipes, cuisines, and culinary history
 */
export const invokeRecipeResearcher = createSubagentTool(
  'recipe-researcher',
  recipeResearcher.description,
  recipeResearcher.prompt,
  recipeResearcher.tools || []
);

/**
 * Ingredient Specialist Subagent Tool
 * Ingredient substitutions and alternatives
 */
export const invokeIngredientSpecialist = createSubagentTool(
  'ingredient-specialist',
  ingredientSpecialist.description,
  ingredientSpecialist.prompt,
  ingredientSpecialist.tools || []
);

/**
 * Nutrition Analyst Subagent Tool
 * Nutritional calculations and healthier alternatives
 */
export const invokeNutritionAnalyst = createSubagentTool(
  'nutrition-analyst',
  nutritionAnalyst.description,
  nutritionAnalyst.prompt,
  nutritionAnalyst.tools || []
);

/**
 * Meal Planner Subagent Tool
 * Weekly meal planning and prep strategies
 */
export const invokeMealPlanner = createSubagentTool(
  'meal-planner',
  mealPlanner.description,
  mealPlanner.prompt,
  mealPlanner.tools || []
);

/**
 * Pantry Manager Subagent Tool
 * Pantry-based recipe suggestions and waste reduction
 */
export const invokePantryManager = createSubagentTool(
  'pantry-manager',
  pantryManager.description,
  pantryManager.prompt,
  pantryManager.tools || []
);

/**
 * Workout Planner Subagent Tool
 * Personalized fitness routines and exercise guidance
 */
export const invokeWorkoutPlanner = createSubagentTool(
  'workout-planner',
  workoutPlanner.description,
  workoutPlanner.prompt,
  workoutPlanner.tools || []
);

/**
 * Profile Manager Subagent Tool
 * User preferences, allergies, and goals management
 */
export const invokeProfileManager = createSubagentTool(
  'profile-manager',
  profileManager.description,
  profileManager.prompt,
  profileManager.tools || []
);
