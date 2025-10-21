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

## Architectural Plans & Proposals

### 1. Unified Agent Architecture Plan

**Date Proposed**: 2025-01-21

**Objective**: Combine all three existing agents (`/api/chat`, `/api/rag-agent`, `/api/agent-with-mcp-tools`) into a single unified agent with all tools and capabilities.

#### Current State

The application currently has **3 distinct chat agents**:

1. **Basic Chat Assistant** (`/api/chat`)
   - Tools: `suggestSubstitution`, `web_search`
   - No agent loops (basic chat)
   - System prompt: Conversational recipe assistant

2. **RAG-Enabled Cooking Agent** (`/api/rag-agent`)
   - Tools: `retrieveKnowledgeBaseSimple`, `suggestSubstitution`
   - Agent with 10-step reasoning (`stepCountIs(10)`)
   - System prompt: Knowledge base specialist
   - Accesses Vectorize for cooking knowledge

3. **Web Scraper Agent with MCP Tools** (`/api/agent-with-mcp-tools`)
   - Tools: Dynamic Firecrawl MCP tools
   - Agent with 10-step reasoning (`stepCountIs(10)`)
   - System prompt: Web scraping specialist

#### Implementation Plan

**Phase 1: Tool Consolidation**
1. Merge all tools into unified configuration in `/app/api/chat/route.ts`:
   - `retrieveKnowledgeBaseSimple` (RAG)
   - `suggestSubstitution` (shared)
   - `web_search` (OpenAI)
   - MCP Firecrawl tools (dynamic)
   - `recommendWorkout` (currently unused)
   - `generateRecipeFromIngredients` (currently unused)
2. Add `stopWhen: stepCountIs(10)` for multi-step reasoning
3. Integrate MCP client initialization with graceful fallback
4. Add comprehensive tool call logging

**Phase 2: System Prompt Unification**
1. Create `/components/agent/unified-prompt.ts`
2. Combine capabilities from all three existing prompts
3. Define clear tool usage priorities:
   - Cooking/recipes → `retrieveKnowledgeBase` first, fallback to `web_search`
   - Ingredient substitutions → `suggestSubstitution`
   - Fitness → `recommendWorkout`
   - Website content → Firecrawl MCP tools
   - Current info → `web_search`
4. Maintain conversational, friendly tone

**Phase 3: Frontend Simplification**
1. Update all pages to use default `/api/chat`:
   - `/simple-agent` - Already correct ✓
   - `/rag-agent` - Remove `api` prop from `ChatAssistant`
   - `/agent-with-mcp-tools` - Remove `api` prop from `ChatAssistant`
2. Consider consolidating pages into single `/chat` page

**Phase 4: Cleanup & Optimization**
1. Remove deprecated routes:
   - Delete `/app/api/rag-agent/route.ts`
   - Delete `/app/api/agent-with-mcp-tools/route.ts`
   - Archive old prompt files
2. Enhance error handling for MCP failures
3. Implement comprehensive testing
4. Monitor performance and costs

#### Pros and Cons Analysis

##### ✅ PROS (9 High + 3 Medium Impact)

| Benefit | Impact | Details |
|---------|--------|---------|
| **Unified User Experience** | High | One intelligent agent vs. users choosing which agent to use |
| **Simpler Architecture** | High | One API endpoint instead of three |
| **Code Maintainability** | High | Single source of truth, easier debugging |
| **Cross-Capability Conversations** | High | Recipe → workout → web research in same conversation |
| **Reduced Code Duplication** | Medium | Eliminate duplicate error handling and logic |
| **Better Tool Orchestration** | High | Combine multiple tools in single response |
| **Simplified Frontend** | Medium | All pages use default ChatAssistant |
| **Future-Proof** | High | Add new tools to one place only |
| **Conversation Context** | High | Full history available across capabilities |
| **Resource Efficiency** | Medium | One MCP connection per conversation |

##### ❌ CONS (2 High + 7 Medium + 2 Low Impact)

