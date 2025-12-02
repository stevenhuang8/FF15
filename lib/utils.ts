import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// ============================================================================
// Date Utilities - User's Local Timezone
// ============================================================================

/**
 * Format date to user's local timezone string (e.g., "Oct 20, 2025")
 * Uses browser's default locale for internationalization
 */
export function formatLocalDate(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return ''

  const d = typeof date === 'string' ? new Date(date) : date

  return d.toLocaleDateString(undefined, {
    ...options,
  })
}

/**
 * Format time to user's local timezone string (e.g., "3:45 PM")
 * Uses browser's default locale for internationalization
 */
export function formatLocalTime(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return ''

  const d = typeof date === 'string' ? new Date(date) : date

  return d.toLocaleTimeString(undefined, {
    ...options,
  })
}

/**
 * Format date and time to user's local timezone string
 * Uses browser's default locale for internationalization
 */
export function formatLocalDateTime(
  date: Date | string | null | undefined,
  options: Intl.DateTimeFormatOptions = {}
): string {
  if (!date) return ''

  const d = typeof date === 'string' ? new Date(date) : date

  return d.toLocaleString(undefined, {
    ...options,
  })
}

/**
 * Get today's date in user's local timezone as YYYY-MM-DD string
 * Useful for date inputs and database queries
 *
 * This properly handles the local date, not UTC date
 */
