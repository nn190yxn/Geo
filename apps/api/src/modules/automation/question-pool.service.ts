import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AutomationPackage,
  BrandDetail,
  BrandId,
  BrandProfile,
  TestAssetGenerationResult,
  TestQuestionCandidate,
  TestQuestionCandidateInput,
  TestQuestionPoolAngle,
  TestQuestionPoolSource,
  TestQuestionPoolItem,
  SearchDemandSource,
  TestTheme
} from '@geo-platform/shared-types';
import { normalizeQuestionText, TestQuestionService } from '../brands/test-question.service';
import { TestThemeService } from '../brands/test-theme.service';
import { PERMISSIONS_REPOSITORY, type PermissionsRepositoryPort } from '../permissions/permissions.repository.port';
import { AUTOMATION_REPOSITORY, type AutomationRepositoryPort } from './automation.repository.port';
import { ConfirmationQueueService } from './confirmation-queue.service';

const selectedQuestionCount = 6;

export type ConfirmedSearchDemandQuestionInput = {
  question: string;
  seedTerm: string;
  market: string;
  source: SearchDemandSource;
  snapshotId: string;
  candidateId: string;
};

@Injectable()
export class QuestionPoolService {
  constructor(
    @Inject(AUTOMATION_REPOSITORY) private readonly automationRepository: AutomationRepositoryPort,
    @Inject(PERMISSIONS_REPOSITORY) private readonly permissionsRepository: PermissionsRepositoryPort,
    private readonly testThemeService: TestThemeService,
    private readonly testQuestionService: TestQuestionService,
    private readonly confirmationQueue: ConfirmationQueueService
  ) {}

  async prepareRoundQuestions(userId: string, brandId: BrandId, packageId: string): Promise<AutomationPackage> {
    const automationPackage = this.getPackage(brandId, packageId);
    const brand = this.permissionsRepository.listAccessibleBrandDetails(userId).find((item) => item.brandId === brandId);
    const profile = this.permissionsRepository.getBrandProfile(userId, brandId);

    if (!brand || !profile) {
      throw new NotFoundException('品牌档案不存在或当前用户无权访问');
    }

    const themes = await this.ensureThemes(userId, brandId, brand, profile);
    const generated = await this.ensureQuestionCandidates(userId, brandId, brand, profile, themes);
    const candidates = this.permissionsRepository.listTestQuestionCandidates(userId, brandId) ?? [];
    const questionPool = this.syncQuestionPool(brandId, candidates, generated.source === 'llm' ? 'llm' : 'rule_template');
    const selected = selectRoundQuestions(candidates, selectedQuestionCount);

    if (selected.length === 0) {
      throw new BadRequestException('当前品牌还没有可用于本轮监测的问题');
    }

    this.confirmationQueue.createConfirmation(userId, brandId, packageId, {
      type: 'test_questions',
      title: '请确认本轮精选监测问题',
      impact: '这组问题会决定本轮 AI 回复监测覆盖的用户意图和平台回答样本。',
      recommendation: '建议保留 5 到 6 个问题，并覆盖品牌认知、本地推荐、课程适配、购买决策和风险表达。',
      evidenceSummary: `系统已维护 ${questionPool.length} 个监测问题，并为本轮精选 ${selected.length} 个问题。`,
      payload: {
        questionPoolSize: questionPool.length,
        selectedQuestionCount: selected.length,
        selectedCandidateIds: selected.map((candidate) => candidate.id),
        selectedQuestions: selected.map(toConfirmationQuestion),
        generationSource: generated.source,
        generationNotes: generated.generationNotes,
        missingProfileFields: generated.missingProfileFields,
        nextPoolTriggers: ['new_profile_source', 'test_result_gap', 'competitor_change', 'published_content', 'retest_result']
      },
      stepCode: 'test_question_confirmation'
    });

    const updated = updateQuestionPreparationSteps(this.getPackage(brandId, packageId));
    this.automationRepository.updatePackage(brandId, packageId, updated);
    this.audit(userId, brandId, 'automation.question_pool.prepare', packageId, {
      questionPoolSize: questionPool.length,
      selectedQuestionCount: selected.length,
      generationSource: generated.source
    });
    return updated;
  }

