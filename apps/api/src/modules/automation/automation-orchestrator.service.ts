import { BadRequestException, Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type {
  AutomationConfirmation,
  AutomationAnalysisSummary,
  AutomationPackage,
  AutomationPackageSource,
  AutomationPublishingPlatform,
  AutomationStepCode,
  AutomationStepStatus,
  AutomationStepSummary,
  ContentGenerationTask,
  ContentGenerationWorkspace,
  ContentVersion,
  BeginnerFriendlyPlatform,
  BrandId,
  AnalysisResult,
  MonitoringRunDetail,
  PlatformRewriteVersion,
  PublishingRecord,
  RetestResultInput,
  TestPlanExecutionResult,
  TestPlanExecutionStep
} from '@geo-platform/shared-types';
import { ContentGenerationWorker, type GeneratedContentDraft } from '../content/content-generation.worker';
import { PERMISSIONS_REPOSITORY, type PermissionsRepositoryPort } from '../permissions/permissions.repository.port';
import { AUTOMATION_REPOSITORY, type AutomationRepositoryPort } from './automation.repository.port';
import { ConfirmationQueueService } from './confirmation-queue.service';
import { PlatformRewriteService } from './platform-rewrite.service';
import { QuestionPoolService } from './question-pool.service';

export type CreateAutomationPackageInput = {
  goal?: string;
  source?: AutomationPackageSource;
  targetPlatforms?: Array<BeginnerFriendlyPlatform | string>;
  targetPublishingPlatforms?: AutomationPublishingPlatform[];
};

type AutomationPackageDetail = AutomationPackage & {
  confirmations: AutomationConfirmation[];
  context: {
    brandName?: string;
    completenessScore?: number;
    questionPoolSize: number;
    testPlanCount: number;
  };
};

const stepDefinitions: Array<{ code: AutomationStepCode; title: string }> = [
  { code: 'context_collection', title: '读取品牌资料' },
  { code: 'question_pool_update', title: '维护监测问题池' },
  { code: 'question_selection', title: '精选本轮问题' },
  { code: 'test_question_confirmation', title: '确认监测问题' },
  { code: 'test_plan_execution', title: '执行 AI 回复监测' },
  { code: 'answer_analysis', title: '分析监测结果' },
  { code: 'content_generation', title: '生成优化内容' },
  { code: 'platform_rewrite', title: '按平台改写' },
  { code: 'content_confirmation', title: '确认发布内容' },
  { code: 'publishing_suggestion', title: '生成发布建议' },
  { code: 'retest_suggestion', title: '安排复测' },
  { code: 'completed', title: '完成任务包' }
];

@Injectable()
export class AutomationOrchestratorService {
  constructor(
    @Inject(AUTOMATION_REPOSITORY) private readonly automationRepository: AutomationRepositoryPort,
    @Inject(PERMISSIONS_REPOSITORY) private readonly permissionsRepository: PermissionsRepositoryPort,
    private readonly confirmationQueue: ConfirmationQueueService,
    private readonly questionPoolService: QuestionPoolService,
    @Optional() private readonly contentGenerationWorker?: ContentGenerationWorker,
    @Optional() private readonly platformRewriteService?: PlatformRewriteService
  ) {}

  createPackage(userId: string, brandId: BrandId, input: CreateAutomationPackageInput = {}): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    const now = new Date().toISOString();
    const automationPackage: AutomationPackage = {
      packageId: `auto_pkg_${randomUUID()}`,
      brandId,
      status: 'draft',
      source: input.source ?? 'brand_workspace',
      goal: input.goal ?? '自动完成本轮 AI 回复监测、分析、内容生成和发布建议',
      targetPlatforms: input.targetPlatforms ?? ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
      targetPublishingPlatforms: input.targetPublishingPlatforms ?? ['zhihu', 'baijiahao', 'xiaohongshu', 'wechat_official', 'official_site_faq'],
      currentStep: 'context_collection',
      stepSummaries: createInitialSteps(now),
      relatedContentTaskIds: [],
      relatedPublishingRecordIds: [],
      createdBy: userId,
      createdAt: now,
      updatedAt: now
    };

    const created = this.automationRepository.createPackage(automationPackage);
    this.audit(userId, brandId, 'automation.package.create', created.packageId, { source: created.source });
    return this.toDetail(userId, brandId, created);
  }

  listPackages(userId: string, brandId: BrandId): AutomationPackageDetail[] {
    this.assertBrandAccess(userId, brandId);
    return this.automationRepository.listPackages(brandId).map((item) => this.toDetail(userId, brandId, item));
  }

  getPackage(userId: string, brandId: BrandId, packageId: string): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    const automationPackage = this.automationRepository.getPackage(brandId, packageId);

    if (!automationPackage) {
      throw new NotFoundException('自动化任务包不存在或当前用户无权访问');
    }

    return this.toDetail(userId, brandId, automationPackage);
  }

  async startPackage(userId: string, brandId: BrandId, packageId: string): Promise<AutomationPackageDetail> {
    this.assertBrandAccess(userId, brandId);
    const automationPackage = this.getExistingPackage(brandId, packageId);
    const now = new Date().toISOString();
    const updated = updateStep(automationPackage, 'context_collection', 'completed', now, {
      status: 'running',
      currentStep: 'question_pool_update'
    });

    this.automationRepository.updatePackage(brandId, packageId, updated);
    const nextPackage = await this.questionPoolService.prepareRoundQuestions(userId, brandId, packageId);
    this.audit(userId, brandId, 'automation.package.start', packageId, { currentStep: nextPackage.currentStep });
    return this.toDetail(userId, brandId, nextPackage);
  }

  stopPackage(userId: string, brandId: BrandId, packageId: string): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    const automationPackage = this.getExistingPackage(brandId, packageId);
    const updated = { ...automationPackage, status: 'stopped' as const, updatedAt: new Date().toISOString() };

    this.automationRepository.updatePackage(brandId, packageId, updated);
    this.audit(userId, brandId, 'automation.package.stop', packageId, {});
    return this.toDetail(userId, brandId, updated);
  }

  markStepFailed(userId: string, brandId: BrandId, packageId: string, stepCode: AutomationStepCode, errorMessage: string): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    const automationPackage = this.getExistingPackage(brandId, packageId);
    const now = new Date().toISOString();
    const updated = updateStep(automationPackage, stepCode, 'failed', now, { status: 'failed', currentStep: stepCode }, errorMessage);

    this.automationRepository.updatePackage(brandId, packageId, updated);
    this.audit(userId, brandId, 'automation.step.fail', packageId, { stepCode, errorMessage });
    return this.toDetail(userId, brandId, updated);
  }

  requestRegeneration(userId: string, brandId: BrandId, packageId: string, reason?: string): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    this.confirmationQueue.assertNoBlockingPendingConfirmations(brandId, packageId);
    const automationPackage = this.getExistingPackage(brandId, packageId);
    const now = new Date().toISOString();
    const updated = updateStep(automationPackage, 'question_pool_update', 'running', now, {
      status: 'running',
      currentStep: 'question_pool_update'
    });

    this.automationRepository.updatePackage(brandId, packageId, updated);
    this.audit(userId, brandId, 'automation.package.regenerate', packageId, { reason: reason ?? null });
    return this.toDetail(userId, brandId, updated);
  }

  executeTestPlan(userId: string, brandId: BrandId, packageId: string): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    this.confirmationQueue.assertNoBlockingPendingConfirmations(brandId, packageId);
    const automationPackage = this.getExistingPackage(brandId, packageId);

    if (!automationPackage.relatedTestPlanId) {
      throw new NotFoundException('自动化任务包还没有关联监测计划');
    }

    const result = this.permissionsRepository.executeTestPlan(userId, brandId, automationPackage.relatedTestPlanId);

    if (!result) {
      throw new NotFoundException('监测计划不存在或当前用户无权访问');
    }

    const now = new Date().toISOString();
    const blockingSteps = collectBlockingExecutionSteps(result);
    const executionMessage = getExecutionMessage(result);
    const updated = updateExecutionStep(automationPackage, result, blockingSteps, now, executionMessage);

    this.automationRepository.updatePackage(brandId, packageId, updated);

    if (blockingSteps.length > 0) {
      this.confirmationQueue.createConfirmation(userId, brandId, packageId, {
        type: 'manual_test_required',
        title: '请处理需要人工确认的监测项',
        impact: '这些监测项暂时无法自动完成，会影响本轮 AI 回复样本完整性。',
        recommendation: '建议先按平台提示完成登录、配置或手动录入回答，再继续后续分析。',
        evidenceSummary: `本轮监测有 ${blockingSteps.length} 个监测项需要人工处理。`,
        payload: {
          testPlanId: result.plan.id,
          blockingSteps: blockingSteps.map(toExecutionStepPayload),
          apiRunCount: result.apiRuns.length,
          browserQueuedCount: result.browserSteps.filter((step) => step.status === 'queued').length,
          browserPendingCount: result.browserSteps.filter((step) => step.status !== 'queued').length,
          manualRequiredCount: result.manualSteps.length,
          configurationItemCount: result.configurationItems.length
        },
        stepCode: 'test_plan_execution'
      });
      const waitingPackage = this.automationRepository.getPackage(brandId, packageId);

      if (waitingPackage) {
        this.automationRepository.updatePackage(brandId, packageId, {
          ...waitingPackage,
          stepSummaries: waitingPackage.stepSummaries.map((step) =>
            step.code === 'test_plan_execution'
              ? { ...step, message: executionMessage, relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, result.plan.id])) }
              : step
          )
        });
      }
    }

    const stored = this.automationRepository.getPackage(brandId, packageId) ?? updated;
    this.audit(userId, brandId, 'automation.test_plan.execute', packageId, {
      testPlanId: result.plan.id,
      status: result.status,
      apiRunCount: result.apiRuns.length,
      browserStepCount: result.browserSteps.length,
      manualStepCount: result.manualSteps.length,
      configurationItemCount: result.configurationItems.length
    });
    return this.toDetail(userId, brandId, stored);
  }

  analyzeAnswers(userId: string, brandId: BrandId, packageId: string): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    this.confirmationQueue.assertNoBlockingPendingConfirmations(brandId, packageId);
    const automationPackage = this.getExistingPackage(brandId, packageId);

    if (!automationPackage.relatedTestPlanId) {
      throw new NotFoundException('自动化任务包还没有关联监测计划');
    }

    const testPlan = this.permissionsRepository
      .listTestPlans(userId, brandId)
      ?.find((plan) => plan.id === automationPackage.relatedTestPlanId);

    if (!testPlan) {
      throw new NotFoundException('监测计划不存在或当前用户无权访问');
    }

    const analysisItems = testPlan.monitoringRunIds
      .map((runId) => {
        const run = this.permissionsRepository.getMonitoringRun(userId, brandId, runId);
        const analysis = this.permissionsRepository.getAnalysisResult(userId, brandId, runId) ?? this.permissionsRepository.parseAnalysisResult(userId, brandId, runId);
        return run && analysis ? { run, analysis } : null;
      })
      .filter((item): item is { run: MonitoringRunDetail; analysis: AnalysisResult } => Boolean(item));

    if (analysisItems.length === 0) {
      throw new NotFoundException('当前监测计划还没有可分析回答');
    }

    const growthPlan = this.permissionsRepository.generateGrowthOptimizationPlan(userId, brandId, testPlan.id);
    const summary = buildAnalysisSummary(testPlan.id, analysisItems, growthPlan?.id);
    const now = new Date().toISOString();
    const reviewItems = buildAnalysisReviewItems(analysisItems);
    const updated = updateAnalysisStep(automationPackage, summary, reviewItems.length, now);

    this.automationRepository.updatePackage(brandId, packageId, growthPlan ? { ...updated, relatedGrowthPlanId: growthPlan.id } : updated);

    if (reviewItems.length > 0) {
      this.confirmationQueue.createConfirmation(userId, brandId, packageId, {
        type: 'analysis_review',
        title: '请确认本轮 AI 回复监测判断',
        impact: '这些判断会作为后续内容生成和复测建议的依据。',
        recommendation: '建议重点确认风险表达、无法判断字段、竞品压制和引用缺口，再继续生成内容。',
        evidenceSummary: `本轮 ${summary.sampleCount} 条回答中，有 ${reviewItems.length} 条需要确认。`,
        payload: {
          summary,
          reviewItems,
          growthPlanId: growthPlan?.id
        },
        stepCode: 'answer_analysis'
      });
    }

    const stored = this.automationRepository.getPackage(brandId, packageId) ?? updated;
    this.audit(userId, brandId, 'automation.answers.analyze', packageId, {
      testPlanId: testPlan.id,
      growthPlanId: growthPlan?.id ?? null,
      sampleCount: summary.sampleCount,
      reviewItemCount: reviewItems.length
    });
    return this.toDetail(userId, brandId, stored);
  }

  async generateContent(userId: string, brandId: BrandId, packageId: string): Promise<AutomationPackageDetail> {
    this.assertBrandAccess(userId, brandId);
    this.confirmationQueue.assertNoBlockingPendingConfirmations(brandId, packageId);
    const automationPackage = this.getExistingPackage(brandId, packageId);

    if (!automationPackage.relatedGrowthPlanId) {
      throw new NotFoundException('自动化任务包还没有关联增长优化方案');
    }

    const existingTaskIds = new Set(this.permissionsRepository.getContentGenerationWorkspace(userId, brandId)?.tasks.map((task) => task.id) ?? []);
    const workspace = this.permissionsRepository.createContentGenerationTasksFromGrowthPlan(userId, brandId, { planId: automationPackage.relatedGrowthPlanId });

    if (!workspace) {
      throw new NotFoundException('增长优化方案不存在或没有可生成的内容建议');
    }

    const generatedTasks = workspace.tasks.filter((task) => task.growthOptimizationPlanId === automationPackage.relatedGrowthPlanId && !existingTaskIds.has(task.id));
    const processed = await this.processGeneratedContentJobs(userId, brandId, generatedTasks);
    const contentItems = processed.length > 0 ? processed : generatedTasks.map((task) => this.toContentItem(userId, brandId, task));
    const riskItems = contentItems.filter((item) => hasContentRisk(item.version?.title, item.version?.body));
    const now = new Date().toISOString();
    const updated = updateContentGenerationStep(automationPackage, contentItems, riskItems.length, now);

    this.automationRepository.updatePackage(brandId, packageId, updated);

    if (riskItems.length > 0) {
      this.confirmationQueue.createConfirmation(userId, brandId, packageId, {
        type: 'content_review',
        title: '请确认自动生成的内容草稿',
        impact: '这些草稿包含需要确认的表达，直接发布可能影响品牌表达准确性和合规性。',
        recommendation: '建议先确认标题、正文、引用依据、合规说明和复测建议，再进入平台改写。',
        evidenceSummary: `本轮生成 ${contentItems.length} 篇内容，其中 ${riskItems.length} 篇需要确认。`,
        payload: {
          growthPlanId: automationPackage.relatedGrowthPlanId,
          generatedContent: contentItems,
          reviewItems: riskItems
        },
        stepCode: 'content_generation'
      });
    }

    const stored = this.automationRepository.getPackage(brandId, packageId) ?? updated;
    this.audit(userId, brandId, 'automation.content.generate', packageId, {
      growthPlanId: automationPackage.relatedGrowthPlanId,
      contentTaskCount: contentItems.length,
      reviewItemCount: riskItems.length
    });
    return this.toDetail(userId, brandId, stored);
  }

  generatePlatformRewrites(userId: string, brandId: BrandId, packageId: string): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    this.confirmationQueue.assertNoBlockingPendingConfirmations(brandId, packageId);
    const automationPackage = this.getExistingPackage(brandId, packageId);

    if (!this.platformRewriteService) {
      throw new NotFoundException('平台改写服务暂不可用');
    }

    const contentVersions = collectContentVersions(userId, brandId, automationPackage.relatedContentTaskIds, this.permissionsRepository);
    if (contentVersions.length === 0) {
      throw new NotFoundException('自动化任务包还没有可改写的内容版本');
    }

    const targetPlatforms = normalizeTargetPublishingPlatforms(automationPackage.targetPublishingPlatforms);
    const rewrites = contentVersions.flatMap((contentVersion) =>
      targetPlatforms.map((targetPlatform) => this.platformRewriteService!.rewriteContentVersion(brandId, { contentVersion, targetPlatform }))
    );
    const now = new Date().toISOString();
    const updated = updatePlatformRewriteStep(automationPackage, rewrites, now);

    this.automationRepository.updatePackage(brandId, packageId, updated);
    this.confirmationQueue.createConfirmation(userId, brandId, packageId, {
      type: 'platform_rewrite_review',
      title: '请确认各平台改写版本',
      impact: '这些版本会作为后续发布建议和发布待办的基础文案。',
      recommendation: '建议逐个平台确认标题、正文结构、标签、改写说明和合规提示。',
      evidenceSummary: `已生成 ${rewrites.length} 个平台改写版本，覆盖 ${targetPlatforms.join('、')}。`,
      payload: {
        contentVersionIds: contentVersions.map((version) => version.id),
        targetPlatforms,
        rewrites
      },
      stepCode: 'platform_rewrite'
    });

    const stored = this.automationRepository.getPackage(brandId, packageId) ?? updated;
    this.audit(userId, brandId, 'automation.platform_rewrite.generate', packageId, {
      contentVersionCount: contentVersions.length,
      rewriteCount: rewrites.length,
      targetPlatforms
    });
    return this.toDetail(userId, brandId, stored);
  }

  generatePublishingSuggestions(userId: string, brandId: BrandId, packageId: string): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    this.confirmationQueue.assertNoBlockingPendingConfirmations(brandId, packageId);
    const automationPackage = this.getExistingPackage(brandId, packageId);
    const suggestions = buildPublishingSuggestions(userId, brandId, automationPackage, this.automationRepository, this.permissionsRepository);

    if (suggestions.length === 0) {
      throw new NotFoundException('自动化任务包还没有可生成发布建议的平台改写版本');
    }

    const now = new Date().toISOString();
    const updated = updatePublishingSuggestionStep(automationPackage, suggestions, now);

    this.automationRepository.updatePackage(brandId, packageId, updated);
    this.confirmationQueue.createConfirmation(userId, brandId, packageId, {
      type: 'publishing_suggestion',
      title: '请确认本轮发布建议',
      impact: '这些建议会生成发布中心待办，用于跟踪各平台内容发布状态。',
      recommendation: '建议确认发布平台、标题、正文和历史发布记录，再创建发布待办。',
      evidenceSummary: `已生成 ${suggestions.length} 条发布建议，覆盖 ${Array.from(new Set(suggestions.map((item) => item.targetPlatformLabel))).join('、')}。`,
      payload: { suggestions },
      stepCode: 'publishing_suggestion'
    });

    const stored = this.automationRepository.getPackage(brandId, packageId) ?? updated;
    this.audit(userId, brandId, 'automation.publishing_suggestion.generate', packageId, {
      suggestionCount: suggestions.length,
      platforms: Array.from(new Set(suggestions.map((item) => item.targetPlatform)))
    });
    return this.toDetail(userId, brandId, stored);
  }

  confirmPublishingSuggestions(
    userId: string,
    brandId: BrandId,
    packageId: string,
    input: { confirmationId: string; payload?: Record<string, unknown>; decision?: string }
  ): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    const confirmation = this.automationRepository.getConfirmation(brandId, packageId, input.confirmationId);

    if (!confirmation) {
      throw new NotFoundException('发布建议确认事项不存在或当前用户无权访问');
    }

    if (confirmation.status !== 'pending') {
      throw new BadRequestException('发布建议确认事项已经处理');
    }

    const suggestions = resolvePublishingSuggestions(confirmation?.payload ?? {}, input.payload);

    if (suggestions.length === 0) {
      throw new NotFoundException('发布建议确认事项中没有可创建的发布待办');
    }

    const records = suggestions
      .map((suggestion) => this.permissionsRepository.createPublishingRecord(userId, brandId, {
        brandId,
        strategyId: suggestion.strategyId,
        generationTaskId: suggestion.generationTaskId,
        versionId: suggestion.versionId,
        title: suggestion.title,
        body: suggestion.body,
        targetPlatform: suggestion.targetPlatform,
        contentType: suggestion.contentType,
        targetKeywords: suggestion.targetKeywords,
        status: 'pending'
      }))
      .filter((record): record is PublishingRecord => Boolean(record));

    if (records.length === 0) {
      throw new NotFoundException('发布待办创建失败，请确认内容版本仍然存在');
    }

    const resolvedPackage = this.confirmationQueue.resolveConfirmation(userId, brandId, packageId, input.confirmationId, {
      action: 'approve',
      decision: input.decision ?? '确认创建发布待办',
      payload: input.payload
    });

    const now = new Date().toISOString();
    const updated = updatePublishingRecordsStep(resolvedPackage, records, now);

    this.automationRepository.updatePackage(brandId, packageId, updated);
    this.audit(userId, brandId, 'automation.publishing_suggestion.confirm', packageId, {
      confirmationId: input.confirmationId,
      recordIds: records.map((record) => record.id)
    });
    return this.toDetail(userId, brandId, updated);
  }

  generateRetestSuggestions(userId: string, brandId: BrandId, packageId: string): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    this.confirmationQueue.assertNoBlockingPendingConfirmations(brandId, packageId);
    const automationPackage = this.getExistingPackage(brandId, packageId);

    if (automationPackage.relatedPublishingRecordIds.length === 0) {
      throw new NotFoundException('自动化任务包还没有关联发布待办');
    }

    const sourceRunId = resolveSourceRunId(userId, brandId, automationPackage, this.permissionsRepository);
    const growthPlan = automationPackage.relatedGrowthPlanId
      ? this.permissionsRepository.getGrowthOptimizationWorkspace(userId, brandId)?.plans.find((plan) => plan.id === automationPackage.relatedGrowthPlanId)
      : undefined;
    const retestTask = this.permissionsRepository.createOptimizationTask(userId, brandId, {
      title: '发布后复测 AI 推荐表现',
      type: 'monitoring_issue',
      ownerId: userId,
      growthOptimizationPlanId: automationPackage.relatedGrowthPlanId,
      sourceRunId,
      priority: growthPlan?.priority ?? 'high',
      dueDate: growthPlan?.retestAt
    });

    if (!retestTask) {
      throw new NotFoundException('复测任务创建失败，请确认本轮监测结果仍然存在');
    }

    const plannedTask = sourceRunId
      ? this.permissionsRepository.planOptimizationTaskRetest(userId, brandId, retestTask.id, {
        sourceRunId,
        retestRunId: sourceRunId,
        plannedAt: growthPlan?.retestAt,
        targetScore: 85,
        notes: '发布完成后复测品牌提及率、第一推荐率、准确分和引用分。'
      }) ?? retestTask
      : retestTask;
    const now = new Date().toISOString();
    const updated = updateRetestSuggestionStep(automationPackage, plannedTask.id, plannedTask.retestRecords[0]?.id, now);

    this.automationRepository.updatePackage(brandId, packageId, updated);
    this.audit(userId, brandId, 'automation.retest_suggestion.generate', packageId, {
      taskId: plannedTask.id,
      retestRecordId: plannedTask.retestRecords[0]?.id ?? null,
      sourceRunId: sourceRunId ?? null
    });
    return this.toDetail(userId, brandId, updated);
  }

  completeRetest(userId: string, brandId: BrandId, packageId: string, taskId: string, recordId: string, input: RetestResultInput): AutomationPackageDetail {
    this.assertBrandAccess(userId, brandId);
    const automationPackage = this.getExistingPackage(brandId, packageId);
    const task = this.permissionsRepository.completeOptimizationTaskRetest(userId, brandId, taskId, recordId, input);

    if (!task) {
      throw new NotFoundException('复测记录不存在或当前用户无权访问');
    }

    const now = new Date().toISOString();
    const updated = updateRetestCompletedStep(automationPackage, task.id, recordId, now, task.status === 'done');

    this.automationRepository.updatePackage(brandId, packageId, updated);
    this.audit(userId, brandId, 'automation.retest.complete', packageId, {
      taskId: task.id,
      recordId,
      taskStatus: task.status
    });
    return this.toDetail(userId, brandId, updated);
  }

  private async processGeneratedContentJobs(userId: string, brandId: BrandId, tasks: ContentGenerationTask[]): Promise<AutomationContentItem[]> {
    const jobs = this.permissionsRepository.listAsyncJobs(userId, brandId) ?? [];
    const taskIds = new Set(tasks.map((task) => task.id));
    const contentJobs = jobs.filter((job) => job.jobType === 'content_generation' && taskIds.has(job.entityId));
    const items: AutomationContentItem[] = [];

    for (const job of contentJobs) {
      const processed = this.contentGenerationWorker
        ? await this.contentGenerationWorker.processJob(userId, brandId, job.id, buildAutomationDraft)
        : this.permissionsRepository.getContentGenerationWorkspace(userId, brandId, job.entityId);

      const task = processed?.currentTask ?? tasks.find((item) => item.id === job.entityId);
      if (task) {
        items.push(toContentItemFromWorkspace(task, processed));
      }
    }

    return items;
  }

  private toContentItem(userId: string, brandId: BrandId, task: ContentGenerationTask): AutomationContentItem {
    return toContentItemFromWorkspace(task, this.permissionsRepository.getContentGenerationWorkspace(userId, brandId, task.id));
  }

  private getExistingPackage(brandId: BrandId, packageId: string): AutomationPackage {
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

  private toDetail(userId: string, brandId: BrandId, automationPackage: AutomationPackage): AutomationPackageDetail {
    const brandDetail = this.permissionsRepository.getBrandWorkspaceSnapshot(userId, brandId)?.brand;
    const profile = this.permissionsRepository.getBrandProfile(userId, brandId);
    const questionPool = this.permissionsRepository.listTestQuestionCandidates(userId, brandId) ?? [];
    const testPlans = this.permissionsRepository.listTestPlans(userId, brandId) ?? [];

    return {
      ...automationPackage,
      confirmations: this.automationRepository.listConfirmations(brandId, automationPackage.packageId),
      context: {
        brandName: brandDetail?.name,
        completenessScore: profile?.completenessScore,
        questionPoolSize: questionPool.length,
        testPlanCount: testPlans.length
      }
    };
  }

  private audit(userId: string, brandId: BrandId, action: string, resourceId: string, metadata: Record<string, unknown>): void {
    this.permissionsRepository.createAuditLog(userId, {
      brandId,
      organizationId: null,
      actorUserId: userId,
      action,
      resourceType: 'automation_package',
      resourceId,
      result: 'success',
      metadata
    });
  }
}

