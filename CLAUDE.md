# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Development Commands

- `pnpm dev` - Start development server with Turbopack
- `pnpm build` - Build production app with Turbopack
- `pnpm start` - Start production server
- `pnpm tsc --noEmit` - Run TypeScript compiler to check for type errors

## Code Quality

**IMPORTANT**: Always run `pnpm tsc --noEmit` after writing or modifying any code to ensure there are no TypeScript errors before considering the task complete.

## Package Manager

This project strictly uses **pnpm**. Do not use npm or yarn.

## Architecture

This is a TypeScript Next.js 15 starter template for AI-powered applications with a travel agent theme:

### Core Stack

- **Next.js 15** with App Router and Turbopack for fast builds
- **AI SDK 5** with OpenAI GPT-5 integration and web search tool
- **Vectorize** for RAG document retrieval from your knowledge base
- **shadcn/ui** components (New York style, neutral base color)
- **Tailwind CSS v4** for styling

### Key Directories

- `app/` - Next.js App Router pages and API routes
- `app/api/chat/` - AI chat endpoint using streaming `streamText()`
- `app/api/rag-agent/` - RAG-enabled agent endpoint with knowledge base access
- `components/chat/` - Chat interface components
- `components/ai-elements/` - Vercel AI Elements components
- `components/agent/` - Agent configuration (system prompts)
  - `prompt.ts` - Default Cooking and Recipes agent system prompt
  - `rag-prompt.ts` - RAG agent system prompt for cooking and recipes
- `components/agent/tools/` - AI SDK tools for agent capabilities (knowledge base retrieval, etc.)
- `components/ui/` - shadcn/ui components
- `lib/retrieval/` - Vectorize RAG service for document retrieval
- `lib/utils.ts` - Utility functions including `cn()` for className merging
- `types/` - TypeScript type definitions

### AI Integration

