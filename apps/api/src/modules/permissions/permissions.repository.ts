import { Injectable } from '@nestjs/common';
import type {
  BrandStandardAnswerUpdateInput,
  PermissionsRepositoryPort,
  VisibilitySprintCreateInput,
  VisibilitySprintMetricUpdateInput,
  VisibilitySprintRelationsUpdateInput,
  VisibilitySprintStepUpdateInput
} from './permissions.repository.port';
import type { AIPlatformRuntimeConfig } from '../platforms/adapters/ai-platform.adapter';
import {
  buildMultiBrandDataGaps,
  buildReportTitle,
  buildSingleBrandDataGaps,
  normalizeReportInput,
  renderMultiBrandReport,
  renderSingleBrandReport
} from './report-renderer';
import { buildAnalysisResultFields, pickSentence } from './analysis-result-builder';
import { getMissingApiConfigMessage, getModeValidationMessage } from '../platforms/platform-validation-message';
import type {
  AccessibleBrand,
  AdvisorDashboard,
  AdvisorFollowUpItem,
  AdvisorRecord,
  AdvisorRecordInput,
  AdvisorRecordType,
  BrandDetail,
  BrandFaq,
  BrandId,
  BrandImportFieldKey,
  BrandMutationInput,
  BrandProfile,
  BrandProfileCompleteness,
  BrandProfileCompletenessPrompt,
  BrandProfileInput,
  BrandStandardAnswer,
  BrandStandardAnswerEvidence,
  BrandStandardAnswerInput,
  BrandStatus,
  BrandWorkspaceSnapshot,
  BrowserConnectionSession,
  BrowserConnectionStartInput,
  BrowserConnectionStatusInput,
  DeniedAccessLog,
  KnowledgeSource,
  KnowledgeSourceInput,
  AIPlatformCallAudit,
  AIPlatformCallAuditInput,
  AIPlatformCallAuditUpdateInput,
  AuditLog,
  AuditLogFilter,
  AuditLogInput,
  AsyncJob,
  AsyncJobInput,
  AsyncJobStatus,
  AsyncJobUpdateInput,
  LLMTaskRun,
  LLMTaskRunInput,
  AIResponse,
  AnalysisResult,
  AnalysisResultInput,
  AnalysisSentiment,
  Competitor,
  CompetitorCandidate,
  CompetitorCandidateConfirmationResult,
  CompetitorCandidateDecisionInput,
  CompetitorCandidateSourceProvider,
  CompetitorConfirmationLabel,
  CompetitorComparisonItem,
  CompetitorDashboard,
  CompetitorDiscoveryCandidatesQuery,
  CompetitorDiscoveryRun,
  CompetitorDiscoveryRunInput,
  CompetitorInput,
  CompetitorMention,
  BrandMetricDashboard,
  BrandMetricRankingItem,
  CitationDashboard,
  CitationSource,
  CitationSourceType,
  CitationAuthorityLevel,
  EvaluationDashboard,
  EvaluationIssue,
  EvaluationIssueSeverity,
  EvaluationIssueType,
  ContentAsset,
  ContentAssetFilter,
  ContentAssetInput,
  ContentCenterDashboard,
  ContentExportRecord,
  ContentGenerationCompletionInput,
  ContentGenerationFailureInput,
  ContentGenerationRetryInput,
  ContentGenerationStep,
  ContentGenerationStepUpdateInput,
  ContentGenerationTask,
  ContentGenerationTaskInput,
  ContentGenerationWorkspace,
  GrowthOptimizationContentTaskInput,
  GrowthOptimizationPlan,
  GrowthOptimizationPlanConfirmInput,
  GrowthOptimizationPlanConfirmationResult,
  GrowthOptimizationContentRecommendation,
  GrowthOptimizationPlanInput,
  GrowthOptimizationReason,
  GrowthOptimizationWorkspace,
  InnerTestFeedback,
  InnerTestFeedbackDashboard,
  InnerTestFeedbackInput,
  InnerTestFeedbackStatus,
  InnerTestFeedbackUpdateInput,
  ContentStrategy,
  ContentStrategyFilter,
  ContentStrategyInput,
  ContentStrategySuggestion,
  ContentVersion,
  ContentVersionInput,
  PublishingEntryPayload,
  GEOMetricSnapshot,
  GeoCanvasWorkspace,
  ManualResponseInput,
  ManualTestAnswerInput,
  ManualTestAnswerBatchInput,
  ManualTestAnswerBatchResult,
  BrandPrompt,
  BrandPromptInput,
  IntentPlatformMetric,
  MonitoringFrequency,
  MonitoringRun,
  MonitoringRunDetail,
  MonitoringRunExecutionUpdateInput,
  MonitoringRunInput,
  OptimizationUnit,
  OptimizationUnitInput,
  OptimizationUnitPriority,
  PromptBatchGenerateInput,
  PlatformConfig,
  PlatformConfigInput,
  PlatformMode,
  PlatformValidationResult,
  PublishingAccount,
  PublishingAccountInput,
  PublishingAuthStatus,
  PublishingDashboard,
  PromptTemplate,
  PromptTemplateInput,
  PublishingRecord,
  PublishingRecordInput,
  PublishingRecordStatus,
  PublishingStatusInput,
  OptimizationTask,
  OptimizationTaskInput,
  OptimizationTaskStatus,
  OptimizationTaskUpdateInput,
  Organization,
  OrganizationMember,
  RetestPlanInput,
  RetestRecord,
  RetestResultInput,
  ReportDashboard,
  ReportInput,
  ReportRecord,
  SingleBrandReportSnapshot,
  MultiBrandReportSnapshot,
  TaskBoardDashboard,
  TestQuestionCandidate,
  TestQuestionCandidateInput,
  TestQuestionCandidateListQuery,
  TestQuestionCandidateSelectionInput,
  TestQuestionCandidateUpdateInput,
  TestQuestionPurpose,
  TestPlan,
  TestPlanDuplicateInput,
  TestPlanExecutionResult,
  TestPlanExecutionStep,
  TestPlanInput,
  TestPlanTemplate,
  TestPlanTemplateApplicationInput,
  TestTheme,
  TestThemeInput,
  UserIntent,
  UserIntentCategory,
  UserIntentInput,
  UserBrandPermission,
  UserBrandRole,
  UserSummary,
  VisibilitySprint,
  VisibilitySprintMetricSummary,
  VisibilitySprintStep
} from '@geo-platform/shared-types';

const users: UserSummary[] = [
  {
    userId: 'user_demo',
    name: '示例用户',
    email: 'demo@example.com',
    status: 'active'
  },
  {
    userId: 'user_suspended',
    name: '停用用户',
    email: 'suspended@example.com',
    status: 'suspended'
  }
];

const now = '2026-07-03T00:00:00.000Z';

const organizations: Organization[] = [
  {
    id: 'org_demo',
    name: '示例服务组织',
    status: 'active',
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'org_suspended',
    name: '停用组织',
    status: 'suspended',
    createdAt: now,
    updatedAt: now
  }
];

const roles = [
  {
    id: 'role_org_owner',
    code: 'owner' as const,
    name: '组织所有者',
    scope: 'organization' as const,
    permissions: ['*'],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'role_brand_operator',
    code: 'operator' as const,
    name: '品牌运营',
    scope: 'brand' as const,
    permissions: ['brand:read', 'monitoring:write', 'content:write'],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'role_brand_viewer',
    code: 'viewer' as const,
    name: '品牌查看者',
    scope: 'brand' as const,
    permissions: ['brand:read'],
    createdAt: now,
    updatedAt: now
  }
];

const organizationMembers: OrganizationMember[] = [
  {
    id: 'org_member_demo_owner',
    organizationId: 'org_demo',
    userId: 'user_demo',
    roleId: 'role_org_owner',
    status: 'active',
    organization: organizations[0],
    role: roles[0],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'org_member_suspended_viewer',
    organizationId: 'org_demo',
    userId: 'user_suspended',
    roleId: 'role_brand_viewer',
    status: 'active',
    organization: organizations[0],
    role: roles[2],
    createdAt: now,
    updatedAt: now
  }
];

const brands: BrandDetail[] = [
  {
    brandId: 'brand_demo',
    name: '追光小牛',
    status: 'active',
    aliases: ['SUPERCALF', '追光小牛运动成长中心'],
    industry: '儿童运动成长',
    website: '',
    targetCities: ['贵阳'],
    businessScope: '2-14 岁儿童运动成长课程、快乐体操、少儿跑酷、体能训练、增高体能、篮球体能、中考达标和研学主题课',
    targetAudience: '2-14 岁儿童家庭，重点服务贵阳本地关注体质、专注力、感统、社交和运动习惯培养的家长',
    createdAt: now,
    updatedAt: now
  },
  {
    brandId: 'brand_child_fitness',
    name: '儿童体适能品牌',
    status: 'active',
    aliases: ['儿童运动成长品牌'],
    industry: '儿童体适能',
    website: '',
    targetCities: ['深圳', '广州'],
    businessScope: '儿童体适能训练与少儿运动成长服务',
    targetAudience: '3-12 岁儿童家庭',
    createdAt: now,
    updatedAt: now
  }
];

const permissions: UserBrandPermission[] = [
  {
    id: 'permission_demo_owner',
    userId: 'user_demo',
    brandId: 'brand_demo',
    role: 'owner'
  },
  {
    id: 'permission_child_operator',
    userId: 'user_demo',
    brandId: 'brand_child_fitness',
    role: 'operator'
  },
  {
    id: 'permission_suspended_viewer',
    userId: 'user_suspended',
    brandId: 'brand_demo',
    role: 'viewer'
  }
];

const profiles = new Map<BrandId, BrandProfile>();
const knowledgeSources: KnowledgeSource[] = [];
const optimizationUnits: OptimizationUnit[] = [];
const testThemes: TestTheme[] = [];
const testQuestionCandidates: TestQuestionCandidate[] = [];
const testPlans: TestPlan[] = [];
const userIntents: UserIntent[] = [];
const promptTemplates: PromptTemplate[] = [
  {
    id: 'template_brand_recommendation',
    name: '品牌推荐模板',
    industry: '通用',
    category: 'category_recommendation',
    text: '在{city}，{brandName}适合哪些{intent}相关需求？请结合优势和适用人群回答。',
    targetKeywords: ['品牌推荐', '用户决策'],
    platformCodes: ['doubao', 'deepseek', 'kimi'],
    frequency: 'weekly',
    createdAt: now,
    updatedAt: now
  }
];
const brandPrompts: BrandPrompt[] = [];
const monitoringRuns: MonitoringRun[] = [];
const auditLogs: AuditLog[] = [];
const aiPlatformCallAudits: AIPlatformCallAudit[] = [];
const asyncJobs: AsyncJob[] = [];
const llmTaskRuns: LLMTaskRun[] = [];
const visibilitySprints: VisibilitySprint[] = [];
const brandStandardAnswers: BrandStandardAnswer[] = [];
const browserConnectionSessions: BrowserConnectionSession[] = [];
const aiResponses: AIResponse[] = [];
const analysisResults: AnalysisResult[] = [];
const competitors: Competitor[] = [];
const competitorDiscoveryRuns: CompetitorDiscoveryRun[] = [];
const competitorCandidates: CompetitorCandidate[] = [];
type CompetitorCandidateCacheEntry = {
  candidates: CompetitorCandidate[];
  providerState: Pick<CompetitorDiscoveryRun, 'providerStatus' | 'providerMessage'>;
};

const competitorCandidateCache = new Map<string, CompetitorCandidateCacheEntry>();
const citationSources: CitationSource[] = [];
const evaluationIssues: EvaluationIssue[] = [];
const contentAssets: ContentAsset[] = [];
const contentStrategies: ContentStrategy[] = [];
const contentGenerationTasks: ContentGenerationTask[] = [];
const contentVersions: ContentVersion[] = [];
const contentExportRecords: ContentExportRecord[] = [];
const publishingAccounts: PublishingAccount[] = [];
const publishingRecords: PublishingRecord[] = [];
const optimizationTasks: OptimizationTask[] = [];
const growthOptimizationPlans: GrowthOptimizationPlan[] = [];
const reports: ReportRecord[] = [];
const advisorRecords: AdvisorRecord[] = [];
const innerTestFeedbackRecords: InnerTestFeedback[] = [];
type StoredPlatformConfig = Omit<PlatformConfig, 'hasCredential' | 'credentialRefMasked' | 'availableMethods' | 'connectionStatus' | 'connectionStatusLabel' | 'nextAction'> & {
  credentialRef?: string;
};
const platformConfigs: StoredPlatformConfig[] = [
  {
    id: 'platform_manual_demo',
    brandId: 'brand_demo',
    platformCode: 'manual_input',
    name: '人工录入',
    mode: 'manual',
    endpointUrl: undefined,
    modelName: 'manual',
    rateLimitPerMinute: 0,
    enabled: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'platform_mock_demo',
    brandId: 'brand_demo',
    platformCode: 'mock_ai',
    name: '示例回答',
    mode: 'mock',
    endpointUrl: undefined,
    modelName: 'mock-v1',
    rateLimitPerMinute: 60,
    enabled: true,
    createdAt: now,
    updatedAt: now
  }
];