function createInitialSteps(now: string): AutomationStepSummary[] {
  return stepDefinitions.map((step, index) => ({
    code: step.code,
    status: index === 0 ? 'running' : 'pending',
    title: step.title,
    message: index === 0 ? '正在读取品牌资料、监测问题池和历史任务。' : '等待上一环节完成。',
    startedAt: index === 0 ? now : undefined,
    relatedConfirmationIds: [],
    relatedEntityIds: []
  }));
}

function updateStep(
  automationPackage: AutomationPackage,
  stepCode: AutomationStepCode,
  status: AutomationStepStatus,
  now: string,
  packagePatch: Pick<AutomationPackage, 'status' | 'currentStep'>,
  message?: string
): AutomationPackage {
  return {
    ...automationPackage,
    ...packagePatch,
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) =>
      step.code === stepCode
        ? {
            ...step,
            status,
            message: message ?? step.message,
            startedAt: step.startedAt ?? now,
            completedAt: status === 'completed' || status === 'failed' ? now : step.completedAt
          }
        : step
    )
  };
}

function updateExecutionStep(
  automationPackage: AutomationPackage,
  result: TestPlanExecutionResult,
  blockingSteps: TestPlanExecutionStep[],
  now: string,
  message: string
): AutomationPackage {
  const runIds = [
    ...result.apiRuns.map((run) => run.id),
    ...result.browserSteps.map((step) => step.runId).filter((runId): runId is string => Boolean(runId))
  ];
  const hasRuns = runIds.length > 0;
  const queuedBrowserCount = result.browserSteps.filter((step) => step.status === 'queued').length;
  const isWaitingForBrowserQueue = queuedBrowserCount > 0;
  const status = blockingSteps.length > 0 ? 'waiting_confirmation' : 'running';
  const currentStep = blockingSteps.length > 0 || isWaitingForBrowserQueue ? 'test_plan_execution' : 'answer_analysis';
  return {
    ...automationPackage,
    status,
    currentStep,
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) => {
      if (step.code === 'test_plan_execution') {
        return {
          ...step,
          status: blockingSteps.length > 0 ? 'waiting_confirmation' : isWaitingForBrowserQueue ? 'running' : 'completed',
          message: isWaitingForBrowserQueue ? `${message}，等待浏览器队列执行完成后再进入分析。` : message,
          startedAt: step.startedAt ?? now,
          completedAt: blockingSteps.length === 0 && !isWaitingForBrowserQueue ? now : step.completedAt,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, result.plan.id, ...runIds]))
        };
      }

      if (step.code === 'answer_analysis' && hasRuns && blockingSteps.length === 0 && !isWaitingForBrowserQueue) {
        return {
          ...step,
          status: 'running',
          message: '监测回答已写入，等待汇总运营判断。',
          startedAt: step.startedAt ?? now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, ...runIds]))
        };
      }

      return step;
    })
  };
}

