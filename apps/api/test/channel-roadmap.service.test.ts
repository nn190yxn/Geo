import { describe, expect, it, vi } from 'vitest';
import type { ChannelRoadmap, ContentAsset, OpportunityMap } from '@geo-platform/shared-types';
import { ChannelRoadmapService, domainsOverlap } from '../src/modules/analysis/channel-roadmap.service';
import type { OpportunityDiscoveryService } from '../src/modules/analysis/opportunity-discovery.service';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('ChannelRoadmapService', () => {
  it('maps real citations, inventory and channel rules into phased actions', async () => {
    const result = await createService(createOpportunityMap(), [createAsset()]).getRoadmap('user_1', 'brand_1');

    expect(result).toMatchObject({ brandId: 'brand_1', measurementStatus: 'valid', sampleCount: 3, generationMethod: 'deterministic' });
    expect(result?.items).toEqual([
      expect.objectContaining({
        channelCode: 'brand.example.com', channelName: '品牌官网', contentFormats: ['官网 FAQ', '产品页'],
        recommendedQuantity: 5, cadence: '每周更新 1 次', ownerRole: '品牌内容负责人',
        priority: 'high', window: '0_30_days', coverageStatus: 'sample_covered'
      }),
      expect.objectContaining({
        channelCode: 'media', priority: 'medium', window: '30_60_days', coverageStatus: 'planned'
      }),
      expect.objectContaining({
        channelCode: 'social', priority: 'low', window: '60_90_days', coverageStatus: 'planned'
      })
    ]);
    expect(result?.items[0]?.evidence).toEqual(expect.arrayContaining(['2 次真实样本引用', '已有 1 项渠道内容资产', '2 项同优先级内容缺口待补强']));
  });

  it('preserves the brand access boundary', async () => {
    const service = createService(null, []);
    await expect(service.getRoadmap('user_other', 'brand_1')).resolves.toBeNull();
  });

  it('matches normalized parent and child domains only on hostname boundaries', () => {
    expect(domainsOverlap('HTTPS://WWW.Brand.Example.com/path', 'brand.example.com')).toBe(true);
    expect(domainsOverlap('news.brand.example.com', 'brand.example.com')).toBe(true);
    expect(domainsOverlap('brand.example.com', 'news.brand.example.com')).toBe(true);
    expect(domainsOverlap('brand.example.com.evil.test', 'brand.example.com')).toBe(false);
  });
});

function createService(map: OpportunityMap | null, assets: ContentAsset[]) {
  return new ChannelRoadmapService(
    { getMap: vi.fn().mockResolvedValue(map) } as unknown as OpportunityDiscoveryService,
    {
      listContentAssets: vi.fn().mockReturnValue(assets),
      listMediaPlatformRules: vi.fn().mockResolvedValue([
        {
          brandId: 'brand_1', platform: 'website', name: '品牌官网', contentFormats: ['官网 FAQ', '产品页'],
          intentFit: '品牌事实', recommendedFrequency: '每周更新 1 次', coverRatio: '16:9', publishingNote: '核验来源'
        }
      ])
    } as unknown as PermissionsService
  );
}

function createOpportunityMap(): OpportunityMap {
  return {
    brandId: 'brand_1', measurementStatus: 'valid', sampleCount: 3, generationMethod: 'deterministic',
    questionDimensions: [], diagnosticTypes: [], competitorThemes: [],
    citedDomains: [{
      domain: 'brand.example.com', sourceType: 'official_site', citationCount: 2, runCount: 2,
      platformDistribution: [], positions: [], contentAssetCovered: true
    }],
    channelRecommendations: [
      { id: 'domain-brand', channel: '品牌官网与 FAQ', domain: 'brand.example.com', sourceType: 'official_site', basis: 'brand_sample', evidenceCount: 2, platformDistribution: [], rationale: '真实回答引用品牌官网。', priority: 'high' },
      { id: 'reference-media', channel: '行业媒体', sourceType: 'media', basis: 'industry_reference', evidenceCount: 0, platformDistribution: [], rationale: '公共行业参考。', priority: 'medium' },
      { id: 'reference-social', channel: '专业社媒账号', sourceType: 'social', basis: 'industry_reference', evidenceCount: 0, platformDistribution: [], rationale: '公共行业参考。', priority: 'low' }
    ],
    contentOpportunities: [
      createContentOpportunity('brand_absent', 'high'),
      createContentOpportunity('competitor_dominant', 'high')
    ]
  };
}

function createContentOpportunity(type: 'brand_absent' | 'competitor_dominant', priority: 'high') {
  return { id: type, type, priority, title: '内容缺口', question: '问题', platformCode: 'doubao', evidence: ['真实证据'], runIds: ['run_1'] };
}

function createAsset(): ContentAsset {
  return {
    id: 'asset_1', brandId: 'brand_1', title: '官网 FAQ', type: 'faq', platform: 'official_site',
    url: 'https://brand.example.com/faq', targetKeywords: [], status: 'published',
    createdAt: '2026-08-01T00:00:00.000Z', updatedAt: '2026-08-01T00:00:00.000Z'
  };
}
