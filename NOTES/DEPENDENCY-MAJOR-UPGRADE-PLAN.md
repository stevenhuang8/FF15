# Dependency Major-Upgrade Plan

Plan for the packages left behind after the 2026-07-22 safe dependency refresh (patch/minor bumps within existing semver ranges). Everything below crosses a major version and is **not required** for the app to keep working — treat this as a backlog, not an emergency.

Current vs. latest at time of writing:

| Package | Current | Latest |
|---|---|---|
| `ai` | 6.0.234 | 7.0.35 |
| `@ai-sdk/mcp` | 1.0.64 | 2.0.16 |
| `@ai-sdk/openai` | 3.0.87 | 4.0.18 |
| `@ai-sdk/react` | 3.0.236 | 4.0.38 |
| `typescript` | 5.9.3 | 7.0.2 |
| `lucide-react` | 0.563.0 | 1.25.0 |
| `react-day-picker` | 9.14.0 | 10.0.1 |
| `shiki` | 3.23.0 | 4.3.1 |
| `nanoid` | 5.1.16 | 6.0.0 |
| `@supabase/ssr` | 0.8.0 | 0.12.3 |

---

## Priority order

1. **AI SDK v7 family** (`ai`, `@ai-sdk/mcp`, `@ai-sdk/openai`, `@ai-sdk/react`) — must move together, highest effort, highest risk. Do this as its own dedicated task/branch.
2. **`typescript` 5→7** — do only after the AI SDK migration lands, since the new AI SDK types may need a newer compiler anyway. Two majors at once (6 and 7 were skipped) — check the 6.0 changelog too, not just 7.0.
3. **`lucide-react` 0→1**, **`react-day-picker` 9→10**, **`shiki` 3→4**, **`nanoid` 5→6**, **`@supabase/ssr` 0.8→0.12** — independent, low-coupling, can be done opportunistically whenever someone touches the relevant area.

---

## 1. AI SDK v7 migration (`ai`, `@ai-sdk/openai`, `@ai-sdk/react`, `@ai-sdk/mcp`)

Node is already on v24 (requirement: 22+) and the codebase is ESM-only already, so those two v7 prerequisites are already satisfied.

### 1.1 `stepCountIs` → `isStepCount`

Rename import and call site in both chat routes:

- `app/api/chat/route.ts:48` — `import { streamText, convertToModelMessages, stepCountIs } from "ai";`
- `app/api/chat/route.ts:163` — `stopWhen: stepCountIs(30),`
- `app/api/agent-with-mcp-tools/route.ts:4` — same import
- `app/api/agent-with-mcp-tools/route.ts:51` — `stopWhen: stepCountIs(10),`

### 1.2 `system` → `instructions`

v7 rejects system messages inside the `messages` array by default and expects a top-level `instructions` param instead.

- `app/api/chat/route.ts:157` — `system: systemPromptWithUserContext,` → `instructions: systemPromptWithUserContext,`
- `app/api/agent-with-mcp-tools/route.ts:48` — `system: WEB_SCRAPER_SYSTEM_INSTRUCTIONS,` → `instructions: WEB_SCRAPER_SYSTEM_INSTRUCTIONS,`

Also check `components/agent/tools/subagent-tools.ts` — it builds a `ToolLoopAgent`/subagent-style call per NOTES/SUBAGENT-PARALLEL-EXECUTION-PLAN.md; confirm whether it passes `system` anywhere and rename similarly.

### 1.3 Lifecycle callback renames

- `app/api/chat/route.ts:178` — `onStepFinish: ({ toolCalls, toolResults, finishReason }) => {` → `onStepEnd`
- `app/api/chat/route.ts:202` — `onFinish: ({ response, finishReason }) => {` → `onEnd`

Verify the shape of the callback args hasn't also changed (v7 aggregates `usage`/`toolCalls`/`toolResults` across all steps at the top level now, with final-step-only data moved under a `finalStep` property) — the destructured fields above may need to change even after the rename.

### 1.4 `experimental_createMCPClient` → stable API

