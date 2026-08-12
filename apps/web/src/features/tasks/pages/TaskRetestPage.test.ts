import { describe, expect, it } from 'vitest';
import type { OptimizationTask, RetestRecord, SprintRetestTrendItem } from '@geo-platform/shared-types';
import {
  getFilteredTaskRetestRows,
  getRetestActionStatus,
  getRetestMetricComparison,
  getTaskRetestFilterSearch,
  getTaskRetestMonitoringPath,
  getTaskRetestNextStep,
  getTaskRetestOperationRows,
  prioritizeTaskRetestRows,
  readTaskRetestFilters
} from './TaskRetestPage';

const baseTask: OptimizationTask = {
  id: 'task-1',
  brandId: 'brand-1',
  title: '本地推荐问题再次监测',
  type: 'monitoring_issue',
  status: 'todo',
  ownerId: 'owner-1',
  optimizationUnitId: 'unit-1',
  relatedPromptId: 'prompt-1',
  relatedPlatformCode: 'deepseek',
  sourceRunId: 'run-1',
  priority: 'medium',
  retestRecords: [],
  createdAt: '2026-07-15T00:00:00.000Z',
  updatedAt: '2026-07-15T00:00:00.000Z'
};

const completedRecord: RetestRecord = {
  id: 'retest-1',
  taskId: baseTask.id,
  sourceRunId: 'run-1',
  retestRunId: 'run-2',
  plannedAt: '2026-07-20T00:00:00.000Z',
  completedAt: '2026-07-21T00:00:00.000Z',
  targetScore: 80,
  actualScore: 86,
  passed: true,
  improved: true,
  beforeMetrics: { mentionRate: 0.4, brandRank: 5, accuracyScore: 0.6, citationRate: 0.3 },
  afterMetrics: { mentionRate: 0.7, brandRank: 2, accuracyScore: 0.8, citationRate: 0.65 },
  createdAt: '2026-07-20T00:00:00.000Z',
  updatedAt: '2026-07-21T00:00:00.000Z'
};

describe('TaskRetestPage helpers', () => {
  it('maps task and retest outcomes into four action statuses', () => {
    expect(getRetestActionStatus(baseTask)).toBe('pending_action');
    expect(getRetestActionStatus({ ...baseTask, status: 'retest' })).toBe('pending_retest');
    expect(getRetestActionStatus({ ...baseTask, status: 'done' }, completedRecord)).toBe('improved');
    expect(getRetestActionStatus({ ...baseTask, status: 'reopened' }, { ...completedRecord, passed: false, improved: false })).toBe('follow_up');
  });

  it('uses the latest task retest record when trend data is unavailable', () => {
    const olderRecord = { ...completedRecord, id: 'retest-old', updatedAt: '2026-07-20T00:00:00.000Z' };
    const rows = getTaskRetestOperationRows([{ ...baseTask, status: 'done', retestRecords: [olderRecord, completedRecord] }]);

    expect(rows[0].latestRetestRecord?.id).toBe('retest-1');
    expect(rows[0].actionStatus).toBe('improved');
    expect(rows[0].nextStep).toBe('确认改善结果并关闭任务');
  });

  it('combines publishing source and trend metrics into an operation row', () => {
    const trendItem = {
      task: baseTask,
      publishingRecord: { id: 'publishing-1', title: '本地推荐指南', accountName: '品牌官网', publishedUrl: 'https://example.com/guide' },
      latestRetestRecord: completedRecord,
      status: 'improved',
      beforeMetrics: completedRecord.beforeMetrics,
      afterMetrics: completedRecord.afterMetrics,
      message: '推荐表现已改善'
    } as SprintRetestTrendItem;
    const row = getTaskRetestOperationRows([baseTask], [trendItem])[0];

    expect(row.publishingRecord?.title).toBe('本地推荐指南');
    expect(row.actionStatus).toBe('improved');
    expect(getRetestMetricComparison(row)).toEqual([
      '提及率 40% → 70%',
      '品牌排名 5 → 2',
      '表达准确率 60% → 80%',
      '引用率 30% → 65%'
    ]);
  });

  it('filters action rows by business status and publishing context', () => {
    const rows = getTaskRetestOperationRows([
      baseTask,
      { ...baseTask, id: 'task-2', title: '评价表达修正', status: 'reopened', processingNote: '继续补充权威引用' }
    ]);
    const filtered = getFilteredTaskRetestRows(rows, { search: '权威引用', platform: 'all', status: 'follow_up' });

    expect(filtered.map((row) => row.task.id)).toEqual(['task-2']);
  });

  it('moves the workflow task to the first visible row', () => {
    const rows = getTaskRetestOperationRows([
      baseTask,
      { ...baseTask, id: 'task-2', title: '评价表达修正' }
    ]);

    expect(prioritizeTaskRetestRows(rows, 'task-2').map((row) => row.task.id)).toEqual(['task-2', 'task-1']);
    expect(prioritizeTaskRetestRows(rows)).toBe(rows);
  });

  it('serializes action filters while preserving workflow context', () => {
    const search = getTaskRetestFilterSearch('?publishingRecordId=publishing-1&runId=run-1', {
      search: '本地推荐',
      platform: 'all',
      status: 'pending_retest'
    });
    const params = new URLSearchParams(search);

    expect(params.get('publishingRecordId')).toBe('publishing-1');
    expect(params.get('runId')).toBe('run-1');
    expect(readTaskRetestFilters(search)).toMatchObject({ search: '本地推荐', status: 'pending_retest' });
  });

  it('preserves complete workflow context when returning to same-question monitoring', () => {
    const path = getTaskRetestMonitoringPath(baseTask, {
      intentId: 'intent-1',
      planId: 'plan-1',
      generationTaskId: 'generation-1',
      versionId: 'version-1',
      publishingRecordId: 'publishing-1'
    });
    const [url, hash] = path.split('#');
    const params = new URLSearchParams(url.split('?')[1]);

    expect(url.startsWith('/monitoring?')).toBe(true);
    expect(hash).toBe('monitoring-runs-card');
    expect(params.get('taskId')).toBe('task-1');
    expect(params.get('optimizationUnitId')).toBe('unit-1');
    expect(params.get('intentId')).toBe('intent-1');
    expect(params.get('promptId')).toBe('prompt-1');
    expect(params.get('runId')).toBe('run-1');
    expect(params.get('planId')).toBe('plan-1');
    expect(params.get('generationTaskId')).toBe('generation-1');
    expect(params.get('versionId')).toBe('version-1');
    expect(params.get('publishingRecordId')).toBe('publishing-1');
    expect(params.get('mode')).toBe('retest');
  });

  it('provides an explicit next step for missing prompt context', () => {
    expect(getTaskRetestNextStep({ ...baseTask, status: 'retest', relatedPromptId: undefined }, 'pending_retest')).toBe('补充原监测问题后执行再次监测');
  });
});
