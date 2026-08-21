import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
  AnalysisFinding,
  AnalysisWorkbenchDashboard,
  AnalysisResult,
  AnalysisResultInput,
  BrandMetricDashboard,
  BrandMetricRankingItem,
  BrandMediaAsset,
  BrandProfileLibrary,
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
  CitationDashboard,
  CitationAbsorptionEvidence,
  CitationSource,
  ContentAsset,
  ContentAssetFilter,
  ContentAssetInput,
  ContentAssetPageItem,
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
  EvaluationDashboard,
  GeoCanvasWorkspace,
  GrowthOptimizationPlanConfirmInput,
  GrowthOptimizationPlanConfirmationResult,
  GrowthOptimizationPlan,
  GrowthOptimizationPlanInput,
  GrowthOptimizationWorkspace,
  BrandDetail,
  BrandId,
  BrandMutationInput,
  BrandProfile,
  BrandProfileInput,
  BrandPrompt,
  BrandPromptInput,
  BrandStatus,
  BrandWorkspaceSnapshot,
  BrowserConnectionSession,
  BrowserConnectionStartInput,
  BrowserConnectionStatusInput,
  BrowserResponseCaptureInput,
  BrowserResponseCaptureResult,
  DeniedAccessLog,
  KnowledgeSource,
  KnowledgeSourceInput,
  KnowledgeChunk,
  KnowledgeChunkInput,
  ManualResponseInput,
  MeasurementAttributionInput,
  MeasurementAttributionRecord,
  MediaPlatformRule,
  ManualTestAnswerBatchInput,
  ManualTestAnswerBatchResult,
  MonitoringRunDetail,
  MonitoringRunExecutionUpdateInput,
  MonitoringRunInput,
  PlatformConfig,
  PlatformConfigInput,
  PlatformValidationResult,
  PublishingAccount,
  PublishingAccountInput,
  PublishingModeInput,
  PublishingDashboard,
  PublishingEntryPayload,
  PublishingExecutionStatusInput,
  PublishingRecord,
  PublishingRecordConfirmationInput,
  PublishingRecordInput,
  PromptBatchGenerateInput,
  PromptTemplate,
  PromptTemplateInput,
  OptimizationTask,
  OptimizationTaskInput,
  OptimizationTaskUpdateInput,
  RetestPlanInput,
  RetestResultInput,
  ReportDashboard,
  ReportInput,
  ReportRecord,
  ReportScopePreview,
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
  UserIntent,
  UserIntentInput,
  VisibilitySprint,
  BrandStandardAnswer,
  BrandStandardAnswerInput,
  OptimizationUnit,
  OptimizationUnitInput,
  OwnedMediaAccount,
  PublishingChannelStats,
  UserSummary
} from '@geo-platform/shared-types';
import { BrowserSessionTransitionError } from '../platforms/browser-session-state';
import {
  PERMISSIONS_REPOSITORY,
  type PermissionsRepositoryPort,
  type VisibilitySprintCreateInput,
  type VisibilitySprintMetricUpdateInput,
  type VisibilitySprintRelationsUpdateInput,
  type VisibilitySprintStepUpdateInput,
  type BrandStandardAnswerUpdateInput
} from './permissions.repository.port';
import type { AIPlatformRuntimeConfig } from '../platforms/adapters/ai-platform.adapter';
import { buildBrandCapabilitySummary } from '../../common/access-control/brand-access.policy';

@Injectable()
export class PermissionsService {
  constructor(@Inject(PERMISSIONS_REPOSITORY) private readonly permissionsRepository: PermissionsRepositoryPort) {}

  getCurrentUser(userId: string): UserSummary | null {
    return this.permissionsRepository.findUser(userId);
  }

  async listAccessibleBrands(userId: string): Promise<AccessibleBrand[]> {
    const brands = await this.permissionsRepository.listAccessibleBrands(userId);
    return brands.map((brand) => ({
      ...brand,
      capabilities: buildBrandCapabilitySummary(brand.role)
    }));
  }

  listAccessibleBrandDetails(userId: string): BrandDetail[] {
    return this.permissionsRepository.listAccessibleBrandDetails(userId);
  }

  async getAccessibleBrandOrganizationId(userId: string, brandId: BrandId): Promise<string | null> {
    const brand = this.permissionsRepository.findAccessibleBrandDetail
      ? await this.permissionsRepository.findAccessibleBrandDetail(userId, brandId)
      : null;
    return brand?.organizationId ?? null;
  }

  getBrandWorkspaceSnapshot(userId: string, brandId: BrandId): BrandWorkspaceSnapshot | null {
    return this.permissionsRepository.getBrandWorkspaceSnapshot(userId, brandId);
  }

  createBrand(userId: string, input: BrandMutationInput): BrandDetail {
    return this.permissionsRepository.createBrand(userId, input);
  }

  updateBrand(userId: string, brandId: BrandId, input: Partial<BrandMutationInput>): BrandDetail | null {
    return this.permissionsRepository.updateBrand(userId, brandId, input);
  }

  updateBrandStatus(userId: string, brandId: BrandId, status: BrandStatus): BrandDetail | null {
    return this.permissionsRepository.updateBrandStatus(userId, brandId, status);
  }

  getBrandProfile(userId: string, brandId: BrandId): BrandProfile | null {
    return this.permissionsRepository.getBrandProfile(userId, brandId);
  }

