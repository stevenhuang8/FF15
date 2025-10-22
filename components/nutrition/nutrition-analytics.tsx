'use client'

/**
 * Nutrition Analytics Component
 *
 * Comprehensive nutrition analytics with charts and visualizations:
 * - Calorie trends over time
 * - Macro distribution charts
 * - Daily intake vs targets
 * - Date range selection
 * - Export functionality
 */

import { useEffect, useState } from 'react'
import { format, subDays, startOfWeek, endOfWeek, startOfMonth, endOfMonth } from 'date-fns'
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts'
import {  Calendar as CalendarIcon, Download, Loader2, TrendingUp } from 'lucide-react'

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Calendar } from '@/components/ui/calendar'
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover'
import { parseLocalDate } from '@/lib/utils'

// ============================================================================
// Types
// ============================================================================

interface NutritionDataPoint {
  date: string
  calories: number
  protein: number
  carbs: number
  fats: number
  burned: number
  net: number
}

interface AnalyticsSummary {
  totalDays: number
  avgCalories: number
  avgProtein: number
  avgCarbs: number
  avgFats: number
  avgBurned: number
  totalCalories: number
  totalProtein: number
  totalCarbs: number
  totalFats: number
  totalBurned: number
}

interface NutritionTargets {
  calories: number
  protein: number
  carbs: number
  fats: number
}

interface AnalyticsData {
  data: NutritionDataPoint[]
  summary: AnalyticsSummary
  targets: NutritionTargets
}

type TimeRange = '7days' | '30days' | 'thisWeek' | 'thisMonth' | 'custom'

interface NutritionAnalyticsProps {
  className?: string
}

// ============================================================================
// Main Component
// ============================================================================

