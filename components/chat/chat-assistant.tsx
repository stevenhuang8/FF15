"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart } from "ai";
import { useState, useEffect, useRef, memo } from "react";
import {
  createConversation,
  saveMessage,
  generateConversationTitle,
  getMessages
} from "@/lib/supabase/conversations";
import {
  Conversation,
  ConversationContent,
  ConversationEmptyState,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputBody,
  PromptInputTextarea,
  PromptInputToolbar,
  PromptInputSubmit,
} from "@/components/ai-elements/prompt-input";
import {
  Sources,
  SourcesTrigger,
  SourcesContent,
  Source,
} from "@/components/ai-elements/sources";
import {
  Tool,
  ToolHeader,
  ToolContent,
  ToolInput,
  ToolOutput,
} from "@/components/ai-elements/tool";
import {
  Reasoning,
  ReasoningTrigger,
  ReasoningContent,
} from "@/components/ai-elements/reasoning";
import { Response } from "@/components/ai-elements/response";
type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  sources?: Array<{
    url: string;
    title?: string;
  }>;
  toolCalls?: Array<{
    type: `tool-${string}`;
    state:
      | "input-streaming"
      | "input-available"
      | "output-available"
      | "output-error";
    input?: any;
    output?: any;
    errorText?: string;
  }>;
};

// RAG Tool types for proper TypeScript support
type RAGToolInput = {
  query: string;
};

type RAGToolOutput = {
  context: string;
  sources: Array<{
    sourceType: 'url';
    id: string;
    url: string;
    title: string;
  }>;
  chatSources?: Array<{
    url: string;
    title: string;
  }>;
};

type RAGToolUIPart = ToolUIPart<{
  retrieveKnowledgeBase: {
    input: RAGToolInput;
    output: RAGToolOutput;
  };
}>;

interface ChatAssistantProps {
  api?: string;
}

// Memoized components for better performance
const MemoizedToolCall = memo(({
  toolPart,
  displayName,
  shouldBeExpanded
}: {
  toolPart: RAGToolUIPart;
  displayName: string;
  shouldBeExpanded: boolean;
}) => (
  <Tool defaultOpen={shouldBeExpanded}>
    <ToolHeader
      type={displayName as any}
      state={toolPart.state}
    />
    <ToolContent>
      {toolPart.state === "input-streaming" && (
        <div className="text-sm text-muted-foreground p-2">
          🔍 {displayName}...
        </div>
      )}
      {toolPart.input && toolPart.state !== "input-streaming" && (
        <ToolInput input={toolPart.input} />
      )}
      {toolPart.output && (
        <ToolOutput
          output={toolPart.output}
          errorText={toolPart.errorText}
        />
      )}
    </ToolContent>
  </Tool>
));

MemoizedToolCall.displayName = 'MemoizedToolCall';

const MemoizedMessage = memo(({
  message,
  isStreaming,
  children
}: {
  message: any;
  isStreaming: boolean;
  children?: React.ReactNode;
}) => {
  // Only handle text parts (reasoning is now handled as separate flow items)
  const textParts = message.parts?.filter((p: any) => p.type === 'text') || [];

  return (
    <>
      {/* Render text message if there's content */}
      {(textParts.length > 0 || message.content) && (
        <Message from={message.role}>
          <MessageContent>
            <Response>
              {textParts.map((part: any, i: number) => part.text).join('') || message.content || ""}
            </Response>
          </MessageContent>
          {children}
        </Message>
      )}
    </>
  );
});

MemoizedMessage.displayName = 'MemoizedMessage';

interface ChatAssistantPropsExtended extends ChatAssistantProps {
  conversationId?: string | null;
  onConversationCreated?: (conversationId: string) => void;
}

