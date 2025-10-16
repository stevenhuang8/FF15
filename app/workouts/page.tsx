import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/auth-server'
import { WorkoutsPageClient } from './workouts-page-client'

export const metadata = {
  title: 'Workouts | Food & Fitness AI',
  description: 'Manage your workout plans and track your fitness progress',
}

export default async function WorkoutsPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return <WorkoutsPageClient />
}
