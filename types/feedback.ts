/**
 * Feedback type definitions
 */

export type FeedbackType = 'bug' | 'feature' | 'complaint' | 'general'
export type FeedbackStatus = 'pending' | 'reviewed' | 'resolved' | 'closed'

export interface Feedback {
  id: string
  user_id: string
  feedback_type: FeedbackType
  description: string
  email: string | null
  attachment_url: string | null
  attachment_path: string | null
  status: FeedbackStatus
  created_at: string
  updated_at: string
  // Optional fields from joined admin_users table
  user_name?: string | null
  user_email?: string | null
}

export interface FeedbackInsert {
  user_id: string
  feedback_type: FeedbackType
  description: string
  email?: string | null
  attachment_url?: string | null
  attachment_path?: string | null
  status?: FeedbackStatus
}

export interface FeedbackUpdate {
  feedback_type?: FeedbackType
  description?: string
  email?: string | null
  attachment_url?: string | null
  attachment_path?: string | null
  status?: FeedbackStatus
  updated_at?: string
}
