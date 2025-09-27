# TypeScript Next.js AI SDK 5 Starter

Minimal starter for AI apps with Next.js 15, TypeScript, AI SDK 5, shadcn/ui, and AI Elements.

## Features

- Clean chat interface with GPT-5
- AI Elements components (Conversation, Message, PromptInput)
- Vectorize RAG integration for document retrieval
- shadcn/ui design system
- Non-streaming responses
- TypeScript ready

## Setup

1. Install dependencies:

   ```bash
   pnpm install
   ```

2. Create `.env.local` file with required environment variables:

   ```bash
   OPENAI_API_KEY=your_openai_api_key_here
   VECTORIZE_ACCESS_TOKEN=your_vectorize_token
   VECTORIZE_ORG_ID=your_org_id
   VECTORIZE_PIPELINE_ID=your_pipeline_id
   ```

3. Start development:
   ```bash
   pnpm dev
   ```

Open [http://localhost:3000](http://localhost:3000) to chat with the AI assistant.

## Resources

- [Next.js 15](https://nextjs.org/) - React framework
- [AI SDK 5](https://ai-sdk.dev/) - AI integration toolkit
- [AI Elements](https://ai-sdk.dev/elements/overview) - Pre-built AI components
- [shadcn/ui](https://ui.shadcn.com/) - Component library
- [Tailwind CSS](https://tailwindcss.com/) - Utility-first CSS
- [TypeScript](https://www.typescriptlang.org/) - Type-safe JavaScript

## Architecture & Data Flow

```text
+-------------------------+            +-----------------------------+            +---------------------------+
|       Browser UI        |            |       Next.js API Route     |            |         OpenAI API        |
| `ChatAssistant`         |            | `app/api/chat/route.ts`     |            |  model: openai('gpt-5')   |
|  - AI Elements UI       |            |  - validate input           |            |                           |
|  - PromptInput submit   |            |  - call AI SDK `generateText`|           |                           |
+-------------------------+            +-----------------------------+            +---------------------------+
            |                                         |                                        |
            | 1) User types message                   |                                        |
            |---------------------------------------->|                                        |
            |  POST /api/chat { message }             |                                        |
            |                                         | 2) generateText({ model, prompt })     |
            |                                         |--------------------------------------->|
            |                                         |                                        |
            |                                         |                3) { text }             |
            |                                         |<---------------------------------------|
            | 4) JSON { response: text }              |                                        |
            |<----------------------------------------|                                        |
            | 5) Render assistant message             |                                        |
            v                                         v                                        v

Env: `OPENAI_API_KEY` (server-side) → used by AI SDK OpenAI client
Errors: non-200 from API → UI shows fallback "Sorry, I encountered an error."
```