function updateAnalysisStep(automationPackage: AutomationPackage, summary: AutomationAnalysisSummary, reviewItemCount: number, now: string): AutomationPackage {
  const message = [
    `推荐率 ${summary.recommendationRate}%`,
    `第一推荐率 ${summary.topOneRate}%`,
    `准确表达 ${summary.averageAccuracyScore}%`,
    `引用分 ${summary.averageCitationScore}%`,
    `需确认 ${reviewItemCount} 项`
  ].join('，');
  const hasReviewItems = reviewItemCount > 0;

  return {
    ...automationPackage,
    status: hasReviewItems ? 'waiting_confirmation' : 'running',
    currentStep: hasReviewItems ? 'answer_analysis' : 'content_generation',
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) => {
      if (step.code === 'answer_analysis') {
        return {
          ...step,
          status: hasReviewItems ? 'waiting_confirmation' : 'completed',
          message,
          startedAt: step.startedAt ?? now,
          completedAt: hasReviewItems ? step.completedAt : now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, ...summary.relatedRunIds, summary.growthPlanId].filter((id): id is string => Boolean(id))))
        };
      }

      if (step.code === 'content_generation' && !hasReviewItems) {
        return {
          ...step,
          status: 'running',
          message: '分析判断已完成，等待生成可发布内容。',
          startedAt: step.startedAt ?? now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, summary.growthPlanId].filter((id): id is string => Boolean(id))))
        };
      }

      return step;
    })
  };
}

