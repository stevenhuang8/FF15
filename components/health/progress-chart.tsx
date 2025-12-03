'use client'

/**
 * ProgressChart Component
 *
 * Interactive charts for visualizing health and fitness progress:
 * - Weight trends over time
 * - Calorie intake/burn trends
 * - Workout frequency
 * - Body measurements
 */

import { useMemo } from 'react'
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { parseLocalDate, formatWeekRange } from '@/lib/utils'

// ============================================================================
// Component Types
// ============================================================================

export type ChartDataPoint = {
  date: string
  value: number | null
  label?: string
}

export type MultiSeriesDataPoint = {
  date: string
  [key: string]: string | number | null
}

interface ProgressChartProps {
  title: string
  description?: string
  data: ChartDataPoint[] | MultiSeriesDataPoint[]
  type?: 'line' | 'area' | 'bar'
  dataKey?: string
  seriesConfig?: {
    key: string
    name: string
    color: string
  }[]
  yAxisLabel?: string
  height?: number
  showLegend?: boolean
  onDataPointClick?: (dataPoint: ChartDataPoint | MultiSeriesDataPoint) => void
  isWeeklyData?: boolean // Flag to format dates as week ranges
}

interface MultiChartProps {
  weightData?: ChartDataPoint[]
  calorieData?: MultiSeriesDataPoint[]
  workoutData?: ChartDataPoint[]
  measurementsData?: MultiSeriesDataPoint[]
  onWeightDataPointClick?: (dataPoint: ChartDataPoint) => void
}

// ============================================================================
// Custom Tooltip Component
// ============================================================================

const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="rounded-lg border bg-background p-3 shadow-md">
      <p className="text-sm font-medium mb-2">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium">{entry.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

const BarChartTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload || !payload.length) return null

  return (
    <div className="rounded-lg border border-border bg-card p-3 shadow-lg">
      <p className="text-sm font-medium mb-2 text-foreground">{label}</p>
      {payload.map((entry: any, index: number) => (
        <div key={index} className="flex items-center gap-2 text-sm">
          <div
            className="w-3 h-3 rounded-full"
            style={{ backgroundColor: entry.color }}
          />
          <span className="text-muted-foreground">{entry.name}:</span>
          <span className="font-medium text-foreground">{entry.value?.toFixed(1)}</span>
        </div>
      ))}
    </div>
  )
}

// ============================================================================
// Single Chart Component
// ============================================================================

export function ProgressChart({
  title,
  description,
  data,
  type = 'line',
  dataKey = 'value',
  seriesConfig,
  yAxisLabel,
  height = 300,
  showLegend = true,
  onDataPointClick,
  isWeeklyData = false,
}: ProgressChartProps) {
  // Format date for display
  const formattedData = useMemo(() => {
    return data.map((point) => ({
      ...point,
      date: isWeeklyData
        ? formatWeekRange(point.date) // Format as week range (e.g., "Nov 25 - Dec 1")
        : parseLocalDate(point.date).toLocaleDateString('en-US', {
            month: 'short',
            day: 'numeric',
          }),
    }))
  }, [data, isWeeklyData])

  // Handle datapoint clicks
  const handleDotClick = (clickData: any) => {
    if (!onDataPointClick) return

    // Find the original data point (with full ISO date)
    const clickedFormattedDate = clickData.payload.date
    const originalPoint = data.find((point) => {
      const formattedDate = parseLocalDate(point.date).toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      })
      return formattedDate === clickedFormattedDate
    })

    if (originalPoint) {
      onDataPointClick(originalPoint)
    }
  }

  const renderChart = () => {
    const commonProps = {
      data: formattedData,
      margin: { top: 5, right: 30, left: 20, bottom: 5 },
    }

    const chartColor = '#A855F7' // Purple from schema (oklch(0.70 0.22 290))

    switch (type) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={chartColor} stopOpacity={0.8} />
                <stop offset="95%" stopColor={chartColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              label={
                yAxisLabel
                  ? { value: yAxisLabel, angle: -90, position: 'insideLeft' }
                  : undefined
              }
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {seriesConfig ? (
              seriesConfig.map((series) => (
                <Area
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.name}
                  stroke={series.color}
                  fillOpacity={1}
                  fill={`url(#color${series.key})`}
                />
              ))
            ) : (
              <Area
                type="monotone"
                dataKey={dataKey}
                stroke={chartColor}
                fillOpacity={1}
                fill="url(#colorValue)"
              />
            )}
          </AreaChart>
        )

      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              label={
                yAxisLabel
                  ? { value: yAxisLabel, angle: -90, position: 'insideLeft' }
                  : undefined
              }
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<BarChartTooltip />} />
            {showLegend && <Legend />}
            {seriesConfig ? (
              seriesConfig.map((series) => (
                <Bar
                  key={series.key}
                  dataKey={series.key}
                  name={series.name}
                  fill={series.color}
                />
              ))
            ) : (
              <Bar dataKey={dataKey} fill={chartColor} />
            )}
          </BarChart>
        )

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
            <XAxis
              dataKey="date"
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <YAxis
              label={
                yAxisLabel
                  ? { value: yAxisLabel, angle: -90, position: 'insideLeft' }
                  : undefined
              }
              className="text-xs"
              tick={{ fill: 'hsl(var(--muted-foreground))' }}
            />
            <Tooltip content={<CustomTooltip />} />
            {showLegend && <Legend />}
            {seriesConfig ? (
              seriesConfig.map((series) => (
                <Line
                  key={series.key}
                  type="monotone"
                  dataKey={series.key}
                  name={series.name}
                  stroke={series.color}
                  strokeWidth={2}
                  dot={onDataPointClick ? { r: 4, cursor: 'pointer', onClick: handleDotClick } : { r: 4 }}
                  activeDot={{ r: 6 }}
                />
              ))
            ) : (
              <Line
                type="monotone"
                dataKey={dataKey}
                stroke={chartColor}
                strokeWidth={2}
                dot={onDataPointClick ? { r: 4, cursor: 'pointer', onClick: handleDotClick } : { r: 4 }}
                activeDot={{ r: 6 }}
              />
            )}
          </LineChart>
        )
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <ResponsiveContainer width="100%" height={height}>
          {renderChart()}
        </ResponsiveContainer>
      </CardContent>
    </Card>
  )
}