const defaultPlatformConfigs: Array<Omit<PlatformConfigInput, 'credentialRef'>> = [
  { platformCode: 'doubao', name: '豆包', mode: 'semi_auto', endpointUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', modelName: 'doubao-seed-1-6', rateLimitPerMinute: 30, enabled: true },
  { platformCode: 'kimi', name: 'Kimi', mode: 'semi_auto', endpointUrl: 'https://api.moonshot.cn/v1/chat/completions', modelName: 'moonshot-v1-8k', rateLimitPerMinute: 30, enabled: true },
  { platformCode: 'deepseek', name: 'DeepSeek', mode: 'semi_auto', endpointUrl: 'https://api.deepseek.com/chat/completions', modelName: 'deepseek-chat', rateLimitPerMinute: 30, enabled: true },
  { platformCode: 'qianwen', name: '通义千问', mode: 'semi_auto', endpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', modelName: 'qwen-plus', rateLimitPerMinute: 30, enabled: true },
  { platformCode: 'stepfun', name: '阶跃星辰', mode: 'api', endpointUrl: 'https://api.stepfun.com/v1/chat/completions', modelName: 'step-3.7-flash', rateLimitPerMinute: 30, enabled: true },
  { platformCode: 'manual_input', name: '人工录入', mode: 'manual', modelName: 'manual', rateLimitPerMinute: 0, enabled: true },
  { platformCode: 'mock_ai', name: '示例回答', mode: 'mock', modelName: 'mock-v1', rateLimitPerMinute: 60, enabled: true }
];

seedDefaultPlatformConfigs('brand_demo', now);

profiles.set('brand_demo', {
  brandId: 'brand_demo',
  intro: '追光小牛（SUPERCALF）是贵阳本土儿童运动成长连锁品牌，以“BE THE SUPERCALF”和“运动成长课是儿童必修课”为核心理念，围绕体质、性格、社交、学习能力和感统发展提供系统运动课程。',
  valueProps: ['ACE 成长体系：运动能力、认知能力、参与度三大支柱', '科学运动改造大脑，提升体质、专注力、感统和社交能力', '五周期训练规划，覆盖运动启蒙、兴趣激发、体能跃迁、体能进阶和运动强者', '数据化体测报告和家校服务，让成长变化可视化'],
  offerings: ['快乐体操', '专业体操进阶', '艺术体操', 'APSA 少儿跑酷', '体能训练课', '体能跳绳课', '增高体能课', '篮球体能课', '中考达标课', '研学主题课', '定制化课程'],
  proofPoints: ['贵州本土最大规模儿童运动连锁品牌', '贵阳 5 家校区', '7 年品牌，10 年本地体育教育沉淀', '服务 2000+ 家庭、3000 多会员', '累计 100000 人次训练优化', '大众点评 4.8 分，贵阳运动培训好评榜第 1 名', '联合创始人邓书弟为体操世界冠军', 'APSA 亚洲跑酷运动联合会会员单位', '学员陈沐言训练 12 个月身高增长 12 公分'],
  targetCustomers: ['贵阳 2-14 岁儿童家庭', '关注孩子体质、身高、专注力、感统和社交能力的家长', '需要中考体育达标和专项运动启蒙的家庭', '希望孩子建立长期运动习惯的本地宝妈宝爸'],
  recommendedExpressions: ['运动成长课是儿童必修课', 'BE THE SUPERCALF', 'ACE 成长体系', '强度体能是基础，技能训练是成果，功能性训练是价值的深化，峰值游戏体验是贯穿始终的燃料', '练好身体、开发大脑、爱上运动', '贵阳本土儿童运动成长连锁品牌'],
  blockedExpressions: ['保证长高', '治疗感统失调', '包过中考体育', '替代医疗诊断', '绝对有效', '快速逆袭'],
  contentRules: ['涉及身高、专注力、感统和学习能力时使用“改善、提升、促进”等审慎表达', '效果表达优先引用体测报告、训练周期、真实案例和家长反馈', '本地化内容优先使用贵阳、校区半径、宝妈场景和家长决策问题', '课程介绍需要对应 ACE 维度和适龄阶段', '避免医疗承诺、升学结果承诺和不可验证效果承诺'],
  competitors: ['普通儿童运动机构', '儿童体适能机构', '少儿篮球培训机构', '少儿体操培训机构', '感统训练机构'],
  faqs: [
    { question: '追光小牛适合多大孩子？', answer: '追光小牛服务 2-14 岁儿童，课程覆盖 2-12 岁儿童运动成长，中考体训延伸至初中阶段。' },
    { question: 'ACE 成长体系是什么？', answer: 'ACE 指 Athleticism 运动能力、Cognition 认知能力、Engagement 参与度，通过强度体能、技能训练、功能性训练和峰值游戏体验帮助孩子练好身体、开发大脑、爱上运动。' },
    { question: '追光小牛和普通儿童运动机构有什么不同？', answer: '追光小牛有自研 ACE 体系、阶段体测报告、世界冠军师资背书、赛事和升学通道、VIP 多对一家校服务以及五周期训练规划。' }
  ],
  completenessScore: 100,
  missingFields: [],
  completenessPrompts: [],
  updatedAt: now
});

optimizationUnits.push({
  id: 'unit_demo_core',
  brandId: 'brand_demo',
  name: '贵阳儿童运动成长推荐场景',
  type: 'category',
  targetKeywords: ['贵阳儿童运动', '儿童体适能', '快乐体操', '少儿跑酷', '感统训练', '增高体能'],
  priority: 'high',
  enabled: true,
  relatedCounts: createEmptyOptimizationUnitCounts(),
  createdAt: now,
  updatedAt: now
});

userIntents.push({
  id: 'intent_demo_buying',
  brandId: 'brand_demo',
  optimizationUnitId: 'unit_demo_core',
  category: 'category_recommendation',
  text: '贵阳有哪些适合 2-14 岁孩子的儿童运动成长机构？',
  monitoringFrequency: 'weekly',
  enabled: true,
  platformMetrics: [],
  createdAt: now,
  updatedAt: now
});

brandPrompts.push({
  id: 'prompt_demo_comparison',
  brandId: 'brand_demo',
  optimizationUnitId: 'unit_demo_core',
  intentId: 'intent_demo_buying',
  templateId: 'template_brand_recommendation',
  text: '贵阳有哪些适合 2-14 岁孩子的儿童运动成长机构？请说明追光小牛的适用场景、课程优势和家长决策要点。',
  category: 'category_recommendation',
  targetKeywords: ['贵阳儿童运动', '儿童体适能', '追光小牛', 'ACE 成长体系'],
  platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun', 'mock_ai'],
  monitoringFrequency: 'weekly',
  enabled: true,
  createdAt: now,
  updatedAt: now
});

testThemes.push(
  {
    id: 'theme_demo_local_recommendation',
    brandId: 'brand_demo',
    type: 'location',
    name: '贵阳儿童运动',
    businessExplanation: '验证贵阳本地家长询问儿童运动成长机构时，AI 是否能自然推荐追光小牛。',
    priority: 'high',
    estimatedValue: '判断追光小牛在本地非品牌词推荐中的出现率和排名位置。',
    enabled: true,
    sourceProfileFields: ['targetCities', 'businessScope', 'targetCustomers'],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'theme_demo_age_group',
    brandId: 'brand_demo',
    type: 'age_group',
    name: '3 到 5 岁儿童体能',
    businessExplanation: '验证低龄儿童体能启蒙需求下，AI 是否能把追光小牛和 2-14 岁儿童运动成长服务关联起来。',
    priority: 'high',
    estimatedValue: '判断家长按年龄段提问时的推荐机会和卖点准确性。',
    enabled: true,
    sourceProfileFields: ['targetCustomers', 'offerings', 'valueProps'],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'theme_demo_risk_expression',
    brandId: 'brand_demo',
    type: 'pain_point',
    name: '增高体能',
    businessExplanation: '验证身高、体能和感统等敏感需求下，AI 是否能审慎表达追光小牛的训练价值。',
    priority: 'high',
    estimatedValue: '提前发现保证长高、治疗感统等高风险表达。',
    enabled: true,
    sourceProfileFields: ['blockedExpressions', 'contentRules', 'proofPoints'],
    createdAt: now,
    updatedAt: now
  }
);

testQuestionCandidates.push(
  {
    id: 'candidate_demo_local_recommendation',
    brandId: 'brand_demo',
    themeId: 'theme_demo_local_recommendation',
    promptId: 'prompt_demo_comparison',
    question: '贵阳有哪些值得推荐的儿童运动成长机构？',
    purposes: ['brand_mentioned', 'rank_first', 'competitor_presence'],
    targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
    priority: 'high',
    estimatedValue: '验证贵阳儿童运动本地推荐场景中追光小牛是否出现并排名靠前。',
    editable: true,
    selected: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'candidate_demo_age_group',
    brandId: 'brand_demo',
    themeId: 'theme_demo_age_group',
    promptId: 'prompt_demo_comparison',
    question: '贵阳哪里有适合 3-5 岁孩子的体能馆？',
    purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
    targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
    priority: 'high',
    estimatedValue: '验证低龄儿童体能启蒙需求下追光小牛是否被推荐。',
    editable: true,
    selected: true,
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'candidate_demo_risk_expression',
    brandId: 'brand_demo',
    themeId: 'theme_demo_risk_expression',
    promptId: 'prompt_demo_comparison',
    question: '贵阳儿童增高体能课怎么选？哪些表达需要家长谨慎看待？',
    purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
    targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
    priority: 'high',
    estimatedValue: '验证增高体能敏感场景下的合规表达和品牌推荐情况。',
    editable: true,
    selected: true,
    createdAt: now,
    updatedAt: now
  }
);

testPlans.push({
  id: 'test_plan_demo_supercalf_first_round',
  brandId: 'brand_demo',
  name: '追光小牛首轮 AI 回复监测计划',
  status: 'needs_confirmation',
  questions: [
    {
      candidateId: 'candidate_demo_local_recommendation',
      promptId: 'prompt_demo_comparison',
      question: '贵阳有哪些值得推荐的儿童运动成长机构？',
      purposes: ['brand_mentioned', 'rank_first', 'competitor_presence'],
      targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']
    },
    {
      candidateId: 'candidate_demo_age_group',
      promptId: 'prompt_demo_comparison',
      question: '贵阳哪里有适合 3-5 岁孩子的体能馆？',
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']
    },
    {
      candidateId: 'candidate_demo_risk_expression',
      promptId: 'prompt_demo_comparison',
      question: '贵阳儿童增高体能课怎么选？哪些表达需要家长谨慎看待？',
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
      targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']
    }
  ],
  platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
  connectionSummary: buildConnectionSummary('brand_demo', ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']),
  executionMethod: 'browser',
  estimatedDurationMinutes: 48,
  confirmationItems: ['豆包 需要确认浏览器登录或切换手动录入', 'Kimi 需要确认浏览器登录或切换手动录入', 'DeepSeek 需要确认浏览器登录或切换手动录入', '通义千问 需要确认浏览器登录或切换手动录入'],
  monitoringRunIds: [],
  createdBy: 'user_demo',
  createdAt: now,
  updatedAt: now
});

contentAssets.push({
  id: 'asset_demo_homepage',
  brandId: 'brand_demo',
  title: '追光小牛品牌核心档案',
  type: 'website',
  platform: 'website',
  url: 'https://example.com/supercalf-brand-profile',
  targetKeywords: ['追光小牛', 'ACE 成长体系', '贵阳儿童运动'],
  status: 'published',
  publishedAt: now,
  createdAt: now,
  updatedAt: now
});

contentStrategies.push({
  id: 'strategy_demo_gap',
  brandId: 'brand_demo',
  optimizationUnitId: 'unit_demo_core',
  intentId: 'intent_demo_buying',
  type: 'gap',
  priority: 'high',
  suggestedTitle: '补齐贵阳儿童运动成长机构推荐内容',
  targetPlatform: 'website',
  targetKeywords: ['贵阳儿童运动成长机构', '儿童体适能推荐', '追光小牛 ACE 成长体系'],
  relatedPromptIds: ['prompt_demo_comparison'],
  status: 'task_created',
  createdAt: now,
  updatedAt: now
});

monitoringRuns.push({
  id: 'run_demo_weekly_mock',
  brandId: 'brand_demo',
  optimizationUnitId: 'unit_demo_core',
  intentId: 'intent_demo_buying',
  promptId: 'prompt_demo_comparison',
  platformCode: 'mock_ai',
  status: 'completed',
  startedAt: now,
  completedAt: now,
  retryStatus: 'not_retried',
  createdAt: now
});

aiResponses.push({
  id: 'response_demo_weekly_mock',
  runId: 'run_demo_weekly_mock',
  brandId: 'brand_demo',
  rawText: '贵阳家长选择儿童运动成长机构时，可以关注课程体系、师资安全、体测反馈和孩子长期兴趣。追光小牛适合 2-14 岁儿童家庭，优势包括 ACE 成长体系、快乐体操、少儿跑酷、体能训练、5 家贵阳校区、2000+ 家庭服务经验和世界冠军师资背书。',
  citations: ['https://example.com/supercalf-brand-profile'],
  modelName: 'mock-v1',
  respondedAt: now,
  parseStatus: 'parsed',
  createdAt: now
});

analysisResults.push({
  id: 'analysis_demo_weekly_mock',
  responseId: 'response_demo_weekly_mock',
  runId: 'run_demo_weekly_mock',
  brandId: 'brand_demo',
  brandMentioned: true,
  brandRank: 1,
  sentiment: 'positive',
  accuracyScore: 82,
  citationScore: 74,
  platformEvaluation: '追光小牛在贵阳儿童运动成长推荐场景中具备明确定位和本地化证据。',
  recommendationReason: '回答覆盖 ACE 成长体系、课程矩阵、校区规模、服务家庭数和师资背书。',
  rankingReason: '品牌在示例回答中位于首个具体推荐主体。',
  expressionCompleteness: '核心定位、适龄人群、课程体系和家长决策要点表达完整。',
  expressionDeviation: '需要避免把感统改善、增高和中考达标表达成确定性承诺。',
  competitorMentions: [{ name: '普通儿童运动机构', rank: 2, sentiment: 'neutral' }],
  reviewRequired: false,
  updatedAt: now
});

competitors.push({
  id: 'competitor_demo_legacy_seo',
  brandId: 'brand_demo',
  name: '普通儿童运动机构',
  aliases: ['普通体适能机构', '少儿运动培训机构'],
  website: '',
  industryTags: ['儿童运动', '体适能'],
  comparisonNote: '用于对比普通儿童运动机构与追光小牛 ACE 成长体系、数据化体测、家校服务和师资背书的差异。',
  suppressionRule: { consecutiveThreshold: 2 },
  createdAt: now,
  updatedAt: now
});

citationSources.push({
  id: 'citation_demo_homepage',
  brandId: 'brand_demo',
  responseId: 'response_demo_weekly_mock',
  runId: 'run_demo_weekly_mock',
  promptId: 'prompt_demo_comparison',
  promptText: '贵阳有哪些适合 2-14 岁孩子的儿童运动成长机构？请说明追光小牛的适用场景、课程优势和家长决策要点。',
  platformCode: 'mock_ai',
  contentAssetId: 'asset_demo_homepage',
  title: '追光小牛品牌核心档案',
  url: 'https://example.com/supercalf-brand-profile',
  sourceType: 'official_site',
  authorityLevel: 'medium',
  citationCount: 2,
  citedAt: now,
  createdAt: now
});

evaluationIssues.push({
  id: 'issue_demo_enterprise_proof',
  brandId: 'brand_demo',
  responseId: 'response_demo_weekly_mock',
  runId: 'run_demo_weekly_mock',
  promptId: 'prompt_demo_comparison',
  promptText: '贵阳有哪些适合 2-14 岁孩子的儿童运动成长机构？请说明追光小牛的适用场景、课程优势和家长决策要点。',
  platformCode: 'mock_ai',
  issueType: 'missing_selling_point',
  rawFragment: '需要避免把感统改善、增高和中考达标表达成确定性承诺',
  suggestedExpression: '使用“促进、改善、助力、阶段性提升”等审慎表达，并引用训练周期、体测报告和真实案例。',
  severity: 'medium',
  status: 'open',
  createdAt: now,
  updatedAt: now
});

growthOptimizationPlans.push({
  id: 'growth_plan_demo_supercalf',
  brandId: 'brand_demo',
  sourceTestPlanId: 'test_plan_demo_supercalf_first_round',
  strategyId: 'strategy_demo_gap',
  sourceRunIds: ['run_demo_weekly_mock'],
  summary: '首轮监测显示追光小牛在贵阳儿童运动成长推荐场景已经有基础可见度，但真实平台样本、校区案例、课程 FAQ 和风险表达仍需要补齐，优先通过内容补强、平台发布和再次监测提升推荐稳定性。',
  reasons: [
    {
      type: 'content_gap',
      title: '可引用内容不足',
      evidence: 'AI 回答能提到 ACE 成长体系，但缺少官网 FAQ、校区详情、课程案例和家长决策说明等可引用内容。',
      relatedRunIds: ['run_demo_weekly_mock'],
      relatedPromptIds: ['prompt_demo_comparison']
    },
    {
      type: 'value_prop_missing',
      title: '核心卖点需要更完整表达',
      evidence: '回答覆盖课程体系和师资背书，但对五周期训练规划、数据化体测报告和家校服务表达不足。',
      relatedRunIds: ['run_demo_weekly_mock'],
      relatedPromptIds: ['prompt_demo_comparison']
    },
    {
      type: 'risk_expression',
      title: '敏感效果表达需要统一口径',
      evidence: '增高体能、感统发展和中考达标相关问题需要避免保证长高、治疗感统失调和包过中考体育等高风险承诺。',
      relatedRunIds: ['run_demo_weekly_mock'],
      relatedPromptIds: ['prompt_demo_comparison']
    },
    {
      type: 'citation_gap',
      title: '平台可引用资料需要增加',
      evidence: '当前演示引用主要集中在品牌核心档案，需要把公众号、小红书、官网 FAQ 和短视频脚本形成可复用内容资产。',
      relatedRunIds: ['run_demo_weekly_mock'],
      relatedPromptIds: ['prompt_demo_comparison']
    }
  ],
  priority: 'high',
  ownerId: 'user_demo',
  dueDate: '2026-07-20T00:00:00.000Z',
  publishingPlatforms: ['wechat_official', 'xiaohongshu', 'official_site', 'douyin'],
  retestAt: '2026-07-27T00:00:00.000Z',
  contentRecommendations: [
    { contentType: 'wechat_article', title: '公众号推文：贵阳家长如何选择儿童运动成长课', targetPlatform: 'wechat_official', targetKeywords: ['贵阳儿童运动成长机构', '追光小牛 ACE 成长体系'], reason: '用长文讲清课程体系、校区规模、冠军师资和家长决策要点。', sourceStrategyId: 'strategy_demo_gap', generationTaskId: 'generation_demo_gap' },
    { contentType: 'xiaohongshu_note', title: '小红书图文：3-5 岁孩子体能启蒙怎么选', targetPlatform: 'xiaohongshu', targetKeywords: ['贵阳儿童体能', '3-5 岁体能启蒙'], reason: '用图文场景补齐低龄儿童体能启蒙的家长搜索入口。', sourceStrategyId: 'strategy_demo_gap' },
    { contentType: 'website_faq', title: '官网 FAQ：ACE 成长体系和增高体能审慎说明', targetPlatform: 'official_site', targetKeywords: ['ACE 成长体系', '增高体能', '感统发展'], reason: '提供 AI 可引用的标准答案，并统一敏感效果表达边界。', sourceStrategyId: 'strategy_demo_gap' },
    { contentType: 'short_video_script', title: '短视频脚本：快乐体操和少儿跑酷一日体验', targetPlatform: 'douyin', targetKeywords: ['快乐体操', '少儿跑酷', '贵阳儿童运动'], reason: '把课程体验转成更容易被平台内容理解的短视频素材。', sourceStrategyId: 'strategy_demo_gap' },
    { contentType: 'platform_profile_copy', title: '平台介绍文案：追光小牛标准品牌介绍', targetPlatform: 'ai_platform_profile', targetKeywords: ['追光小牛', '运动成长课是儿童必修课'], reason: '统一各平台品牌资料页和 AI 可读取介绍口径。', sourceStrategyId: 'strategy_demo_gap' },
    { contentType: 'image_creative_brief', title: '图片创意需求：ACE 成长体系信息图', targetPlatform: 'xiaohongshu', targetKeywords: ['ACE 成长体系', '儿童运动成长'], reason: '用图片信息图降低家长理解成本，强化 AI 对核心体系的识别。', sourceStrategyId: 'strategy_demo_gap' }
  ],
  taskIds: ['task_demo_content_gap', 'task_demo_growth_publish', 'task_demo_growth_profile', 'task_demo_growth_retest', 'task_demo_growth_owner'],
  status: 'in_progress',
  createdAt: now,
  updatedAt: now
});

contentGenerationTasks.push({
  id: 'generation_demo_gap',
  brandId: 'brand_demo',
  strategyId: 'strategy_demo_gap',
  growthOptimizationPlanId: 'growth_plan_demo_supercalf',
  targetPlatform: 'wechat_official',
  contentType: 'wechat_article',
  contentTopic: '公众号推文：贵阳家长如何选择儿童运动成长课',
  targetKeywords: ['贵阳儿童运动成长机构', '儿童体适能推荐', '追光小牛 ACE 成长体系'],
  referenceSources: ['优化计划：可引用内容不足', '追光小牛品牌档案', '首轮 AI 回复监测样例'],
  retestAt: '2026-07-27T00:00:00.000Z',
  status: 'completed',
  steps: [
    { key: 'strategy_parse', label: '读取内容建议', status: 'completed', completedAt: now },
    { key: 'knowledge_read', label: '读取品牌知识', status: 'completed', completedAt: now },
    { key: 'outline_generation', label: '生成大纲', status: 'completed', completedAt: now },
    { key: 'body_generation', label: '生成正文', status: 'completed', completedAt: now },
    { key: 'geo_rule_check', label: 'AI 推荐表达检查', status: 'completed', completedAt: now }
  ],
  draftRef: 'version_demo_gap_v1',
  createdAt: now,
  updatedAt: now
});

contentVersions.push({
  id: 'version_demo_gap_v1',
  brandId: 'brand_demo',
  generationTaskId: 'generation_demo_gap',
  title: '贵阳家长如何选择儿童运动成长课',
  body: '追光小牛围绕 ACE 成长体系，帮助 2-14 岁儿童家庭从体质、专注力、感统、社交和长期运动兴趣等维度判断课程价值。',
  version: 1,
  exportFormat: 'markdown',
  createdAt: now,
  updatedAt: now
});

contentExportRecords.push({
  id: 'export_demo_gap_markdown',
  brandId: 'brand_demo',
  generationTaskId: 'generation_demo_gap',
  versionId: 'version_demo_gap_v1',
  exportFormat: 'markdown',
  fileName: 'supercalf-ai-test-gap.md',
  content: '# 贵阳家长如何选择儿童运动成长机构\n\n追光小牛内测内容草稿，用于验证 AI 平台是否准确理解品牌定位、ACE 体系、课程矩阵和真实背书。',
  createdBy: 'user_demo',
  createdAt: now
});

publishingAccounts.push({
  id: 'publishing_account_demo_wechat',
  brandId: 'brand_demo',
  platform: 'wechat_official',
  accountName: '追光小牛公众号',
  loginMode: 'manual',
  authStatus: 'connected',
  lastAuthorizedAt: now,
  createdAt: now,
  updatedAt: now
});

publishingAccounts.push({
  id: 'publishing_account_demo_website',
  brandId: 'brand_demo',
  platform: 'website',
  accountName: '追光小牛官网内容位',
  loginMode: 'manual',
  authStatus: 'connected',
  lastAuthorizedAt: now,
  createdAt: now,
  updatedAt: now
});

publishingRecords.push({
  id: 'publishing_record_demo_gap',
  brandId: 'brand_demo',
  contentAssetId: 'asset_demo_homepage',
  accountId: 'publishing_account_demo_wechat',
  generationTaskId: 'generation_demo_gap',
  versionId: 'version_demo_gap_v1',
  title: '贵阳家长如何选择儿童运动成长课',
  body: '# 贵阳家长如何选择儿童运动成长机构\n\n追光小牛内测内容草稿，用于验证 AI 平台是否准确理解品牌定位、ACE 体系、课程矩阵和真实背书。',
  platform: 'wechat_official',
  accountName: '追光小牛公众号',
  status: 'draft',
  createdAt: now,
  updatedAt: now
});

optimizationTasks.push({
  id: 'task_demo_content_gap',
  brandId: 'brand_demo',
  title: '补齐贵阳儿童运动成长推荐内容',
  type: 'content_strategy',
  status: 'doing',
  ownerId: 'user_demo',
  optimizationUnitId: 'unit_demo_core',
  relatedPromptId: 'prompt_demo_comparison',
  relatedPlatformCode: 'mock_ai',
  strategyId: 'strategy_demo_gap',
  growthOptimizationPlanId: 'growth_plan_demo_supercalf',
  sourceRunId: 'run_demo_weekly_mock',
  dueDate: '2026-07-20T00:00:00.000Z',
  priority: 'high',
  contentLink: 'draft://brand_demo/generation_demo_gap/version_demo_gap_v1',
  retestRecords: [],
  createdAt: now,
  updatedAt: now
});

optimizationTasks.push(
  {
    id: 'task_demo_growth_publish',
    brandId: 'brand_demo',
    title: '发布优化内容到公众号、小红书、官网和短视频平台',
    type: 'content_strategy',
    status: 'todo',
    ownerId: 'user_demo',
    optimizationUnitId: 'unit_demo_core',
    relatedPromptId: 'prompt_demo_comparison',
    relatedPlatformCode: 'wechat_official',
    strategyId: 'strategy_demo_gap',
    growthOptimizationPlanId: 'growth_plan_demo_supercalf',
    sourceRunId: 'run_demo_weekly_mock',
    dueDate: '2026-07-22T00:00:00.000Z',
    priority: 'high',
    reviewStatus: 'pending',
    retestRecords: [],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'task_demo_growth_profile',
    brandId: 'brand_demo',
    title: '补充校区案例、课程 FAQ 和审慎表达资料',
    type: 'manual',
    status: 'todo',
    ownerId: 'user_demo',
    optimizationUnitId: 'unit_demo_core',
    relatedPromptId: 'prompt_demo_comparison',
    growthOptimizationPlanId: 'growth_plan_demo_supercalf',
    sourceRunId: 'run_demo_weekly_mock',
    dueDate: '2026-07-18T00:00:00.000Z',
    priority: 'high',
    reviewStatus: 'pending',
    retestRecords: [],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'task_demo_growth_retest',
    brandId: 'brand_demo',
    title: '按原监测问题安排 7 月 27 日复测',
    type: 'monitoring_issue',
    status: 'retest',
    ownerId: 'user_demo',
    optimizationUnitId: 'unit_demo_core',
    relatedPromptId: 'prompt_demo_comparison',
    relatedPlatformCode: 'doubao',
    growthOptimizationPlanId: 'growth_plan_demo_supercalf',
    sourceRunId: 'run_demo_weekly_mock',
    dueDate: '2026-07-27T00:00:00.000Z',
    priority: 'high',
    reviewStatus: 'approved',
    retestPlanAt: '2026-07-27T00:00:00.000Z',
    retestRecords: [{ id: 'retest_demo_growth_plan', taskId: 'task_demo_growth_retest', sourceRunId: 'run_demo_weekly_mock', retestRunId: '', plannedAt: '2026-07-27T00:00:00.000Z', targetScore: 85, createdAt: now, updatedAt: now }],
    createdAt: now,
    updatedAt: now
  },
  {
    id: 'task_demo_growth_owner',
    brandId: 'brand_demo',
    title: '跟进优化计划负责人和完成状态',
    type: 'manual',
    status: 'todo',
    ownerId: 'user_demo',
    growthOptimizationPlanId: 'growth_plan_demo_supercalf',
    dueDate: '2026-07-20T00:00:00.000Z',
    priority: 'medium',
    reviewStatus: 'pending',
    retestRecords: [],
    createdAt: now,
    updatedAt: now
  }
);

reports.push({
  id: 'report_demo_customer_delivery',
  brandId: 'brand_demo',
  type: 'customer_delivery',
  title: '追光小牛 AI 推荐内测交付报告',
  periodStart: '2026-07-01',
  periodEnd: '2026-07-07',
  status: 'generated',
  content: '# 追光小牛 AI 推荐内测交付报告\n\n追光小牛在内测样本中完成贵阳儿童运动成长推荐场景监测、内容生成、发布记录和再次监测准备。',
  dataGaps: [
    { section: '平台覆盖', reason: '当前样本需要继续补充真实平台回复。' },
    { section: '证明材料', reason: '真实案例、校区资料和课程详情需要客户确认后发布。' }
  ],
  createdBy: 'user_demo',
  createdAt: now,
  snapshot: {
    brand: { brandId: 'brand_demo', name: '追光小牛', industry: '儿童运动成长', status: 'active' },
    metrics: {
      brandId: 'brand_demo',
      current: {
        id: 'metric_demo_current',
        brandId: 'brand_demo',
        period: '2026-W27',
        platformCode: 'mock_ai',
        optimizationUnitId: 'unit_demo_core',
        intentId: 'intent_demo_buying',
        category: 'category_recommendation',
        mentionScore: 88,
        rankingScore: 84,
        accuracyScore: 82,
        sentimentScore: 78,
        citationScore: 74,
        competitorScore: 68,
        knowledgeCompletenessScore: 86,
        totalScore: 80,
        sampleCount: 12,
        insufficientSample: false,
        calculatedAt: now
      },
      trend: [],
      breakdown: { platform: [], optimizationUnit: [], intent: [] }
    },
    competitor: { mentionRate: 1, suppressionRate: 0, averageRankGap: 1, highRiskIntents: [] },
    citation: { totalCitations: 2, officialCitationRate: 1, authoritySourceRate: 0, contentCitationRate: 1 },
    evaluation: { positiveRate: 1, neutralRate: 0, negativeRate: 0, accurateRate: 1 },
    content: { keywordCoverageRate: 0.5, uncoveredKeywords: ['贵阳校区详情', 'ACE 课程案例'], publishedAssetCount: 1, reusableAssetCount: 1 },
    taskProgress: { todo: 0, doing: 1, review: 0, retest: 0, done: 0, reopened: 0 }
  }
});

advisorRecords.push({
  id: 'advisor_demo_review',
  brandId: 'brand_demo',
  type: 'review',
  title: '追光小牛内测复盘',
  content: '## 服务摘要\n- 已完成追光小牛品牌档案入库、首轮 AI 回复监测样本、内容生成和发布记录演示。\n\n## 下一步\n- 补充真实平台密钥，扩大豆包、Kimi、DeepSeek、通义千问和阶跃星辰的内测样本。',
  relatedReportId: 'report_demo_customer_delivery',
  followUpItems: [{ id: 'followup_demo_feedback', title: '收集客户反馈', owner: 'Demo Operator', dueDate: '2026-07-08', status: 'todo' }],
  createdBy: 'user_demo',
  createdAt: now
});

visibilitySprints.push({
  sprintId: 'visibility_sprint_demo_supercalf_first_round',
  brandId: 'brand_demo',
  title: '追光小牛首轮 AI 可见性运营 Sprint',
  goal: '围绕贵阳儿童运动成长推荐场景，完成真实回复监测、内容缺口诊断、内容补强和复测准备。',
  status: 'running',
  currentStep: 'content_asset_generation',
  steps: createDefaultVisibilitySprintSteps('content_asset_generation'),
  metricSummary: {
    ...createEmptyVisibilitySprintMetricSummary(),
    questionCoverageRate: 0.75,
    mentionRate: 0.88,
    recommendationRate: 0.72,
    firstRecommendationRate: 0.42,
    topThreeRate: 0.78,
    citationHitRate: 0.5,
    expressionAccuracyRate: 0.82,
    riskExpressionCount: 1,
    contentGapCount: 2,
    competitorSuppressionCount: 1,
    sampleSize: 12,
    updatedAt: now
  },
  relatedQuestionIds: ['candidate_demo_local_recommendation', 'candidate_demo_age_group', 'candidate_demo_risk_expression'],
  relatedTestPlanIds: ['test_plan_demo_supercalf_first_round'],
  relatedMonitoringRunIds: ['run_demo_weekly_mock'],
  relatedStandardAnswerIds: ['standard_answer_demo_local_recommendation'],
  relatedContentTaskIds: ['generation_demo_gap'],
  relatedPublishingRecordIds: ['publishing_record_demo_gap'],
  relatedRetestTaskIds: ['task_demo_growth_retest'],
  createdBy: 'user_demo',
  createdAt: now,
  updatedAt: now
});

brandStandardAnswers.push({
  answerId: 'standard_answer_demo_local_recommendation',
  brandId: 'brand_demo',
  questionId: 'candidate_demo_local_recommendation',
  question: '贵阳儿童运动训练机构推荐哪家？',
  answer: '在贵阳选择儿童运动训练机构时，可以重点看课程体系是否覆盖运动能力、认知能力和参与度，教练是否具备儿童教学经验，校区是否方便长期上课。追光小牛适合 2-14 岁儿童，围绕 Athleticism 运动能力、Cognition 认知能力和 Engagement 参与度建立 ACE 课程体系，在贵阳有 5 家校区，并以“运动成长课是儿童必修课”为核心主张，适合希望系统提升体能、协调、专注和运动兴趣的家庭。',
  keyPoints: ['2-14 岁儿童', '贵阳 5 家校区', 'ACE 课程体系', '运动成长课是儿童必修课'],
  evidence: [
    {
      label: '品牌核心定位',
      sourceType: 'brand_profile',
      sourceId: 'brand_demo',
      excerpt: '追光小牛是贵州本土最大规模儿童运动连锁品牌，服务 2-14 岁儿童。'
    }
  ],
  status: 'approved',
  reviewedBy: 'user_demo',
  reviewedAt: now,
  createdBy: 'user_demo',
  createdAt: now,
  updatedAt: now
});

@Injectable()
export class PermissionsRepository implements PermissionsRepositoryPort {
  private readonly deniedAccessLogs: DeniedAccessLog[] = [];

  findUser(userId: string): UserSummary | null {
    return users.find((user) => user.userId === userId) ?? null;
  }

  listOrganizationMemberships(userId: string): OrganizationMember[] {
    return organizationMembers.filter((member) => member.userId === userId && member.organization.status === 'active');
  }

  listAccessibleBrands(userId: string): AccessibleBrand[] {
    const user = this.findUser(userId);

    if (!user || user.status !== 'active' || !this.hasActiveOrganizationMembership(userId)) {
      return [];
    }

    return permissions
      .filter((permission) => permission.userId === userId)
      .map<AccessibleBrand | null>((permission) => {
        const brand = brands.find((item) => item.brandId === permission.brandId);

        if (!brand || brand.status === 'archived') {
          return null;
        }

        return {
          brandId: brand.brandId,
          name: brand.name,
          status: brand.status,
          role: permission.role
        };
      })
      .filter((brand): brand is AccessibleBrand => Boolean(brand));
  }

  listAccessibleBrandDetails(userId: string): BrandDetail[] {
    const accessibleIds = new Set(this.listAccessibleBrands(userId).map((brand) => brand.brandId));

    return brands.filter((brand) => accessibleIds.has(brand.brandId) && brand.status !== 'archived');
  }

  findAccessibleBrand(userId: string, brandId: string): AccessibleBrand | null {
    return this.listAccessibleBrands(userId).find((brand) => brand.brandId === brandId) ?? null;
  }

  findAccessibleBrandDetail(userId: string, brandId: string): BrandDetail | null {
    return this.listAccessibleBrandDetails(userId).find((brand) => brand.brandId === brandId) ?? null;
  }

  getBrandWorkspaceSnapshot(userId: string, brandId: string): BrandWorkspaceSnapshot | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);

    if (!brand) {
      return null;
    }

    return {
      brand,
      relatedCounts: {
        profile: profiles.has(brandId) ? 1 : 0,
        optimizationUnits: optimizationUnits.filter((unit) => unit.brandId === brandId).length,
        intents: userIntents.filter((intent) => intent.brandId === brandId).length,
        prompts: brandPrompts.filter((prompt) => prompt.brandId === brandId).length,
        competitors: competitors.filter((competitor) => competitor.brandId === brandId).length,
        contentAssets: contentAssets.filter((asset) => asset.brandId === brandId).length,
        monitoringRuns: monitoringRuns.filter((run) => run.brandId === brandId).length,
        reports: reports.filter((report) => report.brandId === brandId).length,
        advisorRecords: advisorRecords.filter((record) => record.brandId === brandId).length
      }
    };
  }

  createBrand(userId: string, input: BrandMutationInput, role: UserBrandRole = 'owner'): BrandDetail {
    const timestamp = new Date().toISOString();
    const brand: BrandDetail = {
      brandId: `brand_${Date.now()}`,
      name: input.name.trim(),
      status: input.status ?? 'active',
      aliases: input.aliases ?? [],
      industry: input.industry.trim(),
      website: input.website?.trim() || '',
      targetCities: input.targetCities ?? [],
      businessScope: input.businessScope.trim(),
      targetAudience: input.targetAudience.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    brands.push(brand);
    permissions.push({
      id: `permission_${brand.brandId}_${userId}`,
      userId,
      brandId: brand.brandId,
      role
    });
    seedDefaultPlatformConfigs(brand.brandId, timestamp);

    return brand;
  }

  updateBrand(userId: string, brandId: BrandId, input: Partial<BrandMutationInput>): BrandDetail | null {
    if (!this.canAccessBrand(userId, brandId)) {
      return null;
    }

    const brand = brands.find((item) => item.brandId === brandId);

    if (!brand) {
      return null;
    }

    if (input.name !== undefined) brand.name = input.name.trim();
    if (input.aliases !== undefined) brand.aliases = input.aliases;
    if (input.industry !== undefined) brand.industry = input.industry.trim();
    if (input.website !== undefined) brand.website = input.website.trim();
    if (input.targetCities !== undefined) brand.targetCities = input.targetCities;
    if (input.businessScope !== undefined) brand.businessScope = input.businessScope.trim();
    if (input.targetAudience !== undefined) brand.targetAudience = input.targetAudience.trim();
    if (input.status !== undefined) brand.status = input.status;
    brand.updatedAt = new Date().toISOString();

    return brand;
  }

  updateBrandStatus(userId: string, brandId: BrandId, status: BrandStatus): BrandDetail | null {
    return this.updateBrand(userId, brandId, { status });
  }

  getBrandProfile(userId: string, brandId: BrandId): BrandProfile | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);

    if (!brand) {
      return null;
    }

    return profiles.get(brandId) ?? createEmptyProfile(brandId);
  }

  saveBrandProfile(userId: string, brandId: BrandId, input: BrandProfileInput): BrandProfile | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);

    if (!brand) {
      return null;
    }

    const normalizedInput = normalizeProfileInput(input);
    const completeness = calculateBrandProfileCompleteness(brand, normalizedInput);
    const profile: BrandProfile = {
      brandId,
      ...normalizedInput,
      completenessScore: completeness.score,
      missingFields: completeness.missingFields,
      completenessPrompts: completeness.prompts,
      updatedAt: new Date().toISOString()
    };

    profiles.set(brandId, profile);

    return profile;
  }

  listKnowledgeSources(userId: string, brandId: BrandId): KnowledgeSource[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return knowledgeSources.filter((source) => source.brandId === brandId);
  }

  createKnowledgeSource(userId: string, brandId: BrandId, input: KnowledgeSourceInput): KnowledgeSource | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizeKnowledgeSourceInput(input);
    const timestamp = new Date().toISOString();
    const source: KnowledgeSource = {
      id: `knowledge_${Date.now()}`,
      brandId,
      ...normalized,
      status: normalized.status ?? 'pending',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    knowledgeSources.unshift(source);

    return source;
  }

  updateKnowledgeSourceStatus(
    userId: string,
    brandId: BrandId,
    sourceId: string,
    status: KnowledgeSource['status'],
    errorMessage?: string
  ): KnowledgeSource | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const source = knowledgeSources.find((item) => item.brandId === brandId && item.id === sourceId);
    if (!source) {
      return null;
    }

    source.status = status;
    source.errorMessage = errorMessage;
    source.updatedAt = new Date().toISOString();

    return source;
  }

  listOptimizationUnits(userId: string, brandId: BrandId): OptimizationUnit[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return optimizationUnits.filter((unit) => unit.brandId === brandId).map((unit) => this.withOptimizationUnitCounts(unit));
  }

  getOptimizationUnit(userId: string, brandId: BrandId, unitId: string): OptimizationUnit | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const unit = optimizationUnits.find((item) => item.brandId === brandId && item.id === unitId);

    return unit ? this.withOptimizationUnitCounts(unit) : null;
  }

  createOptimizationUnit(userId: string, brandId: BrandId, input: OptimizationUnitInput): OptimizationUnit | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizeOptimizationUnitInput(input);
    const timestamp = new Date().toISOString();
    const unit: OptimizationUnit = {
      id: `unit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      ...normalized,
      enabled: normalized.enabled ?? true,
      relatedCounts: createEmptyOptimizationUnitCounts(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    optimizationUnits.unshift(unit);

    return unit;
  }

  listTestThemes(userId: string, brandId: BrandId): TestTheme[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return testThemes.filter((theme) => theme.brandId === brandId);
  }

  createTestTheme(userId: string, brandId: BrandId, input: TestThemeInput): TestTheme | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizeTestThemeInput(input);
    const timestamp = new Date().toISOString();
    const theme: TestTheme = {
      id: `theme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      ...normalized,
      enabled: normalized.enabled ?? true,
      sourceProfileFields: normalized.sourceProfileFields ?? [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    testThemes.unshift(theme);

    return theme;
  }

  updateTestTheme(userId: string, brandId: BrandId, themeId: string, input: Partial<TestThemeInput>): TestTheme | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const theme = testThemes.find((item) => item.brandId === brandId && item.id === themeId);
    if (!theme) {
      return null;
    }

    const normalized = normalizePartialTestThemeInput(input);
    if (normalized.type !== undefined) theme.type = normalized.type;
    if (normalized.name !== undefined) theme.name = normalized.name;
    if (normalized.businessExplanation !== undefined) theme.businessExplanation = normalized.businessExplanation;
    if (normalized.priority !== undefined) theme.priority = normalized.priority;
    if (normalized.estimatedValue !== undefined) theme.estimatedValue = normalized.estimatedValue;
    if (normalized.enabled !== undefined) theme.enabled = normalized.enabled;
    if (normalized.sourceProfileFields !== undefined) theme.sourceProfileFields = normalized.sourceProfileFields;
    theme.updatedAt = new Date().toISOString();

    return theme;
  }

  listTestQuestionCandidates(userId: string, brandId: BrandId, query: TestQuestionCandidateListQuery = {}): TestQuestionCandidate[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return filterTestQuestionCandidates(testQuestionCandidates, brandId, query);
  }

  createTestQuestionCandidate(userId: string, brandId: BrandId, input: TestQuestionCandidateInput): TestQuestionCandidate | null {
    if (!this.findAccessibleBrandDetail(userId, brandId) || !testThemes.some((theme) => theme.brandId === brandId && theme.id === input.themeId)) {
      return null;
    }

    const normalized = normalizeTestQuestionCandidateInput(input);
    const timestamp = new Date().toISOString();
    const candidate: TestQuestionCandidate = {
      id: `candidate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      ...normalized,
      editable: normalized.editable ?? true,
      selected: normalized.selected ?? false,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    testQuestionCandidates.unshift(candidate);

    return candidate;
  }

  updateTestQuestionCandidate(userId: string, brandId: BrandId, candidateId: string, input: TestQuestionCandidateUpdateInput): TestQuestionCandidate | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const candidate = testQuestionCandidates.find((item) => item.brandId === brandId && item.id === candidateId);
    if (!candidate || !candidate.editable) {
      return null;
    }

    if (input.themeId !== undefined && !testThemes.some((theme) => theme.brandId === brandId && theme.id === input.themeId)) {
      return null;
    }

    const normalized = normalizePartialTestQuestionCandidateInput(input);
    if (normalized.themeId !== undefined) candidate.themeId = normalized.themeId;
    if (normalized.promptId !== undefined) candidate.promptId = normalized.promptId;
    if (normalized.question !== undefined) candidate.question = normalized.question;
    if (normalized.purposes !== undefined) candidate.purposes = normalized.purposes;
    if (normalized.targetPlatforms !== undefined) candidate.targetPlatforms = normalized.targetPlatforms;
    if (normalized.priority !== undefined) candidate.priority = normalized.priority;
    if (normalized.estimatedValue !== undefined) candidate.estimatedValue = normalized.estimatedValue;
    if (normalized.editable !== undefined) candidate.editable = normalized.editable;
    if (normalized.selected !== undefined) candidate.selected = normalized.selected;
    candidate.updatedAt = new Date().toISOString();

    return candidate;
  }

  updateTestQuestionCandidateSelection(userId: string, brandId: BrandId, input: TestQuestionCandidateSelectionInput): TestQuestionCandidate[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const candidateIds = new Set(input.candidateIds);
    const updated: TestQuestionCandidate[] = [];

    testQuestionCandidates.forEach((candidate) => {
      if (candidate.brandId !== brandId) return;
      if (input.themeId && candidate.themeId !== input.themeId) return;
      if (!candidateIds.has(candidate.id)) return;

      candidate.selected = input.selected;
      candidate.updatedAt = new Date().toISOString();
      updated.push(candidate);
    });

    return updated;
  }

  listTestPlans(userId: string, brandId: BrandId): TestPlan[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return testPlans.filter((plan) => plan.brandId === brandId).sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }

  createTestPlan(userId: string, brandId: BrandId, input: TestPlanInput): TestPlan | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const selectedCandidates = resolveTestPlanCandidates(brandId, input);
    const questions = input.questions?.length ? input.questions : selectedCandidates.map(toTestPlanQuestion);
    if (questions.length === 0) {
      return null;
    }

    const platformCodes = normalizeTestPlanPlatformCodes(input.platformCodes?.length ? input.platformCodes : questions.flatMap((question) => question.targetPlatforms));
    if (platformCodes.length === 0) {
      return null;
    }

    const connectionSummary = buildConnectionSummary(brandId, platformCodes);
    const confirmationItems = buildTestPlanConfirmationItems(connectionSummary);
    const timestamp = new Date().toISOString();
    const executionMethod = input.executionMethod ?? inferExecutionMethod(connectionSummary);
    const plan: TestPlan = {
      id: `test_plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
        name: input.name?.trim() || `${brand.name}首轮 AI 回复监测计划`,
      status: inferTestPlanStatus(connectionSummary),
      questions,
      platformCodes,
      connectionSummary,
      executionMethod,
      estimatedDurationMinutes: estimateTestPlanDuration(questions.length, platformCodes.length),
      confirmationItems,
      monitoringRunIds: [],
      createdBy: userId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    testPlans.unshift(plan);

    return plan;
  }

  executeTestPlan(userId: string, brandId: BrandId, planId: string): TestPlanExecutionResult | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const plan = testPlans.find((item) => item.brandId === brandId && item.id === planId);
    if (!plan) {
      return null;
    }

    const result = executeTestPlanSteps(plan, (question, platformCode) => {
      if (!question.promptId) return null;

      return this.createMonitoringRun(userId, brandId, { promptId: question.promptId, platformCode });
    }, (question, platformCode) => {
      return this.executeBrowserTestPlanStep(userId, brandId, plan.id, question, platformCode);
    }, (question, platformCode) => {
      return this.executeApiTestPlanStep(userId, brandId, plan.id, question, platformCode);
    });

    applyTestPlanExecutionResult(plan, result);

    return result;
  }

  listTestPlanTemplates(userId: string, brandId: BrandId): TestPlanTemplate[] | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    return recommendTestPlanTemplates(brand);
  }

  applyTestPlanTemplate(userId: string, brandId: BrandId, input: TestPlanTemplateApplicationInput): TestPlan | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const template = selectTestPlanTemplate(brand, input.templateId);
    if (!template) {
      return null;
    }

    return this.createTestPlan(userId, brandId, {
      name: input.name?.trim() || `${brand.name}${template.name}`,
      questions: buildTemplateQuestions(brand, template),
      platformCodes: template.platformCodes,
      executionMethod: 'browser'
    });
  }

  duplicateTestPlan(userId: string, brandId: BrandId, planId: string, input: TestPlanDuplicateInput = {}): TestPlan | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const source = testPlans.find((plan) => plan.brandId === brandId && plan.id === planId);
    if (!source) {
      return null;
    }

    return this.createTestPlan(userId, brandId, {
      name: input.name?.trim() || `${source.name}${input.retest ? '复测' : '副本'}`,
      questions: source.questions,
      platformCodes: source.platformCodes,
      executionMethod: source.executionMethod
    });
  }

  listUserIntents(userId: string, brandId: BrandId): UserIntent[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return userIntents.filter((intent) => intent.brandId === brandId).map((intent) => this.withIntentMetrics(intent));
  }

  createUserIntent(userId: string, brandId: BrandId, input: UserIntentInput): UserIntent | null {
    if (!this.findAccessibleBrandDetail(userId, brandId) || !this.findOptimizationUnitForBrand(brandId, input.optimizationUnitId)) {
      return null;
    }

    const normalized = normalizeUserIntentInput(input);
    const timestamp = new Date().toISOString();
    const intent: UserIntent = {
      id: `intent_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      ...normalized,
      enabled: normalized.enabled ?? true,
      platformMetrics: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    userIntents.unshift(intent);

    return this.withIntentMetrics(intent);
  }

  updateUserIntent(userId: string, brandId: BrandId, intentId: string, input: Partial<UserIntentInput>): UserIntent | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const intent = userIntents.find((item) => item.brandId === brandId && item.id === intentId);
    if (!intent) {
      return null;
    }

    if (input.optimizationUnitId !== undefined && !this.findOptimizationUnitForBrand(brandId, input.optimizationUnitId)) {
      return null;
    }

    const normalized = normalizePartialUserIntentInput(input);
    if (normalized.optimizationUnitId !== undefined) intent.optimizationUnitId = normalized.optimizationUnitId;
    if (normalized.category !== undefined) intent.category = normalized.category;
    if (normalized.text !== undefined) intent.text = normalized.text;
    if (normalized.monitoringFrequency !== undefined) intent.monitoringFrequency = normalized.monitoringFrequency;
    if (normalized.enabled !== undefined) intent.enabled = normalized.enabled;
    intent.updatedAt = new Date().toISOString();

    return this.withIntentMetrics(intent);
  }

  listPromptTemplates(): PromptTemplate[] {
    return promptTemplates;
  }

  createPromptTemplate(input: PromptTemplateInput): PromptTemplate {
    const normalized = normalizePromptTemplateInput(input);
    const timestamp = new Date().toISOString();
    const template: PromptTemplate = {
      id: `template_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      ...normalized,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    promptTemplates.unshift(template);

    return template;
  }

  listBrandPrompts(userId: string, brandId: BrandId): BrandPrompt[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return brandPrompts.filter((prompt) => prompt.brandId === brandId);
  }

  batchGenerateBrandPrompts(userId: string, brandId: BrandId, input: PromptBatchGenerateInput): BrandPrompt[] | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const template = promptTemplates.find((item) => item.id === input.templateId);
    if (!template) {
      return null;
    }

    const requestedIds = new Set(input.intentIds ?? []);
    const targetIntents = userIntents.filter((intent) => {
      return intent.brandId === brandId && intent.enabled && (requestedIds.size === 0 || requestedIds.has(intent.id));
    });

    const generated = targetIntents.map((intent) => this.createPromptFromTemplate(brand, intent, template));
    brandPrompts.unshift(...generated);

    return generated;
  }

  updateBrandPrompt(userId: string, brandId: BrandId, promptId: string, input: Partial<BrandPromptInput>): BrandPrompt | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const prompt = brandPrompts.find((item) => item.brandId === brandId && item.id === promptId);
    if (!prompt) {
      return null;
    }

    const normalized = normalizePartialBrandPromptInput(input);
    if (normalized.text !== undefined) prompt.text = normalized.text;
    if (normalized.targetKeywords !== undefined) prompt.targetKeywords = normalized.targetKeywords;
    if (normalized.platformCodes !== undefined) prompt.platformCodes = normalized.platformCodes;
    if (normalized.monitoringFrequency !== undefined) prompt.monitoringFrequency = normalized.monitoringFrequency;
    if (normalized.enabled !== undefined) prompt.enabled = normalized.enabled;
    prompt.updatedAt = new Date().toISOString();

    return prompt;
  }

  listPlatformConfigs(userId: string, brandId: BrandId): PlatformConfig[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return platformConfigs.filter((config) => config.brandId === brandId).map(toPublicPlatformConfig);
  }

  getPlatformRuntimeConfig(userId: string, brandId: BrandId, platformCode: string): AIPlatformRuntimeConfig | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const config = platformConfigs.find((item) => item.brandId === brandId && item.platformCode === platformCode && item.enabled);

    return config ? toRuntimePlatformConfig(config) : null;
  }

  getPlatformRuntimeConfigById(userId: string, brandId: BrandId, platformId: string): AIPlatformRuntimeConfig | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const config = platformConfigs.find((item) => item.brandId === brandId && item.id === platformId);

    return config ? toRuntimePlatformConfig(config) : null;
  }

  savePlatformValidationResult(userId: string, brandId: BrandId, platformId: string, result: PlatformValidationResult): PlatformValidationResult | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const config = platformConfigs.find((item) => item.brandId === brandId && item.id === platformId);
    if (!config) {
      return null;
    }

    config.lastValidation = result;
    config.updatedAt = result.checkedAt;

    return result;
  }

  createPlatformConfig(userId: string, brandId: BrandId, input: PlatformConfigInput): PlatformConfig | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizePlatformConfigInput(input);
    const exists = platformConfigs.some((config) => config.brandId === brandId && config.platformCode === normalized.platformCode);
    if (exists) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const config: StoredPlatformConfig = {
      id: `platform_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      platformCode: normalized.platformCode,
      name: normalized.name,
      mode: normalized.mode,
      endpointUrl: normalized.endpointUrl,
      modelName: normalized.modelName,
      rateLimitPerMinute: normalized.rateLimitPerMinute ?? defaultRateLimit(normalized.mode),
      enabled: normalized.enabled ?? true,
      credentialRef: normalized.credentialRef,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    platformConfigs.unshift(config);

    return toPublicPlatformConfig(config);
  }

  updatePlatformConfig(userId: string, brandId: BrandId, platformId: string, input: Partial<PlatformConfigInput>): PlatformConfig | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const config = platformConfigs.find((item) => item.brandId === brandId && item.id === platformId);
    if (!config) {
      return null;
    }

    const normalized = normalizePartialPlatformConfigInput(input);
    if (normalized.platformCode !== undefined) config.platformCode = normalized.platformCode;
    if (normalized.name !== undefined) config.name = normalized.name;
    if (normalized.mode !== undefined) config.mode = normalized.mode;
    if (normalized.endpointUrl !== undefined) config.endpointUrl = normalized.endpointUrl;
    if (normalized.modelName !== undefined) config.modelName = normalized.modelName;
    if (normalized.rateLimitPerMinute !== undefined) config.rateLimitPerMinute = normalized.rateLimitPerMinute;
    if (normalized.credentialRef !== undefined) config.credentialRef = normalized.credentialRef;
    if (normalized.enabled !== undefined) config.enabled = normalized.enabled;
    config.updatedAt = new Date().toISOString();

    return toPublicPlatformConfig(config);
  }

  validatePlatformConfig(userId: string, brandId: BrandId, platformId: string): PlatformValidationResult | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const config = platformConfigs.find((item) => item.brandId === brandId && item.id === platformId);
    if (!config) {
      return null;
    }

    const result = validateStoredPlatformConfig(config);
    config.lastValidation = result;
    config.updatedAt = result.checkedAt;

    return result;
  }

  listBrowserConnectionSessions(userId: string, brandId: BrandId): BrowserConnectionSession[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return browserConnectionSessions.filter((session) => session.brandId === brandId);
  }

  startBrowserConnectionSession(userId: string, brandId: BrandId, input: BrowserConnectionStartInput): BrowserConnectionSession | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const session: BrowserConnectionSession = {
      id: `browser_session_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      platformCode: input.platformCode,
      status: 'opening',
      loginDetected: false,
      authorizedScope: buildBrowserAuthorizedScope(brandId, input.platformCode, input.testPlanId),
      lastOperation: 'open_login_page',
      lastMessage: '正在打开浏览器登录页。',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    browserConnectionSessions.unshift(session);

    return session;
  }

  updateBrowserConnectionSession(userId: string, brandId: BrandId, sessionId: string, input: BrowserConnectionStatusInput): BrowserConnectionSession | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const session = browserConnectionSessions.find((item) => item.brandId === brandId && item.id === sessionId);
    if (!session) {
      return null;
    }

    session.status = input.status;
    if (input.loginDetected !== undefined) session.loginDetected = input.loginDetected;
    if (input.lastOperation !== undefined) session.lastOperation = input.lastOperation;
    if (input.lastIssueType !== undefined) session.lastIssueType = input.lastIssueType;
    if (input.lastMessage !== undefined) session.lastMessage = input.lastMessage;
    if (input.lastAvailableAt !== undefined) session.lastAvailableAt = input.lastAvailableAt;
    session.updatedAt = new Date().toISOString();

    return session;
  }

  listAIPlatformCallAudits(userId: string, brandId: BrandId): AIPlatformCallAudit[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return aiPlatformCallAudits.filter((audit) => audit.brandId === brandId);
  }

  createAIPlatformCallAudit(userId: string, brandId: BrandId, input: AIPlatformCallAuditInput): AIPlatformCallAudit | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const audit: AIPlatformCallAudit = {
      id: `audit_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      platformCode: input.platformCode.trim(),
      modelName: input.modelName?.trim(),
      callType: input.callType,
      status: input.status ?? 'started',
      durationMs: input.durationMs,
      inputTokenCount: input.inputTokenCount,
      outputTokenCount: input.outputTokenCount,
      costEstimate: input.costEstimate,
      errorCode: input.errorCode?.trim(),
      errorMessage: input.errorMessage?.trim(),
      retryable: input.retryable,
      startedAt: input.startedAt ?? timestamp,
      completedAt: input.completedAt,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    aiPlatformCallAudits.unshift(audit);

    return audit;
  }

  updateAIPlatformCallAudit(userId: string, brandId: BrandId, auditId: string, input: AIPlatformCallAuditUpdateInput): AIPlatformCallAudit | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const audit = aiPlatformCallAudits.find((item) => item.brandId === brandId && item.id === auditId);
    if (!audit) {
      return null;
    }

    if (input.status !== undefined) audit.status = input.status;
    if (input.modelName !== undefined) audit.modelName = input.modelName.trim();
    if (input.durationMs !== undefined) audit.durationMs = input.durationMs;
    if (input.inputTokenCount !== undefined) audit.inputTokenCount = input.inputTokenCount;
    if (input.outputTokenCount !== undefined) audit.outputTokenCount = input.outputTokenCount;
    if (input.costEstimate !== undefined) audit.costEstimate = input.costEstimate;
    if (input.errorCode !== undefined) audit.errorCode = input.errorCode.trim();
    if (input.errorMessage !== undefined) audit.errorMessage = input.errorMessage.trim();
    if (input.retryable !== undefined) audit.retryable = input.retryable;
    if (input.completedAt !== undefined) audit.completedAt = input.completedAt;
    audit.updatedAt = new Date().toISOString();

    return audit;
  }

  listAsyncJobs(userId: string, brandId: BrandId, status?: AsyncJobStatus): AsyncJob[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return asyncJobs.filter((job) => job.brandId === brandId && (!status || job.status === status));
  }

  getAsyncJob(userId: string, brandId: BrandId, jobId: string): AsyncJob | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return asyncJobs.find((job) => job.brandId === brandId && job.id === jobId) ?? null;
  }

  createAsyncJob(userId: string, brandId: BrandId, input: AsyncJobInput): AsyncJob | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const job: AsyncJob = {
      id: `job_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      jobType: input.jobType,
      status: input.status ?? 'queued',
      entityId: input.entityId,
      attemptCount: input.attemptCount ?? 0,
      maxAttempts: input.maxAttempts ?? 3,
      nextRunAt: input.nextRunAt,
      lastErrorCode: input.lastErrorCode?.trim(),
      lastErrorMessage: input.lastErrorMessage?.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    asyncJobs.unshift(job);

    return job;
  }

  updateAsyncJob(userId: string, brandId: BrandId, jobId: string, input: AsyncJobUpdateInput): AsyncJob | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const job = asyncJobs.find((item) => item.brandId === brandId && item.id === jobId);
    if (!job) {
      return null;
    }

    if (input.status !== undefined) job.status = input.status;
    if (input.attemptCount !== undefined) job.attemptCount = input.attemptCount;
    if (input.maxAttempts !== undefined) job.maxAttempts = input.maxAttempts;
    if (input.nextRunAt !== undefined) job.nextRunAt = input.nextRunAt;
    if (input.lastErrorCode !== undefined) job.lastErrorCode = input.lastErrorCode.trim();
    if (input.lastErrorMessage !== undefined) job.lastErrorMessage = input.lastErrorMessage.trim();
    job.updatedAt = new Date().toISOString();

    return job;
  }

  listLLMTaskRuns(userId: string, brandId: BrandId): LLMTaskRun[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return llmTaskRuns.filter((run) => run.brandId === brandId);
  }

  createLLMTaskRun(userId: string, brandId: BrandId, input: LLMTaskRunInput): LLMTaskRun | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const run: LLMTaskRun = {
      id: `llm_run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      taskType: input.taskType,
      status: input.status,
      jobId: input.jobId,
      auditId: input.auditId,
      inputSummary: input.inputSummary ?? {},
      outputSummary: input.outputSummary,
      errorCode: input.errorCode?.trim(),
      errorMessage: input.errorMessage?.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    llmTaskRuns.unshift(run);

    return run;
  }

  listVisibilitySprints(userId: string, brandId: BrandId): VisibilitySprint[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return visibilitySprints.filter((sprint) => sprint.brandId === brandId);
  }

  getVisibilitySprint(userId: string, brandId: BrandId, sprintId: string): VisibilitySprint | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return visibilitySprints.find((sprint) => sprint.brandId === brandId && sprint.sprintId === sprintId) ?? null;
  }

  getCurrentVisibilitySprint(userId: string, brandId: BrandId): VisibilitySprint | null {
    const sprints = this.listVisibilitySprints(userId, brandId);
    if (!sprints) {
      return null;
    }

    return sprints.find((sprint) => ['running', 'waiting_confirmation', 'draft'].includes(sprint.status)) ?? sprints[0] ?? null;
  }

  createVisibilitySprint(userId: string, brandId: BrandId, input: VisibilitySprintCreateInput): VisibilitySprint | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const currentStep = input.currentStep ?? 'question_radar';
    const sprint: VisibilitySprint = {
      sprintId: `visibility_sprint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      title: input.title.trim(),
      goal: input.goal.trim(),
      status: input.status ?? 'draft',
      currentStep,
      steps: input.steps ?? createDefaultVisibilitySprintSteps(currentStep),
      metricSummary: {
        ...createEmptyVisibilitySprintMetricSummary(),
        ...input.metricSummary,
        updatedAt: timestamp
      },
      relatedQuestionIds: [...(input.relatedQuestionIds ?? [])],
      relatedTestPlanIds: [...(input.relatedTestPlanIds ?? [])],
      relatedMonitoringRunIds: [...(input.relatedMonitoringRunIds ?? [])],
      relatedStandardAnswerIds: [...(input.relatedStandardAnswerIds ?? [])],
      relatedContentTaskIds: [...(input.relatedContentTaskIds ?? [])],
      relatedPublishingRecordIds: [...(input.relatedPublishingRecordIds ?? [])],
      relatedRetestTaskIds: [...(input.relatedRetestTaskIds ?? [])],
      createdBy: userId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    visibilitySprints.unshift(sprint);

    return sprint;
  }

  updateVisibilitySprintStep(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintStepUpdateInput): VisibilitySprint | null {
    const sprint = this.getVisibilitySprint(userId, brandId, sprintId);
    if (!sprint) {
      return null;
    }

    sprint.status = input.status ?? sprint.status;
    sprint.currentStep = input.currentStep;
    sprint.steps = input.steps ?? createDefaultVisibilitySprintSteps(input.currentStep);
    sprint.updatedAt = new Date().toISOString();

    return sprint;
  }

  updateVisibilitySprintMetrics(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintMetricUpdateInput): VisibilitySprint | null {
    const sprint = this.getVisibilitySprint(userId, brandId, sprintId);
    if (!sprint) {
      return null;
    }

    sprint.metricSummary = {
      ...sprint.metricSummary,
      ...input,
      updatedAt: new Date().toISOString()
    };
    sprint.updatedAt = sprint.metricSummary.updatedAt ?? sprint.updatedAt;

    return sprint;
  }

  updateVisibilitySprintRelations(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintRelationsUpdateInput): VisibilitySprint | null {
    const sprint = this.getVisibilitySprint(userId, brandId, sprintId);
    if (!sprint) {
      return null;
    }

    if (input.relatedQuestionIds !== undefined) sprint.relatedQuestionIds = [...input.relatedQuestionIds];
    if (input.relatedTestPlanIds !== undefined) sprint.relatedTestPlanIds = [...input.relatedTestPlanIds];
    if (input.relatedMonitoringRunIds !== undefined) sprint.relatedMonitoringRunIds = [...input.relatedMonitoringRunIds];
    if (input.relatedStandardAnswerIds !== undefined) sprint.relatedStandardAnswerIds = [...input.relatedStandardAnswerIds];
    if (input.relatedContentTaskIds !== undefined) sprint.relatedContentTaskIds = [...input.relatedContentTaskIds];
    if (input.relatedPublishingRecordIds !== undefined) sprint.relatedPublishingRecordIds = [...input.relatedPublishingRecordIds];
    if (input.relatedRetestTaskIds !== undefined) sprint.relatedRetestTaskIds = [...input.relatedRetestTaskIds];
    sprint.updatedAt = new Date().toISOString();

    return sprint;
  }

  listBrandStandardAnswers(userId: string, brandId: BrandId, questionId?: string): BrandStandardAnswer[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return brandStandardAnswers.filter((answer) => answer.brandId === brandId && (!questionId || answer.questionId === questionId));
  }

  getBrandStandardAnswer(userId: string, brandId: BrandId, answerId: string): BrandStandardAnswer | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return brandStandardAnswers.find((answer) => answer.brandId === brandId && answer.answerId === answerId) ?? null;
  }

  createBrandStandardAnswer(userId: string, brandId: BrandId, input: BrandStandardAnswerInput): BrandStandardAnswer | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const answer: BrandStandardAnswer = {
      answerId: `standard_answer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      questionId: input.questionId.trim(),
      question: input.question.trim(),
      answer: input.answer.trim(),
      keyPoints: cleanStringList(input.keyPoints),
      evidence: cleanStandardAnswerEvidence(input.evidence),
      status: input.status ?? 'draft',
      createdBy: userId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    brandStandardAnswers.unshift(answer);

    return answer;
  }

  updateBrandStandardAnswer(userId: string, brandId: BrandId, answerId: string, input: BrandStandardAnswerUpdateInput): BrandStandardAnswer | null {
    const answer = this.getBrandStandardAnswer(userId, brandId, answerId);
    if (!answer) {
      return null;
    }

    if (input.questionId !== undefined) answer.questionId = input.questionId.trim();
    if (input.question !== undefined) answer.question = input.question.trim();
    if (input.answer !== undefined) answer.answer = input.answer.trim();
    if (input.keyPoints !== undefined) answer.keyPoints = cleanStringList(input.keyPoints);
    if (input.evidence !== undefined) answer.evidence = cleanStandardAnswerEvidence(input.evidence);
    if (input.status !== undefined) answer.status = input.status;
    if (input.reviewedBy !== undefined) answer.reviewedBy = input.reviewedBy.trim();
    if (input.reviewedAt !== undefined) answer.reviewedAt = input.reviewedAt;
    answer.updatedAt = new Date().toISOString();

    return answer;
  }

  listMonitoringRuns(userId: string, brandId: BrandId): MonitoringRunDetail[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return monitoringRuns
      .filter((run) => run.brandId === brandId)
      .map((run) => this.toMonitoringRunDetail(run));
  }

  getMonitoringRun(userId: string, brandId: BrandId, runId: string): MonitoringRunDetail | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const run = monitoringRuns.find((item) => item.brandId === brandId && item.id === runId);

    return run ? this.toMonitoringRunDetail(run) : null;
  }

  getAnalysisResult(userId: string, brandId: BrandId, runId: string): AnalysisResult | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const run = monitoringRuns.find((item) => item.brandId === brandId && item.id === runId);
    if (!run) {
      return null;
    }

    const response = aiResponses.find((item) => item.runId === run.id);
    if (!response) {
      return null;
    }

    return analysisResults.find((item) => item.responseId === response.id) ?? null;
  }

  getBrandMetricDashboard(userId: string, brandId: BrandId): BrandMetricDashboard | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const current = buildMetricSnapshot(brandId, this.getAnalysisSamples(brandId), { period: currentMetricPeriod() });

    return {
      brandId,
      current,
      trend: [current],
      breakdown: {
        platform: buildMetricBreakdown(brandId, this.getAnalysisSamples(brandId), 'platform'),
        optimizationUnit: buildMetricBreakdown(brandId, this.getAnalysisSamples(brandId), 'optimizationUnit'),
        intent: buildMetricBreakdown(brandId, this.getAnalysisSamples(brandId), 'intent')
      }
    };
  }

  getGrowthOptimizationWorkspace(userId: string, brandId: BrandId): GrowthOptimizationWorkspace | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const plans = growthOptimizationPlans.filter((plan) => plan.brandId === brandId).sort((a, b) => b.createdAt.localeCompare(a.createdAt));
    const relatedStrategies = contentStrategies.filter((strategy) => strategy.brandId === brandId);
    const relatedTasks = optimizationTasks.filter((task) => task.brandId === brandId);
    const relatedPublishingRecords = publishingRecords.filter((record) => record.brandId === brandId);

    return {
      brandId,
      plans,
      currentPlan: plans.find((plan) => plan.status !== 'completed') ?? plans[0],
      relatedStrategies,
      relatedTasks,
      relatedPublishingRecords
    };
  }

  generateGrowthOptimizationPlan(userId: string, brandId: BrandId, sourceTestPlanId?: string): GrowthOptimizationPlan | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const allSamples = this.getAnalysisSamples(brandId);
    const samples = sourceTestPlanId
      ? allSamples.filter((sample) => (sample.run as MonitoringRun & { testPlanId?: string }).testPlanId === sourceTestPlanId)
      : allSamples;
    const planDraft = buildGrowthOptimizationPlanDraft(brand, samples.length ? samples : allSamples, sourceTestPlanId);

    return this.createGrowthOptimizationPlan(userId, brandId, planDraft);
  }

  createGrowthOptimizationPlan(userId: string, brandId: BrandId, input: GrowthOptimizationPlanInput): GrowthOptimizationPlan | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const plan: GrowthOptimizationPlan = {
      id: `growth_plan_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      sourceTestPlanId: input.sourceTestPlanId,
      strategyId: input.strategyId,
      sourceRunIds: input.sourceRunIds ?? [],
      summary: input.summary?.trim() || '根据首轮监测结果生成优化计划',
      reasons: input.reasons ?? [],
      priority: input.priority ?? 'medium',
      ownerId: input.ownerId,
      dueDate: input.dueDate,
      publishingPlatforms: input.publishingPlatforms,
      retestAt: input.retestAt,
      contentRecommendations: input.contentRecommendations ?? [],
      taskIds: [],
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    growthOptimizationPlans.unshift(plan);

    return plan;
  }

  confirmGrowthOptimizationPlan(userId: string, brandId: BrandId, planId: string, input: GrowthOptimizationPlanConfirmInput = {}): GrowthOptimizationPlanConfirmationResult | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const plan = growthOptimizationPlans.find((item) => item.brandId === brandId && item.id === planId);
    if (!plan) {
      return null;
    }

    const timestamp = new Date().toISOString();
    plan.ownerId = input.ownerId?.trim() || plan.ownerId || userId;
    plan.dueDate = input.dueDate?.trim() || plan.dueDate;
    plan.publishingPlatforms = input.publishingPlatforms?.length ? mergeStringLists(input.publishingPlatforms) : plan.publishingPlatforms;
    plan.retestAt = input.retestAt?.trim() || plan.retestAt;
    plan.status = 'confirmed';
    plan.updatedAt = timestamp;

    const existingTasks = optimizationTasks.filter((task) => task.brandId === brandId && task.growthOptimizationPlanId === plan.id);
    const tasks = existingTasks.length ? existingTasks : buildGrowthOptimizationTaskInputs(plan).map((taskInput) => {
      const task: OptimizationTask = {
        id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        brandId,
        title: taskInput.title,
        type: taskInput.type ?? 'manual',
        status: 'todo',
        ownerId: taskInput.ownerId,
        relatedPromptId: taskInput.relatedPromptId,
        relatedPlatformCode: taskInput.relatedPlatformCode,
        growthOptimizationPlanId: plan.id,
        sourceRunId: taskInput.sourceRunId,
        priority: taskInput.priority ?? plan.priority,
        dueDate: taskInput.dueDate,
        reviewStatus: 'pending',
        retestRecords: [],
        createdAt: timestamp,
        updatedAt: timestamp
      };
      optimizationTasks.unshift(task);
      return task;
    });
    plan.taskIds = mergeStringLists(tasks.map((task) => task.id));

    return { plan, tasks };
  }

  listBrandMetricRanking(userId: string, sortBy: keyof Pick<BrandMetricRankingItem, 'totalScore' | 'mentionRate' | 'top3Rate' | 'positiveRate' | 'periodChange'> = 'totalScore'): BrandMetricRankingItem[] {
    return this.listAccessibleBrandDetails(userId)
      .map((brand) => buildMetricRankingItem(brand, this.getAnalysisSamples(brand.brandId)))
      .sort((a, b) => b[sortBy] - a[sortBy]);
  }

  listCompetitors(userId: string, brandId: BrandId): Competitor[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return competitors.filter((competitor) => competitor.brandId === brandId);
  }

  createCompetitor(userId: string, brandId: BrandId, input: CompetitorInput): Competitor | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizeCompetitorInput(input);
    const timestamp = new Date().toISOString();
    const competitor: Competitor = {
      id: `competitor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      ...normalized,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    competitors.unshift(competitor);

    return competitor;
  }

  updateCompetitor(userId: string, brandId: BrandId, competitorId: string, input: Partial<CompetitorInput>): Competitor | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const competitor = competitors.find((item) => item.brandId === brandId && item.id === competitorId);
    if (!competitor) {
      return null;
    }

    const normalized = normalizePartialCompetitorInput(input);
    if (normalized.name !== undefined) competitor.name = normalized.name;
    if (normalized.aliases !== undefined) competitor.aliases = normalized.aliases;
    if (normalized.website !== undefined) competitor.website = normalized.website;
    if (normalized.industryTags !== undefined) competitor.industryTags = normalized.industryTags;
    if (normalized.comparisonNote !== undefined) competitor.comparisonNote = normalized.comparisonNote;
    if (normalized.suppressionRule !== undefined) competitor.suppressionRule = normalized.suppressionRule;
    if (normalized.confirmationLabel !== undefined) competitor.confirmationLabel = normalized.confirmationLabel;
    if (normalized.sourceCandidateId !== undefined) competitor.sourceCandidateId = normalized.sourceCandidateId;
    if (normalized.sourceProvider !== undefined) competitor.sourceProvider = normalized.sourceProvider;
    if (normalized.nearestCampusDistanceKm !== undefined) competitor.nearestCampusDistanceKm = normalized.nearestCampusDistanceKm;
    if (normalized.isNationalBenchmark !== undefined) competitor.isNationalBenchmark = normalized.isNationalBenchmark;
    if (normalized.isCampusFocus !== undefined) competitor.isCampusFocus = normalized.isCampusFocus;
    competitor.updatedAt = new Date().toISOString();

    return competitor;
  }

  getCompetitorDashboard(userId: string, brandId: BrandId): CompetitorDashboard | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const brandCompetitors = competitors.filter((competitor) => competitor.brandId === brandId);
    const comparisons = buildCompetitorComparisons(brandId, brandCompetitors, this.getAnalysisSamples(brandId));
    const mentionedSampleIds = new Set(comparisons.map((item) => item.runId));
    const sampleCount = this.getAnalysisSamples(brandId).length;
    const suppressedItems = comparisons.filter((item) => item.suppressed);
    const rankGaps = comparisons.map((item) => item.rankGap).filter((value): value is number => value !== null);
    const riskIntentMap = new Map<string, { intentId: string; text: string; suppressionCount: number }>();

    for (const item of suppressedItems) {
      const existing = riskIntentMap.get(item.intentId);
      riskIntentMap.set(item.intentId, {
        intentId: item.intentId,
        text: item.intentText,
        suppressionCount: (existing?.suppressionCount ?? 0) + 1
      });
    }

    return {
      brandId,
      competitors: brandCompetitors,
      mentionRate: sampleCount === 0 ? 0 : clampScore((mentionedSampleIds.size / sampleCount) * 100),
      suppressionRate: comparisons.length === 0 ? 0 : clampScore((suppressedItems.length / comparisons.length) * 100),
      averageRankGap: rankGaps.length === 0 ? 0 : Math.round(rankGaps.reduce((sum, value) => sum + value, 0) / rankGaps.length),
      highRiskIntents: Array.from(riskIntentMap.values()).sort((a, b) => b.suppressionCount - a.suppressionCount),
      comparisons
    };
  }

  async createCompetitorDiscoveryRun(userId: string, brandId: BrandId, input: CompetitorDiscoveryRunInput = {}): Promise<CompetitorDiscoveryRun | null> {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const city = input.city?.trim() || brand.targetCities[0] || '';
    const keywords = normalizeStringList(input.keywords).length > 0
      ? normalizeStringList(input.keywords)
      : buildCompetitorDiscoveryKeywords(brand, profiles.get(brandId));
    const campusRadiusKm = clampCampusRadius(input.campusRadiusKm ?? 5);
    const sourceProvider = normalizeCompetitorSourceProvider(input.sourceProvider);
    const cacheKey = buildCompetitorCandidateCacheKey(brandId, city, campusRadiusKm, keywords, sourceProvider);
    const cachedEntry = input.forceRefresh ? undefined : competitorCandidateCache.get(cacheKey);
    const providerResult = cachedEntry
      ? { providerState: cachedEntry.providerState }
      : await fetchProviderPoiCandidates(sourceProvider, city || brand.targetCities[0] || '贵阳', keywords);
    const providerState = providerResult.providerState;
    const missingFields = [
      city ? '' : '经营城市',
      brand.targetCities.length > 0 ? '' : '校区或服务城市'
    ].filter(Boolean);
    const timestamp = new Date().toISOString();
    const run: CompetitorDiscoveryRun = {
      runId: `competitor_discovery_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      city: city || '待补充城市',
      campusRadiusKm,
      keywords,
      status: missingFields.length > 0 ? 'failed' : 'completed',
      candidateCount: 0,
      missingFields,
      sourceProvider,
      providerStatus: providerState.providerStatus,
      providerMessage: providerState.providerMessage,
      cacheHit: Boolean(cachedEntry),
      createdBy: userId,
      createdAt: timestamp,
      completedAt: timestamp,
      failureReason: missingFields.length > 0 ? `需要先补充：${missingFields.join('、')}` : undefined
    };

    competitorDiscoveryRuns.unshift(run);
    if (run.status === 'completed') {
      const candidates = cachedEntry
        ? cloneCompetitorCandidatesForRun(cachedEntry.candidates, run.runId, timestamp)
        : dedupeCompetitorCandidates(buildLocalCompetitorCandidates(brand, run, profiles.get(brandId), providerResult.pois));
      competitorCandidates.unshift(...dedupeCompetitorCandidates(candidates));
      run.candidateCount = candidates.length;
      if (!cachedEntry) {
        competitorCandidateCache.set(cacheKey, { candidates, providerState });
      }
    }

    return run;
  }

  listCompetitorDiscoveryCandidates(userId: string, brandId: BrandId, runId: string, query: CompetitorDiscoveryCandidatesQuery = {}): CompetitorCandidate[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const run = competitorDiscoveryRuns.find((item) => item.brandId === brandId && item.runId === runId);
    if (!run) {
      return null;
    }

    return competitorCandidates
      .filter((candidate) => candidate.brandId === brandId && candidate.runId === runId)
      .filter((candidate) => matchesCompetitorCandidateFilter(candidate, query.filter))
      .sort((a, b) => b.score - a.score);
  }

  decideCompetitorCandidate(userId: string, brandId: BrandId, candidateId: string, input: CompetitorCandidateDecisionInput): CompetitorCandidateConfirmationResult | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const candidate = competitorCandidates.find((item) => item.brandId === brandId && item.candidateId === candidateId);
    if (!candidate) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const label = normalizeCompetitorConfirmationLabel(input.label);
    candidate.updatedAt = timestamp;
    candidate.confirmedLabel = label;

    if (label === 'excluded') {
      candidate.decisionStatus = 'excluded';
      candidate.excludedReason = input.excludedReason?.trim() || '用户排除';
      this.createAuditLog(userId, {
        brandId,
        actorUserId: userId,
        action: 'competitor_candidate.exclude',
        resourceType: 'competitor_candidate',
        resourceId: candidate.candidateId,
        result: 'success',
        metadata: {
          label,
          candidateName: candidate.name,
          runId: candidate.runId,
          sourceProvider: candidate.sourceProvider,
          excludedReason: candidate.excludedReason
        }
      });
      return { candidate };
    }

    candidate.decisionStatus = 'confirmed';
    candidate.excludedReason = undefined;
    this.createAuditLog(userId, {
      brandId,
      actorUserId: userId,
      action: 'competitor_candidate.confirm',
      resourceType: 'competitor_candidate',
      resourceId: candidate.candidateId,
      result: 'success',
      metadata: {
        label,
        candidateName: candidate.name,
        runId: candidate.runId,
        sourceProvider: candidate.sourceProvider
      }
    });
    const existing = competitors.find((item) => item.brandId === brandId && item.sourceCandidateId === candidate.candidateId)
      ?? competitors.find((item) => item.brandId === brandId && item.name === candidate.name);
    const competitorInput: CompetitorInput = {
      name: candidate.name,
      aliases: [],
      website: undefined,
      industryTags: mergeStringLists(candidate.matchedKeywords, candidate.category ? [candidate.category] : []),
      comparisonNote: candidate.matchReasons.join('；'),
      suppressionRule: { consecutiveThreshold: 2 },
      confirmationLabel: label,
      sourceCandidateId: candidate.candidateId,
      sourceProvider: candidate.sourceProvider,
      nearestCampusDistanceKm: candidate.distanceToNearestCampusKm,
      isNationalBenchmark: label === 'national_benchmark',
      isCampusFocus: candidate.isCampusFocus
    };

    const competitor = existing
      ? this.updateCompetitor(userId, brandId, existing.id, competitorInput)
      : this.createCompetitor(userId, brandId, competitorInput);

    if (competitor) {
      createCompetitorLinkedTestQuestions(brand, candidate, label);
      createNationalBenchmarkContentStrategy(brand, competitor, label);
    }

    return { candidate, competitor: competitor ?? undefined };
  }

  getCitationDashboard(userId: string, brandId: BrandId): CitationDashboard | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const sources = this.syncCitationSources(brand).filter((source) => source.brandId === brandId);
    const totalCitations = sources.reduce((sum, source) => sum + source.citationCount, 0);
    const contentCitationCount = sources
      .filter((source) => Boolean(source.contentAssetId))
      .reduce((sum, source) => sum + source.citationCount, 0);
    const officialCitationCount = sources
      .filter((source) => source.sourceType === 'official_site')
      .reduce((sum, source) => sum + source.citationCount, 0);
    const authorityCitationCount = sources
      .filter((source) => source.authorityLevel === 'high')
      .reduce((sum, source) => sum + source.citationCount, 0);

    return {
      brandId,
      totalCitations,
      contentCitationRate: totalCitations === 0 ? 0 : clampScore((contentCitationCount / totalCitations) * 100),
      officialCitationRate: totalCitations === 0 ? 0 : clampScore((officialCitationCount / totalCitations) * 100),
      authoritySourceRate: totalCitations === 0 ? 0 : clampScore((authorityCitationCount / totalCitations) * 100),
      sourceTypeBreakdown: buildCitationTypeBreakdown(sources, totalCitations),
      trend: buildCitationTrend(sources),
      sources,
      contentAssets: contentAssets.filter((asset) => asset.brandId === brandId)
    };
  }

  bindCitationContentAsset(userId: string, brandId: BrandId, citationId: string, input: ContentAssetInput = {}): ContentAsset | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const source = this.syncCitationSources(brand).find((item) => item.brandId === brandId && item.id === citationId);
    if (!source) {
      return null;
    }

    const existingAsset = contentAssets.find((asset) => asset.brandId === brandId && asset.url === (input.url?.trim() || source.url));
    if (existingAsset) {
      source.contentAssetId = existingAsset.id;
      return existingAsset;
    }

    const timestamp = new Date().toISOString();
    const asset: ContentAsset = {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      title: input.title?.trim() || source.title,
      type: input.type?.trim() || toContentAssetType(source.sourceType),
      platform: input.platform?.trim() || source.sourceType,
      url: input.url?.trim() || source.url,
      targetKeywords: normalizeStringList(input.targetKeywords),
      status: input.status ?? 'published',
      publishedAt: input.publishedAt,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    contentAssets.unshift(asset);
    source.contentAssetId = asset.id;

    return asset;
  }

  createCitationEnhancementStrategy(userId: string, brandId: BrandId, citationId: string): ContentStrategy | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const source = this.syncCitationSources(brand).find((item) => item.brandId === brandId && item.id === citationId);
    if (!source) {
      return null;
    }

    const run = monitoringRuns.find((item) => item.id === source.runId);
    const prompt = brandPrompts.find((item) => item.id === source.promptId);
    if (!run || !prompt) {
      return null;
    }

    const exists = contentStrategies.find((strategy) => {
      return strategy.brandId === brandId && strategy.type === 'authority_citation' && strategy.relatedPromptIds.includes(source.promptId);
    });
    if (exists) {
      return exists;
    }

    const timestamp = new Date().toISOString();
    const strategy: ContentStrategy = {
      id: `strategy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      optimizationUnitId: run.optimizationUnitId,
      intentId: run.intentId,
      type: 'authority_citation',
      priority: source.authorityLevel === 'high' ? 'medium' : 'high',
      suggestedTitle: `增强${source.title}引用可信度`,
      targetPlatform: run.platformCode,
      targetKeywords: prompt.targetKeywords,
      relatedPromptIds: [source.promptId],
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    contentStrategies.unshift(strategy);

    return strategy;
  }

  getEvaluationDashboard(userId: string, brandId: BrandId): EvaluationDashboard | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const samples = this.getAnalysisSamples(brandId);
    const issues = this.syncEvaluationIssues(brand, samples).filter((issue) => issue.brandId === brandId);

    return {
      brandId,
      sampleCount: samples.length,
      positiveRate: calculateRate(samples, (sample) => sample.analysis.sentiment === 'positive'),
      neutralRate: calculateRate(samples, (sample) => sample.analysis.sentiment === 'neutral'),
      negativeRate: calculateRate(samples, (sample) => sample.analysis.sentiment === 'negative'),
      accurateRate: calculateRate(samples, (sample) => sample.analysis.accuracyScore >= 80),
      trend: buildEvaluationTrend(samples),
      issueTypeBreakdown: buildEvaluationIssueBreakdown(issues),
      issues
    };
  }

  createEvaluationCorrectionStrategy(userId: string, brandId: BrandId, issueId: string): ContentStrategy | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const issue = this.syncEvaluationIssues(brand, this.getAnalysisSamples(brandId)).find((item) => item.brandId === brandId && item.id === issueId);
    if (!issue) {
      return null;
    }

    const run = monitoringRuns.find((item) => item.id === issue.runId);
    const prompt = brandPrompts.find((item) => item.id === issue.promptId);
    if (!run || !prompt) {
      return null;
    }

    const exists = contentStrategies.find((strategy) => {
      return strategy.brandId === brandId && strategy.type === 'correction' && strategy.relatedPromptIds.includes(issue.promptId) && strategy.suggestedTitle.includes(issueTypeLabels[issue.issueType]);
    });
    if (exists) {
      issue.status = 'strategy_created';
      issue.updatedAt = new Date().toISOString();
      return exists;
    }

    const timestamp = new Date().toISOString();
    const strategy: ContentStrategy = {
      id: `strategy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      optimizationUnitId: run.optimizationUnitId,
      intentId: run.intentId,
      type: 'correction',
      priority: issue.severity === 'high' ? 'high' : issue.severity === 'medium' ? 'medium' : 'low',
      suggestedTitle: `修正${issueTypeLabels[issue.issueType]}：${issue.suggestedExpression}`,
      targetPlatform: run.platformCode,
      targetKeywords: prompt.targetKeywords,
      relatedPromptIds: [issue.promptId],
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    contentStrategies.unshift(strategy);
    issue.status = 'strategy_created';
    issue.updatedAt = timestamp;

    return strategy;
  }

  updateBrandKnowledgeFromEvaluationIssue(userId: string, brandId: BrandId, issueId: string): BrandProfile | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const issue = this.syncEvaluationIssues(brand, this.getAnalysisSamples(brandId)).find((item) => item.brandId === brandId && item.id === issueId);
    if (!issue) {
      return null;
    }

    const profile = profiles.get(brandId) ?? createEmptyProfile(brandId);
    const nextProfile = {
      ...profile,
      valueProps: issue.issueType === 'missing_selling_point'
        ? mergeStringLists(profile.valueProps, [issue.suggestedExpression])
        : profile.valueProps,
      recommendedExpressions: mergeStringLists(profile.recommendedExpressions, [issue.suggestedExpression]),
      blockedExpressions: ['misinformation', 'blocked_expression', 'negative_expression'].includes(issue.issueType)
        ? mergeStringLists(profile.blockedExpressions, [issue.rawFragment])
        : profile.blockedExpressions,
      updatedAt: new Date().toISOString()
    };

    const completeness = calculateBrandProfileCompleteness(brand, nextProfile);
    nextProfile.completenessScore = completeness.score;
    nextProfile.missingFields = completeness.missingFields;
    profiles.set(brandId, nextProfile);
    issue.status = 'knowledge_updated';
    issue.updatedAt = nextProfile.updatedAt;

    return nextProfile;
  }

  getContentCenterDashboard(userId: string, brandId: BrandId): ContentCenterDashboard | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const assets = contentAssets.filter((asset) => asset.brandId === brandId);
    const strategies = contentStrategies.filter((strategy) => strategy.brandId === brandId);
    const suggestions = buildContentStrategySuggestions(brandId, this.getAnalysisSamples(brandId), assets, strategies);

    return {
      brandId,
      assets,
      strategies,
      suggestions,
      coverage: buildContentCoverage(brandId, assets)
    };
  }

  listContentAssets(userId: string, brandId: BrandId, filter: ContentAssetFilter = {}): ContentAsset[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return contentAssets.filter((asset) => {
      return asset.brandId === brandId &&
        (!filter.type || asset.type === filter.type) &&
        (!filter.platform || asset.platform === filter.platform) &&
        (!filter.status || asset.status === filter.status) &&
        (!filter.keyword || asset.targetKeywords.some((keyword) => keyword.includes(filter.keyword as string)));
    });
  }

  createContentAsset(userId: string, brandId: BrandId, input: ContentAssetInput): ContentAsset | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizeContentAssetInput(input);
    if (!normalized.title || !normalized.type || !normalized.platform || !normalized.url) {
      return null;
    }
    if (normalized.reuseOfAssetId && !contentAssets.some((asset) => asset.id === normalized.reuseOfAssetId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const asset: ContentAsset = {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      title: normalized.title,
      type: normalized.type,
      platform: normalized.platform,
      url: normalized.url,
      targetKeywords: normalized.targetKeywords ?? [],
      reuseOfAssetId: normalized.reuseOfAssetId,
      brandAdaptation: normalized.brandAdaptation,
      status: normalized.status ?? 'draft',
      publishedAt: normalized.publishedAt,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    contentAssets.unshift(asset);

    return asset;
  }

  updateContentAsset(userId: string, brandId: BrandId, assetId: string, input: ContentAssetInput): ContentAsset | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const asset = contentAssets.find((item) => item.brandId === brandId && item.id === assetId);
    if (!asset) {
      return null;
    }

    const normalized = normalizeContentAssetInput(input);
    if (normalized.reuseOfAssetId && !contentAssets.some((item) => item.id === normalized.reuseOfAssetId)) {
      return null;
    }
    if (normalized.title !== undefined) asset.title = normalized.title;
    if (normalized.type !== undefined) asset.type = normalized.type;
    if (normalized.platform !== undefined) asset.platform = normalized.platform;
    if (normalized.url !== undefined) asset.url = normalized.url;
    if (normalized.targetKeywords !== undefined) asset.targetKeywords = normalized.targetKeywords;
    if (normalized.reuseOfAssetId !== undefined) asset.reuseOfAssetId = normalized.reuseOfAssetId;
    if (normalized.brandAdaptation !== undefined) asset.brandAdaptation = normalized.brandAdaptation;
    if (normalized.status !== undefined) asset.status = normalized.status;
    if (normalized.publishedAt !== undefined) asset.publishedAt = normalized.publishedAt;
    asset.updatedAt = new Date().toISOString();

    return asset;
  }

  listContentStrategies(userId: string, brandId: BrandId, filter: ContentStrategyFilter = {}): ContentStrategy[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return contentStrategies.filter((strategy) => {
      return strategy.brandId === brandId &&
        (!filter.type || strategy.type === filter.type) &&
        (!filter.priority || strategy.priority === filter.priority) &&
        (!filter.platform || strategy.targetPlatform === filter.platform) &&
        (!filter.status || strategy.status === filter.status);
    });
  }

  generateContentStrategies(userId: string, brandId: BrandId): ContentStrategy[] | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const suggestions = buildContentStrategySuggestions(
      brandId,
      this.getAnalysisSamples(brandId),
      contentAssets.filter((asset) => asset.brandId === brandId),
      contentStrategies.filter((strategy) => strategy.brandId === brandId)
    );
    const created: ContentStrategy[] = [];

    for (const suggestion of suggestions) {
      const strategy = this.createContentStrategy(userId, brandId, suggestion);
      if (strategy) {
        created.push(strategy);
      }
    }

    return created;
  }

  getGeoCanvasWorkspace(userId: string, brandId: BrandId): GeoCanvasWorkspace | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const units = optimizationUnits.filter((unit) => unit.brandId === brandId).map((unit) => this.withOptimizationUnitCounts(unit));
    const intents = userIntents.filter((intent) => intent.brandId === brandId).map((intent) => this.withIntentMetrics(intent));
    const strategies = contentStrategies.filter((strategy) => strategy.brandId === brandId);
    const tasks = optimizationTasks.filter((task) => task.brandId === brandId);
    const metrics = this.getBrandMetricDashboard(userId, brandId) as BrandMetricDashboard;
    const nodes = [
      ...units.map((unit, index) => ({
        id: `unit:${unit.id}`,
        type: 'optimization_unit' as const,
        sourceId: unit.id,
        title: unit.name,
        subtitle: `${unit.type} · ${unit.targetKeywords.join('、') || '未配置关键词'}`,
        status: unit.enabled ? unit.priority : 'disabled',
        position: { x: 0, y: index * 190 }
      })),
      ...intents.map((intent, index) => ({
        id: `intent:${intent.id}`,
        type: 'user_intent' as const,
        sourceId: intent.id,
        title: intent.text,
        subtitle: `${intent.category} · ${intent.monitoringFrequency}`,
        status: intent.enabled ? 'enabled' : 'disabled',
        position: { x: 330, y: index * 150 }
      })),
      ...units.map((unit, index) => {
        const metric = metrics.breakdown.optimizationUnit.find((snapshot) => snapshot.optimizationUnitId === unit.id) ?? metrics.current;

        return {
          id: `metric:${unit.id}`,
          type: 'metric' as const,
          sourceId: unit.id,
          title: `${unit.name} 数据表现`,
          subtitle: `GEO ${metric.totalScore} / 样本 ${metric.sampleCount}`,
          status: metric.insufficientSample ? 'insufficient_sample' : 'ready',
          metric: {
            totalScore: metric.totalScore,
            sampleCount: metric.sampleCount,
            insufficientSample: metric.insufficientSample
          },
          position: { x: 660, y: index * 190 }
        };
      }),
      ...strategies.map((strategy, index) => ({
        id: `strategy:${strategy.id}`,
        type: 'content_strategy' as const,
        sourceId: strategy.id,
        title: strategy.suggestedTitle,
        subtitle: `${strategy.type} · ${strategy.targetPlatform}`,
        status: strategy.status,
        position: { x: 990, y: index * 150 }
      }))
    ];
    const edges = [
      ...intents.map((intent) => ({
        id: `unit:${intent.optimizationUnitId}->intent:${intent.id}`,
        source: `unit:${intent.optimizationUnitId}`,
        target: `intent:${intent.id}`,
        label: '承载意图'
      })),
      ...units.map((unit) => ({
        id: `unit:${unit.id}->metric:${unit.id}`,
        source: `unit:${unit.id}`,
        target: `metric:${unit.id}`,
        label: '数据表现'
      })),
      ...strategies.map((strategy) => ({
        id: `intent:${strategy.intentId}->strategy:${strategy.id}`,
        source: `intent:${strategy.intentId}`,
        target: `strategy:${strategy.id}`,
        label: '内容策略'
      }))
    ];

    return {
      brandId,
      nodes,
      edges,
      optimizationUnits: units,
      userIntents: intents,
      contentStrategies: strategies,
      tasks,
      metrics
    };
  }

  createContentStrategy(userId: string, brandId: BrandId, input: ContentStrategyInput): ContentStrategy | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizeContentStrategyInput(input);
    if (!this.findOptimizationUnitForBrand(brandId, normalized.optimizationUnitId)) {
      return null;
    }
    const intent = userIntents.find((item) => item.brandId === brandId && item.id === normalized.intentId);
    if (!intent || intent.optimizationUnitId !== normalized.optimizationUnitId) {
      return null;
    }
    const relatedPromptIds = normalized.relatedPromptIds.filter((promptId) => {
      return brandPrompts.some((prompt) => prompt.brandId === brandId && prompt.id === promptId && prompt.intentId === intent.id);
    });
    const timestamp = new Date().toISOString();
    const strategy: ContentStrategy = {
      id: `strategy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      ...normalized,
      relatedPromptIds,
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    contentStrategies.unshift(strategy);

    return strategy;
  }

  getContentGenerationWorkspace(userId: string, brandId: BrandId, taskId?: string): ContentGenerationWorkspace | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const tasks = contentGenerationTasks.filter((task) => task.brandId === brandId);
    const currentTask = taskId ? tasks.find((task) => task.id === taskId) : tasks[0];
    const versions = currentTask
      ? contentVersions.filter((version) => version.brandId === brandId && version.generationTaskId === currentTask.id)
      : [];
    const currentVersion = versions[0];
    const exports = currentTask
      ? contentExportRecords.filter((record) => record.brandId === brandId && record.generationTaskId === currentTask.id)
      : [];

    return {
      brandId,
      tasks,
      currentTask,
      currentVersion,
      versions,
      exports,
      publishPayload: currentTask && currentVersion ? buildPublishingEntryPayload(currentTask, currentVersion) : undefined
    };
  }

  createContentGenerationTask(userId: string, brandId: BrandId, input: ContentGenerationTaskInput): ContentGenerationWorkspace | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const strategy = contentStrategies.find((item) => item.brandId === brandId && item.id === input.strategyId);
    if (!strategy) {
      return null;
    }

    const brand = brands.find((item) => item.brandId === brandId);
    const profile = profiles.get(brandId);
    const intent = userIntents.find((item) => item.brandId === brandId && item.id === strategy.intentId);
    const unit = optimizationUnits.find((item) => item.brandId === brandId && item.id === strategy.optimizationUnitId);
    const timestamp = new Date().toISOString();
    const task: ContentGenerationTask = {
      id: `generation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      strategyId: strategy.id,
      growthOptimizationPlanId: input.growthOptimizationPlanId,
      targetPlatform: input.targetPlatform?.trim() || strategy.targetPlatform,
      contentType: input.contentType?.trim() || inferContentType(strategy.targetPlatform),
      contentTopic: input.contentTopic?.trim() || strategy.suggestedTitle,
      targetKeywords: input.targetKeywords?.length ? normalizeStringList(input.targetKeywords) : strategy.targetKeywords,
      referenceSources: normalizeStringList(input.referenceSources),
      retestAt: input.retestAt?.trim(),
      status: 'completed',
      steps: buildCompletedGenerationSteps(timestamp),
      createdAt: timestamp,
      updatedAt: timestamp
    };
    const job = this.createAsyncJob(userId, brandId, {
      jobType: 'content_generation',
      entityId: task.id,
      status: 'queued',
      nextRunAt: timestamp
    });
    const draft = buildGeneratedDraft({ brandName: brand?.name ?? '当前品牌', profile, strategy, intent, unit, targetPlatform: task.targetPlatform, contentType: task.contentType });
    const version: ContentVersion = {
      id: `version_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      generationTaskId: task.id,
      title: draft.title,
      body: draft.body,
      version: 1,
      exportFormat: 'markdown',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    task.draftRef = version.id;
    contentGenerationTasks.unshift(task);
    contentVersions.unshift(version);
    if (job) {
      this.updateAsyncJob(userId, brandId, job.id, { status: 'succeeded', attemptCount: 1 });
    }

    return this.getContentGenerationWorkspace(userId, brandId, task.id);
  }

  createContentGenerationTasksFromGrowthPlan(userId: string, brandId: BrandId, input: GrowthOptimizationContentTaskInput): ContentGenerationWorkspace | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const plan = growthOptimizationPlans.find((item) => item.brandId === brandId && item.id === input.planId);
    if (!plan || plan.contentRecommendations.length === 0) {
      return null;
    }

    const selectedRecommendations = selectGrowthContentRecommendations(plan, input.recommendationIndexes);
    let latestWorkspace: ContentGenerationWorkspace | null = null;

    for (const recommendation of selectedRecommendations) {
      const strategy = this.resolveGrowthContentStrategy(brandId, plan, recommendation);
      latestWorkspace = this.createContentGenerationTask(userId, brandId, {
        strategyId: strategy.id,
        growthOptimizationPlanId: plan.id,
        targetPlatform: recommendation.targetPlatform,
        contentType: recommendation.contentType,
        contentTopic: recommendation.title,
        targetKeywords: recommendation.targetKeywords,
        referenceSources: buildGrowthContentReferenceSources(plan, recommendation),
        retestAt: plan.retestAt
      });
    }

    return latestWorkspace ?? this.getContentGenerationWorkspace(userId, brandId);
  }

  private resolveGrowthContentStrategy(brandId: BrandId, plan: GrowthOptimizationPlan, recommendation: GrowthOptimizationContentRecommendation): ContentStrategy {
    const existingStrategy = [recommendation.sourceStrategyId, plan.strategyId]
      .filter(Boolean)
      .map((strategyId) => contentStrategies.find((item) => item.brandId === brandId && item.id === strategyId))
      .find((strategy): strategy is ContentStrategy => Boolean(strategy));
    if (existingStrategy) {
      return existingStrategy;
    }

    const promptId = plan.reasons.flatMap((reason) => reason.relatedPromptIds)[0];
    const prompt = promptId ? brandPrompts.find((item) => item.brandId === brandId && item.id === promptId) : undefined;
    const fallbackUnit = optimizationUnits.find((item) => item.brandId === brandId) ?? this.createDefaultGrowthOptimizationUnit(brandId, recommendation);
    const fallbackIntent = userIntents.find((item) => item.brandId === brandId && item.optimizationUnitId === fallbackUnit.id)
      ?? this.createDefaultGrowthUserIntent(brandId, fallbackUnit.id, recommendation);
    const timestamp = new Date().toISOString();
    const strategy: ContentStrategy = {
      id: `strategy_growth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      optimizationUnitId: prompt?.optimizationUnitId ?? fallbackUnit.id,
      intentId: prompt?.intentId ?? fallbackIntent.id,
      type: recommendation.contentType === 'platform_profile_copy' ? 'correction' : 'gap',
      priority: plan.priority,
      suggestedTitle: recommendation.title,
      targetPlatform: recommendation.targetPlatform,
      targetKeywords: recommendation.targetKeywords,
      relatedPromptIds: prompt ? [prompt.id] : plan.reasons.flatMap((reason) => reason.relatedPromptIds),
      status: 'task_created',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    contentStrategies.unshift(strategy);
    return strategy;
  }

  private createDefaultGrowthOptimizationUnit(brandId: BrandId, recommendation: GrowthOptimizationContentRecommendation): OptimizationUnit {
    const timestamp = new Date().toISOString();
    const unit: OptimizationUnit = {
      id: `unit_growth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      name: 'AI 推荐内容补强',
      type: 'brand',
      targetKeywords: recommendation.targetKeywords,
      priority: 'high',
      enabled: true,
      relatedCounts: { userIntents: 0, prompts: 0, contentStrategies: 0, monitoringRuns: 0, tasks: 0 },
      createdAt: timestamp,
      updatedAt: timestamp
    };
    optimizationUnits.unshift(unit);
    return unit;
  }

  private createDefaultGrowthUserIntent(brandId: BrandId, optimizationUnitId: string, recommendation: GrowthOptimizationContentRecommendation): UserIntent {
    const timestamp = new Date().toISOString();
    const intent: UserIntent = {
      id: `intent_growth_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      optimizationUnitId,
      category: 'brand_awareness',
      text: recommendation.title,
      monitoringFrequency: 'manual',
      enabled: true,
      platformMetrics: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };
    userIntents.unshift(intent);
    return intent;
  }

  updateContentGenerationStep(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationStepUpdateInput): ContentGenerationWorkspace | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const task = contentGenerationTasks.find((item) => item.brandId === brandId && item.id === taskId);
    if (!task) {
      return null;
    }

    task.steps = updateGenerationSteps(task.steps, input, new Date().toISOString());
    task.status = deriveGenerationStatus(task.steps);
    task.errorMessage = task.status === 'failed' ? input.message?.trim() || '内容生成步骤执行失败' : undefined;
    task.updatedAt = new Date().toISOString();

    return this.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  completeContentGenerationTask(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationCompletionInput): ContentGenerationWorkspace | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const task = contentGenerationTasks.find((item) => item.brandId === brandId && item.id === taskId);
    if (!task || !input.title.trim() || !input.body.trim()) {
      return null;
    }

    const timestamp = input.completedAt ?? new Date().toISOString();
    const version = this.createContentVersionRecord(brandId, taskId, input, timestamp);
    task.steps = completeGenerationSteps(task.steps, timestamp);
    task.status = 'completed';
    task.errorMessage = undefined;
    task.draftRef = version.id;
    task.updatedAt = timestamp;

    return this.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  recordContentGenerationFailure(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationFailureInput): ContentGenerationWorkspace | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const task = contentGenerationTasks.find((item) => item.brandId === brandId && item.id === taskId);
    if (!task || !input.errorMessage.trim()) {
      return null;
    }

    const failedAt = input.failedAt ?? new Date().toISOString();
    task.steps = updateGenerationSteps(task.steps, {
      stepKey: input.stepKey,
      status: 'failed',
      message: input.errorMessage,
      completedAt: failedAt
    }, failedAt);
    task.status = 'failed';
    task.errorMessage = input.errorMessage.trim();
    task.updatedAt = failedAt;
    this.updateContentGenerationJobFailure(userId, brandId, taskId, input);

    return this.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  retryContentGenerationTask(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationRetryInput = {}): ContentGenerationWorkspace | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const task = contentGenerationTasks.find((item) => item.brandId === brandId && item.id === taskId);
    if (!task || task.status !== 'failed') {
      return null;
    }

    const timestamp = new Date().toISOString();
    task.steps = resetGenerationStepsAfterFailure(task.steps);
    task.status = 'pending';
    task.errorMessage = undefined;
    task.updatedAt = timestamp;
    this.enqueueContentGenerationRetry(userId, brandId, taskId, input.nextRunAt ?? timestamp);

    return this.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  saveContentVersion(userId: string, brandId: BrandId, taskId: string, input: ContentVersionInput): ContentGenerationWorkspace | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const task = contentGenerationTasks.find((item) => item.brandId === brandId && item.id === taskId);
    if (!task || !input.title.trim() || !input.body.trim()) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const version = this.createContentVersionRecord(brandId, taskId, input, timestamp);

    task.draftRef = version.id;
    task.updatedAt = timestamp;

    return this.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  private createContentVersionRecord(brandId: BrandId, taskId: string, input: ContentVersionInput, timestamp: string): ContentVersion {
    const nextVersion = Math.max(0, ...contentVersions.filter((version) => version.generationTaskId === taskId).map((version) => version.version)) + 1;
    const version: ContentVersion = {
      id: `version_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      generationTaskId: taskId,
      title: input.title.trim(),
      body: input.body.trim(),
      version: nextVersion,
      exportFormat: input.exportFormat ?? 'markdown',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    contentVersions.unshift(version);
    return version;
  }

  private updateContentGenerationJobFailure(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationFailureInput): void {
    const job = asyncJobs.find((item) => item.brandId === brandId && item.jobType === 'content_generation' && item.entityId === taskId);
    if (!job) return;

    const attemptCount = input.attemptCount ?? job.attemptCount + 1;
    const exhausted = input.retryable === false || attemptCount >= job.maxAttempts;
    this.updateAsyncJob(userId, brandId, job.id, {
      status: exhausted ? 'retry-exhausted' : 'failed',
      attemptCount,
      lastErrorCode: input.errorCode?.trim() || 'content_generation_failed',
      lastErrorMessage: input.errorMessage.trim()
    });
  }

  private enqueueContentGenerationRetry(userId: string, brandId: BrandId, taskId: string, nextRunAt: string): void {
    const job = asyncJobs.find((item) => item.brandId === brandId && item.jobType === 'content_generation' && item.entityId === taskId);
    if (job) {
      this.updateAsyncJob(userId, brandId, job.id, {
        status: 'queued',
        nextRunAt,
        lastErrorCode: undefined,
        lastErrorMessage: undefined
      });
      return;
    }

    this.createAsyncJob(userId, brandId, {
      jobType: 'content_generation',
      entityId: taskId,
      status: 'queued',
      nextRunAt
    });
  }

  exportContentMarkdown(userId: string, brandId: BrandId, taskId: string, versionId?: string): ContentExportRecord | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const task = contentGenerationTasks.find((item) => item.brandId === brandId && item.id === taskId);
    const version = versionId
      ? contentVersions.find((item) => item.brandId === brandId && item.generationTaskId === taskId && item.id === versionId)
      : contentVersions.find((item) => item.brandId === brandId && item.generationTaskId === taskId && item.id === task?.draftRef);
    if (!task || !version) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const record: ContentExportRecord = {
      id: `export_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      generationTaskId: taskId,
      versionId: version.id,
      exportFormat: 'markdown',
      fileName: `${slugify(version.title)}-v${version.version}.md`,
      content: `# ${version.title}\n\n${version.body}`,
      createdBy: userId,
      createdAt: timestamp
    };

    contentExportRecords.unshift(record);

    return record;
  }

  getPublishingEntryPayload(userId: string, brandId: BrandId, taskId: string, versionId?: string): PublishingEntryPayload | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const task = contentGenerationTasks.find((item) => item.brandId === brandId && item.id === taskId);
    const version = versionId
      ? contentVersions.find((item) => item.brandId === brandId && item.generationTaskId === taskId && item.id === versionId)
      : contentVersions.find((item) => item.brandId === brandId && item.generationTaskId === taskId && item.id === task?.draftRef);

    return task && version ? buildPublishingEntryPayload(task, version) : null;
  }

  getPublishingDashboard(userId: string, brandId: BrandId): PublishingDashboard | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const accounts = publishingAccounts.filter((account) => account.brandId === brandId);

    return {
      brandId,
      platforms: buildPublishingPlatforms(accounts),
      accounts,
      records: publishingRecords.filter((record) => record.brandId === brandId)
    };
  }

  connectPublishingAccount(userId: string, brandId: BrandId, input: PublishingAccountInput): PublishingAccount | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizePublishingAccountInput(input);
    if (!normalized.platform || !normalized.accountName) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const account: PublishingAccount = {
      id: `pub_account_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      platform: normalized.platform,
      accountName: normalized.accountName,
      loginMode: normalized.loginMode ?? inferPublishingLoginMode(normalized.platform),
      authStatus: normalized.authStatus ?? 'connected',
      errorMessage: normalized.errorMessage,
      lastAuthorizedAt: normalized.authStatus === 'error' ? undefined : timestamp,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    publishingAccounts.unshift(account);

    return account;
  }

  reauthorizePublishingAccount(userId: string, brandId: BrandId, accountId: string): PublishingAccount | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const account = publishingAccounts.find((item) => item.brandId === brandId && item.id === accountId);
    if (!account) {
      return null;
    }

    const timestamp = new Date().toISOString();
    account.authStatus = 'connected';
    account.errorMessage = undefined;
    account.lastAuthorizedAt = timestamp;
    account.updatedAt = timestamp;

    return account;
  }

  updatePublishingAccountStatus(userId: string, brandId: BrandId, accountId: string, input: Pick<PublishingAccountInput, 'authStatus' | 'errorMessage'>): PublishingAccount | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const account = publishingAccounts.find((item) => item.brandId === brandId && item.id === accountId);
    if (!account || !input.authStatus) {
      return null;
    }

    const timestamp = new Date().toISOString();
    account.authStatus = normalizePublishingAuthStatus(input.authStatus);
    account.errorMessage = account.authStatus === 'error' ? input.errorMessage?.trim() || '授权异常，请重新授权' : undefined;
    account.lastAuthorizedAt = account.authStatus === 'connected' ? timestamp : account.lastAuthorizedAt;
    account.updatedAt = timestamp;

    return account;
  }

  createPublishingRecord(userId: string, brandId: BrandId, input: PublishingRecordInput): PublishingRecord | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const account = input.accountId
      ? publishingAccounts.find((item) => item.brandId === brandId && item.id === input.accountId)
      : undefined;
    if (input.accountId && !account) {
      return null;
    }

    const asset = input.contentAssetId
      ? contentAssets.find((item) => item.brandId === brandId && item.id === input.contentAssetId)
      : this.createContentAssetFromPublishingInput(brandId, input, account);
    if (!asset) {
      return null;
    }

    const task = input.generationTaskId
      ? contentGenerationTasks.find((item) => item.brandId === brandId && item.id === input.generationTaskId)
      : undefined;
    const version = input.versionId
      ? contentVersions.find((item) => item.brandId === brandId && item.id === input.versionId && (!input.generationTaskId || item.generationTaskId === input.generationTaskId))
      : undefined;
    if ((input.generationTaskId && !task) || (input.versionId && !version)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const record: PublishingRecord = {
      id: `pub_record_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      contentAssetId: asset.id,
      accountId: account?.id,
      generationTaskId: task?.id,
      versionId: version?.id,
      title: input.title?.trim() || version?.title || asset.title,
      body: input.body?.trim() || version?.body || '',
      platform: input.targetPlatform?.trim() || account?.platform || asset.platform,
      accountName: account?.accountName,
      status: input.status ? normalizePublishingRecordStatus(input.status) : 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    publishingRecords.unshift(record);

    return record;
  }

  updatePublishingRecordStatus(userId: string, brandId: BrandId, recordId: string, input: PublishingStatusInput): PublishingRecord | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const record = publishingRecords.find((item) => item.brandId === brandId && item.id === recordId);
    if (!record) {
      return null;
    }

    record.status = normalizePublishingRecordStatus(input.status);
    record.publishedUrl = input.publishedUrl?.trim();
    record.errorMessage = record.status === 'failed' ? input.errorMessage?.trim() || '发布失败，请检查平台账号状态' : undefined;
    record.updatedAt = new Date().toISOString();

    return record;
  }

  private createContentAssetFromPublishingInput(brandId: BrandId, input: PublishingRecordInput, account?: PublishingAccount): ContentAsset | null {
    const title = input.title?.trim();
    const body = input.body?.trim();
    const platform = input.targetPlatform?.trim() || account?.platform;
    if (!title || !body || !platform) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const asset: ContentAsset = {
      id: `asset_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      title,
      type: input.contentType?.trim() || 'generated_content',
      platform,
      url: `draft://${brandId}/${Date.now()}`,
      targetKeywords: input.targetKeywords ?? [],
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    contentAssets.unshift(asset);

    return asset;
  }

  createOptimizationTask(userId: string, brandId: BrandId, input: OptimizationTaskInput): OptimizationTask | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizeOptimizationTaskInput(input);
    if (normalized.optimizationUnitId && !this.findOptimizationUnitForBrand(brandId, normalized.optimizationUnitId)) {
      return null;
    }
    if (normalized.relatedPromptId && !this.findBrandPromptForBrand(brandId, normalized.relatedPromptId)) {
      return null;
    }
    const strategy = normalized.strategyId
      ? contentStrategies.find((item) => item.brandId === brandId && item.id === normalized.strategyId)
      : undefined;
    if (normalized.strategyId && !strategy) {
      return null;
    }
    const sourceRun = normalized.sourceRunId ? monitoringRuns.find((run) => run.brandId === brandId && run.id === normalized.sourceRunId) : undefined;
    if (normalized.sourceRunId && !sourceRun) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const task: OptimizationTask = {
      id: `task_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      title: normalized.title,
      type: normalized.type ?? 'manual',
      status: 'todo',
      ownerId: normalized.ownerId,
      optimizationUnitId: normalized.optimizationUnitId,
      relatedPromptId: normalized.relatedPromptId,
      relatedPlatformCode: normalized.relatedPlatformCode,
      strategyId: normalized.strategyId,
      growthOptimizationPlanId: normalized.growthOptimizationPlanId,
      sourceRunId: normalized.sourceRunId,
      priority: normalized.priority ?? strategy?.priority ?? 'medium',
      dueDate: normalized.dueDate,
      reviewStatus: 'pending',
      retestRecords: [],
      createdAt: timestamp,
      updatedAt: timestamp
    };

    optimizationTasks.unshift(task);
    if (strategy) {
      strategy.status = 'task_created';
      strategy.updatedAt = timestamp;
    }

    return task;
  }

  getTaskBoard(userId: string, brandId: BrandId): TaskBoardDashboard | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const tasks = optimizationTasks.filter((task) => task.brandId === brandId);
    const statusCounts = optimizationTaskStatuses.reduce<Record<OptimizationTaskStatus, number>>((counts, status) => {
      counts[status] = tasks.filter((task) => task.status === status).length;
      return counts;
    }, { todo: 0, doing: 0, review: 0, retest: 0, done: 0, reopened: 0 });

    return { brandId, tasks, statusCounts };
  }

  updateOptimizationTask(userId: string, brandId: BrandId, taskId: string, input: OptimizationTaskUpdateInput): OptimizationTask | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const task = optimizationTasks.find((item) => item.brandId === brandId && item.id === taskId);
    if (!task) {
      return null;
    }

    const normalized = normalizeOptimizationTaskUpdateInput(input);
    if (normalized.status) task.status = normalized.status;
    if (normalized.ownerId !== undefined) task.ownerId = normalized.ownerId;
    if (normalized.dueDate !== undefined) task.dueDate = normalized.dueDate;
    if (normalized.processingNote !== undefined) task.processingNote = normalized.processingNote;
    if (normalized.contentLink !== undefined) task.contentLink = normalized.contentLink;
    if (normalized.reviewStatus !== undefined) task.reviewStatus = normalized.reviewStatus;
    task.updatedAt = new Date().toISOString();
    if (normalized.status === 'done') {
      this.planRetestForCompletedGrowthTask(brandId, task);
    }

    return task;
  }

  planOptimizationTaskRetest(userId: string, brandId: BrandId, taskId: string, input: RetestPlanInput): OptimizationTask | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const task = optimizationTasks.find((item) => item.brandId === brandId && item.id === taskId);
    if (!task) {
      return null;
    }

    const sourceRunId = input.sourceRunId?.trim() || task.sourceRunId;
    const retestRunId = input.retestRunId?.trim() || sourceRunId;
    if (!sourceRunId || !monitoringRuns.some((run) => run.brandId === brandId && run.id === sourceRunId)) {
      return null;
    }
    if (!retestRunId || !monitoringRuns.some((run) => run.brandId === brandId && run.id === retestRunId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const record: RetestRecord = {
      id: `retest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskId,
      sourceRunId,
      retestRunId,
      plannedAt: input.plannedAt?.trim() || timestamp,
      targetScore: clampScore(input.targetScore ?? 80),
      notes: input.notes?.trim(),
      createdAt: timestamp,
      updatedAt: timestamp
    };

    task.sourceRunId = sourceRunId;
    task.retestRunId = retestRunId;
    task.retestPlanAt = record.plannedAt;
    task.status = 'retest';
    task.retestRecords = [record, ...task.retestRecords];
    task.updatedAt = timestamp;
    this.syncGrowthPlanRetestStatus(brandId, task);

    return task;
  }

  completeOptimizationTaskRetest(userId: string, brandId: BrandId, taskId: string, recordId: string, input: RetestResultInput): OptimizationTask | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const task = optimizationTasks.find((item) => item.brandId === brandId && item.id === taskId);
    const record = task?.retestRecords.find((item) => item.id === recordId);
    if (!task || !record) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const targetScore = clampScore(input.targetScore ?? record.targetScore);
    const comparison = buildRetestMetricComparison(
      analysisResults.find((item) => item.runId === record.sourceRunId),
      analysisResults.find((item) => item.runId === record.retestRunId)
    );
    const actualScore = clampScore(input.actualScore ?? comparison.afterMetrics.accuracyScore);
    record.targetScore = targetScore;
    record.actualScore = actualScore;
    record.beforeMetrics = comparison.beforeMetrics;
    record.afterMetrics = comparison.afterMetrics;
    record.metricDelta = comparison.metricDelta;
    record.improved = record.sourceRunId === record.retestRunId ? actualScore >= targetScore : comparison.improved;
    record.passed = actualScore >= targetScore && record.improved;
    record.completedAt = timestamp;
    record.nextSuggestion = record.improved ? undefined : buildRetestNextSuggestion(comparison);
    record.notes = input.notes?.trim() || record.notes;
    record.updatedAt = timestamp;
    task.status = record.passed ? 'done' : 'reopened';
    task.processingNote = record.passed
      ? `${task.processingNote ?? ''}\n复测通过：${actualScore}/${targetScore}`.trim()
      : `${task.processingNote ?? ''}\n复测未达标，已重开并生成下一轮优化建议：${actualScore}/${targetScore}。${record.nextSuggestion ?? ''}`.trim();
    task.updatedAt = timestamp;

    const prompt = task.relatedPromptId ? brandPrompts.find((item) => item.brandId === brandId && item.id === task.relatedPromptId) : undefined;
    const optimizationUnitId = task.optimizationUnitId ?? prompt?.optimizationUnitId;
    if (!record.passed && optimizationUnitId && prompt) {
      this.createContentStrategy(userId, brandId, {
        optimizationUnitId,
        intentId: prompt.intentId,
        type: 'correction',
        priority: 'high',
        suggestedTitle: `${task.title} - 下一轮修正`,
        targetPlatform: task.relatedPlatformCode ?? 'manual_input',
        targetKeywords: ['复测未达标', '表达修正'],
        relatedPromptIds: [prompt.id]
      });
    }
    this.syncGrowthPlanRetestStatus(brandId, task);

    return task;
  }

  private planRetestForCompletedGrowthTask(brandId: BrandId, task: OptimizationTask): void {
    if (!task.growthOptimizationPlanId || !task.sourceRunId || task.retestRecords.length > 0) {
      return;
    }
    if (!monitoringRuns.some((run) => run.brandId === brandId && run.id === task.sourceRunId)) {
      return;
    }

    const plan = growthOptimizationPlans.find((item) => item.brandId === brandId && item.id === task.growthOptimizationPlanId);
    const timestamp = new Date().toISOString();
    const record: RetestRecord = {
      id: `retest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskId: task.id,
      sourceRunId: task.sourceRunId,
      retestRunId: task.retestRunId ?? task.sourceRunId,
      plannedAt: plan?.retestAt ?? timestamp,
      targetScore: 80,
      notes: '优化任务完成后自动进入再次监测计划',
      createdAt: timestamp,
      updatedAt: timestamp
    };
    task.retestRunId = record.retestRunId;
    task.retestPlanAt = record.plannedAt;
    task.status = 'retest';
    task.retestRecords = [record, ...task.retestRecords];
    task.updatedAt = timestamp;
    this.syncGrowthPlanRetestStatus(brandId, task);
  }

  private syncGrowthPlanRetestStatus(brandId: BrandId, task: OptimizationTask): void {
    if (!task.growthOptimizationPlanId) {
      return;
    }

    const plan = growthOptimizationPlans.find((item) => item.brandId === brandId && item.id === task.growthOptimizationPlanId);
    if (!plan) {
      return;
    }

    const planTasks = optimizationTasks.filter((item) => item.brandId === brandId && item.growthOptimizationPlanId === plan.id);
    const completedRetests = planTasks.flatMap((item) => item.retestRecords).filter((record) => record.completedAt);
    const failedRetests = completedRetests.filter((record) => record.passed === false || record.improved === false);
    const timestamp = new Date().toISOString();

    if (failedRetests.length > 0) {
      plan.status = 'in_progress';
      plan.contentRecommendations = [
        ...plan.contentRecommendations,
        ...failedRetests.map((record) => ({
          contentType: 'website_faq' as const,
          title: '再次监测未提升后的下一轮内容补强',
          targetPlatform: plan.publishingPlatforms[0] ?? 'official_site',
          targetKeywords: ['再次监测未提升', 'AI 推荐内容补强'],
          reason: record.nextSuggestion ?? '再次监测指标未提升，需要补充更明确的品牌事实、引用资料和标准表达。'
        }))
      ];
    } else if (planTasks.length > 0 && planTasks.every((item) => item.retestRecords.some((record) => record.completedAt && record.passed))) {
      plan.status = 'completed';
    } else if (planTasks.some((item) => item.retestRecords.length > 0 || item.status === 'retest')) {
      plan.status = 'ready_for_retest';
    } else if (planTasks.some((item) => item.status === 'doing' || item.status === 'done')) {
      plan.status = 'in_progress';
    }
    plan.updatedAt = timestamp;
  }

  parseAnalysisResult(userId: string, brandId: BrandId, runId: string): AnalysisResult | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const run = monitoringRuns.find((item) => item.brandId === brandId && item.id === runId);
    if (!run) {
      return null;
    }

    const response = aiResponses.find((item) => item.runId === run.id);
    if (!response) {
      return null;
    }

    const profile = mergeProfileCompetitors(profiles.get(brandId) ?? createEmptyProfile(brandId), competitors.filter((competitor) => competitor.brandId === brandId));
    const parsed = buildAnalysisResult(brand, profile, run, response);
    const existingIndex = analysisResults.findIndex((item) => item.responseId === response.id);

    if (existingIndex >= 0) {
      analysisResults[existingIndex] = {
        ...parsed,
        id: analysisResults[existingIndex].id
      };
    } else {
      analysisResults.unshift(parsed);
    }

    response.parseStatus = parsed.reviewRequired ? 'review_required' : 'parsed';
    this.createSuppressionStrategyIfNeeded(brandId, parsed);

    return existingIndex >= 0 ? analysisResults[existingIndex] : parsed;
  }

  updateAnalysisResult(userId: string, brandId: BrandId, runId: string, input: AnalysisResultInput): AnalysisResult | null {
    const existing = this.getAnalysisResult(userId, brandId, runId) ?? this.parseAnalysisResult(userId, brandId, runId);
    if (!existing) {
      return null;
    }

    const normalized = normalizeAnalysisResultInput(input);
    if (normalized.brandMentioned !== undefined) existing.brandMentioned = normalized.brandMentioned;
    if (normalized.brandRank !== undefined) existing.brandRank = normalized.brandRank;
    if (normalized.sentiment !== undefined) existing.sentiment = normalized.sentiment;
    if (normalized.accuracyScore !== undefined) existing.accuracyScore = normalized.accuracyScore;
    if (normalized.citationScore !== undefined) existing.citationScore = normalized.citationScore;
    if (normalized.platformEvaluation !== undefined) existing.platformEvaluation = normalized.platformEvaluation;
    if (normalized.recommendationReason !== undefined) existing.recommendationReason = normalized.recommendationReason;
    if (normalized.rankingReason !== undefined) existing.rankingReason = normalized.rankingReason;
    if (normalized.expressionCompleteness !== undefined) existing.expressionCompleteness = normalized.expressionCompleteness;
    if (normalized.expressionDeviation !== undefined) existing.expressionDeviation = normalized.expressionDeviation;
    if (normalized.competitorMentions !== undefined) existing.competitorMentions = normalized.competitorMentions;
    if (normalized.reviewRequired !== undefined) existing.reviewRequired = normalized.reviewRequired;
    existing.updatedAt = new Date().toISOString();

    const response = aiResponses.find((item) => item.id === existing.responseId);
    if (response) {
      response.parseStatus = existing.reviewRequired ? 'review_required' : 'parsed';
    }
    this.createSuppressionStrategyIfNeeded(brandId, existing);

    return existing;
  }

  createMonitoringRun(userId: string, brandId: BrandId, input: MonitoringRunInput): MonitoringRunDetail | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const prompt = this.findBrandPromptForBrand(brandId, input.promptId);
    if (!prompt || !prompt.enabled || !prompt.platformCodes.includes(input.platformCode)) {
      return null;
    }

    const platform = platformConfigs.find((config) => (
      config.brandId === brandId && config.platformCode === input.platformCode && config.enabled
    ));
    if (!platform) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const run: MonitoringRun = {
      id: `run_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      optimizationUnitId: prompt.optimizationUnitId,
      intentId: prompt.intentId,
      promptId: prompt.id,
      platformCode: platform.platformCode,
      status: 'pending',
      startedAt: timestamp,
      retryStatus: 'not_retried',
      createdAt: timestamp
    };

    monitoringRuns.unshift(run);
    const job = this.createAsyncJob(userId, brandId, {
      jobType: 'monitoring',
      entityId: run.id,
      status: 'queued',
      nextRunAt: timestamp
    });
    this.executeMonitoringRun(run, prompt, platform);
    if (job) {
      this.updateAsyncJob(userId, brandId, job.id, {
        status: run.status === 'failed' ? 'failed' : 'succeeded',
        attemptCount: 1,
        lastErrorCode: run.status === 'failed' ? 'adapter_not_ready' : undefined,
        lastErrorMessage: run.errorMessage
      });
    }

    return this.toMonitoringRunDetail(run);
  }

  private executeBrowserTestPlanStep(
    userId: string,
    brandId: BrandId,
    testPlanId: string,
    question: TestPlan['questions'][number],
    platformCode: string
  ): BrowserTestPlanStepResult | null {
    if (!question.promptId) {
      return {
        status: 'needs_confirmation',
        message: '该问题尚未关联 Prompt，需要先确认问题或切换为手动录入。'
      };
    }

    return buildMemoryBrowserPendingResult(platformCode);
  }

  private executeApiTestPlanStep(
    userId: string,
    brandId: BrandId,
    testPlanId: string,
    question: TestPlan['questions'][number],
    platformCode: string
  ): MonitoringRunDetail | null {
    if (!question.promptId) {
      return null;
    }

    const platform = platformConfigs.find((config) => config.brandId === brandId && config.platformCode === platformCode && config.enabled);
    if (!platform || platform.mode !== 'api' || !platform.endpointUrl || !platform.modelName || !platform.credentialRef) {
      return null;
    }

    const run = this.createMonitoringRun(userId, brandId, { promptId: question.promptId, platformCode });
    if (!run) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const storedRun = monitoringRuns.find((item) => item.id === run.id);
    if (storedRun) {
      (storedRun as MonitoringRun & { testPlanId?: string }).testPlanId = testPlanId;
    }

    const audit = this.createAIPlatformCallAudit(userId, brandId, {
      platformCode,
      modelName: platform.modelName,
      callType: 'monitoring',
      status: 'started',
      startedAt: timestamp
    });
    const updated = this.addManualResponse(userId, brandId, run.id, {
      rawText: `API response for ${platformCode}: ${question.question}`,
      modelName: platform.modelName
    });
    this.parseAnalysisResult(userId, brandId, run.id);

    if (audit) {
      this.updateAIPlatformCallAudit(userId, brandId, audit.id, {
        status: 'succeeded',
        modelName: platform.modelName,
        completedAt: new Date().toISOString()
      });
    }

    const job = asyncJobs.find((item) => item.brandId === brandId && item.entityId === run.id && item.jobType === 'monitoring');
    if (job) {
      this.updateAsyncJob(userId, brandId, job.id, {
        status: 'succeeded',
        attemptCount: 1,
        lastErrorCode: undefined,
        lastErrorMessage: undefined
      });
    }

    return this.getMonitoringRun(userId, brandId, run.id) ?? updated ?? run;
  }

  updateMonitoringRunExecution(userId: string, brandId: BrandId, runId: string, input: MonitoringRunExecutionUpdateInput): MonitoringRunDetail | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const run = monitoringRuns.find((item) => item.brandId === brandId && item.id === runId);
    if (!run) {
      return null;
    }

    run.status = input.status;
    run.completedAt = input.completedAt;
    run.errorMessage = input.errorMessage;
    if (input.retryStatus !== undefined) run.retryStatus = input.retryStatus;

    return this.toMonitoringRunDetail(run);
  }

  addManualResponse(userId: string, brandId: BrandId, runId: string, input: ManualResponseInput): MonitoringRunDetail | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const run = monitoringRuns.find((item) => item.brandId === brandId && item.id === runId);
    if (!run) {
      return null;
    }

    const timestamp = new Date().toISOString();
    aiResponses.unshift({
      id: `response_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      runId: run.id,
      brandId,
      rawText: input.rawText.trim(),
      citations: normalizeStringList(input.citations),
      modelName: input.modelName?.trim() || 'manual',
      respondedAt: timestamp,
      parseStatus: 'pending',
      createdAt: timestamp
    });
    run.status = 'completed';
    run.completedAt = timestamp;
    run.errorMessage = undefined;

    return this.toMonitoringRunDetail(run);
  }

  submitManualTestAnswers(userId: string, brandId: BrandId, input: ManualTestAnswerBatchInput): ManualTestAnswerBatchResult | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const testPlanId = input.answers[0]?.testPlanId?.trim();
    if (!testPlanId) {
      return null;
    }

    const plan = testPlans.find((item) => item.brandId === brandId && item.id === testPlanId);
    if (!plan) {
      return null;
    }

    const result: ManualTestAnswerBatchResult = { testPlanId, accepted: [], failed: [] };
    input.answers.forEach((answer) => {
      const normalized = normalizeManualTestAnswerInput(answer);
      const failureBase = { question: normalized.question, platformCode: normalized.platformCode, status: 'failed' as const };

      if (normalized.testPlanId !== testPlanId) {
        result.failed.push({ ...failureBase, message: '批量录入中的监测计划 ID 不一致。' });
        return;
      }

      if (!normalized.rawText) {
        result.failed.push({ ...failureBase, message: '粘贴内容为空，请补充平台回答。' });
        return;
      }

      const question = findManualAnswerQuestion(plan, normalized.question, normalized.platformCode);
      if (!question) {
        result.failed.push({ ...failureBase, message: '未匹配到对应监测问题和平台，请重新选择对应问题。' });
        return;
      }

      if (!question.promptId) {
        result.failed.push({ ...failureBase, message: '该监测问题尚未关联 Prompt，无法创建监测记录。' });
        return;
      }

      const run = this.findOrCreateManualAnswerRun(userId, brandId, plan.id, question, normalized.platformCode);
      if (!run) {
        result.failed.push({ ...failureBase, message: '监测记录创建失败，请确认平台配置。' });
        return;
      }

      const completed = this.addManualResponse(userId, brandId, run.id, {
        rawText: normalized.rawText,
        citations: normalized.citations,
        modelName: normalized.modelName || `${normalized.platformCode}-manual`
      });
      this.parseAnalysisResult(userId, brandId, run.id);
      const detail = this.getMonitoringRun(userId, brandId, run.id) ?? completed ?? run;

      plan.monitoringRunIds = Array.from(new Set([...plan.monitoringRunIds, run.id]));
      plan.updatedAt = new Date().toISOString();
      result.accepted.push({
        question: normalized.question,
        platformCode: normalized.platformCode,
        status: 'accepted',
        message: '手动回答已保存并完成自动分析。',
        run: detail
      });
    });

    return result;
  }

  private findOrCreateManualAnswerRun(
    userId: string,
    brandId: BrandId,
    testPlanId: string,
    question: TestPlan['questions'][number],
    platformCode: string
  ): MonitoringRunDetail | null {
    if (!question.promptId) {
      return null;
    }

    const existing = monitoringRuns.find((run) => {
      const stored = run as MonitoringRun & { testPlanId?: string };
      return run.brandId === brandId && run.promptId === question.promptId && run.platformCode === platformCode && stored.testPlanId === testPlanId;
    });
    if (existing) {
      return this.toMonitoringRunDetail(existing);
    }

    const run = this.createMonitoringRun(userId, brandId, { promptId: question.promptId, platformCode });
    const storedRun = run ? monitoringRuns.find((item) => item.id === run.id) : undefined;
    if (storedRun) {
      (storedRun as MonitoringRun & { testPlanId?: string }).testPlanId = testPlanId;
    }

    return run;
  }

  updateOptimizationUnit(userId: string, brandId: BrandId, unitId: string, input: Partial<OptimizationUnitInput>): OptimizationUnit | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const unit = optimizationUnits.find((item) => item.brandId === brandId && item.id === unitId);

    if (!unit) {
      return null;
    }

    const normalized = normalizePartialOptimizationUnitInput(input);
    if (normalized.name !== undefined) unit.name = normalized.name;
    if (normalized.type !== undefined) unit.type = normalized.type;
    if (normalized.targetKeywords !== undefined) unit.targetKeywords = normalized.targetKeywords;
    if (normalized.priority !== undefined) unit.priority = normalized.priority;
    if (normalized.enabled !== undefined) unit.enabled = normalized.enabled;
    unit.updatedAt = new Date().toISOString();

    return unit;
  }

  getReportDashboard(userId: string, brandId: BrandId): ReportDashboard | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const brandReports = reports.filter((report) => report.brandId === brandId);
    return { brandId, reports: brandReports, latest: brandReports[0] };
  }

  createReport(userId: string, brandId: BrandId, input: ReportInput): ReportRecord | null {
    const brand = this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const normalized = normalizeReportInput(input);
    const timestamp = new Date().toISOString();
    const periodStart = normalized.periodStart ?? timestamp.slice(0, 10);
    const periodEnd = normalized.periodEnd ?? timestamp.slice(0, 10);
    const isMultiBrand = normalized.type === 'multi_brand';
    const snapshot = isMultiBrand
      ? this.buildMultiBrandReportSnapshot(userId)
      : this.buildSingleBrandReportSnapshot(userId, brandId);
    const dataGaps = isMultiBrand
      ? buildMultiBrandDataGaps(snapshot as MultiBrandReportSnapshot)
      : buildSingleBrandDataGaps(snapshot as SingleBrandReportSnapshot);
    const title = normalized.title || buildReportTitle(brand.name, normalized.type, periodEnd);
    const content = isMultiBrand
      ? renderMultiBrandReport(title, periodStart, periodEnd, snapshot as MultiBrandReportSnapshot, dataGaps)
      : renderSingleBrandReport(
          title,
          periodStart,
          periodEnd,
          snapshot as SingleBrandReportSnapshot,
          dataGaps,
          normalized.type === 'customer_delivery'
        );
    const report: ReportRecord = {
      id: `report_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      type: normalized.type,
      title,
      periodStart,
      periodEnd,
      status: 'generated',
      content,
      dataGaps,
      createdBy: userId,
      createdAt: timestamp,
      snapshot
    };

    reports.unshift(report);
    return report;
  }

  getReport(userId: string, brandId: BrandId, reportId: string): ReportRecord | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    return reports.find((report) => report.brandId === brandId && report.id === reportId) ?? null;
  }

  getAdvisorDashboard(userId: string, brandId: BrandId): AdvisorDashboard | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const records = advisorRecords
      .filter((record) => record.brandId === brandId)
      .map((record) => this.withAdvisorReport(record));
    const relatedReports = reports
      .filter((report) => report.brandId === brandId)
      .map(toAdvisorRelatedReport);
    const pendingFollowUps = records.flatMap((record) => record.followUpItems.filter((item) => item.status !== 'done'));

    return {
      brandId,
      records,
      latestDiagnosis: records.find((record) => record.type === 'diagnosis'),
      pendingFollowUps,
      relatedReports
    };
  }

  createAdvisorRecord(userId: string, brandId: BrandId, input: AdvisorRecordInput): AdvisorRecord | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizeAdvisorRecordInput(input);
    if (normalized.relatedReportId && !reports.some((report) => report.brandId === brandId && report.id === normalized.relatedReportId)) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const record: AdvisorRecord = {
      id: `advisor_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      ...normalized,
      createdBy: userId,
      createdAt: timestamp
    };

    advisorRecords.unshift(record);
    return this.withAdvisorReport(record);
  }

  getInnerTestFeedbackDashboard(userId: string, brandId: BrandId): InnerTestFeedbackDashboard | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const records = innerTestFeedbackRecords.filter((record) => record.brandId === brandId);
    return {
      brandId,
      records,
      statusCounts: countInnerTestFeedbackStatuses(records)
    };
  }

  createInnerTestFeedback(userId: string, brandId: BrandId, input: InnerTestFeedbackInput): InnerTestFeedback | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const normalized = normalizeInnerTestFeedbackInput(input);
    const timestamp = new Date().toISOString();
    const record: InnerTestFeedback = {
      id: `feedback_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      ...normalized,
      status: 'open',
      reporterId: userId,
      createdAt: timestamp,
      updatedAt: timestamp
    };

    innerTestFeedbackRecords.unshift(record);
    this.createAuditLog(userId, {
      brandId,
      actorUserId: userId,
      action: 'inner_test_feedback.create',
      resourceType: 'inner_test_feedback',
      resourceId: record.id,
      result: 'success',
      metadata: { page: record.page, module: record.module, type: record.type }
    });
    return record;
  }

  updateInnerTestFeedback(userId: string, brandId: BrandId, feedbackId: string, input: InnerTestFeedbackUpdateInput): InnerTestFeedback | null {
    if (!this.findAccessibleBrandDetail(userId, brandId)) {
      return null;
    }

    const record = innerTestFeedbackRecords.find((item) => item.brandId === brandId && item.id === feedbackId);
    if (!record) return null;

    const normalized = normalizeInnerTestFeedbackUpdateInput(input);
    record.status = normalized.status ?? record.status;
    record.resolutionNote = normalized.resolutionNote ?? record.resolutionNote;
    record.updatedAt = new Date().toISOString();
    this.createAuditLog(userId, {
      brandId,
      actorUserId: userId,
      action: 'inner_test_feedback.update',
      resourceType: 'inner_test_feedback',
      resourceId: record.id,
      result: 'success',
      metadata: { status: record.status }
    });
    return record;
  }

  private buildSingleBrandReportSnapshot(userId: string, brandId: BrandId): SingleBrandReportSnapshot {
    const brand = this.findAccessibleBrandDetail(userId, brandId) as BrandDetail;
    const metrics = this.getBrandMetricDashboard(userId, brandId) as BrandMetricDashboard;
    const competitor = this.getCompetitorDashboard(userId, brandId) as CompetitorDashboard;
    const citation = this.getCitationDashboard(userId, brandId) as CitationDashboard;
    const evaluation = this.getEvaluationDashboard(userId, brandId) as EvaluationDashboard;
    const content = this.getContentCenterDashboard(userId, brandId) as ContentCenterDashboard;
    const taskBoard = this.getTaskBoard(userId, brandId) as TaskBoardDashboard;

    return {
      brand: { brandId: brand.brandId, name: brand.name, industry: brand.industry, status: brand.status },
      metrics,
      competitor: {
        mentionRate: competitor.mentionRate,
        suppressionRate: competitor.suppressionRate,
        averageRankGap: competitor.averageRankGap,
        highRiskIntents: competitor.highRiskIntents
      },
      citation: {
        totalCitations: citation.totalCitations,
        officialCitationRate: citation.officialCitationRate,
        authoritySourceRate: citation.authoritySourceRate,
        contentCitationRate: citation.contentCitationRate
      },
      evaluation: {
        positiveRate: evaluation.positiveRate,
        neutralRate: evaluation.neutralRate,
        negativeRate: evaluation.negativeRate,
        accurateRate: evaluation.accurateRate
      },
      content: content.coverage,
      taskProgress: taskBoard.statusCounts
    };
  }

  private buildMultiBrandReportSnapshot(userId: string): MultiBrandReportSnapshot {
    const ranking = this.listBrandMetricRanking(userId);
    const strongestPlatforms = ranking.flatMap((brand) => {
      const dashboard = this.getBrandMetricDashboard(userId, brand.brandId);
      const strongest = dashboard?.breakdown.platform.sort((a, b) => b.totalScore - a.totalScore)[0];
      return strongest?.platformCode ? [{ brandId: brand.brandId, platformCode: strongest.platformCode, totalScore: strongest.totalScore }] : [];
    });
    const weakScenarios = ranking.filter((brand) => brand.insufficientSample || brand.totalScore < 60).map((brand) => ({
      brandId: brand.brandId,
      name: brand.name,
      reason: brand.insufficientSample ? '监测样本不足' : `GEO 总分 ${brand.totalScore}，低于目标线`
    }));
    const highPriorityIssues = ranking.flatMap((brand) => optimizationTasks
      .filter((task) => task.brandId === brand.brandId && task.priority === 'high' && task.status !== 'done')
      .map((task) => ({ brandId: brand.brandId, title: task.title, source: task.type })));

    return { ranking, strongestPlatforms, weakScenarios, highPriorityIssues };
  }

  private withAdvisorReport(record: AdvisorRecord): AdvisorRecord {
    const report = record.relatedReportId
      ? reports.find((item) => item.brandId === record.brandId && item.id === record.relatedReportId)
      : undefined;

    return {
      ...record,
      relatedReport: report ? toAdvisorRelatedReport(report) : undefined
    };
  }

  canAccessBrand(userId: string, brandId: string): boolean {
    return Boolean(this.findAccessibleBrand(userId, brandId));
  }

  private hasActiveOrganizationMembership(userId: string): boolean {
    return this.listOrganizationMemberships(userId).some((member) => member.status === 'active');
  }

  recordDeniedAccess(log: DeniedAccessLog) {
    this.deniedAccessLogs.unshift(log);
  }

  listDeniedAccessLogs(userId: string): DeniedAccessLog[] {
    return this.deniedAccessLogs.filter((log) => log.userId === userId);
  }

  createAuditLog(_userId: string, input: AuditLogInput): AuditLog {
    const auditLog: AuditLog = {
      id: `audit_log_${Date.now()}`,
      ...input,
      metadata: sanitizeAuditMetadata(input.metadata),
      createdAt: input.createdAt ?? new Date().toISOString()
    };

    auditLogs.unshift(auditLog);
    return auditLog;
  }

  listAuditLogs(_userId: string, filter: AuditLogFilter = {}): AuditLog[] {
    return auditLogs.filter((log) => matchesAuditFilter(log, filter));
  }

  private findOptimizationUnitForBrand(brandId: BrandId, unitId: string): OptimizationUnit | null {
    return optimizationUnits.find((unit) => unit.brandId === brandId && unit.id === unitId) ?? null;
  }

  private findBrandPromptForBrand(brandId: BrandId, promptId: string): BrandPrompt | null {
    return brandPrompts.find((prompt) => prompt.brandId === brandId && prompt.id === promptId) ?? null;
  }

  private withOptimizationUnitCounts(unit: OptimizationUnit): OptimizationUnit {
    return {
      ...unit,
      relatedCounts: {
        ...unit.relatedCounts,
        userIntents: userIntents.filter((intent) => intent.optimizationUnitId === unit.id).length,
        prompts: brandPrompts.filter((prompt) => prompt.optimizationUnitId === unit.id).length,
        contentStrategies: contentStrategies.filter((strategy) => strategy.optimizationUnitId === unit.id).length,
        tasks: optimizationTasks.filter((task) => task.optimizationUnitId === unit.id).length
      }
    };
  }

  private withIntentMetrics(intent: UserIntent): UserIntent {
    return {
      ...intent,
      platformMetrics: buildIntentMetrics(intent)
    };
  }

  private createPromptFromTemplate(brand: BrandDetail, intent: UserIntent, template: PromptTemplate): BrandPrompt {
    const unit = this.findOptimizationUnitForBrand(brand.brandId, intent.optimizationUnitId);
    const timestamp = new Date().toISOString();
    const text = ensureBrandMention(renderPromptText(template.text, brand, intent, unit), brand);

    return {
      id: `prompt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId: brand.brandId,
      optimizationUnitId: intent.optimizationUnitId,
      intentId: intent.id,
      templateId: template.id,
      text,
      category: intent.category,
      targetKeywords: mergeStringLists(template.targetKeywords, unit?.targetKeywords ?? []),
      platformCodes: template.platformCodes,
      monitoringFrequency: template.frequency,
      enabled: true,
      createdAt: timestamp,
      updatedAt: timestamp
    };
  }

  private executeMonitoringRun(run: MonitoringRun, prompt: BrandPrompt, platform: StoredPlatformConfig) {
    const timestamp = new Date().toISOString();

    if (platform.mode === 'mock') {
      aiResponses.unshift({
        id: `response_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        runId: run.id,
        brandId: run.brandId,
        rawText: `演示回答（${platform.platformCode}）：${prompt.text}`,
        citations: [],
        modelName: platform.modelName ?? 'mock-v1',
        respondedAt: timestamp,
        parseStatus: 'pending',
        createdAt: timestamp
      });
      run.status = 'completed';
      run.completedAt = timestamp;
      return;
    }

    if (platform.mode === 'manual' || platform.mode === 'semi_auto') {
      run.status = 'review_required';
      run.errorMessage = '等待人工录入原始回答';
      return;
    }

    run.status = 'failed';
    run.completedAt = timestamp;
    run.errorMessage = '自动监测暂未接入，请改用浏览器辅助监测或手动录入回答';
    run.retryStatus = 'retry_pending';
  }

  private toMonitoringRunDetail(run: MonitoringRun): MonitoringRunDetail {
    const prompt = brandPrompts.find((item) => item.id === run.promptId);
    const response = aiResponses.find((item) => item.runId === run.id);
    const analysis = response ? analysisResults.find((item) => item.responseId === response.id) : undefined;

    return {
      ...run,
      promptText: prompt?.text ?? '',
      response,
      analysis
    };
  }

  private getAnalysisSamples(brandId: BrandId): AnalysisSample[] {
    return analysisResults
      .filter((analysis) => analysis.brandId === brandId)
      .map((analysis) => {
        const run = monitoringRuns.find((item) => item.id === analysis.runId);
        const prompt = run ? brandPrompts.find((item) => item.id === run.promptId) : undefined;

        return run && prompt ? { analysis, run, prompt, profile: profiles.get(brandId) ?? createEmptyProfile(brandId) } : null;
      })
      .filter((sample): sample is AnalysisSample => Boolean(sample));
  }

  private createSuppressionStrategyIfNeeded(brandId: BrandId, analysis: AnalysisResult) {
    const run = monitoringRuns.find((item) => item.id === analysis.runId);
    if (!run) {
      return;
    }

    const matched = competitors.flatMap((item) => {
      return analysis.competitorMentions
        .filter((mention) => item.brandId === brandId && matchesCompetitor(mention.name, item))
        .map((mention) => ({ competitor: item, mention }));
    })[0];
    if (!matched || !isSuppressedByCompetitor(analysis, matched.mention.name)) {
      return;
    }

    const { competitor } = matched;
    const threshold = competitor.suppressionRule.consecutiveThreshold;
    const recentSuppressed = this.getAnalysisSamples(brandId)
      .filter((sample) => sample.run.intentId === run.intentId && sample.run.platformCode === run.platformCode)
      .filter((sample) => {
        return sample.analysis.competitorMentions.some((mention) => matchesCompetitor(mention.name, competitor) && isSuppressedByCompetitor(sample.analysis, mention.name));
      })
      .length;

    if (recentSuppressed < threshold) {
      return;
    }

    const exists = contentStrategies.some((strategy) => {
      return strategy.brandId === brandId && strategy.intentId === run.intentId && strategy.type === 'competitor_response' && strategy.priority === 'high';
    });
    if (exists) {
      return;
    }

    const prompt = brandPrompts.find((item) => item.id === run.promptId);
    const timestamp = new Date().toISOString();
    contentStrategies.unshift({
      id: `strategy_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId,
      optimizationUnitId: run.optimizationUnitId,
      intentId: run.intentId,
      type: 'competitor_response',
      priority: 'high',
      suggestedTitle: `回应${competitor.name}连续压制场景`,
      targetPlatform: run.platformCode,
      targetKeywords: prompt?.targetKeywords ?? [],
      relatedPromptIds: [run.promptId],
      status: 'draft',
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }

  private syncCitationSources(brand: BrandDetail): CitationSource[] {
    for (const response of aiResponses.filter((item) => item.brandId === brand.brandId)) {
      const run = monitoringRuns.find((item) => item.id === response.runId);
      const prompt = run ? brandPrompts.find((item) => item.id === run.promptId) : null;
      if (!run || !prompt) {
        continue;
      }

      const citationsByUrl = new Map<string, number>();
      for (const rawCitation of response.citations) {
        const url = normalizeCitationUrl(rawCitation);
        if (!url) {
          continue;
        }
        citationsByUrl.set(url, (citationsByUrl.get(url) ?? 0) + 1);
      }

      for (const [url, citationCount] of citationsByUrl) {
        const existing = citationSources.find((source) => source.responseId === response.id && source.url === url);
        const sourceType = classifyCitationSource(url, brand.website);
        const authorityLevel = classifyCitationAuthority(sourceType, url);
        const title = buildCitationTitle(url);
        if (existing) {
          existing.citationCount = citationCount;
          continue;
        }

        citationSources.unshift({
          id: `citation_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          brandId: brand.brandId,
          responseId: response.id,
          runId: run.id,
          promptId: prompt.id,
          promptText: prompt.text,
          platformCode: run.platformCode,
          contentAssetId: contentAssets.find((asset) => asset.brandId === brand.brandId && asset.url === url)?.id,
          title,
          url,
          sourceType,
          authorityLevel,
          citationCount,
          citedAt: response.respondedAt,
          createdAt: new Date().toISOString()
        });
      }
    }

    return citationSources;
  }

  private syncEvaluationIssues(brand: BrandDetail, samples: AnalysisSample[]): EvaluationIssue[] {
    for (const sample of samples) {
      const response = aiResponses.find((item) => item.id === sample.analysis.responseId);
      if (!response) {
        continue;
      }

      for (const draft of buildEvaluationIssueDrafts(brand, sample, response)) {
        const existing = evaluationIssues.find((issue) => (
          issue.responseId === response.id && issue.issueType === draft.issueType && issue.rawFragment === draft.rawFragment
        ));
        const timestamp = new Date().toISOString();
        if (existing) {
          existing.suggestedExpression = draft.suggestedExpression;
          existing.severity = draft.severity;
          existing.updatedAt = timestamp;
          continue;
        }

        evaluationIssues.unshift({
          id: `eval_issue_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          brandId: brand.brandId,
          responseId: response.id,
          runId: sample.run.id,
          promptId: sample.prompt.id,
          promptText: sample.prompt.text,
          platformCode: sample.run.platformCode,
          status: 'open',
          createdAt: timestamp,
          updatedAt: timestamp,
          ...draft
        });
      }
    }

    return evaluationIssues;
  }
}

type AnalysisSample = {
  analysis: AnalysisResult;
  run: MonitoringRun;
  prompt: BrandPrompt;
  profile: BrandProfile;
};

function buildGrowthOptimizationPlanDraft(
  brand: BrandDetail,
  samples: AnalysisSample[],
  sourceTestPlanId?: string
): GrowthOptimizationPlanInput {
  const sourceRunIds = samples.map((sample) => sample.run.id);
  const reasons = buildGrowthOptimizationReasons(samples);
  const contentRecommendations = buildGrowthContentRecommendations(brand, reasons, samples);
  const priority = reasons.some((reason) => ['brand_not_mentioned', 'competitor_stronger', 'risk_expression'].includes(reason.type)) ? 'high' : reasons.length > 0 ? 'medium' : 'low';
  const nowDate = new Date();

  return {
    sourceTestPlanId,
    sourceRunIds,
    summary: buildGrowthOptimizationSummary(samples, reasons),
    reasons,
    priority,
    dueDate: addDays(nowDate, 14).toISOString(),
    publishingPlatforms: inferPublishingPlatforms(samples),
    retestAt: addDays(nowDate, 21).toISOString(),
    contentRecommendations
  };
}

function buildGrowthOptimizationReasons(samples: AnalysisSample[]): GrowthOptimizationReason[] {
  const reasons: GrowthOptimizationReason[] = [];
  const mentionedRate = calculateRate(samples, (sample) => sample.analysis.brandMentioned);
  const topOneRate = calculateRate(samples, (sample) => sample.analysis.brandRank === 1);
  const accurateRate = calculateRate(samples, (sample) => sample.analysis.accuracyScore >= 80);
  const suppressedSamples = samples.filter((sample) => sample.analysis.competitorMentions.some((mention) => isSuppressedByCompetitor(sample.analysis, mention.name)));
  const riskSamples = samples.filter((sample) => sample.analysis.reviewRequired || isBlockedExpressionDeviation(sample.analysis.expressionDeviation));
  const citationGapSamples = samples.filter((sample) => sample.analysis.citationScore === 0);
  const missingSignals = mergeStringLists(...samples.map((sample) => getMissingProfileSignals(aiResponses.find((response) => response.id === sample.analysis.responseId)?.rawText ?? '', sample.profile))).slice(0, 6);

  if (mentionedRate < 80) {
    reasons.push(createGrowthReason('brand_not_mentioned', '推荐率不足', `品牌提及率 ${mentionedRate}%，需要补充品牌基础内容和高频问法覆盖。`, samples.filter((sample) => !sample.analysis.brandMentioned)));
  }
  if (topOneRate < 60) {
    reasons.push(createGrowthReason('ranking_low', '排名靠后', `品牌第一推荐率 ${topOneRate}%，需要强化本地化证据、权威背书和适用场景表达。`, samples.filter((sample) => sample.analysis.brandRank !== 1)));
  }
  if (accurateRate < 80 || missingSignals.length > 0) {
    reasons.push(createGrowthReason('value_prop_missing', '卖点覆盖不足', `准确表达率 ${accurateRate}%，缺口集中在：${missingSignals.join('、') || '核心卖点表达' }。`, samples.filter((sample) => sample.analysis.accuracyScore < 80)));
  }
  if (suppressedSamples.length > 0) {
    reasons.push(createGrowthReason('competitor_stronger', '竞品压制', `有 ${suppressedSamples.length} 条回答中竞品排序靠前，需要生成竞品回应内容。`, suppressedSamples));
  }
  if (riskSamples.length > 0) {
    reasons.push(createGrowthReason('risk_expression', '风险表达需要确认', `有 ${riskSamples.length} 条回答命中风险表达或需要确认状态，需要补充审慎表达。`, riskSamples));
  }
  if (citationGapSamples.length > 0) {
    reasons.push(createGrowthReason('citation_gap', '引用来源不足', `有 ${citationGapSamples.length} 条回答缺少引用来源，需要补充官网 FAQ、媒体素材或社媒内容资产。`, citationGapSamples));
  }
  if (reasons.length === 0 && samples.length > 0) {
    reasons.push(createGrowthReason('content_gap', '持续补充内容', '首轮监测表现稳定，建议继续补充可被 AI 引用的内容资产并安排再次监测。', samples.slice(0, 3)));
  }

  return reasons;
}

function createGrowthReason(type: GrowthOptimizationReason['type'], title: string, evidence: string, samples: AnalysisSample[]): GrowthOptimizationReason {
  return {
    type,
    title,
    evidence,
    relatedRunIds: mergeStringLists(samples.map((sample) => sample.run.id)),
    relatedPromptIds: mergeStringLists(samples.map((sample) => sample.prompt.id))
  };
}

function buildGrowthContentRecommendations(
  brand: BrandDetail,
  reasons: GrowthOptimizationReason[],
  samples: AnalysisSample[]
): GrowthOptimizationContentRecommendation[] {
  const keywords = mergeStringLists(samples.flatMap((sample) => sample.prompt.targetKeywords)).slice(0, 6);
  const recommendations: GrowthOptimizationContentRecommendation[] = [];

  if (reasons.some((reason) => ['brand_not_mentioned', 'value_prop_missing', 'citation_gap'].includes(reason.type))) {
    recommendations.push({
      contentType: 'website_faq',
      title: `${brand.name}首轮 AI 高频问题 FAQ`,
      targetPlatform: 'official_site',
      targetKeywords: keywords,
      reason: '补齐 AI 容易引用的品牌基础资料、适用人群、核心卖点和权威背书。'
    });
  }
  if (reasons.some((reason) => reason.type === 'competitor_stronger' || reason.type === 'ranking_low')) {
    recommendations.push({
      contentType: 'wechat_article',
      title: `${brand.name}与同类机构选择指南`,
      targetPlatform: 'wechat_official',
      targetKeywords: keywords,
      reason: '回应竞品压制场景，强化品牌差异化证据和本地化推荐理由。'
    });
  }
  if (reasons.some((reason) => reason.type === 'risk_expression')) {
    recommendations.push({
      contentType: 'platform_profile_copy',
      title: `${brand.name}平台标准介绍文案`,
      targetPlatform: 'ai_platform_profile',
      targetKeywords: keywords,
      reason: '统一审慎表达，降低高风险承诺被 AI 复述的概率。'
    });
  }

  return recommendations.length ? recommendations : [{
    contentType: 'xiaohongshu_note',
    title: `${brand.name}首轮 AI 内容补强笔记`,
    targetPlatform: 'xiaohongshu',
    targetKeywords: keywords,
    reason: '持续补充品牌场景化内容，为下一次测试积累素材。'
  }];
}

function buildGrowthOptimizationSummary(samples: AnalysisSample[], reasons: GrowthOptimizationReason[]): string {
  if (samples.length === 0) {
    return '暂无测试样本，建议先完成首轮测试后生成优化计划。';
  }

  const mentionedRate = calculateRate(samples, (sample) => sample.analysis.brandMentioned);
  const topOneRate = calculateRate(samples, (sample) => sample.analysis.brandRank === 1);
  const accurateRate = calculateRate(samples, (sample) => sample.analysis.accuracyScore >= 80);

  return `首轮测试样本 ${samples.length} 条，推荐率 ${mentionedRate}%，第一推荐率 ${topOneRate}%，准确表达率 ${accurateRate}%。已识别 ${reasons.length} 个优化原因。`;
}

function inferPublishingPlatforms(samples: AnalysisSample[]): string[] {
  const platforms = mergeStringLists(samples.map((sample) => sample.run.platformCode).filter((platform) => platform !== 'manual_input'));
  return platforms.length ? platforms : ['wechat_official', 'xiaohongshu', 'official_site'];
}

function buildGrowthOptimizationTaskInputs(plan: GrowthOptimizationPlan): OptimizationTaskInput[] {
  const ownerId = plan.ownerId;
  const sourceRunId = plan.sourceRunIds[0];
  const relatedPromptId = plan.reasons.flatMap((reason) => reason.relatedPromptIds)[0];
  const relatedPlatformCode = plan.publishingPlatforms[0];

  return [
    {
      title: '补齐可被 AI 引用的品牌内容',
      type: 'content_strategy',
      ownerId,
      relatedPromptId,
      relatedPlatformCode,
      growthOptimizationPlanId: plan.id,
      sourceRunId,
      dueDate: plan.dueDate,
      priority: plan.priority
    },
    {
      title: `发布优化内容到 ${plan.publishingPlatforms.join('、') || '目标平台'}`,
      type: 'manual',
      ownerId,
      relatedPlatformCode,
      growthOptimizationPlanId: plan.id,
      sourceRunId,
      dueDate: plan.dueDate,
      priority: plan.priority
    },
    {
      title: '补充品牌资料缺口并统一标准表达',
      type: 'evaluation_issue',
      ownerId,
      relatedPromptId,
      growthOptimizationPlanId: plan.id,
      sourceRunId,
      dueDate: plan.dueDate,
      priority: plan.priority
    },
    {
      title: '按原监测问题安排再次监测',
      type: 'monitoring_issue',
      ownerId,
      relatedPromptId,
      relatedPlatformCode,
      growthOptimizationPlanId: plan.id,
      sourceRunId,
      dueDate: plan.retestAt,
      priority: plan.priority
    },
    {
      title: '跟进优化计划负责人和完成状态',
      type: 'manual',
      ownerId,
      growthOptimizationPlanId: plan.id,
      sourceRunId,
      dueDate: plan.dueDate,
      priority: plan.priority
    }
  ];
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

type EvaluationIssueDraft = Pick<EvaluationIssue, 'issueType' | 'rawFragment' | 'suggestedExpression' | 'severity'>;

const issueTypeLabels: Record<EvaluationIssueType, string> = {
  misinformation: '错误信息',
  missing_selling_point: '缺失卖点',
  blocked_expression: '禁用表达',
  negative_expression: '负向表达',
  low_accuracy: '准确性偏低'
};

function buildEvaluationIssueDrafts(brand: BrandDetail, sample: AnalysisSample, response: AIResponse): EvaluationIssueDraft[] {
  const issues: EvaluationIssueDraft[] = [];
  const analysis = sample.analysis;
  const suggestedExpression = buildSuggestedExpression(brand, sample.profile, analysis);

  if (!analysis.brandMentioned) {
    issues.push({
      issueType: 'misinformation',
      rawFragment: truncateText(response.rawText || '回答未提及目标品牌'),
      suggestedExpression,
      severity: 'high'
    });
  }

  if (analysis.sentiment === 'negative') {
    issues.push({
      issueType: 'negative_expression',
      rawFragment: pickSentence(response.rawText, [brand.name, ...brand.aliases]) || truncateText(response.rawText),
      suggestedExpression,
      severity: 'high'
    });
  }

  if (isBlockedExpressionDeviation(analysis.expressionDeviation)) {
    issues.push({
      issueType: 'blocked_expression',
      rawFragment: analysis.expressionDeviation,
      suggestedExpression,
      severity: 'medium'
    });
  }

  const missingSignals = getMissingProfileSignals(response.rawText, sample.profile);
  if (missingSignals.length > 0 && analysis.accuracyScore < 80) {
    issues.push({
      issueType: 'missing_selling_point',
      rawFragment: `缺失卖点：${missingSignals.join('、')}`,
      suggestedExpression: missingSignals.slice(0, 2).join('；'),
      severity: analysis.accuracyScore < 60 ? 'high' : 'medium'
    });
  }

  if (analysis.accuracyScore > 0 && analysis.accuracyScore < 60) {
    issues.push({
      issueType: 'low_accuracy',
      rawFragment: analysis.expressionCompleteness,
      suggestedExpression,
      severity: 'high'
    });
  }

  return issues;
}

function isBlockedExpressionDeviation(expressionDeviation: string): boolean {
  return expressionDeviation.startsWith('命中禁用表达') || expressionDeviation.startsWith('需要你确认：命中高风险或禁用表达');
}

function getMissingProfileSignals(text: string, profile: BrandProfile): string[] {
  return mergeStringLists(profile.valueProps, profile.offerings, profile.proofPoints, profile.recommendedExpressions)
    .filter((signal) => !text.includes(signal));
}

function buildSuggestedExpression(brand: BrandDetail, profile: BrandProfile, analysis: AnalysisResult): string {
  const coreSignals = mergeStringLists(profile.recommendedExpressions, profile.valueProps, profile.offerings).slice(0, 2);
  if (coreSignals.length > 0) {
    return `${brand.name}${coreSignals.join('，')}`;
  }

  return analysis.brandMentioned ? `${brand.name}的核心优势需要按品牌知识库标准表达` : `回答应明确提及${brand.name}`;
}

function truncateText(text: string, maxLength = 120): string {
  const value = text.trim();
  return value.length > maxLength ? `${value.slice(0, maxLength)}...` : value;
}

function buildEvaluationTrend(samples: AnalysisSample[]): EvaluationDashboard['trend'] {
  const grouped = new Map<string, AnalysisSample[]>();
  for (const sample of samples) {
    const response = aiResponses.find((item) => item.id === sample.analysis.responseId);
    const date = (response?.respondedAt ?? sample.analysis.updatedAt).slice(0, 10);
    grouped.set(date, [...(grouped.get(date) ?? []), sample]);
  }

  return Array.from(grouped.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, daySamples]) => ({
      date,
      sampleCount: daySamples.length,
      positiveRate: calculateRate(daySamples, (sample) => sample.analysis.sentiment === 'positive'),
      neutralRate: calculateRate(daySamples, (sample) => sample.analysis.sentiment === 'neutral'),
      negativeRate: calculateRate(daySamples, (sample) => sample.analysis.sentiment === 'negative'),
      accurateRate: calculateRate(daySamples, (sample) => sample.analysis.accuracyScore >= 80)
    }));
}

function buildEvaluationIssueBreakdown(issues: EvaluationIssue[]): EvaluationDashboard['issueTypeBreakdown'] {
  const types: EvaluationIssueType[] = ['misinformation', 'missing_selling_point', 'blocked_expression', 'negative_expression', 'low_accuracy'];
  const activeIssues = issues.filter((issue) => issue.status !== 'resolved');

  return types.map((issueType) => {
    const count = activeIssues.filter((issue) => issue.issueType === issueType).length;

    return {
      issueType,
      count,
      rate: activeIssues.length === 0 ? 0 : clampScore((count / activeIssues.length) * 100)
    };
  });
}

function buildContentCoverage(brandId: BrandId, assets: ContentAsset[]): ContentCenterDashboard['coverage'] {
  const expectedKeywords = getExpectedContentKeywords(brandId);
  const coveredKeywords = new Set(assets.flatMap((asset) => asset.targetKeywords));
  const uncoveredKeywords = expectedKeywords.filter((keyword) => !coveredKeywords.has(keyword));

  return {
    keywordCoverageRate: expectedKeywords.length === 0 ? 0 : clampScore(((expectedKeywords.length - uncoveredKeywords.length) / expectedKeywords.length) * 100),
    uncoveredKeywords,
    publishedAssetCount: assets.filter((asset) => asset.status === 'published').length,
    reusableAssetCount: assets.filter((asset) => Boolean(asset.reuseOfAssetId) || Boolean(asset.brandAdaptation)).length
  };
}

function buildContentStrategySuggestions(
  brandId: BrandId,
  samples: AnalysisSample[],
  assets: ContentAsset[],
  existingStrategies: ContentStrategy[]
): ContentStrategySuggestion[] {
  const suggestions: ContentStrategySuggestion[] = [];
  const coveredKeywords = new Set(assets.flatMap((asset) => asset.targetKeywords));
  const seen = new Set(existingStrategies.map((strategy) => `${strategy.type}:${strategy.intentId}:${strategy.targetPlatform}:${strategy.relatedPromptIds.join(',')}`));

  for (const sample of samples) {
    const promptKeywords = mergeStringLists(sample.prompt.targetKeywords, sample.profile.valueProps, sample.profile.recommendedExpressions);
    const uncovered = promptKeywords.filter((keyword) => !coveredKeywords.has(keyword));
    const base = {
      optimizationUnitId: sample.run.optimizationUnitId,
      intentId: sample.run.intentId,
      targetPlatform: sample.run.platformCode,
      relatedPromptIds: [sample.prompt.id]
    };

    if (uncovered.length > 0) {
      pushContentSuggestion(suggestions, seen, {
        ...base,
        type: 'gap',
        priority: sample.analysis.brandMentioned ? 'medium' : 'high',
        suggestedTitle: `补齐${uncovered[0]}内容资产`,
        targetKeywords: uncovered.slice(0, 5),
        reason: '目标关键词未被现有内容资产覆盖'
      });
    }

    if (sample.analysis.accuracyScore < 80 || sample.analysis.reviewRequired) {
      pushContentSuggestion(suggestions, seen, {
        ...base,
        type: 'correction',
        priority: sample.analysis.accuracyScore < 60 ? 'high' : 'medium',
        suggestedTitle: `修正${sample.prompt.text.slice(0, 18)}表达偏差`,
        targetKeywords: promptKeywords.slice(0, 5),
        reason: sample.analysis.expressionDeviation
      });
    }

    if (sample.analysis.citationScore < 50) {
      pushContentSuggestion(suggestions, seen, {
        ...base,
        type: 'authority_citation',
        priority: 'high',
        suggestedTitle: `增强${sample.prompt.text.slice(0, 18)}权威引用`,
        targetKeywords: promptKeywords.slice(0, 5),
        reason: 'AI 回答引用来源不足，需要补充官网、媒体或权威内容资产'
      });
    }

    if (sample.analysis.competitorMentions.some((mention) => isSuppressedByCompetitor(sample.analysis, mention.name))) {
      pushContentSuggestion(suggestions, seen, {
        ...base,
        type: 'competitor_response',
        priority: 'high',
        suggestedTitle: `回应${sample.analysis.competitorMentions[0]?.name ?? '竞品'}推荐压制`,
        targetKeywords: promptKeywords.slice(0, 5),
        reason: '竞品在同 Prompt 下位于品牌之前'
      });
    }

    if (sample.analysis.brandMentioned && sample.analysis.accuracyScore >= 80 && uncovered.length === 0) {
      pushContentSuggestion(suggestions, seen, {
        ...base,
        type: 'enhancement',
        priority: 'low',
        suggestedTitle: `增强${sample.prompt.text.slice(0, 18)}场景内容`,
        targetKeywords: promptKeywords.slice(0, 5),
        reason: '当前表达基础良好，可做关键词增强和多平台复用'
      });
    }
  }

  if (samples.length === 0) {
    const unit = optimizationUnits.find((item) => item.brandId === brandId && item.enabled);
    const intent = unit ? userIntents.find((item) => item.brandId === brandId && item.optimizationUnitId === unit.id && item.enabled) : undefined;
    const prompt = intent ? brandPrompts.find((item) => item.brandId === brandId && item.intentId === intent.id && item.enabled) : undefined;
    const uncovered = getExpectedContentKeywords(brandId).filter((keyword) => !coveredKeywords.has(keyword));
    if (unit && intent && prompt && uncovered.length > 0) {
      pushContentSuggestion(suggestions, seen, {
        type: 'gap',
        priority: 'medium',
        suggestedTitle: `补齐${uncovered[0]}基础内容资产`,
        targetPlatform: prompt.platformCodes[0] ?? 'official_site',
        targetKeywords: uncovered.slice(0, 5),
        optimizationUnitId: unit.id,
        intentId: intent.id,
        relatedPromptIds: [prompt.id],
        reason: '品牌知识库关键词未被内容资产覆盖'
      });
    }
  }

  return suggestions;
}

function pushContentSuggestion(suggestions: ContentStrategySuggestion[], seen: Set<string>, suggestion: ContentStrategySuggestion) {
  const key = `${suggestion.type}:${suggestion.intentId}:${suggestion.targetPlatform}:${suggestion.relatedPromptIds.join(',')}`;
  if (seen.has(key)) {
    return;
  }

  seen.add(key);
  suggestions.push(suggestion);
}

function getExpectedContentKeywords(brandId: BrandId): string[] {
  const profile = profiles.get(brandId) ?? createEmptyProfile(brandId);
  const unitKeywords = optimizationUnits
    .filter((unit) => unit.brandId === brandId && unit.enabled)
    .flatMap((unit) => unit.targetKeywords);

  return mergeStringLists(profile.valueProps, profile.offerings, profile.proofPoints, profile.recommendedExpressions, unitKeywords);
}

export function calculateBrandProfileCompleteness(
  brand: Pick<BrandDetail, 'businessScope' | 'targetAudience'>,
  profile: BrandProfileInput
): BrandProfileCompleteness {
  const checks = buildCompletenessChecks(brand, profile);
  const completedCount = checks.filter((item) => item.complete).length;
  const missingChecks = checks.filter((item) => !item.complete);

  return {
    score: Math.round((completedCount / checks.length) * 100),
    missingFields: missingChecks.map((item) => item.label),
    prompts: missingChecks.map(({ field, label, impact, prompt }) => ({ field, label, impact, prompt }))
  };
}

function buildCompletenessChecks(
  brand: Pick<BrandDetail, 'businessScope' | 'targetAudience'>,
  profile: BrandProfileInput
): Array<BrandProfileCompletenessPrompt & { complete: boolean }> {
  return [
    {
      field: 'intro',
      label: '品牌介绍',
      complete: hasText(profile.intro),
      impact: 'AI 难以形成稳定的品牌基础认知，回答中容易出现泛化描述。',
      prompt: '请用 2-3 句话说明品牌是谁、服务谁、主要解决什么问题。'
    },
    {
      field: 'businessScope',
      label: '业务范围',
      complete: hasText(brand.businessScope) || profile.offerings.length > 0,
      impact: '系统生成测试问法时缺少业务边界，容易混入无关场景。',
      prompt: '请填写品牌提供的主要产品、课程或服务范围。'
    },
    {
      field: 'valueProps',
      label: '核心卖点',
      complete: profile.valueProps.length > 0,
      impact: 'AI 回答较难突出品牌优势，推荐理由会变弱。',
      prompt: '请列出 3-5 条最希望 AI 提到的品牌优势。'
    },
    {
      field: 'faqs',
      label: 'FAQ',
      complete: profile.faqs.some((faq) => hasText(faq.question) && hasText(faq.answer)),
      impact: '常见用户问题缺少标准答案，后续纠偏和内容生成依据不足。',
      prompt: '请补充用户最常问的 3 个问题及标准回答。'
    },
    {
      field: 'competitors',
      label: '竞品',
      complete: profile.competitors.length > 0,
      impact: '竞品对比和推荐压制诊断会缺少参照对象。',
      prompt: '请列出 3-5 个同城或同品类竞品名称。'
    },
    {
      field: 'targetCustomers',
      label: '用户画像',
      complete: hasText(brand.targetAudience) || profile.targetCustomers.length > 0,
      impact: '测试问法难以贴近真实决策人群，内容建议会偏泛。',
      prompt: '请描述核心用户是谁、处于什么场景、最关心什么。'
    },
    {
      field: 'proofPoints',
      label: '权威背书',
      complete: profile.proofPoints.length > 0,
      impact: 'AI 回答中的可信证据不足，品牌被推荐时说服力较弱。',
      prompt: '请补充资质认证、创始团队、规模、奖项或真实案例。'
    },
    {
      field: 'blockedExpressions',
      label: '禁用表达',
      complete: profile.blockedExpressions.length > 0,
      impact: '内容生成和纠偏时缺少风险边界，容易出现夸大承诺。',
      prompt: '请列出品牌严禁使用的宣传词、承诺或敏感表达。'
    }
  ];
}

function createEmptyProfile(brandId: BrandId): BrandProfile {
  const input = normalizeProfileInput({
    intro: '',
    valueProps: [],
    offerings: [],
    proofPoints: [],
    targetCustomers: [],
    recommendedExpressions: [],
    blockedExpressions: [],
    contentRules: [],
    competitors: [],
    faqs: []
  });

  return {
    brandId,
    ...input,
    completenessScore: 0,
    missingFields: ['品牌介绍', '业务范围', '核心卖点', 'FAQ', '竞品', '用户画像', '权威背书', '禁用表达'],
    completenessPrompts: calculateBrandProfileCompleteness({ businessScope: '', targetAudience: '' }, input).prompts,
    updatedAt: now
  };
}

function createEmptyVisibilitySprintMetricSummary(): VisibilitySprintMetricSummary {
  return {
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
  };
}

function createDefaultVisibilitySprintSteps(currentStep: VisibilitySprint['currentStep']): VisibilitySprintStep[] {
  const steps: Array<Pick<VisibilitySprintStep, 'code' | 'title' | 'message'>> = [
    { code: 'question_radar', title: '问题雷达', message: '选择本轮高价值问题。' },
    { code: 'ai_response_monitoring', title: 'AI 回复监测', message: '获取真实 AI 回复或手动录入真实回复。' },
    { code: 'standard_answer_alignment', title: '标准答案对照', message: '对照品牌标准答案与真实回复差异。' },
    { code: 'gap_diagnosis', title: '缺口诊断', message: '识别内容缺口、引用缺口和风险表达。' },
    { code: 'content_asset_generation', title: '内容资产生成', message: '生成可审稿的内容补强草稿。' },
    { code: 'publishing_preparation', title: '发布准备', message: '准备平台改写和人工发布待办。' },
    { code: 'retest_and_trend', title: '复测趋势', message: '安排复测并观察指标变化。' },
    { code: 'completed', title: '完成', message: '本轮 Sprint 已完成。' }
  ];
  const currentIndex = steps.findIndex((step) => step.code === currentStep);

  return steps.map((step, index) => ({
    ...step,
    status: currentStep === 'completed' || index < currentIndex ? 'completed' : index === currentIndex ? 'running' : 'pending',
    relatedEntityIds: []
  }));
}

function normalizeProfileInput(input: BrandProfileInput): BrandProfileInput {
  return {
    intro: input.intro?.trim() ?? '',
    valueProps: normalizeStringList(input.valueProps),
    offerings: normalizeStringList(input.offerings),
    proofPoints: normalizeStringList(input.proofPoints),
    targetCustomers: normalizeStringList(input.targetCustomers),
    recommendedExpressions: normalizeStringList(input.recommendedExpressions),
    blockedExpressions: normalizeStringList(input.blockedExpressions),
    contentRules: normalizeStringList(input.contentRules),
    competitors: normalizeStringList(input.competitors),
    faqs: normalizeFaqs(input.faqs)
  };
}

function normalizeStringList(values: string[] = []): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function cleanStringList(values: string[] = []): string[] {
  return normalizeStringList(values);
}

function cleanStandardAnswerEvidence(values: BrandStandardAnswerEvidence[] = []): BrandStandardAnswerEvidence[] {
  return values
    .map((item) => ({
      label: item.label.trim(),
      sourceType: item.sourceType,
      ...(item.sourceId?.trim() ? { sourceId: item.sourceId.trim() } : {}),
      excerpt: item.excerpt.trim()
    }))
    .filter((item) => hasText(item.label) && hasText(item.excerpt));
}

function normalizeCompetitorMentions(values: CompetitorMention[] = []): CompetitorMention[] {
  return values
    .map((value) => ({
      name: value.name.trim(),
      rank: value.rank ?? null,
      sentiment: normalizeSentiment(value.sentiment)
    }))
    .filter((value) => hasText(value.name));
}

function normalizeFaqs(faqs: BrandFaq[] = []): BrandFaq[] {
  return faqs
    .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
    .filter((faq) => hasText(faq.question) || hasText(faq.answer));
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function normalizeKnowledgeSourceInput(input: KnowledgeSourceInput): KnowledgeSourceInput {
  return {
    name: input.name.trim(),
    sourceType: input.sourceType,
    sourceUrl: input.sourceUrl?.trim(),
    fileRef: input.fileRef?.trim(),
    status: input.status
  };
}

function normalizeOptimizationUnitInput(
  input: OptimizationUnitInput
): Omit<OptimizationUnitInput, 'targetKeywords' | 'enabled'> & { targetKeywords: string[]; enabled: boolean } {
  return {
    name: input.name.trim(),
    type: input.type,
    targetKeywords: normalizeStringList(input.targetKeywords),
    priority: input.priority,
    enabled: input.enabled ?? true
  };
}

function normalizePartialOptimizationUnitInput(input: Partial<OptimizationUnitInput>): Partial<OptimizationUnitInput> {
  return {
    name: input.name?.trim(),
    type: input.type,
    targetKeywords: input.targetKeywords ? normalizeStringList(input.targetKeywords) : undefined,
    priority: input.priority,
    enabled: input.enabled
  };
}

function normalizeTestThemeInput(input: TestThemeInput): TestThemeInput {
  return {
    type: input.type,
    name: input.name.trim(),
    businessExplanation: input.businessExplanation.trim(),
    priority: input.priority,
    estimatedValue: input.estimatedValue.trim(),
    enabled: input.enabled ?? true,
    sourceProfileFields: normalizeBrandImportFieldKeys(input.sourceProfileFields)
  };
}

function normalizePartialTestThemeInput(input: Partial<TestThemeInput>): Partial<TestThemeInput> {
  return {
    type: input.type,
    name: input.name?.trim(),
    businessExplanation: input.businessExplanation?.trim(),
    priority: input.priority,
    estimatedValue: input.estimatedValue?.trim(),
    enabled: input.enabled,
    sourceProfileFields: input.sourceProfileFields ? normalizeBrandImportFieldKeys(input.sourceProfileFields) : undefined
  };
}

function normalizeTestQuestionCandidateInput(input: TestQuestionCandidateInput): TestQuestionCandidateInput {
  return {
    themeId: input.themeId,
    promptId: input.promptId?.trim(),
    question: input.question.trim(),
    purposes: normalizeTestQuestionPurposes(input.purposes),
    targetPlatforms: normalizeStringList(input.targetPlatforms),
    priority: input.priority,
    estimatedValue: input.estimatedValue.trim(),
    editable: input.editable ?? true,
    selected: input.selected ?? false
  };
}

function normalizePartialTestQuestionCandidateInput(input: TestQuestionCandidateUpdateInput): TestQuestionCandidateUpdateInput {
  return {
    themeId: input.themeId,
    promptId: input.promptId?.trim(),
    question: input.question?.trim(),
    purposes: input.purposes ? normalizeTestQuestionPurposes(input.purposes) : undefined,
    targetPlatforms: input.targetPlatforms ? normalizeStringList(input.targetPlatforms) : undefined,
    priority: input.priority,
    estimatedValue: input.estimatedValue?.trim(),
    editable: input.editable,
    selected: input.selected
  };
}

function filterTestQuestionCandidates(
  candidates: TestQuestionCandidate[],
  brandId: BrandId,
  query: TestQuestionCandidateListQuery = {}
): TestQuestionCandidate[] {
  const priorities: Record<TestQuestionCandidate['priority'], number> = { high: 0, medium: 1, low: 2 };
  const offset = Math.max(0, query.offset ?? 0);
  const limit = query.limit && query.limit > 0 ? query.limit : undefined;
  const filtered = candidates
    .filter((candidate) => candidate.brandId === brandId)
    .filter((candidate) => !query.themeId || candidate.themeId === query.themeId)
    .filter((candidate) => query.selected === undefined || candidate.selected === query.selected)
    .sort((first, second) => priorities[first.priority] - priorities[second.priority] || second.createdAt.localeCompare(first.createdAt));

  return limit ? filtered.slice(offset, offset + limit) : filtered.slice(offset);
}

function resolveTestPlanCandidates(brandId: BrandId, input: TestPlanInput): TestQuestionCandidate[] {
  const candidateIds = input.candidateIds?.length ? new Set(input.candidateIds) : null;

  return filterTestQuestionCandidates(testQuestionCandidates, brandId)
    .filter((candidate) => candidateIds ? candidateIds.has(candidate.id) : candidate.selected);
}

function toTestPlanQuestion(candidate: TestQuestionCandidate): TestPlan['questions'][number] {
  return {
    candidateId: candidate.id,
    promptId: candidate.promptId,
    question: candidate.question,
    purposes: candidate.purposes,
    targetPlatforms: candidate.targetPlatforms
  };
}

function normalizeTestPlanPlatformCodes(platformCodes: Array<string | undefined>): string[] {
  return Array.from(new Set(platformCodes.map((platformCode) => platformCode?.trim()).filter((platformCode): platformCode is string => Boolean(platformCode))));
}

function normalizeManualTestAnswerInput(input: ManualTestAnswerInput): ManualTestAnswerInput {
  return {
    testPlanId: input.testPlanId?.trim() ?? '',
    question: input.question?.trim() ?? '',
    platformCode: input.platformCode?.trim() ?? '',
    rawText: input.rawText?.trim() ?? '',
    citations: normalizeStringList(input.citations),
    modelName: input.modelName?.trim()
  };
}

function findManualAnswerQuestion(plan: TestPlan, questionText: string, platformCode: string): TestPlan['questions'][number] | null {
  const normalizedQuestion = questionText.trim();
  const normalizedPlatformCode = platformCode.trim();

  return plan.questions.find((question) => (
    question.question.trim() === normalizedQuestion && question.targetPlatforms.includes(normalizedPlatformCode)
  )) ?? null;
}

function buildConnectionSummary(brandId: BrandId, platformCodes: string[]): TestPlan['connectionSummary'] {
  return platformCodes.map((platformCode) => {
    const config = platformConfigs.find((item) => item.brandId === brandId && item.platformCode === platformCode && item.enabled);

    if (!config) {
      return {
        platformCode,
        name: platformCode,
        methods: ['manual'],
        status: 'needs_configuration',
        hasCredential: false,
        message: '这个平台还没有选择测试方式，可以先保留在计划中，后续再补充平台连接。'
      };
    }

    if (config.mode === 'api') {
      return {
        platformCode,
        name: config.name,
        methods: ['api'],
        status: config.credentialRef ? 'ready' : 'needs_configuration',
        hasCredential: Boolean(config.credentialRef),
        message: config.credentialRef ? '可以自动监测。' : '需要填写平台密钥后才能自动监测。'
      };
    }

    if (config.mode === 'semi_auto') {
      return {
        platformCode,
        name: config.name,
        methods: ['api', 'browser', 'manual'],
        status: 'needs_confirmation',
        hasCredential: Boolean(config.credentialRef),
        message: '平台接口和模型已预置；补齐平台密钥可自动监测，也可先用浏览器或手动录入。'
      };
    }

    if (config.mode === 'mock') {
      return {
        platformCode,
        name: config.name,
        methods: ['api'],
        status: 'ready',
        hasCredential: false,
        message: '演示平台可以直接监测。'
      };
    }

    return {
      platformCode,
      name: config.name,
      methods: ['manual'],
      status: 'manual_available',
      hasCredential: false,
      message: '可通过手动录入回答完成监测。'
    };
  });
}

function buildTestPlanConfirmationItems(connectionSummary: TestPlan['connectionSummary']): string[] {
  return connectionSummary.flatMap((summary) => {
    if (summary.status === 'needs_configuration') {
      return [`${summary.name} 需要先补充平台连接信息`];
    }

    if (summary.status === 'needs_confirmation') {
      return [`${summary.name} 需要确认浏览器登录或切换手动录入`];
    }

    return [];
  });
}

function inferExecutionMethod(connectionSummary: TestPlan['connectionSummary']): TestPlan['executionMethod'] {
  if (connectionSummary.some((summary) => summary.status === 'ready' && summary.methods.includes('api'))) return 'api';
  if (connectionSummary.some((summary) => summary.methods.includes('browser'))) return 'browser';

  return 'manual';
}

function inferTestPlanStatus(connectionSummary: TestPlan['connectionSummary']): TestPlan['status'] {
  if (connectionSummary.some((summary) => summary.status === 'needs_configuration')) return 'needs_configuration';
  if (connectionSummary.some((summary) => summary.status === 'needs_confirmation')) return 'needs_confirmation';

  return 'ready';
}

function estimateTestPlanDuration(questionCount: number, platformCount: number): number {
  return Math.max(5, questionCount * platformCount * 2);
}

function executeTestPlanSteps(
  plan: TestPlan,
  createRun: (question: TestPlan['questions'][number], platformCode: string) => MonitoringRunDetail | null,
  executeBrowserQuestion?: (question: TestPlan['questions'][number], platformCode: string) => BrowserTestPlanStepResult | null,
  executeApiQuestion?: (question: TestPlan['questions'][number], platformCode: string) => MonitoringRunDetail | null
): TestPlanExecutionResult {
  const apiRuns: MonitoringRunDetail[] = [];
  const browserSteps: TestPlanExecutionResult['browserSteps'] = [];
  const manualSteps: TestPlanExecutionResult['manualSteps'] = [];
  const configurationItems: TestPlanExecutionResult['configurationItems'] = [];
  const skippedSteps: TestPlanExecutionResult['skippedSteps'] = [];

  plan.questions.forEach((question) => {
    question.targetPlatforms.forEach((platformCode) => {
      const summary = plan.connectionSummary.find((item) => item.platformCode === platformCode);
      if (!summary || summary.status === 'needs_configuration') {
        configurationItems.push({
          question: question.question,
          platformCode,
          method: 'manual',
          status: 'needs_configuration',
          promptId: question.promptId,
            message: summary?.message ?? '这个平台还没有选择测试方式。'
        });
        return;
      }

      if (summary.status === 'ready' && summary.methods.includes('api')) {
        if (!question.promptId) {
          skippedSteps.push({
            question: question.question,
            platformCode,
            method: 'api',
            status: 'skipped',
            message: '这个问题还没有准备好，暂时无法自动监测。'
          });
          return;
        }

        const run = executeApiQuestion?.(question, platformCode) ?? createRun(question, platformCode);
        if (run) {
          apiRuns.push(run);
          return;
        }

        skippedSteps.push({
          question: question.question,
          platformCode,
          method: 'api',
          status: 'skipped',
          promptId: question.promptId,
          message: '自动监测创建失败，请检查监测问题和平台连接信息。'
        });
        return;
      }

      if (summary.methods.includes('browser')) {
        if (!question.promptId) {
          browserSteps.push({
            question: question.question,
            platformCode,
            method: 'browser',
            status: 'needs_confirmation',
            message: '该问题尚未关联 Prompt，需要先确认问题或切换为手动录入。'
          });
          return;
        }

        const browserResult = executeBrowserQuestion?.(question, platformCode);
        if (browserResult?.run) {
          browserSteps.push({
            question: question.question,
            platformCode,
            method: 'browser',
            status: 'queued',
            promptId: question.promptId,
            runId: browserResult.run.id,
            message: browserResult.message
          });
          return;
        }

        browserSteps.push({
          question: question.question,
          platformCode,
          method: 'browser',
          status: browserResult?.status ?? 'needs_confirmation',
          promptId: question.promptId,
          message: browserResult?.message ?? summary.message ?? '需要确认浏览器登录状态后继续测试。'
        });
        return;
      }

      manualSteps.push({
        question: question.question,
        platformCode,
        method: 'manual',
        status: 'manual_required',
        promptId: question.promptId,
        message: summary.message ?? '需要手动提交问题并录入回答。'
      });
    });
  });

  return {
    plan,
    status: inferExecutedTestPlanStatus(
      apiRuns.length,
      browserSteps.filter((step) => step.status === 'queued').length,
      browserSteps.filter((step) => step.status !== 'queued').length,
      manualSteps.length,
      configurationItems.length
    ),
    apiRuns,
    browserSteps,
    manualSteps,
    configurationItems,
    skippedSteps,
    confirmationItems: Array.from(new Set([...plan.confirmationItems, ...configurationItems.map((item) => item.message), ...browserSteps.map((item) => item.message)]))
  };
}

function applyTestPlanExecutionResult(plan: TestPlan, result: TestPlanExecutionResult) {
  plan.status = result.status;
  plan.monitoringRunIds = Array.from(new Set([
    ...plan.monitoringRunIds,
    ...result.apiRuns.map((run) => run.id),
    ...result.browserSteps.map((step) => step.runId).filter((runId): runId is string => Boolean(runId))
  ]));
  plan.confirmationItems = result.confirmationItems;
  plan.updatedAt = new Date().toISOString();
}

function inferExecutedTestPlanStatus(apiRunCount: number, browserRunCount: number, browserPendingCount: number, manualStepCount: number, configurationItemCount: number): TestPlan['status'] {
  if (apiRunCount > 0 || browserRunCount > 0) return 'running';
  if (configurationItemCount > 0 && browserPendingCount === 0 && manualStepCount === 0) return 'needs_configuration';
  if (configurationItemCount > 0) return 'needs_configuration';

  return 'needs_confirmation';
}

type BrowserTestPlanStepResult = {
  status: TestPlanExecutionStep['status'];
  message: string;
  run?: MonitoringRunDetail;
};

function buildMemoryBrowserPendingResult(platformCode: string): BrowserTestPlanStepResult {
  const platform = supportedBrowserPlatformMetadata[platformCode];
  if (!platform) {
    return { status: 'needs_confirmation', message: '这个平台暂时不能用浏览器辅助监测，请改用手动录入。' };
  }

  return {
    status: 'needs_confirmation',
    message: `${platform.displayName}浏览器自动执行尚未接入真实回答回填，请连接真实浏览器或改用手动录入后再分析。`
  };
}

const supportedBrowserPlatformMetadata: Record<string, { displayName: string; modelName: string }> = {
  doubao: { displayName: '豆包', modelName: 'doubao-browser' },
  kimi: { displayName: 'Kimi', modelName: 'kimi-browser' },
  deepseek: { displayName: 'DeepSeek', modelName: 'deepseek-browser' },
  qianwen: { displayName: '通义千问', modelName: 'qianwen-browser' }
};

const testPlanTemplates: TestPlanTemplate[] = [
  {
    id: 'children_sports_local_growth',
    name: '儿童运动本地增长模板',
    industryKeywords: ['儿童运动', '儿童体适能', '运动教育', '少儿运动', '体能'],
    cityRequired: true,
    description: '适合本地儿童运动、少儿体能、体操、跑酷和中考体测品牌的首轮 AI 回复监测。',
    recommended: false,
    analysisFocus: ['brand_mentioned', 'rank_first', 'value_prop_accuracy', 'risk_expression'],
    platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']
  },
  {
    id: 'generic_brand_first_round',
    name: '通用品牌首轮测试模板',
    industryKeywords: [],
    cityRequired: false,
    description: '适合缺少行业模板时快速启动品牌认知、品类推荐和购买决策测试。',
    recommended: false,
    analysisFocus: ['brand_mentioned', 'rank_first', 'value_prop_accuracy', 'competitor_presence'],
    platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']
  }
];

function recommendTestPlanTemplates(brand: BrandDetail): TestPlanTemplate[] {
  const brandText = [brand.industry, brand.businessScope, brand.targetAudience].join(' ');
  const hasCity = brand.targetCities.some((city) => city.trim());
  const templates = testPlanTemplates.map((template) => ({
    ...template,
    recommended: template.id === 'generic_brand_first_round'
      ? !testPlanTemplates.some((candidate) => candidate.id !== template.id && matchesTestPlanTemplate(candidate, brandText, hasCity))
      : matchesTestPlanTemplate(template, brandText, hasCity)
  }));

  return templates.sort((first, second) => Number(second.recommended) - Number(first.recommended));
}

function selectTestPlanTemplate(brand: BrandDetail, templateId: string): TestPlanTemplate | null {
  const templates = recommendTestPlanTemplates(brand);

  return templates.find((template) => template.id === templateId) ?? null;
}

function matchesTestPlanTemplate(template: TestPlanTemplate, brandText: string, hasCity: boolean): boolean {
  if (template.cityRequired && !hasCity) return false;
  if (template.industryKeywords.length === 0) return true;

  return template.industryKeywords.some((keyword) => brandText.includes(keyword));
}

function buildTemplateQuestions(brand: BrandDetail, template: TestPlanTemplate): TestPlan['questions'] {
  const city = brand.targetCities[0]?.trim();
  const brandName = brand.name.trim();
  const category = brand.industry.trim() || brand.businessScope.trim() || '品牌服务';

  if (template.id === 'children_sports_local_growth') {
    return [
      {
        question: `${city || '本地'}有哪些值得推荐的儿童运动成长机构？`,
        purposes: ['brand_mentioned', 'rank_first', 'competitor_presence'],
        targetPlatforms: template.platformCodes
      },
      {
        question: `${city || '本地'}哪里有适合 3-5 岁孩子的体能馆？`,
        purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
        targetPlatforms: template.platformCodes
      },
      {
        question: `${brandName}适合哪些孩子？选择前需要重点了解什么？`,
        purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
        targetPlatforms: template.platformCodes
      }
    ];
  }

  return [
    {
      question: `${brandName}是做什么的？适合哪些用户？`,
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
      targetPlatforms: template.platformCodes
    },
    {
      question: `${city ? `${city} ` : ''}有哪些值得推荐的${category}品牌？`,
      purposes: ['brand_mentioned', 'rank_first', 'competitor_presence'],
      targetPlatforms: template.platformCodes
    },
    {
      question: `选择${brandName}前，需要重点比较哪些信息？`,
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
      targetPlatforms: template.platformCodes
    }
  ];
}

function normalizeTestQuestionPurposes(purposes: TestQuestionPurpose[] = []): TestQuestionPurpose[] {
  const allowed = new Set<TestQuestionPurpose>(['brand_mentioned', 'rank_first', 'value_prop_accuracy', 'competitor_presence', 'risk_expression']);
  const normalized = purposes.filter((purpose): purpose is TestQuestionPurpose => allowed.has(purpose));

  return normalized.length > 0 ? normalized : ['brand_mentioned'];
}

function normalizeBrandImportFieldKeys(fields: TestThemeInput['sourceProfileFields'] = []): BrandImportFieldKey[] {
  const allowed = new Set<BrandImportFieldKey>([
    'name',
    'aliases',
    'industry',
    'website',
    'targetCities',
    'businessScope',
    'targetAudience',
    'intro',
    'valueProps',
    'offerings',
    'proofPoints',
    'targetCustomers',
    'recommendedExpressions',
    'blockedExpressions',
    'contentRules',
    'competitors',
    'faqs'
  ]);

  return fields.filter((field): field is BrandImportFieldKey => allowed.has(field));
}

function createEmptyOptimizationUnitCounts(): OptimizationUnit['relatedCounts'] {
  return {
    userIntents: 0,
    prompts: 0,
    contentStrategies: 0,
    monitoringRuns: 0,
    tasks: 0
  };
}

function normalizeUserIntentInput(input: UserIntentInput): UserIntentInput {
  return {
    optimizationUnitId: input.optimizationUnitId,
    category: input.category,
    text: input.text.trim(),
    monitoringFrequency: input.monitoringFrequency,
    enabled: input.enabled ?? true
  };
}

function normalizePartialUserIntentInput(input: Partial<UserIntentInput>): Partial<UserIntentInput> {
  return {
    optimizationUnitId: input.optimizationUnitId,
    category: input.category,
    text: input.text?.trim(),
    monitoringFrequency: input.monitoringFrequency,
    enabled: input.enabled
  };
}

function normalizePromptTemplateInput(
  input: PromptTemplateInput
): Omit<PromptTemplateInput, 'targetKeywords'> & { targetKeywords: string[] } {
  return {
    name: input.name.trim(),
    industry: input.industry?.trim(),
    category: input.category,
    text: input.text.trim(),
    targetKeywords: normalizeStringList(input.targetKeywords),
    platformCodes: normalizeStringList(input.platformCodes),
    frequency: input.frequency
  };
}

function normalizePartialBrandPromptInput(input: Partial<BrandPromptInput>): Partial<BrandPromptInput> {
  return {
    text: input.text?.trim(),
    targetKeywords: input.targetKeywords ? normalizeStringList(input.targetKeywords) : undefined,
    platformCodes: input.platformCodes ? normalizeStringList(input.platformCodes) : undefined,
    monitoringFrequency: input.monitoringFrequency,
    enabled: input.enabled
  };
}

function normalizeCompetitorInput(input: CompetitorInput): Omit<Competitor, 'id' | 'brandId' | 'createdAt' | 'updatedAt'> {
  return {
    name: input.name.trim(),
    aliases: normalizeStringList(input.aliases),
    website: input.website?.trim(),
    industryTags: normalizeStringList(input.industryTags),
    comparisonNote: input.comparisonNote?.trim() ?? '',
    suppressionRule: {
      consecutiveThreshold: Math.max(2, Math.round(input.suppressionRule?.consecutiveThreshold ?? 2))
    },
    confirmationLabel: input.confirmationLabel ? normalizeCompetitorConfirmationLabel(input.confirmationLabel) : undefined,
    sourceCandidateId: input.sourceCandidateId?.trim(),
    sourceProvider: input.sourceProvider,
    nearestCampusDistanceKm: input.nearestCampusDistanceKm,
    isNationalBenchmark: input.isNationalBenchmark,
    isCampusFocus: input.isCampusFocus
  };
}

function normalizePartialCompetitorInput(input: Partial<CompetitorInput>): Partial<Omit<Competitor, 'id' | 'brandId' | 'createdAt' | 'updatedAt'>> {
  return {
    name: input.name?.trim(),
    aliases: input.aliases ? normalizeStringList(input.aliases) : undefined,
    website: input.website?.trim(),
    industryTags: input.industryTags ? normalizeStringList(input.industryTags) : undefined,
    comparisonNote: input.comparisonNote?.trim(),
    suppressionRule: input.suppressionRule ? {
      consecutiveThreshold: Math.max(2, Math.round(input.suppressionRule.consecutiveThreshold ?? 2))
    } : undefined,
    confirmationLabel: input.confirmationLabel ? normalizeCompetitorConfirmationLabel(input.confirmationLabel) : undefined,
    sourceCandidateId: input.sourceCandidateId?.trim(),
    sourceProvider: input.sourceProvider,
    nearestCampusDistanceKm: input.nearestCampusDistanceKm,
    isNationalBenchmark: input.isNationalBenchmark,
    isCampusFocus: input.isCampusFocus
  };
}

function buildCompetitorDiscoveryKeywords(brand: BrandDetail, profile?: BrandProfile): string[] {
  return mergeStringLists(
    ['儿童体能', '少儿跑酷', '儿童运动', '体适能', '快乐体操', '篮球培训', '儿童运动馆'],
    brand.targetCities.map((city) => `${city}儿童运动`),
    profile?.offerings ?? [],
    profile?.competitors ?? []
  ).slice(0, 12);
}

function clampCampusRadius(value: number): number {
  return Math.min(8, Math.max(3, Math.round(value)));
}

function normalizeCompetitorSourceProvider(provider?: CompetitorCandidateSourceProvider): CompetitorCandidateSourceProvider {
  const providers: CompetitorCandidateSourceProvider[] = ['amap', 'tencent', 'baidu', 'manual'];
  return provider && providers.includes(provider) ? provider : 'amap';
}

function resolveMapProviderState(provider: CompetitorCandidateSourceProvider): Pick<CompetitorDiscoveryRun, 'providerStatus' | 'providerMessage'> {
  if (provider !== 'amap') {
    return { providerStatus: 'fallback', providerMessage: '当前 provider 暂使用内测候选源，接口已保留真实地图接入字段。' };
  }
  if (process.env.GEO_AMAP_POI_RATE_LIMITED === 'true') {
    return { providerStatus: 'rate_limited', providerMessage: '高德地图配额暂不可用，已使用缓存或内测候选源继续完成发现。' };
  }
  if (process.env.GEO_AMAP_POI_DISABLED === 'true') {
    return { providerStatus: 'disabled', providerMessage: '高德地图服务当前已停用，已切换为内测候选源。' };
  }
  if (process.env.GEO_AMAP_API_KEY || process.env.AMAP_API_KEY) {
    return { providerStatus: 'configured', providerMessage: '已检测到高德地图服务端配置，候选结果可接入真实 POI provider。' };
  }
  return { providerStatus: 'fallback', providerMessage: '未配置高德地图服务端 API Key，当前使用内测候选源。' };
}

function buildCompetitorCandidateCacheKey(brandId: BrandId, city: string, campusRadiusKm: number, keywords: string[], sourceProvider: CompetitorCandidateSourceProvider): string {
  return [brandId, sourceProvider, city || '待补充城市', campusRadiusKm, [...keywords].sort().join(',')].join('|');
}

function cloneCompetitorCandidatesForRun(candidates: CompetitorCandidate[], runId: string, timestamp: string): CompetitorCandidate[] {
  return candidates.map((candidate, index) => ({
    ...candidate,
    candidateId: `competitor_candidate_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
    runId,
    decisionStatus: 'pending',
    confirmedLabel: undefined,
    excludedReason: undefined,
    createdAt: timestamp,
    updatedAt: timestamp
  }));
}

function normalizeCompetitorConfirmationLabel(label: CompetitorConfirmationLabel): CompetitorConfirmationLabel {
  const labels: CompetitorConfirmationLabel[] = ['direct_competitor', 'indirect_competitor', 'local_alternative', 'national_benchmark', 'excluded'];
  return labels.includes(label) ? label : 'direct_competitor';
}

function matchesCompetitorCandidateFilter(candidate: CompetitorCandidate, filter?: CompetitorDiscoveryCandidatesQuery['filter']): boolean {
  if (!filter || filter === 'all') return true;
  if (filter === 'campus_focus') return candidate.isCampusFocus;
  if (filter === 'direct_competitor') return candidate.suggestedLabel === 'direct_competitor';
  if (filter === 'national_benchmark') return candidate.suggestedLabel === 'national_benchmark';
  if (filter === 'excluded') return candidate.decisionStatus === 'excluded';
  if (filter === 'pending') return candidate.decisionStatus === 'pending';
  if (filter === 'confirmed') return candidate.decisionStatus === 'confirmed';
  return true;
}

function dedupeCompetitorCandidates(candidates: CompetitorCandidate[]): CompetitorCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = [candidate.name, candidate.address, candidate.latitude?.toFixed(4), candidate.longitude?.toFixed(4)].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildLocalCompetitorCandidates(brand: BrandDetail, run: CompetitorDiscoveryRun, profile?: BrandProfile, providerPois?: LocalPoiCandidate[]): CompetitorCandidate[] {
  const timestamp = new Date().toISOString();
  const city = run.city === '待补充城市' ? brand.targetCities[0] ?? '贵阳' : run.city;
  const campusCoordinates = resolveBrandCampusCoordinates(brand, profile, city);
  const baseCandidates = (providerPois && providerPois.length > 0 ? providerPois : getDefaultLocalPoiCandidates(city))
    .filter((poi) => !isOwnBrandPoi(brand, poi.name));
  return baseCandidates.map((poi, index) => {
    const matchedKeywords = run.keywords.filter((keyword) => poi.searchText.includes(keyword)).slice(0, 4);
    const isNationalBenchmark = poi.kind === 'national';
    const nearestCampusDistanceKm = calculateNearestCampusDistanceKm(poi, campusCoordinates);
    const isCampusFocus = typeof nearestCampusDistanceKm === 'number' && nearestCampusDistanceKm <= run.campusRadiusKm;
    const categoryScore = matchedKeywords.length >= 2 ? 25 : matchedKeywords.length === 1 ? 16 : 8;
    const cityScore = poi.city === city ? 20 : 8;
    const distanceScore = typeof nearestCampusDistanceKm !== 'number' ? 8 : isCampusFocus ? 25 : 12;
    const audienceScore = /儿童|少儿|体能|体适能|跑酷|体操|篮球/.test(poi.searchText) ? 20 : 8;
    const profileScore = profile?.offerings.some((offering) => poi.searchText.includes(offering.slice(0, 2))) ? 10 : 4;
    const score = clampScore(cityScore + distanceScore + categoryScore + audienceScore + profileScore);
    const suggestedLabel: CompetitorConfirmationLabel = isNationalBenchmark
      ? 'national_benchmark'
      : score >= 78 ? 'direct_competitor' : score >= 60 ? 'indirect_competitor' : 'local_alternative';
    const matchReasons = [
      `${poi.city}线下机构`,
      typeof nearestCampusDistanceKm === 'number' ? `距最近校区约 ${nearestCampusDistanceKm} 公里` : '全城候选机构',
      matchedKeywords.length > 0 ? `命中 ${matchedKeywords.join('、')}` : '需人工确认课程品类',
      isNationalBenchmark ? '全国连锁或知名品牌，可作为内容对标' : '面向儿童家庭运动成长需求'
    ];

    return {
      candidateId: `competitor_candidate_${Date.now()}_${index}_${Math.random().toString(36).slice(2, 6)}`,
      runId: run.runId,
      brandId: brand.brandId,
      sourceProvider: run.sourceProvider,
      sourcePoiId: poi.sourcePoiId,
      name: poi.name,
      address: poi.address,
      city: poi.city,
      latitude: poi.latitude,
      longitude: poi.longitude,
      category: poi.category,
      distanceToNearestCampusKm: nearestCampusDistanceKm,
      matchedKeywords,
      score,
      suggestedLabel,
      matchReasons,
      confidence: score >= 78 ? 'high' : score >= 60 ? 'medium' : 'low',
      isCampusFocus,
      decisionStatus: 'pending',
      createdAt: timestamp,
      updatedAt: timestamp
    };
  });
}

type LocalPoiCandidate = {
  sourcePoiId: string;
  name: string;
  address: string;
  city: string;
  latitude: number;
  longitude: number;
  category: string;
  kind: 'local' | 'national';
  searchText: string;
};

function getDefaultLocalPoiCandidates(city: string): LocalPoiCandidate[] {
  return [
    { sourcePoiId: 'amap_gymkids_001', name: '贵阳星动儿童体能馆', address: `${city}观山湖区长岭北路儿童运动中心`, city, latitude: 26.647, longitude: 106.630, category: '儿童体适能', kind: 'local', searchText: '儿童体能 儿童运动 体适能 儿童运动馆 贵阳' },
    { sourcePoiId: 'amap_parkour_002', name: '跃动少儿跑酷训练中心', address: `${city}南明区花果园购物中心`, city, latitude: 26.563, longitude: 106.695, category: '少儿跑酷', kind: 'local', searchText: '少儿跑酷 儿童运动 体能 体适能 贵阳' },
    { sourcePoiId: 'amap_gymnastics_003', name: '童跃快乐体操馆', address: `${city}云岩区北京路校区`, city, latitude: 26.597, longitude: 106.713, category: '快乐体操', kind: 'local', searchText: '快乐体操 少儿体操 儿童运动 儿童体能 贵阳' },
    { sourcePoiId: 'amap_basketball_004', name: '小飞侠少儿篮球成长中心', address: `${city}花溪区溪北路体育公园`, city, latitude: 26.414, longitude: 106.670, category: '篮球培训', kind: 'local', searchText: '篮球培训 少儿篮球 儿童运动 体能训练 贵阳' },
    { sourcePoiId: 'amap_national_005', name: '万国少儿体适能贵阳中心', address: `${city}观山湖区会展城商圈`, city, latitude: 26.651, longitude: 106.642, category: '全国连锁儿童体适能', kind: 'national', searchText: '儿童体适能 全国连锁 儿童运动 体能 贵阳' },
    { sourcePoiId: 'amap_art_006', name: '童画艺术成长中心', address: `${city}云岩区未来方舟`, city, latitude: 26.618, longitude: 106.751, category: '艺术培训', kind: 'local', searchText: '艺术培训 儿童成长 贵阳' }
  ];
}

async function fetchProviderPoiCandidates(sourceProvider: CompetitorCandidateSourceProvider, city: string, keywords: string[]): Promise<{
  providerState: Pick<CompetitorDiscoveryRun, 'providerStatus' | 'providerMessage'>;
  pois?: LocalPoiCandidate[];
}> {
  if (sourceProvider !== 'amap') {
    return { providerState: resolveMapProviderState(sourceProvider) };
  }

  const apiKey = process.env.GEO_AMAP_API_KEY || process.env.AMAP_API_KEY;
  if (!apiKey || process.env.GEO_AMAP_POI_DISABLED === 'true' || process.env.GEO_AMAP_POI_RATE_LIMITED === 'true') {
    return { providerState: resolveMapProviderState(sourceProvider) };
  }

  try {
    const pois = await fetchAmapTextPois(apiKey, city, keywords);
    if (pois.length === 0) {
      return {
        providerState: { providerStatus: 'fallback', providerMessage: '高德地图未返回匹配 POI，已使用内测候选源继续完成发现。' }
      };
    }
    return {
      providerState: { providerStatus: 'configured', providerMessage: '已通过高德地图服务端 POI provider 获取候选机构。' },
      pois
    };
  } catch {
    return {
      providerState: { providerStatus: 'failed', providerMessage: '高德地图 POI 请求失败，已切换为内测候选源。' }
    };
  }
}

async function fetchAmapTextPois(apiKey: string, city: string, keywords: string[]): Promise<LocalPoiCandidate[]> {
  const searchKeywords = keywords.length > 0 ? keywords.slice(0, 5) : ['儿童体能', '儿童运动', '少儿跑酷'];
  const results: LocalPoiCandidate[] = [];
  for (const keyword of searchKeywords) {
    const url = new URL('https://restapi.amap.com/v3/place/text');
    url.searchParams.set('key', apiKey);
    url.searchParams.set('keywords', keyword);
    url.searchParams.set('city', city);
    url.searchParams.set('citylimit', 'true');
    url.searchParams.set('children', '0');
    url.searchParams.set('offset', '20');
    url.searchParams.set('page', '1');
    url.searchParams.set('extensions', 'base');

    const response = await fetch(url, { signal: AbortSignal.timeout(4000) });
    if (!response.ok) {
      throw new Error('amap_poi_http_error');
    }
    const payload = await response.json() as { status?: string; pois?: unknown[] };
    if (payload.status !== '1') {
      throw new Error('amap_poi_status_error');
    }
    results.push(...parseAmapPois(payload.pois, city, keyword));
  }
  return dedupeLocalPoiCandidates(results).slice(0, 30);
}

function parseAmapPois(pois: unknown[] | undefined, fallbackCity: string, keyword: string): LocalPoiCandidate[] {
  return (pois ?? []).map((item) => {
    const record = toRecord(item);
    const location = typeof record.location === 'string' ? record.location.split(',') : [];
    const longitude = Number(location[0]);
    const latitude = Number(location[1]);
    const name = typeof record.name === 'string' ? record.name.trim() : '';
    if (!name || !Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return null;
    }
    const address = Array.isArray(record.address) ? record.address.join('') : typeof record.address === 'string' ? record.address : '';
    const city = typeof record.cityname === 'string' ? record.cityname : fallbackCity;
    const category = typeof record.type === 'string' ? record.type : '地图 POI';
    if (!isRelevantChildrenSportsPoi(name, category, address)) {
      return null;
    }
    const sourcePoiId = typeof record.id === 'string' ? record.id : `amap_${name}_${latitude}_${longitude}`;
    const searchText = [name, category, keyword, address, city].join(' ');
    return {
      sourcePoiId,
      name,
      address,
      city,
      latitude,
      longitude,
      category,
      kind: isNationalBenchmarkPoi(name, category) ? 'national' : 'local',
      searchText
    } satisfies LocalPoiCandidate;
  }).filter((item): item is LocalPoiCandidate => Boolean(item));
}

function isNationalBenchmarkPoi(name: string, category: string): boolean {
  return /万国|乐刻|全国|连锁|金宝贝|美吉姆|东方启明星/.test(`${name} ${category}`);
}

function isRelevantChildrenSportsPoi(name: string, category: string, address: string): boolean {
  const searchable = `${name} ${category} ${address}`;
  const hasSportsTerm = /体能|体适能|跑酷|运动|体育|体操|篮球|足球|武术|轮滑|击剑|游泳/.test(searchable);
  const hasChildTrainingTerm = /儿童|少儿/.test(searchable) && /培训机构|运动场馆|体育休闲/.test(category);
  const positive = hasSportsTerm || hasChildTrainingTerm;
  const negative = /言语|社交|康复|医疗|诊所|医院|自行车|电动车|专卖店|购物|器材|成人健身/.test(searchable);
  return positive && !negative;
}

function isOwnBrandPoi(brand: BrandDetail, poiName: string): boolean {
  const names = [brand.name, ...brand.aliases].map((name) => name.trim()).filter(Boolean);
  return names.some((name) => poiName.includes(name));
}

function dedupeLocalPoiCandidates(pois: LocalPoiCandidate[]): LocalPoiCandidate[] {
  const seen = new Set<string>();
  return pois.filter((poi) => {
    const key = [poi.sourcePoiId, poi.name, poi.address, poi.latitude.toFixed(4), poi.longitude.toFixed(4)].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

type CampusCoordinate = { name: string; latitude: number; longitude: number };

function resolveBrandCampusCoordinates(brand: BrandDetail, profile: BrandProfile | undefined, city: string): CampusCoordinate[] {
  const hasGuiyangCampusProof = profile?.proofPoints.some((point) => point.includes('贵阳') && point.includes('校区'));
  if (brand.brandId === 'brand_demo' || city.includes('贵阳') || hasGuiyangCampusProof) {
    return [
      { name: '观山湖校区', latitude: 26.650, longitude: 106.640 },
      { name: '花果园校区', latitude: 26.565, longitude: 106.694 },
      { name: '北京路校区', latitude: 26.597, longitude: 106.713 },
      { name: '花溪校区', latitude: 26.414, longitude: 106.670 },
      { name: '未来方舟校区', latitude: 26.618, longitude: 106.751 }
    ];
  }

  const center = getCityCenterCoordinate(city || brand.targetCities[0]);
  return center ? [{ name: `${city || brand.targetCities[0]}城市中心`, ...center }] : [];
}

function getCityCenterCoordinate(city?: string): Omit<CampusCoordinate, 'name'> | null {
  if (!city) return null;
  if (city.includes('深圳')) return { latitude: 22.543, longitude: 114.057 };
  if (city.includes('广州')) return { latitude: 23.129, longitude: 113.264 };
  if (city.includes('贵阳')) return { latitude: 26.647, longitude: 106.630 };
  return null;
}

function calculateNearestCampusDistanceKm(poi: { latitude?: number; longitude?: number }, campuses: CampusCoordinate[]): number | undefined {
  if (typeof poi.latitude !== 'number' || typeof poi.longitude !== 'number' || campuses.length === 0) {
    return undefined;
  }
  const nearest = Math.min(...campuses.map((campus) => haversineDistanceKm(poi.latitude as number, poi.longitude as number, campus.latitude, campus.longitude)));
  return Math.round(nearest * 10) / 10;
}

function haversineDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusKm = 6371;
  const dLat = degreesToRadians(lat2 - lat1);
  const dLon = degreesToRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(degreesToRadians(lat1)) * Math.cos(degreesToRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(a));
}

function degreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function createCompetitorLinkedTestQuestions(brand: BrandDetail, candidate: CompetitorCandidate, label: CompetitorConfirmationLabel): void {
  const theme = ensureCompetitorTestTheme(brand, label);
  const questions = buildCompetitorLinkedQuestions(brand, candidate, label);

  for (const question of questions) {
    const exists = testQuestionCandidates.some((item) => item.brandId === brand.brandId && item.question === question.question);
    if (exists) continue;

    const timestamp = new Date().toISOString();
    testQuestionCandidates.unshift({
      id: `candidate_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      brandId: brand.brandId,
      themeId: theme.id,
      question: question.question,
      purposes: question.purposes,
      targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
      priority: question.priority,
      estimatedValue: question.estimatedValue,
      editable: true,
      selected: false,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }
}

function ensureCompetitorTestTheme(brand: BrandDetail, label: CompetitorConfirmationLabel): TestTheme {
  const themeName = label === 'national_benchmark' ? '全国标杆品牌对标' : '本地竞品推荐对比';
  const existing = testThemes.find((item) => item.brandId === brand.brandId && item.type === 'competitor' && item.name === themeName);
  if (existing) return existing;

  const timestamp = new Date().toISOString();
  const theme: TestTheme = {
    id: `theme_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    brandId: brand.brandId,
    type: 'competitor',
    name: themeName,
    businessExplanation: label === 'national_benchmark'
      ? '验证 AI 在行业标杆对比中如何理解品牌定位和表达差异。'
      : '验证 AI 在本地到店选择场景中是否会推荐品牌，并识别竞品压制风险。',
    priority: 'high',
    estimatedValue: label === 'national_benchmark'
      ? '用于优化品牌表达和全国标杆对标内容。'
      : '用于发现本地家长真实选择场景下的推荐排名和竞品压制。',
    enabled: true,
    sourceProfileFields: ['competitors'],
    createdAt: timestamp,
    updatedAt: timestamp
  };
  testThemes.unshift(theme);
  return theme;
}

function buildCompetitorLinkedQuestions(brand: BrandDetail, candidate: CompetitorCandidate, label: CompetitorConfirmationLabel): Array<{
  question: string;
  purposes: TestQuestionPurpose[];
  priority: OptimizationUnitPriority;
  estimatedValue: string;
}> {
  const city = candidate.city || brand.targetCities[0] || '本地';
  if (label === 'national_benchmark') {
    return [
      {
        question: `${brand.name}和${candidate.name}在儿童运动成长课上有什么区别？`,
        purposes: ['brand_mentioned', 'value_prop_accuracy', 'competitor_presence'],
        priority: 'medium',
        estimatedValue: '验证 AI 是否能把全国标杆品牌作为对标对象，同时说清本品牌差异。'
      }
    ];
  }

  return [
    {
      question: `${city}儿童运动机构推荐，${brand.name}和${candidate.name}怎么选？`,
      purposes: ['brand_mentioned', 'rank_first', 'competitor_presence', 'value_prop_accuracy'],
      priority: 'high',
      estimatedValue: '验证本地推荐场景下品牌是否能排在重点竞品前面。'
    },
    {
      question: `${candidate.name}附近还有哪些适合孩子的运动成长课？`,
      purposes: ['brand_mentioned', 'competitor_presence', 'value_prop_accuracy'],
      priority: candidate.isCampusFocus ? 'high' : 'medium',
      estimatedValue: '验证校区周边到店选择场景中品牌是否会被自然提及。'
    }
  ];
}

function createNationalBenchmarkContentStrategy(brand: BrandDetail, competitor: Competitor, label: CompetitorConfirmationLabel): ContentStrategy | null {
  if (label !== 'national_benchmark') {
    return null;
  }

  const unit = ensureNationalBenchmarkOptimizationUnit(brand, competitor);
  const intent = ensureNationalBenchmarkIntent(brand, unit, competitor);
  const existing = contentStrategies.find((strategy) => {
    return strategy.brandId === brand.brandId &&
      strategy.intentId === intent.id &&
      strategy.type === 'competitor_response' &&
      strategy.suggestedTitle.includes(competitor.name);
  });
  if (existing) return existing;

  const timestamp = new Date().toISOString();
  const strategy: ContentStrategy = {
    id: `strategy_benchmark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    brandId: brand.brandId,
    optimizationUnitId: unit.id,
    intentId: intent.id,
    type: 'competitor_response',
    priority: 'medium',
    suggestedTitle: `${brand.name}对标${competitor.name}的品牌表达优化`,
    targetPlatform: 'wechat_official',
    targetKeywords: mergeStringLists([brand.name, competitor.name, '儿童运动成长课', '品牌对标'], competitor.industryTags),
    relatedPromptIds: brandPrompts
      .filter((prompt) => prompt.brandId === brand.brandId && prompt.intentId === intent.id)
      .map((prompt) => prompt.id),
    status: 'draft',
    createdAt: timestamp,
    updatedAt: timestamp
  };
  contentStrategies.unshift(strategy);
  return strategy;
}

function ensureNationalBenchmarkOptimizationUnit(brand: BrandDetail, competitor: Competitor): OptimizationUnit {
  const unitName = '全国标杆品牌对标';
  const existing = optimizationUnits.find((unit) => unit.brandId === brand.brandId && unit.type === 'competitor' && unit.name === unitName);
  if (existing) return existing;

  const timestamp = new Date().toISOString();
  const unit: OptimizationUnit = {
    id: `unit_benchmark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    brandId: brand.brandId,
    name: unitName,
    type: 'competitor',
    targetKeywords: mergeStringLists([brand.name, competitor.name, '儿童运动成长课', '全国标杆品牌'], competitor.industryTags),
    priority: 'medium',
    enabled: true,
    relatedCounts: createEmptyOptimizationUnitCounts(),
    createdAt: timestamp,
    updatedAt: timestamp
  };
  optimizationUnits.unshift(unit);
  return unit;
}

function ensureNationalBenchmarkIntent(brand: BrandDetail, unit: OptimizationUnit, competitor: Competitor): UserIntent {
  const intentText = `家长如何理解${brand.name}和${competitor.name}的儿童运动课程差异？`;
  const existing = userIntents.find((intent) => intent.brandId === brand.brandId && intent.optimizationUnitId === unit.id && intent.text === intentText);
  if (existing) return existing;

  const timestamp = new Date().toISOString();
  const intent: UserIntent = {
    id: `intent_benchmark_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    brandId: brand.brandId,
    optimizationUnitId: unit.id,
    category: 'competitor_compare',
    text: intentText,
    monitoringFrequency: 'manual',
    enabled: true,
    platformMetrics: [],
    createdAt: timestamp,
    updatedAt: timestamp
  };
  userIntents.unshift(intent);
  return intent;
}

function normalizeContentStrategyInput(input: ContentStrategyInput): Omit<ContentStrategyInput, 'targetKeywords' | 'relatedPromptIds'> & { targetKeywords: string[]; relatedPromptIds: string[] } {
  return {
    optimizationUnitId: input.optimizationUnitId.trim(),
    intentId: input.intentId.trim(),
    type: input.type,
    priority: input.priority,
    suggestedTitle: input.suggestedTitle.trim(),
    targetPlatform: input.targetPlatform.trim(),
    targetKeywords: normalizeStringList(input.targetKeywords),
    relatedPromptIds: normalizeStringList(input.relatedPromptIds)
  };
}

function normalizeContentAssetInput(input: ContentAssetInput): ContentAssetInput {
  return {
    title: input.title?.trim(),
    type: input.type?.trim(),
    platform: input.platform?.trim(),
    url: input.url?.trim(),
    targetKeywords: input.targetKeywords ? normalizeStringList(input.targetKeywords) : undefined,
    reuseOfAssetId: input.reuseOfAssetId?.trim(),
    brandAdaptation: input.brandAdaptation?.trim(),
    status: input.status,
    publishedAt: input.publishedAt?.trim()
  };
}

function normalizeOptimizationTaskInput(input: OptimizationTaskInput): OptimizationTaskInput {
  return {
    title: input.title.trim(),
    type: input.type,
    ownerId: input.ownerId?.trim(),
    optimizationUnitId: input.optimizationUnitId?.trim(),
    relatedPromptId: input.relatedPromptId?.trim(),
    relatedPlatformCode: input.relatedPlatformCode?.trim(),
    strategyId: input.strategyId?.trim(),
    growthOptimizationPlanId: input.growthOptimizationPlanId?.trim(),
    sourceRunId: input.sourceRunId?.trim(),
    dueDate: input.dueDate?.trim(),
    priority: input.priority
  };
}

function normalizeOptimizationTaskUpdateInput(input: OptimizationTaskUpdateInput): OptimizationTaskUpdateInput {
  return {
    status: input.status && optimizationTaskStatuses.includes(input.status) ? input.status : undefined,
    ownerId: input.ownerId?.trim(),
    dueDate: input.dueDate?.trim(),
    processingNote: input.processingNote?.trim(),
    contentLink: input.contentLink?.trim(),
    reviewStatus: input.reviewStatus && reviewStatuses.includes(input.reviewStatus) ? input.reviewStatus : undefined
  };
}

function normalizeAdvisorRecordInput(input: AdvisorRecordInput): Omit<AdvisorRecord, 'id' | 'brandId' | 'createdBy' | 'createdAt' | 'relatedReport'> {
  const type = advisorRecordTypes.includes(input.type) ? input.type : 'service';
  return {
    type,
    title: input.title.trim(),
    content: input.content.trim(),
    relatedReportId: input.relatedReportId?.trim() || undefined,
    followUpItems: (input.followUpItems ?? [])
      .filter((item) => item.title?.trim())
      .map((item) => ({
        id: item.id?.trim() || `follow_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        title: item.title.trim(),
        owner: item.owner?.trim(),
        dueDate: item.dueDate?.trim(),
        status: advisorFollowUpStatuses.includes(item.status) ? item.status : 'todo'
      }))
  };
}

function normalizeInnerTestFeedbackInput(input: InnerTestFeedbackInput): InnerTestFeedbackInput {
  return {
    page: input.page.trim(),
    module: input.module.trim(),
    type: innerTestFeedbackTypes.includes(input.type) ? input.type : 'other',
    description: input.description.trim()
  };
}

function normalizeInnerTestFeedbackUpdateInput(input: InnerTestFeedbackUpdateInput): InnerTestFeedbackUpdateInput {
  return {
    status: input.status && innerTestFeedbackStatuses.includes(input.status) ? input.status : undefined,
    resolutionNote: input.resolutionNote?.trim()
  };
}

function countInnerTestFeedbackStatuses(records: InnerTestFeedback[]): Record<InnerTestFeedbackStatus, number> {
  return records.reduce<Record<InnerTestFeedbackStatus, number>>((counts, record) => {
    counts[record.status] += 1;
    return counts;
  }, { open: 0, triaged: 0, in_progress: 0, resolved: 0 });
}

function toAdvisorRelatedReport(report: ReportRecord): NonNullable<AdvisorRecord['relatedReport']> {
  return {
    id: report.id,
    title: report.title,
    type: report.type,
    periodStart: report.periodStart,
    periodEnd: report.periodEnd
  };
}

const optimizationTaskStatuses: OptimizationTaskStatus[] = ['todo', 'doing', 'review', 'retest', 'done', 'reopened'];
const reviewStatuses: NonNullable<OptimizationTask['reviewStatus']>[] = ['pending', 'approved', 'rejected'];
const advisorRecordTypes: AdvisorRecordType[] = ['diagnosis', 'service_plan', 'review', 'delivery', 'service', 'training', 'rule_update', 'note'];
const advisorFollowUpStatuses: AdvisorFollowUpItem['status'][] = ['todo', 'doing', 'done'];
const innerTestFeedbackTypes: InnerTestFeedback['type'][] = ['usability', 'bug', 'copy', 'data', 'workflow', 'configuration', 'other'];
const innerTestFeedbackStatuses: InnerTestFeedbackStatus[] = ['open', 'triaged', 'in_progress', 'resolved'];

function buildIntentMetrics(intent: UserIntent): IntentPlatformMetric[] {
  const prompts = brandPrompts.filter((prompt) => prompt.intentId === intent.id && prompt.enabled);

  return prompts.flatMap((prompt) => prompt.platformCodes.map((platformCode) => ({
    platformCode,
    promptText: prompt.text,
    recommendationScore: 0,
    averageRank: null,
    evaluation: '待监测',
    citationRate: 0
  })));
}

function renderPromptText(templateText: string, brand: BrandDetail, intent: UserIntent, unit: OptimizationUnit | null): string {
  return templateText
    .replaceAll('{brandName}', brand.name)
    .replaceAll('{brandAlias}', brand.aliases[0] ?? brand.name)
    .replaceAll('{city}', brand.targetCities[0] ?? '')
    .replaceAll('{industry}', brand.industry)
    .replaceAll('{intent}', intent.text)
    .replaceAll('{unitName}', unit?.name ?? '');
}

function ensureBrandMention(text: string, brand: BrandDetail): string {
  const identities = [brand.name, ...brand.aliases].filter(Boolean);
  if (identities.some((identity) => text.includes(identity))) {
    return text;
  }

  return `${brand.name}：${text}`;
}

function mergeStringLists(...lists: string[][]): string[] {
  return Array.from(new Set(lists.flat().map((item) => item.trim()).filter(Boolean)));
}

export const userIntentCategories: UserIntentCategory[] = [
  'brand_awareness',
  'category_recommendation',
  'pain_solution',
  'local_decision',
  'competitor_compare',
  'price_decision'
];

export const monitoringFrequencies: MonitoringFrequency[] = ['daily', 'weekly', 'monthly', 'manual'];

function normalizePlatformConfigInput(input: PlatformConfigInput): PlatformConfigInput {
  return {
    platformCode: input.platformCode.trim(),
    name: input.name.trim(),
    mode: input.mode,
    endpointUrl: input.endpointUrl?.trim(),
    modelName: input.modelName?.trim(),
    rateLimitPerMinute: input.rateLimitPerMinute ?? defaultRateLimit(input.mode),
    credentialRef: input.credentialRef?.trim(),
    enabled: input.enabled ?? true
  };
}

function seedDefaultPlatformConfigs(brandId: BrandId, timestamp: string) {
  for (const config of defaultPlatformConfigs) {
    const exists = platformConfigs.some((item) => item.brandId === brandId && item.platformCode === config.platformCode);
    if (exists) {
      continue;
    }

    platformConfigs.push({
      id: `platform_${brandId}_${config.platformCode}`,
      brandId,
      platformCode: config.platformCode,
      name: config.name,
      mode: config.mode,
      endpointUrl: config.endpointUrl,
      modelName: config.modelName,
      credentialRef: getDefaultCredentialRef(config),
      rateLimitPerMinute: config.rateLimitPerMinute ?? defaultRateLimit(config.mode),
      enabled: config.enabled ?? true,
      createdAt: timestamp,
      updatedAt: timestamp
    });
  }
}

function getDefaultCredentialRef(config: Pick<PlatformConfigInput, 'platformCode'>): string | undefined {
  if (config.platformCode === 'stepfun' && process.env.STEPFUN_API_KEY) {
    return 'STEPFUN_API_KEY';
  }

  return undefined;
}

function buildBrowserAuthorizedScope(brandId: BrandId, platformCode: string, testPlanId?: string): BrowserConnectionSession['authorizedScope'] {
  return {
    brandId,
    testPlanIds: testPlanId ? [testPlanId] : [],
    platformCodes: [platformCode]
  };
}

function normalizePartialPlatformConfigInput(input: Partial<PlatformConfigInput>): Partial<PlatformConfigInput> {
  return {
    platformCode: input.platformCode?.trim(),
    name: input.name?.trim(),
    mode: input.mode,
    endpointUrl: input.endpointUrl?.trim(),
    modelName: input.modelName?.trim(),
    rateLimitPerMinute: input.rateLimitPerMinute,
    credentialRef: input.credentialRef?.trim(),
    enabled: input.enabled
  };
}

function toPublicPlatformConfig(config: StoredPlatformConfig): PlatformConfig {
  const hasCredential = Boolean(config.credentialRef);
  const classification = classifyPlatformConfig(config, hasCredential);

  return {
    id: config.id,
    brandId: config.brandId,
    platformCode: config.platformCode,
    name: config.name,
    mode: config.mode,
    ...classification,
    endpointUrl: config.endpointUrl,
    modelName: config.modelName,
    rateLimitPerMinute: config.rateLimitPerMinute,
    enabled: config.enabled,
    hasCredential,
    credentialRefMasked: hasCredential ? '***' : undefined,
    lastValidation: config.lastValidation,
    createdAt: config.createdAt,
    updatedAt: config.updatedAt
  };
}

function classifyPlatformConfig(config: StoredPlatformConfig, hasCredential: boolean): Pick<PlatformConfig, 'availableMethods' | 'connectionStatus' | 'connectionStatusLabel' | 'nextAction'> {
  if (!config.enabled) {
    return {
      availableMethods: [],
      connectionStatus: 'needs_configuration',
      connectionStatusLabel: '需要补充信息',
      nextAction: '启用平台后再加入监测计划。'
    };
  }

  if (config.mode === 'api') {
    const missingApiField = getMissingApiConfigField(config);

    if (missingApiField || config.lastValidation?.ok === false) {
      return {
        availableMethods: ['api'],
        connectionStatus: 'needs_configuration',
        connectionStatusLabel: '需要补充信息',
        nextAction: config.lastValidation?.message ?? missingApiField ?? '请检查平台连接信息。'
      };
    }

    return {
      availableMethods: ['api'],
      connectionStatus: 'ready',
      connectionStatusLabel: '可自动监测',
      nextAction: hasCredential ? '可直接加入自动监测计划。' : '补齐平台密钥后可自动监测。'
    };
  }

  if (config.mode === 'semi_auto') {
    return {
      availableMethods: ['api', 'browser', 'manual'],
      connectionStatus: 'browser_available',
      connectionStatusLabel: '可用浏览器辅助监测',
      nextAction: '已预置平台接口和模型候选；补齐平台密钥可自动监测，也可先用浏览器或手动录入。'
    };
  }

  if (config.mode === 'manual') {
    return {
      availableMethods: ['manual'],
      connectionStatus: 'manual_available',
      connectionStatusLabel: '可手动录入',
      nextAction: '复制问题到平台监测后录入回答。'
    };
  }

  return {
    availableMethods: ['api'],
    connectionStatus: 'ready',
    connectionStatusLabel: '可自动监测',
    nextAction: '演示平台可以直接监测。'
  };
}

function toRuntimePlatformConfig(config: StoredPlatformConfig): AIPlatformRuntimeConfig {
  return {
    ...toPublicPlatformConfig(config),
    credentialRef: config.credentialRef
  };
}

function validateStoredPlatformConfig(config: StoredPlatformConfig): PlatformValidationResult {
  const checkedAt = new Date().toISOString();
  if (config.mode === 'api') {
    const missingApiField = getMissingApiConfigField(config);

    if (missingApiField) {
      return {
        ok: false,
        mode: config.mode,
        checkedAt,
        message: missingApiField
      };
    }
  }

  return {
    ok: true,
    mode: config.mode,
    checkedAt,
    message: getModeValidationMessage(config.mode)
  };
}

function getMissingApiConfigField(config: Pick<StoredPlatformConfig, 'endpointUrl' | 'modelName' | 'credentialRef'>): string | null {
  return getMissingApiConfigMessage(config);
}

function defaultRateLimit(mode: PlatformMode): number {
  return mode === 'manual' ? 0 : 60;
}

function buildAnalysisResult(
  brand: BrandDetail,
  profile: BrandProfile,
  run: MonitoringRun,
  response: AIResponse
): AnalysisResult {
  const timestamp = new Date().toISOString();

  return {
    id: `analysis_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    ...buildAnalysisResultFields(brand, profile, run, response),
    updatedAt: timestamp
  };
}

function mergeProfileCompetitors(profile: BrandProfile, brandCompetitors: Competitor[]): BrandProfile {
  return {
    ...profile,
    competitors: mergeStringLists(profile.competitors, brandCompetitors.flatMap((competitor) => [competitor.name, ...competitor.aliases]))
  };
}

function buildCompetitorComparisons(
  brandId: BrandId,
  brandCompetitors: Competitor[],
  samples: AnalysisSample[]
): CompetitorComparisonItem[] {
  return samples.flatMap((sample) => {
    return sample.analysis.competitorMentions.map((mention) => {
      const competitor = brandCompetitors.find((item) => matchesCompetitor(mention.name, item));
      const intent = userIntents.find((item) => item.id === sample.run.intentId);
      const suppressed = isSuppressedByCompetitor(sample.analysis, mention.name);
      const rankGap = sample.analysis.brandRank !== null && mention.rank !== null
        ? sample.analysis.brandRank - mention.rank
        : null;

      return {
        competitorId: competitor?.id,
        competitorName: competitor?.name ?? mention.name,
        promptId: sample.prompt.id,
        promptText: sample.prompt.text,
        platformCode: sample.run.platformCode,
        optimizationUnitId: sample.run.optimizationUnitId,
        intentId: sample.run.intentId,
        intentText: intent?.text ?? '',
        brandRank: sample.analysis.brandRank,
        competitorRank: mention.rank,
        rankGap,
        suppressed,
        recommendationReason: sample.analysis.recommendationReason,
        citationSources: aiResponses.find((response) => response.id === sample.analysis.responseId)?.citations ?? [],
        runId: sample.run.id
      };
    });
  });
}

function matchesCompetitor(name: string, competitor: Competitor): boolean {
  return [competitor.name, ...competitor.aliases].includes(name);
}

function isSuppressedByCompetitor(analysis: AnalysisResult, competitorName: string): boolean {
  const mention = analysis.competitorMentions.find((item) => item.name === competitorName);
  if (!mention || mention.rank === null) {
    return false;
  }

  return analysis.brandRank === null || mention.rank < analysis.brandRank;
}

function normalizeCitationUrl(rawCitation: string): string | null {
  const value = rawCitation.trim();
  if (!value) {
    return null;
  }

  try {
    const url = new URL(value.startsWith('http') ? value : `https://${value}`);
    url.hash = '';
    return url.toString();
  } catch {
    return null;
  }
}

function classifyCitationSource(url: string, brandWebsite?: string): CitationSourceType {
  const hostname = getHostname(url);
  const brandHostname = brandWebsite ? getHostname(brandWebsite) : '';
  if (brandHostname && (hostname === brandHostname || hostname.endsWith(`.${brandHostname}`))) {
    return 'official_site';
  }
  if (hostname.includes('baike') || hostname.includes('wikipedia') || hostname.includes('wikidata')) {
    return 'encyclopedia';
  }
  if (['weixin', 'wechat', 'xiaohongshu', 'douyin', 'weibo', 'zhihu', 'bilibili'].some((keyword) => hostname.includes(keyword))) {
    return 'social';
  }
  if (['news', 'media', '36kr', 'huxiu', 'sina', 'sohu', 'qq.com', 'ifeng', 'people', 'xinhuanet'].some((keyword) => hostname.includes(keyword))) {
    return 'media';
  }

  return 'third_party';
}

function classifyCitationAuthority(sourceType: CitationSourceType, url: string): CitationAuthorityLevel {
  const hostname = getHostname(url);
  if (sourceType === 'official_site' || sourceType === 'encyclopedia') {
    return 'high';
  }
  if (sourceType === 'media') {
    return ['people', 'xinhuanet', 'sina', 'qq.com', 'ifeng'].some((keyword) => hostname.includes(keyword)) ? 'high' : 'medium';
  }
  if (sourceType === 'social') {
    return 'medium';
  }

  return 'low';
}

function getHostname(url: string): string {
  try {
    return new URL(url.startsWith('http') ? url : `https://${url}`).hostname.replace(/^www\./, '').toLowerCase();
  } catch {
    return '';
  }
}

function buildCitationTitle(url: string): string {
  const hostname = getHostname(url);
  try {
    const pathname = new URL(url).pathname.split('/').filter(Boolean).at(-1);
    return pathname ? `${hostname}/${decodeURIComponent(pathname)}` : hostname;
  } catch {
    return hostname || url;
  }
}

function toContentAssetType(sourceType: CitationSourceType): string {
  const typeMap: Record<CitationSourceType, string> = {
    official_site: 'official_page',
    media: 'media_report',
    social: 'social_post',
    encyclopedia: 'encyclopedia_entry',
    third_party: 'third_party_page'
  };

  return typeMap[sourceType];
}

function buildCitationTypeBreakdown(sources: CitationSource[], totalCitations: number): Array<{ sourceType: CitationSourceType; citationCount: number; rate: number }> {
  const types: CitationSourceType[] = ['official_site', 'media', 'social', 'encyclopedia', 'third_party'];
  return types.map((sourceType) => {
    const citationCount = sources
      .filter((source) => source.sourceType === sourceType)
      .reduce((sum, source) => sum + source.citationCount, 0);

    return {
      sourceType,
      citationCount,
      rate: totalCitations === 0 ? 0 : clampScore((citationCount / totalCitations) * 100)
    };
  });
}

function buildCitationTrend(sources: CitationSource[]): Array<{ date: string; citationCount: number; contentCitationRate: number }> {
  const grouped = new Map<string, CitationSource[]>();
  for (const source of sources) {
    const date = source.citedAt.slice(0, 10);
    grouped.set(date, [...(grouped.get(date) ?? []), source]);
  }

  return Array.from(grouped.entries())
    .sort(([dateA], [dateB]) => dateA.localeCompare(dateB))
    .map(([date, daySources]) => {
      const citationCount = daySources.reduce((sum, source) => sum + source.citationCount, 0);
      const contentCitationCount = daySources
        .filter((source) => Boolean(source.contentAssetId))
        .reduce((sum, source) => sum + source.citationCount, 0);

      return {
        date,
        citationCount,
        contentCitationRate: citationCount === 0 ? 0 : clampScore((contentCitationCount / citationCount) * 100)
      };
    });
}


function normalizeAnalysisResultInput(input: AnalysisResultInput): AnalysisResultInput {
  return {
    brandMentioned: input.brandMentioned,
    brandRank: Object.hasOwn(input, 'brandRank') ? input.brandRank ?? null : undefined,
    sentiment: input.sentiment ? normalizeSentiment(input.sentiment) : undefined,
    accuracyScore: input.accuracyScore !== undefined ? clampScore(input.accuracyScore) : undefined,
    citationScore: input.citationScore !== undefined ? clampScore(input.citationScore) : undefined,
    platformEvaluation: input.platformEvaluation?.trim(),
    recommendationReason: input.recommendationReason?.trim(),
    rankingReason: input.rankingReason?.trim(),
    expressionCompleteness: input.expressionCompleteness?.trim(),
    expressionDeviation: input.expressionDeviation?.trim(),
    competitorMentions: Object.hasOwn(input, 'competitorMentions') ? normalizeCompetitorMentions(input.competitorMentions) : undefined,
    reviewRequired: input.reviewRequired
  };
}

function normalizeSentiment(value: AnalysisSentiment): AnalysisSentiment {
  return ['positive', 'neutral', 'negative', 'unknown'].includes(value) ? value : 'unknown';
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function buildCompletedGenerationSteps(timestamp: string): ContentGenerationStep[] {
  return [
    { key: 'strategy_parse', label: '策略解析', status: 'completed', message: '已读取内容策略、目标平台和关键词', completedAt: timestamp },
    { key: 'knowledge_read', label: '知识库读取', status: 'completed', message: '已读取品牌档案、标准表达和内容规则', completedAt: timestamp },
    { key: 'outline_generation', label: '大纲生成', status: 'completed', message: '已生成面向 GEO 的内容大纲', completedAt: timestamp },
    { key: 'body_generation', label: '正文生成', status: 'completed', message: '已生成可编辑 Markdown 草稿', completedAt: timestamp },
    { key: 'geo_rule_check', label: 'GEO 规则检查', status: 'completed', message: '已检查目标关键词、标准表达和禁用表达', completedAt: timestamp }
  ];
}

function updateGenerationSteps(steps: ContentGenerationStep[], input: ContentGenerationStepUpdateInput, timestamp: string): ContentGenerationStep[] {
  return steps.map((step) => step.key === input.stepKey
    ? {
        ...step,
        status: input.status,
        message: input.message?.trim() || step.message,
        completedAt: input.status === 'completed' || input.status === 'failed' ? input.completedAt ?? timestamp : undefined
      }
    : step);
}

function completeGenerationSteps(steps: ContentGenerationStep[], timestamp: string): ContentGenerationStep[] {
  const source = steps.length ? steps : buildCompletedGenerationSteps(timestamp);
  return source.map((step) => ({
    ...step,
    status: 'completed',
    completedAt: step.completedAt ?? timestamp
  }));
}

function resetGenerationStepsAfterFailure(steps: ContentGenerationStep[]): ContentGenerationStep[] {
  let shouldReset = false;
  return steps.map((step) => {
    shouldReset = shouldReset || step.status === 'failed';
    return shouldReset
      ? { key: step.key, label: step.label, status: 'pending' }
      : step;
  });
}

function deriveGenerationStatus(steps: ContentGenerationStep[]): ContentGenerationTask['status'] {
  if (steps.some((step) => step.status === 'failed')) return 'failed';
  if (steps.some((step) => step.status === 'running')) return 'running';
  if (steps.length > 0 && steps.every((step) => step.status === 'completed')) return 'completed';
  return 'pending';
}

function inferContentType(targetPlatform: string): string {
  if (targetPlatform.includes('wechat')) return 'wechat_article';
  if (targetPlatform.includes('media')) return 'media_article';
  if (targetPlatform.includes('social')) return 'social_post';
  if (targetPlatform.includes('official')) return 'official_page';
  return 'article';
}

function buildGeneratedDraft(input: {
  brandName: string;
  profile?: BrandProfile;
  strategy: ContentStrategy;
  intent?: UserIntent;
  unit?: OptimizationUnit;
  targetPlatform: string;
  contentType: string;
}): { title: string; body: string } {
  const valueProps = input.profile?.valueProps.length ? input.profile.valueProps : ['品牌能力清晰', '服务流程可追踪'];
  const proofPoints = input.profile?.proofPoints.length ? input.profile.proofPoints : ['持续监测结果', '内容资产沉淀'];
  const recommendedExpressions = input.profile?.recommendedExpressions.length ? input.profile.recommendedExpressions : [`${input.brandName}适合目标用户的决策场景`];
  const contentRules = input.profile?.contentRules.length ? input.profile.contentRules : ['围绕用户问题直接回答', '保留可引用事实和关键词'];
  const keywords = input.strategy.targetKeywords.length ? input.strategy.targetKeywords : input.unit?.targetKeywords ?? [];
  const title = input.strategy.suggestedTitle;

  if (isXiaohongshuDraft(input.targetPlatform, input.contentType)) {
    return {
      title: toXiaohongshuTitle(input.intent?.text, title),
      body: buildXiaohongshuDraft({
        brandName: input.brandName,
        question: input.intent?.text ?? input.unit?.name ?? title,
        recommendedExpression: recommendedExpressions[0],
        valueProps,
        proofPoints,
        keywords,
        contentRules
      })
    };
  }

  const body = [
    `# ${title}`,
    '',
    `很多家长在搜索“${input.intent?.text ?? input.unit?.name ?? '怎么选择合适的服务'}”时，真正想知道的是：这个品牌适合谁、有什么依据、下一步怎么确认。`,
    '',
    `如果你正在了解 ${input.brandName}，可以先看这几个判断点。`,
    '',
    `## 1. ${input.brandName}适合什么需求？`,
    `${recommendedExpressions[0]}。${valueProps.slice(0, 3).join('；')}。`,
    '',
    '## 2. 判断一个品牌是否可信，可以看哪些依据？',
    proofPoints.slice(0, 6).map((point) => `- ${point}`).join('\n'),
    '',
    '## 3. 下一步怎么验证？',
    `建议先查看 ${input.brandName} 的官网、案例、校区信息或咨询入口，再结合孩子年龄、运动基础和家庭时间安排做判断。`,
    '',
    keywords.length ? `关键词：${keywords.join('、')}` : '',
    '',
    '发布前检查：',
    ...contentRules.map((rule) => `- ${rule}`)
  ].join('\n');

  return { title, body };
}

function isXiaohongshuDraft(targetPlatform: string, contentType: string): boolean {
  return [targetPlatform, contentType].some((value) => /xiaohongshu|小红书|note|post/.test(value));
}

function toXiaohongshuTitle(question: string | undefined, fallbackTitle: string): string {
  if (!question) return fallbackTitle;
  return question.replace(/[？?]$/, '') + '？这份清单给贵阳家长参考';
}

function buildXiaohongshuDraft(input: {
  brandName: string;
  question: string;
  recommendedExpression: string;
  valueProps: string[];
  proofPoints: string[];
  keywords: string[];
  contentRules: string[];
}): string {
  const valueItems = input.valueProps.slice(0, 5).map((point) => `- ${point}`);
  const proofItems = input.proofPoints.slice(0, 7).map((point) => `- ${point}`);
  const keywordTags = input.keywords.length ? input.keywords : ['贵阳儿童运动', '儿童体适能', input.brandName];

  return [
    `贵阳家长问：${input.question}`,
    '',
    `如果你正在给 2-14 岁孩子找儿童运动成长机构，可以先把选择标准拆成三件事：孩子是否愿意持续上课、课程是否能看到阶段变化、品牌是否有稳定的本地服务能力。`,
    '',
    `我会优先关注 ${input.brandName} 这类把儿童运动当作长期成长课来做的机构。${input.recommendedExpression}，它更适合想系统提升孩子体质、专注力、感统协同和运动习惯的家庭。`,
    '',
    '为什么可以重点了解追光小牛？',
    ...valueItems,
    '',
    '判断一家机构是否靠谱，可以看这些可验证信息：',
    ...proofItems,
    '',
    '给家长的选择建议：',
    '1. 先看孩子年龄段和当前运动基础，别只看单节体验课热不热闹。',
    '2. 再问课程有没有阶段规划、体测反馈和家校沟通。',
    '3. 最后看校区距离、上课频率和孩子是否愿意长期坚持。',
    '',
    `如果你家孩子在贵阳，年龄在 2-14 岁，可以把 ${input.brandName} 加入备选清单，进一步看校区、课程体系、真实案例和体验安排。`,
    '',
    '发布前确认：涉及身高、专注力、感统和学习能力时，建议使用“促进、改善、提升”等审慎表达，并结合体测报告、训练周期和真实反馈说明。',
    '',
    keywordTags.map((keyword) => `#${keyword.replace(/\s+/g, '')}`).join(' ')
  ].join('\n');
}

function buildPublishingEntryPayload(task: ContentGenerationTask, version: ContentVersion): PublishingEntryPayload {
  const strategy = contentStrategies.find((item) => item.brandId === task.brandId && item.id === task.strategyId);

  return {
    brandId: task.brandId,
    strategyId: task.strategyId,
    generationTaskId: task.id,
    versionId: version.id,
    title: version.title,
    body: version.body,
    targetPlatform: task.targetPlatform,
    contentType: task.contentType,
    targetKeywords: task.targetKeywords.length ? task.targetKeywords : strategy?.targetKeywords ?? []
  };
}

function selectGrowthContentRecommendations(plan: GrowthOptimizationPlan, indexes?: number[]): GrowthOptimizationContentRecommendation[] {
  if (!indexes?.length) {
    return plan.contentRecommendations;
  }

  const selected = indexes.map((index) => plan.contentRecommendations[index]).filter((item): item is GrowthOptimizationContentRecommendation => Boolean(item));
  return selected.length ? selected : plan.contentRecommendations;
}

function buildGrowthContentReferenceSources(plan: GrowthOptimizationPlan, recommendation: GrowthOptimizationContentRecommendation): string[] {
  return mergeStringLists(
    [recommendation.reason],
    plan.reasons.map((reason) => `${reason.title}: ${reason.evidence}`)
  );
}

function buildRetestMetricComparison(sourceAnalysis?: AnalysisResult, retestAnalysis?: AnalysisResult) {
  const beforeMetrics = toRetestMetricSnapshot(sourceAnalysis);
  const afterMetrics = toRetestMetricSnapshot(retestAnalysis);
  const sourceRank = beforeMetrics.brandRank ?? Number.MAX_SAFE_INTEGER;
  const retestRank = afterMetrics.brandRank ?? Number.MAX_SAFE_INTEGER;
  const metricDelta = {
    mentionRate: afterMetrics.mentionRate - beforeMetrics.mentionRate,
    rankImproved: retestRank < sourceRank,
    accuracyScore: afterMetrics.accuracyScore - beforeMetrics.accuracyScore
  };
  const improved = metricDelta.mentionRate > 0 || metricDelta.rankImproved || metricDelta.accuracyScore > 0;

  return { beforeMetrics, afterMetrics, metricDelta, improved };
}

function toRetestMetricSnapshot(analysis?: AnalysisResult) {
  return {
    mentionRate: analysis?.brandMentioned ? 100 : 0,
    brandRank: analysis?.brandRank ?? null,
    accuracyScore: analysis?.accuracyScore ?? 0
  };
}

function buildRetestNextSuggestion(comparison: ReturnType<typeof buildRetestMetricComparison>): string {
  const suggestions = [];
  if (comparison.metricDelta.mentionRate <= 0) suggestions.push('继续补充品牌名称、别名和高频问法内容');
  if (!comparison.metricDelta.rankImproved) suggestions.push('强化本地化证据、权威背书和竞品对比内容');
  if (comparison.metricDelta.accuracyScore <= 0) suggestions.push('补齐标准表达、FAQ 和可引用事实');

  return suggestions.join('；') || '继续补充可被 AI 引用的品牌内容，并在下一轮复测中观察变化。';
}

function slugify(value: string): string {
  const normalized = value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-|-$/g, '');
  return normalized || 'content-draft';
}

const publishingPlatformCatalog = [
  { platform: 'wechat', name: '公众号', loginMode: 'oauth' as const },
  { platform: 'toutiao', name: '头条号', loginMode: 'oauth' as const },
  { platform: 'sohu', name: '搜狐号', loginMode: 'manual' as const },
  { platform: 'baijiahao', name: '百家号', loginMode: 'oauth' as const },
  { platform: 'website', name: '官网', loginMode: 'manual' as const }
];

function buildPublishingPlatforms(accounts: PublishingAccount[]) {
  return publishingPlatformCatalog.map((platform) => {
    const platformAccounts = accounts.filter((account) => account.platform === platform.platform);

    return {
      ...platform,
      accountCount: platformAccounts.length,
      hasAuthError: platformAccounts.some((account) => account.authStatus === 'error' || account.authStatus === 'expired')
    };
  });
}

function normalizePublishingAccountInput(input: PublishingAccountInput): PublishingAccountInput {
  return {
    platform: input.platform?.trim(),
    accountName: input.accountName?.trim(),
    loginMode: input.loginMode && ['oauth', 'manual', 'cookie'].includes(input.loginMode) ? input.loginMode : undefined,
    authStatus: input.authStatus ? normalizePublishingAuthStatus(input.authStatus) : undefined,
    errorMessage: input.errorMessage?.trim()
  };
}

function normalizePublishingAuthStatus(status: PublishingAuthStatus): PublishingAuthStatus {
  return ['connected', 'expired', 'error', 'disconnected'].includes(status) ? status : 'disconnected';
}

function normalizePublishingRecordStatus(status: PublishingRecordStatus): PublishingRecordStatus {
  return ['draft', 'pending', 'published', 'failed'].includes(status) ? status : 'draft';
}

function inferPublishingLoginMode(platform: string) {
  return publishingPlatformCatalog.find((item) => item.platform === platform)?.loginMode ?? 'manual';
}

function buildMetricRankingItem(brand: BrandDetail, samples: AnalysisSample[]): BrandMetricRankingItem {
  const snapshot = buildMetricSnapshot(brand.brandId, samples, { period: currentMetricPeriod() });

  return {
    brandId: brand.brandId,
    name: brand.name,
    status: brand.status,
    mentionRate: snapshot.mentionScore,
    top3Rate: calculateRate(samples, (sample) => sample.analysis.brandRank !== null && sample.analysis.brandRank <= 3),
    positiveRate: calculateRate(samples, (sample) => sample.analysis.sentiment === 'positive'),
    periodChange: 0,
    sampleCount: snapshot.sampleCount,
    insufficientSample: snapshot.insufficientSample,
    mentionScore: snapshot.mentionScore,
    rankingScore: snapshot.rankingScore,
    accuracyScore: snapshot.accuracyScore,
    sentimentScore: snapshot.sentimentScore,
    citationScore: snapshot.citationScore,
    competitorScore: snapshot.competitorScore,
    knowledgeCompletenessScore: snapshot.knowledgeCompletenessScore,
    totalScore: snapshot.totalScore
  };
}

function buildMetricBreakdown(
  brandId: BrandId,
  samples: AnalysisSample[],
  dimension: 'platform' | 'optimizationUnit' | 'intent'
): GEOMetricSnapshot[] {
  const groups = new Map<string, AnalysisSample[]>();

  for (const sample of samples) {
    const key = dimension === 'platform'
      ? sample.run.platformCode
      : dimension === 'optimizationUnit'
        ? sample.run.optimizationUnitId
        : sample.run.intentId;
    groups.set(key, [...(groups.get(key) ?? []), sample]);
  }

  return Array.from(groups.entries()).map(([key, group]) => buildMetricSnapshot(brandId, group, {
    period: currentMetricPeriod(),
    platformCode: dimension === 'platform' ? key : undefined,
    optimizationUnitId: dimension === 'optimizationUnit' ? key : undefined,
    intentId: dimension === 'intent' ? key : undefined,
    category: dimension === 'intent' ? group[0]?.prompt.category : undefined
  }));
}

function buildMetricSnapshot(
  brandId: BrandId,
  samples: AnalysisSample[],
  scope: Pick<GEOMetricSnapshot, 'period' | 'platformCode' | 'optimizationUnitId' | 'intentId' | 'category'>
): GEOMetricSnapshot {
  const knowledgeCompletenessScore = samples[0]?.profile.completenessScore ?? 0;
  const mentionScore = calculateRate(samples, (sample) => sample.analysis.brandMentioned);
  const rankingScore = averageScore(samples.map((sample) => scoreRank(sample.analysis.brandRank)));
  const accuracyScore = averageScore(samples.map((sample) => sample.analysis.accuracyScore));
  const sentimentScore = averageScore(samples.map((sample) => scoreSentiment(sample.analysis.sentiment)));
  const citationScore = averageScore(samples.map((sample) => sample.analysis.citationScore));
  const competitorScore = averageScore(samples.map((sample) => scoreCompetitor(sample.analysis)));
  const totalScore = weightedTotal({
    mentionScore,
    rankingScore,
    accuracyScore,
    sentimentScore,
    citationScore,
    competitorScore,
    knowledgeCompletenessScore
  });
  const calculatedAt = new Date().toISOString();

  return {
    id: `metric_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
    brandId,
    period: scope.period,
    platformCode: scope.platformCode,
    optimizationUnitId: scope.optimizationUnitId,
    intentId: scope.intentId,
    category: scope.category,
    mentionScore,
    rankingScore,
    accuracyScore,
    sentimentScore,
    citationScore,
    competitorScore,
    knowledgeCompletenessScore,
    totalScore,
    sampleCount: samples.length,
    insufficientSample: samples.length < 3,
    calculatedAt
  };
}

function weightedTotal(scores: Omit<GEOMetricSnapshot, 'id' | 'brandId' | 'period' | 'platformCode' | 'optimizationUnitId' | 'intentId' | 'category' | 'sampleCount' | 'insufficientSample' | 'calculatedAt' | 'totalScore'>): number {
  return clampScore(
    scores.mentionScore * 0.18 +
    scores.rankingScore * 0.18 +
    scores.accuracyScore * 0.18 +
    scores.sentimentScore * 0.14 +
    scores.citationScore * 0.14 +
    scores.competitorScore * 0.1 +
    scores.knowledgeCompletenessScore * 0.08
  );
}

function calculateRate(samples: AnalysisSample[], predicate: (sample: AnalysisSample) => boolean): number {
  if (samples.length === 0) {
    return 0;
  }

  return clampScore((samples.filter(predicate).length / samples.length) * 100);
}

function averageScore(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return clampScore(values.reduce((sum, value) => sum + value, 0) / values.length);
}

function scoreRank(rank: number | null): number {
  if (rank === null) return 0;
  if (rank === 1) return 100;
  if (rank === 2) return 85;
  if (rank === 3) return 70;
  return 45;
}

function scoreSentiment(sentiment: AnalysisSentiment): number {
  if (sentiment === 'positive') return 100;
  if (sentiment === 'neutral') return 60;
  if (sentiment === 'negative') return 0;
  return 40;
}

function scoreCompetitor(analysis: AnalysisResult): number {
  if (analysis.competitorMentions.length === 0) return 100;
  if (analysis.brandRank === null) return 0;

  const competitorAheadCount = analysis.competitorMentions.filter((competitor) => {
    return competitor.rank !== null && competitor.rank <= (analysis.brandRank ?? 0);
  }).length;

  return clampScore(100 - competitorAheadCount * 35);
}

function currentMetricPeriod(): string {
  return new Date().toISOString().slice(0, 10);
}

function sanitizeAuditMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = new Set(['credentialRef', 'apiKey', 'token', 'password', 'secret', 'providerPayload']);

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, sensitiveKeys.has(key) ? '[REDACTED]' : value])
  );
}

function matchesAuditFilter(log: AuditLog, filter: AuditLogFilter): boolean {
  if (filter.brandId && log.brandId !== filter.brandId) return false;
  if (filter.organizationId && log.organizationId !== filter.organizationId) return false;
  if (filter.action && log.action !== filter.action) return false;
  if (filter.resourceType && log.resourceType !== filter.resourceType) return false;
  if (filter.result && log.result !== filter.result) return false;
  if (filter.from && log.createdAt < filter.from) return false;
  if (filter.to && log.createdAt > filter.to) return false;
  return true;
}

export const platformModes: PlatformMode[] = ['api', 'manual', 'semi_auto', 'mock'];
