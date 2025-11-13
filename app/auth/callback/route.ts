import { createClient } from '@/lib/supabase/server'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

/**
 * Auth callback route for handling email confirmations from Supabase
 *
 * This route processes:
 * - Email verification links (confirm signup)
 * - Password reset confirmations
 * - Magic link logins
 *
 * Supabase sends users here with either:
 * - ?token_hash=xxx&type=email (for email verification)
 * - ?token_hash=xxx&type=recovery (for password reset)
 * - ?code=xxx (for PKCE flow)
 */
export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const token_hash = requestUrl.searchParams.get('token_hash')
  const type = requestUrl.searchParams.get('type')
  const code = requestUrl.searchParams.get('code')
  const next = requestUrl.searchParams.get('next') ?? '/'

  // Get the origin for redirects
  const origin = requestUrl.origin
  const redirectTo = requestUrl.searchParams.get('redirect_to')?.toString()

  // Create Supabase client
  const supabase = await createClient()

  try {
    // Handle PKCE code exchange (used for OAuth and some email flows)
    if (code) {
      const { error } = await supabase.auth.exchangeCodeForSession(code)
      if (error) {
        console.error('Error exchanging code for session:', error)
        return NextResponse.redirect(`${origin}/login?error=auth_code_error`)
      }
    }

    // Handle token hash verification (email confirmation, password reset)
    if (token_hash && type) {
      // Only handle email and recovery types (valid EmailOtpType values)
      if (type === 'email' || type === 'recovery') {
        const { error } = await supabase.auth.verifyOtp({
          type,
          token_hash,
        })

        if (error) {
          console.error('Error verifying token:', error)
          return NextResponse.redirect(`${origin}/login?error=verification_error`)
        }

        // Redirect based on verification type
        if (type === 'recovery') {
          // Password reset - send to password reset page
          return NextResponse.redirect(`${origin}/reset-password`)
        }

        // Email verification - send to home or specified redirect
        const destination = redirectTo || next
        return NextResponse.redirect(`${origin}${destination}`)
      } else {
        // Invalid type parameter
        console.error('Invalid verification type:', type)
        return NextResponse.redirect(`${origin}/login?error=invalid_type`)
      }
    }

    // If no valid parameters, redirect to home
    const destination = redirectTo || next
    return NextResponse.redirect(`${origin}${destination}`)

  } catch (error) {
    console.error('Unexpected error in auth callback:', error)
    return NextResponse.redirect(`${origin}/login?error=server_error`)
  }
}
