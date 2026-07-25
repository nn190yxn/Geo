import { Injectable } from '@nestjs/common';
import type { LLMTaskType } from '@geo-platform/shared-types';

const themeTypes = ['brand', 'category', 'location', 'age_group', 'pain_point', 'offering', 'competitor', 'buying_decision'];
const priorities = ['high', 'medium', 'low'];
const questionPurposes = ['brand_mentioned', 'rank_first', 'value_prop_accuracy', 'competitor_presence', 'risk_expression'];
const sentiments = ['positive', 'neutral', 'negative', 'unknown'];
const growthContentTypes = ['wechat_article', 'xiaohongshu_note', 'website_faq', 'short_video_script', 'platform_profile_copy', 'image_creative_brief'];
const growthReasonTypes = ['brand_not_mentioned', 'ranking_low', 'value_prop_missing', 'competitor_stronger', 'risk_expression', 'content_gap', 'citation_gap'];

@Injectable()
export class LLMOutputValidator {
  validate(taskType: LLMTaskType, rawText: string): unknown {
    const output = this.parseJsonOutput(rawText);

    if (taskType === 'question_generation') {
      validateQuestionGenerationOutput(output);
      return output;
    }

    if (taskType === 'answer_analysis') {
      validateAnswerAnalysisOutput(output);
      return output;
    }

    if (taskType === 'content_generation') {
      validateContentGenerationOutput(output);
      return output;
    }

    validateOptimizationPlanningOutput(output);
    return output;
  }

  parseJsonOutput(rawText: string): unknown {
    try {
      return JSON.parse(rawText);
    } catch {
      throw new LLMOutputValidationError('llm_output_invalid', 'AI 返回内容格式不正确，需要重新生成');
    }
  }
}

function validateQuestionGenerationOutput(output: unknown) {
  const value = requireRecord(output, '问题生成结果必须是对象');
  const themes = requireArray(value.themes, '问题生成结果缺少 themes 数组');
  const candidates = requireArray(value.candidates, '问题生成结果缺少 candidates 数组');

  requireArrayOfStrings(value.missingProfileFields, 'missingProfileFields 必须是字符串数组');
  requireArrayOfStrings(value.generationNotes, 'generationNotes 必须是字符串数组');
  themes.forEach((theme) => validateThemeInput(theme));
  candidates.forEach((candidate) => validateQuestionCandidateInput(candidate));
}

function validateAnswerAnalysisOutput(output: unknown) {
  const value = requireRecord(output, '回答解读结果必须是对象');
  requireBoolean(value.brandMentioned, 'brandMentioned 必须是布尔值');

  if (value.brandRank !== null && value.brandRank !== undefined) {
    requireIntegerInRange(value.brandRank, 1, 100, 'brandRank 必须是 1 到 100 的整数或 null');
  }

  requireEnum(value.sentiment, sentiments, 'sentiment 不支持');
  requireNumberInRange(value.accuracyScore, 0, 100, 'accuracyScore 必须在 0 到 100 之间');
  requireNumberInRange(value.citationScore, 0, 100, 'citationScore 必须在 0 到 100 之间');
  requireNonEmptyString(value.platformEvaluation, 'platformEvaluation 不能为空');
  requireNonEmptyString(value.recommendationReason, 'recommendationReason 不能为空');
  requireNonEmptyString(value.rankingReason, 'rankingReason 不能为空');
  requireNonEmptyString(value.expressionCompleteness, 'expressionCompleteness 不能为空');
  requireNonEmptyString(value.expressionDeviation, 'expressionDeviation 不能为空');
  requireBoolean(value.reviewRequired, 'reviewRequired 必须是布尔值');
  requireArray(value.competitorMentions, 'competitorMentions 必须是数组').forEach((mention) => {
    const item = requireRecord(mention, 'competitorMentions 每一项必须是对象');
    requireNonEmptyString(item.name, '竞品名称不能为空');
    requireIntegerInRange(item.rank, 1, 100, '竞品排名必须是 1 到 100 的整数');
    requireNonEmptyString(item.context, '竞品上下文不能为空');
  });
}

