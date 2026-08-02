import { describe, expect, it } from 'vitest';
import type { BrandMediaAsset, BrandProfile, KnowledgeSource } from '@geo-platform/shared-types';
import { buildFactKnowledgeAssets, buildMediaAssetListItems, filterLibraryAssets, getFaqSummary, getProductServiceStatus, splitFaqs, toAudienceProfileFormItems, toAudienceProfileStrings, toProductServiceFormItems, toProductServiceStrings } from './brandProfileEditor';

describe('brand profile structured editor helpers', () => {
  it('keeps product service entries compatible with the string array API', () => {
    const items = toProductServiceFormItems(['少儿体能小班课', '家庭训练方案']);

    expect(items).toEqual([
      { description: '少儿体能小班课' },
      { description: '家庭训练方案' }
    ]);
    expect(toProductServiceStrings([...items, { description: '   ' }])).toEqual(['少儿体能小班课', '家庭训练方案']);
    expect(getProductServiceStatus(items[0])).toBe('ready');
    expect(getProductServiceStatus({ description: ' ' })).toBe('draft');
  });

  it('loads legacy audience text as a profile name', () => {
    expect(toAudienceProfileFormItems(['关注儿童运动成长的家长'])).toEqual([
      { name: '关注儿童运动成长的家长' }
    ]);
  });

  it('round trips structured audience cards through readable profile strings', () => {
    const profiles = [{
      name: '首次选择体能课的家长',
      decisionStage: '方案比较',
      concerns: '教练资质和安全性',
      expressions: '附近儿童体能课怎么选',
      linkedIntent: '比较本地少儿体能机构'
    }];
    const serialized = toAudienceProfileStrings(profiles);

    expect(serialized).toEqual([
      '首次选择体能课的家长｜决策阶段：方案比较｜关注问题：教练资质和安全性｜常见表达：附近儿童体能课怎么选｜高价值意图：比较本地少儿体能机构'
    ]);
    expect(toAudienceProfileFormItems(serialized)).toEqual(profiles);
  });

  it('builds an FAQ summary and preserves separators inside answers', () => {
    const value = '适合零基础吗？ | 适合 | 会先评估\n如何预约？ | 在线预约';

    expect(splitFaqs(value)).toEqual([
      { question: '适合零基础吗？', answer: '适合 | 会先评估' },
      { question: '如何预约？', answer: '在线预约' }
    ]);
    expect(getFaqSummary(value)).toEqual({ count: 2, questions: ['适合零基础吗？', '如何预约？'] });
    expect(getFaqSummary('')).toEqual({ count: 0, questions: [] });
  });

  it('builds fact groups with source, review state and update time', () => {
    const sources: KnowledgeSource[] = [
      { id: 'source-1', brandId: 'brand-1', name: '品牌手册', sourceType: 'file', fileRef: 'brand.pdf', status: 'completed', createdAt: '2026-07-14T09:00:00Z', updatedAt: '2026-07-15T08:00:00Z' },
      { id: 'source-2', brandId: 'brand-1', name: '旧官网', sourceType: 'webpage', sourceUrl: 'https://example.com', status: 'failed', createdAt: '2026-07-14T09:00:00Z', updatedAt: '2026-07-15T08:30:00Z' },
      { id: 'source-3', brandId: 'brand-1', name: '待处理资料', sourceType: 'external_document', status: 'pending', createdAt: '2026-07-14T09:00:00Z', updatedAt: '2026-07-15T09:00:00Z' },
      { id: 'source-4', brandId: 'brand-1', name: '解析中资料', sourceType: 'external_document', status: 'processing', createdAt: '2026-07-14T09:00:00Z', updatedAt: '2026-07-15T09:30:00Z' }
    ];
    const items = buildFactKnowledgeAssets(createProfile(), sources);

    expect(items.find((item) => item.group === 'recommended')).toMatchObject({ title: '专业分龄训练', source: '手动维护', reviewStatus: 'approved' });
    expect(items.filter((item) => item.group === 'sources')).toMatchObject([
      { title: '品牌手册', reviewStatus: 'approved', updatedAt: '2026-07-15T08:00:00Z' },
      { title: '旧官网', reviewStatus: 'rejected', updatedAt: '2026-07-15T08:30:00Z' },
      { title: '待处理资料', reviewStatus: 'pending', updatedAt: '2026-07-15T09:00:00Z' },
      { title: '解析中资料', reviewStatus: 'needs_review', updatedAt: '2026-07-15T09:30:00Z' }
    ]);
  });

  it('builds and filters media assets by query and review state', () => {
    const mediaAssets: BrandMediaAsset[] = [{
      id: 'asset-1',
      brandId: 'brand-1',
      title: '门店训练照片',
      assetType: 'image',
      applicablePlatforms: ['qianwen', 'doubao'],
      contentUsage: '用于门店课程介绍',
      source: '品牌手册',
      reviewStatus: 'needs_review',
      relatedContentTaskId: 'task-1',
      createdAt: '2026-07-14T09:00:00Z',
      updatedAt: '2026-07-15T08:00:00Z'
    }];
    const items = buildMediaAssetListItems(mediaAssets);

    expect(items[0]).toMatchObject({ title: '门店训练照片', source: '品牌手册', reviewStatus: 'needs_review', tags: ['image', 'qianwen', 'doubao', '关联内容 task-1'] });
    expect(filterLibraryAssets(items, '豆包', 'all')).toHaveLength(1);
    expect(filterLibraryAssets(items, 'doubao', 'needs_review')).toHaveLength(1);
    expect(filterLibraryAssets(items, '门店', 'approved')).toHaveLength(0);
    expect(filterLibraryAssets(items, '', 'all')).toEqual(items);
  });
});

function createProfile(): BrandProfile {
  return {
    brandId: 'brand-1',
    intro: '儿童运动成长品牌',
    valueProps: [],
    offerings: [],
    proofPoints: [],
    targetCustomers: [],
    recommendedExpressions: ['专业分龄训练'],
    blockedExpressions: ['保证快速长高'],
    contentRules: ['效果描述标注适用条件'],
    competitors: ['本地综合体育馆'],
    faqs: [],
    completenessScore: 50,
    missingFields: [],
    completenessPrompts: [],
    updatedAt: '2026-07-15T07:00:00Z'
  };
}
