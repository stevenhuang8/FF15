/**
 * Utility functions for grouping data by time periods (weeks, days)
 */

import { format, startOfWeek, endOfWeek, differenceInDays, isSameDay } from 'date-fns'
import { parseLocalDate } from '@/lib/utils'
import type { WeekGroup, DayGroup } from '@/types/history'

/**
 * Groups items by week (Monday - Sunday)
 * Returns weeks in reverse chronological order (most recent first)
 */
export function groupByWeek<T>(
  items: T[],
  dateGetter: (item: T) => string | Date
): WeekGroup<T>[] {
  if (items.length === 0) return []

  // Group items by week
  const weekMap = new Map<string, { start: Date; items: T[] }>()

  items.forEach((item) => {
    const date = new Date(dateGetter(item))
    const weekStart = startOfWeek(date, { weekStartsOn: 1 }) // Monday = 1
    const weekKey = format(weekStart, 'yyyy-MM-dd')

    if (!weekMap.has(weekKey)) {
      weekMap.set(weekKey, { start: weekStart, items: [] })
    }
    weekMap.get(weekKey)!.items.push(item)
  })

  // Convert map to array of WeekGroup objects
  const weekGroups: WeekGroup<T>[] = Array.from(weekMap.entries()).map(
    ([weekKey, { start, items: weekItems }]) => {
      const startDate = start // Use the original Date object
      const endDate = endOfWeek(startDate, { weekStartsOn: 1 })

      return {
        weekKey,
        weekLabel: getWeekLabel(startDate, endDate),
        startDate,
        endDate,
        items: weekItems,
      }
    }
  )

  // Sort by start date descending (most recent first)
  weekGroups.sort((a, b) => b.startDate.getTime() - a.startDate.getTime())

  return weekGroups
}

/**
 * Groups items by day
 * Returns days in reverse chronological order (most recent first)
 */
export function groupByDay<T>(
  items: T[],
  dateGetter: (item: T) => string | Date
): DayGroup<T>[] {
  if (items.length === 0) return []

  // Group items by day
  const dayMap = new Map<string, T[]>()

  items.forEach((item) => {
    const date = new Date(dateGetter(item))
    const dayKey = format(date, 'yyyy-MM-dd')

    if (!dayMap.has(dayKey)) {
      dayMap.set(dayKey, [])
    }
    dayMap.get(dayKey)!.push(item)
  })

  // Convert map to array of DayGroup objects
  const dayGroups: DayGroup<T>[] = Array.from(dayMap.entries()).map(([dayKey, dayItems]) => {
    const date = parseLocalDate(dayKey)

    return {
      dateLabel: getDayLabel(date),
      date,
      items: dayItems,
    }
  })

  // Sort by date descending (most recent first)
  dayGroups.sort((a, b) => b.date.getTime() - a.date.getTime())

  return dayGroups
}

/**
 * Generates a user-friendly label for a week range
 * Examples:
 * - "Jan 8 - Jan 14, 2025" (same month)
 * - "Dec 30, 2024 - Jan 5, 2025" (different months/years)
 * - "Jan 8 - 14, 2025" (same month, abbreviated)
 */
export function getWeekLabel(startDate: Date, endDate: Date): string {
  const now = new Date()
  const isCurrentWeek =
    isSameDay(startOfWeek(now, { weekStartsOn: 1 }), startDate)

  if (isCurrentWeek) {
    return 'This Week'
  }

  const sameMonth = startDate.getMonth() === endDate.getMonth()
  const sameYear = startDate.getFullYear() === endDate.getFullYear()

  if (sameMonth && sameYear) {
    // Same month and year: "Jan 8 - 14, 2025"
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'd, yyyy')}`
  } else if (sameYear) {
    // Different months, same year: "Dec 30 - Jan 5, 2025"
    return `${format(startDate, 'MMM d')} - ${format(endDate, 'MMM d, yyyy')}`
  } else {
    // Different years: "Dec 30, 2024 - Jan 5, 2025"
    return `${format(startDate, 'MMM d, yyyy')} - ${format(endDate, 'MMM d, yyyy')}`
  }
}

/**
 * Generates a user-friendly label for a day
 * Examples:
 * - "Today"
 * - "Yesterday"
 * - "Monday, Jan 8"
 */
export function getDayLabel(date: Date): string {
  const now = new Date()
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate())
  const compareDate = new Date(date.getFullYear(), date.getMonth(), date.getDate())

  const daysDiff = differenceInDays(today, compareDate)

  if (daysDiff === 0) {
    return 'Today'
  } else if (daysDiff === 1) {
    return 'Yesterday'
  } else if (daysDiff < 7) {
    // Within the past week: "Monday, Jan 8"
    return format(date, 'EEEE, MMM d')
  } else {
    // Older: "Monday, Jan 8"
    return format(date, 'EEEE, MMM d')
  }
}

/**
 * Checks if a date is within the current week
 */
export function isCurrentWeek(date: Date): boolean {
  const now = new Date()
  const weekStart = startOfWeek(now, { weekStartsOn: 1 })
  const weekEnd = endOfWeek(now, { weekStartsOn: 1 })
  return date >= weekStart && date <= weekEnd
}

/**
 * Gets the start and end dates for the last N weeks
 */
export function getLastNWeeksRange(weeksBack: number): { startDate: Date; endDate: Date } {
  const now = new Date()
  const endDate = endOfWeek(now, { weekStartsOn: 1 })
  const startDate = new Date(endDate)
  startDate.setDate(startDate.getDate() - weeksBack * 7)

  return { startDate, endDate }
}