function validateContentGenerationOutput(output: unknown) {
  const value = requireRecord(output, '内容生成结果必须是对象');
  requireNonEmptyString(value.title, 'title 不能为空');
  requireNonEmptyString(value.body, 'body 不能为空');

  if (value.exportFormat !== undefined && value.exportFormat !== 'markdown') {
    throw new LLMOutputValidationError('llm_output_invalid', 'exportFormat 只支持 markdown');
  }

  requireArrayOfStrings(value.complianceNotes, 'complianceNotes 必须是字符串数组');
  requireArrayOfStrings(value.retestSuggestions, 'retestSuggestions 必须是字符串数组');

  if (value.reviewRequired !== undefined) {
    requireBoolean(value.reviewRequired, 'reviewRequired 必须是布尔值');
  }
}

function validateOptimizationPlanningOutput(output: unknown) {
  const value = requireRecord(output, '优化计划结果必须是对象');
  const plan = requireRecord(value.plan, '优化计划结果缺少 plan 对象');

  if (plan.summary !== undefined) requireNonEmptyString(plan.summary, 'plan.summary 不能为空');
  if (plan.priority !== undefined) requireEnum(plan.priority, priorities, 'plan.priority 不支持');
  requireNonEmptyString(plan.dueDate, 'plan.dueDate 不能为空');
  requireArrayOfStrings(plan.publishingPlatforms, 'plan.publishingPlatforms 必须是字符串数组');
  requireNonEmptyString(plan.retestAt, 'plan.retestAt 不能为空');

  if (plan.sourceRunIds !== undefined) requireArrayOfStrings(plan.sourceRunIds, 'plan.sourceRunIds 必须是字符串数组');
  if (plan.reasons !== undefined) requireArray(plan.reasons, 'plan.reasons 必须是数组').forEach(validateGrowthReason);
  if (plan.contentRecommendations !== undefined) requireArray(plan.contentRecommendations, 'plan.contentRecommendations 必须是数组').forEach(validateContentRecommendation);

  requireArray(value.contentTasks, 'contentTasks 必须是数组').forEach(validateContentTaskInput);
  requireArray(value.retestQuestions, 'retestQuestions 必须是数组').forEach(validateQuestionCandidateInput);
  requireArrayOfStrings(value.generationNotes, 'generationNotes 必须是字符串数组');
}

function validateThemeInput(input: unknown) {
  const value = requireRecord(input, 'theme 必须是对象');
  requireEnum(value.type, themeTypes, 'theme.type 不支持');
  requireNonEmptyString(value.name, 'theme.name 不能为空');
  requireNonEmptyString(value.businessExplanation, 'theme.businessExplanation 不能为空');
  requireEnum(value.priority, priorities, 'theme.priority 不支持');
  requireNonEmptyString(value.estimatedValue, 'theme.estimatedValue 不能为空');

  if (value.enabled !== undefined) requireBoolean(value.enabled, 'theme.enabled 必须是布尔值');
  if (value.sourceProfileFields !== undefined) requireArrayOfStrings(value.sourceProfileFields, 'theme.sourceProfileFields 必须是字符串数组');
}

function validateQuestionCandidateInput(input: unknown) {
  const value = requireRecord(input, 'candidate 必须是对象');
  requireNonEmptyString(value.themeId, 'candidate.themeId 不能为空');
  requireNonEmptyString(value.question, 'candidate.question 不能为空');
  requireArray(value.purposes, 'candidate.purposes 必须是数组').forEach((purpose) => requireEnum(purpose, questionPurposes, 'candidate.purposes 包含不支持的目的'));
  requireArrayOfStrings(value.targetPlatforms, 'candidate.targetPlatforms 必须是字符串数组');
  requireEnum(value.priority, priorities, 'candidate.priority 不支持');
  requireNonEmptyString(value.estimatedValue, 'candidate.estimatedValue 不能为空');

  if (value.editable !== undefined) requireBoolean(value.editable, 'candidate.editable 必须是布尔值');
  if (value.selected !== undefined) requireBoolean(value.selected, 'candidate.selected 必须是布尔值');
}

