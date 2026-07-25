import type { SprintRetestTrendDashboard, SprintRetestTrendItem, VisibilitySprintMetricSummary } from '@geo-platform/shared-types';

export type SprintTrendMetricRow = {
  key: keyof VisibilitySprintMetricSummary;
  label: string;
  baseline: number;
  current: number;
  delta: number;
  kind: 'rate' | 'count';
};

const metricDefinitions: Array<{ key: keyof VisibilitySprintMetricSummary; label: string; kind: 'rate' | 'count' }> = [
  { key: 'mentionRate', label: '品牌提及率', kind: 'rate' },
  { key: 'recommendationRate', label: '推荐率', kind: 'rate' },
  { key: 'firstRecommendationRate', label: '首位推荐率', kind: 'rate' },
  { key: 'citationHitRate', label: '引用命中率', kind: 'rate' },
  { key: 'expressionAccuracyRate', label: '表达准确率', kind: 'rate' },
  { key: 'riskExpressionCount', label: '风险表达数', kind: 'count' },
  { key: 'questionCoverageRate', label: '问题覆盖率', kind: 'rate' }
];

const statusDisplays: Record<SprintRetestTrendItem['status'], { label: string; color: string }> = {
  planned: { label: '待再次监测', color: 'default' },
  completed: { label: '已完成', color: 'blue' },
  improved: { label: '已改善', color: 'green' },
  needs_follow_up: { label: '需继续跟进', color: 'red' }
};

export function buildSprintTrendMetricRows(baseline: VisibilitySprintMetricSummary, current: VisibilitySprintMetricSummary): SprintTrendMetricRow[] {
  return metricDefinitions.map((definition) => {
    const baselineValue = Number(baseline[definition.key] ?? 0);
    const currentValue = Number(current[definition.key] ?? 0);
    return {
      key: definition.key,
      label: definition.label,
      kind: definition.kind,
      baseline: baselineValue,
      current: currentValue,
      delta: currentValue - baselineValue
    };
  });
}

export function getRetestTrendStatusDisplay(status: SprintRetestTrendItem['status']) {
  return statusDisplays[status];
}

export function getRetestCompletionRate(dashboard: SprintRetestTrendDashboard | null): number {
  if (!dashboard || dashboard.plannedTaskCount === 0) return 0;
  return Math.round((dashboard.completedRetestCount / dashboard.plannedTaskCount) * 100);
}

export function formatTrendMetricValue(value: number, kind: SprintTrendMetricRow['kind']): string {
  return kind === 'rate' ? `${Math.round(value * 100)}%` : String(value);
}

export function formatTrendMetricDelta(delta: number, kind: SprintTrendMetricRow['kind']): string {
  const sign = delta > 0 ? '+' : '';
  return kind === 'rate' ? `${sign}${Math.round(delta * 100)}%` : `${sign}${delta}`;
}
