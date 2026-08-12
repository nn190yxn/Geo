import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  KnowledgeChunk,
  KnowledgeCitation,
  KnowledgeEmbeddingCostPolicy,
  KnowledgeQueryInput,
  KnowledgeQueryResult,
  KnowledgeRetrievalFallbackReason
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { KNOWLEDGE_RETRIEVAL_ADAPTER, type KnowledgeRetrievalAdapter, type KnowledgeRetrievalAdapterMode } from './knowledge-retrieval.adapter';

const DEFAULT_LIMIT = 5;
const MAX_LIMIT = 20;

@Injectable()
export class KnowledgeRetrievalService {
  constructor(
    private readonly permissionsService: PermissionsService,
    @Optional() @Inject(KNOWLEDGE_RETRIEVAL_ADAPTER) private readonly advancedAdapter?: KnowledgeRetrievalAdapter | null
  ) {}

  async query(userId: string, brandId: string, input: KnowledgeQueryInput): Promise<KnowledgeQueryResult | null> {
    const query = input.query.trim();
    if (!query) throw new Error('知识查询内容不能为空');

    const limit = Math.min(MAX_LIMIT, Math.max(1, Math.trunc(input.limit ?? DEFAULT_LIMIT)));
    const embeddingCostPolicy = input.embeddingCostPolicy ?? 'full_text';
    const fallbackReasons: KnowledgeRetrievalFallbackReason[] = [];
    const advancedResult = await this.queryAdvanced(userId, brandId, input, limit, embeddingCostPolicy, fallbackReasons);
    const advancedChunks = advancedResult.ranked;
    const fullTextChunks = await this.permissionsService.searchKnowledgeChunks(userId, brandId, query, MAX_LIMIT * 5);
    if (!fullTextChunks) return null;
    const rankedFullText = rankKnowledgeChunks(fullTextChunks, query);
    const structuredChunks = rankedFullText.length < limit ? await this.permissionsService.listKnowledgeChunks(userId, brandId) : [];
    const rankedStructured = rankKnowledgeChunks(latestChunksBySource(structuredChunks ?? []), query);
    if (rankedFullText.length < limit && rankedStructured.length < limit - rankedFullText.length) {
      fallbackReasons.push('structured_insufficient');
    }
    const ranked = mergeRankedChunks(
      [...advancedChunks, ...rankedFullText, ...rankedStructured],
      limit,
      advancedChunks.length > 0
    );
    const approved = ranked.filter((item) => item.chunk.reviewStatus === 'approved').slice(0, limit);
    const pending = ranked.filter((item) => item.chunk.reviewStatus === 'pending').slice(0, limit);
    const selected = approved.length > 0 ? approved : pending;
    const citations = selected.map(({ chunk }) => toCitation(chunk));
    const confidence = approved.length > 0 ? 'trusted' : pending.length > 0 ? 'needs_confirmation' : 'insufficient';
    const retrievalMode = resolveRetrievalMode(advancedResult.mode, rankedFullText.length > 0, rankedStructured.length > 0);
    const answer = approved.length > 0 ? approved.map(({ chunk }) => chunk.content).join('\n\n') : undefined;
    const auditLog = await Promise.resolve(this.permissionsService.createAuditLog(userId, {
      brandId,
      actorUserId: userId,
      action: 'knowledge.query',
      resourceType: input.purpose ?? 'manual_query',
      resourceId: input.resourceId?.trim() || null,
      result: 'success',
      metadata: {
        query,
         retrievalMode,
         embeddingCostPolicy,
         fallbackReasons,
        confidence,
        chunkIds: citations.map((citation) => citation.id),
        sourceReferences: citations.map((citation) => ({
          sourceId: citation.sourceId,
          sourceUrl: citation.sourceUrl,
          sourceVersion: citation.sourceVersion
        }))
      }
    }));

    return {
      brandId,
      query,
      answer,
      citations,
      confidence,
      retrievalMode,
      embeddingCostPolicy,
      fallbackReasons,
      gap: confidence === 'trusted' ? undefined : {
        code: confidence === 'needs_confirmation' ? 'unconfirmed_evidence' : 'no_matching_evidence',
        message: confidence === 'needs_confirmation' ? '检索到的资料仍待确认，请先完成审核。' : '未找到与当前问题匹配的已确认品牌资料。',
        supplementPath: `/brands/${brandId}/profile?section=sources&action=upload`,
        confirmationPath: `/brands/${brandId}/profile?section=facts&review=pending`
      },
      usageId: auditLog.id
    };
  }

