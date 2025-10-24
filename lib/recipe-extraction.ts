/**
 * Recipe Extraction Utilities
 *
 * Functions to parse and extract structured recipe data from natural language AI responses
 */

import type {
  ExtractedRecipe,
  RecipeIngredient,
  RecipeInstruction,
  RecipeMetadata,
  RecipeNutrition,
  RecipeValidation,
} from '@/types/recipe';

/**
 * Extracts recipe title from text
 * Looks for common title patterns and recipe names
 */
export function extractTitle(text: string): string | null {
  const lines = text.split('\n');

  // Pattern 1: Look for "Recipe:" or "Title:" prefix
  const titlePrefixPattern = /^(?:recipe|title):\s*(.+)/i;
  for (const line of lines) {
    const match = line.match(titlePrefixPattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Pattern 2: Look for markdown headers (# Recipe Name or ## Recipe Name)
  const headerPattern = /^#{1,3}\s+(.+)/;
  for (const line of lines) {
    const match = line.match(headerPattern);
    if (match) {
      const title = match[1].trim();
      // Filter out common section headers
      const excludedHeaders = ['ingredients', 'instructions', 'directions', 'nutrition', 'notes'];
      if (!excludedHeaders.some(h => title.toLowerCase().includes(h))) {
        return title;
      }
    }
  }

  // Pattern 3: First non-empty line that's not too long and doesn't look like a section header
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length > 0 &&
      trimmed.length < 80 &&
      !trimmed.match(/^(ingredients|instructions|directions|preparation|nutrition|notes):/i) &&
      !trimmed.match(/^\d+\./) && // not a numbered list
      !trimmed.match(/^[-*•]/) // not a bulleted list
    ) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Extracts ingredients list from text
 * Handles bulleted lists, numbered lists, and natural language formats
 */
export function extractIngredients(text: string): RecipeIngredient[] {
  const ingredients: RecipeIngredient[] = [];
  const lines = text.split('\n');

  let inIngredientsSection = false;
  let ingredientLines: string[] = [];

  console.log('🥕 extractIngredients: Processing', lines.length, 'lines');

  // Find the ingredients section
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();

    // Remove markdown formatting AND bullet points for comparison
    const cleanedLine = lowerLine
      .replace(/[*_#]/g, '')      // Remove markdown formatting
      .replace(/^[-•*]\s*/, '')   // Remove leading bullet points
      .trim();

    // Start of ingredients section - flexible matching
    const isIngredientsHeader =
      cleanedLine === 'ingredients' ||
      cleanedLine === 'ingredients:' ||
      cleanedLine === 'ingredient list' ||
      cleanedLine === 'ingredient list:' ||
      cleanedLine === 'what you need' ||
      cleanedLine === 'what you need:' ||
      cleanedLine === "what you'll need" ||
      cleanedLine === "what you'll need:" ||
      cleanedLine.startsWith('ingredients:') ||
      cleanedLine.startsWith('ingredient list:');

    if (isIngredientsHeader) {
      console.log(`🥕 Found ingredients header at line ${i}: "${line}" (cleaned: "${cleanedLine}")`);
      inIngredientsSection = true;
      continue;
    }

    // End of ingredients section (start of another section) - also flexible
    const isOtherSectionHeader =
      cleanedLine === 'instructions' ||
      cleanedLine === 'instructions:' ||
      cleanedLine === 'directions' ||
      cleanedLine === 'directions:' ||
      cleanedLine === 'steps' ||
      cleanedLine === 'steps:' ||
      cleanedLine === 'method' ||
      cleanedLine === 'method:' ||
      cleanedLine === 'preparation' ||
      cleanedLine === 'preparation:' ||
      cleanedLine === 'nutrition' ||
      cleanedLine === 'nutrition:' ||
      cleanedLine === 'notes' ||
      cleanedLine === 'notes:';

    if (inIngredientsSection && isOtherSectionHeader) {
      console.log(`🥕 End of ingredients section at line ${i}: "${cleanedLine}"`);
      break;
    }

    // Collect ingredient lines
    if (inIngredientsSection && line.length > 0) {
      ingredientLines.push(line);
    }
  }

  console.log('🥕 Found', ingredientLines.length, 'ingredient lines with headers');

  // If no ingredients found with section headers, try to find them before "Steps:" or "Instructions:"
  if (ingredientLines.length === 0) {
    console.log('🥕 No ingredients header found, trying fallback detection...');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      const lowerLine = line.toLowerCase();
      const cleanedLine = lowerLine
        .replace(/[*_#]/g, '')      // Remove markdown formatting
        .replace(/^[-•*]\s*/, '')   // Remove leading bullet points
        .trim();

      // Check if we hit the instructions section
      const isInstructionsStart =
        cleanedLine === 'instructions' ||
        cleanedLine === 'instructions:' ||
        cleanedLine === 'directions' ||
        cleanedLine === 'directions:' ||
        cleanedLine === 'steps' ||
        cleanedLine === 'steps:' ||
        cleanedLine === 'method' ||
        cleanedLine === 'method:' ||
        cleanedLine === 'preparation' ||
        cleanedLine === 'preparation:';

      if (isInstructionsStart) {
        console.log(`🥕 Found instructions start at line ${i}: "${cleanedLine}", stopping ingredient search`);
        break;
      }

      // Collect lines that look like ingredients (have measurements or bullet points)
      if (
        line.match(/^[-*•]\s*/) || // bulleted
        line.match(/^\d+[\.)]\s*/) || // numbered
        line.match(/\d+\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|liters?)/i) // has measurements
      ) {
        console.log(`🥕 Found ingredient-like line at ${i}:`, line.substring(0, 50));
        ingredientLines.push(line);
      }
    }
    console.log('🥕 Fallback found', ingredientLines.length, 'ingredient lines');
  }

  // Parse each ingredient line
  for (const line of ingredientLines) {
    const ingredient = parseIngredientLine(line);
    if (ingredient) {
      ingredients.push(ingredient);
    }
  }

  return ingredients;
}

/**
 * Parses a single ingredient line into structured data
 */
function parseIngredientLine(line: string): RecipeIngredient | null {
  // Remove bullet points and list markers
  let cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\d+[\.)]\s*/, '').trim();

  if (cleaned.length === 0) return null;

  // Pattern: "quantity unit ingredient (notes)"
  // Examples:
  // - "2 cups flour"
  // - "1/2 teaspoon salt"
  // - "3 large eggs, beaten"
  // - "1 lb chicken breast (boneless, skinless)"

  const measurementPattern =
    /^(\d+(?:\/\d+)?(?:\.\d+)?)\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|liters?|cloves?|pieces?|slices?|pinch|dash)?\s+(.+)/i;

  const match = cleaned.match(measurementPattern);

  if (match) {
    const quantity = match[1];
    const unit = match[2] || undefined;
    let itemAndNotes = match[3];

    // Extract notes in parentheses
    const notesMatch = itemAndNotes.match(/^(.+?)\s*\((.+)\)$/);
    if (notesMatch) {
      return {
        item: notesMatch[1].trim(),
        quantity,
        unit,
        notes: notesMatch[2].trim(),
      };
    }

    // Extract notes after comma
    const commaMatch = itemAndNotes.match(/^([^,]+),\s*(.+)$/);
    if (commaMatch) {
      return {
        item: commaMatch[1].trim(),
        quantity,
        unit,
        notes: commaMatch[2].trim(),
      };
    }

    return {
      item: itemAndNotes.trim(),
      quantity,
      unit,
    };
  }

  // No measurement detected - just item name (e.g., "Salt and pepper to taste")
  return {
    item: cleaned,
  };
}

