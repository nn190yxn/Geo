import { describe, expect, it } from 'vitest';
import type { MonitoringRunDetail } from '@geo-platform/shared-types';
import { buildMonitoringOverview } from './MonitoringPage';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

describe(`Property P3: monitoring metrics use real responses only ${validatesCriteria(['4.5'])}`, () => {
  it('对 API、浏览器、手动、示例、空回复和非回复对象的任意组合保持真实指标边界', () => {
    for (let mask = 0; mask < 2 ** candidates.length; mask += 1) {
      const selected = candidates.filter((_, index) => (mask & (1 << index)) !== 0);
      const runs = selected.filter((item) => item.run).map((item) => item.run as MonitoringRunDetail);
      const realRuns = selected.filter((item) => item.real && item.run).map((item) => item.run as MonitoringRunDetail);
      const overview = buildMonitoringOverview(runs, 'all');
      const expectedMentionRate = toRate(realRuns.filter((run) => run.analysis?.brandMentioned).length, realRuns.length);
      const expectedTopThreeRate = toRate(realRuns.filter((run) => (run.analysis?.brandRank ?? Infinity) <= 3).length, realRuns.length);
      const expectedCitationRate = toRate(realRuns.filter((run) => (run.response?.citations.length ?? 0) > 0).length, realRuns.length);

      expect(overview.sampleCount, `P3 sample mismatch for mask ${mask}`).toBe(realRuns.length);
      expect(overview.metrics.map((metric) => metric.value), `P3 metric mismatch for mask ${mask}`).toEqual([
        realRuns.length,
        expectedMentionRate,
        expectedTopThreeRate,
        expectedCitationRate
      ]);
    }
  });
});

describe(`Property P4: non-response objects never affect monitoring metrics ${validatesCriteria(['4.5'])}`, () => {
  it('keeps metrics unchanged for every combination of standard answers, content drafts, mock samples, and empty replies', () => {
    const baselineRuns = candidates.filter((item) => item.real && item.run).map((item) => item.run as MonitoringRunDetail);
    const baselineOverview = buildMonitoringOverview(baselineRuns, 'all');
    const excludedCandidates = candidates.filter((item) => !item.real);

    for (let mask = 0; mask < 2 ** excludedCandidates.length; mask += 1) {
      const excludedObjects = excludedCandidates
        .filter((_, index) => (mask & (1 << index)) !== 0)
        .map((item) => item.run ?? item.payload);
      const overview = buildMonitoringOverview(
        [...baselineRuns, ...excludedObjects] as MonitoringRunDetail[],
        'all'
      );

      expect(overview.sampleCount, `P4 sample mismatch for mask ${mask}`).toBe(baselineOverview.sampleCount);
      expect(overview.metrics, `P4 metric mismatch for mask ${mask}`).toEqual(baselineOverview.metrics);
      expect(overview.platformBreakdown, `P4 platform mismatch for mask ${mask}`).toEqual(baselineOverview.platformBreakdown);
    }
  });
});

const candidates: Array<{ kind: string; real: boolean; run?: MonitoringRunDetail; payload?: unknown }> = [
  { kind: 'api', real: true, run: createRun('api', 'doubao', 'API 真实回复', true, 1, ['https://example.com/api']) },
  { kind: 'browser', real: true, run: createRun('browser', 'kimi', '浏览器辅助真实回复', false, null, []) },
  { kind: 'manual', real: true, run: createRun('manual', 'manual_input', '手动录入真实回复', true, 2, []) },
  { kind: 'mock', real: false, run: createRun('mock', 'mock_ai', '示例回答', true, 1, ['https://sample.invalid']) },
  { kind: 'empty', real: false, run: createRun('empty', 'deepseek', '   ', true, 1, ['https://empty.invalid']) },
  { kind: 'standard_answer', real: false, payload: { question: '标准问题', answer: '品牌标准答案' } },
  { kind: 'content_draft', real: false, payload: { title: '内容草稿', markdown: '# 草稿' } }
];

function createRun(
  id: string,
  platformCode: string,
  rawText: string,
  brandMentioned: boolean,
  brandRank: number | null,
  citations: string[]
): MonitoringRunDetail {
  return {
    id: `run-${id}`,
    brandId: 'brand-demo',
    optimizationUnitId: 'unit-1',
    intentId: 'intent-1',
    promptId: 'prompt-1',
    promptKind: 'discovery',
    promptText: '推荐儿童体能课程',
    platformCode,
    modelName: 'unknown',
    collectionMethod: 'unknown',
    clientSurface: 'unknown',
    searchEnabled: null,
    market: 'unknown',
    language: 'unknown',
    evidenceLevel: 'unknown',
    manualConfirmed: null,
    baselineVersion: 'unknown',
    status: 'completed',
    retryStatus: 'not_retried',
    createdAt: '2026-07-16T00:00:00.000Z',
    response: {
      id: `response-${id}`,
      runId: `run-${id}`,
      brandId: 'brand-demo',
      rawText,
      citations,
      platformCode,
      modelName: 'unknown',
      collectionMethod: 'unknown',
      clientSurface: 'unknown',
      searchEnabled: null,
      market: 'unknown',
      language: 'unknown',
      evidenceLevel: 'unknown',
      manualConfirmed: null,
      baselineVersion: 'unknown',
      respondedAt: '2026-07-16T00:00:00.000Z',
      parseStatus: 'parsed',
      createdAt: '2026-07-16T00:00:00.000Z'
    },
    analysis: {
      id: `analysis-${id}`,
      responseId: `response-${id}`,
      runId: `run-${id}`,
      brandId: 'brand-demo',
      brandMentioned,
      brandRank,
      sentiment: 'neutral',
      accuracyScore: 80,
      citationScore: citations.length > 0 ? 100 : 0,
      platformEvaluation: '表达稳定',
      recommendationReason: '基于真实回复',
      rankingReason: '按回复中的推荐顺序',
      expressionCompleteness: '完整',
      expressionDeviation: '无明显偏差',
      competitorMentions: [],
      reviewRequired: false,
      updatedAt: '2026-07-16T00:00:00.000Z'
    }
  };
}

function toRate(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}
