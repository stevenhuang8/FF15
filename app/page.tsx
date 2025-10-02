import Link from "next/link";
import Image from "next/image";

export default function Home() {
  return (
    <div className="min-h-screen flex items-center justify-center relative">
      {/* Background Image */}
      <Image
        src="/imgs/cooking-bg.jpg"
        alt="Cooking background"
        fill
        className="object-cover"
        priority
        quality={90}
      />

      {/* Dark overlay for readability */}
      <div className="absolute inset-0 bg-black/50" />

      {/* Content */}
      <div className="relative z-10 flex flex-col gap-6 p-8">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-bold text-white mb-2">AI Cooking Assistant</h1>
          <p className="text-white/80">Choose your agent</p>
        </div>

        <div className="flex flex-col gap-4">
          <Link
            href="/simple-agent"
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-8 py-4 text-center text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
          >
            <div className="font-semibold text-lg">Simple Agent</div>
            <div className="text-sm text-white/70 mt-1">Basic AI assistant</div>
          </Link>

          <Link
            href="/rag-agent"
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-8 py-4 text-center text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
          >
            <div className="font-semibold text-lg">RAG Agent</div>
            <div className="text-sm text-white/70 mt-1">Knowledge base powered</div>
          </Link>

          <Link
            href="/agent-with-mcp-tools"
            className="bg-white/10 backdrop-blur-md border border-white/20 rounded-lg px-8 py-4 text-center text-white hover:bg-white/20 transition-all duration-200 hover:scale-105"
          >
            <div className="font-semibold text-lg">Agent with MCP Tools</div>
            <div className="text-sm text-white/70 mt-1">Extended capabilities</div>
          </Link>
        </div>
      </div>
    </div>
  );
}
