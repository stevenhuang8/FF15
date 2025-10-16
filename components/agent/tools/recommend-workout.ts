/**
 * AI Tool: Recommend Workout
 *
 * Generates personalized workout recommendations based on:
 * - User fitness goals
 * - Available equipment
 * - Time constraints
 * - Fitness level
 * - Past workout history
 */

import { tool } from 'ai'
import { z } from 'zod'
import { createClient } from '@/lib/supabase/client'

export const recommendWorkout = tool({
  description: `Generate personalized workout recommendations based on user's fitness goals, available equipment, time constraints, and fitness level.

  Use this tool when the user asks for:
  - Workout suggestions or recommendations
  - Help planning their next workout
  - Exercise ideas for specific goals (weight loss, muscle gain, etc.)
  - Workouts they can do with limited equipment
  - Quick workouts for limited time

  The tool will consider the user's workout history and preferences to provide tailored recommendations.`,

  inputSchema: z.object({
    fitnessGoal: z
      .enum([
        'weight_loss',
        'muscle_gain',
        'endurance',
        'flexibility',
        'general_fitness',
        'strength',
      ])
      .describe('Primary fitness goal for the workout'),

    availableEquipment: z
      .array(z.string())
      .optional()
      .describe(
        'List of available equipment (e.g., ["dumbbells", "barbell", "resistance bands", "bodyweight"]). If not specified, assumes bodyweight only.'
      ),

    timeAvailable: z
      .number()
      .optional()
      .describe('Available time for workout in minutes (e.g., 30, 45, 60)'),

    fitnessLevel: z
      .enum(['beginner', 'intermediate', 'advanced'])
      .optional()
      .describe("User's fitness level. If not specified, will be inferred from profile or default to intermediate."),

    targetMuscleGroups: z
      .array(z.string())
      .optional()
      .describe(
        'Specific muscle groups to target (e.g., ["chest", "back", "legs"]). Optional.'
      ),

    workoutType: z
      .enum(['strength', 'cardio', 'flexibility', 'hiit', 'mixed'])
      .optional()
      .describe('Preferred workout type. If not specified, will be based on fitness goal.'),
  }),

  execute: async (params) => {
    const {
      fitnessGoal,
      availableEquipment = ['bodyweight'],
      timeAvailable = 45,
      fitnessLevel = 'intermediate',
      targetMuscleGroups,
      workoutType,
    } = params;
    console.log('🏋️ Workout Recommendation Tool executing...')
    console.log('Parameters:', {
      fitnessGoal,
      availableEquipment,
      timeAvailable,
      fitnessLevel,
      targetMuscleGroups,
      workoutType,
    })

    try {
      const supabase = createClient()

      // Get user profile for additional context
      const {
        data: { user },
      } = await supabase.auth.getUser()

      let userProfile = null
      if (user) {
        const { data: profile } = await supabase
          .from('user_profiles')
          .select('fitness_goals, daily_calorie_target')
          .eq('id', user.id)
          .single()

        userProfile = profile
      }

      // Determine workout category based on goal
      let category = workoutType
      if (!category) {
        category =
          fitnessGoal === 'weight_loss'
            ? 'cardio'
            : fitnessGoal === 'muscle_gain' || fitnessGoal === 'strength'
              ? 'strength'
              : fitnessGoal === 'flexibility'
                ? 'flexibility'
                : fitnessGoal === 'endurance'
                  ? 'cardio'
                  : 'mixed'
      }

      // Build equipment filter
      const equipmentFilter = availableEquipment.map((eq) => eq.toLowerCase())

      // Query exercises from database
      let query = supabase
        .from('exercises')
        .select('*')
        .eq('difficulty', fitnessLevel)
        .limit(20)

      // Filter by category if specified
      if (category && category !== 'mixed') {
        query = query.eq('category', category)
      }

      const { data: exercises, error } = await query

      if (error) {
        console.error('Error fetching exercises:', error)
        return {
          success: false,
          error: 'Failed to fetch exercise data from database',
        }
      }

      // Filter exercises by available equipment
      const suitableExercises = exercises?.filter((exercise) => {
        const exerciseEquipment = exercise.equipment || []

        // If exercise requires no equipment or only bodyweight, it's always suitable
        if (
          exerciseEquipment.length === 0 ||
          (exerciseEquipment.length === 1 && exerciseEquipment[0] === 'bodyweight')
        ) {
          return true
        }

        // Check if all required equipment is available
        return exerciseEquipment.every((eq: string) =>
          equipmentFilter.some(
            (available) =>
              available === eq.toLowerCase() ||
              available === 'bodyweight' ||
              eq === 'none'
          )
        )
      })

      // Filter by target muscle groups if specified
      let filteredExercises = suitableExercises
      if (targetMuscleGroups && targetMuscleGroups.length > 0) {
        filteredExercises = suitableExercises?.filter((exercise) =>
          exercise.muscle_groups?.some((mg: string) =>
            targetMuscleGroups.some(
              (target: string) => target.toLowerCase() === mg.toLowerCase()
            )
          )
        )
      }

      if (!filteredExercises || filteredExercises.length === 0) {
        return {
          success: false,
          message:
            'No suitable exercises found with your current constraints. Try adjusting your equipment or fitness level preferences.',
        }
      }

      // Calculate workout duration and select exercises
      const avgExerciseDuration = category === 'strength' ? 8 : 6 // minutes per exercise
      const numExercises = Math.floor(timeAvailable / avgExerciseDuration)

      // Select a diverse set of exercises
      const selectedExercises = selectDiverseExercises(
        filteredExercises,
        numExercises
      )

      // Build workout structure
      const workout = {
        title: generateWorkoutTitle(fitnessGoal, category, fitnessLevel),
        category,
        difficulty: fitnessLevel,
        estimatedDuration: `${timeAvailable} minutes`,
        targetMuscleGroups:
          targetMuscleGroups ||
          Array.from(
            new Set(
              selectedExercises.flatMap((ex) => ex.muscle_groups || [])
            )
          ).slice(0, 3),
        equipment: availableEquipment,
        exercises: selectedExercises.map((exercise) => ({
          name: exercise.name,
          sets: category === 'strength' ? 3 : undefined,
          reps:
            category === 'strength'
              ? fitnessLevel === 'beginner'
                ? '8-10'
                : fitnessLevel === 'intermediate'
                  ? '10-12'
                  : '12-15'
              : undefined,
          duration:
            category === 'cardio' || category === 'hiit'
              ? `${Math.floor(timeAvailable / numExercises)} minutes`
              : undefined,
          intensity: 'medium' as const,
          rest:
            category === 'strength'
              ? '60 seconds'
              : category === 'hiit'
                ? '30 seconds'
                : undefined,
          notes: exercise.description,
          exerciseId: exercise.id,
        })),
        warmupNotes: getWarmupRecommendation(category),
        cooldownNotes: getCooldownRecommendation(category),
      }

      console.log('✅ Workout recommendation generated successfully')

      return {
        success: true,
        workout,
        context: {
          totalExercises: selectedExercises.length,
          estimatedCalories: calculateEstimatedCalories(
            selectedExercises,
            timeAvailable,
            'medium'
          ),
          userProfile: userProfile
            ? {
                fitnessGoals: userProfile.fitness_goals,
                calorieTarget: userProfile.daily_calorie_target,
              }
            : null,
        },
      }
    } catch (error) {
      console.error('💥 Error in workout recommendation tool:', error)
      return {
        success: false,
        error:
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred',
      }
    }
  },
})

