/**
 * Meal Logging Operations
 *
 * Database operations for logging meals and tracking daily nutrition
 */

import type { SupabaseClient } from '@supabase/supabase-js';
import type {
  MealLog,
  CreateMealLogInput,
  DailyNutrition,
  NutritionServiceResponse,
  FoodItem,
} from './types';
import { calculateTotalNutrition } from './nutrition-service';
import { formatDateForDB } from '@/lib/utils';

// ============================================================================
// Meal Logging
// ============================================================================

/**
 * Create a new meal log entry
 */
export async function createMealLog(
  supabase: SupabaseClient,
  input: CreateMealLogInput
): Promise<NutritionServiceResponse<MealLog>> {
  try {
    // Calculate totals from food items
    const totals = calculateTotalNutrition(input.foodItems);

    const mealData = {
      user_id: input.userId,
      meal_type: input.mealType,
      food_items: input.foodItems,
      recipe_id: input.recipeId || null,
      total_calories: totals.totalCalories,
      total_protein: totals.totalProtein,
      total_carbs: totals.totalCarbs,
      total_fats: totals.totalFats,
      notes: input.notes || null,
    };

    const { data, error } = await supabase
      .from('meal_logs')
      .insert(mealData)
      .select()
      .single();

    if (error) {
      console.error('Error creating meal log:', error);
      return { data: null, error };
    }

    console.log('✅ Meal logged successfully:', data.id);

    // Update daily calorie tracking
    await updateDailyCalorieTracking(input.userId, new Date());

    // Map snake_case database fields to camelCase TypeScript types
    const mappedData: MealLog = {
      id: data.id,
      userId: data.user_id,
      mealType: data.meal_type,
      foodItems: data.food_items,
      recipeId: data.recipe_id,
      totalCalories: data.total_calories,
      totalProtein: data.total_protein,
      totalCarbs: data.total_carbs,
      totalFats: data.total_fats,
      notes: data.notes,
      loggedAt: data.logged_at,
    };

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Exception creating meal log:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error creating meal log'),
    };
  }
}

/**
 * Get meal logs for a user
 */
export async function getMealLogs(
  userId: string,
  startDate?: Date,
  endDate?: Date
): Promise<NutritionServiceResponse<MealLog[]>> {
  const supabase = createClient();

  try {
    let query = supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      .order('logged_at', { ascending: false });

    if (startDate) {
      query = query.gte('logged_at', startDate.toISOString());
    }

    if (endDate) {
      query = query.lte('logged_at', endDate.toISOString());
    }

    const { data, error } = await query;

    if (error) {
      console.error('Error fetching meal logs:', error);
      return { data: null, error };
    }

    // Map snake_case database fields to camelCase TypeScript types
    const mappedData: MealLog[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      mealType: row.meal_type,
      foodItems: row.food_items,
      recipeId: row.recipe_id,
      totalCalories: row.total_calories,
      totalProtein: row.total_protein,
      totalCarbs: row.total_carbs,
      totalFats: row.total_fats,
      notes: row.notes,
      loggedAt: row.logged_at,
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Exception fetching meal logs:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching meal logs'),
    };
  }
}

/**
 * Get today's meal logs for a user
 * Uses local timezone to properly determine "today"
 */
export async function getTodaysMealLogs(
  userId: string
): Promise<NutritionServiceResponse<MealLog[]>> {
  const supabase = createClient();

  try {
    // Get today's date in local timezone as YYYY-MM-DD
    // This ensures we're comparing dates in the user's local timezone
    const todayLocal = formatDateForDB(new Date());

    console.log(`🔍 Fetching meals for date: ${todayLocal}`);

    // Query for all meals where the date portion matches today
    // We cast logged_at to date in Pacific timezone to match local time
    const { data, error } = await supabase
      .from('meal_logs')
      .select('*')
      .eq('user_id', userId)
      // Match on date portion only, converted to local timezone
      .gte('logged_at', `${todayLocal}T00:00:00`)
      .lt('logged_at', `${todayLocal}T23:59:59.999`)
      .order('logged_at', { ascending: false });

    if (error) {
      console.error('Error fetching today\'s meal logs:', error);
      return { data: null, error };
    }

    // Map snake_case database fields to camelCase TypeScript types
    const mappedData: MealLog[] = (data || []).map((row: any) => ({
      id: row.id,
      userId: row.user_id,
      mealType: row.meal_type,
      foodItems: row.food_items,
      recipeId: row.recipe_id,
      totalCalories: row.total_calories,
      totalProtein: row.total_protein,
      totalCarbs: row.total_carbs,
      totalFats: row.total_fats,
      notes: row.notes,
      loggedAt: row.logged_at,
    }));

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Exception fetching today\'s meal logs:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching today\'s meal logs'),
    };
  }
}

