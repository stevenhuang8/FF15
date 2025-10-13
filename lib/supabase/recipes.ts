/**
 * Supabase Recipe Operations
 *
 * Database functions for saving and managing recipes
 */

import { createClient } from '@/lib/supabase/client';
import type { ExtractedRecipe, SavedRecipe } from '@/types/recipe';
import type { TablesInsert } from '@/types/supabase';

/**
 * Saves an extracted recipe to the database
 */
export async function saveRecipe(params: {
  recipe: ExtractedRecipe;
  userId: string;
  conversationId?: string;
  messageId?: string;
}) {
  const { recipe, userId, conversationId, messageId } = params;

  const supabase = createClient();

  try {
    // Convert time strings to minutes for database storage
    const prepTimeMinutes = parseTimeToMinutes(recipe.metadata.prepTime);
    const cookTimeMinutes = parseTimeToMinutes(recipe.metadata.cookTime);

    // Prepare the recipe data for insertion
    const recipeData: TablesInsert<'saved_recipes'> = {
      user_id: userId,
      title: recipe.title,
      ingredients: recipe.ingredients as any, // JSON type
      instructions: recipe.instructions.map(i => i.text),
      conversation_id: conversationId || null,
      message_id: messageId || null,
      prep_time_minutes: prepTimeMinutes,
      cook_time_minutes: cookTimeMinutes,
      servings: recipe.metadata.servings ? parseInt(recipe.metadata.servings) : null,
      difficulty: recipe.metadata.difficulty || null,
      tags: recipe.tags || null,
      calories: recipe.nutrition?.calories || null,
      protein: recipe.nutrition?.protein ? parseFloat(recipe.nutrition.protein) : null,
      carbs: recipe.nutrition?.carbs ? parseFloat(recipe.nutrition.carbs) : null,
      fats: recipe.nutrition?.fat ? parseFloat(recipe.nutrition.fat) : null,
    };

    const { data, error } = await supabase
      .from('saved_recipes')
      .insert(recipeData)
      .select()
      .single();

    if (error) {
      console.error('Error saving recipe:', error);
      return { data: null, error };
    }

    console.log('✅ Recipe saved successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('Exception saving recipe:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error saving recipe'),
    };
  }
}

/**
 * Retrieves all saved recipes for a user
 */
export async function getRecipes(userId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching recipes:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching recipes:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching recipes'),
    };
  }
}

/**
 * Retrieves a single recipe by ID
 */
export async function getRecipe(recipeId: string, userId: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('id', recipeId)
      .eq('user_id', userId)
      .single();

    if (error) {
      console.error('Error fetching recipe:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception fetching recipe:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching recipe'),
    };
  }
}

/**
 * Updates a saved recipe
 */
export async function updateRecipe(
  recipeId: string,
  userId: string,
  updates: Partial<TablesInsert<'saved_recipes'>>
) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('saved_recipes')
      .update(updates)
      .eq('id', recipeId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating recipe:', error);
      return { data: null, error };
    }

    console.log('✅ Recipe updated successfully:', data.id);
    return { data, error: null };
  } catch (error) {
    console.error('Exception updating recipe:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error updating recipe'),
    };
  }
}

/**
 * Deletes a saved recipe
 */
export async function deleteRecipe(recipeId: string, userId: string) {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('saved_recipes')
      .delete()
      .eq('id', recipeId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting recipe:', error);
      return { error };
    }

    console.log('✅ Recipe deleted successfully:', recipeId);
    return { error: null };
  } catch (error) {
    console.error('Exception deleting recipe:', error);
    return {
      error: error instanceof Error ? error : new Error('Unknown error deleting recipe'),
    };
  }
}

/**
 * Searches recipes by title, ingredients, or tags
 */
export async function searchRecipes(userId: string, query: string) {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('saved_recipes')
      .select('*')
      .eq('user_id', userId)
      .or(`title.ilike.%${query}%,tags.cs.{${query}}`)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error searching recipes:', error);
      return { data: null, error };
    }

    return { data, error: null };
  } catch (error) {
    console.error('Exception searching recipes:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error searching recipes'),
    };
  }
}

/**
 * Utility function to parse time strings like "30 minutes" or "1 hour" to minutes
 */
function parseTimeToMinutes(timeStr?: string): number | null {
  if (!timeStr) return null;

  const lowerTime = timeStr.toLowerCase();

  // Parse hours
  const hoursMatch = lowerTime.match(/(\d+)\s*(?:hour|hr)/);
  const hours = hoursMatch ? parseInt(hoursMatch[1], 10) : 0;

  // Parse minutes
  const minutesMatch = lowerTime.match(/(\d+)\s*(?:minute|min)/);
  const minutes = minutesMatch ? parseInt(minutesMatch[1], 10) : 0;

  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}
