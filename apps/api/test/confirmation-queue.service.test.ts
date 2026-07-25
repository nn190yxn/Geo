import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AutomationOrchestratorService } from '../src/modules/automation/automation-orchestrator.service';
import { AutomationRepository } from '../src/modules/automation/automation.repository';
import { ConfirmationQueueService, type CreateConfirmationInput } from '../src/modules/automation/confirmation-queue.service';
import { QuestionPoolService } from '../src/modules/automation/question-pool.service';
import { TestQuestionService } from '../src/modules/brands/test-question.service';
import { TestThemeService } from '../src/modules/brands/test-theme.service';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('ConfirmationQueueService', () => {
  it('creates all supported confirmation types as pending blockers', () => {
    const { automationService, confirmationQueue } = createServices();
    const automationPackage = automationService.createPackage('user_demo', 'brand_demo');
    const confirmationTypes = ['test_questions', 'analysis_review', 'content_review', 'platform_rewrite_review', 'publishing_suggestion', 'manual_test_required'] as const;

    const confirmations = confirmationTypes.map((type) => confirmationQueue.createConfirmation('user_demo', 'brand_demo', automationPackage.packageId, createInput(type)));

    expect(confirmations).toHaveLength(6);
    expect(confirmationQueue.listPending('user_demo', 'brand_demo').map((item) => item.type)).toEqual(expect.arrayContaining([...confirmationTypes]));
    expect(() => confirmationQueue.assertNoBlockingPendingConfirmations('brand_demo', automationPackage.packageId)).toThrow(BadRequestException);
  });

  it('supports approve, edit, regenerate and skip actions', () => {
    const { automationService, confirmationQueue, repository } = createServices();
    const automationPackage = automationService.createPackage('user_demo', 'brand_demo');
    const approved = confirmationQueue.createConfirmation('user_demo', 'brand_demo', automationPackage.packageId, createInput('analysis_review'));
    const edited = confirmationQueue.createConfirmation('user_demo', 'brand_demo', automationPackage.packageId, createInput('content_review'));
    const regenerated = confirmationQueue.createConfirmation('user_demo', 'brand_demo', automationPackage.packageId, createInput('platform_rewrite_review'));
    const skipped = confirmationQueue.createConfirmation('user_demo', 'brand_demo', automationPackage.packageId, createInput('publishing_suggestion'));

    confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', automationPackage.packageId, approved.confirmationId, { action: 'approve', decision: '确认通过' });
    confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', automationPackage.packageId, edited.confirmationId, { action: 'edit', payload: { title: '用户编辑后的标题' } });
    confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', automationPackage.packageId, regenerated.confirmationId, { action: 'regenerate', decision: '重新生成内容' });
    const resolvedPackage = confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', automationPackage.packageId, skipped.confirmationId, { action: 'skip' });

    const confirmations = repository.listConfirmations('brand_demo', automationPackage.packageId);
    expect(confirmations).toContainEqual(expect.objectContaining({ confirmationId: approved.confirmationId, status: 'approved', decision: '确认通过' }));
    expect(confirmations).toContainEqual(expect.objectContaining({ confirmationId: edited.confirmationId, status: 'edited', payload: expect.objectContaining({ editedPayload: { title: '用户编辑后的标题' } }) }));
    expect(confirmations).toContainEqual(expect.objectContaining({ confirmationId: regenerated.confirmationId, status: 'regenerate_requested' }));
    expect(confirmations).toContainEqual(expect.objectContaining({ confirmationId: skipped.confirmationId, status: 'skipped' }));
    expect(resolvedPackage.status).toBe('running');
  });

  it('keeps automation blocked while required confirmations are pending', () => {
    const { automationService, confirmationQueue } = createServices();
    const automationPackage = automationService.createPackage('user_demo', 'brand_demo');
    const first = confirmationQueue.createConfirmation('user_demo', 'brand_demo', automationPackage.packageId, createInput('analysis_review'));
    confirmationQueue.createConfirmation('user_demo', 'brand_demo', automationPackage.packageId, createInput('content_review'));

    const resolved = confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', automationPackage.packageId, first.confirmationId, { action: 'approve' });

    expect(resolved.status).toBe('waiting_confirmation');
    expect(() => automationService.requestRegeneration('user_demo', 'brand_demo', automationPackage.packageId)).toThrow(BadRequestException);
  });

  it('binds selected generated questions to an existing prompt before creating the test plan', async () => {
    const { automationService, confirmationQueue, repository, permissionsRepository } = createServices();
    const automationPackage = automationService.createPackage('user_demo', 'brand_demo');
    const started = await automationService.startPackage('user_demo', 'brand_demo', automationPackage.packageId);
    const confirmation = started.confirmations.find((item) => item.type === 'test_questions');

    const resolved = confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', automationPackage.packageId, confirmation?.confirmationId ?? '', { action: 'approve' });
    const plan = permissionsRepository.listTestPlans('user_demo', 'brand_demo')?.find((item) => item.id === resolved.relatedTestPlanId);
    const selectedCandidateIds = repository
      .listConfirmations('brand_demo', automationPackage.packageId)
      .find((item) => item.confirmationId === confirmation?.confirmationId)
      ?.payload.selectedCandidateIds;
    const selectedCandidates = permissionsRepository
      .listTestQuestionCandidates('user_demo', 'brand_demo')
      ?.filter((candidate) => Array.isArray(selectedCandidateIds) && selectedCandidateIds.includes(candidate.id));

    expect(resolved).toEqual(expect.objectContaining({ status: 'running', currentStep: 'test_plan_execution', relatedTestPlanId: expect.any(String) }));
    expect(plan?.questions).toHaveLength(6);
    expect(plan?.questions.every((question) => question.promptId)).toBe(true);
    expect(selectedCandidates?.every((candidate) => candidate.promptId)).toBe(true);
  });

  it('rejects confirmation queue access for users without brand access', () => {
    const { automationService, confirmationQueue } = createServices();
    const automationPackage = automationService.createPackage('user_demo', 'brand_demo');

    expect(() => confirmationQueue.listPending('user_suspended', 'brand_demo')).toThrow(NotFoundException);
    expect(() => confirmationQueue.createConfirmation('user_suspended', 'brand_demo', automationPackage.packageId, createInput('analysis_review'))).toThrow(NotFoundException);
  });
});

function createServices() {
  const repository = new AutomationRepository();
  const permissionsRepository = new PermissionsRepository();
  const confirmationQueue = new ConfirmationQueueService(repository, permissionsRepository);
  const questionPoolService = new QuestionPoolService(repository, permissionsRepository, new TestThemeService(), new TestQuestionService(), confirmationQueue);
  const automationService = new AutomationOrchestratorService(repository, permissionsRepository, confirmationQueue, questionPoolService);

  return { automationService, confirmationQueue, permissionsRepository, repository };
}

function createInput(type: CreateConfirmationInput['type']): CreateConfirmationInput {
  return {
    type,
    title: `确认 ${type}`,
    impact: '影响说明',
    recommendation: '处理建议',
    evidenceSummary: '依据摘要',
    payload: { type }
  };
}
