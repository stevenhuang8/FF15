/**
 * Nutrition Search API Route
 *
 * Server-side proxy for USDA food search to avoid CORS issues
 * and protect API keys
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchFood } from '@/lib/nutrition/nutrition-service'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const { data, error } = await searchFood(query, supabase)

    if (error) {
      console.error('Error searching food:', error)
      return NextResponse.json(
        { error: 'Failed to search food database' },
        { status: 500 }
      )
    }

    return NextResponse.json({ data })
  } catch (error) {
    console.error('Unexpected error in nutrition search:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
