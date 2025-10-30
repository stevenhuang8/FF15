-- Add starting_value column to fitness_goals table
-- Run this in your Supabase SQL Editor

ALTER TABLE public.fitness_goals
ADD COLUMN IF NOT EXISTS starting_value NUMERIC;

COMMENT ON COLUMN public.fitness_goals.starting_value IS 'Initial value when goal was created (e.g., starting weight for weight loss goals)';
