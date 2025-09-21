import { SYSTEM_INSTRUCTIONS } from "@/components/agent/prompt";
import { openai } from "@ai-sdk/openai";
import { generateText } from "ai";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return NextResponse.json(
        { error: "Messages array is required" },
        { status: 400 }
      );
    }

    // Convert frontend message format to AI SDK format
    const aiMessages = messages.map((msg: any) => ({
      role: msg.role,
      content: msg.content,
    }));

    const result = await generateText({
      model: openai("gpt-5"),
      system: SYSTEM_INSTRUCTIONS,
      messages: aiMessages,
      tools: {
        web_search: openai.tools.webSearch({
          searchContextSize: "low",
        }),
      },
    });

    // Extract and format tool calls from steps
    const toolCalls = result.steps?.flatMap(step => 
      step.toolCalls?.map(toolCall => ({
        type: `tool-${toolCall.toolName}`,
        state: "output-available" as const,
        input: (toolCall as any).args,
        output: (step.toolResults?.find(result => 
          result.toolCallId === toolCall.toolCallId
        ) as any)?.result || (step.toolResults?.find(result => 
          result.toolCallId === toolCall.toolCallId
        ) as any)
      })) || []
    ) || [];

    return NextResponse.json({
      response: result.text,
      sources: result.sources || [],
      toolCalls,
    });
  } catch (error) {
    console.error("Chat API error:", error);
    return NextResponse.json(
      { error: "Failed to generate response" },
      { status: 500 }
    );
  }
}
