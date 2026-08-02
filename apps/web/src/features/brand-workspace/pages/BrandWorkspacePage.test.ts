import { describe, expect, it } from 'vitest';
import type { BrandWorkspaceSnapshot } from '@geo-platform/shared-types';
import { getBrandImportCompletenessScore, getImportFieldConfidenceState, getMissingFieldImpact, getBrandImportDraftState, supportedBrandImportFormats } from './brandImportState';
import { brandProfileLibraryGroups, getBrandProfileGroupMissingLabels, getBrandProfileGroupProgress } from '../components/brandProfileLibrary';
import { getBrandProfileAssetCategories } from '../components/BrandKnowledgeCard';
import { firstRoundSteps, getFirstRoundCurrentStep, getFirstRoundStepStatus } from './firstRoundWorkflow';
import { getSprintMetricCards, getSprintNextAction, getSprintProgressPercent, getSprintStatusLabel, getSprintStepDisplayStatus } from './sprintWorkspace';
import { beginnerQuestionEntries, beginnerStartActions, getBeginnerActionState, getBeginnerMetrics, getBeginnerTodos, getNextBeginnerTodo, getWorkspaceModuleMetric, workspaceModules } from './workspaceModules';
import { getBrandWorkspacePageMode, getBrandWorkspacePagePresentation } from './BrandWorkspacePage';

describe('BrandWorkspacePage import helpers', () => {
  it('shows ready import drafts as confirmation work', () => {
    expect(getBrandImportDraftState({ status: 'ready_for_confirmation' })).toEqual({
      label: '待确认',
      color: 'green',
      message: '资料已读取完成，下一步确认品牌档案。',
      alertType: 'success'
    });
  });

  it('shows failed import drafts with manual fallback guidance', () => {
    expect(getBrandImportDraftState({ status: 'failed' })).toEqual({
      label: '读取失败',
      color: 'red',
      message: '资料已保存，请查看失败原因或改用手动填写。',
      alertType: 'warning'
    });
  });

  it('calculates imported profile completeness from filled fields', () => {
    expect(getBrandImportCompletenessScore({
      fields: [
        { key: 'name', label: '品牌名称', value: '追光小牛', confidence: 'high', confirmationRequired: false },
        { key: 'industry', label: '行业', value: null, confidence: 'needs_confirmation', confirmationRequired: true },
        { key: 'targetCities', label: '目标城市', value: ['贵阳'], confidence: 'medium', confirmationRequired: true }
      ]
    })).toBe(67);
  });

  it('maps field confidence and missing impacts to user-facing guidance', () => {
    expect(getImportFieldConfidenceState('needs_confirmation')).toEqual({ label: '需要确认', color: 'red' });
    expect(getMissingFieldImpact('targetCities')).toContain('本地推荐类监测问题');
  });

  it('keeps the supported upload formats visible for the import entry', () => {
    expect(supportedBrandImportFormats).toEqual(['Markdown', 'DOCX', '文本型 PDF']);
  });
});

describe('BrandWorkspacePage first round workflow helpers', () => {
  it('keeps the beginner first round workflow in the expected order', () => {
    expect(firstRoundSteps.map((step) => step.title)).toEqual([
      '上传资料',
      '选择监测问题',
      '连接 AI 平台',
      '开始监测',
      '查看建议',
      '处理优化',
      '再次监测'
    ]);
  });

  it('uses brand workspace progress to choose the current first round step', () => {
    expect(getFirstRoundCurrentStep(null, null)).toBe(0);
    expect(getFirstRoundCurrentStep({ brand: createBrand(), relatedCounts: createCounts({ profile: 1 }) }, null)).toBe(1);
    expect(getFirstRoundCurrentStep({ brand: createBrand(), relatedCounts: createCounts({ profile: 1, prompts: 3 }) }, null)).toBe(3);
    expect(getFirstRoundCurrentStep({ brand: createBrand(), relatedCounts: createCounts({ profile: 1, prompts: 3, monitoringRuns: 4 }) }, null)).toBe(5);
  });

  it('marks previous, current and future workflow steps clearly', () => {
    expect(getFirstRoundStepStatus(0, 2)).toBe('finish');
    expect(getFirstRoundStepStatus(2, 2)).toBe('process');
    expect(getFirstRoundStepStatus(3, 2)).toBe('wait');
  });
});