  async getBrandProfileLibrary(userId: string, brandId: BrandId): Promise<BrandProfileLibrary | null> {
    return this.permissionsRepository.getBrandProfileLibrary
      ? await this.permissionsRepository.getBrandProfileLibrary(userId, brandId)
      : null;
  }

  async listBrandMediaAssets(userId: string, brandId: BrandId): Promise<BrandMediaAsset[] | null> {
    return this.permissionsRepository.listBrandMediaAssets
      ? await this.permissionsRepository.listBrandMediaAssets(userId, brandId)
      : null;
  }

  saveBrandProfile(userId: string, brandId: BrandId, input: BrandProfileInput): BrandProfile | null {
    return this.permissionsRepository.saveBrandProfile(userId, brandId, input);
  }

  listKnowledgeSources(userId: string, brandId: BrandId): KnowledgeSource[] | null {
    return this.permissionsRepository.listKnowledgeSources(userId, brandId);
  }

  createKnowledgeSource(userId: string, brandId: BrandId, input: KnowledgeSourceInput): KnowledgeSource | null {
    return this.permissionsRepository.createKnowledgeSource(userId, brandId, input);
  }

  updateKnowledgeSourceStatus(
    userId: string,
    brandId: BrandId,
    sourceId: string,
    status: KnowledgeSource['status'],
    errorMessage?: string
  ): KnowledgeSource | null {
    return this.permissionsRepository.updateKnowledgeSourceStatus(userId, brandId, sourceId, status, errorMessage);
  }

  async listKnowledgeChunks(userId: string, brandId: BrandId, sourceId?: string): Promise<KnowledgeChunk[] | null> {
    return this.permissionsRepository.listKnowledgeChunks(userId, brandId, sourceId);
  }

  async searchKnowledgeChunks(userId: string, brandId: BrandId, query: string, limit: number): Promise<KnowledgeChunk[] | null> {
    return this.permissionsRepository.searchKnowledgeChunks(userId, brandId, query, limit);
  }

  async appendKnowledgeChunkVersion(userId: string, brandId: BrandId, sourceId: string, chunks: KnowledgeChunkInput[]): Promise<KnowledgeChunk[] | null> {
    return this.permissionsRepository.appendKnowledgeChunkVersion(userId, brandId, sourceId, chunks);
  }

  listOptimizationUnits(userId: string, brandId: BrandId): OptimizationUnit[] | null {
    return this.permissionsRepository.listOptimizationUnits(userId, brandId);
  }

  getOptimizationUnit(userId: string, brandId: BrandId, unitId: string): OptimizationUnit | null {
    return this.permissionsRepository.getOptimizationUnit(userId, brandId, unitId);
  }

  createOptimizationUnit(userId: string, brandId: BrandId, input: OptimizationUnitInput): OptimizationUnit | null {
    return this.permissionsRepository.createOptimizationUnit(userId, brandId, input);
  }

  updateOptimizationUnit(
    userId: string,
    brandId: BrandId,
    unitId: string,
    input: Partial<OptimizationUnitInput>
  ): OptimizationUnit | null {
    return this.permissionsRepository.updateOptimizationUnit(userId, brandId, unitId, input);
  }

  listTestThemes(userId: string, brandId: BrandId): TestTheme[] | null {
    return this.permissionsRepository.listTestThemes(userId, brandId);
  }

  createTestTheme(userId: string, brandId: BrandId, input: TestThemeInput): TestTheme | null {
    return this.permissionsRepository.createTestTheme(userId, brandId, input);
  }

  updateTestTheme(userId: string, brandId: BrandId, themeId: string, input: Partial<TestThemeInput>): TestTheme | null {
    return this.permissionsRepository.updateTestTheme(userId, brandId, themeId, input);
  }

  listTestQuestionCandidates(userId: string, brandId: BrandId, query?: TestQuestionCandidateListQuery): TestQuestionCandidate[] | null {
    return this.permissionsRepository.listTestQuestionCandidates(userId, brandId, query);
  }

  createTestQuestionCandidate(userId: string, brandId: BrandId, input: TestQuestionCandidateInput): TestQuestionCandidate | null {
    return this.permissionsRepository.createTestQuestionCandidate(userId, brandId, input);
  }

  updateTestQuestionCandidate(userId: string, brandId: BrandId, candidateId: string, input: TestQuestionCandidateUpdateInput): TestQuestionCandidate | null {
    return this.permissionsRepository.updateTestQuestionCandidate(userId, brandId, candidateId, input);
  }

  updateTestQuestionCandidateSelection(userId: string, brandId: BrandId, input: TestQuestionCandidateSelectionInput): TestQuestionCandidate[] | null {
    return this.permissionsRepository.updateTestQuestionCandidateSelection(userId, brandId, input);
  }

  listTestPlans(userId: string, brandId: BrandId): TestPlan[] | null {
    return this.permissionsRepository.listTestPlans(userId, brandId);
  }

  createTestPlan(userId: string, brandId: BrandId, input: TestPlanInput): TestPlan | null {
    return this.permissionsRepository.createTestPlan(userId, brandId, input);
  }

  executeTestPlan(userId: string, brandId: BrandId, planId: string): TestPlanExecutionResult | null {
    return this.permissionsRepository.executeTestPlan(userId, brandId, planId);
  }

