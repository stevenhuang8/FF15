# Development Notes & Known Issues

## Known Issues

### 1. Sources Disappear on Conversation History Refresh

**Issue**: When a conversation is loaded from history (page refresh), the sources that were displayed during the original conversation are not shown.

**Impact**: Users lose access to the reference sources/citations when returning to a previous conversation.

**Potential Causes**:
- Sources may not be properly persisted to the `messages` table in Supabase
- The `sources` JSON field in the database might not be populated correctly
- The frontend may not be correctly parsing/displaying sources from stored messages

**Related Files**:
- `/lib/supabase/conversations.ts` - Message persistence logic
- `/components/chat/chat-assistant.tsx` - Message display and sources rendering
- `/types/supabase.ts` - Database schema (messages table has `sources: Json | null` field)

---

### 2. No Account Deletion Option in Profile Settings

**Issue**: There is no way for users to delete their account from the profile settings page.

**Impact**: Users cannot exercise data deletion rights; violates common UX expectations for account management.

**Required Implementation**:
- Add "Delete Account" button/section in profile settings
- Implement confirmation dialog to prevent accidental deletions
- Create API endpoint to handle account deletion
- Cascade delete or handle orphaned data (conversations, messages, recipes, etc.)
- Consider Supabase RLS policies for safe deletion
- May need to use Supabase service role key for complete user deletion

**Related Files**:
- `/app/profile/page.tsx` - Profile page
- `/components/profile/profile-form.tsx` - Profile form component
- Will need new API route: `/app/api/delete-account/route.ts`

---

### 3. Chat History UI Issues

**Issue**: The chat history interface has several UI/UX problems that need to be addressed.

**Specific Problems**:
- Chat history list may not be properly styled or responsive
- Conversation titles/names may not be clearly displayed
- Date/time formatting could be improved for better readability
- No visual indication of conversation status (active, archived, etc.)
- Limited search/filter functionality for finding specific conversations
- Mobile responsiveness issues on smaller screens

**Related Files**:
- `/app/chat-history/page.tsx` - Chat history page component
- `/components/chat/conversation-list.tsx` - Conversation list component
- May need updates to styling and layout components

---

### 4. Chat UI/Conversation Interface Issues

**Issue**: The main chat interface has several UI improvements needed.

**Specific Problems**:
- Message bubbles may not have optimal spacing or visual hierarchy
- Code blocks and AI responses may not be properly formatted
- Tool usage indicators (when AI uses tools) may not be clearly visible
- Loading states during AI responses could be improved
- Message timestamps may not be clearly displayed
- Scroll behavior when new messages arrive may be jarring
- Mobile chat interface may not be optimized for touch interactions

**Related Files**:
- `/components/chat/chat-assistant.tsx` - Main chat interface
- `/components/ai-elements/` - Various AI response components (message, code-block, tool, etc.)
- May need updates to CSS/styling for better visual design

**Potential Improvements**:
- Better visual distinction between user and AI messages
- Improved code syntax highlighting and formatting
- Clearer tool usage indicators
- Smoother animations and transitions
- Better mobile responsiveness
- Enhanced accessibility features

---

### 5. Recipe Instruction Parsing Issues

**Issue**: The recipe extraction logic is not reliably parsing instructions from AI responses, particularly when instructions use "Steps:" as the header.

**Impact**: Users cannot save recipes because the validation fails when instructions are not detected, showing error "No instructions found".

**Specific Problems**:
- Instructions section headers ("Steps:", "Instructions:", "Directions:") are not consistently detected
- The string matching logic may be too strict or missing common variations
- Markdown formatting (bold, italic) in headers may interfere with detection
- Plain text instructions without numbered/bulleted lists may not be captured
- The 20-character minimum for instruction lines may exclude valid short steps

**Current Behavior**:
- User clicks "Save Recipe" button
- Extraction runs but fails validation
- Error message: "Recipe incomplete: No ingredients found, No instructions found"
- Recipe is not saved to database

**Debug Observations**:
- Console logs show extraction is running
- Headers like "Steps:" should be detected but aren't being recognized
- May need to review the exact text format being passed to extraction functions

**Related Files**:
- `/lib/recipe-extraction.ts` - Core extraction logic (extractInstructions function)
- `/components/recipe/save-recipe-button.tsx` - Triggers extraction and validation
- `/lib/recipe-detection.ts` - Helper for getting message text content

**Potential Solutions**:
- Simplify header detection to exact string matching instead of regex
- Strip all formatting/whitespace before comparison
- Add more variations of instruction headers
- Lower the minimum character threshold for instruction lines
- Add comprehensive debug logging to trace detection flow
- **Use AI SDK with structured output (`generateObject`) for recipe parsing** - Most robust solution:
  - Define a Zod schema for recipe structure (title, ingredients, instructions, etc.)
  - Use `generateObject()` to parse recipe text into structured data
  - Handles all edge cases, formatting variations, and natural language automatically
  - More reliable than regex-based parsing
  - Example: `generateObject({ model, schema: recipeSchema, prompt: "Extract recipe from: ..." })`
  - Requires AI SDK call (small cost, high reliability)
  - Reference: https://sdk.vercel.ai/docs/ai-sdk-core/generating-structured-data

**Status**: Partially addressed with explicit string matching, but still experiencing issues in production. AI SDK approach recommended for future improvement.

---

## Feature Requests

_Add future feature requests here_

---

## Technical Debt

_Document technical debt items here_
