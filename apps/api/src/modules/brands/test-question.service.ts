import { Injectable, Optional } from '@nestjs/common';
import type {
  BeginnerFriendlyPlatform,
  BrandDetail,
  BrandProfile,
  QuestionGenerationInput,
  QuestionGenerationOutput,
  QuestionDiscoveryDimension,
  QuestionUserStage,
  TestAssetGenerationResult,
  TestQuestionCandidateInput,
  TestQuestionPurpose,
  TestTheme
} from '@geo-platform/shared-types';
import { LLMOrchestrationService } from '../llm/llm-orchestration.service';
import { classifyPromptKind } from '../monitoring/prompt-measurement';

const defaultTargetPlatforms: BeginnerFriendlyPlatform[] = ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'];
const firstRoundQuestionLimit = 8;

@Injectable()
export class TestQuestionService {
  constructor(@Optional() private readonly llmService?: LLMOrchestrationService) {}

  generateCandidates(brand: BrandDetail, profile: BrandProfile, themes: TestTheme[], seedWords: string[] = []): TestQuestionCandidateInput[] {
    return classifyCandidates(limitFirstRoundQuestions(themes
      .filter((theme) => theme.enabled)
      .flatMap((theme) => buildQuestionsForTheme(brand, profile, theme, seedWords))), brand);
  }

  async generateCandidatesWithLLM(
    userId: string,
    brandId: string,
    brand: BrandDetail,
    profile: BrandProfile,
    themes: TestTheme[],
    seedWords: string[] = []
  ): Promise<TestAssetGenerationResult<TestQuestionCandidateInput>> {
    const fallback = this.generateCandidates(brand, profile, themes, seedWords);

    if (!this.llmService) {
      return fallbackResult(fallback, profile);
    }

    const response = await this.llmService.runTask<QuestionGenerationInput, QuestionGenerationOutput>(userId, brandId, 'question_generation', {
      mode: 'sync',
      input: {
        brandDetail: brand,
        brandProfile: profile,
        themes: themes.filter((theme) => theme.enabled),
        seedWords,
        targetPlatforms: defaultTargetPlatforms,
        scenarioCount: themes.filter((theme) => theme.enabled).length,
        questionCountPerTheme: 1,
        includeCompetitors: profile.competitors.length > 0
      }
    });

    if (response.status !== 'succeeded' || !response.output?.candidates.length) {
      return fallbackResult(fallback, profile, response.message);
    }

    const enabledThemeIds = new Set(themes.filter((theme) => theme.enabled).map((theme) => theme.id));
    const themeById = new Map(themes.map((theme) => [theme.id, theme]));
    const aiCandidates = response.output.candidates
      .filter((candidate) => enabledThemeIds.has(candidate.themeId))
      .map((candidate) => ({
        ...candidate,
        targetPlatforms: candidate.targetPlatforms.length ? candidate.targetPlatforms : defaultTargetPlatforms,
        discoveryDimension: candidate.discoveryDimension ?? toDiscoveryDimension(themeById.get(candidate.themeId)?.type),
        businessValue: candidate.businessValue ?? candidate.priority,
        recommendationProbability: normalizeProbability(candidate.recommendationProbability, candidate.priority),
        userStage: candidate.userStage ?? inferUserStage(candidate.discoveryDimension ?? toDiscoveryDimension(themeById.get(candidate.themeId)?.type)),
        generationRationale: candidate.generationRationale?.trim() || `AI 基于品牌资料和“${themeById.get(candidate.themeId)?.name ?? '业务主题'}”补充。`,
        generationMethod: 'ai' as const,
        mergedFrom: candidate.mergedFrom ?? [],
        editable: candidate.editable ?? true,
        selected: candidate.selected ?? candidate.priority === 'high'
      }));
    const candidates = classifyCandidates(mergeQuestionCandidates(fallback, aiCandidates), brand);

    return { items: candidates, missingProfileFields: response.output.missingProfileFields, generationNotes: response.output.generationNotes, source: 'llm' };
  }
}

function classifyCandidates(candidates: TestQuestionCandidateInput[], brand: BrandDetail): TestQuestionCandidateInput[] {
  return candidates.map((candidate) => ({
    ...candidate,
    promptKind: classifyPromptKind(candidate.question, brand)
  }));
}

function limitFirstRoundQuestions(candidates: TestQuestionCandidateInput[]): TestQuestionCandidateInput[] {
  const questions = new Set<string>();
  return [...candidates]
    .sort((left, right) => priorityRank(right.priority) - priorityRank(left.priority))
    .filter((candidate) => {
      const questionKey = normalizeQuestionText(candidate.question);
      if (questions.has(questionKey)) return false;
      questions.add(questionKey);
      return true;
    })
    .slice(0, firstRoundQuestionLimit);
}

function priorityRank(priority: TestQuestionCandidateInput['priority']): number {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}