- Uses AI SDK 5's `streamText()` for streaming responses
- Configured for GPT-5 via OpenAI provider with web search tool enabled
- Vectorize RAG integration via `VectorizeService` in `/lib/retrieval/`
- System instructions defined in `components/agent/prompt.ts` (travel agent theme)
- API route at `/api/chat` expects `{ messages: Array }` and returns streaming text
- RAG-enabled agent at `/api/rag-agent` includes `retrieveKnowledgeBase` tool for knowledge base access
- use useChat for all streaming handling (read the doc first, always, before writing any streaming code: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- **CRITICAL**: `sendMessage()` from useChat ONLY accepts UIMessage-compatible objects: `sendMessage({ text: "message" })`
- **NEVER** use `sendMessage("string")` - this does NOT work and will cause runtime errors
- Messages from useChat have a `parts` array structure, NOT a simple `content` field
- Tool calls and sources are supported in the response format
- Requires environment variables in `.env.local`
- Reference: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text#streamtext

### AI SDK Tools

**CRITICAL REQUIREMENT**: You MUST read the AI SDK tools documentation before working with tools: https://ai-sdk.dev/docs/ai-sdk-core/tools-and-tool-calling

**ALSO REQUIRED**: Read the manual agent loop cookbook for advanced patterns: https://ai-sdk.dev/cookbook/node/manual-agent-loop

This documentation is essential for understanding:
- How tools are called by language models
- Tool execution flow and lifecycle
- Tool choice strategies (`auto`, `required`, `none`, specific tool)
- Multi-step tool calling with `stopWhen` and `stepCountIs()`
- Tool call monitoring and error handling
- Manual agent loops for complex tool workflows

#### Data Streaming with Tools

**IMPORTANT**: Always read the AI SDK data streaming documentation when working with custom data parts: https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data

##### Streaming Sources and Custom Data

When tools return structured data (like sources from RAG retrieval), the data is automatically streamed as part of the tool call response:

```typescript
// Tool that returns sources
export const retrieveKnowledgeBase = tool({
  description: 'Search the knowledge base',
  inputSchema: z.object({
    query: z.string(),
  }),
  execute: async ({ query }) => {
    // ... retrieve documents ...
    return {
      context: 'Document content here',
      sources: [
        { url: 'https://example.com', title: 'Source 1', snippet: 'Preview text' }
      ]
    };
  },
});
```

The returned data is automatically included in the tool call result and streamed to the client.

**Frontend Access Pattern**:
```typescript
// Extract sources from tool results in the UI
const ragToolCalls = message.parts?.filter(
  part => part.type === "tool" && part.toolName === "retrieveKnowledgeBase" && part.result?.sources
);

const sources = ragToolCalls?.flatMap(tool => tool.result?.sources || []) || [];
```

**Chat Component with Custom API Endpoint**:
```typescript
// Use ChatAssistant with custom API endpoint
<ChatAssistant api="/api/rag-agent" />

// ChatAssistant component supports optional api prop
interface ChatAssistantProps {
  api?: string;
}

const { messages, status, sendMessage } = useChat({
  transport: api ? new DefaultChatTransport({ api }) : undefined,
});
```

##### Types of Streamable Data

1. **Tool Results**: Automatically streamed when tools return data
2. **Sources**: Can be included in tool results for RAG implementations
3. **Custom Data Parts**: Can be streamed using `streamData` for more complex scenarios

##### Best Practices

- Keep tool return types simple to avoid TypeScript deep instantiation errors
- Include sources directly in tool results for automatic streaming
- Use the `toUIMessageStreamResponse()` method for proper client compatibility
- Tool results are automatically included in the message parts array

#### Current AI SDK API (v5.0.44+)

**IMPORTANT**: The AI SDK API has evolved. Always use current patterns:

##### Multi-Step Tool Execution with `stepCountIs()`

```typescript
const result = streamText({
  model: openai("gpt-5"),
  messages: modelMessages,
  tools: { retrieveKnowledgeBase },
  stopWhen: stepCountIs(10), // CURRENT API - replaces deprecated maxSteps
});
```

##### Tool Choice Strategies

Control how and when tools are called using the `toolChoice` parameter:

```typescript
const result = streamText({
  model: openai("gpt-5"),
  messages: modelMessages,
  tools: { retrieveKnowledgeBase },
  toolChoice: 'auto', // Options: 'auto', 'required', 'none', or specific tool name
  stopWhen: stepCountIs(5),
});
```

- **`auto` (default)**: Model decides whether to call tools based on context
- **`required`**: Model must call at least one tool before responding
- **`none`**: Disable all tool calls
- **Specific tool**: Force a particular tool to be called

##### Converting Tool Results to Source Data Parts

**Current Limitation (v5.0.44)**: The `response.steps` API is not yet available in the current version. Sources are currently displayed from tool results embedded in message parts.

```typescript
// Current working approach (v5.0.44)
const result = streamText({
  model: openai("gpt-5"),
  messages: modelMessages,
  tools: { retrieveKnowledgeBase },
  stopWhen: stepCountIs(10),
});

return result.toUIMessageStreamResponse();

// Frontend extracts sources from tool results in message parts
// See ChatAssistant component for implementation
```

**Future Implementation** (when `response.steps` becomes available):
```typescript
const stream = createUIMessageStream({
  execute: async ({ writer }) => {
    const result = streamText({
      model: openai("gpt-5"),
      messages: modelMessages,
      tools: { retrieveKnowledgeBase },
      stopWhen: stepCountIs(10),
    });

    writer.merge(result.toUIMessageStream());

    // This will work when response.steps is available
    const response = await result.response;
    for (const step of response.steps || []) {
      if (step.toolResults) {
        for (const toolResult of step.toolResults) {
          if (toolResult.toolName === 'retrieveKnowledgeBase') {
            for (const source of toolResult.output?.sources || []) {
              writer.write({
                type: 'source-url', // Correct type for current version
                url: source.url,
                title: source.title
              });
            }
          }
        }
      }
    }
  }
});
```

#### Tool Implementation Guidelines

- **Location**: All agent tools are in `/components/agent/tools/`
- **Structure**: Each tool uses AI SDK's `tool()` function with:
  - `description`: Clear explanation of the tool's purpose (influences tool selection)
  - `inputSchema`: Zod schema defining input parameters
  - `execute`: Async function performing the tool's action
- **Current Tools**:
  - `retrieveKnowledgeBase`: Searches the Vectorize knowledge base for relevant information
  - `web_search`: OpenAI's web search tool for current information

#### Creating New Tools and Agents

**IMPORTANT**: When building more agent and tools functionality, ALWAYS follow the existing patterns in `/components/agent/` and `/components/agent/tools/` folders. Study the existing implementations before creating new ones.

When creating new tools:
1. Create a new file in `/components/agent/tools/`
2. Use the `tool()` function from `ai` package
3. Define clear Zod input schemas with descriptions
4. Implement error handling in the `execute` function
5. Export from `/components/agent/tools/index.ts`
6. Add the tool to the appropriate API route's tools configuration

When creating new agents:
1. Follow the pattern established in `/app/api/rag-agent/route.ts`
2. Create new prompts in `/components/agent/` following the structure of `prompt.ts` and `rag-prompt.ts`
3. Use the same streaming patterns and error handling as existing agents
4. Always include proper tool configurations and import from `/components/agent/tools`

Example:
```typescript
import { tool } from 'ai';
import { z } from 'zod';

export const myTool = tool({
  description: 'Clear description of what the tool does',
  inputSchema: z.object({
    param: z.string().describe('What this parameter is for')
  }),
  execute: async ({ param }) => {
    // Tool implementation with logging
    console.log(`🔧 Tool called with param: ${param}`);
    return { result: 'data' };
  }
});
```

#### Tool Call Monitoring

Add logging in tools to monitor execution:

```typescript
// In tool execute function
execute: async ({ query }) => {
  console.log(`🔍 Tool executing with query: "${query}"`);
  try {
    const result = await performAction(query);
    console.log(`✅ Tool completed successfully`);
    return result;
  } catch (error) {
    console.error(`💥 Tool error:`, error);
    throw error;
  }
}
```

#### Tool Call UI Indicators

Display tool execution states using AI Elements:

```typescript
// In ChatAssistant component
{message.parts?.filter(part => part.type === "tool").map((part, i) => {
  const toolState = part.result
    ? "output-available"
    : part.input
      ? "input-available"
      : "input-streaming";

  return (
    <Tool defaultOpen={true}>
      <ToolHeader type={`tool-${part.toolName}`} state={toolState} />
      <ToolContent>
        {part.input && <ToolInput input={part.input} />}
        {part.result && <ToolOutput output={part.result} />}
        {toolState === "input-streaming" && (
          <div>🔍 Searching knowledge base...</div>
        )}
      </ToolContent>
    </Tool>
  );
})}
```

#### Tool Call Best Practices

- **Clear Descriptions**: Write detailed descriptions to help the model choose the right tool
- **Specific Input Schemas**: Use descriptive Zod schemas with `.describe()` for parameters
- **Error Handling**: Always wrap tool execution in try-catch blocks
- **Logging**: Add console logging to track tool usage and debug issues
- **Return Structure**: Keep return types simple to avoid TypeScript complexity
- **UI Feedback**: Always show tool execution state using AI Elements components

### Multi-Agent Architecture with Subagents

**CRITICAL DOCUMENTATION**: Before working with subagents, read these essential resources:
- **Subagents Guide**: https://docs.claude.com/en/api/agent-sdk/subagents
- **Context Editing**: https://docs.claude.com/en/docs/build-with-claude/context-editing

#### Overview

Subagents are specialized AI assistants orchestrated by a main agent. They maintain **separate contexts** to prevent information overload while enabling focused task execution.

**Key Benefits:**
- **Context Isolation**: Each subagent has its own context, keeping the main conversation clean
- **Parallel Execution**: Multiple subagents can run simultaneously (e.g., recipe research + nutrition analysis in parallel)
- **Specialization**: Each subagent has custom system prompts optimized for specific domains
- **Tool Restrictions**: Limit subagent capabilities for security and focus
- **Scalability**: Easy to add new specialized subagents without affecting existing ones

#### Implementation Approach

**This application uses the programmatic approach** (recommended by Claude docs) rather than filesystem-based definitions.

**Subagent Definition Structure:**
```typescript
interface SubagentDefinition {
  description: string;  // CRITICAL: Determines when agent is invoked
  prompt: string;       // System prompt defining role and expertise
  tools?: string[];     // Optional: Restrict to specific tools
  model?: string;       // Optional: Use different model (default inherits main)
}
```

#### Subagent Directory Structure

```
components/agent/
├── subagents/                      # Subagent definitions
│   ├── cooking-assistant.ts        # Real-time cooking guidance
│   ├── recipe-researcher.ts        # Deep recipe research
│   ├── ingredient-specialist.ts    # Ingredient substitutions
│   ├── nutrition-analyst.ts        # Nutritional analysis
│   ├── meal-planner.ts            # Meal planning and prep
│   ├── pantry-manager.ts          # Pantry-based suggestions
│   ├── workout-planner.ts         # Fitness planning
│   └── index.ts                   # Export registry
├── tools/                          # Tool implementations
├── prompt.ts                       # Legacy single-agent prompt
└── orchestrator-prompt.ts         # Main orchestrator prompt
```

#### Tool Restrictions Best Practices

Based on Claude docs, restrict tools by subagent role:

```typescript
// Read-only analysis
tools: ['Read', 'Grep', 'Glob', 'retrieveKnowledgeBase']

// Research with web access
tools: ['retrieveKnowledgeBase', 'web_search']

// Specialized domain tools
tools: ['suggestSubstitution', 'retrieveKnowledgeBase']

// Full access (omit tools field)
// Inherits all available tools from main agent
```

#### Automatic vs Explicit Invocation

**Automatic (Recommended):**
The main agent automatically selects subagents based on task context. Write clear, specific descriptions:

```typescript
description: 'Use PROACTIVELY when user asks about cooking techniques, timing, or troubleshooting. MUST BE USED for active cooking guidance.'
```

**Explicit:**
Users can request specific subagents:
- "Use the recipe-researcher to tell me about carbonara history"
- "Have the nutrition-analyst calculate macros for this recipe"

#### Parallel Execution Pattern

Multiple subagents can execute simultaneously for complex queries:

```typescript
// User: "What's the history of carbonara and is it healthy?"
// Main agent delegates to TWO subagents in parallel:
// - recipe-researcher: Handles history and cultural context
// - nutrition-analyst: Calculates nutritional information
// Both run simultaneously, reducing response time by ~50%
```

#### Application-Specific Subagents

This cooking/fitness app implements 7 specialized subagents:

1. **cooking-assistant**: Real-time cooking guidance, timing, troubleshooting
2. **recipe-researcher**: Deep research on recipes, cuisines, techniques, history
3. **ingredient-specialist**: Ingredient substitutions and alternatives
4. **nutrition-analyst**: Nutritional calculations and healthier alternatives
5. **meal-planner**: Weekly meal prep, grocery lists, batch cooking
6. **pantry-manager**: Pantry-based recipe suggestions, inventory optimization
7. **workout-planner**: Personalized fitness routines and exercise guidance

**Tool Access per Subagent:**
- `cooking-assistant`: retrieveKnowledgeBase, web_search
- `recipe-researcher`: retrieveKnowledgeBase, web_search, Firecrawl MCP tools
- `ingredient-specialist`: suggestSubstitution, retrieveKnowledgeBase
- `nutrition-analyst`: retrieveKnowledgeBase, web_search
- `meal-planner`: generateRecipeFromIngredients, retrieveKnowledgeBase
- `pantry-manager`: generateRecipeFromIngredients, retrieveKnowledgeBase
- `workout-planner`: recommendWorkout, retrieveKnowledgeBase

#### Integration Pattern

**Main Chat API Route:**
```typescript
import { streamText, convertToModelMessages, stepCountIs } from 'ai';
import { ORCHESTRATOR_PROMPT } from '@/components/agent/orchestrator-prompt';
import { SUBAGENTS } from '@/components/agent/subagents';

const result = streamText({
  model: openai('gpt-5'),
  system: ORCHESTRATOR_PROMPT,
  messages: modelMessages,
  stopWhen: stepCountIs(15), // More steps for multi-agent orchestration
  tools: { /* all available tools */ },
  agents: SUBAGENTS, // Programmatic subagent definitions
});
```

#### Context Editing for Long-Running Agents

**When to Use:**
- Long conversations with many tool calls
- Multi-step agent loops that might exceed context limits
- Cost optimization for high-volume applications

**Implementation (Future Enhancement):**

Context editing requires Anthropic's SDK directly. Example for future integration:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

const response = await anthropic.messages.create({
  model: 'claude-sonnet-4-5-20250929',
  max_tokens: 4096,
  betas: ['context-management-2025-06-27'],
  context_management: {
    edits: [
      {
        type: 'clear_tool_uses_20250919',
        trigger: { type: 'input_tokens', value: 50000 },
        keep: { type: 'tool_uses', value: 5 },
        exclude_tools: ['retrieveKnowledgeBase'], // Keep RAG results
      }
    ]
  },
  messages: conversationHistory,
});
```

**Configuration Options:**
- `trigger`: When to start clearing (default: 100K tokens)
- `keep`: How many recent tool uses to preserve (default: 3)
- `clear_at_least`: Minimum tokens to clear per activation
- `exclude_tools`: Tools whose results should never be cleared

**Best Practices:**
1. Set trigger based on typical conversation length
2. Use `exclude_tools` for critical retrievals (like RAG results)
3. Monitor `context_management` in responses to track clearing
4. Combine with memory tools to preserve important context before clearing

#### Subagent Best Practices

1. **Clear Descriptions**: Write specific descriptions indicating when to invoke each subagent
2. **Focused Prompts**: Each subagent should have expertise in one domain
3. **Tool Restrictions**: Limit tools to what's necessary for the subagent's role
4. **Parallel Design**: Design subagents to work independently for parallel execution
5. **Context Awareness**: Main orchestrator should pass relevant context to subagents
6. **Testing**: Test automatic selection to ensure correct subagent invocation

### Chat Architecture

- **Frontend**: `ChatAssistant` component uses `useChat` hook from `@ai-sdk/react`
- **API Route**: Validates messages, converts UIMessages to ModelMessages using `convertToModelMessages()`, streams response via `toTextStreamResponse()`
- **Message Format**: Messages have `parts` array with typed parts (text, tool, source-url, etc.), NOT simple `content` field
- **Sending Messages**: MUST use `sendMessage({ text: "message" })` format - string format does NOT work
- **Streaming**: Official `useChat` hook handles streaming automatically
- **Error Handling**: Graceful fallbacks for API failures via `status` monitoring

### UI Components

- **shadcn/ui** configured with:
  - New York style
  - Neutral base color with CSS variables
  - Import aliases: `@/components`, `@/lib/utils`, `@/components/ui`
  - Lucide React for icons
- **AI Elements** from Vercel:
  - Pre-built components for AI applications
  - Located in `components/ai-elements/`
  - Key components: Conversation, Message, PromptInput, Sources, Tool, Reasoning
  - Supports tool calls, sources, reasoning tokens, and rich message formatting
  - Reasoning component documentation: https://ai-sdk.dev/elements/components/reasoning#reasoning
  - Reasoning tokens automatically display as collapsible blocks with duration tracking

### Adding Components

- shadcn/ui: `pnpm dlx shadcn@latest add [component-name]`
- AI Elements: `pnpm dlx ai-elements@latest` (adds all components)

### Generative User Interfaces

**CRITICAL REQUIREMENT**: When building UI or frontend components, especially those that involve streaming AI-generated content, you MUST read the Generative UI documentation: https://ai-sdk.dev/docs/ai-sdk-ui/generative-user-interfaces

This documentation is essential for understanding:
- How to stream React components from the server to the client
- Using `streamUI()` for generating interactive UI components
- Server Actions with `createStreamableUI()` and `createStreamableValue()`
- Client-side rendering of streamed components
- Best practices for generative UI patterns

#### Generative UI Patterns

The AI SDK supports streaming React components as part of AI responses, enabling dynamic, interactive UIs:

```typescript
// Server-side with streamUI()
import { streamUI } from 'ai/rsc'

const result = await streamUI({
  model: openai('gpt-4'),
  messages,
  text: ({ content }) => <div>{content}</div>,
  tools: {
    showRecipe: {
      description: 'Display a recipe',
      parameters: z.object({
        title: z.string(),
        ingredients: z.array(z.string()),
      }),
      generate: async ({ title, ingredients }) => {
        return <RecipeCard title={title} ingredients={ingredients} />
      }
    }
  }
})
```

#### When to Use Generative UI

- **Interactive Components**: When AI responses should include buttons, forms, or interactive elements
- **Rich Data Visualization**: For charts, graphs, or complex data displays
- **Dynamic Content**: When UI structure depends on AI reasoning
- **Multi-Step Workflows**: For guided experiences with branching logic

#### Best Practices

- Keep generated components server-side compatible
- Use `'use client'` directive only when client interactivity is required
- Stream loading states for better UX
- Handle errors gracefully in generated components
- Consider accessibility in all generated UI elements

### RAG Source Streaming

**CRITICAL REQUIREMENT**: You MUST read the AI SDK streaming data documentation before implementing RAG source citations: https://ai-sdk.dev/docs/ai-sdk-ui/streaming-data

This documentation is essential for understanding how to properly stream source data parts from RAG tools to the frontend.

## Environment Setup

Create `.env.local` with:

```
OPENAI_API_KEY=your_openai_api_key_here
VECTORIZE_ACCESS_TOKEN=your_vectorize_token
VECTORIZE_ORG_ID=your_org_id
VECTORIZE_PIPELINE_ID=your_pipeline_id
```

## Supabase Documentation

Official Supabase documentation: https://supabase.com/docs

Key references for integration:
- **Getting Started with Next.js**: https://supabase.com/docs/guides/getting-started/quickstarts/nextjs
- **Authentication (Server-Side)**: https://supabase.com/docs/guides/auth/server-side/nextjs
- **Database Overview**: https://supabase.com/docs/guides/database/overview
- **Storage**: https://supabase.com/docs/guides/storage
- **Row Level Security (RLS)**: https://supabase.com/docs/guides/auth/row-level-security
- **TypeScript Support**: https://supabase.com/docs/guides/api/generating-types

## Critical Rules for useChat Implementation

**NEVER EVER DO THIS:**
- ❌ `sendMessage("string")` - This DOES NOT work and causes runtime errors
- ❌ Accessing `message.content` directly - Messages use `parts` array structure
- ❌ Passing plain strings to sendMessage

**ALWAYS DO THIS:**
- ✅ `sendMessage({ text: "message content" })` - Only UIMessage-compatible objects work
- ✅ Access message content via `message.parts` array
- ✅ Read AI SDK docs before implementing any useChat functionality

## Task Master AI Instructions
**Import Task Master's development workflow commands and guidelines, treat as if import is in the main CLAUDE.md file.**
@./.taskmaster/CLAUDE.md