export function NutritionAnalytics({ className }: NutritionAnalyticsProps) {
  const [timeRange, setTimeRange] = useState<TimeRange>('7days')
  const [customStartDate, setCustomStartDate] = useState<Date | undefined>()
  const [customEndDate, setCustomEndDate] = useState<Date | undefined>()
  const [analyticsData, setAnalyticsData] = useState<AnalyticsData | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  // ============================================================================
  // Date Range Calculation
  // ============================================================================

  const getDateRange = (): { start: Date; end: Date } => {
    const today = new Date()

    switch (timeRange) {
      case '7days':
        return { start: subDays(today, 6), end: today }
      case '30days':
        return { start: subDays(today, 29), end: today }
      case 'thisWeek':
        return { start: startOfWeek(today), end: endOfWeek(today) }
      case 'thisMonth':
        return { start: startOfMonth(today), end: endOfMonth(today) }
      case 'custom':
        return {
          start: customStartDate || subDays(today, 6),
          end: customEndDate || today,
        }
      default:
        return { start: subDays(today, 6), end: today }
    }
  }

  // ============================================================================
  // Fetch Analytics Data
  // ============================================================================

  useEffect(() => {
    fetchAnalyticsData()
  }, [timeRange, customStartDate, customEndDate])

  const fetchAnalyticsData = async () => {
    setIsLoading(true)
    setError(null)

    try {
      const { start, end } = getDateRange()
      const startDate = format(start, 'yyyy-MM-dd')
      const endDate = format(end, 'yyyy-MM-dd')

      const response = await fetch(
        `/api/nutrition-analytics?startDate=${startDate}&endDate=${endDate}`
      )

      if (!response.ok) {
        throw new Error('Failed to fetch analytics data')
      }

      const data: AnalyticsData = await response.json()
      setAnalyticsData(data)
    } catch (err) {
      console.error('Error fetching analytics:', err)
      setError(err instanceof Error ? err.message : 'Failed to load analytics')
    } finally {
      setIsLoading(false)
    }
  }

  // ============================================================================
  // Export Functionality
  // ============================================================================

  const exportToCSV = () => {
    if (!analyticsData) return

    const headers = ['Date', 'Calories', 'Protein (g)', 'Carbs (g)', 'Fats (g)', 'Burned', 'Net']
    const rows = analyticsData.data.map((day) => [
      day.date,
      day.calories,
      day.protein,
      day.carbs,
      day.fats,
      day.burned,
      day.net,
    ])

    const csvContent = [
      headers.join(','),
      ...rows.map((row) => row.join(',')),
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = `nutrition-analytics-${format(new Date(), 'yyyy-MM-dd')}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  // ============================================================================
  // Chart Data Formatting
  // ============================================================================

  const getChartData = () => {
    if (!analyticsData) return []

    return analyticsData.data.map((day) => ({
      ...day,
      // Use parseLocalDate to interpret date strings as local dates, not UTC
      // This prevents timezone shift issues (e.g., Oct 22 showing as Oct 21)
      date: format(parseLocalDate(day.date), 'MMM dd'),
      calorieTarget: analyticsData.targets.calories,
    }))
  }

  const chartData = getChartData()

  // ============================================================================
  // Render
  // ============================================================================

  if (isLoading) {
    return (
      <Card className={className}>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          <span className="ml-3 text-muted-foreground">Loading analytics...</span>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card className={className}>
        <CardContent className="py-8">
          <div className="rounded-lg bg-destructive/10 p-4 text-destructive">
            <p className="font-medium">Error loading analytics</p>
            <p className="text-sm">{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (!analyticsData || analyticsData.data.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>Nutrition Analytics</CardTitle>
          <CardDescription>No nutrition data available for the selected period</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Start logging meals to see your nutrition analytics.
          </p>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className={className}>
      {/* Header with Controls */}
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Nutrition Analytics</CardTitle>
              <CardDescription>Track your nutrition progress over time</CardDescription>
            </div>
            <Button onClick={exportToCSV} variant="outline" size="sm">
              <Download className="mr-2 h-4 w-4" />
              Export CSV
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Time Range Selector */}
          <div className="flex flex-wrap items-center gap-4">
            <Select value={timeRange} onValueChange={(value) => setTimeRange(value as TimeRange)}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Select time range" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="7days">Last 7 Days</SelectItem>
                <SelectItem value="30days">Last 30 Days</SelectItem>
                <SelectItem value="thisWeek">This Week</SelectItem>
                <SelectItem value="thisMonth">This Month</SelectItem>
                <SelectItem value="custom">Custom Range</SelectItem>
              </SelectContent>
            </Select>

            {timeRange === 'custom' && (
              <div className="flex items-center gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customStartDate ? format(customStartDate, 'MMM dd') : 'Start Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customStartDate}
                      onSelect={setCustomStartDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>

                <span className="text-muted-foreground">to</span>

                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" size="sm">
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {customEndDate ? format(customEndDate, 'MMM dd') : 'End Date'}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0">
                    <Calendar
                      mode="single"
                      selected={customEndDate}
                      onSelect={setCustomEndDate}
                      initialFocus
                    />
                  </PopoverContent>
                </Popover>
              </div>
            )}
          </div>

          {/* Summary Stats */}
          <div className="grid grid-cols-2 gap-4 md:grid-cols-4">
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Avg Calories</p>
              <p className="text-2xl font-bold">{analyticsData.summary.avgCalories}</p>
              <p className="text-xs text-muted-foreground">
                Target: {analyticsData.targets.calories}
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Avg Protein</p>
              <p className="text-2xl font-bold">{analyticsData.summary.avgProtein}g</p>
              <p className="text-xs text-muted-foreground">
                Target: {analyticsData.targets.protein}g
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Avg Carbs</p>
              <p className="text-2xl font-bold">{analyticsData.summary.avgCarbs}g</p>
              <p className="text-xs text-muted-foreground">
                Target: {analyticsData.targets.carbs}g
              </p>
            </div>
            <div className="rounded-lg border bg-muted/50 p-3">
              <p className="text-xs text-muted-foreground">Avg Fats</p>
              <p className="text-2xl font-bold">{analyticsData.summary.avgFats}g</p>
              <p className="text-xs text-muted-foreground">
                Target: {analyticsData.targets.fats}g
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Charts */}
      <div className="mt-6 space-y-6">
        <Tabs defaultValue="calories" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="calories">Calorie Trends</TabsTrigger>
            <TabsTrigger value="macros">Macro Distribution</TabsTrigger>
          </TabsList>

          {/* Calorie Trends Chart */}
          <TabsContent value="calories" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5" />
                  Calorie Trends
                </CardTitle>
                <CardDescription>
                  Daily calorie intake vs target over time
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      tick={{ fontSize: 12 }}
                      tickMargin={10}
                    />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Line
                      type="monotone"
                      dataKey="calories"
                      stroke="#A855F7"
                      strokeWidth={3}
                      name="Calories"
                      dot={{ fill: '#A855F7', r: 4 }}
                    />
                    <Line
                      type="monotone"
                      dataKey="calorieTarget"
                      stroke="hsl(var(--muted-foreground))"
                      strokeWidth={2}
                      strokeDasharray="5 5"
                      name="Target"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Net Calories</CardTitle>
                <CardDescription>Calories consumed minus burned</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend />
                    <Bar dataKey="net" fill="#A855F7" name="Net Calories" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Macro Distribution Chart */}
          <TabsContent value="macros" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle>Macro Distribution</CardTitle>
                <CardDescription>Protein, carbs, and fats over time</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={350}>
                  <AreaChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                      }}
                    />
                    <Legend />
                    <Area
                      type="monotone"
                      dataKey="protein"
                      stackId="1"
                      stroke="hsl(var(--chart-1))"
                      fill="hsl(var(--chart-1) / 0.8)"
                      name="Protein (g)"
                    />
                    <Area
                      type="monotone"
                      dataKey="carbs"
                      stackId="1"
                      stroke="#A855F7"
                      fill="rgba(168, 85, 247, 0.8)"
                      name="Carbs (g)"
                    />
                    <Area
                      type="monotone"
                      dataKey="fats"
                      stackId="1"
                      stroke="hsl(var(--chart-4))"
                      fill="hsl(var(--chart-4) / 0.8)"
                      name="Fats (g)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Daily Macro Breakdown</CardTitle>
                <CardDescription>Individual macro tracking</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" tick={{ fontSize: 12 }} tickMargin={10} />
                    <YAxis tick={{ fontSize: 12 }} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: 'hsl(var(--card))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px',
                        color: 'hsl(var(--foreground))',
                      }}
                      labelStyle={{ color: 'hsl(var(--foreground))', fontWeight: 500 }}
                      itemStyle={{ color: 'hsl(var(--foreground))' }}
                    />
                    <Legend />
                    <Bar dataKey="protein" fill="hsl(var(--chart-1))" name="Protein (g)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="carbs" fill="#A855F7" name="Carbs (g)" radius={[8, 8, 0, 0]} />
                    <Bar dataKey="fats" fill="hsl(var(--chart-4))" name="Fats (g)" radius={[8, 8, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}
