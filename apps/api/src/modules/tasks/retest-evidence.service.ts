import { Injectable } from '@nestjs/common';
import type { BrandId, OptimizationTask } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class RetestEvidenceService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async execute(userId: string, brandId: BrandId, taskId: string, recordId: string): Promise<OptimizationTask | null> {
    const board = await this.permissionsService.getTaskBoard(userId, brandId);
    const task = board?.tasks.find((item) => item.id === taskId);
    const record = task?.retestRecords.find((item) => item.id === recordId);
    if (!task || !record || record.retestRunId) return null;

    const sourceRun = await this.permissionsService.getMonitoringRun(userId, brandId, record.sourceRunId);
    if (!sourceRun) return null;
    const run = await this.permissionsService.createMonitoringRun(userId, brandId, {
      promptId: task.relatedPromptId ?? sourceRun.promptId,
      platformCode: task.relatedPlatformCode ?? sourceRun.platformCode
    });
    if (!run || run.id === record.sourceRunId) return null;

    return this.permissionsService.bindOptimizationTaskRetestRun(userId, brandId, taskId, recordId, run.id);
  }
}
