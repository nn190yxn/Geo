import { Injectable } from '@nestjs/common';
import type {
  CompositeMetricComponent,
  CompositeMetricResult,
  MetricTrendEvaluation,
  MetricTrendSnapshot,
  PlatformMetricComparison,
  PromptMeasurementSeries
} from '@geo-platform/shared-types';

export const promptMetricWeights: Record<string, number> = {
  mention_rate: 0.25,
  first_rate: 0.15,
  top3_rate: 0.15,
  recognition_rate: 0.15,
  fact_accuracy: 0.2,
  owned_domain_citation_rate: 0.1
};

@Injectable()
export class MetricIntegrityService {
  normalizeCompositeMetric(components: CompositeMetricComponent[]): CompositeMetricResult {
    return normalizeCompositeMetric(components);
  }

  evaluatePlatformComparisons(series: PromptMeasurementSeries[]): PlatformMetricComparison[] {
    return evaluatePlatformComparisons(series);
  }

  evaluateMetricTrends(snapshots: MetricTrendSnapshot[]): MetricTrendEvaluation[] {
    return evaluateMetricTrends(snapshots);
  }
}

export function normalizeCompositeMetric(components: CompositeMetricComponent[]): CompositeMetricResult {
  const measured = components.filter((component) => (
    component.value !== null
    && Number.isFinite(component.value)
    && component.measurementStatus !== 'unmeasured'
    && Number.isFinite(component.configuredWeight)
    && component.configuredWeight > 0
  ));
  const measuredWeight = measured.reduce((sum, component) => sum + component.configuredWeight, 0);
  const normalizedWeights: Record<string, number> = Object.fromEntries(components.map((component) => [component.code, 0]));

  if (measured.length === 0 || measuredWeight <= 0) {
    return { metricState: 'unmeasured', value: null, normalizedWeights, components };
  }

  let assignedWeight = 0;
  measured.forEach((component, index) => {
    const weight = index === measured.length - 1 ? 1 - assignedWeight : component.configuredWeight / measuredWeight;
    normalizedWeights[component.code] = weight;
    assignedWeight += weight;
  });
  const value = measured.reduce((sum, component) => sum + (component.value ?? 0) * normalizedWeights[component.code], 0);
  const metricState = measured.some((component) => component.measurementStatus === 'insufficient') ? 'insufficient' : 'valid';

  return { metricState, value: Math.round(value), normalizedWeights, components };
}

export function evaluatePlatformComparisons(series: PromptMeasurementSeries[]): PlatformMetricComparison[] {
  const groups = new Map<string, Array<{ market: string; metric: PromptMeasurementSeries['metrics'][number]; platformCode: string }>>();
  series.forEach((item) => item.metrics.forEach((metric) => {
    const key = JSON.stringify([item.measurementScope.market, metric.code]);
    groups.set(key, [...(groups.get(key) ?? []), { market: item.measurementScope.market, metric, platformCode: item.measurementScope.platformCode }]);
  }));

  return Array.from(groups.values()).map((items) => {
    const byPlatform = new Map<string, { weightedTotal: number; sampleCount: number }>();
    items.filter((item) => item.metric.measurementStatus === 'valid' && item.metric.value !== null).forEach((item) => {
      const current = byPlatform.get(item.platformCode) ?? { weightedTotal: 0, sampleCount: 0 };
      current.weightedTotal += (item.metric.value ?? 0) * item.metric.sampleCount;
      current.sampleCount += item.metric.sampleCount;
      byPlatform.set(item.platformCode, current);
    });
    const platforms = Array.from(byPlatform.entries()).map(([platformCode, value]) => ({
      platformCode,
      value: Math.round(value.weightedTotal / value.sampleCount),
      sampleCount: value.sampleCount
    })).sort((left, right) => right.value - left.value || left.platformCode.localeCompare(right.platformCode));
    const first = items[0];
    const base = { market: first.market, metricCode: first.metric.code, metricLabel: first.metric.label, platforms };
    if (platforms.length < 2) return { ...base, eligibility: 'insufficient_sample' as const, reason: 'fewer_than_two_valid_platforms' as const };
    if (platforms.every((platform) => platform.value === platforms[0].value)) {
      return { ...base, eligibility: 'insufficient_sample' as const, reason: 'all_platforms_equal' as const };
    }
    return {
      ...base,
      eligibility: 'eligible' as const,
      strongestPlatformCode: platforms[0].platformCode,
      weakestPlatformCode: platforms.at(-1)?.platformCode
    };
  }).sort((left, right) => left.market.localeCompare(right.market) || left.metricCode.localeCompare(right.metricCode));
}

export function evaluateMetricTrends(snapshots: MetricTrendSnapshot[]): MetricTrendEvaluation[] {
  const groups = new Map<string, MetricTrendSnapshot[]>();
  snapshots.forEach((snapshot) => {
    const scope = snapshot.measurementScope;
    const key = JSON.stringify([
      snapshot.metricCode, scope.baselineVersion, scope.platformCode, scope.modelName, scope.clientSurface,
      scope.collectionMethod, scope.searchEnabled, scope.market, scope.language
    ]);
    groups.set(key, [...(groups.get(key) ?? []), snapshot]);
  });

  return Array.from(groups.values()).map((group) => evaluateTrendGroup(group))
    .sort((left, right) => left.metricCode.localeCompare(right.metricCode) || left.measurementScope.platformCode.localeCompare(right.measurementScope.platformCode));
}

function evaluateTrendGroup(group: MetricTrendSnapshot[]): MetricTrendEvaluation {
  const ordered = [...group].sort((left, right) => left.period.localeCompare(right.period));
  let direction: MetricTrendEvaluation['direction'] = 'none';
  let consecutiveDirectionCount = 0;
  let previousValue: number | null = null;
  let validSnapshotCount = 0;
  for (const snapshot of ordered) {
    if (snapshot.measurementStatus !== 'valid' || snapshot.value === null) {
      direction = 'none';
      consecutiveDirectionCount = 0;
      previousValue = null;
      continue;
    }
    validSnapshotCount += 1;
    if (previousValue === null) {
      previousValue = snapshot.value;
      continue;
    }
    const delta = snapshot.value - previousValue;
    previousValue = snapshot.value;
    if (delta === 0) {
      direction = 'none';
      consecutiveDirectionCount = 0;
      continue;
    }
    const currentDirection = delta > 0 ? 'up' : 'down';
    consecutiveDirectionCount = direction === currentDirection ? consecutiveDirectionCount + 1 : 1;
    direction = currentDirection;
  }
  const trendState = validSnapshotCount === 0 ? 'unmeasured' : consecutiveDirectionCount >= 2
    ? direction === 'up' ? 'upward_trend' : 'downward_trend'
    : consecutiveDirectionCount === 1 ? 'single_period_observation' : 'stable';
  const latest = ordered[0];
  return {
    metricCode: latest.metricCode,
    metricLabel: latest.metricLabel,
    measurementScope: latest.measurementScope,
    trendState,
    direction,
    consecutiveDirectionCount,
    snapshots: ordered.slice(-3),
    runIds: [...new Set(ordered.flatMap((snapshot) => snapshot.runIds))]
  };
}