type AutomationContentItem = {
  task: ContentGenerationTask;
  version?: ContentVersion;
  title?: string;
  body?: string;
  suggestedPublishingPlatform: string;
  referenceSources: string[];
  complianceNotes: string[];
  retestSuggestions: string[];
};

function updateContentGenerationStep(automationPackage: AutomationPackage, contentItems: AutomationContentItem[], reviewItemCount: number, now: string): AutomationPackage {
  const relatedIds = contentItems.flatMap((item) => [item.task.id, item.version?.id].filter((id): id is string => Boolean(id)));
  const taskIds = contentItems.map((item) => item.task.id);
  const hasReviewItems = reviewItemCount > 0;
  const message = `已生成 ${contentItems.length} 篇内容，需确认 ${reviewItemCount} 篇。`;

  return {
    ...automationPackage,
    status: hasReviewItems ? 'waiting_confirmation' : 'running',
    currentStep: hasReviewItems ? 'content_generation' : 'platform_rewrite',
    relatedContentTaskIds: Array.from(new Set([...automationPackage.relatedContentTaskIds, ...taskIds])),
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) => {
      if (step.code === 'content_generation') {
        return {
          ...step,
          status: hasReviewItems ? 'waiting_confirmation' : 'completed',
          message,
          startedAt: step.startedAt ?? now,
          completedAt: hasReviewItems ? step.completedAt : now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, ...relatedIds]))
        };
      }

      if (step.code === 'platform_rewrite' && !hasReviewItems) {
        return {
          ...step,
          status: 'running',
          message: '可发布内容已生成，等待按知乎、百家号、小红书、公众号和官网 FAQ 改写。',
          startedAt: step.startedAt ?? now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, ...relatedIds]))
        };
      }

      return step;
    })
  };
}

