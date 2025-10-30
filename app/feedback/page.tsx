import { FeedbackHistory } from '@/components/feedback/feedback-history'
import { getUser } from '@/lib/supabase/auth-server'
import { redirect } from 'next/navigation'

export const metadata = {
  title: 'Feedback History | Food & Fitness AI',
  description: 'View your feedback submission history and track status updates',
}

export default async function FeedbackPage() {
  const user = await getUser()

  // Redirect to login if not authenticated
  if (!user) {
    redirect('/login?redirect=/feedback')
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-4xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold">Feedback History</h1>
          <p className="text-muted-foreground mt-2">
            Track your feedback submissions and see status updates
          </p>
        </div>

        <FeedbackHistory />
      </div>
    </div>
  )
}
