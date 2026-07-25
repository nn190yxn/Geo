import { BadRequestException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import { StandardAnswerService } from '../src/modules/sprints/standard-answer.service';

const now = '2026-07-11T00:00:00.000Z';
const sprint = {
  sprintId: 'sprint_1',
  brandId: 'brand_demo',
  title: '首轮 AI 可见性运营',
  goal: '打通问题到复测闭环',
  status: 'running',
  currentStep: 'standard_answer_alignment',
  steps: [],
  metricSummary: {
    questionCoverageRate: 0,
    mentionRate: 0,
    recommendationRate: 0,
    firstRecommendationRate: 0,
    topThreeRate: 0,
    citationHitRate: 0,
    expressionAccuracyRate: 0,
    riskExpressionCount: 0,
    contentGapCount: 0,
    competitorSuppressionCount: 0,
    sampleSize: 0
  },
  relatedQuestionIds: ['question_1'],
  relatedTestPlanIds: [],
  relatedMonitoringRunIds: [],
  relatedStandardAnswerIds: [],
  relatedContentTaskIds: [],
  relatedPublishingRecordIds: [],
  relatedRetestTaskIds: [],
  createdBy: 'user_demo',
  createdAt: now,
  updatedAt: now
} as const;

const brand = {
  brandId: 'brand_demo',
  name: '追光小牛',
  status: 'active',
  aliases: ['SUPERCALF'],
  industry: '儿童运动',
  website: '',
  targetCities: ['贵阳'],
  businessScope: '儿童运动成长课程',
  targetAudience: '2-14 岁儿童家庭',
  createdAt: now,
  updatedAt: now
} as const;

const profile = {
  brandId: 'brand_demo',
  intro: '贵州本土最大规模儿童运动连锁品牌。',
  valueProps: ['运动成长课是儿童必修课', 'BE THE SUPERCALF'],
  offerings: ['ACE 课程体系', '儿童体能课'],
  proofPoints: ['多届体操世界冠军联合创办', '贵阳 5 家校区'],
  targetCustomers: ['2-14 岁儿童'],
  recommendedExpressions: ['运动成长课是儿童必修课'],
  blockedExpressions: [],
  contentRules: [],
  competitors: [],
  faqs: [],
  completenessScore: 90,
  missingFields: [],
  completenessPrompts: [],
  updatedAt: now
} as const;

const question = {
  id: 'question_1',
  brandId: 'brand_demo',
  themeId: 'theme_1',
  question: '贵阳儿童运动训练机构推荐哪家？',
  purposes: ['brand_mentioned'],
  targetPlatforms: ['doubao'],
  priority: 'high',
  estimatedValue: '高转化意图',
  editable: true,
  selected: true,
  createdAt: now,
  updatedAt: now
} as const;

function createPermissionsServiceMock() {
  return {
    getVisibilitySprint: vi.fn().mockResolvedValue(sprint),
    getBrandWorkspaceSnapshot: vi.fn().mockResolvedValue({ brand, relatedCounts: {} }),
    getBrandProfile: vi.fn().mockResolvedValue(profile),
    listTestQuestionCandidates: vi.fn().mockResolvedValue([question]),
    listBrandStandardAnswers: vi.fn().mockResolvedValue([]),
    getBrandStandardAnswer: vi.fn().mockResolvedValue(null),
    createBrandStandardAnswer: vi.fn().mockImplementation((_userId, brandId, input) => Promise.resolve({
      answerId: 'standard_answer_generated',
      brandId,
      ...input,
      keyPoints: input.keyPoints ?? [],
      evidence: input.evidence ?? [],
      status: input.status ?? 'draft',
      createdBy: 'user_demo',
      createdAt: now,
      updatedAt: now
    })),
    updateBrandStandardAnswer: vi.fn().mockImplementation((_userId, brandId, answerId, input) => Promise.resolve({
      answerId,
      brandId,
      questionId: 'question_1',
      question: question.question,
      answer: '已审核标准答案',
      keyPoints: [],
      evidence: [],
      status: input.status,
      reviewedBy: input.reviewedBy,
      reviewedAt: input.reviewedAt,
      createdBy: 'user_demo',
      createdAt: now,
      updatedAt: now
    })),
    updateVisibilitySprintRelations: vi.fn().mockResolvedValue({ ...sprint, relatedStandardAnswerIds: ['standard_answer_generated'] })
  };
}

describe('StandardAnswerService', () => {
  it('generates review-ready standard answers from brand profile and Sprint questions', async () => {
    const permissions = createPermissionsServiceMock();
    const service = new StandardAnswerService(permissions as never);

    const answers = await service.generateStandardAnswers('user_demo', 'brand_demo', 'sprint_1');

    expect(answers).toHaveLength(1);
    expect(answers?.[0]).toMatchObject({
      answerId: 'standard_answer_generated',
      questionId: 'question_1',
      status: 'ready_for_review',
      keyPoints: expect.arrayContaining(['追光小牛', '贵阳', 'ACE 课程体系'])
    });
    expect(answers?.[0]?.answer).toContain('运动成长课是儿童必修课');
    expect(answers?.[0]?.evidence).toContainEqual(expect.objectContaining({ label: '品牌介绍', excerpt: '贵州本土最大规模儿童运动连锁品牌。' }));
    expect(permissions.updateVisibilitySprintRelations).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', { relatedStandardAnswerIds: ['standard_answer_generated'] });
  });

  it('reuses existing non-archived standard answers for the same question', async () => {
    const permissions = createPermissionsServiceMock();
    permissions.listBrandStandardAnswers.mockResolvedValueOnce([
      {
        answerId: 'standard_answer_existing',
        brandId: 'brand_demo',
        questionId: 'question_1',
        question: question.question,
        answer: '已有标准答案',
        keyPoints: [],
        evidence: [],
        status: 'ready_for_review',
        createdBy: 'user_demo',
        createdAt: now,
        updatedAt: now
      }
    ]);
    const service = new StandardAnswerService(permissions as never);

    const answers = await service.generateStandardAnswers('user_demo', 'brand_demo', 'sprint_1');

    expect(answers?.[0]).toMatchObject({ answerId: 'standard_answer_existing' });
    expect(permissions.createBrandStandardAnswer).not.toHaveBeenCalled();
    expect(permissions.updateVisibilitySprintRelations).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', { relatedStandardAnswerIds: ['standard_answer_existing'] });
  });

  it('approves a Sprint standard answer and records reviewer metadata', async () => {
    const permissions = createPermissionsServiceMock();
    permissions.getBrandStandardAnswer.mockResolvedValueOnce({
      answerId: 'standard_answer_generated',
      brandId: 'brand_demo',
      questionId: 'question_1',
      question: question.question,
      answer: '待审核标准答案',
      keyPoints: [],
      evidence: [],
      status: 'ready_for_review',
      createdBy: 'user_demo',
      createdAt: now,
      updatedAt: now
    });
    const service = new StandardAnswerService(permissions as never);

    await expect(service.approveStandardAnswer('user_demo', 'brand_demo', 'sprint_1', 'standard_answer_generated')).resolves.toMatchObject({
      answerId: 'standard_answer_generated',
      status: 'approved',
      reviewedBy: 'user_demo'
    });
    expect(permissions.updateVisibilitySprintRelations).toHaveBeenCalledWith('user_demo', 'brand_demo', 'sprint_1', { relatedStandardAnswerIds: ['standard_answer_generated'] });
  });

  it('rejects generation when selected questions are not in the Sprint question set', async () => {
    const permissions = createPermissionsServiceMock();
    const service = new StandardAnswerService(permissions as never);

    await expect(service.generateStandardAnswers('user_demo', 'brand_demo', 'sprint_1', { questionIds: ['missing_question'] })).rejects.toBeInstanceOf(BadRequestException);
  });
});
