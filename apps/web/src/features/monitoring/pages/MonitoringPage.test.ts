import { describe, expect, it } from 'vitest';
import { buildMonitoringOverview, getCompletedRealResponseCount, getMonitoringCurrentStep, getPendingRealResponseRuns, getPendingRunAction, isRealAIResponseRun } from './MonitoringPage';

const response = {
  id: 'response_1',
  runId: 'run_1',
  brandId: 'brand_1',
  rawText: 'real response',
  citations: [],
  platformCode: 'doubao',
  modelName: 'unknown',
  collectionMethod: 'unknown' as const,
  clientSurface: 'unknown' as const,
  searchEnabled: null,
  market: 'unknown',
  language: 'unknown',
  evidenceLevel: 'unknown' as const,
  manualConfirmed: null,
  baselineVersion: 'unknown',
  respondedAt: '2026-07-14T00:00:00.000Z',
  parseStatus: 'parsed' as const,
  createdAt: '2026-07-14T00:00:00.000Z'
};

describe('MonitoringPage helpers', () => {
  it('keeps only runs that still need real AI responses', () => {
    const pendingRuns = getPendingRealResponseRuns([
      { status: 'review_required', retryStatus: 'not_retried', response: undefined },
      { status: 'failed', retryStatus: 'retried', response: undefined },
      { status: 'failed', retryStatus: 'retry_pending', response: undefined },
      {
        status: 'completed',
        retryStatus: 'not_retried',
        response
      },
      { status: 'pending', retryStatus: 'not_retried', response: undefined }
    ]);

    expect(pendingRuns).toHaveLength(3);
  });

  it('offers automatic, browser-assisted, and manual paths for pending real responses', () => {
    const automaticRecovery = getPendingRunAction({ status: 'failed', retryStatus: 'retry_pending', response: undefined });
    const alternateRecovery = getPendingRunAction({ status: 'failed', retryStatus: 'retried', response: undefined });
    const manualRecovery = getPendingRunAction({ status: 'review_required', retryStatus: 'not_retried', response: undefined });

    expect(automaticRecovery).toContain('自动监测稍后再试');
    expect(automaticRecovery).toContain('手动录入');
    expect(alternateRecovery).toContain('浏览器辅助监测');
    expect(alternateRecovery).toContain('手动录入');
    expect(manualRecovery).toContain('AI 平台');
    expect(manualRecovery).toContain('手动录入');
  });

  it('tracks the current monitoring creation step', () => {
    expect(getMonitoringCurrentStep(0, 0, 0)).toBe(2);
    expect(getMonitoringCurrentStep(1, 0, 0)).toBe(3);
    expect(getMonitoringCurrentStep(1, 2, 0)).toBe(4);
    expect(getMonitoringCurrentStep(1, 2, 1)).toBe(4);
  });

  it('counts only real AI responses and excludes sample platform runs', () => {
    expect(isRealAIResponseRun({ platformCode: 'doubao', response })).toBe(true);
    expect(isRealAIResponseRun({ platformCode: 'mock_ai', response })).toBe(false);
    expect(getCompletedRealResponseCount([
      { platformCode: 'doubao', response },
      { platformCode: 'manual_input', response },
      { platformCode: 'mock_ai', response },
      { platformCode: 'kimi', response: undefined }
    ])).toBe(2);
  });

  it('builds conclusion-first metrics from real responses only', () => {
    const overview = buildMonitoringOverview([
      createOverviewRun('doubao', { mentioned: true, rank: 2, citations: ['https://example.com'] }),
      createOverviewRun('kimi', { mentioned: false, rank: null, reviewRequired: true }),
      createOverviewRun('mock_ai', { mentioned: true, rank: 1, citations: ['https://sample.invalid'] })
    ], 'all');

    expect(overview.sampleCount).toBe(2);
    expect(overview.title).toContain('1 条回复需要优先确认');
    expect(overview.metrics.map((item) => item.value)).toEqual([2, 50, 50, 50]);
    expect(overview.platformBreakdown).toHaveLength(2);
  });

  it('updates the analysis scope when a platform is selected', () => {
    const runs = [
      createOverviewRun('doubao', { mentioned: true, rank: 1 }),
      createOverviewRun('kimi', { mentioned: false, rank: null })
    ];

    const overview = buildMonitoringOverview(runs, 'kimi');

    expect(overview.sampleCount).toBe(1);
    expect(overview.metrics[0]?.description).toBe('Kimi样本');
    expect(overview.metrics[1]?.value).toBe(0);
    expect(overview.platformBreakdown.map((item) => item.platformCode)).toEqual(['kimi']);
  });

  it('explains the real-sample boundary when no responses are available', () => {
    const overview = buildMonitoringOverview([
      createOverviewRun('mock_ai', { mentioned: true, rank: 1 })
    ], 'all');

    expect(overview.sampleCount).toBe(0);
    expect(overview.toneLabel).toBe('待采集');
    expect(overview.findings[0]).toContain('真实 AI 回复');
  });
});

function createOverviewRun(
  platformCode: string,
  values: { mentioned: boolean; rank: number | null; citations?: string[]; reviewRequired?: boolean }
) {
  return {
    platformCode,
    response: { ...response, citations: values.citations ?? [] },
    analysis: {
      brandMentioned: values.mentioned,
      brandRank: values.rank,
      reviewRequired: values.reviewRequired ?? false
    }
  } as Parameters<typeof buildMonitoringOverview>[0][number];
}