function fallbackResult(items: TestQuestionCandidateInput[], profile: BrandProfile, note = '已使用基础模板生成监测问题'): TestAssetGenerationResult<TestQuestionCandidateInput> {
  return {
    items,
    missingProfileFields: profile.missingFields,
    generationNotes: [note],
    source: 'fallback'
  };
}

function buildQuestionsForTheme(brand: BrandDetail, profile: BrandProfile, theme: TestTheme, seedWords: string[]): TestQuestionCandidateInput[] {
  const brandName = brand.name.trim();
  const city = brand.targetCities[0]?.trim();
  const offering = profile.offerings[0]?.trim() ?? brand.businessScope.trim();
  const competitor = profile.competitors[0]?.trim();
  const audience = brand.targetAudience.trim() || profile.targetCustomers[0]?.trim();
  const valueProp = profile.valueProps[0]?.trim();
  const seedWord = seedWords.find(hasText)?.trim();
  const questionInputs: QuestionSeed[] = [];

  if (isSupercalfBrand(brand)) {
    const supercalfQuestions = buildSupercalfQuestions(theme);

    if (supercalfQuestions.length > 0) {
      return toCandidateInputs(theme, supercalfQuestions);
    }
  }

  if (theme.type === 'brand') {
    questionInputs.push({
      question: `${brandName}是做什么的？适合哪些用户？`,
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
      estimatedValue: '验证 AI 对品牌基础介绍、适用人群和风险表达的准确性。'
    });
  }

  if (theme.type === 'category' && hasText(seedWord || offering)) {
    questionInputs.push({
      question: `${city ? `${city} ` : ''}有哪些值得推荐的${seedWord || offering}品牌？`,
      purposes: ['brand_mentioned', 'rank_first', 'competitor_presence'],
      estimatedValue: '验证非品牌词推荐场景中品牌是否出现以及排名位置。'
    });
  }

  if ((theme.type === 'scenario' || theme.type === 'offering') && hasText(seedWord || offering)) {
    questionInputs.push({
      question: `${seedWord || offering}适合哪些使用场景？有哪些品牌值得了解？`,
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'competitor_presence'],
      estimatedValue: '验证具体使用场景中的推荐机会和品牌解释准确性。'
    });
  }

  if (theme.type === 'location' && city && hasText(offering)) {
    questionInputs.push({
      question: `${city}哪里有适合${audience || '目标用户'}的${offering}？`,
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      estimatedValue: '验证本地需求场景下品牌推荐率和卖点准确性。'
    });
  }

  if ((theme.type === 'audience' || theme.type === 'age_group') && audience && hasText(offering)) {
    questionInputs.push({
      question: `${audience}选择${offering}要看哪些品牌？`,
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      estimatedValue: '验证具体人群需求下品牌是否被推荐。'
    });
  }

  if (theme.type === 'pain_point' && valueProp) {
    questionInputs.push({
      question: `想解决${valueProp}，有哪些品牌或课程值得了解？`,
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'competitor_presence'],
      estimatedValue: '验证痛点场景下 AI 是否能把品牌卖点和用户问题正确关联。'
    });
  }

  if ((theme.type === 'competitor_comparison' || theme.type === 'competitor') && competitor) {
    questionInputs.push({
      question: `${brandName}和${competitor}相比，哪个更适合${audience || '目标用户'}？`,
      purposes: ['brand_mentioned', 'rank_first', 'competitor_presence', 'value_prop_accuracy'],
      estimatedValue: '验证竞品对比场景中品牌排名、优势表达和竞品压制情况。'
    });
  }

  if (theme.type === 'buying_decision') {
    questionInputs.push({
      question: `如果要选择${brandName}，需要重点了解哪些信息？`,
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
      estimatedValue: '验证转化前决策问题中 AI 是否能给出可信且审慎的推荐理由。'
    });
  }

  return toCandidateInputs(theme, questionInputs);
}

function toCandidateInputs(theme: TestTheme, questionInputs: QuestionSeed[]): TestQuestionCandidateInput[] {
  const discoveryDimension = toDiscoveryDimension(theme.type);
  return questionInputs.map((input) => ({
    themeId: theme.id,
    question: input.question,
    purposes: input.purposes,
    targetPlatforms: defaultTargetPlatforms,
    priority: theme.priority,
    estimatedValue: input.estimatedValue,
    discoveryDimension,
    businessValue: theme.priority,
    recommendationProbability: normalizeProbability(undefined, theme.priority),
    userStage: inferUserStage(discoveryDimension),
    generationRationale: `基于“${theme.name}”优化方向和品牌资料确定性生成。`,
    generationMethod: 'deterministic',
    mergedFrom: [],
    editable: true,
    selected: theme.priority === 'high'
  }));
}

type QuestionSeed = {
  question: string;
  purposes: TestQuestionPurpose[];
  estimatedValue: string;
};

