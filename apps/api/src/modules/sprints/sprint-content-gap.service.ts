import { Injectable } from '@nestjs/common';
import type {
  BrandId,
  ContentGenerationTask,
  ContentVersion,
  ContentStrategy,
  ContentStrategyPriority,
  ContentStrategyType,
  SprintContentGapTask,
  SprintContentGapTaskResult,
  SprintContentTaskDashboard,
  SprintContentTaskGapContext,
  SprintContentTaskItem,
  StandardAnswerAlignmentEvidenceType,
  StandardAnswerAlignmentItem,
  VisibilitySprint
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { StandardAnswerAlignmentService } from './standard-answer-alignment.service';

@Injectable()
export class SprintContentGapService {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly alignmentService: StandardAnswerAlignmentService
  ) {}

  async generateContentGapTasks(userId: string, brandId: BrandId, sprintId: string): Promise<SprintContentGapTaskResult | null> {
    const [sprint, dashboard] = await Promise.all([
      this.permissionsService.getVisibilitySprint(userId, brandId, sprintId),
      this.alignmentService.getAlignmentDashboard(userId, brandId, sprintId)
    ]);
    if (!sprint || !dashboard) {
      return null;
    }

    const baseStrategy = await this.resolveBaseStrategy(userId, brandId);
    if (!baseStrategy) {
      return null;
    }

    const gapItems = dashboard.items.filter((item) => item.status === 'needs_attention');
    const tasks: SprintContentGapTask[] = [];
    const existingTaskKeys = await this.resolveExistingTaskKeys(userId, brandId, sprint);

    for (const item of gapItems) {
      const taskKey = buildTaskKey(sprintId, item.questionId);
      if (existingTaskKeys.has(taskKey)) {
        continue;
      }

      const strategy = this.permissionsService.createContentStrategy(userId, brandId, buildContentStrategyInput(baseStrategy, item));
      if (!strategy) {
        continue;
      }

      const workspace = this.permissionsService.createContentGenerationTask(userId, brandId, {
        strategyId: strategy.id,
        targetPlatform: selectTargetPlatform(item),
        contentType: selectContentType(item),
        contentTopic: buildContentTopic(item),
        targetKeywords: buildTargetKeywords(item),
        referenceSources: buildReferenceSources(sprintId, item),
        retestAt: buildRetestDate()
      });
      const task = workspace?.currentTask;
      if (!task) {
        continue;
      }

      tasks.push({
        questionId: item.questionId,
        question: item.question,
        standardAnswerId: item.standardAnswerId,
        contentStrategyId: strategy.id,
        contentTaskId: task.id,
        sourceRunIds: item.responses.map((response) => response.runId),
        gapTypes: uniqueEvidenceTypes(item.evidence.map((evidence) => evidence.type)),
        recommendation: item.recommendation
      });
    }

    const updatedSprint = await this.permissionsService.updateVisibilitySprintRelations(userId, brandId, sprintId, {
      relatedContentTaskIds: unique([...sprint.relatedContentTaskIds, ...tasks.map((task) => task.contentTaskId)])
    });

    return {
      brandId,
      sprintId,
      createdTaskCount: tasks.length,
      skippedQuestionCount: gapItems.length - tasks.length,
      tasks,
      sprint: updatedSprint ?? sprint
    };
  }

  async getContentTaskDashboard(userId: string, brandId: BrandId, sprintId: string): Promise<SprintContentTaskDashboard | null> {
    const [sprint, alignment] = await Promise.all([
      this.permissionsService.getVisibilitySprint(userId, brandId, sprintId),
      this.alignmentService.getAlignmentDashboard(userId, brandId, sprintId)
    ]);
    if (!sprint || !alignment) {
      return null;
    }

    const alignmentByQuestionId = new Map(alignment.items.map((item) => [item.questionId, item]));
    const items = sprint.relatedContentTaskIds
      .map((taskId) => this.permissionsService.getContentGenerationWorkspace(userId, brandId, taskId))
      .filter((workspace): workspace is NonNullable<typeof workspace> => Boolean(workspace?.currentTask))
      .map((workspace) => buildContentTaskItem(workspace.currentTask as ContentGenerationTask, workspace.currentVersion, alignmentByQuestionId));

    return {
      brandId,
      sprintId,
      totalTaskCount: items.length,
      reviewReadyTaskCount: items.filter((item) => item.draftReadiness.reviewReady).length,
      missingDraftTaskCount: items.filter((item) => !item.draftReadiness.hasDraft).length,
      items,
      updatedAt: new Date().toISOString()
    };
  }

  private async resolveBaseStrategy(userId: string, brandId: BrandId): Promise<ContentStrategy | null> {
    const existing = this.permissionsService.listContentStrategies(userId, brandId);
    if (existing?.length) {
      return existing[0];
    }

    const generated = this.permissionsService.generateContentStrategies(userId, brandId);
    return generated?.[0] ?? null;
  }

  private async resolveExistingTaskKeys(userId: string, brandId: BrandId, sprint: VisibilitySprint): Promise<Set<string>> {
    const keys = new Set<string>();
    for (const taskId of sprint.relatedContentTaskIds) {
      const workspace = this.permissionsService.getContentGenerationWorkspace(userId, brandId, taskId);
      const task = workspace?.currentTask;
      if (!task) {
        continue;
      }
      const key = extractTaskKey(task);
      if (key) {
        keys.add(key);
      }
    }

    return keys;
  }
}