function updatePlatformRewriteStep(automationPackage: AutomationPackage, rewrites: PlatformRewriteVersion[], now: string): AutomationPackage {
  const rewriteIds = rewrites.map((rewrite) => rewrite.rewriteId);
  const message = `已生成 ${rewrites.length} 个平台改写版本，等待确认。`;

  return {
    ...automationPackage,
    status: 'waiting_confirmation',
    currentStep: 'platform_rewrite',
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) => {
      if (step.code === 'platform_rewrite') {
        return {
          ...step,
          status: 'waiting_confirmation',
          message,
          startedAt: step.startedAt ?? now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, ...rewriteIds]))
        };
      }

      return step;
    })
  };
}

type PublishingSuggestion = {
  rewriteId: string;
  strategyId: string;
  generationTaskId: string;
  versionId: string;
  title: string;
  body: string;
  targetPlatform: string;
  targetPlatformLabel: string;
  contentType: string;
  targetKeywords: string[];
  rewriteNotes: string[];
  complianceNotes: string[];
  historicalRecordCount: number;
  latestHistoricalStatus?: string;
};

function buildPublishingSuggestions(
  userId: string,
  brandId: BrandId,
  automationPackage: AutomationPackage,
  automationRepository: AutomationRepositoryPort,
  permissionsRepository: PermissionsRepositoryPort
): PublishingSuggestion[] {
  const contentVersions = collectContentVersions(userId, brandId, automationPackage.relatedContentTaskIds, permissionsRepository);
  const dashboard = permissionsRepository.getPublishingDashboard(userId, brandId);
  const records = dashboard?.records ?? [];

  return contentVersions.flatMap((version) => {
    const workspace = permissionsRepository.getContentGenerationWorkspace(userId, brandId, version.generationTaskId);
    const task = workspace?.tasks.find((item) => item.id === version.generationTaskId) ?? workspace?.currentTask;
    const rewrites = automationRepository.listRewrites(brandId, version.id);

    if (!task) {
      return [];
    }

    return rewrites.map((rewrite) => {
      const history = records.filter((record) => record.platform === rewrite.targetPlatform || record.generationTaskId === task.id || record.versionId === version.id);
      return {
        rewriteId: rewrite.rewriteId,
        strategyId: task.strategyId,
        generationTaskId: task.id,
        versionId: version.id,
        title: rewrite.title,
        body: rewrite.body,
        targetPlatform: rewrite.targetPlatform,
        targetPlatformLabel: getPublishingPlatformLabel(rewrite.targetPlatform),
        contentType: task.contentType,
        targetKeywords: task.targetKeywords,
        rewriteNotes: rewrite.rewriteNotes,
        complianceNotes: rewrite.complianceNotes,
        historicalRecordCount: history.length,
        latestHistoricalStatus: history[0]?.status
      };
    });
  });
}

