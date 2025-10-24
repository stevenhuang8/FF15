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
