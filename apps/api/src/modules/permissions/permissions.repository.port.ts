import type {
  AccessibleBrand,
  AdvisorDashboard,
  AdvisorRecord,
  AdvisorRecordInput,
  InnerTestFeedback,
  InnerTestFeedbackDashboard,
  InnerTestFeedbackInput,
  InnerTestFeedbackUpdateInput,
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
  MeasurementAttributionInput,
  MeasurementAttributionRecord,
  AnalysisFinding,
  AnalysisFindingInput,
  AnalysisResult,
  AnalysisResultInput,
  AnalysisWorkbenchDashboard,
  BrandDetail,
  BrandId,
  BrandMediaAsset,
  BrandMediaAssetInput,
  BrandMetricDashboard,
  BrandMetricRankingItem,
  BrandMutationInput,
  BrandProfile,
  BrandProfileInput,
  BrandProfileLibrary,
  BrandProfileLibraryInput,
  BrandPrompt,
  BrandPromptInput,
  BrandStandardAnswer,
  BrandStandardAnswerInput,
  BrandStatus,
  BrandWorkspaceSnapshot,
  BrowserConnectionSession,
  BrowserConnectionStartInput,
  BrowserConnectionStatusInput,
  CitationDashboard,
  CitationSource,
  Competitor,
  CompetitorCandidate,
  CompetitorCandidateConfirmationResult,
  CompetitorCandidateDecisionInput,
  CompetitorCandidateEvidenceInput,
  CompetitorDashboard,
  CompetitorDiscoveryCandidatesQuery,
  CompetitorDiscoveryRun,
  CompetitorDiscoveryRunInput,
  CompetitorInput,
  ContentAsset,
  ContentAssetFilter,
  ContentAssetInput,
  ContentAssetPageItem,
  CreateTechnicalAssetInput,
  ContentCenterDashboard,
  ContentExportRecord,
  ContentGenerationCompletionInput,
  ContentGenerationFailureInput,
  ContentGenerationRetryInput,
  ContentGenerationTaskInput,
  GrowthOptimizationContentTaskInput,
  ContentGenerationStepUpdateInput,
  ContentGenerationWorkspace,
  ContentStrategy,
  ContentStrategyFilter,
  ContentStrategyInput,
  ContentVersionInput,
  DeniedAccessLog,
  OrganizationMember,
  EvaluationDashboard,
  GeoCanvasWorkspace,
  GrowthOptimizationPlanConfirmInput,
  GrowthOptimizationPlanConfirmationResult,
  GrowthOptimizationPlan,
  GrowthOptimizationPlanInput,
  GrowthOptimizationWorkspace,
  KnowledgeSource,
  KnowledgeSourceInput,
  KnowledgeChunk,
  KnowledgeChunkInput,
  ManualTestAnswerBatchInput,
  ManualTestAnswerBatchResult,
  ManualResponseInput,
  MediaPlatformRule,
  MediaPlatformRuleInput,
  MonitoringRunDetail,
  MonitoringRunExecutionUpdateInput,
  MonitoringRunInput,
  OptimizationTask,
  OptimizationTaskInput,
  OptimizationTaskUpdateInput,
  OptimizationUnit,
  OptimizationUnitInput,
  OwnedMediaAccount,
  PlatformConfig,
  PlatformConfigInput,
  PlatformValidationResult,
  PromptBatchGenerateInput,
  PromptTemplate,
  PromptTemplateInput,
  PublishingAccount,
  PublishingAccountInput,
  PublishingChannelStats,
  PublishingDashboard,
  PublishingEntryPayload,
  PublishingExecutionStatusInput,
  PublishingModeInput,
  PublishingRecord,
  PublishingRecordConfirmationInput,
  PublishingRecordInput,
  ReportDashboard,
  ReportInput,
  ReportRecord,
  ReportScopePreview,
  RetestPlanInput,
  RetestResultInput,
  TaskBoardDashboard,
  TestQuestionCandidate,
  TestQuestionCandidateInput,
  TestQuestionCandidateListQuery,
  TestQuestionCandidateSelectionInput,
  TestQuestionCandidateUpdateInput,
  TestPlan,
  TestPlanDuplicateInput,
  TestPlanExecutionResult,
  TestPlanInput,
  TestPlanTemplate,
  TestPlanTemplateApplicationInput,
  TestTheme,
  TestThemeInput,
  TechnicalAssetRecord,
  UserIntent,
  UserIntentInput,
  UserSummary,
  VisibilitySprint,
  VisibilitySprintMetricSummary,
  VisibilitySprintStatus,
  VisibilitySprintStep,
  VisibilitySprintStepCode
} from '@geo-platform/shared-types';
import type { AIPlatformRuntimeConfig } from '../platforms/adapters/ai-platform.adapter';

