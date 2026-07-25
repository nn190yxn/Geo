import type { ManualTestAnswerInput, ManualTestAnswerResultItem, TestPlan } from '@geo-platform/shared-types';
import { getPlatformPreview } from './testQuestionDisplay';

export type ManualTestQuestionRow = {
  key: string;
  questionNumber: number;
  question: string;
  platformCode: string;
  platformLabel: string;
};

export type ManualAnswerDraft = Pick<ManualTestAnswerInput, 'question' | 'platformCode' | 'rawText' | 'modelName'>;

export function getManualTestRows(plan?: TestPlan): ManualTestQuestionRow[] {
  if (!plan) {
    return [];
  }

  return plan.questions.flatMap((question, questionIndex) => question.targetPlatforms.map((platformCode) => ({
    key: `${questionIndex}_${platformCode}`,
    questionNumber: questionIndex + 1,
    question: question.question,
    platformCode,
    platformLabel: getPlatformPreview([platformCode])
  })));
}

export function parseManualAnswerBatch(value: string): ManualAnswerDraft[] {
  return value
    .split(/\n\s*\n/)
    .map(parseManualAnswerBlock)
    .filter((answer): answer is ManualAnswerDraft => Boolean(answer));
}

export function getManualAnswerResultLabel(item: ManualTestAnswerResultItem): string {
  const platformLabel = getPlatformPreview([item.platformCode]);
  const statusLabel = item.status === 'accepted' ? '匹配成功' : '匹配失败';

  return `${statusLabel}：${platformLabel}｜${item.question}｜${item.message}`;
}

export function getMissingAnswerCount(rows: ManualTestQuestionRow[], answers: ManualAnswerDraft[]): number {
  const answeredKeys = new Set(answers.filter((answer) => answer.rawText.trim()).map((answer) => getAnswerKey(answer.question, answer.platformCode)));

  return rows.filter((row) => !answeredKeys.has(getAnswerKey(row.question, row.platformCode))).length;
}

function parseManualAnswerBlock(block: string): ManualAnswerDraft | null {
  const platformCode = getFieldValue(block, '平台');
  const question = getFieldValue(block, '问题');
  const rawText = getFieldValue(block, '回答');
  const modelName = getFieldValue(block, '模型');

  if (!platformCode || !question || !rawText) {
    return null;
  }

  return {
    platformCode: normalizePlatformInput(platformCode),
    question,
    rawText,
    modelName
  };
}

function getFieldValue(block: string, label: string): string | undefined {
  const pattern = new RegExp(`^${label}[:：]\\s*(.+)$`, 'm');
  const match = block.match(pattern);

  return match?.[1]?.trim();
}

function normalizePlatformInput(value: string): string {
  const trimmed = value.trim();
  const aliases: Record<string, string> = {
    豆包: 'doubao',
    Kimi: 'kimi',
    kimi: 'kimi',
    DeepSeek: 'deepseek',
    deepseek: 'deepseek',
    通义千问: 'qianwen',
    千问: 'qianwen',
    Qwen: 'qianwen',
    qwen: 'qianwen',
    阶跃星辰: 'stepfun',
    stepfun: 'stepfun'
  };

  return aliases[trimmed] ?? trimmed;
}

function getAnswerKey(question: string, platformCode: string): string {
  return `${platformCode.trim()}::${question.trim()}`;
}
