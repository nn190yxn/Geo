import { describe, expect, it } from 'vitest';
import type { BeginnerHomeDashboard } from '@geo-platform/shared-types';
import { getBeginnerActionRoute, getBeginnerHomeQuestions, getBeginnerJourneyStages, getBrandActionPath } from './BeginnerHomeState';

function createDashboard(overrides: Partial<BeginnerHomeDashboard> = {}): BeginnerHomeDashboard {
  return {
    brandId: 'brand_demo',
    profileCompleteness: { completenessScore: 0, missingFields: [] },
    monitoringObjectCount: 0,
    realResponseStatus: { total: 0, collected: 0, pending: 0, reviewRequired: 0, failed: 0 },
    contentTaskStatus: { pending: 0, running: 0, completed: 0, failed: 0 },
    publishingStatus: { totalRecords: 0, publishedRecords: 0, failedRecords: 0, citationCount: 0, pendingRetestCount: 0 },
    analysisRisk: { total: 0, high: 0, byType: { competitor: 0, evaluation: 0, citation: 0, fact: 0 } },
    resultSummary: { recommendationRate: 0, averageRank: null, citationHitRate: 0, pendingIssueCount: 0, sampleSize: 0, rankedSampleSize: 0 },
    nextAction: { actionType: 'complete_profile', label: '补充品牌资料', reason: '补齐资料' },
    ...overrides
  };
}

describe('BeginnerHomeState', () => {
  it('依次将资料、监测对象和真实回复标记为当前阶段', () => {
    expect(getBeginnerJourneyStages(createDashboard()).map((stage) => stage.status)).toEqual(['process', 'wait', 'wait']);
    expect(getBeginnerJourneyStages(createDashboard({ profileCompleteness: { completenessScore: 100, missingFields: [] } })).map((stage) => stage.status)).toEqual(['finish', 'process', 'wait']);
    expect(getBeginnerJourneyStages(createDashboard({ profileCompleteness: { completenessScore: 100, missingFields: [] }, monitoringObjectCount: 2 })).map((stage) => stage.status)).toEqual(['finish', 'finish', 'process']);
  });

  it('只把真实采集回复视为首轮监测完成', () => {
    const stages = getBeginnerJourneyStages(createDashboard({
      profileCompleteness: { completenessScore: 100, missingFields: [] },
      monitoringObjectCount: 1,
      realResponseStatus: { total: 3, collected: 0, pending: 2, reviewRequired: 0, failed: 1 }
    }));

    expect(stages[2].status).toBe('process');
  });

  it('为所有首页推荐动作返回稳定路由', () => {
    expect(getBeginnerActionRoute({ actionType: 'collect_real_response', label: '', reason: '' })).toBe('/monitoring');
    expect(getBeginnerActionRoute({ actionType: 'schedule_retest', label: '', reason: '' })).toBe('/tasks');
    expect(getBeginnerActionRoute({ actionType: 'review_risk', label: '', reason: '' })).toBe('/growth-optimization');
  });

  it('为结果问题生成带品牌和问题上下文的监测深链', () => {
    const questions = getBeginnerHomeQuestions('brand demo');

    expect(questions).toHaveLength(3);
    expect(questions[0].route).toBe('/brands/brand%20demo/monitoring?question=AI+%E6%80%8E%E4%B9%88%E8%AF%84%E4%BB%B7%E6%88%91%E7%9A%84%E5%93%81%E7%89%8C%EF%BC%9F#monitoring-runs-card');
    expect(questions[1].route).toContain('/brands/brand%20demo/growth-optimization?question=');
    expect(questions[1].route.endsWith('#standard-answer-diagnosis')).toBe(true);
    expect(questions[2].route.endsWith('#optimization-plans')).toBe(true);
  });

  it('为行动透传全部工作流上下文并编码品牌标识', () => {
    const route = getBrandActionPath('brand demo', {
      id: 'task:one',
      category: 'execution',
      label: '执行任务',
      reason: '处理问题',
      targetPath: '/tasks',
      expectedBusinessValue: 'high',
      context: {
        question: '品牌怎么样？',
        optimizationUnitId: 'unit-1',
        intentId: 'intent-1',
        promptId: 'prompt-1',
        runId: 'run-1',
        taskId: 'task-1',
        generationTaskId: 'generation-1',
        publishingRecordId: 'record-1',
        platformCode: 'doubao',
        mode: 'retest'
      }
    });

    expect(route).toContain('/brands/brand%20demo/tasks?');
    for (const value of ['question=', 'optimizationUnitId=unit-1', 'intentId=intent-1', 'promptId=prompt-1', 'runId=run-1', 'taskId=task-1', 'generationTaskId=generation-1', 'publishingRecordId=record-1', 'platformCode=doubao', 'mode=retest']) {
      expect(route).toContain(value);
    }
  });

  it('缺少上下文时生成合法品牌路径', () => {
    expect(getBrandActionPath('brand/a', {
      id: 'review',
      category: 'review',
      label: '查看报告',
      reason: '复盘',
      targetPath: '/reports',
      context: { question: '', runId: undefined },
      expectedBusinessValue: 'medium'
    })).toBe('/brands/brand%2Fa/reports');
  });
});
