import { describe, expect, it } from 'vitest';
import type { EvaluationDashboard, EvaluationIssue } from '@geo-platform/shared-types';
import { getAffectedFactIntentCount, getEvaluationAnalysisMode, getEvaluationAnalysisState, getEvaluationIssueActions, getEvaluationIssueBreakdown, getFactEvaluationIssues, getFilteredEvaluationIssues, getFilteredEvaluationTrend } from './EvaluationAnalysisPage';

const dashboard: EvaluationDashboard = {
  brandId: 'brand-1',
  sampleCount: 10,
  positiveRate: 60,
  neutralRate: 30,
  negativeRate: 10,
  accurateRate: 82,
  trend: [],
  issueTypeBreakdown: [],
  issues: []
};

describe('EvaluationAnalysisPage helpers', () => {
  it('uses evaluation copy for the evaluation route', () => {
    expect(getEvaluationAnalysisMode('/evaluations', dashboard)).toMatchObject({
      title: '评价分析',
      actions: ['修正内容策略', '更新品牌资料', '创建再次监测']
    });
  });

  it('uses fact diagnosis copy for the facts route', () => {
    expect(getEvaluationAnalysisMode('/facts', dashboard)).toMatchObject({
      title: '事实分析',
      findings: ['发现 0 项事实风险，其中 0 项高风险', '事实准确表达率 82%', '0 个用户意图受到影响'],
      actions: ['补充品牌资料', '更新标准答案', '生成事实补强内容']
    });
  });

  it('keeps only fact risks and counts affected user intents', () => {
    const issues = [
      createIssue({ userIntent: '了解课程事实' }),
      createIssue({ id: 'issue-2', issueType: 'low_accuracy', userIntent: '了解课程事实' }),
      createIssue({ id: 'issue-3', issueType: 'blocked_expression', userIntent: '确认效果承诺' }),
      createIssue({ id: 'issue-4', issueType: 'negative_expression', userIntent: '查看口碑' })
    ];
    const factIssues = getFactEvaluationIssues(issues);

    expect(factIssues.map((issue) => issue.issueType)).toEqual(['misinformation', 'low_accuracy', 'blocked_expression']);
    expect(getAffectedFactIntentCount(factIssues)).toBe(2);
  });

  it('separates empty, insufficient and ready sample states', () => {
    expect(getEvaluationAnalysisState({ ...dashboard, sampleCount: 0 })).toBe('empty');
    expect(getEvaluationAnalysisState({ ...dashboard, sampleCount: 2 })).toBe('insufficient');
    expect(getEvaluationAnalysisState({ ...dashboard, sampleCount: 3 })).toBe('ready');
  });

  it('maps issue types to actionable next steps', () => {
    expect(getEvaluationIssueActions({ issueType: 'misinformation' }).map((action) => action.label)).toEqual(['更新标准答案', '生成事实补强内容', '再次监测']);
    expect(getEvaluationIssueActions({ issueType: 'negative_expression' }).map((action) => action.label)).toEqual(['事实澄清策略', 'FAQ 补充', '复测任务']);
    expect(getEvaluationIssueActions({ issueType: 'missing_selling_point' }).map((action) => action.label)).toEqual(['内容补强策略', '更新品牌资料', '生成内容任务']);
  });

  it('filters expression evidence by date, platform, status and search text', () => {
    const issues = [
      createIssue(),
      createIssue({ id: 'issue-2', platformCode: 'doubao', status: 'resolved', rawFragment: '课程信息准确' })
    ];

    expect(getFilteredEvaluationIssues(issues, {
      search: '错误',
      from: '2026-07-10',
      to: '2026-07-16',
      platform: 'kimi',
      status: 'open'
    })).toEqual([expect.objectContaining({ id: 'issue-1' })]);
  });

  it('filters trend dates and rebuilds the issue distribution for the current evidence scope', () => {
    const trend = [
      { date: '2026-07-13', sampleCount: 2, positiveRate: 50, neutralRate: 25, negativeRate: 25, accurateRate: 75 },
      { date: '2026-07-14', sampleCount: 3, positiveRate: 60, neutralRate: 20, negativeRate: 20, accurateRate: 80 }
    ];
    const issues = [createIssue(), createIssue({ id: 'issue-2' }), createIssue({ id: 'issue-3', issueType: 'missing_selling_point' })];

    expect(getFilteredEvaluationTrend(trend, { from: '2026-07-14' })).toEqual([expect.objectContaining({ date: '2026-07-14' })]);
    expect(getEvaluationIssueBreakdown(issues)).toEqual([
      { issueType: 'misinformation', count: 2, rate: 67 },
      { issueType: 'missing_selling_point', count: 1, rate: 33 }
    ]);
  });

  it('keeps monitoring evidence in evaluation action links', () => {
    const actions = getEvaluationIssueActions(createIssue(), { optimizationUnitId: 'unit-1', intentId: 'intent-1' });
    const contentAction = actions.find((action) => action.kind === 'link' && action.label === '生成事实补强内容');

    expect(contentAction).toMatchObject({ kind: 'link' });
    if (contentAction?.kind === 'link') {
      expect(contentAction.href).toContain('optimizationUnitId=unit-1');
      expect(contentAction.href).toContain('promptId=prompt-1');
      expect(contentAction.href).toContain('runId=run-1');
    }
  });
});

function createIssue(overrides: Partial<EvaluationIssue> = {}): EvaluationIssue {
  return {
    id: 'issue-1',
    brandId: 'brand-1',
    responseId: 'response-1',
    runId: 'run-1',
    promptId: 'prompt-1',
    promptText: '品牌课程有哪些？',
    platformCode: 'kimi',
    issueType: 'misinformation',
    rawFragment: '课程信息错误',
    suggestedExpression: '使用品牌资料中的课程表述',
    severity: 'high',
    status: 'open',
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides
  };
}