/**
 * Update a meal log
 */
export async function updateMealLog(
  mealLogId: string,
  userId: string,
  updates: Partial<CreateMealLogInput>
): Promise<NutritionServiceResponse<MealLog>> {
  const supabase = createClient();

  try {
    // Recalculate totals if food items changed
    let updateData: any = { ...updates };

    if (updates.foodItems) {
      const totals = calculateTotalNutrition(updates.foodItems);
      updateData = {
        ...updateData,
        total_calories: totals.totalCalories,
        total_protein: totals.totalProtein,
        total_carbs: totals.totalCarbs,
        total_fats: totals.totalFats,
      };
    }

    const { data, error } = await supabase
      .from('meal_logs')
      .update(updateData)
      .eq('id', mealLogId)
      .eq('user_id', userId)
      .select()
      .single();

    if (error) {
      console.error('Error updating meal log:', error);
      return { data: null, error };
    }

    console.log('✅ Meal log updated:', data.id);

    // Update daily calorie tracking
    await updateDailyCalorieTracking(userId, new Date());

    // Map snake_case database fields to camelCase TypeScript types
    const mappedData: MealLog = {
      id: data.id,
      userId: data.user_id,
      mealType: data.meal_type,
      foodItems: data.food_items,
      recipeId: data.recipe_id,
      totalCalories: data.total_calories,
      totalProtein: data.total_protein,
      totalCarbs: data.total_carbs,
      totalFats: data.total_fats,
      notes: data.notes,
      loggedAt: data.logged_at,
    };

    return { data: mappedData, error: null };
  } catch (error) {
    console.error('Exception updating meal log:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error updating meal log'),
    };
  }
}

/**
 * Delete a meal log
 */
export async function deleteMealLog(
  mealLogId: string,
  userId: string
): Promise<NutritionServiceResponse<void>> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('meal_logs')
      .delete()
      .eq('id', mealLogId)
      .eq('user_id', userId);

    if (error) {
      console.error('Error deleting meal log:', error);
      return { data: null, error };
    }

    console.log('✅ Meal log deleted:', mealLogId);

    // Update daily calorie tracking
    await updateDailyCalorieTracking(userId, new Date());

    return { data: null, error: null };
  } catch (error) {
    console.error('Exception deleting meal log:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error deleting meal log'),
    };
  }
}

// ============================================================================
// Daily Calorie Tracking
// ============================================================================

/**
 * Update daily calorie tracking summary
 * Aggregates all meals and workouts for the day
 */
