import { describe, expect, it } from 'vitest';
import type { MonitoringRunDetail } from '@geo-platform/shared-types';
import { evaluateRetestEvidence } from '../src/modules/tasks/retest-evidence';

describe('retest evidence evaluation', () => {
  it('rejects historical records that reuse the baseline run', () => {
    const run = buildRun('run-source', 'baseline', true);
    expect(evaluateRetestEvidence(run, run)).toEqual({ status: 'planned', evidenceGap: 'historical_same_run' });
  });

  it('waits for a real response and then for analysis', () => {
    const source = buildRun('run-source', 'baseline', true);
    const collecting = buildRun('run-retest', '', false);
    const analyzing = buildRun('run-retest', 'real answer', false);

    expect(evaluateRetestEvidence(source, collecting)).toMatchObject({ status: 'collecting', evidenceGap: 'missing_real_response' });
    expect(evaluateRetestEvidence(source, analyzing)).toMatchObject({ status: 'analyzing', evidenceGap: 'missing_analysis' });
  });

  it('derives all four metric changes and the score from analysis evidence', () => {
    const source = buildRun('run-source', 'baseline', true, { mentioned: false, rank: null, accuracy: 40, citation: 20 });
    const retest = buildRun('run-retest', 'real answer', true, { mentioned: true, rank: 1, accuracy: 80, citation: 60 });
    const result = evaluateRetestEvidence(source, retest);

    expect(result).toMatchObject({
      status: 'improved',
      improved: true,
      beforeMetrics: { mentionRate: 0, brandRank: null, accuracyScore: 40, citationRate: 20 },
      afterMetrics: { mentionRate: 100, brandRank: 1, accuracyScore: 80, citationRate: 60 },
      metricDelta: { mentionRate: 100, rankImproved: true, accuracyScore: 40, citationRate: 40 }
    });
    expect(result.actualScore).toBe(85);
  });
});

function buildRun(
  id: string,
  rawText: string,
  withAnalysis: boolean,
  metrics = { mentioned: false, rank: null as number | null, accuracy: 40, citation: 20 }
): MonitoringRunDetail {
  return {
    id,
    brandId: 'brand_demo',
    promptId: 'prompt_demo',
    promptText: '测试问题',
    platformCode: 'manual_input',
    status: 'completed',
    startedAt: '2026-08-03T00:00:00.000Z',
    completedAt: '2026-08-03T00:01:00.000Z',
    createdAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:01:00.000Z',
    response: rawText ? {
      id: `response-${id}`,
      runId: id,
      brandId: 'brand_demo',
      rawText,
      modelName: 'manual',
      parseStatus: 'parsed',
      createdAt: '2026-08-03T00:01:00.000Z',
      updatedAt: '2026-08-03T00:01:00.000Z'
    } : undefined,
    analysis: withAnalysis ? {
      id: `analysis-${id}`,
      responseId: `response-${id}`,
      runId: id,
      brandId: 'brand_demo',
      brandMentioned: metrics.mentioned,
      brandRank: metrics.rank,
      sentiment: 'neutral',
      accuracyScore: metrics.accuracy,
      citationScore: metrics.citation,
      platformEvaluation: '',
      recommendationReason: '',
      rankingReason: '',
      expressionCompleteness: '',
      expressionDeviation: '',
      competitorMentions: [],
      reviewRequired: false,
      updatedAt: '2026-08-03T00:01:00.000Z'
    } : undefined
  };
}
