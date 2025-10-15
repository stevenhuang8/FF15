import { openai } from "@ai-sdk/openai";
import { generateObject } from "ai";
import { NextRequest } from "next/server";
import { z } from "zod";

/**
 * Ingredient Extraction API
 *
 * Uses OpenAI GPT-4 Vision to extract ingredient information from images
 * (receipts, ingredient photos, food packaging, etc.)
 */

// Zod schema for structured ingredient extraction
const ingredientSchema = z.object({
  name: z.string().describe("Name of the ingredient"),
  quantity: z.number().describe("Quantity amount as a number"),
  unit: z.enum([
    'g', 'kg', 'oz', 'lb', 'ml', 'l', 'cup', 'tbsp', 'tsp',
    'piece', 'whole', 'can', 'package'
  ]).describe("Unit of measurement"),
  confidence: z.number().min(0).max(1).describe("Confidence score (0-1) for this extraction"),
  notes: z.string().optional().describe("Any additional notes or details about the ingredient"),
});

const extractionResponseSchema = z.object({
  ingredients: z.array(ingredientSchema).describe("List of extracted ingredients"),
  imageType: z.enum(['receipt', 'ingredient_photo', 'packaging', 'other']).describe("Type of image analyzed"),
  overallConfidence: z.number().min(0).max(1).describe("Overall confidence in the extraction"),
  warnings: z.array(z.string()).optional().describe("Any warnings about unclear or ambiguous items"),
});

export async function POST(request: NextRequest) {
  try {
    const { imageUrl } = await request.json();

    if (!imageUrl || typeof imageUrl !== 'string') {
      return new Response(
        JSON.stringify({ error: "Image URL is required" }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      );
    }

    console.log('🔍 Extracting ingredients from image:', imageUrl);

    // Use GPT-4 Vision to analyze the image and extract ingredients
    const result = await generateObject({
      model: openai("gpt-4o"), // gpt-4o has vision capabilities
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `You are an expert at analyzing food-related images and extracting ingredient information.

Analyze this image and extract ALL visible ingredients with their quantities and units.

Guidelines:
- For receipts: Extract all food items with quantities if available
- For ingredient photos: Identify the ingredient and estimate quantity if visible
- For packaging: Extract the ingredient name and package quantity
- If quantity is unclear, use your best estimate and mark low confidence
- Normalize ingredient names (e.g., "tomatoe" -> "tomato")
- Convert units to standard measurements when possible
- If you see multiple of the same item, sum the quantities

Be thorough but only include actual food ingredients, not household items or non-food products.`,
            },
            {
              type: "image",
              image: imageUrl,
            },
          ],
        },
      ],
      schema: extractionResponseSchema,
      temperature: 0.3, // Lower temperature for more consistent extraction
    });

    console.log('✅ Extraction complete:', {
      ingredientCount: result.object.ingredients.length,
      imageType: result.object.imageType,
      confidence: result.object.overallConfidence,
    });

    return new Response(
      JSON.stringify(result.object),
      {
        status: 200,
        headers: { 'Content-Type': 'application/json' }
      }
    );

  } catch (error) {
    console.error("❌ Ingredient extraction error:", error);

    // Provide helpful error messages
    if (error instanceof Error) {
      return new Response(
        JSON.stringify({
          error: "Failed to extract ingredients",
          details: error.message
        }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ error: "Failed to extract ingredients" }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    );
  }
}
