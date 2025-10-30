/**
 * Supabase Feedback Database Operations
 */

import { createClient } from '@/lib/supabase/client'
import type { Feedback, FeedbackInsert, FeedbackUpdate } from '@/types/feedback'

export type { Feedback }

/**
 * Submit new feedback (requires authentication)
 */
export async function submitFeedback(
  data: FeedbackInsert
): Promise<{ data: Feedback | null; error: any }> {
  const supabase = createClient()

  // Get the current user (required)
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser()

  if (authError || !user) {
    return { data: null, error: authError || new Error('Not authenticated') }
  }

  const feedbackData: FeedbackInsert = {
    ...data,
    user_id: user.id,
    status: 'pending',
  }

  const { data: feedback, error } = await supabase
    .from('feedback')
    .insert(feedbackData)
    .select()
    .single()

  return { data: feedback, error }
}

/**
 * Get all feedback for the current user
 */
export async function getUserFeedback(): Promise<{
  data: Feedback[] | null
  error: any
}> {
  const supabase = createClient()

  // Get the current user
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    return { data: null, error: userError || new Error('Not authenticated') }
  }

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })

  return { data, error }
}

/**
 * Get a single feedback item by ID
 */
export async function getFeedback(
  feedbackId: string
): Promise<{ data: Feedback | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('feedback')
    .select('*')
    .eq('id', feedbackId)
    .single()

  return { data, error }
}

/**
 * Update feedback status (admin only in future)
 */
export async function updateFeedbackStatus(
  feedbackId: string,
  status: FeedbackUpdate['status']
): Promise<{ data: Feedback | null; error: any }> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from('feedback')
    .update({ status, updated_at: new Date().toISOString() })
    .eq('id', feedbackId)
    .select()
    .single()

  return { data, error }
}

/**
 * Delete feedback
 */
export async function deleteFeedback(feedbackId: string): Promise<{ error: any }> {
  const supabase = createClient()

  const { error } = await supabase.from('feedback').delete().eq('id', feedbackId)

  return { error }
}

/**
 * Get all feedback (admin only in future)
 */
export async function getAllFeedback(params?: {
  feedbackType?: string
  status?: string
  limit?: number
}): Promise<{ data: Feedback[] | null; error: any }> {
  const supabase = createClient()

  let query = supabase
    .from('feedback')
    .select('*')
    .order('created_at', { ascending: false })

  if (params?.feedbackType) {
    query = query.eq('feedback_type', params.feedbackType)
  }

  if (params?.status) {
    query = query.eq('status', params.status)
  }

  if (params?.limit) {
    query = query.limit(params.limit)
  }

  const { data, error } = await query

  return { data, error }
}
