"use client";

import ChatAssistant from "@/components/chat/chat-assistant";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useState } from "react";

export default function RAGAgentPage() {
  const [testQuery, setTestQuery] = useState("");
  const [testResponse, setTestResponse] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [showTestPanel, setShowTestPanel] = useState(false);

  const handleTestVectorize = async () => {
    if (!testQuery.trim()) return;

    setIsLoading(true);
    try {
      const response = await fetch("/api/vectorize-test", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ query: testQuery }),
      });

      const data = await response.json();
      setTestResponse(data);
    } catch (error) {
      console.error("Test failed:", error);
      setTestResponse({ error: "Test failed", details: error });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col max-w-4xl mx-auto overflow-hidden">
      <div className="border-b p-4">
        <h1 className="text-xl font-semibold">AI Chat Assistant</h1>

        {/* Vectorize Test Toggle */}
        <Button
          variant="outline"
          size="sm"
          className="mt-2"
          onClick={() => setShowTestPanel(!showTestPanel)}
        >
          {showTestPanel ? "Hide" : "Show"} Vectorize Test
        </Button>
      </div>

      {/* Vectorize Test Panel */}
      {showTestPanel && (
        <div className="border-b p-4 bg-muted/50">
          <div className="space-y-3">
            <div className="flex gap-2">
              <Input
                placeholder="Enter test query (e.g., 'How to call the API?')"
                value={testQuery}
                onChange={(e) => setTestQuery(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleTestVectorize()}
              />
              <Button
                onClick={handleTestVectorize}
                disabled={isLoading}
              >
                {isLoading ? "Testing..." : "Test"}
              </Button>
            </div>

            {testResponse && (
              <div className="mt-4 space-y-2">
                <div className="text-sm font-semibold">Response:</div>
                <pre className="p-3 bg-background rounded-md border overflow-auto max-h-96 text-xs">
                  {JSON.stringify(testResponse, null, 2)}
                </pre>
              </div>
            )}
          </div>
        </div>
      )}

      <div className="flex-1 overflow-hidden">
        <ChatAssistant />
      </div>
    </div>
  );
}