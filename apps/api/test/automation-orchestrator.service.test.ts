import { NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AutomationOrchestratorService } from '../src/modules/automation/automation-orchestrator.service';
import { AutomationRepository } from '../src/modules/automation/automation.repository';
import { ConfirmationQueueService } from '../src/modules/automation/confirmation-queue.service';
import { QuestionPoolService } from '../src/modules/automation/question-pool.service';
import { TestQuestionService } from '../src/modules/brands/test-question.service';
import { TestThemeService } from '../src/modules/brands/test-theme.service';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('AutomationOrchestratorService', () => {
  it('creates automation packages with brand context and audit records', () => {
    const repository = new PermissionsRepository();
    const service = createService(repository);

    const automationPackage = service.createPackage('user_demo', 'brand_demo', { goal: '完成本轮追光小牛 AI 回复监测' });

    expect(automationPackage).toEqual(
      expect.objectContaining({
        brandId: 'brand_demo',
        status: 'draft',
        currentStep: 'context_collection',
        goal: '完成本轮追光小牛 AI 回复监测',
        targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
        context: expect.objectContaining({ brandName: '追光小牛', questionPoolSize: expect.any(Number), testPlanCount: expect.any(Number) })
      })
    );
    expect(automationPackage.stepSummaries[0]).toEqual(expect.objectContaining({ code: 'context_collection', status: 'running' }));
    expect(repository.listAuditLogs('user_demo', { action: 'automation.package.create' })).toContainEqual(
      expect.objectContaining({ brandId: 'brand_demo', resourceId: automationPackage.packageId, result: 'success' })
    );
  });

  it('starts packages and creates a pending confirmation for selected questions', async () => {
    const service = createService();
    const automationPackage = service.createPackage('user_demo', 'brand_demo');

    const started = await service.startPackage('user_demo', 'brand_demo', automationPackage.packageId);

    expect(started.status).toBe('waiting_confirmation');
    expect(started.currentStep).toBe('test_question_confirmation');
    expect(started.confirmations).toContainEqual(
      expect.objectContaining({
        type: 'test_questions',
        status: 'pending',
        payload: expect.objectContaining({ selectedQuestionCount: 6, selectedCandidateIds: expect.any(Array) })
      })
    );
    expect(started.stepSummaries).toContainEqual(
      expect.objectContaining({ code: 'test_question_confirmation', status: 'waiting_confirmation', relatedConfirmationIds: [started.confirmations[0]?.confirmationId] })
    );
  });

  it('moves packages to stopped and failed terminal states', () => {
    const service = createService();
    const automationPackage = service.createPackage('user_demo', 'brand_demo');

    const failed = service.markStepFailed('user_demo', 'brand_demo', automationPackage.packageId, 'test_plan_execution', '平台需要人工确认');
    const stopped = service.stopPackage('user_demo', 'brand_demo', automationPackage.packageId);

    expect(failed).toEqual(expect.objectContaining({ status: 'failed', currentStep: 'test_plan_execution' }));
    expect(failed.stepSummaries).toContainEqual(expect.objectContaining({ code: 'test_plan_execution', status: 'failed', message: '平台需要人工确认' }));
    expect(stopped.status).toBe('stopped');
  });

  it('rejects automation package access for users without brand access', () => {
    const service = createService();

    expect(() => service.createPackage('user_suspended', 'brand_demo')).toThrow(NotFoundException);
    expect(() => service.listPackages('user_suspended', 'brand_demo')).toThrow(NotFoundException);
  });
});

function createService(permissionsRepository = new PermissionsRepository()): AutomationOrchestratorService {
  const automationRepository = new AutomationRepository();
  const confirmationQueue = new ConfirmationQueueService(automationRepository, permissionsRepository);
  const questionPoolService = new QuestionPoolService(
    automationRepository,
    permissionsRepository,
    new TestThemeService(),
    new TestQuestionService(),
    confirmationQueue
  );

  return new AutomationOrchestratorService(automationRepository, permissionsRepository, confirmationQueue, questionPoolService);
}
