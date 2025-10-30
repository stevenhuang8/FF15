'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Button } from '@/components/ui/button'
import { AlertCircle } from 'lucide-react'
import type { Feedback } from '@/types/feedback'

export function AdminFeedbackClient() {
  const [feedbackList, setFeedbackList] = useState<Feedback[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [statusFilter, setStatusFilter] = useState('all')
  const [typeFilter, setTypeFilter] = useState('all')

  useEffect(() => {
    fetchFeedback()
  }, [statusFilter, typeFilter])

  const fetchFeedback = async () => {
    try {
      setIsLoading(true)
      const params = new URLSearchParams()
      if (statusFilter !== 'all') params.append('status', statusFilter)
      if (typeFilter !== 'all') params.append('type', typeFilter)

      const response = await fetch(`/api/admin/feedback?${params}`)

      if (!response.ok) {
        throw new Error('Failed to fetch feedback')
      }

      const data = await response.json()
      setFeedbackList(data.feedback || [])
    } catch (err) {
      console.error('Error fetching feedback:', err)
      setError(err instanceof Error ? err.message : 'Failed to load feedback')
    } finally {
      setIsLoading(false)
    }
  }

  const updateStatus = async (id: string, newStatus: string) => {
    try {
      const response = await fetch('/api/admin/feedback', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status: newStatus }),
      })

      if (!response.ok) {
        throw new Error('Failed to update status')
      }

      // Refresh feedback list
      fetchFeedback()
    } catch (err) {
      console.error('Error updating status:', err)
      alert('Failed to update status')
    }
  }

  const getTypeLabel = (type: string) => {
    const labels: Record<string, string> = {
      bug: 'Bug Report',
      feature: 'Feature Request',
      complaint: 'Complaint',
      general: 'General Feedback',
    }
    return labels[type] || type
  }

  const formatDate = (dateString: string) => {
    return new Intl.DateTimeFormat('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    }).format(new Date(dateString))
  }

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center justify-center">
            <div className="animate-pulse text-muted-foreground">Loading...</div>
          </div>
        </CardContent>
      </Card>
    )
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="flex items-center gap-2 text-destructive">
            <AlertCircle className="h-5 w-5" />
            <p>{error}</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="space-y-4">
      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle>Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-4 flex-wrap">
            <div>
              <label className="text-sm font-medium mb-2 block">Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="resolved">Resolved</SelectItem>
                  <SelectItem value="closed">Closed</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium mb-2 block">Type</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger className="w-[180px]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All</SelectItem>
                  <SelectItem value="bug">Bug Report</SelectItem>
                  <SelectItem value="feature">Feature Request</SelectItem>
                  <SelectItem value="complaint">Complaint</SelectItem>
                  <SelectItem value="general">General</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="flex items-end">
              <Button variant="outline" onClick={() => fetchFeedback()}>
                Refresh
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Feedback List */}
      <Card>
        <CardHeader>
          <CardTitle>Feedback List ({feedbackList.length})</CardTitle>
        </CardHeader>
        <CardContent>
          {feedbackList.length === 0 ? (
            <p className="text-center py-8 text-muted-foreground">No feedback found</p>
          ) : (
            <div className="space-y-4">
              {feedbackList.map((feedback) => (
                <Card key={feedback.id}>
                  <CardContent className="pt-6">
                    <div className="space-y-3">
                      {/* Header */}
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{getTypeLabel(feedback.feedback_type)}</Badge>
                            <span className="text-xs text-muted-foreground">
                              {formatDate(feedback.created_at)}
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground">
                            User: {feedback.user_name || `${feedback.user_id.slice(0, 8)}...`}
                          </p>
                          {(feedback.user_email || feedback.email) && (
                            <p className="text-sm text-muted-foreground">
                              Email: {feedback.user_email || feedback.email}
                            </p>
                          )}
                        </div>

                        {/* Status Updater */}
                        <Select
                          value={feedback.status}
                          onValueChange={(newStatus) => updateStatus(feedback.id, newStatus)}
                        >
                          <SelectTrigger className="w-[140px]">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="pending">Pending</SelectItem>
                            <SelectItem value="reviewed">Reviewed</SelectItem>
                            <SelectItem value="resolved">Resolved</SelectItem>
                            <SelectItem value="closed">Closed</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Description */}
                      <p className="text-sm">{feedback.description}</p>

                      {/* Attachment */}
                      {feedback.attachment_url && (
                        <div>
                          <a
                            href={feedback.attachment_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline"
                          >
                            View Attachment →
                          </a>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