export const PERMISSIONS_REPOSITORY = Symbol('PERMISSIONS_REPOSITORY');

type MaybePromise<T> = T | Promise<T>;

export type VisibilitySprintCreateInput = {
  title: string;
  goal: string;
  status?: VisibilitySprintStatus;
  currentStep?: VisibilitySprintStepCode;
  steps?: VisibilitySprintStep[];
  metricSummary?: Partial<VisibilitySprintMetricSummary>;
  relatedQuestionIds?: string[];
  relatedTestPlanIds?: string[];
  relatedMonitoringRunIds?: string[];
  relatedStandardAnswerIds?: string[];
  relatedContentTaskIds?: string[];
  relatedPublishingRecordIds?: string[];
  relatedRetestTaskIds?: string[];
};

export type VisibilitySprintStepUpdateInput = {
  status?: VisibilitySprintStatus;
  currentStep: VisibilitySprintStepCode;
  steps?: VisibilitySprintStep[];
};

export type VisibilitySprintMetricUpdateInput = Partial<VisibilitySprintMetricSummary>;

export type VisibilitySprintRelationsUpdateInput = Partial<
  Pick<
    VisibilitySprint,
    | 'relatedQuestionIds'
    | 'relatedTestPlanIds'
    | 'relatedMonitoringRunIds'
    | 'relatedStandardAnswerIds'
    | 'relatedContentTaskIds'
    | 'relatedPublishingRecordIds'
    | 'relatedRetestTaskIds'
  >
>;

export type BrandStandardAnswerUpdateInput = Partial<BrandStandardAnswerInput> & {
  reviewedBy?: string;
  reviewedAt?: string;
};

