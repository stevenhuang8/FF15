import { WEB_SCRAPER_SYSTEM_INSTRUCTIONS } from "@/components/agent/web-scraper-prompt";
import { getFirecrawlMCPClient } from "@/lib/mcp";
import { createClient } from "@/lib/supabase/server";
import { anthropic } from "@ai-sdk/anthropic";
import {
  streamText,
  convertToModelMessages,
  isStepCount,
  createUIMessageStreamResponse,
  toUIMessageStream,
} from "ai";
import { NextRequest } from "next/server";

export async function POST(request: NextRequest) {
  try {
    const supabase = await createClient();
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser();

    if (authError || !user) {
      return new Response("Unauthorized - Please sign in to use the assistant", { status: 401 });
    }

    const { messages } = await request.json();

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return new Response("Messages array is required", { status: 400 });
    }

    const modelMessages = await convertToModelMessages(messages);

    // Initialize Firecrawl MCP client
    console.log("🚀 Initializing Firecrawl MCP client...");
    const firecrawlClient = getFirecrawlMCPClient();
    await firecrawlClient.connect();

    // Retrieve Firecrawl tools
    const tools = await firecrawlClient.getTools();

    console.log(
      `🔧 Agent has access to ${Object.keys(tools).length} Firecrawl MCP tools`
    );

    // Wrap tools to log when they are called
    const wrappedTools = Object.fromEntries(
      Object.entries(tools).map(([toolName, toolDef]) => [
        toolName,
        {
          ...toolDef,
          execute: async (args: any) => {
            console.log(`\n🔧 Tool called: ${toolName}`);
            console.log(`   Input:`, JSON.stringify(args, null, 2));
            const result = await toolDef.execute(args);
            console.log(`   Output:`, JSON.stringify(result, null, 2));
            return result;
          },
        },
      ])
    );

    const result = streamText({
      model: anthropic("claude-sonnet-5-5"),
      instructions: WEB_SCRAPER_SYSTEM_INSTRUCTIONS,
      messages: modelMessages,
      tools: wrappedTools,
      stopWhen: isStepCount(10),
      providerOptions: {
        anthropic: {
          effort: "low",
          thinking: { type: "adaptive", display: "summarized" },
          fallbacks: "default",
        },
      },
    });

    return createUIMessageStreamResponse({
      stream: toUIMessageStream({ stream: result.stream }),
    });
  } catch (error) {
    console.error("💥 Agent API error:", error);
    return new Response("Failed to generate response", { status: 500 });
  }
}
