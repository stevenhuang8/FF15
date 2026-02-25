# Debugging Production Streaming Errors

## Status: RESOLVED ✅

The streaming `rs_` ID error has been fixed. This document is kept for historical reference.

## Error Context (Historical)

**Error:** `Error: Item with id 'rs_0d53cd07270c8971006916577696b8819b9f22f1f635331670' not found.`

**Location:** Frontend chat component during AI response streaming

**AI SDK Versions at time of issue:**
- `ai`: ^5.0.92 (now on ^6.0.73)
- `@ai-sdk/react`: ^2.0.92 (now on ^3.0.75)
- `@ai-sdk/openai`: ^2.0.65 (now on ^3.0.25)

## Root Cause Analysis

This error occurs when the AI SDK's `useChat` hook tries to reference a React Server streaming identifier (`rs_...`) that no longer exists in the streaming state. This typically happens due to:

1. **Race condition** during message state updates
2. **Network interruption** during streaming
3. **Browser tab suspension** on mobile/low-power devices
4. **Message ID mismatch** between streaming and saved messages
5. **Auto-save interference** replacing streaming IDs with database UUIDs too early

## Testing Strategies

### 1. Local Reproduction Testing

**Network Throttling:**
```bash
# Start dev server
pnpm dev

# In browser DevTools:
# 1. Open DevTools → Network tab
# 2. Set throttling to "Slow 3G" or "Offline" (toggle online/offline)
# 3. Send a message to the AI
# 4. Toggle network offline mid-stream to simulate interruption
```

**Browser Tab Suspension:**
```bash
# Test on actual mobile device:
# 1. Start conversation
# 2. Send message and wait for AI response to start
# 3. Switch to another app for 10+ seconds
# 4. Return to browser tab
# Expected: Streaming state may be lost, causing rs_ error
```

### 2. Production Testing Without Breaking Users

**Option A: Feature Flag for Debug Mode**

Add debug mode that logs without breaking:

```typescript
// Add to chat-assistant.tsx
const isDebugMode = typeof window !== 'undefined' &&
  (window.location.hostname === 'your-app.vercel.app' &&
   window.location.search.includes('debug=true'));

// In useChat config:
onFinish: (message) => {
  if (isDebugMode) {
    console.log('✅ Stream finished:', {
      messageId: message.id,
      role: message.role,
      partsCount: message.parts?.length,
    });
  }
}
```

**Option B: Sentry/Error Tracking Integration**

```bash
pnpm add @sentry/nextjs
```

Then add to `/app/error.tsx` or chat component:

```typescript
import * as Sentry from '@sentry/nextjs';

// In onError handler:
if (error.message?.includes('rs_')) {
  Sentry.captureException(error, {
    tags: {
      error_type: 'streaming_id_not_found',
      streaming_id: error.message.match(/rs_[a-f0-9]+/)?.[0],
    },
    contexts: {
      chat_state: {
        messagesCount: rawMessages.length,
        lastMessageId: rawMessages[rawMessages.length - 1]?.id,
        status,
        conversationId: currentConversationId,
      },
    },
  });
}
```

### 3. Production Debugging with Current Code

**Step 1: Deploy with Enhanced Logging (DONE ✅)**

The code now includes detailed console logging for streaming errors. When the error occurs in production:

1. **User opens browser console** (F12)
2. **Error logs will show:**
   - `💥 Chat error:` - Original error
   - `💥 Error details:` - Message count, IDs, status
   - `🔍 Streaming ID error detected:` - All message IDs and parts structure

**Step 2: Collect Error Reports**

Add a feedback form that captures console logs:

```typescript
// In alert for rs_ errors:
alert(
  '⚠️ Streaming Error\n\n' +
  'Please help us fix this by:\n' +
  '1. Press F12 to open browser console\n' +
  '2. Right-click any red errors and select "Save as..."\n' +
  '3. Email the logs to support@yourapp.com\n\n' +
  'Error ID: ' + error.message.match(/rs_[a-f0-9]+/)?.[0]
);
```

### 4. Targeted Testing Scenarios

**Scenario 1: Rapid Message Sending**
```
1. Open chat
2. Send message 1
3. Immediately send message 2 (before AI responds)
4. Immediately send message 3
Expected: Possible race condition with streaming IDs
```

**Scenario 2: Browser Background/Foreground**
```
1. Send message to AI
2. Wait 2 seconds (partial stream)
3. Minimize browser window
4. Wait 10 seconds
5. Restore window
Expected: Browser may suspend streaming connection
```

