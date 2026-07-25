import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type { AIPlatformRuntimeConfig } from '../platforms/adapters/ai-platform.adapter';
import { getMissingApiConfigMessage, getModeValidationMessage } from '../platforms/platform-validation-message';
import type {
  AccessibleBrand,
  AIPlatformCallAudit,
  AIPlatformCallAuditInput,
  AIPlatformCallAuditUpdateInput,
  AIPlatformCallStatus,
  AIPlatformCallType,
  AuditLog,
  AuditLogFilter,
  AuditLogInput,
  AsyncJob,
  AsyncJobInput,
  AsyncJobStatus,
  AsyncJobType,
  AsyncJobUpdateInput,
  LLMTaskRun,
  LLMTaskRunInput,
  LLMTaskStatus,
  LLMTaskType,
  BrandFaq,
  BrandDetail,
  BrandId,
  BrandImportFieldKey,
  BrandMutationInput,
  BrandProfile,
  BrandProfileCompletenessPrompt,
  BrandProfileInput,
  BrandPrompt,
  BrandPromptInput,
  BrandMetricDashboard,
  BrandMetricRankingItem,
  BrandStatus,
  BrandWorkspaceSnapshot,
  BrowserConnectionSession,
  BrowserConnectionStartInput,
  BrowserConnectionStatusInput,
  AIResponse,
  AIResponseParseStatus,
  AnalysisResult,
  AnalysisResultInput,
  AnalysisSentiment,
  AdvisorDashboard,
  AdvisorFollowUpItem,
  AdvisorRecord,
  AdvisorRecordInput,
  AdvisorRecordType,
  Competitor,
  CompetitorCandidate,
  CompetitorCandidateConfirmationResult,
  CompetitorCandidateDecisionInput,
  CompetitorCandidateSourceProvider,
  CompetitorConfirmationLabel,
  CompetitorDashboard,
  CompetitorDiscoveryCandidatesQuery,
  CompetitorDiscoveryRun,
  CompetitorDiscoveryRunInput,
  CompetitorInput,
  CompetitorMention,
  ContentAsset,
  ContentAssetFilter,
  ContentAssetInput,
  ContentAssetStatus,
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
  GrowthOptimizationContentRecommendation,
  GrowthOptimizationPlanConfirmInput,
  GrowthOptimizationPlanConfirmationResult,
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
  ContentStrategyPriority,
  ContentStrategyStatus,
  ContentStrategyType,
  ContentVersion,
  ContentVersionInput,
  DeniedAccessLog,
  GEOMetricSnapshot,
  KnowledgeSource,
  KnowledgeSourceInput,
  KnowledgeSourceStatus,
  ManualResponseInput,
  ManualTestAnswerInput,
  ManualTestAnswerBatchInput,
  ManualTestAnswerBatchResult,
  MultiBrandReportSnapshot,
  MonitoringFrequency,
  MonitoringRunDetail,
  MonitoringRunExecutionUpdateInput,
  MonitoringRunInput,
  MonitoringRunStatus,
  OptimizationTask,
  OptimizationTaskInput,
  OptimizationTaskStatus,
  OptimizationTaskType,
  OptimizationTaskUpdateInput,
  OptimizationUnit,
  OptimizationUnitInput,
  OptimizationUnitPriority,
  OptimizationUnitType,
  OrganizationMember,
  PlatformConfig,
  PlatformConfigInput,
  PlatformMode,
  PlatformValidationResult,
  PublishingAccount,
  PublishingAccountInput,
  PublishingAuthStatus,
  PublishingDashboard,
  PublishingEntryPayload,
  PublishingLoginMode,
  PublishingRecord,
  PublishingRecordInput,
  PublishingRecordStatus,
  PublishingStatusInput,
  PromptBatchGenerateInput,
  PromptTemplate,
  PromptTemplateInput,
  ReportDashboard,
  ReportDataGap,
  ReportInput,
  ReportRecord,
  ReportStatus,
  ReportType,
  RetestPlanInput,
  RetestRecord,
  RetestResultInput,
  SingleBrandReportSnapshot,
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
  UserBrandRole,
  UserIntent,
  UserIntentCategory,
  UserIntentInput,
  BrandStandardAnswer,
  BrandStandardAnswerEvidence,
  BrandStandardAnswerInput,
  BrandStandardAnswerStatus,
  VisibilitySprint,
  VisibilitySprintMetricSummary,
  VisibilitySprintStatus,
  VisibilitySprintStep,
  VisibilitySprintStepCode,
  UserSummary
} from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AIPlatformAdapterRegistry, AIPlatformAdapterSelectionError, createDefaultAIPlatformAdapters } from '../platforms/adapters/ai-platform-adapter.registry';
import { BrowserConnectorRegistry, createDefaultBrowserConnectors } from '../platforms/browser-connectors/browser-connector.registry';
import {
  buildMultiBrandDataGaps,
  buildReportTitle,
  buildSingleBrandDataGaps,
  normalizeReportInput,
  renderMultiBrandReport,
  renderSingleBrandReport
} from './report-renderer';
import { buildAnalysisResultFields } from './analysis-result-builder';
import type {
  BrandStandardAnswerUpdateInput,
  VisibilitySprintCreateInput,
  VisibilitySprintMetricUpdateInput,
  VisibilitySprintRelationsUpdateInput,
  VisibilitySprintStepUpdateInput
} from './permissions.repository.port';

type PrismaBrand = {
  id: string;
  name: string;
  status: string;
  aliases: unknown;
  industry: string | null;
  website: string | null;
  targetCities: unknown;
  businessScope: string | null;
  targetAudience: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaAccessibleBrandPermission = {
  role: string;
  brand: PrismaBrand;
};

type PrismaOrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  status: string;
  createdAt: Date;
  updatedAt: Date;
  organization: {
    id: string;
    name: string;
    status: string;
    createdAt: Date;
    updatedAt: Date;
  };
  role: {
    id: string;
    code: string;
    name: string;
    scope: string;
    permissions: unknown;
    createdAt: Date;
    updatedAt: Date;
  };
};

type PrismaAuditLog = {
  id: string;
  brandId: string | null;
  organizationId: string | null;
  actorUserId: string | null;
  action: string;
  resourceType: string;
  resourceId: string | null;
  result: string;
  errorCode: string | null;
  metadata: unknown;
  createdAt: Date;
};

type PrismaBrandProfile = {
  brandId: string;
  intro: string;
  valueProps: unknown;
  offerings: unknown;
  proofPoints: unknown;
  targetCustomers: unknown;
  recommendedExpressions: unknown;
  blockedExpressions: unknown;
  contentRules: unknown;
  competitors: unknown;
  faqs: unknown;
  completenessScore: number;
  missingFields: unknown;
  updatedAt: Date;
};

