/**
 * Supabase Substitution Operations
 *
 * Database functions for managing ingredient substitutions and user preferences
 */

import { createClient } from '@/lib/supabase/client'
import type { TablesInsert, TablesUpdate, Tables } from '@/types/supabase'

// ============================================================================
// Ingredient Substitutions (Public Reference Data)
// ============================================================================

/**
 * Get all ingredient substitutions
 */
export async function getAllSubstitutions(context?: string) {
  const supabase = createClient()

  try {
    let query = supabase
      .from('ingredient_substitutions')
      .select('*')
      .order('original_ingredient', { ascending: true })

    if (context) {
      query = query.or(`context.eq.${context},context.eq.all`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching substitutions:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Exception fetching substitutions:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching substitutions'),
    }
  }
}

/**
 * Search for substitutions for a specific ingredient
 */
export async function getSubstitutionsForIngredient(
  ingredient: string,
  context?: string
) {
  const supabase = createClient()

  try {
    let query = supabase
      .from('ingredient_substitutions')
      .select('*')
      .ilike('original_ingredient', `%${ingredient}%`)

    if (context) {
      query = query.or(`context.eq.${context},context.eq.all`)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching substitutions for ingredient:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Exception fetching substitutions for ingredient:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching substitutions'),
    }
  }
}

/**
 * Add a new substitution to the reference database (admin/seeding)
 */
export async function addSubstitution(params: {
  originalIngredient: string
  substituteIngredient: string
  context?: string
  reason?: string
  ratio?: string
}) {
  const supabase = createClient()

  try {
    const substitutionData: TablesInsert<'ingredient_substitutions'> = {
      original_ingredient: params.originalIngredient,
      substitute_ingredient: params.substituteIngredient,
      context: params.context || 'all',
      reason: params.reason || null,
      ratio: params.ratio || '1:1',
    }

    const { data, error } = await supabase
      .from('ingredient_substitutions')
      .insert(substitutionData)
      .select()
      .single()

    if (error) {
      console.error('Error adding substitution:', error)
      return { data: null, error }
    }

    console.log('✅ Substitution added successfully:', data.id)
    return { data, error: null }
  } catch (error) {
    console.error('Exception adding substitution:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error adding substitution'),
    }
  }
}

// ============================================================================
// User Substitution Preferences
// ============================================================================

/**
 * Get user's substitution preferences
 */
export async function getUserSubstitutionPreferences(userId: string, context?: string) {
  const supabase = createClient()

  try {
    let query = supabase
      .from('user_substitution_preferences')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })

    if (context) {
      query = query.eq('context', context)
    }

    const { data, error } = await query

    if (error) {
      console.error('Error fetching user substitution preferences:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Exception fetching user substitution preferences:', error)
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error('Unknown error fetching user substitution preferences'),
    }
  }
}

/**
 * Get user's preference for a specific ingredient
 */
export async function getUserPreferenceForIngredient(
  userId: string,
  ingredient: string,
  context?: string
) {
  const supabase = createClient()

  try {
    let query = supabase
      .from('user_substitution_preferences')
      .select('*')
      .eq('user_id', userId)
      .ilike('original_ingredient', ingredient)

    if (context) {
      query = query.eq('context', context)
    }

    const { data, error } = await query.maybeSingle()

    if (error) {
      console.error('Error fetching user preference for ingredient:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Exception fetching user preference for ingredient:', error)
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error('Unknown error fetching user preference for ingredient'),
    }
  }
}

/**
 * Save user's substitution preference
 */
export async function saveUserSubstitutionPreference(params: {
  userId: string
  originalIngredient: string
  preferredSubstitute: string
  context?: string
}) {
  const supabase = createClient()

  try {
    const preferenceData: TablesInsert<'user_substitution_preferences'> = {
      user_id: params.userId,
      original_ingredient: params.originalIngredient,
      preferred_substitute: params.preferredSubstitute,
      context: params.context || null,
    }

    const { data, error } = await supabase
      .from('user_substitution_preferences')
      .upsert(preferenceData, {
        onConflict: 'user_id,original_ingredient,context',
        ignoreDuplicates: false,
      })
      .select()
      .single()

    if (error) {
      console.error('Error saving user substitution preference:', error)
      return { data: null, error }
    }

    console.log('✅ User substitution preference saved successfully:', data.id)
    return { data, error: null }
  } catch (error) {
    console.error('Exception saving user substitution preference:', error)
    return {
      data: null,
      error:
        error instanceof Error
          ? error
          : new Error('Unknown error saving user substitution preference'),
    }
  }
}