- `lib/mcp/client/firecrawl-client.ts:7,13,39` — `@ai-sdk/mcp`'s `experimental_createMCPClient` is the v1 API; confirm the v2 package's stable (non-`experimental_`) equivalent and update the import, the `ReturnType<typeof ...>` type alias, and the instantiation call.

### 1.5 Tool definitions in `components/agent/tools/`

None of the 19 tool files currently use `experimental_context`, `experimental_onToolCallStart/Finish`, or `needsApproval` (grep came up empty outside the MCP client above), so tool definitions themselves likely need no changes — just re-verify after the bump since `tool()`'s type signature is changing.

### 1.6 `useChat` / frontend (`@ai-sdk/react`)

- `components/chat/chat-assistant.tsx` is the only `useChat` consumer. Re-check against the v7 `useChat` reference (message/parts shape, `sendMessage` signature) — CLAUDE.md's hard rule of `sendMessage({ text: "..." })` and `message.parts` access should still hold, but confirm against the v7 docs before merging.

### 1.7 Telemetry / other

- No `experimental_telemetry` usage found in the repo, so the `@ai-sdk/otel` package split doesn't need action.
- No `fullStream` usage found, so the `fullStream` → `stream` rename doesn't need action.

### 1.8 Validation steps

1. Bump `ai`, `@ai-sdk/openai`, `@ai-sdk/react`, `@ai-sdk/mcp` together in `package.json` (they move in lockstep).
2. `pnpm install`, then `pnpm tsc --noEmit` — expect a wave of type errors pinpointing every remaining v6-only usage.
3. Manually exercise: `/api/chat` streaming + tool calls, `/api/agent-with-mcp-tools` (Firecrawl MCP), and the RAG agent route, since CLAUDE.md documents all three as following the same patterns.
4. Update CLAUDE.md's AI SDK sections (currently written entirely against v6 semantics — `stepCountIs`, `system`, `onFinish`, etc.) once the migration is verified working.

---

## 2. `typescript` 5.9 → 7.0

Two majors were skipped (6.x was never adopted). Do this after the AI SDK migration since new `ai`/`@ai-sdk/*` type definitions may require the newer compiler. Run `pnpm tsc --noEmit` immediately after bumping — this project has no other type-affecting tooling (no separate lint-type step), so a clean compile is the full signal here.

---

## 3. Independent low-coupling upgrades

These don't block on each other or on the AI SDK work. Each can be picked up separately:

- **`lucide-react` 0→1** — used in 68 files (`grep -rl "from 'lucide-react'"` across `app/` + `components/`). A 0→1 major usually only drops deprecated icon aliases; grep the v1 changelog for any icon names actually used in this repo before bumping, since a renamed/removed icon would only surface as a build error, not a type error.
- **`react-day-picker` 9→10** — used in `components/ui/calendar.tsx`. Check that file's props against v10's changelog (v9→v10 has historically changed the `mode`/`selected` prop shapes).
- **`shiki` 3→4** — check what consumes it (likely transitively via `streamdown`, since no direct import was found in `components/` or `app/`); may not need first-party changes at all — verify by bumping and running `pnpm tsc --noEmit` + a manual code-block render check in chat.
- **`nanoid` 5→6** — only direct usage found in `components/ai-elements/prompt-input.tsx`. Check whether v6 changes the `nanoid()` import path or drops CJS entry points.
- **`@supabase/ssr` 0.8→0.12** — used in `lib/supabase/client.ts` and `lib/supabase/server.ts` (note: duplicate `client 2.ts` / `server 2.ts` files exist in that folder — confirm those are stale/unused before assuming this upgrade needs to touch them too, or clean them up separately). Re-check `createBrowserClient`/`createServerClient` signatures against the auth callback flow documented in CLAUDE.md (`/app/auth/callback/route.ts`) since that's the most auth-sensitive integration point.

---

## Suggested execution order

1. AI SDK v7 (own branch/task, per section 1)
2. `typescript` 7 (only after #1 is green)
3. The five independent packages in section 3, in any order, whenever convenient — each is a small, isolated PR.
