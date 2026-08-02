import { describe, expect, it } from 'vitest';
import type { AnalysisFinding, GrowthOptimizationPlan, OptimizationTask, PublishingRecord, SprintContentTaskDashboard, StandardAnswerAlignmentDashboard } from '@geo-platform/shared-types';
import { getAnalysisFindingActionPath, getContentLinkDisplay, getFilteredAnalysisFindings, getFilteredGrowthOptimizationPlans, getPlanProgress, getPlanStatusCounts, getRecommendationPublishingStatus, getRetestResultLabel, getPlanTasks, splitPlatformText } from './GrowthOptimizationPage';
import { buildSprintDiagnosisRows, getAlignmentStatusDisplay, getGapTypeLabel } from './growthSprintDiagnostics';

describe('GrowthOptimizationPage helpers', () => {
  it('splits publishing platforms from common separators', () => {
    expect(splitPlatformText('公众号、小红书、官网 FAQ\n短视频脚本')).toEqual(['公众号', '小红书', '官网 FAQ', '短视频脚本']);
  });

  it('counts plan statuses for the dashboard summary', () => {
    const plans = [
      createPlan({ id: 'plan_1', status: 'draft' }),
      createPlan({ id: 'plan_2', status: 'confirmed' }),
      createPlan({ id: 'plan_3', status: 'completed' })
    ];

    expect(getPlanStatusCounts(plans)).toMatchObject({ draft: 1, confirmed: 1, completed: 1, in_progress: 0, ready_for_retest: 0 });
  });

  it('matches tasks by plan id and explicit task ids', () => {
    const plan = createPlan({ id: 'plan_1', taskIds: ['task_2'] });
    const tasks = [
      createTask({ id: 'task_1', growthOptimizationPlanId: 'plan_1', status: 'done' }),
      createTask({ id: 'task_2', status: 'todo' }),
      createTask({ id: 'task_3', growthOptimizationPlanId: 'plan_2', status: 'done' })
    ];

    expect(getPlanTasks(plan, tasks).map((task) => task.id)).toEqual(['task_1', 'task_2']);
    expect(getPlanProgress(plan, tasks)).toEqual({ total: 2, done: 1 });
  });

  it('hides internal content draft references in task lists', () => {
    expect(getContentLinkDisplay('draft_task_001')).toBe('已生成内容草稿');
    expect(getContentLinkDisplay('https://example.com/article')).toBe('https://example.com/article');
    expect(getContentLinkDisplay()).toBe('-');
  });

  it('keeps ready-for-retest plans tied to source runs for retest entry', () => {
    const plan = createPlan({ id: 'plan_retest', status: 'ready_for_retest' });
    const tasks = [
      createTask({ id: 'task_retest', growthOptimizationPlanId: 'plan_retest', sourceRunId: 'run_before', status: 'retest' })
    ];

    expect(getPlanStatusCounts([plan]).ready_for_retest).toBe(1);
    expect(getPlanTasks(plan, tasks)).toEqual([expect.objectContaining({ id: 'task_retest', sourceRunId: 'run_before' })]);
  });

  it('filters plans by date, status, optimization unit and evidence text', () => {
    const plans = [createPlan({ id: 'plan-1', status: 'draft' }), createPlan({ id: 'plan-2', status: 'completed', summary: '其他计划' })];
    const tasks = [createTask({ id: 'task-1', growthOptimizationPlanId: 'plan-1', optimizationUnitId: 'unit-1' })];

    expect(getFilteredGrowthOptimizationPlans(plans, tasks, {
      search: '追光小牛',
      from: '2026-07-01',
      to: '2026-07-10',
      platform: 'all',
      status: 'draft',
      optimizationUnitId: 'unit-1'
    })).toEqual([expect.objectContaining({ id: 'plan-1' })]);
  });

  it('filters diagnosis findings by platform, optimization unit and evidence text', () => {
    const findings = [
      createFinding({ id: 'finding-1', platformCode: 'doubao', optimizationUnitId: 'unit-1' }),
      createFinding({ id: 'finding-2', title: '其他结论', platformCode: 'kimi', optimizationUnitId: 'unit-2' })
    ];

    expect(getFilteredAnalysisFindings(findings, {
      search: '权威信源',
      platform: 'doubao',
      status: 'all',
      optimizationUnitId: 'unit-1'
    })).toEqual([expect.objectContaining({ id: 'finding-1' })]);
  });

  it('maps finding actions to task, content, knowledge and retest workflows', () => {
    const finding = createFinding({ relatedTaskId: 'task-1', optimizationUnitId: 'unit-1', platformCode: 'doubao' });

    expect(getAnalysisFindingActionPath(finding, { actionType: 'generate_content', label: '生成内容' }, { runId: 'run-1' }))
      .toBe('/content-generation?runId=run-1&optimizationUnitId=unit-1&platformCode=doubao');
    expect(getAnalysisFindingActionPath(finding, { actionType: 'update_knowledge', label: '更新资料' }, {}))
      .toBe('/brand-profile?optimizationUnitId=unit-1&platformCode=doubao');
    const taskPath = getAnalysisFindingActionPath(finding, { actionType: 'create_task', label: '查看任务' }, {});
    expect(taskPath.split('?')[0]).toBe('/tasks');
    expect(Object.fromEntries(new URLSearchParams(taskPath.split('?')[1]))).toMatchObject({
      optimizationUnitId: 'unit-1',
      taskId: 'task-1',
      platformCode: 'doubao',
      action: 'open'
    });
    expect(getAnalysisFindingActionPath(createFinding({ relatedTaskId: undefined }), { actionType: 'schedule_retest', label: '安排再次监测' }, {}))
      .toContain('action=create');
  });

  it('summarizes publishing and retest states for associated content', () => {
    const records = [createPublishingRecord({ generationTaskId: 'generation-1', status: 'published' })];
    const publishedTag = getRecommendationPublishingStatus('generation-1', records);
    expect(publishedTag.props.children).toBe('已发布');
    expect(getRetestResultLabel(createTask({ retestRecords: [] }))).toBe('未安排');
    expect(getRetestResultLabel(createTask({ retestRecords: [{ id: 'retest-1', taskId: 'task_demo', sourceRunId: 'run-1', retestRunId: 'run-2', plannedAt: '2026-07-20', completedAt: '2026-07-21', targetScore: 80, actualScore: 85, improved: true, createdAt: '2026-07-20', updatedAt: '2026-07-21' }] }))).toBe('已改善');
  });

  it('builds Sprint diagnosis rows across real answers, standards and content assets', () => {
    const rows = buildSprintDiagnosisRows(createAlignmentDashboard(), createContentTaskDashboard());

    expect(getAlignmentStatusDisplay('needs_attention')).toEqual({ label: '需要补强', color: 'red' });
    expect(getGapTypeLabel('citation_gap')).toBe('引用缺口');
    expect(rows).toEqual([
      expect.objectContaining({
        questionId: 'question_1',
        realAnswerLabel: '1 条真实回复',
        standardAnswerLabel: '已确认标准答案',
        contentAssetLabel: '草稿可审稿',
        gapLabels: expect.arrayContaining(['引用缺口', '要点覆盖']),
        statusLabel: '需要补强'
      })
    ]);
  });
});

