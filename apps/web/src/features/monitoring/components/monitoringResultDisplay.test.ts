import { describe, expect, it } from 'vitest';
import type { AnalysisResult, MonitoringRunDetail } from '@geo-platform/shared-types';
import { getConfirmationReviewItems, getMonitoringResultSummary } from './monitoringResultDisplay';

describe('monitoring result display helpers', () => {
  it('explains parsed results with beginner-facing business labels', () => {
    const summary = getMonitoringResultSummary(createRun({ analysis: createAnalysis() }));

    expect(summary.title).toBe('监测结果已解读');
    expect(summary.lines.map((line) => line.label)).toEqual(['有没有出现', '排第几', '说得准不准', '竞品表现', '需要补什么内容']);
    expect(summary.lines[0].value).toBe('出现了品牌');
    expect(summary.lines[1].value).toBe('第 1 位');
    expect(summary.nextAction).toBe('根据补强建议生成内容和再次监测计划。');
  });

  it('surfaces confirmation-required analysis with the reason', () => {
    const summary = getMonitoringResultSummary(createRun({ analysis: createAnalysis({ reviewRequired: true, expressionDeviation: '出现高风险承诺' }) }));

    expect(summary.title).toBe('结果需要你确认');
    expect(summary.lines.at(-1)).toEqual({ label: '需要你确认', value: '出现高风险承诺', tone: 'warning' });
    expect(summary.nextAction).toBe('点击查看解读，确认风险表达和无法判断项。');
  });

  it('builds confirmation review items for risk expressions and unknown fields', () => {
    expect(getConfirmationReviewItems(createAnalysis({
      reviewRequired: true,
      brandRank: null,
      sentiment: 'unknown',
      expressionDeviation: '回答中出现“保证长高”这类高风险承诺'
    }))).toEqual([
      {
        label: '风险表达',
        value: '回答中出现“保证长高”这类高风险承诺',
        action: '建议改为“在科学运动和规律训练基础上，帮助孩子改善体态、促进身体发育”。'
      },
      {
        label: '无法判断项',
        value: '没有识别到明确排名',
        action: '请检查 AI 回答里是否有推荐顺序；确认后可手动填写“排第几”。'
      },
      {
        label: '无法判断项',
        value: '没有识别到明确情绪倾向',
        action: '请按原始回答语气选择正向、中性或负向。'
      }
    ]);
  });

  it('hides confirmation review items after confirmation is cleared', () => {
    expect(getConfirmationReviewItems(createAnalysis({ reviewRequired: false, expressionDeviation: '已确认' }))).toEqual([]);
  });

  it('explains failed runs with cause, impact and next action', () => {
    const summary = getMonitoringResultSummary(createRun({ status: 'failed', errorMessage: 'Provider timeout' }));

    expect(summary.title).toBe('测试没成功，需要手动补录');
    expect(summary.lines).toContainEqual({ label: '原因', value: 'Provider timeout', tone: 'danger' });
    expect(summary.lines).toContainEqual({ label: '影响', value: '本次测试暂时没有可解读的回答', tone: 'warning' });
  });

  it('explains manual and unparsed states', () => {
    expect(getMonitoringResultSummary(createRun({ status: 'review_required' })).nextAction).toBe('点击录入回答，粘贴 AI 平台原文。');
    expect(getMonitoringResultSummary(createRun({ response: {
      id: 'response_demo',
      runId: 'run_demo',
      brandId: 'brand_demo',
      rawText: 'AI response',
      citations: [],
      platformCode: 'unknown',
      modelName: 'unknown',
      collectionMethod: 'unknown',
      clientSurface: 'unknown',
      searchEnabled: null,
      market: 'unknown',
      language: 'unknown',
      evidenceLevel: 'unknown',
      manualConfirmed: null,
      baselineVersion: 'unknown',
      respondedAt: '2026-07-05T00:01:00.000Z',
      parseStatus: 'pending',
      createdAt: '2026-07-05T00:01:00.000Z'
    } })).title).toBe('已有回答，等待解读');
  });
});

function createRun(overrides: Partial<MonitoringRunDetail> = {}): MonitoringRunDetail {
  return {
    id: 'run_demo',
    brandId: 'brand_demo',
    promptId: 'prompt_demo',
    platformCode: 'doubao',
    promptText: '贵阳儿童运动机构推荐哪家？',
    status: 'completed',
    retryStatus: 'not_retried',
    startedAt: '2026-07-05T00:00:00.000Z',
    completedAt: '2026-07-05T00:01:00.000Z',
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:01:00.000Z',
    ...overrides
  } as MonitoringRunDetail;
}

function createAnalysis(overrides: Partial<AnalysisResult> = {}): AnalysisResult {
  return {
    id: 'analysis_demo',
    runId: 'run_demo',
    brandMentioned: true,
    brandRank: 1,
    sentiment: 'positive',
    accuracyScore: 86,
    citationScore: 70,
    platformEvaluation: '追光小牛已被推荐',
    recommendationReason: '品牌资料完整',
    rankingReason: '本地儿童运动内容覆盖较好',
    expressionCompleteness: '核心卖点表达准确',
    expressionDeviation: '',
    competitorMentions: [{ name: '竞品A', rank: 2, sentiment: 'neutral' }],
    reviewRequired: false,
    parsedAt: '2026-07-05T00:02:00.000Z',
    ...overrides
  } as AnalysisResult;
}
