import { Injectable } from '@nestjs/common';

export type InfrastructureMetrics = { knowledgeChunks: number; relationshipQueries: number; objectAssetBytes: number; retrievalLatencyMs: number };
@Injectable()
export class InfrastructureBoundaryService {
  select(metrics: InfrastructureMetrics) { return { retrieval: metrics.knowledgeChunks > 10_000 || metrics.retrievalLatencyMs > 500 ? 'qdrant_adapter' : 'postgres_adapter', graph: metrics.relationshipQueries > 1_000 ? 'neo4j_adapter' : 'postgres_adapter', assets: metrics.objectAssetBytes > 1_073_741_824 ? 'object_storage_adapter' : 'postgres_adapter' }; }
}
