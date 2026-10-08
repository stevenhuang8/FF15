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
import { getRecipeSection } from '@/lib/message-sections';

// Labelled lines that describe the recipe rather than list an ingredient (e.g. "**Approx macros:** ...")
const NON_INGREDIENT_LABEL_PATTERN =
  /^(?:approx\.?\s*)?(?:macros?|nutrition|calories|best timing|timing|tips?|notes?|why|serving suggestions?|serve with|swaps?|make it|storage)\b[^:]{0,30}:/i;

function isNonIngredientLine(line: string): boolean {
  const cleaned = line
    .replace(/^(?:[-•]|\*(?!\*))\s*/, '')
    .replace(/^\d+[\.)](?!\d)\s*/, '')
    .replace(/\*\*/g, '')
    .trim();
  return NON_INGREDIENT_LABEL_PATTERN.test(cleaned) || cleaned.endsWith('?');
}

// Section header names, compared after normalizeHeaderName()
const INGREDIENTS_HEADER_PATTERN = /^(?:ingredients?|ingredient list|what you(?:'|’)?ll need|what you need|shopping list)$/;
const INSTRUCTIONS_HEADER_PATTERN = /^(?:instructions|directions|steps|method|preparation|how to make(?: it)?)$/;
const END_SECTION_HEADER_PATTERN =
  /^(?:nutrition(?: facts)?|macros|notes?|tips?|serving(?: suggestions)?|to serve|storage|variations?|make ahead|substitutions?|swaps?)$/;

// Quantities like "2", "1.5", "1/2", "1 1/2", "½", "1¼", "1–1¼"
const QUANTITY = String.raw`(?:\d+(?:\s+\d+\/\d+|[.\/]\d+)?\s?[¼½¾⅓⅔⅛]?|[¼½¾⅓⅔⅛])`;
const QUANTITY_RANGE = String.raw`${QUANTITY}(?:\s*[-–—]\s*${QUANTITY})?`;

/**
 * Returns the section name of a possible header line, ignoring markdown, a trailing colon
 * (and anything after it) and a trailing parenthetical:
 * "**Instructions (35–45 min)**" → "instructions", "### Ingredients:" → "ingredients"
 */
function normalizeHeaderName(line: string): string | null {
  const name = line
    .toLowerCase()
    .replace(/^#{1,6}\s*/, '')
    .replace(/[*_]/g, '')
    .replace(/^[-•]\s*/, '')
    .replace(/:.*$/, '')
    .replace(/\s*\([^)]*\)\s*$/, '')
    .trim();
  return name.length > 0 && name.length <= 40 ? name : null;
}

function isSectionHeader(line: string, pattern: RegExp): boolean {
  const name = normalizeHeaderName(line);
  return name !== null && pattern.test(name);
}

/** Markdown header or a standalone bold line ("**Avoid dry chicken**") */
function isStandaloneHeader(line: string): boolean {
  return /^#{1,6}\s+\S/.test(line) || /^(?:\*\*|__)[^*_]+(?:\*\*|__):?$/.test(line);
}

/** Header that groups items within a section, e.g. "**For the sauce:**" */
function isSubGroupHeader(line: string): boolean {
  const name = line.replace(/^#{1,6}\s*/, '').replace(/[*_]/g, '').trim();
  return /^(?:for|to make|make)\b/i.test(name) || name.endsWith(':');
}

function isHorizontalRule(line: string): boolean {
  return /^([-*_])\1{2,}$/.test(line);
}

/**
 * Splits "6 oz turkey + 1 cup rice" on " + ", ignoring any inside parentheses
 * ("2 tbsp curry powder (or 1 tbsp curry powder + 1 tsp cumin)" stays whole)
 */
function splitTopLevelPlus(line: string): string[] {
  const parts: string[] = [];
  let depth = 0;
  let current = '';
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '(') depth++;
    if (char === ')') depth = Math.max(0, depth - 1);
    if (depth === 0 && line.startsWith(' + ', i)) {
      parts.push(current);
      current = '';
      i += 2;
      continue;
    }
    current += char;
  }
  parts.push(current);
  return parts.filter(p => p.trim().length > 0);
}

/**
 * Extracts recipe title from text
 * Looks for common title patterns and recipe names
 */
export function extractTitle(text: string): string | null {
  const lines = text.split('\n');

  // Pattern 1: Look for "Recipe:" or "Title:" prefix (also "**Recipe:** X" / "### Recipe: X")
  const titlePrefixPattern = /^(?:recipe|title)\s*:\s*(.+)/i;
  for (const line of lines) {
    const cleaned = line.replace(/\*\*|__/g, '').replace(/^#{1,6}\s*/, '').trim();
    const match = cleaned.match(titlePrefixPattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Pattern 2: Look for markdown headers (# Recipe Name or ## Recipe Name)
  const headerPattern = /^#{1,3}\s+(.+)/;
  for (let i = 0; i < lines.length; i++) {
    const match = lines[i].match(headerPattern);
    if (match) {
      // A standalone bold line right under the header is the dish name
      // (e.g. "## Recipe to fuel glute growth" followed by "**Turkey Taco Rice Bowl**")
      const nextLine = lines.slice(i + 1).find(l => l.trim().length > 0)?.trim();
      const boldMatch = nextLine?.match(/^\*\*([^*]+)\*\*$/);
      if (boldMatch && !boldMatch[1].trim().endsWith(':')) {
        return boldMatch[1].trim();
      }

      const title = match[1].replace(/\*\*/g, '').trim();
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
      !isHorizontalRule(trimmed) &&
      !isSectionHeader(trimmed, INGREDIENTS_HEADER_PATTERN) &&
      !isSectionHeader(trimmed, INSTRUCTIONS_HEADER_PATTERN) &&
      !isSectionHeader(trimmed, END_SECTION_HEADER_PATTERN) &&
      !trimmed.match(/^\d+\./) && // not a numbered list
      !trimmed.match(/^(?:[-•]|\*(?!\*))/) // not a bulleted list
    ) {
      return trimmed.replace(/\*\*/g, '').replace(/^#{1,6}\s*/, '').trim();
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
    if (line.length === 0 || isHorizontalRule(line)) continue;

    // Start of ingredients section ("Ingredients", "**Ingredients (serves 4):**", "Ingredients: 2 cups flour, ...")
    if (isSectionHeader(line, INGREDIENTS_HEADER_PATTERN)) {
      console.log(`🥕 Found ingredients header at line ${i}: "${line}"`);
      inIngredientsSection = true;
      const inline = line.replace(/[*_]/g, '').split(':').slice(1).join(':').trim();
      if (inline.length > 0) ingredientLines.push(inline);
      continue;
    }

    if (!inIngredientsSection) continue;

    // End of ingredients section (start of instructions, notes, nutrition, ...)
    if (isSectionHeader(line, INSTRUCTIONS_HEADER_PATTERN) || isSectionHeader(line, END_SECTION_HEADER_PATTERN)) {
      console.log(`🥕 End of ingredients section at line ${i}: "${line}"`);
      break;
    }

    // Skip group headers like "**For the sauce:**"
    if (isStandaloneHeader(line)) continue;

    ingredientLines.push(line);
  }

  console.log('🥕 Found', ingredientLines.length, 'ingredient lines with headers');

  // If no ingredients found with section headers, try to find them before "Steps:" or "Instructions:"
  if (ingredientLines.length === 0) {
    console.log('🥕 No ingredients header found, trying fallback detection...');
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i].trim();
      if (line.length === 0 || isHorizontalRule(line) || isStandaloneHeader(line)) continue;

      // Check if we hit the instructions section
      if (isSectionHeader(line, INSTRUCTIONS_HEADER_PATTERN) || isSectionHeader(line, END_SECTION_HEADER_PATTERN)) {
        console.log(`🥕 Found instructions start at line ${i}: "${line}", stopping ingredient search`);
        break;
      }

      if (isNonIngredientLine(line)) continue;

      // Collect lines that look like ingredients (have measurements or bullet points)
      if (
        line.match(/^(?:[-•]|\*(?!\*))\s*/) || // bulleted
        line.match(/^\d+[\.)](?!\d)\s*/) || // numbered
        line.match(/\d+\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|liters?)/i) // has measurements
      ) {
        console.log(`🥕 Found ingredient-like line at ${i}:`, line.substring(0, 50));
        ingredientLines.push(line);
      }
    }
    console.log('🥕 Fallback found', ingredientLines.length, 'ingredient lines');
  }

  // Parse each ingredient line ("6 oz turkey + 1 cup rice" holds several ingredients)
  for (const line of ingredientLines) {
    if (isNonIngredientLine(line)) continue;
    for (const part of splitTopLevelPlus(line)) {
      const ingredient = parseIngredientLine(part);
      if (ingredient) {
        ingredients.push(ingredient);
      }
    }
  }

  return ingredients;
}

/**
 * Parses a single ingredient line into structured data
 */
function parseIngredientLine(line: string): RecipeIngredient | null {
  // Remove bullet points and list markers
  let cleaned = line.replace(/^(?:[-•]|\*(?!\*))\s*/, '').replace(/^\d+[\.)](?!\d)\s*/, '').replace(/\*\*/g, '').trim();

  if (cleaned.length === 0) return null;

  // Keep labels like "Optional:" / "Finish:" as notes and parse the rest as the ingredient
  const labelNotes: string[] = [];
  const labelMatch = cleaned.match(/^(optional|finish|garnish|to serve|for serving|toppings?)\s*:\s*(.+)$/i);
  if (labelMatch) {
    labelNotes.push(labelMatch[1]);
    cleaned = labelMatch[2].trim();
  }
  const withLabel = (notes?: string) => {
    const all = [...labelNotes, ...(notes ? [notes] : [])];
    return all.length > 0 ? all.join(' · ') : undefined;
  };

  // Pattern: "quantity unit ingredient (notes)"
  // Examples:
  // - "2 cups flour"
  // - "1/2 teaspoon salt"
  // - "1–1¼ tsp kosher salt"
  // - "3 large eggs, beaten"
  // - "1 lb chicken breast (boneless, skinless)"

  const measurementPattern = new RegExp(
    `^(${QUANTITY_RANGE})\\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|oz|ounces?|lb|lbs|pounds?|g|grams?|kg|ml|l|liters?|cloves?|pieces?|slices?|pinch|dash)?\\s+(.+)`,
    'i'
  );

  const match = cleaned.match(measurementPattern);

  if (match) {
    const quantity = match[1].trim();
    const unit = match[2] || undefined;
    let itemAndNotes = match[3];

    // Extract notes in parentheses
    const notesMatch = itemAndNotes.match(/^(.+?)\s*\((.+)\)$/);
    if (notesMatch) {
      return {
        item: notesMatch[1].trim(),
        quantity,
        unit,
        notes: withLabel(notesMatch[2].trim()),
      };
    }

    // Extract notes after comma
    const commaMatch = itemAndNotes.match(/^([^,]+),\s*(.+)$/);
    if (commaMatch) {
      return {
        item: commaMatch[1].trim(),
        quantity,
        unit,
        notes: withLabel(commaMatch[2].trim()),
      };
    }

    return {
      item: itemAndNotes.trim(),
      quantity,
      unit,
      notes: withLabel(),
    };
  }

  // No measurement detected - just item name (e.g., "Salt and pepper to taste")
  return {
    item: cleaned,
    notes: withLabel(),
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
    const trimmed = lines[i].trim();
    if (trimmed.length === 0 || isHorizontalRule(trimmed)) continue;

    // Start of instructions section ("Instructions", "**Instructions (35–45 min)**", "Steps:", ...)
    if (isSectionHeader(trimmed, INSTRUCTIONS_HEADER_PATTERN)) {
      console.log(`📋 Found instructions header at line ${i}: "${trimmed}"`);
      inInstructionsSection = true;
      continue;
    }

    if (!inInstructionsSection) continue;

    // End of instructions section: notes/tips/nutrition, or any other top-level header
    // (e.g. "**Avoid dry chicken**"); group headers like "**For the sauce:**" are skipped
    if (isSectionHeader(trimmed, END_SECTION_HEADER_PATTERN) || isSectionHeader(trimmed, INGREDIENTS_HEADER_PATTERN)) {
      console.log(`📋 End of instructions section at line ${i}`);
      break;
    }
    if (isStandaloneHeader(trimmed)) {
      if (isSubGroupHeader(trimmed)) continue;
      console.log(`📋 End of instructions section at header line ${i}: "${trimmed}"`);
      break;
    }

    // Handle numbered steps (e.g., "1. Mix ingredients")
    const numberedMatch = trimmed.match(/^\d+[\.)](?!\d)\s*(.+)/);
    if (numberedMatch) {
      instructions.push({
        step: stepNumber++,
        text: numberedMatch[1].replace(/\*\*/g, '').trim(),
      });
      continue;
    }

    // Handle bulleted steps
    const bulletMatch = trimmed.match(/^(?:[-•]|\*(?!\*))\s*(.+)/);
    if (bulletMatch) {
      instructions.push({
        step: stepNumber++,
        text: bulletMatch[1].replace(/\*\*/g, '').trim(),
      });
      continue;
    }

    // Plain text instruction (if it's substantial)
    if (trimmed.length > 20) {
      instructions.push({
        step: stepNumber++,
        text: trimmed.replace(/\*\*/g, '').trim(),
      });
    } else if (!/[.!)]$/.test(trimmed)) {
      // Short plain line without punctuation is a heading for a new section (e.g. "Avoid dry chicken")
      console.log(`📋 End of instructions section at plain heading line ${i}: "${trimmed}"`);
      break;
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
    const yieldsMatch =
      text.match(/yields?:\s*(\d+(?:-\d+)?)/i) ||
      text.match(/\b(?:serves|makes)\s+~?(\d+(?:-\d+)?)/i) ||
      text.match(/\((\d+(?:-\d+)?)\s+servings?\)/i);
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

  // Matches "protein: 41g" or "41g protein"
  const macro = (label: string, unit = 'g') =>
    text.match(new RegExp(`${label}:\\s*([\\d.]+\\s*${unit})`, 'i')) ||
    text.match(new RegExp(`([\\d.]+\\s*${unit})\\s+(?:of\\s+)?${label}\\b`, 'i'));

  // Extract calories
  const caloriesMatch =
    text.match(/calories?:\s*(\d+)/i) ||
    text.match(/(\d+)\s*(?:kcal|calories|cals?)\b/i);
  if (caloriesMatch) {
    nutrition.calories = parseInt(caloriesMatch[1], 10);
    hasNutrition = true;
  }

  // Extract protein
  const proteinMatch = macro('protein');
  if (proteinMatch) {
    nutrition.protein = proteinMatch[1];
    hasNutrition = true;
  }

  // Extract carbs
  const carbsMatch = macro('carb(?:ohydrate)?s?');
  if (carbsMatch) {
    nutrition.carbs = carbsMatch[1];
    hasNutrition = true;
  }

  // Extract fat
  const fatMatch = macro('fat');
  if (fatMatch) {
    nutrition.fat = fatMatch[1];
    hasNutrition = true;
  }

  // Extract fiber
  const fiberMatch = macro('fiber');
  if (fiberMatch) {
    nutrition.fiber = fiberMatch[1];
    hasNutrition = true;
  }

  // Extract sugar
  const sugarMatch = macro('sugars?');
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
export function extractRecipe(messageText: string): ExtractedRecipe {
  // Only parse the recipe part of messages that also contain a workout
  const text = getRecipeSection(messageText);
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

  // Quick recipes are often given as an ingredient list without steps - still saveable
  if (recipe.instructions.length === 0) {
    warnings.push('No instructions found');
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