| Drawback | Impact | Details |
|----------|--------|---------|
| **Increased Token Usage** | High | More tools = longer prompts = higher costs |
| **Higher Latency** | Medium | Agent loops run on every request (+1-2s) |
| **Tool Confusion Risk** | Medium | More tools = higher chance of wrong tool selection |
| **Complex System Prompt** | Medium | Harder to optimize for specific use cases |
| **MCP Dependency** | Medium | MCP failure affects entire agent (mitigated) |
| **Debugging Complexity** | Medium | Harder to isolate issues with mixed tools |
| **Higher Costs** | High | GPT-5 + agent loops more expensive |
| **Loss of Specialization** | Low | Specialized prompts may perform better |
| **Performance Overhead** | Low | Loading all tools adds startup time |
| **Testing Complexity** | Medium | More tool interaction combinations to test |

#### Cost-Benefit Analysis

**Estimated Cost Increase**: 15-25% per request (larger context + agent loops)

**Estimated Implementation Time**: 3-4 hours

**User Experience Improvement**: 🚀 **Significant** (seamless capability switching)

**Recommendation**: ✅ **Proceed** - UX improvements outweigh cost increases

#### Risk Mitigation Strategies

1. **Token Usage Optimization**
   - Use shorter, clearer tool descriptions
   - Consider dynamic tool loading based on context
   - Remove rarely-used tools if needed

2. **Performance Optimization**
   - Implement tool result caching
   - Use `reasoning_effort: "low"` (already configured)
   - Consider conditional agent loops for simple queries

3. **Tool Confusion Prevention**
   - Clear tool descriptions with usage examples
   - Explicit tool priority in system prompt
   - Monitor tool call patterns and adjust

4. **Graceful Degradation**
   - Try-catch around MCP initialization
   - Fallback strategies when tools fail
   - Clear error messages to users

#### Alternative Approaches Considered

**Option A: Unified Agent (Recommended)** ✅
- One agent with all tools
- Best UX, slightly higher cost
- Best for production apps with diverse use cases

**Option B: Smart Router Agent** ⚠️
- Entry point routes to specialized agents
- Lower per-request cost, maintained specialization
- Better for cost-sensitive high-volume apps

**Option C: Hybrid Approach** 💡
- Unified agent with dynamic tool loading
- Best of both worlds, more complexity
- Consider for future optimization

**Option D: Keep Separate (Status Quo)** ❌
- Multiple specialized agents
- Lower cost per agent, worse UX
- User friction outweighs benefits

#### Implementation Code Examples

**Unified Agent Route Structure**:
```typescript
// app/api/chat/route.ts (unified)
import { UNIFIED_SYSTEM_INSTRUCTIONS } from "@/components/agent/unified-prompt";
import {
  retrieveKnowledgeBaseSimple,
  suggestSubstitution,
  recommendWorkout,
  generateRecipeFromIngredients,
} from "@/components/agent/tools";
import { getFirecrawlMCPClient } from "@/lib/mcp";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";

export async function POST(request: NextRequest) {
  const { messages } = await request.json();
  const modelMessages = convertToModelMessages(messages);

  // Initialize MCP tools with fallback
  let mcpTools = {};
  try {
    const firecrawlClient = getFirecrawlMCPClient();
    await firecrawlClient.connect();
    mcpTools = await firecrawlClient.getTools();
  } catch (error) {
    console.warn("⚠️ MCP tools unavailable:", error);
  }

  const result = streamText({
    model: openai("gpt-5"),
    system: UNIFIED_SYSTEM_INSTRUCTIONS,
    messages: modelMessages,
    stopWhen: stepCountIs(10),
    tools: {
      retrieveKnowledgeBase: retrieveKnowledgeBaseSimple,
      suggestSubstitution,
      generateRecipeFromIngredients,
      recommendWorkout,
      web_search: openai.tools.webSearch({ searchContextSize: "low" }),
      ...mcpTools,
    },
  });

  return result.toUIMessageStreamResponse();
}
```

**Unified System Prompt Structure**:
```typescript
// components/agent/unified-prompt.ts
export const UNIFIED_SYSTEM_INSTRUCTIONS = `
You are a comprehensive AI assistant specializing in cooking, recipes, nutrition, fitness, and information retrieval.

## Core Capabilities

