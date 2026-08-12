import { describe, expect, it, vi } from 'vitest';
import type { BrandProfile, ContentAsset, QuickStartFactCandidate, QuickStartSession } from '@geo-platform/shared-types';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';
import type { QuickStartRepositoryPort } from '../src/modules/quick-start/quick-start.repository.port';
import { ContentReadinessService } from '../src/modules/content/content-readiness.service';

describe('ContentReadinessService', () => {
  it('maps sourced facts and reports complete channel requirements', async () => {
    const service = harness([
      fact('intro', '可信品牌介绍', 'confirmed'),
      fact('proof', '服务覆盖 20 家门店', 'confirmed')
    ]);
    const result = await service.inspect('user-1', 'brand-1', 'asset-1', {
      body: '# 什么是可信服务\n\n**定义**：可信品牌介绍。\n\n## FAQ\nQ：覆盖多少门店？\nA：服务覆盖 20 家门店。\n\n## 步骤\n1. 提交资料\n2. 完成审核\n\n| 方案 | 覆盖 |\n| --- | --- |\n| 标准 | 20 家门店 |\n\n参考：https://example.com/proof',
      author: '品牌编辑',
      updatedAt: '2026-08-04T00:00:00.000Z',
      structuredData: '{"@context":"https://schema.org","@type":"Article"}',
      targetPlatform: 'wechat'
    });

    expect(result).toMatchObject({ brandId: 'brand-1', assetId: 'asset-1', targetPlatform: 'wechat', status: 'ready' });
    expect(result?.factMappings).toEqual(expect.arrayContaining([
      expect.objectContaining({ claim: '可信品牌介绍', confirmationStatus: 'confirmed' }),
      expect.objectContaining({ claim: '服务覆盖 20 家门店', kind: 'number', source: expect.objectContaining({ verifiedAt: '2026-08-03T00:00:00.000Z' }) })
    ]));
    expect(result?.riskParagraphs).toEqual([]);
    expect(result?.channelRequirements).toMatchObject({ formats: ['article'], characterCount: expect.any(Number), coverRatio: '2.35:1', requiredLinks: true, requiredReview: true, requiresRetestPlan: true });
  });

  it('blocks unsourced numbers, pending facts and blocked expressions with correction paths', async () => {
    const service = harness([fact('claim', '行业第一', 'pending')]);
    const result = await service.inspect('user-1', 'brand-1', 'asset-1', {
      body: '行业第一，客户增长 88%。',
      targetPlatform: 'unknown'
    });

    expect(result?.status).toBe('blocked');
    expect(result?.riskParagraphs[0]).toMatchObject({
      paragraphIndex: 0,
      reason: expect.stringContaining('待确认事实'),
      correctionPath: '/brands/brand-1/content-assets/asset-1/edit?section=paragraph&index=0'
    });
    expect(result?.riskParagraphs[0].reason).toContain('无来源数字：88%');
    expect(result?.riskParagraphs[0].reason).toContain('超出品牌资料的表达：行业第一');
    expect(result?.checks).toContainEqual(expect.objectContaining({ key: 'numeric_basis', status: 'fail' }));
    expect(result?.checks).toContainEqual(expect.objectContaining({ key: 'channel_format', status: 'warning' }));
  });

  it('applies versioned comparison, ranking and FAQ rules with structured correction paths', async () => {
    const service = harness([]);
    const comparison = await service.inspect('user-1', 'brand-1', 'asset-1', {
      contentType: 'comparison',
      body: '比较维度：价格与服务范围。\n\n自身局限：仅适用于本地门店。\n\n核验日期：2026-08-06。'
    });
    const ranking = await service.inspect('user-1', 'brand-1', 'asset-1', {
      contentType: 'ranking',
      body: '评选方法：按公开评分排序。\n\n数据来源：https://example.com/data。\n\n利益关系披露：本文未收取赞助费用。'
    });
    const faq = await service.inspect('user-1', 'brand-1', 'asset-1', {
      body: '## FAQ\nQ：适合新手吗？\nA：适合，新手可以从基础课程开始。'
    });

    expect(comparison?.ruleVersion).toBe('2026-08-content-quality-v1');
    expect(comparison?.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'comparison_dimensions', status: 'pass' }),
      expect.objectContaining({ key: 'comparison_limitations', status: 'pass' }),
      expect.objectContaining({ key: 'comparison_verified_at', status: 'pass' })
    ]));
    expect(ranking?.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'ranking_methodology', status: 'pass' }),
      expect.objectContaining({ key: 'ranking_data_sources', status: 'pass' }),
      expect.objectContaining({ key: 'ranking_disclosure', status: 'pass' })
    ]));
    expect(faq?.checks).toContainEqual(expect.objectContaining({ key: 'faq_direct_answer', status: 'pass' }));
  });

  it('returns actionable warnings for missing specialized content requirements', async () => {
    const result = await harness([]).inspect('user-1', 'brand-1', 'asset-1', {
      contentType: 'comparison',
      body: '这是对比内容。\n\n## FAQ\nQ：适合新手吗？\nA：这个问题需要根据个人情况判断。'
    });

    expect(result?.status).toBe('needs_review');
    expect(result?.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'comparison_dimensions', status: 'warning', correctionPath: '/brands/brand-1/content-assets/asset-1/edit?section=content-rules&rule=comparison-dimensions' }),
      expect.objectContaining({ key: 'comparison_limitations', status: 'warning' }),
      expect.objectContaining({ key: 'comparison_verified_at', status: 'warning' }),
      expect.objectContaining({ key: 'faq_direct_answer', status: 'warning', correctionPath: '/brands/brand-1/content-assets/asset-1/edit?section=content-rules&rule=faq-direct-answer' })
    ]));
  });

  it('requires ranking disclosure even when methodology and sources are present', async () => {
    const result = await harness([]).inspect('user-1', 'brand-1', 'asset-1', {
      contentType: 'ranking',
      body: '评选方法：按公开评分排序。\n\n数据来源：https://example.com/data。'
    });

    expect(result?.checks).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'ranking_methodology', status: 'pass' }),
      expect.objectContaining({ key: 'ranking_data_sources', status: 'pass' }),
      expect.objectContaining({ key: 'ranking_disclosure', status: 'warning', correctionPath: '/brands/brand-1/content-assets/asset-1/edit?section=content-rules&rule=ranking-disclosure' })
    ]));
  });

  it.each([
    ['confirmed numeric fact', fact('stores', '服务覆盖 20 家门店', 'confirmed'), '服务覆盖 20 家门店。'],
    ['edited numeric fact', { ...fact('age', '适合儿童', 'edited'), editedValue: '适合 3 到 12 岁儿童' }, '适合 3 到 12 岁儿童。'],
    ['pending brand fact', fact('claim', '行业领先服务', 'pending'), '行业领先服务。'],
    ['unsourced numeric claim', undefined, '客户增长 88%。']
  ])('P15 maps or flags every %s', async (_label, candidate, body) => {
    const result = await harness(candidate ? [candidate] : []).inspect('user-1', 'brand-1', 'asset-1', { body });

    expect(result?.factMappings).not.toEqual([]);
    for (const mapping of result?.factMappings ?? []) {
      expect(Boolean(mapping.source) || mapping.confirmationStatus === 'pending').toBe(true);
    }
    if (!candidate || candidate.status === 'pending') {
      expect(result?.riskParagraphs).not.toEqual([]);
    }
  });

  it('returns null when brand access or the requested asset is unavailable', async () => {
    const service = harness([], []);
    await expect(service.inspect('user-1', 'brand-1', 'missing', { body: '正文' })).resolves.toBeNull();
  });
});

