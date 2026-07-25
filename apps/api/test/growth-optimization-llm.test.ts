import { describe, expect, it, vi } from 'vitest';
import type { GrowthOptimizationPlan, LLMTaskResponse, OptimizationPlanningOutput } from '@geo-platform/shared-types';
import { BrandsController } from '../src/modules/brands/brands.controller';
import type { LLMOrchestrationService } from '../src/modules/llm/llm-orchestration.service';

describe('BrandsController growth optimization LLM generation', () => {
  it('uses LLM optimization planning output to create a plan and follow-up assets', async () => {
    const plan = createPlan();
    const permissions = createPermissionsServiceMock({ createdPlan: plan });
    const controller = createController(permissions, createLLMService({
      status: 'succeeded',
      message: 'AI 任务已完成',
      output: createOptimizationOutput()
    }));

    const response = await controller.generateGrowthOptimizationPlan(createRequest(), 'brand_demo', { sourceTestPlanId: 'plan_1' });

    expect(response).toEqual({ success: true, data: plan });
    expect(permissions.createGrowthOptimizationPlan).toHaveBeenCalledWith('user_demo', 'brand_demo', expect.objectContaining({
      summary: '补强本地推荐内容',
      sourceTestPlanId: 'plan_1',
      sourceRunIds: ['run_1']
    }));
    expect(permissions.createTestQuestionCandidate).toHaveBeenCalledWith('user_demo', 'brand_demo', expect.objectContaining({
      question: '贵阳儿童运动成长机构怎么选？',
      selected: false
    }));
    expect(permissions.createContentGenerationTask).toHaveBeenCalledWith('user_demo', 'brand_demo', expect.objectContaining({
      growthOptimizationPlanId: plan.id,
      contentType: 'website_faq'
    }));
    expect(permissions.generateGrowthOptimizationPlan).not.toHaveBeenCalled();
  });

  it('falls back to the rule plan when LLM planning fails', async () => {
    const fallbackPlan = createPlan({ id: 'fallback_plan', summary: '规则优化计划' });
    const permissions = createPermissionsServiceMock({ fallbackPlan });
    const controller = createController(permissions, createLLMService({ status: 'failed', message: '请先填写平台密钥（llm_credential_missing）' }));

    const response = await controller.generateGrowthOptimizationPlan(createRequest(), 'brand_demo', {});

    expect(response).toEqual({ success: true, data: fallbackPlan });
    expect(permissions.generateGrowthOptimizationPlan).toHaveBeenCalledWith('user_demo', 'brand_demo', undefined);
  });
});

function createController(permissions: ReturnType<typeof createPermissionsServiceMock>, llmService: LLMOrchestrationService): BrandsController {
  return new BrandsController(permissions as never, {} as never, {} as never, {} as never, llmService);
}

function createRequest() {
  return { context: { userId: 'user_demo' } } as never;
}

function createLLMService(response: LLMTaskResponse<OptimizationPlanningOutput>): LLMOrchestrationService {
  return {
    runTask: vi.fn().mockResolvedValue(response)
  } as unknown as LLMOrchestrationService;
}