function createPlan(partial: Partial<GrowthOptimizationPlan>): GrowthOptimizationPlan {
  return {
    id: 'plan_demo',
    brandId: 'brand_demo',
    sourceRunIds: [],
    summary: '补齐追光小牛儿童运动课程表达',
    reasons: [],
    priority: 'high',
    dueDate: '2026-07-10',
    publishingPlatforms: ['公众号'],
    retestAt: '2026-07-17T00:00:00.000Z',
    contentRecommendations: [],
    taskIds: [],
    status: 'draft',
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z',
    ...partial
  };
}

function createFinding(partial: Partial<AnalysisFinding>): AnalysisFinding {
  return {
    id: 'finding-demo',
    brandId: 'brand_demo',
    type: 'citation',
    title: '品牌事实需要更多权威信源覆盖',
    evidence: ['权威信源覆盖不足'],
    severity: 'high',
    recommendedActions: [],
    ...partial
  };
}

function createPublishingRecord(partial: Partial<PublishingRecord>): PublishingRecord {
  return {
    id: 'publishing-1',
    brandId: 'brand_demo',
    contentAssetId: 'asset-1',
    title: '品牌 FAQ',
    body: '正文',
    platform: 'official_site',
    status: 'pending',
    createdAt: '2026-07-20',
    updatedAt: '2026-07-20',
    ...partial
  };
}

