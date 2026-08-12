import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function prepareMonitoringIssue(repository: PermissionsRepository) {
  const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
    name: `复测单元 ${Date.now()}_${Math.random()}`,
    type: 'brand',
    targetKeywords: ['任务复测', 'GEO 闭环'],
    priority: 'high'
  });
  const intent = repository.createUserIntent('user_demo', 'brand_demo', {
    optimizationUnitId: unit?.id ?? '',
    category: 'category_recommendation',
    text: '如何把监测问题转成复测任务',
    monitoringFrequency: 'manual'
  });
  const template = repository.createPromptTemplate({
    name: `复测模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请说明{brandName}在{intent}中的表现。',
    targetKeywords: ['任务复测'],
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompt = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  })?.[0];
  repository.createPlatformConfig('user_demo', 'brand_demo', {
    platformCode: 'manual_input',
    name: '人工录入',
    mode: 'manual',
    enabled: true
  });
  const run = repository.createMonitoringRun('user_demo', 'brand_demo', {
    promptId: prompt?.id ?? '',
    platformCode: 'manual_input'
  });

  return { unit, prompt, run };
}

function createParsedRun(repository: PermissionsRepository, promptId: string, rawText: string) {
  const run = repository.createMonitoringRun('user_demo', 'brand_demo', {
    promptId,
    platformCode: 'manual_input'
  });
  repository.addManualResponse('user_demo', 'brand_demo', run?.id ?? '', {
    rawText,
    modelName: 'manual'
  });
  repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

  return run;
}

describe('optimization task retest repository', () => {
  it('plans without a retest run and binds a distinct run only after execution', () => {
    const repository = new PermissionsRepository();
    const { unit, prompt, run } = prepareMonitoringIssue(repository);
    const task = repository.createOptimizationTask('user_demo', 'brand_demo', {
      title: '修正 AI 回答中的品牌表达问题',
      type: 'monitoring_issue',
      ownerId: 'user_demo',
      optimizationUnitId: unit?.id,
      relatedPromptId: prompt?.id,
      relatedPlatformCode: 'manual_input',
      sourceRunId: run?.id,
      priority: 'high'
    });
    const planned = repository.planOptimizationTaskRetest('user_demo', 'brand_demo', task?.id ?? '', {
      sourceRunId: run?.id,
      targetScore: 85,
      notes: '复测原始监测问题是否改善'
    });

    expect(planned).toMatchObject({
      id: task?.id,
      status: 'retest',
      sourceRunId: run?.id,
      retestRunId: undefined
    });
    expect(planned?.retestRecords[0]).toMatchObject({
      sourceRunId: run?.id,
      retestRunId: '',
      targetScore: 85
    });

    const retestRun = repository.createMonitoringRun('user_demo', 'brand_demo', { promptId: prompt?.id ?? '', platformCode: 'manual_input' });
    const bound = repository.bindOptimizationTaskRetestRun('user_demo', 'brand_demo', task?.id ?? '', planned?.retestRecords[0]?.id ?? '', retestRun?.id ?? '');
    expect(bound?.retestRecords[0]).toMatchObject({ retestRunId: retestRun?.id, status: 'collecting' });
  });

  it('keeps the task open when a manual score is supplied without real evidence', () => {
    const repository = new PermissionsRepository();
    const { unit, prompt, run } = prepareMonitoringIssue(repository);
    const task = repository.createOptimizationTask('user_demo', 'brand_demo', {
      title: '复测未达标任务',
      type: 'monitoring_issue',
      optimizationUnitId: unit?.id,
      relatedPromptId: prompt?.id,
      relatedPlatformCode: 'manual_input',
      sourceRunId: run?.id
    });
    const planned = repository.planOptimizationTaskRetest('user_demo', 'brand_demo', task?.id ?? '', {
      sourceRunId: run?.id,
      targetScore: 90
    });
    const retestRun = repository.createMonitoringRun('user_demo', 'brand_demo', { promptId: prompt?.id ?? '', platformCode: 'manual_input' });
    repository.bindOptimizationTaskRetestRun('user_demo', 'brand_demo', task?.id ?? '', planned?.retestRecords[0]?.id ?? '', retestRun?.id ?? '');
    const completed = repository.completeOptimizationTaskRetest('user_demo', 'brand_demo', task?.id ?? '', planned?.retestRecords[0]?.id ?? '', {
      actualScore: 100,
      targetScore: 90,
      notes: '等待真实回答'
    });
    const board = repository.getTaskBoard('user_demo', 'brand_demo');

    expect(completed?.status).toBe('retest');
    expect(completed?.retestRecords[0]).toMatchObject({
      targetScore: 90,
      status: 'collecting',
      evidenceGap: 'missing_real_response',
      sourceRunId: run?.id
    });
    expect(completed?.retestRecords[0]?.actualScore).toBeUndefined();
    expect(board?.statusCounts.retest).toBeGreaterThanOrEqual(1);
  });

  it('links growth plan retest metrics and next-round suggestions', () => {
    const repository = new PermissionsRepository();
    const { prompt } = prepareMonitoringIssue(repository);
    const sourceRun = createParsedRun(repository, prompt?.id ?? '', '竞品A是贵阳儿童运动推荐，课程覆盖基础训练。');
    const retestRun = createParsedRun(repository, prompt?.id ?? '', '竞品A仍是贵阳儿童运动推荐，课程覆盖基础训练。');
    const plan = repository.createGrowthOptimizationPlan('user_demo', 'brand_demo', {
      sourceRunIds: [sourceRun?.id ?? ''],
      summary: '复测联动计划',
      priority: 'high',
      ownerId: 'user_demo',
      dueDate: '2026-07-20T00:00:00.000Z',
      publishingPlatforms: ['official_site'],
      retestAt: '2026-07-27T00:00:00.000Z',
      contentRecommendations: []
    });
    const task = repository.createOptimizationTask('user_demo', 'brand_demo', {
      title: '验证增长优化复测指标',
      type: 'monitoring_issue',
      relatedPromptId: prompt?.id,
      relatedPlatformCode: 'manual_input',
      growthOptimizationPlanId: plan?.id,
      sourceRunId: sourceRun?.id,
      priority: 'high'
    });
    const planned = repository.planOptimizationTaskRetest('user_demo', 'brand_demo', task?.id ?? '', {
      sourceRunId: sourceRun?.id,
      targetScore: 90
    });
    repository.bindOptimizationTaskRetestRun('user_demo', 'brand_demo', task?.id ?? '', planned?.retestRecords[0]?.id ?? '', retestRun?.id ?? '');
    const completed = repository.completeOptimizationTaskRetest('user_demo', 'brand_demo', task?.id ?? '', planned?.retestRecords[0]?.id ?? '', {
      targetScore: 90
    });
    const workspace = repository.getGrowthOptimizationWorkspace('user_demo', 'brand_demo');
    const record = completed?.retestRecords[0];

    expect(record?.beforeMetrics).toMatchObject({ mentionRate: 0, brandRank: null, citationRate: expect.any(Number) });
    expect(record?.afterMetrics).toMatchObject({ mentionRate: 0, brandRank: null, citationRate: expect.any(Number) });
    expect(record?.metricDelta).toMatchObject({ mentionRate: 0, rankImproved: false, citationRate: expect.any(Number) });
    expect(record?.improved).toBe(false);
    expect(record?.nextSuggestion).toContain('继续补充品牌名称');
    expect(completed?.status).toBe('reopened');
    expect(workspace?.plans.find((item) => item.id === plan?.id)?.status).toBe('in_progress');
    expect(workspace?.plans.find((item) => item.id === plan?.id)?.contentRecommendations.at(-1)?.reason).toContain('继续补充品牌名称');
  });

  it('automatically plans retest when a growth task is completed', () => {
    const repository = new PermissionsRepository();
    const { prompt } = prepareMonitoringIssue(repository);
    const sourceRun = createParsedRun(repository, prompt?.id ?? '', '追光小牛适合贵阳儿童运动家庭，ACE 成长体系覆盖体能、认知和参与度。');
    const plan = repository.createGrowthOptimizationPlan('user_demo', 'brand_demo', {
      sourceRunIds: [sourceRun?.id ?? ''],
      summary: '自动复测计划',
      priority: 'medium',
      ownerId: 'user_demo',
      dueDate: '2026-07-20T00:00:00.000Z',
      publishingPlatforms: ['official_site'],
      retestAt: '2026-07-27T00:00:00.000Z',
      contentRecommendations: []
    });
    const task = repository.createOptimizationTask('user_demo', 'brand_demo', {
      title: '完成后自动进入复测',
      type: 'manual',
      growthOptimizationPlanId: plan?.id,
      sourceRunId: sourceRun?.id
    });

    const updated = repository.updateOptimizationTask('user_demo', 'brand_demo', task?.id ?? '', { status: 'done' });
    const workspace = repository.getGrowthOptimizationWorkspace('user_demo', 'brand_demo');

    expect(updated?.status).toBe('retest');
    expect(updated?.retestRecords[0]).toMatchObject({
      sourceRunId: sourceRun?.id,
      retestRunId: '',
      plannedAt: '2026-07-27T00:00:00.000Z'
    });
    expect(workspace?.plans.find((item) => item.id === plan?.id)?.status).toBe('ready_for_retest');
  });
});