**Scenario 3: Conversation Switch During Streaming**
```
1. Send message in conversation A
2. While AI is responding, click to conversation B
3. Return to conversation A
Expected: Auto-save may interfere with streaming state
```

**Scenario 4: Long Responses with Tool Calls**
```
1. Ask complex question requiring multiple tool calls
   Example: "Research carbonara history, calculate nutrition, and suggest substitutions"
2. Watch for rs_ errors during multi-step tool execution
Expected: More streaming state updates = higher error risk
```

### 5. Monitoring Production Logs

**Enable Vercel Logging:**

```bash
# Install Vercel CLI
npm i -g vercel

# View production logs in real-time
vercel logs your-app-name --follow

# Filter for errors
vercel logs your-app-name --follow | grep "error"
```

**Server-Side Logging Additions:**

Add to `/app/api/chat/route.ts`:

```typescript
export async function POST(request: NextRequest) {
  try {
    // ... existing code ...

    const result = streamText({
      model: openai("gpt-5"),
      system: systemPromptWithUserContext,
      messages: modelMessages,
      stopWhen: stepCountIs(30),
      tools: { /* ... */ },

      // Add these callbacks for debugging:
      onFinish: async ({ response, finishReason }) => {
        console.log('✅ Stream finished:', {
          finishReason,
          stepsCount: response.steps?.length,
          hasToolCalls: response.steps?.some(s => s.toolCalls?.length > 0),
        });
      },

      experimental_telemetry: {
        isEnabled: true,
        functionId: 'chat-stream',
      },
    });

    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("💥 Stream error:", error);
    // Log to external service if available
    return new Response("Failed to generate response", { status: 500 });
  }
}
```

## Immediate Fixes Applied

### ✅ Enhanced Error Logging
- Added detailed console logging for `rs_` errors
- Captures message state, IDs, and parts structure
- User-friendly error message with actionable steps

### ✅ User-Facing Error Handling
- Clear error message explaining the issue
- Instructions for refresh and cache clearing
- Error ID reporting for debugging

## Recommended Next Steps

### High Priority
1. **Deploy current changes** to get enhanced logging data
2. **Monitor Vercel logs** for server-side streaming errors
3. **Test network interruption** scenarios locally

### Medium Priority
4. **Add Sentry integration** for automatic error tracking
5. **Test conversation switching** during streaming
6. **Review auto-save timing** - may need to increase idle delay

### Low Priority (If Issue Persists)
7. **Upgrade AI SDK** to latest version (check for fixes)
8. **Add retry logic** for streaming failures
9. **Implement streaming state recovery** mechanism

## Potential Code Fixes

### Fix 1: Increase Auto-Save Idle Time
Currently: 5 seconds
Recommendation: 10 seconds to avoid mid-stream interference

```typescript
// In chat-assistant.tsx line 355
const minimumIdleTime = 10000; // Increase from 5000 to 10000
```

### Fix 2: Add Streaming State Guard
Prevent operations that modify message IDs during streaming:

```typescript
// In autoSaveMessages function
const autoSaveMessages = async () => {
  // Add this check at the start:
  if (status === 'streaming') {
    console.log('⏸️ Skipping auto-save - streaming in progress');
    return;
  }

  // ... rest of function
};
```

### Fix 3: Add Error Recovery
Automatically retry on streaming failures:

```typescript
const { messages, status, sendMessage, error } = useChat({
  // ... existing config ...

  maxRetries: 2, // AI SDK built-in retry

  onError: (error) => {
    if (error.message?.includes('rs_') && retryCount < 3) {
      console.log('🔄 Retrying after streaming error...');
      setTimeout(() => {
        // Retry last message
        const lastUserMessage = messages.findLast(m => m.role === 'user');
        if (lastUserMessage) {
          sendMessage({ text: lastUserMessage.content });
        }
      }, 1000);
    }
  },
});
```

## Testing Checklist

- [ ] Deploy enhanced logging to production
- [ ] Test with slow 3G network throttling
- [ ] Test browser minimize/restore during streaming
- [ ] Test rapid message sending (3+ messages quickly)
- [ ] Test conversation switching mid-stream
- [ ] Test on mobile device (iOS Safari, Android Chrome)
- [ ] Test with long responses requiring 10+ tool calls
- [ ] Monitor Vercel logs for 24 hours after deploy
- [ ] Collect user reports with console logs

## References

- AI SDK useChat: https://ai-sdk.dev/docs/reference/ai-sdk-ui/use-chat
- AI SDK Streaming: https://ai-sdk.dev/docs/reference/ai-sdk-core/stream-text
- Next.js Error Handling: https://nextjs.org/docs/app/building-your-application/routing/error-handling
