"use client";

import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport, type ToolUIPart } from "ai";
import { useState } from "react";
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

export default function ChatAssistant({ api }: ChatAssistantProps = {}) {
  const [input, setInput] = useState("");
  const { messages, status, sendMessage } = useChat({
    transport: api ? new DefaultChatTransport({ api }) : undefined,
  });

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
          {messages.length === 0 ? (
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

              // Extract flow items (messages + tool calls) in chronological order
              const flowItems: Array<{
                type: 'message' | 'tool-call';
                data: any;
                id: string;
                messageId?: string;
                displayName?: string;
              }> = [];

              messages.forEach((message) => {
                // Extract tool calls from this message and add as separate flow items
                const toolParts = (message as any).parts?.filter((part: any) =>
                  part.type?.startsWith('tool-')
                ) || [];

                toolParts.forEach((toolPart: any, index: number) => {
                  // Generate unique key using multiple fallback strategies
                  const uniqueId = toolPart.toolCallId ||
                                  toolPart.id ||
                                  `${message.id}-${toolPart.type}-${index}`;

                  flowItems.push({
                    type: 'tool-call',
                    data: toolPart,
                    id: `tool-${uniqueId}`,
                    messageId: message.id,
                    displayName: toolDisplayNames[toolPart.type] || toolPart.type
                  });
                });

                // Add the message itself (with tool calls removed from parts)
                const messageWithoutTools = {
                  ...message,
                  parts: (message as any).parts?.filter((part: any) =>
                    !part.type?.startsWith('tool-')
                  ) || []
                };

                // Only add message if it has content (text, reasoning, or legacy content)
                const hasContent = messageWithoutTools.parts.length > 0 || !!(message as any).content;
                if (hasContent) {
                  flowItems.push({
                    type: 'message',
                    data: messageWithoutTools,
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

                  // Determine if tool should be expanded based on state
                  const shouldBeExpanded = toolPart.state === "input-streaming" ||
                                          toolPart.state === "input-available" ||
                                          toolPart.state === "output-error";

                  return (
                    <div key={item.id} className="w-full mb-4">
                      <Tool defaultOpen={shouldBeExpanded}>
                        <ToolHeader
                          type={item.displayName || toolPart.type}
                          state={toolPart.state}
                        />
                        <ToolContent>
                          {toolPart.input && (
                            <ToolInput input={toolPart.input} />
                          )}
                          {toolPart.output && (
                            <ToolOutput
                              output={toolPart.output}
                              errorText={toolPart.errorText}
                            />
                          )}
                          {toolPart.state === "input-streaming" && (
                            <div className="text-sm text-muted-foreground p-2">
                              🔍 {item.displayName}...
                            </div>
                          )}
                        </ToolContent>
                      </Tool>
                    </div>
                  );
                } else {
                  // Render regular message
                  const message = item.data;

                  return (
                    <div key={item.id} className="w-full">
                      <Message from={message.role}>
                        <MessageContent>
                          {message.parts?.map((part: any, i: number) => {
                            switch (part.type) {
                              case "text":
                                return (
                                  <span key={`${item.id}-${i}`}>{part.text}</span>
                                );
                              case "reasoning":
                                return (
                                  <span key={`${item.id}-${i}`}>{part.text}</span>
                                );
                              default:
                                return null;
                            }
                          }) ||
                            message.content ||
                            ""}
                        </MessageContent>
                      </Message>

                      {/* Display sources - only for assistant messages with actual text content */}
                      {message.role === 'assistant' && (() => {
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
                      })()}
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