  addConfirmedSearchDemandQuestion(userId: string, brandId: BrandId, input: ConfirmedSearchDemandQuestionInput): TestQuestionPoolItem {
    const brand = this.permissionsRepository.listAccessibleBrandDetails(userId).find((item) => item.brandId === brandId);
    if (!brand) throw new NotFoundException('品牌不存在或当前用户无权访问');
    const themeName = `搜索需求：${input.seedTerm}（${input.market}）`;
    const themes = this.permissionsRepository.listTestThemes(userId, brandId) ?? [];
    const theme = themes.find((item) => item.name === themeName) ?? this.permissionsRepository.createTestTheme(userId, brandId, {
      type: 'category',
      name: themeName,
      businessExplanation: `追踪${input.market}市场中“${input.seedTerm}”相关搜索需求。`,
      priority: 'medium',
      estimatedValue: '用于发现新出现的搜索问法并进入后续 AI 回复监测。',
      enabled: true,
      sourceProfileFields: []
    });
    if (!theme) throw new NotFoundException('搜索需求监测方向创建失败');

    const normalized = normalizeQuestionText(input.question);
    const candidates = this.permissionsRepository.listTestQuestionCandidates(userId, brandId) ?? [];
    const existingCandidate = candidates.find((candidate) => normalizeQuestionText(candidate.question) === normalized);
    const candidate = existingCandidate ?? this.permissionsRepository.createTestQuestionCandidate(userId, brandId, {
      themeId: theme.id,
      question: input.question,
      promptKind: 'discovery',
      purposes: ['brand_mentioned', 'competitor_presence'],
      targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qwen', 'stepfun'],
      priority: 'medium',
      estimatedValue: '搜索补全需求候选，确认后纳入稳定监测问题库。',
      discoveryDimension: 'category',
      businessValue: 'medium',
      recommendationProbability: 0.6,
      userStage: 'awareness',
      generationRationale: `${input.source} 搜索补全快照 ${input.snapshotId}`,
      generationMethod: 'deterministic',
      mergedFrom: [`search-demand:${input.candidateId}`],
      editable: true,
      selected: false
    });
    if (!candidate) throw new NotFoundException('搜索需求监测问题创建失败');

    const source: TestQuestionPoolSource = input.source === 'manual' ? 'manual_import' : 'search_autocomplete';
    const existingPoolItem = this.automationRepository.listQuestionPoolItems(brandId).find((item) => normalizeQuestionText(item.question) === normalized);
    const now = new Date().toISOString();
    const poolItem = existingPoolItem
      ? this.automationRepository.updateQuestionPoolItem(brandId, existingPoolItem.poolItemId, { ...existingPoolItem, candidateId: existingPoolItem.candidateId ?? candidate.id, updatedAt: now }) ?? existingPoolItem
      : this.automationRepository.createQuestionPoolItem({
        poolItemId: `pool_item_${randomUUID()}`,
        brandId,
        question: input.question,
        angle: 'category',
        purposes: candidate.purposes,
        targetPlatforms: candidate.targetPlatforms,
        priority: candidate.priority,
        estimatedValue: candidate.estimatedValue,
        source,
        status: 'candidate',
        candidateId: candidate.id,
        createdAt: now,
        updatedAt: now
      });
    const sourceExists = this.automationRepository.listQuestionSourceRecords(brandId, poolItem.poolItemId).some((record) => record.sourceId === input.candidateId);
    if (!sourceExists) {
      this.automationRepository.createQuestionSourceRecord({
        sourceRecordId: `question_source_${randomUUID()}`,
        poolItemId: poolItem.poolItemId,
        brandId,
        sourceType: source,
        sourceId: input.candidateId,
        summary: `由${input.source}搜索补全快照“${input.seedTerm}”人工确认入库`,
        createdAt: now
      });
    }
    return poolItem;
  }

