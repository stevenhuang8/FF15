import { createClient } from './client'

/**
 * Client-side auth helpers for use in Client Components
 * For server-side helpers, import from @/lib/supabase/auth-server
 */

/**
 * Client-side helper to sign out
 * Use in Client Components
 */
export async function signOut() {
  const supabase = createClient()
  const { error } = await supabase.auth.signOut()

  if (error) {
    console.error('Error signing out:', error)
    throw error
  }
}

/**
 * Client-side helper to sign in with email and password
 * Use in Client Components
 */
export async function signInWithPassword(email: string, password: string) {
  const supabase = createClient()
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    console.error('Error signing in:', error)
    throw error
  }

  return data
}

/**
 * Client-side helper to sign up with email and password
 * Use in Client Components
 */
export async function signUpWithPassword(email: string, password: string) {
  const supabase = createClient()

  // Use environment variable for production, fallback to window location for dev
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      emailRedirectTo: `${baseUrl}/auth/callback`,
    },
  })

  if (error) {
    console.error('Error signing up:', error)
    throw error
  }

  return data
}

/**
 * Client-side helper to reset password
 * Use in Client Components
 */
export async function resetPassword(email: string) {
  const supabase = createClient()

  // Use environment variable for production, fallback to window location for dev
  const baseUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${baseUrl}/auth/callback`,
  })

  if (error) {
    console.error('Error resetting password:', error)
    throw error
  }
}

/**
 * Client-side helper to update password
 * Use in Client Components (typically on password reset page)
 */
export async function updatePassword(newPassword: string) {
  const supabase = createClient()
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  })

  if (error) {
    console.error('Error updating password:', error)
    throw error
  }
}
