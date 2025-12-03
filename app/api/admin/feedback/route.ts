import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { isUserAdmin } from '@/lib/supabase/admin-auth'

/**
 * Admin Feedback API
 */

/**
 * GET /api/admin/feedback
 * Get all feedback (admin only)
 */
export async function GET(request: NextRequest) {
  try {
    // Check if user is admin
    const isAdmin = await isUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const supabase = await createClient()

    // Get query parameters
    const searchParams = request.nextUrl.searchParams
    const status = searchParams.get('status')
    const type = searchParams.get('type')

    // Build query to get all feedback
    let query = supabase
      .from('feedback')
      .select('*')
      .order('created_at', { ascending: false })

    // Apply filters
    if (status && status !== 'all') {
      query = query.eq('status', status)
    }
    if (type && type !== 'all') {
      query = query.eq('feedback_type', type)
    }

    const { data: feedbackList, error } = await query

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch feedback' }, { status: 500 })
    }

    return NextResponse.json({ feedback: feedbackList })
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * PATCH /api/admin/feedback
 * Update feedback status (admin only)
 */
export async function PATCH(request: NextRequest) {
  try {
    // Check if user is admin
    const isAdmin = await isUserAdmin()
    if (!isAdmin) {
      return NextResponse.json({ error: 'Unauthorized - Admin access required' }, { status: 403 })
    }

    const supabase = await createClient()
    const body = await request.json()
    const { id, status } = body

    if (!id || !status) {
      return NextResponse.json({ error: 'Missing id or status' }, { status: 400 })
    }

    // Update feedback status
    const { data: feedback, error } = await supabase
      .from('feedback')
      .update({ status, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: 'Failed to update feedback' }, { status: 500 })
    }

    console.log('✅ Feedback status updated:', feedback.id, '->', status)

    return NextResponse.json({ feedback })
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