function buildContentTaskItem(task: ContentGenerationTask, currentVersion: ContentVersion | undefined, alignmentByQuestionId: Map<string, StandardAnswerAlignmentItem>): SprintContentTaskItem {
  const parsed = parseReferenceSources(task.referenceSources);
  const alignmentItem = parsed.questionId ? alignmentByQuestionId.get(parsed.questionId) : undefined;
  const gapContext: SprintContentTaskGapContext = {
    questionId: parsed.questionId,
    question: alignmentItem?.question,
    standardAnswerId: parsed.standardAnswerId ?? alignmentItem?.standardAnswerId,
    sourceRunIds: unique([...parsed.sourceRunIds, ...(alignmentItem?.responses.map((response) => response.runId) ?? [])]),
    gapTypes: uniqueEvidenceTypes([...parsed.gapTypes, ...(alignmentItem?.evidence.map((evidence) => evidence.type) ?? [])]),
    evidenceSummaries: unique([...parsed.evidenceSummaries, ...(alignmentItem?.evidence.map((evidence) => `${evidence.label}：${evidence.excerpt}`) ?? [])]),
    recommendation: alignmentItem?.recommendation
  };

  return {
    contentTask: task,
    currentVersion,
    gapContext,
    retestTarget: task.retestAt,
    draftReadiness: buildDraftReadiness(currentVersion)
  };
}

function parseReferenceSources(referenceSources: string[]): SprintContentTaskGapContext {
  const context: SprintContentTaskGapContext = {
    sourceRunIds: [],
    gapTypes: [],
    evidenceSummaries: []
  };

  for (const source of referenceSources) {
    const [type, ...rest] = source.split(':');
    if (type === 'sprint_gap') {
      context.questionId = rest[1] ?? context.questionId;
      continue;
    }
    if (type === 'question') {
      context.questionId = rest.join(':') || context.questionId;
      continue;
    }
    if (type === 'standard_answer') {
      context.standardAnswerId = rest.join(':') || context.standardAnswerId;
      continue;
    }
    if (type === 'monitoring_run') {
      const runId = rest.join(':');
      if (runId) context.sourceRunIds.push(runId);
      continue;
    }
    if (isEvidenceType(type)) {
      context.gapTypes.push(type);
      context.evidenceSummaries.push(rest.join(':'));
    }
  }

  return {
    ...context,
    sourceRunIds: unique(context.sourceRunIds),
    gapTypes: uniqueEvidenceTypes(context.gapTypes),
    evidenceSummaries: unique(context.evidenceSummaries)
  };
}

