import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="flex flex-col gap-4">
        <Link href="/simple-agent" className="text-center">
          Simple Agent
        </Link>
        <Link href="/rag-agent" className="text-center">
          RAG Agent
        </Link>
        <Link href="/agent-with-mcp-tools" className="text-center">
          Agent with MCP Tools
        </Link>
      </div>
    </div>
  );
}
