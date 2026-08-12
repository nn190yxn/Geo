import { describe, expect, it } from 'vitest';
import type { CompositeMetricComponent, MeasurementMetric, MeasurementScope, MetricTrendSnapshot, PromptMeasurementSeries } from '@geo-platform/shared-types';
import { evaluateMetricTrends, evaluatePlatformComparisons, normalizeCompositeMetric } from '../src/modules/monitoring/metric-integrity.service';

describe('MetricIntegrityService', () => {
  it('removes unmeasured components and normalizes the measured weights to one', () => {
    const components: CompositeMetricComponent[] = [
      component('mention_rate', 80, 0.6, 'valid'),
      component('fact_accuracy', null, 0.3, 'unmeasured'),
      component('top3_rate', 40, 0.1, 'valid')
    ];
    const result = normalizeCompositeMetric(components);

    expect(result.value).toBe(74);
    expect(result.normalizedWeights.mention_rate).toBeCloseTo(6 / 7);
    expect(result.normalizedWeights.top3_rate).toBeCloseTo(1 / 7);
    expect(result.normalizedWeights.fact_accuracy).toBe(0);
    expect(Object.values(result.normalizedWeights).reduce((sum, weight) => sum + weight, 0)).toBeCloseTo(1);
  });

  it('allows comparison only for two differing valid platforms in the same market', () => {
    const eligible = evaluatePlatformComparisons([series('doubao', 80), series('qwen', 60)])[0];
    const equal = evaluatePlatformComparisons([series('doubao', 80), series('qwen', 80)])[0];
    const onePlatform = evaluatePlatformComparisons([series('doubao', 80)])[0];

    expect(eligible).toMatchObject({ eligibility: 'eligible', strongestPlatformCode: 'doubao', weakestPlatformCode: 'qwen' });
    expect(equal).toMatchObject({ eligibility: 'insufficient_sample', reason: 'all_platforms_equal' });
    expect(onePlatform).toMatchObject({ eligibility: 'insufficient_sample', reason: 'fewer_than_two_valid_platforms' });
  });

  it('upgrades two same-direction changes across three comparable snapshots to a trend', () => {
    const result = evaluateMetricTrends([snapshot('2026-08-01', 40), snapshot('2026-08-02', 50), snapshot('2026-08-03', 60)])[0];
    expect(result).toMatchObject({ trendState: 'upward_trend', direction: 'up', consecutiveDirectionCount: 2 });
  });

  it('keeps one change as an observation and resets the sequence for a new baseline', () => {
    const result = evaluateMetricTrends([
      snapshot('2026-08-01', 40), snapshot('2026-08-02', 50),
      snapshot('2026-08-03', 60, 'baseline-2'), snapshot('2026-08-04', 70, 'baseline-2')
    ]);
    expect(result).toHaveLength(2);
    expect(result.every((trend) => trend.trendState === 'single_period_observation' && trend.consecutiveDirectionCount === 1)).toBe(true);
  });

  it('does not bridge a trend across an unmeasured snapshot', () => {
    const gap = { ...snapshot('2026-08-02', 0), value: null, measurementStatus: 'unmeasured' as const };
    const result = evaluateMetricTrends([
      snapshot('2026-08-01', 40), gap, snapshot('2026-08-03', 50), snapshot('2026-08-04', 60)
    ])[0];
    expect(result).toMatchObject({ trendState: 'single_period_observation', consecutiveDirectionCount: 1 });
  });

  it('keeps equal and reversing snapshots out of trend conclusions', () => {
    const equal = evaluateMetricTrends([snapshot('2026-08-01', 50), snapshot('2026-08-02', 50), snapshot('2026-08-03', 50)])[0];
    const reversed = evaluateMetricTrends([snapshot('2026-08-01', 40), snapshot('2026-08-02', 60), snapshot('2026-08-03', 50)])[0];

    expect(equal).toMatchObject({ trendState: 'stable', direction: 'none', consecutiveDirectionCount: 0 });
    expect(reversed).toMatchObject({ trendState: 'single_period_observation', direction: 'down', consecutiveDirectionCount: 1 });
  });
});

function component(code: MeasurementMetric['code'], value: number | null, configuredWeight: number, measurementStatus: MeasurementMetric['measurementStatus']): CompositeMetricComponent {
  return { code, label: code, value, configuredWeight, measurementStatus };
}

function series(platformCode: string, value: number): PromptMeasurementSeries {
  return {
    promptKind: 'discovery', measurementStatus: 'valid', sampleCount: 3, runIds: [`run-${platformCode}`], measurementScope: scope(platformCode),
    metrics: [{ code: 'mention_rate', label: '品牌提及率', measurementStatus: 'valid', sampleCount: 3, value }]
  };
}

function snapshot(period: string, value: number, baselineVersion = 'baseline-1'): MetricTrendSnapshot {
  return {
    metricCode: 'mention_rate', metricLabel: '品牌提及率', period, value, measurementStatus: 'valid',
    measurementScope: { ...scope('doubao'), baselineVersion }, runIds: [`run-${period}`]
  };
}

function scope(platformCode: string): MeasurementScope {
  return {
    platformCode, modelName: 'model-v1', clientSurface: 'api', collectionMethod: 'api', searchEnabled: true,
    market: 'CN', language: 'zh-CN', evidenceLevel: 'reproducible_api', manualConfirmed: null, baselineVersion: 'baseline-1'
  };
}