function createPermissionsServiceMock(input: { createdPlan?: GrowthOptimizationPlan; fallbackPlan?: GrowthOptimizationPlan }) {
  return {
    listAccessibleBrandDetails: vi.fn().mockReturnValue([{ brandId: 'brand_demo', name: '追光小牛', aliases: ['SUPERCALF'], industry: '儿童运动教育', targetCities: ['贵阳'], businessScope: '儿童运动成长课', targetAudience: '2-14 岁儿童家庭', status: 'active', createdAt: '2026-07-07T00:00:00.000Z', updatedAt: '2026-07-07T00:00:00.000Z' }]),
    getBrandProfile: vi.fn().mockReturnValue({ brandId: 'brand_demo', intro: '追光小牛是贵阳儿童运动成长品牌。', valueProps: ['ACE 成长体系'], offerings: ['快乐体操'], proofPoints: ['世界冠军师资背书'], targetCustomers: ['贵阳 2-14 岁儿童家庭'], recommendedExpressions: ['运动成长课是儿童必修课'], blockedExpressions: ['保证长高'], contentRules: ['审慎表达'], competitors: ['竞品 A'], faqs: [], completenessScore: 100, missingFields: [], completenessPrompts: [], updatedAt: '2026-07-07T00:00:00.000Z' }),
    listMonitoringRuns: vi.fn().mockReturnValue([{ id: 'run_1', brandId: 'brand_demo', testPlanId: 'plan_1', platformCode: 'doubao', promptId: 'prompt_1', optimizationUnitId: 'unit_1', intentId: 'intent_1', status: 'completed', createdAt: '2026-07-07T00:00:00.000Z', promptText: '贵阳儿童运动成长机构怎么选？', analysis: createAnalysisResult() }]),
    getGrowthOptimizationWorkspace: vi.fn().mockReturnValue({ brandId: 'brand_demo', plans: [], relatedStrategies: [], relatedTasks: [], relatedPublishingRecords: [] }),
    getContentCenterDashboard: vi.fn().mockReturnValue({ brandId: 'brand_demo', assets: [], strategies: [], suggestions: [], coverage: { keywordCoverageRate: 0, uncoveredKeywords: [], publishedAssetCount: 0, reusableAssetCount: 0 } }),
    getPublishingDashboard: vi.fn().mockReturnValue({ brandId: 'brand_demo', platforms: [], accounts: [], records: [] }),
    listTestThemes: vi.fn().mockReturnValue([{ id: 'theme_1', brandId: 'brand_demo', type: 'location', name: '贵阳儿童运动', businessExplanation: '测试本地推荐', priority: 'high', estimatedValue: '高价值', enabled: true, sourceProfileFields: [], createdAt: '2026-07-07T00:00:00.000Z', updatedAt: '2026-07-07T00:00:00.000Z' }]),
    listTestQuestionCandidates: vi.fn().mockReturnValue([]),
    createGrowthOptimizationPlan: vi.fn().mockReturnValue(input.createdPlan ?? null),
    createTestQuestionCandidate: vi.fn().mockReturnValue({ id: 'candidate_1', brandId: 'brand_demo', themeId: 'theme_1', question: '贵阳儿童运动成长机构怎么选？', purposes: ['brand_mentioned'], targetPlatforms: ['doubao'], priority: 'high', estimatedValue: '复测问题', editable: true, selected: false, createdAt: '2026-07-07T00:00:00.000Z', updatedAt: '2026-07-07T00:00:00.000Z' }),
    createContentGenerationTask: vi.fn().mockReturnValue({ brandId: 'brand_demo' }),
    generateGrowthOptimizationPlan: vi.fn().mockReturnValue(input.fallbackPlan ?? null)
  };
}

function createOptimizationOutput(): OptimizationPlanningOutput {
  return {
    plan: {
      sourceRunIds: ['run_1'],
      summary: '补强本地推荐内容',
      reasons: [{ type: 'content_gap', title: '内容缺口', evidence: '本地推荐内容不足', relatedRunIds: ['run_1'], relatedPromptIds: ['prompt_1'] }],
      priority: 'high',
      dueDate: '2026-07-21T00:00:00.000Z',
      publishingPlatforms: ['official_site'],
      retestAt: '2026-07-28T00:00:00.000Z',
      contentRecommendations: [{ contentType: 'website_faq', title: '贵阳儿童运动 FAQ', targetPlatform: 'official_site', targetKeywords: ['儿童运动'], reason: '补充可引用内容' }]
    },
    contentTasks: [{ strategyId: 'strategy_1', contentType: 'website_faq', targetPlatform: 'official_site', targetKeywords: ['儿童运动'], referenceSources: ['品牌知识库'] }],
    retestQuestions: [{ themeId: 'theme_1', question: '贵阳儿童运动成长机构怎么选？', purposes: ['brand_mentioned'], targetPlatforms: ['doubao'], priority: 'high', estimatedValue: '复测问题' }],
    generationNotes: ['已生成优化计划']
  };
}

function createAnalysisResult() {
  return {
    id: 'analysis_1',
    responseId: 'response_1',
    runId: 'run_1',
    brandId: 'brand_demo',
    brandMentioned: false,
    brandRank: null,
    sentiment: 'unknown' as const,
    accuracyScore: 40,
    citationScore: 0,
    platformEvaluation: '未提及品牌',
    recommendationReason: '暂未识别到明确推荐理由',
    rankingReason: '暂未识别到品牌推荐顺序',
    expressionCompleteness: '卖点不足',
    expressionDeviation: '暂未识别到表达偏差',
    competitorMentions: [],
    reviewRequired: true,
    updatedAt: '2026-07-07T00:00:00.000Z'
  };
}

function createPlan(input: Partial<GrowthOptimizationPlan> = {}): GrowthOptimizationPlan {
  return {
    id: 'growth_plan_1',
    brandId: 'brand_demo',
    sourceTestPlanId: 'plan_1',
    sourceRunIds: ['run_1'],
    summary: '补强本地推荐内容',
    reasons: [],
    priority: 'high',
    dueDate: '2026-07-21T00:00:00.000Z',
    publishingPlatforms: ['official_site'],
    retestAt: '2026-07-28T00:00:00.000Z',
    contentRecommendations: [],
    taskIds: [],
    status: 'draft',
    createdAt: '2026-07-07T00:00:00.000Z',
    updatedAt: '2026-07-07T00:00:00.000Z',
    ...input
  };
}