describe('BrandWorkspacePage Sprint workspace helpers', () => {
  it('maps Sprint status and step status to display state', () => {
    expect(getSprintStatusLabel('waiting_confirmation')).toEqual({ label: '待确认', color: 'orange' });
    expect(getSprintStepDisplayStatus('completed')).toBe('finish');
    expect(getSprintStepDisplayStatus('waiting_confirmation')).toBe('process');
    expect(getSprintStepDisplayStatus('failed')).toBe('error');
  });

  it('chooses the next user action from current Sprint stage', () => {
    expect(getSprintNextAction(null)).toMatchObject({ label: '查看监测地图', route: '/canvas' });
    expect(getSprintNextAction(createSprint({ currentStep: 'ai_response_monitoring' }))).toMatchObject({
      label: '录入真实回复',
      route: '/monitoring#manual-test-entry'
    });
    expect(getSprintNextAction(createSprint({ currentStep: 'publishing_preparation' }))).toMatchObject({ label: '准备发布', route: '/publishing' });
  });

  it('calculates Sprint progress and metric cards from summary', () => {
    const sprint = createSprint({
      steps: [
        { code: 'question_radar', title: '问题意图雷达', message: '筛选问题', status: 'completed', relatedEntityIds: [] },
        { code: 'ai_response_monitoring', title: 'AI 回复监测', message: '录入回复', status: 'running', relatedEntityIds: [] }
      ],
      metricSummary: { ...createSprint().metricSummary, mentionRate: 40, contentGapCount: 3, sampleSize: 5 }
    });

    expect(getSprintProgressPercent(sprint)).toBe(50);
    expect(getSprintMetricCards(sprint)).toEqual(expect.arrayContaining([
      { label: '样本', value: 5, suffix: '' },
      { label: '提及率', value: 40, suffix: '%' },
      { label: '内容缺口', value: 3, suffix: '' }
    ]));
  });
});

describe('BrandWorkspacePage module matrix helpers', () => {
  it('covers the required GEO operating workspace modules', () => {
    expect(workspaceModules.map((module) => module.title)).toEqual([
      '品牌信息',
      '营销画布',
      '用户意图',
      'AI 回复监测',
      '内容生成',
      '内容优化',
      '内容资产',
      '自有媒体',
      '媒体平台',
      '竞品分析',
      '评价分析',
      '信源分析',
      '事实分析',
      'AI 平台管理'
    ]);
  });

  it('uses workspace counts when module data exists', () => {
    const module = workspaceModules.find((item) => item.title === 'AI 回复监测');

    expect(module).toBeDefined();
    expect(getWorkspaceModuleMetric(module!, { brand: createBrand(), relatedCounts: createCounts({ monitoringRuns: 4 }) })).toBe('4 项');
    expect(getWorkspaceModuleMetric(module!, { brand: createBrand(), relatedCounts: createCounts() })).toBe('待补充真实回复');
  });

  it('focuses module routes on their matching workspace section', () => {
    expect(getBrandWorkspacePageMode('/brand-profile')).toEqual({ focusModule: 'brand-profile' });
    expect(getBrandWorkspacePageMode('/user-intents')).toEqual({ focusModule: 'user-intents' });
    expect(getBrandWorkspacePageMode('/optimization-units')).toEqual({ focusModule: 'optimization-units' });
    expect(getBrandWorkspacePageMode('/brands')).toEqual({});
  });

  it('uses reference-aligned page titles for workspace routes', () => {
    expect(getBrandWorkspacePagePresentation().title).toBe('数据总览');
    expect(getBrandWorkspacePagePresentation('brand-profile').title).toBe('品牌信息');
    expect(getBrandWorkspacePagePresentation('optimization-units').title).toBe('优化单元');
    expect(getBrandWorkspacePagePresentation('user-intents').title).toBe('用户意图');
  });
});

