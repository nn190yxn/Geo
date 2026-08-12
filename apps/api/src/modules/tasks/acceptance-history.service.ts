import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import type {
  OptimizationTask,
  RetestRecord,
  SiteAuditAcceptanceResult,
  TaskAcceptanceHistory,
  TaskAcceptanceRecordInput
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { ACCEPTANCE_HISTORY_REPOSITORY, type AcceptanceHistoryRepositoryPort } from './acceptance-history.repository.port';

@Injectable()
export class AcceptanceHistoryService {
  constructor(
    private readonly permissionsService: PermissionsService,
    @Inject(ACCEPTANCE_HISTORY_REPOSITORY) private readonly repository: AcceptanceHistoryRepositoryPort
  ) {}

  async record(
    userId: string,
    brandId: string,
    taskId: string,
    input: TaskAcceptanceRecordInput
  ): Promise<{ task: OptimizationTask; history: TaskAcceptanceHistory } | null> {
    validateInput(input);
    const board = await this.permissionsService.getTaskBoard(userId, brandId);
    const task = board?.tasks.find((item) => item.id === taskId);
    if (!task) return null;

    const previous = await this.repository.list(brandId, taskId);
    await this.repository.create(brandId, taskId, input);
    const evidenceHistory = await this.repository.list(brandId, taskId);
    const wasAccepted = task.status === 'done' || previous.some((snapshot) => snapshot.status === 'passed');
    const nextStatus = input.status === 'passed'
      ? 'done'
      : input.status === 'failed' && wasAccepted ? 'reopened' : undefined;
    const updated = nextStatus
      ? await this.permissionsService.updateOptimizationTask(userId, brandId, taskId, { status: nextStatus })
      : task;
    if (!updated) return null;

    return {
      task: updated,
      history: {
        brandId,
        taskId,
        firstProgress: evidenceHistory[0],
        currentProgress: evidenceHistory[evidenceHistory.length - 1],
        targetValue: evidenceHistory[evidenceHistory.length - 1].targetValue,
        evidenceHistory
      }
    };
  }

  async get(userId: string, brandId: string, taskId: string): Promise<TaskAcceptanceHistory | null> {
    const board = await this.permissionsService.getTaskBoard(userId, brandId);
    if (!board?.tasks.some((task) => task.id === taskId)) return null;
    const evidenceHistory = await this.repository.list(brandId, taskId);
    if (evidenceHistory.length === 0) return null;
    return {
      brandId,
      taskId,
      firstProgress: evidenceHistory[0],
      currentProgress: evidenceHistory[evidenceHistory.length - 1],
      targetValue: evidenceHistory[evidenceHistory.length - 1].targetValue,
      evidenceHistory
    };
  }

  recordRetest(userId: string, brandId: string, task: OptimizationTask, record: RetestRecord) {
    const measured = record.actualScore !== undefined && record.passed !== undefined && Boolean(record.completedAt);
    return this.record(userId, brandId, task.id, {
      checkerId: `retest:${record.id}`,
      status: measured ? record.passed ? 'passed' : 'failed' : 'pending_measurement',
      progressValue: record.actualScore ?? 0,
      targetValue: record.targetScore,
      checkedAt: record.completedAt ?? record.updatedAt,
      evidence: {
        sourceRunId: record.sourceRunId,
        retestRunId: record.retestRunId,
        executionStatus: record.status ?? null,
        evidenceGap: record.evidenceGap ?? null,
        improved: record.improved ?? null
      }
    });
  }

  recordSiteAudit(userId: string, brandId: string, taskId: string, result: SiteAuditAcceptanceResult) {
    return this.record(userId, brandId, taskId, {
      checkerId: result.rule.id,
      status: result.status,
      progressValue: result.status === 'passed' ? 100 : 0,
      targetValue: 100,
      checkedAt: result.checkedAt,
      evidence: { ...result.evidence }
    });
  }
}

function validateInput(input: TaskAcceptanceRecordInput): void {
  if (!input.checkerId.trim()) throw new BadRequestException('验收 checker 标识不能为空');
  if (!Number.isFinite(input.progressValue) || !Number.isFinite(input.targetValue)) {
    throw new BadRequestException('验收进度和目标值必须为有限数值');
  }
  if (input.targetValue < 0 || Number.isNaN(Date.parse(input.checkedAt))) {
    throw new BadRequestException('验收目标值或检查时间无效');
  }
}
