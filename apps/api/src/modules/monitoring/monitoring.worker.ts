import { Injectable } from '@nestjs/common';
import type { AIPlatformCallAudit, AsyncJob, MonitoringRunDetail } from '@geo-platform/shared-types';
import type { AIPlatformRuntimeConfig } from '../platforms/adapters/ai-platform.adapter';
import { AIPlatformAdapterSelectionError, AIPlatformAdapterRegistry } from '../platforms/adapters/ai-platform-adapter.registry';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class MonitoringWorker {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly adapterRegistry: AIPlatformAdapterRegistry
  ) {}

  async processJob(userId: string, brandId: string, jobId: string): Promise<MonitoringRunDetail | null> {
    const job = await this.findJob(userId, brandId, jobId);
    if (!job || job.jobType !== 'monitoring') {
      return null;
    }

    const run = await this.permissionsService.getMonitoringRun(userId, brandId, job.entityId);
    if (!run) {
      return null;
    }

    const attemptCount = job.attemptCount + 1;
    await this.permissionsService.updateAsyncJob(userId, brandId, job.id, { status: 'running', attemptCount });

    const platform = await this.findPlatformConfig(userId, brandId, run.platformCode);
    if (!platform) {
      return this.failJob(userId, brandId, job, run.id, 'platform_config_missing', '平台配置不存在或已禁用', attemptCount, false);
    }

    if (platform.mode === 'manual' || platform.mode === 'semi_auto') {
      await this.permissionsService.updateAsyncJob(userId, brandId, job.id, { status: 'succeeded', attemptCount });
      return this.permissionsService.updateMonitoringRunExecution(userId, brandId, run.id, {
        status: 'review_required',
        errorMessage: '等待人工录入原始回答',
        retryStatus: 'not_retried'
      });
    }

    const startedAt = new Date().toISOString();
    const audit = await this.permissionsService.createAIPlatformCallAudit(userId, brandId, {
      platformCode: platform.platformCode,
      modelName: platform.modelName,
      callType: 'monitoring',
      status: 'started',
      startedAt
    });

    try {
      const adapter = this.adapterRegistry.requireAdapter(platform);
      const startedMs = Date.now();
      const result = await adapter.runPrompt({
        brandId,
        platformCode: platform.platformCode,
        promptText: run.promptText
      }, platform);
      const completedAt = new Date().toISOString();

      const updatedRun = await this.permissionsService.addManualResponse(userId, brandId, run.id, {
        rawText: result.rawText,
        citations: [],
        modelName: result.modelName
      });
      await this.permissionsService.updateAsyncJob(userId, brandId, job.id, { status: 'succeeded', attemptCount });
      await this.updateAuditSuccess(userId, brandId, audit, result.modelName, Date.now() - startedMs, completedAt);

      return updatedRun;
    } catch (error) {
      const normalized = normalizeWorkerError(error);
      await this.updateAuditFailure(userId, brandId, audit, normalized.code, normalized.message, normalized.retryable);
      return this.failJob(userId, brandId, job, run.id, normalized.code, normalized.message, attemptCount, normalized.retryable);
    }
  }

  private async findJob(userId: string, brandId: string, jobId: string): Promise<AsyncJob | null> {
    const jobs = await this.permissionsService.listAsyncJobs(userId, brandId);
    return jobs?.find((job) => job.id === jobId) ?? null;
  }

  private async findPlatformConfig(userId: string, brandId: string, platformCode: string): Promise<AIPlatformRuntimeConfig | null> {
    return this.permissionsService.getPlatformRuntimeConfig(userId, brandId, platformCode);
  }

  private async updateAuditSuccess(
    userId: string,
    brandId: string,
    audit: AIPlatformCallAudit | null,
    modelName: string | undefined,
    durationMs: number,
    completedAt: string
  ): Promise<void> {
    if (!audit) {
      return;
    }

    await this.permissionsService.updateAIPlatformCallAudit(userId, brandId, audit.id, {
      status: 'succeeded',
      modelName,
      durationMs,
      completedAt
    });
  }

  private async updateAuditFailure(userId: string, brandId: string, audit: AIPlatformCallAudit | null, errorCode: string, errorMessage: string, retryable: boolean): Promise<void> {
    if (!audit) {
      return;
    }

    await this.permissionsService.updateAIPlatformCallAudit(userId, brandId, audit.id, {
      status: 'failed',
      errorCode,
      errorMessage,
      retryable,
      completedAt: new Date().toISOString()
    });
  }

  private async failJob(
    userId: string,
    brandId: string,
    job: AsyncJob,
    runId: string,
    errorCode: string,
    errorMessage: string,
    attemptCount: number,
    retryable: boolean
  ): Promise<MonitoringRunDetail | null> {
    const exhausted = !retryable || attemptCount >= job.maxAttempts;
    const userFacingMessage = exhausted ? `${errorMessage}；已达到最大重试次数，可人工录入原始回答。` : errorMessage;

    await this.permissionsService.updateAsyncJob(userId, brandId, job.id, {
      status: exhausted ? 'retry-exhausted' : 'failed',
      attemptCount,
      lastErrorCode: errorCode,
      lastErrorMessage: userFacingMessage
    });

    return this.permissionsService.updateMonitoringRunExecution(userId, brandId, runId, {
      status: 'failed',
      completedAt: new Date().toISOString(),
      errorMessage: userFacingMessage,
      retryStatus: exhausted ? 'retried' : 'retry_pending'
    });
  }
}

function normalizeWorkerError(error: unknown): { code: string; message: string; retryable: boolean } {
  if (error instanceof AIPlatformAdapterSelectionError) {
    return { code: error.code, message: error.message, retryable: false };
  }

  if (error instanceof Error && 'code' in error && 'retryable' in error && typeof error.code === 'string' && typeof error.retryable === 'boolean') {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }

  if (error instanceof Error) {
    return { code: 'adapter_execution_failed', message: error.message, retryable: true };
  }

  return { code: 'adapter_execution_failed', message: 'AI 平台调用失败', retryable: true };
}
