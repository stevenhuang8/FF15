# Task 8: Workout Management Testing Checklist

## SaveWorkoutButton Component
- [ ] Button appears on AI messages containing workout plans
- [ ] Workout extraction from various formats (bullet points, numbered, paragraphs)
- [ ] Extracts exercises with sets, reps, duration correctly
- [ ] Saves workout to database with proper categorization
- [ ] Duplicate detection prevents saving same workout twice
- [ ] Loading state shows during save operation
- [ ] Success message displays after successful save

## WorkoutCard & WorkoutList Components
- [ ] Workout cards display title, category, difficulty, duration
- [ ] Exercise count shows correctly
- [ ] Filtering by category works (strength, cardio, flexibility, HIIT, mixed)
- [ ] Filtering by difficulty works (beginner, intermediate, advanced)
- [ ] Search by workout title returns correct results
- [ ] Delete workout confirmation dialog appears
- [ ] Workout deletion removes from database
- [ ] Responsive layout on mobile and desktop

## WorkoutLogForm Component
- [ ] Exercise search finds exercises from database
- [ ] Auto-complete dropdown shows relevant suggestions
- [ ] Can add multiple exercises to workout session
- [ ] Sets, reps, weight, duration inputs accept valid values
- [ ] Weight unit selector (lbs/kg) works correctly
- [ ] Intensity selection (low/medium/high) updates calorie estimates
- [ ] Real-time calorie calculation updates as inputs change
- [ ] Session timer displays and updates every second
- [ ] Can remove exercises from current session
- [ ] Form validation prevents submission with missing required fields
- [ ] Successfully saves workout log to database
- [ ] Workout totals display correctly (duration, calories, exercises)

## WorkoutLogHistory Component
- [ ] Displays chronological list of completed workouts
- [ ] Search by workout title works
- [ ] Search by exercise name works
- [ ] Intensity filter works (all/low/medium/high)
- [ ] Workout cards expand/collapse on click
- [ ] Detailed view shows all exercise data
- [ ] Analytics display correct totals (workouts, duration, calories)
- [ ] Weekly workout count calculates correctly
- [ ] Monthly workout count calculates correctly
- [ ] Most frequent intensity displays correctly
- [ ] Exercise details show sets, reps, weight, duration
- [ ] Exercise notes display when present

## ProgressPhotos Component
- [ ] Photo upload dialog opens
- [ ] Image file selection works (jpg, png, gif)
- [ ] Image preview displays after selection
- [ ] Date picker allows past dates only
- [ ] Caption field accepts text input
- [ ] Image compression reduces file size
- [ ] Upload saves to Supabase Storage
- [ ] Photo metadata saves to database
- [ ] Photo gallery displays uploaded images
- [ ] Photos show in chronological order by taken_at date
- [ ] Zoom/view dialog shows full-size image
- [ ] Delete confirmation dialog appears
- [ ] Photo deletion removes from storage and database
- [ ] File size validation (max 10MB)
- [ ] File type validation (images only)

## AI Workout Recommendation Tool
- [ ] Generates workout based on fitness goal (weight loss, muscle gain, etc.)
- [ ] Filters exercises by available equipment
- [ ] Respects time constraint (30, 45, 60 minutes)
- [ ] Adjusts difficulty based on fitness level
- [ ] Targets specific muscle groups when requested
- [ ] Provides diverse exercise selection (not all same muscle group)
- [ ] Includes warmup and cooldown recommendations
- [ ] Estimates calorie burn for workout
- [ ] Returns beginner-appropriate exercises for beginners
- [ ] Returns advanced exercises for advanced users
- [ ] Handles bodyweight-only equipment requests
- [ ] Handles multi-equipment requests

## Database Integration
- [ ] workout_plans save correctly with all fields
- [ ] workout_logs save with exercises_performed JSONB
- [ ] progress_photos save with correct user_id
- [ ] Row Level Security prevents viewing others' workouts
- [ ] Exercise database queries return correct results
- [ ] Calorie burn calculations use correct intensity values

## Edge Cases
- [ ] Empty workout name handling
- [ ] Workout with no exercises handling
- [ ] Exercise with missing calorie data
- [ ] Very short workout duration (<5 minutes)
- [ ] Very long workout duration (>3 hours)
- [ ] Special characters in workout titles
- [ ] Network errors during save
- [ ] Concurrent photo uploads
