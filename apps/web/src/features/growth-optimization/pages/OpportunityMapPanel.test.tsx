import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { OpportunityMap } from '@geo-platform/shared-types';
import { getMeasurementStatusDisplay, OpportunityMapPanel } from './OpportunityMapPanel';

describe('OpportunityMapPanel', () => {
  it('renders competitor themes, real citation positions, channel evidence and sorted opportunities', () => {
    const html = renderToStaticMarkup(<OpportunityMapPanel map={createMap()} />);

    for (const text of [
      '竞品主题与真实信源渠道地图', '竞品 A', '课程与师资信源更完整', 'brand.example.com',
      '回答引用列表第 1 位', '当前品牌真实样本', '公共行业参考', '品牌缺席', '竞品占优', '内容缺失', '事实不一致'
    ]) {
      expect(html).toContain(text);
    }
  });

  it('distinguishes unmeasured, insufficient and valid sample states', () => {
    expect(getMeasurementStatusDisplay({ measurementStatus: 'unmeasured', sampleCount: 0 }).title).toContain('尚未形成');
    expect(getMeasurementStatusDisplay({ measurementStatus: 'insufficient', sampleCount: 2 }).title).toContain('2 条');
    expect(getMeasurementStatusDisplay({ measurementStatus: 'valid', sampleCount: 3 }).title).toContain('3 条');
  });
});

function createMap(): OpportunityMap {
  return {
    brandId: 'brand_demo', measurementStatus: 'valid', sampleCount: 3, generationMethod: 'deterministic',
    questionDimensions: [{ dimension: 'brand', questionCount: 1 }],
    diagnosticTypes: [
      { type: 'brand_absent', opportunityCount: 1 }, { type: 'competitor_dominant', opportunityCount: 1 },
      { type: 'content_gap', opportunityCount: 1 }, { type: 'fact_inconsistent', opportunityCount: 1 }
    ],
    competitorThemes: [{
      competitorName: '竞品 A', theme: '课程与师资信源更完整', evidenceCount: 2,
      platformDistribution: [{ platformCode: 'doubao', sampleCount: 2 }], questionExamples: ['儿童运动机构怎么选？'], runIds: ['run_1', 'run_2']
    }],
    citedDomains: [{
      domain: 'brand.example.com', sourceType: 'official_site', citationCount: 2, runCount: 2,
      platformDistribution: [{ platformCode: 'doubao', sampleCount: 2 }], contentAssetCovered: true,
      positions: [{ runId: 'run_1', question: '儿童运动机构怎么选？', platformCode: 'doubao', citationIndex: 1, label: '回答引用列表第 1 位', url: 'https://brand.example.com/faq' }]
    }],
    channelRecommendations: [
      { id: 'domain-brand', channel: '品牌官网与 FAQ', domain: 'brand.example.com', sourceType: 'official_site', basis: 'brand_sample', evidenceCount: 2, platformDistribution: [{ platformCode: 'doubao', sampleCount: 2 }], rationale: '真实回答已引用该域名。', priority: 'high' },
      { id: 'reference-media', channel: '行业媒体', sourceType: 'media', basis: 'industry_reference', evidenceCount: 0, platformDistribution: [], rationale: '公共渠道分类参考。', priority: 'low' }
    ],
    contentOpportunities: [
      createOpportunity('brand_absent'), createOpportunity('competitor_dominant'), createOpportunity('content_gap'), createOpportunity('fact_inconsistent')
    ]
  };
}

function createOpportunity(type: OpportunityMap['contentOpportunities'][number]['type']): OpportunityMap['contentOpportunities'][number] {
  return { id: `opportunity-${type}`, type, priority: 'high', title: '优先补强内容', question: '儿童运动机构怎么选？', platformCode: 'doubao', evidence: ['真实回复证据'], runIds: ['run_1'] };
}
