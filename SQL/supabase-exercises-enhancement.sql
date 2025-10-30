-- ============================================================================
-- EXERCISE DATABASE ENHANCEMENT MIGRATION
-- Adds difficulty level and indexes for the exercises reference table
-- ============================================================================

-- Add difficulty level field to exercises table
ALTER TABLE public.exercises
ADD COLUMN IF NOT EXISTS difficulty TEXT; -- 'beginner', 'intermediate', 'advanced'

-- Add comment for documentation
COMMENT ON COLUMN public.exercises.difficulty IS 'Difficulty level: beginner, intermediate, or advanced';

-- ============================================================================
-- INDEXES FOR EFFICIENT QUERYING
-- ============================================================================

-- Index for filtering by category (strength, cardio, flexibility, HIIT)
CREATE INDEX IF NOT EXISTS idx_exercises_category ON public.exercises(category);

-- Index for searching by name (case-insensitive)
CREATE INDEX IF NOT EXISTS idx_exercises_name_lower ON public.exercises(LOWER(name));

-- Index for filtering by difficulty
CREATE INDEX IF NOT EXISTS idx_exercises_difficulty ON public.exercises(difficulty);

-- GIN index for searching by muscle groups (array field)
CREATE INDEX IF NOT EXISTS idx_exercises_muscle_groups ON public.exercises USING GIN(muscle_groups);

-- GIN index for searching by equipment (array field)
CREATE INDEX IF NOT EXISTS idx_exercises_equipment ON public.exercises USING GIN(equipment);

-- Composite index for common query patterns (category + difficulty)
CREATE INDEX IF NOT EXISTS idx_exercises_category_difficulty ON public.exercises(category, difficulty);

-- ============================================================================
-- SEED DATA: COMMON EXERCISES ACROSS ALL CATEGORIES
-- ============================================================================

-- Clear any existing data first
TRUNCATE TABLE public.exercises;

-- CARDIO EXERCISES
INSERT INTO public.exercises (name, category, muscle_groups, equipment, calories_per_minute_low, calories_per_minute_medium, calories_per_minute_high, difficulty, description, instructions) VALUES

('Running', 'cardio', ARRAY['legs', 'core'], ARRAY['none'], 8, 11, 15, 'beginner', 'Classic cardiovascular exercise that can be done anywhere', ARRAY['Start at a comfortable pace', 'Keep your core engaged', 'Land mid-foot with each step', 'Maintain steady breathing', 'Gradually increase pace as comfortable']),

('Jump Rope', 'cardio', ARRAY['legs', 'shoulders', 'core'], ARRAY['jump rope'], 10, 13, 16, 'intermediate', 'High-intensity cardio that improves coordination', ARRAY['Hold rope handles at hip height', 'Jump on balls of feet', 'Keep jumps small and controlled', 'Maintain consistent rhythm', 'Engage core throughout']),

('Cycling', 'cardio', ARRAY['legs', 'glutes'], ARRAY['bicycle'], 6, 9, 12, 'beginner', 'Low-impact cardio exercise great for endurance', ARRAY['Adjust seat to proper height', 'Keep shoulders relaxed', 'Maintain steady cadence', 'Use gears appropriate for terrain', 'Stay hydrated']),

('Burpees', 'cardio', ARRAY['full body', 'core', 'legs', 'chest'], ARRAY['bodyweight'], 10, 13, 16, 'advanced', 'Full-body high-intensity exercise combining cardio and strength', ARRAY['Start standing', 'Drop into squat position', 'Kick feet back to plank', 'Perform push-up', 'Jump feet forward', 'Explode up into jump']),

('Mountain Climbers', 'cardio', ARRAY['core', 'shoulders', 'legs'], ARRAY['bodyweight'], 8, 11, 14, 'intermediate', 'Dynamic cardio exercise that targets core and legs', ARRAY['Start in plank position', 'Drive one knee toward chest', 'Quickly switch legs', 'Keep hips level', 'Maintain fast pace']),

('Rowing', 'cardio', ARRAY['back', 'legs', 'core', 'arms'], ARRAY['rowing machine'], 7, 10, 13, 'beginner', 'Full-body low-impact cardio exercise', ARRAY['Strap feet in securely', 'Push with legs first', 'Lean back slightly', 'Pull handle to lower chest', 'Reverse the motion smoothly']);

-- STRENGTH EXERCISES
INSERT INTO public.exercises (name, category, muscle_groups, equipment, calories_per_minute_low, calories_per_minute_medium, calories_per_minute_high, difficulty, description, instructions) VALUES

