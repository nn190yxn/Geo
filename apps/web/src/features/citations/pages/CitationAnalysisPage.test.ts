import { describe, expect, it } from 'vitest';
import type { CitationSource } from '@geo-platform/shared-types';
import { getCitationAnalysisFindings, getCitationAnalysisState, getCitationSourceActions, getFilteredCitationSources } from './CitationAnalysisPage';

describe('CitationAnalysisPage helpers', () => {
  it('summarizes source diagnosis findings', () => {
    expect(getCitationAnalysisFindings({
      brandId: 'brand-1',
      sampleCount: 10,
      citedSampleCount: 6,
      citationRate: 60,
      totalCitations: 18,
      contentCitationRate: 40,
      officialCitationRate: 15,
      authoritySourceRate: 55,
      sourceTypeBreakdown: [],
      trend: [],
      sources: [],
      contentAssets: []
    })).toEqual(['真实回复引用率 60%（6/10）', '官网引用率 15%', '权威来源占比 55%', '已识别 18 次引用，其中 40% 已绑定内容资产']);
  });

  it('separates empty, insufficient and ready sample states', () => {
    const baseDashboard = {
      brandId: 'brand-1', citedSampleCount: 0, citationRate: 0, totalCitations: 0, contentCitationRate: 0,
      officialCitationRate: 0, authoritySourceRate: 0, sourceTypeBreakdown: [], trend: [], sources: [], contentAssets: []
    };

    expect(getCitationAnalysisState({ ...baseDashboard, sampleCount: 0 })).toBe('empty');
    expect(getCitationAnalysisState({ ...baseDashboard, sampleCount: 2 })).toBe('insufficient');
    expect(getCitationAnalysisState({ ...baseDashboard, sampleCount: 3 })).toBe('ready');
  });

  it('maps citation sources to content actions', () => {
    expect(getCitationSourceActions({ sourceType: 'official_site', citationCount: 4 }).map((action) => action.label)).toEqual(['创建官网页建议', '再次监测']);
    expect(getCitationSourceActions({ sourceType: 'media', citationCount: 1 }).map((action) => action.label)).toEqual(['创建媒体稿建议', '查看发布统计']);
    expect(getCitationSourceActions({ sourceType: 'social', citationCount: 2 }).map((action) => action.label)).toEqual(['创建问答内容建议', '再次监测']);
  });

  it('keeps monitoring context in citation actions', () => {
    const action = getCitationSourceActions(createSource(), { optimizationUnitId: 'unit-1', intentId: 'intent-1' })[1];

    expect(action.href).toContain('optimizationUnitId=unit-1');
    expect(action.href).toContain('promptId=prompt-1');
    expect(action.href).toContain('runId=run-1');
  });

  it('filters citation evidence by date, platform, binding state and search text', () => {
    const sources = [
      createSource(),
      createSource({ id: 'source-2', platformCode: 'doubao', contentAssetId: 'asset-1', title: '媒体报道' })
    ];

    expect(getFilteredCitationSources(sources, {
      search: '品牌官网',
      from: '2026-07-10',
      to: '2026-07-16',
      platform: 'kimi',
      status: 'unlinked'
    })).toEqual([expect.objectContaining({ id: 'source-1' })]);
  });
});

function createSource(overrides: Partial<CitationSource> = {}): CitationSource {
  return {
    id: 'source-1',
    brandId: 'brand-1',
    responseId: 'response-1',
    runId: 'run-1',
    promptId: 'prompt-1',
    promptText: '品牌课程有哪些？',
    platformCode: 'kimi',
    title: '品牌官网课程页',
    url: 'https://brand.example.com/course',
    sourceType: 'official_site',
    authorityLevel: 'high',
    citationCount: 2,
    citedAt: '2026-07-14T00:00:00.000Z',
    createdAt: '2026-07-14T00:00:00.000Z',
    ...overrides
  };
}
