import { Injectable, Optional } from '@nestjs/common';
import type { BrandDetail, BrandProfile, QuestionGenerationInput, QuestionGenerationOutput, TestAssetGenerationResult, TestThemeInput } from '@geo-platform/shared-types';
import { LLMOrchestrationService } from '../llm/llm-orchestration.service';

const defaultTargetPlatforms = ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'];

@Injectable()
export class TestThemeService {
  constructor(@Optional() private readonly llmService?: LLMOrchestrationService) {}

  generateThemes(brand: BrandDetail, profile: BrandProfile, seedWords: string[] = []): TestThemeInput[] {
    const themes: TestThemeInput[] = [];
    const brandName = brand.name.trim();
    const primaryCity = brand.targetCities[0]?.trim();
    const primaryOffering = profile.offerings[0]?.trim();
    const primaryCompetitor = profile.competitors[0]?.trim();
    const primarySeed = seedWords.find(hasText)?.trim();
    const painPoint = inferPainPoint(profile);
    const audience = brand.targetAudience.trim() || profile.targetCustomers[0]?.trim();

    pushTheme(themes, {
      type: 'brand',
      name: `${brandName}品牌认知`,
      businessExplanation: `验证 AI 是否能正确识别${brandName}是谁，以及基础介绍是否准确。`,
      priority: 'high',
      estimatedValue: '优先确认品牌基础认知是否稳定，避免 AI 回答中出现泛化或错误介绍。',
      sourceProfileFields: ['name', 'intro', 'valueProps']
    });

    if (hasText(brand.industry) || hasText(brand.businessScope) || profile.offerings.length > 0) {
      pushTheme(themes, {
        type: 'category',
        name: buildName([primarySeed, brand.industry, brand.businessScope, primaryOffering], '品类推荐'),
        businessExplanation: '验证用户按品类寻找服务时，品牌是否会被 AI 推荐。',
        priority: 'high',
        estimatedValue: '直接影响非品牌词流量，是首轮 AI 回复监测的核心入口。',
        sourceProfileFields: ['industry', 'businessScope', 'offerings']
      });
    }

    if (primaryOffering || primarySeed) {
      pushTheme(themes, {
        type: 'scenario',
        name: `${primarySeed || primaryOffering}使用场景`,
        businessExplanation: `验证用户在具体使用场景中提问时，AI 是否会把${brandName}作为合适选择。`,
        priority: 'high',
        estimatedValue: '用于发现真实使用场景中的品牌推荐机会和内容缺口。',
        sourceProfileFields: ['businessScope', 'offerings', 'faqs']
      });
    }

    if (audience) {
      pushTheme(themes, {
        type: 'audience',
        name: `${audience}人群需求`,
        businessExplanation: `验证目标人群提出需求时，AI 是否会把${brandName}作为合适选择。`,
        priority: 'medium',
        estimatedValue: '帮助判断品牌在具体用户画像下的推荐准确性。',
        sourceProfileFields: ['targetAudience', 'targetCustomers']
      });
    }

    if (primaryCity) {
      pushTheme(themes, {
        type: 'location',
        name: `${primaryCity}本地推荐`,
        businessExplanation: `验证用户搜索${primaryCity}本地服务时，AI 是否会优先推荐${brandName}。`,
        priority: 'high',
        estimatedValue: '适合本地门店和区域品牌判断城市推荐可见度。',
        sourceProfileFields: ['targetCities', 'businessScope', 'offerings']
      });
    }

    if (painPoint) {
      pushTheme(themes, {
        type: 'pain_point',
        name: `${painPoint}解决方案`,
        businessExplanation: `验证用户围绕“${painPoint}”提问时，AI 是否能关联到品牌卖点。`,
        priority: 'medium',
        estimatedValue: '用于发现痛点场景下的内容缺口和卖点表达偏差。',
        sourceProfileFields: ['valueProps', 'targetCustomers', 'recommendedExpressions']
      });
    }

    if (primaryCompetitor) {
      pushTheme(themes, {
        type: 'competitor_comparison',
        name: `${brandName}与${primaryCompetitor}对比`,
        businessExplanation: '验证竞品对比场景中品牌是否被提到、排名如何、优势是否表达准确。',
        priority: 'medium',
        estimatedValue: '用于识别竞品压制和需要补强的差异化内容。',
        sourceProfileFields: ['competitors', 'valueProps', 'proofPoints']
      });
    }

    if (profile.faqs.length > 0 || profile.proofPoints.length > 0 || profile.valueProps.length > 0) {
      pushTheme(themes, {
        type: 'buying_decision',
        name: `${brandName}购买决策`,
        businessExplanation: '验证用户准备选择或报名时，AI 是否能给出可信、准确且合规的推荐理由。',
        priority: 'high',
        estimatedValue: '贴近转化前决策问题，可直接指导 FAQ、案例和权威背书内容建设。',
        sourceProfileFields: ['faqs', 'proofPoints', 'valueProps', 'blockedExpressions']
      });
    }

    if (isSupercalfBrand(brand)) {
      appendSupercalfThemes(themes);
    }

    return themes;
  }