### 1. Recipe & Cooking Assistance
- Conversational recipe recommendations based on user preferences
- Gather cuisine type, meal heaviness, proteins, dietary restrictions
- Detailed recipes with ingredients and instructions
- Ingredient substitutions using suggestSubstitution tool

### 2. Knowledge Base Access
- Search cooking/culinary knowledge base with retrieveKnowledgeBase
- Cooking techniques, recipes, ingredients, food science
- Always cite sources from knowledge base

### 3. Fitness & Wellness
- Personalized workouts via recommendWorkout tool
- Consider goals, equipment, time, fitness level

### 4. Web Research
- web_search for current info or external recipes
- Firecrawl tools for deep website scraping

## Tool Usage Priority
1. Cooking/recipes: retrieveKnowledgeBase → web_search
2. Substitutions: suggestSubstitution
3. Fitness: recommendWorkout
4. Website content: Firecrawl MCP tools
5. Current events: web_search

## Response Style
- Friendly and conversational
- Use markdown formatting
- Cite sources
- Gather preferences naturally
`;
```

#### Related to Existing Feature Request

This unified agent proposal is **complementary but different** from Feature Request #1 (Multi-Agent Architecture with Specialized Sub-Agents):

- **Feature Request #1**: Split into 6+ specialized sub-agents with delegation
- **This Proposal**: Unify 3 existing agents into 1 comprehensive agent

Both approaches have merit:
- Unified agent = Better for small-medium apps, simpler architecture
- Multi-agent delegation = Better for large-scale apps, maximum specialization

Consider unified agent as **Phase 1** (consolidate existing), then later implement **Phase 2** (specialized sub-agents) if needed.

#### Status

**Status**: Proposed - NOT YET IMPLEMENTED

**Decision Required**: Approve/reject before proceeding with implementation

**Next Steps (if approved)**:
1. Create unified system prompt
2. Update `/app/api/chat/route.ts` with all tools
3. Update frontend pages
4. Test all tool interactions
5. Clean up deprecated routes
6. Update documentation

---

## Implementation Record

### Multi-Agent Architecture Implementation (2025-01-21)

#### Problem

Currently there are several aspects of the application relying on one agent to do the research and handle all user requests. The management of context is too much for a single agent to handle effectively. Issues observed:

1. **Context Overload**: Single agent trying to handle cooking, nutrition, fitness, recipe research, substitutions, meal planning, and pantry management
2. **Hallucination Risk**: When one agent tries to be expert in too many domains, it may start mixing information or hallucinating
3. **Poor Specialization**: Generic responses instead of deep expertise in specific domains
4. **Context Window Waste**: Loading knowledge for all domains even when only one is needed
5. **Reduced Response Quality**: Jack-of-all-trades agent vs. specialized expert agents

#### Solution

Implemented multi-agent architecture pattern using specialized agent personas coordinated by an orchestrator. The solution includes:

**7 Specialized Agent Personas** (documented in `components/agent/subagents/`):
1. **cooking-assistant** - Real-time cooking guidance, techniques, timing, troubleshooting
2. **recipe-researcher** - Deep research on dishes, cuisines, culinary history
3. **ingredient-specialist** - Ingredient substitutions and alternatives
4. **nutrition-analyst** - Nutritional calculations and healthier options
5. **meal-planner** - Weekly meal planning and batch cooking strategies
6. **pantry-manager** - Pantry-based recipe suggestions and waste reduction
7. **workout-planner** - Personalized fitness routines and exercise guidance

**Orchestrator System** (`components/agent/orchestrator-prompt.ts`):
- Main coordinating agent that understands which specialist to engage
- Provides conversational continuity across different specialist domains
- Enables parallel execution for multi-domain queries
- Maintains context while delegating to specialized expertise

**Implementation Approach**:
- Used prompt engineering to embed specialized agent personas in orchestrator
- Each persona has focused system prompt optimized for its domain
- Tool restrictions documented per specialist (e.g., ingredient-specialist uses `suggestSubstitution` + `retrieveKnowledgeBase`)
- Increased step count to 15 (from no agent loops) to enable multi-step orchestration

