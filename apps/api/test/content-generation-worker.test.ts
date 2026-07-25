import type { AsyncJob, ContentGenerationWorkspace, LLMContentGenerationOutput, LLMTaskResponse } from '@geo-platform/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { ContentGenerationWorker } from '../src/modules/content/content-generation.worker';
import type { LLMOrchestrationService } from '../src/modules/llm/llm-orchestration.service';

describe('ContentGenerationWorker', () => {
  it('runs generation steps, writes a version and marks the job succeeded', async () => {
    const job = createJob();
    const workspace = createWorkspace();
    const completedWorkspace = createWorkspace({ currentVersion: { title: 'Generated Title', body: 'Generated Body', version: 2 } });
    const service = createPermissionsServiceMock({ job, workspace, completedWorkspace });
    const worker = new ContentGenerationWorker(service as never);

    await expect(worker.processJob('user_demo', 'brand_demo', job.id, () => ({ title: 'Generated Title', body: 'Generated Body' }))).resolves.toEqual(completedWorkspace);

    expect(service.updateAsyncJob).toHaveBeenCalledWith('user_demo', 'brand_demo', job.id, expect.objectContaining({ status: 'running', attemptCount: 1 }));
    expect(service.updateContentGenerationStep).toHaveBeenCalledWith('user_demo', 'brand_demo', job.entityId, expect.objectContaining({ stepKey: 'strategy_parse', status: 'completed' }));
    expect(service.updateContentGenerationStep).toHaveBeenCalledWith('user_demo', 'brand_demo', job.entityId, expect.objectContaining({ stepKey: 'body_generation', status: 'running' }));
    expect(service.updateContentGenerationStep).toHaveBeenCalledWith('user_demo', 'brand_demo', job.entityId, expect.objectContaining({ stepKey: 'geo_rule_check', status: 'completed' }));
    expect(service.completeContentGenerationTask).toHaveBeenCalledWith('user_demo', 'brand_demo', job.entityId, { title: 'Generated Title', body: 'Generated Body' });
    expect(service.updateAsyncJob).toHaveBeenCalledWith('user_demo', 'brand_demo', job.id, expect.objectContaining({ status: 'succeeded', attemptCount: 1 }));
  });

  it('records retryable failures at the failed step with the current attempt', async () => {
    const job = createJob({ attemptCount: 1, maxAttempts: 3 });
    const workspace = createWorkspace();
    const failedWorkspace = createWorkspace({ currentTask: { status: 'failed', errorMessage: 'Provider timeout' } });
    const service = createPermissionsServiceMock({ job, workspace, failedWorkspace });
    const worker = new ContentGenerationWorker(service as never);

    await expect(worker.processJob('user_demo', 'brand_demo', job.id, () => {
      throw new Error('Provider timeout');
    })).resolves.toEqual(failedWorkspace);

    expect(service.updateAsyncJob).toHaveBeenCalledWith('user_demo', 'brand_demo', job.id, expect.objectContaining({ status: 'running', attemptCount: 2 }));
    expect(service.recordContentGenerationFailure).toHaveBeenCalledWith('user_demo', 'brand_demo', job.entityId, expect.objectContaining({
      stepKey: 'body_generation',
      errorCode: 'content_generation_failed',
      errorMessage: 'Provider timeout',
      retryable: true,
      attemptCount: 2
    }));
    expect(service.completeContentGenerationTask).not.toHaveBeenCalled();
  });

  it('uses LLM content generation as the default draft generator', async () => {
    const job = createJob();
    const workspace = createWorkspace();
    const completedWorkspace = createWorkspace({ currentVersion: { title: 'LLM Title', body: 'LLM Body' } });
    const service = createPermissionsServiceMock({ job, workspace, completedWorkspace });
    const llmService = createLLMService({
      status: 'succeeded',
      message: 'AI 任务已完成',
      output: {
        title: 'LLM Title',
        body: 'LLM Body 保证长高',
        exportFormat: 'markdown',
        complianceNotes: ['需要确认敏感表达'],
        retestSuggestions: ['发布后复测'],
        reviewRequired: true
      }
    });
    const worker = new ContentGenerationWorker(service as never, llmService);

    await expect(worker.processJob('user_demo', 'brand_demo', job.id)).resolves.toEqual(completedWorkspace);

    expect(llmService.runTask).toHaveBeenCalledWith(
      'user_demo',
      'brand_demo',
      'content_generation',
      expect.objectContaining({
        mode: 'sync',
        input: expect.objectContaining({
          contentType: 'wechat_article',
          targetPlatform: 'wechat',
          targetKeywords: ['儿童运动'],
          referenceSources: ['品牌知识库']
        })
      })
    );
    expect(service.completeContentGenerationTask).toHaveBeenCalledWith('user_demo', 'brand_demo', job.entityId, {
      title: 'LLM Title',
      body: 'LLM Body 保证长高\n\n合规说明：\n- 需要确认敏感表达\n\n复测建议：\n- 发布后复测\n\n需要你确认：草稿中包含 保证长高，发布前请按品牌资料和合规要求改写。'
    });
  });

  it('falls back to the basic draft when LLM content generation fails', async () => {
    const job = createJob();
    const workspace = createWorkspace();
    const service = createPermissionsServiceMock({ job, workspace });
    const worker = new ContentGenerationWorker(service as never, createLLMService({ status: 'failed', message: '请先填写平台密钥（llm_credential_missing）' }));

    await worker.processJob('user_demo', 'brand_demo', job.id);

    expect(service.completeContentGenerationTask).toHaveBeenCalledWith('user_demo', 'brand_demo', job.entityId, expect.objectContaining({
      title: '贵阳儿童运动怎么选｜公众号推文',
      body: expect.stringContaining('## 家长为什么会关心这个问题')
    }));
    const draft = vi.mocked(service.completeContentGenerationTask).mock.calls[0][3];
    expect(draft.body).toContain('## 品牌事实');
    expect(draft.body).toContain('## 家长行动建议');
    expect(draft.body).toContain('## 引用依据');
    expect(draft.body).toContain('## 合规说明');
    expect(draft.body).toContain('## 建议发布平台');
    expect(draft.body).toContain('## 复测建议');
    expect(draft.body.length).toBeGreaterThan(450);
  });

  it('ignores non-content-generation jobs and missing workspaces', async () => {
    const monitoringJob = createJob({ jobType: 'monitoring' });
    const monitoringService = createPermissionsServiceMock({ job: monitoringJob, workspace: createWorkspace() });
    const monitoringWorker = new ContentGenerationWorker(monitoringService as never);

    await expect(monitoringWorker.processJob('user_demo', 'brand_demo', monitoringJob.id)).resolves.toBeNull();
    expect(monitoringService.updateAsyncJob).not.toHaveBeenCalled();

    const contentJob = createJob();
    const missingService = createPermissionsServiceMock({ job: contentJob, workspace: null });
    const missingWorker = new ContentGenerationWorker(missingService as never);

    await expect(missingWorker.processJob('user_demo', 'brand_demo', contentJob.id)).resolves.toBeNull();
    expect(missingService.updateAsyncJob).not.toHaveBeenCalled();
  });
});

