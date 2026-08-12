import { describe, expect, it } from 'vitest';
import { KnowledgeChunkService } from '../src/modules/brands/knowledge-chunk.service';
import { KnowledgeRetrievalService } from '../src/modules/brands/knowledge-retrieval.service';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import { PermissionsService } from '../src/modules/permissions/permissions.service';
import type { KnowledgeRetrievalAdapter } from '../src/modules/brands/knowledge-retrieval.adapter';

describe('KnowledgeRetrievalService', () => {
  it('returns approved evidence from the latest source version and records its usage', async () => {
    const { repository, permissionsService, chunkService, retrievalService } = createServices();
    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: `检索资料 ${Date.now()}_${Math.random()}`,
      sourceType: 'webpage',
      sourceUrl: 'https://brand.example.com/retrieval',
      status: 'completed'
    });
    await chunkService.ingestSource('user_demo', 'brand_demo', source!, ['课程覆盖旧年龄范围'], 'approved');
    await chunkService.ingestSource('user_demo', 'brand_demo', source!, ['课程适合 3 到 12 岁儿童'], 'approved');

    const result = await retrievalService.query('user_demo', 'brand_demo', {
      query: '适合儿童年龄',
      purpose: 'content_generation',
      resourceId: 'content_task_1'
    });

    expect(result).toMatchObject({
      answer: '课程适合 3 到 12 岁儿童',
      confidence: 'trusted',
      retrievalMode: 'full_text',
      citations: [{ sourceId: source!.id, sourceVersion: 2, trusted: true }]
    });
    expect(result?.gap).toBeUndefined();
    const audit = permissionsService.listAuditLogs('user_demo', { action: 'knowledge.query' }).find((item) => item.id === result?.usageId);
    expect(audit).toMatchObject({
      brandId: 'brand_demo',
      resourceType: 'content_generation',
      resourceId: 'content_task_1',
      metadata: { confidence: 'trusted', chunkIds: [result?.citations[0]?.id] }
    });
  });

  it('returns a confirmation gap when only pending evidence matches', async () => {
    const { repository, chunkService, retrievalService } = createServices();
    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: `待确认资料 ${Date.now()}_${Math.random()}`,
      sourceType: 'file',
      status: 'completed'
    });
    await chunkService.ingestSource('user_demo', 'brand_demo', source!, ['未经审核的校区数量是 8 家'], 'pending');

    const result = await retrievalService.query('user_demo', 'brand_demo', { query: '校区数量', purpose: 'fact_analysis' });

    expect(result).toMatchObject({
      confidence: 'needs_confirmation',
      retrievalMode: 'full_text',
      citations: [{ reviewStatus: 'pending', trusted: false }],
      gap: { code: 'unconfirmed_evidence' }
    });
    expect(result?.answer).toBeUndefined();
  });

  it('returns a supplement path for missing evidence and preserves brand access isolation', async () => {
    const { retrievalService } = createServices();

    const missing = await retrievalService.query('user_demo', 'brand_demo', { query: '完全不存在的品牌事实' });
    const inaccessible = await retrievalService.query('user_unknown', 'brand_demo', { query: '品牌事实' });

    expect(missing).toMatchObject({
      confidence: 'insufficient',
      retrievalMode: 'none',
      citations: [],
      gap: {
        code: 'no_matching_evidence',
        supplementPath: '/brands/brand_demo/profile?section=sources&action=upload',
        confirmationPath: '/brands/brand_demo/profile?section=facts&review=pending'
      }
    });
    expect(inaccessible).toBeNull();
  });

  it('falls back from an unavailable vector adapter and exposes the selected cost policy', async () => {
    const { permissionsService, retrievalService } = createServices({
      mode: 'vector',
      isAvailable: async () => false,
      query: async () => [],
      index: async () => undefined
    });

    const result = await retrievalService.query('user_demo', 'brand_demo', {
      query: '品牌事实',
      embeddingCostPolicy: 'organization'
    });

    expect(result).toMatchObject({
      retrievalMode: 'none',
      embeddingCostPolicy: 'organization'
    });
    expect(result?.fallbackReasons).toContain('advanced_unavailable');
    expect(permissionsService.listAuditLogs('user_demo', { action: 'knowledge.query' })[0]?.metadata).toMatchObject({
      embeddingCostPolicy: 'organization'
    });
    expect(permissionsService.listAuditLogs('user_demo', { action: 'knowledge.query' })[0]?.metadata.fallbackReasons).toContain('advanced_unavailable');
  });

  it('combines partial vector results with full-text evidence', async () => {
    const { repository, permissionsService, chunkService, retrievalService } = createServices({
      mode: 'vector',
      isAvailable: async () => true,
      query: async (_brandId, _input, limit) => (await permissionsService.searchKnowledgeChunks('user_demo', 'brand_demo', '课程', limit)).slice(0, 1),
      index: async () => undefined
    });
    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: `向量资料 ${Date.now()}_${Math.random()}`,
      sourceType: 'webpage',
      status: 'completed'
    });
    await chunkService.ingestSource('user_demo', 'brand_demo', source!, ['课程适合儿童'], 'approved');
    await chunkService.ingestSource('user_demo', 'brand_demo', source!, ['课程覆盖周末班'], 'approved');

    const result = await retrievalService.query('user_demo', 'brand_demo', {
      query: '课程',
      limit: 2,
      embeddingCostPolicy: 'platform_quota'
    });

    expect(result).toMatchObject({
      confidence: 'trusted',
      retrievalMode: 'hybrid',
      embeddingCostPolicy: 'platform_quota',
      citations: [{ trusted: true }, { trusted: true }]
    });
    expect(result?.citations).toHaveLength(2);
  });

  it.each([
    ['zero vector recall', async () => []],
    ['embedding failure', async () => { throw new Error('embedding provider failed'); }]
  ])('falls back to reviewed full-text evidence after %s', async (_label, query) => {
    const { repository, chunkService, retrievalService } = createServices({
      mode: 'vector',
      isAvailable: async () => true,
      query,
      index: async () => undefined
    });
    const source = repository.createKnowledgeSource('user_demo', 'brand_demo', {
      name: `降级资料 ${Date.now()}_${Math.random()}`,
      sourceType: 'file',
      status: 'completed'
    });
    await chunkService.ingestSource('user_demo', 'brand_demo', source!, ['审核后的品牌课程资料'], 'approved');

    const result = await retrievalService.query('user_demo', 'brand_demo', {
      query: '品牌课程',
      embeddingCostPolicy: 'organization'
    });

    expect(result).toMatchObject({
      retrievalMode: 'full_text',
      embeddingCostPolicy: 'organization',
      confidence: 'trusted',
      citations: expect.arrayContaining([expect.objectContaining({ trusted: true })])
    });
    expect(result?.fallbackReasons).toContain(_label === 'zero vector recall' ? 'advanced_insufficient' : 'advanced_failed');
  });
});

function createServices(adapter?: KnowledgeRetrievalAdapter) {
  const repository = new PermissionsRepository();
  const permissionsService = new PermissionsService(repository);
  return {
    repository,
    permissionsService,
    chunkService: new KnowledgeChunkService(permissionsService, { get: async () => null } as never),
    retrievalService: new KnowledgeRetrievalService(permissionsService, adapter)
  };
}