  listTestPlanTemplates(userId: string, brandId: BrandId): TestPlanTemplate[] | null {
    return this.permissionsRepository.listTestPlanTemplates(userId, brandId);
  }

  applyTestPlanTemplate(userId: string, brandId: BrandId, input: TestPlanTemplateApplicationInput): TestPlan | null {
    return this.permissionsRepository.applyTestPlanTemplate(userId, brandId, input);
  }

  duplicateTestPlan(userId: string, brandId: BrandId, planId: string, input?: TestPlanDuplicateInput): TestPlan | null {
    return this.permissionsRepository.duplicateTestPlan(userId, brandId, planId, input);
  }

  listUserIntents(userId: string, brandId: BrandId): UserIntent[] | null {
    return this.permissionsRepository.listUserIntents(userId, brandId);
  }

  createUserIntent(userId: string, brandId: BrandId, input: UserIntentInput): UserIntent | null {
    return this.permissionsRepository.createUserIntent(userId, brandId, input);
  }

  updateUserIntent(userId: string, brandId: BrandId, intentId: string, input: Partial<UserIntentInput>): UserIntent | null {
    return this.permissionsRepository.updateUserIntent(userId, brandId, intentId, input);
  }

  listPromptTemplates(): PromptTemplate[] {
    return this.permissionsRepository.listPromptTemplates();
  }

  createPromptTemplate(input: PromptTemplateInput): PromptTemplate {
    return this.permissionsRepository.createPromptTemplate(input);
  }

  listBrandPrompts(userId: string, brandId: BrandId): BrandPrompt[] | null {
    return this.permissionsRepository.listBrandPrompts(userId, brandId);
  }

  batchGenerateBrandPrompts(userId: string, brandId: BrandId, input: PromptBatchGenerateInput): BrandPrompt[] | null {
    return this.permissionsRepository.batchGenerateBrandPrompts(userId, brandId, input);
  }

  updateBrandPrompt(userId: string, brandId: BrandId, promptId: string, input: Partial<BrandPromptInput>): BrandPrompt | null {
    return this.permissionsRepository.updateBrandPrompt(userId, brandId, promptId, input);
  }

  listPlatformConfigs(userId: string, brandId: BrandId): PlatformConfig[] | null {
    return this.permissionsRepository.listPlatformConfigs(userId, brandId);
  }

  getPlatformRuntimeConfig(userId: string, brandId: BrandId, platformCode: string): AIPlatformRuntimeConfig | null {
    return this.permissionsRepository.getPlatformRuntimeConfig(userId, brandId, platformCode);
  }

  getPlatformRuntimeConfigById(userId: string, brandId: BrandId, platformId: string): AIPlatformRuntimeConfig | null {
    return this.permissionsRepository.getPlatformRuntimeConfigById(userId, brandId, platformId);
  }

  savePlatformValidationResult(userId: string, brandId: BrandId, platformId: string, result: PlatformValidationResult): PlatformValidationResult | null {
    return this.permissionsRepository.savePlatformValidationResult(userId, brandId, platformId, result);
  }

  createPlatformConfig(userId: string, brandId: BrandId, input: PlatformConfigInput): PlatformConfig | null {
    return this.permissionsRepository.createPlatformConfig(userId, brandId, input);
  }

  updatePlatformConfig(userId: string, brandId: BrandId, platformId: string, input: Partial<PlatformConfigInput>): PlatformConfig | null {
    return this.permissionsRepository.updatePlatformConfig(userId, brandId, platformId, input);
  }

  validatePlatformConfig(userId: string, brandId: BrandId, platformId: string): PlatformValidationResult | null {
    return this.permissionsRepository.validatePlatformConfig(userId, brandId, platformId);
  }

  async listBrowserConnectionSessions(userId: string, brandId: BrandId): Promise<BrowserConnectionSession[] | null> {
    return this.permissionsRepository.listBrowserConnectionSessions(userId, brandId);
  }

  async startBrowserConnectionSession(userId: string, brandId: BrandId, input: BrowserConnectionStartInput): Promise<BrowserConnectionSession | null> {
    return this.permissionsRepository.startBrowserConnectionSession(userId, brandId, input);
  }

