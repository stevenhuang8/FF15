'use client'

/**
 * Health & Fitness Dashboard Client Component
 *
 * Comprehensive dashboard displaying:
 * - Health metrics overview
 * - Active fitness goals
 * - Progress charts
 * - Recent activity
 */

import { useEffect, useState } from 'react'
import { Plus, TrendingUp, Target, Activity, Calendar } from 'lucide-react'

import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'

import { HealthMetricsForm } from '@/components/health/health-metrics-form'
import { FitnessGoalSetter } from '@/components/health/fitness-goal-setter'
import { ProgressChartDashboard, ChartDataPoint, MultiSeriesDataPoint } from '@/components/health/progress-chart'
import { DataExportButton } from '@/components/health/data-export-button'

import { createClient } from '@/lib/supabase/client'
import {
  getDashboardData,
  getHealthMetrics,
  calculateGoalProgress,
} from '@/lib/supabase/health-metrics'
import { autoGenerateSnapshot } from '@/lib/health/snapshot-generator'
import type { Tables } from '@/types/supabase'

// ============================================================================
// Types
// ============================================================================

type FitnessGoal = Tables<'fitness_goals'>
type HealthMetric = Tables<'health_metrics'>

interface DashboardStats {
  currentWeight?: number
  weightChange?: number
  activeGoals: number
  goalsAchieved: number
  thisWeekWorkouts: number
}

// ============================================================================
// Main Component
// ============================================================================

