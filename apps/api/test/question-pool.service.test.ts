import { describe, expect, it, vi } from 'vitest';
import { AutomationOrchestratorService } from '../src/modules/automation/automation-orchestrator.service';
import { AutomationRepository } from '../src/modules/automation/automation.repository';
import { ConfirmationQueueService } from '../src/modules/automation/confirmation-queue.service';
import { QuestionPoolService } from '../src/modules/automation/question-pool.service';
import { TestQuestionService } from '../src/modules/brands/test-question.service';
import { TestThemeService } from '../src/modules/brands/test-theme.service';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('QuestionPoolService', () => {
  it('updates the question pool and selects six Supercalf questions for confirmation', async () => {
    const { automationService, permissionsRepository } = createServices();
    const automationPackage = automationService.createPackage('user_demo', 'brand_demo');

    const started = await automationService.startPackage('user_demo', 'brand_demo', automationPackage.packageId);

    const pool = permissionsRepository.listTestQuestionCandidates('user_demo', 'brand_demo') ?? [];
    const confirmation = started.confirmations.find((item) => item.type === 'test_questions');
    expect(pool.length).toBeGreaterThanOrEqual(6);
    expect(started.stepSummaries).toContainEqual(expect.objectContaining({ code: 'question_pool_update', status: 'completed' }));
    expect(started.stepSummaries).toContainEqual(expect.objectContaining({ code: 'question_selection', status: 'completed' }));
    expect(confirmation).toEqual(
      expect.objectContaining({
        status: 'pending',
        payload: expect.objectContaining({
          questionPoolSize: expect.any(Number),
          selectedQuestionCount: 6,
          selectedCandidateIds: expect.arrayContaining([expect.any(String)]),
          selectedQuestions: expect.arrayContaining([expect.objectContaining({ question: expect.stringContaining('追光小牛') })])
        })
      })
    );
    const selectedQuestions = getSelectedQuestionTexts(confirmation?.payload);
    expect(new Set(selectedQuestions).size).toBe(selectedQuestions.length);
  });

  it('does not select duplicate question text from different themes', async () => {
    const testQuestionService = new TestQuestionService();
    vi.spyOn(testQuestionService, 'generateCandidatesWithLLM').mockResolvedValue({
      items: [],
      missingProfileFields: [],
      generationNotes: [],
      source: 'fallback'
    });
    const { automationService, permissionsRepository } = createServices(testQuestionService);
    const existingCandidates = permissionsRepository.listTestQuestionCandidates('user_demo', 'brand_demo') ?? [];
    existingCandidates.forEach((candidate) => {
      permissionsRepository.updateTestQuestionCandidate('user_demo', 'brand_demo', candidate.id, { priority: 'low' });
    });
    const firstDuplicate = permissionsRepository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: 'theme_demo_local_recommendation',
      question: '如果要选择追光小牛，需要重点了解哪些信息？',
      purposes: ['brand_mentioned'],
      targetPlatforms: ['doubao'],
      priority: 'high',
      estimatedValue: '验证购买决策问题。',
      editable: true,
      selected: false
    });
    const secondDuplicate = permissionsRepository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: 'theme_demo_age_group',
      question: '如果要选择追光小牛，需要重点了解哪些信息?',
      purposes: ['value_prop_accuracy'],
      targetPlatforms: ['kimi'],
      priority: 'high',
      estimatedValue: '验证重复问题去重。',
      editable: true,
      selected: false
    });
    expect(firstDuplicate).not.toBeNull();
    expect(secondDuplicate).not.toBeNull();
    const automationPackage = automationService.createPackage('user_demo', 'brand_demo');

    const started = await automationService.startPackage('user_demo', 'brand_demo', automationPackage.packageId);
    const confirmation = started.confirmations.find((item) => item.type === 'test_questions');
    const selectedQuestions = getSelectedQuestionTexts(confirmation?.payload);

    expect(selectedQuestions.filter((question) => question.replace(/[？?]/g, '') === '如果要选择追光小牛，需要重点了解哪些信息')).toHaveLength(1);
  });

  it('selects newly generated questions when a brand starts without candidates', async () => {
    const { automationService, permissionsRepository } = createServices();
    const automationPackage = automationService.createPackage('user_demo', 'brand_child_fitness');
    const existing = permissionsRepository.listTestQuestionCandidates('user_demo', 'brand_child_fitness') ?? [];

    expect(existing).toHaveLength(0);

    const started = await automationService.startPackage('user_demo', 'brand_child_fitness', automationPackage.packageId);
    const generated = permissionsRepository.listTestQuestionCandidates('user_demo', 'brand_child_fitness') ?? [];
    const confirmation = started.confirmations.find((item) => item.type === 'test_questions');

    expect(generated.length).toBeGreaterThan(0);
    expect(started.status).toBe('waiting_confirmation');
    expect(confirmation).toEqual(
      expect.objectContaining({
        payload: expect.objectContaining({
          selectedQuestionCount: generated.length,
          selectedCandidateIds: expect.arrayContaining(generated.map((candidate) => candidate.id))
        })
      })
    );
  });

  it('creates a test plan after selected questions are approved', async () => {
    const { automationService, confirmationQueue, permissionsRepository } = createServices();
    const automationPackage = automationService.createPackage('user_demo', 'brand_demo');
    const started = await automationService.startPackage('user_demo', 'brand_demo', automationPackage.packageId);
    const confirmation = started.confirmations.find((item) => item.type === 'test_questions');

    if (!confirmation) {
      throw new Error('Expected test question confirmation');
    }

    const resolved = confirmationQueue.resolveConfirmation('user_demo', 'brand_demo', automationPackage.packageId, confirmation.confirmationId, { action: 'approve' });
    const plans = permissionsRepository.listTestPlans('user_demo', 'brand_demo') ?? [];

    expect(resolved).toEqual(expect.objectContaining({ status: 'running', currentStep: 'test_plan_execution', relatedTestPlanId: expect.any(String) }));
    expect(plans).toContainEqual(expect.objectContaining({ id: resolved.relatedTestPlanId, questions: expect.arrayContaining([expect.objectContaining({ question: expect.any(String) })]) }));
  });
});

function createServices(testQuestionService = new TestQuestionService()) {
  const automationRepository = new AutomationRepository();
  const permissionsRepository = new PermissionsRepository();
  const confirmationQueue = new ConfirmationQueueService(automationRepository, permissionsRepository);
  const questionPoolService = new QuestionPoolService(
    automationRepository,
    permissionsRepository,
    new TestThemeService(),
    testQuestionService,
    confirmationQueue
  );
  const automationService = new AutomationOrchestratorService(automationRepository, permissionsRepository, confirmationQueue, questionPoolService);

  return { automationService, confirmationQueue, permissionsRepository };
}

function getSelectedQuestionTexts(payload: unknown): string[] {
  if (!payload || typeof payload !== 'object' || !('selectedQuestions' in payload) || !Array.isArray(payload.selectedQuestions)) {
    return [];
  }

  return payload.selectedQuestions
    .map((item) => (item && typeof item === 'object' && 'question' in item ? item.question : null))
    .filter((question): question is string => typeof question === 'string');
}
