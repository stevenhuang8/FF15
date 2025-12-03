/**
 * Admin Authentication Helper
 */

import { createClient, createServiceClient } from '@/lib/supabase/server'

/**
 * Check if the current user is an admin
 */
export async function isUserAdmin(): Promise<boolean> {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return false
    }

    // Use service client to query admin_users (bypasses RLS)
    const serviceClient = await createServiceClient()
    const { data, error } = await serviceClient
      .from('admin_users')
      .select('user_id')
      .eq('user_id', user.id)
      .single()

    if (error || !data) {
      return false
    }

    return true
  } catch (error) {
    console.error('Error checking admin status:', error)
    return false
  }
}

/**
 * Get admin user or null
 */
export async function getAdminUser() {
  const supabase = await createClient()

  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return null
  }

  const isAdmin = await isUserAdmin()

  return isAdmin ? user : null
}
