import type { AsyncJob, MonitoringRunDetail, PlatformConfig, RunPromptInput, RunPromptResult } from '@geo-platform/shared-types';
import { describe, expect, it, vi } from 'vitest';
import type { AIPlatformAdapter } from '../src/modules/platforms/adapters/ai-platform.adapter';
import { AIPlatformAdapterRegistry } from '../src/modules/platforms/adapters/ai-platform-adapter.registry';
import { MonitoringWorker } from '../src/modules/monitoring/monitoring.worker';

describe('MonitoringWorker', () => {
  it('covers monitoring job state transitions across success, retryable failure and retry exhaustion', async () => {
    const successJob = createJob({ id: 'job_success' });
    const successService = createPermissionsServiceMock({ job: successJob, run: createRun(), platform: createPlatformConfig({ platformCode: 'mock_ai', mode: 'mock' }) });
    const successWorker = new MonitoringWorker(successService as never, new AIPlatformAdapterRegistry([createAdapter('mock_ai')]));

    await successWorker.processJob('user_demo', 'brand_demo', successJob.id);

    const failedJob = createJob({ id: 'job_failed', attemptCount: 1, maxAttempts: 3 });
    const failedRun = createRun({ platformCode: 'unstable_api' });
    const failedService = createPermissionsServiceMock({ job: failedJob, run: failedRun, platform: createPlatformConfig({ platformCode: 'unstable_api', mode: 'api' }) });
    const failedWorker = new MonitoringWorker(failedService as never, new AIPlatformAdapterRegistry([createAdapter('unstable_api', new Error('Provider timeout'))]));

    await failedWorker.processJob('user_demo', 'brand_demo', failedJob.id);

    const exhaustedJob = createJob({ id: 'job_exhausted', attemptCount: 2, maxAttempts: 3 });
    const exhaustedRun = createRun({ platformCode: 'unstable_api' });
    const exhaustedService = createPermissionsServiceMock({ job: exhaustedJob, run: exhaustedRun, platform: createPlatformConfig({ platformCode: 'unstable_api', mode: 'api' }) });
    const exhaustedWorker = new MonitoringWorker(exhaustedService as never, new AIPlatformAdapterRegistry([createAdapter('unstable_api', new Error('Provider timeout'))]));

    await exhaustedWorker.processJob('user_demo', 'brand_demo', exhaustedJob.id);

    expect(successJob.status).toBe('queued');
    expect(getAsyncJobStatuses(successService)).toEqual(['running', 'succeeded']);
    expect(getAsyncJobStatuses(failedService)).toEqual(['running', 'failed']);
    expect(failedService.updateAIPlatformCallAudit).toHaveBeenCalledWith('user_demo', 'brand_demo', 'audit_1', expect.objectContaining({ retryable: true }));
    expect(getAsyncJobStatuses(exhaustedService)).toEqual(['running', 'retry-exhausted']);
  });

  it('runs an adapter, stores AI response and records a successful audit', async () => {
    const job = createJob();
    const run = createRun();
    const service = createPermissionsServiceMock({ job, run, platform: createPlatformConfig({ platformCode: 'mock_ai', mode: 'mock' }) });
    const worker = new MonitoringWorker(service as never, new AIPlatformAdapterRegistry([createAdapter('mock_ai')]));

    await expect(worker.processJob('user_demo', 'brand_demo', job.id)).resolves.toEqual(expect.objectContaining({ id: run.id, status: 'completed' }));

    expect(service.updateAsyncJob).toHaveBeenCalledWith('user_demo', 'brand_demo', job.id, expect.objectContaining({ status: 'running', attemptCount: 1 }));
    expect(service.addManualResponse).toHaveBeenCalledWith('user_demo', 'brand_demo', run.id, expect.objectContaining({ rawText: 'adapter response', modelName: 'adapter-model', clientSurface: 'api' }));
    expect(service.updateAIPlatformCallAudit).toHaveBeenCalledWith('user_demo', 'brand_demo', 'audit_1', expect.objectContaining({ status: 'succeeded', modelName: 'adapter-model' }));
    expect(service.updateAsyncJob).toHaveBeenCalledWith('user_demo', 'brand_demo', job.id, expect.objectContaining({ status: 'succeeded', attemptCount: 1 }));
  });

  it('marks configuration failures retry-exhausted with manual fallback details', async () => {
    const job = createJob();
    const run = createRun({ platformCode: 'missing_api' });
    const service = createPermissionsServiceMock({ job, run, platform: createPlatformConfig({ platformCode: 'missing_api', mode: 'api' }) });
    const worker = new MonitoringWorker(service as never, new AIPlatformAdapterRegistry([]));

    await expect(worker.processJob('user_demo', 'brand_demo', job.id)).resolves.toEqual(expect.objectContaining({ id: run.id, status: 'failed' }));

    expect(service.updateAIPlatformCallAudit).toHaveBeenCalledWith('user_demo', 'brand_demo', 'audit_1', expect.objectContaining({ status: 'failed', errorCode: 'adapter_not_registered', retryable: false }));
    expect(service.updateAsyncJob).toHaveBeenCalledWith('user_demo', 'brand_demo', job.id, expect.objectContaining({ status: 'retry-exhausted', lastErrorCode: 'adapter_not_registered' }));
    expect(service.updateMonitoringRunExecution).toHaveBeenCalledWith('user_demo', 'brand_demo', run.id, expect.objectContaining({ status: 'failed', retryStatus: 'retried' }));
  });

  it('keeps retryable provider failures retry-pending before attempts are exhausted', async () => {
    const job = createJob({ attemptCount: 1, maxAttempts: 3 });
    const run = createRun({ platformCode: 'unstable_api' });
    const service = createPermissionsServiceMock({ job, run, platform: createPlatformConfig({ platformCode: 'unstable_api', mode: 'api' }) });
    const worker = new MonitoringWorker(service as never, new AIPlatformAdapterRegistry([createAdapter('unstable_api', new Error('Provider timeout'))]));

    await worker.processJob('user_demo', 'brand_demo', job.id);

    expect(service.updateAIPlatformCallAudit).toHaveBeenCalledWith('user_demo', 'brand_demo', 'audit_1', expect.objectContaining({ status: 'failed', errorCode: 'adapter_execution_failed', retryable: true }));
    expect(service.updateAsyncJob).toHaveBeenCalledWith('user_demo', 'brand_demo', job.id, expect.objectContaining({ status: 'failed', attemptCount: 2, lastErrorCode: 'adapter_execution_failed' }));
    expect(service.updateMonitoringRunExecution).toHaveBeenCalledWith('user_demo', 'brand_demo', run.id, expect.objectContaining({ status: 'failed', retryStatus: 'retry_pending', errorMessage: 'Provider timeout' }));
  });

  it('marks retryable provider failures retry-exhausted on the final attempt', async () => {
    const job = createJob({ attemptCount: 2, maxAttempts: 3 });
    const run = createRun({ platformCode: 'unstable_api' });
    const service = createPermissionsServiceMock({ job, run, platform: createPlatformConfig({ platformCode: 'unstable_api', mode: 'api' }) });
    const worker = new MonitoringWorker(service as never, new AIPlatformAdapterRegistry([createAdapter('unstable_api', new Error('Provider timeout'))]));

    await worker.processJob('user_demo', 'brand_demo', job.id);

    expect(service.updateAsyncJob).toHaveBeenCalledWith('user_demo', 'brand_demo', job.id, expect.objectContaining({ status: 'retry-exhausted', attemptCount: 3 }));
    expect(service.updateMonitoringRunExecution).toHaveBeenCalledWith(
      'user_demo',
      'brand_demo',
      run.id,
      expect.objectContaining({ status: 'failed', retryStatus: 'retried', errorMessage: expect.stringContaining('可人工录入原始回答') })
    );
  });
});

