import type { KnowledgeChunk, KnowledgeQueryInput } from '@geo-platform/shared-types';

export type KnowledgeRetrievalAdapterMode = 'vector' | 'graph';

export interface KnowledgeRetrievalAdapter {
  readonly mode: KnowledgeRetrievalAdapterMode;
  isAvailable(brandId: string): Promise<boolean>;
  query(brandId: string, input: KnowledgeQueryInput, limit: number): Promise<KnowledgeChunk[]>;
  index(brandId: string, chunks: KnowledgeChunk[]): Promise<void>;
}

export const KNOWLEDGE_RETRIEVAL_ADAPTER = Symbol('KNOWLEDGE_RETRIEVAL_ADAPTER');