function createPermissionsServiceMock(input: {
  job: AsyncJob;
  workspace: ContentGenerationWorkspace | null;
  completedWorkspace?: ContentGenerationWorkspace;
  failedWorkspace?: ContentGenerationWorkspace;
}) {
  return {
    listAsyncJobs: vi.fn().mockResolvedValue([input.job]),
    listAccessibleBrandDetails: vi.fn().mockResolvedValue([{ brandId: 'brand_demo', name: '追光小牛', aliases: ['SUPERCALF'], industry: '儿童运动教育', targetCities: ['贵阳'], businessScope: '儿童运动成长课', targetAudience: '2-14 岁儿童家庭', status: 'active', createdAt: '2026-07-03T00:00:00.000Z', updatedAt: '2026-07-03T00:00:00.000Z' }]),
    getBrandProfile: vi.fn().mockResolvedValue({ brandId: 'brand_demo', intro: '追光小牛是贵阳儿童运动成长品牌。', valueProps: ['ACE 成长体系'], offerings: ['快乐体操'], proofPoints: ['世界冠军师资背书'], targetCustomers: ['贵阳 2-14 岁儿童家庭'], recommendedExpressions: ['运动成长课是儿童必修课'], blockedExpressions: ['保证长高'], contentRules: ['审慎表达'], competitors: [], faqs: [], completenessScore: 100, missingFields: [], completenessPrompts: [], updatedAt: '2026-07-03T00:00:00.000Z' }),
    getContentGenerationWorkspace: vi.fn().mockResolvedValue(input.workspace),
    updateAsyncJob: vi.fn().mockResolvedValue(input.job),
    updateContentGenerationStep: vi.fn().mockResolvedValue(input.workspace),
    completeContentGenerationTask: vi.fn().mockResolvedValue(input.completedWorkspace ?? input.workspace),
    recordContentGenerationFailure: vi.fn().mockResolvedValue(input.failedWorkspace ?? input.workspace)
  };
}

function createLLMService(response: LLMTaskResponse<LLMContentGenerationOutput>): LLMOrchestrationService {
  return {
    runTask: vi.fn().mockResolvedValue(response)
  } as unknown as LLMOrchestrationService;
}

function createJob(input: Partial<AsyncJob> = {}): AsyncJob {
  return {
    id: 'job_content_1',
    brandId: 'brand_demo',
    jobType: 'content_generation',
    status: 'queued',
    entityId: 'generation_1',
    attemptCount: 0,
    maxAttempts: 3,
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
    ...input
  };
}

function createWorkspace(input: {
  currentTask?: Partial<NonNullable<ContentGenerationWorkspace['currentTask']>>;
  currentVersion?: Partial<NonNullable<ContentGenerationWorkspace['currentVersion']>>;
} = {}): ContentGenerationWorkspace {
  const currentTask = {
    id: 'generation_1',
    brandId: 'brand_demo',
    strategyId: 'strategy_1',
    targetPlatform: 'wechat',
    contentType: 'wechat_article',
    contentTopic: '贵阳儿童运动怎么选',
    targetKeywords: ['儿童运动'],
    referenceSources: ['品牌知识库'],
    status: 'pending' as const,
    steps: [],
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
    ...input.currentTask
  };
  const currentVersion = input.currentVersion
    ? {
        id: 'version_2',
        brandId: 'brand_demo',
        generationTaskId: currentTask.id,
        title: 'Generated Title',
        body: 'Generated Body',
        version: 2,
        exportFormat: 'markdown' as const,
        createdAt: '2026-07-03T00:00:00.000Z',
        updatedAt: '2026-07-03T00:00:00.000Z',
        ...input.currentVersion
      }
    : undefined;

  return {
    brandId: 'brand_demo',
    tasks: [currentTask],
    currentTask,
    currentVersion,
    versions: currentVersion ? [currentVersion] : [],
    exports: [],
    publishPayload: currentVersion
      ? {
          brandId: 'brand_demo',
          strategyId: currentTask.strategyId,
          generationTaskId: currentTask.id,
          versionId: currentVersion.id,
          title: currentVersion.title,
          body: currentVersion.body,
          targetPlatform: currentTask.targetPlatform,
          contentType: currentTask.contentType,
          targetKeywords: []
        }
      : undefined
  };
}