/**
 * Delete user's substitution preference
 */
export async function deleteUserSubstitutionPreference(
  userId: string,
  preferenceId: string
) {
  const supabase = createClient()

  try {
    const { error } = await supabase
      .from('user_substitution_preferences')
      .delete()
      .eq('id', preferenceId)
      .eq('user_id', userId)

    if (error) {
      console.error('Error deleting user substitution preference:', error)
      return { error }
    }

    console.log('✅ User substitution preference deleted successfully:', preferenceId)
    return { error: null }
  } catch (error) {
    console.error('Exception deleting user substitution preference:', error)
    return {
      error:
        error instanceof Error
          ? error
          : new Error('Unknown error deleting user substitution preference'),
    }
  }
}

// ============================================================================
// User Profile Dietary Preferences
// ============================================================================

/**
 * Update user's dietary restrictions
 */
export async function updateDietaryRestrictions(
  userId: string,
  dietaryRestrictions: string[]
) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ dietary_restrictions: dietaryRestrictions })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating dietary restrictions:', error)
      return { data: null, error }
    }

    console.log('✅ Dietary restrictions updated successfully')
    return { data, error: null }
  } catch (error) {
    console.error('Exception updating dietary restrictions:', error)
    return {
      data: null,
      error:
        error instanceof Error ? error : new Error('Unknown error updating dietary restrictions'),
    }
  }
}

/**
 * Update user's allergies
 */
export async function updateAllergies(userId: string, allergies: string[]) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .update({ allergies })
      .eq('id', userId)
      .select()
      .single()

    if (error) {
      console.error('Error updating allergies:', error)
      return { data: null, error }
    }

    console.log('✅ Allergies updated successfully')
    return { data, error: null }
  } catch (error) {
    console.error('Exception updating allergies:', error)
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error updating allergies'),
    }
  }
}

/**
 * Get user's dietary preferences (restrictions + allergies)
 */
export async function getUserDietaryPreferences(userId: string) {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('dietary_restrictions, allergies')
      .eq('id', userId)
      .single()

    if (error) {
      console.error('Error fetching dietary preferences:', error)
      return { data: null, error }
    }

    return { data, error: null }
  } catch (error) {
    console.error('Exception fetching dietary preferences:', error)
    return {
      data: null,
      error:
        error instanceof Error ? error : new Error('Unknown error fetching dietary preferences'),
    }
  }
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Get suggested substitutions combining reference data and user preferences
 */
export async function getSuggestedSubstitutions(
  userId: string,
  ingredient: string,
  context?: string
) {
  try {
    // Get user's preferred substitution first
    const { data: userPref } = await getUserPreferenceForIngredient(userId, ingredient, context)

    // Get reference substitutions
    const { data: refSubs } = await getSubstitutionsForIngredient(ingredient, context)

    // Combine, prioritizing user preference
    const suggestions = refSubs || []

    if (userPref) {
      // Move user's preferred substitution to the top
      const userSubIndex = suggestions.findIndex(
        (s) => s.substitute_ingredient.toLowerCase() === userPref.preferred_substitute.toLowerCase()
      )

      if (userSubIndex > -1) {
        const [userSub] = suggestions.splice(userSubIndex, 1)
        suggestions.unshift({ ...userSub, is_user_preference: true })
      } else {
        // User has a preference not in reference data
        suggestions.unshift({
          id: userPref.id,
          original_ingredient: userPref.original_ingredient,
          substitute_ingredient: userPref.preferred_substitute,
          context: userPref.context || 'all',
          reason: 'Your saved preference',
          ratio: '1:1',
          created_at: userPref.created_at!,
          is_user_preference: true,
        })
      }
    }

    return { data: suggestions, error: null }
  } catch (error) {
    console.error('Exception getting suggested substitutions:', error)
    return {
      data: null,
      error:
        error instanceof Error ? error : new Error('Unknown error getting suggested substitutions'),
    }
  }
}
