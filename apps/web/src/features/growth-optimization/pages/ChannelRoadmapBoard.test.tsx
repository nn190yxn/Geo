import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ChannelRoadmap } from '@geo-platform/shared-types';
import { ChannelRoadmapBoard } from './ChannelRoadmapBoard';

describe('ChannelRoadmapBoard', () => {
  it('renders three windows and all channel action fields', () => {
    const html = renderToStaticMarkup(<ChannelRoadmapBoard roadmap={createRoadmap()} />);

    for (const text of [
      '0-30 天', '30-60 天', '60-90 天', '品牌官网', '官网 FAQ、产品页', '建议数量：4 项',
      '每周更新 1 次', '品牌内容负责人', '真实样本已覆盖', '推荐依据：2 次真实样本引用'
    ]) {
      expect(html).toContain(text);
    }
  });
});

function createRoadmap(): ChannelRoadmap {
  return {
    brandId: 'brand_1', measurementStatus: 'valid', sampleCount: 3,
    generatedAt: '2026-08-04T00:00:00.000Z', generationMethod: 'deterministic',
    items: [{
      id: 'roadmap-domain-brand', channelCode: 'brand.example.com', channelName: '品牌官网', domain: 'brand.example.com',
      contentFormats: ['官网 FAQ', '产品页'], recommendedQuantity: 4, cadence: '每周更新 1 次', ownerRole: '品牌内容负责人',
      priority: 'high', evidence: ['2 次真实样本引用'], window: '0_30_days', coverageStatus: 'sample_covered'
    }]
  };
}
