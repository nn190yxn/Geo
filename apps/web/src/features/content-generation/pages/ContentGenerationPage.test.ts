import { describe, expect, it } from 'vitest';
import type { ContentGenerationTask, ContentVersion, PublishingRecord } from '@geo-platform/shared-types';
import { contentTemplateCategories, contentTemplateOptions, formatList, getChannelReadinessItems, getContentCreationWorkspaceState, getContentDraftPanelState, getContentGenerationTaskState, getContentMaterialSources, getContentOptimizationSuggestions, getContentStudioMode, getContentTaskAssociation, getContentTaskDisplayName, getContentTaskInputPayload, getContentTaskListStats, getContentTaskPublishedAt, getContentTaskPublishSummary, getContentTemplateFormPreset, getContentTemplatesByCategory, getContentTypeLabel, getDraftQualityCheck, getDraftReviewNotes, getFilteredContentTasks, getGenerationPreset } from './ContentGenerationPage';

describe('ContentGenerationPage status helpers', () => {
  it('shows failed content generation tasks as retryable work', () => {
    expect(getContentGenerationTaskState({ status: 'failed', errorMessage: 'Body generation failed' })).toEqual({
      label: '生成失败',
      color: 'red',
      alert: 'Body generation failed',
      alertType: 'error'
    });
  });

  it('shows generating tasks as in progress', () => {
    expect(getContentGenerationTaskState({ status: 'running' })).toEqual({
      label: '生成中',
      color: 'blue',
      alert: '正在生成内容草稿',
      alertType: 'info'
    });
  });

  it('maps content creation data to the shared workspace states', () => {
    expect(getContentCreationWorkspaceState({ loading: true, error: false, hasTask: false })).toBe('loading');
    expect(getContentCreationWorkspaceState({ loading: false, error: true, hasTask: false })).toBe('error');
    expect(getContentCreationWorkspaceState({ loading: false, error: false, hasTask: false })).toBe('empty');
    expect(getContentCreationWorkspaceState({ loading: false, error: false, hasTask: true })).toBe('ready');
  });

  it('labels the first version growth content types for operators', () => {
    expect(getContentTypeLabel('wechat_article')).toBe('公众号推文');
    expect(getContentTypeLabel('xiaohongshu_note')).toBe('小红书图文');
    expect(getContentTypeLabel('website_faq')).toBe('官网 FAQ');
    expect(getContentTypeLabel('short_video_script')).toBe('短视频脚本');
    expect(getContentTypeLabel('platform_profile_copy')).toBe('平台介绍文案');
    expect(getContentTypeLabel('image_creative_brief')).toBe('图片创意需求');
  });

  it('formats task keywords and references for compact display', () => {
    expect(formatList(['儿童运动', '贵阳体能'])).toBe('儿童运动、贵阳体能');
    expect(formatList([])).toBe('-');
  });

  it('uses business-facing task names instead of internal task ids', () => {
    expect(getContentTaskDisplayName({ contentTopic: '贵阳儿童运动选课指南', contentType: 'wechat_article', targetPlatform: 'wechat_official' })).toBe('贵阳儿童运动选课指南');
    expect(getContentTaskDisplayName({ contentType: 'wechat_article', targetPlatform: 'wechat_official' })).toBe('公众号推文');
  });

  it('filters content tasks by status and platform', () => {
    const tasks = [
      buildContentTask({ id: 'task-1', status: 'completed', targetPlatform: 'wechat_official' }),
      buildContentTask({ id: 'task-2', status: 'running', targetPlatform: 'xiaohongshu' })
    ];

    expect(getFilteredContentTasks(tasks, 'completed', 'all').map((task) => task.id)).toEqual(['task-1']);
    expect(getFilteredContentTasks(tasks, 'all', 'xiaohongshu').map((task) => task.id)).toEqual(['task-2']);
  });

  it('searches content tasks by title, template, association and keyword', () => {
    const tasks = [
      buildContentTask({ id: 'task-1', strategyId: 'strategy-1', contentTopic: '贵阳儿童运动选课指南', contentType: 'wechat_article', targetKeywords: ['体能训练'] }),
      buildContentTask({ id: 'task-2', strategyId: 'strategy-2', contentTopic: '门店新闻', contentType: 'media_release', targetKeywords: ['品牌动态'] })
    ];
    const strategies = [
      { id: 'strategy-1', suggestedTitle: '儿童运动决策内容' },
      { id: 'strategy-2', suggestedTitle: '品牌传播内容' }
    ];

    expect(getFilteredContentTasks(tasks, 'all', 'all', '选课', strategies).map((task) => task.id)).toEqual(['task-1']);
    expect(getFilteredContentTasks(tasks, 'all', 'all', '公众号推文', strategies).map((task) => task.id)).toEqual(['task-1']);
    expect(getFilteredContentTasks(tasks, 'all', 'all', '儿童运动决策', strategies).map((task) => task.id)).toEqual(['task-1']);
    expect(getFilteredContentTasks(tasks, 'all', 'all', '品牌动态', strategies).map((task) => task.id)).toEqual(['task-2']);
  });

  it('shows business associations without exposing internal ids', () => {
    expect(getContentTaskAssociation({ strategyId: 'strategy-1', growthOptimizationPlanId: 'plan-1' }, [
      { id: 'strategy-1', suggestedTitle: '儿童运动选课决策' }
    ])).toBe('儿童运动选课决策');
    expect(getContentTaskAssociation({ strategyId: 'missing', growthOptimizationPlanId: 'plan-1' }, [])).toBe('已关联优化计划');
  });

  it('uses the latest published record as task publication time', () => {
    expect(getContentTaskPublishedAt([
      buildPublishingRecord({ id: 'record-1', generationTaskId: 'task-1', status: 'pending', updatedAt: '2026-07-15T10:00:00.000Z' }),
      buildPublishingRecord({ id: 'record-2', generationTaskId: 'task-1', status: 'published', updatedAt: '2026-07-15T11:00:00.000Z' }),
      buildPublishingRecord({ id: 'record-3', generationTaskId: 'task-1', status: 'published', updatedAt: '2026-07-16T09:00:00.000Z' }),
      buildPublishingRecord({ id: 'record-4', generationTaskId: 'task-2', status: 'published', updatedAt: '2026-07-16T10:00:00.000Z' })
    ], 'task-1')).toBe('2026-07-16T09:00:00.000Z');
  });

  it('summarizes content task list operations for operators', () => {
    const tasks = [
      buildContentTask({ id: 'task-1', status: 'completed', retestAt: '2026-07-27T00:00:00.000Z' }),
      buildContentTask({ id: 'task-2', status: 'pending' }),
      buildContentTask({ id: 'task-3', status: 'running' }),
      buildContentTask({ id: 'task-4', status: 'failed' })
    ];

    expect(getContentTaskListStats(tasks)).toEqual({
      total: 4,
      completed: 1,
      pending: 2,
      publishReady: 1
    });
    expect(getContentTaskPublishSummary(tasks[0])).toBe('待发布，已安排再次监测');
    expect(getContentTaskPublishSummary(tasks[3])).toBe('生成失败，暂无发布统计');
  });

  it('keeps content task submission within backend contract fields', () => {
    expect(getContentTaskInputPayload({
      strategyId: 'strategy-1',
      growthOptimizationPlanId: 'plan-1',
      targetPlatform: 'wechat_official',
      contentType: 'wechat_article',
      contentTopic: '贵阳儿童运动选课指南',
      targetKeywords: ['儿童运动'],
      referenceSources: ['真实 AI 回复'],
      retestAt: '2026-07-27T00:00:00.000Z',
      userIntent: '想了解课程是否适合孩子',
      toneStyle: 'friendly',
      imageAssetRequirement: ['门店图'],
      complianceRequirement: ['避免绝对化承诺']
    })).toEqual({
      strategyId: 'strategy-1',
      growthOptimizationPlanId: 'plan-1',
      targetPlatform: 'wechat_official',
      contentType: 'wechat_article',
      contentTopic: '贵阳儿童运动选课指南',
      targetKeywords: ['儿童运动'],
      referenceSources: ['真实 AI 回复'],
      retestAt: '2026-07-27T00:00:00.000Z'
    });
  });

  it('maps existing content and optimization goals into task reference context', () => {
    expect(getContentTaskInputPayload({
      strategyId: 'strategy-1',
      targetPlatform: 'official_site',
      contentType: 'website_faq',
      targetKeywords: ['儿童体能'],
      referenceSources: ['品牌资料'],
      sourceAssetReference: '儿童体能 FAQ（https://example.com/faq）',
      sourceContent: '原有 FAQ 正文',
      optimizationGoals: ['事实补强', 'FAQ 补充']
    }, 'optimization').referenceSources).toEqual([
      '品牌资料',
      '现有内容资产：儿童体能 FAQ（https://example.com/faq）',
      '待优化原文：原有 FAQ 正文',
      '优化目标：事实补强、FAQ 补充'
    ]);
  });

  it('builds structure, fact, FAQ, citation and channel optimization suggestions', () => {
    const suggestions = getContentOptimizationSuggestions('# 标题\n\n## 常见问题\n孩子适合吗？\n\n## 引用依据', {
      referenceSources: ['品牌资料'],
      targetPlatform: 'official_site'
    });

    expect(suggestions.map((item) => item.key)).toEqual(['structure', 'facts', 'faq', 'citations', 'channel']);
    expect(suggestions.map((item) => item.status)).toEqual(['结构清晰', '已有依据', '已覆盖', '已有线索', '已匹配渠道']);
  });

  it('provides content template rules for common publishing scenarios', () => {
    expect(contentTemplateOptions).toHaveLength(12);
    expect(contentTemplateOptions.map((template) => template.key)).toEqual(expect.arrayContaining([
      'brand_story',
      'faq_answer',
      'guide',
      'comparison',
      'case_story',
      'ranking_recommendation',
      'local_guide',
      'faq_collection',
      'media_release',
      'xiaohongshu_seed',
      'zhihu_longform',
      'wechat_article'
    ]));
    expect(contentTemplateOptions.every((template) => template.applicablePlatforms.length > 0 && template.materialRequirements.length > 0 && template.retestSuggestion && template.contentType && template.targetPlatform)).toBe(true);
  });

  it('organizes every template into seven non-empty usage categories', () => {
    expect(contentTemplateCategories.map((category) => category.label)).toEqual([
      '品牌宣传',
      '问答',
      '案例',
      '教程',
      '对比',
      '科普',
      '渠道内容'
    ]);
    expect(contentTemplateCategories.every((category) => getContentTemplatesByCategory(category.key).length > 0)).toBe(true);
    expect(contentTemplateCategories.flatMap((category) => getContentTemplatesByCategory(category.key))).toHaveLength(contentTemplateOptions.length);
  });

  it('writes the selected template into the existing task input fields', () => {
    const template = contentTemplateOptions.find((item) => item.key === 'xiaohongshu_seed');

    expect(template).toBeDefined();
    expect(getContentTemplateFormPreset(template!)).toEqual({
      contentType: 'xiaohongshu_note',
      targetPlatform: 'xiaohongshu'
    });
  });

  it('uses dedicated copy for content generation and optimization routes', () => {
    expect(getContentStudioMode('/content-generation')).toMatchObject({
      kind: 'generation',
      title: '内容生成'
    });
    expect(getContentStudioMode('/content-optimization')).toMatchObject({
      kind: 'optimization',
      title: '内容优化'
    });
  });

  it('builds source readiness from task keywords and references', () => {
    const sources = getContentMaterialSources({
      targetKeywords: ['贵阳儿童运动'],
      referenceSources: ['真实 AI 回复：豆包']
    });

    expect(sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '真实 AI 回复', status: '已选择', color: 'green' }),
      expect.objectContaining({ label: '目标关键词', status: '已选择', color: 'green' })
    ]));
  });

  it('marks missing content material sources as pending work', () => {
    const sources = getContentMaterialSources({ targetKeywords: [], referenceSources: [] });

    expect(sources).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '真实 AI 回复', status: '待补充', color: 'orange' }),
      expect.objectContaining({ label: '目标关键词', status: '待补充', color: 'orange' })
    ]));
  });

  it('builds generation presets for each studio mode', () => {
    expect(getGenerationPreset({ contentType: 'wechat_article', targetPlatform: 'wechat_official' }, 'generation')).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '任务模式', value: '生成新内容' }),
      expect.objectContaining({ label: '内容规格', value: '公众号推文' })
    ]));
    expect(getGenerationPreset({ contentType: 'website_faq', targetPlatform: 'official_site' }, 'optimization')).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '任务模式', value: '优化已有内容' })
    ]));
  });

  it('extracts review notes from generated markdown drafts', () => {
    expect(getDraftReviewNotes('正文\n\n合规说明：\n- 避免承诺效果\n\n复测建议：\n- 发布后复测贵阳儿童运动\n\n需要你确认：包含风险表达')).toEqual({
      visible: true,
      reviewRequired: true,
      complianceNotes: ['避免承诺效果'],
      retestSuggestions: ['发布后复测贵阳儿童运动']
    });
  });

  it('hides review notes when generated draft has no guidance section', () => {
    expect(getDraftReviewNotes('普通正文')).toEqual({
      visible: false,
      reviewRequired: false,
      complianceNotes: [],
      retestSuggestions: []
    });
  });

  it('blocks short drafts from publish preparation', () => {
    expect(getDraftQualityCheck('短正文', 'wechat_article')).toMatchObject({
      publishable: false,
      missingSections: ['品牌事实', '家长行动建议', '合规说明', '复测建议']
    });
  });

  it('blocks drafts that miss required review sections', () => {
    const body = `${'完整正文内容'.repeat(40)}\n\n品牌事实：\n- 贵阳 5 家校区`;

    expect(getDraftQualityCheck(body, 'wechat_article')).toMatchObject({
      publishable: false,
      missingSections: ['家长行动建议', '合规说明', '复测建议']
    });
  });

  it('builds channel readiness from draft quality and publishing task fields', () => {
    const quality = getDraftQualityCheck('短正文', 'wechat_article');

    expect(getChannelReadinessItems({
      contentType: 'wechat_article',
      targetKeywords: ['儿童运动'],
      referenceSources: ['品牌资料'],
      retestAt: '2026-07-27T00:00:00.000Z'
    }, quality)).toEqual(expect.arrayContaining([
      expect.objectContaining({ label: '内容结构', status: '待处理', color: 'orange' }),
      expect.objectContaining({ label: '素材引用', status: '已选择', color: 'green' }),
      expect.objectContaining({ label: '再次监测', status: '已安排', color: 'green' })
    ]));
  });

  it('allows complete drafts to enter publish preparation', () => {
    const body = `${'追光小牛围绕儿童运动成长提供课程说明和家长选择建议，帮助贵阳家庭理解课程体系、教练反馈和长期训练价值。'.repeat(22)}\n\n品牌事实：\n- 贵阳 5 家校区\n\n家长行动建议：\n- 先预约体验课并查看体测反馈\n\n合规说明：\n- 避免承诺训练效果\n\n复测建议：\n- 发布后复测贵阳儿童运动推荐`;

    expect(getDraftQualityCheck(body, 'wechat_article')).toMatchObject({
      publishable: true,
      missingSections: []
    });
  });

  it('uses platform-level standards for Xiaohongshu drafts', () => {
    const body = `${'追光小牛面向贵阳家长说明儿童运动成长课的选课标准、课堂反馈和长期训练价值。'.repeat(16)}\n\n品牌事实：\n- 追光小牛服务贵阳 2-14 岁儿童家庭\n\n话题标签：\n#贵阳儿童体能 #儿童运动成长\n\n合规说明：\n- 避免绝对化承诺\n\n复测建议：\n- 发布后复测小红书相关搜索表达`;

    expect(getDraftQualityCheck(body, 'xiaohongshu_note')).toMatchObject({
      publishable: true,
      missingSections: []
    });
  });

  it('blocks drafts with high-risk growth promises', () => {
    const body = `${'追光小牛围绕儿童运动成长提供课程说明和家长选择建议，帮助贵阳家庭理解课程体系、教练反馈和长期训练价值。'.repeat(22)}\n\n品牌事实：\n- 贵阳 5 家校区\n\n家长行动建议：\n- 先预约体验课并查看体测反馈\n\n合规说明：\n- 避免承诺训练效果\n\n复测建议：\n- 发布后复测贵阳儿童运动推荐\n\n保证长高`;

    expect(getDraftQualityCheck(body, 'wechat_article')).toMatchObject({
      publishable: false,
      issues: expect.arrayContaining(['包含高风险表达 保证长高'])
    });
  });

  it('describes draft panel states for generation progress and review work', () => {
    const runningTask = buildContentTask({
      status: 'running',
      steps: [{ key: 'body_generation', label: '生成正文', status: 'running' }]
    });
    const shortQuality = getDraftQualityCheck('短正文', 'wechat_article');

    expect(getContentDraftPanelState(runningTask, undefined, shortQuality)).toMatchObject({
      key: 'generating',
      nextAction: '等待生成完成'
    });
    expect(getContentDraftPanelState(buildContentTask({ status: 'completed' }), buildContentVersion(), shortQuality)).toMatchObject({
      key: 'review_required',
      nextAction: '补齐草稿'
    });
  });

  it('marks publishable drafts as ready for publishing preparation', () => {
    const body = `${'追光小牛围绕儿童运动成长提供课程说明和家长选择建议，帮助贵阳家庭理解课程体系、教练反馈和长期训练价值。'.repeat(22)}\n\n品牌事实：\n- 贵阳 5 家校区\n\n家长行动建议：\n- 先预约体验课并查看体测反馈\n\n合规说明：\n- 避免承诺训练效果\n\n复测建议：\n- 发布后复测贵阳儿童运动推荐`;

    expect(getContentDraftPanelState(buildContentTask({ status: 'completed' }), buildContentVersion({ body }), getDraftQualityCheck(body, 'wechat_article'))).toMatchObject({
      key: 'publish_ready',
      nextAction: '进入发布准备'
    });
  });
});

function buildContentTask(overrides: Partial<ContentGenerationTask> = {}): ContentGenerationTask {
  return {
    id: 'task-1',
    brandId: 'brand-1',
    strategyId: 'strategy-1',
    targetPlatform: 'wechat_official',
    contentType: 'wechat_article',
    contentTopic: '贵阳儿童运动选课指南',
    targetKeywords: ['儿童运动'],
    referenceSources: ['品牌资料'],
    status: 'completed',
    steps: [],
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides
  };
}

function buildContentVersion(overrides: Partial<ContentVersion> = {}): ContentVersion {
  return {
    id: 'version-1',
    brandId: 'brand-1',
    generationTaskId: 'task-1',
    title: '贵阳儿童运动选课指南',
    body: '短正文',
    version: 1,
    exportFormat: 'markdown',
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides
  };
}

function buildPublishingRecord(overrides: Partial<PublishingRecord> = {}): PublishingRecord {
  return {
    id: 'record-1',
    brandId: 'brand-1',
    contentAssetId: 'asset-1',
    generationTaskId: 'task-1',
    title: '贵阳儿童运动选课指南',
    body: '内容正文',
    platform: 'wechat_official',
    status: 'published',
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...overrides
  };
}
