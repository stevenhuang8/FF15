"use client";

import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import ChatAssistant from "@/components/chat/chat-assistant";
import ConversationList from "@/components/chat/conversation-list";

function ChatHistoryContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  // Deep link support: /chat-history?conversation=<id> (e.g. "View source conversation" on saved recipes/workouts)
  const conversationParam = searchParams.get("conversation");

  const [selectedConversationId, setSelectedConversationId] = useState<string | null>(conversationParam);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  // Follow the URL when it changes while this page is already mounted
  useEffect(() => {
    setSelectedConversationId(conversationParam);
  }, [conversationParam]);

  // Keep the URL in sync with the selected conversation
  const selectConversation = (conversationId: string | null) => {
    setSelectedConversationId(conversationId);
    router.replace(
      conversationId ? `/chat-history?conversation=${conversationId}` : "/chat-history",
      { scroll: false }
    );
  };

  const handleSelectConversation = (conversationId: string) => {
    selectConversation(conversationId);
  };

  const handleNewConversation = () => {
    selectConversation(null);
  };

  const handleConversationCreated = (conversationId: string) => {
    selectConversation(conversationId);
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

export default function ChatHistoryPage() {
  // useSearchParams requires a Suspense boundary in Next.js 15
  return (
    <Suspense fallback={null}>
      <ChatHistoryContent />
    </Suspense>
  );
}
