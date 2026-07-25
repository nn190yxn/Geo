import type { PlatformConfig } from '@geo-platform/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { LLMController } from '../src/modules/llm/llm.controller';
import { LLMOrchestrationService } from '../src/modules/llm/llm-orchestration.service';
import { LLMOutputValidator } from '../src/modules/llm/llm-output-validator';
import { LLMPromptTemplateService } from '../src/modules/llm/llm-prompt-template.service';
import type { AIPlatformAdapter, RunLLMInput, RunLLMResult } from '../src/modules/platforms/adapters/ai-platform.adapter';
import { AIPlatformAdapterRegistry } from '../src/modules/platforms/adapters/ai-platform-adapter.registry';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('LLMOrchestrationService', () => {
  it('returns a clear failure when no API platform is configured', async () => {
    const service = createService();

    await expect(service.runTask('user_demo', 'brand_demo', 'question_generation', { input: { topic: '儿童运动' } })).resolves.toEqual(
      expect.objectContaining({
        status: 'failed',
        message: expect.stringContaining('llm_platform_missing')
      })
    );
  });

  it('queues async LLM tasks and exposes job status', async () => {
    const repository = new PermissionsRepository();
    const service = createService(repository);
    const queued = await service.runTask('user_demo', 'brand_demo', 'question_generation', { mode: 'async', input: { topic: '儿童运动' } });

    expect(queued).toEqual(expect.objectContaining({ status: 'queued', jobId: expect.any(String) }));
    await expect(service.getTask('user_demo', 'brand_demo', queued.jobId ?? '')).resolves.toEqual(
      expect.objectContaining({
        jobId: queued.jobId,
        status: 'queued',
        message: 'AI 任务排队中'
      })
    );
    expect(repository.listLLMTaskRuns('user_demo', 'brand_demo')).toContainEqual(
      expect.objectContaining({
        taskType: 'question_generation',
        status: 'queued',
        jobId: queued.jobId,
        inputSummary: expect.objectContaining({ input: expect.objectContaining({ topic: expect.objectContaining({ length: 4 }) }) })
      })
    );
  });

  it('runs sync tasks through runMessages and records audit usage', async () => {
    const repository = new PermissionsRepository();
    const config = createRuntimePlatform(repository);
    const adapter = createAdapter(config.platformCode, {
      rawText: '{"themes":[],"candidates":[],"missingProfileFields":[],"generationNotes":[]}',
      modelName: 'llm-test-model',
      respondedAt: '2026-07-07T00:00:00.000Z',
      inputTokenCount: 12,
      outputTokenCount: 8
    });
    const service = createService(repository, [adapter]);

    const result = await service.runTask('user_demo', 'brand_demo', 'question_generation', {
      platformCode: config.platformCode,
      input: { topic: '儿童运动' }
    });

    expect(result).toEqual(
      expect.objectContaining({
        status: 'succeeded',
        output: expect.objectContaining({ themes: [], candidates: [] }),
        auditId: expect.any(String)
      })
    );
    expect(adapter.runMessages).toHaveBeenCalledWith(
      expect.objectContaining({
        responseFormat: 'json',
        messages: expect.arrayContaining([expect.objectContaining({ role: 'system' })])
      }),
      expect.objectContaining({ platformCode: config.platformCode })
    );
    expect(repository.listAIPlatformCallAudits('user_demo', 'brand_demo')).toContainEqual(
      expect.objectContaining({
        callType: 'question_generation',
        status: 'succeeded',
        inputTokenCount: 12,
        outputTokenCount: 8
      })
    );
    expect(repository.listLLMTaskRuns('user_demo', 'brand_demo')).toContainEqual(
      expect.objectContaining({
        taskType: 'question_generation',
        status: 'succeeded',
        auditId: result.auditId,
        inputSummary: expect.objectContaining({ platformCode: config.platformCode }),
        outputSummary: expect.objectContaining({
          output: expect.objectContaining({
            themes: expect.objectContaining({ type: 'array', count: 0 }),
            candidates: expect.objectContaining({ type: 'array', count: 0 })
          })
        })
      })
    );
  });

  it('uses StepFun as the default internal test model when multiple API configs are available', async () => {
    const repository = new PermissionsRepository();
    const stepfun = repository.listPlatformConfigs('user_demo', 'brand_demo')?.find((item) => item.platformCode === 'stepfun');
    if (!stepfun) {
      throw new Error('Missing StepFun default config');
    }
    repository.updatePlatformConfig('user_demo', 'brand_demo', stepfun.id, { credentialRef: 'STEPFUN_TEST_KEY' });
    const custom = createRuntimePlatform(repository);
    const stepfunAdapter = createAdapter('stepfun', {
      rawText: '{"themes":[],"candidates":[],"missingProfileFields":[],"generationNotes":[]}',
      modelName: 'step-3.7-flash',
      respondedAt: '2026-07-13T00:00:00.000Z'
    });
    const customAdapter = createAdapter(custom.platformCode, {
      rawText: '{"themes":[],"candidates":[],"missingProfileFields":[],"generationNotes":[]}',
      modelName: 'llm-test-model',
      respondedAt: '2026-07-13T00:00:00.000Z'
    });
    const service = createService(repository, [customAdapter, stepfunAdapter]);

    const result = await service.runTask('user_demo', 'brand_demo', 'question_generation', { input: { topic: '儿童运动' } });

    expect(result.status).toBe('succeeded');
    expect(stepfunAdapter.runMessages).toHaveBeenCalledWith(expect.any(Object), expect.objectContaining({ platformCode: 'stepfun', modelName: 'step-3.7-flash' }));
    expect(customAdapter.runMessages).not.toHaveBeenCalled();
  });

  it('returns validation failures for invalid JSON output', async () => {
    const repository = new PermissionsRepository();
    const config = createRuntimePlatform(repository);
    const adapter = createAdapter(config.platformCode, {
      rawText: 'not json',
      modelName: 'llm-test-model',
      respondedAt: '2026-07-07T00:00:00.000Z'
    });
    const service = createService(repository, [adapter]);

    await expect(service.runTask('user_demo', 'brand_demo', 'question_generation', { platformCode: config.platformCode, input: {} })).resolves.toEqual(
      expect.objectContaining({
        status: 'failed',
        message: expect.stringContaining('llm_output_invalid')
      })
    );
    expect(repository.listAIPlatformCallAudits('user_demo', 'brand_demo')).toContainEqual(
      expect.objectContaining({ callType: 'question_generation', status: 'failed', errorCode: 'llm_output_invalid' })
    );
    expect(repository.listLLMTaskRuns('user_demo', 'brand_demo')).toContainEqual(
      expect.objectContaining({
        taskType: 'question_generation',
        status: 'failed',
        errorCode: 'llm_output_invalid',
        auditId: expect.any(String)
      })
    );
  });
});

