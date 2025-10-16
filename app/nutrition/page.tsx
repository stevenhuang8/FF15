import { redirect } from 'next/navigation'
import { getUser } from '@/lib/supabase/auth-server'
import { NutritionPageClient } from './nutrition-page-client'

export const metadata = {
  title: 'Nutrition | Food & Fitness AI',
  description: 'Track your nutrition and manage your meals',
}

export default async function NutritionPage() {
  const user = await getUser()

  if (!user) {
    redirect('/login')
  }

  return <NutritionPageClient />
}