// ============================================================================
// Helper Functions
// ============================================================================

function selectDiverseExercises(exercises: any[], count: number): any[] {
  if (exercises.length <= count) {
    return exercises
  }

  // Group exercises by muscle groups to ensure diversity
  const byMuscleGroup: Record<string, any[]> = {}
  exercises.forEach((ex) => {
    const primaryMuscle = ex.muscle_groups?.[0] || 'other'
    if (!byMuscleGroup[primaryMuscle]) {
      byMuscleGroup[primaryMuscle] = []
    }
    byMuscleGroup[primaryMuscle].push(ex)
  })

  // Select exercises round-robin from different muscle groups
  const selected: any[] = []
  const groups = Object.keys(byMuscleGroup)
  let groupIndex = 0

  while (selected.length < count) {
    const group = groups[groupIndex % groups.length]
    const groupExercises = byMuscleGroup[group]

    if (groupExercises.length > 0) {
      selected.push(groupExercises.shift())
    }

    groupIndex++

    // Break if we've exhausted all exercises
    if (Object.values(byMuscleGroup).every((arr) => arr.length === 0)) {
      break
    }
  }

  return selected
}

function generateWorkoutTitle(
  goal: string,
  category: string,
  level: string
): string {
  const goalTitles: Record<string, string> = {
    weight_loss: 'Fat Burning',
    muscle_gain: 'Muscle Building',
    strength: 'Strength Training',
    endurance: 'Endurance Building',
    flexibility: 'Flexibility & Mobility',
    general_fitness: 'Full Body Conditioning',
  }

  const categoryTitles: Record<string, string> = {
    strength: 'Strength',
    cardio: 'Cardio',
    flexibility: 'Flexibility',
    hiit: 'HIIT',
    mixed: 'Full Body',
  }

  const levelTitles: Record<string, string> = {
    beginner: 'Beginner',
    intermediate: 'Intermediate',
    advanced: 'Advanced',
  }

  return `${levelTitles[level]} ${goalTitles[goal] || categoryTitles[category]} Workout`
}

function getWarmupRecommendation(category: string): string {
  const warmups: Record<string, string> = {
    strength:
      '5-10 minutes of light cardio (jogging, jumping jacks) followed by dynamic stretching of target muscle groups',
    cardio: '5 minutes of easy pace activity, gradually increasing intensity',
    hiit: '5 minutes of dynamic stretching and light cardio to prepare muscles and elevate heart rate',
    flexibility:
      '5 minutes of gentle movement and joint rotations to increase blood flow',
    mixed:
      '5-10 minutes combining light cardio and dynamic stretching for full body preparation',
  }

  return warmups[category] || warmups.mixed
}

function getCooldownRecommendation(category: string): string {
  const cooldowns: Record<string, string> = {
    strength:
      '5-10 minutes of static stretching, focusing on muscles worked. Hold each stretch for 20-30 seconds.',
    cardio:
      '5 minutes of gradually decreasing intensity followed by static stretching',
    hiit: '5-10 minutes of walking and deep breathing, followed by static stretching of all major muscle groups',
    flexibility:
      '5 minutes of relaxation poses and deep breathing to maximize flexibility gains',
    mixed:
      '5-10 minutes of light movement and comprehensive static stretching',
  }

  return cooldowns[category] || cooldowns.mixed
}

function calculateEstimatedCalories(
  exercises: any[],
  duration: number,
  intensity: string
): number {
  if (exercises.length === 0) return 0

  const avgCaloriesPerMinute =
    exercises.reduce((sum, ex) => {
      const rate =
        intensity === 'low'
          ? ex.calories_per_minute_low
          : intensity === 'high'
            ? ex.calories_per_minute_high
            : ex.calories_per_minute_medium
      return sum + (rate || 5)
    }, 0) / exercises.length

  return Math.round(avgCaloriesPerMinute * duration)
}
