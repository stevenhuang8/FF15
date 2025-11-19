# Image Persistence Implementation

## Summary

This implementation fixes the issue where user-uploaded images were not being displayed in the chat interface and adds database persistence so images are retained across page reloads.

## Changes Made

### 1. Frontend Display Fix (`components/chat/chat-assistant.tsx`)

**Problem:** Images were being filtered out when rendering messages, even though the `MemoizedMessage` component was designed to display them.

**Solution:** Updated the message rendering logic to include file parts (lines 726-731):

```typescript
const messageWithTextAndFiles = {
  ...message,
  parts: parts.filter((part: any) =>
    part.type === 'text' || part.type === 'file' || !part.type
  )
};
```

Previously, only `text` parts were included, which removed images from the display.

### 2. Database Persistence

#### Updated TypeScript Types (`types/supabase.ts`)

Added `attachments` field to the `messages` table type (lines 362-391):

```typescript
messages: {
  Row: {
    attachments: Json | null
    // ... other fields
  }
  Insert: {
    attachments?: Json | null
    // ... other fields
  }
  // ...
}
```

#### Updated Save Function (`lib/supabase/conversations.ts`)

Modified `saveMessage()` to accept and save attachments (lines 126-143):

```typescript
export async function saveMessage(data: {
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  toolCalls?: any;
  sources?: any;
  attachments?: any;  // NEW
}): Promise<{ data: Message | null; error: any }>
```

#### Updated Auto-Save Logic (`components/chat/chat-assistant.tsx`)

Added extraction and saving of file attachments (lines 544-546, 568):

```typescript
// Extract file attachments
const fileParts = (msg as any).parts?.filter((p: any) => p.type === 'file') || [];
const attachments = fileParts.length > 0 ? fileParts : null;

// Save with attachments
const { data: savedMsg, error } = await saveMessage({
  conversationId: convId,
  role: msg.role,
  content,
  toolCalls,
  sources,
  attachments  // NEW
});
```

#### Updated Message Loading (`components/chat/chat-assistant.tsx`)

Added restoration of attachments when loading conversations (lines 362-365):

```typescript
// Add file attachments if they exist
if (msg.attachments && Array.isArray(msg.attachments)) {
  parts.push(...msg.attachments);
}
```

## Next Steps - Database Migration

To complete the implementation, you need to add the `attachments` column to your Supabase database:

### Option 1: Using Supabase SQL Editor (Recommended)

1. Go to your Supabase Dashboard: https://supabase.com/dashboard
2. Select your project
3. Navigate to **SQL Editor** (left sidebar)
4. Run the SQL from `MIGRATION_add_attachments_column.sql`:

```sql
ALTER TABLE messages
ADD COLUMN IF NOT EXISTS attachments JSONB DEFAULT NULL;

COMMENT ON COLUMN messages.attachments IS 'Stores file/image attachments as JSON array of file parts';
```

5. Click **Run** to execute the migration

### Option 2: Using Supabase CLI (If you have it installed)

```bash
# Create migration
supabase migration new add_attachments_column

# Copy the SQL from MIGRATION_add_attachments_column.sql into the new migration file

# Apply migration
supabase db push
```

## Testing

After running the migration:

1. **Test Image Upload:**
   - Open your app and start a new conversation
   - Upload one or more images using the image upload button
   - Verify images are displayed in the chat immediately

2. **Test Persistence:**
   - Upload images and send a message
   - Refresh the page
   - Navigate back to the conversation
   - Verify images are still visible

3. **Test Multiple Images:**
   - Upload 2-3 images at once
   - Verify all images are displayed in a grid layout
   - Check that they persist after reload

## How It Works

### Image Flow

1. **User uploads image** → File selected via `<input type="file">`
2. **HEIC conversion** → Automatically converted to JPEG if needed
3. **Preview display** → Shown in sidebar (desktop) or inline (mobile)
4. **Send message** → Images converted to data URLs and included as `file` parts
5. **Display in chat** → `MemoizedMessage` component renders images in a grid
6. **Save to database** → File parts extracted and saved as JSON in `attachments` column
7. **Load from database** → Attachments restored and displayed when conversation loads

### Data Structure

Images are stored as file parts with this structure:

```typescript
{
  type: 'file',
  url: 'data:image/jpeg;base64,...',  // Base64 data URL
  mediaType: 'image/jpeg',
  name: 'photo.jpg'
}
```

These are saved in the database as a JSON array in the `attachments` column.

## Benefits

1. **Immediate visibility** - Images appear in chat as soon as they're sent
2. **Persistence** - Images survive page reloads and are available in conversation history
3. **No external storage needed** - Images stored as base64 data URLs in database
4. **Simple implementation** - Uses existing message parts structure
5. **Backward compatible** - Works with existing messages (attachments is nullable)

## Limitations

1. **Size limits** - Base64 encoding increases image size by ~33%
2. **Database storage** - Images stored in database, not object storage
3. **Max payload** - Limited by Supabase JSONB column size (~1GB, but practically much smaller)

For production use with many/large images, consider migrating to Supabase Storage with URL references instead of inline base64.

## Migration to Supabase Storage (Future Enhancement)

If you need to handle many large images, consider:

1. Upload images to Supabase Storage
2. Store URLs instead of base64 data
3. Add file size limits and validation
4. Implement automatic cleanup of orphaned images

This would require additional changes to the upload and save logic.