  private async queryAdvanced(
    userId: string,
    brandId: string,
    input: KnowledgeQueryInput,
    limit: number,
    policy: KnowledgeEmbeddingCostPolicy,
    fallbackReasons: KnowledgeRetrievalFallbackReason[]
  ): Promise<{ ranked: Array<{ chunk: KnowledgeChunk; score: number }>; mode?: KnowledgeRetrievalAdapterMode }> {
    if (policy === 'full_text') return { ranked: [] };
    if (!this.advancedAdapter) {
      fallbackReasons.push('advanced_unavailable');
      return { ranked: [] };
    }
    try {
      if (!(await this.advancedAdapter.isAvailable(brandId))) {
        fallbackReasons.push('advanced_unavailable');
        return { ranked: [] };
      }
      const chunks = await this.advancedAdapter.query(brandId, input, limit * 2);
      const ranked = rankKnowledgeChunks(chunks, input.query, true);
      if (ranked.length < limit) fallbackReasons.push('advanced_insufficient');
      return { ranked, mode: ranked.length > 0 ? this.advancedAdapter.mode : undefined };
    } catch {
      fallbackReasons.push('advanced_failed');
      return { ranked: [] };
    }
  }
}

function mergeRankedChunks(
  ranked: Array<{ chunk: KnowledgeChunk; score: number }>,
  limit: number,
  hasAdvancedResults: boolean
): Array<{ chunk: KnowledgeChunk; score: number }> {
  const unique = new Map<string, { chunk: KnowledgeChunk; score: number }>();
  for (const item of ranked) {
    const existing = unique.get(item.chunk.id);
    if (!existing || item.score > existing.score) unique.set(item.chunk.id, item);
  }
  const merged = [...unique.values()].sort((left, right) => right.score - left.score || right.chunk.updatedAt.localeCompare(left.chunk.updatedAt) || left.chunk.id.localeCompare(right.chunk.id));
  if (hasAdvancedResults && merged.length < limit) return merged;
  return merged.slice(0, limit);
}

function resolveRetrievalMode(advancedMode: KnowledgeRetrievalAdapterMode | undefined, hasFullTextResults: boolean, hasStructuredResults: boolean): KnowledgeQueryResult['retrievalMode'] {
  if (advancedMode && hasFullTextResults) return 'hybrid';
  if (advancedMode) return advancedMode;
  if (hasFullTextResults) return 'full_text';
  if (hasStructuredResults) return 'structured';
  return 'none';
}

function latestChunksBySource(chunks: KnowledgeChunk[]): KnowledgeChunk[] {
  const latest = new Map<string, KnowledgeChunk>();
  for (const chunk of chunks) {
    const existing = latest.get(chunk.sourceId);
    if (!existing || chunk.sourceVersion > existing.sourceVersion) latest.set(chunk.sourceId, chunk);
  }
  return [...latest.values()];
}

function rankKnowledgeChunks(chunks: KnowledgeChunk[], query: string, includeUnmatched = false): Array<{ chunk: KnowledgeChunk; score: number }> {
  const normalizedQuery = normalizeSearchText(query);
  const terms = buildSearchTerms(normalizedQuery);
  return chunks
    .map((chunk) => {
      const content = normalizeSearchText(chunk.content);
      const exactScore = content.includes(normalizedQuery) ? 100 : 0;
      const termScore = terms.reduce((score, term) => score + (content.includes(term) ? term.length : 0), 0);
      return { chunk, score: exactScore + termScore || (includeUnmatched ? 1 : 0) };
    })
    .filter((item) => item.score > 0)
    .sort((left, right) => right.score - left.score || right.chunk.updatedAt.localeCompare(left.chunk.updatedAt) || left.chunk.id.localeCompare(right.chunk.id));
}

function buildSearchTerms(query: string): string[] {
  const words = query.split(/\s+/).filter((item) => item.length >= 2);
  if (words.length > 1) return [...new Set(words)];
  if (query.length <= 2) return query ? [query] : [];
  return [...new Set(Array.from({ length: query.length - 1 }, (_, index) => query.slice(index, index + 2)))];
}

function normalizeSearchText(value: string): string {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, ' ').trim();
}

function toCitation(chunk: KnowledgeChunk): KnowledgeCitation {
  return {
    id: chunk.id,
    sourceId: chunk.sourceId,
    sourceUrl: chunk.sourceUrl,
    sourceVersion: chunk.sourceVersion,
    content: chunk.content,
    reviewStatus: chunk.reviewStatus,
    updatedAt: chunk.updatedAt,
    trusted: chunk.reviewStatus === 'approved'
  };
}
