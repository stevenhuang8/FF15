-- AI Cooking & Fitness Assistant Database Schema
-- Supabase PostgreSQL Schema with Row Level Security

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- USER PROFILES (extends auth.users)
-- ============================================================================

CREATE TABLE public.user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT,
  full_name TEXT,
  avatar_url TEXT,

  -- Dietary preferences
  dietary_restrictions TEXT[], -- ['vegetarian', 'vegan', 'gluten-free', 'dairy-free', etc.]
  allergies TEXT[],

  -- Fitness goals
  fitness_goals TEXT[], -- ['weight_loss', 'muscle_gain', 'maintenance', 'endurance', etc.]
  daily_calorie_target INTEGER,
  daily_protein_target INTEGER, -- grams
  daily_carbs_target INTEGER, -- grams
  daily_fats_target INTEGER, -- grams

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- CONVERSATIONS & MESSAGES
-- ============================================================================

CREATE TABLE public.conversations (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  agent_type TEXT DEFAULT 'cooking', -- 'cooking', 'fitness', 'general'
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.messages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  conversation_id UUID NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
  role TEXT NOT NULL, -- 'user', 'assistant'
  content TEXT NOT NULL,
  tool_calls JSONB, -- Store tool call data
  sources JSONB, -- Store RAG sources
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- RECIPES
-- ============================================================================

CREATE TABLE public.saved_recipes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  ingredients JSONB NOT NULL, -- [{ name, quantity, unit }]
  instructions TEXT[] NOT NULL,
  tags TEXT[],
  notes TEXT,

  -- Nutrition info
  calories INTEGER,
  protein INTEGER, -- grams
  carbs INTEGER, -- grams
  fats INTEGER, -- grams

  servings INTEGER DEFAULT 1,
  prep_time_minutes INTEGER,
  cook_time_minutes INTEGER,
  difficulty TEXT, -- 'easy', 'medium', 'hard'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INGREDIENTS
-- ============================================================================

CREATE TABLE public.ingredients (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  name TEXT NOT NULL,
  quantity NUMERIC,
  unit TEXT, -- 'cups', 'tbsp', 'grams', 'oz', etc.
  category TEXT, -- 'dairy', 'meat', 'produce', 'pantry', etc.
  expiry_date DATE,
  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.ingredient_images (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  image_url TEXT NOT NULL,
  extracted_ingredients JSONB, -- AI-extracted ingredients from image
  extraction_confidence NUMERIC, -- 0-1 confidence score

  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- INGREDIENT SUBSTITUTIONS
-- ============================================================================

CREATE TABLE public.ingredient_substitutions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  original_ingredient TEXT NOT NULL,
  substitute_ingredient TEXT NOT NULL,
  context TEXT, -- 'baking', 'cooking', 'raw', 'all'
  reason TEXT,
  ratio TEXT DEFAULT '1:1', -- substitution ratio

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.user_substitution_preferences (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  original_ingredient TEXT NOT NULL,
  preferred_substitute TEXT NOT NULL,
  context TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, original_ingredient, context)
);

-- ============================================================================
-- WORKOUTS
-- ============================================================================

CREATE TABLE public.exercises (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),

  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL, -- 'strength', 'cardio', 'flexibility', 'hiit'
  muscle_groups TEXT[], -- ['chest', 'back', 'legs', 'arms', etc.]
  equipment TEXT[], -- ['barbell', 'dumbbell', 'bodyweight', etc.]

  -- Calorie burn estimates (per minute)
  calories_per_minute_low NUMERIC, -- light intensity
  calories_per_minute_medium NUMERIC, -- moderate intensity
  calories_per_minute_high NUMERIC, -- high intensity

  description TEXT,
  instructions TEXT[],

  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.workout_plans (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES public.conversations(id) ON DELETE SET NULL,
  message_id UUID REFERENCES public.messages(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  description TEXT,
  category TEXT, -- 'strength', 'cardio', 'flexibility', 'hiit', 'mixed'
  exercises JSONB NOT NULL, -- [{ exercise_id, sets, reps, duration_minutes, intensity }]

  estimated_duration_minutes INTEGER,
  difficulty TEXT, -- 'beginner', 'intermediate', 'advanced'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.workout_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  workout_plan_id UUID REFERENCES public.workout_plans(id) ON DELETE SET NULL,

  title TEXT NOT NULL,
  exercises_performed JSONB NOT NULL, -- [{ exercise_id, sets, reps, duration_minutes, intensity }]

  total_duration_minutes INTEGER NOT NULL,
  calories_burned INTEGER,
  intensity TEXT, -- 'low', 'medium', 'high'
  notes TEXT,

  completed_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- NUTRITION & MEAL TRACKING
-- ============================================================================

CREATE TABLE public.meal_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  meal_type TEXT NOT NULL, -- 'breakfast', 'lunch', 'dinner', 'snack'
  food_items JSONB NOT NULL, -- [{ name, quantity, unit, calories, protein, carbs, fats }]
  recipe_id UUID REFERENCES public.saved_recipes(id) ON DELETE SET NULL,

  total_calories INTEGER NOT NULL,
  total_protein INTEGER, -- grams
  total_carbs INTEGER, -- grams
  total_fats INTEGER, -- grams

  notes TEXT,
  logged_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.calorie_tracking (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Intake
  total_calories_consumed INTEGER DEFAULT 0,
  total_protein_consumed INTEGER DEFAULT 0,
  total_carbs_consumed INTEGER DEFAULT 0,
  total_fats_consumed INTEGER DEFAULT 0,

  -- Expenditure
  total_calories_burned INTEGER DEFAULT 0,

  -- Net
  net_calories INTEGER GENERATED ALWAYS AS (total_calories_consumed - total_calories_burned) STORED,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================================
-- HEALTH METRICS & PROGRESS
-- ============================================================================

CREATE TABLE public.health_metrics (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  weight NUMERIC, -- in lbs or kg
  body_fat_percentage NUMERIC,

  -- Body measurements (in inches or cm)
  waist NUMERIC,
  chest NUMERIC,
  hips NUMERIC,
  arms NUMERIC,
  thighs NUMERIC,

  notes TEXT,

  logged_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

CREATE TABLE public.fitness_goals (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  goal_type TEXT NOT NULL, -- 'weight_loss', 'weight_gain', 'muscle_gain', 'calorie_target', etc.
  target_value NUMERIC NOT NULL,
  current_value NUMERIC,
  unit TEXT, -- 'lbs', 'kg', 'calories', 'percent', etc.

  target_date DATE,
  status TEXT DEFAULT 'active', -- 'active', 'achieved', 'abandoned'

  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE public.progress_snapshots (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,

  date DATE NOT NULL,

  -- Summary stats
  weight NUMERIC,
  body_fat_percentage NUMERIC,
  total_workouts_this_week INTEGER DEFAULT 0,
  avg_calories_per_day INTEGER,
  avg_protein_per_day INTEGER,

  notes TEXT,

  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, date)
);

-- ============================================================================
-- INDEXES for Performance
-- ============================================================================

-- Conversations & Messages
CREATE INDEX idx_conversations_user_id ON public.conversations(user_id);
CREATE INDEX idx_conversations_created_at ON public.conversations(created_at DESC);
CREATE INDEX idx_messages_conversation_id ON public.messages(conversation_id);
CREATE INDEX idx_messages_created_at ON public.messages(created_at);

-- Recipes
CREATE INDEX idx_saved_recipes_user_id ON public.saved_recipes(user_id);
CREATE INDEX idx_saved_recipes_created_at ON public.saved_recipes(created_at DESC);
CREATE INDEX idx_saved_recipes_tags ON public.saved_recipes USING GIN(tags);

-- Ingredients
CREATE INDEX idx_ingredients_user_id ON public.ingredients(user_id);
CREATE INDEX idx_ingredients_expiry_date ON public.ingredients(expiry_date);
CREATE INDEX idx_ingredient_images_user_id ON public.ingredient_images(user_id);

-- Workouts
CREATE INDEX idx_workout_plans_user_id ON public.workout_plans(user_id);
CREATE INDEX idx_workout_logs_user_id ON public.workout_logs(user_id);
CREATE INDEX idx_workout_logs_completed_at ON public.workout_logs(completed_at DESC);

-- Nutrition
CREATE INDEX idx_meal_logs_user_id ON public.meal_logs(user_id);
CREATE INDEX idx_meal_logs_logged_at ON public.meal_logs(logged_at DESC);
CREATE INDEX idx_calorie_tracking_user_date ON public.calorie_tracking(user_id, date DESC);

-- Health Metrics
CREATE INDEX idx_health_metrics_user_date ON public.health_metrics(user_id, date DESC);
CREATE INDEX idx_fitness_goals_user_id ON public.fitness_goals(user_id);
CREATE INDEX idx_progress_snapshots_user_date ON public.progress_snapshots(user_id, date DESC);

-- ============================================================================
-- ROW LEVEL SECURITY (RLS) POLICIES
-- ============================================================================

-- Enable RLS on all tables
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.conversations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.saved_recipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ingredient_images ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_substitution_preferences ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.workout_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meal_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.calorie_tracking ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_metrics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fitness_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.progress_snapshots ENABLE ROW LEVEL SECURITY;

-- User Profiles policies
CREATE POLICY "Users can view own profile" ON public.user_profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.user_profiles FOR UPDATE USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.user_profiles FOR INSERT WITH CHECK (auth.uid() = id);

-- Conversations policies
CREATE POLICY "Users can view own conversations" ON public.conversations FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own conversations" ON public.conversations FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own conversations" ON public.conversations FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own conversations" ON public.conversations FOR DELETE USING (auth.uid() = user_id);

-- Messages policies
CREATE POLICY "Users can view messages in own conversations" ON public.messages FOR SELECT
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can create messages in own conversations" ON public.messages FOR INSERT
  WITH CHECK (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));
CREATE POLICY "Users can delete messages in own conversations" ON public.messages FOR DELETE
  USING (EXISTS (SELECT 1 FROM public.conversations WHERE conversations.id = messages.conversation_id AND conversations.user_id = auth.uid()));

-- Saved Recipes policies
CREATE POLICY "Users can view own recipes" ON public.saved_recipes FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own recipes" ON public.saved_recipes FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own recipes" ON public.saved_recipes FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own recipes" ON public.saved_recipes FOR DELETE USING (auth.uid() = user_id);

-- Ingredients policies
CREATE POLICY "Users can view own ingredients" ON public.ingredients FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own ingredients" ON public.ingredients FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own ingredients" ON public.ingredients FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own ingredients" ON public.ingredients FOR DELETE USING (auth.uid() = user_id);

-- Ingredient Images policies
CREATE POLICY "Users can view own ingredient images" ON public.ingredient_images FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own ingredient images" ON public.ingredient_images FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can delete own ingredient images" ON public.ingredient_images FOR DELETE USING (auth.uid() = user_id);

-- User Substitution Preferences policies
CREATE POLICY "Users can view own substitution preferences" ON public.user_substitution_preferences FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own substitution preferences" ON public.user_substitution_preferences FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own substitution preferences" ON public.user_substitution_preferences FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own substitution preferences" ON public.user_substitution_preferences FOR DELETE USING (auth.uid() = user_id);

-- Workout Plans policies
CREATE POLICY "Users can view own workout plans" ON public.workout_plans FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own workout plans" ON public.workout_plans FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout plans" ON public.workout_plans FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout plans" ON public.workout_plans FOR DELETE USING (auth.uid() = user_id);

-- Workout Logs policies
CREATE POLICY "Users can view own workout logs" ON public.workout_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own workout logs" ON public.workout_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own workout logs" ON public.workout_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own workout logs" ON public.workout_logs FOR DELETE USING (auth.uid() = user_id);

-- Meal Logs policies
CREATE POLICY "Users can view own meal logs" ON public.meal_logs FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own meal logs" ON public.meal_logs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own meal logs" ON public.meal_logs FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own meal logs" ON public.meal_logs FOR DELETE USING (auth.uid() = user_id);

-- Calorie Tracking policies
CREATE POLICY "Users can view own calorie tracking" ON public.calorie_tracking FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own calorie tracking" ON public.calorie_tracking FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own calorie tracking" ON public.calorie_tracking FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own calorie tracking" ON public.calorie_tracking FOR DELETE USING (auth.uid() = user_id);

-- Health Metrics policies
CREATE POLICY "Users can view own health metrics" ON public.health_metrics FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own health metrics" ON public.health_metrics FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own health metrics" ON public.health_metrics FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own health metrics" ON public.health_metrics FOR DELETE USING (auth.uid() = user_id);

-- Fitness Goals policies
CREATE POLICY "Users can view own fitness goals" ON public.fitness_goals FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own fitness goals" ON public.fitness_goals FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own fitness goals" ON public.fitness_goals FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own fitness goals" ON public.fitness_goals FOR DELETE USING (auth.uid() = user_id);

-- Progress Snapshots policies
CREATE POLICY "Users can view own progress snapshots" ON public.progress_snapshots FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create own progress snapshots" ON public.progress_snapshots FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own progress snapshots" ON public.progress_snapshots FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own progress snapshots" ON public.progress_snapshots FOR DELETE USING (auth.uid() = user_id);

-- Exercises table is public (reference data)
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view exercises" ON public.exercises FOR SELECT USING (true);

-- Ingredient Substitutions table is public (reference data)
ALTER TABLE public.ingredient_substitutions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view ingredient substitutions" ON public.ingredient_substitutions FOR SELECT USING (true);

-- ============================================================================
-- FUNCTIONS & TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Triggers for updated_at
CREATE TRIGGER update_user_profiles_updated_at BEFORE UPDATE ON public.user_profiles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_conversations_updated_at BEFORE UPDATE ON public.conversations FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_saved_recipes_updated_at BEFORE UPDATE ON public.saved_recipes FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_ingredients_updated_at BEFORE UPDATE ON public.ingredients FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_workout_plans_updated_at BEFORE UPDATE ON public.workout_plans FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_calorie_tracking_updated_at BEFORE UPDATE ON public.calorie_tracking FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_fitness_goals_updated_at BEFORE UPDATE ON public.fitness_goals FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
