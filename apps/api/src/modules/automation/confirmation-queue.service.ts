import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AutomationConfirmation,
  AutomationConfirmationAction,
  AutomationConfirmationType,
  AutomationPackage,
  AutomationStepCode,
  AutomationStepSummary,
  BrandId,
  BrandPrompt,
  TestQuestionCandidate
} from '@geo-platform/shared-types';
import { PERMISSIONS_REPOSITORY, type PermissionsRepositoryPort } from '../permissions/permissions.repository.port';
import { AUTOMATION_REPOSITORY, type AutomationRepositoryPort } from './automation.repository.port';

export type CreateConfirmationInput = {
  type: AutomationConfirmationType;
  title: string;
  impact: string;
  recommendation: string;
  evidenceSummary: string;
  payload?: Record<string, unknown>;
  stepCode?: AutomationStepCode;
};

export type ResolveConfirmationInput = {
  action: AutomationConfirmationAction;
  decision?: string;
  payload?: Record<string, unknown>;
};

const confirmationStepMap: Record<AutomationConfirmationType, AutomationStepCode> = {
  test_questions: 'test_question_confirmation',
  analysis_review: 'answer_analysis',
  content_review: 'content_confirmation',
  platform_rewrite_review: 'platform_rewrite',
  publishing_suggestion: 'publishing_suggestion',
  manual_test_required: 'test_plan_execution'
};

const statusByAction: Record<AutomationConfirmationAction, AutomationConfirmation['status']> = {
  approve: 'approved',
  edit: 'edited',
  regenerate: 'regenerate_requested',
  skip: 'skipped'
};

@Injectable()
export class ConfirmationQueueService {
  constructor(
    @Inject(AUTOMATION_REPOSITORY) private readonly automationRepository: AutomationRepositoryPort,
    @Inject(PERMISSIONS_REPOSITORY) private readonly permissionsRepository: PermissionsRepositoryPort
  ) {}

  listPending(_userId: string, brandId: BrandId): AutomationConfirmation[] {
    this.assertBrandAccess(_userId, brandId);
    return this.automationRepository
      .listPackages(brandId)
      .flatMap((automationPackage) => this.automationRepository.listConfirmations(brandId, automationPackage.packageId))
      .filter((confirmation) => confirmation.status === 'pending')
      .sort((first, second) => first.confirmationId.localeCompare(second.confirmationId));
  }

  createConfirmation(userId: string, brandId: BrandId, packageId: string, input: CreateConfirmationInput): AutomationConfirmation {
    this.assertBrandAccess(userId, brandId);
    const automationPackage = this.getPackage(brandId, packageId);
    const now = new Date().toISOString();
    const confirmation = this.automationRepository.createConfirmation({
      confirmationId: `auto_confirm_${randomUUID()}`,
      packageId,
      brandId,
      type: input.type,
      status: 'pending',
      title: input.title,
      impact: input.impact,
      recommendation: input.recommendation,
      evidenceSummary: input.evidenceSummary,
      payload: input.payload ?? {}
    });
    const stepCode = input.stepCode ?? confirmationStepMap[input.type];
    const updatedPackage = markStepWaiting(automationPackage, stepCode, confirmation.confirmationId, now);

    this.automationRepository.updatePackage(brandId, packageId, updatedPackage);
    this.audit(userId, brandId, 'automation.confirmation.create', confirmation.confirmationId, { packageId, type: input.type });
    return confirmation;
  }

  resolveConfirmation(userId: string, brandId: BrandId, packageId: string, confirmationId: string, input: ResolveConfirmationInput): AutomationPackage {
    this.assertBrandAccess(userId, brandId);
    const automationPackage = this.getPackage(brandId, packageId);
    const confirmation = this.automationRepository.getConfirmation(brandId, packageId, confirmationId);

    if (!confirmation) {
      throw new NotFoundException('确认事项不存在或当前用户无权访问');
    }

    if (confirmation.status !== 'pending') {
      throw new BadRequestException('确认事项已经处理');
    }

    if (confirmation.type === 'manual_test_required' && input.action !== 'regenerate') {
      this.assertManualTestResultsReady(userId, brandId, confirmation);
    }

    const now = new Date().toISOString();
    const resolved = this.automationRepository.updateConfirmation(brandId, packageId, confirmationId, {
      ...confirmation,
      status: statusByAction[input.action],
      payload: input.payload ? { ...confirmation.payload, editedPayload: input.payload } : confirmation.payload,
      decision: input.decision ?? input.action,
      decidedBy: userId,
      decidedAt: now
    });

    if (!resolved) {
      throw new NotFoundException('确认事项不存在或当前用户无权访问');
    }

    const updatedPackage = this.applyConfirmationAction(brandId, automationPackage, resolved, input.action, now);
    this.automationRepository.updatePackage(brandId, packageId, updatedPackage);
    this.audit(userId, brandId, 'automation.confirmation.resolve', confirmationId, { packageId, action: input.action, type: confirmation.type });
    return updatedPackage;
  }

