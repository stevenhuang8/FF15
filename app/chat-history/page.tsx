"use client";

import { useState } from "react";
import ChatAssistant from "@/components/chat/chat-assistant";
import ConversationList from "@/components/chat/conversation-list";

export default function ChatHistoryPage() {
  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  const handleSelectConversation = (conversationId: string) => {
    setSelectedConversationId(conversationId);
  };

  const handleNewConversation = () => {
    setSelectedConversationId(null);
  };

  const handleConversationCreated = (conversationId: string) => {
    setSelectedConversationId(conversationId);
    setRefreshTrigger(prev => prev + 1); // Trigger list refresh
  };

  return (
    <div className="flex h-screen overflow-hidden">
      {/* Sidebar with conversation list */}
      <aside className="w-96 max-w-96 min-w-0 flex-shrink-0 border-r bg-muted/30 overflow-x-hidden relative z-40 h-full">
        <ConversationList
          onSelectConversation={handleSelectConversation}
          currentConversationId={selectedConversationId}
          onNewConversation={handleNewConversation}
          refreshTrigger={refreshTrigger}
        />
      </aside>

      {/* Main chat area */}
      <main className="flex-1 bg-background relative flex justify-center  ">
        <div className="w-full max-w-4xl">
          <ChatAssistant
            conversationId={selectedConversationId}
            onConversationCreated={handleConversationCreated}
          />
        </div>
      </main>
    </div>
  );
}
