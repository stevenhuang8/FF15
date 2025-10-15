import { createClient } from '@/lib/supabase/server'
import { NextRequest, NextResponse } from 'next/server'
import { z } from 'zod'

/**
 * Ingredients API - Update and Delete
 */

// Validation schema for updating an ingredient
const updateIngredientSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  quantity: z.number().positive().optional(),
  unit: z.string().min(1).optional(),
  category: z.string().optional().nullable(),
  expiryDate: z.string().datetime().optional().nullable(),
  notes: z.string().max(500).optional().nullable(),
})

/**
 * PATCH /api/ingredients/[id]
 * Update an existing ingredient
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

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
    const validationResult = updateIngredientSchema.safeParse(body)

    if (!validationResult.success) {
      return NextResponse.json(
        { error: 'Validation failed', details: validationResult.error.issues },
        { status: 400 }
      )
    }

    const updates = validationResult.data

    // Build update object
    const updateData: Record<string, any> = {}

    if (updates.name !== undefined) {
      updateData.name = updates.name.trim().toLowerCase()
    }
    if (updates.quantity !== undefined) {
      updateData.quantity = updates.quantity
    }
    if (updates.unit !== undefined) {
      updateData.unit = updates.unit
    }
    if (updates.category !== undefined) {
      updateData.category = updates.category
    }
    if (updates.expiryDate !== undefined) {
      updateData.expiry_date = updates.expiryDate
        ? new Date(updates.expiryDate).toISOString().split('T')[0]
        : null
    }
    if (updates.notes !== undefined) {
      updateData.notes = updates.notes
    }

    // Update ingredient (RLS ensures user can only update their own)
    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .update(updateData)
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
      }
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to update ingredient' }, { status: 500 })
    }

    return NextResponse.json({ ingredient })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * DELETE /api/ingredients/[id]
 * Delete an ingredient
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Delete ingredient (RLS ensures user can only delete their own)
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to delete ingredient' }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

/**
 * GET /api/ingredients/[id]
 * Get a single ingredient by ID
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const supabase = await createClient()
    const { id } = await params

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get ingredient (RLS ensures user can only view their own)
    const { data: ingredient, error } = await supabase
      .from('ingredients')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error) {
      if (error.code === 'PGRST116') {
        return NextResponse.json({ error: 'Ingredient not found' }, { status: 404 })
      }
      console.error('Database error:', error)
      return NextResponse.json({ error: 'Failed to fetch ingredient' }, { status: 500 })
    }

    return NextResponse.json({ ingredient })
  } catch (error) {
    console.error('Unexpected error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
