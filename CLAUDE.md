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
- **shadcn/ui** components (New York style, neutral base color)
- **Tailwind CSS v4** for styling

### Key Directories

- `app/` - Next.js App Router pages and API routes
- `app/api/chat/` - AI chat endpoint using streaming `streamText()`
- `components/chat/` - Chat interface components
- `components/ai-elements/` - Vercel AI Elements components
- `components/agent/` - Agent configuration (system prompts)
- `components/ui/` - shadcn/ui components
- `lib/utils.ts` - Utility functions including `cn()` for className merging

### AI Integration

- Uses AI SDK 5's `streamText()` for streaming responses
- Configured for GPT-5 via OpenAI provider with web search tool enabled
- System instructions defined in `components/agent/prompt.ts` (travel agent theme)
- API route at `/api/chat` expects `{ messages: Array }` and returns streaming text
- use useChat for all streaming handling (read the doc first, always, before writing any streaming code: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat)
- **CRITICAL**: `sendMessage()` from useChat ONLY accepts UIMessage-compatible objects: `sendMessage({ text: "message" })`
- **NEVER** use `sendMessage("string")` - this does NOT work and will cause runtime errors
- Messages from useChat have a `parts` array structure, NOT a simple `content` field
- Tool calls and sources are supported in the response format
- Requires `OPENAI_API_KEY` in `.env.local`
- Reference: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text#streamtext

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
  - Key components: Conversation, Message, PromptInput, Sources, Tool
  - Supports tool calls, sources, and rich message formatting

### Adding Components

- shadcn/ui: `pnpm dlx shadcn@latest add [component-name]`
- AI Elements: `pnpm dlx ai-elements@latest` (adds all components)

## Environment Setup

Create `.env.local` with:

```
OPENAI_API_KEY=your_openai_api_key_here
```

## Critical Rules for useChat Implementation

**NEVER EVER DO THIS:**
- ❌ `sendMessage("string")` - This DOES NOT work and causes runtime errors
- ❌ Accessing `message.content` directly - Messages use `parts` array structure
- ❌ Passing plain strings to sendMessage

**ALWAYS DO THIS:**
- ✅ `sendMessage({ text: "message content" })` - Only UIMessage-compatible objects work
- ✅ Access message content via `message.parts` array
- ✅ Read AI SDK docs before implementing any useChat functionality
