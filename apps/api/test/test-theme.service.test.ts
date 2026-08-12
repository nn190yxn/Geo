import { describe, expect, it, vi } from 'vitest';
import type { BrandDetail, BrandProfile, LLMTaskResponse, QuestionGenerationOutput } from '@geo-platform/shared-types';
import { TestThemeService } from '../src/modules/brands/test-theme.service';
import type { LLMOrchestrationService } from '../src/modules/llm/llm-orchestration.service';

describe('TestThemeService', () => {
  it('generates business test themes from complete brand profile', () => {
    const service = new TestThemeService();
    const themes = service.generateThemes(createBrand(), createProfile());

    expect(themes.map((theme) => theme.type)).toEqual(
      expect.arrayContaining(['brand', 'category', 'scenario', 'audience', 'pain_point', 'location', 'buying_decision', 'competitor_comparison'])
    );
    expect(themes.find((theme) => theme.type === 'location')).toMatchObject({
      name: '贵阳本地推荐',
      priority: 'high',
      sourceProfileFields: expect.arrayContaining(['targetCities'])
    });
    expect(themes.find((theme) => theme.type === 'competitor_comparison')?.businessExplanation).toContain('竞品对比');
  });

  it('skips themes that need missing profile data', () => {
    const service = new TestThemeService();
    const themes = service.generateThemes(
      { ...createBrand(), name: '通用儿童品牌', aliases: [], targetCities: [], targetAudience: '', businessScope: '' },
      {
        ...createProfile(),
        offerings: [],
        competitors: [],
        targetCustomers: [],
        valueProps: [],
        proofPoints: [],
        recommendedExpressions: [],
        faqs: []
      }
    );

    expect(themes.map((theme) => theme.type)).toContain('brand');
    expect(themes.map((theme) => theme.type)).not.toContain('location');
    expect(themes.map((theme) => theme.type)).not.toContain('competitor_comparison');
    expect(themes.map((theme) => theme.type)).not.toContain('buying_decision');
  });

  it('keeps only a brand theme when profile and brand context are empty', () => {
    const service = new TestThemeService();
    const themes = service.generateThemes(
      { ...createBrand(), name: '通用品牌', aliases: [], industry: '', targetCities: [], businessScope: '', targetAudience: '' },
      {
        ...createProfile(),
        intro: '',
        valueProps: [],
        offerings: [],
        proofPoints: [],
        targetCustomers: [],
        recommendedExpressions: [],
        blockedExpressions: [],
        contentRules: [],
        competitors: [],
        faqs: []
      }
    );

    expect(themes).toEqual([expect.objectContaining({ type: 'brand', name: '通用品牌品牌认知' })]);
  });

  it('generates Supercalf pilot themes for the first test round', () => {
    const service = new TestThemeService();
    const themes = service.generateThemes(createBrand(), createProfile());

    expect(themes.map((theme) => theme.name)).toEqual(
      expect.arrayContaining([
        '贵阳儿童运动',
        '3 到 5 岁儿童体能',
        '少儿跑酷',
        '快乐体操',
        '感统发展',
        '专注力提升',
        '增高体能',
        '中考体测'
      ])
    );
    expect(themes.find((theme) => theme.name === '贵阳儿童运动')).toMatchObject({ type: 'location', priority: 'high' });
    expect(themes.find((theme) => theme.name === '3 到 5 岁儿童体能')).toMatchObject({ type: 'age_group', priority: 'high' });
  });

  it('uses LLM theme generation when it succeeds', async () => {
    const llmService = createLLMService({
      status: 'succeeded',
      message: 'AI 任务已完成',
      output: {
        candidates: [],
        missingProfileFields: [],
        generationNotes: [],
        themes: [
          {
            type: 'location',
            name: '贵阳儿童运动推荐',
            businessExplanation: '验证贵阳本地推荐场景。',
            priority: 'high',
            estimatedValue: '判断品牌是否被 AI 推荐。'
          }
        ]
      }
    });
    const service = new TestThemeService(llmService);

    const result = await service.generateThemesWithLLM('user_1', 'brand_demo', createBrand(), createProfile());

    expect(llmService.runTask).toHaveBeenCalledWith(
      'user_1',
      'brand_demo',
      'question_generation',
      expect.objectContaining({
        mode: 'sync',
        input: expect.objectContaining({
          targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
          scenarioCount: 8,
          includeCompetitors: true
        })
      })
    );
    expect(result.source).toBe('llm');
    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({ name: '追光小牛品牌认知' }),
      expect.objectContaining({ name: '贵阳儿童运动推荐', enabled: true, sourceProfileFields: [] })
    ]));
  });

  it('falls back to rule themes when LLM generation fails', async () => {
    const service = new TestThemeService(createLLMService({ status: 'failed', message: '还没有可用于自动生成的 AI 平台（llm_platform_missing）' }));

    const result = await service.generateThemesWithLLM('user_1', 'brand_demo', createBrand(), createProfile());

    expect(result.source).toBe('fallback');
    expect(result.generationNotes).toEqual(['还没有可用于自动生成的 AI 平台（llm_platform_missing）']);
    expect(result.items.map((theme) => theme.name)).toContain('贵阳儿童运动');
  });
});

function createLLMService(response: LLMTaskResponse<QuestionGenerationOutput>): LLMOrchestrationService {
  return {
    runTask: vi.fn().mockResolvedValue(response)
  } as unknown as LLMOrchestrationService;
}

function createBrand(): BrandDetail {
  return {
    brandId: 'brand_demo',
    name: '追光小牛',
    aliases: ['SUPERCALF'],
    industry: '儿童运动教育',
    website: 'https://example.com',
    targetCities: ['贵阳'],
    businessScope: '儿童运动成长课、少儿跑酷、快乐体操、增高体能和中考体测训练',
    targetAudience: '2-14 岁儿童家庭',
    status: 'active',
    createdAt: '2026-07-04T00:00:00.000Z',
    updatedAt: '2026-07-04T00:00:00.000Z'
  };
}

function createProfile(): BrandProfile {
  return {
    brandId: 'brand_demo',
    intro: '追光小牛是贵阳儿童运动成长品牌。',
    valueProps: ['ACE 成长体系'],
    offerings: ['快乐体操'],
    proofPoints: ['世界冠军师资背书'],
    targetCustomers: ['贵阳 2-14 岁儿童家庭'],
    recommendedExpressions: ['运动成长课是儿童必修课'],
    blockedExpressions: ['保证长高'],
    contentRules: ['审慎表达'],
    competitors: ['少儿体适能机构'],
    faqs: [{ question: '适合几岁？', answer: '适合 2-14 岁。' }],
    completenessScore: 100,
    missingFields: [],
    completenessPrompts: [],
    updatedAt: '2026-07-04T00:00:00.000Z'
  };
}
