import { describe, expect, it } from 'vitest';
import { LLMOutputValidationError, LLMOutputValidator } from '../src/modules/llm/llm-output-validator';
import { LLMPromptTemplateService } from '../src/modules/llm/llm-prompt-template.service';

describe('LLMOutputValidator', () => {
  const validator = new LLMOutputValidator();

  it('validates question generation output', () => {
    expect(() => validator.validate('question_generation', JSON.stringify(createQuestionGenerationOutput()))).not.toThrow();
  });

  it('rejects question candidates without purposes', () => {
    const output = createQuestionGenerationOutput();
    Reflect.deleteProperty(output.candidates[0], 'purposes');

    expect(() => validator.validate('question_generation', JSON.stringify(output))).toThrow(LLMOutputValidationError);
  });

  it('validates answer analysis output with score boundaries', () => {
    expect(() => validator.validate('answer_analysis', JSON.stringify(createAnswerAnalysisOutput()))).not.toThrow();

    expect(() => validator.validate('answer_analysis', JSON.stringify({ ...createAnswerAnalysisOutput(), accuracyScore: 101 }))).toThrow(LLMOutputValidationError);
  });

  it('validates content generation output', () => {
    expect(() => validator.validate('content_generation', JSON.stringify(createContentGenerationOutput()))).not.toThrow();

    expect(() => validator.validate('content_generation', JSON.stringify({ ...createContentGenerationOutput(), exportFormat: 'html' }))).toThrow(LLMOutputValidationError);
  });

  it('validates optimization planning output', () => {
    expect(() => validator.validate('optimization_planning', JSON.stringify(createOptimizationPlanningOutput()))).not.toThrow();

    expect(() => validator.validate('optimization_planning', JSON.stringify({ ...createOptimizationPlanningOutput(), contentTasks: [{}] }))).toThrow(LLMOutputValidationError);
  });

  it('rejects invalid JSON', () => {
    expect(() => validator.validate('question_generation', 'not json')).toThrow(LLMOutputValidationError);
  });
});

describe('LLMPromptTemplateService', () => {
  it('builds task-specific JSON prompts', () => {
    const service = new LLMPromptTemplateService();
    const messages = service.buildMessages('question_generation', { brand: '追光小牛' });

    expect(messages).toEqual([
      expect.objectContaining({ role: 'system', content: expect.stringContaining('只输出合法 JSON') }),
      expect.objectContaining({ role: 'developer', content: expect.stringContaining('themes') }),
      expect.objectContaining({ role: 'user', content: expect.stringContaining('question_generation') })
    ]);
  });
});

function createQuestionGenerationOutput() {
  return {
    themes: [
      {
        type: 'location',
        name: '贵阳儿童运动推荐',
        businessExplanation: '测试本地推荐场景',
        priority: 'high',
        estimatedValue: '能判断 AI 是否会推荐品牌',
        enabled: true,
        sourceProfileFields: ['targetCities']
      }
    ],
    candidates: [
      {
        themeId: 'theme_location',
        question: '贵阳有哪些值得推荐的儿童运动成长机构？',
        purposes: ['brand_mentioned', 'rank_first'],
        targetPlatforms: ['doubao', 'kimi'],
        priority: 'high',
        estimatedValue: '覆盖本地高意向搜索',
        editable: true,
        selected: true
      }
    ],
    missingProfileFields: [],
    generationNotes: ['已覆盖本地推荐场景']
  };
}

function createAnswerAnalysisOutput() {
  return {
    brandMentioned: true,
    brandRank: 1,
    sentiment: 'positive',
    accuracyScore: 88,
    citationScore: 60,
    platformEvaluation: 'AI 回答中出现了追光小牛',
    recommendationReason: '回答提到了儿童运动成长课程',
    rankingReason: '品牌排在第一位',
    expressionCompleteness: '核心卖点表达基本完整',
    expressionDeviation: '未发现高风险表达',
    competitorMentions: [{ name: '竞品 A', rank: 2, context: '作为备选机构出现' }],
    reviewRequired: false
  };
}

function createContentGenerationOutput() {
  return {
    title: '贵阳儿童运动成长怎么选',
    body: '# 贵阳儿童运动成长怎么选\n\n正文内容',
    exportFormat: 'markdown',
    complianceNotes: ['未使用效果承诺'],
    retestSuggestions: ['发布后复测本地推荐问题'],
    reviewRequired: false
  };
}

function createOptimizationPlanningOutput() {
  return {
    plan: {
      summary: '补强本地推荐内容',
      reasons: [
        {
          type: 'content_gap',
          title: '本地推荐内容不足',
          evidence: 'AI 回答缺少品牌官网引用',
          relatedRunIds: ['run_1'],
          relatedPromptIds: ['prompt_1']
        }
      ],
      priority: 'high',
      dueDate: '2026-07-20',
      publishingPlatforms: ['官网', '公众号'],
      retestAt: '2026-07-27',
      contentRecommendations: [
        {
          contentType: 'website_faq',
          title: '贵阳儿童运动成长 FAQ',
          targetPlatform: '官网',
          targetKeywords: ['贵阳儿童运动'],
          reason: '补充 AI 可引用内容'
        }
      ]
    },
    contentTasks: [
      {
        strategyId: 'strategy_1',
        targetPlatform: '官网',
        contentType: 'website_faq',
        targetKeywords: ['贵阳儿童运动'],
        referenceSources: ['品牌知识库']
      }
    ],
    retestQuestions: [createQuestionGenerationOutput().candidates[0]],
    generationNotes: ['优先补官网 FAQ']
  };
}
