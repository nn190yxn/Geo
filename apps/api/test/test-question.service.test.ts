import { describe, expect, it, vi } from 'vitest';
import type { BrandDetail, BrandProfile, LLMTaskResponse, QuestionGenerationOutput, TestTheme } from '@geo-platform/shared-types';
import { TestQuestionService } from '../src/modules/brands/test-question.service';
import type { LLMOrchestrationService } from '../src/modules/llm/llm-orchestration.service';

describe('TestQuestionService', () => {
  it('generates question candidates with purposes and target platforms for enabled themes', () => {
    const service = new TestQuestionService();
    const candidates = service.generateCandidates(createBrand(), createProfile(), createThemes());

    expect(candidates).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          question: '追光小牛是做什么的？适合哪些用户？',
          purposes: expect.arrayContaining(['brand_mentioned', 'value_prop_accuracy']),
          targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
          selected: true
        }),
        expect.objectContaining({
          question: '贵阳哪里有适合2-14 岁儿童家庭的快乐体操？',
          purposes: expect.arrayContaining(['rank_first'])
        }),
        expect.objectContaining({
          question: '追光小牛和少儿体适能机构相比，哪个更适合2-14 岁儿童家庭？',
          purposes: expect.arrayContaining(['competitor_presence'])
        })
      ])
    );
    expect(candidates.length).toBeGreaterThan(0);
    expect(candidates.length).toBeLessThanOrEqual(8);
    expect(candidates.every((candidate) => candidate.purposes.length > 0)).toBe(true);
    expect(candidates.every((candidate) => candidate.targetPlatforms.length > 0)).toBe(true);
    expect(candidates.every((candidate) => candidate.discoveryDimension && candidate.generationMethod === 'deterministic')).toBe(true);
    expect(candidates.every((candidate) => typeof candidate.recommendationProbability === 'number')).toBe(true);
  });

  it('skips disabled themes and themes without required profile context', () => {
    const service = new TestQuestionService();
    const candidates = service.generateCandidates(
      { ...createBrand(), businessScope: '' },
      { ...createProfile(), offerings: [], competitors: [], valueProps: [] },
      [
        { ...createTheme('brand', '品牌认知'), enabled: false },
        createTheme('offering', '课程或产品'),
        createTheme('competitor', '竞品对比')
      ]
    );

    expect(candidates).toEqual([]);
  });

  it('generates Supercalf pilot questions for the first test round', () => {
    const service = new TestQuestionService();
    const candidates = service.generateCandidates(createBrand(), createProfile(), [
      createTheme('location', '贵阳儿童运动', 'high'),
      createTheme('age_group', '3 到 5 岁儿童体能', 'high'),
      createTheme('offering', '少儿跑酷'),
      createTheme('offering', '快乐体操'),
      createTheme('pain_point', '感统发展'),
      createTheme('pain_point', '专注力提升'),
      createTheme('offering', '增高体能'),
      createTheme('offering', '中考体测')
    ]);

    expect(candidates.map((candidate) => candidate.question)).toEqual(
      expect.arrayContaining([
        '贵阳有哪些值得推荐的儿童运动成长机构？',
        '贵阳哪里有适合 3-5 岁孩子的体能馆？',
        '贵阳少儿跑酷课程哪家比较适合孩子长期学习？',
        '贵阳儿童快乐体操课程有哪些机构可以选？',
        '孩子感统发展和运动能力提升，可以在贵阳选哪些课程？',
        '想通过运动提升孩子专注力，贵阳有哪些课程值得了解？',
        '贵阳儿童增高体能课怎么选？哪些表达需要家长谨慎看待？',
        '贵阳中考体测训练适合选择哪些儿童运动机构？'
      ])
    );
    expect(candidates.find((candidate) => candidate.question === '贵阳哪里有适合 3-5 岁孩子的体能馆？')).toMatchObject({
      purposes: expect.arrayContaining(['brand_mentioned', 'rank_first', 'value_prop_accuracy']),
      targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
      selected: true
    });
    expect(candidates).toHaveLength(8);
  });

  it('uses LLM question generation when it succeeds', async () => {
    const llmService = createLLMService({
      status: 'succeeded',
      message: 'AI 任务已完成',
      output: {
        themes: [],
        missingProfileFields: [],
        generationNotes: [],
        candidates: [
          {
            themeId: 'theme_brand',
            question: '贵阳家长第一次了解追光小牛时，应该重点问哪些问题？',
            purposes: ['brand_mentioned', 'value_prop_accuracy'],
            targetPlatforms: [],
            priority: 'high',
            estimatedValue: '验证品牌基础认知和卖点表达。'
          },
          {
            themeId: 'theme_disabled',
            question: '这个问题会被过滤',
            purposes: ['brand_mentioned'],
            targetPlatforms: ['doubao'],
            priority: 'high',
            estimatedValue: '过滤无效主题。'
          }
        ]
      }
    });
    const service = new TestQuestionService(llmService);

    const result = await service.generateCandidatesWithLLM('user_1', 'brand_demo', createBrand(), createProfile(), createThemes());

    expect(llmService.runTask).toHaveBeenCalledWith(
      'user_1',
      'brand_demo',
      'question_generation',
      expect.objectContaining({
        mode: 'sync',
        input: expect.objectContaining({
          targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
          questionCountPerTheme: 1,
          includeCompetitors: true
        })
      })
    );
    expect(result.source).toBe('llm');
    expect(result.items).toEqual(expect.arrayContaining([
      expect.objectContaining({
        question: '贵阳家长第一次了解追光小牛时，应该重点问哪些问题？',
        targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
        generationMethod: 'ai',
        editable: true,
        selected: true
      })
    ]));
    expect(result.items.map((candidate) => candidate.question)).toContain('追光小牛是做什么的？适合哪些用户？');
  });

  it('falls back to rule templates when LLM generation fails', async () => {
    const service = new TestQuestionService(createLLMService({ status: 'failed', message: '请先填写平台密钥（llm_credential_missing）' }));

    const result = await service.generateCandidatesWithLLM('user_1', 'brand_demo', createBrand(), createProfile(), createThemes());

    expect(result.source).toBe('fallback');
    expect(result.generationNotes).toEqual(['请先填写平台密钥（llm_credential_missing）']);
    expect(result.items).toHaveLength(4);
    expect(result.items.map((candidate) => candidate.question)).toContain('追光小牛是做什么的？适合哪些用户？');
    expect(result.items.every((candidate) => candidate.generationMethod === 'deterministic' && candidate.editable)).toBe(true);
  });

  it('merges normalized duplicate AI questions into deterministic candidates', async () => {
    const llmService = createLLMService({
      status: 'succeeded',
      message: 'AI 任务已完成',
      output: {
        themes: [],
        missingProfileFields: [],
        generationNotes: [],
        candidates: [{
          themeId: 'theme_brand',
          question: ' 追光小牛是做什么的，适合哪些用户 ',
          purposes: ['brand_mentioned'],
          targetPlatforms: ['doubao'],
          priority: 'high',
          estimatedValue: 'AI 补充品牌认知。',
          recommendationProbability: 0.9,
          generationRationale: 'AI 根据品牌介绍补充。'
        }]
      }
    });

    const result = await new TestQuestionService(llmService).generateCandidatesWithLLM('user_1', 'brand_demo', createBrand(), createProfile(), createThemes());
    const brandCandidates = result.items.filter((candidate) => candidate.discoveryDimension === 'brand');

    expect(brandCandidates).toHaveLength(1);
    expect(brandCandidates[0]).toMatchObject({
      generationMethod: 'merged',
      recommendationProbability: 0.9,
      mergedFrom: ['AI 根据品牌介绍补充。']
    });
  });

  it('generates one metadata-complete candidate for each discovery dimension', () => {
    const brand = { ...createBrand(), name: '星河运动', aliases: [] };
    const dimensions = ['brand', 'category', 'scenario', 'audience', 'pain_point', 'location', 'buying_decision', 'competitor_comparison'] as const;
    const candidates = new TestQuestionService().generateCandidates(
      brand,
      createProfile(),
      dimensions.map((dimension) => createTheme(dimension, `主题 ${dimension}`, 'high')),
      ['儿童运动课程']
    );

    expect(candidates).toHaveLength(dimensions.length);
    expect(new Set(candidates.map((candidate) => candidate.discoveryDimension))).toEqual(new Set(dimensions));
    expect(candidates.every((candidate) => (
      candidate.estimatedValue.length > 0
      && typeof candidate.recommendationProbability === 'number'
      && Boolean(candidate.userStage)
      && candidate.targetPlatforms.length > 0
      && Boolean(candidate.generationRationale)
      && candidate.generationMethod === 'deterministic'
      && candidate.editable
    ))).toBe(true);
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

function createThemes(): TestTheme[] {
  return [
    createTheme('brand', '品牌认知', 'high'),
    createTheme('location', '贵阳本地推荐', 'high'),
    createTheme('competitor', '竞品对比', 'medium'),
    createTheme('buying_decision', '购买决策', 'high')
  ];
}

function createTheme(type: TestTheme['type'], name: string, priority: TestTheme['priority'] = 'medium'): TestTheme {
  return {
    id: `theme_${type}`,
    brandId: 'brand_demo',
    type,
    name,
    businessExplanation: name,
    priority,
    estimatedValue: name,
    enabled: true,
    sourceProfileFields: [],
    createdAt: '2026-07-04T00:00:00.000Z',
    updatedAt: '2026-07-04T00:00:00.000Z'
  };
}
