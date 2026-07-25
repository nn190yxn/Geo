import { describe, expect, it } from 'vitest';
import { AutomationOrchestratorService } from '../src/modules/automation/automation-orchestrator.service';
import { AutomationRepository } from '../src/modules/automation/automation.repository';
import { ConfirmationQueueService } from '../src/modules/automation/confirmation-queue.service';
import { QuestionPoolService } from '../src/modules/automation/question-pool.service';
import { TestQuestionService } from '../src/modules/brands/test-question.service';
import { TestThemeService } from '../src/modules/brands/test-theme.service';
import { ContentGenerationWorker } from '../src/modules/content/content-generation.worker';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('Automation content generation', () => {
  it('creates six publishable content drafts from growth recommendations', async () => {
    const harness = createHarness();
    const planId = createGrowthPlan(harness.permissionsRepository);
    const automationPackage = createContentGenerationPackage(harness, planId);

    const generated = await harness.service.generateContent('user_demo', 'brand_demo', automationPackage.packageId);
    const generatedTasks = generated.relatedContentTaskIds
      .map((taskId) => harness.permissionsRepository.getContentGenerationWorkspace('user_demo', 'brand_demo', taskId)?.currentTask)
      .filter((task): task is NonNullable<typeof task> => Boolean(task));

    expect(generated).toEqual(expect.objectContaining({ status: 'running', currentStep: 'platform_rewrite', confirmations: [] }));
    expect(generated.relatedContentTaskIds).toHaveLength(6);
    expect(generatedTasks.map((task) => task.contentType)).toEqual(expect.arrayContaining([
      'wechat_article',
      'xiaohongshu_note',
      'website_faq',
      'short_video_script',
      'platform_profile_copy',
      'image_creative_brief'
    ]));
    expect(generated.stepSummaries).toContainEqual(expect.objectContaining({ code: 'content_generation', status: 'completed', message: '已生成 6 篇内容，需确认 0 篇。' }));
    expect(generated.stepSummaries).toContainEqual(expect.objectContaining({ code: 'platform_rewrite', status: 'running' }));

    for (const taskId of generated.relatedContentTaskIds) {
      const workspace = harness.permissionsRepository.getContentGenerationWorkspace('user_demo', 'brand_demo', taskId);
      expect(workspace?.currentVersion).toEqual(expect.objectContaining({ title: expect.any(String), body: expect.any(String) }));
      expect(workspace?.currentVersion?.body).toContain('## 引用依据');
      expect(workspace?.currentVersion?.body).not.toContain('monitoring_run:');
      expect(workspace?.currentVersion?.body).toContain('## 合规说明');
      expect(workspace?.currentVersion?.body).toContain('## 建议发布平台');
      expect(workspace?.currentVersion?.body).toContain('## 复测建议');
    }

    const wechatDraft = getDraftByContentType(harness.permissionsRepository, generated.relatedContentTaskIds, 'wechat_article');
    const xiaohongshuDraft = getDraftByContentType(harness.permissionsRepository, generated.relatedContentTaskIds, 'xiaohongshu_note');
    assertWechatDraftReady(wechatDraft);
    assertXiaohongshuDraftReady(xiaohongshuDraft);

    expect(harness.permissionsRepository.listAuditLogs('user_demo', { action: 'automation.content.generate' })).toContainEqual(
      expect.objectContaining({ brandId: 'brand_demo', resourceId: automationPackage.packageId, result: 'success' })
    );
  });

  it('creates content review confirmation when drafts contain risk expressions', async () => {
    const harness = createHarness();
    const planId = createGrowthPlan(harness.permissionsRepository, [{
      contentType: 'wechat_article',
      title: '追光小牛能保证长高吗',
      targetPlatform: 'wechat_official',
      targetKeywords: ['保证长高'],
      reason: '需要改写风险表达'
    }]);
    const automationPackage = createContentGenerationPackage(harness, planId);

    const generated = await harness.service.generateContent('user_demo', 'brand_demo', automationPackage.packageId);
    const confirmation = generated.confirmations[0];

    expect(generated).toEqual(expect.objectContaining({ status: 'waiting_confirmation', currentStep: 'content_generation' }));
    expect(confirmation).toEqual(expect.objectContaining({
      type: 'content_review',
      status: 'pending',
      payload: expect.objectContaining({
        growthPlanId: planId,
        generatedContent: expect.any(Array),
        reviewItems: [expect.objectContaining({ title: '追光小牛能保证长高吗' })]
      })
    }));
  });
});

