# Chat Component Guidelines

This document provides specific guidance for working with the chat interface components in this directory.

## Chat Assistant Component (`chat-assistant.tsx`)

### Performance Optimization

- **Debounced Streaming**: Messages are debounced at 30ms intervals to prevent excessive re-renders during streaming
- **Memoized Components**: Use `MemoizedMessage` to prevent unnecessary re-renders
- **Immediate Updates**: Critical events (streaming stops, new tool calls) bypass debouncing for instant UI updates

### What the Chat Renders

- The chat renders message text, attachments, sources, and the save actions for recipes and workouts
- Tool calls and reasoning are **not** rendered. Tool parts stay in the message so sources can be extracted and tool calls can be saved to the database
- The exception is a tool part in the `approval-requested` state, which renders as `ToolApprovalCard` below the messages
- Each rendered flow item has a unique key to prevent React warnings

#### Message Structure
- Messages use `parts` array, NOT simple `content` field
- Part types include:
  - `"text"` - Regular message text
  - `"file"` - Attachments
  - `"reasoning"` - AI reasoning (not rendered)
  - `"tool-*"` - Tool execution results (not rendered), with `state`, `input`, and `output` fields

#### Messages Loaded from History
- Only text and attachments are restored from the database. Tool calls are left out because they can cause API errors when replayed

### Sources Display Rules

#### Positioning
- Sources **MUST** render below messages, never side-by-side
- Only show sources when there's actual text content in the message

#### Source Association
- Sources come from the `tool-retrieveKnowledgeBase` parts of the same assistant message, read from `part.output.sources`

### Component Integration

#### Using ChatAssistant
```tsx
// With default API endpoint (/api/chat)
<ChatAssistant />

// With custom API endpoint
<ChatAssistant api="/api/agent-with-mcp-tools" />
```

#### Message Sending
- **CRITICAL**: Always use `sendMessage({ text: "message" })` format
- **NEVER** use `sendMessage("string")` - this causes runtime errors

### UI/UX Best Practices

1. **Visual Hierarchy**:
   - Message text → Sources

2. **Loading States**:
   - Disable submit button during streaming

3. **Error Handling**:
   - Gracefully handle missing data with fallbacks

4. **Accessibility**:
   - All collapsible elements are keyboard navigable
   - Clear visual indicators for expand/collapse states

## Testing Checklist

When modifying chat components, verify:

- [ ] Sources appear below messages
- [ ] Message ordering is chronological
- [ ] No duplicate React keys
- [ ] Streaming feels responsive (30ms debounce)
- [ ] TypeScript compilation passes (`pnpm tsc --noEmit`)
