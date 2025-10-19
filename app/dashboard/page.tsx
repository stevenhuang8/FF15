import { redirect } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import DashboardClient from './dashboard-client'

/**
 * Health & Fitness Dashboard Page
 *
 * Server component that checks authentication and renders the dashboard
 */
export default async function DashboardPage() {
  const supabase = await createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  return <DashboardClient />
}