export default function DashboardClient() {
  const [userId, setUserId] = useState<string | null>(null)
  const [stats, setStats] = useState<DashboardStats>({
    activeGoals: 0,
    goalsAchieved: 0,
    thisWeekWorkouts: 0,
  })
  const [activeGoals, setActiveGoals] = useState<FitnessGoal[]>([])
  const [weightData, setWeightData] = useState<ChartDataPoint[]>([])
  const [calorieData, setCalorieData] = useState<MultiSeriesDataPoint[]>([])
  const [workoutData, setWorkoutData] = useState<ChartDataPoint[]>([])
  const [measurementsData, setMeasurementsData] = useState<MultiSeriesDataPoint[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [showMetricsForm, setShowMetricsForm] = useState(false)
  const [showGoalSetter, setShowGoalSetter] = useState(false)

  // ============================================================================
  // Load Dashboard Data
  // ============================================================================

  useEffect(() => {
    async function init() {
      const supabase = createClient()
      const {
        data: { user },
      } = await supabase.auth.getUser()

      if (user) {
        setUserId(user.id)
        await loadDashboard(user.id)

        // Auto-generate weekly snapshot if needed
        await autoGenerateSnapshot(user.id)
      }

      setIsLoading(false)
    }

    init()
  }, [])

  const loadDashboard = async (uid: string) => {
    try {
      const { data: dashboardData } = await getDashboardData(uid)

      if (dashboardData) {
        // Update stats
        const newStats: DashboardStats = {
          currentWeight: dashboardData.latestMetrics?.weight || undefined,
          weightChange: calculateWeightChange(dashboardData.weightTrend || []),
          activeGoals: dashboardData.activeGoals.filter((g) => g.status === 'active').length,
          goalsAchieved: dashboardData.activeGoals.filter((g) => g.status === 'achieved').length,
          thisWeekWorkouts: dashboardData.recentSnapshots[0]?.total_workouts_this_week || 0,
        }

        setStats(newStats)
        setActiveGoals(dashboardData.activeGoals)

        // Prepare chart data
        prepareChartData(uid)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
    }
  }

  const prepareChartData = async (uid: string) => {
    const supabase = createClient()

    // Get health metrics for last 90 days
    const endDate = new Date()
    const startDate = new Date()
    startDate.setDate(startDate.getDate() - 90)

    const { data: metrics } = await getHealthMetrics(
      uid,
      startDate.toISOString().split('T')[0],
      endDate.toISOString().split('T')[0]
    )

    if (metrics) {
      // Weight data
      const weights: ChartDataPoint[] = metrics
        .filter((m) => m.weight != null)
        .map((m) => ({
          date: m.date,
          value: m.weight!,
        }))
        .reverse()

      setWeightData(weights)

      // Measurements data
      const measurements: MultiSeriesDataPoint[] = metrics
        .filter((m) => m.waist || m.chest || m.hips || m.arms || m.thighs)
        .map((m) => ({
          date: m.date,
          waist: m.waist || null,
          chest: m.chest || null,
          hips: m.hips || null,
          arms: m.arms || null,
          thighs: m.thighs || null,
        }))
        .reverse()

      setMeasurementsData(measurements)
    }

    // Get calorie data for last 30 days
    const calorieStartDate = new Date()
    calorieStartDate.setDate(calorieStartDate.getDate() - 30)

    const { data: calorieTracking } = await supabase
      .from('calorie_tracking')
      .select('*')
      .eq('user_id', uid)
      .gte('date', calorieStartDate.toISOString().split('T')[0])
      .order('date', { ascending: true })

    if (calorieTracking) {
      const calories: MultiSeriesDataPoint[] = calorieTracking.map((c) => ({
        date: c.date,
        consumed: c.total_calories_consumed || 0,
        burned: c.total_calories_burned || 0,
        net: c.net_calories || 0,
      }))

      setCalorieData(calories)
    }

    // Get workout data (weekly count for last 12 weeks)
    const workoutStartDate = new Date()
    workoutStartDate.setDate(workoutStartDate.getDate() - 84) // 12 weeks

    const { data: workoutLogs } = await supabase
      .from('workout_logs')
      .select('completed_at')
      .eq('user_id', uid)
      .gte('completed_at', workoutStartDate.toISOString())
      .order('completed_at', { ascending: true })

    if (workoutLogs) {
      // Group by week
      const weeklyWorkouts = new Map<string, number>()

      workoutLogs.forEach((log) => {
        const date = new Date(log.completed_at!)
        const weekStart = getWeekStart(date)
        const weekKey = weekStart.toISOString().split('T')[0]

        weeklyWorkouts.set(weekKey, (weeklyWorkouts.get(weekKey) || 0) + 1)
      })

      const workouts: ChartDataPoint[] = Array.from(weeklyWorkouts.entries()).map(
        ([date, count]) => ({
          date,
          value: count,
        })
      )

      setWorkoutData(workouts)
    }
  }

  // ============================================================================
  // Utility Functions
  // ============================================================================

  const calculateWeightChange = (
    weightTrend: Array<{ date: string; weight: number | null }>
  ): number | undefined => {
    if (weightTrend.length < 2) return undefined

    const first = weightTrend[0]?.weight
    const last = weightTrend[weightTrend.length - 1]?.weight

    if (!first || !last) return undefined

    return last - first
  }

  const getWeekStart = (date: Date): Date => {
    const d = new Date(date)
    const day = d.getDay()
    const diff = d.getDate() - day
    return new Date(d.setDate(diff))
  }

  const handleMetricsSuccess = () => {
    setShowMetricsForm(false)
    if (userId) {
      loadDashboard(userId)
    }
  }

  const handleGoalSuccess = () => {
    setShowGoalSetter(false)
    if (userId) {
      loadDashboard(userId)
    }
  }

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <div className="container mx-auto py-8 flex items-center justify-center min-h-screen">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    )
  }

  return (
    <div className="container mx-auto py-8 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Health & Fitness Dashboard</h1>
          <p className="text-muted-foreground">
            Track your progress and achieve your fitness goals
          </p>
        </div>

        <div className="flex gap-2">
          <DataExportButton />

          <Dialog open={showMetricsForm} onOpenChange={setShowMetricsForm}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Log Metrics
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Log Health Metrics</DialogTitle>
                <DialogDescription>
                  Record your weight, body measurements, and progress
                </DialogDescription>
              </DialogHeader>
              <HealthMetricsForm
                onSuccess={handleMetricsSuccess}
                onCancel={() => setShowMetricsForm(false)}
              />
            </DialogContent>
          </Dialog>

          <Dialog open={showGoalSetter} onOpenChange={setShowGoalSetter}>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Target className="h-4 w-4 mr-2" />
                Set Goals
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Fitness Goals</DialogTitle>
                <DialogDescription>
                  Create and manage your fitness goals
                </DialogDescription>
              </DialogHeader>
              <FitnessGoalSetter
                onSuccess={handleGoalSuccess}
                onCancel={() => setShowGoalSetter(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Current Weight</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {stats.currentWeight ? `${stats.currentWeight} lbs` : '—'}
            </div>
            {stats.weightChange !== undefined && (
              <p
                className={`text-xs ${
                  stats.weightChange < 0 ? 'text-green-600' : 'text-orange-600'
                }`}
              >
                {stats.weightChange > 0 ? '+' : ''}
                {stats.weightChange.toFixed(1)} lbs
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Active Goals</CardTitle>
            <Target className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.activeGoals}</div>
            <p className="text-xs text-muted-foreground">
              {stats.goalsAchieved} achieved
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">This Week</CardTitle>
            <Activity className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.thisWeekWorkouts}</div>
            <p className="text-xs text-muted-foreground">workouts completed</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Streak</CardTitle>
            <Calendar className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">—</div>
            <p className="text-xs text-muted-foreground">days active</p>
          </CardContent>
        </Card>
      </div>

      {/* Active Goals */}
      {activeGoals.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Active Goals</CardTitle>
            <CardDescription>Your current fitness goals and progress</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {activeGoals.slice(0, 3).map((goal) => {
                const progress = calculateGoalProgress(goal)
                return (
                  <div key={goal.id} className="flex items-center justify-between">
                    <div className="space-y-1">
                      <p className="text-sm font-medium leading-none">{goal.goal_type}</p>
                      <p className="text-sm text-muted-foreground">
                        {goal.current_value || '—'} / {goal.target_value} {goal.unit}
                      </p>
                    </div>
                    <div className="text-sm font-medium">{progress.toFixed(0)}%</div>
                  </div>
                )
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Progress Charts */}
      <ProgressChartDashboard
        weightData={weightData}
        calorieData={calorieData}
        workoutData={workoutData}
        measurementsData={measurementsData}
      />
    </div>
  )
}
