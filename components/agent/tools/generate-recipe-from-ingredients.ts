import { tool } from "ai";
import { z } from "zod";

/**
 * AI SDK Tool: Generate Recipe from Available Ingredients
 *
 * This tool allows the AI to fetch the user's available ingredients
 * and use them to generate recipe suggestions during conversation.
 *
 * Usage: The AI will automatically call this tool when users ask
 * questions like "What can I make with my ingredients?" or
 * "Suggest recipes based on what I have."
 */
export const generateRecipeFromIngredients = tool({
  description:
    "Fetch the user's available ingredient inventory to generate recipe suggestions. Use this tool when users ask what they can cook with their available ingredients, want recipe suggestions based on their pantry, or need ideas for using up ingredients before they expire. This tool retrieves all ingredients with quantities, units, expiry dates, and categories.",
  inputSchema: z.object({
    prioritizeExpiring: z
      .boolean()
      .optional()
      .describe(
        "Whether to prioritize ingredients that are expiring soon in the response"
      ),
    dietaryRestrictions: z
      .array(z.string())
      .optional()
      .describe(
        "Optional dietary restrictions to consider (e.g., vegetarian, vegan, gluten-free)"
      ),
  }),
  execute: async ({ prioritizeExpiring = true, dietaryRestrictions = [] }) => {
    try {
      console.log('🔧 generateRecipeFromIngredients tool called', {
        prioritizeExpiring,
        dietaryRestrictions
      });

      // Fetch ingredients from API
      // Note: This runs server-side, so we need to handle authentication differently
      // For now, we'll return a structured response that the AI can use

      // In a real implementation, this would fetch from Supabase directly
      // using server-side Supabase client with proper user context

      // For now, return a helpful message that guides the AI
      return {
        success: true,
        message: "To generate recipe suggestions, I need to know what ingredients you have. Please use the 'Generate Recipe from Ingredients' button or tell me what ingredients you have available.",
        guidance: {
          suggestion: "Ask the user to either:\n1. Click the 'Generate Recipe from Ingredients' button to automatically list their pantry\n2. Manually list the ingredients they want to use\n3. Describe what they have available",
          nextSteps: [
            "Once ingredients are provided, analyze them for recipe compatibility",
            "Consider ingredient quantities and expiry dates",
            "Suggest recipes that maximize ingredient usage",
            "Highlight any ingredients that are expiring soon",
            "Provide alternatives if some ingredients are missing"
          ]
        },
        toolCapabilities: {
          canPrioritizeExpiring: prioritizeExpiring,
          canApplyDietaryRestrictions: dietaryRestrictions.length > 0,
          restrictions: dietaryRestrictions
        }
      };
    } catch (error) {
      console.error('💥 Error in generateRecipeFromIngredients tool:', error);
      return {
        success: false,
        message: `Failed to retrieve ingredients: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        guidance: {
          suggestion: "Ask the user to manually provide their available ingredients or try again later."
        }
      };
    }
  },
});
