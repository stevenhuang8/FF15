# Subagent Parallel Execution Plan

Migration from manual `streamText()` factory to native `ToolLoopAgent` with parallel tool execution.

---

## Background & What's Wrong Today

The current implementation uses a manual `createSubagentTool()` factory that runs a raw `streamText()` inside each tool's `execute()`. This works but has three problems:

1. **No `abortSignal` propagation** — if the user cancels the request, subagents keep running
2. **Manual loop management** — the factory reimplements what `ToolLoopAgent` does natively
3. **No parallel execution** — `parallel_tool_calls` isn't set, so GPT-5.2 may serialize calls; even when the model issues multiple tool calls in one step, the current factory's `await subResult.text` blocks each one

---

## Change 1 — Enable parallel tool calls at the provider level

**File:** `app/api/chat/route.ts` (~line 165)

Add `parallel_tool_calls: true` to `providerOptions.openai`. This explicitly tells OpenAI's API that the orchestrator is allowed to issue multiple tool calls in a single response step. The AI SDK already executes concurrent tool calls from one step via `Promise.all` internally — this just ensures the model is permitted to produce them.

```diff
providerOptions: {
  openai: {
    reasoning_effort: "medium",
    textVerbosity: "low",
    reasoningSummary: "detailed",
+   parallel_tool_calls: true,
  },
},
```

---

## Change 2 — Migrate `subagent-tools.ts` to `ToolLoopAgent`

**File:** `components/agent/tools/subagent-tools.ts`

Replace `createSubagentTool()` factory with a new version that:
1. Creates a `ToolLoopAgent` **once per subagent** at module load (reused across requests — no per-request overhead)
2. Tool `execute` receives `abortSignal` from the second context argument and passes it to `agent.generate()`
3. Injects `userId`/`currentDate`/`currentTime` into the prompt at call time

```typescript
import { tool, ToolLoopAgent } from 'ai';

function createSubagentTool(name, description, prompt, allowedToolNames) {
  // Build restricted tools object once
  const restrictedTools = Object.fromEntries(
    allowedToolNames
      .filter(n => toolRegistry[n])
      .map(n => [n, toolRegistry[n]])
  );

  // Create the ToolLoopAgent once at module level
  const agent = new ToolLoopAgent({
    model: openai('gpt-5.2'),
    instructions: prompt,
    tools: restrictedTools,
  });

  return tool({
    description,
    inputSchema: z.object({
      query: z.string(),
      userId: z.string().optional(),
      currentDate: z.string().optional(),
      currentTime: z.string().optional(),
    }),
    execute: async ({ query, userId, currentDate, currentTime }, { abortSignal }) => {
      // Build context-injected prompt per request
      let contextualPrompt = query;
      if (userId) contextualPrompt += `\n[userId: ${userId}]`;
      if (currentDate && currentTime) contextualPrompt += `\n[date: ${currentDate} at ${currentTime}]`;

      const result = await agent.generate({
        prompt: contextualPrompt,
        abortSignal,   // propagate cancellation
      });

      return { success: true, response: result.text, subagent: name };
    },
  });
}
```

**Key difference from today:** `abortSignal` flows through, agents are instantiated once, and the execute function is non-blocking for the orchestrator when multiple subagents run in parallel.

---

## Change 3 — Add `toModelOutput()` for context summarization (optional but recommended)

The `ToolLoopAgent` supports `toModelOutput()` to control how many tokens the subagent's result consumes in the main context. For subagents with verbose output (recipe-researcher, nutrition-analyst), this prevents context bloat:

```typescript
execute: async ({ query, ... }, { abortSignal }) => {
  const result = await agent.generate({ prompt: contextualPrompt, abortSignal });
  return result.toModelOutput();  // SDK-managed summarization
},
```

Apply selectively to verbose subagents: `recipe-researcher`, `nutrition-analyst`, `meal-planner`.

---

## Change 4 — Update `onStepFinish` logging to show parallelism

**File:** `app/api/chat/route.ts`

The existing `onStepFinish` already logs all tool calls in a step. Once parallel calls are enabled, `toolCalls.length > 1` will appear in a single step. Add a log line to make this visible:

```diff
onStepFinish: ({ toolCalls, toolResults, finishReason }) => {
+ if (toolCalls && toolCalls.length > 1) {
+   console.log(`⚡ Parallel execution: ${toolCalls.length} tools in one step`);
+ }
  // ...existing per-tool logging
},
```

---

## Files Changed Summary

| File | Change |
|------|--------|
| `app/api/chat/route.ts` | Add `parallel_tool_calls: true`, update parallel logging |
| `components/agent/tools/subagent-tools.ts` | Replace manual `streamText()` with `ToolLoopAgent`, add `abortSignal` |
| `components/agent/subagents/*.ts` | No changes needed |
| `components/agent/subagents/index.ts` | No changes needed |

---

## How Parallel Execution Works End-to-End

1. User asks: *"Research carbonara history and calculate its macros"*
2. Orchestrator (GPT-5.2 step 1) issues **two tool calls in one response**: `invokeRecipeResearcher` + `invokeNutritionAnalyst`
3. Because `parallel_tool_calls: true` is set, OpenAI sends both in the same step
4. AI SDK receives the two tool calls and executes them concurrently via `Promise.all`
5. Each `ToolLoopAgent.generate()` runs independently with its own context and `abortSignal`
6. Both results return to the orchestrator simultaneously
7. Orchestrator synthesizes the combined answer in step 2

Latency reduction: `T(researcher) + T(analyst)` → `max(T(researcher), T(analyst))`

---

## Reference

- AI SDK Subagents docs: https://ai-sdk.dev/docs/agents/subagents
