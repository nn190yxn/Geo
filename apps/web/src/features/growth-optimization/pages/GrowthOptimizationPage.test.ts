import { describe, expect, it } from 'vitest';
import type { GrowthOptimizationPlan, OptimizationTask, SprintContentTaskDashboard, StandardAnswerAlignmentDashboard } from '@geo-platform/shared-types';
import { getContentLinkDisplay, getPlanProgress, getPlanStatusCounts, getPlanTasks, splitPlatformText } from './GrowthOptimizationPage';
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