  private async ensureThemes(userId: string, brandId: BrandId, brand: BrandDetail, profile: BrandProfile): Promise<TestTheme[]> {
    const existing = this.permissionsRepository.listTestThemes(userId, brandId) ?? [];
    const existingKeys = new Set(existing.map((theme) => `${theme.type}:${theme.name}`));
    const generated = await this.testThemeService.generateThemesWithLLM(userId, brandId, brand, profile);
    const created = generated.items
      .filter((theme) => !existingKeys.has(`${theme.type}:${theme.name}`))
      .map((theme) => this.permissionsRepository.createTestTheme(userId, brandId, theme))
      .filter((theme): theme is TestTheme => Boolean(theme));

    return [...created, ...existing].filter((theme) => theme.enabled);
  }

  private async ensureQuestionCandidates(
    userId: string,
    brandId: BrandId,
    brand: BrandDetail,
    profile: BrandProfile,
    themes: TestTheme[]
  ): Promise<TestAssetGenerationResult<TestQuestionCandidateInput>> {
    const existing = this.permissionsRepository.listTestQuestionCandidates(userId, brandId) ?? [];
    const existingKeys = new Set(existing.map((candidate) => normalizeQuestionText(candidate.question)));
    const generated = await this.testQuestionService.generateCandidatesWithLLM(userId, brandId, brand, profile, themes);

    generated.items
      .filter((candidate) => !existingKeys.has(normalizeQuestionText(candidate.question)))
      .forEach((candidate) => this.permissionsRepository.createTestQuestionCandidate(userId, brandId, { ...candidate, selected: false }));

    return generated;
  }

  private getPackage(brandId: BrandId, packageId: string): AutomationPackage {
    const automationPackage = this.automationRepository.getPackage(brandId, packageId);

    if (!automationPackage) {
      throw new NotFoundException('自动化任务包不存在或当前用户无权访问');
    }

    return automationPackage;
  }

  private syncQuestionPool(brandId: BrandId, candidates: TestQuestionCandidate[], source: TestQuestionPoolSource) {
    const existing = this.automationRepository.listQuestionPoolItems(brandId);
    const existingByCandidateId = new Map(existing.filter((item) => item.candidateId).map((item) => [item.candidateId, item]));
    const existingByQuestion = new Map(existing.map((item) => [normalizeQuestionText(item.question), item]));
    const now = new Date().toISOString();

    candidates.forEach((candidate) => {
      const candidateSource = candidate.generationMethod === 'ai' || candidate.generationMethod === 'merged' ? 'llm' : source;
      const existingItem = existingByCandidateId.get(candidate.id) ?? existingByQuestion.get(normalizeQuestionText(candidate.question));
      if (existingItem) {
        const updated = {
          ...existingItem,
          candidateId: existingItem.candidateId ?? candidate.id,
          purposes: candidate.purposes,
          targetPlatforms: candidate.targetPlatforms,
          priority: candidate.priority,
          estimatedValue: candidate.estimatedValue,
          status: candidate.selected ? 'selected' as const : existingItem.status,
          updatedAt: now
        };
        this.automationRepository.updateQuestionPoolItem(brandId, updated.poolItemId, updated);
        return;
      }

      const poolItem = {
        poolItemId: `pool_item_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        brandId,
        question: candidate.question,
        angle: inferQuestionAngle(candidate),
        purposes: candidate.purposes,
        targetPlatforms: candidate.targetPlatforms,
        priority: candidate.priority,
        estimatedValue: candidate.estimatedValue,
        source: candidateSource,
        status: candidate.selected ? 'selected' as const : 'candidate' as const,
        candidateId: candidate.id,
        createdAt: now,
        updatedAt: now
      };
      this.automationRepository.createQuestionPoolItem(poolItem);
      this.automationRepository.createQuestionSourceRecord({
        sourceRecordId: `question_source_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        poolItemId: poolItem.poolItemId,
        brandId,
        sourceType: candidateSource,
        sourceId: candidate.id,
        summary: `由监测问题候选同步：${candidate.question}`,
        createdAt: now
      });
    });

