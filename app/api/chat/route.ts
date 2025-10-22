import { ORCHESTRATOR_PROMPT } from "@/components/agent/orchestrator-prompt";
import {
  suggestSubstitution,
  retrieveKnowledgeBaseSimple,
  recommendWorkout,
  generateRecipeFromIngredients,
  // Meal logging tools
  logMealPreview,
  confirmMealLog,
  // Workout logging tools
  logWorkoutPreview,
  confirmWorkoutLog,
  // Profile management tools
  updateDietaryPreferences,
  confirmDietaryPreferencesUpdate,
  updateAllergiesPreview,
  confirmAllergiesUpdate,
  updateFitnessGoalsPreview,
  confirmFitnessGoalsUpdate,
  // User context retrieval
  getUserContext,
} from "@/components/agent/tools";
import { SUBAGENTS } from "@/components/agent/subagents";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

/**
 * Main Chat API Route with Multi-Agent Architecture Pattern
 *
 * This endpoint implements a multi-agent pattern using an orchestrator that embodies
 * 7 specialized agent personas through prompt engineering and intelligent tool usage:
 *
 * - cooking-assistant: Real-time cooking guidance and techniques
 * - recipe-researcher: Deep research on dishes, cuisines, and history
 * - ingredient-specialist: Ingredient substitutions and alternatives
 * - nutrition-analyst: Nutritional calculations and healthier options
 * - meal-planner: Weekly meal planning and batch cooking
 * - pantry-manager: Pantry-based recipe suggestions
 * - workout-planner: Personalized fitness routines
 *
 * The orchestrator uses context-aware prompt switching and strategic tool selection
 * to provide specialized expertise while maintaining conversation continuity.
 *
 * Note: Subagent definitions in components/agent/subagents/ serve as documentation
 * and can be used if migrating to Claude's Agent SDK in the future.
 *
 * Reference: https://docs.claude.com/en/api/agent-sdk/subagents (pattern inspiration)
 */
export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages array is required", { status: 400 });
    }

    // Get authenticated user for tool operations
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response("Unauthorized - Please sign in to use the assistant", { status: 401 });
    }

    console.log("🔐 Authenticated user:", user.id);

    const modelMessages = convertToModelMessages(messages);

    console.log("🤖 Orchestrator agent activated with", Object.keys(SUBAGENTS).length, "subagents");

    // Inject user ID into system prompt for tool calls
    const systemPromptWithUserId = ORCHESTRATOR_PROMPT.replace("{{USER_ID}}", user.id);

    const result = streamText({
      model: openai("gpt-5"),
      system: systemPromptWithUserId,
      messages: modelMessages,

      // Enable multi-step reasoning for complex orchestration
      // Allows agent to use multiple tools and coordinate responses
      stopWhen: stepCountIs(15),

      providerOptions: {
        openai: {
          reasoning_effort: "low",
          textVerbosity: "low",
          reasoningSummary: "detailed",
        },
      },

      // All tools available to the agent
      // The orchestrator prompt guides which tools to use for different queries
      tools: {
        // RAG knowledge base
        retrieveKnowledgeBase: retrieveKnowledgeBaseSimple,

        // User context for personalization
        getUserContext,

        // Specialized tools
        suggestSubstitution,
        recommendWorkout,
        generateRecipeFromIngredients,

        // Meal logging (two-step preview/confirm pattern)
        logMealPreview,
        confirmMealLog,

        // Workout logging (two-step preview/confirm pattern)
        logWorkoutPreview,
        confirmWorkoutLog,

        // Profile management (two-step preview/confirm pattern)
        updateDietaryPreferences,
        confirmDietaryPreferencesUpdate,
        updateAllergiesPreview,
        confirmAllergiesUpdate,
        updateFitnessGoalsPreview,
        confirmFitnessGoalsUpdate,

        // Web search
        web_search: openai.tools.webSearch({
          searchContextSize: "low",
        }),
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("💥 Multi-agent orchestrator error:", error);
    return new Response("Failed to generate response", { status: 500 });
  }
}