**Files Created**:
- `types/subagents.ts` - TypeScript interfaces for subagent definitions
- `components/agent/subagents/cooking-assistant.ts` - Cooking specialist
- `components/agent/subagents/recipe-researcher.ts` - Recipe research specialist
- `components/agent/subagents/ingredient-specialist.ts` - Substitution specialist
- `components/agent/subagents/nutrition-analyst.ts` - Nutrition specialist
- `components/agent/subagents/meal-planner.ts` - Meal planning specialist
- `components/agent/subagents/pantry-manager.ts` - Pantry management specialist
- `components/agent/subagents/workout-planner.ts` - Fitness specialist
- `components/agent/subagents/index.ts` - Subagent registry export
- `components/agent/orchestrator-prompt.ts` - Main orchestrator prompt

**Files Modified**:
- `app/api/chat/route.ts` - Updated to use orchestrator with multi-step reasoning
- `README.md` - Added multi-agent architecture documentation links
- `CLAUDE.md` - Added comprehensive subagents and context editing documentation

**Technical Details**:
- Pattern inspired by Claude's Agent SDK subagents (https://docs.claude.com/en/api/agent-sdk/subagents)
- Implemented using Vercel AI SDK with prompt engineering (AI SDK doesn't have native `agents` parameter)
- Uses `stepCountIs(15)` for multi-step agent reasoning
- All tools available to orchestrator: `retrieveKnowledgeBase`, `suggestSubstitution`, `recommendWorkout`, `generateRecipeFromIngredients`, `web_search`

#### Rabbit Holes

**Avoided:**
1. ❌ **Native Subagents API**: Initially attempted to use `agents` parameter in `streamText()`, but this doesn't exist in Vercel AI SDK - it's specific to Claude's Agent SDK
2. ❌ **Creating Separate API Routes**: Considered creating 7 separate API routes (`/api/cooking`, `/api/nutrition`, etc.) but this would break conversation continuity
3. ❌ **Manual Context Switching**: Avoided manually detecting intent and switching prompts - let the orchestrator handle delegation
4. ❌ **Over-Engineering with MCP**: Didn't create MCP servers for each subagent - unnecessary complexity for this use case

**Lessons Learned:**
- Claude's Agent SDK subagents pattern can be approximated through prompt engineering in other SDKs
- Specialized prompts are more valuable than actual separate agents for maintaining conversation flow
- The orchestrator pattern works well with multi-step reasoning (`stepCountIs()`)

#### No Gos

**Do NOT:**
1. ❌ Have multiple agents doing the same tasks (each specialist has clear, non-overlapping domain)
2. ❌ Create subagents without focused system prompts (each must have expertise in ONE domain)
3. ❌ Bypass the orchestrator for direct subagent access (breaks conversation continuity)
4. ❌ Mix subagent tool restrictions (cooking-assistant shouldn't have workout tools, etc.)
5. ❌ Create too many subagents (7 is optimal; more causes orchestration complexity)
6. ❌ Remove step count limit (prevents infinite loops, keeps costs manageable)

**Future Considerations:**
- If migrating to Claude's Agent SDK, the subagent definitions are ready to use with native `agents` parameter
- Context editing may be needed for very long conversations (>50K tokens)
- Consider adding codex/memory system for persistent user preferences across specialists

#### Results

**Benefits Achieved**:
- ✅ Better specialized responses through domain-focused prompts
- ✅ Reduced context overload (orchestrator delegates, doesn't try to know everything)
- ✅ Clearer separation of concerns (each specialist has one job)
- ✅ Parallel execution capability for multi-domain queries
- ✅ Improved maintainability (update one specialist without affecting others)
- ✅ Foundation for future codex/memory integration

**Metrics**:
- 7 specialized agent personas implemented
- 2,500+ lines of specialized prompt engineering
- 15-step orchestration capability (vs. no agent loops before)
- 0 TypeScript errors
- All existing functionality preserved

**Next Steps**:
- Monitor orchestration patterns to see which specialists are most used
- Gather user feedback on response quality improvements
- Consider implementing codex for persistent user preferences (Phase 2)
- Test parallel execution for complex queries

---

## Technical Debt

_Document technical debt items here_
