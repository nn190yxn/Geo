import { createHash } from 'node:crypto';
import { Injectable, NotFoundException } from '@nestjs/common';
import type {
  KnowledgeChunk,
  KnowledgeChunkInput,
  KnowledgeChunkReviewStatus,
  KnowledgeChunkSyncResult,
  KnowledgeSource,
  QuickStartFactCandidate
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { QuickStartService } from '../quick-start/quick-start.service';

const maxChunkLength = 800;

@Injectable()
export class KnowledgeChunkService {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly quickStartService: QuickStartService
  ) {}

  async list(userId: string, brandId: string, sourceId?: string): Promise<KnowledgeChunk[]> {
    const chunks = await this.permissionsService.listKnowledgeChunks(userId, brandId, sourceId);
    if (!chunks) throw new NotFoundException('品牌知识片段不存在或当前用户无权访问');
    return chunks;
  }

  async syncConfirmedFacts(userId: string, brandId: string): Promise<KnowledgeChunkSyncResult> {
    const sources = await this.permissionsService.listKnowledgeSources(userId, brandId);
    if (!sources) throw new NotFoundException('品牌知识来源不存在或当前用户无权访问');
    const session = await this.quickStartService.get(userId, brandId);
    const facts = session?.draft.facts?.candidates.filter((fact) => fact.status === 'confirmed' || fact.status === 'edited') ?? [];
    const factsBySource = new Map<string, QuickStartFactCandidate[]>();
    for (const fact of facts) {
      const values = factsBySource.get(fact.sourceId) ?? [];
      values.push(fact);
      factsBySource.set(fact.sourceId, values);
    }

    const chunks: KnowledgeChunk[] = [];
    let createdVersionCount = 0;
    let unchangedSourceCount = 0;
    for (const source of sources) {
      const sourceFacts = factsBySource.get(source.id) ?? [];
      if (sourceFacts.length === 0) continue;
      const result = await this.ingestSource(
        userId,
        brandId,
        source,
        sourceFacts.map((fact) => `${fact.fieldKey}：${fact.editedValue?.trim() || fact.extractedValue.trim()}`),
        'approved'
      );
      chunks.push(...result.chunks);
      if (result.created) createdVersionCount += 1;
      else unchangedSourceCount += 1;
    }

    return {
      brandId,
      sourceCount: factsBySource.size,
      createdVersionCount,
      unchangedSourceCount,
      chunks
    };
  }

  async ingestSource(
    userId: string,
    brandId: string,
    source: KnowledgeSource,
    contentBlocks: string[],
    reviewStatus: KnowledgeChunkReviewStatus
  ): Promise<{ created: boolean; chunks: KnowledgeChunk[] }> {
    const inputs = buildKnowledgeChunkInputs(source, contentBlocks, reviewStatus);
    if (inputs.length === 0) return { created: false, chunks: [] };
    const existing = await this.permissionsService.listKnowledgeChunks(userId, brandId, source.id);
    if (!existing) throw new NotFoundException('品牌知识来源不存在或当前用户无权访问');
    const latestVersion = Math.max(0, ...existing.map((chunk) => chunk.sourceVersion));
    const latest = existing.filter((chunk) => chunk.sourceVersion === latestVersion).sort((left, right) => left.chunkIndex - right.chunkIndex);
    if (latest.length === inputs.length && latest.every((chunk, index) => chunk.contentHash === inputs[index]?.contentHash && chunk.reviewStatus === inputs[index]?.reviewStatus)) {
      return { created: false, chunks: latest };
    }
    const chunks = await this.permissionsService.appendKnowledgeChunkVersion(userId, brandId, source.id, inputs);
    if (!chunks) throw new NotFoundException('品牌知识来源不存在或当前用户无权访问');
    return { created: true, chunks };
  }
}

export function buildKnowledgeChunkInputs(
  source: Pick<KnowledgeSource, 'id' | 'sourceUrl'>,
  contentBlocks: string[],
  reviewStatus: KnowledgeChunkReviewStatus
): KnowledgeChunkInput[] {
  const contents = contentBlocks.flatMap(splitContent).map((content) => content.trim()).filter(Boolean);
  return contents.map((content, chunkIndex) => ({
    sourceId: source.id,
    sourceUrl: source.sourceUrl,
    chunkIndex,
    content,
    contentHash: createHash('sha256').update(content).digest('hex'),
    reviewStatus
  }));
}

function splitContent(content: string): string[] {
  const normalized = content.replace(/\r\n/g, '\n').trim();
  if (!normalized) return [];
  const paragraphs = normalized.split(/\n{2,}/).map((item) => item.trim()).filter(Boolean);
  const chunks: string[] = [];
  for (const paragraph of paragraphs) {
    if (paragraph.length <= maxChunkLength) {
      chunks.push(paragraph);
      continue;
    }
    for (let start = 0; start < paragraph.length; start += maxChunkLength) {
      chunks.push(paragraph.slice(start, start + maxChunkLength));
    }
  }
  return chunks;
}