/**
 * Extracts cooking instructions from text
 */
export function extractInstructions(text: string): RecipeInstruction[] {
  const instructions: RecipeInstruction[] = [];
  const lines = text.split('\n');

  let inInstructionsSection = false;
  let stepNumber = 1;

  console.log('📋 extractInstructions: Processing', lines.length, 'lines');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const trimmed = line.trim();
    const lowerLine = trimmed.toLowerCase();

    // Remove markdown formatting AND bullet points for comparison
    const cleanedLine = lowerLine
      .replace(/[*_#]/g, '')      // Remove markdown formatting
      .replace(/^[-•*]\s*/, '')   // Remove leading bullet points
      .trim();

    // Start of instructions section - much more flexible matching
    const isInstructionsHeader =
      cleanedLine === 'instructions' ||
      cleanedLine === 'instructions:' ||
      cleanedLine === 'directions' ||
      cleanedLine === 'directions:' ||
      cleanedLine === 'steps' ||
      cleanedLine === 'steps:' ||
      cleanedLine === 'method' ||
      cleanedLine === 'method:' ||
      cleanedLine === 'preparation' ||
      cleanedLine === 'preparation:' ||
      cleanedLine.startsWith('instructions:') ||
      cleanedLine.startsWith('directions:') ||
      cleanedLine.startsWith('steps:') ||
      cleanedLine.startsWith('method:') ||
      cleanedLine.startsWith('preparation:');

    if (isInstructionsHeader) {
      console.log(`📋 Found instructions header at line ${i}: "${cleanedLine}"`);
      inInstructionsSection = true;
      continue;
    }

    // End of instructions section
    if (inInstructionsSection && lowerLine.match(/^(nutrition|notes|tips|serving):/i)) {
      console.log(`📋 End of instructions section at line ${i}`);
      break;
    }

    if (inInstructionsSection && trimmed.length > 0) {
      // Handle numbered steps (e.g., "1. Mix ingredients")
      const numberedMatch = trimmed.match(/^\d+[\.)]\s*(.+)/);
      if (numberedMatch) {
        instructions.push({
          step: stepNumber++,
          text: numberedMatch[1].trim(),
        });
        continue;
      }

      // Handle bulleted steps
      const bulletMatch = trimmed.match(/^[-*•]\s*(.+)/);
      if (bulletMatch) {
        instructions.push({
          step: stepNumber++,
          text: bulletMatch[1].trim(),
        });
        continue;
      }

      // Plain text instruction (if it's substantial)
      if (trimmed.length > 20) {
        instructions.push({
          step: stepNumber++,
          text: trimmed,
        });
      }
    }
  }

  console.log('📋 extractInstructions: Found', instructions.length, 'steps');
  return instructions;
}

