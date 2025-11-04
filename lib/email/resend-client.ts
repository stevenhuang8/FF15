/**
 * Resend Email Client
 */

import { Resend } from 'resend'

// Initialize Resend client
export const resend = new Resend(process.env.RESEND_API_KEY)

/**
 * Send feedback notification email to admin
 */
export async function sendFeedbackNotification(params: {
  feedbackType: string
  description: string
  userEmail?: string
  userId: string
  attachmentUrl?: string
}) {
  try {
    const adminEmail = process.env.ADMIN_EMAIL || 'admin@example.com'

    const { data, error } = await resend.emails.send({
      from: 'Food & Fitness AI <onboarding@resend.dev>', // Update with your verified domain
      to: [adminEmail],
      subject: `New ${params.feedbackType} feedback received`,
      html: `
        <h2>New Feedback Received</h2>
        <p><strong>Type:</strong> ${params.feedbackType}</p>
        <p><strong>From User:</strong> ${params.userId}</p>
        ${params.userEmail ? `<p><strong>Email:</strong> ${params.userEmail}</p>` : ''}
        <p><strong>Description:</strong></p>
        <p>${params.description.replace(/\n/g, '<br>')}</p>
        ${params.attachmentUrl ? `
        <p><strong>Attachment:</strong></p>
        <img src="${params.attachmentUrl}" alt="Feedback attachment" style="max-width: 600px; height: auto; border: 1px solid #ddd; border-radius: 4px;">
        <p><a href="${params.attachmentUrl}" target="_blank">View full size image</a></p>
        ` : ''}
        <hr>
        <p><small>View all feedback in your admin dashboard</small></p>
      `,
    })

    if (error) {
      console.error('❌ Failed to send feedback notification:', error)
      return { success: false, error }
    }

    console.log('✅ Feedback notification sent:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending feedback notification:', error)
    return { success: false, error }
  }
}

/**
 * Send confirmation email to user
 */
export async function sendFeedbackConfirmation(params: {
  toEmail: string
  feedbackType: string
}) {
  try {
    const { data, error } = await resend.emails.send({
      from: 'Food & Fitness AI <notifications@yourdomain.com>', // Update with your verified domain
      to: [params.toEmail],
      subject: 'We received your feedback',
      html: `
        <h2>Thank you for your feedback!</h2>
        <p>We've received your ${params.feedbackType} and will review it shortly.</p>
        <p>Our team typically responds within 24-48 hours.</p>
        <hr>
        <p><small>You can view your feedback history at <a href="${process.env.NEXT_PUBLIC_APP_URL}/feedback">your feedback page</a></small></p>
      `,
    })

    if (error) {
      console.error('❌ Failed to send confirmation email:', error)
      return { success: false, error }
    }

    console.log('✅ Confirmation email sent:', data?.id)
    return { success: true, data }
  } catch (error) {
    console.error('❌ Error sending confirmation email:', error)
    return { success: false, error }
  }
}