function getDraftByContentType(repository: PermissionsRepository, taskIds: string[], contentType: string) {
  const workspace = taskIds
    .map((taskId) => repository.getContentGenerationWorkspace('user_demo', 'brand_demo', taskId))
    .find((item) => item?.currentTask?.contentType === contentType);
  return workspace?.currentVersion;
}

function assertWechatDraftReady(draft: { title: string; body: string } | undefined): void {
  expect(draft?.title).toMatch(/公众号|家长|儿童运动|选课/);
  expect(stripText(draft?.body).length).toBeGreaterThan(650);
  expect(draft?.body).toContain('## 品牌事实');
  expect(draft?.body).toContain('## 家长行动建议');
  expect(draft?.body).toContain('## 合规说明');
  expect(draft?.body).toContain('## 复测建议');
  expect(draft?.body).toContain('追光小牛');
  expect(draft?.body).toContain('ACE');
  expect(draft?.body).toContain('预约体验');
  expect(draft?.body).not.toMatch(/保证长高|治疗感统失调|包过中考体育|monitoring_run:/);
}

function assertXiaohongshuDraftReady(draft: { title: string; body: string } | undefined): void {
  expect(draft?.title).toMatch(/清单|参考|孩子|家长/);
  expect(stripText(draft?.body).length).toBeGreaterThan(500);
  expect(draft?.body).toContain('品牌事实：');
  expect(draft?.body).toContain('家长行动建议：');
  expect(draft?.body).toContain('话题标签：');
  expect(draft?.body).toContain('#贵阳体能');
  expect(draft?.body).toContain('追光小牛');
  expect(draft?.body).not.toMatch(/保证长高|治疗感统失调|包过中考体育|monitoring_run:/);
}

function stripText(body = ''): string {
  return body.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`\-\s]/g, '').trim();
}

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

  return {
    service: new AutomationOrchestratorService(automationRepository, permissionsRepository, confirmationQueue, questionPoolService, contentGenerationWorker),
    automationRepository,
    permissionsRepository,
    confirmationQueue
  };
}

function createContentGenerationPackage(harness: ReturnType<typeof createHarness>, planId: string): ReturnType<AutomationOrchestratorService['createPackage']> {
  const automationPackage = harness.service.createPackage('user_demo', 'brand_demo');
  harness.automationRepository.updatePackage('brand_demo', automationPackage.packageId, {
    ...automationPackage,
    status: 'running',
    currentStep: 'content_generation',
    relatedGrowthPlanId: planId
  });
  return automationPackage;
}

function createGrowthPlan(
  repository: PermissionsRepository,
  recommendations = [
    { contentType: 'wechat_article', title: '公众号推文任务', targetPlatform: 'wechat_official', targetKeywords: ['儿童运动'], reason: '补齐公众号长文' },
    { contentType: 'xiaohongshu_note', title: '小红书图文任务', targetPlatform: 'xiaohongshu', targetKeywords: ['贵阳体能'], reason: '补齐种草内容' },
    { contentType: 'website_faq', title: '官网 FAQ 任务', targetPlatform: 'official_site', targetKeywords: ['课程 FAQ'], reason: '补齐官网问答' },
    { contentType: 'short_video_script', title: '短视频脚本任务', targetPlatform: 'douyin', targetKeywords: ['少儿跑酷'], reason: '补齐短视频脚本' },
    { contentType: 'platform_profile_copy', title: '平台介绍文案任务', targetPlatform: 'ai_platform_profile', targetKeywords: ['ACE 成长体系'], reason: '统一平台介绍' },
    { contentType: 'image_creative_brief', title: '图片创意需求任务', targetPlatform: 'xiaohongshu', targetKeywords: ['快乐体操'], reason: '补齐图片创意' }
  ]
): string {
  const plan = repository.createGrowthOptimizationPlan('user_demo', 'brand_demo', {
    sourceRunIds: ['run_demo_weekly_mock'],
    summary: '首轮测试后需要补齐六类内容资产',
    reasons: [{
      type: 'content_gap',
      title: '内容缺口',
      evidence: 'AI 回答缺少品牌标准表达和可引用资料',
      relatedRunIds: ['run_demo_weekly_mock'],
      relatedPromptIds: ['prompt_demo_comparison']
    }],
    priority: 'high',
    ownerId: 'user_demo',
    dueDate: '2026-07-20T00:00:00.000Z',
    publishingPlatforms: ['wechat_official', 'xiaohongshu', 'official_site', 'douyin'],
    retestAt: '2026-07-27T00:00:00.000Z',
    contentRecommendations: recommendations
  });

  if (!plan) {
    throw new Error('Expected growth plan to be created');
  }

  return plan.id;
}
