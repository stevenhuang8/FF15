import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Ingredients API - List and Create
 */

// Validation schema for creating an ingredient
const createIngredientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().optional(),
  expiryDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(500).optional(),
})

/**
 * GET /api/ingredients
 * List all ingredients for the authenticated user
 */
export async function GET(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get search params
    const searchParams = request.nextUrl.searchParams
    const category = searchParams.get('category')
    const expiryFilter = searchParams.get('expiry_filter')

    // Build query
    let query = supabase
      .from('ingredients')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    // Apply filters
    if (category && category !== 'all') {
      query = query.eq('category', category)
    }

    if (expiryFilter && expiryFilter !== 'all') {
      const now = new Date()
      const threeDaysFromNow = new Date(now)
      threeDaysFromNow.setDate(now.getDate() + 3)
      const sevenDaysFromNow = new Date(now)
      sevenDaysFromNow.setDate(now.getDate() + 7)

      if (expiryFilter === 'expired') {
        query = query.lt('expiry_date', now.toISOString().split('T')[0])
      } else if (expiryFilter === 'expiring-soon') {
        query = query
          .gte('expiry_date', now.toISOString().split('T')[0])
          .lte('expiry_date', threeDaysFromNow.toISOString().split('T')[0])
      } else if (expiryFilter === 'fresh') {
        query = query
          .gte('expiry_date', now.toISOString().split('T')[0])
          .lte('expiry_date', sevenDaysFromNow.toISOString().split('T')[0])
      }
    }

    const { data: ingredients, error } = await query

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch ingredients' }, { status: 500 })
    }

    return NextResponse.json({ ingredients })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * POST /api/ingredients
 * Create a new ingredient
 */
export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Parse and validate request body
    const body = await request.json()
    const validationResult = createIngredientSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { name, quantity, unit, category, expiryDate, notes } = validationResult.data

    // Insert ingredient
    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .insert({
        user_id: user.id,
        name: name.trim().toLowerCase(),
        quantity,
        unit,
        category: category || null,
        expiry_date: expiryDate ? new Date(expiryDate).toISOString().split('T')[0] : null,
        notes: notes || null,
      })
      .select()
      .single()

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 })
    }

    return NextResponse.json({ ingredient }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
