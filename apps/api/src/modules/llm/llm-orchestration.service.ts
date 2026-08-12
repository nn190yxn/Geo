import { Injectable, Optional } from '@nestjs/common';
import type {
  AsyncJob,
  LLMTaskRequest,
  LLMTaskResponse,
  LLMTaskStatus,
  LLMTaskType
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { AIPlatformAdapterRegistry } from '../platforms/adapters/ai-platform-adapter.registry';
import type { AIPlatformRuntimeConfig } from '../platforms/adapters/ai-platform.adapter';
import { AIPlatformConfigurationError, AIPlatformProviderError } from '../platforms/adapters/openai-compatible.adapter';
import { LLMOutputValidationError, LLMOutputValidator } from './llm-output-validator';
import { LLMPromptTemplateService } from './llm-prompt-template.service';
import { QuotaService } from './quota.service';
import { JobOrchestratorService } from './job-orchestrator.service';
import { ProviderSpendStageService } from './provider-spend-stage.service';

@Injectable()
export class LLMOrchestrationService {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly adapterRegistry: AIPlatformAdapterRegistry,
    private readonly promptTemplateService: LLMPromptTemplateService,
    private readonly outputValidator: LLMOutputValidator,
    @Optional() private readonly quotaService?: QuotaService,
    @Optional() private readonly jobOrchestrator?: JobOrchestratorService,
    @Optional() private readonly providerSpendStages?: ProviderSpendStageService
  ) {}

  async runTask<TInput, TOutput>(
    userId: string,
    brandId: string,
    taskType: LLMTaskType,
    request: LLMTaskRequest<TInput>
  ): Promise<LLMTaskResponse<TOutput>> {
    const inputSummary = summarizeTaskInput(request.input, request.platformCode, request.modelName);
    const taskKey = `llm:${brandId}:${taskType}:${JSON.stringify(inputSummary)}`;
    const quota = this.quotaService ? await this.quotaService.reserve(userId, brandId, taskType, taskKey) : { reservation: undefined };
    if (this.quotaService && !quota.reservation) return failedResponse(quota.rejection?.reason ?? 'quota_rejected', '当前额度不足，请调整额度后重试');
    const reservationId = quota.reservation?.id;

    if (request.mode === 'async') {
      const jobInput = {
        jobType: taskType,
        entityId: `llm_${taskType}_${Date.now()}`,
        status: 'queued' as const,
        idempotencyKey: taskKey,
        stepCode: taskType,
        progress: { [taskType]: 'queued' }
      };
      const job = this.jobOrchestrator ? await this.jobOrchestrator.enqueue(userId, brandId, jobInput) : await Promise.resolve(this.permissionsService.createAsyncJob(userId, brandId, jobInput));

      if (!job) {
        if (reservationId) await this.quotaService?.release(reservationId);
        return failedResponse('llm_brand_access_denied', '当前品牌不可访问或无法创建任务');
      }

      await Promise.resolve(this.permissionsService.createLLMTaskRun(userId, brandId, {
        taskType,
        status: 'queued',
        jobId: job.id,
        inputSummary
      }));

      return {
        jobId: job.id,
        status: 'queued',
        message: 'AI 任务已加入队列'
      };
    }

    const config = await this.selectRuntimeConfig(userId, brandId, request.platformCode);

    if (!config) {
      if (reservationId) await this.quotaService?.release(reservationId);
      await this.recordFailedRun(userId, brandId, taskType, inputSummary, 'llm_platform_missing', '还没有可用于自动生成的 AI 平台，请先配置平台密钥');
      return failedResponse('llm_platform_missing', '还没有可用于自动生成的 AI 平台，请先配置平台密钥');
    }

    if (!config.credentialRef) {
      if (reservationId) await this.quotaService?.release(reservationId);
      await this.recordFailedRun(userId, brandId, taskType, inputSummary, 'llm_credential_missing', '请先填写平台密钥');
      return failedResponse('llm_credential_missing', '请先填写平台密钥');
    }

    const adapter = this.adapterRegistry.requireAdapter(config);

    if (!adapter.runMessages) {
      if (reservationId) await this.quotaService?.release(reservationId);
      await this.recordFailedRun(userId, brandId, taskType, inputSummary, 'llm_adapter_unsupported', '当前平台暂不支持大模型生成任务');
      return failedResponse('llm_adapter_unsupported', '当前平台暂不支持大模型生成任务');
    }
    const spendStage = this.providerSpendStages ? await this.providerSpendStages.acquire(taskKey, taskType, 1) : null;
    if (spendStage && !spendStage.acquired) return failedResponse('llm_step_already_running', '当前任务步骤正在执行，请稍后查看结果');

    const audit = await Promise.resolve(this.permissionsService.createAIPlatformCallAudit(userId, brandId, {
      platformCode: config.platformCode,
      modelName: request.modelName ?? config.modelName,
      callType: taskType,
      status: 'started'
    }));
    const startedAt = Date.now();

    try {
      const result = await adapter.runMessages(
        {
          brandId,
          platformCode: config.platformCode,
          messages: this.promptTemplateService.buildMessages(taskType, request.input),
          responseFormat: 'json',
          temperature: 0.2,
          maxTokens: 1600
        },
        {
          ...config,
          modelName: request.modelName ?? config.modelName
        }
      );
      const providerCost = estimateCost(result.inputTokenCount, result.outputTokenCount);
      if (spendStage?.acquired) await this.providerSpendStages?.recordCost(taskKey, taskType, 1, spendStage.stage.token, config.platformCode, providerCost);
      if (reservationId) await this.quotaService?.settle(reservationId, providerCost, config.platformCode);
      const output = this.outputValidator.validate(taskType, result.rawText) as TOutput;

      if (audit) {
        await Promise.resolve(this.permissionsService.updateAIPlatformCallAudit(userId, brandId, audit.id, {
          status: 'succeeded',
          durationMs: Date.now() - startedAt,
          inputTokenCount: result.inputTokenCount,
          outputTokenCount: result.outputTokenCount,
          completedAt: new Date().toISOString()
        }));
      }

      await Promise.resolve(this.permissionsService.createLLMTaskRun(userId, brandId, {
        taskType,
        status: 'succeeded',
        auditId: audit?.id,
        inputSummary: summarizeTaskInput(request.input, config.platformCode, request.modelName ?? config.modelName),
        outputSummary: summarizeTaskOutput(output)
      }));

      return {
        status: 'succeeded',
        output,
        auditId: audit?.id,
        message: 'AI 任务已完成'
      };
    } catch (error) {
      const normalized = normalizeLLMError(error);

      if (audit) {
        await Promise.resolve(this.permissionsService.updateAIPlatformCallAudit(userId, brandId, audit.id, {
          status: 'failed',
          durationMs: Date.now() - startedAt,
          errorCode: normalized.code,
          errorMessage: normalized.message,
          retryable: normalized.retryable,
          completedAt: new Date().toISOString()
        }));
      }

      if (reservationId) await this.quotaService?.release(reservationId);

      await Promise.resolve(this.permissionsService.createLLMTaskRun(userId, brandId, {
        taskType,
        status: 'failed',
        auditId: audit?.id,
        inputSummary: summarizeTaskInput(request.input, config.platformCode, request.modelName ?? config.modelName),
        errorCode: normalized.code,
        errorMessage: normalized.message
      }));

      return failedResponse(normalized.code, normalized.message);
    }
  }

  async getTask(userId: string, brandId: string, jobId: string): Promise<LLMTaskResponse<null> | null> {
    const job = await Promise.resolve(this.permissionsService.getAsyncJob(userId, brandId, jobId));

    if (!job) {
      return null;
    }

    return {
      jobId: job.id,
      status: toLLMTaskStatus(job),
      output: null,
      message: getJobMessage(job)
    };
  }

  private async selectRuntimeConfig(userId: string, brandId: string, platformCode?: string): Promise<AIPlatformRuntimeConfig | null> {
    if (platformCode) {
      return Promise.resolve(this.permissionsService.getPlatformRuntimeConfig(userId, brandId, platformCode));
    }

    const configs = await Promise.resolve(this.permissionsService.listPlatformConfigs(userId, brandId));
    const candidates = configs?.filter((item) => item.enabled && item.mode === 'api' && item.hasCredential && item.endpointUrl && item.modelName) ?? [];
    const config = candidates.find((item) => item.platformCode === 'stepfun') ?? candidates[0];

    return config ? Promise.resolve(this.permissionsService.getPlatformRuntimeConfig(userId, brandId, config.platformCode)) : null;
  }

  private async recordFailedRun(userId: string, brandId: string, taskType: LLMTaskType, inputSummary: Record<string, unknown>, errorCode: string, errorMessage: string): Promise<void> {
    await Promise.resolve(this.permissionsService.createLLMTaskRun(userId, brandId, {
      taskType,
      status: 'failed',
      inputSummary,
      errorCode,
      errorMessage
    }));
  }
}

