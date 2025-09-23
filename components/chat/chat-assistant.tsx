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
    type: `tool-${string}`;
    state: "input-streaming" | "input-available" | "output-available" | "output-error";
    input?: any;
    output?: any;
    errorText?: string;
  }>;
};

export default function ChatAssistant() {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

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

      if (!response.ok) {
        throw new Error("Failed to get response");
      }

      // Create a placeholder assistant message that we'll update as we stream
      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: ChatMessage = {
        id: assistantMessageId,
        role: "assistant",
        content: "",
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Handle the streaming response
      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (reader) {
        let done = false;
        let accumulatedContent = "";

        while (!done) {
          const { value, done: readerDone } = await reader.read();
          done = readerDone;

          if (value) {
            const chunk = decoder.decode(value, { stream: true });
            accumulatedContent += chunk;

            // Update the assistant message with the accumulated content
            setMessages((prev) =>
              prev.map((msg) =>
                msg.id === assistantMessageId
                  ? { ...msg, content: accumulatedContent }
                  : msg
              )
            );
          }
        }
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
              <div key={message.id} className="w-full">
                <Message from={message.role}>
                  <MessageContent>{message.content}</MessageContent>
                </Message>

                {/* Display sources if available */}
                {(message as any).sources && (message as any).sources.length > 0 && (
                  <div className="mt-4">
                    <Sources>
                      <SourcesTrigger count={(message as any).sources.length} />
                      <SourcesContent>
                        {(message as any).sources.map((source: any, index: number) => (
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

                {/* Display tool calls if available */}
                {(message as any).toolCalls && Array.isArray((message as any).toolCalls) && (message as any).toolCalls.length > 0 && (
                  <div className="mt-4">
                    {(message as any).toolCalls.map((toolCall: any, index: number) => (
                      <Tool
                        key={index}
                        defaultOpen={toolCall.state === "output-available"}
                      >
                        <ToolHeader
                          type={toolCall.type}
                          state={toolCall.state}
                        />
                        <ToolContent>
                          {toolCall.input && (
                            <ToolInput input={toolCall.input} />
                          )}
                          {(toolCall.output || toolCall.errorText) && (
                            <ToolOutput
                              output={toolCall.output}
                              errorText={toolCall.errorText}
                            />
                          )}
                        </ToolContent>
                      </Tool>
                    ))}
                  </div>
                )}
              </div>
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
