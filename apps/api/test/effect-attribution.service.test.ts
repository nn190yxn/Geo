import { describe, expect, it } from 'vitest';
import type { ContentAsset, MonitoringRunDetail, OptimizationTask, PublishingRecord } from '@geo-platform/shared-types';
import { EffectAttributionService } from '../src/modules/reports/effect-attribution.service';

describe('EffectAttributionService', () => {
  it('uses the latest frozen report period and aggregates linked optimization evidence', async () => {
    const sourceRun = createRun('run-before', '2026-06-25T08:00:00.000Z');
    const retestRun = createRun('run-after', '2026-07-10T08:00:00.000Z');
    const task = createTask();
    const service = new EffectAttributionService({
      getReportDashboard: () => ({ brandId: 'brand-test', reports: [], latest: { periodStart: '2026-07-01', periodEnd: '2026-07-31' } }),
      listMonitoringRuns: () => [sourceRun, retestRun],
      listContentAssets: () => [createAsset()],
      getPublishingDashboard: () => ({ records: [createPublishingRecord()] }),
      getTaskBoard: () => ({ tasks: [task] })
    } as never);

    const dashboard = await service.getDashboard('user-test', 'brand-test', new Date('2026-08-01T00:00:00.000Z'));

    expect(dashboard).toMatchObject({
      periodStart: '2026-07-01',
      periodEnd: '2026-07-31',
      periodSource: 'latest_report',
      evidence: [{ taskId: task.id, evidenceStatus: 'complete', publishingRecords: [{ publishedUrl: 'https://example.com/evidence' }] }]
    });
    expect(dashboard?.dataGaps).toEqual([]);
  });

  it('falls back to the current month and returns actionable gaps', async () => {
    const service = new EffectAttributionService({
      getReportDashboard: () => ({ brandId: 'brand-test', reports: [] }),
      listMonitoringRuns: () => [],
      listContentAssets: () => [],
      getPublishingDashboard: () => ({ records: [] }),
      getTaskBoard: () => ({ tasks: [] })
    } as never);

    const dashboard = await service.getDashboard('user-test', 'brand-test', new Date('2026-07-15T12:00:00.000Z'));

    expect(dashboard).toMatchObject({ periodStart: '2026-07-01', periodEnd: '2026-07-15', periodSource: 'current_month', evidence: [] });
    expect(dashboard?.dataGaps.map((gap) => gap.section)).toEqual(['有效样本', '发布记录', '效果验证']);
  });
});

function createRun(id: string, completedAt: string): MonitoringRunDetail {
  return {
    id, brandId: 'brand-test', optimizationUnitId: 'unit', intentId: 'intent', promptId: 'prompt', platformCode: 'manual_input', status: 'completed', createdAt: completedAt, completedAt, promptText: '测试问题',
    response: { id: `${id}-response`, runId: id, brandId: 'brand-test', rawText: '真实回答', citations: ['https://example.com/source'], respondedAt: completedAt, parseStatus: 'parsed', createdAt: completedAt },
    analysis: { id: `${id}-analysis`, responseId: `${id}-response`, runId: id, brandId: 'brand-test', brandMentioned: true, brandRank: 2, sentiment: 'positive', accuracyScore: 90, citationScore: 100, platformEvaluation: '', recommendationReason: '', rankingReason: '', expressionCompleteness: '', expressionDeviation: '', competitorMentions: [], reviewRequired: false, reviewed: true, createdAt: completedAt, updatedAt: completedAt }
  };
}

function createAsset(): ContentAsset {
  return { id: 'asset-1', brandId: 'brand-test', title: '内容', type: 'article', platform: 'official_site', url: 'https://example.com/evidence', targetKeywords: [], status: 'published', createdAt: '2026-07-05T00:00:00.000Z', updatedAt: '2026-07-05T00:00:00.000Z' };
}

function createPublishingRecord(): PublishingRecord {
  return { id: 'publish-1', brandId: 'brand-test', contentAssetId: 'asset-1', title: '发布', body: '正文', platform: 'official_site', status: 'published', publishedUrl: 'https://example.com/evidence', publishedAt: '2026-07-06T00:00:00.000Z', createdAt: '2026-07-06T00:00:00.000Z', updatedAt: '2026-07-06T00:00:00.000Z' };
}

function createTask(): OptimizationTask {
  return {
    id: 'task-1', brandId: 'brand-test', title: '补强官网事实', type: 'manual', status: 'done', contentLink: 'https://example.com/evidence', createdAt: '2026-07-01T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z', retestRecords: [{
      id: 'retest-1', taskId: 'task-1', sourceRunId: 'run-before', retestRunId: 'run-after', status: 'improved', plannedAt: '2026-07-10T00:00:00.000Z', completedAt: '2026-07-10T00:00:00.000Z', beforeMetrics: { mentionRate: 0, brandRank: 5, accuracyScore: 60, citationRate: 0 }, afterMetrics: { mentionRate: 100, brandRank: 2, accuracyScore: 90, citationRate: 100 }, metricDelta: { mentionRate: 100, rankImproved: true, accuracyScore: 30, citationRate: 100 }, createdAt: '2026-07-10T00:00:00.000Z', updatedAt: '2026-07-10T00:00:00.000Z'
    }]
  };
}