function harness(candidates: QuickStartFactCandidate[], assets: ContentAsset[] = [asset()]) {
  const permissionsService = {
    listContentAssets: vi.fn(() => assets),
    getBrandProfile: vi.fn(() => profile()),
    listMediaPlatformRules: vi.fn(async () => [{
      brandId: 'brand-1', platform: 'wechat', name: '微信', contentFormats: ['article'], intentFit: '品牌内容',
      recommendedFrequency: 'weekly', coverRatio: '2.35:1', publishingNote: '审核链接和封面'
    }])
  } as unknown as PermissionsService;
  const quickStartRepository = {
    findByBrandId: vi.fn(async () => session(candidates)), create: vi.fn(), update: vi.fn()
  } as unknown as QuickStartRepositoryPort;
  return new ContentReadinessService(permissionsService, quickStartRepository);
}

function fact(fieldKey: string, extractedValue: string, status: QuickStartFactCandidate['status']): QuickStartFactCandidate {
  return {
    id: `fact-${fieldKey}`, fieldKey, extractedValue, confidence: 0.9, status, isCritical: false,
    sourceId: 'source-1', sourceType: 'webpage', url: 'https://example.com/proof', title: '官网', excerpt: '来源摘录'
  };
}

function session(candidates: QuickStartFactCandidate[]): QuickStartSession {
  return {
    id: 'session-1', brandId: 'brand-1', currentStep: 'facts', status: 'in_progress', draft: { facts: { candidates } },
    version: 1, startedAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z'
  };
}

function profile(): BrandProfile {
  return {
    brandId: 'brand-1', intro: '', valueProps: [], offerings: [], proofPoints: [], targetCustomers: [], recommendedExpressions: [],
    blockedExpressions: ['行业第一'], contentRules: [], competitors: [], faqs: [], completenessScore: 0, missingFields: [],
    completenessPrompts: [], updatedAt: '2026-08-03T00:00:00.000Z'
  };
}

function asset(): ContentAsset {
  return {
    id: 'asset-1', brandId: 'brand-1', title: '内容', type: 'article', platform: 'wechat', url: 'https://example.com/content',
    targetKeywords: [], status: 'draft', createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z'
  };
}
