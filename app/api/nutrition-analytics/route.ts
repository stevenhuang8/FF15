/**
 * Nutrition Analytics API Endpoint
 *
 * Provides aggregated nutrition data for analytics and charts
 * Supports daily, weekly, and monthly views
 */

import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'

export const runtime = 'edge'

interface AnalyticsQuery {
  startDate: string
  endDate: string
  userId?: string
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const startDate = searchParams.get('startDate')
    const endDate = searchParams.get('endDate')

    if (!startDate || !endDate) {
      return NextResponse.json(
        { error: 'startDate and endDate are required' },
        { status: 400 }
      )
    }

    const supabase = await createClient()

    // Get authenticated user
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Fetch nutrition data for the date range
    const { data: nutritionData, error: nutritionError } = await supabase
      .from('calorie_tracking')
      .select('*')
      .eq('user_id', user.id)
      .gte('date', startDate)
      .lte('date', endDate)
      .order('date', { ascending: true })

    if (nutritionError) {
      console.error('Error fetching nutrition data:', nutritionError)
      return NextResponse.json(
        { error: 'Failed to fetch nutrition data' },
        { status: 500 }
      )
    }

    // Fetch user's daily targets
    const { data: profile, error: profileError } = await supabase
      .from('user_profiles')
      .select('daily_calorie_target, daily_protein_target, daily_carbs_target, daily_fats_target')
      .eq('id', user.id)
      .single()

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('Error fetching profile:', profileError)
    }

    // Format response data
    const formattedData = (nutritionData || []).map((entry) => ({
      date: entry.date,
      calories: entry.total_calories_consumed || 0,
      protein: entry.total_protein_consumed || 0,
      carbs: entry.total_carbs_consumed || 0,
      fats: entry.total_fats_consumed || 0,
      burned: entry.total_calories_burned || 0,
      net: (entry.total_calories_consumed || 0) - (entry.total_calories_burned || 0),
    }))

    // Calculate summary statistics
    const totalDays = formattedData.length
    const totalCalories = formattedData.reduce((sum, day) => sum + day.calories, 0)
    const totalProtein = formattedData.reduce((sum, day) => sum + day.protein, 0)
    const totalCarbs = formattedData.reduce((sum, day) => sum + day.carbs, 0)
    const totalFats = formattedData.reduce((sum, day) => sum + day.fats, 0)
    const totalBurned = formattedData.reduce((sum, day) => sum + day.burned, 0)

    const avgCalories = totalDays > 0 ? Math.round(totalCalories / totalDays) : 0
    const avgProtein = totalDays > 0 ? Math.round(totalProtein / totalDays) : 0
    const avgCarbs = totalDays > 0 ? Math.round(totalCarbs / totalDays) : 0
    const avgFats = totalDays > 0 ? Math.round(totalFats / totalDays) : 0
    const avgBurned = totalDays > 0 ? Math.round(totalBurned / totalDays) : 0

    const response = {
      data: formattedData,
      summary: {
        totalDays,
        avgCalories,
        avgProtein,
        avgCarbs,
        avgFats,
        avgBurned,
        totalCalories,
        totalProtein,
        totalCarbs,
        totalFats,
        totalBurned,
      },
      targets: {
        calories: profile?.daily_calorie_target || 2000,
        protein: profile?.daily_protein_target || 150,
        carbs: profile?.daily_carbs_target || 200,
        fats: profile?.daily_fats_target || 70,
      },
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('Error in nutrition analytics API:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