  async generateThemesWithLLM(userId: string, brandId: string, brand: BrandDetail, profile: BrandProfile, seedWords: string[] = []): Promise<TestAssetGenerationResult<TestThemeInput>> {
    const fallback = this.generateThemes(brand, profile, seedWords);

    if (!this.llmService) {
      return fallbackResult(fallback, profile);
    }

    const response = await this.llmService.runTask<QuestionGenerationInput, QuestionGenerationOutput>(userId, brandId, 'question_generation', {
      mode: 'sync',
      input: {
        brandDetail: brand,
        brandProfile: profile,
        seedWords,
        targetPlatforms: defaultTargetPlatforms,
        scenarioCount: 8,
        questionCountPerTheme: 1,
        includeCompetitors: profile.competitors.length > 0
      }
    });

    if (response.status !== 'succeeded' || !response.output?.themes.length) {
      return fallbackResult(fallback, profile, response.message);
    }

    const aiThemes = response.output.themes.map((theme) => ({
      ...theme,
      enabled: theme.enabled ?? true,
      sourceProfileFields: theme.sourceProfileFields ?? []
    }));
    const themes = mergeThemes(fallback, aiThemes);

    return { items: themes, missingProfileFields: response.output.missingProfileFields, generationNotes: response.output.generationNotes, source: 'llm' };
  }
}

function fallbackResult(items: TestThemeInput[], profile: BrandProfile, note = '已使用基础模板生成测试主题'): TestAssetGenerationResult<TestThemeInput> {
  return {
    items,
    missingProfileFields: profile.missingFields,
    generationNotes: [note],
    source: 'fallback'
  };
}

