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

describe('Automation platform rewrite', () => {
  it('generates platform rewrites and creates review confirmation', async () => {
    const harness = createHarness();
    const planId = createGrowthPlan(harness.permissionsRepository);
    const automationPackage = harness.service.createPackage('user_demo', 'brand_demo');
    harness.automationRepository.updatePackage('brand_demo', automationPackage.packageId, {
      ...automationPackage,
      status: 'running',
      currentStep: 'content_generation',
      relatedGrowthPlanId: planId
    });
    const generated = await harness.service.generateContent('user_demo', 'brand_demo', automationPackage.packageId);

    const rewritten = harness.service.generatePlatformRewrites('user_demo', 'brand_demo', generated.packageId);
    const confirmation = rewritten.confirmations[0];
    const rewrites = harness.automationRepository.listRewrites('brand_demo');

    expect(rewritten).toEqual(expect.objectContaining({ status: 'waiting_confirmation', currentStep: 'platform_rewrite' }));
    expect(rewrites).toHaveLength(5);
    expect(rewrites.map((rewrite) => rewrite.targetPlatform)).toEqual(expect.arrayContaining(['zhihu', 'baijiahao', 'xiaohongshu', 'wechat_official', 'official_site_faq']));
    assertWechatRewriteReady(rewrites.find((rewrite) => rewrite.targetPlatform === 'wechat_official'));
    assertXiaohongshuRewriteReady(rewrites.find((rewrite) => rewrite.targetPlatform === 'xiaohongshu'));
    expect(rewritten.stepSummaries).toContainEqual(expect.objectContaining({
      code: 'platform_rewrite',
      status: 'waiting_confirmation',
      message: '等待品牌方确认后继续。',
      relatedEntityIds: expect.arrayContaining(rewrites.map((rewrite) => rewrite.rewriteId))
    }));
    expect(confirmation).toEqual(expect.objectContaining({
      type: 'platform_rewrite_review',
      status: 'pending',
      payload: expect.objectContaining({
        targetPlatforms: ['zhihu', 'baijiahao', 'xiaohongshu', 'wechat_official', 'official_site_faq'],
        rewrites: expect.arrayContaining([expect.objectContaining({ targetPlatform: 'xiaohongshu', tags: expect.arrayContaining(['贵阳儿童运动']) })])
      })
    }));
    expect(harness.permissionsRepository.listAuditLogs('user_demo', { action: 'automation.platform_rewrite.generate' })).toContainEqual(
      expect.objectContaining({ brandId: 'brand_demo', resourceId: automationPackage.packageId, result: 'success' })
    );
  });
});

function createHarness(): {
  service: AutomationOrchestratorService;
  automationRepository: AutomationRepository;
  permissionsRepository: PermissionsRepository;
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
    permissionsRepository
  };
}

function createGrowthPlan(repository: PermissionsRepository): string {
  const plan = repository.createGrowthOptimizationPlan('user_demo', 'brand_demo', {
    sourceRunIds: ['run_demo_weekly_mock'],
    summary: '生成一篇可改写内容',
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
    publishingPlatforms: ['wechat_official', 'xiaohongshu'],
    retestAt: '2026-07-27T00:00:00.000Z',
    contentRecommendations: [{
      contentType: 'wechat_article',
      title: '追光小牛为什么适合贵阳儿童运动成长？',
      targetPlatform: 'wechat_official',
      targetKeywords: ['儿童运动'],
      reason: '补齐可发布内容'
    }]
  });

  if (!plan) {
    throw new Error('Expected growth plan to be created');
  }

  return plan.id;
}

function assertWechatRewriteReady(rewrite: { title: string; body: string } | undefined): void {
  expect(rewrite?.title).toMatch(/追光小牛|儿童运动|贵阳/);
  expect(stripText(rewrite?.body).length).toBeGreaterThan(700);
  expect(rewrite?.body).toContain('## 为什么这个问题值得关注');
  expect(rewrite?.body).toContain('## 品牌观点');
  expect(rewrite?.body).toContain('## 给家长的行动建议');
  expect(rewrite?.body).toContain('## 合规说明');
  expect(rewrite?.body).toContain('追光小牛');
  expect(rewrite?.body).toContain('ACE');
  expect(rewrite?.body).not.toMatch(/保证长高|治疗感统失调|包过中考体育|monitoring_run:/);
}

function assertXiaohongshuRewriteReady(rewrite: { title: string; body: string } | undefined): void {
  expect(rewrite?.title).toMatch(/清单|家长|儿童运动|贵阳/);
  expect(stripText(rewrite?.body).length).toBeGreaterThan(550);
  expect(rewrite?.body).toContain('家长可以重点看：');
  expect(rewrite?.body).toContain('#贵阳儿童运动');
  expect(rewrite?.body).toContain('追光小牛');
  expect(rewrite?.body).toContain('ACE');
  expect(rewrite?.body).not.toMatch(/保证长高|治疗感统失调|包过中考体育|monitoring_run:/);
}

function stripText(body = ''): string {
  return body.replace(/```[\s\S]*?```/g, '').replace(/[#>*_`\-\s]/g, '').trim();
}