function updatePublishingSuggestionStep(automationPackage: AutomationPackage, suggestions: PublishingSuggestion[], now: string): AutomationPackage {
  const rewriteIds = suggestions.map((suggestion) => suggestion.rewriteId);

  return {
    ...automationPackage,
    status: 'waiting_confirmation',
    currentStep: 'publishing_suggestion',
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) => {
      if (step.code === 'publishing_suggestion') {
        return {
          ...step,
          status: 'waiting_confirmation',
          message: `已生成 ${suggestions.length} 条发布建议，等待确认创建发布待办。`,
          startedAt: step.startedAt ?? now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, ...rewriteIds]))
        };
      }

      return step;
    })
  };
}

function resolvePublishingSuggestions(payload: Record<string, unknown>, editedPayload?: Record<string, unknown>): PublishingSuggestion[] {
  const source = editedPayload && Array.isArray(editedPayload.suggestions) ? editedPayload : payload;
  const suggestions = Array.isArray(source.suggestions) ? source.suggestions : [];

  return suggestions.filter(isPublishingSuggestion);
}

function isPublishingSuggestion(value: unknown): value is PublishingSuggestion {
  if (!isRecord(value)) {
    return false;
  }

  return ['strategyId', 'generationTaskId', 'versionId', 'title', 'body', 'targetPlatform', 'contentType']
    .every((key) => typeof value[key] === 'string')
    && Array.isArray(value.targetKeywords);
}

function updatePublishingRecordsStep(automationPackage: AutomationPackage, records: PublishingRecord[], now: string): AutomationPackage {
  const recordIds = records.map((record) => record.id);

  return {
    ...automationPackage,
    status: 'running',
    currentStep: 'retest_suggestion',
    relatedPublishingRecordIds: Array.from(new Set([...automationPackage.relatedPublishingRecordIds, ...recordIds])),
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) => {
      if (step.code === 'publishing_suggestion') {
        return {
          ...step,
          status: 'completed',
          message: `已创建 ${records.length} 条发布待办。`,
          completedAt: now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, ...recordIds]))
        };
      }

      if (step.code === 'retest_suggestion') {
        return {
          ...step,
          status: 'running',
          message: '发布待办已创建，等待安排发布后复测。',
          startedAt: step.startedAt ?? now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, ...recordIds]))
        };
      }

      return step;
    })
  };
}

function resolveSourceRunId(userId: string, brandId: BrandId, automationPackage: AutomationPackage, permissionsRepository: PermissionsRepositoryPort): string | undefined {
  const testPlan = automationPackage.relatedTestPlanId
    ? permissionsRepository.listTestPlans(userId, brandId)?.find((plan) => plan.id === automationPackage.relatedTestPlanId)
    : undefined;
  const runIdFromTestPlan = testPlan?.monitoringRunIds[0];

  if (runIdFromTestPlan) {
    return runIdFromTestPlan;
  }

  const growthPlan = automationPackage.relatedGrowthPlanId
    ? permissionsRepository.getGrowthOptimizationWorkspace(userId, brandId)?.plans.find((plan) => plan.id === automationPackage.relatedGrowthPlanId)
    : undefined;

  return growthPlan?.sourceRunIds[0];
}

function updateRetestSuggestionStep(automationPackage: AutomationPackage, taskId: string, retestRecordId: string | undefined, now: string): AutomationPackage {
  const relatedIds = [taskId, retestRecordId].filter((id): id is string => Boolean(id));

  return {
    ...automationPackage,
    status: 'running',
    currentStep: 'retest_suggestion',
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) => {
      if (step.code === 'retest_suggestion') {
        return {
          ...step,
          status: 'running',
          message: retestRecordId ? '已创建发布后复测任务和复测计划。' : '已创建发布后复测任务，等待补充可复测的监测记录。',
          startedAt: step.startedAt ?? now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, ...relatedIds]))
        };
      }

      return step;
    })
  };
}

function updateRetestCompletedStep(automationPackage: AutomationPackage, taskId: string, recordId: string, now: string, passed: boolean): AutomationPackage {
  return {
    ...automationPackage,
    status: passed ? 'completed' : 'running',
    currentStep: passed ? 'completed' : 'retest_suggestion',
    updatedAt: now,
    stepSummaries: automationPackage.stepSummaries.map((step) => {
      if (step.code === 'retest_suggestion') {
        return {
          ...step,
          status: passed ? 'completed' : 'running',
          message: passed ? '复测结果已回写，任务包完成。' : '复测结果已回写，继续下一轮优化。',
          completedAt: passed ? now : step.completedAt,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, taskId, recordId]))
        };
      }

      if (step.code === 'completed' && passed) {
        return {
          ...step,
          status: 'completed',
          message: '自动化运营闭环已完成。',
          startedAt: step.startedAt ?? now,
          completedAt: now,
          relatedEntityIds: Array.from(new Set([...step.relatedEntityIds, taskId, recordId]))
        };
      }

      return step;
    })
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function collectContentVersions(
  userId: string,
  brandId: BrandId,
  taskIds: string[],
  permissionsRepository: PermissionsRepositoryPort
): ContentVersion[] {
  return taskIds
    .map((taskId) => permissionsRepository.getContentGenerationWorkspace(userId, brandId, taskId)?.currentVersion)
    .filter((version): version is ContentVersion => Boolean(version));
}

function normalizeTargetPublishingPlatforms(platforms: AutomationPublishingPlatform[]): AutomationPublishingPlatform[] {
  const normalized = platforms.length > 0 ? platforms : ['zhihu', 'baijiahao', 'xiaohongshu', 'wechat_official', 'official_site_faq'];
  return Array.from(new Set(normalized.map((platform) => normalizePublishingPlatform(platform))));
}

function normalizePublishingPlatform(platform: AutomationPublishingPlatform): AutomationPublishingPlatform {
  if (platform === 'official_site') return 'official_site_faq';
  if (platform === 'wechat') return 'wechat_official';
  return platform;
}

function toContentItemFromWorkspace(task: ContentGenerationTask, workspace?: ContentGenerationWorkspace | null): AutomationContentItem {
  const version = workspace?.versions.find((item) => item.id === task.draftRef)
    ?? workspace?.versions.find((item) => item.generationTaskId === task.id)
    ?? (workspace?.currentVersion?.generationTaskId === task.id ? workspace.currentVersion : undefined);

  return {
    task,
    version,
    title: version?.title,
    body: version?.body,
    suggestedPublishingPlatform: getPublishingPlatformLabel(task.targetPlatform),
    referenceSources: task.referenceSources,
    complianceNotes: ['发布前核对品牌事实、适用人群、校区信息和高风险承诺表达。'],
    retestSuggestions: [task.retestAt ? `建议在 ${task.retestAt} 后复测对应问题。` : '发布后建议安排下一轮 AI 推荐复测。']
  };
}

