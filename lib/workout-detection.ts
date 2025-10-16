/**
 * Workout Detection Utilities
 *
 * Functions to detect whether a message contains workout plan content
 */

/**
 * Checks if a message contains workout plan content
 */
export function isWorkoutContent(text: string): boolean {
  const lowerText = text.toLowerCase();

  // Workout-specific keywords and patterns
  const workoutKeywords = [
    'workout',
    'exercise',
    'training',
    'sets',
    'reps',
    'repetitions',
    'fitness',
    'circuit',
    'routine',
    'warm-up',
    'cool-down',
  ];

  // Common exercise names that are strong indicators
  const exerciseNames = [
    'squat',
    'deadlift',
    'bench press',
    'push-up',
    'pull-up',
    'burpee',
    'plank',
    'lunge',
    'curl',
    'press',
    'row',
    'dip',
    'crunch',
    'leg press',
    'running',
    'jogging',
    'cycling',
    'swimming',
  ];

  // Workout structure patterns
  const workoutPatterns = [
    /\d+\s*sets/i,
    /\d+\s*reps?/i,
    /\d+\s*x\s*\d+/i, // e.g., "3 x 10"
    /\d+\s*minutes?/i,
    /\d+\s*seconds?/i,
  ];

  // Count keyword matches
  let keywordMatches = 0;
  for (const keyword of workoutKeywords) {
    if (lowerText.includes(keyword)) {
      keywordMatches++;
    }
  }

  // Count exercise name matches
  let exerciseMatches = 0;
  for (const exercise of exerciseNames) {
    if (lowerText.includes(exercise)) {
      exerciseMatches++;
    }
  }

  // Check for pattern matches
  let patternMatches = 0;
  for (const pattern of workoutPatterns) {
    if (pattern.test(lowerText)) {
      patternMatches++;
    }
  }

  // Heuristic: Consider it a workout if:
  // - Has at least 2 workout keywords AND 1 exercise name
  // - OR has at least 2 exercise names AND 1 pattern match
  // - OR has at least 3 pattern matches (strongly structured)
  const isLikelyWorkout =
    (keywordMatches >= 2 && exerciseMatches >= 1) ||
    (exerciseMatches >= 2 && patternMatches >= 1) ||
    patternMatches >= 3;

  // Additional check: If it has "recipe" or "ingredients" keywords, it's probably not a workout
  const hasRecipeKeywords = lowerText.includes('recipe') || lowerText.includes('ingredients') || lowerText.includes('cooking');
  if (hasRecipeKeywords && !lowerText.includes('workout')) {
    return false;
  }

  return isLikelyWorkout;
}
