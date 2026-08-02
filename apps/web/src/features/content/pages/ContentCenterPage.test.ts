import { describe, expect, it } from 'vitest';
import type { ContentAssetPageItem } from '@geo-platform/shared-types';
import { getFilteredContentAssets, hasAdditionalContentAssetFilters, type ContentAssetManagementFilters } from './ContentCenterPage';

const defaultFilters: ContentAssetManagementFilters = {
  search: '',
  type: 'all',
  platform: 'all',
  status: 'all',
  reviewStatus: 'all',
  publishStatus: 'all',
  retestStatus: 'all'
};

describe('ContentCenterPage asset filters', () => {
  it('searches title, keywords, source and user intent', () => {
    const assets = [
      buildAsset({ id: 'asset-1', title: '儿童运动 FAQ', targetKeywords: ['儿童体能'], userIntent: '家长选课', sourceReferences: [{ type: 'knowledge', title: '课程手册' }] }),
      buildAsset({ id: 'asset-2', title: '门店新闻', targetKeywords: ['品牌动态'] })
    ];

    expect(getFilteredContentAssets(assets, { ...defaultFilters, search: '儿童体能' }).map((asset) => asset.id)).toEqual(['asset-1']);
    expect(getFilteredContentAssets(assets, { ...defaultFilters, search: '课程手册' }).map((asset) => asset.id)).toEqual(['asset-1']);
    expect(getFilteredContentAssets(assets, { ...defaultFilters, search: '家长选课' }).map((asset) => asset.id)).toEqual(['asset-1']);
  });

  it('combines type, platform, review, publish and retest filters', () => {
    const assets = [
      buildAsset({ id: 'asset-1', type: 'website_faq', platform: 'official_site', reviewStatus: 'approved', publishStatus: 'published', retestPlanId: 'retest-1' }),
      buildAsset({ id: 'asset-2', type: 'wechat_article', platform: 'wechat_official', reviewStatus: 'pending', publishStatus: 'draft' })
    ];
    const filters: ContentAssetManagementFilters = {
      ...defaultFilters,
      type: 'website_faq',
      platform: 'official_site',
      reviewStatus: 'approved',
      publishStatus: 'published',
      retestStatus: 'planned'
    };

    expect(getFilteredContentAssets(assets, filters).map((asset) => asset.id)).toEqual(['asset-1']);
    expect(hasAdditionalContentAssetFilters(filters)).toBe(true);
    expect(hasAdditionalContentAssetFilters(defaultFilters)).toBe(false);
  });
});

function buildAsset(overrides: Partial<ContentAssetPageItem>): ContentAssetPageItem {
  return {
    id: 'asset-default',
    brandId: 'brand-demo',
    title: '内容资产',
    type: 'wechat_article',
    platform: 'wechat_official',
    url: 'https://example.com/content',
    targetKeywords: [],
    status: 'draft',
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
    sourceReferences: [],
    reviewStatus: 'pending',
    publishStatus: 'not_started',
    publishingStats: {
      brandId: 'brand-demo',
      totalRecords: 0,
      publishedRecords: 0,
      failedRecords: 0,
      citationCount: 0,
      relatedIntentCount: 0
    },
    ...overrides
  };
}
