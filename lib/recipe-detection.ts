/**
 * Recipe Detection Utilities
 *
 * Functions to detect if an AI message contains a recipe
 */

/**
 * Detects if message content contains a recipe
 *
 * A message is considered to contain a recipe if it has:
 * - Recipe-related keywords (ingredients, instructions, recipe, cook, bake, etc.)
 * - Structured lists (numbered steps or bulleted ingredients)
 * - Common recipe patterns (servings, prep time, cook time, etc.)
 */
export function isRecipeContent(content: string): boolean {
  if (!content || content.trim().length === 0) {
    return false;
  }

  const lowerContent = content.toLowerCase();

  // Recipe-specific keywords with high confidence
  const recipeKeywords = [
    'ingredients:',
    'instructions:',
    'directions:',
    'recipe',
    'servings:',
    'prep time:',
    'cook time:',
    'total time:',
    'calories:',
  ];

  // Cooking action verbs that indicate recipe instructions
  const cookingVerbs = [
    'preheat',
    'bake',
    'mix',
    'combine',
    'whisk',
    'stir',
    'sauté',
    'simmer',
    'boil',
    'fry',
    'roast',
    'grill',
    'chop',
    'dice',
    'mince',
    'slice',
  ];

  // Count recipe indicators
  let recipeScore = 0;

  // Check for recipe keywords (high weight)
  for (const keyword of recipeKeywords) {
    if (lowerContent.includes(keyword)) {
      recipeScore += 3;
    }
  }

  // Check for cooking verbs (medium weight)
  const cookingVerbCount = cookingVerbs.filter(verb =>
    lowerContent.includes(verb)
  ).length;
  recipeScore += cookingVerbCount;

  // Check for structured lists (numbered steps or bulleted ingredients)
  const hasNumberedSteps = /\n\s*\d+[\.)]\s+/.test(content); // "1. " or "1) "
  const hasBulletedList = /\n\s*[-*•]\s+/.test(content); // "- ", "* ", or "• "

  if (hasNumberedSteps) {
    recipeScore += 2;
  }
  if (hasBulletedList) {
    recipeScore += 2;
  }

  // Check for measurements (indicates ingredients list)
  const measurementPattern = /\b\d+(?:\/\d+)?\s*(?:cup|tbsp|tsp|tablespoon|teaspoon|oz|lb|g|kg|ml|l|pound|ounce|gram|liter)\b/i;
  if (measurementPattern.test(content)) {
    recipeScore += 2;
  }

  // Minimum score threshold for recipe detection
  // Score >= 5 indicates high confidence this is a recipe
  return recipeScore >= 5;
}

/**
 * Extracts text content from message parts
 */
export function getMessageTextContent(message: any): string {
  // Extract text from parts array
  const textParts = message.parts?.filter((p: any) => p.type === 'text') || [];
  const textFromParts = textParts.map((part: any) => part.text).join('\n\n');

  // Fallback to legacy content field
  const legacyContent = message.content || '';

  const result = textFromParts || legacyContent;

  console.log('📄 getMessageTextContent:', {
    messageId: message.id,
    partsCount: message.parts?.length || 0,
    textPartsCount: textParts.length,
    textLength: result.length,
    preview: result.substring(0, 150)
  });

  return result;
}
