import { describe, expect, it } from 'vitest';
import { AutomationOrchestratorService } from '../src/modules/automation/automation-orchestrator.service';
import { AutomationRepository } from '../src/modules/automation/automation.repository';
import { ConfirmationQueueService } from '../src/modules/automation/confirmation-queue.service';
import { QuestionPoolService } from '../src/modules/automation/question-pool.service';
import { TestQuestionService } from '../src/modules/brands/test-question.service';
import { TestThemeService } from '../src/modules/brands/test-theme.service';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('Automation answer analysis', () => {
  it('summarizes stable analysis and moves packages to content generation', () => {
    const harness = createHarness();
    const { automationPackage, runId } = executeMockPlan(harness, '追光小牛为什么适合贵阳儿童运动成长？');
    harness.permissionsRepository.updateAnalysisResult('user_demo', 'brand_demo', runId, {
      brandMentioned: true,
      brandRank: 1,
      sentiment: 'positive',
      accuracyScore: 92,
      citationScore: 75,
      competitorMentions: [],
      expressionDeviation: '未发现高风险表达',
      platformEvaluation: '表现稳定',
      reviewRequired: false
    });

    const analyzed = harness.service.analyzeAnswers('user_demo', 'brand_demo', automationPackage.packageId);

    expect(analyzed).toEqual(expect.objectContaining({ status: 'running', currentStep: 'content_generation' }));
    expect(analyzed.relatedGrowthPlanId).toMatch(/^growth_plan_/);
    expect(analyzed.confirmations).toEqual([]);
    expect(analyzed.stepSummaries).toContainEqual(
      expect.objectContaining({
        code: 'answer_analysis',
        status: 'completed',
        message: expect.stringContaining('推荐率 100%'),
        relatedEntityIds: expect.arrayContaining([runId, analyzed.relatedGrowthPlanId])
      })
    );
    expect(analyzed.stepSummaries).toContainEqual(
      expect.objectContaining({ code: 'content_generation', status: 'running', relatedEntityIds: expect.arrayContaining([analyzed.relatedGrowthPlanId]) })
    );
    expect(harness.permissionsRepository.listAuditLogs('user_demo', { action: 'automation.answers.analyze' })).toContainEqual(
      expect.objectContaining({ brandId: 'brand_demo', resourceId: automationPackage.packageId, result: 'success' })
    );
  });

  it('creates analysis review confirmation for risk and uncertain results', () => {
    const harness = createHarness();
    const { automationPackage, runId } = executeMockPlan(harness, '追光小牛是否能保证长高？');
    harness.permissionsRepository.updateAnalysisResult('user_demo', 'brand_demo', runId, {
      brandMentioned: true,
      brandRank: null,
      sentiment: 'unknown',
      accuracyScore: 55,
      citationScore: 0,
      competitorMentions: [{ name: '竞品A', rank: 1, sentiment: 'neutral' }],
      expressionDeviation: '需要你确认：命中高风险或禁用表达：保证长高建议改为促进运动能力发展',
      platformEvaluation: '需要你确认：存在风险承诺',
      reviewRequired: true
    });

    const analyzed = harness.service.analyzeAnswers('user_demo', 'brand_demo', automationPackage.packageId);
    const confirmation = analyzed.confirmations[0];

    expect(analyzed).toEqual(expect.objectContaining({ status: 'waiting_confirmation', currentStep: 'answer_analysis' }));
    expect(analyzed.relatedGrowthPlanId).toMatch(/^growth_plan_/);
    expect(confirmation).toEqual(
      expect.objectContaining({
        type: 'analysis_review',
        status: 'pending',
        payload: expect.objectContaining({
          summary: expect.objectContaining({
            testPlanId: expect.any(String),
            sampleCount: 1,
            recommendationRate: 100,
            topOneRate: 0,
            averageAccuracyScore: 55,
            averageCitationScore: 0,
            competitorSuppressionCount: 1,
            citationGapCount: 1,
            riskReviewCount: 1,
            unknownReviewCount: 1,
            contentGaps: expect.arrayContaining(['增加官网 FAQ、媒体报道或社媒引用来源', '统一审慎表达，降低高风险承诺被复述'])
          }),
          reviewItems: [expect.objectContaining({ runId, suggestedAction: expect.stringContaining('审慎改法') })]
        })
      })
    );

    const continued = harness.confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', automationPackage.packageId, confirmation?.confirmationId ?? '', {
      action: 'approve',
      decision: '确认分析判断可用于内容生成'
    });

    expect(continued).toEqual(expect.objectContaining({ status: 'running', currentStep: 'content_generation', relatedGrowthPlanId: analyzed.relatedGrowthPlanId }));
  });
});

function executeMockPlan(harness: ReturnType<typeof createHarness>, question: string): { automationPackage: ReturnType<AutomationOrchestratorService['createPackage']>; runId: string } {
  const plan = harness.permissionsRepository.createTestPlan('user_demo', 'brand_demo', {
    name: '自动分析监测计划',
    questions: [{ promptId: 'prompt_demo_comparison', question, purposes: ['brand_mentioned', 'rank_first'], targetPlatforms: ['mock_ai'] }]
  });
  const automationPackage = harness.service.createPackage('user_demo', 'brand_demo');
  harness.automationRepository.updatePackage('brand_demo', automationPackage.packageId, {
    ...automationPackage,
    status: 'running',
    currentStep: 'test_plan_execution',
    relatedTestPlanId: plan?.id
  });
  const executed = harness.service.executeTestPlan('user_demo', 'brand_demo', automationPackage.packageId);
  const runId = executed.stepSummaries.find((step) => step.code === 'answer_analysis')?.relatedEntityIds.find((id) => id.startsWith('run_'));

  if (!runId) {
    throw new Error('Expected mock test plan execution to create a monitoring run');
  }

  return { automationPackage: executed, runId };
}

function createHarness(): {
  service: AutomationOrchestratorService;
  automationRepository: AutomationRepository;
  permissionsRepository: PermissionsRepository;
  confirmationQueue: ConfirmationQueueService;
} {
  const automationRepository = new AutomationRepository();
  const permissionsRepository = new PermissionsRepository();
  const confirmationQueue = new ConfirmationQueueService(automationRepository, permissionsRepository);
  const questionPoolService = new QuestionPoolService(
    automationRepository,
    permissionsRepository,
    new TestThemeService(),
    new TestQuestionService(),
    confirmationQueue
  );

  return {
    service: new AutomationOrchestratorService(automationRepository, permissionsRepository, confirmationQueue, questionPoolService),
    automationRepository,
    permissionsRepository,
    confirmationQueue
  };
}
