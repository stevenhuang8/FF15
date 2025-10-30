-- ============================================================================
-- FIX SECURITY DEFINER VIEWS
-- Recreates views with security_invoker=on to respect RLS policies
-- Issue: Views were using SECURITY DEFINER, bypassing RLS and exposing all user data
-- Solution: Use SECURITY INVOKER to enforce RLS policies on underlying tables
-- Reference: https://supabase.com/docs/guides/database/database-advisors?queryGroups=lint&lint=0010_security_definer_view
-- ============================================================================

-- Drop existing views
DROP VIEW IF EXISTS public.user_daily_nutrition;
DROP VIEW IF EXISTS public.user_meal_history;

-- Recreate user_daily_nutrition view with SECURITY INVOKER
-- This view will now respect RLS policies on meal_logs and workout_logs tables
CREATE OR REPLACE VIEW public.user_daily_nutrition
WITH (security_invoker = on)
AS
SELECT
  ml.user_id,
  DATE(ml.logged_at) as date,
  COUNT(DISTINCT ml.id) as meal_count,
  SUM(ml.total_calories) as total_calories_consumed,
  SUM(ml.total_protein) as total_protein_consumed,
  SUM(ml.total_carbs) as total_carbs_consumed,
  SUM(ml.total_fats) as total_fats_consumed,
  COALESCE(wl.calories_burned, 0) as total_calories_burned,
  SUM(ml.total_calories) - COALESCE(wl.calories_burned, 0) as net_calories
FROM public.meal_logs ml
LEFT JOIN (
  SELECT
    user_id,
    DATE(completed_at) as date,
    SUM(calories_burned) as calories_burned
  FROM public.workout_logs
  GROUP BY user_id, DATE(completed_at)
) wl ON ml.user_id = wl.user_id AND DATE(ml.logged_at) = wl.date
GROUP BY ml.user_id, DATE(ml.logged_at), wl.calories_burned;

-- Recreate user_meal_history view with SECURITY INVOKER
-- This view will now respect RLS policies on meal_logs and saved_recipes tables
CREATE OR REPLACE VIEW public.user_meal_history
WITH (security_invoker = on)
AS
SELECT
  ml.id,
  ml.user_id,
  ml.meal_type,
  ml.logged_at,
  ml.total_calories,
  ml.total_protein,
  ml.total_carbs,
  ml.total_fats,
  ml.food_items,
  ml.image_url,
  ml.notes,
  sr.title as recipe_title,
  sr.id as recipe_id
FROM public.meal_logs ml
LEFT JOIN public.saved_recipes sr ON ml.recipe_id = sr.id;

-- ============================================================================
-- VERIFY RLS POLICIES ARE ENABLED
-- These views will only be secure if the underlying tables have RLS enabled
-- ============================================================================

-- Enable RLS on meal_logs if not already enabled
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on workout_logs if not already enabled
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;

-- Enable RLS on saved_recipes if not already enabled
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON VIEW public.user_daily_nutrition IS 'Daily nutrition summary per user. Uses security_invoker to respect RLS policies on underlying tables.';
COMMENT ON VIEW public.user_meal_history IS 'User meal history with recipe details. Uses security_invoker to respect RLS policies on underlying tables.';