('Barbell Squat', 'strength', ARRAY['legs', 'glutes', 'core'], ARRAY['barbell', 'squat rack'], 5, 7, 10, 'intermediate', 'Fundamental lower body strength exercise', ARRAY['Position barbell on upper back', 'Feet shoulder-width apart', 'Lower by pushing hips back', 'Descend until thighs parallel', 'Drive through heels to stand', 'Keep chest up throughout']),

('Bench Press', 'strength', ARRAY['chest', 'triceps', 'shoulders'], ARRAY['barbell', 'bench'], 4, 6, 8, 'intermediate', 'Primary chest building exercise', ARRAY['Lie flat on bench', 'Grip bar slightly wider than shoulders', 'Lower bar to mid-chest', 'Press bar up to arm extension', 'Keep feet flat on floor', 'Maintain stable shoulder blades']),

('Deadlift', 'strength', ARRAY['back', 'legs', 'core', 'glutes'], ARRAY['barbell'], 6, 8, 11, 'advanced', 'Compound exercise targeting posterior chain', ARRAY['Stand with feet hip-width', 'Grip bar just outside legs', 'Keep back straight', 'Drive through heels', 'Extend hips and knees simultaneously', 'Lower bar with control']),

('Pull-ups', 'strength', ARRAY['back', 'biceps', 'core'], ARRAY['pull-up bar'], 6, 8, 10, 'advanced', 'Upper body pulling exercise using body weight', ARRAY['Hang from bar with overhand grip', 'Engage shoulder blades', 'Pull until chin over bar', 'Lower with control', 'Avoid swinging', 'Keep core tight']),

('Push-ups', 'strength', ARRAY['chest', 'triceps', 'shoulders', 'core'], ARRAY['bodyweight'], 4, 6, 8, 'beginner', 'Classic bodyweight chest exercise', ARRAY['Start in plank position', 'Hands slightly wider than shoulders', 'Lower body as one unit', 'Chest nearly touches ground', 'Push back to start', 'Keep core engaged throughout']),

('Dumbbell Rows', 'strength', ARRAY['back', 'biceps'], ARRAY['dumbbell', 'bench'], 4, 6, 8, 'beginner', 'Unilateral back exercise for strength and symmetry', ARRAY['Place knee and hand on bench', 'Hold dumbbell in free hand', 'Pull dumbbell to hip', 'Keep elbow close to body', 'Lower with control', 'Squeeze shoulder blade at top']),

('Shoulder Press', 'strength', ARRAY['shoulders', 'triceps'], ARRAY['dumbbells'], 4, 6, 8, 'beginner', 'Primary shoulder building exercise', ARRAY['Stand or sit with dumbbells at shoulders', 'Press weights overhead', 'Extend arms fully', 'Lower with control', 'Keep core engaged', 'Avoid arching back']),

('Lunges', 'strength', ARRAY['legs', 'glutes'], ARRAY['bodyweight'], 4, 6, 8, 'beginner', 'Unilateral leg exercise for balance and strength', ARRAY['Step forward with one leg', 'Lower back knee toward ground', 'Keep front knee over ankle', 'Push through front heel', 'Return to start', 'Alternate legs']),

('Plank', 'strength', ARRAY['core', 'shoulders'], ARRAY['bodyweight'], 3, 4, 6, 'beginner', 'Isometric core strengthening exercise', ARRAY['Start on forearms and toes', 'Keep body in straight line', 'Engage core muscles', 'Avoid sagging hips', 'Breathe steadily', 'Hold for target duration']),

('Bicep Curls', 'strength', ARRAY['biceps'], ARRAY['dumbbells'], 3, 4, 6, 'beginner', 'Isolation exercise for bicep development', ARRAY['Stand with dumbbells at sides', 'Keep elbows close to body', 'Curl weights toward shoulders', 'Squeeze biceps at top', 'Lower with control', 'Avoid swinging']),

('Tricep Dips', 'strength', ARRAY['triceps', 'chest', 'shoulders'], ARRAY['dip bars'], 5, 7, 9, 'intermediate', 'Bodyweight exercise for tricep strength', ARRAY['Grip bars and support body', 'Lower body by bending elbows', 'Descend until arms at 90 degrees', 'Press back to start', 'Keep elbows tucked', 'Lean slightly forward']);

-- HIIT EXERCISES
INSERT INTO public.exercises (name, category, muscle_groups, equipment, calories_per_minute_low, calories_per_minute_medium, calories_per_minute_high, difficulty, description, instructions) VALUES

('High Knees', 'hiit', ARRAY['legs', 'core'], ARRAY['bodyweight'], 9, 12, 15, 'beginner', 'High-intensity cardio movement for explosive power', ARRAY['Run in place', 'Drive knees up to hip height', 'Pump arms vigorously', 'Land on balls of feet', 'Maintain fast pace', 'Keep core engaged']),

