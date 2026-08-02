import { describe, expect, it } from 'vitest';
import type { TestPlanExecutionResult, TestQuestionCandidate } from '@geo-platform/shared-types';
import { getConnectionSummaryLabel, getDefaultQuestionCandidates, getDurationLabel, getExecutionResultSummary, getPlatformPreview, getQuestionCandidateCountLabel, getThemeCandidateIds, questionPurposeLabels, themeTypeLabels, toQuestionCandidateUpdateInput } from './testQuestionDisplay';

describe('test question display helpers', () => {
  it('keeps beginner-facing labels for themes and purposes', () => {
    expect(themeTypeLabels.location).toBe('地域词');
    expect(questionPurposeLabels.value_prop_accuracy).toBe('卖点是否准确');
  });

  it('shows high priority questions first within the default list', () => {
    const candidates = [
      createCandidate('low', '低价值问题'),
      createCandidate('high', '高价值问题'),
      createCandidate('medium', '中价值问题')
    ];

    expect(getDefaultQuestionCandidates(candidates, 2).map((candidate) => candidate.question)).toEqual(['高价值问题', '中价值问题']);
  });

  it('explains when only part of the questions are displayed', () => {
    expect(getQuestionCandidateCountLabel(12, 8)).toBe('默认展示 8 个高价值监测问题，共 12 个');
    expect(getQuestionCandidateCountLabel(5, 5)).toBe('已展示全部 5 个监测问题');
  });

  it('previews target platforms with beginner-facing labels', () => {
    expect(getPlatformPreview(['doubao', 'kimi', 'stepfun', 'custom_ai'])).toBe('豆包、Kimi、阶跃星辰、自定义平台');
  });

  it('formats first-round plan timing and connection summaries', () => {
    expect(getDurationLabel(35)).toBe('约 35 分钟');
    expect(getDurationLabel(75)).toBe('约 1 小时 15 分钟');
    expect(getConnectionSummaryLabel({
      platformCode: 'doubao',
      name: '豆包',
      methods: ['api', 'manual'],
      status: 'ready',
      hasCredential: true
    })).toBe('豆包：可自动监测，自动监测、手动录入');
    expect(getConnectionSummaryLabel({
      platformCode: 'deepseek',
      name: 'DeepSeek',
      methods: ['api'],
      status: 'needs_configuration',
      hasCredential: false
    })).toBe('DeepSeek：需要补充信息，自动监测');
  });

  it('summarizes first-round execution outcomes by method', () => {
    expect(getExecutionResultSummary({
      apiRuns: [{ id: 'run_one' }],
      browserSteps: [{ question: '问题一' }, { question: '问题二' }],
      manualSteps: [{ question: '问题三' }],
      configurationItems: [{ question: '问题四' }],
      skippedSteps: [{ question: '问题五' }]
    } as TestPlanExecutionResult)).toBe('自动监测 1 条，浏览器辅助监测 2 条，手动录入 1 条，待补充信息 1 条，跳过 1 条');
  });

  it('gets candidate ids by theme for bulk selection', () => {
    const candidates = [
      createCandidate('high', '主题一问题', 'theme_one'),
      createCandidate('medium', '主题二问题', 'theme_two')
    ];

    expect(getThemeCandidateIds(candidates, 'theme_one')).toEqual(['candidate_high_theme_one']);
  });

  it('turns edit form values into candidate update input', () => {
    expect(toQuestionCandidateUpdateInput({
      question: ' 贵阳儿童运动机构推荐哪家？ ',
      purposesText: 'brand_mentioned、rank_first',
      targetPlatformsText: '豆包、通义千问、阶跃星辰',
      priority: 'high',
      estimatedValue: ' 验证本地推荐排名 '
    })).toEqual({
      question: '贵阳儿童运动机构推荐哪家？',
      purposes: ['brand_mentioned', 'rank_first'],
      targetPlatforms: ['doubao', 'qianwen', 'stepfun'],
      priority: 'high',
      estimatedValue: '验证本地推荐排名'
    });
  });
});

function createCandidate(priority: TestQuestionCandidate['priority'], question: string, themeId = 'theme_demo'): TestQuestionCandidate {
  return {
    id: `candidate_${priority}_${themeId}`,
    brandId: 'brand_demo',
    themeId,
    question,
    purposes: ['brand_mentioned'],
    targetPlatforms: ['doubao'],
    priority,
    estimatedValue: '验证品牌推荐表现',
    editable: true,
    selected: priority === 'high',
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z'
  };
}