  async updateBrowserConnectionSession(userId: string, brandId: BrandId, sessionId: string, input: BrowserConnectionStatusInput): Promise<BrowserConnectionSession | null> {
    try {
      return await this.permissionsRepository.updateBrowserConnectionSession(userId, brandId, sessionId, input);
    } catch (error) {
      if (error instanceof BrowserSessionTransitionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  async captureBrowserResponse(
    userId: string,
    brandId: BrandId,
    sessionId: string,
    input: BrowserResponseCaptureInput
  ): Promise<BrowserResponseCaptureResult | null> {
    const sessions = await this.permissionsRepository.listBrowserConnectionSessions(userId, brandId);
    const session = sessions?.find((item) => item.id === sessionId);
    if (!session) {
      return null;
    }
    if (session.status !== 'ready') {
      throw new BadRequestException('请先确认官方平台登录状态');
    }

    const run = await this.permissionsRepository.getMonitoringRun(userId, brandId, input.runId);
    if (!run || run.platformCode !== session.platformCode) {
      throw new BadRequestException('该监测运行与当前浏览器会话不匹配');
    }
    if (run.status !== 'review_required') {
      throw new BadRequestException('该监测运行已完成回填或当前状态不可回填');
    }

    const plans = await this.permissionsRepository.listTestPlans(userId, brandId);
    const authorizedPlan = plans?.find((plan) => (
      session.authorizedScope.testPlanIds.includes(plan.id)
      && plan.monitoringRunIds.includes(run.id)
    ));
    if (!authorizedPlan) {
      throw new BadRequestException('当前浏览器会话未获授权回填该监测运行');
    }

    const updatedRun = await this.permissionsRepository.addManualResponse(userId, brandId, run.id, {
      rawText: input.rawText,
      modelName: input.modelName || `${session.platformCode}-browser`,
      citations: input.citations,
      collectionMethod: 'browser',
      searchEnabled: input.searchEnabled,
      market: input.market,
      language: input.language,
      evidenceLevel: 'manual_or_browser',
      manualConfirmed: input.manualConfirmed
    });
    if (!updatedRun) {
      throw new BadRequestException('真实回答保存失败，请稍后重试');
    }

    await this.permissionsRepository.parseAnalysisResult(userId, brandId, run.id);
    const updatedSession = await this.updateBrowserConnectionSession(userId, brandId, session.id, {
      event: 'answer_captured'
    });
    const analyzedRun = await this.permissionsRepository.getMonitoringRun(userId, brandId, run.id);
    if (!updatedSession || !analyzedRun) {
      throw new BadRequestException('回答已保存，浏览器会话更新失败');
    }

    return { session: updatedSession, run: analyzedRun };
  }

  listAIPlatformCallAudits(userId: string, brandId: BrandId): AIPlatformCallAudit[] | null {
    return this.permissionsRepository.listAIPlatformCallAudits(userId, brandId);
  }

  createAIPlatformCallAudit(userId: string, brandId: BrandId, input: AIPlatformCallAuditInput): AIPlatformCallAudit | null {
    return this.permissionsRepository.createAIPlatformCallAudit(userId, brandId, input);
  }

  updateAIPlatformCallAudit(userId: string, brandId: BrandId, auditId: string, input: AIPlatformCallAuditUpdateInput): AIPlatformCallAudit | null {
    return this.permissionsRepository.updateAIPlatformCallAudit(userId, brandId, auditId, input);
  }

  listAsyncJobs(userId: string, brandId: BrandId, status?: AsyncJobStatus): AsyncJob[] | null {
    return this.permissionsRepository.listAsyncJobs(userId, brandId, status);
  }

  getAsyncJob(userId: string, brandId: BrandId, jobId: string): AsyncJob | null {
    return this.permissionsRepository.getAsyncJob(userId, brandId, jobId);
  }

  createAsyncJob(userId: string, brandId: BrandId, input: AsyncJobInput): AsyncJob | null {
    return this.permissionsRepository.createAsyncJob(userId, brandId, input);
  }

  updateAsyncJob(userId: string, brandId: BrandId, jobId: string, input: AsyncJobUpdateInput): AsyncJob | null {
    return this.permissionsRepository.updateAsyncJob(userId, brandId, jobId, input);
  }

  listLLMTaskRuns(userId: string, brandId: BrandId): LLMTaskRun[] | null {
    return this.permissionsRepository.listLLMTaskRuns(userId, brandId);
  }

  createLLMTaskRun(userId: string, brandId: BrandId, input: LLMTaskRunInput): LLMTaskRun | null {
    return this.permissionsRepository.createLLMTaskRun(userId, brandId, input);
  }

  async listVisibilitySprints(userId: string, brandId: BrandId): Promise<VisibilitySprint[] | null> {
    return this.permissionsRepository.listVisibilitySprints ? await this.permissionsRepository.listVisibilitySprints(userId, brandId) : null;
  }

  async getVisibilitySprint(userId: string, brandId: BrandId, sprintId: string): Promise<VisibilitySprint | null> {
    return this.permissionsRepository.getVisibilitySprint ? await this.permissionsRepository.getVisibilitySprint(userId, brandId, sprintId) : null;
  }

  async getCurrentVisibilitySprint(userId: string, brandId: BrandId): Promise<VisibilitySprint | null> {
    return this.permissionsRepository.getCurrentVisibilitySprint ? await this.permissionsRepository.getCurrentVisibilitySprint(userId, brandId) : null;
  }

  async createVisibilitySprint(userId: string, brandId: BrandId, input: VisibilitySprintCreateInput): Promise<VisibilitySprint | null> {
    return this.permissionsRepository.createVisibilitySprint ? await this.permissionsRepository.createVisibilitySprint(userId, brandId, input) : null;
  }

  async updateVisibilitySprintStep(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintStepUpdateInput): Promise<VisibilitySprint | null> {
    return this.permissionsRepository.updateVisibilitySprintStep ? await this.permissionsRepository.updateVisibilitySprintStep(userId, brandId, sprintId, input) : null;
  }

  async updateVisibilitySprintMetrics(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintMetricUpdateInput): Promise<VisibilitySprint | null> {
    return this.permissionsRepository.updateVisibilitySprintMetrics ? await this.permissionsRepository.updateVisibilitySprintMetrics(userId, brandId, sprintId, input) : null;
  }

  async updateVisibilitySprintRelations(userId: string, brandId: BrandId, sprintId: string, input: VisibilitySprintRelationsUpdateInput): Promise<VisibilitySprint | null> {
    return this.permissionsRepository.updateVisibilitySprintRelations ? await this.permissionsRepository.updateVisibilitySprintRelations(userId, brandId, sprintId, input) : null;
  }

  async listBrandStandardAnswers(userId: string, brandId: BrandId, questionId?: string): Promise<BrandStandardAnswer[] | null> {
    return this.permissionsRepository.listBrandStandardAnswers ? await this.permissionsRepository.listBrandStandardAnswers(userId, brandId, questionId) : null;
  }

  async getBrandStandardAnswer(userId: string, brandId: BrandId, answerId: string): Promise<BrandStandardAnswer | null> {
    return this.permissionsRepository.getBrandStandardAnswer ? await this.permissionsRepository.getBrandStandardAnswer(userId, brandId, answerId) : null;
  }

  async createBrandStandardAnswer(userId: string, brandId: BrandId, input: BrandStandardAnswerInput): Promise<BrandStandardAnswer | null> {
    return this.permissionsRepository.createBrandStandardAnswer ? await this.permissionsRepository.createBrandStandardAnswer(userId, brandId, input) : null;
  }

  async updateBrandStandardAnswer(userId: string, brandId: BrandId, answerId: string, input: BrandStandardAnswerUpdateInput): Promise<BrandStandardAnswer | null> {
    return this.permissionsRepository.updateBrandStandardAnswer ? await this.permissionsRepository.updateBrandStandardAnswer(userId, brandId, answerId, input) : null;
  }

  listMonitoringRuns(userId: string, brandId: BrandId): MonitoringRunDetail[] | null {
    return this.permissionsRepository.listMonitoringRuns(userId, brandId);
  }

  async getMeasurementAttribution(userId: string, brandId: BrandId): Promise<MeasurementAttributionRecord | null> {
    return this.permissionsRepository.getMeasurementAttribution ? await this.permissionsRepository.getMeasurementAttribution(userId, brandId) : null;
  }

  async saveMeasurementAttribution(userId: string, brandId: BrandId, input: MeasurementAttributionInput): Promise<MeasurementAttributionRecord | null> {
    return this.permissionsRepository.saveMeasurementAttribution ? await this.permissionsRepository.saveMeasurementAttribution(userId, brandId, input) : null;
  }

  getMonitoringRun(userId: string, brandId: BrandId, runId: string): MonitoringRunDetail | null {
    return this.permissionsRepository.getMonitoringRun(userId, brandId, runId);
  }

  getAnalysisResult(userId: string, brandId: BrandId, runId: string): AnalysisResult | null {
    return this.permissionsRepository.getAnalysisResult(userId, brandId, runId);
  }

  parseAnalysisResult(userId: string, brandId: BrandId, runId: string): AnalysisResult | null {
    return this.permissionsRepository.parseAnalysisResult(userId, brandId, runId);
  }

  updateAnalysisResult(userId: string, brandId: BrandId, runId: string, input: AnalysisResultInput): AnalysisResult | null {
    return this.permissionsRepository.updateAnalysisResult(userId, brandId, runId, input);
  }

  getBrandMetricDashboard(userId: string, brandId: BrandId): BrandMetricDashboard | null {
    return this.permissionsRepository.getBrandMetricDashboard(userId, brandId);
  }

  getGrowthOptimizationWorkspace(userId: string, brandId: BrandId): GrowthOptimizationWorkspace | null {
    return this.permissionsRepository.getGrowthOptimizationWorkspace(userId, brandId);
  }

  generateGrowthOptimizationPlan(userId: string, brandId: BrandId, sourceTestPlanId?: string): GrowthOptimizationPlan | null {
    return this.permissionsRepository.generateGrowthOptimizationPlan(userId, brandId, sourceTestPlanId);
  }

  createGrowthOptimizationPlan(userId: string, brandId: BrandId, input: GrowthOptimizationPlanInput): GrowthOptimizationPlan | null {
    return this.permissionsRepository.createGrowthOptimizationPlan(userId, brandId, input);
  }

  confirmGrowthOptimizationPlan(userId: string, brandId: BrandId, planId: string, input?: GrowthOptimizationPlanConfirmInput): GrowthOptimizationPlanConfirmationResult | null {
    return this.permissionsRepository.confirmGrowthOptimizationPlan(userId, brandId, planId, input);
  }

  listBrandMetricRanking(userId: string, sortBy?: keyof Pick<BrandMetricRankingItem, 'totalScore' | 'mentionRate' | 'top3Rate' | 'positiveRate' | 'periodChange'>): BrandMetricRankingItem[] {
    return this.permissionsRepository.listBrandMetricRanking(userId, sortBy);
  }

  listCompetitors(userId: string, brandId: BrandId): Competitor[] | Promise<Competitor[] | null> | null {
    return this.permissionsRepository.listCompetitors(userId, brandId);
  }

  createCompetitor(userId: string, brandId: BrandId, input: CompetitorInput): Competitor | Promise<Competitor | null> | null {
    return this.permissionsRepository.createCompetitor(userId, brandId, input);
  }

  updateCompetitor(userId: string, brandId: BrandId, competitorId: string, input: Partial<CompetitorInput>): Competitor | Promise<Competitor | null> | null {
    return this.permissionsRepository.updateCompetitor(userId, brandId, competitorId, input);
  }

  getCompetitorDashboard(userId: string, brandId: BrandId): CompetitorDashboard | Promise<CompetitorDashboard | null> | null {
    return this.permissionsRepository.getCompetitorDashboard(userId, brandId);
  }

  createCompetitorDiscoveryRun(userId: string, brandId: BrandId, input?: CompetitorDiscoveryRunInput): CompetitorDiscoveryRun | Promise<CompetitorDiscoveryRun | null> | null {
    return this.permissionsRepository.createCompetitorDiscoveryRun(userId, brandId, input);
  }

  listCompetitorDiscoveryCandidates(userId: string, brandId: BrandId, runId: string, query?: CompetitorDiscoveryCandidatesQuery): CompetitorCandidate[] | Promise<CompetitorCandidate[] | null> | null {
    return this.permissionsRepository.listCompetitorDiscoveryCandidates(userId, brandId, runId, query);
  }

  listCompetitorCandidates(userId: string, brandId: BrandId): CompetitorCandidate[] | Promise<CompetitorCandidate[] | null> | null {
    return this.permissionsRepository.listCompetitorCandidates(userId, brandId);
  }

  syncCompetitorCandidateEvidence(userId: string, brandId: BrandId, evidence: CompetitorCandidateEvidenceInput[]): CompetitorCandidate[] | Promise<CompetitorCandidate[] | null> | null {
    return this.permissionsRepository.syncCompetitorCandidateEvidence(userId, brandId, evidence);
  }

  decideCompetitorCandidate(userId: string, brandId: BrandId, candidateId: string, input: CompetitorCandidateDecisionInput): CompetitorCandidateConfirmationResult | Promise<CompetitorCandidateConfirmationResult | null> | null {
    return this.permissionsRepository.decideCompetitorCandidate(userId, brandId, candidateId, input);
  }

  getCitationDashboard(userId: string, brandId: BrandId): CitationDashboard | Promise<CitationDashboard | null> | null {
    return this.permissionsRepository.getCitationDashboard(userId, brandId);
  }

  saveCitationAbsorptionEvidence(userId: string, brandId: BrandId, citationId: string, evidence: CitationAbsorptionEvidence[]): CitationSource | Promise<CitationSource | null> | null {
    return this.permissionsRepository.saveCitationAbsorptionEvidence?.(userId, brandId, citationId, evidence) ?? null;
  }

  reviewCitationAbsorptionEvidence(userId: string, brandId: BrandId, citationId: string, evidenceId: string): CitationSource | Promise<CitationSource | null> | null {
    return this.permissionsRepository.reviewCitationAbsorptionEvidence?.(userId, brandId, citationId, evidenceId) ?? null;
  }

  bindCitationContentAsset(userId: string, brandId: BrandId, citationId: string, input: ContentAssetInput): ContentAsset | null {
    return this.permissionsRepository.bindCitationContentAsset(userId, brandId, citationId, input);
  }

  createCitationEnhancementStrategy(userId: string, brandId: BrandId, citationId: string): ContentStrategy | null {
    return this.permissionsRepository.createCitationEnhancementStrategy(userId, brandId, citationId);
  }

  getEvaluationDashboard(userId: string, brandId: BrandId): EvaluationDashboard | null {
    return this.permissionsRepository.getEvaluationDashboard(userId, brandId);
  }

  createEvaluationCorrectionStrategy(userId: string, brandId: BrandId, issueId: string): ContentStrategy | null {
    return this.permissionsRepository.createEvaluationCorrectionStrategy(userId, brandId, issueId);
  }

  updateBrandKnowledgeFromEvaluationIssue(userId: string, brandId: BrandId, issueId: string): BrandProfile | null {
    return this.permissionsRepository.updateBrandKnowledgeFromEvaluationIssue(userId, brandId, issueId);
  }

  getGeoCanvasWorkspace(userId: string, brandId: BrandId): GeoCanvasWorkspace | null {
    return this.permissionsRepository.getGeoCanvasWorkspace(userId, brandId);
  }

  createContentStrategy(userId: string, brandId: BrandId, input: ContentStrategyInput): ContentStrategy | null {
    return this.permissionsRepository.createContentStrategy(userId, brandId, input);
  }

  getContentCenterDashboard(userId: string, brandId: BrandId): ContentCenterDashboard | null {
    return this.permissionsRepository.getContentCenterDashboard(userId, brandId);
  }

  listContentAssets(userId: string, brandId: BrandId, filter?: ContentAssetFilter): ContentAsset[] | null {
    return this.permissionsRepository.listContentAssets(userId, brandId, filter);
  }

  createContentAsset(userId: string, brandId: BrandId, input: ContentAssetInput): ContentAsset | null {
    return this.permissionsRepository.createContentAsset(userId, brandId, input);
  }

  updateContentAsset(userId: string, brandId: BrandId, assetId: string, input: ContentAssetInput): ContentAsset | null {
    return this.permissionsRepository.updateContentAsset(userId, brandId, assetId, input);
  }

  listContentStrategies(userId: string, brandId: BrandId, filter?: ContentStrategyFilter): ContentStrategy[] | null {
    return this.permissionsRepository.listContentStrategies(userId, brandId, filter);
  }

  generateContentStrategies(userId: string, brandId: BrandId): ContentStrategy[] | null {
    return this.permissionsRepository.generateContentStrategies(userId, brandId);
  }

  getContentGenerationWorkspace(userId: string, brandId: BrandId, taskId?: string): ContentGenerationWorkspace | null {
    return this.permissionsRepository.getContentGenerationWorkspace(userId, brandId, taskId);
  }

  createContentGenerationTask(userId: string, brandId: BrandId, input: ContentGenerationTaskInput): ContentGenerationWorkspace | null {
    return this.permissionsRepository.createContentGenerationTask(userId, brandId, input);
  }

  createContentGenerationTasksFromGrowthPlan(userId: string, brandId: BrandId, input: GrowthOptimizationContentTaskInput): ContentGenerationWorkspace | null {
    return this.permissionsRepository.createContentGenerationTasksFromGrowthPlan(userId, brandId, input);
  }

  updateContentGenerationStep(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationStepUpdateInput): ContentGenerationWorkspace | null {
    return this.permissionsRepository.updateContentGenerationStep(userId, brandId, taskId, input);
  }

  completeContentGenerationTask(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationCompletionInput): ContentGenerationWorkspace | null {
    return this.permissionsRepository.completeContentGenerationTask(userId, brandId, taskId, input);
  }

  recordContentGenerationFailure(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationFailureInput): ContentGenerationWorkspace | null {
    return this.permissionsRepository.recordContentGenerationFailure(userId, brandId, taskId, input);
  }

  retryContentGenerationTask(userId: string, brandId: BrandId, taskId: string, input: ContentGenerationRetryInput = {}): ContentGenerationWorkspace | null {
    return this.permissionsRepository.retryContentGenerationTask(userId, brandId, taskId, input);
  }

  saveContentVersion(userId: string, brandId: BrandId, taskId: string, input: ContentVersionInput): ContentGenerationWorkspace | null {
    return this.permissionsRepository.saveContentVersion(userId, brandId, taskId, input);
  }

  exportContentMarkdown(userId: string, brandId: BrandId, taskId: string, versionId?: string): ContentExportRecord | null {
    return this.permissionsRepository.exportContentMarkdown(userId, brandId, taskId, versionId);
  }

  getPublishingEntryPayload(userId: string, brandId: BrandId, taskId: string, versionId?: string): PublishingEntryPayload | null {
    return this.permissionsRepository.getPublishingEntryPayload(userId, brandId, taskId, versionId);
  }

  getPublishingDashboard(userId: string, brandId: BrandId): PublishingDashboard | null {
    return this.permissionsRepository.getPublishingDashboard(userId, brandId);
  }

  async listContentAssetPageItems(userId: string, brandId: BrandId): Promise<ContentAssetPageItem[] | null> {
    return this.permissionsRepository.listContentAssetPageItems
      ? await this.permissionsRepository.listContentAssetPageItems(userId, brandId)
      : null;
  }

  async listOwnedMediaAccounts(userId: string, brandId: BrandId): Promise<OwnedMediaAccount[] | null> {
    return this.permissionsRepository.listOwnedMediaAccounts
      ? await this.permissionsRepository.listOwnedMediaAccounts(userId, brandId)
      : null;
  }

  async listMediaPlatformRules(userId: string, brandId: BrandId): Promise<MediaPlatformRule[] | null> {
    return this.permissionsRepository.listMediaPlatformRules
      ? await this.permissionsRepository.listMediaPlatformRules(userId, brandId)
      : null;
  }

  async getPublishingChannelStats(userId: string, brandId: BrandId): Promise<PublishingChannelStats[] | null> {
    return this.permissionsRepository.getPublishingChannelStats
      ? await this.permissionsRepository.getPublishingChannelStats(userId, brandId)
      : null;
  }

  async listAnalysisFindings(userId: string, brandId: BrandId): Promise<AnalysisFinding[] | null> {
    return this.permissionsRepository.listAnalysisFindings
      ? await this.permissionsRepository.listAnalysisFindings(userId, brandId)
      : null;
  }

  async getAnalysisWorkbenchDashboard(userId: string, brandId: BrandId): Promise<AnalysisWorkbenchDashboard | null> {
    return this.permissionsRepository.getAnalysisWorkbenchDashboard
      ? await this.permissionsRepository.getAnalysisWorkbenchDashboard(userId, brandId)
      : null;
  }

  connectPublishingAccount(userId: string, brandId: BrandId, input: PublishingAccountInput): PublishingAccount | null {
    return this.permissionsRepository.connectPublishingAccount(userId, brandId, input);
  }

  reauthorizePublishingAccount(userId: string, brandId: BrandId, accountId: string): PublishingAccount | null {
    return this.permissionsRepository.reauthorizePublishingAccount(userId, brandId, accountId);
  }

  updatePublishingAccountStatus(userId: string, brandId: BrandId, accountId: string, input: Pick<PublishingAccountInput, 'authStatus' | 'errorMessage'>): PublishingAccount | null {
    return this.permissionsRepository.updatePublishingAccountStatus(userId, brandId, accountId, input);
  }

  updatePublishingAccountMode(userId: string, brandId: BrandId, accountId: string, input: PublishingModeInput): PublishingAccount | null {
    return this.permissionsRepository.updatePublishingAccountMode(userId, brandId, accountId, input);
  }

  createPublishingRecord(userId: string, brandId: BrandId, input: PublishingRecordInput): PublishingRecord | null {
    return this.permissionsRepository.createPublishingRecord(userId, brandId, input);
  }

  confirmPublishingRecord(userId: string, brandId: BrandId, recordId: string, input: PublishingRecordConfirmationInput): PublishingRecord | null {
    return this.permissionsRepository.confirmPublishingRecord(userId, brandId, recordId, input);
  }

  updatePublishingRecordStatus(userId: string, brandId: BrandId, recordId: string, input: PublishingExecutionStatusInput): PublishingRecord | null {
    return this.permissionsRepository.updatePublishingRecordStatus(userId, brandId, recordId, input);
  }

  createOptimizationTask(userId: string, brandId: BrandId, input: OptimizationTaskInput): OptimizationTask | null {
    return this.permissionsRepository.createOptimizationTask(userId, brandId, input);
  }

  getTaskBoard(userId: string, brandId: BrandId): TaskBoardDashboard | null {
    return this.permissionsRepository.getTaskBoard(userId, brandId);
  }

  updateOptimizationTask(userId: string, brandId: BrandId, taskId: string, input: OptimizationTaskUpdateInput): OptimizationTask | null {
    return this.permissionsRepository.updateOptimizationTask(userId, brandId, taskId, input);
  }

  planOptimizationTaskRetest(userId: string, brandId: BrandId, taskId: string, input: RetestPlanInput): OptimizationTask | null {
    return this.permissionsRepository.planOptimizationTaskRetest(userId, brandId, taskId, input);
  }

  bindOptimizationTaskRetestRun(userId: string, brandId: BrandId, taskId: string, recordId: string, retestRunId: string): OptimizationTask | null {
    return this.permissionsRepository.bindOptimizationTaskRetestRun(userId, brandId, taskId, recordId, retestRunId);
  }

  completeOptimizationTaskRetest(userId: string, brandId: BrandId, taskId: string, recordId: string, input: RetestResultInput): OptimizationTask | null {
    return this.permissionsRepository.completeOptimizationTaskRetest(userId, brandId, taskId, recordId, input);
  }

  getReportDashboard(userId: string, brandId: BrandId): ReportDashboard | null {
    return this.permissionsRepository.getReportDashboard(userId, brandId);
  }

  async previewReport(userId: string, brandId: BrandId, input: ReportInput): Promise<ReportScopePreview[] | null> {
    return this.permissionsRepository.previewReport(userId, brandId, input);
  }

  createReport(userId: string, brandId: BrandId, input: ReportInput): ReportRecord | null {
    return this.permissionsRepository.createReport(userId, brandId, input);
  }

  getReport(userId: string, brandId: BrandId, reportId: string): ReportRecord | null {
    return this.permissionsRepository.getReport(userId, brandId, reportId);
  }

  getAdvisorDashboard(userId: string, brandId: BrandId): AdvisorDashboard | null {
    return this.permissionsRepository.getAdvisorDashboard(userId, brandId);
  }

  createAdvisorRecord(userId: string, brandId: BrandId, input: AdvisorRecordInput): AdvisorRecord | null {
    return this.permissionsRepository.createAdvisorRecord(userId, brandId, input);
  }

  async getInnerTestFeedbackDashboard(userId: string, brandId: BrandId): Promise<InnerTestFeedbackDashboard | null> {
    return this.permissionsRepository.getInnerTestFeedbackDashboard(userId, brandId);
  }

  async createInnerTestFeedback(userId: string, brandId: BrandId, input: InnerTestFeedbackInput): Promise<InnerTestFeedback | null> {
    return this.permissionsRepository.createInnerTestFeedback(userId, brandId, input);
  }

  async updateInnerTestFeedback(userId: string, brandId: BrandId, feedbackId: string, input: InnerTestFeedbackUpdateInput): Promise<InnerTestFeedback | null> {
    return this.permissionsRepository.updateInnerTestFeedback(userId, brandId, feedbackId, input);
  }

  createMonitoringRun(userId: string, brandId: BrandId, input: MonitoringRunInput): MonitoringRunDetail | null {
    return this.permissionsRepository.createMonitoringRun(userId, brandId, input);
  }

  updateMonitoringRunExecution(userId: string, brandId: BrandId, runId: string, input: MonitoringRunExecutionUpdateInput): MonitoringRunDetail | null {
    return this.permissionsRepository.updateMonitoringRunExecution(userId, brandId, runId, input);
  }

  addManualResponse(userId: string, brandId: BrandId, runId: string, input: ManualResponseInput): MonitoringRunDetail | null {
    return this.permissionsRepository.addManualResponse(userId, brandId, runId, input);
  }

  submitManualTestAnswers(userId: string, brandId: BrandId, input: ManualTestAnswerBatchInput): ManualTestAnswerBatchResult | null {
    return this.permissionsRepository.submitManualTestAnswers(userId, brandId, input);
  }

  listDeniedAccessLogs(userId: string): DeniedAccessLog[] {
    return this.permissionsRepository.listDeniedAccessLogs(userId);
  }

  createAuditLog(userId: string, input: AuditLogInput): AuditLog {
    return this.permissionsRepository.createAuditLog(userId, input);
  }

  listAuditLogs(userId: string, filter?: AuditLogFilter): AuditLog[] {
    return this.permissionsRepository.listAuditLogs(userId, filter);
  }
}