function buildAutomationDraft(workspace: ContentGenerationWorkspace): GeneratedContentDraft {
  const task = workspace.currentTask;
  const topic = task?.contentTopic?.trim() || '品牌 AI 推荐内容补强';
  const targetPlatform = task?.targetPlatform ?? 'content_platform';
  const contentType = task?.contentType ?? 'content_draft';
  const keywords = task?.targetKeywords?.length ? task.targetKeywords : ['品牌名称', '核心卖点', '可验证依据'];
  const referenceSources = task?.referenceSources?.length ? task.referenceSources : ['品牌资料库', '本轮 AI 回复监测分析结果'];
  const platformLabel = getPublishingPlatformLabel(targetPlatform);
  const contentTypeLabel = getAutomationContentTypeLabel(contentType);

  if (contentType === 'wechat_article') {
    return {
      title: topic,
      body: [
        `# ${topic}`,
        '',
        '## 家长为什么会关心这个话题',
        `很多贵阳家长在搜索儿童运动课程时，真正想确认的是孩子是否适合、课程是否能长期坚持、品牌资料是否可信。这篇内容面向公众号发布，适合用完整长文把 ${keywords.join('、')} 讲清楚，让家长读完后能形成判断标准。`,
        '',
        '## 选课前先看孩子阶段',
        '2-14 岁孩子的运动基础差异很大，低龄孩子更需要安全感、兴趣和基础动作启蒙，大龄孩子更需要体能储备、专项能力和持续反馈。家长不要只看一节体验课是否热闹，还要看孩子是否愿意参与、动作是否能被观察、教练是否能给出清楚反馈。',
        '',
        '## 再看课程是否有体系',
        '值得长期选择的儿童运动成长课，需要有阶段目标、训练记录和反馈机制。追光小牛可以重点说明 ACE 成长体系：Athleticism 运动能力、Cognition 认知能力、Engagement 参与度。这个框架能帮助家长理解，儿童运动不只是消耗体力，也包括理解、专注、协作和持续参与。',
        '',
        '## 品牌事实',
        '- 追光小牛（SUPERCALF）服务贵阳 2-14 岁儿童家庭。',
        '- 品牌主张“运动成长课是儿童必修课”，核心理念为 BE THE SUPERCALF。',
        '- 课程表达围绕 ACE 成长体系展开，关注运动能力、认知能力和参与度。',
        '- 追光小牛目前在贵阳有 5 家校区，适合希望长期线下训练的家庭了解。',
        '- 联合创始人邓书弟为多届体操世界冠军，适合作为专业背书表达。',
        '',
        '## 家长行动建议',
        '建议家长到店前先问四个问题：第一，孩子这个年龄段对应什么课程目标；第二，体验课后会得到哪些反馈；第三，后续如何安排阶段训练；第四，课程如何兼顾安全、兴趣和能力提升。预约体验时，可以重点观察孩子课堂参与度、教练保护动作、课后沟通质量和校区距离是否适合长期坚持。',
        '',
        '## 引用依据',
        ...referenceSources.map((source) => `- ${source}`),
        '',
        '## 合规说明',
        '- 使用审慎表达，避免绝对化承诺、医疗诊断和升学结果保证。',
        '- 发布前核对课程、校区、师资、年龄段和案例信息。',
        '',
        '## 建议发布平台',
        `- ${platformLabel}`,
        '',
        '## 复测建议',
        `- 发布后用本轮问题池复测 ${platformLabel} 的品牌提及率、第一推荐率、准确分和引用分。`
      ].join('\n')
    };
  }

  if (contentType === 'xiaohongshu_note') {
    return {
      title: `${topic.replace(/[？?]$/, '')}？这份清单给家长参考`,
      body: [
        `很多家长会问：${topic}`,
        '',
        '先给结论：选择儿童运动课程时，重点看孩子是否适合、课程是否有长期规划、品牌依据是否能核实。小红书正文需要更直接，适合用清单方式帮助家长快速收藏和对照。',
        '',
        '一、先看孩子当前阶段',
        '2-14 岁孩子的运动基础差异很大，低龄孩子更需要兴趣、安全感和基础动作启蒙，大龄孩子更需要专项能力、体能储备和持续反馈。家长可以先观察孩子协调性、专注力、力量基础和对集体活动的接受度。',
        '',
        '二、再看课程有没有体系',
        '长期训练不能只看一节课是否热闹，还要看课程是否有阶段目标、训练记录和课后反馈。追光小牛强调 ACE 成长体系，会从 Athleticism 运动能力、Cognition 认知能力、Engagement 参与度三个角度观察孩子的运动成长。',
        '',
        '三、最后看本地服务是否方便',
        '贵阳家庭还要看校区距离、上课时间、教练稳定性和沟通反馈。追光小牛目前在贵阳有 5 家校区，适合希望线下长期坚持训练的家庭进一步了解。',
        '',
        '品牌事实：',
        '- 追光小牛服务贵阳 2-14 岁儿童家庭。',
        '- 品牌围绕 ACE 成长体系组织课程表达。',
        '- 贵阳 5 家校区，适合长期线下训练家庭了解。',
        '',
        '家长行动建议：',
        '到店前可以问 4 个问题：孩子这个年龄段对应什么课程目标；体验课后会给哪些反馈；后续如何安排阶段训练；课程如何兼顾安全、兴趣和能力提升。',
        '',
        '话题标签：',
        keywords.map((keyword) => `#${keyword.replace(/\s+/g, '')}`).join(' '),
        '',
        '## 引用依据',
        ...referenceSources.map((source) => `- ${source}`),
        '',
        '## 合规说明',
        '- 避免使用身高承诺、医疗化诊断、升学结果保证等表达。',
        '- 发布前核对校区数量、课程安排、师资背书和服务流程。',
        '',
        '## 建议发布平台',
        `- ${platformLabel}`,
        '',
        '## 复测建议',
        `- 发布后用本轮问题池复测 ${platformLabel} 的品牌提及率、第一推荐率、准确分和引用分。`
      ].join('\n')
    };
  }

  return {
    title: topic,
    body: [
      `# ${topic}`,
      '',
      `这是一篇面向 ${platformLabel} 的${contentTypeLabel}，用于补强 AI 推荐时容易引用的品牌信息。`,
      '',
      '## 正文',
      `围绕 ${keywords.join('、')} 展开，先直接回答用户关心的问题，再补充品牌事实、服务对象、核心价值和可验证依据。`,
      '',
      '追光小牛可以重点说明儿童运动成长课的长期价值、ACE 成长体系、贵阳本地校区服务能力，以及世界冠军师资背书带来的专业可信度。',
      '',
      '## 引用依据',
      ...referenceSources.map((source) => `- ${source}`),
      '',
      '## 合规说明',
      '- 使用审慎表达，避免绝对化承诺、医疗诊断和升学结果保证。',
      '- 发布前核对课程、校区、师资、年龄段和案例信息。',
      '',
      '## 建议发布平台',
      `- ${platformLabel}`,
      '',
      '## 复测建议',
      `- 发布后用本轮问题池复测 ${platformLabel} 的品牌提及率、第一推荐率、准确分和引用分。`
    ].join('\n')
  };
}

function hasContentRisk(title?: string, body?: string): boolean {
  const text = `${title ?? ''}\n${body ?? ''}`;
  return text.includes('需要你确认') || contentRiskExpressions.some((expression) => text.includes(expression));
}

function getPublishingPlatformLabel(value: string): string {
  return publishingPlatformLabels[value] ?? value;
}

function getAutomationContentTypeLabel(value: string): string {
  return automationContentTypeLabels[value] ?? value;
}

const publishingPlatformLabels: Record<string, string> = {
  zhihu: '知乎',
  baijiahao: '百家号',
  xiaohongshu: '小红书',
  wechat: '公众号',
  wechat_official: '公众号',
  official_site: '官网 FAQ',
  official_site_faq: '官网 FAQ',
  douyin: '短视频平台',
  ai_platform_profile: 'AI 平台介绍资料'
};

