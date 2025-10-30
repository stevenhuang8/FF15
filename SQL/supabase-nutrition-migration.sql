-- ============================================================================
-- NUTRITION TRACKING ENHANCEMENT MIGRATION
-- Adds nutrition API caching and meal photo support
-- ============================================================================

-- ============================================================================
-- NUTRITION API CACHE
-- ============================================================================

-- Cache USDA FoodData Central API responses to reduce API calls
CREATE TABLE IF NOT EXISTS public.nutrition_cache (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  -- Food identification
  food_name TEXT NOT NULL UNIQUE, -- Stored in lowercase for case-insensitive matching
  fdc_id TEXT, -- USDA FoodData Central ID

  -- Nutrition data per 100g serving
  calories NUMERIC NOT NULL,
  protein NUMERIC, -- grams
  carbs NUMERIC, -- grams
  fats NUMERIC, -- grams
  fiber NUMERIC, -- grams
  sugar NUMERIC, -- grams

  -- Micronutrients (optional, for future use)
  sodium NUMERIC, -- mg
  potassium NUMERIC, -- mg
  calcium NUMERIC, -- mg
  iron NUMERIC, -- mg
  vitamin_c NUMERIC, -- mg
  vitamin_a NUMERIC, -- IU

  -- Serving size information
  serving_size NUMERIC DEFAULT 100, -- default 100g
  serving_unit TEXT DEFAULT 'g',

  -- Metadata
  data_source TEXT DEFAULT 'usda', -- 'usda', 'manual', 'user_override'
  last_updated TIMESTAMPTZ DEFAULT NOW(),
  api_response JSONB, -- Store full API response for debugging

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for fast food name lookups
CREATE INDEX IF NOT EXISTS idx_nutrition_cache_food_name
  ON public.nutrition_cache(food_name);

-- Index for sorting by last updated
CREATE INDEX IF NOT EXISTS idx_nutrition_cache_last_updated
  ON public.nutrition_cache(last_updated DESC);

-- ============================================================================
-- ENHANCE MEAL LOGS TABLE
-- ============================================================================

-- Add image_url field for meal photos
ALTER TABLE public.meal_logs
ADD COLUMN IF NOT EXISTS image_url TEXT;

-- Add search/source metadata to track where nutrition data came from
ALTER TABLE public.meal_logs
ADD COLUMN IF NOT EXISTS nutrition_source TEXT DEFAULT 'manual'; -- 'api', 'manual', 'recipe'

-- ============================================================================
-- ROW LEVEL SECURITY FOR NUTRITION CACHE
-- ============================================================================

-- Nutrition cache is shared across all users (reference data)
ALTER TABLE public.nutrition_cache ENABLE ROW LEVEL SECURITY;

-- Anyone can view cached nutrition data
CREATE POLICY "Anyone can view nutrition cache"
  ON public.nutrition_cache FOR SELECT
  USING (true);

-- Only authenticated users can insert to cache (via API service)
CREATE POLICY "Authenticated users can insert nutrition cache"
  ON public.nutrition_cache FOR INSERT
  WITH CHECK (auth.role() = 'authenticated');

-- Only authenticated users can update cache
CREATE POLICY "Authenticated users can update nutrition cache"
  ON public.nutrition_cache FOR UPDATE
  USING (auth.role() = 'authenticated');

-- ============================================================================
-- HELPER FUNCTIONS
-- ============================================================================

-- Function to clean up old nutrition cache entries (older than 90 days)
CREATE OR REPLACE FUNCTION cleanup_old_nutrition_cache()
RETURNS void AS $$
BEGIN
  DELETE FROM public.nutrition_cache
  WHERE last_updated < NOW() - INTERVAL '90 days'
    AND data_source = 'usda'; -- Only clean up API data, preserve manual entries
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Function to get or create nutrition cache entry
CREATE OR REPLACE FUNCTION get_or_create_nutrition(
  p_food_name TEXT,
  p_calories NUMERIC,
  p_protein NUMERIC DEFAULT NULL,
  p_carbs NUMERIC DEFAULT NULL,
  p_fats NUMERIC DEFAULT NULL
)
RETURNS UUID AS $$
DECLARE
  v_cache_id UUID;
  v_normalized_name TEXT;
BEGIN
  -- Normalize food name to lowercase
  v_normalized_name := LOWER(TRIM(p_food_name));

  -- Try to find existing entry
  SELECT id INTO v_cache_id
  FROM public.nutrition_cache
  WHERE food_name = v_normalized_name;

  -- If not found, create new entry
  IF v_cache_id IS NULL THEN
    INSERT INTO public.nutrition_cache (
      food_name,
      calories,
      protein,
      carbs,
      fats,
      data_source
    ) VALUES (
      v_normalized_name,
      p_calories,
      p_protein,
      p_carbs,
      p_fats,
      'manual'
    ) RETURNING id INTO v_cache_id;
  END IF;

  RETURN v_cache_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================================
-- VIEWS FOR CONVENIENCE
-- ============================================================================

-- View to see user's daily nutrition summary with net calories
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

-- View to see user's meal history with recipes
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
-- INDEXES FOR PERFORMANCE
-- ============================================================================

-- Add index for meal logs with image URLs (for gallery views)
CREATE INDEX IF NOT EXISTS idx_meal_logs_with_images
  ON public.meal_logs(user_id, logged_at DESC)
  WHERE image_url IS NOT NULL;

-- Add index for recent meals
CREATE INDEX IF NOT EXISTS idx_meal_logs_recent
  ON public.meal_logs(user_id, logged_at DESC);

-- ============================================================================
-- COMMENTS FOR DOCUMENTATION
-- ============================================================================

COMMENT ON TABLE public.nutrition_cache IS 'Caches USDA FoodData Central API responses to reduce API calls and improve performance';
COMMENT ON COLUMN public.nutrition_cache.food_name IS 'Normalized food name for lookup (case-insensitive unique)';
COMMENT ON COLUMN public.nutrition_cache.fdc_id IS 'USDA FoodData Central unique food ID';
COMMENT ON COLUMN public.nutrition_cache.serving_size IS 'Default serving size for nutrition values (typically 100g)';
COMMENT ON COLUMN public.nutrition_cache.api_response IS 'Full API response stored as JSONB for debugging and future enhancements';

COMMENT ON COLUMN public.meal_logs.image_url IS 'URL to meal photo stored in Supabase Storage';
COMMENT ON COLUMN public.meal_logs.nutrition_source IS 'Source of nutrition data: api (USDA), manual (user entered), or recipe (from saved recipe)';
