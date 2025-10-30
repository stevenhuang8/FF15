import { getAdminUser } from '@/lib/supabase/admin-auth'
import { redirect } from 'next/navigation'
import { AdminFeedbackClient } from './admin-feedback-client'

export const metadata = {
  title: 'Admin - Feedback Management | Food & Fitness AI',
  description: 'Manage user feedback submissions',
}

export default async function AdminFeedbackPage() {
  const adminUser = await getAdminUser()

  // Redirect if not admin
  if (!adminUser) {
    redirect('/login')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-7xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback Management</h1>
          <p className="text-muted-foreground mt-2">
            View and manage user feedback submissions
          </p>
        </div>

        <AdminFeedbackClient />
      </div>
    </div>
  )
}
