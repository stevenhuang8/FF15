/**
 * Workout Extraction Utilities
 *
 * Functions to parse and extract structured workout data from natural language AI responses
 */

import type {
  ExtractedWorkout,
  WorkoutExercise,
  WorkoutMetadata,
  WorkoutValidation,
} from '@/types/workout';

/**
 * Extracts workout title from text
 */
export function extractTitle(text: string): string | null {
  const lines = text.split('\n');

  // Pattern 1: Look for "Workout:" or "Title:" prefix
  const titlePrefixPattern = /^(?:workout|title|plan):\s*(.+)/i;
  for (const line of lines) {
    const match = line.match(titlePrefixPattern);
    if (match) {
      return match[1].trim();
    }
  }

  // Pattern 2: Look for markdown headers (# Workout Name or ## Workout Name)
  const headerPattern = /^#{1,3}\s+(.+)/;
  for (const line of lines) {
    const match = line.match(headerPattern);
    if (match) {
      const title = match[1].trim();
      // Filter out common section headers
      const excludedHeaders = ['exercises', 'warm-up', 'cool-down', 'notes', 'equipment'];
      if (!excludedHeaders.some(h => title.toLowerCase().includes(h))) {
        return title;
      }
    }
  }

  // Pattern 3: First non-empty line that's not too long
  for (const line of lines) {
    const trimmed = line.trim();
    if (
      trimmed.length > 0 &&
      trimmed.length < 80 &&
      !trimmed.match(/^(exercises|warm-up|cool-down|equipment|notes):/i) &&
      !trimmed.match(/^\d+\./) && // not a numbered list
      !trimmed.match(/^[-*•]/) // not a bulleted list
    ) {
      return trimmed;
    }
  }

  return null;
}

/**
 * Determines workout category from text
 */
export function extractCategory(text: string): 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'mixed' {
  const lowerText = text.toLowerCase();

  // Count indicators for each category
  const strengthIndicators = ['strength', 'weight', 'barbell', 'dumbbell', 'bench press', 'squat', 'deadlift', 'sets', 'reps'];
  const cardioIndicators = ['cardio', 'running', 'cycling', 'rowing', 'endurance', 'aerobic'];
  const hiitIndicators = ['hiit', 'high intensity', 'interval', 'tabata', 'circuit'];
  const flexibilityIndicators = ['flexibility', 'stretch', 'yoga', 'mobility', 'pilates'];

  const strengthCount = strengthIndicators.filter(ind => lowerText.includes(ind)).length;
  const cardioCount = cardioIndicators.filter(ind => lowerText.includes(ind)).length;
  const hiitCount = hiitIndicators.filter(ind => lowerText.includes(ind)).length;
  const flexibilityCount = flexibilityIndicators.filter(ind => lowerText.includes(ind)).length;

  const counts = [
    { category: 'strength' as const, count: strengthCount },
    { category: 'cardio' as const, count: cardioCount },
    { category: 'hiit' as const, count: hiitCount },
    { category: 'flexibility' as const, count: flexibilityCount },
  ];

  // Sort by count descending
  counts.sort((a, b) => b.count - a.count);

  // If top two are close, it's mixed
  if (counts[0].count > 0 && counts[1].count > 0 && counts[0].count - counts[1].count <= 1) {
    return 'mixed';
  }

  // Return highest scoring category, or default to mixed
  return counts[0].count > 0 ? counts[0].category : 'mixed';
}

/**
 * Extracts exercises list from text
 */
