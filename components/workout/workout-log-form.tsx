'use client'

/**
 * WorkoutLogForm Component
 *
 * Comprehensive workout logging form with:
 * - Exercise selection from database
 * - Sets, reps, weight, and duration tracking
 * - Real-time calorie burn calculation
 * - Intensity level selection
 * - Form validation
 */

import { useState, useEffect, useCallback } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Plus, X, Dumbbell, Loader2, CheckCircle2, Clock } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from '@/components/ui/command'

import { createClient } from '@/lib/supabase/client'
import { logWorkout } from '@/lib/supabase/workouts'

// ============================================================================
// Types
// ============================================================================

interface Exercise {
  id: string
  name: string
  category: string
  muscle_groups: string[]
  equipment: string[]
  difficulty: string
  calories_per_minute_low: number
  calories_per_minute_medium: number
  calories_per_minute_high: number
}

interface ExercisePerformed {
  exerciseId: string
  name: string
  sets?: number
  reps?: number | string
  weight?: number
  weightUnit?: 'lbs' | 'kg'
  durationMinutes?: number
  intensity: 'low' | 'medium' | 'high'
  caloriesBurned: number
  notes?: string
}

// ============================================================================
// Form Schema
// ============================================================================

const exercisePerformedSchema = z.object({
  exerciseId: z.string().min(1),
  name: z.string().min(1),
  sets: z.number().positive().optional(),
  reps: z.union([z.number().positive(), z.string()]).optional(),
  weight: z.number().nonnegative().optional(),
  weightUnit: z.enum(['lbs', 'kg']).optional(),
  durationMinutes: z.number().positive().optional(),
  intensity: z.enum(['low', 'medium', 'high']),
  caloriesBurned: z.number().nonnegative(),
  notes: z.string().optional(),
})

const workoutLogFormSchema = z.object({
  title: z.string().min(1, 'Workout title is required'),
  workoutPlanId: z.string().optional(),
  exercises: z.array(exercisePerformedSchema).min(1, 'Add at least one exercise'),
  overallIntensity: z.enum(['low', 'medium', 'high']),
  notes: z.string().optional(),
})

type WorkoutLogFormData = z.infer<typeof workoutLogFormSchema>

// ============================================================================
// Component Props
// ============================================================================

interface WorkoutLogFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  workoutPlanId?: string
  workoutPlanTitle?: string
}

interface ExerciseSearchState {
  query: string
  results: Exercise[]
  isSearching: boolean
  isOpen: boolean
}

