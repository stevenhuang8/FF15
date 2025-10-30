# Fix Ingredients Table - Add Notes Column

## The Problem
The `ingredients` table in your Supabase database is missing the `notes` column, causing the PGRST204 error.

## Solution: Run This SQL in Supabase

### Step 1: Go to Supabase SQL Editor
1. Open your Supabase project dashboard
2. Navigate to **SQL Editor** (left sidebar)
3. Click **"New query"**

### Step 2: Run This SQL

```sql
-- Add the notes column to ingredients table
ALTER TABLE public.ingredients
ADD COLUMN IF NOT EXISTS notes TEXT;

-- Refresh PostgREST schema cache
NOTIFY pgrst, 'reload schema';

-- Verify the column exists
SELECT
  column_name,
  data_type,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
  AND table_name = 'ingredients'
  AND column_name = 'notes';
```

### Step 3: Click "Run" (or press Cmd+Enter / Ctrl+Enter)

### Expected Result
You should see output showing:
```
column_name | data_type | is_nullable | column_default
------------|-----------|-------------|---------------
notes       | text      | YES         | NULL
```

### Step 4: Test Again
After running this SQL:
1. Go back to your app
2. Try adding an ingredient with notes
3. It should work! ✅

## Alternative: Run via psql (if you have direct database access)

```bash
psql "your-connection-string" -f supabase-ingredients-notes-migration.sql
```

## Why This Happened
Your schema file (`supabase-schema.sql`) includes the `notes` column, but it wasn't actually created in the database. This migration adds the missing column.
