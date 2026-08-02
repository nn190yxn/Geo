export type BrandId = string;

export type ApiError = {
  code: string;
  message: string;
  requestId?: string | null;
};

export type ApiResponse<T> =
  | {
      success: true;
      data: T;
      error?: never;
    }
  | {
      success: false;
      data: null;
      error: ApiError;
    };

export type HealthCheck = {
  status: 'ok' | 'degraded';
  service: string;
  repositoryDriver: 'memory' | 'prisma';
  runtimeEnvironment: string;
  dependencies: {
    database: 'ready' | 'not_configured';
    queue: 'in_memory' | 'external_configured';
    aiPlatforms: 'configured' | 'not_configured';
    mapProvider: 'configured' | 'fallback' | 'rate_limited' | 'disabled';
    logging: 'console' | 'external_configured';
  };
  missingConfiguration: string[];
};

export type BrandStatus = 'active' | 'inactive' | 'archived';

export type UserStatus = 'active' | 'inactive' | 'suspended';

export type OrganizationStatus = 'active' | 'suspended';

export type OrganizationMemberStatus = 'active' | 'suspended';

export type RoleScope = 'organization' | 'brand';

export type UserBrandRole = 'owner' | 'admin' | 'operator' | 'analyst' | 'viewer';

export type BrandWorkspaceSummary = {
  brandId: BrandId;
  name: string;
  status: BrandStatus;
  role?: UserBrandRole;
};