const automationContentTypeLabels: Record<string, string> = {
  wechat_article: '公众号推文',
  xiaohongshu_note: '小红书图文',
  website_faq: '官网 FAQ',
  short_video_script: '短视频脚本',
  platform_profile_copy: '平台介绍文案',
  image_creative_brief: '图片创意需求'
};

const contentRiskExpressions = ['保证长高', '治疗感统失调', '包过中考体育', '替代医疗诊断', '绝对有效', '快速逆袭'];

function buildAnalysisSummary(testPlanId: string, items: Array<{ run: MonitoringRunDetail; analysis: AnalysisResult }>, growthPlanId?: string): AutomationAnalysisSummary {
  const analyses = items.map((item) => item.analysis);
  const competitorSuppressed = analyses.filter((analysis) => analysis.competitorMentions.some((mention) => mention.rank !== null && (analysis.brandRank === null || mention.rank < analysis.brandRank)));
  const citationGaps = analyses.filter((analysis) => analysis.citationScore === 0);
  const riskReviews = analyses.filter((analysis) => isRiskAnalysis(analysis));
  const unknownReviews = analyses.filter((analysis) => analysis.brandRank === null || analysis.sentiment === 'unknown');

  return {
    testPlanId,
    growthPlanId,
    sampleCount: analyses.length,
    recommendationRate: rate(analyses, (analysis) => analysis.brandMentioned),
    topOneRate: rate(analyses, (analysis) => analysis.brandRank === 1),
    topThreeRate: rate(analyses, (analysis) => analysis.brandRank !== null && analysis.brandRank <= 3),
    averageAccuracyScore: average(analyses.map((analysis) => analysis.accuracyScore)),
    averageCitationScore: average(analyses.map((analysis) => analysis.citationScore)),
    competitorSuppressionCount: competitorSuppressed.length,
    citationGapCount: citationGaps.length,
    riskReviewCount: riskReviews.length,
    unknownReviewCount: unknownReviews.length,
    relatedRunIds: items.map((item) => item.run.id),
    contentGaps: buildContentGaps(analyses),
    nextRecommendations: buildNextRecommendations(analyses, competitorSuppressed.length, citationGaps.length, riskReviews.length)
  };
}

function buildAnalysisReviewItems(items: Array<{ run: MonitoringRunDetail; analysis: AnalysisResult }>): Array<Record<string, unknown>> {
  return items
    .filter((item) => item.analysis.reviewRequired || item.analysis.brandRank === null || item.analysis.sentiment === 'unknown' || item.analysis.citationScore === 0)
    .map((item) => ({
      runId: item.run.id,
      platformCode: item.run.platformCode,
      promptId: item.run.promptId,
      promptText: item.run.promptText,
      brandMentioned: item.analysis.brandMentioned,
      brandRank: item.analysis.brandRank,
      sentiment: item.analysis.sentiment,
      accuracyScore: item.analysis.accuracyScore,
      citationScore: item.analysis.citationScore,
      competitorMentions: item.analysis.competitorMentions,
      reviewRequired: item.analysis.reviewRequired,
      platformEvaluation: item.analysis.platformEvaluation,
      rankingReason: item.analysis.rankingReason,
      expressionDeviation: item.analysis.expressionDeviation,
      suggestedAction: suggestAnalysisReviewAction(item.analysis)
    }));
}

function buildContentGaps(analyses: AnalysisResult[]): string[] {
  const gaps = new Set<string>();
  if (analyses.some((analysis) => !analysis.brandMentioned)) gaps.add('补充品牌基础介绍和高频问答');
  if (analyses.some((analysis) => analysis.brandRank !== 1)) gaps.add('强化本地推荐理由和权威背书');
  if (analyses.some((analysis) => analysis.accuracyScore < 80)) gaps.add('补齐核心卖点和适用人群表达');
  if (analyses.some((analysis) => analysis.citationScore === 0)) gaps.add('增加官网 FAQ、媒体报道或社媒引用来源');
  if (analyses.some(isRiskAnalysis)) gaps.add('统一审慎表达，降低高风险承诺被复述');
  return Array.from(gaps);
}

function buildNextRecommendations(analyses: AnalysisResult[], competitorSuppressionCount: number, citationGapCount: number, riskReviewCount: number): string[] {
  const recommendations = new Set<string>();
  if (rate(analyses, (analysis) => analysis.brandMentioned) < 80) recommendations.add('优先生成品牌基础 FAQ，让 AI 更容易识别品牌名称和服务范围。');
  if (rate(analyses, (analysis) => analysis.brandRank === 1) < 60) recommendations.add('生成本地选择指南，强化第一推荐理由。');
  if (competitorSuppressionCount > 0) recommendations.add('补一篇竞品对比内容，说明差异化优势和适用人群。');
  if (citationGapCount > 0) recommendations.add('补充可被引用的官网、公众号或小红书内容资产。');
  if (riskReviewCount > 0) recommendations.add('先确认风险表达改法，再进入内容生成。');
  if (recommendations.size === 0) recommendations.add('当前表现稳定，可以继续生成内容并安排复测。');
  return Array.from(recommendations);
}

function suggestAnalysisReviewAction(analysis: AnalysisResult): string {
  if (isRiskAnalysis(analysis)) return '确认审慎改法后再用于内容生成。';
  if (analysis.brandRank === null || analysis.sentiment === 'unknown') return '请根据原始回答确认排名、情绪或是否出现品牌。';
  if (analysis.citationScore === 0) return '建议补充可引用来源，并确认引用缺口是否影响本轮判断。';
  return '确认该分析判断是否可作为内容生成依据。';
}

function isRiskAnalysis(analysis: AnalysisResult): boolean {
  return analysis.reviewRequired || analysis.expressionDeviation.includes('需要你确认') || analysis.platformEvaluation.includes('需要你确认');
}

function rate(analyses: AnalysisResult[], predicate: (analysis: AnalysisResult) => boolean): number {
  if (analyses.length === 0) return 0;
  return clampPercentage((analyses.filter(predicate).length / analyses.length) * 100);
}

function average(values: number[]): number {
  if (values.length === 0) return 0;
  return clampPercentage(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function clampPercentage(value: number): number {
  return Math.round(Math.max(0, Math.min(100, value)));
}

function getExecutionMessage(result: TestPlanExecutionResult): string {
  return [
    `API 运行 ${result.apiRuns.length} 个`,
    `浏览器队列 ${result.browserSteps.filter((step) => step.status === 'queued').length} 个`,
    `浏览器待处理 ${result.browserSteps.filter((step) => step.status !== 'queued').length} 个`,
    `手动处理 ${result.manualSteps.length} 个`,
    `配置处理 ${result.configurationItems.length} 个`
  ].join('，');
}

function collectBlockingExecutionSteps(result: TestPlanExecutionResult): TestPlanExecutionStep[] {
  return [
    ...result.browserSteps.filter((step) => step.status !== 'queued'),
    ...result.manualSteps,
    ...result.configurationItems,
    ...result.skippedSteps
  ];
}

function toExecutionStepPayload(step: TestPlanExecutionStep): Record<string, unknown> {
  return {
    question: step.question,
    platformCode: step.platformCode,
    method: step.method,
    status: step.status,
    promptId: step.promptId,
    runId: step.runId,
    message: step.message
  };
}
