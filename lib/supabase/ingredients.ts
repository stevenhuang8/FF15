/**
 * Ingredients (Pantry) Operations
 *
 * Database operations for managing user's pantry ingredients
 */

import { createClient } from '@/lib/supabase/client';
import type { SupabaseClient } from '@supabase/supabase-js';

// ============================================================================
// Types
// ============================================================================

export interface Ingredient {
  id: string;
  userId: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  expiryDate?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateIngredientInput {
  userId: string;
  name: string;
  quantity?: number;
  unit?: string;
  category?: string;
  expiryDate?: string;
  notes?: string;
}

export interface ServiceResponse<T> {
  data: T | null;
  error: Error | null;
}

// ============================================================================
// Ingredient CRUD Operations
// ============================================================================

/**
 * Add a new ingredient to user's pantry
 */
export async function addIngredient(
  supabase: SupabaseClient,
  input: CreateIngredientInput
): Promise<ServiceResponse<Ingredient>> {
  try {
    const ingredientData = {
      user_id: input.userId,
      name: input.name,
      quantity: input.quantity || null,
      unit: input.unit || null,
      category: input.category || null,
      expiry_date: input.expiryDate || null,
      notes: input.notes || null,
    };

    const { data, error } = await supabase
      .from('ingredients')
      .insert(ingredientData)
      .select()
      .single();

    if (error) {
      console.error('Error adding ingredient:', error);
      return { data: null, error };
    }

    console.log('✅ Ingredient added successfully:', data.id);

    // Map snake_case database fields to camelCase TypeScript types
    const mappedData: Ingredient = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      category: data.category,
      expiryDate: data.expiry_date,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Exception adding ingredient:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error adding ingredient'),
    };
  }
}

/**
 * Get all ingredients for a user
 */
export async function getIngredients(
  userId: string,
  category?: string
): Promise<ServiceResponse<Ingredient[]>> {
  const supabase = createClient();

  try {
    let query = supabase
      .from('ingredients')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (category) {
      query = query.eq('category', category);
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching ingredients:', error);
      return { data: null, error };
    }

    // Map snake_case database fields to camelCase TypeScript types
    const mappedData: Ingredient[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      name: row.name,
      quantity: row.quantity,
      unit: row.unit,
      category: row.category,
      expiryDate: row.expiry_date,
      notes: row.notes,
      createdAt: row.created_at,
      updatedAt: row.updated_at,
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Exception fetching ingredients:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching ingredients'),
    };
  }
}

/**
 * Update an existing ingredient
 */
export async function updateIngredient(
  ingredientId: string,
  userId: string,
  updates: Partial<CreateIngredientInput>
): Promise<ServiceResponse<Ingredient>> {
  const supabase = createClient();

  try {
    // Convert camelCase to snake_case for database
    const updateData: any = {};
    if (updates.name !== undefined) updateData.name = updates.name;
    if (updates.quantity !== undefined) updateData.quantity = updates.quantity;
    if (updates.unit !== undefined) updateData.unit = updates.unit;
    if (updates.category !== undefined) updateData.category = updates.category;
    if (updates.expiryDate !== undefined) updateData.expiry_date = updates.expiryDate;
    if (updates.notes !== undefined) updateData.notes = updates.notes;

    const { data, error } = await supabase
      .from('ingredients')
      .update(updateData)
      .eq('id', ingredientId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating ingredient:', error);
      return { data: null, error };
    }

    console.log('✅ Ingredient updated:', data.id);

    // Map snake_case database fields to camelCase TypeScript types
    const mappedData: Ingredient = {
      id: data.id,
      userId: data.user_id,
      name: data.name,
      quantity: data.quantity,
      unit: data.unit,
      category: data.category,
      expiryDate: data.expiry_date,
      notes: data.notes,
      createdAt: data.created_at,
      updatedAt: data.updated_at,
    };

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Exception updating ingredient:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error updating ingredient'),
    };
  }
}

/**
 * Delete an ingredient from pantry
 */
export async function deleteIngredient(
  ingredientId: string,
  userId: string
): Promise<ServiceResponse<void>> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('ingredients')
      .delete()
      .eq('id', ingredientId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting ingredient:', error);
      return { data: null, error };
    }

    console.log('✅ Ingredient deleted:', ingredientId);

    return { data: null, error: null };
  } catch (error) {
    console.error('Exception deleting ingredient:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error deleting ingredient'),
    };
  }
}