function createPermissionsServiceMock(input: { job: AsyncJob; run: MonitoringRunDetail; platform: PlatformConfig }) {
  return {
    listAsyncJobs: vi.fn().mockResolvedValue([input.job]),
    getMonitoringRun: vi.fn().mockResolvedValue(input.run),
    updateAsyncJob: vi.fn().mockResolvedValue(input.job),
    listPlatformConfigs: vi.fn().mockResolvedValue([input.platform]),
    getPlatformRuntimeConfig: vi.fn().mockResolvedValue(input.platform),
    createAIPlatformCallAudit: vi.fn().mockResolvedValue({ id: 'audit_1' }),
    updateAIPlatformCallAudit: vi.fn().mockResolvedValue({ id: 'audit_1' }),
    addManualResponse: vi.fn().mockResolvedValue({ ...input.run, status: 'completed', response: { runId: input.run.id, brandId: input.run.brandId, rawText: 'adapter response' } }),
    updateMonitoringRunExecution: vi.fn().mockResolvedValue({ ...input.run, status: 'failed' })
  };
}

function getAsyncJobStatuses(service: ReturnType<typeof createPermissionsServiceMock>): string[] {
  return service.updateAsyncJob.mock.calls.map((call) => call[3]?.status).filter(Boolean);
}

function createAdapter(platformCode: string, error?: Error): AIPlatformAdapter {
  return {
    platformCode,
    async runPrompt(_input: RunPromptInput): Promise<RunPromptResult> {
      if (error) {
        throw error;
      }

      return {
        rawText: 'adapter response',
        modelName: 'adapter-model',
        respondedAt: '2026-07-03T00:00:00.000Z'
      };
    },
    async validateConfig(config: PlatformConfig) {
      return {
        ok: true,
        mode: config.mode,
        checkedAt: '2026-07-03T00:00:00.000Z',
        message: 'ok'
      };
    }
  };
}

function createJob(input: Partial<AsyncJob> = {}): AsyncJob {
  return {
    id: 'job_1',
    brandId: 'brand_demo',
    jobType: 'monitoring',
    status: 'queued',
    entityId: 'run_1',
    attemptCount: 0,
    maxAttempts: 3,
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
    ...input
  };
}

function createRun(input: Partial<MonitoringRunDetail> = {}): MonitoringRunDetail {
  return {
    id: 'run_1',
    brandId: 'brand_demo',
    optimizationUnitId: 'unit_1',
    intentId: 'intent_1',
    promptId: 'prompt_1',
    platformCode: 'mock_ai',
    status: 'pending',
    retryStatus: 'not_retried',
    promptText: 'Prompt text',
    createdAt: '2026-07-03T00:00:00.000Z',
    ...input
  };
}

function createPlatformConfig(input: Pick<PlatformConfig, 'platformCode' | 'mode'>): PlatformConfig {
  return {
    id: `platform_${input.platformCode}`,
    brandId: 'brand_demo',
    platformCode: input.platformCode,
    name: input.platformCode,
    mode: input.mode,
    availableMethods: input.mode === 'api' || input.mode === 'mock' ? ['api'] : ['manual'],
    connectionStatus: input.mode === 'api' || input.mode === 'mock' ? 'ready' : 'manual_available',
    connectionStatusLabel: input.mode === 'api' || input.mode === 'mock' ? '可自动监测' : '可手动录入',
    nextAction: input.mode === 'api' || input.mode === 'mock' ? '可直接加入自动监测计划。' : '复制问题到平台后录入回答。',
    modelName: 'adapter-model',
    rateLimitPerMinute: 60,
    enabled: true,
    hasCredential: input.mode === 'api',
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z'
  };
}