export interface PermissionsRepositoryPort {
  findUser(userId: string): UserSummary | null;
  listOrganizationMemberships(userId: string): OrganizationMember[];
  listAccessibleBrands(userId: string): MaybePromise<AccessibleBrand[]>;
  canAccessBrand(userId: string, brandId: BrandId): boolean;
  listAccessibleBrandDetails(userId: string): BrandDetail[];
  findAccessibleBrandDetail?(userId: string, brandId: BrandId): MaybePromise<BrandDetail | null>;
  getBrandWorkspaceSnapshot(userId: string, brandId: BrandId): BrandWorkspaceSnapshot | null;
  createBrand(userId: string, input: BrandMutationInput): BrandDetail;
  updateBrand(userId: string, brandId: BrandId, input: Partial<BrandMutationInput>): BrandDetail | null;
  updateBrandStatus(userId: string, brandId: BrandId, status: BrandStatus): BrandDetail | null;
  getBrandProfileLibrary?(userId: string, brandId: BrandId): MaybePromise<BrandProfileLibrary | null>;
  saveBrandProfileLibrary?(userId: string, brandId: BrandId, input: BrandProfileLibraryInput): MaybePromise<BrandProfileLibrary | null>;
  getBrandProfile(userId: string, brandId: BrandId): BrandProfile | null;
  saveBrandProfile(userId: string, brandId: BrandId, input: BrandProfileInput): BrandProfile | null;
  listKnowledgeSources(userId: string, brandId: BrandId): KnowledgeSource[] | null;
  createKnowledgeSource(userId: string, brandId: BrandId, input: KnowledgeSourceInput): KnowledgeSource | null;
  updateKnowledgeSourceStatus(userId: string, brandId: BrandId, sourceId: string, status: KnowledgeSource['status'], errorMessage?: string): KnowledgeSource | null;
  listKnowledgeChunks(userId: string, brandId: BrandId, sourceId?: string): MaybePromise<KnowledgeChunk[] | null>;
  searchKnowledgeChunks(userId: string, brandId: BrandId, query: string, limit: number): MaybePromise<KnowledgeChunk[] | null>;
  appendKnowledgeChunkVersion(userId: string, brandId: BrandId, sourceId: string, chunks: KnowledgeChunkInput[]): MaybePromise<KnowledgeChunk[] | null>;
  listBrandMediaAssets?(userId: string, brandId: BrandId): MaybePromise<BrandMediaAsset[] | null>;
  createBrandMediaAsset?(userId: string, brandId: BrandId, input: BrandMediaAssetInput): MaybePromise<BrandMediaAsset | null>;
  updateBrandMediaAsset?(userId: string, brandId: BrandId, assetId: string, input: BrandMediaAssetInput): MaybePromise<BrandMediaAsset | null>;
  listOptimizationUnits(userId: string, brandId: BrandId): OptimizationUnit[] | null;
  getOptimizationUnit(userId: string, brandId: BrandId, unitId: string): OptimizationUnit | null;
  createOptimizationUnit(userId: string, brandId: BrandId, input: OptimizationUnitInput): OptimizationUnit | null;
  updateOptimizationUnit(userId: string, brandId: BrandId, unitId: string, input: Partial<OptimizationUnitInput>): OptimizationUnit | null;
  listTestThemes(userId: string, brandId: BrandId): TestTheme[] | null;
  createTestTheme(userId: string, brandId: BrandId, input: TestThemeInput): TestTheme | null;
  updateTestTheme(userId: string, brandId: BrandId, themeId: string, input: Partial<TestThemeInput>): TestTheme | null;
  listTestQuestionCandidates(userId: string, brandId: BrandId, query?: TestQuestionCandidateListQuery): TestQuestionCandidate[] | null;
  createTestQuestionCandidate(userId: string, brandId: BrandId, input: TestQuestionCandidateInput): TestQuestionCandidate | null;
  updateTestQuestionCandidate(userId: string, brandId: BrandId, candidateId: string, input: TestQuestionCandidateUpdateInput): TestQuestionCandidate | null;
  updateTestQuestionCandidateSelection(userId: string, brandId: BrandId, input: TestQuestionCandidateSelectionInput): TestQuestionCandidate[] | null;
  listTestPlans(userId: string, brandId: BrandId): TestPlan[] | null;
  createTestPlan(userId: string, brandId: BrandId, input: TestPlanInput): TestPlan | null;
  executeTestPlan(userId: string, brandId: BrandId, planId: string): TestPlanExecutionResult | null;
  listTestPlanTemplates(userId: string, brandId: BrandId): TestPlanTemplate[] | null;
  applyTestPlanTemplate(userId: string, brandId: BrandId, input: TestPlanTemplateApplicationInput): TestPlan | null;
  duplicateTestPlan(userId: string, brandId: BrandId, planId: string, input?: TestPlanDuplicateInput): TestPlan | null;
  listUserIntents(userId: string, brandId: BrandId): UserIntent[] | null;
  createUserIntent(userId: string, brandId: BrandId, input: UserIntentInput): UserIntent | null;
  updateUserIntent(userId: string, brandId: BrandId, intentId: string, input: Partial<UserIntentInput>): UserIntent | null;
  listPromptTemplates(): PromptTemplate[];
  createPromptTemplate(input: PromptTemplateInput): PromptTemplate;
  listBrandPrompts(userId: string, brandId: BrandId): BrandPrompt[] | null;
  batchGenerateBrandPrompts(userId: string, brandId: BrandId, input: PromptBatchGenerateInput): BrandPrompt[] | null;
  updateBrandPrompt(userId: string, brandId: BrandId, promptId: string, input: Partial<BrandPromptInput>): BrandPrompt | null;
  listPlatformConfigs(userId: string, brandId: BrandId): PlatformConfig[] | null;
  getPlatformRuntimeConfigById(userId: string, brandId: BrandId, platformId: string): AIPlatformRuntimeConfig | null;
  getPlatformRuntimeConfig(userId: string, brandId: BrandId, platformCode: string): AIPlatformRuntimeConfig | null;
  savePlatformValidationResult(userId: string, brandId: BrandId, platformId: string, result: PlatformValidationResult): PlatformValidationResult | null;
  createPlatformConfig(userId: string, brandId: BrandId, input: PlatformConfigInput): PlatformConfig | null;
  updatePlatformConfig(userId: string, brandId: BrandId, platformId: string, input: Partial<PlatformConfigInput>): PlatformConfig | null;
  validatePlatformConfig(userId: string, brandId: BrandId, platformId: string): PlatformValidationResult | null;
  listBrowserConnectionSessions(userId: string, brandId: BrandId): BrowserConnectionSession[] | null;
  startBrowserConnectionSession(userId: string, brandId: BrandId, input: BrowserConnectionStartInput): BrowserConnectionSession | null;
  updateBrowserConnectionSession(userId: string, brandId: BrandId, sessionId: string, input: BrowserConnectionStatusInput): BrowserConnectionSession | null;
  listAIPlatformCallAudits(userId: string, brandId: BrandId): AIPlatformCallAudit[] | null;
  createAIPlatformCallAudit(userId: string, brandId: BrandId, input: AIPlatformCallAuditInput): AIPlatformCallAudit | null;
  updateAIPlatformCallAudit(userId: string, brandId: BrandId, auditId: string, input: AIPlatformCallAuditUpdateInput): AIPlatformCallAudit | null;
  listAsyncJobs(userId: string, brandId: BrandId, status?: AsyncJobStatus): AsyncJob[] | null;
  getAsyncJob(userId: string, brandId: BrandId, jobId: string): AsyncJob | null;
  createAsyncJob(userId: string, brandId: BrandId, input: AsyncJobInput): AsyncJob | null;
  updateAsyncJob(userId: string, brandId: BrandId, jobId: string, input: AsyncJobUpdateInput): AsyncJob | null;
  listLLMTaskRuns(userId: string, brandId: BrandId): LLMTaskRun[] | null;
  createLLMTaskRun(userId: string, brandId: BrandId, input: LLMTaskRunInput): LLMTaskRun | null;
  listVisibilitySprints?(userId: string, brandId: BrandId): MaybePromise<VisibilitySprint[] | null>;
  getVisibilitySprint?(userId: string, brandId: BrandId, sprintId: string): MaybePromise<VisibilitySprint | null>;
  getCurrentVisibilitySprint?(userId: string, brandId: BrandId): MaybePromise<VisibilitySprint | null>;
  createVisibilitySprint?(userId: string, brandId: BrandId, input: VisibilitySprintCreateInput): MaybePromise<VisibilitySprint | null>;
  updateVisibilitySprintStep?(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintStepUpdateInput): MaybePromise<VisibilitySprint | null>;
  updateVisibilitySprintMetrics?(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintMetricUpdateInput): MaybePromise<VisibilitySprint | null>;
  updateVisibilitySprintRelations?(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintRelationsUpdateInput): MaybePromise<VisibilitySprint | null>;
  listBrandStandardAnswers?(userId: string, brandId: BrandId, questionId?: string): MaybePromise<BrandStandardAnswer[] | null>;
  getBrandStandardAnswer?(userId: string, brandId: BrandId, answerId: string): MaybePromise<BrandStandardAnswer | null>;
  createBrandStandardAnswer?(userId: string, brandId: BrandId, input: BrandStandardAnswerInput): MaybePromise<BrandStandardAnswer | null>;
  updateBrandStandardAnswer?(userId: string, brandId: BrandId, answerId: string, input: BrandStandardAnswerUpdateInput): MaybePromise<BrandStandardAnswer | null>;
  listMonitoringRuns(userId: string, brandId: BrandId): MonitoringRunDetail[] | null;
  getMeasurementAttribution?(userId: string, brandId: BrandId): MaybePromise<MeasurementAttributionRecord | null>;
  saveMeasurementAttribution?(userId: string, brandId: BrandId, input: MeasurementAttributionInput): MaybePromise<MeasurementAttributionRecord | null>;
  getMonitoringRun(userId: string, brandId: BrandId, runId: string): MonitoringRunDetail | null;
  getAnalysisResult(userId: string, brandId: BrandId, runId: string): AnalysisResult | null;
  parseAnalysisResult(userId: string, brandId: BrandId, runId: string): AnalysisResult | null;
  updateAnalysisResult(userId: string, brandId: BrandId, runId: string, input: AnalysisResultInput): AnalysisResult | null;
  getBrandMetricDashboard(userId: string, brandId: BrandId): BrandMetricDashboard | null;
  getGrowthOptimizationWorkspace(userId: string, brandId: BrandId): GrowthOptimizationWorkspace | null;
  generateGrowthOptimizationPlan(userId: string, brandId: BrandId, sourceTestPlanId?: string): GrowthOptimizationPlan | null;
  createGrowthOptimizationPlan(userId: string, brandId: BrandId, input: GrowthOptimizationPlanInput): GrowthOptimizationPlan | null;
  confirmGrowthOptimizationPlan(userId: string, brandId: BrandId, planId: string, input?: GrowthOptimizationPlanConfirmInput): GrowthOptimizationPlanConfirmationResult | null;
  listBrandMetricRanking(userId: string, sortBy?: keyof Pick<BrandMetricRankingItem, 'totalScore' | 'mentionRate' | 'top3Rate' | 'positiveRate' | 'periodChange'>): BrandMetricRankingItem[];
  listCompetitors(userId: string, brandId: BrandId): MaybePromise<Competitor[] | null>;
  createCompetitor(userId: string, brandId: BrandId, input: CompetitorInput): MaybePromise<Competitor | null>;
  updateCompetitor(userId: string, brandId: BrandId, competitorId: string, input: Partial<CompetitorInput>): MaybePromise<Competitor | null>;
  getCompetitorDashboard(userId: string, brandId: BrandId): MaybePromise<CompetitorDashboard | null>;
  createCompetitorDiscoveryRun(userId: string, brandId: BrandId, input?: CompetitorDiscoveryRunInput): MaybePromise<CompetitorDiscoveryRun | null>;
  listCompetitorDiscoveryCandidates(userId: string, brandId: BrandId, runId: string, query?: CompetitorDiscoveryCandidatesQuery): MaybePromise<CompetitorCandidate[] | null>;
  listCompetitorCandidates(userId: string, brandId: BrandId): MaybePromise<CompetitorCandidate[] | null>;
  syncCompetitorCandidateEvidence(userId: string, brandId: BrandId, evidence: CompetitorCandidateEvidenceInput[]): MaybePromise<CompetitorCandidate[] | null>;
  decideCompetitorCandidate(userId: string, brandId: BrandId, candidateId: string, input: CompetitorCandidateDecisionInput): MaybePromise<CompetitorCandidateConfirmationResult | null>;
  getCitationDashboard(userId: string, brandId: BrandId): MaybePromise<CitationDashboard | null>;
  getCitationSource?(userId: string, brandId: BrandId, citationId: string): MaybePromise<CitationSource | null>;
  saveCitationAbsorptionEvidence?(userId: string, brandId: BrandId, citationId: string, evidence: import('@geo-platform/shared-types').CitationAbsorptionEvidence[]): MaybePromise<CitationSource | null>;
  reviewCitationAbsorptionEvidence?(userId: string, brandId: BrandId, citationId: string, evidenceId: string): MaybePromise<CitationSource | null>;
  bindCitationContentAsset(userId: string, brandId: BrandId, citationId: string, input: ContentAssetInput): ContentAsset | null;
  createCitationEnhancementStrategy(userId: string, brandId: BrandId, citationId: string): ContentStrategy | null;
  getEvaluationDashboard(userId: string, brandId: BrandId): EvaluationDashboard | null;
  createEvaluationCorrectionStrategy(userId: string, brandId: BrandId, issueId: string): ContentStrategy | null;
  updateBrandKnowledgeFromEvaluationIssue(userId: string, brandId: BrandId, issueId: string): BrandProfile | null;
  getGeoCanvasWorkspace(userId: string, brandId: BrandId): GeoCanvasWorkspace | null;
  createContentStrategy(userId: string, brandId: BrandId, input: ContentStrategyInput): ContentStrategy | null;
  getContentCenterDashboard(userId: string, brandId: BrandId): ContentCenterDashboard | null;
  listContentAssets(userId: string, brandId: BrandId, filter?: ContentAssetFilter): ContentAsset[] | null;
  createContentAsset(userId: string, brandId: BrandId, input: ContentAssetInput): ContentAsset | null;
  createTechnicalContentAsset(userId: string, brandId: BrandId, input: CreateTechnicalAssetInput): MaybePromise<TechnicalAssetRecord | null>;
  updateContentAsset(userId: string, brandId: BrandId, assetId: string, input: ContentAssetInput): ContentAsset | null;
  listContentAssetPageItems?(userId: string, brandId: BrandId, filter?: ContentAssetFilter): MaybePromise<ContentAssetPageItem[] | null>;
  listContentStrategies(userId: string, brandId: BrandId, filter?: ContentStrategyFilter): ContentStrategy[] | null;
  generateContentStrategies(userId: string, brandId: BrandId): ContentStrategy[] | null;
  getContentGenerationWorkspace(userId: string, brandId: BrandId, taskId?: string): ContentGenerationWorkspace | null;
  createContentGenerationTask(userId: string, brandId: BrandId, input: ContentGenerationTaskInput): ContentGenerationWorkspace | null;
  createContentGenerationTasksFromGrowthPlan(userId: string, brandId: BrandId, input: GrowthOptimizationContentTaskInput): ContentGenerationWorkspace | null;
  updateContentGenerationStep(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationStepUpdateInput): ContentGenerationWorkspace | null;
  completeContentGenerationTask(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationCompletionInput): ContentGenerationWorkspace | null;
  recordContentGenerationFailure(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationFailureInput): ContentGenerationWorkspace | null;
  retryContentGenerationTask(userId: string, brandId: BrandId, taskId: string, input?: ContentGenerationRetryInput): ContentGenerationWorkspace | null;
  saveContentVersion(userId: string, brandId: BrandId, taskId: string, input: ContentVersionInput): ContentGenerationWorkspace | null;
  exportContentMarkdown(userId: string, brandId: BrandId, taskId: string, versionId?: string): ContentExportRecord | null;
  getPublishingEntryPayload(userId: string, brandId: BrandId, taskId: string, versionId?: string): PublishingEntryPayload | null;
  getPublishingDashboard(userId: string, brandId: BrandId): PublishingDashboard | null;
  listOwnedMediaAccounts?(userId: string, brandId: BrandId): MaybePromise<OwnedMediaAccount[] | null>;
  listMediaPlatformRules?(userId: string, brandId: BrandId): MaybePromise<MediaPlatformRule[] | null>;
  createMediaPlatformRule?(userId: string, brandId: BrandId, input: MediaPlatformRuleInput): MaybePromise<MediaPlatformRule | null>;
  updateMediaPlatformRule?(userId: string, brandId: BrandId, platform: string, input: Partial<MediaPlatformRuleInput>): MaybePromise<MediaPlatformRule | null>;
  getPublishingChannelStats?(userId: string, brandId: BrandId): MaybePromise<PublishingChannelStats[] | null>;
  connectPublishingAccount(userId: string, brandId: BrandId, input: PublishingAccountInput): PublishingAccount | null;
  reauthorizePublishingAccount(userId: string, brandId: BrandId, accountId: string): PublishingAccount | null;
  updatePublishingAccountStatus(userId: string, brandId: BrandId, accountId: string, input: Pick<PublishingAccountInput, 'authStatus' | 'errorMessage'>): PublishingAccount | null;
  updatePublishingAccountMode(userId: string, brandId: BrandId, accountId: string, input: PublishingModeInput): PublishingAccount | null;
  createPublishingRecord(userId: string, brandId: BrandId, input: PublishingRecordInput): PublishingRecord | null;
  confirmPublishingRecord(userId: string, brandId: BrandId, recordId: string, input: PublishingRecordConfirmationInput): PublishingRecord | null;
  updatePublishingRecordStatus(userId: string, brandId: BrandId, recordId: string, input: PublishingExecutionStatusInput): PublishingRecord | null;
  listAnalysisFindings?(userId: string, brandId: BrandId): MaybePromise<AnalysisFinding[] | null>;
  createAnalysisFinding?(userId: string, brandId: BrandId, input: AnalysisFindingInput): MaybePromise<AnalysisFinding | null>;
  updateAnalysisFinding?(userId: string, brandId: BrandId, findingId: string, input: Partial<AnalysisFindingInput>): MaybePromise<AnalysisFinding | null>;
  getAnalysisWorkbenchDashboard?(userId: string, brandId: BrandId): MaybePromise<AnalysisWorkbenchDashboard | null>;
  createOptimizationTask(userId: string, brandId: BrandId, input: OptimizationTaskInput): OptimizationTask | null;
  getTaskBoard(userId: string, brandId: BrandId): TaskBoardDashboard | null;
  updateOptimizationTask(userId: string, brandId: BrandId, taskId: string, input: OptimizationTaskUpdateInput): OptimizationTask | null;
  planOptimizationTaskRetest(userId: string, brandId: BrandId, taskId: string, input: RetestPlanInput): OptimizationTask | null;
  bindOptimizationTaskRetestRun(userId: string, brandId: BrandId, taskId: string, recordId: string, retestRunId: string): OptimizationTask | null;
  completeOptimizationTaskRetest(userId: string, brandId: BrandId, taskId: string, recordId: string, input: RetestResultInput): OptimizationTask | null;
  getReportDashboard(userId: string, brandId: BrandId): ReportDashboard | null;
  previewReport(userId: string, brandId: BrandId, input: ReportInput): MaybePromise<ReportScopePreview[] | null>;
  createReport(userId: string, brandId: BrandId, input: ReportInput): ReportRecord | null;
  getReport(userId: string, brandId: BrandId, reportId: string): ReportRecord | null;
  getAdvisorDashboard(userId: string, brandId: BrandId): AdvisorDashboard | null;
  createAdvisorRecord(userId: string, brandId: BrandId, input: AdvisorRecordInput): AdvisorRecord | null;
  getInnerTestFeedbackDashboard(userId: string, brandId: BrandId): MaybePromise<InnerTestFeedbackDashboard | null>;
  createInnerTestFeedback(userId: string, brandId: BrandId, input: InnerTestFeedbackInput): MaybePromise<InnerTestFeedback | null>;
  updateInnerTestFeedback(userId: string, brandId: BrandId, feedbackId: string, input: InnerTestFeedbackUpdateInput): MaybePromise<InnerTestFeedback | null>;
  createMonitoringRun(userId: string, brandId: BrandId, input: MonitoringRunInput): MonitoringRunDetail | null;
  updateMonitoringRunExecution(userId: string, brandId: BrandId, runId: string, input: MonitoringRunExecutionUpdateInput): MonitoringRunDetail | null;
  addManualResponse(userId: string, brandId: BrandId, runId: string, input: ManualResponseInput): MonitoringRunDetail | null;
  submitManualTestAnswers(userId: string, brandId: BrandId, input: ManualTestAnswerBatchInput): ManualTestAnswerBatchResult | null;
  listDeniedAccessLogs(userId: string): DeniedAccessLog[];
  recordDeniedAccess(log: DeniedAccessLog): void;
  createAuditLog(userId: string, input: AuditLogInput): AuditLog;
  listAuditLogs(userId: string, filter?: AuditLogFilter): AuditLog[];
}
