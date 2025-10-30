import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { uploadFeedbackAttachment } from '@/lib/supabase/storage'
import { feedbackSchema } from '@/components/feedback/feedback-schema'

/**
 * Feedback API - Submit feedback
 */

/**
 * POST /api/feedback
 * Submit new feedback (requires authentication)
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user (required for feedback)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized - Please log in to submit feedback' }, { status: 401 })
    }

    // Parse form data
    const formData = await request.formData()
    const feedbackType = formData.get('feedbackType') as string
    const description = formData.get('description') as string
    const email = formData.get('email') as string | null
    const file = formData.get('file') as File | null

    // Validate data
    const validationResult = feedbackSchema.safeParse({
      feedbackType,
      description,
      email: email || '',
      file,
    })

    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.issues)
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    // Handle file upload if present
    let attachmentUrl: string | null = null
    let attachmentPath: string | null = null

    if (file && file.size > 0) {
      try {
        const uploadResult = await uploadFeedbackAttachment(file, user.id)
        attachmentUrl = uploadResult.url
        attachmentPath = uploadResult.path
        console.log('✅ File uploaded successfully:', uploadResult.path)
      } catch (uploadError) {
        console.error('❌ File upload failed:', uploadError)
        return NextResponse.json(
          { error: 'File upload failed', details: uploadError instanceof Error ? uploadError.message : 'Unknown error' },
          { status: 500 }
        )
      }
    }

    // Prepare data for insertion
    const insertData = {
      user_id: user.id,
      feedback_type: feedbackType,
      description: description.trim(),
      email: email || null,
      attachment_url: attachmentUrl,
      attachment_path: attachmentPath,
      status: 'pending' as const,
    }

    console.log('💾 Inserting feedback:', { ...insertData, attachment_url: attachmentUrl ? '[FILE]' : null })

    // Insert feedback
    const { data: feedback, error } = await supabase
      .from('feedback')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: 'Failed to submit feedback' }, { status: 500 })
    }

    console.log('✅ Feedback submitted successfully:', feedback.id)

    return NextResponse.json(
      {
        message: 'Feedback submitted successfully',
        feedback: {
          id: feedback.id,
          status: feedback.status,
        }
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('❌ Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/feedback
 * Get feedback for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user (required for viewing feedback)
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's feedback
    const { data: feedbackList, error } = await supabase
      .from('feedback')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

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
