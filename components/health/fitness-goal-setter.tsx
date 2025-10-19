'use client'

/**
 * FitnessGoalSetter Component
 *
 * Interface for creating and managing fitness goals:
 * - Weight loss/gain goals
 * - Calorie targets
 * - Body composition goals
 * - Exercise frequency goals
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import {
  Loader2,
  CheckCircle2,
  Target,
  TrendingDown,
  TrendingUp,
  Calendar,
  X,
} from 'lucide-react'

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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'

import { createClient } from '@/lib/supabase/client'
import {
  createFitnessGoal,
  getFitnessGoals,
  updateFitnessGoal,
  deleteFitnessGoal,
  calculateGoalProgress,
} from '@/lib/supabase/health-metrics'
import type { Tables } from '@/types/supabase'

// ============================================================================
// Form Schema
// ============================================================================

const goalSchema = z.object({
  goalType: z.enum([
    'weight_loss',
    'weight_gain',
    'muscle_gain',
    'body_fat_reduction',
    'calorie_target',
    'workout_frequency',
  ]),
  targetValue: z.string().min(1, 'Target value is required'),
  currentValue: z.string().optional(),
  unit: z.string().min(1, 'Unit is required'),
  targetDate: z.string().optional(),
})

type GoalFormData = z.infer<typeof goalSchema>

// ============================================================================
// Component Types
// ============================================================================

interface FitnessGoalSetterProps {
  onSuccess?: () => void
  onCancel?: () => void
}

type FitnessGoal = Tables<'fitness_goals'>

// ============================================================================
// Goal Type Configuration
// ============================================================================

const goalTypeConfig = {
  weight_loss: {
    label: 'Weight Loss',
    icon: TrendingDown,
    defaultUnit: 'lbs',
    color: 'text-blue-500',
  },
  weight_gain: {
    label: 'Weight Gain',
    icon: TrendingUp,
    defaultUnit: 'lbs',
    color: 'text-green-500',
  },
  muscle_gain: {
    label: 'Muscle Gain',
    icon: TrendingUp,
    defaultUnit: 'lbs',
    color: 'text-purple-500',
  },
  body_fat_reduction: {
    label: 'Body Fat Reduction',
    icon: TrendingDown,
    defaultUnit: '%',
    color: 'text-orange-500',
  },
  calorie_target: {
    label: 'Daily Calorie Target',
    icon: Target,
    defaultUnit: 'calories',
    color: 'text-yellow-500',
  },
  workout_frequency: {
    label: 'Workout Frequency',
    icon: Calendar,
    defaultUnit: 'workouts/week',
    color: 'text-red-500',
  },
}

// ============================================================================
// Main Component
// ============================================================================

export function FitnessGoalSetter({ onSuccess, onCancel }: FitnessGoalSetterProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [existingGoals, setExistingGoals] = useState<FitnessGoal[]>([])
  const [loadingGoals, setLoadingGoals] = useState(true)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<GoalFormData>({
    resolver: zodResolver(goalSchema),
    defaultValues: {
      goalType: 'weight_loss',
      targetValue: '',
      currentValue: '',
      unit: 'lbs',
      targetDate: '',
    },
  })

  const selectedGoalType = watch('goalType')

  // ============================================================================
  // Get current user and load goals
  // ============================================================================

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
        await loadGoals(user.id)
      }
      setLoadingGoals(false)
    }
    init()
  }, [])

  const loadGoals = async (uid: string) => {
    const { data } = await getFitnessGoals(uid, 'active')
    if (data) {
      setExistingGoals(data)
    }
  }

  // ============================================================================
  // Update unit when goal type changes
  // ============================================================================

  useEffect(() => {
    const config = goalTypeConfig[selectedGoalType as keyof typeof goalTypeConfig]
    if (config) {
      setValue('unit', config.defaultUnit)
    }
  }, [selectedGoalType, setValue])

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (formData: GoalFormData) => {
    if (!userId) {
      console.error('User not authenticated')
      return
    }

    setIsSubmitting(true)
    setSubmitSuccess(false)

    try {
      const goalData = {
        userId,
        goalType: formData.goalType,
        targetValue: parseFloat(formData.targetValue),
        currentValue: formData.currentValue
          ? parseFloat(formData.currentValue)
          : undefined,
        unit: formData.unit,
        targetDate: formData.targetDate || undefined,
      }

      const { error } = await createFitnessGoal(goalData)

      if (error) {
        console.error('Failed to create fitness goal:', error)
        throw error
      }

      setSubmitSuccess(true)

      // Reload goals
      await loadGoals(userId)

      // Reset form
      reset()

      // Call success callback after a short delay
      setTimeout(() => {
        setSubmitSuccess(false)
        onSuccess?.()
      }, 1500)
    } catch (error) {
      console.error('Error creating fitness goal:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================================================
  // Delete Goal
  // ============================================================================

  const handleDeleteGoal = async (goalId: string) => {
    if (!userId) return

    const { error } = await deleteFitnessGoal(goalId, userId)
    if (!error) {
      await loadGoals(userId)
    }
  }

  // ============================================================================
  // Update Goal Status
  // ============================================================================

  const handleUpdateStatus = async (goalId: string, status: string) => {
    if (!userId) return

    const { error } = await updateFitnessGoal(goalId, userId, { status })
    if (!error) {
      await loadGoals(userId)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <div className="space-y-6">
      {/* Existing Goals */}
      {existingGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Goals</CardTitle>
            <CardDescription>Track your progress toward your fitness goals</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {existingGoals.map((goal) => {
              const config = goalTypeConfig[goal.goal_type as keyof typeof goalTypeConfig]
              const Icon = config?.icon || Target
              const progress = calculateGoalProgress(goal)

              return (
                <div
                  key={goal.id}
                  className="flex items-start justify-between p-4 border rounded-lg"
                >
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <Icon className={`h-5 w-5 ${config?.color || 'text-gray-500'}`} />
                      <h4 className="font-medium">{config?.label || goal.goal_type}</h4>
                      <Badge variant={goal.status === 'active' ? 'default' : 'secondary'}>
                        {goal.status}
                      </Badge>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <span>
                        Current: {goal.current_value || '—'} {goal.unit}
                      </span>
                      <span>→</span>
                      <span>
                        Target: {goal.target_value} {goal.unit}
                      </span>
                      {goal.target_date && (
                        <span>
                          By: {new Date(goal.target_date).toLocaleDateString()}
                        </span>
                      )}
                    </div>

                    {goal.current_value && (
                      <div className="space-y-1">
                        <Progress value={progress} className="h-2" />
                        <p className="text-xs text-muted-foreground">
                          {progress.toFixed(0)}% complete
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    {goal.status === 'active' && progress >= 100 && (
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleUpdateStatus(goal.id, 'achieved')}
                      >
                        <CheckCircle2 className="h-4 w-4 mr-1" />
                        Mark Achieved
                      </Button>
                    )}
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleDeleteGoal(goal.id)}
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </CardContent>
        </Card>
      )}

      {/* New Goal Form */}
      <Card>
        <CardHeader>
          <CardTitle>Set New Goal</CardTitle>
          <CardDescription>
            Define a new fitness goal to track your progress
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            {/* Goal Type */}
            <div className="space-y-2">
              <Label htmlFor="goalType">Goal Type</Label>
              <Select
                value={selectedGoalType}
                onValueChange={(value) =>
                  setValue('goalType', value as GoalFormData['goalType'])
                }
              >
                <SelectTrigger id="goalType">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(goalTypeConfig).map(([key, config]) => (
                    <SelectItem key={key} value={key}>
                      {config.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Target and Current Value */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="targetValue">Target Value</Label>
                <div className="flex gap-2">
                  <Input
                    id="targetValue"
                    type="number"
                    step="0.1"
                    placeholder="e.g., 180"
                    {...register('targetValue')}
                  />
                  <Input
                    type="text"
                    value={watch('unit')}
                    {...register('unit')}
                    className="w-32"
                  />
                </div>
                {errors.targetValue && (
                  <p className="text-sm text-red-500">{errors.targetValue.message}</p>
                )}
              </div>

              <div className="space-y-2">
                <Label htmlFor="currentValue">Current Value (Optional)</Label>
                <Input
                  id="currentValue"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 200"
                  {...register('currentValue')}
                />
              </div>
            </div>

            {/* Target Date */}
            <div className="space-y-2">
              <Label htmlFor="targetDate">Target Date (Optional)</Label>
              <Input
                id="targetDate"
                type="date"
                min={new Date().toISOString().split('T')[0]}
                {...register('targetDate')}
              />
            </div>

            {/* Form Actions */}
            <div className="flex justify-end gap-3 pt-4">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}

              <Button type="submit" disabled={isSubmitting || submitSuccess}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitSuccess && <CheckCircle2 className="mr-2 h-4 w-4" />}
                {submitSuccess ? 'Goal Created!' : isSubmitting ? 'Creating...' : 'Create Goal'}
              </Button>
            </div>

            {/* Success Message */}
            {submitSuccess && (
              <div className="rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-800 dark:text-green-200">
                Fitness goal created successfully!
              </div>
            )}
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