export async function updateDailyCalorieTracking(
  userId: string,
  date: Date
): Promise<NutritionServiceResponse<void>> {
  const supabase = createClient();

  try {
    // Create proper date range in local timezone, then convert to UTC for query
    const startOfDay = new Date(date);
    startOfDay.setHours(0, 0, 0, 0);

    const endOfDay = new Date(date);
    endOfDay.setHours(23, 59, 59, 999);

    // Format date string for database record (YYYY-MM-DD in local timezone)
    const dateStr = formatDateForDB(date);

    console.log(`📅 Updating daily tracking for date: ${dateStr} (local time)`);

    // Get total calories from meals for this day
    const { data: meals, error: mealsError } = await supabase
      .from('meal_logs')
      .select('total_calories, total_protein, total_carbs, total_fats')
      .eq('user_id', userId)
      .gte('logged_at', startOfDay.toISOString())
      .lte('logged_at', endOfDay.toISOString());

    if (mealsError) {
      console.error('Error fetching meals:', mealsError);
      return { data: null, error: mealsError };
    }

    // Calculate totals consumed
    const totalsConsumed = (meals || []).reduce(
      (acc, meal) => ({
        calories: acc.calories + (meal.total_calories || 0),
        protein: acc.protein + (meal.total_protein || 0),
        carbs: acc.carbs + (meal.total_carbs || 0),
        fats: acc.fats + (meal.total_fats || 0),
      }),
      { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

    // Get total calories burned from workouts
    const { data: workouts, error: workoutsError } = await supabase
      .from('workout_logs')
      .select('calories_burned')
      .eq('user_id', userId)
      .gte('completed_at', startOfDay.toISOString())
      .lte('completed_at', endOfDay.toISOString());

    if (workoutsError) {
      console.error('Error fetching workouts:', workoutsError);
      // Continue without workout data
    }

    const totalCaloriesBurned = (workouts || []).reduce(
      (acc, workout) => acc + (workout.calories_burned || 0),
      0
    );

    // Upsert daily tracking record
    const { error: upsertError } = await supabase.from('calorie_tracking').upsert(
      {
        user_id: userId,
        date: dateStr,
        total_calories_consumed: totalsConsumed.calories,
        total_protein_consumed: totalsConsumed.protein,
        total_carbs_consumed: totalsConsumed.carbs,
        total_fats_consumed: totalsConsumed.fats,
        total_calories_burned: totalCaloriesBurned,
      },
      {
        onConflict: 'user_id,date',
      }
    );

    if (upsertError) {
      console.error('Error updating daily tracking:', upsertError);
      return { data: null, error: upsertError };
    }

    return { data: null, error: null };
  } catch (error) {
    console.error('Exception updating daily tracking:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error updating daily tracking'),
    };
  }
}

/**
 * Get daily nutrition summary for a user
 */
export async function getDailyNutrition(
  userId: string,
  date: Date
): Promise<NutritionServiceResponse<DailyNutrition>> {
  const supabase = createClient();

  try {
    // Use local date formatting to avoid timezone shifts
    // formatDateForDB uses local date components (year, month, day) not UTC
    const dateStr = formatDateForDB(date);

    console.log(`🔍 Fetching daily nutrition for date: ${dateStr}`);

    const { data, error } = await supabase
      .from('calorie_tracking')
      .select('*')
      .eq('user_id', userId)
      .eq('date', dateStr)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        // No data for this date yet, return zeros
        return {
          data: {
            userId,
            date: dateStr,
            totalCaloriesConsumed: 0,
            totalProteinConsumed: 0,
            totalCarbsConsumed: 0,
            totalFatsConsumed: 0,
            totalCaloriesBurned: 0,
            netCalories: 0,
          },
          error: null,
        };
      }
      console.error('Error fetching daily nutrition:', error);
      return { data: null, error };
    }

    return {
      data: {
        userId: data.user_id,
        date: data.date,
        totalCaloriesConsumed: data.total_calories_consumed || 0,
        totalProteinConsumed: data.total_protein_consumed || 0,
        totalCarbsConsumed: data.total_carbs_consumed || 0,
        totalFatsConsumed: data.total_fats_consumed || 0,
        totalCaloriesBurned: data.total_calories_burned || 0,
        netCalories: data.net_calories || 0,
      },
      error: null,
    };
  } catch (error) {
    console.error('Exception fetching daily nutrition:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching daily nutrition'),
    };
  }
}

/**
 * Get nutrition data for a date range
 */
export async function getNutritionHistory(
  userId: string,
  startDate: Date,
  endDate: Date
): Promise<NutritionServiceResponse<DailyNutrition[]>> {
  const supabase = createClient();

  try {
    const { data, error } = await supabase
      .from('calorie_tracking')
      .select('*')
      .eq('user_id', userId)
      .gte('date', startDate.toISOString().split('T')[0])
      .lte('date', endDate.toISOString().split('T')[0])
      .order('date', { ascending: false });

    if (error) {
      console.error('Error fetching nutrition history:', error);
      return { data: null, error };
    }

    const history = (data || []).map(row => ({
      userId: row.user_id,
      date: row.date,
      totalCaloriesConsumed: row.total_calories_consumed || 0,
      totalProteinConsumed: row.total_protein_consumed || 0,
      totalCarbsConsumed: row.total_carbs_consumed || 0,
      totalFatsConsumed: row.total_fats_consumed || 0,
      totalCaloriesBurned: row.total_calories_burned || 0,
      netCalories: row.net_calories || 0,
    }));

    return { data: history, error: null };
  } catch (error) {
    console.error('Exception fetching nutrition history:', error);
    return {
      data: null,
      error: error instanceof Error ? error : new Error('Unknown error fetching nutrition history'),
    };
  }
}
