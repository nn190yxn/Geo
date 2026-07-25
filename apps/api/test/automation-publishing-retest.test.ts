import { describe, expect, it } from 'vitest';
import { AutomationOrchestratorService } from '../src/modules/automation/automation-orchestrator.service';
import { AutomationRepository } from '../src/modules/automation/automation.repository';
import { ConfirmationQueueService } from '../src/modules/automation/confirmation-queue.service';
import { PlatformRewriteService } from '../src/modules/automation/platform-rewrite.service';
import { QuestionPoolService } from '../src/modules/automation/question-pool.service';
import { TestQuestionService } from '../src/modules/brands/test-question.service';
import { TestThemeService } from '../src/modules/brands/test-theme.service';
import { ContentGenerationWorker } from '../src/modules/content/content-generation.worker';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('Automation publishing and retest flow', () => {
  it('creates publishing suggestions, publishing records and retest feedback loop', async () => {
    const harness = createHarness();
    const sourceRunId = createSourceRun(harness.permissionsRepository);
    const planId = createGrowthPlan(harness.permissionsRepository, sourceRunId);
    const automationPackage = harness.service.createPackage('user_demo', 'brand_demo');
    harness.automationRepository.updatePackage('brand_demo', automationPackage.packageId, {
      ...automationPackage,
      status: 'running',
      currentStep: 'content_generation',
      relatedGrowthPlanId: planId
    });

    const generated = await harness.service.generateContent('user_demo', 'brand_demo', automationPackage.packageId);
    const rewritten = harness.service.generatePlatformRewrites('user_demo', 'brand_demo', generated.packageId);
    const rewriteConfirmation = rewritten.confirmations.find((item) => item.type === 'platform_rewrite_review');
    harness.confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', rewritten.packageId, rewriteConfirmation?.confirmationId ?? '', { action: 'approve' });
    createHistoricalPublishingRecord(harness, generated.relatedContentTaskIds[0]);

    const suggested = harness.service.generatePublishingSuggestions('user_demo', 'brand_demo', rewritten.packageId);
    const publishingConfirmation = suggested.confirmations.find((item) => item.type === 'publishing_suggestion');
    const suggestions = publishingConfirmation?.payload.suggestions;

    expect(suggested).toEqual(expect.objectContaining({ status: 'waiting_confirmation', currentStep: 'publishing_suggestion' }));
    expect(suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({ targetPlatform: 'wechat_official', historicalRecordCount: expect.any(Number) })
    ]));
    expect(suggestions).toEqual(expect.arrayContaining([
      expect.objectContaining({ historicalRecordCount: expect.any(Number), latestHistoricalStatus: 'published' })
    ]));

    const confirmed = harness.service.confirmPublishingSuggestions('user_demo', 'brand_demo', suggested.packageId, {
      confirmationId: publishingConfirmation?.confirmationId ?? ''
    });
    const publishingDashboard = harness.permissionsRepository.getPublishingDashboard('user_demo', 'brand_demo');

    expect(confirmed).toEqual(expect.objectContaining({ status: 'running', currentStep: 'retest_suggestion' }));
    expect(confirmed.relatedPublishingRecordIds).toHaveLength((suggestions as unknown[])?.length ?? 0);
    expect(publishingDashboard?.records.filter((record) => confirmed.relatedPublishingRecordIds.includes(record.id))).toEqual(expect.arrayContaining([
      expect.objectContaining({ status: 'pending', platform: 'wechat_official' })
    ]));
    const publishingRecords = publishingDashboard?.records.filter((record) => confirmed.relatedPublishingRecordIds.includes(record.id)) ?? [];
    assertPublishingRecordsReady(publishingRecords);

    const retestSuggested = harness.service.generateRetestSuggestions('user_demo', 'brand_demo', confirmed.packageId);
    const taskBoard = harness.permissionsRepository.getTaskBoard('user_demo', 'brand_demo');
    const retestTask = taskBoard?.tasks.find((task) => task.growthOptimizationPlanId === planId && task.title === '发布后复测 AI 推荐表现');

    expect(retestSuggested).toEqual(expect.objectContaining({ status: 'running', currentStep: 'retest_suggestion' }));
    expect(retestTask).toEqual(expect.objectContaining({ status: 'retest', sourceRunId }));
    expect(retestTask?.retestRecords[0]).toEqual(expect.objectContaining({ sourceRunId, targetScore: 85 }));

    const completed = harness.service.completeRetest('user_demo', 'brand_demo', retestSuggested.packageId, retestTask?.id ?? '', retestTask?.retestRecords[0]?.id ?? '', {
      actualScore: 92,
      targetScore: 85,
      notes: '复测达到目标'
    });

    expect(completed).toEqual(expect.objectContaining({ status: 'completed', currentStep: 'completed' }));
    expect(completed.stepSummaries).toContainEqual(expect.objectContaining({ code: 'retest_suggestion', status: 'completed', message: '复测结果已回写，任务包完成。' }));
  });

  it('keeps publishing suggestion confirmation pending when edited suggestions are empty', async () => {
    const harness = createHarness();
    const sourceRunId = createSourceRun(harness.permissionsRepository);
    const planId = createGrowthPlan(harness.permissionsRepository, sourceRunId);
    const automationPackage = harness.service.createPackage('user_demo', 'brand_demo');
    harness.automationRepository.updatePackage('brand_demo', automationPackage.packageId, {
      ...automationPackage,
      status: 'running',
      currentStep: 'content_generation',
      relatedGrowthPlanId: planId
    });

    const generated = await harness.service.generateContent('user_demo', 'brand_demo', automationPackage.packageId);
    const rewritten = harness.service.generatePlatformRewrites('user_demo', 'brand_demo', generated.packageId);
    const rewriteConfirmation = rewritten.confirmations.find((item) => item.type === 'platform_rewrite_review');
    harness.confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', rewritten.packageId, rewriteConfirmation?.confirmationId ?? '', { action: 'approve' });
    const suggested = harness.service.generatePublishingSuggestions('user_demo', 'brand_demo', rewritten.packageId);
    const publishingConfirmation = suggested.confirmations.find((item) => item.type === 'publishing_suggestion');

    expect(() => harness.service.confirmPublishingSuggestions('user_demo', 'brand_demo', suggested.packageId, {
      confirmationId: publishingConfirmation?.confirmationId ?? '',
      payload: { suggestions: [] }
    })).toThrow('发布建议确认事项中没有可创建的发布待办');

    expect(harness.automationRepository.getConfirmation('brand_demo', suggested.packageId, publishingConfirmation?.confirmationId ?? '')).toEqual(
      expect.objectContaining({ status: 'pending' })
    );
  });
});