  hasBlockingPendingConfirmations(brandId: BrandId, packageId: string): boolean {
    return this.automationRepository.listConfirmations(brandId, packageId).some((confirmation) => confirmation.status === 'pending');
  }

  assertNoBlockingPendingConfirmations(brandId: BrandId, packageId: string): void {
    if (this.hasBlockingPendingConfirmations(brandId, packageId)) {
      throw new BadRequestException('仍有待确认事项，请处理后再继续自动化流程');
    }
  }

  private applyConfirmationAction(
    brandId: BrandId,
    automationPackage: AutomationPackage,
    confirmation: AutomationConfirmation,
    action: AutomationConfirmationAction,
    now: string
  ): AutomationPackage {
    const stepCode = confirmationStepMap[confirmation.type];

    if (action === 'regenerate') {
      return updatePackageStep(automationPackage, 'question_pool_update', 'running', now, {
        status: 'running',
        currentStep: 'question_pool_update'
      });
    }

    if (confirmation.type === 'test_questions' && (action === 'approve' || action === 'edit')) {
      const candidateIds = resolveSelectedCandidateIds(confirmation.payload, action);
      const platformCodes = resolveTargetPlatforms(confirmation.payload);
      this.ensureSelectedQuestionPromptBindings(confirmation.decidedBy ?? '', brandId, candidateIds, platformCodes);
      const plan = this.permissionsRepository.createTestPlan(confirmation.decidedBy ?? '', brandId, {
        name: '本轮 AI 自动监测计划',
        candidateIds,
        platformCodes
      });

      if (!plan) {
        throw new BadRequestException('精选监测问题无法保存为监测计划');
      }

      return updatePackageStep({ ...automationPackage, relatedTestPlanId: plan.id }, 'test_question_confirmation', 'completed', now, {
        status: 'running',
        currentStep: 'test_plan_execution'
      });
    }

    const hasBlockingPending = this.automationRepository
      .listConfirmations(brandId, automationPackage.packageId)
      .some((item) => item.status === 'pending' && item.confirmationId !== confirmation.confirmationId);

    if (hasBlockingPending) {
      return { ...automationPackage, updatedAt: now };
    }

    return updatePackageStep(automationPackage, stepCode, action === 'skip' ? 'skipped' : 'completed', now, {
      status: 'running',
      currentStep: getNextStep(stepCode)
    });
  }

  private getPackage(brandId: BrandId, packageId: string): AutomationPackage {
    const automationPackage = this.automationRepository.getPackage(brandId, packageId);

    if (!automationPackage) {
      throw new NotFoundException('自动化任务包不存在或当前用户无权访问');
    }

    return automationPackage;
  }

  private assertBrandAccess(userId: string, brandId: BrandId): void {
    if (!this.permissionsRepository.canAccessBrand(userId, brandId)) {
      throw new NotFoundException('品牌不存在或当前用户无权访问');
    }
  }

  private audit(userId: string, brandId: BrandId, action: string, resourceId: string, metadata: Record<string, unknown>): void {
    this.permissionsRepository.createAuditLog(userId, {
      brandId,
      organizationId: null,
      actorUserId: userId,
      action,
      resourceType: 'automation_confirmation',
      resourceId,
      result: 'success',
      metadata
    });
  }

  private ensureSelectedQuestionPromptBindings(userId: string, brandId: BrandId, candidateIds: string[], platformCodes: string[]): void {
    const prompts = this.permissionsRepository.listBrandPrompts(userId, brandId)?.filter((prompt) => prompt.enabled) ?? [];
    if (prompts.length === 0) return;

    const candidates = this.permissionsRepository.listTestQuestionCandidates(userId, brandId) ?? [];
    const candidateById = new Map(candidates.map((candidate) => [candidate.id, candidate]));

    candidateIds.forEach((candidateId) => {
      const candidate = candidateById.get(candidateId);
      if (!candidate || hasUsablePrompt(candidate, prompts, platformCodes)) return;

      const prompt = selectPromptForPlatforms(prompts, candidate.targetPlatforms.length ? candidate.targetPlatforms : platformCodes);
      if (!prompt) return;

      this.permissionsRepository.updateTestQuestionCandidate(userId, brandId, candidateId, { promptId: prompt.id });
    });
  }

