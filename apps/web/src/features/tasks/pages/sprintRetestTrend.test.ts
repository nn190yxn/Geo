import { describe, expect, it } from 'vitest';
import type { SprintRetestTrendDashboard, VisibilitySprintMetricSummary } from '@geo-platform/shared-types';
import { buildSprintTrendMetricRows, formatTrendMetricDelta, formatTrendMetricValue, getRetestCompletionRate, getRetestTrendStatusDisplay } from './sprintRetestTrend';

describe('sprintRetestTrend helpers', () => {
  it('builds Sprint trend rows from baseline and current summaries', () => {
    const rows = buildSprintTrendMetricRows(createMetricSummary({ mentionRate: 0.4, riskExpressionCount: 2 }), createMetricSummary({ mentionRate: 0.65, riskExpressionCount: 1 }));

    expect(rows).toEqual(expect.arrayContaining([
      expect.objectContaining({ key: 'mentionRate', label: '品牌提及率', baseline: 0.4, current: 0.65, delta: 0.25, kind: 'rate' }),
      expect.objectContaining({ key: 'riskExpressionCount', label: '风险表达数', baseline: 2, current: 1, delta: -1, kind: 'count' })
    ]));
  });

  it('formats metric values and deltas for table display', () => {
    expect(formatTrendMetricValue(0.72, 'rate')).toBe('72%');
    expect(formatTrendMetricValue(3, 'count')).toBe('3');
    expect(formatTrendMetricDelta(0.18, 'rate')).toBe('+18%');
    expect(formatTrendMetricDelta(-2, 'count')).toBe('-2');
  });

  it('returns retest trend status and completion rate', () => {
    expect(getRetestTrendStatusDisplay('needs_follow_up')).toEqual({ label: '需继续跟进', color: 'red' });
    expect(getRetestCompletionRate(createTrendDashboard({ plannedTaskCount: 5, completedRetestCount: 3 }))).toBe(60);
    expect(getRetestCompletionRate(createTrendDashboard({ plannedTaskCount: 0, completedRetestCount: 0 }))).toBe(0);
  });
});

function createMetricSummary(partial: Partial<VisibilitySprintMetricSummary>): VisibilitySprintMetricSummary {
  return {
    questionCoverageRate: 0.5,
    mentionRate: 0.5,
    recommendationRate: 0.5,
    firstRecommendationRate: 0.2,
    topThreeRate: 0.4,
    citationHitRate: 0.3,
    expressionAccuracyRate: 0.7,
    riskExpressionCount: 0,
    contentGapCount: 1,
    competitorSuppressionCount: 0,
    sampleSize: 10,
    ...partial
  };
}

function createTrendDashboard(partial: Partial<SprintRetestTrendDashboard>): SprintRetestTrendDashboard {
  return {
    brandId: 'brand_demo',
    sprintId: 'sprint_1',
    plannedTaskCount: 1,
    completedRetestCount: 0,
    improvedRetestCount: 0,
    baselineMetricSummary: createMetricSummary({}),
    items: [],
    updatedAt: '2026-07-12T00:00:00.000Z',
    ...partial
  };
}
