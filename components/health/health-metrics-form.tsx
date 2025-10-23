'use client'

/**
 * HealthMetricsForm Component
 *
 * Form for logging health metrics including:
 * - Weight
 * - Body fat percentage
 * - Body measurements (waist, chest, hips, arms, thighs)
 * - Notes
 */

import { useState, useEffect } from 'react'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Loader2, CheckCircle2, Scale, Percent, Ruler, Trash2, Trophy } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { MilestoneCelebration, type Milestone } from '@/components/health/milestone-celebration'

import { createClient } from '@/lib/supabase/client'
import { logHealthMetrics, getHealthMetricsByDate } from '@/lib/supabase/health-metrics'
import { getTodayPacific } from '@/lib/utils'

// ============================================================================
// Form Schema
// ============================================================================

const healthMetricsSchema = z.object({
  date: z.string().min(1, 'Date is required'),
  weight: z.string().optional(),
  bodyFatPercentage: z.string().optional(),
  waist: z.string().optional(),
  chest: z.string().optional(),
  hips: z.string().optional(),
  arms: z.string().optional(),
  thighs: z.string().optional(),
  notes: z.string().optional(),
}).refine(
  (data) => {
    // At least one metric must be provided
    return !!(
      data.weight ||
      data.bodyFatPercentage ||
      data.waist ||
      data.chest ||
      data.hips ||
      data.arms ||
      data.thighs
    )
  },
  {
    message: 'Please enter at least one metric',
    path: ['weight'],
  }
)

type HealthMetricsFormData = z.infer<typeof healthMetricsSchema>

// ============================================================================
// Component Types
// ============================================================================

interface HealthMetricsFormProps {
  onSuccess?: () => void
  onCancel?: () => void
  defaultDate?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function HealthMetricsForm({
  onSuccess,
  onCancel,
  defaultDate,
}: HealthMetricsFormProps) {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitSuccess, setSubmitSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
  const [canDelete, setCanDelete] = useState(false)
  const [celebrationMilestone, setCelebrationMilestone] = useState<Milestone | null>(null)
  const [showCelebration, setShowCelebration] = useState(false)

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<HealthMetricsFormData>({
    resolver: zodResolver(healthMetricsSchema),
    defaultValues: {
      date: defaultDate || getTodayPacific(),
      weight: '',
      bodyFatPercentage: '',
      waist: '',
      chest: '',
      hips: '',
      arms: '',
      thighs: '',
      notes: '',
    },
  })

  const selectedDate = watch('date')

  // ============================================================================
  // Get current user
  // ============================================================================

  useEffect(() => {
    async function getUser() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()
      if (user) {
        setUserId(user.id)
      }
    }
    getUser()
  }, [])

  // ============================================================================
  // Load existing metrics for selected date
  // ============================================================================

  useEffect(() => {
    async function loadMetrics() {
      if (!userId || !selectedDate) return

      const { data } = await getHealthMetricsByDate(userId, selectedDate)
      if (data) {
        // Pre-fill form with existing data
        setValue('weight', data.weight?.toString() || '')
        setValue('bodyFatPercentage', data.body_fat_percentage?.toString() || '')
        setValue('waist', data.waist?.toString() || '')
        setValue('chest', data.chest?.toString() || '')
        setValue('hips', data.hips?.toString() || '')
        setValue('arms', data.arms?.toString() || '')
        setValue('thighs', data.thighs?.toString() || '')
        setValue('notes', data.notes || '')

        // Enable delete if data exists
        setCanDelete(true)
      } else {
        setCanDelete(false)
      }
    }
    loadMetrics()
  }, [userId, selectedDate, setValue])

  // ============================================================================
  // Delete Handler
  // ============================================================================

  const handleDelete = async () => {
    if (!userId || !selectedDate) return

    const { deleteHealthMetrics } = await import('@/lib/supabase/health-metrics')
    const { error } = await deleteHealthMetrics(userId, selectedDate)

    if (error) {
      console.error('Failed to delete metrics:', error)
      return
    }

    console.log('✅ Health metrics deleted for:', selectedDate)
    setShowDeleteConfirm(false)
    onSuccess?.()
  }

  // ============================================================================
  // Form Submission
  // ============================================================================

