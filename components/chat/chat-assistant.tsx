"use client";

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
    type: string;
    state: string;
    input?: any;
    output?: any;
    errorText?: string;
  }>;
};

export default function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  console.log(messages);

  const handleSubmit = async (
    message: { text?: string; files?: any[] },
    event: React.FormEvent
  ) => {
    if (!message.text?.trim() || isLoading) return;

    // Clear the form immediately after extracting the message
    const form = (event.target as Element)?.closest("form") as HTMLFormElement;
    if (form) {
      form.reset();
    }

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: "user",
      content: message.text,
    };

    // Create the updated messages array including the new user message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    setIsLoading(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: updatedMessages }),
      });

      const data = await response.json();

      if (response.ok) {
        const assistantMessage: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: "assistant",
          content: data.response,
          sources: data.sources || [],
          toolCalls: data.toolCalls || [],
        };
        setMessages((prev) => [...prev, assistantMessage]);
      } else {
        throw new Error(data.error || "Failed to get response");
      }
    } catch (error) {
      const errorMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        role: "assistant",
        content: "Sorry, I encountered an error. Please try again.",
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

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
            messages.map((message) => (
              <Message key={message.id} from={message.role}>
                <MessageContent>{message.content}</MessageContent>

                {/* Display tool calls if available */}
                {message.toolCalls && message.toolCalls.length > 0 && (
                  <div className="mt-4">
                    {message.toolCalls.map((toolCall, index) => (
                      <Tool
                        key={index}
                        defaultOpen={toolCall.state === "output-available"}
                      >
                        <ToolHeader
                          type={toolCall.type as any}
                          state={toolCall.state as any}
                        />
                        <ToolContent>
                          {toolCall.input && (
                            <ToolInput input={toolCall.input} />
                          )}
                          {(toolCall.output || toolCall.errorText) && (
                            <ToolOutput
                              output={toolCall.output}
                              errorText={toolCall.errorText as any}
                            />
                          )}
                        </ToolContent>
                      </Tool>
                    ))}
                  </div>
                )}

                {/* Display sources if available */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-4">
                    <Sources>
                      <SourcesTrigger count={message.sources.length} />
                      <SourcesContent>
                        {message.sources.map((source, index) => (
                          <Source
                            key={index}
                            href={source.url}
                            title={source.title || source.url}
                          />
                        ))}
                      </SourcesContent>
                    </Sources>
                  </div>
                )}
              </Message>
            ))
          )}
          {isLoading && (
            <Message from="assistant">
              <MessageContent>Thinking...</MessageContent>
            </Message>
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
