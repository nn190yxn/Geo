import type {
  AutomationConfirmation,
  AutomationConfirmationAction,
  AutomationPackage,
  AutomationStepSummary,
  PlatformRewriteVersion,
} from './index';

const stepSummary = {
  code: 'question_selection',
  status: 'waiting_confirmation',
  title: '本轮精选问题',
  message: '已从持续问题池中筛出 6 个高价值问题，等待品牌负责人确认。',
  relatedConfirmationIds: ['confirmation_questions_1'],
  relatedEntityIds: ['candidate_1', 'candidate_2'],
} satisfies AutomationStepSummary;

const automationPackage = {
  packageId: 'automation_package_1',
  brandId: 'brand_demo',
  status: 'waiting_confirmation',
  source: 'brand_workspace',
  goal: '完成追光小牛首轮 AI 自动化运营',
  targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
  targetPublishingPlatforms: ['zhihu', 'baijiahao', 'xiaohongshu', 'wechat_official'],
  currentStep: 'test_question_confirmation',
  stepSummaries: [stepSummary],
  relatedTestPlanId: 'test_plan_demo_supercalf_first_round',
  relatedGrowthPlanId: 'growth_plan_demo_supercalf',
  relatedContentTaskIds: ['content_task_1'],
  relatedPublishingRecordIds: ['publishing_record_1'],
  createdBy: 'user_demo',
  createdAt: '2026-07-07T00:00:00.000Z',
  updatedAt: '2026-07-07T00:00:00.000Z',
} satisfies AutomationPackage;

const confirmation = {
  confirmationId: 'confirmation_questions_1',
  packageId: automationPackage.packageId,
  brandId: automationPackage.brandId,
  type: 'test_questions',
  status: 'pending',
  title: '确认本轮监测问题',
  impact: '这些问题会决定本轮 AI 回复监测覆盖的业务角度。',
  recommendation: '建议保留地域推荐、年龄段需求、竞品对比和购买决策问题。',
  evidenceSummary: '问题来自品牌档案、测试主题和上一轮内容缺口。',
  payload: {
    selectedQuestionIds: ['candidate_1', 'candidate_2'],
    questionCount: 6,
  },
} satisfies AutomationConfirmation;

const rewriteVersion = {
  rewriteId: 'rewrite_zhihu_1',
  brandId: automationPackage.brandId,
  contentVersionId: 'content_version_1',
  targetPlatform: 'zhihu',
  title: '贵阳儿童运动课怎么选？家长可以重点看这几件事',
  body: '正文需要保留专业判断，同时使用家长能理解的表达。',
  tags: ['儿童运动', '贵阳家长', '体能训练'],
  rewriteNotes: ['调整为问答式结构', '补充可信依据', '保留审慎表达'],
  complianceNotes: ['避免保证长高、治疗感统失调等承诺式表达'],
  status: 'needs_review',
  createdAt: '2026-07-07T00:00:00.000Z',
} satisfies PlatformRewriteVersion;

const confirmationAction = 'approve' satisfies AutomationConfirmationAction;

export const automationContractTypecheckSamples = {
  stepSummary,
  automationPackage,
  confirmation,
  rewriteVersion,
  confirmationAction,
};
