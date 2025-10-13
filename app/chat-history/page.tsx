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
      <aside className="w-80 flex-shrink-0 border-r bg-muted/30 overflow-y-auto relative z-20">
        <ConversationList
          onSelectConversation={handleSelectConversation}
          currentConversationId={selectedConversationId}
          onNewConversation={handleNewConversation}
          refreshTrigger={refreshTrigger}
        />
      </aside>

      {/* Main chat area */}
      <main className="flex-1 bg-background relative">
        <ChatAssistant
          api="/api/rag-agent"
          conversationId={selectedConversationId}
          onConversationCreated={handleConversationCreated}
        />
      </main>
    </div>
  );
}
