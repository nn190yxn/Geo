import { describe, expect, it } from 'vitest';
import type {
  CompositeMetricComponent,
  MeasurementMetric,
  MeasurementScope,
  MetricTrendSnapshot,
  MonitoringRunDetail,
  PromptKind
} from '@geo-platform/shared-types';
import { normalizeCompositeMetric, evaluateMetricTrends } from '../src/modules/monitoring/metric-integrity.service';
import { buildPromptMeasurementBreakdown, classifyPromptKind } from '../src/modules/monitoring/prompt-measurement';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

const brand = {
  name: '追光小牛',
  aliases: ['Super Calf', 'SC Fit'],
  website: 'https://www.supercalf.cn'
};

describe(`Property P20: discovery metrics exclude every brand probe ${validatesCriteria(['28.1', '28.2'])}`, () => {
  it('classifies aliases and hostname boundaries while preserving discovery metrics under probe additions', () => {
    const discoveryRuns = [
      createRun('discovery-1', '儿童体能机构怎么选？', 'discovery', true, 1),
      createRun('discovery-2', '贵阳运动课程推荐', 'discovery', false, null),
      createRun('discovery-3', 'supercalf.cn.example.com 是否可信？', 'discovery', false, null)
    ];
    const baseline = buildPromptMeasurementBreakdown(discoveryRuns, brand).discovery;
    const probeQuestions = [
      '追光小牛适合几岁孩子？',
      'SUPER   CALF 的课程怎么样？',
      'SC Fit 值得选择吗？',
      'supercalf.cn 有哪些课程？',
      'academy.supercalf.cn 的课程如何？'
    ];

    for (const [index, question] of probeQuestions.entries()) {
      expect(classifyPromptKind(question, brand)).toBe('brand_probe');
      const withProbe = buildPromptMeasurementBreakdown([
        ...discoveryRuns,
        createRun(`probe-${index}`, question, index % 2 === 0 ? 'brand_probe' : 'discovery', index % 2 === 0, 1)
      ], brand);
      expect(withProbe.discovery.runIds).toEqual(baseline.runIds);
      expect(withProbe.discovery.metrics).toEqual(baseline.metrics);
      expect(withProbe.brandProbe.runIds).toContain(`run-probe-${index}`);
    }
  });
});

describe(`Property P21: measured composite weights normalize to one ${validatesCriteria(['28.5'])}`, () => {
  it('excludes every unmeasured or invalid component and preserves relative configured weights', () => {
    const codes: MeasurementMetric['code'][] = ['mention_rate', 'first_rate', 'top3_rate', 'fact_accuracy'];
    const statuses = ['valid', 'insufficient', 'unmeasured'] as const;

    for (let mask = 0; mask < 81; mask += 1) {
      let state = mask;
      const components = codes.map((code, index) => {
        const measurementStatus = statuses[state % statuses.length];
        state = Math.floor(state / statuses.length);
        return component(code, measurementStatus === 'unmeasured' ? null : 20 + index * 15, index + 1, measurementStatus);
      });
      const result = normalizeCompositeMetric(components);
      const measured = components.filter((item) => item.value !== null && item.measurementStatus !== 'unmeasured');
      const weightSum = Object.values(result.normalizedWeights).reduce((sum, weight) => sum + weight, 0);

      if (measured.length === 0) {
        expect(result).toMatchObject({ metricState: 'unmeasured', value: null });
        expect(weightSum).toBe(0);
        continue;
      }

      expect(weightSum).toBeCloseTo(1, 12);
      for (const item of components.filter((candidate) => !measured.includes(candidate))) {
        expect(result.normalizedWeights[item.code]).toBe(0);
      }
      for (const left of measured) {
        for (const right of measured) {
          expect(result.normalizedWeights[left.code] / result.normalizedWeights[right.code])
            .toBeCloseTo(left.configuredWeight / right.configuredWeight, 12);
        }
      }
    }

    const invalid = normalizeCompositeMetric([
      component('mention_rate', 80, Number.POSITIVE_INFINITY, 'valid'),
      component('top3_rate', Number.NaN, 1, 'valid')
    ]);
    expect(invalid).toMatchObject({ metricState: 'unmeasured', value: null });
  });
});

