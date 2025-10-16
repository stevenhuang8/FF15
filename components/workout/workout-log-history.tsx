'use client'

/**
 * WorkoutLogHistory Component
 *
 * Displays chronological workout history with:
 * - Date range filtering
 * - Exercise type and intensity filters
 * - Search functionality
 * - Basic analytics (total workouts, calories, duration)
 * - Detailed workout log view
 */

import { useState, useEffect } from 'react'
import { format } from 'date-fns'
import {
  Calendar,
  Dumbbell,
  TrendingUp,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Flame,
  Clock,
  Activity,
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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from '@/components/ui/collapsible'

import { createClient } from '@/lib/supabase/client'
import { getWorkoutLogs } from '@/lib/supabase/workouts'

// ============================================================================
// Types
// ============================================================================

interface WorkoutLog {
  id: string
  user_id: string
  workout_plan_id: string | null
  title: string
  exercises_performed: any[]
  total_duration_minutes: number
  calories_burned: number | null
  intensity: 'low' | 'medium' | 'high'
  notes: string | null
  completed_at: string
}

interface WorkoutAnalytics {
  totalWorkouts: number
  totalDuration: number
  totalCalories: number
  averageDuration: number
  averageCalories: number
  mostFrequentIntensity: string
  workoutsThisWeek: number
  workoutsThisMonth: number
}

// ============================================================================
// Component Props
// ============================================================================

interface WorkoutLogHistoryProps {
  limit?: number
}

// ============================================================================
// Main Component
// ============================================================================

export function WorkoutLogHistory({ limit }: WorkoutLogHistoryProps) {
  const [workoutLogs, setWorkoutLogs] = useState<WorkoutLog[]>([])
  const [filteredLogs, setFilteredLogs] = useState<WorkoutLog[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [searchQuery, setSearchQuery] = useState('')
  const [intensityFilter, setIntensityFilter] = useState<string>('all')
  const [expandedLogs, setExpandedLogs] = useState<Set<string>>(new Set())

  // ============================================================================
  // Data Fetching
  // ============================================================================

  useEffect(() => {
    loadWorkoutLogs()
  }, [limit])

  const loadWorkoutLogs = async () => {
    setIsLoading(true)
    try {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (!user) {
        console.error('User not authenticated')
        setIsLoading(false)
        return
      }

      const { data, error } = await getWorkoutLogs(user.id, limit || 50)

      if (error) {
        console.error('Error loading workout logs:', error)
      } else if (data) {
        setWorkoutLogs(data)
        setFilteredLogs(data)
      }
    } catch (error) {
      console.error('Exception loading workout logs:', error)
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // Filtering and Search
  // ============================================================================

  useEffect(() => {
    let filtered = [...workoutLogs]

    // Apply search filter
    if (searchQuery) {
      filtered = filtered.filter(
        (log) =>
          log.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          log.exercises_performed.some((ex: any) =>
            ex.name?.toLowerCase().includes(searchQuery.toLowerCase())
          )
      )
    }

    // Apply intensity filter
    if (intensityFilter !== 'all') {
      filtered = filtered.filter((log) => log.intensity === intensityFilter)
    }

    setFilteredLogs(filtered)
  }, [searchQuery, intensityFilter, workoutLogs])

  // ============================================================================
  // Analytics Calculation
  // ============================================================================

  const calculateAnalytics = (): WorkoutAnalytics => {
    if (workoutLogs.length === 0) {
      return {
        totalWorkouts: 0,
        totalDuration: 0,
        totalCalories: 0,
        averageDuration: 0,
        averageCalories: 0,
        mostFrequentIntensity: 'medium',
        workoutsThisWeek: 0,
        workoutsThisMonth: 0,
      }
    }

    const now = new Date()
    const oneWeekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const oneMonthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    const totalDuration = workoutLogs.reduce(
      (sum, log) => sum + log.total_duration_minutes,
      0
    )
    const totalCalories = workoutLogs.reduce(
      (sum, log) => sum + (log.calories_burned || 0),
      0
    )

    const workoutsThisWeek = workoutLogs.filter(
      (log) => new Date(log.completed_at) >= oneWeekAgo
    ).length

    const workoutsThisMonth = workoutLogs.filter(
      (log) => new Date(log.completed_at) >= oneMonthAgo
    ).length

    // Find most frequent intensity
    const intensityCounts: Record<string, number> = {}
    workoutLogs.forEach((log) => {
      intensityCounts[log.intensity] = (intensityCounts[log.intensity] || 0) + 1
    })
    const mostFrequentIntensity = Object.keys(intensityCounts).reduce((a, b) =>
      intensityCounts[a] > intensityCounts[b] ? a : b
    )

    return {
      totalWorkouts: workoutLogs.length,
      totalDuration,
      totalCalories,
      averageDuration: Math.round(totalDuration / workoutLogs.length),
      averageCalories: Math.round(totalCalories / workoutLogs.length),
      mostFrequentIntensity,
      workoutsThisWeek,
      workoutsThisMonth,
    }
  }

  const analytics = calculateAnalytics()

  // ============================================================================
  // UI Handlers
  // ============================================================================

  const toggleLogExpanded = (logId: string) => {
    const newExpanded = new Set(expandedLogs)
    if (newExpanded.has(logId)) {
      newExpanded.delete(logId)
    } else {
      newExpanded.add(logId)
    }
    setExpandedLogs(newExpanded)
  }

  const getIntensityColor = (intensity: string) => {
    switch (intensity) {
      case 'low':
        return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200'
      case 'medium':
        return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200'
      case 'high':
        return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
      default:
        return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-200'
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-muted-foreground">Loading workout history...</div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Analytics Summary */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            Workout Analytics
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Workouts</p>
              <p className="text-2xl font-bold">{analytics.totalWorkouts}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Duration</p>
              <p className="text-2xl font-bold">
                {Math.floor(analytics.totalDuration / 60)}h{' '}
                {analytics.totalDuration % 60}m
              </p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Total Calories</p>
              <p className="text-2xl font-bold">{analytics.totalCalories}</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Avg Duration</p>
              <p className="text-2xl font-bold">{analytics.averageDuration} min</p>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t grid grid-cols-2 md:grid-cols-3 gap-4">
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">This Week</p>
              <p className="text-lg font-semibold">{analytics.workoutsThisWeek} workouts</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">This Month</p>
              <p className="text-lg font-semibold">{analytics.workoutsThisMonth} workouts</p>
            </div>
            <div className="space-y-1">
              <p className="text-sm text-muted-foreground">Most Frequent</p>
              <Badge className={getIntensityColor(analytics.mostFrequentIntensity)}>
                {analytics.mostFrequentIntensity} intensity
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Filter className="h-5 w-5" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Search */}
            <div className="space-y-2">
              <Label htmlFor="search">Search</Label>
              <div className="relative">
                <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
                <Input
                  id="search"
                  placeholder="Search workouts or exercises..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>

            {/* Intensity Filter */}
            <div className="space-y-2">
              <Label htmlFor="intensity">Intensity</Label>
              <Select value={intensityFilter} onValueChange={setIntensityFilter}>
                <SelectTrigger id="intensity">
                  <SelectValue placeholder="All intensities" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Intensities</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workout Logs List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Dumbbell className="h-5 w-5" />
            Workout History ({filteredLogs.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredLogs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              {workoutLogs.length === 0
                ? 'No workouts logged yet. Start tracking your fitness journey!'
                : 'No workouts match your filters.'}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredLogs.map((log) => (
                <Collapsible key={log.id}>
                  <div className="rounded-lg border p-4">
                    <CollapsibleTrigger
                      onClick={() => toggleLogExpanded(log.id)}
                      className="w-full"
                    >
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 text-left">
                          <div className="flex items-center gap-2 mb-1">
                            <h4 className="font-semibold">{log.title}</h4>
                            <Badge className={getIntensityColor(log.intensity)}>
                              {log.intensity}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3 w-3" />
                              {format(new Date(log.completed_at), 'MMM d, yyyy')}
                            </span>
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {log.total_duration_minutes} min
                            </span>
                            {log.calories_burned && (
                              <span className="flex items-center gap-1">
                                <Flame className="h-3 w-3" />
                                {log.calories_burned} cal
                              </span>
                            )}
                            <span className="flex items-center gap-1">
                              <Activity className="h-3 w-3" />
                              {log.exercises_performed.length} exercises
                            </span>
                          </div>
                        </div>
                        <Button variant="ghost" size="icon">
                          {expandedLogs.has(log.id) ? (
                            <ChevronUp className="h-4 w-4" />
                          ) : (
                            <ChevronDown className="h-4 w-4" />
                          )}
                        </Button>
                      </div>
                    </CollapsibleTrigger>

                    <CollapsibleContent>
                      <div className="mt-4 pt-4 border-t space-y-3">
                        {/* Exercises Performed */}
                        <div>
                          <h5 className="font-medium mb-2">Exercises</h5>
                          <div className="space-y-2">
                            {log.exercises_performed.map((exercise: any, idx: number) => (
                              <div
                                key={idx}
                                className="flex items-start justify-between text-sm bg-muted rounded-md p-2"
                              >
                                <div>
                                  <p className="font-medium">{exercise.name}</p>
                                  <p className="text-muted-foreground">
                                    {exercise.sets && `${exercise.sets} sets`}
                                    {exercise.reps && ` × ${exercise.reps} reps`}
                                    {exercise.weight &&
                                      ` @ ${exercise.weight} ${exercise.weightUnit || 'lbs'}`}
                                    {exercise.durationMinutes &&
                                      ` • ${exercise.durationMinutes} min`}
                                  </p>
                                  {exercise.notes && (
                                    <p className="text-xs text-muted-foreground italic mt-1">
                                      {exercise.notes}
                                    </p>
                                  )}
                                </div>
                                {exercise.caloriesBurned && (
                                  <Badge variant="outline">
                                    {exercise.caloriesBurned} cal
                                  </Badge>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Workout Notes */}
                        {log.notes && (
                          <div>
                            <h5 className="font-medium mb-1">Notes</h5>
                            <p className="text-sm text-muted-foreground">{log.notes}</p>
                          </div>
                        )}
                      </div>
                    </CollapsibleContent>
                  </div>
                </Collapsible>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
