'use client'

/**
 * Workouts Page Client Component
 *
 * Comprehensive workout management interface with:
 * - Saved workout plans library
 * - Workout logging functionality
 * - Workout history and analytics
 * - Progress photos management
 */

import { useState, useEffect } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { Dumbbell, History, Camera, Plus } from 'lucide-react'

import { WorkoutList } from '@/components/workout/workout-list'
import { WorkoutLogForm } from '@/components/workout/workout-log-form'
import { WorkoutLogHistory } from '@/components/workout/workout-log-history'
import { ProgressPhotos } from '@/components/workout/progress-photos'
import { WorkoutDetailDialog } from '@/components/workout/workout-detail-dialog'
import { DeleteWorkoutDialog } from '@/components/workout/delete-workout-dialog'
import { getWorkouts, deleteWorkout } from '@/lib/supabase/workouts'
import { createClient } from '@/lib/supabase/client'
import type { Tables } from '@/types/supabase'

type SavedWorkout = Tables<'workout_plans'>

export function WorkoutsPageClient() {
  const [logDialogOpen, setLogDialogOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('plans')
  const [workouts, setWorkouts] = useState<SavedWorkout[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [selectedWorkout, setSelectedWorkout] = useState<SavedWorkout | null>(null)
  const [detailDialogOpen, setDetailDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)

  useEffect(() => {
    loadWorkouts()
  }, [])

  const loadWorkouts = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { data, error } = await getWorkouts(user.id)
      if (!error && data) {
        setWorkouts(data)
      }
    } catch (error) {
      console.error('Error loading workouts:', error)
    } finally {
      setIsLoading(false)
    }
  }

  const handleWorkoutClick = (workout: SavedWorkout) => {
    setSelectedWorkout(workout)
    setDetailDialogOpen(true)
  }

  const handleDeleteClick = (workout: SavedWorkout) => {
    setSelectedWorkout(workout)
    setDeleteDialogOpen(true)
  }

  const handleEditClick = (workout: SavedWorkout) => {
    // TODO: Implement edit functionality
    console.log('Edit workout:', workout)
  }

  const handleDeleteConfirm = async () => {
    if (!selectedWorkout) return

    setIsDeleting(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) return

      const { error } = await deleteWorkout(selectedWorkout.id, user.id)

      if (error) {
        console.error('Error deleting workout:', error)
        alert('Failed to delete workout. Please try again.')
      } else {
        // Remove the workout from the list
        setWorkouts((prev) => prev.filter((w) => w.id !== selectedWorkout.id))
        setDeleteDialogOpen(false)
        setSelectedWorkout(null)
        console.log('✅ Workout deleted successfully')
      }
    } catch (error) {
      console.error('Exception deleting workout:', error)
      alert('An error occurred while deleting the workout.')
    } finally {
      setIsDeleting(false)
    }
  }

  return (
    <div className="container max-w-7xl py-8">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Workouts</h1>
          <p className="text-muted-foreground">
            Manage your workout plans and track your fitness progress
          </p>
        </div>
        <Button onClick={() => setLogDialogOpen(true)} size="lg">
          <Plus className="mr-2 h-5 w-5" />
          Log Workout
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-4 lg:w-[600px]">
          <TabsTrigger value="plans" className="gap-2">
            <Dumbbell className="h-4 w-4" />
            <span className="hidden sm:inline">Workout Plans</span>
            <span className="sm:hidden">Plans</span>
          </TabsTrigger>
          <TabsTrigger value="history" className="gap-2">
            <History className="h-4 w-4" />
            <span className="hidden sm:inline">History</span>
            <span className="sm:hidden">Logs</span>
          </TabsTrigger>
          <TabsTrigger value="photos" className="gap-2">
            <Camera className="h-4 w-4" />
            <span className="hidden sm:inline">Progress Photos</span>
            <span className="sm:hidden">Photos</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="plans" className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <div className="mb-4 flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold">Saved Workout Plans</h2>
                <p className="text-sm text-muted-foreground">
                  Browse and manage your saved workout routines
                </p>
              </div>
            </div>
            <WorkoutList
              workouts={workouts}
              isLoading={isLoading}
              onWorkoutClick={handleWorkoutClick}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          </div>
        </TabsContent>

        <TabsContent value="history" className="space-y-4">
          <WorkoutLogHistory />
        </TabsContent>

        <TabsContent value="photos" className="space-y-4">
          <div className="rounded-lg border bg-card p-6">
            <ProgressPhotos />
          </div>
        </TabsContent>
      </Tabs>

      {/* Log Workout Dialog */}
      <Dialog open={logDialogOpen} onOpenChange={setLogDialogOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Log a Workout</DialogTitle>
            <DialogDescription>
              Track your completed workout session with exercises, sets, reps, and
              duration
            </DialogDescription>
          </DialogHeader>
          <WorkoutLogForm
            onSuccess={() => {
              setLogDialogOpen(false)
              // Switch to history tab to see the new log
              setActiveTab('history')
            }}
            onCancel={() => setLogDialogOpen(false)}
          />
        </DialogContent>
      </Dialog>

      {/* Workout Detail Dialog */}
      <WorkoutDetailDialog
        workout={selectedWorkout}
        open={detailDialogOpen}
        onOpenChange={setDetailDialogOpen}
        onEdit={() => {
          setDetailDialogOpen(false)
          if (selectedWorkout) {
            handleEditClick(selectedWorkout)
          }
        }}
        onDelete={() => {
          setDetailDialogOpen(false)
          if (selectedWorkout) {
            handleDeleteClick(selectedWorkout)
          }
        }}
      />

      {/* Delete Workout Confirmation Dialog */}
      <DeleteWorkoutDialog
        workout={selectedWorkout}
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={handleDeleteConfirm}
      />
    </div>
  )
}
