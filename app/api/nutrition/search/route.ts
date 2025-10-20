/**
 * Nutrition Search API Route
 *
 * Server-side proxy for USDA food search to avoid CORS issues
 * and protect API keys
 */

import { NextRequest, NextResponse } from 'next/server'
import { searchFood } from '@/lib/nutrition/nutrition-service'

export const runtime = 'edge'

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams
    const query = searchParams.get('query')

    if (!query || query.length < 2) {
      return NextResponse.json(
        { error: 'Query must be at least 2 characters' },
        { status: 400 }
      )
    }

    const { data, error } = await searchFood(query)

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
