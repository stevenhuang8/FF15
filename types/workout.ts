/**
 * Workout Type Definitions
 *
 * Types for workout data structure used throughout the application
 */

export interface WorkoutExercise {
  name: string;
  sets?: number;
  reps?: number | string; // Can be "10" or "10-12" or "to failure"
  duration?: string; // For timed exercises like "30 seconds" or "2 minutes"
  intensity?: 'low' | 'medium' | 'high';
  rest?: string; // Rest period like "60 seconds" or "1 minute"
  notes?: string;
  exerciseId?: string; // Reference to exercises table if matched
}

export interface WorkoutMetadata {
  estimatedDuration?: string; // "30 minutes", "1 hour"
  difficulty?: 'beginner' | 'intermediate' | 'advanced';
  targetMuscleGroups?: string[]; // ['chest', 'triceps', 'shoulders']
  equipment?: string[]; // ['barbell', 'dumbbells', 'bench']
  warmupNotes?: string;
  cooldownNotes?: string;
}

export interface ExtractedWorkout {
  title: string;
  description?: string;
  category: 'strength' | 'cardio' | 'flexibility' | 'hiit' | 'mixed';
  exercises: WorkoutExercise[];
  metadata: WorkoutMetadata;
  originalText: string;
  extractedAt: Date;
  isComplete: boolean; // Whether all required fields were extracted
  missingFields?: string[]; // List of fields that couldn't be extracted
}

export interface SavedWorkout extends ExtractedWorkout {
  id: string;
  userId: string;
  conversationId?: string;
  messageId?: string;
  savedAt: Date;
  updatedAt?: Date;
  notes?: string; // User's personal notes
  isFavorite?: boolean;
}

/**
 * Validation result for extracted workouts
 */
export interface WorkoutValidation {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  completeness: number; // 0-100 percentage of required fields present
}

/**
 * Workout log entry for tracking completed workouts
 */
export interface WorkoutLogEntry {
  id: string;
  userId: string;
  workoutPlanId?: string;
  title: string;
  exercisesPerformed: WorkoutExercise[];
  totalDurationMinutes: number;
  caloriesBurned?: number;
  intensity: 'low' | 'medium' | 'high';
  notes?: string;
  completedAt: Date;
}
