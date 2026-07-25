import { describe, expect, it, vi } from 'vitest';
import { QuestionRadarService } from '../src/modules/sprints/question-radar.service';

const now = '2026-07-11T00:00:00.000Z';
const sprint = {
  sprintId: 'sprint_1',
  brandId: 'brand_demo',
  title: '首轮 AI 可见性运营',
  goal: '打通问题到复测闭环',
  status: 'running',
  currentStep: 'question_radar',
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
  relatedQuestionIds: ['question_1', 'question_duplicate'],
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

const themes = [
  {
    id: 'theme_location',
    brandId: 'brand_demo',
    type: 'location',
    name: '本地推荐',
    businessExplanation: '覆盖本地决策意图',
    priority: 'high',
    estimatedValue: '高转化',
    sourceProfileFields: [],
    enabled: true,
    createdAt: now,
    updatedAt: now
  }
] as const;

const candidates = [
  {
    id: 'question_1',
    brandId: 'brand_demo',
    themeId: 'theme_location',
    question: '贵阳儿童运动推荐？',
    purposes: ['brand_mentioned'],
    targetPlatforms: ['doubao', 'kimi'],
    priority: 'high',
    estimatedValue: '高转化意图',
    editable: true,
    selected: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'question_duplicate',
    brandId: 'brand_demo',
    themeId: 'theme_location',
    question: ' 贵阳 儿童运动推荐? ',
    purposes: ['brand_mentioned'],
    targetPlatforms: ['doubao'],
    priority: 'medium',
    estimatedValue: '重复问题',
    editable: true,
    selected: false,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'question_2',
    brandId: 'brand_demo',
    themeId: 'theme_location',
    question: '3 岁孩子适合什么体能课？',
    purposes: ['value_prop_accuracy'],
    targetPlatforms: ['deepseek'],
    priority: 'medium',
    estimatedValue: '年龄段需求',
    editable: true,
    selected: false,
    createdAt: now,
    updatedAt: now
  }
] as const;

describe('QuestionRadarService', () => {
  it('builds question radar with intent, platform coverage, business value and Sprint association', () => {
    const service = new QuestionRadarService({} as never);
    const dashboard = service.buildDashboard('brand_demo', sprint, candidates as never, themes as never);

    expect(dashboard).toMatchObject({
      brandId: 'brand_demo',
      sprintId: 'sprint_1',
      totalQuestionCount: 3,
      inSprintQuestionCount: 2,
      dedupedInSprintQuestionCount: 1,
      duplicateInSprintQuestionCount: 1
    });
    expect(dashboard.items).toHaveLength(2);
    expect(dashboard.items[0]).toMatchObject({
      questionId: 'question_1',
      intentLabel: '本地推荐',
      intentType: 'location',
      platformCoverage: ['doubao', 'kimi'],
      businessValue: '高转化意图',
      status: 'in_sprint',
      sprintAssociation: { inSprint: true, relation: 'selected_for_sprint', duplicateInSprint: false }
    });
    expect(dashboard.items[1]).toMatchObject({ questionId: 'question_2', status: 'available' });
  });

  it('loads Sprint, candidates and themes from PermissionsService', async () => {
    const permissions = {
      getVisibilitySprint: vi.fn().mockResolvedValue(sprint),
      listTestQuestionCandidates: vi.fn().mockResolvedValue(candidates),
      listTestThemes: vi.fn().mockResolvedValue(themes)
    };
    const service = new QuestionRadarService(permissions as never);

    await expect(service.getQuestionRadar('user_demo', 'brand_demo', 'sprint_1')).resolves.toMatchObject({
      sprintId: 'sprint_1',
      dedupedInSprintQuestionCount: 1
    });
    expect(permissions.listTestQuestionCandidates).toHaveBeenCalledWith('user_demo', 'brand_demo');
    expect(permissions.listTestThemes).toHaveBeenCalledWith('user_demo', 'brand_demo');
  });
});
