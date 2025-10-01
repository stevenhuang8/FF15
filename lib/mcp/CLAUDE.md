# MCP (Model Context Protocol) Integration

This directory contains MCP client abstractions for connecting to remote MCP servers.

## Critical Rule

**ALWAYS fetch and read the provided documentation before implementing any MCP-related code.**

## Documentation

### Firecrawl MCP Server
https://docs.firecrawl.dev/mcp-server

This documentation covers:
- Firecrawl's hosted MCP server implementation
- Available tools (scrape, batch_scrape, search, crawl, extract, deep_research, generate_llmstxt)
- Authentication and configuration
- SSE transport setup
- API key management

### AI SDK MCP Tools Integration
https://ai-sdk.dev/cookbook/node/mcp-tools

This documentation covers:
- How to create MCP clients with AI SDK
- SSE, stdio, and HTTP transport options
- Tool retrieval and combination patterns
- Integration with `generateText()` and `streamText()`
- Best practices for MCP client management

## Usage Pattern

1. Read the documentation links above before making changes
2. Follow the existing patterns in `/lib/mcp/client/`
3. Use SSE transport for hosted MCP servers
4. Always handle errors and add logging
5. Load credentials from environment variables

## Important Tips

- **Never disconnect MCP clients during streaming**: When using `streamText()`, tools may be called during the stream. Closing the client prematurely causes "closed client" errors.
- **Singleton pattern for connection reuse**: Use the singleton `getFirecrawlMCPClient()` to maintain persistent connections across requests for better performance.
- **SSE URL format**: Firecrawl's SSE endpoint is `https://mcp.firecrawl.dev/{API_KEY}/v2/sse` (not `/v2/mcp`).
- **Type compatibility**: Use `Record<string, any>` for tool return types to ensure compatibility with AI SDK's `streamText()`.
