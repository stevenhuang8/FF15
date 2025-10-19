/**
 * Data Export Utilities
 *
 * Functions for exporting health and fitness data in various formats
 */

import type { Tables } from '@/types/supabase'

type HealthMetric = Tables<'health_metrics'>
type FitnessGoal = Tables<'fitness_goals'>
type ProgressSnapshot = Tables<'progress_snapshots'>

// ============================================================================
// CSV Export
// ============================================================================

/**
 * Convert data to CSV format
 */
function convertToCSV(headers: string[], rows: any[][]): string {
  const csvRows = [
    headers.join(','),
    ...rows.map((row) => row.map((cell) => `"${cell ?? ''}"`).join(',')),
  ]
  return csvRows.join('\n')
}

/**
 * Trigger file download
 */
function downloadFile(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}

// ============================================================================
// Health Metrics Export
// ============================================================================

export function exportHealthMetricsCSV(metrics: HealthMetric[]) {
  const headers = [
    'Date',
    'Weight (lbs)',
    'Body Fat %',
    'Waist (in)',
    'Chest (in)',
    'Hips (in)',
    'Arms (in)',
    'Thighs (in)',
    'Notes',
  ]

  const rows = metrics.map((m) => [
    m.date,
    m.weight,
    m.body_fat_percentage,
    m.waist,
    m.chest,
    m.hips,
    m.arms,
    m.thighs,
    m.notes || '',
  ])

  const csv = convertToCSV(headers, rows)
  const filename = `health-metrics-${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(csv, filename, 'text/csv')
}

// ============================================================================
// Fitness Goals Export
// ============================================================================

export function exportFitnessGoalsCSV(goals: FitnessGoal[]) {
  const headers = [
    'Goal Type',
    'Target Value',
    'Current Value',
    'Unit',
    'Target Date',
    'Status',
    'Created At',
  ]

  const rows = goals.map((g) => [
    g.goal_type,
    g.target_value,
    g.current_value,
    g.unit,
    g.target_date || '',
    g.status,
    g.created_at,
  ])

  const csv = convertToCSV(headers, rows)
  const filename = `fitness-goals-${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(csv, filename, 'text/csv')
}

// ============================================================================
// Progress Snapshots Export
// ============================================================================

export function exportProgressSnapshotsCSV(snapshots: ProgressSnapshot[]) {
  const headers = [
    'Date',
    'Weight (lbs)',
    'Body Fat %',
    'Workouts This Week',
    'Avg Calories/Day',
    'Avg Protein/Day',
    'Notes',
  ]

  const rows = snapshots.map((s) => [
    s.date,
    s.weight,
    s.body_fat_percentage,
    s.total_workouts_this_week,
    s.avg_calories_per_day,
    s.avg_protein_per_day,
    s.notes || '',
  ])

  const csv = convertToCSV(headers, rows)
  const filename = `progress-snapshots-${new Date().toISOString().split('T')[0]}.csv`
  downloadFile(csv, filename, 'text/csv')
}

// ============================================================================
// Complete Data Export
// ============================================================================

export interface ExportData {
  healthMetrics?: HealthMetric[]
  fitnessGoals?: FitnessGoal[]
  progressSnapshots?: ProgressSnapshot[]
}

/**
 * Export all data as JSON
 */
export function exportAllDataJSON(data: ExportData) {
  const jsonContent = JSON.stringify(data, null, 2)
  const filename = `health-fitness-data-${new Date().toISOString().split('T')[0]}.json`
  downloadFile(jsonContent, filename, 'application/json')
}

/**
 * Export all data as separate CSV files (zipped)
 */
export async function exportAllDataCSV(data: ExportData) {
  if (data.healthMetrics && data.healthMetrics.length > 0) {
    exportHealthMetricsCSV(data.healthMetrics)
  }

  // Add small delay between downloads
  await new Promise((resolve) => setTimeout(resolve, 500))

  if (data.fitnessGoals && data.fitnessGoals.length > 0) {
    exportFitnessGoalsCSV(data.fitnessGoals)
  }

  await new Promise((resolve) => setTimeout(resolve, 500))

  if (data.progressSnapshots && data.progressSnapshots.length > 0) {
    exportProgressSnapshotsCSV(data.progressSnapshots)
  }
}

// ============================================================================
// PDF Export (text-based summary)
// ============================================================================

export function generateProgressSummary(data: ExportData): string {
  const sections: string[] = []

  // Header
  sections.push('HEALTH & FITNESS PROGRESS REPORT')
  sections.push(`Generated: ${new Date().toLocaleString()}`)
  sections.push('\n' + '='.repeat(60) + '\n')

  // Health Metrics Summary
  if (data.healthMetrics && data.healthMetrics.length > 0) {
    sections.push('HEALTH METRICS SUMMARY')
    sections.push('-'.repeat(60))

    const latest = data.healthMetrics[0]
    const oldest = data.healthMetrics[data.healthMetrics.length - 1]

    sections.push(`Latest Weight: ${latest.weight || 'N/A'} lbs (${latest.date})`)
    sections.push(`Starting Weight: ${oldest.weight || 'N/A'} lbs (${oldest.date})`)

    if (latest.weight && oldest.weight) {
      const change = latest.weight - oldest.weight
      sections.push(`Total Change: ${change > 0 ? '+' : ''}${change.toFixed(1)} lbs`)
    }

    if (latest.body_fat_percentage) {
      sections.push(`Current Body Fat: ${latest.body_fat_percentage}%`)
    }

    sections.push('\n')
  }

  // Fitness Goals Summary
  if (data.fitnessGoals && data.fitnessGoals.length > 0) {
    sections.push('FITNESS GOALS')
    sections.push('-'.repeat(60))

    const activeGoals = data.fitnessGoals.filter((g) => g.status === 'active')
    const achievedGoals = data.fitnessGoals.filter((g) => g.status === 'achieved')

    sections.push(`Active Goals: ${activeGoals.length}`)
    sections.push(`Achieved Goals: ${achievedGoals.length}`)

    if (activeGoals.length > 0) {
      sections.push('\nActive Goals:')
      activeGoals.forEach((goal) => {
        sections.push(
          `  - ${goal.goal_type}: ${goal.current_value || 'N/A'}/${goal.target_value} ${goal.unit}`
        )
      })
    }

    sections.push('\n')
  }

  // Progress Snapshots Summary
  if (data.progressSnapshots && data.progressSnapshots.length > 0) {
    sections.push('WEEKLY PROGRESS SNAPSHOTS')
    sections.push('-'.repeat(60))

    const totalWorkouts = data.progressSnapshots.reduce(
      (sum, s) => sum + (s.total_workouts_this_week || 0),
      0
    )
    const avgWorkoutsPerWeek = totalWorkouts / data.progressSnapshots.length

    sections.push(`Total Weeks Tracked: ${data.progressSnapshots.length}`)
    sections.push(`Average Workouts/Week: ${avgWorkoutsPerWeek.toFixed(1)}`)

    const latestSnapshot = data.progressSnapshots[0]
    if (latestSnapshot.avg_calories_per_day) {
      sections.push(`Recent Avg Calories: ${latestSnapshot.avg_calories_per_day}/day`)
    }

    sections.push('\n')
  }

  sections.push('='.repeat(60))
  sections.push('\nEnd of Report')

  return sections.join('\n')
}

/**
 * Export progress summary as text file
 */
export function exportProgressSummary(data: ExportData) {
  const summary = generateProgressSummary(data)
  const filename = `progress-summary-${new Date().toISOString().split('T')[0]}.txt`
  downloadFile(summary, filename, 'text/plain')
}
