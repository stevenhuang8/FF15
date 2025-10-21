/**
 * Subagent Registry
 * Exports all specialized subagents for use with the main orchestrator agent
 * Based on Claude Agent SDK: https://docs.claude.com/en/api/agent-sdk/subagents
 */

import { SubagentRegistry } from "@/types/subagents";
import { cookingAssistant } from "./cooking-assistant";
import { recipeResearcher } from "./recipe-researcher";
import { ingredientSpecialist } from "./ingredient-specialist";
import { nutritionAnalyst } from "./nutrition-analyst";
import { mealPlanner } from "./meal-planner";
import { pantryManager } from "./pantry-manager";
import { workoutPlanner } from "./workout-planner";

/**
 * Complete registry of all subagents
 *
 * Usage in API routes:
 * ```typescript
 * import { SUBAGENTS } from '@/components/agent/subagents';
 *
 * const result = streamText({
 *   model: openai('gpt-5'),
 *   agents: SUBAGENTS,
 *   // ... other options
 * });
 * ```
 */
export const SUBAGENTS: SubagentRegistry = {
  "cooking-assistant": cookingAssistant,
  "recipe-researcher": recipeResearcher,
  "ingredient-specialist": ingredientSpecialist,
  "nutrition-analyst": nutritionAnalyst,
  "meal-planner": mealPlanner,
  "pantry-manager": pantryManager,
  "workout-planner": workoutPlanner,
};

/**
 * Individual subagent exports for direct access if needed
 */
export {
  cookingAssistant,
  recipeResearcher,
  ingredientSpecialist,
  nutritionAnalyst,
  mealPlanner,
  pantryManager,
  workoutPlanner,
};