describe('BrandWorkspacePage beginner start helpers', () => {
  it('keeps the beginner entry actions in the first round order', () => {
    expect(beginnerStartActions.map((action) => action.title)).toEqual([
      '先补齐品牌资料',
      '再创建优化单元',
      '然后获取真实回复'
    ]);
    expect(beginnerQuestionEntries.map((entry) => entry.route)).toEqual(['/monitoring', '/optimization-units', '/content-generation']);
  });

  it('uses workspace counts to show beginner action state and metrics', () => {
    const workspace = { brand: createBrand(), relatedCounts: createCounts({ profile: 1, optimizationUnits: 2, intents: 3, monitoringRuns: 4, contentAssets: 5 }) };

    expect(getBeginnerActionState(beginnerStartActions[0], workspace)).toBe('已完成 1 项');
    expect(getBeginnerMetrics(workspace)).toEqual([
      { label: '品牌资料', value: 1 },
      { label: '优化单元', value: 2 },
      { label: '用户意图', value: 3 },
      { label: '真实回复', value: 4 },
      { label: '内容资产', value: 5 }
    ]);
  });

  it('chooses the next unfinished beginner todo', () => {
    expect(getNextBeginnerTodo(null)).toMatchObject({ title: '补齐品牌资料', route: '/brand-profile' });
    expect(getNextBeginnerTodo({ brand: createBrand(), relatedCounts: createCounts({ profile: 1, optimizationUnits: 1 }) })).toMatchObject({ title: '整理用户意图', route: '/user-intents' });
    expect(getBeginnerTodos({ brand: createBrand(), relatedCounts: createCounts({ profile: 1 }) }).find((todo) => todo.title === '补齐品牌资料')?.done).toBe(true);
  });
});

describe('BrandKnowledgeCard profile library helpers', () => {
  it('将品牌资料固定组织为五类资产', () => {
    expect(brandProfileLibraryGroups.map((group) => group.title)).toEqual(['基础信息', '产品服务', '目标用户', '事实知识', '媒体素材']);
    expect(brandProfileLibraryGroups.find((group) => group.key === 'facts')?.fields.map((field) => field.key)).toEqual([
      'recommendedExpressions',
      'blockedExpressions',
      'contentRules',
      'competitors'
    ]);
  });

  it('calculates group progress and missing labels from profile content', () => {
    const profile = createBrandProfile({
      intro: '追光小牛是儿童运动成长品牌',
      valueProps: ['少儿体能'],
      proofPoints: [],
      missingFields: ['proofPoints']
    });
    const group = brandProfileLibraryGroups[0];

    expect(getBrandProfileGroupProgress(group, profile)).toBe(67);
    expect(getBrandProfileGroupMissingLabels(group, profile)).toEqual(['权威背书']);
  });

  it('treats empty profile groups as missing and supports string or array fields', () => {
    const basicInfoGroup = brandProfileLibraryGroups[0];
    const productsGroup = brandProfileLibraryGroups[1];

    expect(getBrandProfileGroupProgress(basicInfoGroup, null)).toBe(0);
    expect(getBrandProfileGroupMissingLabels(basicInfoGroup, null)).toEqual(['品牌介绍', '核心卖点', '权威背书']);
    expect(getBrandProfileGroupProgress(productsGroup, createBrandProfile({ offerings: ['儿童体能课'], faqs: [] }))).toBe(50);
  });

  it('shows placeholder missing labels for profile library sections backed by other modules', () => {
    const mediaAssetGroup = brandProfileLibraryGroups.find((group) => group.key === 'media-assets');

    expect(mediaAssetGroup).toBeDefined();
    expect(getBrandProfileGroupProgress(mediaAssetGroup!, createBrandProfile())).toBe(0);
    expect(getBrandProfileGroupMissingLabels(mediaAssetGroup!, createBrandProfile())).toEqual(['媒体素材']);
  });

  it('为资产库分类映射完整度、资料来源数量和媒体素材状态', () => {
    const categories = getBrandProfileAssetCategories(createBrandProfile({
      intro: '追光小牛是儿童运动成长品牌',
      valueProps: ['少儿体能'],
      proofPoints: [],
      missingFields: ['proofPoints']
    }), 2, 3);

    expect(categories).toHaveLength(5);
    expect(categories.find((category) => category.key === 'basic-info')).toMatchObject({ completeness: 67, status: 'partial' });
    expect(categories.find((category) => category.key === 'facts')).toMatchObject({ count: 3 });
    expect(categories.find((category) => category.key === 'media-assets')).toMatchObject({ count: 2, completeness: 100, status: 'complete' });
  });

  it('keeps fields listed in missingFields visible even when they have content', () => {
    const productsGroup = brandProfileLibraryGroups[1];
    const profile = createBrandProfile({
      offerings: ['儿童体能课'],
      faqs: [{ question: '适合几岁', answer: '3-12 岁' }],
      missingFields: ['faqs']
    });

    expect(getBrandProfileGroupProgress(productsGroup, profile)).toBe(100);
    expect(getBrandProfileGroupMissingLabels(productsGroup, profile)).toEqual(['FAQ']);
  });

  it('uses API completeness prompts to keep rule-based missing fields visible', () => {
    const factsGroup = brandProfileLibraryGroups.find((group) => group.key === 'facts')!;
    const profile = createBrandProfile({
      blockedExpressions: ['避免绝对化承诺'],
      missingFields: ['禁用表达'],
      completenessPrompts: [{
        field: 'blockedExpressions',
        label: '禁用表达',
        impact: '缺少风险边界',
        prompt: '请确认禁用表达'
      }]
    });

    expect(getBrandProfileGroupMissingLabels(factsGroup, profile)).toContain('禁用表达');
  });
});