/**
 * Extracts recipe metadata (times, servings, difficulty, etc.)
 */
export function extractMetadata(text: string): RecipeMetadata {
  const metadata: RecipeMetadata = {};

  const lowerText = text.toLowerCase();

  // Extract prep time
  const prepTimeMatch = text.match(/prep(?:\s+time)?:\s*(\d+\s*(?:min(?:ute)?s?|hours?|hrs?))/i);
  if (prepTimeMatch) {
    metadata.prepTime = prepTimeMatch[1];
  }

  // Extract cook time
  const cookTimeMatch = text.match(/cook(?:\s+time)?:\s*(\d+\s*(?:min(?:ute)?s?|hours?|hrs?))/i);
  if (cookTimeMatch) {
    metadata.cookTime = cookTimeMatch[1];
  }

  // Extract total time
  const totalTimeMatch = text.match(/total(?:\s+time)?:\s*(\d+\s*(?:min(?:ute)?s?|hours?|hrs?))/i);
  if (totalTimeMatch) {
    metadata.totalTime = totalTimeMatch[1];
  }

  // Extract servings
  const servingsMatch = text.match(/servings?:\s*(\d+(?:-\d+)?)/i);
  if (servingsMatch) {
    metadata.servings = servingsMatch[1];
  } else {
    const yieldsMatch = text.match(/yields?:\s*(\d+(?:-\d+)?)/i);
    if (yieldsMatch) {
      metadata.servings = yieldsMatch[1];
    }
  }

  // Extract difficulty
  if (lowerText.includes('difficult') || lowerText.includes('advanced') || lowerText.includes('expert')) {
    metadata.difficulty = 'hard';
  } else if (lowerText.includes('medium') || lowerText.includes('intermediate')) {
    metadata.difficulty = 'medium';
  } else if (lowerText.includes('easy') || lowerText.includes('simple') || lowerText.includes('beginner')) {
    metadata.difficulty = 'easy';
  }

  // Extract cuisine type
  const cuisineMatch = text.match(/cuisine:\s*([^\n]+)/i);
  if (cuisineMatch) {
    metadata.cuisine = cuisineMatch[1].trim();
  }

  // Extract course
  const courseMatch = text.match(/course:\s*([^\n]+)/i);
  if (courseMatch) {
    metadata.course = courseMatch[1].trim().toLowerCase();
  } else {
    // Infer course from title or content
    if (lowerText.includes('breakfast') || lowerText.includes('pancake') || lowerText.includes('omelette')) {
      metadata.course = 'breakfast';
    } else if (lowerText.includes('dessert') || lowerText.includes('cake') || lowerText.includes('cookie')) {
      metadata.course = 'dessert';
    } else if (lowerText.includes('snack') || lowerText.includes('appetizer')) {
      metadata.course = 'snack';
    }
  }

  return metadata;
}