function estimateCost(inputTokenCount?: number, outputTokenCount?: number): number {
  return Number((((inputTokenCount ?? 0) + (outputTokenCount ?? 0)) / 1000).toFixed(6));
}

function failedResponse<TOutput>(code: string, message: string): LLMTaskResponse<TOutput> {
  return {
    status: 'failed',
    message: `${message}（${code}）`
  };
}

function normalizeLLMError(error: unknown): { code: string; message: string; retryable: boolean } {
  if (error instanceof AIPlatformConfigurationError || error instanceof AIPlatformProviderError) {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }

  if (error instanceof LLMOutputValidationError) {
    return { code: error.code, message: error.message, retryable: true };
  }

  return { code: 'llm_task_failed', message: 'AI 任务执行失败，请稍后重试', retryable: true };
}

function toLLMTaskStatus(job: AsyncJob): LLMTaskStatus {
  if (job.status === 'retry-exhausted' || job.status === 'cancelled') {
    return 'failed';
  }

  return job.status;
}

function getJobMessage(job: AsyncJob): string {
  if (job.status === 'queued') return 'AI 任务排队中';
  if (job.status === 'running') return 'AI 任务生成中';
  if (job.status === 'succeeded') return 'AI 任务已完成';
  return job.lastErrorMessage ?? 'AI 任务执行失败';
}

function summarizeTaskInput(input: unknown, platformCode?: string, modelName?: string): Record<string, unknown> {
  return {
    platformCode,
    modelName,
    input: summarizeValue(input)
  };
}

function summarizeTaskOutput(output: unknown): Record<string, unknown> {
  return {
    output: summarizeValue(output)
  };
}

function summarizeValue(value: unknown): unknown {
  if (Array.isArray(value)) {
    return { type: 'array', count: value.length };
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value as Record<string, unknown>).slice(0, 20);
    return Object.fromEntries(entries.map(([key, item]) => [key, summarizeValue(item)]));
  }

  if (typeof value === 'string') {
    return { type: 'string', length: value.length };
  }

  return value;
}