function createTask(partial: Partial<OptimizationTask>): OptimizationTask {
  return {
    id: 'task_demo',
    brandId: 'brand_demo',
    title: '发布追光小牛 FAQ',
    type: 'content_strategy',
    status: 'todo',
    priority: 'high',
    retestRecords: [],
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z',
    ...partial
  };
}

function createAlignmentDashboard(): StandardAnswerAlignmentDashboard {
  return {
    brandId: 'brand_demo',
    sprintId: 'sprint_1',
    realAnswerCount: 1,
    approvedStandardAnswerCount: 1,
    summary: {
      totalQuestionCount: 1,
      alignedCount: 0,
      needsAttentionCount: 1,
      waitingRealAnswerCount: 0,
      waitingStandardAnswerCount: 0,
      citationGapCount: 1,
      riskExpressionCount: 0,
      competitorSuppressionCount: 0
    },
    items: [
      {
        questionId: 'question_1',
        question: '贵阳儿童运动机构怎么选？',
        standardAnswerId: 'standard_1',
        status: 'needs_attention',
        coverageScore: 60,
        accuracyScore: 75,
        keyPointsMatched: ['贵阳 5 家校区'],
        keyPointsMissing: ['儿童运动成长课是必修课'],
        citationGap: true,
        riskExpression: false,
        competitorSuppression: false,
        recommendation: '补齐品牌基础 FAQ 和引用来源。',
        responses: [
          {
            runId: 'run_1',
            platformCode: 'doubao',
            promptText: '贵阳儿童运动机构怎么选？',
            rawExcerpt: '可以比较课程体系和师资。',
            citations: [],
            brandMentioned: true,
            brandRank: 2,
            competitorMentions: []
          }
        ],
        evidence: [{ type: 'citation_gap', severity: 'medium', label: '缺少引用', excerpt: 'AI 未引用品牌官网或 FAQ。' }]
      }
    ],
    updatedAt: '2026-07-12T00:00:00.000Z'
  };
}

function createContentTaskDashboard(): SprintContentTaskDashboard {
  return {
    brandId: 'brand_demo',
    sprintId: 'sprint_1',
    totalTaskCount: 1,
    reviewReadyTaskCount: 1,
    missingDraftTaskCount: 0,
    items: [
      {
        contentTask: {
          id: 'task_1',
          brandId: 'brand_demo',
          strategyId: 'strategy_1',
          targetPlatform: 'wechat_article',
          contentType: 'article',
          targetKeywords: ['贵阳儿童运动'],
          referenceSources: [],
          status: 'completed',
          steps: [],
          createdAt: '2026-07-12T00:00:00.000Z',
          updatedAt: '2026-07-12T00:00:00.000Z'
        },
        gapContext: {
          questionId: 'question_1',
          question: '贵阳儿童运动机构怎么选？',
          standardAnswerId: 'standard_1',
          sourceRunIds: ['run_1'],
          gapTypes: ['coverage'],
          evidenceSummaries: ['缺少品牌标准答案要点。'],
          recommendation: '生成 FAQ。'
        },
        draftReadiness: {
          hasDraft: true,
          bodyLength: 1200,
          reviewReady: true,
          message: '草稿可审稿'
        }
      }
    ],
    updatedAt: '2026-07-12T00:00:00.000Z'
  };
}
