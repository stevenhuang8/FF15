-- Migration: Add attachments column to messages table
-- Date: 2025-11-19
-- Purpose: Store image/file attachments with chat messages

-- Add attachments column to messages table
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL;

-- Add comment to column for documentation
COMMENT ON COLUMN messages.attachments IS 'Stores file/image attachments as JSON array of file parts';

-- Optional: Add index for better query performance if querying by attachments
-- CREATE INDEX IF NOT EXISTS idx_messages_attachments ON messages USING GIN (attachments);
