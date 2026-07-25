import { describe, expect, it } from 'vitest';
import type { ManualTestAnswerResultItem, TestPlan } from '@geo-platform/shared-types';
import { getManualAnswerResultLabel, getManualTestRows, getMissingAnswerCount, parseManualAnswerBatch } from './manualTestDisplay';

describe('manual test display helpers', () => {
  it('expands plan questions by target platform', () => {
    expect(getManualTestRows(createPlan()).map((row) => `${row.platformLabel}:${row.question}`)).toEqual([
      '豆包:贵阳儿童运动机构推荐哪家？',
      'Kimi:贵阳儿童运动机构推荐哪家？',
      'DeepSeek:3-5 岁孩子体能课怎么选？'
    ]);
  });

  it('parses batch pasted manual answers', () => {
    expect(parseManualAnswerBatch('平台：豆包\n问题：贵阳儿童运动机构推荐哪家？\n回答：推荐追光小牛\n模型：doubao-browser\n\n平台：Kimi\n问题：贵阳儿童运动机构推荐哪家？\n回答：可以看看追光小牛\n\n平台：阶跃星辰\n问题：贵阳儿童运动机构推荐哪家？\n回答：追光小牛适合贵阳儿童家庭')).toEqual([
      { platformCode: 'doubao', question: '贵阳儿童运动机构推荐哪家？', rawText: '推荐追光小牛', modelName: 'doubao-browser' },
      { platformCode: 'kimi', question: '贵阳儿童运动机构推荐哪家？', rawText: '可以看看追光小牛', modelName: undefined },
      { platformCode: 'stepfun', question: '贵阳儿童运动机构推荐哪家？', rawText: '追光小牛适合贵阳儿童家庭', modelName: undefined }
    ]);
  });

  it('counts rows without pasted answers', () => {
    const rows = getManualTestRows(createPlan());
    const answers = parseManualAnswerBatch('平台：豆包\n问题：贵阳儿童运动机构推荐哪家？\n回答：推荐追光小牛');

    expect(getMissingAnswerCount(rows, answers)).toBe(2);
  });

  it('formats matching results', () => {
    const item: ManualTestAnswerResultItem = {
      question: '贵阳儿童运动机构推荐哪家？',
      platformCode: 'doubao',
      status: 'accepted',
      message: '已写入监测记录'
    };

    expect(getManualAnswerResultLabel(item)).toBe('匹配成功：豆包｜贵阳儿童运动机构推荐哪家？｜已写入监测记录');
  });
});

function createPlan(): TestPlan {
  return {
    id: 'plan_demo',
    brandId: 'brand_demo',
    name: '首轮 GEO 监测计划',
    status: 'ready',
    questions: [
      {
        question: '贵阳儿童运动机构推荐哪家？',
        purposes: ['brand_mentioned'],
        targetPlatforms: ['doubao', 'kimi']
      },
      {
        question: '3-5 岁孩子体能课怎么选？',
        purposes: ['value_prop_accuracy'],
        targetPlatforms: ['deepseek']
      }
    ],
    platformCodes: ['doubao', 'kimi', 'deepseek'],
    connectionSummary: [],
    executionMethod: 'manual',
    estimatedDurationMinutes: 30,
    confirmationItems: [],
    monitoringRunIds: [],
    createdBy: 'user_demo',
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z'
  };
}