function mergeQuestionCandidates(deterministic: TestQuestionCandidateInput[], aiCandidates: TestQuestionCandidateInput[]): TestQuestionCandidateInput[] {
  const merged: TestQuestionCandidateInput[] = deterministic.map((candidate) => ({ ...candidate, mergedFrom: [...(candidate.mergedFrom ?? [])] }));
  const byQuestion = new Map(merged.map((candidate, index) => [normalizeQuestionText(candidate.question), index]));

  aiCandidates.forEach((candidate) => {
    const key = normalizeQuestionText(candidate.question);
    const existingIndex = byQuestion.get(key);
    if (existingIndex === undefined) {
      byQuestion.set(key, merged.length);
      merged.push(candidate);
      return;
    }

    const existing = merged[existingIndex];
    merged[existingIndex] = {
      ...existing,
      targetPlatforms: [...new Set([...existing.targetPlatforms, ...candidate.targetPlatforms])],
      businessValue: priorityRank(candidate.businessValue ?? candidate.priority) > priorityRank(existing.businessValue ?? existing.priority)
        ? candidate.businessValue ?? candidate.priority
        : existing.businessValue ?? existing.priority,
      recommendationProbability: Math.max(existing.recommendationProbability ?? 0, candidate.recommendationProbability ?? 0),
      generationMethod: 'merged',
      mergedFrom: [...new Set([...(existing.mergedFrom ?? []), candidate.generationRationale ?? 'AI 补充候选'])]
    };
  });

  return merged;
}

export function normalizeQuestionText(question: string): string {
  return question.trim().toLocaleLowerCase().replace(/[\s，。！？、,.!?；;：:“”"'（）()【】\[\]]+/g, '');
}

function toDiscoveryDimension(type: TestTheme['type'] | undefined): QuestionDiscoveryDimension {
  if (type === 'age_group') return 'audience';
  if (type === 'offering') return 'scenario';
  if (type === 'competitor') return 'competitor_comparison';
  if (type === 'brand' || type === 'category' || type === 'scenario' || type === 'audience' || type === 'pain_point' || type === 'location' || type === 'buying_decision' || type === 'competitor_comparison') return type;
  return 'category';
}

function inferUserStage(dimension: QuestionDiscoveryDimension): QuestionUserStage {
  if (dimension === 'brand' || dimension === 'category' || dimension === 'pain_point') return 'awareness';
  if (dimension === 'buying_decision' || dimension === 'competitor_comparison') return 'decision';
  return 'consideration';
}

function normalizeProbability(value: number | undefined, priority: TestQuestionCandidateInput['priority']): number {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.min(1, Math.max(0, value));
  if (priority === 'high') return 0.82;
  if (priority === 'medium') return 0.65;
  return 0.45;
}

function buildSupercalfQuestions(theme: TestTheme): QuestionSeed[] {
  const seeds: Record<string, QuestionSeed> = {
    贵阳儿童运动: {
      question: '贵阳有哪些值得推荐的儿童运动成长机构？',
      purposes: ['brand_mentioned', 'rank_first', 'competitor_presence'],
      estimatedValue: '验证贵阳儿童运动本地推荐场景中追光小牛是否出现并排名靠前。'
    },
    '3 到 5 岁儿童体能': {
      question: '贵阳哪里有适合 3-5 岁孩子的体能馆？',
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      estimatedValue: '验证低龄儿童体能启蒙需求下追光小牛是否被推荐。'
    },
    少儿跑酷: {
      question: '贵阳少儿跑酷课程哪家比较适合孩子长期学习？',
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      estimatedValue: '验证少儿跑酷课程词下追光小牛的推荐机会和课程表达准确性。'
    },
    快乐体操: {
      question: '贵阳儿童快乐体操课程有哪些机构可以选？',
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      estimatedValue: '验证快乐体操课程词下追光小牛是否能被准确推荐。'
    },
    感统发展: {
      question: '孩子感统发展和运动能力提升，可以在贵阳选哪些课程？',
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'competitor_presence'],
      estimatedValue: '验证感统发展痛点下 AI 是否能把追光小牛与运动成长价值关联起来。'
    },
    专注力提升: {
      question: '想通过运动提升孩子专注力，贵阳有哪些课程值得了解？',
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
      estimatedValue: '验证专注力提升场景下的推荐表现和审慎表达。'
    },
    增高体能: {
      question: '贵阳儿童增高体能课怎么选？哪些表达需要家长谨慎看待？',
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
      estimatedValue: '验证增高体能敏感场景下的合规表达和品牌推荐情况。'
    },
    中考体测: {
      question: '贵阳中考体测训练适合选择哪些儿童运动机构？',
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      estimatedValue: '验证中考体测场景下追光小牛延展业务是否具备可见度。'
    }
  };

  const seed = seeds[theme.name];

  return seed ? [seed] : [];
}

function isSupercalfBrand(brand: BrandDetail): boolean {
  const text = [brand.name, ...brand.aliases].join(' ').toLowerCase();

  return text.includes('追光小牛') || text.includes('supercalf');
}

function hasText(value: string | undefined | null): value is string {
  return Boolean(value?.trim());
}