('Box Jumps', 'hiit', ARRAY['legs', 'glutes', 'core'], ARRAY['plyo box'], 10, 13, 16, 'intermediate', 'Plyometric exercise for explosive leg power', ARRAY['Stand facing box', 'Swing arms back', 'Jump explosively onto box', 'Land softly', 'Stand fully on box', 'Step down carefully']),

('Battle Ropes', 'hiit', ARRAY['arms', 'shoulders', 'core'], ARRAY['battle ropes'], 9, 12, 15, 'intermediate', 'Full upper body conditioning exercise', ARRAY['Stand with feet shoulder-width', 'Hold rope ends', 'Create alternating waves', 'Maintain athletic stance', 'Keep core engaged', 'Maintain steady rhythm']),

('Kettlebell Swings', 'hiit', ARRAY['glutes', 'hamstrings', 'core', 'shoulders'], ARRAY['kettlebell'], 9, 12, 15, 'intermediate', 'Dynamic full-body power exercise', ARRAY['Stand with feet wide', 'Hinge at hips', 'Swing kettlebell between legs', 'Drive hips forward explosively', 'Swing weight to shoulder height', 'Let momentum guide movement']),

('Jumping Jacks', 'hiit', ARRAY['full body', 'legs'], ARRAY['bodyweight'], 7, 9, 12, 'beginner', 'Classic full-body warm-up and cardio exercise', ARRAY['Start with feet together', 'Jump feet apart', 'Raise arms overhead', 'Jump back to start', 'Maintain steady rhythm', 'Land softly']),

('Sprint Intervals', 'hiit', ARRAY['legs', 'core'], ARRAY['none'], 12, 15, 18, 'advanced', 'Maximum intensity running for power and conditioning', ARRAY['Warm up thoroughly', 'Sprint at maximum effort', 'Maintain proper form', 'Rest or jog between sprints', 'Focus on explosive starts', 'Cool down properly']);

-- FLEXIBILITY EXERCISES
INSERT INTO public.exercises (name, category, muscle_groups, equipment, calories_per_minute_low, calories_per_minute_medium, calories_per_minute_high, difficulty, description, instructions) VALUES

('Yoga Flow', 'flexibility', ARRAY['full body'], ARRAY['yoga mat'], 3, 4, 6, 'beginner', 'Dynamic stretching sequence for flexibility and balance', ARRAY['Start in mountain pose', 'Flow through poses smoothly', 'Focus on breath control', 'Hold each pose briefly', 'Move mindfully', 'End in resting pose']),

('Hamstring Stretch', 'flexibility', ARRAY['hamstrings', 'lower back'], ARRAY['none'], 2, 3, 4, 'beginner', 'Essential lower body flexibility exercise', ARRAY['Sit with legs extended', 'Reach toward toes', 'Keep back straight', 'Hold stretch gently', 'Breathe deeply', 'Avoid bouncing']),

('Hip Flexor Stretch', 'flexibility', ARRAY['hip flexors', 'core'], ARRAY['none'], 2, 3, 4, 'beginner', 'Important stretch for hip mobility', ARRAY['Kneel on one knee', 'Other foot flat on ground', 'Push hips forward', 'Keep torso upright', 'Feel stretch in front of hip', 'Hold and breathe']),

('Cat-Cow Stretch', 'flexibility', ARRAY['spine', 'core'], ARRAY['yoga mat'], 2, 3, 4, 'beginner', 'Spinal mobility exercise', ARRAY['Start on hands and knees', 'Arch back and look up (cow)', 'Round spine and tuck chin (cat)', 'Move slowly between positions', 'Coordinate with breathing', 'Repeat smoothly']),

('Shoulder Stretch', 'flexibility', ARRAY['shoulders', 'chest'], ARRAY['none'], 2, 3, 4, 'beginner', 'Upper body flexibility for shoulder health', ARRAY['Pull one arm across chest', 'Use other arm to assist', 'Keep shoulders down', 'Feel stretch in shoulder', 'Hold gently', 'Switch arms']),

('Pilates Core Work', 'flexibility', ARRAY['core', 'back'], ARRAY['yoga mat'], 4, 5, 7, 'intermediate', 'Controlled movements for core strength and flexibility', ARRAY['Focus on breath control', 'Engage core throughout', 'Move with precision', 'Maintain proper alignment', 'Work within your range', 'Progress gradually']);

-- ============================================================================
-- VERIFICATION QUERIES
-- ============================================================================

-- Count exercises by category
-- SELECT category, COUNT(*) as count FROM public.exercises GROUP BY category;

-- Count exercises by difficulty
-- SELECT difficulty, COUNT(*) as count FROM public.exercises GROUP BY difficulty;

-- List all exercise names
-- SELECT name, category, difficulty FROM public.exercises ORDER BY category, difficulty;