    return this.automationRepository.listQuestionPoolItems(brandId);
  }

  private audit(userId: string, brandId: BrandId, action: string, resourceId: string, metadata: Record<string, unknown>): void {
    this.permissionsRepository.createAuditLog(userId, {
      brandId,
      organizationId: null,
      actorUserId: userId,
      action,
      resourceType: 'automation_question_pool',
      resourceId,
      result: 'success',
      metadata
    });
  }
}

function selectRoundQuestions(pool: TestQuestionCandidate[], limit: number): TestQuestionCandidate[] {
  const sorted = [...pool].sort((first, second) => priorityScore(second.priority) - priorityScore(first.priority) || first.createdAt.localeCompare(second.createdAt));
  const selected: TestQuestionCandidate[] = [];
  const usedThemes = new Set<string>();
  const usedQuestions = new Set<string>();

  for (const candidate of sorted) {
    if (selected.length >= limit) break;
    if (usedThemes.has(candidate.themeId)) continue;
    if (usedQuestions.has(normalizeQuestionText(candidate.question))) continue;
    selected.push(candidate);
    usedThemes.add(candidate.themeId);
    usedQuestions.add(normalizeQuestionText(candidate.question));
  }

  for (const candidate of sorted) {
    if (selected.length >= limit) break;
    if (selected.some((item) => item.id === candidate.id)) continue;
    if (usedQuestions.has(normalizeQuestionText(candidate.question))) continue;
    selected.push(candidate);
    usedQuestions.add(normalizeQuestionText(candidate.question));
  }

  return selected;
}

function priorityScore(priority: TestQuestionCandidate['priority']): number {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function toConfirmationQuestion(candidate: TestQuestionCandidate): Record<string, unknown> {
  return {
    candidateId: candidate.id,
    themeId: candidate.themeId,
    question: candidate.question,
    purposes: candidate.purposes,
    targetPlatforms: candidate.targetPlatforms,
    priority: candidate.priority,
    estimatedValue: candidate.estimatedValue
  };
}

function inferQuestionAngle(candidate: TestQuestionCandidate): TestQuestionPoolAngle {
  const text = `${candidate.themeId} ${candidate.question} ${candidate.purposes.join(' ')}`;
  if (text.includes('competitor') || text.includes('竞品') || text.includes('对比')) return 'competitor';
  if (text.includes('location') || text.includes('本地') || text.includes('贵阳')) return 'local';
  if (text.includes('audience') || text.includes('岁') || text.includes('孩子')) return 'audience';
  if (text.includes('pain') || text.includes('风险') || text.includes('痛点')) return 'pain_point';
  if (text.includes('course') || text.includes('课程') || text.includes('体能')) return 'course';
  if (text.includes('decision') || text.includes('选择') || text.includes('怎么选')) return 'buying_decision';
  if (text.includes('gap') || text.includes('缺口')) return 'content_gap';
  if (text.includes('retest') || text.includes('复测')) return 'retest';
  if (text.includes('category') || text.includes('品类')) return 'category';
  return 'brand';
}

function updateQuestionPreparationSteps(automationPackage: AutomationPackage): AutomationPackage {
  const now = new Date().toISOString();
  const completedSteps = new Set(['question_pool_update', 'question_selection']);

  return {
    ...automationPackage,
    status: 'waiting_confirmation',
    currentStep: 'test_question_confirmation',
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) => {
      if (completedSteps.has(step.code)) {
        return {
          ...step,
          status: 'completed',
          message: step.code === 'question_pool_update' ? '监测问题池已更新。' : '本轮精选问题已生成。',
          startedAt: step.startedAt ?? now,
          completedAt: now
        };
      }

      return step;
    })
  };
}
