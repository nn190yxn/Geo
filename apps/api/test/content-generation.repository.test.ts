import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function prepareGenerationScenario(repository: PermissionsRepository) {
  repository.saveBrandProfile('user_demo', 'brand_demo', {
    intro: '示例品牌提供多品牌 GEO 管理平台',
    valueProps: ['多品牌管理', '内容策略闭环'],
    offerings: ['GEO 监测', '内容生成'],
    proofPoints: ['可追溯 Prompt', '内容版本记录'],
    targetCustomers: ['品牌运营团队'],
    recommendedExpressions: ['示例品牌适合品牌运营团队提升 AI 可见度'],
    blockedExpressions: ['夸大承诺'],
    contentRules: ['正文必须包含目标关键词', '避免无法验证的效果承诺'],
    competitors: [],
    faqs: [{ question: '如何提升 GEO', answer: '从监测、策略、内容和复测闭环推进' }]
  });
  const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
    name: `内容生成单元 ${Date.now()}_${Math.random()}`,
    type: 'brand',
    targetKeywords: ['GEO 内容生成', '内容策略闭环'],
    priority: 'high'
  });
  const intent = repository.createUserIntent('user_demo', 'brand_demo', {
    optimizationUnitId: unit?.id ?? '',
    category: 'category_recommendation',
    text: '选择 GEO 内容生成工具',
    monitoringFrequency: 'manual'
  });
  const template = repository.createPromptTemplate({
    name: `内容生成模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请说明{brandName}如何支持{intent}。',
    targetKeywords: ['GEO 内容生成'],
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompts = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  });
  const strategy = repository.createContentStrategy('user_demo', 'brand_demo', {
    optimizationUnitId: unit?.id ?? '',
    intentId: intent?.id ?? '',
    type: 'gap',
    priority: 'high',
    suggestedTitle: '生成 GEO 内容策略闭环文章',
    targetPlatform: 'wechat',
    targetKeywords: ['GEO 内容生成', '内容策略闭环'],
    relatedPromptIds: [prompts?.[0].id ?? '']
  });

  return { strategyId: strategy?.id ?? '' };
}

describe('content generation repository', () => {
  it('includes Zhuiguang Xiaoniu growth optimization demo content tasks', () => {
    const repository = new PermissionsRepository();

    const growthWorkspace = repository.getGrowthOptimizationWorkspace('user_demo', 'brand_demo');
    const plan = growthWorkspace?.plans.find((item) => item.id === 'growth_plan_demo_supercalf');
    const contentWorkspace = repository.getContentGenerationWorkspace('user_demo', 'brand_demo');
    const generationTask = contentWorkspace?.tasks.find((task) => task.id === 'generation_demo_gap');
    const publishingDashboard = repository.getPublishingDashboard('user_demo', 'brand_demo');
    const demoPublishingRecord = publishingDashboard?.records.find((record) => record.id === 'publishing_record_demo_gap');

    expect(plan).toMatchObject({
      status: 'in_progress',
      ownerId: 'user_demo',
      dueDate: '2026-07-20T00:00:00.000Z',
      publishingPlatforms: ['wechat_official', 'xiaohongshu', 'official_site', 'douyin'],
      retestAt: '2026-07-27T00:00:00.000Z'
    });
    expect(plan?.reasons.map((reason) => reason.type)).toEqual(expect.arrayContaining([
      'content_gap',
      'value_prop_missing',
      'risk_expression',
      'citation_gap'
    ]));
    expect(plan?.contentRecommendations.map((item) => item.contentType)).toEqual(expect.arrayContaining([
      'wechat_article',
      'xiaohongshu_note',
      'website_faq',
      'short_video_script',
      'platform_profile_copy',
      'image_creative_brief'
    ]));
    expect(generationTask).toMatchObject({
      growthOptimizationPlanId: 'growth_plan_demo_supercalf',
      targetPlatform: 'wechat_official',
      contentType: 'wechat_article',
      contentTopic: '公众号推文：贵阳家长如何选择儿童运动成长课',
      retestAt: '2026-07-27T00:00:00.000Z'
    });
    expect(publishingDashboard?.accounts).toContainEqual(expect.objectContaining({
      id: 'publishing_account_demo_wechat',
      platform: 'wechat_official',
      accountName: '追光小牛公众号'
    }));
    expect(demoPublishingRecord).toEqual(expect.objectContaining({
      id: 'publishing_record_demo_gap',
      platform: 'wechat_official',
      status: 'draft'
    }));
    expect(demoPublishingRecord?.publishedUrl).toBeUndefined();
    expect(growthWorkspace?.relatedTasks.filter((task) => task.growthOptimizationPlanId === 'growth_plan_demo_supercalf')).toHaveLength(5);
    expect(growthWorkspace?.relatedTasks.find((task) => task.id === 'task_demo_content_gap')?.contentLink).toBe('draft://brand_demo/generation_demo_gap/version_demo_gap_v1');
  });

  it('creates completed generation tasks with steps and first editable version', () => {
    const repository = new PermissionsRepository();
    const { strategyId } = prepareGenerationScenario(repository);

    const workspace = repository.createContentGenerationTask('user_demo', 'brand_demo', {
      strategyId,
      targetPlatform: 'wechat',
      contentType: 'wechat_article'
    });

    expect(workspace?.currentTask).toMatchObject({
      brandId: 'brand_demo',
      strategyId,
      targetPlatform: 'wechat',
      contentType: 'wechat_article',
      contentTopic: '生成 GEO 内容策略闭环文章',
      targetKeywords: ['GEO 内容生成', '内容策略闭环'],
      status: 'completed'
    });
    expect(workspace?.currentTask?.steps).toHaveLength(5);
    expect(workspace?.currentTask?.steps.every((step) => step.status === 'completed')).toBe(true);
    expect(workspace?.currentVersion).toMatchObject({
      generationTaskId: workspace?.currentTask?.id,
      version: 1,
      exportFormat: 'markdown'
    });
    expect(workspace?.currentVersion?.body).toContain('GEO 内容生成');
    expect(repository.listAsyncJobs('user_demo', 'brand_demo', 'succeeded')).toContainEqual(
      expect.objectContaining({ jobType: 'content_generation', entityId: workspace?.currentTask?.id })
    );
  });

  it('creates generation tasks from growth optimization recommendations', () => {
    const repository = new PermissionsRepository();
    const { strategyId } = prepareGenerationScenario(repository);
    const plan = repository.createGrowthOptimizationPlan('user_demo', 'brand_demo', {
      strategyId,
      sourceRunIds: ['run_demo_weekly_mock'],
      summary: '首轮测试后需要补齐六类内容资产',
      reasons: [{
        type: 'content_gap',
        title: '内容缺口',
        evidence: 'AI 回答缺少品牌标准表达和可引用资料',
        relatedRunIds: ['run_demo_weekly_mock'],
        relatedPromptIds: ['prompt_demo_comparison']
      }],
      priority: 'high',
      ownerId: 'user_demo',
      dueDate: '2026-07-20T00:00:00.000Z',
      publishingPlatforms: ['wechat_official', 'xiaohongshu', 'official_site', 'douyin'],
      retestAt: '2026-07-27T00:00:00.000Z',
      contentRecommendations: [
        { contentType: 'wechat_article', title: '公众号推文任务', targetPlatform: 'wechat_official', targetKeywords: ['儿童运动'], reason: '补齐公众号长文' },
        { contentType: 'xiaohongshu_note', title: '小红书图文任务', targetPlatform: 'xiaohongshu', targetKeywords: ['贵阳体能'], reason: '补齐种草内容' },
        { contentType: 'website_faq', title: '官网 FAQ 任务', targetPlatform: 'official_site', targetKeywords: ['课程 FAQ'], reason: '补齐官网问答' },
        { contentType: 'short_video_script', title: '短视频脚本任务', targetPlatform: 'douyin', targetKeywords: ['少儿跑酷'], reason: '补齐短视频脚本' },
        { contentType: 'platform_profile_copy', title: '平台介绍文案任务', targetPlatform: 'ai_platform_profile', targetKeywords: ['ACE 成长体系'], reason: '统一平台介绍' },
        { contentType: 'image_creative_brief', title: '图片创意需求任务', targetPlatform: 'xiaohongshu', targetKeywords: ['快乐体操'], reason: '补齐图片创意' }
      ]
    });

    const workspace = repository.createContentGenerationTasksFromGrowthPlan('user_demo', 'brand_demo', { planId: plan?.id ?? '' });
    const generatedTasks = workspace?.tasks.filter((task) => task.growthOptimizationPlanId === plan?.id) ?? [];

    expect(generatedTasks).toHaveLength(6);
    expect(generatedTasks.map((task) => task.contentType)).toEqual(expect.arrayContaining([
      'wechat_article',
      'xiaohongshu_note',
      'website_faq',
      'short_video_script',
      'platform_profile_copy',
      'image_creative_brief'
    ]));
    expect(generatedTasks).toEqual(expect.arrayContaining([
      expect.objectContaining({ contentTopic: '官网 FAQ 任务', targetPlatform: 'official_site', targetKeywords: ['课程 FAQ'], retestAt: '2026-07-27T00:00:00.000Z' })
    ]));
    expect(generatedTasks.every((task) => task.referenceSources.some((source) => source.includes('内容缺口')))).toBe(true);
  });

  it('saves versions, exports markdown and returns publish entry payload', () => {
    const repository = new PermissionsRepository();
    const { strategyId } = prepareGenerationScenario(repository);
    const workspace = repository.createContentGenerationTask('user_demo', 'brand_demo', { strategyId });
    const taskId = workspace?.currentTask?.id ?? '';

    const saved = repository.saveContentVersion('user_demo', 'brand_demo', taskId, {
      title: '编辑后的 GEO 内容文章',
      body: '正文包含 GEO 内容生成 和 内容策略闭环。',
      exportFormat: 'markdown'
    });
    const exported = repository.exportContentMarkdown('user_demo', 'brand_demo', taskId, saved?.currentVersion?.id);
    const publishPayload = repository.getPublishingEntryPayload('user_demo', 'brand_demo', taskId, saved?.currentVersion?.id);

    expect(saved?.currentVersion).toMatchObject({
      title: '编辑后的 GEO 内容文章',
      version: 2,
      exportFormat: 'markdown'
    });
    expect(exported).toMatchObject({
      brandId: 'brand_demo',
      generationTaskId: taskId,
      versionId: saved?.currentVersion?.id,
      exportFormat: 'markdown',
      createdBy: 'user_demo'
    });
    expect(exported?.content).toContain('# 编辑后的 GEO 内容文章');
    expect(publishPayload).toMatchObject({
      brandId: 'brand_demo',
      strategyId,
      generationTaskId: taskId,
      versionId: saved?.currentVersion?.id,
      targetPlatform: 'wechat',
      contentType: 'wechat_article'
    });
    expect(publishPayload?.targetKeywords).toContain('内容策略闭环');
  });

  it('updates generation step status and derives task status', () => {
    const repository = new PermissionsRepository();
    const { strategyId } = prepareGenerationScenario(repository);
    const workspace = repository.createContentGenerationTask('user_demo', 'brand_demo', { strategyId });
    const taskId = workspace?.currentTask?.id ?? '';

    const running = repository.updateContentGenerationStep('user_demo', 'brand_demo', taskId, {
      stepKey: 'body_generation',
      status: 'running',
      message: '正在生成正文草稿'
    });

    expect(running?.currentTask).toMatchObject({ id: taskId, status: 'running' });
    expect(running?.currentTask?.steps).toContainEqual(
      expect.objectContaining({ key: 'body_generation', status: 'running', message: '正在生成正文草稿' })
    );

    const failed = repository.updateContentGenerationStep('user_demo', 'brand_demo', taskId, {
      stepKey: 'geo_rule_check',
      status: 'failed',
      message: '命中禁用表达'
    });

    expect(failed?.currentTask).toMatchObject({ id: taskId, status: 'failed', errorMessage: '命中禁用表达' });
    expect(failed?.currentTask?.steps).toContainEqual(
      expect.objectContaining({ key: 'geo_rule_check', status: 'failed', message: '命中禁用表达' })
    );
    expect(failed?.currentTask?.steps.find((step) => step.key === 'geo_rule_check')?.completedAt).toBeTruthy();
  });

  it('writes generated draft versions after successful task completion', () => {
    const repository = new PermissionsRepository();
    const { strategyId } = prepareGenerationScenario(repository);
    const workspace = repository.createContentGenerationTask('user_demo', 'brand_demo', { strategyId });
    const taskId = workspace?.currentTask?.id ?? '';

    repository.updateContentGenerationStep('user_demo', 'brand_demo', taskId, {
      stepKey: 'body_generation',
      status: 'running',
      message: '正在生成正文草稿'
    });

    const completed = repository.completeContentGenerationTask('user_demo', 'brand_demo', taskId, {
      title: '异步生成后的 GEO 内容',
      body: '异步生成正文包含 GEO 内容生成 和 内容策略闭环。',
      completedAt: '2026-07-03T10:00:00.000Z'
    });
    const exported = repository.exportContentMarkdown('user_demo', 'brand_demo', taskId, completed?.currentVersion?.id);
    const publishPayload = repository.getPublishingEntryPayload('user_demo', 'brand_demo', taskId, completed?.currentVersion?.id);

    expect(completed?.currentTask).toMatchObject({ id: taskId, status: 'completed', errorMessage: undefined });
    expect(completed?.currentTask?.steps.every((step) => step.status === 'completed')).toBe(true);
    expect(completed?.currentVersion).toMatchObject({ title: '异步生成后的 GEO 内容', version: 2, exportFormat: 'markdown' });
    expect(exported).toMatchObject({ versionId: completed?.currentVersion?.id, content: '# 异步生成后的 GEO 内容\n\n异步生成正文包含 GEO 内容生成 和 内容策略闭环。' });
    expect(publishPayload).toMatchObject({ generationTaskId: taskId, versionId: completed?.currentVersion?.id, title: '异步生成后的 GEO 内容' });
  });

  it('records failed generation steps and requeues failed tasks for retry', () => {
    const repository = new PermissionsRepository();
    const { strategyId } = prepareGenerationScenario(repository);
    const workspace = repository.createContentGenerationTask('user_demo', 'brand_demo', { strategyId });
    const taskId = workspace?.currentTask?.id ?? '';

    const failed = repository.recordContentGenerationFailure('user_demo', 'brand_demo', taskId, {
      stepKey: 'body_generation',
      errorCode: 'provider_timeout',
      errorMessage: '正文生成超时',
      retryable: true,
      failedAt: '2026-07-03T11:00:00.000Z'
    });

    expect(failed?.currentTask).toMatchObject({ id: taskId, status: 'failed', errorMessage: '正文生成超时' });
    expect(failed?.currentTask?.steps).toContainEqual(
      expect.objectContaining({ key: 'body_generation', status: 'failed', message: '正文生成超时', completedAt: '2026-07-03T11:00:00.000Z' })
    );
    expect(repository.listAsyncJobs('user_demo', 'brand_demo', 'failed')).toContainEqual(
      expect.objectContaining({ jobType: 'content_generation', entityId: taskId, attemptCount: 2, lastErrorCode: 'provider_timeout' })
    );

    const retried = repository.retryContentGenerationTask('user_demo', 'brand_demo', taskId, { nextRunAt: '2026-07-03T11:05:00.000Z' });

    expect(retried?.currentTask).toMatchObject({ id: taskId, status: 'pending', errorMessage: undefined });
    expect(retried?.currentTask?.steps.find((step) => step.key === 'body_generation')).toMatchObject({ status: 'pending' });
    expect(repository.listAsyncJobs('user_demo', 'brand_demo', 'queued')).toContainEqual(
      expect.objectContaining({ jobType: 'content_generation', entityId: taskId, nextRunAt: '2026-07-03T11:05:00.000Z' })
    );
  });
});
