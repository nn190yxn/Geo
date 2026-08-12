import type { AIConnectionMethod, AIConnectionStatus, BeginnerFriendlyPlatform, OptimizationUnitPriority, PlatformConnectionSummary, QuestionDiscoveryDimension, QuestionGenerationMethod, QuestionUserStage, TestPlanExecutionResult, TestQuestionCandidate, TestQuestionCandidateUpdateInput, TestQuestionPurpose, TestThemeType } from '@geo-platform/shared-types';
import { getPlatformDisplayName } from '../../../utils/displayLabels';

export const themeTypeLabels: Record<TestThemeType, string> = {
  brand: '品牌词',
  category: '品类词',
  scenario: '使用场景',
  audience: '目标人群',
  location: '地域词',
  age_group: '年龄段',
  pain_point: '用户痛点',
  offering: '课程或产品',
  competitor: '竞品对比',
  competitor_comparison: '竞品比较',
  buying_decision: '购买决策'
};

export const discoveryDimensionLabels: Record<QuestionDiscoveryDimension, string> = {
  brand: '品牌',
  category: '品类',
  scenario: '场景',
  audience: '人群',
  pain_point: '痛点',
  location: '地域',
  buying_decision: '购买决策',
  competitor_comparison: '竞品比较'
};

export const userStageLabels: Record<QuestionUserStage, string> = {
  awareness: '了解阶段',
  consideration: '比较阶段',
  decision: '决策阶段'
};

export const generationMethodLabels: Record<QuestionGenerationMethod, string> = {
  deterministic: '确定性生成',
  ai: 'AI 补充',
  merged: '规则与 AI 合并'
};

export const questionPurposeLabels: Record<TestQuestionPurpose, string> = {
  brand_mentioned: '是否被提到',
  rank_first: '是否排第一',
  value_prop_accuracy: '卖点是否准确',
  competitor_presence: '是否出现竞品',
  risk_expression: '是否有风险表达'
};

export const priorityLabels: Record<OptimizationUnitPriority, string> = {
  high: '高优先级',
  medium: '中优先级',
  low: '低优先级'
};

export const priorityColors: Record<OptimizationUnitPriority, string> = {
  high: 'red',
  medium: 'blue',
  low: 'default'
};

export const platformLabels: Record<BeginnerFriendlyPlatform, string> = {
  doubao: '豆包',
  kimi: 'Kimi',
  deepseek: 'DeepSeek',
  qianwen: '通义千问',
  stepfun: '阶跃星辰'
};

export const connectionMethodLabels: Record<AIConnectionMethod, string> = {
  api: '自动监测',
  browser: '浏览器辅助监测',
  manual: '手动录入'
};

export const connectionStatusLabels: Record<AIConnectionStatus, string> = {
  ready: '可自动监测',
  browser_available: '可用浏览器辅助监测',
  manual_available: '可手动录入',
  needs_configuration: '需要补充信息',
  needs_confirmation: '需要你确认'
};

export function getDefaultQuestionCandidates(candidates: TestQuestionCandidate[], limit = 8): TestQuestionCandidate[] {
  return [...candidates]
    .sort((a, b) => getPriorityWeight(b.priority) - getPriorityWeight(a.priority))
    .slice(0, limit);
}

export function getQuestionCandidateCountLabel(total: number, shown: number): string {
  if (total <= shown) {
    return `已展示全部 ${total} 个监测问题`;
  }

  return `默认展示 ${shown} 个高价值监测问题，共 ${total} 个`;
}

export function getPlatformPreview(platforms: string[]): string {
  return platforms.map(getPlatformDisplayName).join('、');
}

export function getDurationLabel(minutes: number): string {
  if (minutes < 60) {
    return `约 ${minutes} 分钟`;
  }

  const hours = Math.floor(minutes / 60);
  const restMinutes = minutes % 60;

  return restMinutes > 0 ? `约 ${hours} 小时 ${restMinutes} 分钟` : `约 ${hours} 小时`;
}

export function getConnectionSummaryLabel(summary: PlatformConnectionSummary): string {
  const methodText = summary.methods.map((method) => connectionMethodLabels[method]).join('、');
  const statusText = connectionStatusLabels[summary.status];

  return `${getPlatformPreview([summary.platformCode])}：${statusText}，${methodText}`;
}

export function getExecutionResultSummary(result: TestPlanExecutionResult): string {
  const parts = [
    `自动监测 ${result.apiRuns.length} 条`,
    `浏览器辅助监测 ${result.browserSteps.length} 条`,
    `手动录入 ${result.manualSteps.length} 条`,
    `待补充信息 ${result.configurationItems.length} 条`
  ];
  const skippedCount = result.skippedSteps.length;

  return skippedCount > 0 ? `${parts.join('，')}，跳过 ${skippedCount} 条` : parts.join('，');
}

export function getThemeCandidateIds(candidates: TestQuestionCandidate[], themeId: string): string[] {
  return candidates.filter((candidate) => candidate.themeId === themeId).map((candidate) => candidate.id);
}

export function toQuestionCandidateUpdateInput(values: {
  question: string;
  purposesText: string;
  targetPlatformsText: string;
  priority: OptimizationUnitPriority;
  estimatedValue: string;
  recommendationProbability?: number;
  userStage?: QuestionUserStage;
  generationRationale?: string;
}): TestQuestionCandidateUpdateInput {
  return {
    question: values.question.trim(),
    purposes: splitList(values.purposesText) as TestQuestionPurpose[],
    targetPlatforms: splitList(values.targetPlatformsText).map(normalizePlatformInput),
    priority: values.priority,
    estimatedValue: values.estimatedValue.trim(),
    ...(values.recommendationProbability !== undefined ? { recommendationProbability: values.recommendationProbability } : {}),
    ...(values.userStage ? { userStage: values.userStage } : {}),
    ...(values.generationRationale?.trim() ? { generationRationale: values.generationRationale.trim() } : {})
  };
}

export function parseQuestionSeedWords(value: string): string[] {
  return [...new Set(splitList(value))].slice(0, 20);
}

function normalizePlatformInput(value: string): string {
  const aliases: Record<string, string> = {
    豆包: 'doubao',
    Kimi: 'kimi',
    kimi: 'kimi',
    DeepSeek: 'deepseek',
    deepseek: 'deepseek',
    通义千问: 'qianwen',
    千问: 'qianwen',
    阶跃星辰: 'stepfun',
    stepfun: 'stepfun',
    SenseNova: 'sensenova',
    人工录入: 'manual_input'
  };

  return aliases[value] ?? value;
}

function splitList(value: string): string[] {
  return value
    .split(/\n|、|,|，/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function getPriorityWeight(priority: OptimizationUnitPriority): number {
  if (priority === 'high') {
    return 3;
  }

  if (priority === 'medium') {
    return 2;
  }

  return 1;
}
