import { describe, expect, it } from 'vitest';
import { getCompetitorAnalysisFindings, getCompetitorComparisonActions, getCompetitorLabelColor, getCompetitorPageMode, getCompetitorPlatformMatrix, getCompetitorRiskIntents, getCompetitorScopeSummary, getCompetitorTrend, getFilteredCompetitorComparisons, getProviderStatusDescription, splitKeywordText, toDiscoveryPayload } from './CompetitorAnalysisPage';

describe('CompetitorAnalysisPage helpers', () => {
  it('按路由拆分竞品资料与竞品分析任务', () => {
    expect(getCompetitorPageMode('/competitor-profile')).toBe('profile');
    expect(getCompetitorPageMode('/competitors')).toBe('analysis');
  });

  it('splits competitor discovery keywords from Chinese and English separators', () => {
    expect(splitKeywordText('儿童体能、少儿跑酷, 快乐体操\n篮球培训')).toEqual(['儿童体能', '少儿跑酷', '快乐体操', '篮球培训']);
  });

  it('builds competitor discovery payload from form values', () => {
    expect(toDiscoveryPayload({
      city: ' 贵阳 ',
      campusRadiusKm: 5,
      keywordsText: '儿童运动、体适能',
      forceRefresh: true
    })).toEqual({
      city: '贵阳',
      campusRadiusKm: 5,
      keywords: ['儿童运动', '体适能'],
      forceRefresh: true
    });
  });

  it('explains provider status in operator friendly text', () => {
    expect(getProviderStatusDescription({ providerStatus: 'configured', cacheHit: false, sourceProvider: 'amap' })).toContain('来自高德地图');
    expect(getProviderStatusDescription({ providerStatus: 'configured', cacheHit: true, sourceProvider: 'amap' })).toContain('重新发现');
    expect(getProviderStatusDescription({ providerStatus: 'fallback', cacheHit: false, sourceProvider: 'amap' })).toContain('人工筛选');
    expect(getProviderStatusDescription({ providerStatus: 'disabled', cacheHit: false, sourceProvider: 'amap' })).toContain('已停用');
  });

  it('uses clear colors for competitor confirmation labels', () => {
    expect(getCompetitorLabelColor('direct_competitor')).toBe('red');
    expect(getCompetitorLabelColor('national_benchmark')).toBe('blue');
    expect(getCompetitorLabelColor('excluded')).toBe('default');
  });

  it('summarizes competitor diagnosis findings', () => {
    expect(getCompetitorAnalysisFindings({
      brandId: 'brand-1',
      competitors: [],
      mentionRate: 20,
      suppressionRate: 12,
      averageRankGap: 2,
      highRiskIntents: [{ intentId: 'intent-1', text: '儿童体能哪家好', suppressionCount: 3 }],
      comparisons: []
    })).toEqual(['竞品提及率 20%']);
  });

  it('prioritizes content action for suppressed competitor comparisons', () => {
    expect(getCompetitorComparisonActions({ suppressed: true, rankGap: 2 }).map((action) => action.label)).toEqual([
      '生成对比内容',
      '创建竞品改进任务',
      '生成竞品回应内容',
      '再次监测'
    ]);
  });

  it('filters competitor evidence by platform, optimization unit, intent and risk state', () => {
    const rows = [
      createComparison({ competitorName: '竞品 A', platformCode: 'kimi', optimizationUnitId: 'unit-1', intentId: 'intent-1', suppressed: true }),
      createComparison({ competitorName: '竞品 B', platformCode: 'doubao', optimizationUnitId: 'unit-2', intentId: 'intent-2', suppressed: false })
    ];

    expect(getFilteredCompetitorComparisons(rows, {
      search: '竞品 A',
      platform: 'kimi',
      status: 'suppressed',
      optimizationUnitId: 'unit-1',
      intentId: 'intent-1'
    })).toEqual([expect.objectContaining({ competitorName: '竞品 A' })]);
  });

  it('summarizes recommendation rank and suppression risk once per monitoring run', () => {
    const rows = [
      createComparison({ competitorName: '竞品 A', runId: 'run-1', brandRank: 2, suppressed: true }),
      createComparison({ competitorName: '竞品 B', runId: 'run-1', brandRank: 2, suppressed: false }),
      createComparison({ competitorName: '竞品 C', runId: 'run-2', brandRank: 3, suppressed: false })
    ];

    expect(getCompetitorScopeSummary(rows)).toEqual({ sampleCount: 2, averageBrandRank: 2.5, suppressionRate: 50 });
  });

  it('builds platform matrix, chronological trend and scoped risk intents from evidence', () => {
    const rows = [
      createComparison({ runId: 'run-1', platformCode: 'kimi', capturedAt: '2026-07-14T08:00:00.000Z', intentId: 'intent-1', intentText: '品牌了解', suppressed: true }),
      createComparison({ runId: 'run-2', platformCode: 'doubao', capturedAt: '2026-07-13T08:00:00.000Z', intentId: 'intent-2', intentText: '选购对比', brandRank: null, suppressed: false })
    ];

    expect(getCompetitorPlatformMatrix(rows)).toEqual([
      expect.objectContaining({ platformCode: 'kimi', sampleCount: 1, averageBrandRank: 2, suppressionRate: 100 }),
      expect.objectContaining({ platformCode: 'doubao', sampleCount: 1, averageBrandRank: null, suppressionRate: 0 })
    ]);
    expect(getCompetitorTrend(rows).map((point) => point.date)).toEqual(['2026-07-13', '2026-07-14']);
    expect(getCompetitorRiskIntents(rows)).toEqual([{ intentId: 'intent-1', text: '品牌了解', suppressionCount: 1 }]);
  });

  it('preserves evidence context in competitor action links', () => {
    const actions = getCompetitorComparisonActions(createComparison(), { planId: 'plan-1' });

    expect(actions[0].href).toContain('optimizationUnitId=unit-1');
    expect(actions[0].href).toContain('intentId=intent-1');
    expect(actions[0].href).toContain('runId=run-1');
    expect(actions[0].href).toContain('planId=plan-1');
  });
});

function createComparison(overrides = {}) {
  return {
    competitorName: '竞品',
    promptId: 'prompt-1',
    promptText: '推荐儿童运动机构',
    platformCode: 'kimi',
    optimizationUnitId: 'unit-1',
    intentId: 'intent-1',
    intentText: '品牌了解',
    brandRank: 2,
    competitorRank: 1,
    rankGap: 1,
    suppressed: true,
    recommendationReason: '竞品课程信息更完整',
    citationSources: [],
    runId: 'run-1',
    capturedAt: '2026-07-14T08:00:00.000Z',
    ...overrides
  };
}