  private assertManualTestResultsReady(userId: string, brandId: BrandId, confirmation: AutomationConfirmation): void {
    const testPlanId = typeof confirmation.payload.testPlanId === 'string' ? confirmation.payload.testPlanId : '';
    const testPlan = this.permissionsRepository.listTestPlans(userId, brandId)?.find((plan) => plan.id === testPlanId);

    if (!testPlan || testPlan.monitoringRunIds.length === 0) {
      throw new BadRequestException('本轮监测还没有真实回答结果。请先到“AI 回复监测”页面手动录入回答，或接入真实浏览器回填后再继续分析。');
    }
  }
}

function markStepWaiting(automationPackage: AutomationPackage, stepCode: AutomationStepCode, confirmationId: string, now: string): AutomationPackage {
  return {
    ...automationPackage,
    status: 'waiting_confirmation',
    currentStep: stepCode,
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) =>
      step.code === stepCode
        ? {
            ...step,
            status: 'waiting_confirmation',
            message: '等待品牌方确认后继续。',
            startedAt: step.startedAt ?? now,
            relatedConfirmationIds: unique([...step.relatedConfirmationIds, confirmationId])
          }
        : step
    )
  };
}

function updatePackageStep(
  automationPackage: AutomationPackage,
  stepCode: AutomationStepCode,
  stepStatus: AutomationStepSummary['status'],
  now: string,
  packagePatch: Pick<AutomationPackage, 'status' | 'currentStep'>
): AutomationPackage {
  return {
    ...automationPackage,
    ...packagePatch,
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) =>
      step.code === stepCode
        ? {
            ...step,
            status: stepStatus,
            message: stepStatus === 'completed' ? '确认已处理，自动化流程继续。' : step.message,
            completedAt: stepStatus === 'completed' || stepStatus === 'skipped' ? now : step.completedAt
          }
        : step
    )
  };
}

function getNextStep(stepCode: AutomationStepCode): AutomationStepCode {
  const order: AutomationStepCode[] = [
    'context_collection',
    'question_pool_update',
    'question_selection',
    'test_question_confirmation',
    'test_plan_execution',
    'answer_analysis',
    'content_generation',
    'platform_rewrite',
    'content_confirmation',
    'publishing_suggestion',
    'retest_suggestion',
    'completed'
  ];
  const index = order.indexOf(stepCode);
  return order[Math.min(index + 1, order.length - 1)] ?? 'completed';
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values));
}

function resolveSelectedCandidateIds(payload: Record<string, unknown>, action: AutomationConfirmationAction): string[] {
  const editedPayload = isRecord(payload.editedPayload) ? payload.editedPayload : null;
  const source = action === 'edit' && editedPayload ? editedPayload : payload;
  const candidateIds = Array.isArray(source.selectedCandidateIds) ? source.selectedCandidateIds.filter((item): item is string => typeof item === 'string') : [];

  return candidateIds.slice(0, 6);
}

function resolveTargetPlatforms(payload: Record<string, unknown>): string[] {
  const selectedQuestions = Array.isArray(payload.selectedQuestions) ? payload.selectedQuestions : [];
  const platforms = selectedQuestions.flatMap((question) => {
    if (!isRecord(question) || !Array.isArray(question.targetPlatforms)) {
      return [];
    }

    return question.targetPlatforms.filter((platform): platform is string => typeof platform === 'string');
  });

  return unique(platforms.length ? platforms : ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']);
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasUsablePrompt(candidate: TestQuestionCandidate, prompts: BrandPrompt[], platformCodes: string[]): boolean {
  if (!candidate.promptId) return false;

  const prompt = prompts.find((item) => item.id === candidate.promptId);
  if (!prompt) return false;

  return platformCodes.every((platformCode) => prompt.platformCodes.includes(platformCode));
}

function selectPromptForPlatforms(prompts: BrandPrompt[], platformCodes: string[]): BrandPrompt | null {
  return prompts
    .map((prompt) => ({
      prompt,
      score: platformCodes.filter((platformCode) => prompt.platformCodes.includes(platformCode)).length
    }))
    .filter((item) => item.score > 0)
    .sort((first, second) => second.score - first.score)[0]?.prompt ?? null;
}
