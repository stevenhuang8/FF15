import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { getFlag } from '@/lib/launchdarkly'

export async function POST(request: NextRequest) {
  // Same flag and attributes as the login page, which only hides the button
  const body = await request.json().catch(() => null)
  const ref = typeof body?.ref === 'string' ? body.ref : undefined
  const attributes: Record<string, string> = ref ? { ref } : {}
  if (!(await getFlag('demo-login', false, attributes))) {
    return NextResponse.json({ error: 'Demo login is not available' }, { status: 403 })
  }

  const supabase = await createClient()
  const { error } = await supabase.auth.signInWithPassword({
    email: process.env.DEMO_EMAIL!,
    password: process.env.DEMO_PASSWORD!,
  })
  if (error) {
    return NextResponse.json({ error: 'Demo login failed' }, { status: 500 })
  }
  return NextResponse.json({ success: true })
}