interface ExerciseInputState {
  exercise: Exercise | null
  sets: string
  reps: string
  weight: string
  weightUnit: 'lbs' | 'kg'
  durationMinutes: string
  intensity: 'low' | 'medium' | 'high'
  notes: string
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkoutLogForm({
  onSuccess,
  onCancel,
  workoutPlanId,
  workoutPlanTitle,
}: WorkoutLogFormProps) {
  const [exercises, setExercises] = useState<ExercisePerformed[]>([])
  const [currentExercise, setCurrentExercise] = useState<ExerciseInputState>({
    exercise: null,
    sets: '3',
    reps: '10',
    weight: '',
    weightUnit: 'lbs',
    durationMinutes: '',
    intensity: 'medium',
    notes: '',
  })
  const [exerciseSearch, setExerciseSearch] = useState<ExerciseSearchState>({
    query: '',
    results: [],
    isSearching: false,
    isOpen: false,
  })
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [sessionStartTime] = useState<Date>(new Date())
  const [currentTime, setCurrentTime] = useState<Date>(new Date())

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<WorkoutLogFormData>({
    resolver: zodResolver(workoutLogFormSchema),
    defaultValues: {
      title: workoutPlanTitle || '',
      workoutPlanId: workoutPlanId,
      exercises: [],
      overallIntensity: 'medium',
      notes: '',
    },
  })

  const overallIntensity = watch('overallIntensity')
  const title = watch('title')

  // ============================================================================
  // Session Timer
  // ============================================================================

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(new Date())
    }, 1000)

    return () => clearInterval(timer)
  }, [])

  const sessionDurationMinutes = Math.floor(
    (currentTime.getTime() - sessionStartTime.getTime()) / 1000 / 60
  )

  // ============================================================================
  // Exercise Search with Debounce
  // ============================================================================

  const debouncedSearch = useCallback(
    debounce(async (query: string) => {
      if (!query || query.length < 2) {
        setExerciseSearch((prev) => ({ ...prev, results: [], isSearching: false }))
        return
      }

      setExerciseSearch((prev) => ({ ...prev, isSearching: true }))

      try {
        const supabase = createClient()
        const { data, error } = await supabase
          .from('exercises')
          .select('*')
          .ilike('name', `%${query}%`)
          .limit(10)

        if (!error && data) {
          setExerciseSearch((prev) => ({
            ...prev,
            results: data,
            isSearching: false,
          }))
        } else {
          setExerciseSearch((prev) => ({
            ...prev,
            results: [],
            isSearching: false,
          }))
        }
      } catch (error) {
        console.error('Error searching exercises:', error)
        setExerciseSearch((prev) => ({
          ...prev,
          results: [],
          isSearching: false,
        }))
      }
    }, 500),
    []
  )

  useEffect(() => {
    debouncedSearch(exerciseSearch.query)
  }, [exerciseSearch.query, debouncedSearch])

  // ============================================================================
  // Calorie Calculation
  // ============================================================================

  const calculateCaloriesBurned = (
    exercise: Exercise,
    durationMinutes: number,
    intensity: 'low' | 'medium' | 'high'
  ): number => {
    const caloriesPerMinute =
      intensity === 'low'
        ? exercise.calories_per_minute_low
        : intensity === 'medium'
          ? exercise.calories_per_minute_medium
          : exercise.calories_per_minute_high

    return Math.round(caloriesPerMinute * durationMinutes)
  }

  // ============================================================================
  // Exercise Management
  // ============================================================================

  const handleExerciseSelect = (exercise: Exercise) => {
    setCurrentExercise((prev) => ({
      ...prev,
      exercise,
    }))
    setExerciseSearch((prev) => ({ ...prev, query: exercise.name, isOpen: false }))
  }

  const handleAddExercise = () => {
    if (!currentExercise.exercise) {
      return
    }

    const sets = parseInt(currentExercise.sets)
    const reps = currentExercise.reps
    const weight = parseFloat(currentExercise.weight) || undefined
    const durationMinutes = parseFloat(currentExercise.durationMinutes)

    // Validate input
    if (isNaN(durationMinutes) || durationMinutes <= 0) {
      alert('Please enter a valid duration')
      return
    }

    // Calculate calories burned
    const caloriesBurned = calculateCaloriesBurned(
      currentExercise.exercise,
      durationMinutes,
      currentExercise.intensity
    )

    const exercisePerformed: ExercisePerformed = {
      exerciseId: currentExercise.exercise.id,
      name: currentExercise.exercise.name,
      sets: !isNaN(sets) ? sets : undefined,
      reps: reps || undefined,
      weight,
      weightUnit: currentExercise.weightUnit,
      durationMinutes,
      intensity: currentExercise.intensity,
      caloriesBurned,
      notes: currentExercise.notes || undefined,
    }

    const newExercises = [...exercises, exercisePerformed]
    setExercises(newExercises)
    setValue('exercises', newExercises)

    // Reset current exercise input
    setCurrentExercise({
      exercise: null,
      sets: '3',
      reps: '10',
      weight: '',
      weightUnit: 'lbs',
      durationMinutes: '',
      intensity: 'medium',
      notes: '',
    })
    setExerciseSearch({ query: '', results: [], isSearching: false, isOpen: false })
  }

  const handleRemoveExercise = (index: number) => {
    const newExercises = exercises.filter((_, i) => i !== index)
    setExercises(newExercises)
    setValue('exercises', newExercises)
  }

  // ============================================================================
  // Totals Calculation
  // ============================================================================

  const calculateTotals = () => {
    return exercises.reduce(
      (totals, exercise) => ({
        totalDuration: totals.totalDuration + (exercise.durationMinutes || 0),
        totalCalories: totals.totalCalories + exercise.caloriesBurned,
        totalExercises: totals.totalExercises + 1,
      }),
      { totalDuration: 0, totalCalories: 0, totalExercises: 0 }
    )
  }

  const totals = calculateTotals()

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (data: WorkoutLogFormData) => {
    setIsSubmitting(true)
    setSubmitSuccess(false)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('User not authenticated')
      }

      const { error } = await logWorkout(supabase, {
        userId: user.id,
        workoutPlanId: data.workoutPlanId,
        title: data.title,
        exercisesPerformed: data.exercises,
        totalDurationMinutes: totals.totalDuration,
        caloriesBurned: totals.totalCalories,
        intensity: data.overallIntensity,
        notes: data.notes,
      })

      if (error) {
        throw error
      }

      setSubmitSuccess(true)

      // Reset form after 1 second
      setTimeout(() => {
        setExercises([])
        setValue('exercises', [])
        setValue('title', '')
        setValue('notes', '')
        setSubmitSuccess(false)

        if (onSuccess) {
          onSuccess()
        }
      }, 1000)
    } catch (error) {
      console.error('Error logging workout:', error)
      alert('Failed to log workout. Please try again.')
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Card className="w-full max-w-3xl">
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Log Workout</CardTitle>
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Clock className="h-4 w-4" />
            <span>
              Session: {Math.floor(sessionDurationMinutes / 60)}h {sessionDurationMinutes % 60}m
            </span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Workout Title */}
          <div className="space-y-2">
            <Label htmlFor="title">Workout Title</Label>
            <Input
              id="title"
              {...register('title')}
              placeholder="e.g., Morning Chest & Triceps"
            />
            {errors.title && (
              <p className="text-sm text-red-500">{errors.title.message}</p>
            )}
          </div>

          {/* Overall Intensity */}
          <div className="space-y-2">
            <Label htmlFor="overallIntensity">Overall Intensity</Label>
            <Select
              value={overallIntensity}
              onValueChange={(value) =>
                setValue('overallIntensity', value as 'low' | 'medium' | 'high')
              }
            >
              <SelectTrigger id="overallIntensity">
                <SelectValue placeholder="Select intensity" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Low</SelectItem>
                <SelectItem value="medium">Medium</SelectItem>
                <SelectItem value="high">High</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Exercise Search and Add */}
          <div className="space-y-4">
            <div>
              <Label>Add Exercises</Label>
              <p className="text-xs text-muted-foreground mt-1">
                Search our exercise database or enter a custom exercise name
              </p>
            </div>

            {/* Exercise Search */}
            <div className="space-y-3">
              <div className="relative">
                <div className="relative">
                  <Input
                    placeholder="Search for exercise or enter custom name..."
                    value={exerciseSearch.query}
                    onChange={(e) => {
                      const value = e.target.value
                      setExerciseSearch((prev) => ({
                        ...prev,
                        query: value,
                        isOpen: value.length >= 2,
                      }))
                      // If user is typing a custom exercise, create a temporary exercise object
                      if (value.length >= 2) {
                        setCurrentExercise((prev) => ({
                          ...prev,
                          exercise: {
                            id: 'custom-temp-' + Date.now(),
                            name: value,
                            category: 'Custom',
                            muscle_groups: [],
                            equipment: [],
                            difficulty: 'medium',
                            calories_per_minute_low: 3,
                            calories_per_minute_medium: 5,
                            calories_per_minute_high: 7,
                          },
                        }))
                      } else {
                        setCurrentExercise((prev) => ({
                          ...prev,
                          exercise: null,
                        }))
                      }
                    }}
                    onFocus={() => {
                      if (exerciseSearch.query.length >= 2) {
                        setExerciseSearch((prev) => ({ ...prev, isOpen: true }))
                      }
                    }}
                    onBlur={() => {
                      // Delay closing to allow clicking on items
                      setTimeout(() => {
                        setExerciseSearch((prev) => ({ ...prev, isOpen: false }))
                      }, 200)
                    }}
                  />
                  {exerciseSearch.isSearching && (
                    <Loader2 className="absolute right-3 top-3 h-4 w-4 animate-spin text-muted-foreground" />
                  )}
                </div>

                {/* Dropdown Results */}
                {exerciseSearch.isOpen && exerciseSearch.query.length >= 2 && (
                  <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover shadow-md max-h-[300px] overflow-y-auto">
                    <Command>
                      <CommandList>
                        {exerciseSearch.isSearching && (
                          <div className="py-6 text-center text-sm text-muted-foreground">
                            <Loader2 className="h-4 w-4 animate-spin mx-auto mb-2" />
                            Searching exercises...
                          </div>
                        )}
                        {!exerciseSearch.isSearching && exerciseSearch.results.length === 0 && (
                          <CommandEmpty>
                            <div className="py-4 text-center">
                              <p className="text-sm text-muted-foreground mb-2">
                                No exercises found matching "{exerciseSearch.query}"
                              </p>
                              <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  // Create a custom exercise entry
                                  const customExercise: Exercise = {
                                    id: 'custom-' + Date.now(),
                                    name: exerciseSearch.query,
                                    category: 'Custom',
                                    muscle_groups: [],
                                    equipment: [],
                                    difficulty: 'medium',
                                    calories_per_minute_low: 3,
                                    calories_per_minute_medium: 5,
                                    calories_per_minute_high: 7,
                                  }
                                  handleExerciseSelect(customExercise)
                                }}
                                className="mx-auto"
                              >
                                <Plus className="h-4 w-4 mr-2" />
                                Use "{exerciseSearch.query}" as custom exercise
                              </Button>
                            </div>
                          </CommandEmpty>
                        )}
                        {!exerciseSearch.isSearching && exerciseSearch.results.length > 0 && (
                          <CommandGroup>
                            {exerciseSearch.results.map((result) => (
                              <CommandItem
                                key={result.id}
                                onSelect={() => handleExerciseSelect(result)}
                                className="cursor-pointer"
                              >
                                <div className="flex flex-col gap-1">
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{result.name}</span>
                                    <Badge variant="outline" className="text-xs">
                                      {result.category}
                                    </Badge>
                                    {result.difficulty && (
                                      <Badge variant="secondary" className="text-xs">
                                        {result.difficulty}
                                      </Badge>
                                    )}
                                  </div>
                                  <span className="text-xs text-muted-foreground">
                                    {result.muscle_groups.join(', ')}
                                  </span>
                                </div>
                              </CommandItem>
                            ))}
                          </CommandGroup>
                        )}
                      </CommandList>
                    </Command>
                  </div>
                )}
              </div>

              {/* Exercise Details Input */}
              {currentExercise.exercise && (
                <div className="rounded-lg border p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h4 className="font-semibold">{currentExercise.exercise.name}</h4>
                      {currentExercise.exercise.category === 'Custom' && (
                        <Badge variant="secondary" className="text-xs">
                          Custom Exercise
                        </Badge>
                      )}
                    </div>
                    <Badge>{currentExercise.exercise.category}</Badge>
                  </div>

                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    {/* Sets */}
                    <div>
                      <Label htmlFor="sets" className="text-xs">
                        Sets
                      </Label>
                      <Input
                        id="sets"
                        type="number"
                        value={currentExercise.sets}
                        onChange={(e) =>
                          setCurrentExercise((prev) => ({
                            ...prev,
                            sets: e.target.value,
                          }))
                        }
                        min="1"
                      />
                    </div>

                    {/* Reps */}
                    <div>
                      <Label htmlFor="reps" className="text-xs">
                        Reps
                      </Label>
                      <Input
                        id="reps"
                        value={currentExercise.reps}
                        onChange={(e) =>
                          setCurrentExercise((prev) => ({
                            ...prev,
                            reps: e.target.value,
                          }))
                        }
                        placeholder="10 or 10-12"
                      />
                    </div>

                    {/* Weight */}
                    <div>
                      <Label htmlFor="weight" className="text-xs">
                        Weight
                      </Label>
                      <Input
                        id="weight"
                        type="number"
                        value={currentExercise.weight}
                        onChange={(e) =>
                          setCurrentExercise((prev) => ({
                            ...prev,
                            weight: e.target.value,
                          }))
                        }
                        placeholder="Optional"
                        min="0"
                        step="0.5"
                      />
                    </div>

                    {/* Weight Unit */}
                    <div>
                      <Label htmlFor="weightUnit" className="text-xs">
                        Unit
                      </Label>
                      <Select
                        value={currentExercise.weightUnit}
                        onValueChange={(value) =>
                          setCurrentExercise((prev) => ({
                            ...prev,
                            weightUnit: value as 'lbs' | 'kg',
                          }))
                        }
                      >
                        <SelectTrigger id="weightUnit">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="lbs">lbs</SelectItem>
                          <SelectItem value="kg">kg</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Duration */}
                    <div>
                      <Label htmlFor="duration" className="text-xs">
                        Duration (minutes) *
                      </Label>
                      <Input
                        id="duration"
                        type="number"
                        value={currentExercise.durationMinutes}
                        onChange={(e) =>
                          setCurrentExercise((prev) => ({
                            ...prev,
                            durationMinutes: e.target.value,
                          }))
                        }
                        placeholder="Required"
                        min="1"
                        step="1"
                        required
                      />
                    </div>

                    {/* Intensity */}
                    <div>
                      <Label htmlFor="exerciseIntensity" className="text-xs">
                        Intensity
                      </Label>
                      <Select
                        value={currentExercise.intensity}
                        onValueChange={(value) =>
                          setCurrentExercise((prev) => ({
                            ...prev,
                            intensity: value as 'low' | 'medium' | 'high',
                          }))
                        }
                      >
                        <SelectTrigger id="exerciseIntensity">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="low">Low</SelectItem>
                          <SelectItem value="medium">Medium</SelectItem>
                          <SelectItem value="high">High</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>

                  {/* Exercise Notes */}
                  <div>
                    <Label htmlFor="exerciseNotes" className="text-xs">
                      Notes (optional)
                    </Label>
                    <Input
                      id="exerciseNotes"
                      value={currentExercise.notes}
                      onChange={(e) =>
                        setCurrentExercise((prev) => ({
                          ...prev,
                          notes: e.target.value,
                        }))
                      }
                      placeholder="How did it feel?"
                    />
                  </div>

                  {/* Estimated Calories */}
                  {currentExercise.durationMinutes &&
                    !isNaN(parseFloat(currentExercise.durationMinutes)) && (
                      <div className="text-sm text-muted-foreground">
                        Estimated calories:{' '}
                        <span className="font-semibold">
                          ~
                          {calculateCaloriesBurned(
                            currentExercise.exercise,
                            parseFloat(currentExercise.durationMinutes),
                            currentExercise.intensity
                          )}{' '}
                          cal
                        </span>
                      </div>
                    )}

                  <Button
                    type="button"
                    onClick={handleAddExercise}
                    disabled={!currentExercise.durationMinutes}
                    className="w-full"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Exercise
                  </Button>
                </div>
              )}
            </div>
          </div>

          {/* Exercises List */}
          {exercises.length > 0 && (
            <div className="space-y-2">
              <Label>Exercises Performed ({exercises.length})</Label>
              <div className="space-y-2">
                {exercises.map((exercise, index) => (
                  <div
                    key={index}
                    className="flex items-start justify-between rounded-lg border p-3"
                  >
                    <div className="flex-1 space-y-1">
                      <div className="flex items-center gap-2">
                        <Dumbbell className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{exercise.name}</p>
                        <Badge variant="outline" className="text-xs">
                          {exercise.intensity}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {exercise.sets && `${exercise.sets} sets`}
                        {exercise.reps && ` × ${exercise.reps} reps`}
                        {exercise.weight &&
                          ` @ ${exercise.weight} ${exercise.weightUnit}`}
                        {' • '}
                        {exercise.durationMinutes} min • {exercise.caloriesBurned} cal
                      </p>
                      {exercise.notes && (
                        <p className="text-xs text-muted-foreground italic">
                          {exercise.notes}
                        </p>
                      )}
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveExercise(index)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {errors.exercises && (
            <p className="text-sm text-red-500">{errors.exercises.message}</p>
          )}

          {/* Workout Totals */}
          {exercises.length > 0 && (
            <div className="rounded-lg bg-muted p-4">
              <h4 className="mb-3 font-semibold">Workout Summary</h4>
              <div className="grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-muted-foreground">Exercises</p>
                  <p className="text-2xl font-bold">{totals.totalExercises}</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Duration</p>
                  <p className="text-2xl font-bold">{totals.totalDuration} min</p>
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Calories</p>
                  <p className="text-2xl font-bold">{totals.totalCalories}</p>
                </div>
              </div>
            </div>
          )}

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Workout Notes (optional)</Label>
            <textarea
              id="notes"
              {...register('notes')}
              placeholder="How did the workout feel overall?"
              className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
          </div>

          {/* Actions */}
          <div className="flex justify-end gap-2">
            {onCancel && (
              <Button type="button" variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            )}
            <Button
              type="submit"
              disabled={isSubmitting || exercises.length === 0 || !title}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Logging...
                </>
              ) : submitSuccess ? (
                <>
                  <CheckCircle2 className="mr-2 h-4 w-4" />
                  Logged!
                </>
              ) : (
                'Complete Workout'
              )}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Utility Functions
// ============================================================================

function debounce<T extends (...args: any[]) => any>(
  func: T,
  wait: number
): (...args: Parameters<T>) => void {
  let timeout: NodeJS.Timeout | null = null

  return function executedFunction(...args: Parameters<T>) {
    const later = () => {
      timeout = null
      func(...args)
    }

    if (timeout) {
      clearTimeout(timeout)
    }
    timeout = setTimeout(later, wait)
  }
}
