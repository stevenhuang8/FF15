import { RAG_SYSTEM_INSTRUCTIONS } from "@/components/agent/rag-prompt";
import { retrieveKnowledgeBaseSimple } from "@/components/agent/tools";
import { openai } from "@ai-sdk/openai";
import { streamText, convertToModelMessages, stepCountIs } from "ai";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages array is required", { status: 400 });
    }


    const modelMessages = convertToModelMessages(messages);

    const result = streamText({
      model: openai("gpt-5"),
      system: RAG_SYSTEM_INSTRUCTIONS,
      messages: modelMessages,
      stopWhen: stepCountIs(10),
      tools: {
        retrieveKnowledgeBase: retrieveKnowledgeBaseSimple,
      },
    });

    // Return the stream - sources will be in tool results and extracted by frontend
    return result.toUIMessageStreamResponse();
  } catch (error) {
    console.error("Chat API error:", error);
    return new Response("Failed to generate response", { status: 500 });
  }
}
