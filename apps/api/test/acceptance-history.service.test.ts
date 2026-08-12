import { describe, expect, it, vi } from 'vitest';
import type { OptimizationTask, RetestRecord, TaskAcceptanceRecordInput } from '@geo-platform/shared-types';
import { AcceptanceHistoryRepository } from '../src/modules/tasks/acceptance-history.repository';
import { AcceptanceHistoryService } from '../src/modules/tasks/acceptance-history.service';

describe('AcceptanceHistoryService', () => {
  it('freezes first and current progress while preserving every checker evidence', async () => {
    const { service } = harness();
    const first = await service.record('user-1', 'brand-1', 'task-1', input('passed', 90, '2026-08-03T01:00:00.000Z'));
    const second = await service.record('user-1', 'brand-1', 'task-1', input('passed', 95, '2026-08-03T02:00:00.000Z'));

    expect(first?.history.firstProgress.progressValue).toBe(90);
    expect(second?.history.firstProgress.progressValue).toBe(90);
    expect(second?.history.currentProgress.progressValue).toBe(95);
    expect(second?.history.targetValue).toBe(100);
    expect(second?.history.evidenceHistory).toHaveLength(2);
    expect(second?.history.evidenceHistory.map((snapshot) => snapshot.evidence)).toEqual([
      { targetUrl: 'https://example.com/' },
      { targetUrl: 'https://example.com/' }
    ]);
  });

  it('reopens an accepted task when a later checker fails and keeps the passed record', async () => {
    const { service, task, updateOptimizationTask } = harness();
    await service.record('user-1', 'brand-1', task.id, input('passed', 100, '2026-08-03T01:00:00.000Z'));
    const regressed = await service.record('user-1', 'brand-1', task.id, input('failed', 20, '2026-08-04T01:00:00.000Z'));

    expect(regressed?.task.status).toBe('reopened');
    expect(regressed?.history.evidenceHistory.map(({ status }) => status)).toEqual(['passed', 'failed']);
    expect(updateOptimizationTask).toHaveBeenLastCalledWith('user-1', 'brand-1', task.id, { status: 'reopened' });
  });

  it('keeps an unavailable checker as evidence without closing the task', async () => {
    const { service, task, updateOptimizationTask } = harness();
    const result = await service.record('user-1', 'brand-1', task.id, input('unavailable', 0, '2026-08-03T01:00:00.000Z'));

    expect(result?.task.status).toBe('retest');
    expect(result?.history.currentProgress.status).toBe('unavailable');
    expect(updateOptimizationTask).not.toHaveBeenCalled();
  });

  it('records an unmeasured retest as pending measurement', async () => {
    const { service, task, updateOptimizationTask } = harness();
    const record: RetestRecord = {
      id: 'retest-1', taskId: task.id, sourceRunId: 'run-1', retestRunId: 'run-2', status: 'collecting',
      plannedAt: '2026-08-03T01:00:00.000Z', targetScore: 80,
      createdAt: '2026-08-03T01:00:00.000Z', updatedAt: '2026-08-03T02:00:00.000Z'
    };
    const result = await service.recordRetest('user-1', 'brand-1', task, record);

    expect(result?.history.currentProgress.status).toBe('pending_measurement');
    expect(result?.history.currentProgress.checkedAt).toBe(record.updatedAt);
    expect(updateOptimizationTask).not.toHaveBeenCalled();
  });

  it('rejects invalid quantitative values before writing evidence', async () => {
    const { service } = harness();
    await expect(service.record('user-1', 'brand-1', 'task-1', {
      ...input('passed', Number.NaN, '2026-08-03T01:00:00.000Z')
    })).rejects.toMatchObject({ status: 400 });
  });
});

function harness() {
  const task: OptimizationTask = {
    id: 'task-1', brandId: 'brand-1', title: '修复站点问题', type: 'manual', status: 'retest',
    retestRecords: [], createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z'
  };
  const updateOptimizationTask = vi.fn((_userId, _brandId, _taskId, update) => {
    task.status = update.status;
    return task;
  });
  const permissionsService = {
    getTaskBoard: vi.fn(() => ({ brandId: 'brand-1', tasks: [task], statusCounts: {} })),
    updateOptimizationTask
  };
  const service = new AcceptanceHistoryService(permissionsService as never, new AcceptanceHistoryRepository());
  return { service, task, updateOptimizationTask };
}

function input(status: TaskAcceptanceRecordInput['status'], progressValue: number, checkedAt: string): TaskAcceptanceRecordInput {
  return {
    checkerId: 'site-checker', status, progressValue, targetValue: 100, checkedAt,
    evidence: { targetUrl: 'https://example.com/' }
  };
}
