import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AutomationOrchestratorService } from '../src/modules/automation/automation-orchestrator.service';
import { AutomationRepository } from '../src/modules/automation/automation.repository';
import { ConfirmationQueueService } from '../src/modules/automation/confirmation-queue.service';
import { QuestionPoolService } from '../src/modules/automation/question-pool.service';
import { TestQuestionService } from '../src/modules/brands/test-question.service';
import { TestThemeService } from '../src/modules/brands/test-theme.service';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('Automation test plan execution', () => {
  it('executes API test plans and moves packages to answer analysis', () => {
    const harness = createHarness();
    const plan = harness.permissionsRepository.createTestPlan('user_demo', 'brand_demo', {
      name: 'API 自动执行计划',
      questions: [
        {
          promptId: 'prompt_demo_comparison',
          question: '贵阳有哪些适合儿童的运动成长机构？',
          purposes: ['brand_mentioned', 'rank_first'],
          targetPlatforms: ['mock_ai']
        }
      ]
    });
    const automationPackage = harness.service.createPackage('user_demo', 'brand_demo');
    harness.automationRepository.updatePackage('brand_demo', automationPackage.packageId, {
      ...automationPackage,
      status: 'running',
      currentStep: 'test_plan_execution',
      relatedTestPlanId: plan?.id
    });

    const executed = harness.service.executeTestPlan('user_demo', 'brand_demo', automationPackage.packageId);

    expect(executed).toEqual(expect.objectContaining({ status: 'running', currentStep: 'answer_analysis' }));
    expect(executed.confirmations).toEqual([]);
    expect(executed.stepSummaries).toContainEqual(
      expect.objectContaining({
        code: 'test_plan_execution',
        status: 'completed',
        message: expect.stringContaining('API 运行 1 个'),
        relatedEntityIds: expect.arrayContaining([plan?.id, expect.stringMatching(/^run_/)])
      })
    );
    expect(executed.stepSummaries).toContainEqual(
      expect.objectContaining({ code: 'answer_analysis', status: 'running', relatedEntityIds: expect.arrayContaining([expect.stringMatching(/^run_/)]) })
    );
    expect(harness.permissionsRepository.listAuditLogs('user_demo', { action: 'automation.test_plan.execute' })).toContainEqual(
      expect.objectContaining({ brandId: 'brand_demo', resourceId: automationPackage.packageId, result: 'success' })
    );
  });

  it('creates manual confirmation when browser, manual or configuration work remains', () => {
    const harness = createHarness();
    const plan = harness.permissionsRepository.createTestPlan('user_demo', 'brand_demo', {
      name: '人工确认执行计划',
      questions: [
        {
          question: '贵阳儿童运动机构怎么选？',
          purposes: ['brand_mentioned'],
          targetPlatforms: ['doubao', 'manual_input', 'unconfigured_ai']
        }
      ]
    });
    const automationPackage = harness.service.createPackage('user_demo', 'brand_demo');
    harness.automationRepository.updatePackage('brand_demo', automationPackage.packageId, {
      ...automationPackage,
      status: 'running',
      currentStep: 'test_plan_execution',
      relatedTestPlanId: plan?.id
    });

    const executed = harness.service.executeTestPlan('user_demo', 'brand_demo', automationPackage.packageId);

    expect(executed).toEqual(expect.objectContaining({ status: 'waiting_confirmation', currentStep: 'test_plan_execution' }));
    expect(executed.confirmations).toContainEqual(
      expect.objectContaining({
        type: 'manual_test_required',
        status: 'pending',
        payload: expect.objectContaining({
          testPlanId: plan?.id,
          blockingSteps: expect.arrayContaining([
            expect.objectContaining({ platformCode: 'doubao', status: 'needs_confirmation' }),
            expect.objectContaining({ platformCode: 'manual_input', status: 'manual_required' }),
            expect.objectContaining({ platformCode: 'unconfigured_ai', status: 'needs_configuration' })
          ]),
          manualRequiredCount: 1,
          browserPendingCount: 1,
          configurationItemCount: 1
        })
      })
    );
    const executionStep = executed.stepSummaries.find((step) => step.code === 'test_plan_execution');
    expect(executionStep).toEqual(expect.objectContaining({
      status: 'waiting_confirmation',
      relatedConfirmationIds: [executed.confirmations[0]?.confirmationId]
    }));
    expect(executionStep?.message).toContain('浏览器待处理 1 个');
    expect(executionStep?.message).toContain('手动处理 1 个');
  });

  it('requires confirmation instead of generating fake browser answers', () => {
    const harness = createHarness();
    const plan = harness.permissionsRepository.createTestPlan('user_demo', 'brand_demo', {
      name: '浏览器真实回填计划',
      questions: [
        {
          promptId: 'prompt_demo_comparison',
          question: '贵阳儿童运动机构怎么选？',
          purposes: ['brand_mentioned'],
          targetPlatforms: ['kimi']
        }
      ]
    });
    const automationPackage = harness.service.createPackage('user_demo', 'brand_demo');
    harness.automationRepository.updatePackage('brand_demo', automationPackage.packageId, {
      ...automationPackage,
      status: 'running',
      currentStep: 'test_plan_execution',
      relatedTestPlanId: plan?.id
    });

    const executed = harness.service.executeTestPlan('user_demo', 'brand_demo', automationPackage.packageId);

    expect(executed).toEqual(expect.objectContaining({ status: 'waiting_confirmation', currentStep: 'test_plan_execution' }));
    expect(executed.confirmations).toContainEqual(
      expect.objectContaining({
        type: 'manual_test_required',
        status: 'pending',
        payload: expect.objectContaining({
          blockingSteps: [expect.objectContaining({
            platformCode: 'kimi',
            status: 'needs_confirmation',
            message: expect.stringContaining('尚未接入真实回答回填')
          })]
        })
      })
    );
    expect(executed.stepSummaries).toContainEqual(
      expect.objectContaining({
        code: 'test_plan_execution',
        status: 'waiting_confirmation',
        message: expect.stringContaining('浏览器队列 0 个')
      })
    );
    expect(executed.stepSummaries).toContainEqual(
      expect.objectContaining({ code: 'answer_analysis', status: 'pending' })
    );
    expect(harness.permissionsRepository.listTestPlans('user_demo', 'brand_demo')?.find((item) => item.id === plan?.id)?.monitoringRunIds).toEqual([]);
    expect(() => harness.confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', executed.packageId, executed.confirmations[0]?.confirmationId ?? '', {
      action: 'approve',
      decision: '确认继续'
    })).toThrow(BadRequestException);
  });

  it('requires a related test plan before executing', () => {
    const harness = createHarness();
    const automationPackage = harness.service.createPackage('user_demo', 'brand_demo');

    expect(() => harness.service.executeTestPlan('user_demo', 'brand_demo', automationPackage.packageId)).toThrow(NotFoundException);
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
