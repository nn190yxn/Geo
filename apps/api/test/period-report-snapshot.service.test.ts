import { describe, expect, it } from 'vitest';
import type { ContentAsset, MonitoringRunDetail, OptimizationTask, PublishingRecord } from '@geo-platform/shared-types';
import { PeriodReportSnapshotService } from '../src/modules/reports/period-report-snapshot.service';

const service = new PeriodReportSnapshotService();

describe('PeriodReportSnapshotService', () => {
  it('uses inclusive UTC calendar-day boundaries across month-end and leap day', () => {
    const period = service.resolvePeriod('2028-02-29', '2028-03-01');

    expect(period.startInclusive.toISOString()).toBe('2028-02-29T00:00:00.000Z');
    expect(period.endExclusive.toISOString()).toBe('2028-03-02T00:00:00.000Z');
    expect(service.includes(period, '2028-02-29T00:00:00.000Z')).toBe(true);
    expect(service.includes(period, '2028-03-01T23:59:59.999Z')).toBe(true);
    expect(service.includes(period, '2028-03-02T00:00:00.000Z')).toBe(false);
    expect(service.includes(period, '2028-03-02T07:59:59+08:00')).toBe(true);
  });

  it.each([
    ['2026-02-29', '2026-03-01', '有效日历日期'],
    ['2026/03/01', '2026-03-02', 'YYYY-MM-DD'],
    ['2026-03-03', '2026-03-02', '早于或等于']
  ])('rejects invalid report period %s to %s', (periodStart, periodEnd, message) => {
    expect(() => service.resolvePeriod(periodStart, periodEnd)).toThrow(message);
  });

  it('freezes only in-period records and counts analyzed real responses as valid samples', () => {
    const period = service.resolvePeriod('2026-07-01', '2026-07-31');
    const validRun = createRun('run-valid', '2026-07-01T00:00:00.000Z', true);
    const missingAnalysis = createRun('run-missing-analysis', '2026-07-31T23:59:59.999Z', false);
    const outsideRun = createRun('run-outside', '2026-08-01T00:00:00.000Z', true);
    const source = {
      monitoringRuns: [validRun, missingAnalysis, outsideRun],
      contentAssets: [createAsset('asset-in', '2026-07-15T08:00:00.000Z'), createAsset('asset-out', '2026-06-30T23:59:59.999Z')],
      publishingRecords: [createPublishingRecord('publish-in', '2026-07-31T23:59:59.999Z'), createPublishingRecord('publish-out', '2026-08-01T00:00:00.000Z')],
      tasks: [createTask('task-in', '2026-07-10T08:00:00.000Z', '2026-07-20T08:00:00.000Z'), createTask('task-out', '2026-08-01T00:00:00.000Z')]
    };

    const preview = service.buildPreview('brand-test', period, source);
    source.monitoringRuns.push(createRun('run-later', '2026-07-10T08:00:00.000Z', true));

    expect(preview).toMatchObject({
      monitoringRunCount: 2,
      validSampleCount: 1,
      contentAssetCount: 1,
      publishingRecordCount: 1,
      taskChangeCount: 1,
      completedRetestCount: 1
    });
    expect(preview.recordIds).toEqual({
      monitoringRunIds: ['run-valid', 'run-missing-analysis'],
      contentAssetIds: ['asset-in'],
      publishingRecordIds: ['publish-in'],
      taskIds: ['task-in'],
      retestRecordIds: ['retest-task-in']
    });
    expect(preview.sampleSummary.validSampleRunIds).toEqual(['run-valid']);
  });

  it('links completed retests to baseline, content and real publishing evidence', () => {
    const period = service.resolvePeriod('2026-07-01', '2026-07-31');
    const baseline = createRun('run-baseline', '2026-06-20T08:00:00.000Z', true);
    const retest = createRun('run-retest', '2026-07-20T08:00:00.000Z', true);
    const task = createTask('task-evidence', '2026-07-20T08:00:00.000Z', '2026-07-20T08:00:00.000Z');
    task.contentLink = 'https://example.com/evidence';
    task.retestRecords[0].sourceRunId = baseline.id;
    task.retestRecords[0].retestRunId = retest.id;
    const evidence = service.buildEffectEvidence('brand-test', period, {
      monitoringRuns: [baseline, retest],
      contentAssets: [createAsset('asset-evidence', '2026-07-10T08:00:00.000Z', 'https://example.com/evidence')],
      publishingRecords: [createPublishingRecord('publish-evidence', '2026-07-12T08:00:00.000Z', 'https://example.com/evidence')],
      tasks: [task]
    });

    expect(evidence).toHaveLength(1);
    expect(evidence[0]).toMatchObject({
      taskId: 'task-evidence',
      sourceRunId: 'run-baseline',
      retestRunId: 'run-retest',
      contentAssetIds: ['asset-evidence'],
      evidenceStatus: 'complete',
      sampleSummary: { baselineValid: true, retestValid: true }
    });
    expect(evidence[0].publishingRecords).toEqual([expect.objectContaining({ id: 'publish-evidence', publishedUrl: 'https://example.com/evidence' })]);
  });
});