export function extractExercises(text: string): WorkoutExercise[] {
  const exercises: WorkoutExercise[] = [];
  const lines = text.split('\n');

  let inExercisesSection = false;
  let exerciseLines: string[] = [];

  console.log('💪 extractExercises: Processing', lines.length, 'lines');

  // Find the exercises section
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    const lowerLine = line.toLowerCase();
    const cleanedLine = lowerLine.replace(/[*_#]/g, '').trim();

    // Start of exercises section
    const isExercisesHeader =
      cleanedLine === 'exercises' ||
      cleanedLine === 'exercises:' ||
      cleanedLine === 'workout' ||
      cleanedLine === 'workout:' ||
      cleanedLine === 'the workout' ||
      cleanedLine === 'the workout:' ||
      cleanedLine.startsWith('exercises:') ||
      cleanedLine.startsWith('workout:');

    if (isExercisesHeader) {
      console.log(`💪 Found exercises header at line ${i}: "${line}"`);
      inExercisesSection = true;
      continue;
    }

    // End of exercises section
    const isOtherSectionHeader =
      cleanedLine === 'notes' ||
      cleanedLine === 'notes:' ||
      cleanedLine === 'cool-down' ||
      cleanedLine === 'cool-down:' ||
      cleanedLine === 'cooldown' ||
      cleanedLine === 'cooldown:' ||
      cleanedLine === 'tips' ||
      cleanedLine === 'tips:';

    if (inExercisesSection && isOtherSectionHeader) {
      console.log(`💪 End of exercises section at line ${i}`);
      break;
    }

    // Collect exercise lines
    if (inExercisesSection && line.length > 0) {
      exerciseLines.push(line);
    }
  }

  console.log('💪 Found', exerciseLines.length, 'exercise lines');

  // If no exercises found with section headers, try to find them anywhere
  if (exerciseLines.length === 0) {
    console.log('💪 No exercises header found, trying fallback detection...');
    for (const line of lines) {
      const trimmed = line.trim();
      // Look for lines that match exercise patterns
      if (
        trimmed.match(/^[-*•]\s*/) || // bulleted
        trimmed.match(/^\d+[\.)]\s*/) || // numbered
        trimmed.match(/\d+\s*sets?/i) || // has "sets"
        trimmed.match(/\d+\s*reps?/i) || // has "reps"
        trimmed.match(/\d+\s*(?:seconds?|minutes?)/i) // has duration
      ) {
        exerciseLines.push(trimmed);
      }
    }
    console.log('💪 Fallback found', exerciseLines.length, 'exercise lines');
  }

  // Parse each exercise line
  for (const line of exerciseLines) {
    const exercise = parseExerciseLine(line);
    if (exercise) {
      exercises.push(exercise);
    }
  }

  return exercises;
}

/**
 * Parses a single exercise line into structured data
 */
function parseExerciseLine(line: string): WorkoutExercise | null {
  // Remove bullet points and list markers
  let cleaned = line.replace(/^[-*•]\s*/, '').replace(/^\d+[\.)]\s*/, '').trim();

  if (cleaned.length === 0) return null;

  console.log('💪 Parsing exercise line:', cleaned);

  // Pattern examples:
  // - "Barbell Squat - 3 sets of 8-10 reps"
  // - "Bench Press: 4 sets x 6 reps"
  // - "Running - 20 minutes at medium intensity"
  // - "Plank: 3 sets x 30 seconds"
  // - "Burpees - 3 rounds of 15 reps (rest 60 seconds)"

  const exercise: WorkoutExercise = {
    name: '',
  };

  // Extract name (everything before first : or -)
  const nameSeparatorMatch = cleaned.match(/^([^:-]+)[\s]*[:-]\s*(.+)/);
  if (nameSeparatorMatch) {
    exercise.name = nameSeparatorMatch[1].trim();
    const detailsText = nameSeparatorMatch[2];

    // Extract sets
    const setsMatch = detailsText.match(/(\d+)\s*sets?/i);
    if (setsMatch) {
      exercise.sets = parseInt(setsMatch[1], 10);
    }

    // Extract reps (can be single number or range like "8-10")
    const repsMatch = detailsText.match(/(\d+(?:-\d+)?|to failure)\s*reps?/i);
    if (repsMatch) {
      exercise.reps = repsMatch[1];
    }

    // Extract duration
    const durationMatch = detailsText.match(/(\d+\s*(?:seconds?|minutes?|sec|min))/i);
    if (durationMatch && !repsMatch) { // Only set duration if no reps found
      exercise.duration = durationMatch[1];
    }

    // Extract intensity
    const intensityMatch = detailsText.match(/(low|medium|high|light|moderate|intense)\s*intensity/i);
    if (intensityMatch) {
      const intensityMap: Record<string, 'low' | 'medium' | 'high'> = {
        'low': 'low',
        'light': 'low',
        'medium': 'medium',
        'moderate': 'medium',
        'high': 'high',
        'intense': 'high',
      };
      exercise.intensity = intensityMap[intensityMatch[1].toLowerCase()];
    }

    // Extract rest period
    const restMatch = detailsText.match(/rest:?\s*(\d+\s*(?:seconds?|minutes?|sec|min))/i);
    if (restMatch) {
      exercise.rest = restMatch[1];
    } else {
      // Look for rest in parentheses
      const restParenMatch = detailsText.match(/\(rest\s+(\d+\s*(?:seconds?|minutes?|sec|min))\)/i);
      if (restParenMatch) {
        exercise.rest = restParenMatch[1];
      }
    }
  } else {
    // No separator found, just use the whole line as name
    exercise.name = cleaned;
  }

  // If name is too short or empty, skip
  if (exercise.name.length < 3) {
    console.log('💪 Skipping line with too-short name:', exercise.name);
    return null;
  }

  console.log('💪 Parsed exercise:', exercise);
  return exercise;
}

/**
 * Extracts workout metadata (duration, difficulty, equipment, etc.)
 */
