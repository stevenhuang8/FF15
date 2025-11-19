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
  // Subagent delegation tools
  invokeCookingAssistant,
  invokeRecipeResearcher,
  invokeIngredientSpecialist,
  invokeNutritionAnalyst,
  invokeMealPlanner,
  invokePantryManager,
  invokeWorkoutPlanner,
  invokeProfileManager,
} from "@/components/agent/tools";
import { SUBAGENTS } from "@/components/agent/subagents";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

// Increase body size limit for multimodal requests (images)
// Vercel default: 4.5MB, increased to 10MB for compressed images
export const maxDuration = 300; // 300 seconds (5 min) for complex AI processing
// Increased  to 300s to prevent timeout during:
export const bodyParser = { sizeLimit: '10mb' };

/**
 * Main Chat API Route with True Multi-Agent Orchestration (GPT-5.1)
 *
 * This endpoint implements TRUE subagents using the tool-based delegation pattern:
 *
 * 8 Specialized Subagents (each runs its own streamText with isolated context):
 * - cooking-assistant: Real-time cooking guidance and techniques
 * - recipe-researcher: Deep research on dishes, cuisines, and history
 * - ingredient-specialist: Ingredient substitutions and alternatives
 * - nutrition-analyst: Nutritional calculations and healthier options
 * - meal-planner: Weekly meal planning and batch cooking
 * - pantry-manager: Pantry-based recipe suggestions
 * - workout-planner: Personalized fitness routines
 * - profile-manager: User preferences and goals management
 *
 * The main orchestrator (GPT-5.1) automatically delegates to specialized subagents
 * by calling invokeCookingAssistant, invokeRecipeResearcher, etc. as tools.
 * Each subagent runs in its own context with restricted tools for focused expertise.
 *
 * Benefits:
 * - True context isolation per subagent
 * - Automatic delegation based on task description
 * - Tool restrictions per subagent for security and focus
 * - Stream merging for seamless user experience
 *
 * Implementation: /components/agent/tools/subagent-tools.ts
 */
export async function POST(request: NextRequest) {
  const startTime = Date.now(); // Track execution time

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
      model: openai("gpt-5.1"), // ✅ Upgraded to GPT-5.1 for faster adaptive reasoning
      system: systemPromptWithUserContext,
      messages: modelMessages,

      // Enable multi-step reasoning for complex orchestration
      // Allows agent to use multiple tools and coordinate responses
      // Increased from 15 to 30 for multi-agent subagent delegation
      stopWhen: stepCountIs(30),

      providerOptions: {
        openai: {
          // GPT-5.1 uses adaptive reasoning - automatically decides when to think deeply
          // "medium" effort for balanced quality and latency
          reasoning_effort: "medium",
          textVerbosity: "low",
          reasoningSummary: "detailed",
        },
      },

      // Tool execution monitoring to debug "No tool output" errors
      onStepFinish: ({ toolCalls, toolResults, finishReason }) => {
        if (toolCalls && toolCalls.length > 0) {
          toolCalls.forEach((call, index) => {
            const result = toolResults?.[index];
            console.log(`🔧 Tool executed:`, {
              toolName: call.toolName,
              toolCallId: call.toolCallId,
              hasResult: !!result,
              resultType: result ? typeof result : 'undefined',
              finishReason,
            });

            // Log warning if tool didn't return output
            if (!result || result === undefined) {
              console.error(`⚠️ Tool ${call.toolName} (${call.toolCallId}) returned no output!`);
            }
          });
        }
      },

      // Monitor total execution time to optimize maxDuration
      onFinish: ({ response, finishReason }) => {
        const executionTime = Date.now() - startTime;
        const executionSeconds = (executionTime / 1000).toFixed(2);

        console.log(`⏱️ Request completed:`, {
          executionTime: `${executionSeconds}s`,
          finishReason,
          // Note: response.steps API not yet available in AI SDK v5.0.44
          warningIfSlow: executionTime > 120000 ? '⚠️ Took >2 minutes' : undefined,
        });

        // Alert if getting close to timeout
        if (executionTime > 240000) { // 4 minutes (240s)
          console.warn(`🚨 Request took ${executionSeconds}s - close to 300s timeout!`);
        }
      },

      // All tools available to the orchestrator
      // Main orchestrator can delegate to subagents OR use tools directly
      tools: {
        // ========================================
        // SUBAGENT DELEGATION TOOLS (NEW!)
        // ========================================
        // Each subagent runs its own GPT-5.1 instance with isolated context
        // The orchestrator automatically chooses which subagent based on task description
        invokeCookingAssistant,
        invokeRecipeResearcher,
        invokeIngredientSpecialist,
        invokeNutritionAnalyst,
        invokeMealPlanner,
        invokePantryManager,
        invokeWorkoutPlanner,
        invokeProfileManager,

        // ========================================
        // DIRECT TOOLS (also available to orchestrator)
        // ========================================
        // Orchestrator can use these directly for simple tasks
        // or subagents will use them when delegated to

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
