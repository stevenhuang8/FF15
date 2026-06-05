import { tool } from "ai";
import { z } from "zod";
import { VectorizeService } from "@/lib/retrieval/vectorize";

export const retrieveKnowledgeBase = tool({
  description:
    "Retrieve relevant information from the knowledge base. For multi-faceted questions (e.g. involving multiple ingredients, techniques, or dietary constraints), provide 2-3 focused additionalQueries to retrieve broader, more relevant context in parallel.",
  inputSchema: z.object({
    query: z
      .string()
      .describe("Primary search query for the knowledge base"),
    additionalQueries: z
      .array(z.string())
      .optional()
      .describe(
        "Optional extra queries for multi-faceted questions. Each should focus on a distinct aspect (e.g. technique, ingredient, dietary need). Max 2."
      ),
  }),
  execute: async ({ query, additionalQueries }) => {
    const vectorizeService = new VectorizeService();

    const allQueries = [query, ...(additionalQueries?.slice(0, 2) ?? [])];

    console.log(`🔍 RAG: running ${allQueries.length} query/queries in parallel`);

    try {
      const results = await Promise.all(
        allQueries.map((q) => vectorizeService.retrieveDocumentsWithQuality(q))
      );

      const mergedDocs = vectorizeService.deduplicateDocuments(
        results.flatMap((r) => r.documents)
      );

      const avgRelevancy =
        results.reduce((sum, r) => sum + r.averageRelevancy, 0) / results.length;
      const weakCoverage = results.every((r) => r.weakCoverage);

      if (mergedDocs.length === 0) {
        console.log("⚠️ RAG: no relevant documents found");
        return {
          message: "No relevant information found in the knowledge base for this query.",
          documentsFound: 0,
          weakCoverage: true,
          suggestion: "Consider using web_search for more current or specific information.",
        };
      }

      const context = vectorizeService.formatDocumentsForContext(mergedDocs);
      const sources = vectorizeService.convertDocumentsToChatSources(mergedDocs);

      console.log(
        `✅ RAG: ${mergedDocs.length} docs (avg relevancy: ${avgRelevancy.toFixed(2)}, weakCoverage: ${weakCoverage})`
      );

      return {
        message: `Found ${mergedDocs.length} relevant documents.`,
        documentsFound: mergedDocs.length,
        context,
        sources,
        averageRelevancy: avgRelevancy,
        weakCoverage,
        ...(weakCoverage && {
          suggestion: "Knowledge base coverage is partial — consider supplementing with web_search.",
        }),
      };
    } catch (error) {
      console.error("💥 RAG Tool error:", error);
      return {
        message: `Failed to retrieve from knowledge base: ${
          error instanceof Error ? error.message : "Unknown error"
        }`,
        documentsFound: 0,
        weakCoverage: true,
      };
    }
  },
});
