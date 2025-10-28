import { ORCHESTRATOR_PROMPT } from "@/components/agent/orchestrator-prompt";
import {
  suggestSubstitution,
  retrieveKnowledgeBaseSimple,
  recommendWorkout,
  generateRecipeFromIngredients,
  searchFoodNutrition,
  // Meal logging tools
  logMealPreview,
  confirmMealLog,
  // Workout logging tools
  logWorkoutPreview,
  confirmWorkoutLog,
  // Health metrics logging tools
  logHealthMetricsPreview,
  confirmHealthMetricsLog,
  // Pantry management tools
  addPantryItemPreview,
  confirmAddPantryItem,
  // Profile management tools
  updateDietaryPreferences,
  confirmDietaryPreferencesUpdate,
  updateAllergiesPreview,
  confirmAllergiesUpdate,
  updateFitnessGoalsPreview,
  confirmFitnessGoalsUpdate,
  // User context retrieval
  getUserContext,
  // Dashboard data access tools
  getDashboardSummary,
  getHealthMetricsTool,
  getFitnessGoalsTool,
  getWorkoutStreakTool,
  // Structured fitness goal management
  createFitnessGoalTool,
  updateStructuredGoalTool,
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

    // Fetch user profile to get their name
    const { data: userProfile } = await supabase
      .from("user_profiles")
      .select("full_name")
      .eq("id", user.id)
      .single();

    const userName = userProfile?.full_name || "there";
    console.log("👤 User name:", userName);

    // Get user's timezone from request headers (sent from browser)
    const userTimezone = request.headers.get('X-User-Timezone') || 'UTC';
    const timezoneOffset = request.headers.get('X-User-Timezone-Offset') || '0';

    const timezone = userTimezone;
    const offset = parseInt(timezoneOffset, 10);

    console.log("🌍 User timezone:", timezone, `(offset: ${offset} minutes)`);

    // Get current date/time in user's timezone
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: timezone
    });
    const formattedTime = currentDate.toLocaleTimeString('en-US', {
      hour: 'numeric',
      minute: '2-digit',
      hour12: true,
      timeZone: timezone
    });

    console.log("📅 Current date/time:", formattedDate, "at", formattedTime);

    const modelMessages = convertToModelMessages(messages);

    console.log("🤖 Orchestrator agent activated with", Object.keys(SUBAGENTS).length, "subagents");

    // Inject user ID, name, and current date/time into system prompt
    const systemPromptWithUserContext = ORCHESTRATOR_PROMPT
      .replace("{{USER_ID}}", user.id)
      .replace("{{USER_NAME}}", userName)
      .replace("{{CURRENT_DATE}}", formattedDate)
      .replace("{{CURRENT_TIME}}", formattedTime);

    const result = streamText({
      model: openai("gpt-5"),
      system: systemPromptWithUserContext,
      messages: modelMessages,

      // Enable multi-step reasoning for complex orchestration
      // Allows agent to use multiple tools and coordinate responses
      // Increased from 15 to 30 for better multi-domain query handling
      stopWhen: stepCountIs(30),

      providerOptions: {
        openai: {
          // Increased from "low" to "medium" for better quality reasoning (+10-15% quality)
          // Note: GPT-5 is a reasoning model - temperature is not supported
          reasoning_effort: "medium",
          textVerbosity: "low",
          reasoningSummary: "detailed",
        },
      },

      // All tools available to the agent
      // The orchestrator uses prompt engineering to simulate specialized subagents
      // Subagent definitions in /components/agent/subagents/ provide documentation
      // for future migration to Claude's Agent SDK when available in Vercel AI SDK
      tools: {
        // RAG knowledge base
        retrieveKnowledgeBase: retrieveKnowledgeBaseSimple,

        // User context for personalization
        getUserContext,

        // Dashboard data access (health metrics, goals, streaks)
        getDashboardSummary,
        getHealthMetrics: getHealthMetricsTool,
        getFitnessGoals: getFitnessGoalsTool,
        getWorkoutStreak: getWorkoutStreakTool,

        // Specialized tools
        suggestSubstitution,
        recommendWorkout,
        generateRecipeFromIngredients,
        searchFoodNutrition,

        // Meal logging (two-step preview/confirm pattern)
        logMealPreview,
        confirmMealLog,

        // Workout logging (two-step preview/confirm pattern)
        logWorkoutPreview,
        confirmWorkoutLog,

        // Health metrics logging (two-step preview/confirm pattern)
        logHealthMetricsPreview,
        confirmHealthMetricsLog,

        // Pantry management (two-step preview/confirm pattern)
        addPantryItemPreview,
        confirmAddPantryItem,

        // Profile management (two-step preview/confirm pattern)
        updateDietaryPreferences,
        confirmDietaryPreferencesUpdate,
        updateAllergiesPreview,
        confirmAllergiesUpdate,
        updateFitnessGoalsPreview,
        confirmFitnessGoalsUpdate,

        // Structured fitness goal management (Active Goals section)
        createFitnessGoal: createFitnessGoalTool,
        updateStructuredGoal: updateStructuredGoalTool,

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
