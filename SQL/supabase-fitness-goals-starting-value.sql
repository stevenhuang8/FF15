-- Add starting_value column to fitness_goals table
-- This column stores the initial value when the goal was created,
-- allowing for proper progress calculation for weight loss/gain goals

ALTER TABLE public.fitness_goals
ADD COLUMN IF NOT EXISTS starting_value NUMERIC;

-- Backfill existing goals: set starting_value = current_value
-- This assumes current_value represents the starting point for existing goals
UPDATE public.fitness_goals
SET starting_value = current_value
WHERE starting_value IS NULL AND current_value IS NOT NULL;

-- Add helpful comment
COMMENT ON COLUMN public.fitness_goals.starting_value IS 'Initial value when goal was created (e.g., starting weight for weight loss goals)';