export function getTodayLocal(): string {
  const now = new Date()
  const year = now.getFullYear()
  const month = String(now.getMonth() + 1).padStart(2, '0')
  const day = String(now.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Convert a Date object to YYYY-MM-DD string in local timezone
 * This ensures the date string matches what the user sees, not UTC
 */
export function formatDateForDB(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')

  return `${year}-${month}-${day}`
}

/**
 * Parse a YYYY-MM-DD date string as a local date (not UTC)
 *
 * IMPORTANT: Using `new Date("2025-10-22")` interprets the date as UTC midnight,
 * which can cause timezone shift issues. This function parses the date string
 * as midnight in the user's LOCAL timezone instead.
 *
 * @param dateString - Date string in YYYY-MM-DD format (e.g., "2025-10-22")
 * @returns Date object representing midnight in local timezone
 *
 * @example
 * // Without this function (WRONG - UTC interpretation):
 * new Date("2025-10-22") // Oct 22 00:00:00 UTC -> Oct 21 17:00:00 PDT
 *
 * // With this function (CORRECT - local interpretation):
 * parseLocalDate("2025-10-22") // Oct 22 00:00:00 PDT
 */
export function parseLocalDate(dateString: string): Date {
  // Parse YYYY-MM-DD format manually to create local date
  const [year, month, day] = dateString.split('-').map(Number)

  // Create date at midnight in local timezone
  // Note: month is 0-indexed in Date constructor
  return new Date(year, month - 1, day, 0, 0, 0, 0)
}

// Legacy aliases for backward compatibility
export const formatPacificDate = formatLocalDate
export const formatPacificTime = formatLocalTime
export const formatPacificDateTime = formatLocalDateTime
export const getTodayPacific = getTodayLocal

// ============================================================================
// UUID Validation
// ============================================================================

/**
 * Validates if a string is a valid UUID (v4 format)
 *
 * UUID format: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx
 * Example: 550e8400-e29b-41d4-a716-446655440000
 *
 * @param value - String to validate
 * @returns true if valid UUID format, false otherwise
 *
 * @example
 * isValidUUID("550e8400-e29b-41d4-a716-446655440000") // true
 * isValidUUID("60wJjDLnJqNTzr2v") // false (client-side generated ID)
 * isValidUUID(null) // false
 * isValidUUID(undefined) // false
 */
export function isValidUUID(value: string | undefined | null): boolean {
  if (!value) return false

  // UUID v4 format: 8-4-4-4-12 hexadecimal characters separated by hyphens
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

  return uuidRegex.test(value)
}

// ============================================================================
// Natural Language Date Parsing
// ============================================================================

/**
 * Parses natural language date strings into Date objects
 * Supports relative dates (today, yesterday, X days ago) and day names (Monday, Tuesday, etc.)
 *
 * @param dateString - Natural language date string
 * @returns Date object or null if parsing fails
 *
 * @example
 * parseNaturalDate("today") // Today's date
 * parseNaturalDate("yesterday") // Yesterday's date
 * parseNaturalDate("2 days ago") // 2 days before today
 * parseNaturalDate("Monday") // Most recent Monday (including today if today is Monday)
 * parseNaturalDate("Nov 23") // November 23 of current year
 * parseNaturalDate("2025-11-23") // ISO date format
 */
export function parseNaturalDate(dateString: string): Date | null {
  if (!dateString) return null

  const normalized = dateString.toLowerCase().trim()
  const now = new Date()

  // Set to start of day (midnight local time)
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Handle "today"
  if (normalized === 'today') {
    return startOfToday
  }

  // Handle "yesterday"
  if (normalized === 'yesterday') {
    const yesterday = new Date(startOfToday)
    yesterday.setDate(yesterday.getDate() - 1)
    return yesterday
  }

  // Handle "X days ago" (e.g., "2 days ago", "3 days ago")
  const daysAgoMatch = normalized.match(/^(\d+)\s+days?\s+ago$/)
  if (daysAgoMatch) {
    const daysAgo = parseInt(daysAgoMatch[1], 10)
    const date = new Date(startOfToday)
    date.setDate(date.getDate() - daysAgo)
    return date
  }

  // Handle day names (Monday, Tuesday, etc.)
  const dayNames = ['sunday', 'monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday']
  const dayIndex = dayNames.indexOf(normalized)
  if (dayIndex !== -1) {
    const result = new Date(startOfToday)
    const currentDay = result.getDay()
    const daysToSubtract = currentDay >= dayIndex ? currentDay - dayIndex : 7 - (dayIndex - currentDay)
    result.setDate(result.getDate() - daysToSubtract)
    return result
  }

  // Handle "Nov 23" or "November 23" format
  const monthDayMatch = normalized.match(/^([a-z]+)\s+(\d{1,2})(?:st|nd|rd|th)?$/)
  if (monthDayMatch) {
    const monthNames = [
      'january', 'february', 'march', 'april', 'may', 'june',
      'july', 'august', 'september', 'october', 'november', 'december'
    ]
    const monthAbbreviations = ['jan', 'feb', 'mar', 'apr', 'may', 'jun', 'jul', 'aug', 'sep', 'oct', 'nov', 'dec']

    const monthString = monthDayMatch[1]
    const day = parseInt(monthDayMatch[2], 10)

    let monthIndex = monthNames.indexOf(monthString)
    if (monthIndex === -1) {
      monthIndex = monthAbbreviations.indexOf(monthString)
    }

    if (monthIndex !== -1 && day >= 1 && day <= 31) {
      const year = now.getFullYear()
      return new Date(year, monthIndex, day)
    }
  }

  // Handle ISO date format (YYYY-MM-DD)
  const isoMatch = dateString.match(/^(\d{4})-(\d{2})-(\d{2})$/)
  if (isoMatch) {
    return parseLocalDate(dateString)
  }

  // Handle MM/DD/YYYY format
  const usDateMatch = dateString.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/)
  if (usDateMatch) {
    const month = parseInt(usDateMatch[1], 10) - 1
    const day = parseInt(usDateMatch[2], 10)
    const year = parseInt(usDateMatch[3], 10)
    return new Date(year, month, day)
  }

  // If nothing matches, return null
  return null
}

/**
 * Validates a date for workout logging
 * Ensures date is not in the future and not too far in the past
 *
 * @param date - Date to validate
 * @param maxDaysInPast - Maximum number of days in the past allowed (default: 365)
 * @returns Validation result with success flag and error message
 */
export function validateWorkoutDate(
  date: Date,
  maxDaysInPast: number = 365
): { valid: boolean; error?: string } {
  const now = new Date()
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate())

  // Check if date is in the future
  if (date > startOfToday) {
    return {
      valid: false,
      error: "Workout date cannot be in the future. You can't log workouts that haven't happened yet!"
    }
  }

  // Check if date is too far in the past
  const maxPastDate = new Date(startOfToday)
  maxPastDate.setDate(maxPastDate.getDate() - maxDaysInPast)

  if (date < maxPastDate) {
    return {
      valid: false,
      error: `Workout date cannot be more than ${maxDaysInPast} days in the past.`
    }
  }

  return { valid: true }
}