// ============================================================================
// Multi-Chart Dashboard Component
// ============================================================================

export function ProgressChartDashboard({
  weightData = [],
  calorieData = [],
  workoutData = [],
  measurementsData = [],
  onWeightDataPointClick,
}: MultiChartProps) {
  return (
    <Tabs defaultValue="weight" className="w-full">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="weight">Weight</TabsTrigger>
        <TabsTrigger value="calories">Calories</TabsTrigger>
        <TabsTrigger value="workouts">Workouts</TabsTrigger>
        <TabsTrigger value="measurements">Measurements</TabsTrigger>
      </TabsList>

      <TabsContent value="weight" className="space-y-4">
        {weightData.length > 0 ? (
          <ProgressChart
            title="Weight Trend"
            description="Your weight over time"
            data={weightData}
            type="line"
            yAxisLabel="Weight (lbs)"
            height={400}
            onDataPointClick={onWeightDataPointClick as ((dataPoint: ChartDataPoint | MultiSeriesDataPoint) => void) | undefined}
          />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-[400px]">
              <p className="text-muted-foreground">
                No weight data available. Start logging your health metrics!
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="calories" className="space-y-4">
        {calorieData.length > 0 ? (
          <ProgressChart
            title="Calorie Tracking"
            description="Daily calories consumed vs. burned"
            data={calorieData}
            type="bar"
            seriesConfig={[
              { key: 'consumed', name: 'Consumed', color: '#8884d8' },
              { key: 'burned', name: 'Burned', color: '#82ca9d' },
              { key: 'net', name: 'Net', color: '#ffc658' },
            ]}
            yAxisLabel="Calories"
            height={400}
          />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-[400px]">
              <p className="text-muted-foreground">
                No calorie data available. Start tracking your meals and workouts!
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="workouts" className="space-y-4">
        {workoutData.length > 0 ? (
          <ProgressChart
            title="Workout Frequency"
            description="Number of workouts per week (Monday-Sunday)"
            data={workoutData}
            type="bar"
            yAxisLabel="Workouts"
            height={400}
            isWeeklyData={true}
          />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-[400px]">
              <p className="text-muted-foreground">
                No workout data available. Start logging your workouts!
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>

      <TabsContent value="measurements" className="space-y-4">
        {measurementsData.length > 0 ? (
          <ProgressChart
            title="Body Measurements"
            description="Track changes in body measurements over time"
            data={measurementsData}
            type="line"
            seriesConfig={[
              { key: 'waist', name: 'Waist', color: '#8884d8' },
              { key: 'chest', name: 'Chest', color: '#82ca9d' },
              { key: 'hips', name: 'Hips', color: '#ffc658' },
              { key: 'arms', name: 'Arms', color: '#ff7c7c' },
              { key: 'thighs', name: 'Thighs', color: '#a78bfa' },
            ]}
            yAxisLabel="Inches"
            height={400}
          />
        ) : (
          <Card>
            <CardContent className="flex items-center justify-center h-[400px]">
              <p className="text-muted-foreground">
                No measurement data available. Start logging your body measurements!
              </p>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  )
}
