/**
 * Subagent Tool Implementations
 *
 * Each subagent is implemented as a tool backed by a ToolLoopAgent instance.
 * ToolLoopAgent instances are created once at module load and reused across requests.
 *
 * Benefits over manual streamText():
 * - abortSignal propagation (request cancellation flows through to subagents)
 * - Native SDK agent loop management
 * - Parallel execution when orchestrator issues multiple tool calls in one step
 */

import { tool, ToolLoopAgent, readUIMessageStream } from 'ai';
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
 * Creates a subagent tool backed by a ToolLoopAgent.
 * The agent instance is created once at module load and reused across requests.
 * Uses async generator execute + agent.stream() so subagent tokens are streamed
 * to the user in real-time rather than buffered until full generation completes.
 */
function createSubagentTool(
  name: string,
  description: string,
  basePrompt: string,
  allowedToolNames: string[]
) {
  // Build restricted tools object once at module load
  const restrictedTools: Record<string, any> = {};
  for (const toolName of allowedToolNames) {
    if (toolRegistry[toolName]) {
      restrictedTools[toolName] = toolRegistry[toolName];
    } else {
      console.warn(`⚠️  Tool "${toolName}" not found in registry for ${name}`);
    }
  }

  // Instantiate ToolLoopAgent once — reused across all requests
  const agent = new ToolLoopAgent({
    model: openai('gpt-5.2'),
    instructions: basePrompt,
    tools: restrictedTools,
  });

  return tool({
    description,
    inputSchema: z.object({
      query: z.string().describe('The specific question or task to delegate to this specialized subagent'),
      userId: z.string().optional().describe('User ID for personalized context (passed from main agent)'),
      currentDate: z.string().optional().describe('Current date in user timezone (passed from main agent)'),
      currentTime: z.string().optional().describe('Current time in user timezone (passed from main agent)'),
    }),
    execute: async function* ({ query, userId, currentDate, currentTime }, { abortSignal }) {
      console.log(`\n🤖 Delegating to ${name} subagent`);
      console.log(`   Query: "${query}"`);
      if (currentDate) console.log(`   Current date: ${currentDate}`);

      // Append per-request context to the prompt
      let contextualPrompt = query;
      if (userId) {
        contextualPrompt += `\n\n**CRITICAL - User ID**: The authenticated user's ID is: ${userId}. Always include userId: "${userId}" when calling tools that require it.`;
      }
      if (currentDate && currentTime) {
        contextualPrompt += `\n\n**CRITICAL - Current Date & Time**: The current date is ${currentDate} at ${currentTime} in the user's local timezone. When users say "today", this is the date they mean. When logging meals or workouts without a specified date, use "today" (which means ${currentDate}).`;
      }

      // Stream the subagent response — yields preliminary accumulated messages
      // so the user sees tokens as they are generated, not all at once at the end
      const result = await agent.stream({ prompt: contextualPrompt, abortSignal });

      for await (const message of readUIMessageStream({
        stream: result.toUIMessageStream(),
      })) {
        yield message;
      }

      console.log(`✅ ${name} stream complete`);
    },
    toModelOutput: ({ output: message }) => {
      // Give the orchestrator only the final text to avoid context bloat
      const textParts = message?.parts?.filter((p): p is { type: 'text'; text: string } => p.type === 'text');
      const lastText = textParts?.[textParts.length - 1]?.text;
      return {
        type: 'text' as const,
        value: lastText ?? 'Task completed.',
      };
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
