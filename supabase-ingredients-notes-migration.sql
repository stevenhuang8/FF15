-- ============================================================================
-- Add notes column to ingredients table
-- This fixes the PGRST204 "Could not find the 'notes' column" error
-- ============================================================================

-- 1. Add the notes column if it doesn't exist
ALTER TABLE public.ingredients
ADD COLUMN IF NOT EXISTS notes TEXT;

-- 2. Refresh PostgREST schema cache to pick up the new column
NOTIFY pgrst, 'reload schema';

-- 3. Verify the column was added successfully
DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
    AND table_name = 'ingredients'
    AND column_name = 'notes'
  ) THEN
    RAISE NOTICE '✅ SUCCESS: notes column exists in ingredients table';
  ELSE
    RAISE EXCEPTION '❌ FAILED: notes column not found in ingredients table';
  END IF;
END $$;

-- 4. Show the column details
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ingredients'
  AND column_name = 'notes';