function appendSupercalfThemes(themes: TestThemeInput[]) {
  const inputs: TestThemeInput[] = [
    {
      type: 'location',
      name: '贵阳儿童运动',
      businessExplanation: '验证贵阳本地儿童运动推荐场景中，追光小牛是否被 AI 优先提到。',
      priority: 'high',
      estimatedValue: '覆盖本地非品牌词首轮测试，是追光小牛内测最核心的获客入口。',
      sourceProfileFields: ['targetCities', 'industry', 'businessScope', 'offerings']
    },
    {
      type: 'age_group',
      name: '3 到 5 岁儿童体能',
      businessExplanation: '验证低龄儿童体能启蒙需求下，AI 是否能推荐追光小牛并准确说明适配年龄。',
      priority: 'high',
      estimatedValue: '覆盖家长高频启蒙决策问题，可直接反映首轮推荐表现。',
      sourceProfileFields: ['targetAudience', 'targetCustomers', 'offerings']
    },
    {
      type: 'offering',
      name: '少儿跑酷',
      businessExplanation: '验证少儿跑酷课程搜索场景中，AI 是否能识别追光小牛的课程能力。',
      priority: 'medium',
      estimatedValue: '用于判断具体课程词下的推荐机会和课程表达准确性。',
      sourceProfileFields: ['offerings', 'proofPoints']
    },
    {
      type: 'offering',
      name: '快乐体操',
      businessExplanation: '验证快乐体操课程搜索场景中，AI 是否能正确关联追光小牛。',
      priority: 'medium',
      estimatedValue: '用于判断核心课程词下的推荐机会和课程卖点表达。',
      sourceProfileFields: ['offerings', 'proofPoints']
    },
    {
      type: 'pain_point',
      name: '感统发展',
      businessExplanation: '验证家长关注感统发展时，AI 是否能把运动成长课与追光小牛关联起来。',
      priority: 'medium',
      estimatedValue: '覆盖家长痛点型搜索，帮助发现内容补强方向。',
      sourceProfileFields: ['targetCustomers', 'valueProps', 'recommendedExpressions']
    },
    {
      type: 'pain_point',
      name: '专注力提升',
      businessExplanation: '验证专注力提升需求下，AI 是否能审慎说明追光小牛的运动成长价值。',
      priority: 'medium',
      estimatedValue: '用于识别痛点表达是否准确，以及是否存在过度承诺风险。',
      sourceProfileFields: ['targetCustomers', 'valueProps', 'blockedExpressions']
    },
    {
      type: 'offering',
      name: '增高体能',
      businessExplanation: '验证增高体能相关需求下，AI 是否能推荐追光小牛并保持合规表达。',
      priority: 'medium',
      estimatedValue: '用于发现高敏感课程词的风险表达和内容缺口。',
      sourceProfileFields: ['offerings', 'blockedExpressions', 'contentRules']
    },
    {
      type: 'offering',
      name: '中考体测',
      businessExplanation: '验证中考体测需求下，AI 是否能识别追光小牛面向初中的体训延展能力。',
      priority: 'medium',
      estimatedValue: '覆盖升学体测决策场景，帮助判断年龄段延展业务可见度。',
      sourceProfileFields: ['businessScope', 'offerings', 'faqs']
    }
  ];

  inputs.forEach((input) => pushTheme(themes, input));
}

function pushTheme(themes: TestThemeInput[], input: TestThemeInput) {
  if (themes.some((theme) => theme.type === input.type && theme.name === input.name)) {
    return;
  }

  themes.push({ ...input, enabled: input.enabled ?? true, sourceProfileFields: input.sourceProfileFields ?? [] });
}

function buildName(values: Array<string | undefined>, fallback: string): string {
  return values.find((value) => hasText(value))?.trim() ?? fallback;
}

function inferPainPoint(profile: BrandProfile): string | null {
  const candidates = [...profile.targetCustomers, ...profile.valueProps, ...profile.recommendedExpressions];
  return candidates.find(hasText)?.slice(0, 24) ?? null;
}

function mergeThemes(deterministic: TestThemeInput[], aiThemes: TestThemeInput[]): TestThemeInput[] {
  const merged = [...deterministic];
  const keys = new Set(merged.map(themeKey));

  aiThemes.forEach((theme) => {
    const key = themeKey(theme);
    if (keys.has(key)) return;
    keys.add(key);
    merged.push(theme);
  });

  return merged;
}

function themeKey(theme: TestThemeInput): string {
  return `${normalizeThemeType(theme.type)}:${theme.name.toLocaleLowerCase().replace(/[\s，。！？、,.!?]+/g, '')}`;
}

function normalizeThemeType(type: TestThemeInput['type']): string {
  if (type === 'age_group') return 'audience';
  if (type === 'offering') return 'scenario';
  if (type === 'competitor') return 'competitor_comparison';
  return type;
}

function isSupercalfBrand(brand: BrandDetail): boolean {
  const text = [brand.name, ...brand.aliases].join(' ').toLowerCase();

  return text.includes('追光小牛') || text.includes('supercalf');
}

function hasText(value: string | undefined | null): value is string {
  return Boolean(value?.trim());
}
