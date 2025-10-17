-- Refresh PostgREST schema cache to pick up the notes column
-- This fixes the PGRST204 error when the column exists but cache is stale

-- Option 1: Notify PostgREST to reload the schema cache
NOTIFY pgrst, 'reload schema';

-- Option 2: If the above doesn't work, check if column exists
SELECT column_name, data_type, character_maximum_length
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ingredients'
  AND column_name = 'notes';
