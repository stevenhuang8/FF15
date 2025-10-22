/**
 * Log Workout Tool
 * Allows users to log completed workouts through conversation with calorie calculation
 */

import { tool } from 'ai';
import { z } from 'zod';
import { logWorkout } from '@/lib/supabase/workouts';
import { createClient } from '@/lib/supabase/server';

/**
 * Tool for logging completed workouts
 * Supports smart defaults for missing information
 */
const logWorkoutSchema = z.object({
  userId: z.string().describe('User ID (provided by system - REQUIRED for authentication)'),
  title: z
    .string()
    .describe('Title/name of the workout (e.g., "Morning Run", "Leg Day", "Yoga Session")'),
  exercises: z
    .array(
      z.object({
        name: z.string().describe('Exercise name (e.g., "Running", "Squats", "Plank")'),
        sets: z.number().optional().describe('Number of sets (for strength exercises)'),
        reps: z.number().optional().describe('Reps per set (for strength exercises)'),
        weight: z.number().optional().describe('Weight used in lbs or kg'),
        weightUnit: z.enum(['lbs', 'kg']).optional().describe('Unit for weight'),
        durationMinutes: z.number().optional().describe('Duration in minutes (for cardio)'),
        intensity: z
          .enum(['low', 'medium', 'high'])
          .optional()
          .describe('Intensity level for this exercise'),
        notes: z.string().optional().describe('Notes about this exercise'),
      })
    )
    .describe('Array of exercises performed'),
  totalDurationMinutes: z
    .number()
    .optional()
    .describe('Total workout duration in minutes. If not provided, will be calculated from exercises or use default 30 min.'),
  overallIntensity: z
    .enum(['low', 'medium', 'high'])
    .optional()
    .describe('Overall workout intensity. Defaults to "medium" if not specified.'),
  notes: z.string().optional().describe('General notes about the workout'),
});

export const logWorkoutPreview = tool({
  description:
    'Log a completed workout session. Can handle detailed or vague inputs (e.g., "I ran" uses smart defaults). IMPORTANT: This tool returns a PREVIEW. Ask user to CONFIRM before confirmWorkoutLog.',
  inputSchema: logWorkoutSchema,
  execute: async ({
    userId,
    title,
    exercises,
    totalDurationMinutes,
    overallIntensity,
    notes,
  }: z.infer<typeof logWorkoutSchema>) => {
    console.log(`💪 Preparing workout log for user ${userId}: ${title} with ${exercises.length} exercises`);

    try {
      // userId is provided by the system (from authenticated request)
      if (!userId) {
        return {
          success: false,
          error: 'User ID is required but was not provided.',
        };
      }

      // Calculate total duration if not provided
      let calculatedDuration = totalDurationMinutes;
      if (!calculatedDuration) {
        // Sum up exercise durations if available
        const exerciseDurations = exercises
          .filter((e) => e.durationMinutes)
          .reduce((sum: number, e) => sum + (e.durationMinutes || 0), 0);

        calculatedDuration = exerciseDurations > 0 ? exerciseDurations : 30; // Default 30 min
      }

      // Use provided intensity or default to medium
      const intensity: 'low' | 'medium' | 'high' = overallIntensity || 'medium';

      // Estimate calories burned based on intensity and duration
      // These are rough estimates: low=3 cal/min, medium=6 cal/min, high=10 cal/min
      const calorieRates: Record<'low' | 'medium' | 'high', number> = { low: 3, medium: 6, high: 10 };
      const estimatedCalories = Math.round(calculatedDuration * calorieRates[intensity]);

      // Build exercise details for preview
      const exerciseSummary = exercises.map((ex) => {
        const parts: string[] = [ex.name];

        if (ex.sets && ex.reps) {
          parts.push(`${ex.sets}x${ex.reps}`);
        }
        if (ex.weight && ex.weightUnit) {
          parts.push(`${ex.weight}${ex.weightUnit}`);
        }
        if (ex.durationMinutes) {
          parts.push(`${ex.durationMinutes} min`);
        }
        if (ex.intensity) {
          parts.push(`(${ex.intensity})`);
        }

        return parts.join(' ');
      });

      // Return PREVIEW - don't save yet, wait for confirmation
      return {
        success: true,
        preview: true,
        workout: {
          title,
          exercises,
          totalDurationMinutes: calculatedDuration,
          intensity,
          estimatedCalories,
          notes,
        },
        exerciseSummary,
        message: `Ready to log workout: "${title}"\n\nExercises:\n${exerciseSummary.map(s => `- ${s}`).join('\n')}\n\nDuration: ${calculatedDuration} min\nIntensity: ${intensity}\nEstimated calories burned: ~${estimatedCalories} cal\n\nPlease ask the user to CONFIRM before saving.`,
        userId: userId,
        assumptions: {
          ...(totalDurationMinutes ? {} : { duration: `Assumed ${calculatedDuration} minutes (not specified)` }),
          ...(overallIntensity ? {} : { intensity: 'Assumed medium intensity (not specified)' }),
        },
      };
    } catch (error) {
      console.error('❌ Error in logWorkoutPreview tool:', error);
      return {
        success: false,
        error: `Error preparing workout log: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});

/**
 * Confirmation tool - actually saves the workout after user confirms
 */
const confirmWorkoutLogSchema = z.object({
  userId: z.string().describe('User ID (provided by system - REQUIRED for authentication)'),
  title: z.string(),
  exercises: z.array(z.any()).describe('Exercises performed (from preview)'),
  totalDurationMinutes: z.number(),
  intensity: z.enum(['low', 'medium', 'high']),
  estimatedCalories: z.number(),
  notes: z.string().optional(),
});

export const confirmWorkoutLog = tool({
  description:
    'Confirm and save workout log after user approves the preview. Only call this after logWorkoutPreview and user confirmation.',
  inputSchema: confirmWorkoutLogSchema,
  execute: async ({
    userId,
    title,
    exercises,
    totalDurationMinutes,
    intensity,
    estimatedCalories,
    notes,
  }: z.infer<typeof confirmWorkoutLogSchema>) => {
    console.log(`✅ Confirming workout log for user ${userId}: ${title}`);

    try {
      // userId is provided by the system (from authenticated request)
      if (!userId) {
        return {
          success: false,
          error: 'User not authenticated.',
        };
      }

      // Save workout log
      const supabase = await createClient();
      const { data: workoutLog, error } = await logWorkout(supabase, {
        userId: userId,
        title,
        exercisesPerformed: exercises,
        totalDurationMinutes,
        caloriesBurned: estimatedCalories,
        intensity,
        notes,
      });

      if (error) {
        return {
          success: false,
          error: `Failed to save workout log: ${error.message}`,
        };
      }

      return {
        success: true,
        saved: true,
        workoutLog,
        message: `✅ Workout "${title}" logged successfully! ${totalDurationMinutes} minutes, ${estimatedCalories} calories burned (${intensity} intensity).`,
      };
    } catch (error) {
      console.error('❌ Error confirming workout log:', error);
      return {
        success: false,
        error: `Error saving workout: ${error instanceof Error ? error.message : 'Unknown error'}`,
      };
    }
  },
});
