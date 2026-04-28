# Subagent Streaming Fix

## Problem

After migrating subagent tools from `streamText()` to `ToolLoopAgent`, the tool `execute` functions call `agent.generate()` which **blocks until the full subagent output is complete** before returning to the orchestrator. Users see nothing during subagent execution and then the full response appears at once.

The old `streamText()` approach had the same problem — it also called `await subResult.text` which waited for full generation. Neither approach streamed tokens to the user during subagent execution.

---

## Fix

Switch to `agent.stream()` with an async generator `execute` function. Use `readUIMessageStream()` to yield preliminary accumulated messages as the subagent generates tokens. Users will see subagent output streaming in real-time.

**One file changes:** `components/agent/tools/subagent-tools.ts`

### Changes Required

1. **Import `readUIMessageStream`** from `'ai'` alongside `tool` and `ToolLoopAgent`

2. **Change tool `execute` from `async` to `async function*`** (async generator)

3. **Switch `agent.generate()` to `agent.stream()`**

4. **Pipe through `readUIMessageStream`**, yielding each accumulated message as a preliminary result

5. **Add `toModelOutput`** on the tool to give the orchestrator only the final text (prevents verbose subagent reasoning from bloating orchestrator context)

### Updated `createSubagentTool` — execute block

```typescript
import { tool, ToolLoopAgent, readUIMessageStream } from 'ai';

// Before (blocking):
execute: async ({ query, userId, currentDate, currentTime }, { abortSignal }) => {
  const result = await agent.generate({ prompt: contextualPrompt, abortSignal });
  return { success: true, response: result.text, subagent: name };
},

// After (streaming):
execute: async function* ({ query, userId, currentDate, currentTime }, { abortSignal }) {
  const result = await agent.stream({ prompt: contextualPrompt, abortSignal });

  for await (const message of readUIMessageStream({
    stream: result.toUIMessageStream(),
  })) {
    yield message; // each yield sends accumulated tokens to the UI as preliminary output
  }
},
toModelOutput: ({ output: message }) => {
  // Give the orchestrator only the final text — avoids context bloat
  const lastTextPart = message?.parts?.findLast((p: { type: string }) => p.type === 'text');
  return {
    type: 'text' as const,
    value: lastTextPart?.text ?? 'Task completed.',
  };
},
```

---

## How It Works

- `agent.stream()` starts generating and returns immediately with a `StreamTextResult`
- `result.toUIMessageStream()` converts the stream to UI-compatible message chunks
- `readUIMessageStream()` accumulates chunks into a growing `UIMessage` (each iteration is the complete message received so far, not just a delta)
- `yield message` sends each accumulated state to the parent orchestrator as a **preliminary** tool result
- The UI renders each preliminary result, giving the user token-by-token output from the subagent
- `toModelOutput()` extracts only the final text for the orchestrator, preventing context bloat

---

## Verification

1. `pnpm tsc --noEmit` — must pass
2. Ask a question that triggers a subagent (e.g. "how do I make risotto?")
3. Subagent tokens should stream token-by-token during subagent execution, not appear all at once
4. Ask a multi-domain question to verify parallel execution still works (e.g. "research carbonara history and calculate its macros")
5. Check server logs for `⚡ Parallel execution: 2 tools in one step`

---

## Reference

- AI SDK tool async generator docs: https://ai-sdk.dev/docs/agents/subagents
- `readUIMessageStream` exported from `'ai'` (v6.0.73+)
- `ToolLoopAgent.stream()` returns `Promise<StreamTextResult<TOOLS, OUTPUT>>`
