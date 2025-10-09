import { createClient } from './server'

/**
 * Server-side helper to get the current authenticated user
 * Use in Server Components, Server Actions, and Route Handlers
 */
export async function getUser() {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser()

    // Don't log "session missing" errors - they're expected when logged out
    if (error && error.status !== 400) {
      console.error('Error getting user:', error)
    }

    return user
  } catch (error) {
    // Silently return null for auth errors
    return null
  }
}

/**
 * Server-side helper to get the current session
 * Use in Server Components, Server Actions, and Route Handlers
 */
export async function getSession() {
  const supabase = await createClient()
  const {
    data: { session },
    error,
  } = await supabase.auth.getSession()

  if (error) {
    console.error('Error getting session:', error)
    return null
  }

  return session
}
