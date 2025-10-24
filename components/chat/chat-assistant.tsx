"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
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
import { Response } from "@/components/ai-elements/response";
import { SaveRecipeButton } from "@/components/recipe/save-recipe-button";
import { SaveWorkoutButton } from "@/components/workout/save-workout-button";
import { RecipeFromIngredientsButton } from "@/components/recipe/recipe-from-ingredients-button";
import { isRecipeContent, getMessageTextContent } from "@/lib/recipe-detection";
import { isWorkoutContent } from "@/lib/workout-detection";

interface ChatAssistantProps {
  api?: string;
}

// Memoized components for better performance
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
  const content = textParts.map((part: any, i: number) => part.text).join('') || message.content || "";

  // Check if assistant is streaming with no content yet
  const isAssistantStreamingEmpty = message.role === 'assistant' && isStreaming && !content;

  return (
    <>
      {/* Render text message if there's content OR if assistant is streaming (show placeholder) */}
      {(textParts.length > 0 || message.content || isAssistantStreamingEmpty) && (
        <Message from={message.role}>
          <MessageContent>
            <Response>
              {isAssistantStreamingEmpty ? (
                <span className="text-muted-foreground animate-pulse">...</span>
              ) : (
                content
              )}
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

  // Get user's timezone to send with every request
  const userTimezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const timezoneOffset = new Date().getTimezoneOffset();

  const { messages: rawMessages, status, sendMessage, setMessages } = useChat({
    transport: api ? new DefaultChatTransport({
      api,
      headers: {
        'X-User-Timezone': userTimezone,
        'X-User-Timezone-Offset': String(timezoneOffset),
      }
    }) : undefined,
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
        // Only save 'text' parts, not reasoning tokens
        const textParts = (msg as any).parts?.filter((p: any) =>
          p.type === 'text'
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
            <Message from="assistant">
              <MessageContent>
                <Response>
                  Hi! I'm your personal cooking, nutrition, and fitness assistant. I can help you with:

                  - **Recipe recommendations** and cooking guidance
                  - **Nutritional information** and meal planning
                  - **Workout routines** and fitness advice
                  - **Ingredient substitutions** and dietary adjustments

                  What would you like to know?
                </Response>
              </MessageContent>
            </Message>
          ) : (
            (() => {
              // Extract flow items (messages only - tool calls and reasoning are hidden)
              const flowItems: Array<{
                type: 'message';
                data: any;
                id: string;
              }> = [];

              messages.forEach((message) => {
                // Process all parts in chronological order
                const parts = (message as any).parts || [];

                // Skip tool and reasoning parts - only process text parts
                // parts.forEach block removed to hide tool calls and reasoning from UI

                // Add the message itself (with only text parts and legacy content)
                const messageWithTextOnly = {
                  ...message,
                  parts: parts.filter((part: any) =>
                    part.type === 'text' || !part.type // include parts without type for backward compatibility
                  )
                };

                // Add message if it has content OR if it's an assistant message during streaming (for placeholder)
                const hasContent = messageWithTextOnly.parts.length > 0 || !!(message as any).content;
                const isStreamingAssistant = message.role === 'assistant' && isLoading;

                if (hasContent || isStreamingAssistant) {
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
                // Only render messages (tool-call and reasoning rendering removed)
                if (item.type === 'message') {
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

                        // Extract sources directly from the original message parts
                        // Look for retrieveKnowledgeBase tool calls in this message
                        let toolSources: any[] = [];

                        // Get the original message from messages array (not the filtered one)
                        const originalMessage = messages.find(m => m.id === message.id);
                        const allParts = (originalMessage as any)?.parts || [];

                        const ragToolCalls = allParts.filter(
                          (part: any) => part.type === 'tool-retrieveKnowledgeBase' && part.output?.sources
                        );

                        if (ragToolCalls.length > 0) {
                          toolSources = ragToolCalls.flatMap((tool: any) => tool.output?.sources || []);
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

                  // Check if this assistant message contains a recipe or workout
                  const messageText = getMessageTextContent(message);
                  const hasRecipe = message.role === 'assistant' && isRecipeContent(messageText);
                  const hasWorkout = message.role === 'assistant' && isWorkoutContent(messageText);

                  return (
                    <div key={item.id} className="w-full">
                      <MemoizedMessage message={message} isStreaming={isLoading}>
                        {/* Show Save Recipe button for assistant messages containing recipes */}
                        {hasRecipe && !isLoading && (
                          <div className="mt-3">
                            <SaveRecipeButton
                              messageId={message.id}
                              messageContent={messageText}
                              conversationId={currentConversationId || undefined}
                            />
                          </div>
                        )}
                        {/* Show Save Workout button for assistant messages containing workouts */}
                        {hasWorkout && !isLoading && (
                          <div className="mt-3">
                            <SaveWorkoutButton
                              messageId={message.id}
                              messageContent={messageText}
                              conversationId={currentConversationId || undefined}
                            />
                          </div>
                        )}
                      </MemoizedMessage>
                      {sourcesComponent}
                    </div>
                  );
                }
                // Return null for non-message types (shouldn't happen now, but defensive)
                return null;
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
              <RecipeFromIngredientsButton
                onGenerateRecipe={(message) => {
                  sendMessage({ text: message });
                }}
                variant="ghost"
                iconOnly
              />
              <PromptInputSubmit status={isLoading ? "submitted" : undefined} />
            </PromptInputToolbar>
          </PromptInputBody>
        </PromptInput>
      </div>
    </div>
  );
}