function buildDraftReadiness(version: ContentVersion | undefined): SprintContentTaskItem['draftReadiness'] {
  const bodyLength = version?.body.trim().length ?? 0;
  if (!version || bodyLength === 0) {
    return { hasDraft: false, bodyLength: 0, reviewReady: false, message: '内容任务尚未生成正文草稿。' };
  }
  if (bodyLength < 600) {
    return { hasDraft: true, bodyLength, reviewReady: false, message: '正文草稿偏短，需要补充证据、解释和可发布段落后再审稿。' };
  }

  return { hasDraft: true, bodyLength, reviewReady: true, message: '正文草稿已达到可审稿长度，进入发布前人工确认。' };
}

function isEvidenceType(value: string): value is StandardAnswerAlignmentEvidenceType {
  return ['coverage', 'accuracy', 'risk_expression', 'citation_gap', 'competitor_suppression'].includes(value);
}

function buildContentStrategyInput(baseStrategy: ContentStrategy, item: StandardAnswerAlignmentItem): Parameters<PermissionsService['createContentStrategy']>[2] {
  return {
    optimizationUnitId: baseStrategy.optimizationUnitId,
    intentId: baseStrategy.intentId,
    type: selectStrategyType(item),
    priority: selectPriority(item),
    suggestedTitle: buildContentTopic(item),
    targetPlatform: selectTargetPlatform(item),
    targetKeywords: buildTargetKeywords(item),
    relatedPromptIds: item.responses.map((response) => response.runId)
  };
}

function selectStrategyType(item: StandardAnswerAlignmentItem): ContentStrategyType {
  if (item.competitorSuppression) {
    return 'competitor_response';
  }
  if (item.citationGap) {
    return 'authority_citation';
  }
  if (item.riskExpression) {
    return 'correction';
  }

  return 'gap';
}

function selectPriority(item: StandardAnswerAlignmentItem): ContentStrategyPriority {
  if (item.competitorSuppression || item.riskExpression || item.accuracyScore < 70) {
    return 'high';
  }
  if (item.citationGap || item.coverageScore < 80) {
    return 'medium';
  }

  return 'low';
}

function selectTargetPlatform(item: StandardAnswerAlignmentItem): string {
  if (item.citationGap) {
    return 'official_site';
  }
  if (item.competitorSuppression) {
    return 'zhihu';
  }

  return 'wechat_official_account';
}

function selectContentType(item: StandardAnswerAlignmentItem): string {
  if (item.citationGap) {
    return 'official_faq';
  }
  if (item.competitorSuppression) {
    return 'zhihu_answer';
  }
  if (item.riskExpression) {
    return 'platform_profile_copy';
  }

  return 'article';
}

function buildContentTopic(item: StandardAnswerAlignmentItem): string {
  const topic = item.keyPointsMissing.length ? item.keyPointsMissing.slice(0, 2).join('、') : item.question;
  return `补强“${topic}”的 AI 可见性内容`;
}

function buildTargetKeywords(item: StandardAnswerAlignmentItem): string[] {
  return unique([item.question, ...item.keyPointsMissing, ...item.keyPointsMatched]).slice(0, 8);
}

function buildReferenceSources(sprintId: string, item: StandardAnswerAlignmentItem): string[] {
  return unique([
    buildTaskKey(sprintId, item.questionId),
    `sprint:${sprintId}`,
    `question:${item.questionId}`,
    ...(item.standardAnswerId ? [`standard_answer:${item.standardAnswerId}`] : []),
    ...item.responses.map((response) => `monitoring_run:${response.runId}`),
    ...item.evidence.map((evidence) => `${evidence.type}:${evidence.label}:${evidence.excerpt}`)
  ]);
}

function buildTaskKey(sprintId: string, questionId: string): string {
  return `sprint_gap:${sprintId}:${questionId}`;
}

function extractTaskKey(task: ContentGenerationTask): string | null {
  return task.referenceSources.find((source) => source.startsWith('sprint_gap:')) ?? null;
}

function buildRetestDate(): string {
  const date = new Date();
  date.setDate(date.getDate() + 14);
  return date.toISOString();
}

function uniqueEvidenceTypes(values: StandardAnswerAlignmentEvidenceType[]): StandardAnswerAlignmentEvidenceType[] {
  return Array.from(new Set(values));
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
