import ChatAssistant from "@/components/chat/chat-assistant";

export default function SimpleAgentPage() {
  return (
    <div className="h-screen bg-background flex flex-col max-w-4xl mx-auto overflow-hidden">
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">FF Coach</h1>
        <p className="text-sm text-muted-foreground mt-1">
          Your AI-powered Food & Fitness assistant
        </p>
      </div>

      <div className="flex-1 overflow-hidden">
        <ChatAssistant />
      </div>
    </div>
  );
}