function validateGrowthReason(input: unknown) {
  const value = requireRecord(input, 'reason 必须是对象');
  requireEnum(value.type, growthReasonTypes, 'reason.type 不支持');
  requireNonEmptyString(value.title, 'reason.title 不能为空');
  requireNonEmptyString(value.evidence, 'reason.evidence 不能为空');
  requireArrayOfStrings(value.relatedRunIds, 'reason.relatedRunIds 必须是字符串数组');
  requireArrayOfStrings(value.relatedPromptIds, 'reason.relatedPromptIds 必须是字符串数组');
}

function validateContentRecommendation(input: unknown) {
  const value = requireRecord(input, 'contentRecommendation 必须是对象');
  requireEnum(value.contentType, growthContentTypes, 'contentRecommendation.contentType 不支持');
  requireNonEmptyString(value.title, 'contentRecommendation.title 不能为空');
  requireNonEmptyString(value.targetPlatform, 'contentRecommendation.targetPlatform 不能为空');
  requireArrayOfStrings(value.targetKeywords, 'contentRecommendation.targetKeywords 必须是字符串数组');
  requireNonEmptyString(value.reason, 'contentRecommendation.reason 不能为空');
}

function validateContentTaskInput(input: unknown) {
  const value = requireRecord(input, 'contentTask 必须是对象');
  requireNonEmptyString(value.strategyId, 'contentTask.strategyId 不能为空');
  if (value.targetPlatform !== undefined) requireNonEmptyString(value.targetPlatform, 'contentTask.targetPlatform 不能为空');
  if (value.contentType !== undefined) requireNonEmptyString(value.contentType, 'contentTask.contentType 不能为空');
  if (value.targetKeywords !== undefined) requireArrayOfStrings(value.targetKeywords, 'contentTask.targetKeywords 必须是字符串数组');
  if (value.referenceSources !== undefined) requireArrayOfStrings(value.referenceSources, 'contentTask.referenceSources 必须是字符串数组');
}

function requireRecord(input: unknown, message: string): Record<string, unknown> {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new LLMOutputValidationError('llm_output_invalid', message);
  }

  return input as Record<string, unknown>;
}

function requireArray(input: unknown, message: string): unknown[] {
  if (!Array.isArray(input)) {
    throw new LLMOutputValidationError('llm_output_invalid', message);
  }

  return input;
}

function requireArrayOfStrings(input: unknown, message: string): string[] {
  const value = requireArray(input, message);
  if (!value.every((item) => typeof item === 'string')) {
    throw new LLMOutputValidationError('llm_output_invalid', message);
  }

  return value;
}

function requireNonEmptyString(input: unknown, message: string): string {
  if (typeof input !== 'string' || !input.trim()) {
    throw new LLMOutputValidationError('llm_output_invalid', message);
  }

  return input;
}

function requireBoolean(input: unknown, message: string): boolean {
  if (typeof input !== 'boolean') {
    throw new LLMOutputValidationError('llm_output_invalid', message);
  }

  return input;
}

function requireNumberInRange(input: unknown, min: number, max: number, message: string): number {
  if (typeof input !== 'number' || !Number.isFinite(input) || input < min || input > max) {
    throw new LLMOutputValidationError('llm_output_invalid', message);
  }

  return input;
}

function requireIntegerInRange(input: unknown, min: number, max: number, message: string): number {
  const value = requireNumberInRange(input, min, max, message);
  if (!Number.isInteger(value)) {
    throw new LLMOutputValidationError('llm_output_invalid', message);
  }

  return value;
}

function requireEnum(input: unknown, allowed: string[], message: string): string {
  if (typeof input !== 'string' || !allowed.includes(input)) {
    throw new LLMOutputValidationError('llm_output_invalid', message);
  }

  return input;
}

export class LLMOutputValidationError extends Error {
  constructor(
    readonly code: string,
    message: string
  ) {
    super(message);
    this.name = 'LLMOutputValidationError';
  }
}