/**
 * Extracts nutritional information from text
 */
export function extractNutrition(text: string): RecipeNutrition | null {
  const nutrition: RecipeNutrition = {};
  let hasNutrition = false;

  // Extract calories
  const caloriesMatch = text.match(/calories?:\s*(\d+)/i);
  if (caloriesMatch) {
    nutrition.calories = parseInt(caloriesMatch[1], 10);
    hasNutrition = true;
  }

  // Extract protein
  const proteinMatch = text.match(/protein:\s*([\d.]+\s*g)/i);
  if (proteinMatch) {
    nutrition.protein = proteinMatch[1];
    hasNutrition = true;
  }

  // Extract carbs
  const carbsMatch = text.match(/carb(?:ohydrate)?s?:\s*([\d.]+\s*g)/i);
  if (carbsMatch) {
    nutrition.carbs = carbsMatch[1];
    hasNutrition = true;
  }

  // Extract fat
  const fatMatch = text.match(/fat:\s*([\d.]+\s*g)/i);
  if (fatMatch) {
    nutrition.fat = fatMatch[1];
    hasNutrition = true;
  }

  // Extract fiber
  const fiberMatch = text.match(/fiber:\s*([\d.]+\s*g)/i);
  if (fiberMatch) {
    nutrition.fiber = fiberMatch[1];
    hasNutrition = true;
  }

  // Extract sugar
  const sugarMatch = text.match(/sugar:\s*([\d.]+\s*g)/i);
  if (sugarMatch) {
    nutrition.sugar = sugarMatch[1];
    hasNutrition = true;
  }

  // Extract sodium
  const sodiumMatch = text.match(/sodium:\s*([\d.]+\s*(?:mg|g))/i);
  if (sodiumMatch) {
    nutrition.sodium = sodiumMatch[1];
    hasNutrition = true;
  }

  return hasNutrition ? nutrition : null;
}

/**
 * Extracts tags from recipe text
 */
