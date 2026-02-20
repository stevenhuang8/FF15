import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export async function POST() {
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
