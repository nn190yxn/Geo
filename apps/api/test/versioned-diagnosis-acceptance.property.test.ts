import { describe, expect, it, vi } from 'vitest';
import type {
  DiagnosticScoreDimension,
  OptimizationTask,
  SiteAuditCheck,
  SiteAuditCheckStatus,
  SiteAuditResult,
  TaskAcceptanceRecordInput
} from '@geo-platform/shared-types';
import {
  defaultDiagnosticScorePolicy,
  DiagnosticScorePolicyError,
  DiagnosticScorePolicyService
} from '../src/modules/site-audit/diagnostic-score-policy.service';
import { DiagnosticScoreRepository } from '../src/modules/site-audit/diagnostic-score.repository';
import { AcceptanceHistoryRepository } from '../src/modules/tasks/acceptance-history.repository';
import { AcceptanceHistoryService } from '../src/modules/tasks/acceptance-history.service';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

describe(`Property P18: historical diagnoses reproduce with their frozen policy ${validatesCriteria(['32.2'])}`, () => {
  it('preserves every historical result across status combinations and later rule upgrades', async () => {
    const statuses: SiteAuditCheckStatus[] = ['pass', 'warning', 'fail', 'unavailable'];
    const upgradedWarningScores = [0, 10, 25, 75, 100];

    for (const schemaStatus of statuses) {
      for (const metaStatus of statuses) {
        for (const contentStatus of statuses) {
          const repository = new DiagnosticScoreRepository();
          const originalService = new DiagnosticScorePolicyService(repository);
          const original = await originalService.scoreAndSave('brand-1', audit([
            check('structured_data', schemaStatus),
            check('robots_txt', metaStatus),
            check('llms_txt', contentStatus)
          ]));

          for (const warningScore of upgradedWarningScores) {
            const upgraded = structuredClone(defaultDiagnosticScorePolicy);
            upgraded.version = `site-diagnostic-v2-warning-${warningScore}`;
            upgraded.statusScores.warning = warningScore;
            upgraded.dimensions.schema.configuredWeight = 0.6;
            upgraded.dimensions.meta.configuredWeight = 0.2;
            upgraded.dimensions.content.configuredWeight = 0.1;
            upgraded.dimensions.citation.configuredWeight = 0.1;
            const reproduced = await new DiagnosticScorePolicyService(repository, upgraded)
              .reproduce('brand-1', original.id);

            expect(reproduced, `P18 failed for ${schemaStatus}/${metaStatus}/${contentStatus} under ${upgraded.version}`)
              .toEqual(original);
          }
        }
      }
    }
  });

  it('rejects every non-finite, negative, all-zero, or duplicated policy assignment', () => {
    const invalidWeights = [-1, Number.NaN, Number.POSITIVE_INFINITY];
    const dimensions: DiagnosticScoreDimension[] = ['schema', 'meta', 'content', 'citation'];

    for (const dimension of dimensions) {
      for (const invalidWeight of invalidWeights) {
        const policy = structuredClone(defaultDiagnosticScorePolicy);
        policy.dimensions[dimension].configuredWeight = invalidWeight;
        expect(() => new DiagnosticScorePolicyService(new DiagnosticScoreRepository(), policy))
          .toThrowError(DiagnosticScorePolicyError);
      }
    }

    const zeroWeightPolicy = structuredClone(defaultDiagnosticScorePolicy);
    for (const dimension of dimensions) zeroWeightPolicy.dimensions[dimension].configuredWeight = 0;
    expect(() => new DiagnosticScorePolicyService(new DiagnosticScoreRepository(), zeroWeightPolicy))
      .toThrowError(DiagnosticScorePolicyError);

    const duplicatedCheckPolicy = structuredClone(defaultDiagnosticScorePolicy);
    duplicatedCheckPolicy.dimensions.citation.checkKeys = ['structured_data'];
    expect(() => new DiagnosticScorePolicyService(new DiagnosticScoreRepository(), duplicatedCheckPolicy))
      .toThrowError(DiagnosticScorePolicyError);
  });
});

describe(`Property P19: checker regression reopens accepted tasks ${validatesCriteria(['32.3', '32.4', '32.5'])}`, () => {
  it('reopens every accepted task after a failed checker while retaining all prior evidence', async () => {
    const progressCases = [[80, 0], [85, 20], [90, 40], [95, 60], [100, 79]] as const;

    for (const [passedProgress, failedProgress] of progressCases) {
      const { service, task } = acceptanceHarness();
      await service.record('user-1', 'brand-1', task.id, acceptanceInput(
        'passed', passedProgress, '2026-08-03T01:00:00.000Z'
      ));
      await service.record('user-1', 'brand-1', task.id, acceptanceInput(
        'unavailable', 0, '2026-08-03T02:00:00.000Z'
      ));
      const regressed = await service.record('user-1', 'brand-1', task.id, acceptanceInput(
        'failed', failedProgress, '2026-08-03T03:00:00.000Z'
      ));

      expect(regressed?.task.status, `P19 failed for ${passedProgress} -> ${failedProgress}`).toBe('reopened');
      expect(regressed?.history.firstProgress.progressValue).toBe(passedProgress);
      expect(regressed?.history.currentProgress.progressValue).toBe(failedProgress);
      expect(regressed?.history.evidenceHistory.map(({ status }) => status)).toEqual([
        'passed', 'unavailable', 'failed'
      ]);
    }
  });

  it('appends repeated checker runs and leaves unavailable results undecided', async () => {
    const { service, task, updateOptimizationTask } = acceptanceHarness();
    const repeated = acceptanceInput('unavailable', 0, '2026-08-03T01:00:00.000Z');
    await service.record('user-1', 'brand-1', task.id, repeated);
    const result = await service.record('user-1', 'brand-1', task.id, repeated);

    expect(result?.history.evidenceHistory).toHaveLength(2);
    expect(result?.history.firstProgress.status).toBe('unavailable');
    expect(result?.history.currentProgress.status).toBe('unavailable');
    expect(result?.task.status).toBe('retest');
    expect(updateOptimizationTask).not.toHaveBeenCalled();
  });
});

function audit(checks: SiteAuditCheck[]): SiteAuditResult {
  return { websiteUrl: 'https://example.com/', auditedAt: '2026-08-03T00:00:00.000Z', checks };
}

function check(key: SiteAuditCheck['key'], status: SiteAuditCheckStatus): SiteAuditCheck {
  return {
    key,
    status,
    summary: `${key}: ${status}`,
    evidence: { targetUrl: `https://example.com/${key}`, checkedAt: '2026-08-03T00:00:00.000Z' }
  };
}

function acceptanceHarness() {
  const task: OptimizationTask = {
    id: 'task-1', brandId: 'brand-1', title: '量化验收任务', type: 'manual', status: 'retest',
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
  return {
    service: new AcceptanceHistoryService(permissionsService as never, new AcceptanceHistoryRepository()),
    task,
    updateOptimizationTask
  };
}

function acceptanceInput(
  status: TaskAcceptanceRecordInput['status'],
  progressValue: number,
  checkedAt: string
): TaskAcceptanceRecordInput {
  return {
    checkerId: 'checker-1',
    status,
    progressValue,
    targetValue: 80,
    checkedAt,
    evidence: { source: 'property-test', progressValue }
  };
}
