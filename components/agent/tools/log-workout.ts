/**
 * Log Workout Tool
 * Allows users to log completed workouts through conversation with calorie calculation
 */

import { tool } from 'ai';
import { z } from 'zod';
import { logWorkout } from '@/lib/supabase/workouts';
import { createClient } from '@/lib/supabase/server';
import { parseNaturalDate, validateWorkoutDate, formatLocalDate } from '@/lib/utils';

/**
 * Tool for logging completed workouts
 * Supports smart defaults for missing information
 */
const logWorkoutSchema = z.object({
  userId: z.string().describe('User ID (provided by system - REQUIRED for authentication)'),
  workoutDate: z
    .string()
    .optional()
    .describe(
      'The date this workout was completed. CRITICAL: Extract from user context like "today", "yesterday", "Monday", "2 days ago", "Nov 23", etc. If user mentions multiple workouts for different days, log each with its correct date. If not specified, defaults to today.'
    ),
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
    workoutDate,
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

      // Parse and validate workout date
      let parsedDate: Date;
      if (workoutDate) {
        const parsed = parseNaturalDate(workoutDate);
        if (!parsed) {
          return {
            success: false,
            error: `Could not parse workout date "${workoutDate}". Please use formats like "today", "yesterday", "Monday", "2 days ago", or "Nov 23".`,
          };
        }
        parsedDate = parsed;

        // Validate the date
        const validation = validateWorkoutDate(parsedDate);
        if (!validation.valid) {
          return {
            success: false,
            error: validation.error,
          };
        }
      } else {
        // Default to today
        parsedDate = new Date();
        parsedDate.setHours(0, 0, 0, 0); // Start of day
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

      // Format date for display
      const formattedDate = formatLocalDate(parsedDate, {
        weekday: 'short',
        month: 'short',
        day: 'numeric',
        year: 'numeric',
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
          workoutDate: parsedDate.toISOString(), // Store as ISO for confirmWorkoutLog
        },
        exerciseSummary,
        message: `Ready to log workout: "${title}"\n\nDate: ${formattedDate}\nExercises:\n${exerciseSummary.map(s => `- ${s}`).join('\n')}\n\nDuration: ${calculatedDuration} min\nIntensity: ${intensity}\nEstimated calories burned: ~${estimatedCalories} cal\n\nPlease ask the user to CONFIRM before saving.`,
        userId: userId,
        assumptions: {
          ...(workoutDate ? {} : { date: `Assumed today (${formattedDate})` }),
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
  workoutDate: z.string().optional().describe('ISO date string for workout completion date (from preview)'),
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
    workoutDate,
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

      // Parse workout date if provided
      let completedAt: Date | undefined;
      if (workoutDate) {
        completedAt = new Date(workoutDate);
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
        completedAt, // Pass the workout date
      });

      if (error) {
        return {
          success: false,
          error: `Failed to save workout log: ${error.message}`,
        };
      }

      // Format date for success message
      const dateMessage = completedAt
        ? ` for ${formatLocalDate(completedAt, { month: 'short', day: 'numeric', year: 'numeric' })}`
        : '';

      return {
        success: true,
        saved: true,
        workoutLog,
        message: `✅ Workout "${title}" logged successfully${dateMessage}! ${totalDurationMinutes} minutes, ${estimatedCalories} calories burned (${intensity} intensity).`,
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
