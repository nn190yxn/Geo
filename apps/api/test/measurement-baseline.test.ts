import { describe, expect, it } from 'vitest';
import type { MeasurementScope, MonitoringRunDetail } from '@geo-platform/shared-types';
import { buildMeasurementMetrics, buildMeasurementTrendSegments, isComparableMeasurementScope, resolveBaselineVersion } from '../src/modules/monitoring/measurement-baseline';

const scope: MeasurementScope = {
  platformCode: 'doubao', modelName: 'model-a', collectionMethod: 'api', clientSurface: 'api', searchEnabled: true,
  market: 'CN', language: 'zh-CN', evidenceLevel: 'reproducible_api', manualConfirmed: null, baselineVersion: 'baseline-1'
};

describe('measurement baseline', () => {
  it('reuses a baseline only for compatible measurement conditions', () => {
    expect(isComparableMeasurementScope(scope, { ...scope, collectionMethod: 'manual', evidenceLevel: 'manual_or_browser' })).toBe(false);
    expect(isComparableMeasurementScope(scope, { ...scope, clientSurface: 'web' })).toBe(false);
    const proposed = (({ baselineVersion: _, ...value }) => value)(scope);
    expect(resolveBaselineVersion([scope], proposed, () => 'baseline-2')).toBe('baseline-1');
    expect(resolveBaselineVersion([scope], { ...proposed, modelName: 'model-b' }, () => 'baseline-2')).toBe('baseline-2');
  });

  it('separates incompatible baselines and computes all visibility metrics', () => {
    const runs = [
      createRun('run-1', 'baseline-1', '2026-08-01T00:00:00.000Z', true, 1, 80, 70, ['https://a.example']),
      createRun('run-2', 'baseline-1', '2026-08-02T00:00:00.000Z', false, null, 60, 40, []),
      createRun('run-3', 'baseline-2', '2026-08-03T00:00:00.000Z', true, 3, 100, 90, ['https://b.example'])
    ];
    const segments = buildMeasurementTrendSegments(runs);
    expect(segments.map((item) => item.baselineVersion)).toEqual(['baseline-1', 'baseline-2']);
    expect(segments[0].measurementStatus).toBe('insufficient');
    const metrics = buildMeasurementMetrics(runs);
    expect(metrics.map((item) => item.code)).toEqual(['mention_rate', 'top3_rate', 'fact_accuracy', 'citation_recall', 'citation_accuracy']);
    expect(metrics.find((item) => item.code === 'fact_accuracy')?.value).toBe(80);
  });

  it('keeps empty and sparse samples explicit', () => {
    expect(buildMeasurementMetrics([]).every((item) => item.measurementStatus === 'unmeasured')).toBe(true);
    expect(buildMeasurementTrendSegments([createRun('run-1', 'baseline-1', '2026-08-01T00:00:00.000Z', true, 1, 80, 70, [])])[0].measurementStatus).toBe('insufficient');
  });
});

function createRun(id: string, baselineVersion: string, respondedAt: string, brandMentioned: boolean, brandRank: number | null, accuracyScore: number, citationScore: number, citations: string[]): MonitoringRunDetail {
  return {
    id, brandId: 'brand_demo', optimizationUnitId: 'unit-1', intentId: 'intent-1', promptId: 'prompt-1', promptKind: 'discovery', promptText: '测试问题',
    status: 'completed', createdAt: respondedAt, ...scope, baselineVersion,
    response: {
      id: `response-${id}`, runId: id, brandId: 'brand_demo', rawText: '真实回答', citations, respondedAt, parseStatus: 'parsed', createdAt: respondedAt,
      ...scope, baselineVersion
    },
    analysis: {
      id: `analysis-${id}`, responseId: `response-${id}`, runId: id, brandId: 'brand_demo', brandMentioned, brandRank,
      sentiment: 'neutral', accuracyScore, citationScore, platformEvaluation: '', recommendationReason: '', rankingReason: '',
      expressionCompleteness: '', expressionDeviation: '', competitorMentions: [], reviewRequired: false, updatedAt: respondedAt
    }
  };
}
