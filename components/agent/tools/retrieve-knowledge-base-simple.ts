import { tool } from "ai";
import { z } from "zod";
import { VectorizeService } from "@/lib/retrieval/vectorize";

export const retrieveKnowledgeBaseSimple = tool({
  description:
    "Search the knowledge base for cooking techniques, recipes, ingredients, and culinary knowledge. For multi-faceted questions, provide 2-3 additionalQueries to retrieve broader context in parallel.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Primary search query for cooking techniques, recipes, or culinary information"),
    additionalQueries: z
      .array(z.string())
      .optional()
      .describe(
        "Optional extra queries for multi-faceted questions. Each should focus on a distinct aspect. Max 2."
      ),
  }),
  execute: async ({ query, additionalQueries }) => {
    const vectorizeService = new VectorizeService();
    const allQueries = [query, ...(additionalQueries?.slice(0, 2) ?? [])];

    console.log(`🔍 RAG (simple): running ${allQueries.length} query/queries in parallel`);

    try {
      const results = await Promise.all(
        allQueries.map((q) => vectorizeService.retrieveDocumentsWithQuality(q))
      );

      const mergedDocs = vectorizeService.deduplicateDocuments(
        results.flatMap((r) => r.documents)
      );

      const weakCoverage = results.every((r) => r.weakCoverage);

      if (mergedDocs.length === 0) {
        return {
          context: "No relevant information found in the knowledge base.",
          sources: [],
          weakCoverage: true,
        };
      }

      const chatSources = vectorizeService.convertDocumentsToChatSources(mergedDocs);

      const aiSdkSources = chatSources.map((source, index) => ({
        sourceType: "url" as const,
        id: `vectorize-source-${Date.now()}-${index}`,
        url: source.url,
        title: source.title || "Knowledge Base Source",
      }));

      console.log(`✅ RAG (simple): ${mergedDocs.length} docs, weakCoverage: ${weakCoverage}`);

      return {
        context: vectorizeService.formatDocumentsForContext(mergedDocs),
        sources: aiSdkSources,
        chatSources,
        weakCoverage,
        ...(weakCoverage && {
          suggestion: "Knowledge base coverage is partial — consider supplementing with web_search.",
        }),
      };
    } catch (error) {
      console.error(`💥 RAG (simple) error:`, error);
      throw error;
    }
  },
});