function createHarness(): {
  service: AutomationOrchestratorService;
  automationRepository: AutomationRepository;
  permissionsRepository: PermissionsRepository;
  confirmationQueue: ConfirmationQueueService;
} {
  const automationRepository = new AutomationRepository();
  const permissionsRepository = new PermissionsRepository();
  const permissionsService = new PermissionsService(permissionsRepository);
  const confirmationQueue = new ConfirmationQueueService(automationRepository, permissionsRepository);
  const questionPoolService = new QuestionPoolService(
    automationRepository,
    permissionsRepository,
    new TestThemeService(),
    new TestQuestionService(),
    confirmationQueue
  );
  const contentGenerationWorker = new ContentGenerationWorker(permissionsService);
  const platformRewriteService = new PlatformRewriteService(automationRepository);

  return {
    service: new AutomationOrchestratorService(automationRepository, permissionsRepository, confirmationQueue, questionPoolService, contentGenerationWorker, platformRewriteService),
    automationRepository,
    permissionsRepository,
    confirmationQueue
  };
}

function createSourceRun(repository: PermissionsRepository): string {
  const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
    name: `自动化复测单元 ${Date.now()}_${Math.random()}`,
    type: 'brand',
    targetKeywords: ['儿童运动', '追光小牛'],
    priority: 'high'
  });
  const intent = repository.createUserIntent('user_demo', 'brand_demo', {
    optimizationUnitId: unit?.id ?? '',
    category: 'category_recommendation',
    text: '贵阳儿童运动成长课怎么选',
    monitoringFrequency: 'manual'
  });
  const template = repository.createPromptTemplate({
    name: `自动化复测模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请推荐{brandName}是否适合{intent}。',
    targetKeywords: ['儿童运动'],
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompt = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  })?.[0];
  repository.createPlatformConfig('user_demo', 'brand_demo', {
    platformCode: 'manual_input',
    name: '人工录入',
    mode: 'manual',
    enabled: true
  });
  const run = repository.createMonitoringRun('user_demo', 'brand_demo', {
    promptId: prompt?.id ?? '',
    platformCode: 'manual_input'
  });
  repository.addManualResponse('user_demo', 'brand_demo', run?.id ?? '', {
    rawText: '追光小牛适合贵阳儿童运动成长，ACE 成长体系覆盖体能、认知和参与度。',
    modelName: 'manual'
  });
  repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

  return run?.id ?? '';
}

function createGrowthPlan(repository: PermissionsRepository, sourceRunId: string): string {
  const plan = repository.createGrowthOptimizationPlan('user_demo', 'brand_demo', {
    sourceRunIds: [sourceRunId],
    summary: '发布后复测自动化闭环',
    priority: 'high',
    ownerId: 'user_demo',
    dueDate: '2026-07-20T00:00:00.000Z',
    publishingPlatforms: ['wechat_official', 'xiaohongshu'],
    retestAt: '2026-07-27T00:00:00.000Z',
    contentRecommendations: [{
      contentType: 'wechat_article',
      title: '追光小牛为什么适合贵阳儿童运动成长？',
      targetPlatform: 'wechat_official',
      targetKeywords: ['儿童运动', '贵阳体能'],
      reason: '补齐可发布内容并安排复测'
    }]
  });

  if (!plan) {
    throw new Error('Expected growth plan to be created');
  }

  return plan.id;
}

function createHistoricalPublishingRecord(harness: ReturnType<typeof createHarness>, taskId?: string): void {
  if (!taskId) {
    return;
  }

  const workspace = harness.permissionsRepository.getContentGenerationWorkspace('user_demo', 'brand_demo', taskId);
  const version = workspace?.currentVersion;

  if (!workspace?.currentTask || !version) {
    return;
  }

  harness.permissionsRepository.createPublishingRecord('user_demo', 'brand_demo', {
    brandId: 'brand_demo',
    strategyId: workspace.currentTask.strategyId,
    generationTaskId: workspace.currentTask.id,
    versionId: version.id,
    title: version.title,
    body: version.body,
    targetPlatform: 'wechat_official',
    contentType: workspace.currentTask.contentType,
    targetKeywords: workspace.currentTask.targetKeywords,
    status: 'published'
  });
}

function assertPublishingRecordsReady(records: Array<{ platform: string; title: string; body?: string }>): void {
  expect(records.length).toBeGreaterThan(0);
  for (const record of records) {
    expect(record.title).toBeTruthy();
    expect(record.body).toBeTruthy();
    expect(stripText(record.body).length).toBeGreaterThan(record.platform === 'wechat_official' ? 700 : 280);
    expect(record.body).toContain('追光小牛');
    expect(record.body).toContain('合规');
    expect(record.body).not.toMatch(/保证长高|治疗感统失调|包过中考体育|monitoring_run:/);
  }
}

function stripText(body = ''): string {
  return body.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`\-\s]/g, '').trim();
}
