-- ============================================================================
-- NUTRITION DECIMAL VALUES FIX
-- Changes INTEGER columns to NUMERIC to support decimal nutrition values
-- ============================================================================

-- STEP 1: Drop views that depend on columns we're changing
DROP VIEW IF EXISTS user_daily_nutrition;
DROP VIEW IF EXISTS user_meal_history;

-- STEP 2: Drop generated columns that depend on columns we're changing
ALTER TABLE public.calorie_tracking
  DROP COLUMN IF EXISTS net_calories;

-- STEP 3: Fix meal_logs table - nutrition values should be NUMERIC not INTEGER
ALTER TABLE public.meal_logs
  ALTER COLUMN total_calories TYPE NUMERIC USING total_calories::NUMERIC,
  ALTER COLUMN total_protein TYPE NUMERIC USING total_protein::NUMERIC,
  ALTER COLUMN total_carbs TYPE NUMERIC USING total_carbs::NUMERIC,
  ALTER COLUMN total_fats TYPE NUMERIC USING total_fats::NUMERIC;

-- STEP 4: Fix calorie_tracking table - nutrition values should be NUMERIC not INTEGER
ALTER TABLE public.calorie_tracking
  ALTER COLUMN total_calories_consumed TYPE NUMERIC USING total_calories_consumed::NUMERIC,
  ALTER COLUMN total_protein_consumed TYPE NUMERIC USING total_protein_consumed::NUMERIC,
  ALTER COLUMN total_carbs_consumed TYPE NUMERIC USING total_carbs_consumed::NUMERIC,
  ALTER COLUMN total_fats_consumed TYPE NUMERIC USING total_fats_consumed::NUMERIC,
  ALTER COLUMN total_calories_burned TYPE NUMERIC USING total_calories_burned::NUMERIC;

-- STEP 5: Recreate the generated column with NUMERIC type
ALTER TABLE public.calorie_tracking
  ADD COLUMN net_calories NUMERIC GENERATED ALWAYS AS (total_calories_consumed - total_calories_burned) STORED;

-- STEP 6: Fix saved_recipes table - nutrition values should be NUMERIC not INTEGER
ALTER TABLE public.saved_recipes
  ALTER COLUMN calories TYPE NUMERIC USING calories::NUMERIC,
  ALTER COLUMN protein TYPE NUMERIC USING protein::NUMERIC,
  ALTER COLUMN carbs TYPE NUMERIC USING carbs::NUMERIC,
  ALTER COLUMN fats TYPE NUMERIC USING fats::NUMERIC;

-- STEP 7: Fix user_profiles table - daily targets should be NUMERIC not INTEGER
ALTER TABLE public.user_profiles
  ALTER COLUMN daily_calorie_target TYPE NUMERIC USING daily_calorie_target::NUMERIC,
  ALTER COLUMN daily_protein_target TYPE NUMERIC USING daily_protein_target::NUMERIC,
  ALTER COLUMN daily_carbs_target TYPE NUMERIC USING daily_carbs_target::NUMERIC,
  ALTER COLUMN daily_fats_target TYPE NUMERIC USING daily_fats_target::NUMERIC;

-- STEP 8: Fix workout_logs table - calories burned should be NUMERIC not INTEGER
ALTER TABLE public.workout_logs
  ALTER COLUMN calories_burned TYPE NUMERIC USING calories_burned::NUMERIC;

-- STEP 9: Fix workout_plans table - estimated duration should be NUMERIC not INTEGER
ALTER TABLE public.workout_plans
  ALTER COLUMN estimated_duration_minutes TYPE NUMERIC USING estimated_duration_minutes::NUMERIC;

-- STEP 10: Fix workout_logs table - total duration should be NUMERIC not INTEGER
ALTER TABLE public.workout_logs
  ALTER COLUMN total_duration_minutes TYPE NUMERIC USING total_duration_minutes::NUMERIC;

-- STEP 11: Fix saved_recipes table - time fields should be NUMERIC not INTEGER
ALTER TABLE public.saved_recipes
  ALTER COLUMN servings TYPE NUMERIC USING servings::NUMERIC,
  ALTER COLUMN prep_time_minutes TYPE NUMERIC USING prep_time_minutes::NUMERIC,
  ALTER COLUMN cook_time_minutes TYPE NUMERIC USING cook_time_minutes::NUMERIC;

-- STEP 12: Fix progress_snapshots table if it exists
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_name = 'progress_snapshots') THEN
    ALTER TABLE public.progress_snapshots
      ALTER COLUMN total_workouts_this_week TYPE NUMERIC USING total_workouts_this_week::NUMERIC,
      ALTER COLUMN avg_calories_per_day TYPE NUMERIC USING avg_calories_per_day::NUMERIC,
      ALTER COLUMN avg_protein_per_day TYPE NUMERIC USING avg_protein_per_day::NUMERIC;
  END IF;
END $$;

-- STEP 13: Recreate the views with NUMERIC types
CREATE OR REPLACE VIEW user_daily_nutrition AS
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

-- Recreate user_meal_history view
CREATE OR REPLACE VIEW user_meal_history AS
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
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON COLUMN public.meal_logs.total_calories IS 'Total calories for the meal (NUMERIC to support decimal values like 150.5)';
COMMENT ON COLUMN public.meal_logs.total_protein IS 'Total protein in grams (NUMERIC to support decimal values like 5.5g)';
COMMENT ON COLUMN public.meal_logs.total_carbs IS 'Total carbs in grams (NUMERIC to support decimal values like 50.07g)';
COMMENT ON COLUMN public.meal_logs.total_fats IS 'Total fats in grams (NUMERIC to support decimal values like 10.3g)';