export function extractMetadata(text: string): WorkoutMetadata {
  const metadata: WorkoutMetadata = {};
  const lowerText = text.toLowerCase();

  // Extract duration
  const durationMatch = text.match(/(?:duration|time|length):\s*(\d+\s*(?:min(?:ute)?s?|hours?|hrs?))/i);
  if (durationMatch) {
    metadata.estimatedDuration = durationMatch[1];
  }

  // Extract difficulty
  if (lowerText.includes('advanced') || lowerText.includes('expert')) {
    metadata.difficulty = 'advanced';
  } else if (lowerText.includes('intermediate') || lowerText.includes('moderate')) {
    metadata.difficulty = 'intermediate';
  } else if (lowerText.includes('beginner') || lowerText.includes('easy')) {
    metadata.difficulty = 'beginner';
  }

  // Extract target muscle groups
  const muscleGroups: string[] = [];
  const muscles = ['chest', 'back', 'legs', 'arms', 'shoulders', 'core', 'abs', 'glutes', 'biceps', 'triceps', 'quads', 'hamstrings', 'calves'];
  for (const muscle of muscles) {
    if (lowerText.includes(muscle)) {
      muscleGroups.push(muscle);
    }
  }
  if (muscleGroups.length > 0) {
    metadata.targetMuscleGroups = [...new Set(muscleGroups)];
  }

  // Extract equipment
  const equipment: string[] = [];
  const equipmentList = ['barbell', 'dumbbell', 'dumbbells', 'kettlebell', 'resistance bands', 'pull-up bar', 'bench', 'mat', 'bodyweight', 'none'];
  for (const item of equipmentList) {
    if (lowerText.includes(item)) {
      equipment.push(item);
    }
  }
  if (equipment.length > 0) {
    metadata.equipment = [...new Set(equipment)];
  }

  // Extract warm-up notes
  const warmupMatch = text.match(/warm[\s-]?up:\s*([^\n]+)/i);
  if (warmupMatch) {
    metadata.warmupNotes = warmupMatch[1].trim();
  }

  // Extract cool-down notes
  const cooldownMatch = text.match(/cool[\s-]?down:\s*([^\n]+)/i);
  if (cooldownMatch) {
    metadata.cooldownNotes = cooldownMatch[1].trim();
  }

  return metadata;
}

/**
 * Main extraction function that combines all extractors
 */
export function extractWorkout(text: string): ExtractedWorkout {
  console.log('🔍 Extracting workout from text:', text.substring(0, 200) + '...');

  const title = extractTitle(text) || 'Untitled Workout';
  console.log('📝 Extracted title:', title);

  const category = extractCategory(text);
  console.log('📂 Detected category:', category);

  const exercises = extractExercises(text);
  console.log('💪 Extracted exercises:', exercises.length, 'items');

  const metadata = extractMetadata(text);

  // Determine completeness
  const missingFields: string[] = [];
  if (!title || title === 'Untitled Workout') missingFields.push('title');
  if (exercises.length === 0) missingFields.push('exercises');

  const isComplete = missingFields.length === 0;

  if (!isComplete) {
    console.log('⚠️ Workout incomplete. Missing:', missingFields);
  }

  return {
    title,
    category,
    exercises,
    metadata,
    originalText: text,
    extractedAt: new Date(),
    isComplete,
    missingFields: missingFields.length > 0 ? missingFields : undefined,
  };
}

/**
 * Validates an extracted workout
 */
export function validateWorkout(workout: ExtractedWorkout): WorkoutValidation {
  const errors: string[] = [];
  const warnings: string[] = [];

  // Check required fields
  if (!workout.title || workout.title === 'Untitled Workout') {
    errors.push('Workout title is missing');
  }

  if (workout.exercises.length === 0) {
    errors.push('No exercises found');
  } else if (workout.exercises.length < 2) {
    warnings.push('Only one exercise found - workout may be incomplete');
  }

  // Check exercise completeness
  const exercisesWithDetails = workout.exercises.filter(e => e.sets || e.reps || e.duration);
  if (exercisesWithDetails.length < workout.exercises.length) {
    warnings.push('Some exercises are missing sets/reps/duration information');
  }

  // Check optional fields
  if (!workout.metadata.estimatedDuration) {
    warnings.push('Duration information is missing');
  }

  if (!workout.metadata.difficulty) {
    warnings.push('Difficulty level is missing');
  }

  // Calculate completeness score
  let score = 0;
  const totalPoints = 10;

  if (workout.title && workout.title !== 'Untitled Workout') score += 2;
  if (workout.exercises.length >= 2) score += 2;
  if (exercisesWithDetails.length >= 2) score += 2;
  if (workout.metadata.estimatedDuration) score += 1;
  if (workout.metadata.difficulty) score += 1;
  if (workout.metadata.equipment && workout.metadata.equipment.length > 0) score += 1;
  if (workout.metadata.targetMuscleGroups && workout.metadata.targetMuscleGroups.length > 0) score += 1;

  const completeness = Math.round((score / totalPoints) * 100);

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
    completeness,
  };
}