type PrismaKnowledgeSource = {
  id: string;
  brandId: string;
  name: string;
  sourceType: string;
  sourceUrl: string | null;
  fileRef: string | null;
  status: string;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaOptimizationUnit = {
  id: string;
  brandId: string;
  name: string;
  type: string;
  targetKeywords: unknown;
  priority: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaTestTheme = {
  id: string;
  brandId: string;
  type: string;
  name: string;
  businessExplanation: string;
  priority: string;
  estimatedValue: string;
  sourceProfileFields: unknown;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaTestQuestionCandidate = {
  id: string;
  brandId: string;
  themeId: string;
  promptId: string | null;
  question: string;
  purposes: unknown;
  targetPlatforms: unknown;
  priority: string;
  estimatedValue: string;
  editable: boolean;
  selected: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaTestPlan = {
  id: string;
  brandId: string;
  name: string;
  status: string;
  questions: unknown;
  platformCodes: unknown;
  connectionSummary: unknown;
  executionMethod: string;
  estimatedDurationMinutes: number;
  confirmationItems: unknown;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaUserIntent = {
  id: string;
  brandId: string;
  optimizationUnitId: string;
  category: string;
  text: string;
  monitoringFrequency: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaPromptTemplate = {
  id: string;
  name: string;
  industry: string | null;
  category: string;
  text: string;
  targetKeywords: unknown;
  platformCodes: unknown;
  frequency: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaBrandPrompt = {
  id: string;
  brandId: string;
  optimizationUnitId: string;
  intentId: string;
  templateId: string | null;
  text: string;
  category: string;
  targetKeywords: unknown;
  platformCodes: unknown;
  monitoringFrequency: string;
  enabled: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaPlatformConfig = {
  id: string;
  brandId: string;
  platformKey: string;
  displayName: string;
  mode: string;
  endpointUrl: string | null;
  modelName: string | null;
  rateLimitPerMinute: number;
  enabled: boolean;
  credentialRef: string | null;
  lastValidation: unknown;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaBrowserConnectionSession = {
  id: string;
  brandId: string;
  platformCode: string;
  status: string;
  loginDetected: boolean;
  authorizedScope: unknown;
  lastOperation: string | null;
  lastIssueType: string | null;
  lastMessage: string | null;
  lastAvailableAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaAIPlatformCallAudit = {
  id: string;
  brandId: string;
  platformCode: string;
  modelName: string | null;
  callType: string;
  status: string;
  durationMs: number | null;
  inputTokenCount: number | null;
  outputTokenCount: number | null;
  costEstimate: { toNumber(): number } | number | null;
  errorCode: string | null;
  errorMessage: string | null;
  retryable: boolean | null;
  startedAt: Date;
  completedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaAsyncJob = {
  id: string;
  brandId: string;
  jobType: string;
  status: string;
  entityId: string;
  attemptCount: number;
  maxAttempts: number;
  nextRunAt: Date | null;
  lastErrorCode: string | null;
  lastErrorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaLLMTaskRun = {
  id: string;
  brandId: string;
  taskType: string;
  status: string;
  jobId: string | null;
  auditId: string | null;
  inputSummary: unknown;
  outputSummary: unknown | null;
  errorCode: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaVisibilitySprint = {
  id: string;
  brandId: string;
  title: string;
  goal: string;
  status: string;
  currentStep: string;
  steps: unknown;
  metricSummary: unknown;
  relatedQuestionIds: unknown;
  relatedTestPlanIds: unknown;
  relatedMonitoringRunIds: unknown;
  relatedStandardAnswerIds: unknown;
  relatedContentTaskIds: unknown;
  relatedPublishingRecordIds: unknown;
  relatedRetestTaskIds: unknown;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaBrandStandardAnswer = {
  id: string;
  brandId: string;
  questionId: string;
  question: string;
  answer: string;
  keyPoints: unknown;
  evidence: unknown;
  status: string;
  reviewedBy: string | null;
  reviewedAt: Date | null;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaMonitoringRun = {
  id: string;
  brandId: string;
  optimizationUnitId: string;
  intentId: string;
  promptId: string;
  testPlanId: string | null;
  platformCode: string;
  status: string;
  startedAt: Date | null;
  completedAt: Date | null;
  errorMessage: string | null;
  retryStatus: string;
  createdAt: Date;
};

type PrismaAIResponse = {
  id: string;
  runId: string;
  brandId: string;
  rawText: string;
  citations: unknown;
  modelName: string | null;
  respondedAt: Date;
  parseStatus: string;
  createdAt: Date;
};

type PrismaAnalysisResult = {
  id: string;
  responseId: string;
  runId: string;
  brandId: string;
  brandMentioned: boolean;
  brandRank: number | null;
  sentiment: string;
  accuracyScore: number;
  citationScore: number;
  platformEvaluation: string;
  recommendationReason: string;
  rankingReason: string;
  expressionCompleteness: string;
  expressionDeviation: string;
  competitorMentions: unknown;
  reviewRequired: boolean;
  updatedAt: Date;
};

type PrismaMetricSnapshot = {
  id: string;
  brandId: string;
  period: string;
  platformCode: string | null;
  optimizationUnitId: string | null;
  intentId: string | null;
  category: string | null;
  mentionScore: number;
  rankingScore: number;
  accuracyScore: number;
  sentimentScore: number;
  citationScore: number;
  competitorScore: number;
  knowledgeCompletenessScore: number;
  totalScore: number;
  sampleCount: number;
  insufficientSample: boolean;
  calculatedAt: Date;
};

type PrismaContentAsset = {
  id: string;
  brandId: string;
  title: string;
  type: string;
  platform: string;
  url: string;
  targetKeywords: unknown;
  reuseOfAssetId: string | null;
  brandAdaptation: string | null;
  status: string;
  publishedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaContentStrategy = {
  id: string;
  brandId: string;
  optimizationUnitId: string;
  intentId: string;
  type: string;
  priority: string;
  suggestedTitle: string;
  targetPlatform: string;
  targetKeywords: unknown;
  relatedPromptIds: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaCompetitor = {
  id: string;
  brandId: string;
  name: string;
  aliases: unknown;
  website: string | null;
  industryTags: unknown;
  comparisonNote: string;
  suppressionRule: unknown;
  confirmationLabel: string | null;
  sourceCandidateId: string | null;
  sourceProvider: string | null;
  nearestCampusDistanceKm: number | null;
  isNationalBenchmark: boolean;
  isCampusFocus: boolean;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaCompetitorDiscoveryRun = {
  id: string;
  brandId: string;
  city: string;
  campusRadiusKm: number;
  keywords: unknown;
  status: string;
  candidateCount: number;
  missingFields: unknown;
  sourceProvider: string;
  providerStatus: string;
  providerMessage: string;
  cacheHit: boolean;
  createdBy: string;
  failureReason: string | null;
  createdAt: Date;
  completedAt: Date | null;
};

type PrismaCompetitorCandidate = {
  id: string;
  runId: string;
  brandId: string;
  sourceProvider: string;
  sourcePoiId: string | null;
  name: string;
  address: string | null;
  city: string | null;
  latitude: number | null;
  longitude: number | null;
  category: string | null;
  distanceToNearestCampusKm: number | null;
  matchedKeywords: unknown;
  score: number;
  suggestedLabel: string;
  confirmedLabel: string | null;
  matchReasons: unknown;
  confidence: string;
  isCampusFocus: boolean;
  decisionStatus: string;
  excludedReason: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaContentGenerationTask = {
  id: string;
  brandId: string;
  strategyId: string;
  growthOptimizationPlanId: string | null;
  targetPlatform: string;
  contentType: string;
  contentTopic: string | null;
  targetKeywords: unknown;
  referenceSources: unknown;
  retestAt: Date | null;
  status: string;
  steps: unknown;
  draftRef: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaGrowthOptimizationPlan = {
  id: string;
  brandId: string;
  sourceTestPlanId: string | null;
  strategyId: string | null;
  sourceRunIds: unknown;
  summary: string;
  reasons: unknown;
  priority: string;
  ownerId: string | null;
  dueDate: Date;
  publishingPlatforms: unknown;
  retestAt: Date;
  contentRecommendations: unknown;
  status: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaContentVersion = {
  id: string;
  brandId: string;
  generationTaskId: string;
  title: string;
  body: string;
  version: number;
  exportFormat: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaContentExportRecord = {
  id: string;
  brandId: string;
  generationTaskId: string;
  versionId: string;
  exportFormat: string;
  fileName: string;
  content: string;
  createdBy: string;
  createdAt: Date;
};

type PrismaPublishingAccount = {
  id: string;
  brandId: string;
  platform: string;
  accountName: string;
  loginMode: string;
  authStatus: string;
  errorMessage: string | null;
  lastAuthorizedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaPublishingRecord = {
  id: string;
  brandId: string;
  contentAssetId: string;
  accountId: string | null;
  generationTaskId: string | null;
  versionId: string | null;
  title: string;
  body: string;
  platform: string;
  accountName: string | null;
  status: string;
  publishedUrl: string | null;
  errorMessage: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaOptimizationTask = {
  id: string;
  brandId: string;
  title: string;
  type: string;
  status: string;
  ownerId: string | null;
  optimizationUnitId: string | null;
  relatedPromptId: string | null;
  relatedPlatformCode: string | null;
  strategyId: string | null;
  growthOptimizationPlanId: string | null;
  sourceRunId: string | null;
  retestRunId: string | null;
  priority: string | null;
  processingNote: string | null;
  contentLink: string | null;
  reviewStatus: string | null;
  retestPlanAt: Date | null;
  retestRecords: unknown;
  dueDate: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaReport = {
  id: string;
  brandId: string;
  type: string;
  title: string;
  periodStart: Date;
  periodEnd: Date;
  status: string;
  content: string;
  dataGaps: unknown;
  snapshot: unknown;
  createdBy: string;
  createdAt: Date;
};

type PrismaAdvisorRecord = {
  id: string;
  brandId: string;
  type: string;
  title: string;
  content: string;
  relatedReportId: string | null;
  followUpItems: unknown;
  createdBy: string;
  createdAt: Date;
};

type PrismaInnerTestFeedback = {
  id: string;
  brandId: string;
  page: string;
  module: string;
  type: string;
  description: string;
  status: string;
  reporterId: string;
  resolutionNote: string | null;
  createdAt: Date;
  updatedAt: Date;
};

type GrowthAnalysisSample = {
  analysis: AnalysisResult;
  runId: string;
  testPlanId?: string;
  platformCode: string;
  promptId: string;
  promptText: string;
  targetKeywords: string[];
  responseText: string;
  profile: BrandProfile;
};

type PrismaCompetitorCandidateCacheEntry = {
  candidates: CompetitorCandidate[];
  providerState: Pick<CompetitorDiscoveryRun, 'providerStatus' | 'providerMessage'>;
};

const prismaCompetitorCandidateCache = new Map<string, PrismaCompetitorCandidateCacheEntry>();

@Injectable()
export class PrismaPermissionsRepository {
  private readonly browserConnectors = new BrowserConnectorRegistry(createDefaultBrowserConnectors());
  private readonly aiAdapters = new AIPlatformAdapterRegistry(createDefaultAIPlatformAdapters());

  constructor(private readonly prisma: PrismaService) {}

  async findUser(userId: string): Promise<UserSummary | null> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    return user
      ? {
          userId: user.id,
          name: user.name,
          email: user.email,
          status: user.status as UserSummary['status']
        }
      : null;
  }

  async listAccessibleBrands(userId: string): Promise<AccessibleBrand[]> {
    if (!(await this.canUseBrandAccess(userId))) {
      return [];
    }

    const permissions = await this.prisma.userBrandPermission.findMany({
      where: {
        userId,
        brand: {
          status: { not: 'archived' }
        }
      },
      include: { brand: true },
      orderBy: { brand: { name: 'asc' } }
    });

    return permissions.map((permission) => this.toAccessibleBrand(permission));
  }

  async listAccessibleBrandDetails(userId: string): Promise<BrandDetail[]> {
    if (!(await this.canUseBrandAccess(userId))) {
      return [];
    }

    const permissions = await this.prisma.userBrandPermission.findMany({
      where: {
        userId,
        brand: {
          status: { not: 'archived' }
        }
      },
      include: { brand: true },
      orderBy: { brand: { name: 'asc' } }
    });

    return permissions.map((permission) => this.toBrandDetail(permission.brand, permission.role as UserBrandRole));
  }

  async findAccessibleBrand(userId: string, brandId: BrandId): Promise<AccessibleBrand | null> {
    const permission = await this.findAccessiblePermission(userId, brandId);

    return permission ? this.toAccessibleBrand(permission) : null;
  }

  async listOrganizationMemberships(userId: string): Promise<OrganizationMember[]> {
    const memberships = await this.prisma.organizationMember.findMany({
      where: {
        userId,
        organization: { status: 'active' }
      },
      include: { organization: true, role: true },
      orderBy: { createdAt: 'asc' }
    });

    return memberships.map((membership) => this.toOrganizationMember(membership as PrismaOrganizationMember));
  }

  async canAccessBrand(userId: string, brandId: BrandId): Promise<boolean> {
    return Boolean(await this.findAccessibleBrand(userId, brandId));
  }

  async createAuditLog(_userId: string, input: AuditLogInput): Promise<AuditLog> {
    const auditLog = await this.prisma.auditLog.create({
      data: {
        brandId: input.brandId ?? null,
        organizationId: input.organizationId ?? null,
        actorUserId: input.actorUserId ?? null,
        action: input.action,
        resourceType: input.resourceType,
        resourceId: input.resourceId ?? null,
        result: input.result,
        errorCode: input.errorCode ?? null,
        metadata: sanitizeAuditMetadata(input.metadata) as Prisma.InputJsonObject,
        ...(input.createdAt ? { createdAt: new Date(input.createdAt) } : {})
      }
    });

    return toAuditLog(auditLog as PrismaAuditLog);
  }

  async listAuditLogs(_userId: string, filter: AuditLogFilter = {}): Promise<AuditLog[]> {
    const auditLogs = await this.prisma.auditLog.findMany({
      where: {
        ...(filter.brandId ? { brandId: filter.brandId } : {}),
        ...(filter.organizationId ? { organizationId: filter.organizationId } : {}),
        ...(filter.action ? { action: filter.action } : {}),
        ...(filter.resourceType ? { resourceType: filter.resourceType } : {}),
        ...(filter.result ? { result: filter.result } : {}),
        ...(filter.from || filter.to
          ? {
              createdAt: {
                ...(filter.from ? { gte: new Date(filter.from) } : {}),
                ...(filter.to ? { lte: new Date(filter.to) } : {})
              }
            }
          : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    return auditLogs.map((auditLog) => toAuditLog(auditLog as PrismaAuditLog));
  }

  async findAccessibleBrandDetail(userId: string, brandId: BrandId): Promise<BrandDetail | null> {
    const permission = await this.findAccessiblePermission(userId, brandId);

    return permission ? this.toBrandDetail(permission.brand, permission.role as UserBrandRole) : null;
  }

  async getBrandWorkspaceSnapshot(userId: string, brandId: BrandId): Promise<BrandWorkspaceSnapshot | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);

    if (!brand) {
      return null;
    }

    const [
      profile,
      optimizationUnits,
      intents,
      prompts,
      competitors,
      contentAssets,
      monitoringRuns,
      reports,
      advisorRecords
    ] = await Promise.all([
      this.prisma.brandProfile.count({ where: { brandId } }),
      this.prisma.optimizationUnit.count({ where: { brandId } }),
      this.prisma.userIntent.count({ where: { brandId } }),
      this.prisma.brandPrompt.count({ where: { brandId } }),
      this.prisma.competitor.count({ where: { brandId } }),
      this.prisma.contentAsset.count({ where: { brandId } }),
      this.prisma.monitoringRun.count({ where: { brandId } }),
      this.prisma.report.count({ where: { brandId } }),
      this.prisma.advisorRecord.count({ where: { brandId } })
    ]);

    return {
      brand,
      relatedCounts: {
        profile,
        optimizationUnits,
        intents,
        prompts,
        competitors,
        contentAssets,
        monitoringRuns,
        reports,
        advisorRecords
      }
    };
  }

  async createBrand(userId: string, input: BrandMutationInput, role: UserBrandRole = 'owner'): Promise<BrandDetail> {
    const brand = await this.prisma.$transaction(async (transaction) => {
      const createdBrand = await transaction.brand.create({
        data: this.toBrandCreateData(input)
      });

      await transaction.userBrandPermission.create({
        data: {
          userId,
          brandId: createdBrand.id,
          role
        }
      });

      await Promise.all(defaultPlatformConfigs.map((config) => transaction.platformConfig.create({
        data: {
          brandId: createdBrand.id,
          platformKey: config.platformCode,
          displayName: config.name,
          mode: config.mode,
          endpointUrl: config.endpointUrl,
          modelName: config.modelName,
          credentialRef: getDefaultCredentialRef(config),
          rateLimitPerMinute: config.rateLimitPerMinute ?? defaultRateLimit(config.mode),
          enabled: config.enabled ?? true
        }
      })));

      return createdBrand;
    });

    return this.toBrandDetail(brand, role);
  }

  async updateBrand(userId: string, brandId: BrandId, input: Partial<BrandMutationInput>): Promise<BrandDetail | null> {
    const permission = await this.findAccessiblePermission(userId, brandId);

    if (!permission) {
      return null;
    }

    const brand = await this.prisma.brand.update({
      where: { id: brandId },
      data: this.toBrandUpdateData(input)
    });

    return this.toBrandDetail(brand, permission.role as UserBrandRole);
  }

  async updateBrandStatus(userId: string, brandId: BrandId, status: BrandStatus): Promise<BrandDetail | null> {
    return this.updateBrand(userId, brandId, { status });
  }

  async getBrandProfile(userId: string, brandId: BrandId): Promise<BrandProfile | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);

    if (!brand) {
      return null;
    }

    const profile = await this.prisma.brandProfile.findUnique({ where: { brandId } });

    return profile ? toBrandProfile(profile) : createEmptyProfile(brandId);
  }

  async saveBrandProfile(userId: string, brandId: BrandId, input: BrandProfileInput): Promise<BrandProfile | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);

    if (!brand) {
      return null;
    }

    const normalized = normalizeProfileInput(input);
    const completeness = calculateBrandProfileCompleteness(brand, normalized);
    const profile = await this.prisma.brandProfile.upsert({
      where: { brandId },
      create: {
        brandId,
        ...toBrandProfileData(normalized, completeness.score, completeness.missingFields)
      },
      update: toBrandProfileData(normalized, completeness.score, completeness.missingFields)
    });

    return toBrandProfile(profile, completeness.prompts);
  }

  async listKnowledgeSources(userId: string, brandId: BrandId): Promise<KnowledgeSource[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const sources = await this.prisma.knowledgeSource.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return sources.map(toKnowledgeSource);
  }

  async createKnowledgeSource(userId: string, brandId: BrandId, input: KnowledgeSourceInput): Promise<KnowledgeSource | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizeKnowledgeSourceInput(input);
    const source = await this.prisma.knowledgeSource.create({
      data: {
        brandId,
        name: normalized.name,
        sourceType: normalized.sourceType,
        sourceUrl: normalized.sourceUrl,
        fileRef: normalized.fileRef,
        status: normalized.status ?? 'pending'
      }
    });

    return toKnowledgeSource(source);
  }

  async updateKnowledgeSourceStatus(
    userId: string,
    brandId: BrandId,
    sourceId: string,
    status: KnowledgeSource['status'],
    errorMessage?: string
  ): Promise<KnowledgeSource | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const source = await this.prisma.knowledgeSource.findFirst({ where: { id: sourceId, brandId } });
    if (!source) {
      return null;
    }

    const updated = await this.prisma.knowledgeSource.update({
      where: { id: sourceId },
      data: { status, errorMessage }
    });

    return toKnowledgeSource(updated);
  }

  async listOptimizationUnits(userId: string, brandId: BrandId): Promise<OptimizationUnit[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const units = await this.prisma.optimizationUnit.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return Promise.all(units.map((unit) => this.toOptimizationUnitWithCounts(unit)));
  }

  async getOptimizationUnit(userId: string, brandId: BrandId, unitId: string): Promise<OptimizationUnit | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const unit = await this.prisma.optimizationUnit.findFirst({ where: { id: unitId, brandId } });

    return unit ? this.toOptimizationUnitWithCounts(unit) : null;
  }

  async createOptimizationUnit(userId: string, brandId: BrandId, input: OptimizationUnitInput): Promise<OptimizationUnit | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizeOptimizationUnitInput(input);
    const unit = await this.prisma.optimizationUnit.create({
      data: {
        brandId,
        name: normalized.name,
        type: normalized.type,
        targetKeywords: normalized.targetKeywords,
        priority: normalized.priority,
        enabled: normalized.enabled
      }
    });

    return this.toOptimizationUnitWithCounts(unit);
  }

  async updateOptimizationUnit(userId: string, brandId: BrandId, unitId: string, input: Partial<OptimizationUnitInput>): Promise<OptimizationUnit | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.optimizationUnit.findFirst({ where: { id: unitId, brandId } });
    if (!exists) {
      return null;
    }

    const normalized = normalizePartialOptimizationUnitInput(input);
    const unit = await this.prisma.optimizationUnit.update({
      where: { id: unitId },
      data: {
        ...(normalized.name !== undefined ? { name: normalized.name } : {}),
        ...(normalized.type !== undefined ? { type: normalized.type } : {}),
        ...(normalized.targetKeywords !== undefined ? { targetKeywords: normalized.targetKeywords } : {}),
        ...(normalized.priority !== undefined ? { priority: normalized.priority } : {}),
        ...(normalized.enabled !== undefined ? { enabled: normalized.enabled } : {})
      }
    });

    return this.toOptimizationUnitWithCounts(unit);
  }

  async listTestThemes(userId: string, brandId: BrandId): Promise<TestTheme[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const themes = await this.prisma.testTheme.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return themes.map(toTestTheme);
  }

  async createTestTheme(userId: string, brandId: BrandId, input: TestThemeInput): Promise<TestTheme | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizeTestThemeInput(input);
    const theme = await this.prisma.testTheme.create({
      data: {
        brandId,
        type: normalized.type,
        name: normalized.name,
        businessExplanation: normalized.businessExplanation,
        priority: normalized.priority,
        estimatedValue: normalized.estimatedValue,
        sourceProfileFields: normalized.sourceProfileFields,
        enabled: normalized.enabled
      }
    });

    return toTestTheme(theme);
  }

  async updateTestTheme(userId: string, brandId: BrandId, themeId: string, input: Partial<TestThemeInput>): Promise<TestTheme | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.testTheme.findFirst({ where: { id: themeId, brandId } });
    if (!exists) {
      return null;
    }

    const normalized = normalizePartialTestThemeInput(input);
    const theme = await this.prisma.testTheme.update({
      where: { id: themeId },
      data: {
        ...(normalized.type !== undefined ? { type: normalized.type } : {}),
        ...(normalized.name !== undefined ? { name: normalized.name } : {}),
        ...(normalized.businessExplanation !== undefined ? { businessExplanation: normalized.businessExplanation } : {}),
        ...(normalized.priority !== undefined ? { priority: normalized.priority } : {}),
        ...(normalized.estimatedValue !== undefined ? { estimatedValue: normalized.estimatedValue } : {}),
        ...(normalized.enabled !== undefined ? { enabled: normalized.enabled } : {}),
        ...(normalized.sourceProfileFields !== undefined ? { sourceProfileFields: normalized.sourceProfileFields } : {})
      }
    });

    return toTestTheme(theme);
  }

  async listTestQuestionCandidates(userId: string, brandId: BrandId, query: TestQuestionCandidateListQuery = {}): Promise<TestQuestionCandidate[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const candidates = await this.prisma.testQuestionCandidate.findMany({
      where: {
        brandId,
        ...(query.themeId ? { themeId: query.themeId } : {}),
        ...(query.selected !== undefined ? { selected: query.selected } : {})
      },
      orderBy: { createdAt: 'desc' }
    });

    return filterTestQuestionCandidates(candidates.map(toTestQuestionCandidate), brandId, query);
  }

  async createTestQuestionCandidate(userId: string, brandId: BrandId, input: TestQuestionCandidateInput): Promise<TestQuestionCandidate | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const theme = await this.prisma.testTheme.findFirst({ where: { id: input.themeId, brandId } });
    if (!theme) {
      return null;
    }

    const normalized = normalizeTestQuestionCandidateInput(input);
    const candidate = await this.prisma.testQuestionCandidate.create({
      data: {
        brandId,
        themeId: normalized.themeId,
        promptId: normalized.promptId,
        question: normalized.question,
        purposes: normalized.purposes,
        targetPlatforms: normalized.targetPlatforms,
        priority: normalized.priority,
        estimatedValue: normalized.estimatedValue,
        editable: normalized.editable,
        selected: normalized.selected
      }
    });

    return toTestQuestionCandidate(candidate);
  }

  async updateTestQuestionCandidate(userId: string, brandId: BrandId, candidateId: string, input: TestQuestionCandidateUpdateInput): Promise<TestQuestionCandidate | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.testQuestionCandidate.findFirst({ where: { id: candidateId, brandId } });
    if (!exists || !exists.editable) {
      return null;
    }

    if (input.themeId !== undefined && !(await this.prisma.testTheme.findFirst({ where: { id: input.themeId, brandId } }))) {
      return null;
    }

    const normalized = normalizePartialTestQuestionCandidateInput(input);
    const candidate = await this.prisma.testQuestionCandidate.update({
      where: { id: candidateId },
      data: {
        ...(normalized.themeId !== undefined ? { themeId: normalized.themeId } : {}),
        ...(normalized.promptId !== undefined ? { promptId: normalized.promptId } : {}),
        ...(normalized.question !== undefined ? { question: normalized.question } : {}),
        ...(normalized.purposes !== undefined ? { purposes: normalized.purposes } : {}),
        ...(normalized.targetPlatforms !== undefined ? { targetPlatforms: normalized.targetPlatforms } : {}),
        ...(normalized.priority !== undefined ? { priority: normalized.priority } : {}),
        ...(normalized.estimatedValue !== undefined ? { estimatedValue: normalized.estimatedValue } : {}),
        ...(normalized.editable !== undefined ? { editable: normalized.editable } : {}),
        ...(normalized.selected !== undefined ? { selected: normalized.selected } : {})
      }
    });

    return toTestQuestionCandidate(candidate);
  }

  async updateTestQuestionCandidateSelection(userId: string, brandId: BrandId, input: TestQuestionCandidateSelectionInput): Promise<TestQuestionCandidate[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const where = {
      brandId,
      id: { in: input.candidateIds },
      ...(input.themeId ? { themeId: input.themeId } : {})
    };
    await this.prisma.testQuestionCandidate.updateMany({ where, data: { selected: input.selected } });
    const candidates = await this.prisma.testQuestionCandidate.findMany({ where, orderBy: { createdAt: 'desc' } });

    return candidates.map(toTestQuestionCandidate);
  }

  async listTestPlans(userId: string, brandId: BrandId): Promise<TestPlan[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const plans = await this.prisma.testPlan.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return plans.map(toTestPlan);
  }

  async createTestPlan(userId: string, brandId: BrandId, input: TestPlanInput): Promise<TestPlan | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const selectedCandidates = await this.resolveTestPlanCandidates(brandId, input);
    const questions = input.questions?.length ? input.questions : selectedCandidates.map(toTestPlanQuestion);
    if (questions.length === 0) {
      return null;
    }

    const platformCodes = normalizeTestPlanPlatformCodes(input.platformCodes?.length ? input.platformCodes : questions.flatMap((question) => question.targetPlatforms));
    if (platformCodes.length === 0) {
      return null;
    }

    const connectionSummary = await this.buildConnectionSummary(brandId, platformCodes);
    const confirmationItems = buildTestPlanConfirmationItems(connectionSummary);
    const plan = await this.prisma.testPlan.create({
      data: {
        brandId,
        name: input.name?.trim() || `${brand.name}首轮 AI 回复监测计划`,
        status: inferTestPlanStatus(connectionSummary),
        questions,
        platformCodes,
        connectionSummary,
        executionMethod: input.executionMethod ?? inferExecutionMethod(connectionSummary),
        estimatedDurationMinutes: estimateTestPlanDuration(questions.length, platformCodes.length),
        confirmationItems,
        createdBy: userId
      }
    });

    return toTestPlan(plan);
  }

  async executeTestPlan(userId: string, brandId: BrandId, planId: string): Promise<TestPlanExecutionResult | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const storedPlan = await this.prisma.testPlan.findFirst({ where: { id: planId, brandId } });
    if (!storedPlan) {
      return null;
    }

    const plan = toTestPlan(storedPlan);
    const result = await executeTestPlanSteps(plan, async (question, platformCode) => {
      if (!question.promptId) return null;

      const run = await this.createMonitoringRun(userId, brandId, { promptId: question.promptId, platformCode });
      if (run) {
        await this.prisma.monitoringRun.update({ where: { id: run.id }, data: { testPlanId: plan.id } });
      }

      return run;
    }, async (question, platformCode) => {
      return this.executeBrowserTestPlanStep(userId, brandId, plan.id, question, platformCode);
    }, async (question, platformCode) => {
      return this.executeApiTestPlanStep(userId, brandId, plan.id, question, platformCode);
    });

    const updated = await this.prisma.testPlan.update({
      where: { id: plan.id },
      data: {
        status: result.status,
        confirmationItems: result.confirmationItems
      }
    });
    const runIds = await this.prisma.monitoringRun.findMany({ where: { testPlanId: plan.id }, select: { id: true } });
    result.plan = { ...toTestPlan(updated), monitoringRunIds: runIds.map((run) => run.id) };

    return result;
  }

  async listTestPlanTemplates(userId: string, brandId: BrandId): Promise<TestPlanTemplate[] | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    return recommendTestPlanTemplates(brand);
  }

  async applyTestPlanTemplate(userId: string, brandId: BrandId, input: TestPlanTemplateApplicationInput): Promise<TestPlan | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
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

  async duplicateTestPlan(userId: string, brandId: BrandId, planId: string, input: TestPlanDuplicateInput = {}): Promise<TestPlan | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const source = await this.prisma.testPlan.findFirst({ where: { id: planId, brandId } });
    if (!source) {
      return null;
    }

    const plan = toTestPlan(source);

    return this.createTestPlan(userId, brandId, {
      name: input.name?.trim() || `${plan.name}${input.retest ? '复测' : '副本'}`,
      questions: plan.questions,
      platformCodes: plan.platformCodes,
      executionMethod: plan.executionMethod
    });
  }

  private async resolveTestPlanCandidates(brandId: BrandId, input: TestPlanInput): Promise<TestQuestionCandidate[]> {
    const candidates = await this.prisma.testQuestionCandidate.findMany({
      where: {
        brandId,
        ...(input.candidateIds?.length ? { id: { in: input.candidateIds } } : { selected: true })
      },
      orderBy: { createdAt: 'desc' }
    });

    return filterTestQuestionCandidates(candidates.map(toTestQuestionCandidate), brandId);
  }

  private async buildConnectionSummary(brandId: BrandId, platformCodes: string[]): Promise<TestPlan['connectionSummary']> {
    const configs = await this.prisma.platformConfig.findMany({ where: { brandId, platformKey: { in: platformCodes }, enabled: true } });

    return buildConnectionSummaryFromConfigs(platformCodes, configs.map(toPublicPlatformConfig));
  }

  async listUserIntents(userId: string, brandId: BrandId): Promise<UserIntent[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const intents = await this.prisma.userIntent.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return intents.map(toUserIntent);
  }

  async createUserIntent(userId: string, brandId: BrandId, input: UserIntentInput): Promise<UserIntent | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId)) || !(await this.findOptimizationUnitForBrand(brandId, input.optimizationUnitId))) {
      return null;
    }

    const normalized = normalizeUserIntentInput(input);
    const intent = await this.prisma.userIntent.create({
      data: {
        brandId,
        optimizationUnitId: normalized.optimizationUnitId,
        category: normalized.category,
        text: normalized.text,
        monitoringFrequency: normalized.monitoringFrequency,
        enabled: normalized.enabled
      }
    });

    return toUserIntent(intent);
  }

  async updateUserIntent(userId: string, brandId: BrandId, intentId: string, input: Partial<UserIntentInput>): Promise<UserIntent | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.userIntent.findFirst({ where: { id: intentId, brandId } });
    if (!exists) {
      return null;
    }

    if (input.optimizationUnitId !== undefined && !(await this.findOptimizationUnitForBrand(brandId, input.optimizationUnitId))) {
      return null;
    }

    const normalized = normalizePartialUserIntentInput(input);
    const intent = await this.prisma.userIntent.update({
      where: { id: intentId },
      data: {
        ...(normalized.optimizationUnitId !== undefined ? { optimizationUnitId: normalized.optimizationUnitId } : {}),
        ...(normalized.category !== undefined ? { category: normalized.category } : {}),
        ...(normalized.text !== undefined ? { text: normalized.text } : {}),
        ...(normalized.monitoringFrequency !== undefined ? { monitoringFrequency: normalized.monitoringFrequency } : {}),
        ...(normalized.enabled !== undefined ? { enabled: normalized.enabled } : {})
      }
    });

    return toUserIntent(intent);
  }

  async listPromptTemplates(): Promise<PromptTemplate[]> {
    const templates = await this.prisma.promptTemplate.findMany({ orderBy: { createdAt: 'desc' } });

    return templates.map(toPromptTemplate);
  }

  async createPromptTemplate(input: PromptTemplateInput): Promise<PromptTemplate> {
    const normalized = normalizePromptTemplateInput(input);
    const template = await this.prisma.promptTemplate.create({
      data: {
        name: normalized.name,
        industry: normalized.industry,
        category: normalized.category,
        text: normalized.text,
        targetKeywords: normalized.targetKeywords,
        platformCodes: normalized.platformCodes,
        frequency: normalized.frequency
      }
    });

    return toPromptTemplate(template);
  }

  async listBrandPrompts(userId: string, brandId: BrandId): Promise<BrandPrompt[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const prompts = await this.prisma.brandPrompt.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return prompts.map(toBrandPrompt);
  }

  async batchGenerateBrandPrompts(userId: string, brandId: BrandId, input: PromptBatchGenerateInput): Promise<BrandPrompt[] | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const template = await this.prisma.promptTemplate.findUnique({ where: { id: input.templateId } });
    if (!template) {
      return null;
    }

    const requestedIds = new Set(input.intentIds ?? []);
    const intents = await this.prisma.userIntent.findMany({
      where: {
        brandId,
        enabled: true,
        ...(requestedIds.size > 0 ? { id: { in: [...requestedIds] } } : {})
      },
      orderBy: { createdAt: 'desc' }
    });
    const units = await this.prisma.optimizationUnit.findMany({ where: { brandId } });
    const unitsById = new Map(units.map((unit) => [unit.id, unit]));

    const prompts = await this.prisma.$transaction(
      intents.map((intent) => {
        const unit = unitsById.get(intent.optimizationUnitId) ?? null;
        return this.prisma.brandPrompt.create({
          data: this.toBrandPromptCreateData(brand, intent, template, unit)
        });
      })
    );

    return prompts.map(toBrandPrompt);
  }

  async updateBrandPrompt(userId: string, brandId: BrandId, promptId: string, input: Partial<BrandPromptInput>): Promise<BrandPrompt | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.brandPrompt.findFirst({ where: { id: promptId, brandId } });
    if (!exists) {
      return null;
    }

    const normalized = normalizePartialBrandPromptInput(input);
    const prompt = await this.prisma.brandPrompt.update({
      where: { id: promptId },
      data: {
        ...(normalized.text !== undefined ? { text: normalized.text } : {}),
        ...(normalized.targetKeywords !== undefined ? { targetKeywords: normalized.targetKeywords } : {}),
        ...(normalized.platformCodes !== undefined ? { platformCodes: normalized.platformCodes } : {}),
        ...(normalized.monitoringFrequency !== undefined ? { monitoringFrequency: normalized.monitoringFrequency } : {}),
        ...(normalized.enabled !== undefined ? { enabled: normalized.enabled } : {})
      }
    });

    return toBrandPrompt(prompt);
  }

  async listPlatformConfigs(userId: string, brandId: BrandId): Promise<PlatformConfig[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const configs = await this.prisma.platformConfig.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return configs.map(toPublicPlatformConfig);
  }

  async getPlatformRuntimeConfig(userId: string, brandId: BrandId, platformCode: string): Promise<AIPlatformRuntimeConfig | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const config = await this.prisma.platformConfig.findFirst({ where: { brandId, platformKey: platformCode, enabled: true } });

    return config ? toRuntimePlatformConfig(config) : null;
  }

  async getPlatformRuntimeConfigById(userId: string, brandId: BrandId, platformId: string): Promise<AIPlatformRuntimeConfig | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const config = await this.prisma.platformConfig.findFirst({ where: { id: platformId, brandId } });

    return config ? toRuntimePlatformConfig(config) : null;
  }

  async savePlatformValidationResult(userId: string, brandId: BrandId, platformId: string, result: PlatformValidationResult): Promise<PlatformValidationResult | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.platformConfig.findFirst({ where: { id: platformId, brandId } });
    if (!exists) {
      return null;
    }

    await this.prisma.platformConfig.update({ where: { id: platformId }, data: { lastValidation: result } });

    return result;
  }

  async createPlatformConfig(userId: string, brandId: BrandId, input: PlatformConfigInput): Promise<PlatformConfig | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizePlatformConfigInput(input);
    const exists = await this.prisma.platformConfig.findUnique({ where: { brandId_platformKey: { brandId, platformKey: normalized.platformCode } } });
    if (exists) {
      return null;
    }

    const config = await this.prisma.platformConfig.create({
      data: {
        brandId,
        platformKey: normalized.platformCode,
        displayName: normalized.name,
        mode: normalized.mode,
        endpointUrl: normalized.endpointUrl,
        modelName: normalized.modelName,
        rateLimitPerMinute: normalized.rateLimitPerMinute ?? defaultRateLimit(normalized.mode),
        enabled: normalized.enabled ?? true,
        credentialRef: normalized.credentialRef
      }
    });

    return toPublicPlatformConfig(config);
  }

  async updatePlatformConfig(userId: string, brandId: BrandId, platformId: string, input: Partial<PlatformConfigInput>): Promise<PlatformConfig | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.platformConfig.findFirst({ where: { id: platformId, brandId } });
    if (!exists) {
      return null;
    }

    const normalized = normalizePartialPlatformConfigInput(input);
    const config = await this.prisma.platformConfig.update({
      where: { id: platformId },
      data: {
        ...(normalized.platformCode !== undefined ? { platformKey: normalized.platformCode } : {}),
        ...(normalized.name !== undefined ? { displayName: normalized.name } : {}),
        ...(normalized.mode !== undefined ? { mode: normalized.mode } : {}),
        ...(normalized.endpointUrl !== undefined ? { endpointUrl: normalized.endpointUrl } : {}),
        ...(normalized.modelName !== undefined ? { modelName: normalized.modelName } : {}),
        ...(normalized.rateLimitPerMinute !== undefined ? { rateLimitPerMinute: normalized.rateLimitPerMinute } : {}),
        ...(normalized.credentialRef !== undefined ? { credentialRef: normalized.credentialRef } : {}),
        ...(normalized.enabled !== undefined ? { enabled: normalized.enabled } : {})
      }
    });

    return toPublicPlatformConfig(config);
  }

  async validatePlatformConfig(userId: string, brandId: BrandId, platformId: string): Promise<PlatformValidationResult | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const config = await this.prisma.platformConfig.findFirst({ where: { id: platformId, brandId } });
    if (!config) {
      return null;
    }

    const result = validateStoredPlatformConfig(config);
    await this.prisma.platformConfig.update({ where: { id: platformId }, data: { lastValidation: result } });

    return result;
  }

  async listBrowserConnectionSessions(userId: string, brandId: BrandId): Promise<BrowserConnectionSession[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const sessions = await this.prisma.browserConnectionSession.findMany({ where: { brandId }, orderBy: { updatedAt: 'desc' } });

    return sessions.map(toBrowserConnectionSession);
  }

  async startBrowserConnectionSession(userId: string, brandId: BrandId, input: BrowserConnectionStartInput): Promise<BrowserConnectionSession | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const session = await this.prisma.browserConnectionSession.create({
      data: {
        brandId,
        platformCode: input.platformCode.trim(),
        status: 'opening',
        loginDetected: false,
        authorizedScope: buildBrowserAuthorizedScope(brandId, input.platformCode.trim(), input.testPlanId),
        lastOperation: 'open_login_page',
        lastMessage: '正在打开浏览器登录页。'
      }
    });

    return toBrowserConnectionSession(session);
  }

  async updateBrowserConnectionSession(userId: string, brandId: BrandId, sessionId: string, input: BrowserConnectionStatusInput): Promise<BrowserConnectionSession | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.browserConnectionSession.findFirst({ where: { id: sessionId, brandId } });
    if (!exists) {
      return null;
    }

    const session = await this.prisma.browserConnectionSession.update({
      where: { id: sessionId },
      data: {
        status: input.status,
        ...(input.loginDetected !== undefined ? { loginDetected: input.loginDetected } : {}),
        ...(input.lastOperation !== undefined ? { lastOperation: input.lastOperation } : {}),
        ...(input.lastIssueType !== undefined ? { lastIssueType: input.lastIssueType } : {}),
        ...(input.lastMessage !== undefined ? { lastMessage: input.lastMessage } : {}),
        ...(input.lastAvailableAt !== undefined ? { lastAvailableAt: new Date(input.lastAvailableAt) } : {})
      }
    });

    return toBrowserConnectionSession(session);
  }

  async listAIPlatformCallAudits(userId: string, brandId: BrandId): Promise<AIPlatformCallAudit[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const audits = await this.prisma.aIPlatformCallAudit.findMany({ where: { brandId }, orderBy: { startedAt: 'desc' } });

    return audits.map(toAIPlatformCallAudit);
  }

  async createAIPlatformCallAudit(userId: string, brandId: BrandId, input: AIPlatformCallAuditInput): Promise<AIPlatformCallAudit | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const audit = await this.prisma.aIPlatformCallAudit.create({
      data: {
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
        startedAt: input.startedAt ? new Date(input.startedAt) : undefined,
        completedAt: input.completedAt ? new Date(input.completedAt) : undefined
      }
    });

    return toAIPlatformCallAudit(audit);
  }

  async updateAIPlatformCallAudit(userId: string, brandId: BrandId, auditId: string, input: AIPlatformCallAuditUpdateInput): Promise<AIPlatformCallAudit | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.aIPlatformCallAudit.findFirst({ where: { id: auditId, brandId } });
    if (!exists) {
      return null;
    }

    const audit = await this.prisma.aIPlatformCallAudit.update({
      where: { id: auditId },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.modelName !== undefined ? { modelName: input.modelName.trim() } : {}),
        ...(input.durationMs !== undefined ? { durationMs: input.durationMs } : {}),
        ...(input.inputTokenCount !== undefined ? { inputTokenCount: input.inputTokenCount } : {}),
        ...(input.outputTokenCount !== undefined ? { outputTokenCount: input.outputTokenCount } : {}),
        ...(input.costEstimate !== undefined ? { costEstimate: input.costEstimate } : {}),
        ...(input.errorCode !== undefined ? { errorCode: input.errorCode.trim() } : {}),
        ...(input.errorMessage !== undefined ? { errorMessage: input.errorMessage.trim() } : {}),
        ...(input.retryable !== undefined ? { retryable: input.retryable } : {}),
        ...(input.completedAt !== undefined ? { completedAt: input.completedAt ? new Date(input.completedAt) : null } : {})
      }
    });

    return toAIPlatformCallAudit(audit);
  }

  async listAsyncJobs(userId: string, brandId: BrandId, status?: AsyncJobStatus): Promise<AsyncJob[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const jobs = await this.prisma.asyncJob.findMany({
      where: { brandId, ...(status ? { status } : {}) },
      orderBy: [{ nextRunAt: 'asc' }, { createdAt: 'asc' }]
    });

    return jobs.map(toAsyncJob);
  }

  async getAsyncJob(userId: string, brandId: BrandId, jobId: string): Promise<AsyncJob | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const job = await this.prisma.asyncJob.findFirst({ where: { id: jobId, brandId } });

    return job ? toAsyncJob(job) : null;
  }

  async createAsyncJob(userId: string, brandId: BrandId, input: AsyncJobInput): Promise<AsyncJob | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const job = await this.prisma.asyncJob.create({
      data: {
        brandId,
        jobType: input.jobType,
        status: input.status ?? 'queued',
        entityId: input.entityId,
        attemptCount: input.attemptCount ?? 0,
        maxAttempts: input.maxAttempts ?? 3,
        nextRunAt: input.nextRunAt ? new Date(input.nextRunAt) : undefined,
        lastErrorCode: input.lastErrorCode?.trim(),
        lastErrorMessage: input.lastErrorMessage?.trim()
      }
    });

    return toAsyncJob(job);
  }

  async updateAsyncJob(userId: string, brandId: BrandId, jobId: string, input: AsyncJobUpdateInput): Promise<AsyncJob | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.asyncJob.findFirst({ where: { id: jobId, brandId } });
    if (!exists) {
      return null;
    }

    const job = await this.prisma.asyncJob.update({
      where: { id: jobId },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.attemptCount !== undefined ? { attemptCount: input.attemptCount } : {}),
        ...(input.maxAttempts !== undefined ? { maxAttempts: input.maxAttempts } : {}),
        ...(input.nextRunAt !== undefined ? { nextRunAt: input.nextRunAt ? new Date(input.nextRunAt) : null } : {}),
        ...(input.lastErrorCode !== undefined ? { lastErrorCode: input.lastErrorCode.trim() } : {}),
        ...(input.lastErrorMessage !== undefined ? { lastErrorMessage: input.lastErrorMessage.trim() } : {})
      }
    });

    return toAsyncJob(job);
  }

  async listLLMTaskRuns(userId: string, brandId: BrandId): Promise<LLMTaskRun[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const runs = await this.prisma.lLMTaskRun.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return runs.map(toLLMTaskRun);
  }

  async createLLMTaskRun(userId: string, brandId: BrandId, input: LLMTaskRunInput): Promise<LLMTaskRun | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const run = await this.prisma.lLMTaskRun.create({
      data: {
        brandId,
        taskType: input.taskType,
        status: input.status,
        jobId: input.jobId,
        auditId: input.auditId,
        inputSummary: (input.inputSummary ?? {}) as Prisma.InputJsonObject,
        outputSummary: input.outputSummary as Prisma.InputJsonObject | undefined,
        errorCode: input.errorCode?.trim(),
        errorMessage: input.errorMessage?.trim()
      }
    });

    return toLLMTaskRun(run);
  }

  async listVisibilitySprints(userId: string, brandId: BrandId): Promise<VisibilitySprint[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const sprints = await this.prisma.visibilitySprint.findMany({ where: { brandId }, orderBy: { updatedAt: 'desc' } });

    return sprints.map(toVisibilitySprint);
  }

  async getVisibilitySprint(userId: string, brandId: BrandId, sprintId: string): Promise<VisibilitySprint | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const sprint = await this.prisma.visibilitySprint.findFirst({ where: { id: sprintId, brandId } });

    return sprint ? toVisibilitySprint(sprint) : null;
  }

  async getCurrentVisibilitySprint(userId: string, brandId: BrandId): Promise<VisibilitySprint | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const activeSprint = await this.prisma.visibilitySprint.findFirst({
      where: { brandId, status: { in: ['running', 'waiting_confirmation', 'draft'] } },
      orderBy: { updatedAt: 'desc' }
    });
    if (activeSprint) {
      return toVisibilitySprint(activeSprint);
    }

    const latestSprint = await this.prisma.visibilitySprint.findFirst({ where: { brandId }, orderBy: { updatedAt: 'desc' } });

    return latestSprint ? toVisibilitySprint(latestSprint) : null;
  }

  async createVisibilitySprint(userId: string, brandId: BrandId, input: VisibilitySprintCreateInput): Promise<VisibilitySprint | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const timestamp = new Date().toISOString();
    const currentStep = input.currentStep ?? 'question_radar';
    const sprint = await this.prisma.visibilitySprint.create({
      data: {
        id: `visibility_sprint_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        brandId,
        title: input.title.trim(),
        goal: input.goal.trim(),
        status: input.status ?? 'draft',
        currentStep,
        steps: (input.steps ?? createDefaultVisibilitySprintSteps(currentStep)) as Prisma.InputJsonArray,
        metricSummary: {
          ...createEmptyVisibilitySprintMetricSummary(),
          ...input.metricSummary,
          updatedAt: timestamp
        } as Prisma.InputJsonObject,
        relatedQuestionIds: input.relatedQuestionIds ?? [],
        relatedTestPlanIds: input.relatedTestPlanIds ?? [],
        relatedMonitoringRunIds: input.relatedMonitoringRunIds ?? [],
        relatedStandardAnswerIds: input.relatedStandardAnswerIds ?? [],
        relatedContentTaskIds: input.relatedContentTaskIds ?? [],
        relatedPublishingRecordIds: input.relatedPublishingRecordIds ?? [],
        relatedRetestTaskIds: input.relatedRetestTaskIds ?? [],
        createdBy: userId
      }
    });

    return toVisibilitySprint(sprint);
  }

  async updateVisibilitySprintStep(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintStepUpdateInput): Promise<VisibilitySprint | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.visibilitySprint.findFirst({ where: { id: sprintId, brandId } });
    if (!exists) {
      return null;
    }

    const sprint = await this.prisma.visibilitySprint.update({
      where: { id: sprintId },
      data: {
        ...(input.status !== undefined ? { status: input.status } : {}),
        currentStep: input.currentStep,
        steps: (input.steps ?? createDefaultVisibilitySprintSteps(input.currentStep)) as Prisma.InputJsonArray
      }
    });

    return toVisibilitySprint(sprint);
  }

  async updateVisibilitySprintMetrics(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintMetricUpdateInput): Promise<VisibilitySprint | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.visibilitySprint.findFirst({ where: { id: sprintId, brandId } });
    if (!exists) {
      return null;
    }

    const metricSummary = {
      ...toVisibilitySprintMetricSummary(exists.metricSummary),
      ...input,
      updatedAt: new Date().toISOString()
    };
    const sprint = await this.prisma.visibilitySprint.update({
      where: { id: sprintId },
      data: { metricSummary: metricSummary as Prisma.InputJsonObject }
    });

    return toVisibilitySprint(sprint);
  }

  async updateVisibilitySprintRelations(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintRelationsUpdateInput): Promise<VisibilitySprint | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.visibilitySprint.findFirst({ where: { id: sprintId, brandId } });
    if (!exists) {
      return null;
    }

    const sprint = await this.prisma.visibilitySprint.update({
      where: { id: sprintId },
      data: {
        ...(input.relatedQuestionIds !== undefined ? { relatedQuestionIds: input.relatedQuestionIds } : {}),
        ...(input.relatedTestPlanIds !== undefined ? { relatedTestPlanIds: input.relatedTestPlanIds } : {}),
        ...(input.relatedMonitoringRunIds !== undefined ? { relatedMonitoringRunIds: input.relatedMonitoringRunIds } : {}),
        ...(input.relatedStandardAnswerIds !== undefined ? { relatedStandardAnswerIds: input.relatedStandardAnswerIds } : {}),
        ...(input.relatedContentTaskIds !== undefined ? { relatedContentTaskIds: input.relatedContentTaskIds } : {}),
        ...(input.relatedPublishingRecordIds !== undefined ? { relatedPublishingRecordIds: input.relatedPublishingRecordIds } : {}),
        ...(input.relatedRetestTaskIds !== undefined ? { relatedRetestTaskIds: input.relatedRetestTaskIds } : {})
      }
    });

    return toVisibilitySprint(sprint);
  }

  async listBrandStandardAnswers(userId: string, brandId: BrandId, questionId?: string): Promise<BrandStandardAnswer[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const answers = await this.prisma.brandStandardAnswer.findMany({
      where: { brandId, ...(questionId ? { questionId } : {}) },
      orderBy: { updatedAt: 'desc' }
    });

    return answers.map(toBrandStandardAnswer);
  }

  async getBrandStandardAnswer(userId: string, brandId: BrandId, answerId: string): Promise<BrandStandardAnswer | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const answer = await this.prisma.brandStandardAnswer.findFirst({ where: { id: answerId, brandId } });

    return answer ? toBrandStandardAnswer(answer) : null;
  }

  async createBrandStandardAnswer(userId: string, brandId: BrandId, input: BrandStandardAnswerInput): Promise<BrandStandardAnswer | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const answer = await this.prisma.brandStandardAnswer.create({
      data: {
        id: `standard_answer_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
        brandId,
        questionId: input.questionId.trim(),
        question: input.question.trim(),
        answer: input.answer.trim(),
        keyPoints: toInputJsonArray(cleanStringList(input.keyPoints)),
        evidence: toInputJsonArray(cleanStandardAnswerEvidence(input.evidence)),
        status: input.status ?? 'draft',
        createdBy: userId
      }
    });

    return toBrandStandardAnswer(answer);
  }

  async updateBrandStandardAnswer(userId: string, brandId: BrandId, answerId: string, input: BrandStandardAnswerUpdateInput): Promise<BrandStandardAnswer | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.brandStandardAnswer.findFirst({ where: { id: answerId, brandId } });
    if (!exists) {
      return null;
    }

    const answer = await this.prisma.brandStandardAnswer.update({
      where: { id: answerId },
      data: {
        ...(input.questionId !== undefined ? { questionId: input.questionId.trim() } : {}),
        ...(input.question !== undefined ? { question: input.question.trim() } : {}),
        ...(input.answer !== undefined ? { answer: input.answer.trim() } : {}),
        ...(input.keyPoints !== undefined ? { keyPoints: toInputJsonArray(cleanStringList(input.keyPoints)) } : {}),
        ...(input.evidence !== undefined ? { evidence: toInputJsonArray(cleanStandardAnswerEvidence(input.evidence)) } : {}),
        ...(input.status !== undefined ? { status: input.status } : {}),
        ...(input.reviewedBy !== undefined ? { reviewedBy: input.reviewedBy.trim() } : {}),
        ...(input.reviewedAt !== undefined ? { reviewedAt: new Date(input.reviewedAt) } : {})
      }
    });

    return toBrandStandardAnswer(answer);
  }

  async listMonitoringRuns(userId: string, brandId: BrandId): Promise<MonitoringRunDetail[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const runs = await this.prisma.monitoringRun.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return Promise.all(runs.map((run) => this.toMonitoringRunDetail(run)));
  }

  async getMonitoringRun(userId: string, brandId: BrandId, runId: string): Promise<MonitoringRunDetail | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const run = await this.prisma.monitoringRun.findFirst({ where: { id: runId, brandId } });

    return run ? this.toMonitoringRunDetail(run) : null;
  }

  async createMonitoringRun(userId: string, brandId: BrandId, input: MonitoringRunInput): Promise<MonitoringRunDetail | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const prompt = await this.prisma.brandPrompt.findFirst({ where: { id: input.promptId, brandId, enabled: true } });
    if (!prompt || !toStringArray(prompt.platformCodes).includes(input.platformCode)) {
      return null;
    }

    const platform = await this.prisma.platformConfig.findFirst({
      where: { brandId, platformKey: input.platformCode, enabled: true }
    });
    if (!platform) {
      return null;
    }

    const timestamp = new Date();
    const run = await this.prisma.monitoringRun.create({
      data: {
        brandId,
        optimizationUnitId: prompt.optimizationUnitId,
        intentId: prompt.intentId,
        promptId: prompt.id,
        platformCode: platform.platformKey,
        status: 'pending',
        startedAt: timestamp,
        retryStatus: 'not_retried'
      }
    });
    const job = await this.prisma.asyncJob.create({
      data: {
        brandId,
        jobType: 'monitoring',
        entityId: run.id,
        status: 'queued',
        nextRunAt: timestamp
      }
    });

    if (platform.mode === 'mock') {
      await this.prisma.aIResponse.create({
        data: {
          runId: run.id,
          brandId,
          rawText: `演示回答（${platform.platformKey}）：${prompt.text}`,
          citations: [],
          modelName: platform.modelName ?? 'mock-v1',
          respondedAt: timestamp,
          parseStatus: 'pending'
        }
      });

      const updated = await this.prisma.monitoringRun.update({
        where: { id: run.id },
        data: { status: 'completed', completedAt: timestamp }
      });
      await this.prisma.asyncJob.update({ where: { id: job.id }, data: { status: 'succeeded', attemptCount: 1 } });

      return this.toMonitoringRunDetail(updated);
    }

    const status = platform.mode === 'manual' || platform.mode === 'semi_auto' ? 'review_required' : 'failed';
    const errorMessage = status === 'failed' ? '自动监测暂未接入，请改用浏览器辅助监测或手动录入回答' : '等待人工录入原始回答';
    const updated = await this.prisma.monitoringRun.update({
      where: { id: run.id },
      data: {
        status,
        completedAt: status === 'failed' ? timestamp : undefined,
        errorMessage,
        retryStatus: status === 'failed' ? 'retry_pending' : 'not_retried'
      }
    });
    await this.prisma.asyncJob.update({
      where: { id: job.id },
      data: {
        status: status === 'failed' ? 'failed' : 'succeeded',
        attemptCount: 1,
        lastErrorCode: status === 'failed' ? 'adapter_not_ready' : undefined,
        lastErrorMessage: errorMessage
      }
    });

    return this.toMonitoringRunDetail(updated);
  }

  private async executeApiTestPlanStep(
    userId: string,
    brandId: BrandId,
    testPlanId: string,
    question: TestPlan['questions'][number],
    platformCode: string
  ): Promise<MonitoringRunDetail | null> {
    if (!question.promptId) {
      return null;
    }

    const platform = await this.getPlatformRuntimeConfig(userId, brandId, platformCode);
    if (!platform || platform.mode !== 'api' || !platform.endpointUrl || !platform.modelName || !platform.credentialRef) {
      return null;
    }

    const run = await this.createMonitoringRun(userId, brandId, { promptId: question.promptId, platformCode });
    if (!run) {
      return null;
    }

    const startedMs = Date.now();
    const startedAt = new Date().toISOString();
    const audit = await this.createAIPlatformCallAudit(userId, brandId, {
      platformCode,
      modelName: platform.modelName,
      callType: 'monitoring',
      status: 'started',
      startedAt
    });
    const job = await this.prisma.asyncJob.findFirst({ where: { brandId, entityId: run.id, jobType: 'monitoring' } });

    try {
      const adapter = this.aiAdapters.requireAdapter(platform);
      const result = await adapter.runPrompt({ brandId, platformCode, promptText: run.promptText }, platform);
      const completedAt = new Date().toISOString();

      await this.prisma.monitoringRun.update({ where: { id: run.id }, data: { testPlanId } });
      await this.addManualResponse(userId, brandId, run.id, {
        rawText: result.rawText,
        modelName: result.modelName
      });
      await this.parseAnalysisResult(userId, brandId, run.id);
      if (audit) {
        await this.updateAIPlatformCallAudit(userId, brandId, audit.id, {
          status: 'succeeded',
          modelName: result.modelName,
          durationMs: Date.now() - startedMs,
          completedAt
        });
      }
      if (job) {
        await this.prisma.asyncJob.update({ where: { id: job.id }, data: { status: 'succeeded', attemptCount: 1, lastErrorCode: null, lastErrorMessage: null } });
      }

      return await this.getMonitoringRun(userId, brandId, run.id) ?? run;
    } catch (error) {
      const normalized = normalizeApiExecutionError(error);
      const completedAt = new Date().toISOString();
      if (audit) {
        await this.updateAIPlatformCallAudit(userId, brandId, audit.id, {
          status: 'failed',
          errorCode: normalized.code,
          errorMessage: normalized.message,
          retryable: normalized.retryable,
          completedAt
        });
      }
      if (job) {
        await this.prisma.asyncJob.update({
          where: { id: job.id },
          data: {
            status: normalized.retryable ? 'failed' : 'retry-exhausted',
            attemptCount: 1,
            lastErrorCode: normalized.code,
            lastErrorMessage: normalized.message
          }
        });
      }

      return this.updateMonitoringRunExecution(userId, brandId, run.id, {
        status: 'failed',
        completedAt,
        errorMessage: normalized.retryable ? normalized.message : `${normalized.message}；可人工录入原始回答。`,
        retryStatus: normalized.retryable ? 'retry_pending' : 'retried'
      });
    }
  }

  private async executeBrowserTestPlanStep(
    userId: string,
    brandId: BrandId,
    testPlanId: string,
    question: TestPlan['questions'][number],
    platformCode: string
  ): Promise<BrowserTestPlanStepResult | null> {
    if (!question.promptId) {
      return {
        status: 'needs_confirmation',
        message: '该问题尚未关联 Prompt，需要先确认问题或切换为手动录入。'
      };
    }

    const connector = this.browserConnectors.selectConnector(platformCode);
    if (!connector) {
      return {
        status: 'needs_confirmation',
        message: '该平台浏览器适配器尚未注册，请改用手动录入路径。'
      };
    }

    const connectorInput = { brandId, platformCode, testPlanId, question: question.question, promptId: question.promptId };
    const operations = [
      await connector.openLoginPage(connectorInput),
      await connector.detectLogin(connectorInput),
      await connector.sendQuestion(connectorInput),
      await connector.waitForAnswer(connectorInput)
    ];
    const blocked = operations.find((operation) => operation.status !== 'ready');
    if (blocked) {
      return toBrowserStepConfirmation(blocked.message);
    }

    const answer = await connector.extractAnswer(connectorInput);
    if (answer.status !== 'ready' || !answer.rawText) {
      return toBrowserStepConfirmation(answer.message);
    }

    const run = await this.createMonitoringRun(userId, brandId, { promptId: question.promptId, platformCode });
    if (!run) {
      return {
        status: 'needs_confirmation',
        message: '浏览器辅助监测运行创建失败，请确认 Prompt 与平台连接。'
      };
    }

    await this.prisma.monitoringRun.update({ where: { id: run.id }, data: { testPlanId } });
    await this.addManualResponse(userId, brandId, run.id, {
      rawText: answer.rawText,
      modelName: answer.modelName
    });
    await this.parseAnalysisResult(userId, brandId, run.id);

    return {
      status: 'queued',
      message: answer.message,
      run: await this.getMonitoringRun(userId, brandId, run.id) ?? run
    };
  }

  async updateMonitoringRunExecution(userId: string, brandId: BrandId, runId: string, input: MonitoringRunExecutionUpdateInput): Promise<MonitoringRunDetail | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const exists = await this.prisma.monitoringRun.findFirst({ where: { id: runId, brandId } });
    if (!exists) {
      return null;
    }

    const updated = await this.prisma.monitoringRun.update({
      where: { id: runId },
      data: {
        status: input.status,
        completedAt: input.completedAt ? new Date(input.completedAt) : null,
        errorMessage: input.errorMessage ?? null,
        ...(input.retryStatus !== undefined ? { retryStatus: input.retryStatus } : {})
      }
    });

    return this.toMonitoringRunDetail(updated);
  }

  async addManualResponse(userId: string, brandId: BrandId, runId: string, input: ManualResponseInput): Promise<MonitoringRunDetail | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const run = await this.prisma.monitoringRun.findFirst({ where: { id: runId, brandId } });
    if (!run) {
      return null;
    }

    const timestamp = new Date();
    await this.prisma.aIResponse.create({
      data: {
        runId,
        brandId,
        rawText: input.rawText.trim(),
        citations: normalizeStringList(input.citations),
        modelName: input.modelName?.trim() || 'manual',
        respondedAt: timestamp,
        parseStatus: 'pending'
      }
    });
    const updated = await this.prisma.monitoringRun.update({
      where: { id: runId },
      data: { status: 'completed', completedAt: timestamp, errorMessage: null }
    });

    return this.toMonitoringRunDetail(updated);
  }

  async submitManualTestAnswers(userId: string, brandId: BrandId, input: ManualTestAnswerBatchInput): Promise<ManualTestAnswerBatchResult | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const testPlanId = input.answers[0]?.testPlanId?.trim();
    if (!testPlanId) {
      return null;
    }

    const storedPlan = await this.prisma.testPlan.findFirst({ where: { id: testPlanId, brandId } });
    if (!storedPlan) {
      return null;
    }

    const plan = toTestPlan(storedPlan);
    const result: ManualTestAnswerBatchResult = { testPlanId, accepted: [], failed: [] };

    for (const answer of input.answers) {
      const normalized = normalizeManualTestAnswerInput(answer);
      const failureBase = { question: normalized.question, platformCode: normalized.platformCode, status: 'failed' as const };

      if (normalized.testPlanId !== testPlanId) {
        result.failed.push({ ...failureBase, message: '批量录入中的监测计划 ID 不一致。' });
        continue;
      }

      if (!normalized.rawText) {
        result.failed.push({ ...failureBase, message: '粘贴内容为空，请补充平台回答。' });
        continue;
      }

      const question = findManualAnswerQuestion(plan, normalized.question, normalized.platformCode);
      if (!question) {
        result.failed.push({ ...failureBase, message: '未匹配到对应监测问题和平台，请重新选择对应问题。' });
        continue;
      }

      if (!question.promptId) {
        result.failed.push({ ...failureBase, message: '该监测问题尚未关联 Prompt，无法创建监测记录。' });
        continue;
      }

      const run = await this.findOrCreateManualAnswerRun(userId, brandId, plan.id, question, normalized.platformCode);
      if (!run) {
        result.failed.push({ ...failureBase, message: '监测记录创建失败，请确认平台配置。' });
        continue;
      }

      await this.addManualResponse(userId, brandId, run.id, {
        rawText: normalized.rawText,
        citations: normalized.citations,
        modelName: normalized.modelName || `${normalized.platformCode}-manual`
      });
      await this.parseAnalysisResult(userId, brandId, run.id);
      const detail = await this.getMonitoringRun(userId, brandId, run.id) ?? run;

      result.accepted.push({
        question: normalized.question,
        platformCode: normalized.platformCode,
        status: 'accepted',
        message: '手动回答已保存并完成自动分析。',
        run: detail
      });
    }

    return result;
  }

  private async findOrCreateManualAnswerRun(
    userId: string,
    brandId: BrandId,
    testPlanId: string,
    question: TestPlan['questions'][number],
    platformCode: string
  ): Promise<MonitoringRunDetail | null> {
    if (!question.promptId) {
      return null;
    }

    const existing = await this.prisma.monitoringRun.findFirst({
      where: { brandId, promptId: question.promptId, platformCode, testPlanId }
    });
    if (existing) {
      return this.toMonitoringRunDetail(existing);
    }

    const run = await this.createMonitoringRun(userId, brandId, { promptId: question.promptId, platformCode });
    if (!run) {
      return null;
    }

    await this.prisma.monitoringRun.update({ where: { id: run.id }, data: { testPlanId } });
    return this.getMonitoringRun(userId, brandId, run.id);
  }

  async getAnalysisResult(userId: string, brandId: BrandId, runId: string): Promise<AnalysisResult | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const result = await this.prisma.analysisResult.findFirst({ where: { brandId, runId } });

    return result ? toAnalysisResult(result) : null;
  }

  async parseAnalysisResult(userId: string, brandId: BrandId, runId: string): Promise<AnalysisResult | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const run = await this.prisma.monitoringRun.findFirst({ where: { id: runId, brandId } });
    if (!run) {
      return null;
    }

    const response = await this.prisma.aIResponse.findFirst({ where: { runId }, orderBy: { createdAt: 'desc' } });
    if (!response) {
      return null;
    }

    const profileRecord = await this.prisma.brandProfile.findUnique({ where: { brandId } });
    const competitorDelegate = this.prisma.competitor as unknown as { findMany?: (args: { where: { brandId: BrandId } }) => Promise<Array<{ name: string; aliases: unknown }>> } | undefined;
    const competitorRecords = competitorDelegate?.findMany ? await competitorDelegate.findMany({ where: { brandId } }) : [];
    const baseProfile = profileRecord ? toBrandProfile(profileRecord) : createEmptyProfile(brandId);
    const profile: BrandProfile = {
      ...baseProfile,
      competitors: mergeStringLists(
        baseProfile.competitors,
        competitorRecords.flatMap((competitor) => [competitor.name, ...toStringArray(competitor.aliases)])
      )
    };
    const parsed = buildAnalysisResultFields(brand, profile, run, {
      id: response.id,
      rawText: response.rawText,
      citations: toStringArray(response.citations)
    });
    const result = await this.prisma.analysisResult.upsert({
      where: { responseId: response.id },
      create: parsed,
      update: parsed
    });
    await this.prisma.aIResponse.update({ where: { id: response.id }, data: { parseStatus: result.reviewRequired ? 'review_required' : 'parsed' } });

    return toAnalysisResult(result);
  }

  async updateAnalysisResult(userId: string, brandId: BrandId, runId: string, input: AnalysisResultInput): Promise<AnalysisResult | null> {
    const existing = (await this.getAnalysisResult(userId, brandId, runId)) ?? (await this.parseAnalysisResult(userId, brandId, runId));
    if (!existing) {
      return null;
    }

    const normalized = normalizeAnalysisResultInput(input);
    const result = await this.prisma.analysisResult.update({
      where: { id: existing.id },
      data: toAnalysisResultUpdateData(normalized)
    });
    await this.prisma.aIResponse.update({ where: { id: result.responseId }, data: { parseStatus: result.reviewRequired ? 'review_required' : 'parsed' } });

    return toAnalysisResult(result);
  }

  async getBrandMetricDashboard(userId: string, brandId: BrandId): Promise<BrandMetricDashboard | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const snapshots = await this.prisma.gEOMetricSnapshot.findMany({ where: { brandId }, orderBy: { calculatedAt: 'desc' } });
    const current = snapshots.find((snapshot) => !snapshot.platformCode && !snapshot.optimizationUnitId && !snapshot.intentId) ?? createEmptyMetricSnapshot(brandId);

    return {
      brandId,
      current: toMetricSnapshot(current),
      trend: snapshots.filter((snapshot) => !snapshot.platformCode && !snapshot.optimizationUnitId && !snapshot.intentId).map(toMetricSnapshot),
      breakdown: {
        platform: snapshots.filter((snapshot) => Boolean(snapshot.platformCode)).map(toMetricSnapshot),
        optimizationUnit: snapshots.filter((snapshot) => Boolean(snapshot.optimizationUnitId)).map(toMetricSnapshot),
        intent: snapshots.filter((snapshot) => Boolean(snapshot.intentId)).map(toMetricSnapshot)
      }
    };
  }

  async getGrowthOptimizationWorkspace(userId: string, brandId: BrandId): Promise<GrowthOptimizationWorkspace | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const [plans, strategies, tasks, publishingRecords] = await Promise.all([
      this.prisma.growthOptimizationPlan.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.contentStrategy.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.optimizationTask.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.publishingRecord.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } })
    ]);
    const mappedPlans = await Promise.all(plans.map((plan) => this.toGrowthOptimizationPlan(plan)));

    return {
      brandId,
      plans: mappedPlans,
      currentPlan: mappedPlans.find((plan) => plan.status !== 'completed') ?? mappedPlans[0],
      relatedStrategies: strategies.map(toContentStrategy),
      relatedTasks: tasks.map(toOptimizationTask),
      relatedPublishingRecords: publishingRecords.map(toPublishingRecord)
    };
  }

  async generateGrowthOptimizationPlan(userId: string, brandId: BrandId, sourceTestPlanId?: string): Promise<GrowthOptimizationPlan | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const allSamples = await this.loadGrowthAnalysisSamples(brandId);
    const samples = sourceTestPlanId
      ? allSamples.filter((sample) => sample.testPlanId === sourceTestPlanId)
      : allSamples;
    const planDraft = buildGrowthOptimizationPlanDraft(brand, samples.length ? samples : allSamples, sourceTestPlanId);

    return this.createGrowthOptimizationPlan(userId, brandId, planDraft);
  }

  async createGrowthOptimizationPlan(userId: string, brandId: BrandId, input: GrowthOptimizationPlanInput): Promise<GrowthOptimizationPlan | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const plan = await this.prisma.growthOptimizationPlan.create({
      data: {
        brandId,
        sourceTestPlanId: input.sourceTestPlanId,
        sourceRunIds: input.sourceRunIds ?? [],
        summary: input.summary?.trim() || '根据首轮监测结果生成优化计划',
        reasons: input.reasons ?? [],
        priority: input.priority ?? 'medium',
        ownerId: input.ownerId,
        dueDate: new Date(input.dueDate),
        publishingPlatforms: input.publishingPlatforms,
        retestAt: new Date(input.retestAt),
        contentRecommendations: input.contentRecommendations ?? [],
        status: 'draft'
      }
    });

    return this.toGrowthOptimizationPlan(plan);
  }

  async confirmGrowthOptimizationPlan(userId: string, brandId: BrandId, planId: string, input: GrowthOptimizationPlanConfirmInput = {}): Promise<GrowthOptimizationPlanConfirmationResult | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const existing = await this.prisma.growthOptimizationPlan.findFirst({ where: { id: planId, brandId } });
    if (!existing) {
      return null;
    }

    const planBase = await this.toGrowthOptimizationPlan(existing);
    const updated = await this.prisma.growthOptimizationPlan.update({
      where: { id: planId },
      data: {
        ownerId: input.ownerId?.trim() || planBase.ownerId || userId,
        dueDate: input.dueDate ? new Date(input.dueDate) : existing.dueDate,
        publishingPlatforms: input.publishingPlatforms?.length ? mergeStringLists(input.publishingPlatforms) : toStringArray(existing.publishingPlatforms),
        retestAt: input.retestAt ? new Date(input.retestAt) : existing.retestAt,
        status: 'confirmed'
      }
    });
    const plan = await this.toGrowthOptimizationPlan(updated);
    const existingTasks = await this.prisma.optimizationTask.findMany({ where: { brandId, growthOptimizationPlanId: plan.id }, orderBy: { createdAt: 'desc' } });
    if (existingTasks.length > 0) {
      return { plan: await this.toGrowthOptimizationPlan(updated), tasks: existingTasks.map(toOptimizationTask) };
    }

    const taskInputs = buildGrowthOptimizationTaskInputs(plan);
    const tasks = await Promise.all(taskInputs.map((taskInput) => this.prisma.optimizationTask.create({
      data: {
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
        dueDate: taskInput.dueDate ? new Date(taskInput.dueDate) : undefined,
        reviewStatus: 'pending',
        retestRecords: []
      }
    })));

    return { plan: await this.toGrowthOptimizationPlan(updated), tasks: tasks.map(toOptimizationTask) };
  }

  async listBrandMetricRanking(
    userId: string,
    sortBy: keyof Pick<BrandMetricRankingItem, 'totalScore' | 'mentionRate' | 'top3Rate' | 'positiveRate' | 'periodChange'> = 'totalScore'
  ): Promise<BrandMetricRankingItem[]> {
    const brands = await this.listAccessibleBrandDetails(userId);
    const items = await Promise.all(brands.map((brand) => this.toMetricRankingItem(brand)));

    return items.sort((a, b) => b[sortBy] - a[sortBy]);
  }

  async listCompetitors(userId: string, brandId: BrandId): Promise<Competitor[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const competitors = await this.prisma.competitor.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });
    return competitors.map((competitor) => toCompetitor(competitor as PrismaCompetitor));
  }

  async createCompetitor(userId: string, brandId: BrandId, input: CompetitorInput): Promise<Competitor | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizeCompetitorInput(input);
    const competitor = await this.prisma.competitor.create({
      data: {
        brandId,
        ...normalized
      }
    });
    return toCompetitor(competitor as PrismaCompetitor);
  }

  async updateCompetitor(userId: string, brandId: BrandId, competitorId: string, input: Partial<CompetitorInput>): Promise<Competitor | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const existing = await this.prisma.competitor.findFirst({ where: { id: competitorId, brandId } });
    if (!existing) {
      return null;
    }

    const normalized = normalizePartialCompetitorInput(input);
    const competitor = await this.prisma.competitor.update({
      where: { id: competitorId },
      data: normalized
    });
    return toCompetitor(competitor as PrismaCompetitor);
  }

  async getCompetitorDashboard(userId: string, brandId: BrandId): Promise<CompetitorDashboard | null> {
    const competitors = await this.listCompetitors(userId, brandId);
    if (!competitors) {
      return null;
    }

    return {
      brandId,
      competitors,
      mentionRate: 0,
      suppressionRate: 0,
      averageRankGap: 0,
      highRiskIntents: [],
      comparisons: []
    };
  }

  async createCompetitorDiscoveryRun(userId: string, brandId: BrandId, input: CompetitorDiscoveryRunInput = {}): Promise<CompetitorDiscoveryRun | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const profile = await this.getBrandProfile(userId, brandId);
    const city = input.city?.trim() || brand.targetCities[0] || '';
    const inputKeywords = normalizeStringList(input.keywords);
    const keywords = inputKeywords.length > 0 ? inputKeywords : buildPrismaCompetitorDiscoveryKeywords(brand, profile ?? undefined);
    const campusRadiusKm = clampPrismaCampusRadius(input.campusRadiusKm ?? 5);
    const sourceProvider = normalizePrismaCompetitorSourceProvider(input.sourceProvider);
    const cacheKey = buildPrismaCompetitorCandidateCacheKey(brandId, city, campusRadiusKm, keywords, sourceProvider);
    const cachedEntry = input.forceRefresh ? undefined : prismaCompetitorCandidateCache.get(cacheKey);
    const missingFields = [city ? '' : '经营城市', brand.targetCities.length > 0 ? '' : '校区或服务城市'].filter(Boolean);
    const status = missingFields.length > 0 ? 'failed' : 'completed';
    const now = new Date();
    const providerResult = status === 'completed' && !cachedEntry
      ? await fetchPrismaProviderPoiCandidates(sourceProvider, city, keywords)
      : { providerState: cachedEntry?.providerState ?? resolvePrismaMapProviderState(sourceProvider), pois: undefined };
    const providerState = providerResult.providerState;

    const run = await this.prisma.competitorDiscoveryRun.create({
      data: {
        brandId,
        city: city || '待补充城市',
        campusRadiusKm,
        keywords,
        status,
        candidateCount: 0,
        missingFields,
        sourceProvider,
        providerStatus: providerState.providerStatus,
        providerMessage: providerState.providerMessage,
        cacheHit: Boolean(cachedEntry),
        createdBy: userId,
        failureReason: missingFields.length > 0 ? `需要先补充：${missingFields.join('、')}` : undefined,
        completedAt: now
      }
    });

    if (status === 'completed') {
      const mappedRun = toCompetitorDiscoveryRun(run as PrismaCompetitorDiscoveryRun);
      const candidates = cachedEntry
        ? clonePrismaCompetitorCandidatesForRun(cachedEntry.candidates, mappedRun.runId, now.toISOString())
        : dedupePrismaCompetitorCandidates(buildPrismaLocalCompetitorCandidates(brand, mappedRun, profile ?? undefined, providerResult.pois));
      for (const candidate of candidates) {
        const exists = await this.prisma.competitorCandidate.findFirst({
          where: {
            brandId,
            runId: candidate.runId,
            name: candidate.name,
            address: candidate.address
          }
        });
        if (exists) continue;
        await this.prisma.competitorCandidate.create({
          data: toCompetitorCandidateCreateData(candidate)
        });
      }
      await this.prisma.competitorDiscoveryRun.update({ where: { id: run.id }, data: { candidateCount: candidates.length } });
      if (!cachedEntry) {
        prismaCompetitorCandidateCache.set(cacheKey, { candidates, providerState });
      }
      return { ...toCompetitorDiscoveryRun(run as PrismaCompetitorDiscoveryRun), candidateCount: candidates.length };
    }

    return toCompetitorDiscoveryRun(run as PrismaCompetitorDiscoveryRun);
  }

  async listCompetitorDiscoveryCandidates(userId: string, brandId: BrandId, runId: string, query: CompetitorDiscoveryCandidatesQuery = {}): Promise<CompetitorCandidate[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const run = await this.prisma.competitorDiscoveryRun.findFirst({ where: { id: runId, brandId } });
    if (!run) {
      return null;
    }

    const candidates = await this.prisma.competitorCandidate.findMany({ where: { brandId, runId }, orderBy: { score: 'desc' } });
    return candidates
      .map((candidate) => toCompetitorCandidate(candidate as PrismaCompetitorCandidate))
      .filter((candidate) => matchesPrismaCompetitorCandidateFilter(candidate, query.filter));
  }

  async decideCompetitorCandidate(userId: string, brandId: BrandId, candidateId: string, input: CompetitorCandidateDecisionInput): Promise<CompetitorCandidateConfirmationResult | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const existingCandidate = await this.prisma.competitorCandidate.findFirst({ where: { id: candidateId, brandId } });
    if (!existingCandidate) {
      return null;
    }

    const label = normalizePrismaCompetitorConfirmationLabel(input.label);
    const candidate = await this.prisma.competitorCandidate.update({
      where: { id: candidateId },
      data: {
        confirmedLabel: label,
        decisionStatus: label === 'excluded' ? 'excluded' : 'confirmed',
        excludedReason: label === 'excluded' ? input.excludedReason?.trim() || '用户排除' : null
      }
    });
    const mappedCandidate = toCompetitorCandidate(candidate as PrismaCompetitorCandidate);

    await this.createAuditLog(userId, {
      brandId,
      actorUserId: userId,
      action: label === 'excluded' ? 'competitor_candidate.exclude' : 'competitor_candidate.confirm',
      resourceType: 'competitor_candidate',
      resourceId: candidateId,
      result: 'success',
      metadata: {
        label,
        candidateName: mappedCandidate.name,
        runId: mappedCandidate.runId,
        sourceProvider: mappedCandidate.sourceProvider,
        excludedReason: mappedCandidate.excludedReason
      }
    });

    if (label === 'excluded') {
      return { candidate: mappedCandidate };
    }

    const competitorInput: CompetitorInput = {
      name: mappedCandidate.name,
      aliases: [],
      website: undefined,
      industryTags: mergeStringLists(mappedCandidate.matchedKeywords, mappedCandidate.category ? [mappedCandidate.category] : []),
      comparisonNote: mappedCandidate.matchReasons.join('；'),
      suppressionRule: { consecutiveThreshold: 2 },
      confirmationLabel: label,
      sourceCandidateId: mappedCandidate.candidateId,
      sourceProvider: mappedCandidate.sourceProvider,
      nearestCampusDistanceKm: mappedCandidate.distanceToNearestCampusKm,
      isNationalBenchmark: label === 'national_benchmark',
      isCampusFocus: mappedCandidate.isCampusFocus
    };
    const existingCompetitor = await this.prisma.competitor.findFirst({
      where: {
        brandId,
        OR: [
          { sourceCandidateId: mappedCandidate.candidateId },
          { name: mappedCandidate.name }
        ]
      }
    });
    const competitor = existingCompetitor
      ? await this.updateCompetitor(userId, brandId, existingCompetitor.id, competitorInput)
      : await this.createCompetitor(userId, brandId, competitorInput);

    if (competitor) {
      await this.createPrismaCompetitorLinkedTestQuestions(brand, mappedCandidate, label);
      await this.createPrismaNationalBenchmarkContentStrategy(brand, competitor, label);
    }

    return { candidate: mappedCandidate, competitor: competitor ?? undefined };
  }

  async getContentCenterDashboard(userId: string, brandId: BrandId): Promise<ContentCenterDashboard | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const [assets, strategies, units, intents, prompts] = await Promise.all([
      this.prisma.contentAsset.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.contentStrategy.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.optimizationUnit.findMany({ where: { brandId, enabled: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.userIntent.findMany({ where: { brandId, enabled: true }, orderBy: { createdAt: 'desc' } }),
      this.prisma.brandPrompt.findMany({ where: { brandId, enabled: true }, orderBy: { createdAt: 'desc' } })
    ]);
    const mappedAssets = assets.map(toContentAsset);
    const mappedStrategies = strategies.map(toContentStrategy);

    return {
      brandId,
      assets: mappedAssets,
      strategies: mappedStrategies,
      suggestions: buildPrismaContentStrategySuggestions(units, intents, prompts, mappedStrategies),
      coverage: buildContentCoverage(mappedAssets, units)
    };
  }

  async listContentAssets(userId: string, brandId: BrandId, filter: ContentAssetFilter = {}): Promise<ContentAsset[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const assets = await this.prisma.contentAsset.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return assets.map(toContentAsset).filter((asset) => {
      return asset.brandId === brandId &&
        (!filter.type || asset.type === filter.type) &&
        (!filter.platform || asset.platform === filter.platform) &&
        (!filter.status || asset.status === filter.status) &&
        (!filter.keyword || asset.targetKeywords.some((keyword) => keyword.includes(filter.keyword as string)));
    });
  }

  async createContentAsset(userId: string, brandId: BrandId, input: ContentAssetInput): Promise<ContentAsset | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizeContentAssetInput(input);
    if (!normalized.title || !normalized.type || !normalized.platform || !normalized.url) {
      return null;
    }
    if (normalized.reuseOfAssetId && !(await this.prisma.contentAsset.findFirst({ where: { id: normalized.reuseOfAssetId, brandId } }))) {
      return null;
    }

    const asset = await this.prisma.contentAsset.create({
      data: {
        brandId,
        title: normalized.title,
        type: normalized.type,
        platform: normalized.platform,
        url: normalized.url,
        targetKeywords: normalized.targetKeywords ?? [],
        reuseOfAssetId: normalized.reuseOfAssetId,
        brandAdaptation: normalized.brandAdaptation,
        status: normalized.status ?? 'draft',
        publishedAt: normalized.publishedAt ? new Date(normalized.publishedAt) : undefined
      }
    });

    return toContentAsset(asset);
  }

  async updateContentAsset(userId: string, brandId: BrandId, assetId: string, input: ContentAssetInput): Promise<ContentAsset | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const existing = await this.prisma.contentAsset.findFirst({ where: { id: assetId, brandId } });
    if (!existing) {
      return null;
    }

    const normalized = normalizeContentAssetInput(input);
    if (normalized.reuseOfAssetId && !(await this.prisma.contentAsset.findFirst({ where: { id: normalized.reuseOfAssetId, brandId } }))) {
      return null;
    }

    const asset = await this.prisma.contentAsset.update({
      where: { id: assetId },
      data: {
        ...(normalized.title !== undefined ? { title: normalized.title } : {}),
        ...(normalized.type !== undefined ? { type: normalized.type } : {}),
        ...(normalized.platform !== undefined ? { platform: normalized.platform } : {}),
        ...(normalized.url !== undefined ? { url: normalized.url } : {}),
        ...(normalized.targetKeywords !== undefined ? { targetKeywords: normalized.targetKeywords } : {}),
        ...(normalized.reuseOfAssetId !== undefined ? { reuseOfAssetId: normalized.reuseOfAssetId } : {}),
        ...(normalized.brandAdaptation !== undefined ? { brandAdaptation: normalized.brandAdaptation } : {}),
        ...(normalized.status !== undefined ? { status: normalized.status } : {}),
        ...(normalized.publishedAt !== undefined ? { publishedAt: normalized.publishedAt ? new Date(normalized.publishedAt) : null } : {})
      }
    });

    return toContentAsset(asset);
  }

  async listContentStrategies(userId: string, brandId: BrandId, filter: ContentStrategyFilter = {}): Promise<ContentStrategy[] | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const strategies = await this.prisma.contentStrategy.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });

    return strategies.map(toContentStrategy).filter((strategy) => {
      return (!filter.type || strategy.type === filter.type) &&
        (!filter.priority || strategy.priority === filter.priority) &&
        (!filter.platform || strategy.targetPlatform === filter.platform) &&
        (!filter.status || strategy.status === filter.status);
    });
  }

  async generateContentStrategies(userId: string, brandId: BrandId): Promise<ContentStrategy[] | null> {
    const dashboard = await this.getContentCenterDashboard(userId, brandId);
    if (!dashboard) {
      return null;
    }

    const created: ContentStrategy[] = [];
    for (const suggestion of dashboard.suggestions) {
      const strategy = await this.createContentStrategy(userId, brandId, suggestion);
      if (strategy) {
        created.push(strategy);
      }
    }

    return created;
  }

  async createContentStrategy(userId: string, brandId: BrandId, input: ContentStrategyInput): Promise<ContentStrategy | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizeContentStrategyInput(input);
    const [unit, intent, prompts] = await Promise.all([
      this.prisma.optimizationUnit.findFirst({ where: { id: normalized.optimizationUnitId, brandId } }),
      this.prisma.userIntent.findFirst({ where: { id: normalized.intentId, brandId } }),
      this.prisma.brandPrompt.findMany({ where: { brandId, id: { in: normalized.relatedPromptIds } } })
    ]);
    if (!unit || !intent || intent.optimizationUnitId !== normalized.optimizationUnitId) {
      return null;
    }

    const promptIds = new Set(prompts.filter((prompt) => prompt.intentId === intent.id).map((prompt) => prompt.id));
    const strategy = await this.prisma.contentStrategy.create({
      data: {
        brandId,
        optimizationUnitId: normalized.optimizationUnitId,
        intentId: normalized.intentId,
        type: normalized.type,
        priority: normalized.priority,
        suggestedTitle: normalized.suggestedTitle,
        targetPlatform: normalized.targetPlatform,
        targetKeywords: normalized.targetKeywords,
        relatedPromptIds: normalized.relatedPromptIds.filter((promptId) => promptIds.has(promptId)),
        status: 'draft'
      }
    });

    return toContentStrategy(strategy);
  }

  async getContentGenerationWorkspace(userId: string, brandId: BrandId, taskId?: string): Promise<ContentGenerationWorkspace | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const tasks = (await this.prisma.contentGenerationTask.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } })).map(toContentGenerationTask);
    const currentTask = taskId ? tasks.find((task) => task.id === taskId) : tasks[0];
    const [versions, exports] = currentTask
      ? await Promise.all([
          this.prisma.contentVersion.findMany({ where: { brandId, generationTaskId: currentTask.id }, orderBy: { version: 'desc' } }),
          this.prisma.contentExportRecord.findMany({ where: { brandId, generationTaskId: currentTask.id }, orderBy: { createdAt: 'desc' } })
        ])
      : [[], []] as const;
    const mappedVersions = versions.map(toContentVersion);
    const currentVersion = mappedVersions.find((version) => version.id === currentTask?.draftRef) ?? mappedVersions[0];

    return {
      brandId,
      tasks,
      currentTask,
      currentVersion,
      versions: mappedVersions,
      exports: exports.map(toContentExportRecord),
      publishPayload: currentTask && currentVersion ? buildPublishingEntryPayload(currentTask, currentVersion) : undefined
    };
  }

  async createContentGenerationTask(userId: string, brandId: BrandId, input: ContentGenerationTaskInput): Promise<ContentGenerationWorkspace | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const strategy = await this.prisma.contentStrategy.findFirst({ where: { id: input.strategyId, brandId } });
    if (!strategy) {
      return null;
    }

    const timestamp = new Date();
    const targetPlatform = input.targetPlatform?.trim() || strategy.targetPlatform;
    const contentType = input.contentType?.trim() || inferContentType(targetPlatform);
    const targetKeywords = input.targetKeywords?.length ? normalizeStringList(input.targetKeywords) : toStringArray(strategy.targetKeywords);
    const task = await this.prisma.contentGenerationTask.create({
      data: {
        brandId,
        strategyId: strategy.id,
        growthOptimizationPlanId: input.growthOptimizationPlanId?.trim(),
        targetPlatform,
        contentType,
        contentTopic: input.contentTopic?.trim() || strategy.suggestedTitle,
        targetKeywords,
        referenceSources: normalizeStringList(input.referenceSources),
        retestAt: input.retestAt ? new Date(input.retestAt) : undefined,
        status: 'completed',
        steps: buildCompletedGenerationSteps(timestamp.toISOString())
      }
    });
    const job = await this.prisma.asyncJob.create({
      data: {
        brandId,
        jobType: 'content_generation',
        entityId: task.id,
        status: 'queued',
        nextRunAt: timestamp
      }
    });
    const draft = buildGeneratedDraft(brand.name, toContentStrategy(strategy), targetPlatform, contentType);
    const version = await this.prisma.contentVersion.create({
      data: {
        brandId,
        generationTaskId: task.id,
        title: draft.title,
        body: draft.body,
        version: 1,
        exportFormat: 'markdown'
      }
    });
    await this.prisma.contentGenerationTask.update({ where: { id: task.id }, data: { draftRef: version.id } });
    await this.prisma.asyncJob.update({ where: { id: job.id }, data: { status: 'succeeded', attemptCount: 1 } });

    return this.getContentGenerationWorkspace(userId, brandId, task.id);
  }

  async createContentGenerationTasksFromGrowthPlan(userId: string, brandId: BrandId, input: GrowthOptimizationContentTaskInput): Promise<ContentGenerationWorkspace | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const planRecord = await this.prisma.growthOptimizationPlan.findFirst({ where: { id: input.planId, brandId } });
    if (!planRecord) {
      return null;
    }

    const plan = await this.toGrowthOptimizationPlan(planRecord);
    const selectedRecommendations = selectGrowthContentRecommendations(plan, input.recommendationIndexes);
    if (selectedRecommendations.length === 0) {
      return null;
    }

    let latestWorkspace: ContentGenerationWorkspace | null = null;
    for (const recommendation of selectedRecommendations) {
      const strategy = await this.resolveGrowthContentStrategy(brandId, plan, recommendation);
      latestWorkspace = await this.createContentGenerationTask(userId, brandId, {
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

  private async resolveGrowthContentStrategy(brandId: BrandId, plan: GrowthOptimizationPlan, recommendation: GrowthOptimizationContentRecommendation): Promise<ContentStrategy> {
    const strategyIds = [recommendation.sourceStrategyId, plan.strategyId].filter((id): id is string => Boolean(id));
    if (strategyIds.length > 0) {
      const existing = await this.prisma.contentStrategy.findFirst({ where: { brandId, id: { in: strategyIds } } });
      if (existing) {
        return toContentStrategy(existing);
      }
    }

    const promptId = plan.reasons.flatMap((reason) => reason.relatedPromptIds)[0];
    const prompt = promptId ? await this.prisma.brandPrompt.findFirst({ where: { id: promptId, brandId } }) : null;
    const fallbackUnit = prompt
      ? null
      : await this.prisma.optimizationUnit.findFirst({ where: { brandId }, orderBy: { createdAt: 'desc' } })
        ?? await this.prisma.optimizationUnit.create({
          data: {
            brandId,
            name: 'AI 推荐内容补强',
            type: 'brand',
            targetKeywords: recommendation.targetKeywords,
            priority: 'high'
          }
        });
    if (!prompt && !fallbackUnit) {
      throw new Error('无法创建增长优化内容策略');
    }
    const optimizationUnitId = prompt?.optimizationUnitId ?? fallbackUnit?.id;
    if (!optimizationUnitId) {
      throw new Error('无法创建增长优化内容策略');
    }

    const fallbackIntent = prompt
      ? null
      : await this.prisma.userIntent.findFirst({ where: { brandId, optimizationUnitId }, orderBy: { createdAt: 'desc' } })
        ?? await this.prisma.userIntent.create({
          data: {
            brandId,
            optimizationUnitId,
            category: 'brand_awareness',
            text: recommendation.title,
            monitoringFrequency: 'manual',
            enabled: true
          }
        });
    const strategy = await this.prisma.contentStrategy.create({
      data: {
        brandId,
        optimizationUnitId,
        intentId: prompt?.intentId ?? fallbackIntent?.id ?? '',
        type: recommendation.contentType === 'platform_profile_copy' ? 'correction' : 'gap',
        priority: plan.priority,
        suggestedTitle: recommendation.title,
        targetPlatform: recommendation.targetPlatform,
        targetKeywords: recommendation.targetKeywords,
        relatedPromptIds: prompt ? [prompt.id] : plan.reasons.flatMap((reason) => reason.relatedPromptIds),
        status: 'task_created'
      }
    });

    return toContentStrategy(strategy);
  }

  async updateContentGenerationStep(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationStepUpdateInput): Promise<ContentGenerationWorkspace | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const task = await this.prisma.contentGenerationTask.findFirst({ where: { id: taskId, brandId } });
    if (!task) {
      return null;
    }

    const steps = updateGenerationSteps(toContentGenerationSteps(task.steps), input, new Date().toISOString());
    await this.prisma.contentGenerationTask.update({
      where: { id: taskId },
      data: {
        steps,
        status: deriveGenerationStatus(steps),
        errorMessage: steps.some((step) => step.status === 'failed') ? input.message?.trim() || '内容生成步骤执行失败' : null
      }
    });

    return this.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  async completeContentGenerationTask(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationCompletionInput): Promise<ContentGenerationWorkspace | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const task = await this.prisma.contentGenerationTask.findFirst({ where: { id: taskId, brandId } });
    if (!task || !input.title.trim() || !input.body.trim()) {
      return null;
    }

    const timestamp = input.completedAt ?? new Date().toISOString();
    const latest = await this.prisma.contentVersion.findMany({ where: { generationTaskId: taskId }, orderBy: { version: 'desc' } });
    const version = await this.prisma.contentVersion.create({
      data: {
        brandId,
        generationTaskId: taskId,
        title: input.title.trim(),
        body: input.body.trim(),
        version: (latest[0]?.version ?? 0) + 1,
        exportFormat: input.exportFormat ?? 'markdown'
      }
    });
    await this.prisma.contentGenerationTask.update({
      where: { id: taskId },
      data: {
        draftRef: version.id,
        steps: completeGenerationSteps(toContentGenerationSteps(task.steps), timestamp),
        status: 'completed',
        errorMessage: null
      }
    });

    return this.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  async recordContentGenerationFailure(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationFailureInput): Promise<ContentGenerationWorkspace | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const task = await this.prisma.contentGenerationTask.findFirst({ where: { id: taskId, brandId } });
    if (!task || !input.errorMessage.trim()) {
      return null;
    }

    const failedAt = input.failedAt ?? new Date().toISOString();
    await this.prisma.contentGenerationTask.update({
      where: { id: taskId },
      data: {
        steps: updateGenerationSteps(toContentGenerationSteps(task.steps), {
          stepKey: input.stepKey,
          status: 'failed',
          message: input.errorMessage,
          completedAt: failedAt
        }, failedAt),
        status: 'failed',
        errorMessage: input.errorMessage.trim()
      }
    });
    await this.updateContentGenerationJobFailure(brandId, taskId, input);

    return this.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  async retryContentGenerationTask(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationRetryInput = {}): Promise<ContentGenerationWorkspace | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const task = await this.prisma.contentGenerationTask.findFirst({ where: { id: taskId, brandId } });
    if (!task || task.status !== 'failed') {
      return null;
    }

    const nextRunAt = input.nextRunAt ?? new Date().toISOString();
    await this.prisma.contentGenerationTask.update({
      where: { id: taskId },
      data: {
        steps: resetGenerationStepsAfterFailure(toContentGenerationSteps(task.steps)),
        status: 'pending',
        errorMessage: null
      }
    });
    await this.enqueueContentGenerationRetry(brandId, taskId, nextRunAt);

    return this.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  async saveContentVersion(userId: string, brandId: BrandId, taskId: string, input: ContentVersionInput): Promise<ContentGenerationWorkspace | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const task = await this.prisma.contentGenerationTask.findFirst({ where: { id: taskId, brandId } });
    if (!task || !input.title.trim() || !input.body.trim()) {
      return null;
    }

    const latest = await this.prisma.contentVersion.findMany({ where: { generationTaskId: taskId }, orderBy: { version: 'desc' } });
    const version = await this.prisma.contentVersion.create({
      data: {
        brandId,
        generationTaskId: taskId,
        title: input.title.trim(),
        body: input.body.trim(),
        version: (latest[0]?.version ?? 0) + 1,
        exportFormat: input.exportFormat ?? 'markdown'
      }
    });
    await this.prisma.contentGenerationTask.update({ where: { id: taskId }, data: { draftRef: version.id } });

    return this.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  private async updateContentGenerationJobFailure(brandId: BrandId, taskId: string, input: ContentGenerationFailureInput): Promise<void> {
    const job = await this.prisma.asyncJob.findFirst({ where: { brandId, jobType: 'content_generation', entityId: taskId } });
    if (!job) return;

    const attemptCount = input.attemptCount ?? job.attemptCount + 1;
    const exhausted = input.retryable === false || attemptCount >= job.maxAttempts;
    await this.prisma.asyncJob.update({
      where: { id: job.id },
      data: {
        status: exhausted ? 'retry-exhausted' : 'failed',
        attemptCount,
        lastErrorCode: input.errorCode?.trim() || 'content_generation_failed',
        lastErrorMessage: input.errorMessage.trim()
      }
    });
  }

  private async enqueueContentGenerationRetry(brandId: BrandId, taskId: string, nextRunAt: string): Promise<void> {
    const job = await this.prisma.asyncJob.findFirst({ where: { brandId, jobType: 'content_generation', entityId: taskId } });
    if (job) {
      await this.prisma.asyncJob.update({
        where: { id: job.id },
        data: {
          status: 'queued',
          nextRunAt: new Date(nextRunAt),
          lastErrorCode: null,
          lastErrorMessage: null
        }
      });
      return;
    }

    await this.prisma.asyncJob.create({
      data: {
        brandId,
        jobType: 'content_generation',
        entityId: taskId,
        status: 'queued',
        nextRunAt: new Date(nextRunAt)
      }
    });
  }

  async exportContentMarkdown(userId: string, brandId: BrandId, taskId: string, versionId?: string): Promise<ContentExportRecord | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const task = await this.prisma.contentGenerationTask.findFirst({ where: { id: taskId, brandId } });
    if (!task) {
      return null;
    }
    const version = versionId
      ? await this.prisma.contentVersion.findFirst({ where: { id: versionId, brandId, generationTaskId: taskId } })
      : await this.prisma.contentVersion.findFirst({ where: { id: task.draftRef ?? '', brandId, generationTaskId: taskId } });
    if (!version) {
      return null;
    }

    const record = await this.prisma.contentExportRecord.create({
      data: {
        brandId,
        generationTaskId: taskId,
        versionId: version.id,
        exportFormat: 'markdown',
        fileName: `${slugify(version.title)}-v${version.version}.md`,
        content: `# ${version.title}\n\n${version.body}`,
        createdBy: userId
      }
    });

    return toContentExportRecord(record);
  }

  async getPublishingEntryPayload(userId: string, brandId: BrandId, taskId: string, versionId?: string): Promise<PublishingEntryPayload | null> {
    const workspace = await this.getContentGenerationWorkspace(userId, brandId, taskId);

    if (!workspace?.currentTask) {
      return null;
    }

    const version = versionId ? workspace.versions.find((item) => item.id === versionId) : workspace.currentVersion;

    return version ? buildPublishingEntryPayload(workspace.currentTask, version) : null;
  }

  async getPublishingDashboard(userId: string, brandId: BrandId): Promise<PublishingDashboard | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const [accounts, records] = await Promise.all([
      this.prisma.publishingAccount.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.publishingRecord.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } })
    ]);
    const mappedAccounts = accounts.map(toPublishingAccount);

    return {
      brandId,
      platforms: buildPublishingPlatforms(mappedAccounts),
      accounts: mappedAccounts,
      records: records.map(toPublishingRecord)
    };
  }

  async connectPublishingAccount(userId: string, brandId: BrandId, input: PublishingAccountInput): Promise<PublishingAccount | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizePublishingAccountInput(input);
    if (!normalized.platform || !normalized.accountName) {
      return null;
    }

    const authStatus = normalized.authStatus ?? 'connected';
    const account = await this.prisma.publishingAccount.create({
      data: {
        brandId,
        platform: normalized.platform,
        accountName: normalized.accountName,
        loginMode: normalized.loginMode ?? inferPublishingLoginMode(normalized.platform),
        authStatus,
        errorMessage: authStatus === 'error' ? normalized.errorMessage : undefined,
        lastAuthorizedAt: authStatus === 'error' ? undefined : new Date()
      }
    });

    return toPublishingAccount(account);
  }

  async reauthorizePublishingAccount(userId: string, brandId: BrandId, accountId: string): Promise<PublishingAccount | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const existing = await this.prisma.publishingAccount.findFirst({ where: { id: accountId, brandId } });
    if (!existing) {
      return null;
    }

    const account = await this.prisma.publishingAccount.update({
      where: { id: accountId },
      data: { authStatus: 'connected', errorMessage: null, lastAuthorizedAt: new Date() }
    });

    return toPublishingAccount(account);
  }

  async updatePublishingAccountStatus(userId: string, brandId: BrandId, accountId: string, input: Pick<PublishingAccountInput, 'authStatus' | 'errorMessage'>): Promise<PublishingAccount | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId)) || !input.authStatus) {
      return null;
    }

    const existing = await this.prisma.publishingAccount.findFirst({ where: { id: accountId, brandId } });
    if (!existing) {
      return null;
    }

    const authStatus = normalizePublishingAuthStatus(input.authStatus);
    const account = await this.prisma.publishingAccount.update({
      where: { id: accountId },
      data: {
        authStatus,
        errorMessage: authStatus === 'error' ? input.errorMessage?.trim() || '授权异常，请重新授权' : null,
        lastAuthorizedAt: authStatus === 'connected' ? new Date() : existing.lastAuthorizedAt
      }
    });

    return toPublishingAccount(account);
  }

  async createPublishingRecord(userId: string, brandId: BrandId, input: PublishingRecordInput): Promise<PublishingRecord | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const account = input.accountId ? await this.prisma.publishingAccount.findFirst({ where: { id: input.accountId, brandId } }) : null;
    if (input.accountId && !account) {
      return null;
    }

    const asset = input.contentAssetId
      ? await this.prisma.contentAsset.findFirst({ where: { id: input.contentAssetId, brandId } })
      : await this.createContentAssetFromPublishingInput(brandId, input, account ? toPublishingAccount(account) : undefined);
    if (!asset) {
      return null;
    }

    const task = input.generationTaskId ? await this.prisma.contentGenerationTask.findFirst({ where: { id: input.generationTaskId, brandId } }) : null;
    const version = input.versionId ? await this.prisma.contentVersion.findFirst({ where: { id: input.versionId, brandId } }) : null;
    if ((input.generationTaskId && !task) || (input.versionId && !version)) {
      return null;
    }

    const record = await this.prisma.publishingRecord.create({
      data: {
        brandId,
        contentAssetId: asset.id,
        accountId: account?.id,
        generationTaskId: task?.id,
        versionId: version?.id,
        title: input.title?.trim() || version?.title || asset.title,
        body: input.body?.trim() || (version as PrismaContentVersion | null)?.body || '',
        platform: input.targetPlatform?.trim() || account?.platform || asset.platform,
        accountName: account?.accountName,
        status: input.status ? normalizePublishingRecordStatus(input.status) : 'draft'
      }
    });

    return toPublishingRecord(record);
  }

  async updatePublishingRecordStatus(userId: string, brandId: BrandId, recordId: string, input: PublishingStatusInput): Promise<PublishingRecord | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const existing = await this.prisma.publishingRecord.findFirst({ where: { id: recordId, brandId } });
    if (!existing) {
      return null;
    }

    const status = normalizePublishingRecordStatus(input.status);
    const record = await this.prisma.publishingRecord.update({
      where: { id: recordId },
      data: {
        status,
        publishedUrl: input.publishedUrl?.trim(),
        errorMessage: status === 'failed' ? input.errorMessage?.trim() || '发布失败，请检查平台账号状态' : null
      }
    });

    return toPublishingRecord(record);
  }

  async createOptimizationTask(userId: string, brandId: BrandId, input: OptimizationTaskInput): Promise<OptimizationTask | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizeOptimizationTaskInput(input);
    const [unit, prompt, strategy, growthPlan, sourceRun] = await Promise.all([
      normalized.optimizationUnitId ? this.prisma.optimizationUnit.findFirst({ where: { id: normalized.optimizationUnitId, brandId } }) : Promise.resolve(null),
      normalized.relatedPromptId ? this.prisma.brandPrompt.findFirst({ where: { id: normalized.relatedPromptId, brandId } }) : Promise.resolve(null),
      normalized.strategyId ? this.prisma.contentStrategy.findFirst({ where: { id: normalized.strategyId, brandId } }) : Promise.resolve(null),
      normalized.growthOptimizationPlanId ? this.prisma.growthOptimizationPlan.findFirst({ where: { id: normalized.growthOptimizationPlanId, brandId } }) : Promise.resolve(null),
      normalized.sourceRunId ? this.prisma.monitoringRun.findFirst({ where: { id: normalized.sourceRunId, brandId } }) : Promise.resolve(null)
    ]);
    if ((normalized.optimizationUnitId && !unit) || (normalized.relatedPromptId && !prompt) || (normalized.strategyId && !strategy) || (normalized.growthOptimizationPlanId && !growthPlan) || (normalized.sourceRunId && !sourceRun)) {
      return null;
    }

    const task = await this.prisma.optimizationTask.create({
      data: {
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
        dueDate: normalized.dueDate ? new Date(normalized.dueDate) : undefined,
        reviewStatus: 'pending',
        retestRecords: []
      }
    });
    if (strategy) {
      await this.prisma.contentStrategy.update({ where: { id: strategy.id }, data: { status: 'task_created' } });
    }

    return toOptimizationTask(task);
  }

  async getTaskBoard(userId: string, brandId: BrandId): Promise<TaskBoardDashboard | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const tasks = (await this.prisma.optimizationTask.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } })).map(toOptimizationTask);
    const statusCounts = optimizationTaskStatuses.reduce<Record<OptimizationTaskStatus, number>>((counts, status) => {
      counts[status] = tasks.filter((task) => task.status === status).length;
      return counts;
    }, { todo: 0, doing: 0, review: 0, retest: 0, done: 0, reopened: 0 });

    return { brandId, tasks, statusCounts };
  }

  async updateOptimizationTask(userId: string, brandId: BrandId, taskId: string, input: OptimizationTaskUpdateInput): Promise<OptimizationTask | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const existing = await this.prisma.optimizationTask.findFirst({ where: { id: taskId, brandId } });
    if (!existing) {
      return null;
    }

    const normalized = normalizeOptimizationTaskUpdateInput(input);
    const task = await this.prisma.optimizationTask.update({
      where: { id: taskId },
      data: {
        ...(normalized.status !== undefined ? { status: normalized.status } : {}),
        ...(normalized.ownerId !== undefined ? { ownerId: normalized.ownerId } : {}),
        ...(normalized.dueDate !== undefined ? { dueDate: normalized.dueDate ? new Date(normalized.dueDate) : null } : {}),
        ...(normalized.processingNote !== undefined ? { processingNote: normalized.processingNote } : {}),
        ...(normalized.contentLink !== undefined ? { contentLink: normalized.contentLink } : {}),
        ...(normalized.reviewStatus !== undefined ? { reviewStatus: normalized.reviewStatus } : {})
      }
    });
    if (normalized.status === 'done') {
      await this.planRetestForCompletedGrowthTask(brandId, task);
      const updated = await this.prisma.optimizationTask.findFirst({ where: { id: taskId, brandId } });
      return updated ? toOptimizationTask(updated) : toOptimizationTask(task);
    }

    return toOptimizationTask(task);
  }

  async planOptimizationTaskRetest(userId: string, brandId: BrandId, taskId: string, input: RetestPlanInput): Promise<OptimizationTask | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const task = await this.prisma.optimizationTask.findFirst({ where: { id: taskId, brandId } });
    if (!task) {
      return null;
    }
    const sourceRunId = input.sourceRunId?.trim() || task.sourceRunId;
    const retestRunId = input.retestRunId?.trim() || sourceRunId;
    const [sourceRun, retestRun] = await Promise.all([
      sourceRunId ? this.prisma.monitoringRun.findFirst({ where: { id: sourceRunId, brandId } }) : Promise.resolve(null),
      retestRunId ? this.prisma.monitoringRun.findFirst({ where: { id: retestRunId, brandId } }) : Promise.resolve(null)
    ]);
    if (!sourceRun || !retestRun || !sourceRunId || !retestRunId) {
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
    const updated = await this.prisma.optimizationTask.update({
      where: { id: taskId },
      data: {
        sourceRunId,
        retestRunId,
        retestPlanAt: new Date(record.plannedAt),
        status: 'retest',
        retestRecords: [record, ...toRetestRecords(task.retestRecords)]
      }
    });
    await this.syncGrowthPlanRetestStatus(brandId, toOptimizationTask(updated));

    return toOptimizationTask(updated);
  }

  async completeOptimizationTaskRetest(userId: string, brandId: BrandId, taskId: string, recordId: string, input: RetestResultInput): Promise<OptimizationTask | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const task = await this.prisma.optimizationTask.findFirst({ where: { id: taskId, brandId } });
    const records = task ? toRetestRecords(task.retestRecords) : [];
    const record = records.find((item) => item.id === recordId);
    if (!task || !record) {
      return null;
    }

    const targetScore = clampScore(input.targetScore ?? record.targetScore);
    const [sourceAnalysis, retestAnalysis] = await Promise.all([
      this.prisma.analysisResult.findFirst({ where: { brandId, runId: record.sourceRunId } }),
      this.prisma.analysisResult.findFirst({ where: { brandId, runId: record.retestRunId } })
    ]);
    const comparison = buildRetestMetricComparison(
      sourceAnalysis ? toAnalysisResult(sourceAnalysis) : undefined,
      retestAnalysis ? toAnalysisResult(retestAnalysis) : undefined
    );
    const actualScore = clampScore(input.actualScore ?? comparison.afterMetrics.accuracyScore);
    const timestamp = new Date().toISOString();
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
    const note = record.passed
      ? `${task.processingNote ?? ''}\n复测通过：${actualScore}/${targetScore}`.trim()
      : `${task.processingNote ?? ''}\n复测未达标，已重开并生成下一轮优化建议：${actualScore}/${targetScore}。${record.nextSuggestion ?? ''}`.trim();
    const updated = await this.prisma.optimizationTask.update({
      where: { id: taskId },
      data: {
        status: record.passed ? 'done' : 'reopened',
        processingNote: note,
        retestRecords: records
      }
    });

    const prompt = task.relatedPromptId ? await this.prisma.brandPrompt.findFirst({ where: { id: task.relatedPromptId, brandId } }) : null;
    const optimizationUnitId = task.optimizationUnitId ?? prompt?.optimizationUnitId;
    if (!record.passed && optimizationUnitId && prompt) {
      await this.createContentStrategy(userId, brandId, {
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
    await this.syncGrowthPlanRetestStatus(brandId, toOptimizationTask(updated));

    return toOptimizationTask(updated);
  }

  private async planRetestForCompletedGrowthTask(brandId: BrandId, task: PrismaOptimizationTask): Promise<void> {
    if (!task.growthOptimizationPlanId || !task.sourceRunId) {
      return;
    }
    const existingRecords = toRetestRecords(task.retestRecords);
    if (existingRecords.length > 0) {
      return;
    }

    const [sourceRun, plan] = await Promise.all([
      this.prisma.monitoringRun.findFirst({ where: { id: task.sourceRunId, brandId } }),
      this.prisma.growthOptimizationPlan.findFirst({ where: { id: task.growthOptimizationPlanId, brandId } })
    ]);
    if (!sourceRun) {
      return;
    }

    const timestamp = new Date().toISOString();
    const record: RetestRecord = {
      id: `retest_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      taskId: task.id,
      sourceRunId: task.sourceRunId,
      retestRunId: task.retestRunId ?? task.sourceRunId,
      plannedAt: plan?.retestAt.toISOString() ?? timestamp,
      targetScore: 80,
      notes: '优化任务完成后自动进入再次监测计划',
      createdAt: timestamp,
      updatedAt: timestamp
    };

    const updated = await this.prisma.optimizationTask.update({
      where: { id: task.id },
      data: {
        retestRunId: record.retestRunId,
        retestPlanAt: new Date(record.plannedAt),
        status: 'retest',
        retestRecords: [record]
      }
    });
    await this.syncGrowthPlanRetestStatus(brandId, toOptimizationTask(updated));
  }

  private async syncGrowthPlanRetestStatus(brandId: BrandId, task: OptimizationTask): Promise<void> {
    if (!task.growthOptimizationPlanId) {
      return;
    }

    const [plan, planTasks] = await Promise.all([
      this.prisma.growthOptimizationPlan.findFirst({ where: { id: task.growthOptimizationPlanId, brandId } }),
      this.prisma.optimizationTask.findMany({ where: { brandId, growthOptimizationPlanId: task.growthOptimizationPlanId } })
    ]);
    if (!plan) {
      return;
    }

    const mappedTasks = planTasks.map(toOptimizationTask);
    const completedRetests = mappedTasks.flatMap((item) => item.retestRecords).filter((record) => record.completedAt);
    const failedRetests = completedRetests.filter((record) => record.passed === false || record.improved === false);
    let status: GrowthOptimizationPlan['status'] = plan.status as GrowthOptimizationPlan['status'];
    let contentRecommendations = toGrowthContentRecommendations(plan.contentRecommendations);

    if (failedRetests.length > 0) {
      status = 'in_progress';
      contentRecommendations = [
        ...contentRecommendations,
        ...failedRetests.map((record) => ({
          contentType: 'website_faq' as const,
          title: '再次监测未提升后的下一轮内容补强',
          targetPlatform: toStringArray(plan.publishingPlatforms)[0] ?? 'official_site',
          targetKeywords: ['再次监测未提升', 'AI 推荐内容补强'],
          reason: record.nextSuggestion ?? '再次监测指标未提升，需要补充更明确的品牌事实、引用资料和标准表达。'
        }))
      ];
    } else if (mappedTasks.length > 0 && mappedTasks.every((item) => item.retestRecords.some((record) => record.completedAt && record.passed))) {
      status = 'completed';
    } else if (mappedTasks.some((item) => item.retestRecords.length > 0 || item.status === 'retest')) {
      status = 'ready_for_retest';
    } else if (mappedTasks.some((item) => item.status === 'doing' || item.status === 'done')) {
      status = 'in_progress';
    }

    await this.prisma.growthOptimizationPlan.update({
      where: { id: plan.id },
      data: { status, contentRecommendations }
    });
  }

  async getReportDashboard(userId: string, brandId: BrandId): Promise<ReportDashboard | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const reports = (await this.prisma.report.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } })).map(toReportRecord);

    return { brandId, reports, latest: reports[0] };
  }

  async createReport(userId: string, brandId: BrandId, input: ReportInput): Promise<ReportRecord | null> {
    const brand = await this.findAccessibleBrandDetail(userId, brandId);
    if (!brand) {
      return null;
    }

    const normalized = normalizeReportInput(input);
    const periodStart = normalized.periodStart ?? new Date().toISOString().slice(0, 10);
    const periodEnd = normalized.periodEnd ?? new Date().toISOString().slice(0, 10);
    const isMultiBrand = normalized.type === 'multi_brand';
    const snapshot = isMultiBrand
      ? await this.buildMultiBrandReportSnapshot(userId)
      : await this.buildSingleBrandReportSnapshot(userId, brand);
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
    const report = await this.prisma.report.create({
      data: {
        brandId,
        type: normalized.type,
        title,
        periodStart: new Date(periodStart),
        periodEnd: new Date(periodEnd),
        status: 'generated',
        content,
        dataGaps,
        snapshot,
        createdBy: userId
      }
    });

    return toReportRecord(report);
  }

  async getReport(userId: string, brandId: BrandId, reportId: string): Promise<ReportRecord | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const report = await this.prisma.report.findFirst({ where: { id: reportId, brandId } });

    return report ? toReportRecord(report) : null;
  }

  async getAdvisorDashboard(userId: string, brandId: BrandId): Promise<AdvisorDashboard | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const [records, reports] = await Promise.all([
      this.prisma.advisorRecord.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } }),
      this.prisma.report.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } })
    ]);
    const reportSummaries = reports.map(toAdvisorRelatedReport);
    const mappedRecords = records.map((record) => toAdvisorRecord(record, reportSummaries));

    return {
      brandId,
      records: mappedRecords,
      latestDiagnosis: mappedRecords.find((record) => record.type === 'diagnosis'),
      pendingFollowUps: mappedRecords.flatMap((record) => record.followUpItems.filter((item) => item.status !== 'done')),
      relatedReports: reportSummaries
    };
  }

  async createAdvisorRecord(userId: string, brandId: BrandId, input: AdvisorRecordInput): Promise<AdvisorRecord | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizeAdvisorRecordInput(input);
    const relatedReport = normalized.relatedReportId
      ? await this.prisma.report.findFirst({ where: { id: normalized.relatedReportId, brandId } })
      : null;
    if (normalized.relatedReportId && !relatedReport) {
      return null;
    }

    const record = await this.prisma.advisorRecord.create({
      data: {
        brandId,
        type: normalized.type,
        title: normalized.title,
        content: normalized.content,
        relatedReportId: normalized.relatedReportId,
        followUpItems: normalized.followUpItems,
        createdBy: userId
      }
    });
    const reports = relatedReport ? [toAdvisorRelatedReport(relatedReport)] : [];

    return toAdvisorRecord(record, reports);
  }

  async getInnerTestFeedbackDashboard(userId: string, brandId: BrandId): Promise<InnerTestFeedbackDashboard | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const records = await this.prisma.innerTestFeedback.findMany({ where: { brandId }, orderBy: { createdAt: 'desc' } });
    const mappedRecords = records.map((record) => toInnerTestFeedback(record as PrismaInnerTestFeedback));
    return {
      brandId,
      records: mappedRecords,
      statusCounts: countInnerTestFeedbackStatuses(mappedRecords)
    };
  }

  async createInnerTestFeedback(userId: string, brandId: BrandId, input: InnerTestFeedbackInput): Promise<InnerTestFeedback | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const normalized = normalizeInnerTestFeedbackInput(input);
    const record = await this.prisma.innerTestFeedback.create({
      data: {
        brandId,
        page: normalized.page,
        module: normalized.module,
        type: normalized.type,
        description: normalized.description,
        reporterId: userId
      }
    });
    const mappedRecord = toInnerTestFeedback(record as PrismaInnerTestFeedback);
    await this.createAuditLog(userId, {
      brandId,
      actorUserId: userId,
      action: 'inner_test_feedback.create',
      resourceType: 'inner_test_feedback',
      resourceId: mappedRecord.id,
      result: 'success',
      metadata: { page: mappedRecord.page, module: mappedRecord.module, type: mappedRecord.type }
    });
    return mappedRecord;
  }

  async updateInnerTestFeedback(userId: string, brandId: BrandId, feedbackId: string, input: InnerTestFeedbackUpdateInput): Promise<InnerTestFeedback | null> {
    if (!(await this.findAccessibleBrandDetail(userId, brandId))) {
      return null;
    }

    const existing = await this.prisma.innerTestFeedback.findFirst({ where: { id: feedbackId, brandId } });
    if (!existing) return null;

    const normalized = normalizeInnerTestFeedbackUpdateInput(input);
    const record = await this.prisma.innerTestFeedback.update({
      where: { id: feedbackId },
      data: {
        ...(normalized.status ? { status: normalized.status } : {}),
        ...(normalized.resolutionNote !== undefined ? { resolutionNote: normalized.resolutionNote } : {})
      }
    });
    const mappedRecord = toInnerTestFeedback(record as PrismaInnerTestFeedback);
    await this.createAuditLog(userId, {
      brandId,
      actorUserId: userId,
      action: 'inner_test_feedback.update',
      resourceType: 'inner_test_feedback',
      resourceId: mappedRecord.id,
      result: 'success',
      metadata: { status: mappedRecord.status }
    });
    return mappedRecord;
  }

  async recordDeniedAccess(log: DeniedAccessLog): Promise<void> {
    await this.prisma.deniedAccessLog.create({
      data: {
        userId: log.userId,
        brandId: log.brandId,
        reason: log.reason,
        requestedAt: new Date(log.requestedAt)
      }
    });
  }

  async listDeniedAccessLogs(userId: string): Promise<DeniedAccessLog[]> {
    const logs = await this.prisma.deniedAccessLog.findMany({
      where: { userId },
      orderBy: { requestedAt: 'desc' }
    });

    return logs.map((log) => ({
      userId: log.userId,
      brandId: log.brandId,
      reason: log.reason,
      requestedAt: log.requestedAt.toISOString()
    }));
  }

  private async createContentAssetFromPublishingInput(brandId: BrandId, input: PublishingRecordInput, account?: PublishingAccount): Promise<PrismaContentAsset | null> {
    const title = input.title?.trim();
    const body = input.body?.trim();
    const platform = input.targetPlatform?.trim() || account?.platform;
    if (!title || !body || !platform) {
      return null;
    }

    return this.prisma.contentAsset.create({
      data: {
        brandId,
        title,
        type: input.contentType?.trim() || 'generated_content',
        platform,
        url: `draft://${brandId}/${Date.now()}`,
        targetKeywords: input.targetKeywords ?? [],
        status: 'draft'
      }
    });
  }

  private async createPrismaCompetitorLinkedTestQuestions(brand: BrandDetail, candidate: CompetitorCandidate, label: CompetitorConfirmationLabel): Promise<void> {
    const theme = await this.ensurePrismaCompetitorTestTheme(brand, label);
    const questions = buildPrismaCompetitorLinkedQuestions(brand, candidate, label);
    for (const question of questions) {
      const exists = await this.prisma.testQuestionCandidate.findFirst({ where: { brandId: brand.brandId, question: question.question } });
      if (exists) continue;
      await this.prisma.testQuestionCandidate.create({
        data: {
          brandId: brand.brandId,
          themeId: theme.id,
          question: question.question,
          purposes: question.purposes,
          targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
          priority: question.priority,
          estimatedValue: question.estimatedValue,
          editable: true,
          selected: false
        }
      });
    }
  }

  private async ensurePrismaCompetitorTestTheme(brand: BrandDetail, label: CompetitorConfirmationLabel): Promise<PrismaTestTheme> {
    const themeName = label === 'national_benchmark' ? '全国标杆品牌对标' : '本地竞品推荐对比';
    const existing = await this.prisma.testTheme.findFirst({ where: { brandId: brand.brandId, type: 'competitor', name: themeName } });
    if (existing) return existing as PrismaTestTheme;

    const theme = await this.prisma.testTheme.create({
      data: {
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
        sourceProfileFields: ['competitors']
      }
    });
    return theme as PrismaTestTheme;
  }

  private async createPrismaNationalBenchmarkContentStrategy(brand: BrandDetail, competitor: Competitor, label: CompetitorConfirmationLabel): Promise<ContentStrategy | null> {
    if (label !== 'national_benchmark') return null;

    const unit = await this.ensurePrismaNationalBenchmarkOptimizationUnit(brand, competitor);
    const intent = await this.ensurePrismaNationalBenchmarkIntent(brand, unit, competitor);
    const existing = await this.prisma.contentStrategy.findFirst({
      where: { brandId: brand.brandId, intentId: intent.id, type: 'competitor_response', suggestedTitle: { contains: competitor.name } }
    });
    if (existing) return toContentStrategy(existing as PrismaContentStrategy);

    const strategy = await this.prisma.contentStrategy.create({
      data: {
        brandId: brand.brandId,
        optimizationUnitId: unit.id,
        intentId: intent.id,
        type: 'competitor_response',
        priority: 'medium',
        suggestedTitle: `${brand.name}对标${competitor.name}的品牌表达优化`,
        targetPlatform: 'wechat_official',
        targetKeywords: mergeStringLists([brand.name, competitor.name, '儿童运动成长课', '品牌对标'], competitor.industryTags),
        relatedPromptIds: [],
        status: 'draft'
      }
    });
    return toContentStrategy(strategy as PrismaContentStrategy);
  }

  private async ensurePrismaNationalBenchmarkOptimizationUnit(brand: BrandDetail, competitor: Competitor): Promise<PrismaOptimizationUnit> {
    const unitName = '全国标杆品牌对标';
    const existing = await this.prisma.optimizationUnit.findFirst({ where: { brandId: brand.brandId, type: 'competitor', name: unitName } });
    if (existing) return existing as PrismaOptimizationUnit;

    const unit = await this.prisma.optimizationUnit.create({
      data: {
        brandId: brand.brandId,
        name: unitName,
        type: 'competitor',
        targetKeywords: mergeStringLists([brand.name, competitor.name, '儿童运动成长课', '全国标杆品牌'], competitor.industryTags),
        priority: 'medium',
        enabled: true
      }
    });
    return unit as PrismaOptimizationUnit;
  }

  private async ensurePrismaNationalBenchmarkIntent(brand: BrandDetail, unit: PrismaOptimizationUnit, competitor: Competitor): Promise<PrismaUserIntent> {
    const intentText = `家长如何理解${brand.name}和${competitor.name}的儿童运动课程差异？`;
    const existing = await this.prisma.userIntent.findFirst({ where: { brandId: brand.brandId, optimizationUnitId: unit.id, text: intentText } });
    if (existing) return existing as PrismaUserIntent;

    const intent = await this.prisma.userIntent.create({
      data: {
        brandId: brand.brandId,
        optimizationUnitId: unit.id,
        category: 'competitor_compare',
        text: intentText,
        monitoringFrequency: 'manual',
        enabled: true
      }
    });
    return intent as PrismaUserIntent;
  }

  private async buildSingleBrandReportSnapshot(userId: string, brand: BrandDetail): Promise<SingleBrandReportSnapshot> {
    const [metrics, content, taskBoard] = await Promise.all([
      this.getBrandMetricDashboard(userId, brand.brandId),
      this.getContentCenterDashboard(userId, brand.brandId),
      this.getTaskBoard(userId, brand.brandId)
    ]);

    return {
      brand: { brandId: brand.brandId, name: brand.name, industry: brand.industry, status: brand.status },
      metrics: metrics ?? { brandId: brand.brandId, current: toMetricSnapshot(createEmptyMetricSnapshot(brand.brandId)), trend: [], breakdown: { platform: [], optimizationUnit: [], intent: [] } },
      competitor: { mentionRate: 0, suppressionRate: 0, averageRankGap: 0, highRiskIntents: [] },
      citation: { totalCitations: 0, officialCitationRate: 0, authoritySourceRate: 0, contentCitationRate: 0 },
      evaluation: { positiveRate: 0, neutralRate: 0, negativeRate: 0, accurateRate: 0 },
      content: content?.coverage ?? { keywordCoverageRate: 0, uncoveredKeywords: [], publishedAssetCount: 0, reusableAssetCount: 0 },
      taskProgress: taskBoard?.statusCounts ?? { todo: 0, doing: 0, review: 0, retest: 0, done: 0, reopened: 0 }
    };
  }

  private async buildMultiBrandReportSnapshot(userId: string): Promise<MultiBrandReportSnapshot> {
    const ranking = await this.listBrandMetricRanking(userId);
    const strongestPlatforms = await Promise.all(ranking.map(async (brand) => {
      const dashboard = await this.getBrandMetricDashboard(userId, brand.brandId);
      const strongest = dashboard?.breakdown.platform.sort((a, b) => b.totalScore - a.totalScore)[0];
      return strongest?.platformCode ? { brandId: brand.brandId, platformCode: strongest.platformCode, totalScore: strongest.totalScore } : null;
    }));
    const highPriorityTasks = await Promise.all(ranking.map(async (brand) => {
      const tasks = await this.prisma.optimizationTask.findMany({ where: { brandId: brand.brandId, priority: 'high', status: { not: 'done' } } });
      return tasks.map((task) => ({ brandId: brand.brandId, title: task.title, source: task.type }));
    }));

    return {
      ranking,
      strongestPlatforms: strongestPlatforms.filter((item): item is MultiBrandReportSnapshot['strongestPlatforms'][number] => Boolean(item)),
      weakScenarios: ranking.filter((brand) => brand.insufficientSample || brand.totalScore < 60).map((brand) => ({
        brandId: brand.brandId,
        name: brand.name,
        reason: brand.insufficientSample ? '监测样本不足' : `GEO 总分 ${brand.totalScore}，低于目标线`
      })),
      highPriorityIssues: highPriorityTasks.flat()
    };
  }

  private async findAccessiblePermission(userId: string, brandId: BrandId): Promise<PrismaAccessibleBrandPermission | null> {
    return this.prisma.userBrandPermission.findFirst({
      where: {
        userId,
        brandId,
        brand: {
          status: { not: 'archived' }
        }
      },
      include: { brand: true }
    });
  }

  private async toMonitoringRunDetail(run: PrismaMonitoringRun): Promise<MonitoringRunDetail> {
    const [prompt, response] = await Promise.all([
      this.prisma.brandPrompt.findUnique({ where: { id: run.promptId } }),
      this.prisma.aIResponse.findFirst({ where: { runId: run.id }, orderBy: { createdAt: 'desc' } })
    ]);
    const analysis = response
      ? await this.prisma.analysisResult.findUnique({ where: { responseId: response.id } })
      : null;

    return {
      ...toMonitoringRun(run),
      promptText: prompt?.text ?? '',
      response: response ? toAIResponse(response) : undefined,
      analysis: analysis ? toAnalysisResult(analysis) : undefined
    };
  }

  private async toMetricRankingItem(brand: BrandDetail): Promise<BrandMetricRankingItem> {
    const current = await this.prisma.gEOMetricSnapshot.findFirst({
      where: { brandId: brand.brandId, platformCode: null, optimizationUnitId: null, intentId: null },
      orderBy: { calculatedAt: 'desc' }
    });
    const snapshot = toMetricSnapshot(current ?? createEmptyMetricSnapshot(brand.brandId));

    return {
      brandId: brand.brandId,
      name: brand.name,
      status: brand.status,
      mentionRate: snapshot.mentionScore,
      top3Rate: snapshot.rankingScore,
      positiveRate: snapshot.sentimentScore,
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

  private async loadGrowthAnalysisSamples(brandId: BrandId): Promise<GrowthAnalysisSample[]> {
    const profileRecord = await this.prisma.brandProfile.findUnique({ where: { brandId } });
    const profile = profileRecord ? toBrandProfile(profileRecord) : createEmptyProfile(brandId);
    const results = await this.prisma.analysisResult.findMany({ where: { brandId }, orderBy: { updatedAt: 'desc' } });
    const samples = await Promise.all(results.map(async (result) => {
      const [run, response] = await Promise.all([
        this.prisma.monitoringRun.findFirst({ where: { id: result.runId, brandId } }),
        this.prisma.aIResponse.findFirst({ where: { id: result.responseId, brandId } })
      ]);
      if (!run || !response) {
        return null;
      }

      const prompt = await this.prisma.brandPrompt.findFirst({ where: { id: run.promptId, brandId } });
      if (!prompt) {
        return null;
      }

      const sample: GrowthAnalysisSample = {
        analysis: toAnalysisResult(result),
        runId: run.id,
        testPlanId: run.testPlanId ?? undefined,
        platformCode: run.platformCode,
        promptId: prompt.id,
        promptText: prompt.text,
        targetKeywords: toStringArray(prompt.targetKeywords),
        responseText: response.rawText,
        profile
      };

      return sample;
    }));

    return samples.filter((sample): sample is GrowthAnalysisSample => sample !== null);
  }

  private async toGrowthOptimizationPlan(plan: PrismaGrowthOptimizationPlan): Promise<GrowthOptimizationPlan> {
    const tasks = await this.prisma.optimizationTask.findMany({ where: { growthOptimizationPlanId: plan.id }, select: { id: true } });

    return {
      id: plan.id,
      brandId: plan.brandId,
      sourceTestPlanId: plan.sourceTestPlanId ?? undefined,
      strategyId: plan.strategyId ?? undefined,
      sourceRunIds: toStringArray(plan.sourceRunIds),
      summary: plan.summary,
      reasons: toGrowthOptimizationReasons(plan.reasons),
      priority: plan.priority as ContentStrategyPriority,
      ownerId: plan.ownerId ?? undefined,
      dueDate: plan.dueDate.toISOString(),
      publishingPlatforms: toStringArray(plan.publishingPlatforms),
      retestAt: plan.retestAt.toISOString(),
      contentRecommendations: toGrowthContentRecommendations(plan.contentRecommendations),
      taskIds: tasks.map((task) => task.id),
      status: plan.status as GrowthOptimizationPlan['status'],
      createdAt: plan.createdAt.toISOString(),
      updatedAt: plan.updatedAt.toISOString()
    };
  }

  private async findOptimizationUnitForBrand(brandId: BrandId, unitId: string): Promise<PrismaOptimizationUnit | null> {
    return this.prisma.optimizationUnit.findFirst({ where: { id: unitId, brandId } });
  }

  private async toOptimizationUnitWithCounts(unit: PrismaOptimizationUnit): Promise<OptimizationUnit> {
    const [userIntents, prompts, contentStrategies, monitoringRuns, tasks] = await Promise.all([
      this.prisma.userIntent.count({ where: { optimizationUnitId: unit.id } }),
      this.prisma.brandPrompt.count({ where: { optimizationUnitId: unit.id } }),
      this.prisma.contentStrategy.count({ where: { optimizationUnitId: unit.id } }),
      this.prisma.monitoringRun.count({ where: { optimizationUnitId: unit.id } }),
      this.prisma.optimizationTask.count({ where: { optimizationUnitId: unit.id } })
    ]);

    return {
      ...toOptimizationUnit(unit),
      relatedCounts: {
        userIntents,
        prompts,
        contentStrategies,
        monitoringRuns,
        tasks
      }
    };
  }

  private toBrandPromptCreateData(
    brand: BrandDetail,
    intent: PrismaUserIntent,
    template: PrismaPromptTemplate,
    unit: PrismaOptimizationUnit | null
  ) {
    const templateKeywords = toStringArray(template.targetKeywords);
    const unitKeywords = unit ? toStringArray(unit.targetKeywords) : [];

    return {
      brandId: brand.brandId,
      optimizationUnitId: intent.optimizationUnitId,
      intentId: intent.id,
      templateId: template.id,
      text: ensureBrandMention(renderPromptText(template.text, brand, intent, unit), brand),
      category: intent.category,
      targetKeywords: mergeStringLists(templateKeywords, unitKeywords),
      platformCodes: toStringArray(template.platformCodes),
      monitoringFrequency: template.frequency,
      enabled: true
    };
  }

  private toAccessibleBrand(permission: PrismaAccessibleBrandPermission): AccessibleBrand {
    return {
      brandId: permission.brand.id,
      name: permission.brand.name,
      status: permission.brand.status as BrandStatus,
      role: permission.role as UserBrandRole
    };
  }

  private async canUseBrandAccess(userId: string): Promise<boolean> {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });

    if (!user || user.status !== 'active') {
      return false;
    }

    const membership = await this.prisma.organizationMember.findFirst({
      where: {
        userId,
        status: 'active',
        organization: { status: 'active' }
      }
    });

    return Boolean(membership);
  }

  private toOrganizationMember(membership: PrismaOrganizationMember): OrganizationMember {
    return {
      id: membership.id,
      organizationId: membership.organizationId,
      userId: membership.userId,
      roleId: membership.roleId,
      status: membership.status as OrganizationMember['status'],
      organization: {
        id: membership.organization.id,
        name: membership.organization.name,
        status: membership.organization.status as OrganizationMember['organization']['status'],
        createdAt: membership.organization.createdAt.toISOString(),
        updatedAt: membership.organization.updatedAt.toISOString()
      },
      role: {
        id: membership.role.id,
        code: membership.role.code as OrganizationMember['role']['code'],
        name: membership.role.name,
        scope: membership.role.scope as OrganizationMember['role']['scope'],
        permissions: toStringArray(membership.role.permissions),
        createdAt: membership.role.createdAt.toISOString(),
        updatedAt: membership.role.updatedAt.toISOString()
      },
      createdAt: membership.createdAt.toISOString(),
      updatedAt: membership.updatedAt.toISOString()
    };
  }

  private toBrandDetail(brand: PrismaBrand, role?: UserBrandRole): BrandDetail {
    return {
      brandId: brand.id,
      name: brand.name,
      status: brand.status as BrandStatus,
      role,
      aliases: toStringArray(brand.aliases),
      industry: brand.industry ?? '',
      website: brand.website ?? '',
      targetCities: toStringArray(brand.targetCities),
      businessScope: brand.businessScope ?? '',
      targetAudience: brand.targetAudience ?? '',
      createdAt: brand.createdAt.toISOString(),
      updatedAt: brand.updatedAt.toISOString()
    };
  }

  private toBrandCreateData(input: BrandMutationInput) {
    return {
      name: input.name.trim(),
      status: input.status ?? 'active',
      aliases: input.aliases ?? [],
      industry: input.industry.trim(),
      website: input.website?.trim() || '',
      targetCities: input.targetCities ?? [],
      businessScope: input.businessScope.trim(),
      targetAudience: input.targetAudience.trim()
    };
  }

  private toBrandUpdateData(input: Partial<BrandMutationInput>) {
    return {
      ...(input.name !== undefined ? { name: input.name.trim() } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
      ...(input.aliases !== undefined ? { aliases: input.aliases } : {}),
      ...(input.industry !== undefined ? { industry: input.industry.trim() } : {}),
      ...(input.website !== undefined ? { website: input.website.trim() } : {}),
      ...(input.targetCities !== undefined ? { targetCities: input.targetCities } : {}),
      ...(input.businessScope !== undefined ? { businessScope: input.businessScope.trim() } : {}),
      ...(input.targetAudience !== undefined ? { targetAudience: input.targetAudience.trim() } : {})
    };
  }
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function cleanStringList(values: string[] = []): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function cleanStandardAnswerEvidence(values: BrandStandardAnswerEvidence[] = []): BrandStandardAnswerEvidence[] {
  return values
    .map((item) => ({
      label: item.label.trim(),
      sourceType: item.sourceType,
      ...(item.sourceId?.trim() ? { sourceId: item.sourceId.trim() } : {}),
      excerpt: item.excerpt.trim()
    }))
    .filter((item) => item.label.length > 0 && item.excerpt.length > 0);
}

function toInputJsonArray<T extends Prisma.InputJsonValue>(values: T[]): Prisma.InputJsonArray {
  return values as Prisma.InputJsonArray;
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

function createDefaultVisibilitySprintSteps(currentStep: VisibilitySprintStepCode): VisibilitySprintStep[] {
  const steps: Array<Pick<VisibilitySprintStep, 'code' | 'title' | 'message'>> = [
    {
      code: 'question_radar',
      title: '问题意图雷达',
      message: '从品牌资料、竞品和用户真实搜索意图中筛出本轮高价值问题。'
    },
    {
      code: 'ai_response_monitoring',
      title: 'AI 回复监测',
      message: '获取真实 AI 平台回答，记录品牌是否被提及、推荐和引用。'
    },
    {
      code: 'standard_answer_alignment',
      title: '品牌标准答案对照',
      message: '用品牌确认过的标准答案校验 AI 回复是否准确完整。'
    },
    {
      code: 'gap_diagnosis',
      title: '内容缺口诊断',
      message: '识别 AI 误解、竞品压制、引用缺口和表达风险。'
    },
    {
      code: 'content_asset_generation',
      title: '内容资产生成',
      message: '把缺口转化为可审稿的文章、问答、门店页和平台内容草稿。'
    },
    {
      code: 'publishing_preparation',
      title: '发布准备',
      message: '按平台要求整理标题、正文、标签和人工发布清单。'
    },
    {
      code: 'retest_and_trend',
      title: '复测和趋势',
      message: '在内容分发后安排复测，追踪 AI 可见性指标变化。'
    }
  ];
  let reachedCurrent = false;

  return steps.map((step) => {
    if (step.code === currentStep) {
      reachedCurrent = true;
      return { ...step, status: 'running', relatedEntityIds: [] };
    }

    return { ...step, status: reachedCurrent ? 'pending' : 'completed', relatedEntityIds: [] };
  });
}

function toVisibilitySprintMetricSummary(value: unknown): VisibilitySprintMetricSummary {
  const input = toRecord(value);
  const summary = createEmptyVisibilitySprintMetricSummary();

  return {
    questionCoverageRate: toNumber(input.questionCoverageRate, summary.questionCoverageRate),
    mentionRate: toNumber(input.mentionRate, summary.mentionRate),
    recommendationRate: toNumber(input.recommendationRate, summary.recommendationRate),
    firstRecommendationRate: toNumber(input.firstRecommendationRate, summary.firstRecommendationRate),
    topThreeRate: toNumber(input.topThreeRate, summary.topThreeRate),
    citationHitRate: toNumber(input.citationHitRate, summary.citationHitRate),
    expressionAccuracyRate: toNumber(input.expressionAccuracyRate, summary.expressionAccuracyRate),
    riskExpressionCount: toNumber(input.riskExpressionCount, summary.riskExpressionCount),
    contentGapCount: toNumber(input.contentGapCount, summary.contentGapCount),
    competitorSuppressionCount: toNumber(input.competitorSuppressionCount, summary.competitorSuppressionCount),
    sampleSize: toNumber(input.sampleSize, summary.sampleSize),
    ...(typeof input.updatedAt === 'string' ? { updatedAt: input.updatedAt } : {})
  };
}

function toNumber(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback;
}

function toVisibilitySprintSteps(value: unknown, currentStep: VisibilitySprintStepCode): VisibilitySprintStep[] {
  if (!Array.isArray(value)) {
    return createDefaultVisibilitySprintSteps(currentStep);
  }

  const steps = value.flatMap((item) => {
    const input = toRecord(item);
    if (typeof input.code !== 'string' || typeof input.title !== 'string' || typeof input.message !== 'string') {
      return [];
    }

    return [{
      code: input.code as VisibilitySprintStepCode,
      status: (typeof input.status === 'string' ? input.status : 'pending') as VisibilitySprintStep['status'],
      title: input.title,
      message: input.message,
      ...(typeof input.startedAt === 'string' ? { startedAt: input.startedAt } : {}),
      ...(typeof input.completedAt === 'string' ? { completedAt: input.completedAt } : {}),
      relatedEntityIds: toStringArray(input.relatedEntityIds)
    } satisfies VisibilitySprintStep];
  });

  return steps.length > 0 ? steps : createDefaultVisibilitySprintSteps(currentStep);
}

function toVisibilitySprint(sprint: PrismaVisibilitySprint): VisibilitySprint {
  const currentStep = sprint.currentStep as VisibilitySprintStepCode;

  return {
    sprintId: sprint.id,
    brandId: sprint.brandId,
    title: sprint.title,
    goal: sprint.goal,
    status: sprint.status as VisibilitySprintStatus,
    currentStep,
    steps: toVisibilitySprintSteps(sprint.steps, currentStep),
    metricSummary: toVisibilitySprintMetricSummary(sprint.metricSummary),
    relatedQuestionIds: toStringArray(sprint.relatedQuestionIds),
    relatedTestPlanIds: toStringArray(sprint.relatedTestPlanIds),
    relatedMonitoringRunIds: toStringArray(sprint.relatedMonitoringRunIds),
    relatedStandardAnswerIds: toStringArray(sprint.relatedStandardAnswerIds),
    relatedContentTaskIds: toStringArray(sprint.relatedContentTaskIds),
    relatedPublishingRecordIds: toStringArray(sprint.relatedPublishingRecordIds),
    relatedRetestTaskIds: toStringArray(sprint.relatedRetestTaskIds),
    createdBy: sprint.createdBy,
    createdAt: sprint.createdAt.toISOString(),
    updatedAt: sprint.updatedAt.toISOString()
  };
}

function toBrandStandardAnswer(answer: PrismaBrandStandardAnswer): BrandStandardAnswer {
  return {
    answerId: answer.id,
    brandId: answer.brandId,
    questionId: answer.questionId,
    question: answer.question,
    answer: answer.answer,
    keyPoints: toStringArray(answer.keyPoints),
    evidence: toBrandStandardAnswerEvidence(answer.evidence),
    status: answer.status as BrandStandardAnswerStatus,
    ...(answer.reviewedBy ? { reviewedBy: answer.reviewedBy } : {}),
    ...(answer.reviewedAt ? { reviewedAt: answer.reviewedAt.toISOString() } : {}),
    createdBy: answer.createdBy,
    createdAt: answer.createdAt.toISOString(),
    updatedAt: answer.updatedAt.toISOString()
  };
}

function toBrandStandardAnswerEvidence(value: unknown): BrandStandardAnswerEvidence[] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.flatMap((item) => {
    const input = toRecord(item);
    if (typeof input.label !== 'string' || typeof input.sourceType !== 'string' || typeof input.excerpt !== 'string') {
      return [];
    }

    return [{
      label: input.label,
      sourceType: input.sourceType as BrandStandardAnswerEvidence['sourceType'],
      ...(typeof input.sourceId === 'string' ? { sourceId: input.sourceId } : {}),
      excerpt: input.excerpt
    } satisfies BrandStandardAnswerEvidence];
  });
}

function toAuditLog(auditLog: PrismaAuditLog): AuditLog {
  return {
    id: auditLog.id,
    brandId: auditLog.brandId,
    organizationId: auditLog.organizationId,
    actorUserId: auditLog.actorUserId,
    action: auditLog.action,
    resourceType: auditLog.resourceType,
    resourceId: auditLog.resourceId,
    result: auditLog.result as AuditLog['result'],
    errorCode: auditLog.errorCode,
    metadata: toRecord(auditLog.metadata),
    createdAt: auditLog.createdAt.toISOString()
  };
}

function sanitizeAuditMetadata(metadata: Record<string, unknown>): Record<string, unknown> {
  const sensitiveKeys = new Set(['credentialRef', 'apiKey', 'token', 'password', 'secret', 'providerPayload']);

  return Object.fromEntries(
    Object.entries(metadata).map(([key, value]) => [key, sensitiveKeys.has(key) ? '[REDACTED]' : value])
  );
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}

function toBrandProfile(profile: PrismaBrandProfile, completenessPrompts?: BrandProfileCompletenessPrompt[]): BrandProfile {
  const missingFields = toStringArray(profile.missingFields);

  return {
    brandId: profile.brandId,
    intro: profile.intro,
    valueProps: toStringArray(profile.valueProps),
    offerings: toStringArray(profile.offerings),
    proofPoints: toStringArray(profile.proofPoints),
    targetCustomers: toStringArray(profile.targetCustomers),
    recommendedExpressions: toStringArray(profile.recommendedExpressions),
    blockedExpressions: toStringArray(profile.blockedExpressions),
    contentRules: toStringArray(profile.contentRules),
    competitors: toStringArray(profile.competitors),
    faqs: toFaqs(profile.faqs),
    completenessScore: profile.completenessScore,
    missingFields,
    completenessPrompts: completenessPrompts ?? buildCompletenessPromptsFromMissingFields(missingFields),
    updatedAt: profile.updatedAt.toISOString()
  };
}

function createEmptyProfile(brandId: BrandId): BrandProfile {
  return {
    brandId,
    ...normalizeProfileInput({
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
    }),
    completenessScore: 0,
    missingFields: ['品牌介绍', '业务范围', '核心卖点', 'FAQ', '竞品', '用户画像', '权威背书', '禁用表达'],
    completenessPrompts: buildCompletenessPromptsFromMissingFields(['品牌介绍', '业务范围', '核心卖点', 'FAQ', '竞品', '用户画像', '权威背书', '禁用表达']),
    updatedAt: new Date(0).toISOString()
  };
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

function calculateBrandProfileCompleteness(brand: Pick<BrandDetail, 'businessScope' | 'targetAudience'>, profile: BrandProfileInput) {
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

function buildCompletenessPromptsFromMissingFields(missingFields: string[]): BrandProfileCompletenessPrompt[] {
  const prompts = buildCompletenessChecks(
    { businessScope: '', targetAudience: '' },
    normalizeProfileInput({
      intro: 'placeholder',
      valueProps: ['placeholder'],
      offerings: ['placeholder'],
      proofPoints: ['placeholder'],
      targetCustomers: ['placeholder'],
      recommendedExpressions: [],
      blockedExpressions: ['placeholder'],
      contentRules: [],
      competitors: ['placeholder'],
      faqs: [{ question: 'placeholder', answer: 'placeholder' }]
    })
  );

  return prompts
    .filter((item) => missingFields.includes(item.label))
    .map(({ field, label, impact, prompt }) => ({ field, label, impact, prompt }));
}

function toBrandProfileData(input: BrandProfileInput, completenessScore: number, missingFields: string[]) {
  return {
    intro: input.intro,
    valueProps: input.valueProps,
    offerings: input.offerings,
    proofPoints: input.proofPoints,
    targetCustomers: input.targetCustomers,
    recommendedExpressions: input.recommendedExpressions,
    blockedExpressions: input.blockedExpressions,
    contentRules: input.contentRules,
    competitors: input.competitors,
    faqs: input.faqs,
    completenessScore,
    missingFields
  };
}

function toKnowledgeSource(source: PrismaKnowledgeSource): KnowledgeSource {
  return {
    id: source.id,
    brandId: source.brandId,
    name: source.name,
    sourceType: source.sourceType as KnowledgeSource['sourceType'],
    sourceUrl: source.sourceUrl ?? undefined,
    fileRef: source.fileRef ?? undefined,
    status: source.status as KnowledgeSourceStatus,
    errorMessage: source.errorMessage ?? undefined,
    createdAt: source.createdAt.toISOString(),
    updatedAt: source.updatedAt.toISOString()
  };
}

function toOptimizationUnit(unit: PrismaOptimizationUnit): OptimizationUnit {
  return {
    id: unit.id,
    brandId: unit.brandId,
    name: unit.name,
    type: unit.type as OptimizationUnitType,
    targetKeywords: toStringArray(unit.targetKeywords),
    priority: unit.priority as OptimizationUnitPriority,
    enabled: unit.enabled,
    relatedCounts: createEmptyOptimizationUnitCounts(),
    createdAt: unit.createdAt.toISOString(),
    updatedAt: unit.updatedAt.toISOString()
  };
}

function toTestTheme(theme: PrismaTestTheme): TestTheme {
  return {
    id: theme.id,
    brandId: theme.brandId,
    type: theme.type as TestTheme['type'],
    name: theme.name,
    businessExplanation: theme.businessExplanation,
    priority: theme.priority as OptimizationUnitPriority,
    estimatedValue: theme.estimatedValue,
    enabled: theme.enabled,
    sourceProfileFields: toBrandImportFieldKeys(theme.sourceProfileFields),
    createdAt: theme.createdAt.toISOString(),
    updatedAt: theme.updatedAt.toISOString()
  };
}

function toTestQuestionCandidate(candidate: PrismaTestQuestionCandidate): TestQuestionCandidate {
  return {
    id: candidate.id,
    brandId: candidate.brandId,
    themeId: candidate.themeId,
    promptId: candidate.promptId ?? undefined,
    question: candidate.question,
    purposes: toTestQuestionPurposes(candidate.purposes),
    targetPlatforms: toStringArray(candidate.targetPlatforms),
    priority: candidate.priority as OptimizationUnitPriority,
    estimatedValue: candidate.estimatedValue,
    editable: candidate.editable,
    selected: candidate.selected,
    createdAt: candidate.createdAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString()
  };
}

function toTestPlan(plan: PrismaTestPlan): TestPlan {
  return {
    id: plan.id,
    brandId: plan.brandId,
    name: plan.name,
    status: plan.status as TestPlan['status'],
    questions: toTestPlanQuestions(plan.questions),
    platformCodes: toStringArray(plan.platformCodes),
    connectionSummary: Array.isArray(plan.connectionSummary) ? plan.connectionSummary as TestPlan['connectionSummary'] : [],
    executionMethod: plan.executionMethod as TestPlan['executionMethod'],
    estimatedDurationMinutes: plan.estimatedDurationMinutes,
    confirmationItems: toStringArray(plan.confirmationItems),
    monitoringRunIds: [],
    createdBy: plan.createdBy,
    createdAt: plan.createdAt.toISOString(),
    updatedAt: plan.updatedAt.toISOString()
  };
}

function toTestPlanQuestions(value: unknown): TestPlan['questions'] {
  if (!Array.isArray(value)) {
    return [];
  }

  return value.map((item) => {
    const question = item as Partial<TestPlan['questions'][number]>;

    return {
      candidateId: typeof question.candidateId === 'string' ? question.candidateId : undefined,
      promptId: typeof question.promptId === 'string' ? question.promptId : undefined,
      question: typeof question.question === 'string' ? question.question : '',
      purposes: toTestQuestionPurposes(question.purposes),
      targetPlatforms: toStringArray(question.targetPlatforms)
    };
  }).filter((question) => question.question.trim());
}

function toUserIntent(intent: PrismaUserIntent): UserIntent {
  return {
    id: intent.id,
    brandId: intent.brandId,
    optimizationUnitId: intent.optimizationUnitId,
    category: intent.category as UserIntentCategory,
    text: intent.text,
    monitoringFrequency: intent.monitoringFrequency as MonitoringFrequency,
    enabled: intent.enabled,
    platformMetrics: [],
    createdAt: intent.createdAt.toISOString(),
    updatedAt: intent.updatedAt.toISOString()
  };
}

function toPromptTemplate(template: PrismaPromptTemplate): PromptTemplate {
  return {
    id: template.id,
    name: template.name,
    industry: template.industry ?? undefined,
    category: template.category as UserIntentCategory,
    text: template.text,
    targetKeywords: toStringArray(template.targetKeywords),
    platformCodes: toStringArray(template.platformCodes),
    frequency: template.frequency as MonitoringFrequency,
    createdAt: template.createdAt.toISOString(),
    updatedAt: template.updatedAt.toISOString()
  };
}

function toBrandPrompt(prompt: PrismaBrandPrompt): BrandPrompt {
  return {
    id: prompt.id,
    brandId: prompt.brandId,
    optimizationUnitId: prompt.optimizationUnitId,
    intentId: prompt.intentId,
    templateId: prompt.templateId ?? undefined,
    text: prompt.text,
    category: prompt.category as UserIntentCategory,
    targetKeywords: toStringArray(prompt.targetKeywords),
    platformCodes: toStringArray(prompt.platformCodes),
    monitoringFrequency: prompt.monitoringFrequency as MonitoringFrequency,
    enabled: prompt.enabled,
    createdAt: prompt.createdAt.toISOString(),
    updatedAt: prompt.updatedAt.toISOString()
  };
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

function normalizeOptimizationUnitInput(input: OptimizationUnitInput): Omit<OptimizationUnitInput, 'targetKeywords' | 'enabled'> & { targetKeywords: string[]; enabled: boolean } {
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
    .sort((first, second) => priorities[first.priority] - priorities[second.priority] || second.createdAt.localeCompare(first.createdAt));

  return limit ? filtered.slice(offset, offset + limit) : filtered.slice(offset);
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

function buildConnectionSummaryFromConfigs(platformCodes: string[], configs: PlatformConfig[]): TestPlan['connectionSummary'] {
  return platformCodes.map((platformCode) => {
    const config = configs.find((item) => item.platformCode === platformCode && item.enabled);

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
        status: config.hasCredential ? 'ready' : 'needs_configuration',
        hasCredential: config.hasCredential,
        message: config.hasCredential ? '可以自动监测。' : '需要填写平台密钥后才能自动监测。'
      };
    }

    if (config.mode === 'semi_auto') {
      return {
        platformCode,
        name: config.name,
        methods: ['api', 'browser', 'manual'],
        status: 'needs_confirmation',
        hasCredential: config.hasCredential,
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
    if (summary.status === 'needs_configuration') return [`${summary.name} 需要先补充平台连接信息`];
    if (summary.status === 'needs_confirmation') return [`${summary.name} 需要确认浏览器登录或切换手动录入`];

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

async function executeTestPlanSteps(
  plan: TestPlan,
  createRun: (question: TestPlan['questions'][number], platformCode: string) => Promise<MonitoringRunDetail | null>,
  executeBrowserQuestion?: (question: TestPlan['questions'][number], platformCode: string) => Promise<BrowserTestPlanStepResult | null>,
  executeApiQuestion?: (question: TestPlan['questions'][number], platformCode: string) => Promise<MonitoringRunDetail | null>
): Promise<TestPlanExecutionResult> {
  const apiRuns: MonitoringRunDetail[] = [];
  const browserSteps: TestPlanExecutionResult['browserSteps'] = [];
  const manualSteps: TestPlanExecutionResult['manualSteps'] = [];
  const configurationItems: TestPlanExecutionResult['configurationItems'] = [];
  const skippedSteps: TestPlanExecutionResult['skippedSteps'] = [];

  for (const question of plan.questions) {
    for (const platformCode of question.targetPlatforms) {
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
        continue;
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
          continue;
        }

        const run = await (executeApiQuestion?.(question, platformCode) ?? createRun(question, platformCode));
        if (run) {
          apiRuns.push(run);
          continue;
        }

        skippedSteps.push({
          question: question.question,
          platformCode,
          method: 'api',
          status: 'skipped',
          promptId: question.promptId,
          message: '自动监测创建失败，请检查监测问题和平台连接信息。'
        });
        continue;
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
          continue;
        }

        const browserResult = await executeBrowserQuestion?.(question, platformCode);
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
          continue;
        }

        browserSteps.push({
          question: question.question,
          platformCode,
          method: 'browser',
          status: browserResult?.status ?? 'needs_confirmation',
          promptId: question.promptId,
          message: browserResult?.message ?? summary.message ?? '需要确认浏览器登录状态后继续测试。'
        });
        continue;
      }

      manualSteps.push({
        question: question.question,
        platformCode,
        method: 'manual',
        status: 'manual_required',
        promptId: question.promptId,
        message: summary.message ?? '需要手动提交问题并录入回答。'
      });
    }
  }

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

function toBrowserStepConfirmation(message: string): BrowserTestPlanStepResult {
  return {
    status: 'needs_confirmation',
    message
  };
}

function normalizeApiExecutionError(error: unknown): { code: string; message: string; retryable: boolean } {
  if (error instanceof AIPlatformAdapterSelectionError) {
    return { code: error.code, message: error.message, retryable: false };
  }

  if (error instanceof Error && 'code' in error && 'retryable' in error && typeof error.code === 'string' && typeof error.retryable === 'boolean') {
    return { code: error.code, message: error.message, retryable: error.retryable };
  }

  if (error instanceof Error) {
    return { code: 'adapter_execution_failed', message: error.message, retryable: true };
  }

  return { code: 'adapter_execution_failed', message: 'AI 平台调用失败', retryable: true };
}

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

function toTestQuestionPurposes(value: unknown): TestQuestionPurpose[] {
  return normalizeTestQuestionPurposes(toStringArray(value) as TestQuestionPurpose[]);
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

function toBrandImportFieldKeys(value: unknown): BrandImportFieldKey[] {
  return normalizeBrandImportFieldKeys(toStringArray(value) as BrandImportFieldKey[]);
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

function normalizePromptTemplateInput(input: PromptTemplateInput): Omit<PromptTemplateInput, 'targetKeywords'> & { targetKeywords: string[] } {
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

function createEmptyOptimizationUnitCounts(): OptimizationUnit['relatedCounts'] {
  return {
    userIntents: 0,
    prompts: 0,
    contentStrategies: 0,
    monitoringRuns: 0,
    tasks: 0
  };
}

function normalizeStringList(values: string[] = []): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizeFaqs(faqs: BrandFaq[] = []): BrandFaq[] {
  return faqs.map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() })).filter((faq) => hasText(faq.question) || hasText(faq.answer));
}

function toFaqs(value: unknown): BrandFaq[] {
  return Array.isArray(value)
    ? value
        .map((item) => ({
          question: typeof item?.question === 'string' ? item.question : '',
          answer: typeof item?.answer === 'string' ? item.answer : ''
        }))
        .filter((item) => hasText(item.question) || hasText(item.answer))
    : [];
}

function hasText(value: string | undefined): boolean {
  return Boolean(value?.trim());
}

function mergeStringLists(...lists: string[][]): string[] {
  return [...new Set(lists.flat().map((item) => item.trim()).filter(Boolean))];
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
    confirmationLabel: input.confirmationLabel ? normalizePrismaCompetitorConfirmationLabel(input.confirmationLabel) : undefined,
    sourceCandidateId: input.sourceCandidateId?.trim(),
    sourceProvider: input.sourceProvider,
    nearestCampusDistanceKm: input.nearestCampusDistanceKm,
    isNationalBenchmark: input.isNationalBenchmark ?? false,
    isCampusFocus: input.isCampusFocus ?? false
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
    confirmationLabel: input.confirmationLabel ? normalizePrismaCompetitorConfirmationLabel(input.confirmationLabel) : undefined,
    sourceCandidateId: input.sourceCandidateId?.trim(),
    sourceProvider: input.sourceProvider,
    nearestCampusDistanceKm: input.nearestCampusDistanceKm,
    isNationalBenchmark: input.isNationalBenchmark,
    isCampusFocus: input.isCampusFocus
  };
}

function toCompetitor(competitor: PrismaCompetitor): Competitor {
  return {
    id: competitor.id,
    brandId: competitor.brandId,
    name: competitor.name,
    aliases: toStringArray(competitor.aliases),
    website: competitor.website ?? undefined,
    industryTags: toStringArray(competitor.industryTags),
    comparisonNote: competitor.comparisonNote,
    suppressionRule: toCompetitorSuppressionRule(competitor.suppressionRule),
    confirmationLabel: competitor.confirmationLabel as CompetitorConfirmationLabel | undefined,
    sourceCandidateId: competitor.sourceCandidateId ?? undefined,
    sourceProvider: competitor.sourceProvider as Competitor['sourceProvider'],
    nearestCampusDistanceKm: competitor.nearestCampusDistanceKm ?? undefined,
    isNationalBenchmark: competitor.isNationalBenchmark,
    isCampusFocus: competitor.isCampusFocus,
    createdAt: competitor.createdAt.toISOString(),
    updatedAt: competitor.updatedAt.toISOString()
  };
}

function toCompetitorSuppressionRule(value: unknown): Competitor['suppressionRule'] {
  const record = toRecord(value);
  return { consecutiveThreshold: Math.max(2, Math.round(Number(record.consecutiveThreshold ?? 2))) };
}

function toCompetitorDiscoveryRun(run: PrismaCompetitorDiscoveryRun): CompetitorDiscoveryRun {
  return {
    runId: run.id,
    brandId: run.brandId,
    city: run.city,
    campusRadiusKm: run.campusRadiusKm,
    keywords: toStringArray(run.keywords),
    status: run.status as CompetitorDiscoveryRun['status'],
    candidateCount: run.candidateCount,
    missingFields: toStringArray(run.missingFields),
    sourceProvider: run.sourceProvider as CompetitorDiscoveryRun['sourceProvider'],
    providerStatus: run.providerStatus as CompetitorDiscoveryRun['providerStatus'],
    providerMessage: run.providerMessage,
    cacheHit: run.cacheHit,
    createdBy: run.createdBy,
    failureReason: run.failureReason ?? undefined,
    createdAt: run.createdAt.toISOString(),
    completedAt: dateToIso(run.completedAt)
  };
}

function toCompetitorCandidate(candidate: PrismaCompetitorCandidate): CompetitorCandidate {
  return {
    candidateId: candidate.id,
    runId: candidate.runId,
    brandId: candidate.brandId,
    sourceProvider: candidate.sourceProvider as CompetitorCandidate['sourceProvider'],
    sourcePoiId: candidate.sourcePoiId ?? undefined,
    name: candidate.name,
    address: candidate.address ?? '',
    city: candidate.city ?? '',
    latitude: candidate.latitude ?? undefined,
    longitude: candidate.longitude ?? undefined,
    category: candidate.category ?? undefined,
    distanceToNearestCampusKm: candidate.distanceToNearestCampusKm ?? undefined,
    matchedKeywords: toStringArray(candidate.matchedKeywords),
    score: candidate.score,
    suggestedLabel: candidate.suggestedLabel as CompetitorConfirmationLabel,
    confirmedLabel: candidate.confirmedLabel as CompetitorConfirmationLabel | undefined,
    matchReasons: toStringArray(candidate.matchReasons),
    confidence: candidate.confidence as CompetitorCandidate['confidence'],
    isCampusFocus: candidate.isCampusFocus,
    decisionStatus: candidate.decisionStatus as CompetitorCandidate['decisionStatus'],
    excludedReason: candidate.excludedReason ?? undefined,
    createdAt: candidate.createdAt.toISOString(),
    updatedAt: candidate.updatedAt.toISOString()
  };
}

function toCompetitorCandidateCreateData(candidate: CompetitorCandidate) {
  return {
    id: candidate.candidateId,
    runId: candidate.runId,
    brandId: candidate.brandId,
    sourceProvider: candidate.sourceProvider,
    sourcePoiId: candidate.sourcePoiId,
    name: candidate.name,
    address: candidate.address,
    city: candidate.city,
    latitude: candidate.latitude,
    longitude: candidate.longitude,
    category: candidate.category,
    distanceToNearestCampusKm: candidate.distanceToNearestCampusKm,
    matchedKeywords: candidate.matchedKeywords,
    score: candidate.score,
    suggestedLabel: candidate.suggestedLabel,
    confirmedLabel: candidate.confirmedLabel,
    matchReasons: candidate.matchReasons,
    confidence: candidate.confidence,
    isCampusFocus: candidate.isCampusFocus,
    decisionStatus: candidate.decisionStatus,
    excludedReason: candidate.excludedReason
  };
}

function buildPrismaCompetitorDiscoveryKeywords(brand: BrandDetail, profile?: BrandProfile): string[] {
  return mergeStringLists(
    ['儿童体能', '少儿跑酷', '儿童运动', '体适能', '快乐体操', '篮球培训', '儿童运动馆'],
    brand.targetCities.map((city) => `${city}儿童运动`),
    profile?.offerings ?? [],
    profile?.competitors ?? []
  ).slice(0, 12);
}

function clampPrismaCampusRadius(value: number): number {
  return Math.min(8, Math.max(3, Math.round(value)));
}

function normalizePrismaCompetitorSourceProvider(provider?: CompetitorCandidateSourceProvider): CompetitorCandidateSourceProvider {
  const providers: CompetitorCandidateSourceProvider[] = ['amap', 'tencent', 'baidu', 'manual'];
  return provider && providers.includes(provider) ? provider : 'amap';
}

function resolvePrismaMapProviderState(provider: CompetitorCandidateSourceProvider): Pick<CompetitorDiscoveryRun, 'providerStatus' | 'providerMessage'> {
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

function buildPrismaCompetitorCandidateCacheKey(brandId: BrandId, city: string, campusRadiusKm: number, keywords: string[], sourceProvider: CompetitorCandidateSourceProvider): string {
  return [brandId, sourceProvider, city || '待补充城市', campusRadiusKm, [...keywords].sort().join(',')].join('|');
}

function clonePrismaCompetitorCandidatesForRun(candidates: CompetitorCandidate[], runId: string, timestamp: string): CompetitorCandidate[] {
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

function normalizePrismaCompetitorConfirmationLabel(label: CompetitorConfirmationLabel): CompetitorConfirmationLabel {
  const labels: CompetitorConfirmationLabel[] = ['direct_competitor', 'indirect_competitor', 'local_alternative', 'national_benchmark', 'excluded'];
  return labels.includes(label) ? label : 'direct_competitor';
}

function matchesPrismaCompetitorCandidateFilter(candidate: CompetitorCandidate, filter?: CompetitorDiscoveryCandidatesQuery['filter']): boolean {
  if (!filter || filter === 'all') return true;
  if (filter === 'campus_focus') return candidate.isCampusFocus;
  if (filter === 'direct_competitor') return candidate.suggestedLabel === 'direct_competitor';
  if (filter === 'national_benchmark') return candidate.suggestedLabel === 'national_benchmark';
  if (filter === 'excluded') return candidate.decisionStatus === 'excluded';
  if (filter === 'pending') return candidate.decisionStatus === 'pending';
  if (filter === 'confirmed') return candidate.decisionStatus === 'confirmed';
  return true;
}

function dedupePrismaCompetitorCandidates(candidates: CompetitorCandidate[]): CompetitorCandidate[] {
  const seen = new Set<string>();
  return candidates.filter((candidate) => {
    const key = [candidate.name, candidate.address, candidate.latitude?.toFixed(4), candidate.longitude?.toFixed(4)].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function buildPrismaLocalCompetitorCandidates(brand: BrandDetail, run: CompetitorDiscoveryRun, profile?: BrandProfile, providerPois?: PrismaLocalPoiCandidate[]): CompetitorCandidate[] {
  const timestamp = new Date().toISOString();
  const city = run.city === '待补充城市' ? brand.targetCities[0] ?? '贵阳' : run.city;
  const campusCoordinates = resolvePrismaBrandCampusCoordinates(brand, profile, city);
  const pois = (providerPois && providerPois.length > 0 ? providerPois : getPrismaDefaultLocalPoiCandidates(city))
    .filter((poi) => !isPrismaOwnBrandPoi(brand, poi.name));
  return pois.map((poi, index) => {
    const matchedKeywords = run.keywords.filter((keyword) => poi.searchText.includes(keyword)).slice(0, 4);
    const isNationalBenchmark = poi.kind === 'national';
    const nearestCampusDistanceKm = calculatePrismaNearestCampusDistanceKm(poi, campusCoordinates);
    const isCampusFocus = typeof nearestCampusDistanceKm === 'number' && nearestCampusDistanceKm <= run.campusRadiusKm;
    const categoryScore = matchedKeywords.length >= 2 ? 25 : matchedKeywords.length === 1 ? 16 : 8;
    const cityScore = poi.city === city ? 20 : 8;
    const distanceScore = typeof nearestCampusDistanceKm !== 'number' ? 8 : isCampusFocus ? 25 : 12;
    const audienceScore = /儿童|少儿|体能|体适能|跑酷|体操|篮球/.test(poi.searchText) ? 20 : 8;
    const profileScore = profile?.offerings.some((offering) => poi.searchText.includes(offering.slice(0, 2))) ? 10 : 4;
    const score = Math.min(100, Math.max(0, cityScore + distanceScore + categoryScore + audienceScore + profileScore));
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

type PrismaLocalPoiCandidate = { sourcePoiId: string; name: string; address: string; city: string; latitude: number; longitude: number; category: string; kind: 'local' | 'national'; searchText: string };

function getPrismaDefaultLocalPoiCandidates(city: string): PrismaLocalPoiCandidate[] {
  return [
    { sourcePoiId: 'amap_gymkids_001', name: '贵阳星动儿童体能馆', address: `${city}观山湖区长岭北路儿童运动中心`, city, latitude: 26.647, longitude: 106.630, category: '儿童体适能', kind: 'local', searchText: '儿童体能 儿童运动 体适能 儿童运动馆 贵阳' },
    { sourcePoiId: 'amap_parkour_002', name: '跃动少儿跑酷训练中心', address: `${city}南明区花果园购物中心`, city, latitude: 26.563, longitude: 106.695, category: '少儿跑酷', kind: 'local', searchText: '少儿跑酷 儿童运动 体能 体适能 贵阳' },
    { sourcePoiId: 'amap_gymnastics_003', name: '童跃快乐体操馆', address: `${city}云岩区北京路校区`, city, latitude: 26.597, longitude: 106.713, category: '快乐体操', kind: 'local', searchText: '快乐体操 少儿体操 儿童运动 儿童体能 贵阳' },
    { sourcePoiId: 'amap_basketball_004', name: '小飞侠少儿篮球成长中心', address: `${city}花溪区溪北路体育公园`, city, latitude: 26.414, longitude: 106.670, category: '篮球培训', kind: 'local', searchText: '篮球培训 少儿篮球 儿童运动 体能训练 贵阳' },
    { sourcePoiId: 'amap_national_005', name: '万国少儿体适能贵阳中心', address: `${city}观山湖区会展城商圈`, city, latitude: 26.651, longitude: 106.642, category: '全国连锁儿童体适能', kind: 'national', searchText: '儿童体适能 全国连锁 儿童运动 体能 贵阳' },
    { sourcePoiId: 'amap_art_006', name: '童画艺术成长中心', address: `${city}云岩区未来方舟`, city, latitude: 26.618, longitude: 106.751, category: '艺术培训', kind: 'local', searchText: '艺术培训 儿童成长 贵阳' }
  ];
}

async function fetchPrismaProviderPoiCandidates(sourceProvider: CompetitorCandidateSourceProvider, city: string, keywords: string[]): Promise<{
  providerState: Pick<CompetitorDiscoveryRun, 'providerStatus' | 'providerMessage'>;
  pois?: PrismaLocalPoiCandidate[];
}> {
  if (sourceProvider !== 'amap') {
    return { providerState: resolvePrismaMapProviderState(sourceProvider) };
  }

  const apiKey = process.env.GEO_AMAP_API_KEY || process.env.AMAP_API_KEY;
  if (!apiKey || process.env.GEO_AMAP_POI_DISABLED === 'true' || process.env.GEO_AMAP_POI_RATE_LIMITED === 'true') {
    return { providerState: resolvePrismaMapProviderState(sourceProvider) };
  }

  try {
    const pois = await fetchPrismaAmapTextPois(apiKey, city, keywords);
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

async function fetchPrismaAmapTextPois(apiKey: string, city: string, keywords: string[]): Promise<PrismaLocalPoiCandidate[]> {
  const searchKeywords = keywords.length > 0 ? keywords.slice(0, 5) : ['儿童体能', '儿童运动', '少儿跑酷'];
  const results: PrismaLocalPoiCandidate[] = [];
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
    const payload = await response.json() as { status?: string; info?: string; pois?: unknown[] };
    if (payload.status !== '1') {
      throw new Error('amap_poi_status_error');
    }
    results.push(...parsePrismaAmapPois(payload.pois, city, keyword));
  }
  return dedupePrismaLocalPoiCandidates(results).slice(0, 30);
}

function parsePrismaAmapPois(pois: unknown[] | undefined, fallbackCity: string, keyword: string): PrismaLocalPoiCandidate[] {
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
    if (!isPrismaRelevantChildrenSportsPoi(name, category, address)) {
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
      kind: isPrismaNationalBenchmarkPoi(name, category) ? 'national' : 'local',
      searchText
    } satisfies PrismaLocalPoiCandidate;
  }).filter((item): item is PrismaLocalPoiCandidate => Boolean(item));
}

function isPrismaNationalBenchmarkPoi(name: string, category: string): boolean {
  return /万国|乐刻|全国|连锁|金宝贝|美吉姆|东方启明星/.test(`${name} ${category}`);
}

function isPrismaRelevantChildrenSportsPoi(name: string, category: string, address: string): boolean {
  const searchable = `${name} ${category} ${address}`;
  const hasSportsTerm = /体能|体适能|跑酷|运动|体育|体操|篮球|足球|武术|轮滑|击剑|游泳/.test(searchable);
  const hasChildTrainingTerm = /儿童|少儿/.test(searchable) && /培训机构|运动场馆|体育休闲/.test(category);
  const positive = hasSportsTerm || hasChildTrainingTerm;
  const negative = /言语|社交|康复|医疗|诊所|医院|自行车|电动车|专卖店|购物|器材|成人健身/.test(searchable);
  return positive && !negative;
}

function isPrismaOwnBrandPoi(brand: BrandDetail, poiName: string): boolean {
  const names = [brand.name, ...brand.aliases].map((name) => name.trim()).filter(Boolean);
  return names.some((name) => poiName.includes(name));
}

function dedupePrismaLocalPoiCandidates(pois: PrismaLocalPoiCandidate[]): PrismaLocalPoiCandidate[] {
  const seen = new Set<string>();
  return pois.filter((poi) => {
    const key = [poi.sourcePoiId, poi.name, poi.address, poi.latitude.toFixed(4), poi.longitude.toFixed(4)].join('|');
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

type PrismaCampusCoordinate = { name: string; latitude: number; longitude: number };

function resolvePrismaBrandCampusCoordinates(brand: BrandDetail, profile: BrandProfile | undefined, city: string): PrismaCampusCoordinate[] {
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

  const center = getPrismaCityCenterCoordinate(city || brand.targetCities[0]);
  return center ? [{ name: `${city || brand.targetCities[0]}城市中心`, ...center }] : [];
}

function getPrismaCityCenterCoordinate(city?: string): Omit<PrismaCampusCoordinate, 'name'> | null {
  if (!city) return null;
  if (city.includes('深圳')) return { latitude: 22.543, longitude: 114.057 };
  if (city.includes('广州')) return { latitude: 23.129, longitude: 113.264 };
  if (city.includes('贵阳')) return { latitude: 26.647, longitude: 106.630 };
  return null;
}

function calculatePrismaNearestCampusDistanceKm(poi: { latitude?: number; longitude?: number }, campuses: PrismaCampusCoordinate[]): number | undefined {
  if (typeof poi.latitude !== 'number' || typeof poi.longitude !== 'number' || campuses.length === 0) {
    return undefined;
  }
  const nearest = Math.min(...campuses.map((campus) => haversinePrismaDistanceKm(poi.latitude as number, poi.longitude as number, campus.latitude, campus.longitude)));
  return Math.round(nearest * 10) / 10;
}

function haversinePrismaDistanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const radiusKm = 6371;
  const dLat = prismaDegreesToRadians(lat2 - lat1);
  const dLon = prismaDegreesToRadians(lon2 - lon1);
  const a = Math.sin(dLat / 2) ** 2 + Math.cos(prismaDegreesToRadians(lat1)) * Math.cos(prismaDegreesToRadians(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * radiusKm * Math.asin(Math.sqrt(a));
}

function prismaDegreesToRadians(value: number): number {
  return value * Math.PI / 180;
}

function buildPrismaCompetitorLinkedQuestions(brand: BrandDetail, candidate: CompetitorCandidate, label: CompetitorConfirmationLabel): Array<{ question: string; purposes: TestQuestionPurpose[]; priority: OptimizationUnitPriority; estimatedValue: string }> {
  const city = candidate.city || brand.targetCities[0] || '本地';
  if (label === 'national_benchmark') {
    return [{ question: `${brand.name}和${candidate.name}在儿童运动成长课上有什么区别？`, purposes: ['brand_mentioned', 'value_prop_accuracy', 'competitor_presence'], priority: 'medium', estimatedValue: '验证 AI 是否能把全国标杆品牌作为对标对象，同时说清本品牌差异。' }];
  }

  return [
    { question: `${city}儿童运动机构推荐，${brand.name}和${candidate.name}怎么选？`, purposes: ['brand_mentioned', 'rank_first', 'competitor_presence', 'value_prop_accuracy'], priority: 'high', estimatedValue: '验证本地推荐场景下品牌是否能排在重点竞品前面。' },
    { question: `${candidate.name}附近还有哪些适合孩子的运动成长课？`, purposes: ['brand_mentioned', 'competitor_presence', 'value_prop_accuracy'], priority: candidate.isCampusFocus ? 'high' : 'medium', estimatedValue: '验证校区周边到店选择场景中品牌是否会被自然提及。' }
  ];
}

const optimizationTaskStatuses: OptimizationTaskStatus[] = ['todo', 'doing', 'review', 'retest', 'done', 'reopened'];

function dateToIso(value: Date | null | undefined): string | undefined {
  return value ? value.toISOString() : undefined;
}

function toContentAsset(asset: PrismaContentAsset): ContentAsset {
  return {
    id: asset.id,
    brandId: asset.brandId,
    title: asset.title,
    type: asset.type,
    platform: asset.platform,
    url: asset.url,
    targetKeywords: toStringArray(asset.targetKeywords),
    reuseOfAssetId: asset.reuseOfAssetId ?? undefined,
    brandAdaptation: asset.brandAdaptation ?? undefined,
    status: asset.status as ContentAssetStatus,
    publishedAt: dateToIso(asset.publishedAt),
    createdAt: asset.createdAt.toISOString(),
    updatedAt: asset.updatedAt.toISOString()
  };
}

function toContentStrategy(strategy: PrismaContentStrategy): ContentStrategy {
  return {
    id: strategy.id,
    brandId: strategy.brandId,
    optimizationUnitId: strategy.optimizationUnitId,
    intentId: strategy.intentId,
    type: strategy.type as ContentStrategyType,
    priority: strategy.priority as ContentStrategyPriority,
    suggestedTitle: strategy.suggestedTitle,
    targetPlatform: strategy.targetPlatform,
    targetKeywords: toStringArray(strategy.targetKeywords),
    relatedPromptIds: toStringArray(strategy.relatedPromptIds),
    status: strategy.status as ContentStrategyStatus,
    createdAt: strategy.createdAt.toISOString(),
    updatedAt: strategy.updatedAt.toISOString()
  };
}

function toContentGenerationTask(task: PrismaContentGenerationTask): ContentGenerationTask {
  return {
    id: task.id,
    brandId: task.brandId,
    strategyId: task.strategyId,
    growthOptimizationPlanId: task.growthOptimizationPlanId ?? undefined,
    targetPlatform: task.targetPlatform,
    contentType: task.contentType,
    contentTopic: task.contentTopic ?? undefined,
    targetKeywords: toStringArray(task.targetKeywords),
    referenceSources: toStringArray(task.referenceSources),
    retestAt: dateToIso(task.retestAt),
    status: task.status as ContentGenerationTask['status'],
    steps: toContentGenerationSteps(task.steps),
    draftRef: task.draftRef ?? undefined,
    errorMessage: task.errorMessage ?? undefined,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

function toGrowthOptimizationReasons(value: unknown): GrowthOptimizationReason[] {
  return Array.isArray(value)
    ? value.map((item) => ({
        type: item?.type,
        title: typeof item?.title === 'string' ? item.title : '',
        evidence: typeof item?.evidence === 'string' ? item.evidence : '',
        relatedRunIds: toStringArray(item?.relatedRunIds),
        relatedPromptIds: toStringArray(item?.relatedPromptIds)
      })).filter((item): item is GrowthOptimizationReason => Boolean(item.type && item.title && item.evidence))
    : [];
}

function toGrowthContentRecommendations(value: unknown): GrowthOptimizationContentRecommendation[] {
  return Array.isArray(value)
    ? value.map((item) => {
        const recommendation: GrowthOptimizationContentRecommendation = {
          contentType: item?.contentType,
          title: typeof item?.title === 'string' ? item.title : '',
          targetPlatform: typeof item?.targetPlatform === 'string' ? item.targetPlatform : '',
          targetKeywords: toStringArray(item?.targetKeywords),
          reason: typeof item?.reason === 'string' ? item.reason : '',
          sourceStrategyId: typeof item?.sourceStrategyId === 'string' ? item.sourceStrategyId : undefined,
          generationTaskId: typeof item?.generationTaskId === 'string' ? item.generationTaskId : undefined
        };

        return recommendation;
      }).filter((item) => Boolean(item.contentType && item.title && item.targetPlatform && item.reason))
    : [];
}

function toContentVersion(version: PrismaContentVersion): ContentVersion {
  return {
    id: version.id,
    brandId: version.brandId,
    generationTaskId: version.generationTaskId,
    title: version.title,
    body: version.body,
    version: version.version,
    exportFormat: 'markdown',
    createdAt: version.createdAt.toISOString(),
    updatedAt: version.updatedAt.toISOString()
  };
}

function toContentExportRecord(record: PrismaContentExportRecord): ContentExportRecord {
  return {
    id: record.id,
    brandId: record.brandId,
    generationTaskId: record.generationTaskId,
    versionId: record.versionId,
    exportFormat: 'markdown',
    fileName: record.fileName,
    content: record.content,
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString()
  };
}

function toPublishingAccount(account: PrismaPublishingAccount): PublishingAccount {
  return {
    id: account.id,
    brandId: account.brandId,
    platform: account.platform,
    accountName: account.accountName,
    loginMode: account.loginMode as PublishingLoginMode,
    authStatus: account.authStatus as PublishingAuthStatus,
    lastAuthorizedAt: dateToIso(account.lastAuthorizedAt),
    errorMessage: account.errorMessage ?? undefined,
    createdAt: account.createdAt.toISOString(),
    updatedAt: account.updatedAt.toISOString()
  };
}

function toPublishingRecord(record: PrismaPublishingRecord): PublishingRecord {
  return {
    id: record.id,
    brandId: record.brandId,
    contentAssetId: record.contentAssetId,
    accountId: record.accountId ?? undefined,
    generationTaskId: record.generationTaskId ?? undefined,
    versionId: record.versionId ?? undefined,
    title: record.title,
    body: record.body,
    platform: record.platform,
    accountName: record.accountName ?? undefined,
    status: record.status as PublishingRecordStatus,
    publishedUrl: record.publishedUrl ?? undefined,
    errorMessage: record.errorMessage ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
  };
}

function toOptimizationTask(task: PrismaOptimizationTask): OptimizationTask {
  return {
    id: task.id,
    brandId: task.brandId,
    title: task.title,
    type: task.type as OptimizationTaskType,
    status: task.status as OptimizationTaskStatus,
    ownerId: task.ownerId ?? undefined,
    optimizationUnitId: task.optimizationUnitId ?? undefined,
    relatedPromptId: task.relatedPromptId ?? undefined,
    relatedPlatformCode: task.relatedPlatformCode ?? undefined,
    strategyId: task.strategyId ?? undefined,
    growthOptimizationPlanId: task.growthOptimizationPlanId ?? undefined,
    sourceRunId: task.sourceRunId ?? undefined,
    retestRunId: task.retestRunId ?? undefined,
    dueDate: dateToIso(task.dueDate),
    priority: task.priority as ContentStrategyPriority | undefined,
    processingNote: task.processingNote ?? undefined,
    contentLink: task.contentLink ?? undefined,
    reviewStatus: task.reviewStatus as OptimizationTask['reviewStatus'],
    retestPlanAt: dateToIso(task.retestPlanAt),
    retestRecords: toRetestRecords(task.retestRecords),
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString()
  };
}

function toReportRecord(report: PrismaReport): ReportRecord {
  return {
    id: report.id,
    brandId: report.brandId,
    type: report.type as ReportType,
    title: report.title,
    periodStart: report.periodStart.toISOString().slice(0, 10),
    periodEnd: report.periodEnd.toISOString().slice(0, 10),
    status: report.status as ReportStatus,
    content: report.content,
    dataGaps: toReportDataGaps(report.dataGaps),
    createdBy: report.createdBy,
    createdAt: report.createdAt.toISOString(),
    snapshot: report.snapshot as ReportRecord['snapshot']
  };
}

function toAdvisorRecord(record: PrismaAdvisorRecord, reports: AdvisorRecord['relatedReport'][] = []): AdvisorRecord {
  const relatedReport = record.relatedReportId ? reports.find((report) => report?.id === record.relatedReportId) : undefined;

  return {
    id: record.id,
    brandId: record.brandId,
    type: record.type as AdvisorRecordType,
    title: record.title,
    content: record.content,
    relatedReportId: record.relatedReportId ?? undefined,
    relatedReport,
    followUpItems: toAdvisorFollowUps(record.followUpItems),
    createdBy: record.createdBy,
    createdAt: record.createdAt.toISOString()
  };
}

function toAdvisorRelatedReport(report: PrismaReport): NonNullable<AdvisorRecord['relatedReport']> {
  return {
    id: report.id,
    title: report.title,
    type: report.type as ReportType,
    periodStart: report.periodStart.toISOString().slice(0, 10),
    periodEnd: report.periodEnd.toISOString().slice(0, 10)
  };
}

function toInnerTestFeedback(record: PrismaInnerTestFeedback): InnerTestFeedback {
  return {
    id: record.id,
    brandId: record.brandId,
    page: record.page,
    module: record.module,
    type: record.type as InnerTestFeedback['type'],
    description: record.description,
    status: record.status as InnerTestFeedbackStatus,
    reporterId: record.reporterId,
    resolutionNote: record.resolutionNote ?? undefined,
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString()
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

function normalizeContentStrategyInput(input: ContentStrategyInput): Required<ContentStrategyInput> {
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

function normalizePublishingAccountInput(input: PublishingAccountInput): PublishingAccountInput {
  return {
    platform: input.platform.trim(),
    accountName: input.accountName.trim(),
    loginMode: input.loginMode,
    authStatus: input.authStatus,
    errorMessage: input.errorMessage?.trim()
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
    status: input.status,
    ownerId: input.ownerId?.trim(),
    dueDate: input.dueDate?.trim(),
    processingNote: input.processingNote?.trim(),
    contentLink: input.contentLink?.trim(),
    reviewStatus: input.reviewStatus
  };
}

function normalizeAdvisorRecordInput(input: AdvisorRecordInput): AdvisorRecordInput {
  const advisorRecordTypes: AdvisorRecordType[] = ['diagnosis', 'service_plan', 'review', 'delivery', 'service', 'training', 'rule_update', 'note'];
  const followUpStatuses: AdvisorFollowUpItem['status'][] = ['todo', 'doing', 'done'];

  return {
    type: advisorRecordTypes.includes(input.type) ? input.type : 'service',
    title: input.title.trim(),
    content: input.content.trim(),
    relatedReportId: input.relatedReportId?.trim(),
    followUpItems: (input.followUpItems ?? []).map((item, index) => ({
      id: item.id?.trim() || `follow_up_${Date.now()}_${index}`,
      title: item.title.trim(),
      owner: item.owner?.trim(),
      dueDate: item.dueDate?.trim(),
      status: followUpStatuses.includes(item.status) ? item.status : 'todo'
    })).filter((item) => item.title)
  };
}

const innerTestFeedbackTypes: InnerTestFeedback['type'][] = ['usability', 'bug', 'copy', 'data', 'workflow', 'configuration', 'other'];
const innerTestFeedbackStatuses: InnerTestFeedbackStatus[] = ['open', 'triaged', 'in_progress', 'resolved'];

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

function buildPrismaContentStrategySuggestions(
  units: PrismaOptimizationUnit[],
  intents: PrismaUserIntent[],
  prompts: PrismaBrandPrompt[],
  existingStrategies: ContentStrategy[]
): ContentCenterDashboard['suggestions'] {
  const existingKeys = new Set(existingStrategies.map((strategy) => `${strategy.optimizationUnitId}:${strategy.intentId}:${strategy.targetPlatform}`));

  return intents.flatMap((intent) => {
    const unit = units.find((item) => item.id === intent.optimizationUnitId);
    const prompt = prompts.find((item) => item.intentId === intent.id);
    const platform = prompt ? toStringArray(prompt.platformCodes)[0] ?? 'manual_input' : 'manual_input';
    const key = `${intent.optimizationUnitId}:${intent.id}:${platform}`;
    if (!unit || existingKeys.has(key)) {
      return [];
    }

    return [{
      type: 'gap' as ContentStrategyType,
      priority: unit.priority as ContentStrategyPriority,
      suggestedTitle: `${unit.name} - ${intent.text}`,
      targetPlatform: platform,
      targetKeywords: mergeStringLists(toStringArray(unit.targetKeywords), prompt ? toStringArray(prompt.targetKeywords) : []),
      optimizationUnitId: unit.id,
      intentId: intent.id,
      relatedPromptIds: prompt ? [prompt.id] : [],
      reason: '基于启用的优化单元和用户意图生成内容补位建议'
    }];
  });
}

function buildContentCoverage(assets: ContentAsset[], units: PrismaOptimizationUnit[]) {
  const published = assets.filter((asset) => asset.status === 'published');
  const expectedKeywords = mergeStringLists(...units.map((unit) => toStringArray(unit.targetKeywords)));
  const coveredKeywords = mergeStringLists(...assets.map((asset) => asset.targetKeywords));
  const uncoveredKeywords = expectedKeywords.filter((keyword) => !coveredKeywords.includes(keyword));

  return {
    keywordCoverageRate: expectedKeywords.length === 0 ? 0 : Math.round(((expectedKeywords.length - uncoveredKeywords.length) / expectedKeywords.length) * 100),
    uncoveredKeywords,
    publishedAssetCount: published.length,
    reusableAssetCount: assets.filter((asset) => asset.reuseOfAssetId || asset.brandAdaptation).length
  };
}

function buildCompletedGenerationSteps(timestamp: string): ContentGenerationStep[] {
  return [
    ['strategy_parse', '读取内容建议'],
    ['knowledge_read', '读取品牌知识'],
    ['outline_generation', '生成内容提纲'],
    ['body_generation', '生成正文草稿'],
    ['geo_rule_check', '检查 AI 推荐表达']
  ].map(([key, label]) => ({ key: key as ContentGenerationStep['key'], label, status: 'completed', completedAt: timestamp }));
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

function toContentGenerationSteps(value: unknown): ContentGenerationStep[] {
  return Array.isArray(value)
    ? value.filter((item): item is ContentGenerationStep => typeof item?.key === 'string' && typeof item?.label === 'string' && typeof item?.status === 'string')
    : [];
}

function buildGeneratedDraft(brandName: string, strategy: ContentStrategy, targetPlatform: string, contentType: string) {
  const title = strategy.suggestedTitle;
  const keywords = strategy.targetKeywords.join('、') || '核心场景';

  if ([targetPlatform, contentType].some((value) => /xiaohongshu|小红书|note|post/.test(value))) {
    return {
      title: `${title}，这份清单给家长参考`,
      body: [
        `${title}`,
        '',
        `如果你正在做选择，建议先看三件事：服务对象是否清楚、课程体系是否稳定、品牌依据是否可验证。`,
        '',
        `${brandName} 这类内容适合围绕“${keywords}”展开，正文要直接回答家长问题，并把品牌卖点说成能理解、能核实的表达。`,
        '',
        '可以这样写：',
        `1. 先说明 ${brandName} 适合哪些家庭和孩子年龄段。`,
        '2. 再说明课程体系、服务流程和阶段反馈。',
        '3. 最后列出校区、案例、评价、资质等可验证依据。',
        '',
        '家长选择建议：先看孩子年龄和运动基础，再看课程规划、体测反馈、上课距离和孩子是否愿意坚持。',
        '',
        `#${keywords.replace(/[、\s]+/g, ' #')} #${brandName}`
      ].join('\n')
    };
  }

  return {
    title,
    body: [
      `# ${title}`,
      '',
      `这篇内容围绕 ${keywords} 展开，目标是让用户快速看懂 ${brandName} 适合谁、解决什么问题、有哪些可信依据。`,
      '',
      '建议正文结构：',
      `1. 直接回答用户最关心的问题。`,
      `2. 说明 ${brandName} 的核心服务、适用人群和使用场景。`,
      '3. 补充可验证的案例、数据、评价或资质。',
      '4. 引导用户查看官网、案例或咨询入口。',
      '',
      `关键词：${keywords}`
    ].join('\n')
  };
}

function buildPublishingEntryPayload(task: ContentGenerationTask, version: ContentVersion): PublishingEntryPayload {
  return {
    brandId: task.brandId,
    strategyId: task.strategyId,
    generationTaskId: task.id,
    versionId: version.id,
    title: version.title,
    body: version.body,
    targetPlatform: task.targetPlatform,
    contentType: task.contentType,
    targetKeywords: task.targetKeywords
  };
}

function inferContentType(platform: string): string {
  return platform.includes('wechat') || platform.includes('微信') ? 'article' : 'post';
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
  return value.trim().toLowerCase().replace(/[^a-z0-9\u4e00-\u9fa5]+/g, '-').replace(/^-+|-+$/g, '') || 'content';
}

function inferPublishingLoginMode(platform: string): PublishingLoginMode {
  return platform.includes('wechat') || platform.includes('微信') ? 'manual' : 'oauth';
}

function normalizePublishingAuthStatus(status: PublishingAuthStatus): PublishingAuthStatus {
  return ['connected', 'expired', 'error', 'disconnected'].includes(status) ? status : 'disconnected';
}

function normalizePublishingRecordStatus(status: PublishingRecordStatus): PublishingRecordStatus {
  return ['draft', 'pending', 'published', 'failed'].includes(status) ? status : 'draft';
}

function buildPublishingPlatforms(accounts: PublishingAccount[]) {
  const platforms = ['wechat_official', 'xiaohongshu', 'zhihu', 'website'];

  return platforms.map((platform) => {
    const platformAccounts = accounts.filter((account) => account.platform === platform);
    return {
      platform,
      name: platform,
      loginMode: inferPublishingLoginMode(platform),
      accountCount: platformAccounts.length,
      hasAuthError: platformAccounts.some((account) => account.authStatus === 'error' || account.authStatus === 'expired')
    };
  });
}

function toRetestRecords(value: unknown): RetestRecord[] {
  return Array.isArray(value)
    ? value.filter((item): item is RetestRecord => typeof item?.id === 'string' && typeof item?.taskId === 'string')
    : [];
}

function toReportDataGaps(value: unknown): ReportDataGap[] {
  return Array.isArray(value)
    ? value.filter((item): item is ReportDataGap => typeof item?.section === 'string' && typeof item?.reason === 'string')
    : [];
}

function toAdvisorFollowUps(value: unknown): AdvisorFollowUpItem[] {
  return Array.isArray(value)
    ? value.filter((item): item is AdvisorFollowUpItem => typeof item?.id === 'string' && typeof item?.title === 'string' && typeof item?.status === 'string')
    : [];
}

function renderPromptText(templateText: string, brand: BrandDetail, intent: PrismaUserIntent, unit: PrismaOptimizationUnit | null): string {
  return templateText
    .replaceAll('{brandName}', brand.name)
    .replaceAll('{brandAlias}', brand.aliases[0] ?? brand.name)
    .replaceAll('{city}', brand.targetCities[0] ?? '')
    .replaceAll('{industry}', brand.industry)
    .replaceAll('{businessScope}', brand.businessScope)
    .replaceAll('{targetAudience}', brand.targetAudience)
    .replaceAll('{intent}', intent.text)
    .replaceAll('{unitName}', unit?.name ?? '')
    .replaceAll('{{brandName}}', brand.name)
    .replaceAll('{{industry}}', brand.industry)
    .replaceAll('{{businessScope}}', brand.businessScope)
    .replaceAll('{{targetAudience}}', brand.targetAudience)
    .replaceAll('{{intent}}', intent.text)
    .replaceAll('{{unitName}}', unit?.name ?? '');
}

function ensureBrandMention(text: string, brand: BrandDetail): string {
  return text.includes(brand.name) ? text : `${text} 请重点评估${brand.name}。`;
}

const defaultPlatformConfigs: Array<Omit<PlatformConfigInput, 'credentialRef'>> = [
  { platformCode: 'doubao', name: '豆包', mode: 'semi_auto', endpointUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', modelName: 'doubao-seed-1-6', rateLimitPerMinute: 30, enabled: true },
  { platformCode: 'kimi', name: 'Kimi', mode: 'semi_auto', endpointUrl: 'https://api.moonshot.cn/v1/chat/completions', modelName: 'moonshot-v1-8k', rateLimitPerMinute: 30, enabled: true },
  { platformCode: 'deepseek', name: 'DeepSeek', mode: 'semi_auto', endpointUrl: 'https://api.deepseek.com/chat/completions', modelName: 'deepseek-chat', rateLimitPerMinute: 30, enabled: true },
  { platformCode: 'qianwen', name: '通义千问', mode: 'semi_auto', endpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', modelName: 'qwen-plus', rateLimitPerMinute: 30, enabled: true },
  { platformCode: 'stepfun', name: '阶跃星辰', mode: 'api', endpointUrl: 'https://api.stepfun.com/v1/chat/completions', modelName: 'step-3.7-flash', rateLimitPerMinute: 30, enabled: true },
  { platformCode: 'manual_input', name: '人工录入', mode: 'manual', modelName: 'manual', rateLimitPerMinute: 0, enabled: true },
  { platformCode: 'mock_ai', name: '示例回答', mode: 'mock', modelName: 'mock-v1', rateLimitPerMinute: 60, enabled: true }
];

function getDefaultCredentialRef(config: Pick<PlatformConfigInput, 'platformCode'>): string | undefined {
  if (config.platformCode === 'stepfun' && process.env.STEPFUN_API_KEY) {
    return 'STEPFUN_API_KEY';
  }

  return undefined;
}

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

function buildBrowserAuthorizedScope(brandId: BrandId, platformCode: string, testPlanId?: string): BrowserConnectionSession['authorizedScope'] {
  return {
    brandId,
    testPlanIds: testPlanId ? [testPlanId] : [],
    platformCodes: [platformCode]
  };
}

function toBrowserConnectionSession(session: PrismaBrowserConnectionSession): BrowserConnectionSession {
  return {
    id: session.id,
    brandId: session.brandId,
    platformCode: session.platformCode,
    status: session.status as BrowserConnectionSession['status'],
    loginDetected: session.loginDetected,
    authorizedScope: normalizeBrowserAuthorizedScope(session.authorizedScope, session.brandId, session.platformCode),
    lastOperation: session.lastOperation ?? undefined,
    lastIssueType: session.lastIssueType ? session.lastIssueType as BrowserConnectionSession['lastIssueType'] : undefined,
    lastMessage: session.lastMessage ?? undefined,
    lastAvailableAt: session.lastAvailableAt?.toISOString(),
    createdAt: session.createdAt.toISOString(),
    updatedAt: session.updatedAt.toISOString()
  };
}

function normalizeBrowserAuthorizedScope(value: unknown, brandId: BrandId, platformCode: string): BrowserConnectionSession['authorizedScope'] {
  if (typeof value === 'object' && value !== null) {
    const scope = value as Partial<BrowserConnectionSession['authorizedScope']>;
    return {
      brandId: typeof scope.brandId === 'string' ? scope.brandId : brandId,
      testPlanIds: Array.isArray(scope.testPlanIds) ? scope.testPlanIds.filter((item): item is string => typeof item === 'string') : [],
      platformCodes: Array.isArray(scope.platformCodes) ? scope.platformCodes.filter((item): item is string => typeof item === 'string') : [platformCode]
    };
  }

  return buildBrowserAuthorizedScope(brandId, platformCode);
}

function toPublicPlatformConfig(config: PrismaPlatformConfig): PlatformConfig {
  const hasCredential = Boolean(config.credentialRef);
  const classification = classifyPlatformConfig(config, hasCredential);

  return {
    id: config.id,
    brandId: config.brandId,
    platformCode: config.platformKey,
    name: config.displayName,
    mode: config.mode as PlatformMode,
    ...classification,
    endpointUrl: config.endpointUrl ?? undefined,
    modelName: config.modelName ?? undefined,
    rateLimitPerMinute: config.rateLimitPerMinute,
    enabled: config.enabled,
    hasCredential,
    credentialRefMasked: hasCredential ? '***' : undefined,
    lastValidation: toPlatformValidationResult(config.lastValidation),
    createdAt: config.createdAt.toISOString(),
    updatedAt: config.updatedAt.toISOString()
  };
}

function classifyPlatformConfig(config: PrismaPlatformConfig, hasCredential: boolean): Pick<PlatformConfig, 'availableMethods' | 'connectionStatus' | 'connectionStatusLabel' | 'nextAction'> {
  const mode = config.mode as PlatformMode;
  const lastValidation = toPlatformValidationResult(config.lastValidation);

  if (!config.enabled) {
    return {
      availableMethods: [],
      connectionStatus: 'needs_configuration',
      connectionStatusLabel: '需要补充信息',
      nextAction: '启用平台后再加入监测计划。'
    };
  }

  if (mode === 'api') {
    const missingApiField = getMissingApiConfigField(config);

    if (missingApiField || lastValidation?.ok === false) {
      return {
        availableMethods: ['api'],
        connectionStatus: 'needs_configuration',
        connectionStatusLabel: '需要补充信息',
        nextAction: lastValidation?.message ?? missingApiField ?? '请检查平台连接信息。'
      };
    }

    return {
      availableMethods: ['api'],
      connectionStatus: 'ready',
      connectionStatusLabel: '可自动监测',
      nextAction: hasCredential ? '可直接加入自动监测计划。' : '补齐平台密钥后可自动监测。'
    };
  }

  if (mode === 'semi_auto') {
    return {
      availableMethods: ['api', 'browser', 'manual'],
      connectionStatus: 'browser_available',
      connectionStatusLabel: '可用浏览器辅助监测',
      nextAction: '已预置平台接口和模型候选；补齐平台密钥可自动监测，也可先用浏览器或手动录入。'
    };
  }

  if (mode === 'manual') {
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

function toRuntimePlatformConfig(config: PrismaPlatformConfig): AIPlatformRuntimeConfig {
  return {
    ...toPublicPlatformConfig(config),
    credentialRef: config.credentialRef ?? undefined
  };
}

function toAIPlatformCallAudit(audit: PrismaAIPlatformCallAudit): AIPlatformCallAudit {
  return {
    id: audit.id,
    brandId: audit.brandId,
    platformCode: audit.platformCode,
    modelName: audit.modelName ?? undefined,
    callType: audit.callType as AIPlatformCallType,
    status: audit.status as AIPlatformCallStatus,
    durationMs: audit.durationMs ?? undefined,
    inputTokenCount: audit.inputTokenCount ?? undefined,
    outputTokenCount: audit.outputTokenCount ?? undefined,
    costEstimate: audit.costEstimate === null ? undefined : typeof audit.costEstimate === 'number' ? audit.costEstimate : audit.costEstimate.toNumber(),
    errorCode: audit.errorCode ?? undefined,
    errorMessage: audit.errorMessage ?? undefined,
    retryable: audit.retryable ?? undefined,
    startedAt: audit.startedAt.toISOString(),
    completedAt: audit.completedAt?.toISOString(),
    createdAt: audit.createdAt.toISOString(),
    updatedAt: audit.updatedAt.toISOString()
  };
}

function toAsyncJob(job: PrismaAsyncJob): AsyncJob {
  return {
    id: job.id,
    brandId: job.brandId,
    jobType: job.jobType as AsyncJobType,
    status: job.status as AsyncJobStatus,
    entityId: job.entityId,
    attemptCount: job.attemptCount,
    maxAttempts: job.maxAttempts,
    nextRunAt: job.nextRunAt?.toISOString(),
    lastErrorCode: job.lastErrorCode ?? undefined,
    lastErrorMessage: job.lastErrorMessage ?? undefined,
    createdAt: job.createdAt.toISOString(),
    updatedAt: job.updatedAt.toISOString()
  };
}

function toLLMTaskRun(run: PrismaLLMTaskRun): LLMTaskRun {
  return {
    id: run.id,
    brandId: run.brandId,
    taskType: run.taskType as LLMTaskType,
    status: run.status as LLMTaskStatus,
    jobId: run.jobId ?? undefined,
    auditId: run.auditId ?? undefined,
    inputSummary: toRecord(run.inputSummary),
    outputSummary: run.outputSummary ? toRecord(run.outputSummary) : undefined,
    errorCode: run.errorCode ?? undefined,
    errorMessage: run.errorMessage ?? undefined,
    createdAt: run.createdAt.toISOString(),
    updatedAt: run.updatedAt.toISOString()
  };
}

function validateStoredPlatformConfig(config: PrismaPlatformConfig): PlatformValidationResult {
  const checkedAt = new Date().toISOString();
  const mode = config.mode as PlatformMode;
  if (mode === 'api') {
    const missingApiField = getMissingApiConfigField(config);

    if (missingApiField) {
      return {
        ok: false,
        mode,
        checkedAt,
        message: missingApiField
      };
    }
  }

  return {
    ok: true,
    mode,
    checkedAt,
    message: getModeValidationMessage(mode)
  };
}

function getMissingApiConfigField(config: Pick<PrismaPlatformConfig, 'endpointUrl' | 'modelName' | 'credentialRef'>): string | null {
  return getMissingApiConfigMessage(config);
}

function defaultRateLimit(mode: PlatformMode): number {
  return mode === 'manual' ? 0 : 60;
}

function toPlatformValidationResult(value: unknown): PlatformValidationResult | undefined {
  if (!value || typeof value !== 'object') {
    return undefined;
  }
  const candidate = value as Partial<PlatformValidationResult>;
  return typeof candidate.ok === 'boolean' && typeof candidate.mode === 'string' && typeof candidate.checkedAt === 'string' && typeof candidate.message === 'string'
    ? {
        ok: candidate.ok,
        mode: candidate.mode as PlatformMode,
        checkedAt: candidate.checkedAt,
        message: candidate.message
      }
    : undefined;
}

function toMonitoringRun(run: PrismaMonitoringRun): MonitoringRunDetail {
  return {
    id: run.id,
    brandId: run.brandId,
    optimizationUnitId: run.optimizationUnitId,
    intentId: run.intentId,
    promptId: run.promptId,
    platformCode: run.platformCode,
    status: run.status as MonitoringRunStatus,
    startedAt: run.startedAt?.toISOString(),
    completedAt: run.completedAt?.toISOString(),
    errorMessage: run.errorMessage ?? undefined,
    retryStatus: run.retryStatus as MonitoringRunDetail['retryStatus'],
    createdAt: run.createdAt.toISOString(),
    promptText: ''
  };
}

function toAIResponse(response: PrismaAIResponse): AIResponse {
  return {
    id: response.id,
    runId: response.runId,
    brandId: response.brandId,
    rawText: response.rawText,
    citations: toStringArray(response.citations),
    modelName: response.modelName ?? undefined,
    respondedAt: response.respondedAt.toISOString(),
    parseStatus: response.parseStatus as AIResponseParseStatus,
    createdAt: response.createdAt.toISOString()
  };
}

function toAnalysisResult(result: PrismaAnalysisResult): AnalysisResult {
  return {
    id: result.id,
    responseId: result.responseId,
    runId: result.runId,
    brandId: result.brandId,
    brandMentioned: result.brandMentioned,
    brandRank: result.brandRank,
    sentiment: result.sentiment as AnalysisSentiment,
    accuracyScore: result.accuracyScore,
    citationScore: result.citationScore,
    platformEvaluation: result.platformEvaluation,
    recommendationReason: result.recommendationReason,
    rankingReason: result.rankingReason,
    expressionCompleteness: result.expressionCompleteness,
    expressionDeviation: result.expressionDeviation,
    competitorMentions: toCompetitorMentions(result.competitorMentions),
    reviewRequired: result.reviewRequired,
    updatedAt: result.updatedAt.toISOString()
  };
}

function buildGrowthOptimizationPlanDraft(
  brand: BrandDetail,
  samples: GrowthAnalysisSample[],
  sourceTestPlanId?: string
): GrowthOptimizationPlanInput {
  const sourceRunIds = samples.map((sample) => sample.runId);
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

function buildGrowthOptimizationReasons(samples: GrowthAnalysisSample[]): GrowthOptimizationReason[] {
  const reasons: GrowthOptimizationReason[] = [];
  const mentionedRate = calculateRate(samples, (sample) => sample.analysis.brandMentioned);
  const topOneRate = calculateRate(samples, (sample) => sample.analysis.brandRank === 1);
  const accurateRate = calculateRate(samples, (sample) => sample.analysis.accuracyScore >= 80);
  const suppressedSamples = samples.filter((sample) => sample.analysis.competitorMentions.some((mention) => isSuppressedByCompetitor(sample.analysis, mention.name)));
  const riskSamples = samples.filter((sample) => sample.analysis.reviewRequired || isBlockedExpressionDeviation(sample.analysis.expressionDeviation));
  const citationGapSamples = samples.filter((sample) => sample.analysis.citationScore === 0);
  const missingSignals = mergeStringLists(...samples.map((sample) => getMissingProfileSignals(sample.responseText, sample.profile))).slice(0, 6);

  if (mentionedRate < 80) {
    reasons.push(createGrowthReason('brand_not_mentioned', '推荐率不足', `品牌提及率 ${mentionedRate}%，需要补充品牌基础内容和高频问法覆盖。`, samples.filter((sample) => !sample.analysis.brandMentioned)));
  }
  if (topOneRate < 60) {
    reasons.push(createGrowthReason('ranking_low', '排名靠后', `品牌第一推荐率 ${topOneRate}%，需要强化本地化证据、权威背书和适用场景表达。`, samples.filter((sample) => sample.analysis.brandRank !== 1)));
  }
  if (accurateRate < 80 || missingSignals.length > 0) {
    reasons.push(createGrowthReason('value_prop_missing', '卖点覆盖不足', `准确表达率 ${accurateRate}%，缺口集中在：${missingSignals.join('、') || '核心卖点表达'}。`, samples.filter((sample) => sample.analysis.accuracyScore < 80)));
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
    reasons.push(createGrowthReason('content_gap', '持续内容补强', '首轮测试表现稳定，建议继续补充可被 AI 引用的内容资产并安排复测。', samples.slice(0, 3)));
  }

  return reasons;
}

function createGrowthReason(type: GrowthOptimizationReason['type'], title: string, evidence: string, samples: GrowthAnalysisSample[]): GrowthOptimizationReason {
  return {
    type,
    title,
    evidence,
    relatedRunIds: mergeStringLists(samples.map((sample) => sample.runId)),
    relatedPromptIds: mergeStringLists(samples.map((sample) => sample.promptId))
  };
}

function buildGrowthContentRecommendations(
  brand: BrandDetail,
  reasons: GrowthOptimizationReason[],
  samples: GrowthAnalysisSample[]
): GrowthOptimizationContentRecommendation[] {
  const keywords = mergeStringLists(...samples.map((sample) => sample.targetKeywords)).slice(0, 6);
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

function buildGrowthOptimizationSummary(samples: GrowthAnalysisSample[], reasons: GrowthOptimizationReason[]): string {
  if (samples.length === 0) {
    return '暂无测试样本，建议先完成首轮测试后生成优化计划。';
  }

  const mentionedRate = calculateRate(samples, (sample) => sample.analysis.brandMentioned);
  const topOneRate = calculateRate(samples, (sample) => sample.analysis.brandRank === 1);
  const accurateRate = calculateRate(samples, (sample) => sample.analysis.accuracyScore >= 80);

  return `首轮测试样本 ${samples.length} 条，推荐率 ${mentionedRate}%，第一推荐率 ${topOneRate}%，准确表达率 ${accurateRate}%。已识别 ${reasons.length} 个优化原因。`;
}

function inferPublishingPlatforms(samples: GrowthAnalysisSample[]): string[] {
  const platforms = mergeStringLists(samples.map((sample) => sample.platformCode).filter((platform) => platform !== 'manual_input'));
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

function calculateRate<T>(items: T[], predicate: (item: T) => boolean): number {
  if (items.length === 0) {
    return 0;
  }

  return Math.round((items.filter(predicate).length / items.length) * 100);
}

function isSuppressedByCompetitor(analysis: AnalysisResult, competitorName: string): boolean {
  if (!competitorName || !analysis.brandRank) {
    return false;
  }

  return analysis.brandRank > 1 && analysis.rankingReason.includes(competitorName);
}

function isBlockedExpressionDeviation(value: string): boolean {
  return ['禁用表达', '高风险', '需要你确认'].some((keyword) => value.includes(keyword));
}

function getMissingProfileSignals(rawText: string, profile: BrandProfile): string[] {
  const signals: Array<[string, string | undefined]> = [
    ['品牌简介', profile.intro],
    ['核心卖点', profile.valueProps.join(' ')],
    ['产品服务', profile.offerings.join(' ')],
    ['目标人群', profile.targetCustomers.join(' ')],
    ['权威背书', profile.proofPoints?.join(' ')],
    ['推荐表达', profile.recommendedExpressions.join(' ')]
  ];

  return signals
    .filter(([, value]) => Boolean(value?.trim()))
    .filter(([, value]) => !rawText.includes(value?.trim().slice(0, 8) ?? ''))
    .map(([label]) => label);
}

function addDays(date: Date, days: number): Date {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
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

function toAnalysisResultUpdateData(input: AnalysisResultInput) {
  return {
    ...(input.brandMentioned !== undefined ? { brandMentioned: input.brandMentioned } : {}),
    ...(input.brandRank !== undefined ? { brandRank: input.brandRank } : {}),
    ...(input.sentiment !== undefined ? { sentiment: input.sentiment } : {}),
    ...(input.accuracyScore !== undefined ? { accuracyScore: input.accuracyScore } : {}),
    ...(input.citationScore !== undefined ? { citationScore: input.citationScore } : {}),
    ...(input.platformEvaluation !== undefined ? { platformEvaluation: input.platformEvaluation } : {}),
    ...(input.recommendationReason !== undefined ? { recommendationReason: input.recommendationReason } : {}),
    ...(input.rankingReason !== undefined ? { rankingReason: input.rankingReason } : {}),
    ...(input.expressionCompleteness !== undefined ? { expressionCompleteness: input.expressionCompleteness } : {}),
    ...(input.expressionDeviation !== undefined ? { expressionDeviation: input.expressionDeviation } : {}),
    ...(input.competitorMentions !== undefined ? { competitorMentions: input.competitorMentions } : {}),
    ...(input.reviewRequired !== undefined ? { reviewRequired: input.reviewRequired } : {})
  };
}

function toMetricSnapshot(snapshot: PrismaMetricSnapshot): GEOMetricSnapshot {
  return {
    id: snapshot.id,
    brandId: snapshot.brandId,
    period: snapshot.period,
    platformCode: snapshot.platformCode ?? undefined,
    optimizationUnitId: snapshot.optimizationUnitId ?? undefined,
    intentId: snapshot.intentId ?? undefined,
    category: snapshot.category as GEOMetricSnapshot['category'],
    mentionScore: snapshot.mentionScore,
    rankingScore: snapshot.rankingScore,
    accuracyScore: snapshot.accuracyScore,
    sentimentScore: snapshot.sentimentScore,
    citationScore: snapshot.citationScore,
    competitorScore: snapshot.competitorScore,
    knowledgeCompletenessScore: snapshot.knowledgeCompletenessScore,
    totalScore: snapshot.totalScore,
    sampleCount: snapshot.sampleCount,
    insufficientSample: snapshot.insufficientSample,
    calculatedAt: snapshot.calculatedAt.toISOString()
  };
}

function createEmptyMetricSnapshot(brandId: BrandId): PrismaMetricSnapshot {
  return {
    id: `metric_empty_${brandId}`,
    brandId,
    period: new Date().toISOString().slice(0, 7),
    platformCode: null,
    optimizationUnitId: null,
    intentId: null,
    category: null,
    mentionScore: 0,
    rankingScore: 0,
    accuracyScore: 0,
    sentimentScore: 0,
    citationScore: 0,
    competitorScore: 0,
    knowledgeCompletenessScore: 0,
    totalScore: 0,
    sampleCount: 0,
    insufficientSample: true,
    calculatedAt: new Date(0)
  };
}

function normalizeSentiment(value: AnalysisSentiment): AnalysisSentiment {
  return ['positive', 'neutral', 'negative', 'unknown'].includes(value) ? value : 'unknown';
}

function clampScore(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
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

function toCompetitorMentions(value: unknown): CompetitorMention[] {
  return Array.isArray(value)
    ? value
        .map((item) => ({
          name: typeof item?.name === 'string' ? item.name : '',
          rank: typeof item?.rank === 'number' ? item.rank : null,
          sentiment: normalizeSentiment(item?.sentiment)
        }))
        .filter((item) => hasText(item.name))
    : [];
}