export default function ChatAssistant({ api, conversationId, onConversationCreated }: ChatAssistantPropsExtended) {
  const [input, setInput] = useState("");
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(conversationId || null);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const { messages: rawMessages, status, sendMessage, setMessages } = useChat({
    transport: api ? new DefaultChatTransport({ api }) : undefined,
  });

  // Debounced messages for performance - update every 30ms instead of every token
  const [debouncedMessages, setDebouncedMessages] = useState(rawMessages);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const lastRawMessagesRef = useRef(rawMessages);

  useEffect(() => {
    // Clear existing timer
    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    // Check for critical events that need immediate updates
    const needsImmediateUpdate = () => {
      // Update immediately when streaming stops
      if (status !== 'streaming' && lastRawMessagesRef.current !== rawMessages) {
        return true;
      }

      // Update immediately when tool calls appear/change
      const hasNewToolCalls = rawMessages.some(msg =>
        (msg as any).parts?.some((p: any) => p.type?.startsWith('tool-')) &&
        !lastRawMessagesRef.current.some(oldMsg => oldMsg.id === msg.id)
      );

      if (hasNewToolCalls) {
        return true;
      }

      return false;
    };

    if (needsImmediateUpdate()) {
      // Immediate update for critical events
      setDebouncedMessages(rawMessages);
      lastRawMessagesRef.current = rawMessages;
    } else {
      // Debounced update for regular streaming
      debounceTimerRef.current = setTimeout(() => {
        setDebouncedMessages(rawMessages);
        lastRawMessagesRef.current = rawMessages;
      }, 30);
    }

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [rawMessages, status]);

  // Use debounced messages for rendering
  const messages = debouncedMessages;

  // Track saved message IDs for auto-save (use Set for O(1) lookup)
  const savedMessageIdsRef = useRef<Set<string>>(new Set());
  const isSavingRef = useRef(false);

  // Track previous conversationId to detect switches
  const prevConversationIdRef = useRef<string | null>(null);

  // Load conversation history when conversationId changes
  useEffect(() => {
    const loadConversationHistory = async () => {
      // Reset save tracking when switching conversations
      if (prevConversationIdRef.current !== conversationId) {
        savedMessageIdsRef.current.clear();
        prevConversationIdRef.current = conversationId || null;
      }

      if (!conversationId) {
        // New conversation - clear messages
        setMessages([]);
        setCurrentConversationId(null);
        return;
      }

      setIsLoadingHistory(true);
      try {
        const { data: savedMessages, error } = await getMessages(conversationId);

        if (!error && savedMessages && savedMessages.length > 0) {
          console.log(`📥 Loading ${savedMessages.length} messages from database`);

          // Convert saved messages to UI message format
          const uiMessages = savedMessages.map(msg => {
            // For messages loaded from DB, only include text content
            // Don't include tool calls as they may not have the proper reasoning structure
            // required by GPT-5 and will cause API errors
            const parts: any[] = [];

            // Add text part
            if (msg.content) {
              parts.push({
                type: 'text',
                text: msg.content
              });
            }

            console.log(`📝 Loaded message:`, {
              id: msg.id,
              role: msg.role,
              contentLength: msg.content?.length || 0,
              content: msg.content?.substring(0, 100),
              hasToolCalls: !!msg.tool_calls
            });

            return {
              id: msg.id,
              role: msg.role as 'user' | 'assistant',
              parts,
              content: msg.content,
              createdAt: new Date(msg.created_at!)
            };
          });

          setMessages(uiMessages as any);
          setCurrentConversationId(conversationId);

          // Mark all loaded messages as saved
          uiMessages.forEach(msg => {
            savedMessageIdsRef.current.add(msg.id);
          });

          console.log(`✅ Loaded conversation with ${uiMessages.length} messages`);
        }
      } catch (error) {
        console.error('Failed to load conversation history:', error);
      } finally {
        setIsLoadingHistory(false);
      }
    };

    loadConversationHistory();
  }, [conversationId, setMessages]);

  // Auto-save messages to Supabase with debounce
  useEffect(() => {
    // Debounce auto-save to prevent immediate saves on history load
    const timeoutId = setTimeout(() => {
      console.log(`⏰ Auto-save triggered. Status: ${status}, Messages count: ${messages.length}`);
      autoSaveMessages();
    }, 500); // 500ms debounce

    return () => clearTimeout(timeoutId);
  }, [messages.length, currentConversationId, status]); // Trigger on message count, conversation change, OR status change (for streaming completion)

  const autoSaveMessages = async () => {
    // Don't save if already saving or loading history
    if (isSavingRef.current || isLoadingHistory) return;

    // Don't save while streaming - wait until complete
    if (status === 'streaming') {
      console.log('⏸️ Skipping auto-save while streaming');
      return;
    }

    // Skip if no messages
    if (messages.length === 0) return;

    console.log(`🔍 Auto-save check: ${messages.length} total messages, ${savedMessageIdsRef.current.size} already saved`);

    // Find unsaved messages (messages with IDs not in our saved set)
    const unsavedMessages = messages.filter(msg => !savedMessageIdsRef.current.has(msg.id));

    console.log(`📋 Found ${unsavedMessages.length} unsaved messages:`, unsavedMessages.map(m => ({
      id: m.id,
      role: m.role,
      hasContent: !!(m as any).content || !!(m as any).parts?.some((p: any) => p.type === 'text' && p.text)
    })));

    // No new messages to save
    if (unsavedMessages.length === 0) return;

    isSavingRef.current = true;

    try {
      // Create conversation if it doesn't exist (on first user message)
      let convId = currentConversationId;
      if (!convId && messages.length >= 1) {
        const firstUserMessage = messages.find(m => m.role === 'user');
        if (firstUserMessage) {
          const title = generateConversationTitle(
            (firstUserMessage as any).parts?.[0]?.text || (firstUserMessage as any).content || ''
          );

          const { data: newConv, error } = await createConversation({
            title,
            agentType: api?.includes('rag') ? 'cooking' : 'general'
          });

          if (!error && newConv) {
            convId = newConv.id;
            setCurrentConversationId(convId);
            if (onConversationCreated) {
              onConversationCreated(convId);
            }
          }
        }
      }

      if (!convId) {
        isSavingRef.current = false;
        return;
      }

      // Save each unsaved message
      for (const msg of unsavedMessages) {
        // Extract text content from multiple part types
        // GPT-5 puts content in both 'text' and 'reasoning' parts
        const textParts = (msg as any).parts?.filter((p: any) =>
          p.type === 'text' || p.type === 'reasoning'
        ) || [];
        let content = textParts.map((part: any) => part.text).join('\n\n') || (msg as any).content || '';

        // If still no content but message has parts, log full structure for debugging
        if (!content && (msg as any).parts?.length > 0) {
          const partTypes = (msg as any).parts.map((p: any) => ({
            type: p.type,
            hasText: !!p.text,
            textLength: p.text?.length || 0,
            textPreview: p.text?.substring(0, 50)
          }));

          console.log('🔍 Message with no text content but has parts:', {
            id: msg.id,
            role: msg.role,
            partCount: (msg as any).parts.length,
            partTypes,
            allParts: (msg as any).parts
          });
        }

        // Extract tool calls
        const toolCallParts = (msg as any).parts?.filter((p: any) => p.type?.startsWith('tool-')) || [];
        const toolCalls = toolCallParts.length > 0 ? toolCallParts : null;

        // Extract sources from RAG tool results
        let sources = null;
        if (msg.role === 'assistant' && toolCallParts.length > 0) {
          const ragToolCalls = toolCallParts.filter(
            (part: any) => part.type === 'tool-retrieveKnowledgeBase' && part.output?.sources
          );
          if (ragToolCalls.length > 0) {
            sources = ragToolCalls.flatMap((tool: any) => tool.output.sources);
          }
        }

        // Debug logging
        console.log(`💾 Saving message:`, {
          id: msg.id,
          role: msg.role,
          contentLength: content.length,
          content: content.substring(0, 100),
          hasToolCalls: !!toolCalls,
          hasSources: !!sources
        });

        // Only save user and assistant messages (skip system messages if any)
        // Also skip messages with empty content (database requires content)
        if ((msg.role === 'user' || msg.role === 'assistant') && content.trim().length > 0) {
          const { data: savedMsg, error } = await saveMessage({
            conversationId: convId,
            role: msg.role,
            content,
            toolCalls,
            sources
          });

          if (error) {
            console.error(`❌ Failed to save message ${msg.id}:`, error);
          } else if (savedMsg) {
            console.log(`✅ Saved message ${msg.id} as ${savedMsg.id}`);
          }

          // Mark BOTH the streaming ID and database ID as saved
          // This ensures we don't try to save the same message twice
          if (!error && savedMsg) {
            savedMessageIdsRef.current.add(msg.id); // streaming ID
            savedMessageIdsRef.current.add(savedMsg.id); // database ID
          }
        } else if ((msg.role === 'user' || msg.role === 'assistant') && content.trim().length === 0) {
          console.warn(`⚠️ Skipping message ${msg.id} with empty content - will retry when content is available`);
          // DON'T mark as saved - let it try again when content is available
        }
      }
    } catch (error) {
      console.error('Failed to save messages:', error);
    } finally {
      isSavingRef.current = false;
    }
  };

  const handleSubmit = async (
    message: { text?: string; files?: any[] },
    event: React.FormEvent
  ) => {
    if (!message.text?.trim() || status === "streaming") return;

    // Clear the form immediately after extracting the message
    const form = (event.target as Element)?.closest("form") as HTMLFormElement;
    if (form) {
      form.reset();
    }

    sendMessage({ text: message.text });
    setInput("");
  };

  const isLoading = status === "streaming";

  return (
    <div className="flex flex-col h-full max-h-full overflow-hidden">
      <Conversation className="flex-1 h-0 overflow-hidden">
        <ConversationContent className="space-y-4">
          {isLoadingHistory ? (
            <div className="flex items-center justify-center h-full">
              <div className="text-muted-foreground">Loading conversation...</div>
            </div>
          ) : messages.length === 0 ? (
            <ConversationEmptyState
              title="Start a conversation"
              description="Ask me anything and I'll help you out!"
            />
          ) : (
            (() => {
              // Tool display name mapping
              const toolDisplayNames: Record<string, string> = {
                'tool-retrieveKnowledgeBase': 'Knowledge Base Search',
                // Add more tool mappings as needed
              };

              // Extract flow items (messages + tool calls + reasoning) in chronological order
              const flowItems: Array<{
                type: 'message' | 'tool-call' | 'reasoning';
                data: any;
                id: string;
                messageId?: string;
                displayName?: string;
                partIndex?: number;
              }> = [];

              messages.forEach((message) => {
                // Process all parts in chronological order
                const parts = (message as any).parts || [];

                parts.forEach((part: any, partIndex: number) => {
                  if (part.type?.startsWith('tool-')) {
                    // Handle tool calls - always include message ID for uniqueness
                    const toolCallId = part.toolCallId || part.id || `${part.type}-${partIndex}`;
                    const uniqueId = `${message.id}-${toolCallId}`;

                    flowItems.push({
                      type: 'tool-call',
                      data: part,
                      id: `tool-${uniqueId}`,
                      messageId: message.id,
                      displayName: toolDisplayNames[part.type] || part.type,
                      partIndex
                    });
                  } else if (part.type === 'reasoning') {
                    // Handle reasoning parts
                    flowItems.push({
                      type: 'reasoning',
                      data: part,
                      id: `reasoning-${message.id}-${partIndex}`,
                      messageId: message.id,
                      partIndex
                    });
                  }
                  // text parts will be handled in the message itself
                });

                // Add the message itself (with only text parts and legacy content)
                const messageWithTextOnly = {
                  ...message,
                  parts: parts.filter((part: any) =>
                    part.type === 'text' || !part.type // include parts without type for backward compatibility
                  )
                };

                // Only add message if it has content (text or legacy content)
                const hasContent = messageWithTextOnly.parts.length > 0 || !!(message as any).content;
                if (hasContent) {
                  flowItems.push({
                    type: 'message',
                    data: messageWithTextOnly,
                    id: `message-${message.id}`
                  });
                }
              });

              // Check for duplicate keys and log errors only
              const allIds = flowItems.map(item => item.id);
              const duplicateIds = allIds.filter((id, index) => allIds.indexOf(id) !== index);
              if (duplicateIds.length > 0) {
                console.error(`🚨 Duplicate keys found:`, duplicateIds);
              }

              return flowItems.map((item, itemIndex) => {
                if (item.type === 'tool-call') {
                  // Render tool call status block
                  const toolPart = item.data as RAGToolUIPart;

                  // Tools are collapsed by default
                  const shouldBeExpanded = false;

                  return (
                    <div key={item.id} className="w-full mb-4">
                      <MemoizedToolCall
                        toolPart={toolPart}
                        displayName={item.displayName || toolPart.type}
                        shouldBeExpanded={shouldBeExpanded}
                      />
                    </div>
                  );
                } else if (item.type === 'reasoning') {
                  // Render reasoning block
                  const reasoningPart = item.data;

                  return (
                    <div key={item.id} className="w-full mb-4">
                      <Reasoning
                        isStreaming={isLoading}
                        className="mb-4"
                      >
                        <ReasoningTrigger />
                        <ReasoningContent>{reasoningPart.text || ''}</ReasoningContent>
                      </Reasoning>
                    </div>
                  );
                } else {
                  // Render regular message
                  const message = item.data;

                  // Generate sources component
                  const sourcesComponent = message.role === 'assistant' && (() => {
                        // Strict check for actual text content - don't show sources without real text
                        const hasRealTextContent = (
                          message.parts?.some((p: any) => p.type === 'text' && p.text?.trim()) ||
                          (message.content?.trim())
                        );

                        if (!hasRealTextContent) {
                          // No real text content = never show sources (prevents showing below tool calls)
                          return null;
                        }

                        // Look backward through flow items for recent tool results
                        let toolSources: any[] = [];

                        for (let i = itemIndex - 1; i >= 0; i--) {
                          const prevItem = flowItems[i];
                          if (prevItem.type === 'tool-call') {
                            const toolData = prevItem.data as RAGToolUIPart;
                            if (toolData.type === 'tool-retrieveKnowledgeBase' && toolData.output?.sources) {
                              toolSources = toolData.output.sources;
                              break;
                            }
                          }
                        }

                        if (toolSources.length > 0) {
                          return (
                            <div className="mt-4">
                              <Sources>
                                <SourcesTrigger count={toolSources.length} />
                                <SourcesContent>
                                  {toolSources.map((source: any, i: number) => (
                                    <Source
                                      key={`source-${item.id}-${i}`}
                                      href={source.url}
                                      title={source.title}
                                    />
                                  ))}
                                </SourcesContent>
                              </Sources>
                            </div>
                          );
                        }
                        return null;
                      })();

                  return (
                    <div key={item.id} className="w-full">
                      <MemoizedMessage message={message} isStreaming={isLoading} />
                      {sourcesComponent}
                    </div>
                  );
                }
              });
            })()
          )}
        </ConversationContent>
      </Conversation>

      <div className="p-4 flex-shrink-0">
        <PromptInput onSubmit={handleSubmit}>
          <PromptInputBody>
            <PromptInputTextarea placeholder="What would you like to know?" />
            <PromptInputToolbar>
              <div />
              <PromptInputSubmit status={isLoading ? "submitted" : undefined} />
            </PromptInputToolbar>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}
