"use client";

import { useChat } from "@ai-sdk/react";
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

export default function ChatAssistant() {
  const [input, setInput] = useState("");
  const { messages, status, sendMessage } = useChat();

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
            messages.map((message) => (
              <div key={message.id} className="w-full">
                <Message from={message.role}>
                  <MessageContent>
                    {(message as any).parts?.map((part: any, i: number) => {
                      switch (part.type) {
                        case "text":
                          return (
                            <span key={`${message.id}-${i}`}>{part.text}</span>
                          );
                        case "reasoning":
                          return (
                            <span key={`${message.id}-${i}`}>{part.text}</span>
                          );
                        default:
                          return null;
                      }
                    }) ||
                      (message as any).content ||
                      ""}
                  </MessageContent>
                </Message>

                {/* Display tool calls and sources from parts */}
                {(message as any).parts?.map((part: any, i: number) => {
                  if (part.type === "tool" && part.result) {
                    return (
                      <div className="mt-4" key={`tool-${message.id}-${i}`}>
                        <Tool defaultOpen={true}>
                          <ToolHeader
                            type={`tool-${part.toolName}`}
                            state="output-available"
                          />
                          <ToolContent>
                            {part.args && <ToolInput input={part.args} />}
                            {part.result && (
                              <ToolOutput
                                output={part.result}
                                errorText={undefined}
                              />
                            )}
                          </ToolContent>
                        </Tool>
                      </div>
                    );
                  }
                  if (part.type === "source-url") {
                    return (
                      <div className="mt-4" key={`source-${message.id}-${i}`}>
                        <Sources>
                          <SourcesTrigger count={1} />
                          <SourcesContent>
                            <Source
                              href={part.url}
                              title={part.title || part.url}
                            />
                          </SourcesContent>
                        </Sources>
                      </div>
                    );
                  }
                  return null;
                })}
              </div>
            ))
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