function createCounts(overrides: Partial<BrandWorkspaceSnapshot['relatedCounts']> = {}): BrandWorkspaceSnapshot['relatedCounts'] {
  return {
    profile: 0,
    optimizationUnits: 0,
    intents: 0,
    prompts: 0,
    competitors: 0,
    contentAssets: 0,
    monitoringRuns: 0,
    reports: 0,
    advisorRecords: 0,
    ...overrides
  };
}

function createBrandProfile(overrides: Partial<import('@geo-platform/shared-types').BrandProfile> = {}): import('@geo-platform/shared-types').BrandProfile {
  return {
    brandId: 'brand_demo',
    intro: '',
    valueProps: [],
    offerings: [],
    proofPoints: [],
    targetCustomers: [],
    recommendedExpressions: [],
    blockedExpressions: [],
    contentRules: [],
    competitors: [],
    faqs: [],
    completenessScore: 0,
    missingFields: [],
    completenessPrompts: [],
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides
  };
}

function createBrand() {
  return {
    brandId: 'brand_demo',
    name: '追光小牛',
    aliases: [],
    industry: '儿童运动',
    website: '',
    targetCities: ['贵阳'],
    businessScope: '儿童运动成长课',
    targetAudience: '2-14 岁儿童',
    status: 'active' as const,
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z'
  };
}

function createSprint(overrides: Partial<import('@geo-platform/shared-types').VisibilitySprint> = {}): import('@geo-platform/shared-types').VisibilitySprint {
  return {
    sprintId: 'sprint_1',
    brandId: 'brand_demo',
    title: '首轮 AI 可见性运营',
    goal: '打通问题到复测闭环',
    status: 'running',
    currentStep: 'question_radar',
    steps: [],
    metricSummary: {
      questionCoverageRate: 0,
      mentionRate: 0,
      recommendationRate: 0,
      firstRecommendationRate: 0,
      topThreeRate: 0,
      citationHitRate: 0,
      expressionAccuracyRate: 0,
      riskExpressionCount: 0,
      contentGapCount: 0,
      competitorSuppressionCount: 0,
      sampleSize: 0
    },
    relatedQuestionIds: [],
    relatedTestPlanIds: [],
    relatedMonitoringRunIds: [],
    relatedStandardAnswerIds: [],
    relatedContentTaskIds: [],
    relatedPublishingRecordIds: [],
    relatedRetestTaskIds: [],
    createdBy: 'user_demo',
    createdAt: '2026-07-11T00:00:00.000Z',
    updatedAt: '2026-07-11T00:00:00.000Z',
    ...overrides
  };
}