describe(`Property P22: trends require two same-direction comparable changes ${validatesCriteria(['28.8', '28.9', '28.10'])}`, () => {
  it('accepts only monotonic three-snapshot sequences and resets on reversals, equality, gaps, or baseline changes', () => {
    const values = [40, 50, 60];
    for (const first of values) {
      for (const second of values) {
        for (const third of values) {
          const result = evaluateMetricTrends([
            snapshot('2026-08-01', first),
            snapshot('2026-08-02', second),
            snapshot('2026-08-03', third)
          ])[0];
          const firstDelta = second - first;
          const secondDelta = third - second;
          const expected = firstDelta > 0 && secondDelta > 0
            ? 'upward_trend'
            : firstDelta < 0 && secondDelta < 0 ? 'downward_trend' : undefined;

          if (expected) expect(result.trendState).toBe(expected);
          else expect(['upward_trend', 'downward_trend']).not.toContain(result.trendState);
        }
      }
    }

    const gap = { ...snapshot('2026-08-02', 50), value: null, measurementStatus: 'unmeasured' as const };
    expect(evaluateMetricTrends([snapshot('2026-08-01', 40), gap, snapshot('2026-08-03', 60)])[0].trendState)
      .toBe('stable');
    expect(evaluateMetricTrends([
      snapshot('2026-08-01', 40), snapshot('2026-08-02', 50, 'baseline-2'), snapshot('2026-08-03', 60, 'baseline-2')
    ]).every((item) => item.trendState !== 'upward_trend')).toBe(true);
  });
});

function component(
  code: MeasurementMetric['code'],
  value: number | null,
  configuredWeight: number,
  measurementStatus: MeasurementMetric['measurementStatus']
): CompositeMetricComponent {
  return { code, label: code, value, configuredWeight, measurementStatus };
}

function snapshot(period: string, value: number, baselineVersion = 'baseline-1'): MetricTrendSnapshot {
  return {
    metricCode: 'mention_rate', metricLabel: '无提示提及率', period, value, measurementStatus: 'valid',
    measurementScope: { ...scope(), baselineVersion }, runIds: [`run-${period}`]
  };
}

function scope(): MeasurementScope {
  return {
    platformCode: 'doubao', modelName: 'model-v1', clientSurface: 'api', collectionMethod: 'api', searchEnabled: true,
    market: 'CN', language: 'zh-CN', evidenceLevel: 'reproducible_api', manualConfirmed: null, baselineVersion: 'baseline-1'
  };
}

function createRun(
  id: string,
  promptText: string,
  promptKind: PromptKind,
  brandMentioned: boolean,
  brandRank: number | null
): MonitoringRunDetail {
  const measurementScope = scope();
  return {
    id: `run-${id}`, brandId: 'brand-1', optimizationUnitId: 'unit-1', intentId: 'intent-1', promptId: `prompt-${id}`,
    promptText, promptKind, status: 'completed', createdAt: '2026-08-01T00:00:00.000Z', ...measurementScope,
    response: {
      id: `response-${id}`, runId: `run-${id}`, brandId: 'brand-1', rawText: '真实回答', citations: [],
      respondedAt: '2026-08-01T00:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-08-01T00:00:00.000Z', ...measurementScope
    },
    analysis: {
      id: `analysis-${id}`, responseId: `response-${id}`, runId: `run-${id}`, brandId: 'brand-1', brandMentioned, brandRank,
      sentiment: 'neutral', accuracyScore: 80, citationScore: 50, platformEvaluation: '', recommendationReason: '', rankingReason: '',
      expressionCompleteness: '', expressionDeviation: '', competitorMentions: [], reviewRequired: false, updatedAt: '2026-08-01T00:00:00.000Z'
    }
  };
}
