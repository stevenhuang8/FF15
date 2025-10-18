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

### 6. Ingredients Not Saving in Pantry Page

**Issue**: Adding ingredients fails with database error about missing 'notes' column.

**Error**:
```
Database error: {
  code: 'PGRST204',
  details: null,
  hint: null,
  message: "Could not find the 'notes' column of 'ingredients' in the schema cache"
}
```

**Root Cause**: The `notes` column exists in the schema file (`supabase-schema.sql`) but was never created in the actual database.

**Solution**: Run the migration in `supabase-ingredients-notes-migration.sql` to add the missing column.

**Status**: Migration created, waiting for manual execution in Supabase dashboard.

---

### 7. Chat Assistant Cannot Access Pantry Ingredients

**Issue**: The chat assistant cannot see or retrieve the user's pantry ingredients, making it unable to suggest recipes based on available ingredients.

**Current State**:
- ✅ Stub tool exists: `generateRecipeFromIngredients` (components/agent/tools/generate-recipe-from-ingredients.ts)
- ❌ Not connected to chat API
- ❌ Not implemented - returns placeholder message
- ❌ No authentication/user context passing

**What Chat Assistant Currently Has**:
- Only `web_search` tool (OpenAI web search)
- No database access to ingredients table

**Required Implementation**:
1. Add `generateRecipeFromIngredients` tool to chat API (app/api/chat/route.ts)
2. Implement real database query to fetch user's ingredients from Supabase
3. Handle authentication - pass user session from chat to tool execution
4. Return structured ingredient data (name, quantity, unit, expiry date, category)
5. Optional: Prioritize expiring ingredients in the response

**Related Files**:
- `/app/api/chat/route.ts` - Chat API endpoint (needs tool added to configuration)
- `/components/agent/tools/generate-recipe-from-ingredients.ts` - Tool stub (needs implementation)
- `/app/api/ingredients/route.ts` - Ingredients API (can reference for DB queries)
- `/lib/supabase/server.ts` - Supabase server client

**User Impact**:
- Users cannot ask "What can I make with my ingredients?" and get accurate responses
- AI must rely on manual ingredient lists instead of accessing pantry data
- Missing core feature from Task 6: "Build AI-Powered Recipe Generation from Pantry"

**Status**: Deferred - tool exists but not yet implemented or connected.

---

### 8. Ingredient Quantity Input Issues

**Issue**: The ingredient quantity input field has usability problems that make it difficult to modify values.

**Impact**: Users struggle to input or modify ingredient quantities, leading to frustration and data entry errors.

**Specific Problems**:
- Users cannot delete/clear the quantity value
- Requires double-click to edit the number instead of single-click
- Input field may not be properly focused or editable on first interaction
- Poor UX for quick ingredient entry

**Related Files**:
- `/app/pantry/page.tsx` - Pantry page with ingredient management
- Add ingredient form/component (needs identification)
- May involve input component configuration or event handling

**Potential Solutions**:
- Ensure input field is properly focused and editable with single click
- Allow clearing the value with backspace/delete keys
- Consider using number input type with proper step/min/max attributes
- Add visual feedback when field is focused and editable

**Status**: Reported - needs investigation and fix.

---

### 9. Workout Exercise Input Not Working

**Issue**: When trying to log a workout, the "add exercises" button does not allow the user to type or suggest any workouts.

**Impact**: Users cannot log workouts because they cannot input exercise data.

**Specific Problems**:
- Input field may not be receiving focus
- Text input is not being captured or processed
- Autocomplete/suggestion feature may not be triggering
- Potential event handler issues preventing keyboard input

**Related Files**:
- Workout logging page/component (needs identification)
- Exercise input component (needs identification)
- May involve form state management issues

**Status**: Reported - needs investigation and fix.

---

### 10. Meal Food Items Input Not Working

**Issue**: When trying to log a meal, the "Add food items" button does not allow the user to type or suggest any food items. This is the same problem as the workout exercise input issue (#9).

**Impact**: Users cannot log meals because they cannot input food data.

**Specific Problems**:
- Input field may not be receiving focus
- Text input is not being captured or processed
- Autocomplete/suggestion feature may not be triggering
- Potential event handler issues preventing keyboard input
- Same underlying cause as workout exercise input issue

**Related Files**:
- Meal logging page/component (needs identification)
- Food item input component (needs identification)
- May involve shared form component with workout feature
- May involve form state management issues

**Status**: Reported - needs investigation and fix. Likely shares root cause with issue #9.

---

## Feature Requests

### 1. Multi-Agent Architecture with Specialized Sub-Agents

**Concept**: Implement specialized AI sub-agents for different cooking and recipe-related tasks to improve response quality and task specialization.

**Proposed Sub-Agents**:

1. **Cooking Assistant Agent**
   - Specializes in cooking techniques, timing, and methods
   - Provides step-by-step guidance during active cooking
   - Troubleshoots cooking issues in real-time
   - Explains "why" behind techniques (e.g., why sear meat first)

2. **Recipe Research Agent**
   - Deep research on specific dishes, cuisines, and techniques
   - Historical context and cultural background of recipes
   - Multiple recipe variations and regional differences
   - Professional chef techniques and tips

3. **Ingredient Substitution Agent**
   - Specialized in finding ingredient alternatives
   - Considers dietary restrictions, allergies, and preferences
   - Explains substitution ratios and how they affect the dish
   - Suggests multiple alternatives with pros/cons

4. **Nutrition Analysis Agent**
   - Calculates detailed nutritional information
   - Suggests healthier alternatives while maintaining flavor
   - Meal planning for specific dietary goals
   - Macro/micronutrient breakdowns

5. **Meal Planning Agent**
   - Weekly meal prep strategies
   - Grocery list optimization
   - Budget-conscious meal planning
   - Batch cooking recommendations

6. **Pantry Management Agent**
   - Inventory tracking and optimization
   - Expiry date monitoring and alerts
   - Recipe suggestions based on available ingredients
   - Waste reduction strategies

**Implementation Approach**:
- Create separate API routes for each agent type (e.g., `/api/agents/cooking`, `/api/agents/research`)
- Each agent has its own system prompt optimized for its specialty
- Each agent has access to relevant tools (e.g., nutrition agent gets calorie lookup tools)
- Main chat assistant can delegate to specialized agents when needed
- Use AI SDK's multi-agent patterns for coordination

**Benefits**:
- More accurate and detailed responses for specialized queries
- Better prompt engineering per domain
- Reduced context window usage (focused tools per agent)
- Ability to run multiple agents in parallel for complex tasks
- Clearer separation of concerns

**Technical References**:
- AI SDK Multi-Agent Patterns: https://sdk.vercel.ai/docs/ai-sdk-core/tools-and-tool-calling
- Manual Agent Loop Cookbook: https://ai-sdk.dev/cookbook/node/manual-agent-loop
- Existing multi-agent architecture in codebase: `/app/api/rag-agent/route.ts`

**Related Files**:
- `/components/agent/prompt.ts` - Base system prompt (template for sub-agents)
- `/app/api/chat/route.ts` - Main chat endpoint (coordination layer)
- `/components/agent/tools/` - Tools directory (can be specialized per agent)

**Status**: Proposed - needs architectural design and implementation plan.

---

## Technical Debt

_Document technical debt items here_