export function extractTags(text: string): string[] {
  const tags: string[] = [];
  const lowerText = text.toLowerCase();

  // Dietary tags
  if (lowerText.includes('vegan')) tags.push('vegan');
  if (lowerText.includes('vegetarian')) tags.push('vegetarian');
  if (lowerText.includes('gluten-free') || lowerText.includes('gluten free')) tags.push('gluten-free');
  if (lowerText.includes('dairy-free') || lowerText.includes('dairy free')) tags.push('dairy-free');
  if (lowerText.includes('keto') || lowerText.includes('ketogenic')) tags.push('keto');
  if (lowerText.includes('paleo')) tags.push('paleo');
  if (lowerText.includes('low-carb') || lowerText.includes('low carb')) tags.push('low-carb');
  if (lowerText.includes('high-protein') || lowerText.includes('high protein')) tags.push('high-protein');

  // Cooking method tags
  if (lowerText.includes('baked') || lowerText.includes('baking')) tags.push('baked');
  if (lowerText.includes('grilled') || lowerText.includes('grilling')) tags.push('grilled');
  if (lowerText.includes('fried') || lowerText.includes('frying')) tags.push('fried');
  if (lowerText.includes('slow cooker') || lowerText.includes('crockpot')) tags.push('slow-cooker');
  if (lowerText.includes('instant pot') || lowerText.includes('pressure cooker')) tags.push('instant-pot');
  if (lowerText.includes('no-cook') || lowerText.includes('no cook')) tags.push('no-cook');

  // Time-based tags
  if (
    (lowerText.includes('quick') || lowerText.includes('easy') || lowerText.includes('30 minutes')) &&
    !lowerText.includes('slow')
  ) {
    tags.push('quick');
  }

  return [...new Set(tags)]; // Remove duplicates
}

/**
 * Main extraction function that combines all extractors
 */
export function extractRecipe(text: string): ExtractedRecipe {
  console.log('🔍 Extracting recipe from text:', text.substring(0, 200) + '...');

  const title = extractTitle(text) || 'Untitled Recipe';
  console.log('📝 Extracted title:', title);

  const ingredients = extractIngredients(text);
  console.log('🥕 Extracted ingredients:', ingredients.length, 'items');

  const instructions = extractInstructions(text);
  console.log('📋 Extracted instructions:', instructions.length, 'steps');

  const metadata = extractMetadata(text);
  const nutrition = extractNutrition(text);
  const tags = extractTags(text);

  // Determine completeness
  const missingFields: string[] = [];
  if (!title || title === 'Untitled Recipe') missingFields.push('title');
  if (ingredients.length === 0) missingFields.push('ingredients');
  if (instructions.length === 0) missingFields.push('instructions');

  const isComplete = missingFields.length === 0;

  if (!isComplete) {
    console.log('⚠️ Recipe incomplete. Missing:', missingFields);
  }

  return {
    title,
    ingredients,
    instructions,
    metadata,
    nutrition: nutrition || undefined,
    tags: tags.length > 0 ? tags : undefined,
    originalText: text,
    extractedAt: new Date(),
    isComplete,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
  };
}

/**
 * Validates an extracted recipe
 */
export function validateRecipe(recipe: ExtractedRecipe): RecipeValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!recipe.title || recipe.title === 'Untitled Recipe') {
    errors.push('Recipe title is missing');
  }

  if (recipe.ingredients.length === 0) {
    errors.push('No ingredients found');
  } else if (recipe.ingredients.length < 2) {
    warnings.push('Only one ingredient found - recipe may be incomplete');
  }

  if (recipe.instructions.length === 0) {
    errors.push('No instructions found');
  } else if (recipe.instructions.length < 2) {
    warnings.push('Only one instruction step found - recipe may be incomplete');
  }

  // Check optional fields
  if (!recipe.metadata.servings) {
    warnings.push('Servings information is missing');
  }

  if (!recipe.metadata.prepTime && !recipe.metadata.cookTime && !recipe.metadata.totalTime) {
    warnings.push('Time information is missing');
  }

  if (!recipe.nutrition) {
    warnings.push('Nutritional information is missing');
  }

  // Calculate completeness score
  let score = 0;
  const totalPoints = 10;

  if (recipe.title && recipe.title !== 'Untitled Recipe') score += 2;
  if (recipe.ingredients.length >= 2) score += 2;
  if (recipe.instructions.length >= 2) score += 2;
  if (recipe.metadata.servings) score += 1;
  if (recipe.metadata.prepTime || recipe.metadata.cookTime || recipe.metadata.totalTime) score += 1;
  if (recipe.nutrition) score += 1;
  if (recipe.tags && recipe.tags.length > 0) score += 1;

  const completeness = Math.round((score / totalPoints) * 100);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness,
  };
}