function createRun(id: string, completedAt: string, withAnalysis: boolean): MonitoringRunDetail {
  return {
    id,
    brandId: 'brand-test',
    optimizationUnitId: 'unit-test',
    intentId: 'intent-test',
    promptId: 'prompt-test',
    platformCode: 'manual_input',
    status: 'completed',
    createdAt: completedAt,
    completedAt,
    promptText: '测试问题',
    response: {
      id: `response-${id}`,
      runId: id,
      brandId: 'brand-test',
      rawText: '真实 AI 回复',
      citations: ['https://example.com/source'],
      respondedAt: completedAt,
      parseStatus: withAnalysis ? 'parsed' : 'pending',
      createdAt: completedAt
    },
    analysis: withAnalysis ? {
      id: `analysis-${id}`,
      responseId: `response-${id}`,
      runId: id,
      brandId: 'brand-test',
      brandMentioned: true,
      brandRank: 2,
      sentiment: 'positive',
      accuracyScore: 90,
      citationScore: 100,
      platformEvaluation: '表现稳定',
      recommendationReason: '推荐理由完整',
      rankingReason: '排名靠前',
      expressionCompleteness: '完整',
      expressionDeviation: '',
      competitorMentions: [],
      reviewRequired: false,
      reviewed: true,
      createdAt: completedAt,
      updatedAt: completedAt
    } : undefined
  };
}

function createAsset(id: string, createdAt: string, url = `https://example.com/${id}`): ContentAsset {
  return { id, brandId: 'brand-test', title: id, type: 'article', platform: 'official_site', url, targetKeywords: [], status: 'published', createdAt, updatedAt: createdAt };
}

function createPublishingRecord(id: string, publishedAt: string, publishedUrl = `https://example.com/${id}`): PublishingRecord {
  return { id, brandId: 'brand-test', contentAssetId: 'asset-evidence', title: id, body: '正文', platform: 'official_site', status: 'published', publishedUrl, publishedAt, createdAt: publishedAt, updatedAt: publishedAt };
}

function createTask(id: string, updatedAt: string, completedAt?: string): OptimizationTask {
  return {
    id,
    brandId: 'brand-test',
    title: `任务 ${id}`,
    type: 'manual',
    status: 'done',
    retestRecords: completedAt ? [{
      id: `retest-${id}`,
      taskId: id,
      sourceRunId: 'run-valid',
      retestRunId: 'run-valid',
      status: 'improved',
      plannedAt: completedAt,
      completedAt,
      actualScore: 90,
      targetScore: 80,
      passed: true,
      beforeMetrics: { mentionRate: 0, brandRank: 4, accuracyScore: 60, citationRate: 0 },
      afterMetrics: { mentionRate: 100, brandRank: 2, accuracyScore: 90, citationRate: 100 },
      metricDelta: { mentionRate: 100, rankImproved: true, accuracyScore: 30, citationRate: 100 },
      createdAt: completedAt,
      updatedAt: completedAt
    }] : [],
    createdAt: updatedAt,
    updatedAt
  };
}
