'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Separator } from '@/components/ui/separator'
import { AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import type { Feedback } from '@/types/feedback'

export function FeedbackHistory() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    fetchFeedbackHistory()
  }, [])

  const fetchFeedbackHistory = async () => {
    try {
      setIsLoading(true)
      const response = await fetch('/api/feedback')

      if (!response.ok) {
        if (response.status === 401) {
          setError('Please log in to view your feedback history')
          return
        }
        throw new Error('Failed to fetch feedback history')
      }

      const data = await response.json()
      setFeedbackList(data.feedback || [])
    } catch (err) {
      console.error('Error fetching feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to load feedback history')
    } finally {
      setIsLoading(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'reviewed':
        return <AlertCircle className="h-4 w-4" />
      case 'resolved':
        return <CheckCircle className="h-4 w-4" />
      case 'closed':
        return <XCircle className="h-4 w-4" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'default'
      case 'reviewed':
        return 'secondary'
      case 'resolved':
        return 'default' // Will use green styling
      case 'closed':
        return 'outline'
      default:
        return 'default'
    }
  }

  const getFeedbackTypeLabel = (type: string) => {
    switch (type) {
      case 'bug':
        return 'Bug Report'
      case 'feature':
        return 'Feature Request'
      case 'complaint':
        return 'Complaint'
      case 'general':
        return 'General Feedback'
      default:
        return type
    }
  }

  const formatDate = (dateString: string) => {
    const date = new Date(dateString)
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(date)
  }

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feedback History</CardTitle>
          <CardDescription>Loading your feedback submissions...</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feedback History</CardTitle>
          <CardDescription>Unable to load feedback history</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2 text-destructive py-4">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (feedbackList.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Feedback History</CardTitle>
          <CardDescription>Your feedback submissions will appear here</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            <p>You haven't submitted any feedback yet.</p>
            <p className="text-sm mt-2">Click the help button to submit your first feedback!</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Feedback History</CardTitle>
        <CardDescription>
          View and track your feedback submissions ({feedbackList.length} total)
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {feedbackList.map((feedback, index) => (
            <div key={feedback.id}>
              {index > 0 && <Separator className="my-4" />}
              <div className="space-y-2">
                {/* Header with type and status */}
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{getFeedbackTypeLabel(feedback.feedback_type)}</Badge>
                    <Badge
                      variant={getStatusColor(feedback.status) as any}
                      className={
                        feedback.status === 'resolved'
                          ? 'bg-green-500/10 text-green-700 dark:text-green-400'
                          : ''
                      }
                    >
                      <span className="flex items-center gap-1">
                        {getStatusIcon(feedback.status)}
                        {feedback.status.charAt(0).toUpperCase() + feedback.status.slice(1)}
                      </span>
                    </Badge>
                  </div>
                  <span className="text-xs text-muted-foreground">
                    {formatDate(feedback.created_at)}
                  </span>
                </div>

                {/* Description */}
                <p className="text-sm text-foreground line-clamp-3">{feedback.description}</p>

                {/* Attachment indicator */}
                {feedback.attachment_url && (
                  <div className="flex items-center gap-1 text-xs text-muted-foreground">
                    <svg
                      xmlns="http://www.w3.org/2000/svg"
                      width="12"
                      height="12"
                      viewBox="0 0 24 24"
                      fill="none"
                      stroke="currentColor"
                      strokeWidth="2"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    >
                      <path d="m21.44 11.05-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48" />
                    </svg>
                    <span>Has attachment</span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