export type BrandDetail = BrandWorkspaceSummary & {
  aliases: string[];
  industry: string;
  website?: string;
  targetCities: string[];
  businessScope: string;
  targetAudience: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandMutationInput = {
  name: string;
  aliases?: string[];
  industry: string;
  website?: string;
  targetCities?: string[];
  businessScope: string;
  targetAudience: string;
  status?: BrandStatus;
};

export type BrandWorkspaceSnapshot = {
  brand: BrandDetail;
  relatedCounts: {
    profile: number;
    optimizationUnits: number;
    intents: number;
    prompts: number;
    competitors: number;
    contentAssets: number;
    monitoringRuns: number;
    reports: number;
    advisorRecords: number;
  };
};

export type BrandFaq = {
  question: string;
  answer: string;
};

export type BrandProfile = {
  brandId: BrandId;
  intro: string;
  valueProps: string[];
  offerings: string[];
  proofPoints: string[];
  targetCustomers: string[];
  recommendedExpressions: string[];
  blockedExpressions: string[];
  contentRules: string[];
  competitors: string[];
  faqs: BrandFaq[];
  completenessScore: number;
  missingFields: string[];
  completenessPrompts: BrandProfileCompletenessPrompt[];
  updatedAt: string;
};

export type BrandProfileInput = Omit<BrandProfile, 'brandId' | 'completenessScore' | 'missingFields' | 'completenessPrompts' | 'updatedAt'>;

export type BrandProfileLibrarySectionKey =
  | 'basic-info'
  | 'products'
  | 'audiences'
  | 'brand-knowledge'
  | 'media-assets'
  | 'owned-media'
  | 'competitors';

export type BrandProfileLibrarySection = {
  key: BrandProfileLibrarySectionKey;
  title: string;
  description: string;
  completeness: number;
  missingItems: string[];
  itemCount: number;
};

export type BrandProfileLibrary = {
  brandId: BrandId;
  profile: BrandProfile;
  sections: BrandProfileLibrarySection[];
  knowledgeSources: KnowledgeSource[];
  mediaAssets: BrandMediaAsset[];
  contentAssets: ContentAsset[];
  publishingAccounts: PublishingAccount[];
  competitors: Competitor[];
  updatedAt: string;
};

export type BrandProfileLibraryInput = {
  profile?: BrandProfileInput;
};

export type BrandProfileCompleteness = {
  score: number;
  missingFields: string[];
  prompts: BrandProfileCompletenessPrompt[];
};

export type KnowledgeSourceType = 'file' | 'webpage' | 'wechat_article' | 'external_document';

export type KnowledgeSourceStatus = 'pending' | 'processing' | 'completed' | 'failed';

export type KnowledgeSource = {
  id: string;
  brandId: BrandId;
  name: string;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  fileRef?: string;
  status: KnowledgeSourceStatus;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type KnowledgeSourceInput = {
  name: string;
  sourceType: KnowledgeSourceType;
  sourceUrl?: string;
  fileRef?: string;
  status?: KnowledgeSourceStatus;
};

export type BrandMediaAssetType = 'image' | 'document' | 'webpage' | 'content_asset';

export type BrandMediaAssetReviewStatus = 'pending' | 'approved' | 'rejected' | 'needs_review';

export type BrandMediaAsset = {
  id: string;
  brandId: BrandId;
  title: string;
  assetType: BrandMediaAssetType;
  applicablePlatforms: string[];
  contentUsage: string;
  source: string;
  reviewStatus: BrandMediaAssetReviewStatus;
  relatedContentTaskId?: string;
  sourceUrl?: string;
  fileRef?: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandMediaAssetInput = {
  title?: string;
  assetType?: BrandMediaAssetType;
  applicablePlatforms?: string[];
  contentUsage?: string;
  source?: string;
  reviewStatus?: BrandMediaAssetReviewStatus;
  relatedContentTaskId?: string;
  sourceUrl?: string;
  fileRef?: string;
};

export type SupportedBrandImportFormat = 'markdown' | 'word' | 'pdf';

export type BrandImportDraftStatus = 'pending' | 'processing' | 'ready_for_confirmation' | 'confirmed' | 'failed';

export type BrandImportFieldKey =
  | 'name'
  | 'aliases'
  | 'industry'
  | 'website'
  | 'targetCities'
  | 'businessScope'
  | 'targetAudience'
  | 'intro'
  | 'valueProps'
  | 'offerings'
  | 'proofPoints'
  | 'targetCustomers'
  | 'recommendedExpressions'
  | 'blockedExpressions'
  | 'contentRules'
  | 'competitors'
  | 'faqs';

export type BrandImportFieldConfidence = 'high' | 'medium' | 'low' | 'needs_confirmation';

export type BrandImportField = {
  key: BrandImportFieldKey;
  label: string;
  value: string | string[] | BrandFaq[] | null;
  confidence: BrandImportFieldConfidence;
  sourceExcerpt?: string;
  confirmationRequired: boolean;
};

export type BrandImportDraft = {
  id: string;
  brandId: BrandId;
  sourceId: string;
  fileName: string;
  format: SupportedBrandImportFormat;
  status: BrandImportDraftStatus;
  fields: BrandImportField[];
  confidenceSummary: {
    high: number;
    medium: number;
    low: number;
    needsConfirmation: number;
  };
  missingFields: BrandImportFieldKey[];
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandImportUploadInput = {
  fileName: string;
  format: SupportedBrandImportFormat;
  fileRef: string;
};

export type BrandImportConfirmInput = {
  fields: Array<Pick<BrandImportField, 'key' | 'value'>>;
};

export type BrandImportConfirmationResult = {
  brand: BrandDetail;
  profile: BrandProfile;
  source: KnowledgeSource;
};

export type BrandProfileCompletenessPrompt = {
  field: BrandImportFieldKey;
  label: string;
  impact: string;
  prompt: string;
};

export type BrandImportWorkspace = {
  brandId: BrandId;
  activeDraft?: BrandImportDraft;
  knowledgeSources: KnowledgeSource[];
  completeness: BrandProfileCompleteness;
  prompts: BrandProfileCompletenessPrompt[];
};

export type OptimizationUnitType = 'brand' | 'category' | 'scenario' | 'location' | 'competitor';

export type OptimizationUnitPriority = 'high' | 'medium' | 'low';

export type OptimizationUnit = {
  id: string;
  brandId: BrandId;
  name: string;
  type: OptimizationUnitType;
  targetKeywords: string[];
  priority: OptimizationUnitPriority;
  enabled: boolean;
  relatedCounts: {
    userIntents: number;
    prompts: number;
    contentStrategies: number;
    monitoringRuns: number;
    tasks: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type OptimizationUnitInput = {
  name: string;
  type: OptimizationUnitType;
  targetKeywords?: string[];
  priority: OptimizationUnitPriority;
  enabled?: boolean;
};

export type MonitoringFrequency = 'daily' | 'weekly' | 'monthly' | 'manual';

export type UserIntentCategory =
  | 'brand_awareness'
  | 'category_recommendation'
  | 'pain_solution'
  | 'local_decision'
  | 'competitor_compare'
  | 'price_decision';

export type IntentPlatformMetric = {
  platformCode: string;
  promptText: string;
  recommendationScore: number;
  averageRank: number | null;
  evaluation: string;
  citationRate: number;
  lastCheckedAt?: string;
};

export type UserIntent = {
  id: string;
  brandId: BrandId;
  optimizationUnitId: string;
  category: UserIntentCategory;
  text: string;
  monitoringFrequency: MonitoringFrequency;
  enabled: boolean;
  platformMetrics: IntentPlatformMetric[];
  createdAt: string;
  updatedAt: string;
};

export type UserIntentInput = {
  optimizationUnitId: string;
  category: UserIntentCategory;
  text: string;
  monitoringFrequency: MonitoringFrequency;
  enabled?: boolean;
};

export type PromptTemplate = {
  id: string;
  name: string;
  industry?: string;
  category: UserIntentCategory;
  text: string;
  targetKeywords: string[];
  platformCodes: string[];
  frequency: MonitoringFrequency;
  createdAt: string;
  updatedAt: string;
};

export type PromptTemplateInput = {
  name: string;
  industry?: string;
  category: UserIntentCategory;
  text: string;
  targetKeywords?: string[];
  platformCodes: string[];
  frequency: MonitoringFrequency;
};

export type BrandPrompt = {
  id: string;
  brandId: BrandId;
  optimizationUnitId: string;
  intentId: string;
  templateId?: string;
  text: string;
  category: UserIntentCategory;
  targetKeywords: string[];
  platformCodes: string[];
  monitoringFrequency: MonitoringFrequency;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
};

export type BrandPromptInput = {
  text: string;
  targetKeywords?: string[];
  platformCodes: string[];
  monitoringFrequency: MonitoringFrequency;
  enabled?: boolean;
};

export type PromptBatchGenerateInput = {
  templateId: string;
  intentIds?: string[];
};

export type PlatformMode = 'api' | 'manual' | 'semi_auto' | 'mock';

export type BeginnerFriendlyPlatform = 'doubao' | 'kimi' | 'deepseek' | 'qianwen' | 'stepfun';

export type AIConnectionMethod = 'api' | 'browser' | 'manual';

export type AIConnectionStatus = 'ready' | 'browser_available' | 'manual_available' | 'needs_configuration' | 'needs_confirmation';

export type PlatformConnectionSummary = {
  platformCode: BeginnerFriendlyPlatform | string;
  name: string;
  methods: AIConnectionMethod[];
  status: AIConnectionStatus;
  hasCredential: boolean;
  browserSessionId?: string;
  lastAvailableAt?: string;
  message?: string;
};

export type PlatformConfig = {
  id: string;
  brandId: BrandId;
  platformCode: string;
  name: string;
  mode: PlatformMode;
  availableMethods: AIConnectionMethod[];
  connectionStatus: AIConnectionStatus;
  connectionStatusLabel: string;
  nextAction: string;
  endpointUrl?: string;
  modelName?: string;
  rateLimitPerMinute: number;
  enabled: boolean;
  hasCredential: boolean;
  credentialRefMasked?: string;
  lastValidation?: PlatformValidationResult;
  createdAt: string;
  updatedAt: string;
};

export type PlatformConfigInput = {
  platformCode: string;
  name: string;
  mode: PlatformMode;
  endpointUrl?: string;
  modelName?: string;
  rateLimitPerMinute?: number;
  credentialRef?: string;
  enabled?: boolean;
};

export type PlatformValidationResult = {
  ok: boolean;
  mode: PlatformMode;
  checkedAt: string;
  message: string;
};

export type BrowserConnectionStatus = 'not_started' | 'opening' | 'login_required' | 'ready' | 'needs_confirmation' | 'expired' | 'failed' | 'stopped';

export type BrowserConnectionIssueType = 'captcha' | 'risk_control' | 'login_expired' | 'platform_limit' | 'page_changed' | 'unknown';

export type BrowserConnectionEvent = 'login_confirmed' | 'issue_reported' | 'answer_captured' | 'session_stopped';

export type BrowserConnectionSession = {
  id: string;
  brandId: BrandId;
  platformCode: BeginnerFriendlyPlatform | string;
  status: BrowserConnectionStatus;
  loginDetected: boolean;
  authorizedScope: {
    brandId: BrandId;
    testPlanIds: string[];
    platformCodes: string[];
  };
  lastOperation?: string;
  lastIssueType?: BrowserConnectionIssueType;
  lastMessage?: string;
  lastAvailableAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type BrowserConnectionStartInput = {
  platformCode: BeginnerFriendlyPlatform | string;
  testPlanId?: string;
};

export type BrowserConnectionStatusInput = {
  event: BrowserConnectionEvent;
  lastIssueType?: BrowserConnectionIssueType;
  lastMessage?: string;
};

export type BrowserResponseCaptureInput = {
  runId: string;
  rawText: string;
  modelName?: string;
  citations?: string[];
};

export type BrowserResponseCaptureResult = {
  session: BrowserConnectionSession;
  run: MonitoringRunDetail;
};

export type RunPromptInput = {
  brandId: BrandId;
  platformCode: string;
  promptText: string;
};

export type RunPromptResult = {
  rawText: string;
  modelName?: string;
  respondedAt: string;
};

export type AIPlatformCallType =
  | 'monitoring'
  | 'content_generation'
  | 'validation'
  | 'question_generation'
  | 'answer_analysis'
  | 'optimization_planning';

export type AIPlatformCallStatus = 'started' | 'succeeded' | 'failed';

export type AIPlatformCallAudit = {
  id: string;
  brandId: BrandId;
  platformCode: string;
  modelName?: string;
  callType: AIPlatformCallType;
  status: AIPlatformCallStatus;
  durationMs?: number;
  inputTokenCount?: number;
  outputTokenCount?: number;
  costEstimate?: number;
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
  startedAt: string;
  completedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type AIPlatformCallAuditInput = {
  platformCode: string;
  modelName?: string;
  callType: AIPlatformCallType;
  status?: AIPlatformCallStatus;
  durationMs?: number;
  inputTokenCount?: number;
  outputTokenCount?: number;
  costEstimate?: number;
  errorCode?: string;
  errorMessage?: string;
  retryable?: boolean;
  startedAt?: string;
  completedAt?: string;
};

export type AIPlatformCallAuditUpdateInput = Partial<Omit<AIPlatformCallAuditInput, 'platformCode' | 'callType' | 'startedAt'>>;

export type AsyncJobType = 'monitoring' | 'content_generation' | 'question_generation' | 'answer_analysis' | 'optimization_planning';

export type AsyncJobStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'retry-exhausted';

export type AsyncJob = {
  id: string;
  brandId: BrandId;
  jobType: AsyncJobType;
  status: AsyncJobStatus;
  entityId: string;
  attemptCount: number;
  maxAttempts: number;
  nextRunAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type AsyncJobInput = {
  jobType: AsyncJobType;
  entityId: string;
  status?: AsyncJobStatus;
  attemptCount?: number;
  maxAttempts?: number;
  nextRunAt?: string;
  lastErrorCode?: string;
  lastErrorMessage?: string;
};

export type AsyncJobUpdateInput = Partial<Omit<AsyncJobInput, 'jobType' | 'entityId'>>;

export type LLMTaskType = 'question_generation' | 'answer_analysis' | 'content_generation' | 'optimization_planning';

export type LLMTaskStatus = 'queued' | 'running' | 'succeeded' | 'failed' | 'needs_confirmation';

export type LLMTaskRequest<TInput> = {
  platformCode?: string;
  modelName?: string;
  mode?: 'sync' | 'async';
  input: TInput;
};

export type LLMTaskResponse<TOutput> = {
  jobId?: string;
  status: LLMTaskStatus;
  output?: TOutput;
  auditId?: string;
  message: string;
};

export type LLMTaskRun = {
  id: string;
  brandId: BrandId;
  taskType: LLMTaskType;
  status: LLMTaskStatus;
  jobId?: string;
  auditId?: string;
  inputSummary: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type LLMTaskRunInput = {
  taskType: LLMTaskType;
  status: LLMTaskStatus;
  jobId?: string;
  auditId?: string;
  inputSummary?: Record<string, unknown>;
  outputSummary?: Record<string, unknown>;
  errorCode?: string;
  errorMessage?: string;
};

export type AutomationPackageStatus = 'draft' | 'waiting_confirmation' | 'running' | 'completed' | 'failed' | 'stopped';

export type AutomationPackageSource = 'brand_workspace' | 'monitoring' | 'growth_optimization' | 'content_generation';

export type AutomationStepCode =
  | 'context_collection'
  | 'question_pool_update'
  | 'question_selection'
  | 'test_question_confirmation'
  | 'test_plan_execution'
  | 'answer_analysis'
  | 'content_generation'
  | 'platform_rewrite'
  | 'content_confirmation'
  | 'publishing_suggestion'
  | 'retest_suggestion'
  | 'completed';

export type AutomationStepStatus = 'pending' | 'running' | 'waiting_confirmation' | 'completed' | 'failed' | 'skipped';

export type AutomationConfirmationType =
  | 'test_questions'
  | 'analysis_review'
  | 'content_review'
  | 'platform_rewrite_review'
  | 'publishing_suggestion'
  | 'manual_test_required';

export type AutomationConfirmationStatus = 'pending' | 'approved' | 'edited' | 'regenerate_requested' | 'skipped';

export type AutomationConfirmationAction = 'approve' | 'edit' | 'regenerate' | 'skip';

export type AutomationPublishingPlatform = 'zhihu' | 'baijiahao' | 'xiaohongshu' | 'wechat_official' | 'official_site_faq' | string;

export type PlatformRewriteStatus = 'draft' | 'needs_review' | 'approved';

export type AutomationStepSummary = {
  code: AutomationStepCode;
  status: AutomationStepStatus;
  title: string;
  message: string;
  startedAt?: string;
  completedAt?: string;
  relatedConfirmationIds: string[];
  relatedEntityIds: string[];
};

export type AutomationPackage = {
  packageId: string;
  brandId: BrandId;
  status: AutomationPackageStatus;
  source: AutomationPackageSource;
  goal: string;
  targetPlatforms: Array<BeginnerFriendlyPlatform | string>;
  targetPublishingPlatforms: AutomationPublishingPlatform[];
  currentStep: AutomationStepCode;
  stepSummaries: AutomationStepSummary[];
  relatedTestPlanId?: string;
  relatedGrowthPlanId?: string;
  relatedContentTaskIds: string[];
  relatedPublishingRecordIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type VisibilitySprintStatus = 'draft' | 'running' | 'waiting_confirmation' | 'completed' | 'failed' | 'stopped';

export type VisibilitySprintStepCode =
  | 'question_radar'
  | 'ai_response_monitoring'
  | 'standard_answer_alignment'
  | 'gap_diagnosis'
  | 'content_asset_generation'
  | 'publishing_preparation'
  | 'retest_and_trend'
  | 'completed';

export type VisibilitySprintMetricSummary = {
  questionCoverageRate: number;
  mentionRate: number;
  recommendationRate: number;
  firstRecommendationRate: number;
  topThreeRate: number;
  citationHitRate: number;
  expressionAccuracyRate: number;
  riskExpressionCount: number;
  contentGapCount: number;
  competitorSuppressionCount: number;
  sampleSize: number;
  updatedAt?: string;
};

export type VisibilitySprintStep = {
  code: VisibilitySprintStepCode;
  status: AutomationStepStatus;
  title: string;
  message: string;
  startedAt?: string;
  completedAt?: string;
  relatedEntityIds: string[];
};

export type VisibilitySprint = {
  sprintId: string;
  brandId: BrandId;
  title: string;
  goal: string;
  status: VisibilitySprintStatus;
  currentStep: VisibilitySprintStepCode;
  steps: VisibilitySprintStep[];
  metricSummary: VisibilitySprintMetricSummary;
  relatedQuestionIds: string[];
  relatedTestPlanIds: string[];
  relatedMonitoringRunIds: string[];
  relatedStandardAnswerIds: string[];
  relatedContentTaskIds: string[];
  relatedPublishingRecordIds: string[];
  relatedRetestTaskIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type QuestionRadarItemStatus = 'available' | 'selected' | 'in_sprint' | 'tested' | 'paused';

export type QuestionRadarItem = {
  questionId: string;
  sprintId: string;
  brandId: BrandId;
  question: string;
  normalizedQuestion: string;
  intentLabel: string;
  intentType: TestThemeType | 'unknown';
  purposes: TestQuestionPurpose[];
  platformCoverage: Array<BeginnerFriendlyPlatform | string>;
  businessValue: string;
  priority: OptimizationUnitPriority;
  status: QuestionRadarItemStatus;
  sprintAssociation: {
    inSprint: boolean;
    relation: 'selected_for_sprint' | 'available_for_sprint';
    duplicateInSprint: boolean;
  };
  createdAt: string;
  updatedAt: string;
};

export type QuestionRadarDashboard = {
  brandId: BrandId;
  sprintId: string;
  totalQuestionCount: number;
  inSprintQuestionCount: number;
  dedupedInSprintQuestionCount: number;
  duplicateInSprintQuestionCount: number;
  items: QuestionRadarItem[];
};

export type BrandStandardAnswerStatus = 'draft' | 'ready_for_review' | 'approved' | 'archived';

export type BrandStandardAnswerEvidence = {
  label: string;
  sourceType: 'brand_profile' | 'knowledge_source' | 'manual' | 'content_asset';
  sourceId?: string;
  excerpt: string;
};

export type BrandStandardAnswer = {
  answerId: string;
  brandId: BrandId;
  questionId: string;
  question: string;
  answer: string;
  keyPoints: string[];
  evidence: BrandStandardAnswerEvidence[];
  status: BrandStandardAnswerStatus;
  reviewedBy?: string;
  reviewedAt?: string;
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type BrandStandardAnswerInput = {
  questionId: string;
  question: string;
  answer: string;
  keyPoints?: string[];
  evidence?: BrandStandardAnswerEvidence[];
  status?: BrandStandardAnswerStatus;
};

export type StandardAnswerAlignmentStatus = 'waiting_real_answer' | 'waiting_standard_answer' | 'aligned' | 'needs_attention';

export type StandardAnswerAlignmentEvidenceType = 'coverage' | 'accuracy' | 'risk_expression' | 'citation_gap' | 'competitor_suppression';

export type StandardAnswerAlignmentEvidence = {
  type: StandardAnswerAlignmentEvidenceType;
  severity: 'high' | 'medium' | 'low';
  label: string;
  excerpt: string;
};

export type StandardAnswerAlignmentResponse = {
  runId: string;
  responseId?: string;
  platformCode: string;
  promptText: string;
  rawExcerpt: string;
  citations: string[];
  brandMentioned: boolean;
  brandRank: number | null;
  competitorMentions: CompetitorMention[];
};

export type StandardAnswerAlignmentItem = {
  questionId: string;
  question: string;
  standardAnswerId?: string;
  status: StandardAnswerAlignmentStatus;
  coverageScore: number;
  accuracyScore: number;
  keyPointsMatched: string[];
  keyPointsMissing: string[];
  citationGap: boolean;
  riskExpression: boolean;
  competitorSuppression: boolean;
  recommendation: string;
  responses: StandardAnswerAlignmentResponse[];
  evidence: StandardAnswerAlignmentEvidence[];
};

export type StandardAnswerAlignmentSummary = {
  totalQuestionCount: number;
  alignedCount: number;
  needsAttentionCount: number;
  waitingRealAnswerCount: number;
  waitingStandardAnswerCount: number;
  citationGapCount: number;
  riskExpressionCount: number;
  competitorSuppressionCount: number;
};

export type StandardAnswerAlignmentDashboard = {
  brandId: BrandId;
  sprintId: string;
  realAnswerCount: number;
  approvedStandardAnswerCount: number;
  summary: StandardAnswerAlignmentSummary;
  items: StandardAnswerAlignmentItem[];
  updatedAt: string;
};

export type SprintContentGapTask = {
  questionId: string;
  question: string;
  standardAnswerId?: string;
  contentStrategyId: string;
  contentTaskId: string;
  sourceRunIds: string[];
  gapTypes: StandardAnswerAlignmentEvidenceType[];
  recommendation: string;
};

export type SprintContentGapTaskResult = {
  brandId: BrandId;
  sprintId: string;
  createdTaskCount: number;
  skippedQuestionCount: number;
  tasks: SprintContentGapTask[];
  sprint: VisibilitySprint;
};

export type SprintContentTaskGapContext = {
  questionId?: string;
  question?: string;
  standardAnswerId?: string;
  sourceRunIds: string[];
  gapTypes: StandardAnswerAlignmentEvidenceType[];
  evidenceSummaries: string[];
  recommendation?: string;
};

export type SprintContentTaskDraftReadiness = {
  hasDraft: boolean;
  bodyLength: number;
  reviewReady: boolean;
  message: string;
};

export type SprintContentTaskItem = {
  contentTask: ContentGenerationTask;
  currentVersion?: ContentVersion;
  gapContext: SprintContentTaskGapContext;
  retestTarget?: string;
  draftReadiness: SprintContentTaskDraftReadiness;
};

export type SprintContentTaskDashboard = {
  brandId: BrandId;
  sprintId: string;
  totalTaskCount: number;
  reviewReadyTaskCount: number;
  missingDraftTaskCount: number;
  items: SprintContentTaskItem[];
  updatedAt: string;
};

export type SprintPublishingPreparationStatus = 'needs_draft' | 'draft_ready' | 'pending_manual_publish' | 'published' | 'failed';

export type SprintPublishingPreparationItem = {
  contentTask: ContentGenerationTask;
  currentVersion?: ContentVersion;
  publishingRecords: PublishingRecord[];
  targetPlatform: string;
  recommendedStatus: SprintPublishingPreparationStatus;
  message: string;
};

export type SprintPublishingPreparationDashboard = {
  brandId: BrandId;
  sprintId: string;
  totalContentTaskCount: number;
  preparedRecordCount: number;
  pendingManualPublishCount: number;
  publishedRecordCount: number;
  failedRecordCount: number;
  items: SprintPublishingPreparationItem[];
  updatedAt: string;
};

export type SprintPublishingPreparationInput = {
  contentTaskIds?: string[];
  status?: Extract<PublishingRecordStatus, 'draft' | 'pending'>;
};

export type SprintPublishingPreparationResult = {
  brandId: BrandId;
  sprintId: string;
  createdRecordCount: number;
  skippedContentTaskCount: number;
  records: PublishingRecord[];
  sprint: VisibilitySprint;
};

export type SprintRetestPlanInput = {
  publishingRecordIds?: string[];
  plannedAt?: string;
  targetScore?: number;
};

export type SprintRetestPlanResult = {
  brandId: BrandId;
  sprintId: string;
  createdTaskCount: number;
  skippedPublishingRecordCount: number;
  tasks: OptimizationTask[];
  sprint: VisibilitySprint;
};

export type SprintRetestTrendItem = {
  task: OptimizationTask;
  publishingRecord?: PublishingRecord;
  latestRetestRecord?: RetestRecord;
  status: 'planned' | 'completed' | 'improved' | 'needs_follow_up';
  beforeMetrics?: RetestMetricSnapshot;
  afterMetrics?: RetestMetricSnapshot;
  metricDelta?: RetestMetricDelta;
  message: string;
};

export type SprintRetestTrendDashboard = {
  brandId: BrandId;
  sprintId: string;
  plannedTaskCount: number;
  completedRetestCount: number;
  improvedRetestCount: number;
  baselineMetricSummary: VisibilitySprintMetricSummary;
  items: SprintRetestTrendItem[];
  updatedAt: string;
};

export type AutomationConfirmation = {
  confirmationId: string;
  packageId: string;
  brandId: BrandId;
  type: AutomationConfirmationType;
  status: AutomationConfirmationStatus;
  title: string;
  impact: string;
  recommendation: string;
  evidenceSummary: string;
  payload: Record<string, unknown>;
  decision?: string;
  decidedBy?: string;
  decidedAt?: string;
};

export type PlatformRewriteVersion = {
  rewriteId: string;
  brandId: BrandId;
  contentVersionId: string;
  targetPlatform: AutomationPublishingPlatform;
  title: string;
  body: string;
  tags: string[];
  rewriteNotes: string[];
  complianceNotes: string[];
  status: PlatformRewriteStatus;
  createdAt: string;
};

export type TestQuestionPoolAngle = 'brand' | 'category' | 'local' | 'audience' | 'pain_point' | 'course' | 'competitor' | 'buying_decision' | 'content_gap' | 'retest';

export type TestQuestionPoolSource = 'llm' | 'rule_template' | 'analysis_gap' | 'retest' | 'user_edit';

export type TestQuestionPoolStatus = 'candidate' | 'selected' | 'tested' | 'paused';

export type TestQuestionPoolItem = {
  poolItemId: string;
  brandId: BrandId;
  question: string;
  angle: TestQuestionPoolAngle;
  purposes: string[];
  targetPlatforms: string[];
  priority: OptimizationUnitPriority;
  estimatedValue: string;
  source: TestQuestionPoolSource;
  status: TestQuestionPoolStatus;
  candidateId?: string;
  lastTestedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type TestQuestionSourceRecord = {
  sourceRecordId: string;
  poolItemId: string;
  brandId: BrandId;
  sourceType: TestQuestionPoolSource | 'test_question_candidate' | 'published_content';
  sourceId?: string;
  summary: string;
  createdAt: string;
};

export type QuestionGenerationInput = {
  brandProfile: BrandProfile;
  brandDetail: BrandDetail;
  themes?: TestTheme[];
  targetPlatforms: Array<BeginnerFriendlyPlatform | string>;
  scenarioCount?: number;
  questionCountPerTheme?: number;
  includeCompetitors?: boolean;
};

export type QuestionGenerationOutput = {
  themes: TestThemeInput[];
  candidates: TestQuestionCandidateInput[];
  missingProfileFields: string[];
  generationNotes: string[];
};

export type TestAssetGenerationSource = 'llm' | 'fallback';

export type TestAssetGenerationResult<TItem> = {
  items: TItem[];
  missingProfileFields: string[];
  generationNotes: string[];
  source: TestAssetGenerationSource;
};

export type AnswerAnalysisInput = {
  brandProfile: BrandProfile;
  brandDetail: BrandDetail;
  promptText: string;
  rawAnswer: string;
  platformCode: BeginnerFriendlyPlatform | string;
  modelName?: string;
  respondedAt?: string;
  sourceRunId?: string;
};

export type LLMContentGenerationInput = {
  brandProfile: BrandProfile;
  brandDetail: BrandDetail;
  task?: ContentGenerationTask;
  strategy?: ContentStrategy;
  growthPlan?: GrowthOptimizationPlan;
  contentType: GrowthContentType | string;
  title?: string;
  targetPlatform: string;
  targetKeywords: string[];
  referenceSources: string[];
  retestAt?: string;
};

export type LLMContentGenerationOutput = ContentVersionInput & {
  complianceNotes: string[];
  retestSuggestions: string[];
  reviewRequired?: boolean;
};

export type OptimizationPlanningInput = {
  brandProfile: BrandProfile;
  brandDetail: BrandDetail;
  sourceTestPlanId?: string;
  sourceRunIds: string[];
  analysisResults: AnalysisResult[];
  contentAssets?: ContentAsset[];
  publishingRecords?: PublishingRecord[];
  currentPlans?: GrowthOptimizationPlan[];
};

export type OptimizationPlanningOutput = {
  plan: GrowthOptimizationPlanInput;
  contentTasks: ContentGenerationTaskInput[];
  retestQuestions: TestQuestionCandidateInput[];
  generationNotes: string[];
};

export type MonitoringRunStatus = 'pending' | 'running' | 'completed' | 'failed' | 'review_required';

export type AIResponseParseStatus = 'pending' | 'parsed' | 'review_required' | 'failed';

export type AnalysisSentiment = 'positive' | 'neutral' | 'negative' | 'unknown';

export type MonitoringRun = {
  id: string;
  brandId: BrandId;
  optimizationUnitId: string;
  intentId: string;
  promptId: string;
  platformCode: string;
  status: MonitoringRunStatus;
  startedAt?: string;
  completedAt?: string;
  errorMessage?: string;
  retryStatus?: 'not_retried' | 'retry_pending' | 'retried';
  createdAt: string;
};

export type MonitoringRunExecutionUpdateInput = {
  status: MonitoringRunStatus;
  completedAt?: string;
  errorMessage?: string;
  retryStatus?: 'not_retried' | 'retry_pending' | 'retried';
};

export type TestThemeType = 'brand' | 'category' | 'location' | 'age_group' | 'pain_point' | 'offering' | 'competitor' | 'buying_decision';

export type TestQuestionPurpose = 'brand_mentioned' | 'rank_first' | 'value_prop_accuracy' | 'competitor_presence' | 'risk_expression';

export type TestPlanStatus = 'draft' | 'ready' | 'running' | 'completed' | 'needs_configuration' | 'needs_confirmation' | 'failed';

export type TestPlanExecutionMethod = AIConnectionMethod;

export type TestTheme = {
  id: string;
  brandId: BrandId;
  type: TestThemeType;
  name: string;
  businessExplanation: string;
  priority: OptimizationUnitPriority;
  estimatedValue: string;
  enabled: boolean;
  sourceProfileFields: BrandImportFieldKey[];
  createdAt: string;
  updatedAt: string;
};

export type TestThemeInput = {
  type: TestThemeType;
  name: string;
  businessExplanation: string;
  priority: OptimizationUnitPriority;
  estimatedValue: string;
  enabled?: boolean;
  sourceProfileFields?: BrandImportFieldKey[];
};

export type TestQuestionCandidate = {
  id: string;
  brandId: BrandId;
  themeId: string;
  promptId?: string;
  question: string;
  purposes: TestQuestionPurpose[];
  targetPlatforms: Array<BeginnerFriendlyPlatform | string>;
  priority: OptimizationUnitPriority;
  estimatedValue: string;
  editable: boolean;
  selected: boolean;
  createdAt: string;
  updatedAt: string;
};

export type TestQuestionCandidateInput = {
  themeId: string;
  promptId?: string;
  question: string;
  purposes: TestQuestionPurpose[];
  targetPlatforms: Array<BeginnerFriendlyPlatform | string>;
  priority: OptimizationUnitPriority;
  estimatedValue: string;
  editable?: boolean;
  selected?: boolean;
};

export type TestQuestionCandidateUpdateInput = Partial<Omit<TestQuestionCandidateInput, 'themeId'>> & {
  themeId?: string;
};

export type TestQuestionCandidateSelectionInput = {
  themeId?: string;
  candidateIds: string[];
  selected: boolean;
};

export type TestQuestionCandidateListQuery = {
  themeId?: string;
  selected?: boolean;
  limit?: number;
  offset?: number;
};

export type TestPlanQuestion = {
  candidateId?: string;
  promptId?: string;
  question: string;
  purposes: TestQuestionPurpose[];
  targetPlatforms: Array<BeginnerFriendlyPlatform | string>;
};

export type TestPlan = {
  id: string;
  brandId: BrandId;
  name: string;
  status: TestPlanStatus;
  questions: TestPlanQuestion[];
  platformCodes: Array<BeginnerFriendlyPlatform | string>;
  connectionSummary: PlatformConnectionSummary[];
  executionMethod: TestPlanExecutionMethod;
  estimatedDurationMinutes: number;
  confirmationItems: string[];
  monitoringRunIds: string[];
  createdBy: string;
  createdAt: string;
  updatedAt: string;
};

export type TestPlanInput = {
  name?: string;
  candidateIds?: string[];
  questions?: TestPlanQuestion[];
  platformCodes?: Array<BeginnerFriendlyPlatform | string>;
  executionMethod?: TestPlanExecutionMethod;
};

export type TestPlanTemplate = {
  id: string;
  name: string;
  industryKeywords: string[];
  cityRequired: boolean;
  description: string;
  recommended: boolean;
  analysisFocus: TestQuestionPurpose[];
  platformCodes: Array<BeginnerFriendlyPlatform | string>;
};

export type TestPlanTemplateApplicationInput = {
  templateId: string;
  name?: string;
};

export type TestPlanDuplicateInput = {
  name?: string;
  retest?: boolean;
};

export type TestPlanCreationResult = {
  plan: TestPlan;
  questionCount: number;
  platformCount: number;
  targetPlatforms: Array<BeginnerFriendlyPlatform | string>;
  estimatedDurationMinutes: number;
  connectionSummary: PlatformConnectionSummary[];
  confirmationItems: string[];
};

export type TestPlanExecutionStep = {
  question: string;
  platformCode: BeginnerFriendlyPlatform | string;
  method: TestPlanExecutionMethod;
  status: 'queued' | 'needs_confirmation' | 'manual_required' | 'needs_configuration' | 'skipped';
  promptId?: string;
  runId?: string;
  message: string;
};

export type TestPlanExecutionResult = {
  plan: TestPlan;
  status: TestPlanStatus;
  apiRuns: MonitoringRunDetail[];
  browserSteps: TestPlanExecutionStep[];
  manualSteps: TestPlanExecutionStep[];
  configurationItems: TestPlanExecutionStep[];
  skippedSteps: TestPlanExecutionStep[];
  confirmationItems: string[];
};

export type AutomationAnalysisSummary = {
  testPlanId: string;
  growthPlanId?: string;
  sampleCount: number;
  recommendationRate: number;
  topOneRate: number;
  topThreeRate: number;
  averageAccuracyScore: number;
  averageCitationScore: number;
  competitorSuppressionCount: number;
  citationGapCount: number;
  riskReviewCount: number;
  unknownReviewCount: number;
  relatedRunIds: string[];
  contentGaps: string[];
  nextRecommendations: string[];
};

export type TestQuestionWorkspace = {
  brandId: BrandId;
  themes: TestTheme[];
  candidates: TestQuestionCandidate[];
  defaultPlan?: TestPlan;
};

export type ManualTestAnswerInput = {
  testPlanId: string;
  question: string;
  platformCode: BeginnerFriendlyPlatform | string;
  rawText: string;
  citations?: string[];
  modelName?: string;
};

export type ManualTestAnswerBatchInput = {
  answers: ManualTestAnswerInput[];
};

export type ManualTestAnswerResultItem = {
  question: string;
  platformCode: BeginnerFriendlyPlatform | string;
  status: 'accepted' | 'failed';
  message: string;
  run?: MonitoringRunDetail;
};

export type ManualTestAnswerBatchResult = {
  testPlanId: string;
  accepted: ManualTestAnswerResultItem[];
  failed: ManualTestAnswerResultItem[];
};

export type AIResponse = {
  id: string;
  runId: string;
  brandId: BrandId;
  rawText: string;
  citations: string[];
  modelName?: string;
  respondedAt: string;
  parseStatus: AIResponseParseStatus;
  createdAt: string;
};

export type CompetitorMention = {
  name: string;
  rank: number | null;
  sentiment: AnalysisSentiment;
};

export type Competitor = {
  id: string;
  brandId: BrandId;
  name: string;
  aliases: string[];
  website?: string;
  industryTags: string[];
  comparisonNote: string;
  suppressionRule: {
    consecutiveThreshold: number;
  };
  confirmationLabel?: CompetitorConfirmationLabel;
  sourceCandidateId?: string;
  sourceProvider?: CompetitorCandidateSourceProvider;
  nearestCampusDistanceKm?: number;
  isNationalBenchmark?: boolean;
  isCampusFocus?: boolean;
  createdAt: string;
  updatedAt: string;
};

export type CompetitorInput = {
  name: string;
  aliases?: string[];
  website?: string;
  industryTags?: string[];
  comparisonNote?: string;
  suppressionRule?: {
    consecutiveThreshold?: number;
  };
  confirmationLabel?: CompetitorConfirmationLabel;
  sourceCandidateId?: string;
  sourceProvider?: CompetitorCandidateSourceProvider;
  nearestCampusDistanceKm?: number;
  isNationalBenchmark?: boolean;
  isCampusFocus?: boolean;
};

export type CompetitorConfirmationLabel = 'direct_competitor' | 'indirect_competitor' | 'local_alternative' | 'national_benchmark' | 'excluded';

export type CompetitorCandidateSourceProvider = 'amap' | 'tencent' | 'baidu' | 'manual';

export type CompetitorCandidateDecisionStatus = 'pending' | 'confirmed' | 'excluded';

export type CompetitorDiscoveryRunStatus = 'running' | 'completed' | 'failed';

export type CompetitorMapProviderStatus = 'configured' | 'fallback' | 'rate_limited' | 'disabled' | 'failed';

export type CompetitorDiscoveryRun = {
  runId: string;
  brandId: BrandId;
  city: string;
  campusRadiusKm: number;
  keywords: string[];
  status: CompetitorDiscoveryRunStatus;
  candidateCount: number;
  missingFields: string[];
  sourceProvider: CompetitorCandidateSourceProvider;
  providerStatus: CompetitorMapProviderStatus;
  providerMessage: string;
  cacheHit: boolean;
  createdBy: string;
  createdAt: string;
  completedAt?: string;
  failureReason?: string;
};

export type CompetitorDiscoveryRunInput = {
  city?: string;
  campusRadiusKm?: number;
  keywords?: string[];
  sourceProvider?: CompetitorCandidateSourceProvider;
  forceRefresh?: boolean;
};

export type CompetitorCandidate = {
  candidateId: string;
  runId: string;
  brandId: BrandId;
  sourceProvider: CompetitorCandidateSourceProvider;
  sourcePoiId?: string;
  name: string;
  address: string;
  city: string;
  latitude?: number;
  longitude?: number;
  category?: string;
  distanceToNearestCampusKm?: number;
  matchedKeywords: string[];
  score: number;
  suggestedLabel: CompetitorConfirmationLabel;
  matchReasons: string[];
  confidence: 'high' | 'medium' | 'low';
  isCampusFocus: boolean;
  decisionStatus: CompetitorCandidateDecisionStatus;
  confirmedLabel?: CompetitorConfirmationLabel;
  excludedReason?: string;
  createdAt: string;
  updatedAt: string;
};

export type CompetitorCandidateDecisionInput = {
  label: CompetitorConfirmationLabel;
  excludedReason?: string;
};

export type CompetitorDiscoveryCandidatesQuery = {
  filter?: 'all' | 'campus_focus' | 'direct_competitor' | 'national_benchmark' | 'excluded' | 'pending' | 'confirmed';
};

export type CompetitorCandidateConfirmationResult = {
  candidate: CompetitorCandidate;
  competitor?: Competitor;
};

export type CompetitorComparisonItem = {
  competitorId?: string;
  competitorName: string;
  promptId: string;
  promptText: string;
  platformCode: string;
  optimizationUnitId: string;
  intentId: string;
  intentText: string;
  brandRank: number | null;
  competitorRank: number | null;
  rankGap: number | null;
  suppressed: boolean;
  recommendationReason: string;
  citationSources: string[];
  runId: string;
  capturedAt: string;
};

export type CompetitorDashboard = {
  brandId: BrandId;
  competitors: Competitor[];
  mentionRate: number;
  suppressionRate: number;
  averageRankGap: number;
  highRiskIntents: Array<{ intentId: string; text: string; suppressionCount: number }>;
  comparisons: CompetitorComparisonItem[];
};

export type CitationSourceType = 'official_site' | 'media' | 'social' | 'encyclopedia' | 'third_party';

export type CitationAuthorityLevel = 'high' | 'medium' | 'low' | 'unknown';

export type ContentAssetStatus = 'draft' | 'published' | 'archived';

export type ContentAsset = {
  id: string;
  brandId: BrandId;
  title: string;
  type: string;
  platform: string;
  url: string;
  targetKeywords: string[];
  reuseOfAssetId?: string;
  brandAdaptation?: string;
  status: ContentAssetStatus;
  publishedAt?: string;
  createdAt: string;
  updatedAt: string;
};

export type ContentAssetInput = {
  title?: string;
  type?: string;
  platform?: string;
  url?: string;
  targetKeywords?: string[];
  reuseOfAssetId?: string;
  brandAdaptation?: string;
  status?: ContentAssetStatus;
  publishedAt?: string;
};

export type ContentAssetReviewStatus = 'pending' | 'approved' | 'needs_revision';

export type ContentAssetPublishStatus = 'not_started' | 'draft' | 'pending' | 'published' | 'failed';

export type ContentAssetPublishingStats = {
  brandId: BrandId;
  totalRecords: number;
  publishedRecords: number;
  failedRecords: number;
  citationCount: number;
  relatedIntentCount: number;
};

export type ContentAssetPageItem = ContentAsset & {
  optimizationUnitId?: string;
  userIntent?: string;
  sourceReferences: Array<{ type: 'citation' | 'knowledge' | 'manual'; title: string; url?: string }>;
  reviewStatus: ContentAssetReviewStatus;
  publishStatus: ContentAssetPublishStatus;
  retestPlanId?: string;
  publishingStats: ContentAssetPublishingStats;
};

export type ContentAssetPageInput = ContentAssetInput & {
  optimizationUnitId?: string;
  userIntent?: string;
  sourceReferences?: Array<{ type: 'citation' | 'knowledge' | 'manual'; title: string; url?: string }>;
};

export type ContentAssetFilter = {
  type?: string;
  platform?: string;
  status?: ContentAssetStatus;
  keyword?: string;
};

export type CitationSource = {
  id: string;
  brandId: BrandId;
  responseId: string;
  runId: string;
  promptId: string;
  promptText: string;
  platformCode: string;
  contentAssetId?: string;
  title: string;
  url: string;
  sourceType: CitationSourceType;
  authorityLevel: CitationAuthorityLevel;
  citationCount: number;
  citedAt: string;
  createdAt: string;
};

export type CitationDashboard = {
  brandId: BrandId;
  sampleCount: number;
  citedSampleCount: number;
  citationRate: number;
  totalCitations: number;
  contentCitationRate: number;
  officialCitationRate: number;
  authoritySourceRate: number;
  sourceTypeBreakdown: Array<{ sourceType: CitationSourceType; citationCount: number; rate: number }>;
  trend: Array<{
    date: string;
    sampleCount: number;
    citedSampleCount: number;
    citationRate: number;
    citationCount: number;
    contentCitationRate: number;
  }>;
  sources: CitationSource[];
  contentAssets: ContentAsset[];
};

export type AnalysisResult = {
  id: string;
  responseId: string;
  runId: string;
  brandId: BrandId;
  brandMentioned: boolean;
  brandRank: number | null;
  sentiment: AnalysisSentiment;
  accuracyScore: number;
  citationScore: number;
  platformEvaluation: string;
  recommendationReason: string;
  rankingReason: string;
  expressionCompleteness: string;
  expressionDeviation: string;
  competitorMentions: CompetitorMention[];
  reviewRequired: boolean;
  updatedAt: string;
};

export type AnalysisFindingType = 'competitor' | 'evaluation' | 'citation' | 'fact';

export type AnalysisFindingSeverity = 'high' | 'medium' | 'low';

export type AnalysisRecommendedAction = {
  label: string;
  actionType: 'create_task' | 'generate_content' | 'update_knowledge' | 'schedule_retest';
  targetId?: string;
};

export type AnalysisFinding = {
  id: string;
  brandId: BrandId;
  type: AnalysisFindingType;
  title: string;
  optimizationUnitId?: string;
  userIntent?: string;
  platformCode?: string;
  evidence: string[];
  severity: AnalysisFindingSeverity;
  recommendedActions: AnalysisRecommendedAction[];
  relatedTaskId?: string;
};

export type AnalysisFindingInput = Omit<AnalysisFinding, 'id' | 'brandId'>;

export type AnalysisWorkbenchDashboard = {
  brandId: BrandId;
  findings: AnalysisFinding[];
  recommendedActions: AnalysisRecommendedAction[];
};

export type AnalysisResultInput = Partial<Omit<AnalysisResult, 'id' | 'responseId' | 'runId' | 'brandId' | 'updatedAt'>>;

export type EvaluationIssueType = 'misinformation' | 'missing_selling_point' | 'blocked_expression' | 'negative_expression' | 'low_accuracy';

export type EvaluationIssueSeverity = 'high' | 'medium' | 'low';

export type EvaluationIssueStatus = 'open' | 'strategy_created' | 'knowledge_updated' | 'resolved';

export type EvaluationIssue = {
  id: string;
  brandId: BrandId;
  responseId: string;
  runId: string;
  promptId: string;
  promptText: string;
  userIntent?: string;
  platformCode: string;
  issueType: EvaluationIssueType;
  rawFragment: string;
  suggestedExpression: string;
  severity: EvaluationIssueSeverity;
  status: EvaluationIssueStatus;
  createdAt: string;
  updatedAt: string;
};

export type EvaluationDashboard = {
  brandId: BrandId;
  sampleCount: number;
  positiveRate: number;
  neutralRate: number;
  negativeRate: number;
  accurateRate: number;
  trend: Array<{
    date: string;
    sampleCount: number;
    positiveRate: number;
    neutralRate: number;
    negativeRate: number;
    accurateRate: number;
  }>;
  issueTypeBreakdown: Array<{ issueType: EvaluationIssueType; count: number; rate: number }>;
  issues: EvaluationIssue[];
};

export type GEOMetricScores = {
  mentionScore: number;
  rankingScore: number;
  accuracyScore: number;
  sentimentScore: number;
  citationScore: number;
  competitorScore: number;
  knowledgeCompletenessScore: number;
  totalScore: number;
};

export type GEOMetricSnapshot = GEOMetricScores & {
  id: string;
  brandId: BrandId;
  period: string;
  platformCode?: string;
  optimizationUnitId?: string;
  intentId?: string;
  category?: UserIntentCategory;
  sampleCount: number;
  insufficientSample: boolean;
  calculatedAt: string;
};

export type GEOMetricBreakdown = {
  platform: GEOMetricSnapshot[];
  optimizationUnit: GEOMetricSnapshot[];
  intent: GEOMetricSnapshot[];
};

export type BrandMetricDashboard = {
  brandId: BrandId;
  current: GEOMetricSnapshot;
  trend: GEOMetricSnapshot[];
  breakdown: GEOMetricBreakdown;
};

export type BrandMetricRankingItem = GEOMetricScores & {
  brandId: BrandId;
  name: string;
  status: BrandStatus;
  mentionRate: number;
  top3Rate: number;
  positiveRate: number;
  periodChange: number;
  sampleCount: number;
  insufficientSample: boolean;
};

export type ContentStrategyType = 'gap' | 'correction' | 'enhancement' | 'authority_citation' | 'competitor_response';

export type ContentStrategyPriority = 'high' | 'medium' | 'low';

export type ContentStrategyStatus = 'draft' | 'task_created' | 'completed';

export type ContentStrategy = {
  id: string;
  brandId: BrandId;
  optimizationUnitId: string;
  intentId: string;
  type: ContentStrategyType;
  priority: ContentStrategyPriority;
  suggestedTitle: string;
  targetPlatform: string;
  targetKeywords: string[];
  relatedPromptIds: string[];
  status: ContentStrategyStatus;
  createdAt: string;
  updatedAt: string;
};

export type ContentStrategyInput = {
  optimizationUnitId: string;
  intentId: string;
  type: ContentStrategyType;
  priority: ContentStrategyPriority;
  suggestedTitle: string;
  targetPlatform: string;
  targetKeywords?: string[];
  relatedPromptIds?: string[];
};

export type ContentStrategyFilter = {
  type?: ContentStrategyType;
  priority?: ContentStrategyPriority;
  platform?: string;
  status?: ContentStrategyStatus;
};

export type ContentStrategySuggestion = {
  type: ContentStrategyType;
  priority: ContentStrategyPriority;
  suggestedTitle: string;
  targetPlatform: string;
  targetKeywords: string[];
  optimizationUnitId: string;
  intentId: string;
  relatedPromptIds: string[];
  reason: string;
};

export type ContentCenterDashboard = {
  brandId: BrandId;
  assets: ContentAsset[];
  strategies: ContentStrategy[];
  suggestions: ContentStrategySuggestion[];
  coverage: {
    keywordCoverageRate: number;
    uncoveredKeywords: string[];
    publishedAssetCount: number;
    reusableAssetCount: number;
  };
};

export type ContentGenerationStatus = 'pending' | 'running' | 'completed' | 'failed';

export type GrowthContentType =
  | 'wechat_article'
  | 'xiaohongshu_note'
  | 'website_faq'
  | 'short_video_script'
  | 'platform_profile_copy'
  | 'image_creative_brief';

export type ContentGenerationStepKey = 'strategy_parse' | 'knowledge_read' | 'outline_generation' | 'body_generation' | 'geo_rule_check';

export type ContentGenerationStepStatus = 'pending' | 'running' | 'completed' | 'failed';

export type ContentGenerationStep = {
  key: ContentGenerationStepKey;
  label: string;
  status: ContentGenerationStepStatus;
  message?: string;
  completedAt?: string;
};

export type ContentGenerationStepUpdateInput = {
  stepKey: ContentGenerationStepKey;
  status: ContentGenerationStepStatus;
  message?: string;
  completedAt?: string;
};

export type ContentGenerationTask = {
  id: string;
  brandId: BrandId;
  strategyId: string;
  growthOptimizationPlanId?: string;
  targetPlatform: string;
  contentType: GrowthContentType | string;
  contentTopic?: string;
  targetKeywords: string[];
  referenceSources: string[];
  retestAt?: string;
  status: ContentGenerationStatus;
  steps: ContentGenerationStep[];
  draftRef?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type ContentGenerationTaskInput = {
  strategyId: string;
  growthOptimizationPlanId?: string;
  targetPlatform?: string;
  contentType?: GrowthContentType | string;
  contentTopic?: string;
  targetKeywords?: string[];
  referenceSources?: string[];
  retestAt?: string;
};

export type GrowthOptimizationContentTaskInput = {
  planId: string;
  recommendationIndexes?: number[];
};

export type ContentVersion = {
  id: string;
  brandId: BrandId;
  generationTaskId: string;
  title: string;
  body: string;
  version: number;
  exportFormat: 'markdown';
  createdAt: string;
  updatedAt: string;
};

export type ContentVersionInput = {
  title: string;
  body: string;
  exportFormat?: 'markdown';
};

export type ContentGenerationCompletionInput = ContentVersionInput & {
  completedAt?: string;
};

export type ContentGenerationFailureInput = {
  stepKey: ContentGenerationStepKey;
  errorCode?: string;
  errorMessage: string;
  retryable?: boolean;
  failedAt?: string;
  attemptCount?: number;
};

export type ContentGenerationRetryInput = {
  nextRunAt?: string;
};

export type ContentExportRecord = {
  id: string;
  brandId: BrandId;
  generationTaskId: string;
  versionId: string;
  exportFormat: 'markdown';
  fileName: string;
  content: string;
  createdBy: string;
  createdAt: string;
};

export type PublishingEntryPayload = {
  brandId: BrandId;
  strategyId: string;
  generationTaskId: string;
  versionId: string;
  title: string;
  body: string;
  targetPlatform: string;
  contentType: GrowthContentType | string;
  targetKeywords: string[];
};

export type ContentGenerationWorkspace = {
  brandId: BrandId;
  tasks: ContentGenerationTask[];
  currentTask?: ContentGenerationTask;
  currentVersion?: ContentVersion;
  versions: ContentVersion[];
  exports: ContentExportRecord[];
  publishPayload?: PublishingEntryPayload;
};

export type PublishingAuthStatus = 'connected' | 'expired' | 'error' | 'disconnected';

export type PublishingMode = 'manual' | 'assisted' | 'automatic';

export type PublishingRecordStatus = 'draft' | 'pending' | 'queued' | 'publishing' | 'published' | 'failed';

export type PublishingLoginMode = 'oauth' | 'manual' | 'cookie';

export type PublishingPlatform = {
  platform: string;
  name: string;
  loginMode: PublishingLoginMode;
  accountCount: number;
  hasAuthError: boolean;
};

export type PublishingAccount = {
  id: string;
  brandId: BrandId;
  platform: string;
  accountName: string;
  loginMode: PublishingLoginMode;
  publishingMode?: PublishingMode;
  authStatus: PublishingAuthStatus;
  lastAuthorizedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublishingAccountInput = {
  platform: string;
  accountName: string;
  loginMode?: PublishingLoginMode;
  publishingMode?: PublishingMode;
  authStatus?: PublishingAuthStatus;
  errorMessage?: string;
};

export type PublishingModeInput = {
  publishingMode: PublishingMode;
};

export type PublishingRecord = {
  id: string;
  brandId: BrandId;
  contentAssetId: string;
  accountId?: string;
  generationTaskId?: string;
  versionId?: string;
  title: string;
  body: string;
  platform: string;
  accountName?: string;
  publishingMode?: PublishingMode;
  status: PublishingRecordStatus;
  externalPlatformId?: string;
  publishedUrl?: string;
  lastAttemptAt?: string;
  publishedAt?: string;
  errorMessage?: string;
  createdAt: string;
  updatedAt: string;
};

export type PublishingRecordInput = Partial<PublishingEntryPayload> & {
  accountId?: string;
  contentAssetId?: string;
  status?: PublishingRecordStatus;
};

export type PublishingStatusInput = {
  status: PublishingRecordStatus;
  publishedUrl?: string;
  errorMessage?: string;
};

export type PublishingExecutionStatusInput = PublishingStatusInput & {
  externalPlatformId?: string;
  lastAttemptAt?: string;
  publishedAt?: string;
};

export type PublishingExecutionOutcome = 'published' | 'already_published' | 'failed';

export type PublishingExecutionResult = {
  outcome: PublishingExecutionOutcome;
  idempotencyKey: string;
  record: PublishingRecord;
};

export type PublishingDashboard = {
  brandId: BrandId;
  platforms: PublishingPlatform[];
  accounts: PublishingAccount[];
  records: PublishingRecord[];
};

export type PublishingChannelStats = {
  brandId: BrandId;
  platform: string;
  totalRecords: number;
  draftRecords: number;
  pendingRecords: number;
  publishedRecords: number;
  failedRecords: number;
};

export type OwnedMediaAccount = PublishingAccount & {
  platformName: string;
  stats: PublishingChannelStats;
};

export type MediaPlatformRule = {
  brandId: BrandId;
  platform: string;
  name: string;
  contentFormats: string[];
  intentFit: string;
  recommendedFrequency: string;
  coverRatio: string;
  publishingNote: string;
};

export type MediaPlatformRuleInput = Omit<MediaPlatformRule, 'brandId'>;

export type PublishingRecordPerformance = {
  brandId: BrandId;
  recordId: string;
  contentAssetId?: string;
  sourceStatus: 'linked' | 'unidentified';
  citationCount: number;
  relatedIntentCount: number;
  retestStatus: 'not_planned' | 'planned' | 'completed' | 'improved' | 'not_improved';
  latestRetestRecordId?: string;
  nextSuggestion: string;
};

export type OptimizationTaskStatus = 'todo' | 'doing' | 'review' | 'retest' | 'done' | 'reopened';

export type OptimizationTaskType = 'content_strategy' | 'monitoring_issue' | 'citation_issue' | 'evaluation_issue' | 'manual';

export type RetestRecord = {
  id: string;
  taskId: string;
  sourceRunId: string;
  retestRunId: string;
  plannedAt: string;
  completedAt?: string;
  targetScore: number;
  actualScore?: number;
  passed?: boolean;
  beforeMetrics?: RetestMetricSnapshot;
  afterMetrics?: RetestMetricSnapshot;
  metricDelta?: RetestMetricDelta;
  improved?: boolean;
  nextSuggestion?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
};

export type RetestMetricSnapshot = {
  mentionRate: number;
  brandRank: number | null;
  accuracyScore: number;
};

export type RetestMetricDelta = {
  mentionRate: number;
  rankImproved: boolean;
  accuracyScore: number;
};

export type OptimizationTask = {
  id: string;
  brandId: BrandId;
  title: string;
  type: OptimizationTaskType;
  status: OptimizationTaskStatus;
  ownerId?: string;
  optimizationUnitId?: string;
  relatedPromptId?: string;
  relatedPlatformCode?: string;
  strategyId?: string;
  growthOptimizationPlanId?: string;
  sourceRunId?: string;
  retestRunId?: string;
  dueDate?: string;
  priority?: ContentStrategyPriority;
  processingNote?: string;
  contentLink?: string;
  reviewStatus?: 'pending' | 'approved' | 'rejected';
  retestPlanAt?: string;
  retestRecords: RetestRecord[];
  createdAt: string;
  updatedAt: string;
};

export type OptimizationTaskInput = {
  title: string;
  type?: OptimizationTaskType;
  ownerId?: string;
  optimizationUnitId?: string;
  relatedPromptId?: string;
  relatedPlatformCode?: string;
  strategyId?: string;
  growthOptimizationPlanId?: string;
  sourceRunId?: string;
  dueDate?: string;
  priority?: ContentStrategyPriority;
};

export type OptimizationTaskUpdateInput = {
  status?: OptimizationTaskStatus;
  ownerId?: string;
  dueDate?: string;
  processingNote?: string;
  contentLink?: string;
  reviewStatus?: OptimizationTask['reviewStatus'];
};

export type GrowthOptimizationPlanStatus = 'draft' | 'confirmed' | 'in_progress' | 'ready_for_retest' | 'completed';

export type GrowthOptimizationReasonType =
  | 'brand_not_mentioned'
  | 'ranking_low'
  | 'value_prop_missing'
  | 'competitor_stronger'
  | 'risk_expression'
  | 'content_gap'
  | 'citation_gap';

export type GrowthOptimizationReason = {
  type: GrowthOptimizationReasonType;
  title: string;
  evidence: string;
  relatedRunIds: string[];
  relatedPromptIds: string[];
};

export type GrowthOptimizationContentRecommendation = {
  contentType: GrowthContentType;
  title: string;
  targetPlatform: string;
  targetKeywords: string[];
  reason: string;
  sourceStrategyId?: string;
  generationTaskId?: string;
};

export type GrowthOptimizationPlan = {
  id: string;
  brandId: BrandId;
  sourceTestPlanId?: string;
  strategyId?: string;
  sourceRunIds: string[];
  summary: string;
  reasons: GrowthOptimizationReason[];
  priority: ContentStrategyPriority;
  ownerId?: string;
  dueDate: string;
  publishingPlatforms: string[];
  retestAt: string;
  contentRecommendations: GrowthOptimizationContentRecommendation[];
  taskIds: string[];
  status: GrowthOptimizationPlanStatus;
  createdAt: string;
  updatedAt: string;
};

export type GrowthOptimizationPlanInput = {
  sourceTestPlanId?: string;
  strategyId?: string;
  sourceRunIds?: string[];
  summary?: string;
  reasons?: GrowthOptimizationReason[];
  priority?: ContentStrategyPriority;
  ownerId?: string;
  dueDate: string;
  publishingPlatforms: string[];
  retestAt: string;
  contentRecommendations?: GrowthOptimizationContentRecommendation[];
};

export type GrowthOptimizationPlanConfirmInput = Partial<
  Pick<GrowthOptimizationPlanInput, 'ownerId' | 'dueDate' | 'publishingPlatforms' | 'retestAt'>
>;

export type GrowthOptimizationPlanConfirmationResult = {
  plan: GrowthOptimizationPlan;
  tasks: OptimizationTask[];
};

export type GrowthOptimizationPlanUpdateInput = Partial<
  Pick<GrowthOptimizationPlan, 'summary' | 'priority' | 'ownerId' | 'dueDate' | 'publishingPlatforms' | 'retestAt' | 'status'>
> & {
  reasons?: GrowthOptimizationReason[];
  contentRecommendations?: GrowthOptimizationContentRecommendation[];
};

export type GrowthOptimizationWorkspace = {
  brandId: BrandId;
  plans: GrowthOptimizationPlan[];
  currentPlan?: GrowthOptimizationPlan;
  relatedStrategies: ContentStrategy[];
  relatedTasks: OptimizationTask[];
  relatedPublishingRecords: PublishingRecord[];
};

export type RetestPlanInput = {
  sourceRunId?: string;
  retestRunId?: string;
  plannedAt?: string;
  targetScore?: number;
  notes?: string;
};

export type RetestResultInput = {
  actualScore: number;
  targetScore?: number;
  notes?: string;
};

export type TaskBoardDashboard = {
  brandId: BrandId;
  tasks: OptimizationTask[];
  statusCounts: Record<OptimizationTaskStatus, number>;
};

export type ReportType = 'weekly' | 'monthly' | 'multi_brand' | 'customer_delivery';

export type ReportStatus = 'pending' | 'generated' | 'failed';

export type ReportDataGap = {
  section: string;
  reason: string;
};

export type SingleBrandReportSnapshot = {
  brand: Pick<BrandDetail, 'brandId' | 'name' | 'industry' | 'status'>;
  metrics: BrandMetricDashboard;
  competitor: Pick<CompetitorDashboard, 'mentionRate' | 'suppressionRate' | 'averageRankGap' | 'highRiskIntents'>;
  citation: Pick<CitationDashboard, 'totalCitations' | 'officialCitationRate' | 'authoritySourceRate' | 'contentCitationRate'>;
  evaluation: Pick<EvaluationDashboard, 'positiveRate' | 'neutralRate' | 'negativeRate' | 'accurateRate'>;
  content: ContentCenterDashboard['coverage'];
  taskProgress: TaskBoardDashboard['statusCounts'];
};

export type MultiBrandReportSnapshot = {
  ranking: BrandMetricRankingItem[];
  strongestPlatforms: Array<{ brandId: BrandId; platformCode: string; totalScore: number }>;
  weakScenarios: Array<{ brandId: BrandId; name: string; reason: string }>;
  highPriorityIssues: Array<{ brandId: BrandId; title: string; source: string }>;
};

export type ReportRecord = {
  id: string;
  brandId: BrandId;
  type: ReportType;
  title: string;
  periodStart: string;
  periodEnd: string;
  status: ReportStatus;
  content: string;
  dataGaps: ReportDataGap[];
  createdBy: string;
  createdAt: string;
  snapshot: SingleBrandReportSnapshot | MultiBrandReportSnapshot;
};

export type ReportInput = {
  type: ReportType;
  title?: string;
  periodStart?: string;
  periodEnd?: string;
};

export type ReportDashboard = {
  brandId: BrandId;
  reports: ReportRecord[];
  latest?: ReportRecord;
};

export type AdvisorRecordType = 'diagnosis' | 'service_plan' | 'review' | 'delivery' | 'service' | 'training' | 'rule_update' | 'note';

export type AdvisorFollowUpStatus = 'todo' | 'doing' | 'done';

export type AdvisorFollowUpItem = {
  id: string;
  title: string;
  owner?: string;
  dueDate?: string;
  status: AdvisorFollowUpStatus;
};

export type AdvisorRecord = {
  id: string;
  brandId: BrandId;
  type: AdvisorRecordType;
  title: string;
  content: string;
  relatedReportId?: string;
  relatedReport?: Pick<ReportRecord, 'id' | 'title' | 'type' | 'periodStart' | 'periodEnd'>;
  followUpItems: AdvisorFollowUpItem[];
  createdBy: string;
  createdAt: string;
};

export type AdvisorRecordInput = {
  type: AdvisorRecordType;
  title: string;
  content: string;
  relatedReportId?: string;
  followUpItems?: Array<Omit<AdvisorFollowUpItem, 'id'> & { id?: string }>;
};

export type AdvisorDashboard = {
  brandId: BrandId;
  records: AdvisorRecord[];
  latestDiagnosis?: AdvisorRecord;
  pendingFollowUps: AdvisorFollowUpItem[];
  relatedReports: Pick<ReportRecord, 'id' | 'title' | 'type' | 'periodStart' | 'periodEnd'>[];
};

export type InnerTestFeedbackType = 'usability' | 'bug' | 'copy' | 'data' | 'workflow' | 'configuration' | 'other';

export type InnerTestFeedbackStatus = 'open' | 'triaged' | 'in_progress' | 'resolved';

export type InnerTestFeedbackSeverity = 'high' | 'medium' | 'low';

export type InnerTestFeedback = {
  id: string;
  brandId: BrandId;
  page: string;
  module: string;
  type: InnerTestFeedbackType;
  severity: InnerTestFeedbackSeverity;
  description: string;
  status: InnerTestFeedbackStatus;
  reporterId: string;
  resolutionNote?: string;
  createdAt: string;
  updatedAt: string;
};

export type InnerTestFeedbackInput = {
  page: string;
  module: string;
  type: InnerTestFeedbackType;
  severity?: InnerTestFeedbackSeverity;
  description: string;
};

export type InnerTestFeedbackUpdateInput = {
  status?: InnerTestFeedbackStatus;
  severity?: InnerTestFeedbackSeverity;
  resolutionNote?: string;
};

export type InnerTestFeedbackDashboard = {
  brandId: BrandId;
  records: InnerTestFeedback[];
  statusCounts: Record<InnerTestFeedbackStatus, number>;
};

export type GeoCanvasNodeType = 'optimization_unit' | 'user_intent' | 'metric' | 'content_strategy';

export type GeoCanvasNode = {
  id: string;
  type: GeoCanvasNodeType;
  sourceId: string;
  title: string;
  subtitle: string;
  status: string;
  metric?: Pick<GEOMetricSnapshot, 'totalScore' | 'sampleCount' | 'insufficientSample'>;
  position: { x: number; y: number };
};

export type GeoCanvasEdge = {
  id: string;
  source: string;
  target: string;
  label: string;
};

export type GeoCanvasWorkspace = {
  brandId: BrandId;
  nodes: GeoCanvasNode[];
  edges: GeoCanvasEdge[];
  optimizationUnits: OptimizationUnit[];
  userIntents: UserIntent[];
  contentStrategies: ContentStrategy[];
  tasks: OptimizationTask[];
  metrics: BrandMetricDashboard;
};

export type MonitoringRunDetail = MonitoringRun & {
  promptText: string;
  response?: AIResponse;
  analysis?: AnalysisResult;
};

export function hasRealMonitoringResponseSample(
  run: Pick<MonitoringRunDetail, 'platformCode' | 'response'>,
): boolean {
  return run.platformCode !== 'mock_ai' && Boolean(run.response?.rawText.trim());
}

export type DashboardNextAction = {
  actionType:
    | 'complete_profile'
    | 'create_monitoring_object'
    | 'collect_real_response'
    | 'prepare_content'
    | 'publish_content'
    | 'review_risk'
    | 'schedule_retest'
    | 'review_results';
  label: string;
  reason: string;
  targetId?: string;
};

export type BeginnerHomeResultSummary = {
  recommendationRate: number;
  averageRank: number | null;
  citationHitRate: number;
  pendingIssueCount: number;
  sampleSize: number;
  rankedSampleSize: number;
};

export type BeginnerHomeDashboard = {
  brandId: BrandId;
  profileCompleteness: Pick<BrandProfile, 'completenessScore' | 'missingFields'>;
  monitoringObjectCount: number;
  realResponseStatus: {
    total: number;
    collected: number;
    pending: number;
    reviewRequired: number;
    failed: number;
  };
  contentTaskStatus: Record<ContentGenerationStatus, number>;
  publishingStatus: {
    totalRecords: number;
    publishedRecords: number;
    failedRecords: number;
    citationCount: number;
    pendingRetestCount: number;
  };
  analysisRisk: {
    total: number;
    high: number;
    byType: Record<AnalysisFindingType, number>;
  };
  resultSummary: BeginnerHomeResultSummary;
  currentSprint?: Pick<VisibilitySprint, 'sprintId' | 'status' | 'currentStep' | 'metricSummary' | 'updatedAt'>;
  nextAction: DashboardNextAction;
};

export type MonitoringObjectTask = Pick<
  OptimizationTask,
  'id' | 'title' | 'status' | 'relatedPromptId' | 'priority' | 'retestRecords'
> & {
  retestStatus: PublishingRecordPerformance['retestStatus'];
};

export type MonitoringObjectDashboard = {
  brandId: BrandId;
  objects: Array<{
    optimizationUnit: Pick<OptimizationUnit, 'id' | 'name' | 'type' | 'priority' | 'enabled'>;
    intents: Array<Pick<UserIntent, 'id' | 'category' | 'text' | 'monitoringFrequency' | 'enabled' | 'platformMetrics'>>;
    prompts: Array<Pick<BrandPrompt, 'id' | 'intentId' | 'text' | 'platformCodes' | 'monitoringFrequency' | 'enabled'>>;
    contentTasks: MonitoringObjectTask[];
  }>;
};

export type ContentOperationTemplate = {
  contentType: GrowthContentType | string;
  title: string;
  targetPlatforms: string[];
};

export type ContentOperationDashboard = {
  brandId: BrandId;
  tasks: ContentGenerationTask[];
  templates: ContentOperationTemplate[];
  materials: BrandMediaAsset[];
  assets: ContentAssetPageItem[];
  publishingPreparation?: SprintPublishingPreparationDashboard;
  publishingStats: PublishingChannelStats[];
  retest?: Pick<
    SprintRetestTrendDashboard,
    'plannedTaskCount' | 'completedRetestCount' | 'improvedRetestCount' | 'items' | 'updatedAt'
  >;
};

export type PublishingOperationDashboard = {
  brandId: BrandId;
  accounts: OwnedMediaAccount[];
  platformRules: MediaPlatformRule[];
  records: PublishingRecord[];
  citations: CitationSource[];
  performance: PublishingRecordPerformance[];
  channelStats: PublishingChannelStats[];
  pendingRetestItems: SprintRetestTrendItem[];
};

export type AnalysisDiagnosisDashboard = AnalysisWorkbenchDashboard & {
  findingGroups: Record<AnalysisFindingType, AnalysisFinding[]>;
};

export type MonitoringRunInput = {
  promptId: string;
  platformCode: string;
};

export type ManualResponseInput = {
  rawText: string;
  citations?: string[];
  modelName?: string;
};

export type UserSummary = {
  userId: string;
  name: string;
  email: string;
  status: UserStatus;
};

export type Organization = {
  id: string;
  name: string;
  status: OrganizationStatus;
  createdAt: string;
  updatedAt: string;
};

export type Role = {
  id: string;
  code: UserBrandRole;
  name: string;
  scope: RoleScope;
  permissions: string[];
  createdAt: string;
  updatedAt: string;
};

export type OrganizationMember = {
  id: string;
  organizationId: string;
  userId: string;
  roleId: string;
  status: OrganizationMemberStatus;
  organization: Organization;
  role: Role;
  createdAt: string;
  updatedAt: string;
};

export type UserBrandPermission = {
  id: string;
  userId: string;
  brandId: BrandId;
  role: UserBrandRole;
};

export type AccessibleBrand = BrandWorkspaceSummary & {
  role: UserBrandRole;
};

export type DeniedAccessLog = {
  userId: string;
  brandId: BrandId;
  reason: string;
  requestedAt: string;
};

export type AuditLogResult = 'success' | 'failure' | 'denied';

export type AuditLog = {
  id: string;
  brandId?: BrandId | null;
  organizationId?: string | null;
  actorUserId?: string | null;
  action: string;
  resourceType: string;
  resourceId?: string | null;
  result: AuditLogResult;
  errorCode?: string | null;
  metadata: Record<string, unknown>;
  createdAt: string;
};

export type AuditLogInput = Omit<AuditLog, 'id' | 'createdAt'> & {
  createdAt?: string;
};

export type AuditLogFilter = {
  brandId?: BrandId;
  organizationId?: string;
  action?: string;
  resourceType?: string;
  result?: AuditLogResult;
  from?: string;
  to?: string;
};
