import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('PermissionsRepository', () => {
  it('only returns brands granted to the current user', () => {
    const repository = new PermissionsRepository();

    const accessibleBrands = repository.listAccessibleBrands('user_demo');
    const accessibleBrandIds = accessibleBrands.map((brand) => brand.brandId);

    expect(accessibleBrandIds).toContain('brand_demo');
    expect(accessibleBrandIds).toContain('brand_child_fitness');
    expect(repository.canAccessBrand('user_demo', 'unknown_brand')).toBe(false);
  });

  it('preloads the default demo brand with a usable pilot workflow', () => {
    const repository = new PermissionsRepository();

    const workspace = repository.getBrandWorkspaceSnapshot('user_demo', 'brand_demo');

    expect(workspace?.relatedCounts).toMatchObject({
      profile: 1,
      optimizationUnits: 1,
      intents: 1,
      prompts: 1,
      competitors: 1,
      contentAssets: 1,
      monitoringRuns: 1,
      reports: 1,
      advisorRecords: 1
    });
    expect(repository.listContentStrategies('user_demo', 'brand_demo')).toContainEqual(
      expect.objectContaining({ type: 'gap', status: 'task_created' })
    );
    expect(repository.getContentGenerationWorkspace('user_demo', 'brand_demo')?.currentTask).toEqual(
      expect.objectContaining({ status: 'completed' })
    );
    expect(repository.getPublishingDashboard('user_demo', 'brand_demo')?.records).toContainEqual(
      expect.objectContaining({ status: 'draft' })
    );
    expect(repository.getAdvisorDashboard('user_demo', 'brand_demo')?.pendingFollowUps).toContainEqual(
      expect.objectContaining({ title: '收集客户反馈' })
    );
  });

  it('preloads and manages visibility sprints by accessible brand', () => {
    const repository = new PermissionsRepository();

    const current = repository.getCurrentVisibilitySprint('user_demo', 'brand_demo');

    expect(current).toEqual(
      expect.objectContaining({
        brandId: 'brand_demo',
        status: 'running',
        currentStep: 'content_asset_generation',
        relatedTestPlanIds: ['test_plan_demo_supercalf_first_round'],
        relatedMonitoringRunIds: ['run_demo_weekly_mock'],
        relatedStandardAnswerIds: ['standard_answer_demo_local_recommendation'],
        relatedContentTaskIds: ['generation_demo_gap']
      })
    );
    expect(current?.metricSummary.sampleSize).toBe(12);
    expect(repository.listVisibilitySprints('user_demo', 'brand_missing')).toBeNull();
  });

  it('creates and updates visibility sprint steps, metrics and relations', () => {
    const repository = new PermissionsRepository();

    const created = repository.createVisibilitySprint('user_demo', 'brand_demo', {
      title: '新一轮 AI 可见性 Sprint',
      goal: '验证贵阳儿童运动本地推荐场景',
      relatedQuestionIds: ['candidate_demo_local_recommendation']
    });

    expect(created).toEqual(
      expect.objectContaining({
        brandId: 'brand_demo',
        title: '新一轮 AI 可见性 Sprint',
        status: 'draft',
        currentStep: 'question_radar',
        relatedQuestionIds: ['candidate_demo_local_recommendation']
      })
    );
    expect(created?.steps.find((step) => step.code === 'question_radar')?.status).toBe('running');

    const updatedStep = repository.updateVisibilitySprintStep('user_demo', 'brand_demo', created?.sprintId ?? '', {
      status: 'running',
      currentStep: 'ai_response_monitoring'
    });
    expect(updatedStep).toEqual(expect.objectContaining({ status: 'running', currentStep: 'ai_response_monitoring' }));
    expect(updatedStep?.steps.find((step) => step.code === 'question_radar')?.status).toBe('completed');

    const updatedMetrics = repository.updateVisibilitySprintMetrics('user_demo', 'brand_demo', created?.sprintId ?? '', {
      mentionRate: 0.5,
      sampleSize: 4
    });
    expect(updatedMetrics?.metricSummary).toEqual(expect.objectContaining({ mentionRate: 0.5, sampleSize: 4 }));

    const updatedRelations = repository.updateVisibilitySprintRelations('user_demo', 'brand_demo', created?.sprintId ?? '', {
      relatedMonitoringRunIds: ['run_demo_weekly_mock'],
      relatedPublishingRecordIds: ['publishing_record_demo_gap']
    });
    expect(updatedRelations).toEqual(
      expect.objectContaining({
        relatedMonitoringRunIds: ['run_demo_weekly_mock'],
        relatedPublishingRecordIds: ['publishing_record_demo_gap']
      })
    );
    expect(repository.updateVisibilitySprintMetrics('user_demo', 'brand_child_fitness', created?.sprintId ?? '', { sampleSize: 8 })).toBeNull();
  });

  it('manages brand standard answers separately from monitoring samples', () => {
    const repository = new PermissionsRepository();

    const defaults = repository.listBrandStandardAnswers('user_demo', 'brand_demo', 'candidate_demo_local_recommendation');

    expect(defaults).toContainEqual(
      expect.objectContaining({
        answerId: 'standard_answer_demo_local_recommendation',
        questionId: 'candidate_demo_local_recommendation',
        status: 'approved',
        keyPoints: expect.arrayContaining(['ACE 课程体系'])
      })
    );

    const created = repository.createBrandStandardAnswer('user_demo', 'brand_demo', {
      questionId: 'candidate_new',
      question: ' 3 岁孩子适合什么运动课？ ',
      answer: ' 适合以趣味体能、协调和平衡为主的运动成长课。 ',
      keyPoints: [' 趣味体能 ', ''],
      evidence: [{ label: ' 年龄段 ', sourceType: 'manual', excerpt: ' 3 岁儿童以兴趣和基础动作为主。 ' }]
    });

    expect(created).toEqual(
      expect.objectContaining({
        brandId: 'brand_demo',
        questionId: 'candidate_new',
        question: '3 岁孩子适合什么运动课？',
        answer: '适合以趣味体能、协调和平衡为主的运动成长课。',
        keyPoints: ['趣味体能'],
        status: 'draft'
      })
    );
    expect(created?.evidence[0]).toEqual(expect.objectContaining({ label: '年龄段', excerpt: '3 岁儿童以兴趣和基础动作为主。' }));

    const reviewed = repository.updateBrandStandardAnswer('user_demo', 'brand_demo', created?.answerId ?? '', {
      status: 'approved',
      reviewedBy: 'user_demo',
      reviewedAt: '2026-07-11T00:00:00.000Z'
    });
    expect(reviewed).toEqual(expect.objectContaining({ status: 'approved', reviewedBy: 'user_demo' }));
    expect(repository.listBrandStandardAnswers('user_demo', 'brand_child_fitness', 'candidate_new')).toEqual([]);
    expect(repository.getBrandStandardAnswer('user_demo', 'brand_child_fitness', created?.answerId ?? '')).toBeNull();
  });

  it('records denied brand access attempts by user', () => {
    const repository = new PermissionsRepository();

    repository.recordDeniedAccess({
      userId: 'user_demo',
      brandId: 'unknown_brand',
      reason: 'USER_BRAND_PERMISSION_MISSING',
      requestedAt: '2026-07-03T00:00:00.000Z'
    });

    expect(repository.listDeniedAccessLogs('user_demo')).toHaveLength(1);
    expect(repository.listDeniedAccessLogs('other_user')).toHaveLength(0);
  });
});