describe('LLMController', () => {
  it('wraps task responses in ApiResponse', async () => {
    const llmService = {
      runTask: vi.fn().mockResolvedValue({ status: 'queued', jobId: 'job_1', message: 'AI 任务已加入队列' }),
      getTask: vi.fn()
    } as unknown as LLMOrchestrationService;
    const controller = new LLMController(llmService);

    await expect(controller.generateQuestions(createRequest(), 'brand_demo', { mode: 'async', input: {} as never })).resolves.toEqual({
      success: true,
      data: { status: 'queued', jobId: 'job_1', message: 'AI 任务已加入队列' }
    });
  });
});

function createService(repository = new PermissionsRepository(), adapters: AIPlatformAdapter[] = []): LLMOrchestrationService {
  return new LLMOrchestrationService(
    new PermissionsService(repository),
    new AIPlatformAdapterRegistry(adapters),
    new LLMPromptTemplateService(),
    new LLMOutputValidator()
  );
}

function createRuntimePlatform(repository: PermissionsRepository): PlatformConfig {
  const platformCode = `llm_test_api_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const config = repository.createPlatformConfig('user_demo', 'brand_demo', {
    platformCode,
    name: 'LLM 测试 API',
    mode: 'api',
    endpointUrl: 'https://api.example.com/chat/completions',
    modelName: 'llm-test-model',
    rateLimitPerMinute: 60,
    credentialRef: 'LLM_TEST_KEY'
  });

  if (!config) {
    throw new Error('Failed to create test platform config');
  }

  return config;
}

function createAdapter(platformCode: string, result: RunLLMResult): AIPlatformAdapter {
  return {
    platformCode,
    runPrompt: vi.fn(),
    runMessages: vi.fn(async (_input: RunLLMInput) => result),
    validateConfig: vi.fn()
  } as unknown as AIPlatformAdapter;
}

function createRequest() {
  return {
    context: {
      userId: 'user_demo',
      brandId: 'brand_demo',
      requestId: 'request_test'
    }
  } as never;
}
