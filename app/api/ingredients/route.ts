import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'
import { formatDateForDB } from '@/lib/utils'

/**
 * Ingredients API - List and Create
 */

// Validation schema for creating an ingredient
const createIngredientSchema = z.object({
  name: z.string().min(1, 'Name is required').max(100),
  quantity: z.number().positive('Quantity must be positive'),
  unit: z.string().min(1, 'Unit is required'),
  category: z.string().optional().nullable(),
  // Accept YYYY-MM-DD format to match nutrition/workout pattern
  expiryDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be in YYYY-MM-DD format').optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
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

      // Use formatDateForDB to get YYYY-MM-DD in local timezone (matches nutrition pattern)
      if (expiryFilter === 'expired') {
        query = query.lt('expiry_date', formatDateForDB(now))
      } else if (expiryFilter === 'expiring-soon') {
        query = query
          .gte('expiry_date', formatDateForDB(now))
          .lte('expiry_date', formatDateForDB(threeDaysFromNow))
      } else if (expiryFilter === 'fresh') {
        query = query
          .gte('expiry_date', formatDateForDB(now))
          .lte('expiry_date', formatDateForDB(sevenDaysFromNow))
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
    console.log('📥 Received ingredient data:', JSON.stringify(body, null, 2))

    const validationResult = createIngredientSchema.safeParse(body)

    if (!validationResult.success) {
      console.error('❌ Validation failed:', validationResult.error.issues)
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const { name, quantity, unit, category, expiryDate, notes } = validationResult.data

    // Prepare data for insertion
    const insertData = {
      user_id: user.id,
      name: name.trim().toLowerCase(),
      quantity,
      unit,
      category: category || null,
      // Store YYYY-MM-DD directly (matches nutrition/workout pattern)
      expiry_date: expiryDate || null,
      notes: notes || null,
    }
    console.log('💾 Inserting into database:', JSON.stringify(insertData, null, 2))

    // Insert ingredient
    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .insert(insertData)
      .select()
      .single()

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: 'Failed to create ingredient' }, { status: 500 })
    }

    console.log('✅ Ingredient created successfully:', ingredient.id)

    return NextResponse.json({ ingredient }, { status: 201 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/ingredients
 * Delete all ingredients for the authenticated user
 */
export async function DELETE(request: NextRequest) {
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

    // Delete all ingredients for the user
    const { error, count } = await supabase
      .from('ingredients')
      .delete()
      .eq('user_id', user.id)

    if (error) {
      console.error('❌ Database error:', error)
      return NextResponse.json({ error: 'Failed to delete ingredients' }, { status: 500 })
    }

    console.log(`✅ Deleted ${count || 0} ingredients for user ${user.id}`)

    return NextResponse.json({ message: 'All ingredients deleted successfully', count }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
