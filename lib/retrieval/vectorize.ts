import { Configuration, PipelinesApi } from "@vectorize-io/vectorize-client";
import type { VectorizeDocument } from "@/types/vectorize";
import type { ChatSource } from "@/types/chat";

const RELEVANCE_THRESHOLD = 0.5;

export interface RetrievalResult {
  documents: VectorizeDocument[];
  averageRelevancy: number;
  ndcg: number;
  weakCoverage: boolean;
}

export class VectorizeService {
  private pipelinesApi: any;
  private organizationId: string;
  private pipelineId: string;

  constructor() {
    const config = new Configuration({
      accessToken: process.env.VECTORIZE_ACCESS_TOKEN,
      basePath: "https://api.vectorize.io/v1",
    });

    this.pipelinesApi = new PipelinesApi(config);
    this.organizationId = process.env.VECTORIZE_ORG_ID!;
    this.pipelineId = process.env.VECTORIZE_PIPELINE_ID!;
  }

  async retrieveDocuments(
    question: string,
    numResults: number = 5
  ): Promise<VectorizeDocument[]> {
    const result = await this.retrieveDocumentsWithQuality(question, numResults);
    return result.documents;
  }

  async retrieveDocumentsWithQuality(
    question: string,
    numResults: number = 5
  ): Promise<RetrievalResult> {
    try {
      const response = await this.pipelinesApi.retrieveDocuments({
        organizationId: this.organizationId,
        pipelineId: this.pipelineId,
        retrieveDocumentsRequest: {
          question,
          numResults,
        },
      });

      const allDocuments: VectorizeDocument[] = response.documents || [];
      const averageRelevancy: number = response.averageRelevancy ?? 0;
      const ndcg: number = response.ndcg ?? 0;

      const documents = this.filterByRelevance(allDocuments);
      const weakCoverage = documents.length === 0 || averageRelevancy < 0.5 || ndcg < 0.4;

      return { documents, averageRelevancy, ndcg, weakCoverage };
    } catch (error: any) {
      console.error("Vectorize API Error:", error);
      if (error?.response?.text) {
        console.error("Error details:", await error.response.text());
      }
      throw new Error(
        `Failed to retrieve documents from Vectorize: ${error?.message || "Unknown error"}`
      );
    }
  }

  filterByRelevance(
    documents: VectorizeDocument[],
    threshold: number = RELEVANCE_THRESHOLD
  ): VectorizeDocument[] {
    return documents.filter(
      (doc) => (doc.relevancy ?? doc.similarity ?? 0) >= threshold
    );
  }

  deduplicateDocuments(documents: VectorizeDocument[]): VectorizeDocument[] {
    const seen = new Set<string>();
    return documents.filter((doc) => {
      const key = doc.chunk_id || doc.id;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  formatDocumentsForContext(documents: VectorizeDocument[]): string {
    if (!documents.length) {
      return "No relevant documents found.";
    }

    return documents
      .map((doc, index) => `Document ${index + 1}:\n${doc.text}`)
      .join("\n\n---\n\n");
  }

  convertDocumentsToChatSources(documents: VectorizeDocument[]): ChatSource[] {
    return documents.map((doc) => ({
      id: doc.id,
      title: doc.source_display_name || doc.source,
      url: doc.source,
      snippet: doc.text,
      relevancy: doc.relevancy,
      similarity: doc.similarity,
    }));
  }
}
