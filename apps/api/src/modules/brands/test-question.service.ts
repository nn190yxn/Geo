import { Injectable, Optional } from '@nestjs/common';
import type {
  BeginnerFriendlyPlatform,
  BrandDetail,
  BrandProfile,
  QuestionGenerationInput,
  QuestionGenerationOutput,
  TestAssetGenerationResult,
  TestQuestionCandidateInput,
  TestQuestionPurpose,
  TestTheme
} from '@geo-platform/shared-types';
import { LLMOrchestrationService } from '../llm/llm-orchestration.service';

const defaultTargetPlatforms: BeginnerFriendlyPlatform[] = ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'];
const firstRoundQuestionLimit = 8;

@Injectable()
export class TestQuestionService {
  constructor(@Optional() private readonly llmService?: LLMOrchestrationService) {}

  generateCandidates(brand: BrandDetail, profile: BrandProfile, themes: TestTheme[]): TestQuestionCandidateInput[] {
    return limitFirstRoundQuestions(themes
      .filter((theme) => theme.enabled)
      .flatMap((theme) => buildQuestionsForTheme(brand, profile, theme)));
  }

  async generateCandidatesWithLLM(
    userId: string,
    brandId: string,
    brand: BrandDetail,
    profile: BrandProfile,
    themes: TestTheme[]
  ): Promise<TestAssetGenerationResult<TestQuestionCandidateInput>> {
    const fallback = this.generateCandidates(brand, profile, themes);

    if (!this.llmService) {
      return fallbackResult(fallback, profile);
    }

    const response = await this.llmService.runTask<QuestionGenerationInput, QuestionGenerationOutput>(userId, brandId, 'question_generation', {
      mode: 'sync',
      input: {
        brandDetail: brand,
        brandProfile: profile,
        themes: themes.filter((theme) => theme.enabled),
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
    const candidates = limitFirstRoundQuestions(response.output.candidates
      .filter((candidate) => enabledThemeIds.has(candidate.themeId))
      .map((candidate) => ({
        ...candidate,
        targetPlatforms: candidate.targetPlatforms.length ? candidate.targetPlatforms : defaultTargetPlatforms,
        editable: candidate.editable ?? true,
        selected: candidate.selected ?? candidate.priority === 'high'
      })));

    return candidates.length
      ? { items: candidates, missingProfileFields: response.output.missingProfileFields, generationNotes: response.output.generationNotes, source: 'llm' }
      : fallbackResult(fallback, profile);
  }
}

function limitFirstRoundQuestions(candidates: TestQuestionCandidateInput[]): TestQuestionCandidateInput[] {
  return [...candidates]
    .sort((left, right) => priorityRank(right.priority) - priorityRank(left.priority))
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

function buildQuestionsForTheme(brand: BrandDetail, profile: BrandProfile, theme: TestTheme): TestQuestionCandidateInput[] {
  const brandName = brand.name.trim();
  const city = brand.targetCities[0]?.trim();
  const offering = profile.offerings[0]?.trim() ?? brand.businessScope.trim();
  const competitor = profile.competitors[0]?.trim();
  const audience = brand.targetAudience.trim() || profile.targetCustomers[0]?.trim();
  const valueProp = profile.valueProps[0]?.trim();
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

  if (theme.type === 'category' && hasText(offering)) {
    questionInputs.push({
      question: `${city ? `${city} ` : ''}有哪些值得推荐的${offering}品牌？`,
      purposes: ['brand_mentioned', 'rank_first', 'competitor_presence'],
      estimatedValue: '验证非品牌词推荐场景中品牌是否出现以及排名位置。'
    });
  }

  if (theme.type === 'location' && city && hasText(offering)) {
    questionInputs.push({
      question: `${city}哪里有适合${audience || '目标用户'}的${offering}？`,
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      estimatedValue: '验证本地需求场景下品牌推荐率和卖点准确性。'
    });
  }

  if (theme.type === 'age_group' && audience && hasText(offering)) {
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

  if (theme.type === 'offering' && hasText(offering)) {
    questionInputs.push({
      question: `${offering}怎么选？${brandName}适合什么情况？`,
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
      estimatedValue: '验证具体课程或产品词下的解释准确性和合规表达。'
    });
  }

  if (theme.type === 'competitor' && competitor) {
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
  return questionInputs.map((input) => ({
    themeId: theme.id,
    question: input.question,
    purposes: input.purposes,
    targetPlatforms: defaultTargetPlatforms,
    priority: theme.priority,
    estimatedValue: input.estimatedValue,
    editable: true,
    selected: theme.priority === 'high'
  }));
}

type QuestionSeed = {
  question: string;
  purposes: TestQuestionPurpose[];
  estimatedValue: string;
};

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
