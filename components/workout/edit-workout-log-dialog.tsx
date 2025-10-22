'use client'

import { useState, useEffect } from 'react'
import { Loader2, Plus, X, Calendar as CalendarIcon } from 'lucide-react'
import { format } from 'date-fns'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { updateWorkoutLog } from '@/lib/supabase/workouts'

interface WorkoutLog {
  id: string
  user_id: string
  title: string
  exercises_performed: any[]
  total_duration_minutes: number
  calories_burned: number | null
  intensity: 'low' | 'medium' | 'high'
  notes: string | null
  completed_at: string
}

interface EditWorkoutLogDialogProps {
  workoutLog: WorkoutLog | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: () => void
}

interface Exercise {
  name: string
  sets?: number
  reps?: number | string
  weight?: number
  weightUnit?: 'lbs' | 'kg'
  durationMinutes?: number
  intensity?: 'low' | 'medium' | 'high'
  caloriesBurned?: number
  notes?: string
}

export function EditWorkoutLogDialog({
  workoutLog,
  open,
  onOpenChange,
  onSave,
}: EditWorkoutLogDialogProps) {
  const [isSaving, setIsSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState('')
  const [exercises, setExercises] = useState<Exercise[]>([])
  const [intensity, setIntensity] = useState<'low' | 'medium' | 'high'>('medium')
  const [totalDuration, setTotalDuration] = useState('')
  const [caloriesBurned, setCaloriesBurned] = useState('')
  const [notes, setNotes] = useState('')
  const [completedAt, setCompletedAt] = useState<Date>(new Date())

  // Populate form when workoutLog changes
  useEffect(() => {
    if (workoutLog) {
      setTitle(workoutLog.title)
      setExercises(workoutLog.exercises_performed || [])
      setIntensity(workoutLog.intensity)
      setTotalDuration(workoutLog.total_duration_minutes.toString())
      setCaloriesBurned(workoutLog.calories_burned?.toString() || '')
      setNotes(workoutLog.notes || '')
      setCompletedAt(new Date(workoutLog.completed_at))
    } else {
      resetForm()
    }
    setError(null)
  }, [workoutLog, open])

  const resetForm = () => {
    setTitle('')
    setExercises([])
    setIntensity('medium')
    setTotalDuration('')
    setCaloriesBurned('')
    setNotes('')
    setCompletedAt(new Date())
  }

  const updateExercise = (index: number, field: keyof Exercise, value: any) => {
    const newExercises = [...exercises]
    newExercises[index] = {
      ...newExercises[index],
      [field]: value,
    }
    setExercises(newExercises)
  }

  const removeExercise = (index: number) => {
    setExercises(exercises.filter((_, i) => i !== index))
  }

  const addExercise = () => {
    setExercises([
      ...exercises,
      {
        name: '',
        sets: 3,
        reps: 10,
        weight: 0,
        weightUnit: 'lbs',
        intensity: 'medium',
      },
    ])
  }

  const handleSave = async () => {
    if (!workoutLog) return

    // Validation
    if (!title.trim()) {
      setError('Title is required')
      return
    }

    if (exercises.length === 0) {
      setError('At least one exercise is required')
      return
    }

    const durationNum = parseFloat(totalDuration)
    if (isNaN(durationNum) || durationNum <= 0) {
      setError('Duration must be a positive number')
      return
    }

    const caloriesNum = caloriesBurned ? parseFloat(caloriesBurned) : null
    if (caloriesBurned && (isNaN(caloriesNum!) || caloriesNum! < 0)) {
      setError('Calories must be a non-negative number')
      return
    }

    // Check for empty exercise names
    if (exercises.some((ex) => !ex.name.trim())) {
      setError('All exercises must have a name')
      return
    }

    setIsSaving(true)
    setError(null)

    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        throw new Error('You must be logged in to edit workout logs')
      }

      const { error: updateError } = await updateWorkoutLog(workoutLog.id, user.id, {
        title: title.trim(),
        exercises_performed: exercises,
        total_duration_minutes: durationNum,
        calories_burned: caloriesNum,
        intensity,
        notes: notes.trim() || null,
        completed_at: completedAt.toISOString(),
      })

      if (updateError) {
        throw updateError
      }

      onSave()
      onOpenChange(false)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update workout log')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Workout Log</DialogTitle>
          <DialogDescription>
            Update the details of your workout
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          {/* Title */}
          <div className="grid gap-2">
            <Label htmlFor="title">Workout Title *</Label>
            <Input
              id="title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="e.g., Morning Run, Leg Day"
            />
          </div>

          {/* Intensity & Duration */}
          <div className="grid grid-cols-2 gap-4">
            <div className="grid gap-2">
              <Label htmlFor="intensity">Intensity *</Label>
              <Select
                value={intensity}
                onValueChange={(value) => setIntensity(value as 'low' | 'medium' | 'high')}
              >
                <SelectTrigger id="intensity">
                  <SelectValue placeholder="Select intensity" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="duration">Duration (minutes) *</Label>
              <Input
                id="duration"
                type="number"
                value={totalDuration}
                onChange={(e) => setTotalDuration(e.target.value)}
                placeholder="45"
              />
            </div>
          </div>

          {/* Calories Burned */}
          <div className="grid gap-2">
            <Label htmlFor="calories">Calories Burned (optional)</Label>
            <Input
              id="calories"
              type="number"
              value={caloriesBurned}
              onChange={(e) => setCaloriesBurned(e.target.value)}
              placeholder="300"
            />
          </div>

          {/* Completed At */}
          <div className="grid gap-2">
            <Label htmlFor="completed-date">Completed Date & Time</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  id="completed-date"
                  variant="outline"
                  className={cn(
                    'justify-start text-left font-normal',
                    !completedAt && 'text-muted-foreground'
                  )}
                >
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {completedAt ? format(completedAt, 'PPP p') : <span>Pick a date</span>}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={completedAt}
                  onSelect={(date) => date && setCompletedAt(date)}
                  initialFocus
                />
              </PopoverContent>
            </Popover>
          </div>

          {/* Exercises */}
          <div className="grid gap-2">
            <div className="flex items-center justify-between">
              <Label>Exercises *</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addExercise}
              >
                <Plus className="h-4 w-4 mr-1" />
                Add Exercise
              </Button>
            </div>

            <div className="space-y-3">
              {exercises.map((exercise, index) => (
                <div
                  key={index}
                  className="border rounded-lg p-3 space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1 grid gap-2">
                      <Input
                        placeholder="Exercise name *"
                        value={exercise.name}
                        onChange={(e) => updateExercise(index, 'name', e.target.value)}
                      />
                    </div>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => removeExercise(index)}
                      className="text-destructive"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>

                  <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                    <Input
                      type="number"
                      placeholder="Sets"
                      value={exercise.sets || ''}
                      onChange={(e) =>
                        updateExercise(index, 'sets', parseInt(e.target.value) || 0)
                      }
                    />
                    <Input
                      placeholder="Reps"
                      value={exercise.reps || ''}
                      onChange={(e) => updateExercise(index, 'reps', e.target.value)}
                    />
                    <Input
                      type="number"
                      placeholder="Weight"
                      value={exercise.weight || ''}
                      onChange={(e) =>
                        updateExercise(index, 'weight', parseFloat(e.target.value) || 0)
                      }
                    />
                    <Select
                      value={exercise.weightUnit || 'lbs'}
                      onValueChange={(value) => updateExercise(index, 'weightUnit', value)}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="lbs">lbs</SelectItem>
                        <SelectItem value="kg">kg</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <Input
                      type="number"
                      placeholder="Duration (min)"
                      value={exercise.durationMinutes || ''}
                      onChange={(e) =>
                        updateExercise(
                          index,
                          'durationMinutes',
                          parseInt(e.target.value) || 0
                        )
                      }
                    />
                    <Select
                      value={exercise.intensity || 'medium'}
                      onValueChange={(value) => updateExercise(index, 'intensity', value)}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Intensity" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="low">Low</SelectItem>
                        <SelectItem value="medium">Medium</SelectItem>
                        <SelectItem value="high">High</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <Input
                    placeholder="Notes (optional)"
                    value={exercise.notes || ''}
                    onChange={(e) => updateExercise(index, 'notes', e.target.value)}
                  />
                </div>
              ))}

              {exercises.length === 0 && (
                <div className="text-center py-6 text-muted-foreground border-2 border-dashed rounded-lg">
                  No exercises added yet. Click "Add Exercise" to start.
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div className="grid gap-2">
            <Label htmlFor="notes">Workout Notes</Label>
            <Textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Add any additional notes about your workout..."
              rows={3}
              maxLength={500}
            />
            <p className="text-xs text-muted-foreground">
              {notes.length}/500 characters
            </p>
          </div>

          {/* Error message */}
          {error && (
            <div className="text-sm text-destructive bg-destructive/10 p-3 rounded-md">
              {error}
            </div>
          )}
        </div>

        <DialogFooter>
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isSaving}
          >
            Cancel
          </Button>
          <Button onClick={handleSave} disabled={isSaving}>
            {isSaving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