  const onSubmit = async (formData: HealthMetricsFormData) => {
    if (!userId) {
      console.error('User not authenticated')
      return
    }

    setIsSubmitting(true)
    setSubmitSuccess(false)

    try {
      // Convert string values to numbers
      const metricsData = {
        userId,
        date: formData.date,
        weight: formData.weight ? parseFloat(formData.weight) : undefined,
        bodyFatPercentage: formData.bodyFatPercentage
          ? parseFloat(formData.bodyFatPercentage)
          : undefined,
        waist: formData.waist ? parseFloat(formData.waist) : undefined,
        chest: formData.chest ? parseFloat(formData.chest) : undefined,
        hips: formData.hips ? parseFloat(formData.hips) : undefined,
        arms: formData.arms ? parseFloat(formData.arms) : undefined,
        thighs: formData.thighs ? parseFloat(formData.thighs) : undefined,
        notes: formData.notes,
      }

      const { error } = await logHealthMetrics(metricsData)

      if (error) {
        console.error('Failed to log health metrics:', error)
        throw error
      }

      // Auto-sync weight-based goals if weight was logged
      if (metricsData.weight) {
        const { syncGoalProgress, checkGoalAchievement } = await import('@/lib/supabase/goal-sync')
        const supabase = createClient()

        console.log('🔄 Syncing goals with new weight:', metricsData.weight)

        // Sync goals with new weight
        await syncGoalProgress(userId)

        // Check if any goals were achieved
        const { data: activeGoals } = await supabase
          .from('fitness_goals')
          .select('id')
          .eq('user_id', userId)
          .eq('status', 'active')

        if (activeGoals) {
          for (const goal of activeGoals) {
            const result = await checkGoalAchievement(userId, goal.id)
            if (result.achieved) {
              console.log('🎉 Goal achieved:', goal.id)
              // Fetch full goal details for celebration
              const { data: goalData } = await supabase
                .from('fitness_goals')
                .select('*')
                .eq('id', goal.id)
                .single()

              if (goalData) {
                // Import milestone config
                const { milestoneConfigs } = await import('@/components/health/milestone-celebration')
                const { Trophy } = await import('lucide-react')

                // Create milestone for celebration
                const milestone: Milestone = {
                  ...milestoneConfigs.goal_achieved,
                  title: 'Goal Achieved!',
                  description: `Congratulations! You've reached your ${goalData.goal_type.replace('_', ' ')} goal of ${goalData.target_value} ${goalData.unit}!`,
                }

                setCelebrationMilestone(milestone)
                setShowCelebration(true)
              }
            }
          }
        }
      }

      setSubmitSuccess(true)

      // Call success callback after a short delay
      setTimeout(() => {
        onSuccess?.()
      }, 1000)
    } catch (error) {
      console.error('Error logging health metrics:', error)
    } finally {
      setIsSubmitting(false)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  return (
    <Card className="w-full max-w-2xl">
      <CardHeader>
        <CardTitle>Log Health Metrics</CardTitle>
        <CardDescription>
          Track your weight, body measurements, and progress over time
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          {/* Date Input */}
          <div className="space-y-2">
            <Label htmlFor="date">Date</Label>
            <Input
              id="date"
              type="date"
              {...register('date')}
              max={getTodayPacific()}
            />
            {errors.date && (
              <p className="text-sm text-red-500">{errors.date.message}</p>
            )}
          </div>

          {/* Weight & Body Fat */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="weight" className="flex items-center gap-2">
                <Scale className="h-4 w-4" />
                Weight (lbs)
              </Label>
              <Input
                id="weight"
                type="number"
                step="0.1"
                placeholder="e.g., 180.5"
                {...register('weight')}
              />
              {errors.weight && (
                <p className="text-sm text-red-500">{errors.weight.message}</p>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="bodyFatPercentage" className="flex items-center gap-2">
                <Percent className="h-4 w-4" />
                Body Fat (%)
              </Label>
              <Input
                id="bodyFatPercentage"
                type="number"
                step="0.1"
                placeholder="e.g., 18.5"
                {...register('bodyFatPercentage')}
              />
            </div>
          </div>

          {/* Body Measurements */}
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <Ruler className="h-4 w-4" />
              <h3 className="text-sm font-medium">Body Measurements (inches)</h3>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label htmlFor="waist">Waist</Label>
                <Input
                  id="waist"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 32.0"
                  {...register('waist')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="chest">Chest</Label>
                <Input
                  id="chest"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 40.0"
                  {...register('chest')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="hips">Hips</Label>
                <Input
                  id="hips"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 38.0"
                  {...register('hips')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="arms">Arms</Label>
                <Input
                  id="arms"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 14.0"
                  {...register('arms')}
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="thighs">Thighs</Label>
                <Input
                  id="thighs"
                  type="number"
                  step="0.1"
                  placeholder="e.g., 22.0"
                  {...register('thighs')}
                />
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="space-y-2">
            <Label htmlFor="notes">Notes (Optional)</Label>
            <Textarea
              id="notes"
              placeholder="How are you feeling? Any observations?"
              rows={3}
              {...register('notes')}
            />
          </div>

          {/* Form Actions */}
          <div className="flex justify-between gap-3 pt-4">
            <div>
              {canDelete && (
                <Button
                  type="button"
                  variant="destructive"
                  onClick={() => setShowDeleteConfirm(true)}
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete Entry
                </Button>
              )}
            </div>

            <div className="flex gap-3">
              {onCancel && (
                <Button type="button" variant="outline" onClick={onCancel}>
                  Cancel
                </Button>
              )}

              <Button type="submit" disabled={isSubmitting || submitSuccess}>
                {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                {submitSuccess && <CheckCircle2 className="mr-2 h-4 w-4" />}
                {submitSuccess ? 'Saved!' : isSubmitting ? 'Saving...' : 'Save Metrics'}
              </Button>
            </div>
          </div>

          {/* Success Message */}
          {submitSuccess && (
            <div className="rounded-md bg-green-50 dark:bg-green-950 p-3 text-sm text-green-800 dark:text-green-200">
              Health metrics saved successfully!
            </div>
          )}
        </form>

        {/* Delete Confirmation Dialog */}
        <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
          <AlertDialogContent>
            <AlertDialogHeader>
              <AlertDialogTitle>Delete Health Metrics?</AlertDialogTitle>
              <AlertDialogDescription>
                This will permanently delete your health metrics for {selectedDate}. This action cannot be undone.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter>
              <AlertDialogCancel>Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDelete}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>

        {/* Goal Achievement Celebration */}
        {celebrationMilestone && (
          <MilestoneCelebration
            milestone={celebrationMilestone}
            open={showCelebration}
            onClose={() => {
              setShowCelebration(false)
              setCelebrationMilestone(null)
            }}
          />
        )}
      </CardContent>
    </Card>
  )
}
