import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req, UploadedFile, UseInterceptors } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Request } from 'express';
import { existsSync, mkdirSync, writeFileSync } from 'node:fs';
import { extname, join } from 'node:path';
import type {
  AccessibleBrand,
  ApiResponse,
  BrandDetail,
  BrandMutationInput,
  BrandProfile,
  BrandProfileInput,
  BrandPrompt,
  BrandPromptInput,
  BrandImportDraft,
  BrandImportConfirmInput,
  BrandImportConfirmationResult,
  BrandStatus,
  BrandWorkspaceSnapshot,
  BrandWorkspaceSummary,
  GrowthOptimizationPlan,
  GrowthOptimizationPlanConfirmInput,
  GrowthOptimizationPlanConfirmationResult,
  GrowthOptimizationPlanInput,
  GrowthOptimizationWorkspace,
  KnowledgeSource,
  KnowledgeSourceInput,
  OptimizationPlanningInput,
  OptimizationPlanningOutput,
  ManualTestAnswerBatchInput,
  ManualTestAnswerBatchResult,
  ManualTestAnswerInput,
  MonitoringFrequency,
  OptimizationUnit,
  OptimizationUnitInput,
  OptimizationUnitPriority,
  OptimizationUnitType,
  PromptBatchGenerateInput,
  TestAssetGenerationResult,
  TestQuestionCandidate,
  TestQuestionCandidateInput,
  TestQuestionCandidateListQuery,
  TestQuestionCandidateSelectionInput,
  TestQuestionCandidateUpdateInput,
  TestQuestionPurpose,
  TestPlan,
  TestPlanCreationResult,
  TestPlanDuplicateInput,
  TestPlanExecutionResult,
  TestPlanInput,
  TestPlanTemplate,
  TestPlanTemplateApplicationInput,
  TestTheme,
  TestThemeInput,
  TestThemeType,
  PromptTemplate,
  PromptTemplateInput,
  UserIntent,
  UserIntentCategory,
  UserIntentInput
} from '@geo-platform/shared-types';
import { LLMOrchestrationService } from '../llm/llm-orchestration.service';
import { PermissionsService } from '../permissions/permissions.service';
import { monitoringFrequencies, userIntentCategories } from '../permissions/permissions.repository';
import { BrandImportService } from './brand-import.service';
import { TestQuestionService } from './test-question.service';
import { TestThemeService } from './test-theme.service';

type UploadedBrandFile = {
  originalname: string;
  mimetype: string;
  size: number;
  buffer: Buffer;
};

const brandImportUploadDir = join(process.cwd(), 'uploads', 'brand-imports');
const brandImportMaxFileSize = 8 * 1024 * 1024;
const supportedBrandImportExtensions = ['.md', '.markdown', '.doc', '.docx', '.pdf'];
const supportedBrandImportMimeTypes = [
  'text/markdown',
  'text/plain',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/pdf',
  'application/octet-stream'
];

@Controller('brands')
export class BrandsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly brandImportService: BrandImportService,
    private readonly testQuestionService: TestQuestionService,
    private readonly testThemeService: TestThemeService,
    private readonly llmService: LLMOrchestrationService
  ) {}

  @Get()
  async listAccessibleBrands(@Req() request: Request): Promise<ApiResponse<AccessibleBrand[]>> {
    return {
      success: true,
      data: await this.permissionsService.listAccessibleBrands(request.context.userId)
    };
  }

  @Get('details')
  async listAccessibleBrandDetails(@Req() request: Request): Promise<ApiResponse<BrandDetail[]>> {
    return {
      success: true,
      data: await this.permissionsService.listAccessibleBrandDetails(request.context.userId)
    };
  }

  @Get('active')
  async getActiveBrand(@Req() request: Request): Promise<ApiResponse<BrandWorkspaceSummary>> {
    const accessibleBrands = await this.permissionsService.listAccessibleBrands(request.context.userId);
    const activeBrand = request.context.brandId
      ? accessibleBrands.find((brand) => brand.brandId === request.context.brandId)
      : accessibleBrands[0];

    return {
      success: true,
      data: activeBrand ?? {
        brandId: request.context.brandId ?? '',
        name: '',
        status: 'inactive'
      }
    };
  }

  @Post()
  async createBrand(@Req() request: Request, @Body() body: BrandMutationInput): Promise<ApiResponse<BrandDetail>> {
    return {
      success: true,
      data: await this.permissionsService.createBrand(request.context.userId, normalizeBrandInput(body))
    };
  }

  @Get(':brandId/workspace')
  async getBrandWorkspace(
    @Req() request: Request,
    @Param('brandId') brandId: string
  ): Promise<ApiResponse<BrandWorkspaceSnapshot>> {
    const snapshot = await this.permissionsService.getBrandWorkspaceSnapshot(request.context.userId, brandId);

    if (!snapshot) {
      throw new NotFoundException('品牌工作区不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: snapshot
    };
  }

  @Patch(':brandId/status')
  async updateBrandStatus(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: { status?: BrandStatus }
  ): Promise<ApiResponse<BrandDetail>> {
    const status = body.status;

    if (!status || !['active', 'inactive', 'archived'].includes(status)) {
      throw new BadRequestException('品牌状态必须是 active、inactive 或 archived');
    }

    const brand = await this.permissionsService.updateBrandStatus(request.context.userId, brandId, status);

    if (!brand) {
      throw new NotFoundException('品牌不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: brand
    };
  }

  @Patch(':brandId')
  async updateBrand(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: Partial<BrandMutationInput>
  ): Promise<ApiResponse<BrandDetail>> {
    const brand = await this.permissionsService.updateBrand(request.context.userId, brandId, normalizePartialBrandInput(body));

    if (!brand) {
      throw new NotFoundException('品牌不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: brand
    };
  }

  @Get(':brandId/knowledge')
  async getBrandProfile(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<BrandProfile>> {
    const profile = await this.permissionsService.getBrandProfile(request.context.userId, brandId);

    if (!profile) {
      throw new NotFoundException('品牌知识库不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: profile
    };
  }

  @Patch(':brandId/knowledge')
  async saveBrandProfile(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: BrandProfileInput
  ): Promise<ApiResponse<BrandProfile>> {
    const profile = await this.permissionsService.saveBrandProfile(request.context.userId, brandId, normalizeProfileInput(body));

    if (!profile) {
      throw new NotFoundException('品牌知识库不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: profile
    };
  }

  @Get(':brandId/knowledge-sources')
  async listKnowledgeSources(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<KnowledgeSource[]>> {
    const sources = await this.permissionsService.listKnowledgeSources(request.context.userId, brandId);

    if (!sources) {
      throw new NotFoundException('品牌知识库不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: sources
    };
  }

  @Post(':brandId/knowledge-sources')
  async createKnowledgeSource(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: KnowledgeSourceInput
  ): Promise<ApiResponse<KnowledgeSource>> {
    const source = await this.permissionsService.createKnowledgeSource(request.context.userId, brandId, normalizeKnowledgeSourceInput(body));

    if (!source) {
      throw new NotFoundException('品牌知识库不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: source
    };
  }

  @Post(':brandId/knowledge-sources/upload')
  @UseInterceptors(
    FileInterceptor('file', {
      limits: { fileSize: brandImportMaxFileSize },
      fileFilter: (_request: unknown, file: UploadedBrandFile, callback: (error: Error | null, acceptFile: boolean) => void) => {
        if (!isSupportedBrandImportFile(file.originalname, file.mimetype)) {
          callback(new BadRequestException('第一版仅支持 Markdown、Word 和 PDF 品牌资料'), false);
          return;
        }

        callback(null, true);
      }
    })
  )
  async uploadKnowledgeSource(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @UploadedFile() file?: UploadedBrandFile
  ): Promise<ApiResponse<KnowledgeSource>> {
    if (!file) {
      throw new BadRequestException('请上传 Markdown、Word 或 PDF 品牌资料');
    }

    const fileRef = persistBrandImportFile(brandId, file);
    const source = await this.permissionsService.createKnowledgeSource(request.context.userId, brandId, {
      name: file.originalname.trim(),
      sourceType: 'file',
      fileRef,
      status: 'processing'
    });

    if (!source) {
      throw new NotFoundException('品牌知识库不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: source
    };
  }

  @Post(':brandId/knowledge-sources/:sourceId/parse')
  async parseKnowledgeSource(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sourceId') sourceId: string
  ): Promise<ApiResponse<BrandImportDraft>> {
    const sources = await this.permissionsService.listKnowledgeSources(request.context.userId, brandId);

    if (!sources) {
      throw new NotFoundException('品牌知识库不存在或当前用户无权访问');
    }

    const source = sources.find((item) => item.id === sourceId);
    if (!source) {
      throw new NotFoundException('品牌资料不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: this.brandImportService.parseKnowledgeSource(brandId, source)
    };
  }

  @Post(':brandId/knowledge-sources/:sourceId/confirm')
  async confirmKnowledgeSourceImport(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sourceId') sourceId: string,
    @Body() body: BrandImportConfirmInput
  ): Promise<ApiResponse<BrandImportConfirmationResult>> {
    const sources = await this.permissionsService.listKnowledgeSources(request.context.userId, brandId);

    if (!sources) {
      throw new NotFoundException('品牌知识库不存在或当前用户无权访问');
    }

    const source = sources.find((item) => item.id === sourceId);
    if (!source) {
      throw new NotFoundException('品牌资料不存在或当前用户无权访问');
    }

    const payload = this.brandImportService.buildConfirmationPayload(normalizeBrandImportConfirmInput(body));
    const brand = await this.permissionsService.updateBrand(request.context.userId, brandId, normalizePartialBrandInput(payload.brand));
    const profile = await this.permissionsService.saveBrandProfile(request.context.userId, brandId, normalizeProfileInput(payload.profile));
    const updatedSource = await this.permissionsService.updateKnowledgeSourceStatus(request.context.userId, brandId, sourceId, 'completed');

    if (!brand || !profile || !updatedSource) {
      throw new NotFoundException('品牌资料确认失败，请确认当前用户有权访问该品牌');
    }

    return {
      success: true,
      data: {
        brand,
        profile,
        source: updatedSource
      }
    };
  }

  @Get(':brandId/test-themes')
  async listTestThemes(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<TestTheme[]>> {
    const themes = await this.permissionsService.listTestThemes(request.context.userId, brandId);

    if (!themes) {
      throw new NotFoundException('测试主题不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: themes
    };
  }

  @Post(':brandId/test-themes/generate')
  async generateTestThemes(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<TestAssetGenerationResult<TestTheme>>> {
    const brand = (await this.permissionsService.listAccessibleBrandDetails(request.context.userId)).find((item) => item.brandId === brandId);
    const profile = await this.permissionsService.getBrandProfile(request.context.userId, brandId);
    const existing = await this.permissionsService.listTestThemes(request.context.userId, brandId);

    if (!brand || !profile || !existing) {
      throw new NotFoundException('品牌档案不存在或当前用户无权访问');
    }

    const existingKeys = new Set(existing.map((theme) => `${theme.type}:${theme.name}`));
    const generated = await this.testThemeService.generateThemesWithLLM(request.context.userId, brandId, brand, profile);
    const created = generated.items
      .filter((theme) => !existingKeys.has(`${theme.type}:${theme.name}`))
      .map((theme) => this.permissionsService.createTestTheme(request.context.userId, brandId, theme))
      .filter((theme): theme is TestTheme => Boolean(theme));

    return {
      success: true,
      data: { ...generated, items: [...created, ...existing] }
    };
  }

  @Patch(':brandId/test-themes/:themeId')
  async updateTestTheme(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('themeId') themeId: string,
    @Body() body: Partial<TestThemeInput>
  ): Promise<ApiResponse<TestTheme>> {
    const theme = await this.permissionsService.updateTestTheme(request.context.userId, brandId, themeId, normalizePartialTestThemeInput(body));

    if (!theme) {
      throw new NotFoundException('测试主题不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: theme
    };
  }

  @Get(':brandId/test-question-candidates')
  async listTestQuestionCandidates(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Query() query: Record<string, string | undefined>
  ): Promise<ApiResponse<TestQuestionCandidate[]>> {
    const candidates = await this.permissionsService.listTestQuestionCandidates(request.context.userId, brandId, normalizeTestQuestionCandidateListQuery(query));

    if (!candidates) {
      throw new NotFoundException('测试问法不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: candidates
    };
  }

  @Patch(':brandId/test-question-candidates/:candidateId')
  async updateTestQuestionCandidate(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('candidateId') candidateId: string,
    @Body() body: TestQuestionCandidateUpdateInput
  ): Promise<ApiResponse<TestQuestionCandidate>> {
    const candidate = await this.permissionsService.updateTestQuestionCandidate(
      request.context.userId,
      brandId,
      candidateId,
      normalizePartialTestQuestionCandidateInput(body)
    );

    if (!candidate) {
      throw new NotFoundException('测试问法不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: candidate
    };
  }

  @Post(':brandId/test-question-candidates/selection')
  async updateTestQuestionCandidateSelection(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: TestQuestionCandidateSelectionInput
  ): Promise<ApiResponse<TestQuestionCandidate[]>> {
    const candidates = await this.permissionsService.updateTestQuestionCandidateSelection(
      request.context.userId,
      brandId,
      normalizeTestQuestionCandidateSelectionInput(body)
    );

    if (!candidates) {
      throw new NotFoundException('测试问法不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: candidates
    };
  }

  @Post(':brandId/test-question-candidates/generate')
  async generateTestQuestionCandidates(
    @Req() request: Request,
    @Param('brandId') brandId: string
  ): Promise<ApiResponse<TestAssetGenerationResult<TestQuestionCandidate>>> {
    const brand = (await this.permissionsService.listAccessibleBrandDetails(request.context.userId)).find((item) => item.brandId === brandId);
    const profile = await this.permissionsService.getBrandProfile(request.context.userId, brandId);
    const themes = await this.permissionsService.listTestThemes(request.context.userId, brandId);
    const existing = await this.permissionsService.listTestQuestionCandidates(request.context.userId, brandId);

    if (!brand || !profile || !themes || !existing) {
      throw new NotFoundException('品牌档案或测试主题不存在，无法生成测试问法');
    }

    const existingKeys = new Set(existing.map((candidate) => `${candidate.themeId}:${candidate.question}`));
    const generated = await this.testQuestionService.generateCandidatesWithLLM(request.context.userId, brandId, brand, profile, themes);
    const generatedKeys = new Set(generated.items.map((candidate) => `${candidate.themeId}:${candidate.question}`));
    const created = generated.items
      .filter((candidate) => !existingKeys.has(`${candidate.themeId}:${candidate.question}`))
      .map((candidate) => this.permissionsService.createTestQuestionCandidate(request.context.userId, brandId, candidate))
      .filter((candidate): candidate is TestQuestionCandidate => Boolean(candidate));
    const alreadyWritten = existing.filter((candidate) => generatedKeys.has(`${candidate.themeId}:${candidate.question}`));

    return {
      success: true,
      data: { ...generated, items: [...created, ...alreadyWritten] }
    };
  }

  @Get(':brandId/test-plans')
  async listTestPlans(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<TestPlan[]>> {
    const plans = await this.permissionsService.listTestPlans(request.context.userId, brandId);

    if (!plans) {
      throw new NotFoundException('监测计划不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: plans
    };
  }

  @Get(':brandId/test-plan-templates')
  async listTestPlanTemplates(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<TestPlanTemplate[]>> {
    const templates = await this.permissionsService.listTestPlanTemplates(request.context.userId, brandId);

    if (!templates) {
      throw new NotFoundException('监测计划模板不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: templates
    };
  }

  @Post(':brandId/test-plans')
  async createTestPlan(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: TestPlanInput
  ): Promise<ApiResponse<TestPlanCreationResult>> {
    const plan = await this.permissionsService.createTestPlan(request.context.userId, brandId, normalizeTestPlanInput(body));

    if (!plan) {
      throw new BadRequestException('请先选择至少一个监测问法，并确保目标平台有效');
    }

    return {
      success: true,
      data: toTestPlanCreationResult(plan)
    };
  }

  @Post(':brandId/test-plans/from-template')
  async applyTestPlanTemplate(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: TestPlanTemplateApplicationInput
  ): Promise<ApiResponse<TestPlanCreationResult>> {
    const plan = await this.permissionsService.applyTestPlanTemplate(request.context.userId, brandId, normalizeTestPlanTemplateApplicationInput(body));

    if (!plan) {
      throw new BadRequestException('监测计划模板不存在，或当前品牌无权访问');
    }

    return {
      success: true,
      data: toTestPlanCreationResult(plan)
    };
  }

  @Post(':brandId/test-plans/:planId/duplicate')
  async duplicateTestPlan(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('planId') planId: string,
    @Body() body: TestPlanDuplicateInput
  ): Promise<ApiResponse<TestPlanCreationResult>> {
    const plan = await this.permissionsService.duplicateTestPlan(request.context.userId, brandId, planId, normalizeTestPlanDuplicateInput(body ?? {}));

    if (!plan) {
      throw new NotFoundException('监测计划不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: toTestPlanCreationResult(plan)
    };
  }

  @Post(':brandId/test-plans/:planId/execute')
  async executeTestPlan(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('planId') planId: string
  ): Promise<ApiResponse<TestPlanExecutionResult>> {
    const result = await this.permissionsService.executeTestPlan(request.context.userId, brandId, planId);

    if (!result) {
      throw new NotFoundException('监测计划不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: result
    };
  }

  @Post(':brandId/test-plans/:planId/manual-answers')
  async submitManualTestAnswers(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('planId') planId: string,
    @Body() body: ManualTestAnswerBatchInput | ManualTestAnswerInput
  ): Promise<ApiResponse<ManualTestAnswerBatchResult>> {
    const result = await this.permissionsService.submitManualTestAnswers(request.context.userId, brandId, normalizeManualTestAnswerBatchInput(planId, body));

    if (!result) {
      throw new NotFoundException('监测计划不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: result
    };
  }

  @Get(':brandId/growth-optimization')
  async getGrowthOptimizationWorkspace(
    @Req() request: Request,
    @Param('brandId') brandId: string
  ): Promise<ApiResponse<GrowthOptimizationWorkspace>> {
    const workspace = await this.permissionsService.getGrowthOptimizationWorkspace(request.context.userId, brandId);

    if (!workspace) {
      throw new NotFoundException('增长优化计划不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: workspace
    };
  }

  @Post(':brandId/growth-optimization/generate')
  async generateGrowthOptimizationPlan(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: { sourceTestPlanId?: string }
  ): Promise<ApiResponse<GrowthOptimizationPlan>> {
    const sourceTestPlanId = body?.sourceTestPlanId?.trim();
    const plan = await this.generateGrowthOptimizationPlanWithLLM(request.context.userId, brandId, sourceTestPlanId)
      ?? await this.permissionsService.generateGrowthOptimizationPlan(request.context.userId, brandId, sourceTestPlanId);

    if (!plan) {
      throw new BadRequestException('请先完成首轮监测并生成可分析的监测结果');
    }

    return {
      success: true,
      data: plan
    };
  }

  private async generateGrowthOptimizationPlanWithLLM(userId: string, brandId: string, sourceTestPlanId?: string): Promise<GrowthOptimizationPlan | null> {
    const [brand, profile, runs, workspace, contentDashboard, publishingDashboard, themes, existingCandidates] = await Promise.all([
      Promise.resolve(this.permissionsService.listAccessibleBrandDetails(userId)).then((brands) => brands.find((item) => item.brandId === brandId) ?? null),
      Promise.resolve(this.permissionsService.getBrandProfile(userId, brandId)),
      Promise.resolve(this.permissionsService.listMonitoringRuns(userId, brandId)),
      Promise.resolve(this.permissionsService.getGrowthOptimizationWorkspace(userId, brandId)),
      Promise.resolve(this.permissionsService.getContentCenterDashboard(userId, brandId)),
      Promise.resolve(this.permissionsService.getPublishingDashboard(userId, brandId)),
      Promise.resolve(this.permissionsService.listTestThemes(userId, brandId)),
      Promise.resolve(this.permissionsService.listTestQuestionCandidates(userId, brandId))
    ]);
    const sourceRuns = (runs ?? []).filter((run) => !sourceTestPlanId || (run as { testPlanId?: string }).testPlanId === sourceTestPlanId);
    const analysisResults = sourceRuns.map((run) => run.analysis).filter((analysis): analysis is NonNullable<typeof analysis> => Boolean(analysis));

    if (!brand || !profile || analysisResults.length === 0) {
      return null;
    }

    const response = await this.llmService.runTask<OptimizationPlanningInput, OptimizationPlanningOutput>(userId, brandId, 'optimization_planning', {
      mode: 'sync',
      input: {
        brandDetail: brand,
        brandProfile: profile,
        sourceTestPlanId,
        sourceRunIds: analysisResults.map((analysis) => analysis.runId),
        analysisResults,
        contentAssets: contentDashboard?.assets ?? [],
        publishingRecords: publishingDashboard?.records ?? workspace?.relatedPublishingRecords ?? [],
        currentPlans: workspace?.plans ?? []
      }
    });

    if (response.status !== 'succeeded' || !response.output) {
      return null;
    }

    const plan = await this.permissionsService.createGrowthOptimizationPlan(userId, brandId, normalizeGrowthOptimizationPlanInput({
      ...response.output.plan,
      sourceTestPlanId: response.output.plan.sourceTestPlanId ?? sourceTestPlanId,
      sourceRunIds: response.output.plan.sourceRunIds?.length ? response.output.plan.sourceRunIds : analysisResults.map((analysis) => analysis.runId)
    }));

    if (!plan) {
      return null;
    }

    this.createRetestQuestions(userId, brandId, response.output.retestQuestions, themes ?? [], existingCandidates ?? []);
    response.output.contentTasks.forEach((task) => {
      this.permissionsService.createContentGenerationTask(userId, brandId, {
        ...task,
        growthOptimizationPlanId: task.growthOptimizationPlanId ?? plan.id
      });
    });

    return plan;
  }

  private createRetestQuestions(
    userId: string,
    brandId: string,
    candidates: TestQuestionCandidateInput[],
    themes: TestTheme[],
    existingCandidates: TestQuestionCandidate[]
  ): void {
    const themeIds = new Set(themes.map((theme) => theme.id));
    const existingKeys = new Set(existingCandidates.map((candidate) => `${candidate.themeId}:${candidate.question}`));

    candidates
      .filter((candidate) => themeIds.has(candidate.themeId))
      .filter((candidate) => !existingKeys.has(`${candidate.themeId}:${candidate.question}`))
      .forEach((candidate) => {
        const created = this.permissionsService.createTestQuestionCandidate(userId, brandId, { ...candidate, selected: false });
        if (created) {
          existingKeys.add(`${created.themeId}:${created.question}`);
        }
      });
  }

  @Post(':brandId/growth-optimization/plans')
  async createGrowthOptimizationPlan(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: GrowthOptimizationPlanInput
  ): Promise<ApiResponse<GrowthOptimizationPlan>> {
    const plan = await this.permissionsService.createGrowthOptimizationPlan(request.context.userId, brandId, normalizeGrowthOptimizationPlanInput(body));

    if (!plan) {
      throw new BadRequestException('优化计划字段不完整或当前品牌无权访问');
    }

    return {
      success: true,
      data: plan
    };
  }

  @Post(':brandId/growth-optimization/plans/:planId/confirm')
  async confirmGrowthOptimizationPlan(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('planId') planId: string,
    @Body() body: GrowthOptimizationPlanConfirmInput
  ): Promise<ApiResponse<GrowthOptimizationPlanConfirmationResult>> {
    const result = await this.permissionsService.confirmGrowthOptimizationPlan(request.context.userId, brandId, planId, normalizeGrowthOptimizationPlanConfirmInput(body ?? {}));

    if (!result) {
      throw new NotFoundException('优化计划不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: result
    };
  }

  @Get(':brandId/optimization-units')
  async listOptimizationUnits(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<OptimizationUnit[]>> {
    const units = await this.permissionsService.listOptimizationUnits(request.context.userId, brandId);

    if (!units) {
      throw new NotFoundException('优化单元不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: units
    };
  }

  @Get(':brandId/optimization-units/:unitId')
  async getOptimizationUnit(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('unitId') unitId: string
  ): Promise<ApiResponse<OptimizationUnit>> {
    const unit = await this.permissionsService.getOptimizationUnit(request.context.userId, brandId, unitId);

    if (!unit) {
      throw new NotFoundException('优化单元不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: unit
    };
  }

  @Post(':brandId/optimization-units')
  async createOptimizationUnit(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: OptimizationUnitInput
  ): Promise<ApiResponse<OptimizationUnit>> {
    const unit = await this.permissionsService.createOptimizationUnit(request.context.userId, brandId, normalizeOptimizationUnitInput(body));

    if (!unit) {
      throw new NotFoundException('优化单元不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: unit
    };
  }

  @Patch(':brandId/optimization-units/:unitId')
  async updateOptimizationUnit(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('unitId') unitId: string,
    @Body() body: Partial<OptimizationUnitInput>
  ): Promise<ApiResponse<OptimizationUnit>> {
    const unit = await this.permissionsService.updateOptimizationUnit(
      request.context.userId,
      brandId,
      unitId,
      normalizePartialOptimizationUnitInput(body)
    );

    if (!unit) {
      throw new NotFoundException('优化单元不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: unit
    };
  }

  @Get(':brandId/intents')
  async listUserIntents(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<UserIntent[]>> {
    const intents = await this.permissionsService.listUserIntents(request.context.userId, brandId);

    if (!intents) {
      throw new NotFoundException('用户意图库不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: intents
    };
  }

  @Post(':brandId/intents')
  async createUserIntent(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: UserIntentInput
  ): Promise<ApiResponse<UserIntent>> {
    const intent = await this.permissionsService.createUserIntent(request.context.userId, brandId, normalizeUserIntentInput(body));

    if (!intent) {
      throw new NotFoundException('优化单元不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: intent
    };
  }

  @Patch(':brandId/intents/:intentId')
  async updateUserIntent(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('intentId') intentId: string,
    @Body() body: Partial<UserIntentInput>
  ): Promise<ApiResponse<UserIntent>> {
    const intent = await this.permissionsService.updateUserIntent(
      request.context.userId,
      brandId,
      intentId,
      normalizePartialUserIntentInput(body)
    );

    if (!intent) {
      throw new NotFoundException('用户意图不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: intent
    };
  }

  @Get(':brandId/prompt-templates')
  async listPromptTemplates(): Promise<ApiResponse<PromptTemplate[]>> {
    return {
      success: true,
      data: await this.permissionsService.listPromptTemplates()
    };
  }

  @Post(':brandId/prompt-templates')
  async createPromptTemplate(@Body() body: PromptTemplateInput): Promise<ApiResponse<PromptTemplate>> {
    return {
      success: true,
      data: await this.permissionsService.createPromptTemplate(normalizePromptTemplateInput(body))
    };
  }

  @Get(':brandId/prompts')
  async listBrandPrompts(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<BrandPrompt[]>> {
    const prompts = await this.permissionsService.listBrandPrompts(request.context.userId, brandId);

    if (!prompts) {
      throw new NotFoundException('品牌 Prompt 不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: prompts
    };
  }

  @Post(':brandId/prompts/batch-generate')
  async batchGenerateBrandPrompts(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: PromptBatchGenerateInput
  ): Promise<ApiResponse<BrandPrompt[]>> {
    if (!body.templateId?.trim()) {
      throw new BadRequestException('请选择 Prompt 模板');
    }

    const prompts = await this.permissionsService.batchGenerateBrandPrompts(request.context.userId, brandId, {
      templateId: body.templateId.trim(),
      intentIds: normalizeStringList(body.intentIds)
    });

    if (!prompts) {
      throw new NotFoundException('模板、用户意图或当前品牌不存在');
    }

    return {
      success: true,
      data: prompts
    };
  }

  @Patch(':brandId/prompts/:promptId')
  async updateBrandPrompt(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('promptId') promptId: string,
    @Body() body: Partial<BrandPromptInput>
  ): Promise<ApiResponse<BrandPrompt>> {
    const prompt = await this.permissionsService.updateBrandPrompt(
      request.context.userId,
      brandId,
      promptId,
      normalizePartialBrandPromptInput(body)
    );

    if (!prompt) {
      throw new NotFoundException('品牌 Prompt 不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: prompt
    };
  }
}

function normalizeBrandInput(input: BrandMutationInput): BrandMutationInput {
  const normalized = normalizePartialBrandInput(input);

  if (!normalized.name || !normalized.industry || !normalized.businessScope || !normalized.targetAudience) {
    throw new BadRequestException('品牌名称、行业、业务范围和目标用户不能为空');
  }

  return normalized as BrandMutationInput;
}

function normalizePartialBrandInput(input: Partial<BrandMutationInput>): Partial<BrandMutationInput> {
  return {
    ...input,
    name: input.name?.trim(),
    aliases: input.aliases?.map((item) => item.trim()).filter(Boolean),
    industry: input.industry?.trim(),
    website: input.website?.trim(),
    targetCities: input.targetCities?.map((item) => item.trim()).filter(Boolean),
    businessScope: input.businessScope?.trim(),
    targetAudience: input.targetAudience?.trim()
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
    faqs: (input.faqs ?? [])
      .map((faq) => ({ question: faq.question.trim(), answer: faq.answer.trim() }))
      .filter((faq) => faq.question || faq.answer)
  };
}

function normalizeStringList(values: string[] = []): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function isSupportedBrandImportFile(fileName: string, mimeType: string): boolean {
  const extension = extname(fileName).toLowerCase();

  return supportedBrandImportExtensions.includes(extension) && supportedBrandImportMimeTypes.includes(mimeType);
}

function persistBrandImportFile(brandId: string, file: UploadedBrandFile): string {
  if (!existsSync(brandImportUploadDir)) {
    mkdirSync(brandImportUploadDir, { recursive: true });
  }

  const extension = extname(file.originalname).toLowerCase();
  const baseName = file.originalname.slice(0, -extension.length) || 'brand-import';
  const safeBaseName = baseName.replace(/[^a-zA-Z0-9._-]+/g, '-').replace(/^-+|-+$/g, '') || 'brand-import';
  const safeBrandId = brandId.replace(/[^a-zA-Z0-9._-]+/g, '-');
  const fileName = `${safeBrandId}-${Date.now()}-${safeBaseName}${extension}`;
  const filePath = join(brandImportUploadDir, fileName);

  writeFileSync(filePath, file.buffer);

  return `uploads/brand-imports/${fileName}`;
}

function normalizeKnowledgeSourceInput(input: KnowledgeSourceInput): KnowledgeSourceInput {
  const sourceType = input.sourceType;

  if (!input.name?.trim()) {
    throw new BadRequestException('素材名称不能为空');
  }

  if (!['file', 'webpage', 'wechat_article', 'external_document'].includes(sourceType)) {
    throw new BadRequestException('知识库来源类型不支持');
  }

  if (sourceType === 'file' && !input.fileRef?.trim()) {
    throw new BadRequestException('本地文件导入需要文件引用');
  }

  if (sourceType !== 'file' && !input.sourceUrl?.trim()) {
    throw new BadRequestException('链接类素材需要来源链接');
  }

  if (input.status && !knowledgeSourceStatuses.includes(input.status)) {
    throw new BadRequestException('知识库来源状态不支持');
  }

  return {
    name: input.name.trim(),
    sourceType,
    sourceUrl: input.sourceUrl?.trim(),
    fileRef: input.fileRef?.trim(),
    status: input.status
  };
}

function normalizeBrandImportConfirmInput(input: BrandImportConfirmInput): BrandImportConfirmInput {
  const fields = Array.isArray(input.fields) ? input.fields : [];

  if (fields.length === 0) {
    throw new BadRequestException('请确认至少一个品牌资料字段');
  }

  return {
    fields: fields.map((field) => {
      if (!brandImportFieldKeys.includes(field.key)) {
        throw new BadRequestException('品牌资料字段不支持');
      }

      return {
        key: field.key,
        value: field.value
      };
    })
  };
}

function normalizeOptimizationUnitInput(input: OptimizationUnitInput): OptimizationUnitInput {
  const normalized = normalizePartialOptimizationUnitInput(input);

  if (!normalized.name) {
    throw new BadRequestException('优化单元名称不能为空');
  }

  if (!normalized.type) {
    throw new BadRequestException('优化单元类型不能为空');
  }

  if (!normalized.priority) {
    throw new BadRequestException('优化优先级不能为空');
  }

  return normalized as OptimizationUnitInput;
}

function normalizePartialOptimizationUnitInput(input: Partial<OptimizationUnitInput>): Partial<OptimizationUnitInput> {
  if (input.type && !optimizationUnitTypes.includes(input.type)) {
    throw new BadRequestException('优化单元类型不支持');
  }

  if (input.priority && !optimizationUnitPriorities.includes(input.priority)) {
    throw new BadRequestException('优化优先级不支持');
  }

  return {
    name: input.name?.trim(),
    type: input.type,
    targetKeywords: input.targetKeywords ? normalizeStringList(input.targetKeywords) : undefined,
    priority: input.priority,
    enabled: input.enabled
  };
}

function normalizePartialTestThemeInput(input: Partial<TestThemeInput>): Partial<TestThemeInput> {
  if (input.type && !testThemeTypes.includes(input.type)) {
    throw new BadRequestException('测试主题类型不支持');
  }

  if (input.priority && !optimizationUnitPriorities.includes(input.priority)) {
    throw new BadRequestException('测试主题优先级不支持');
  }

  return {
    type: input.type,
    name: input.name?.trim(),
    businessExplanation: input.businessExplanation?.trim(),
    priority: input.priority,
    estimatedValue: input.estimatedValue?.trim(),
    enabled: input.enabled,
    sourceProfileFields: input.sourceProfileFields?.filter((field) => brandImportFieldKeys.includes(field))
  };
}

function normalizeTestQuestionCandidateListQuery(query: Record<string, string | undefined>): TestQuestionCandidateListQuery {
  const limit = query.limit ? Number.parseInt(query.limit, 10) : undefined;
  const offset = query.offset ? Number.parseInt(query.offset, 10) : undefined;

  if (query.selected !== undefined && !['true', 'false'].includes(query.selected)) {
    throw new BadRequestException('测试问法选择状态参数不支持');
  }

  if (limit !== undefined && (!Number.isFinite(limit) || limit < 1 || limit > 100)) {
    throw new BadRequestException('测试问法分页数量必须在 1 到 100 之间');
  }

  if (offset !== undefined && (!Number.isFinite(offset) || offset < 0)) {
    throw new BadRequestException('测试问法分页偏移量不能小于 0');
  }

  return {
    themeId: query.themeId?.trim(),
    selected: query.selected === undefined ? undefined : query.selected === 'true',
    limit,
    offset
  };
}

function normalizePartialTestQuestionCandidateInput(input: TestQuestionCandidateUpdateInput): TestQuestionCandidateUpdateInput {
  if (input.priority && !optimizationUnitPriorities.includes(input.priority)) {
    throw new BadRequestException('测试问法优先级不支持');
  }

  if (input.purposes && input.purposes.some((purpose) => !testQuestionPurposes.includes(purpose))) {
    throw new BadRequestException('测试目的不支持');
  }

  const question = input.question?.trim();
  if (input.question !== undefined && !question) {
    throw new BadRequestException('测试问法不能为空');
  }

  const targetPlatforms = input.targetPlatforms ? normalizeStringList(input.targetPlatforms) : undefined;
  if (input.targetPlatforms && targetPlatforms?.length === 0) {
    throw new BadRequestException('测试问法至少需要一个目标平台');
  }

  return {
    themeId: input.themeId?.trim(),
    question,
    purposes: input.purposes,
    targetPlatforms,
    priority: input.priority,
    estimatedValue: input.estimatedValue?.trim(),
    editable: input.editable,
    selected: input.selected
  };
}

function normalizeTestQuestionCandidateSelectionInput(input: TestQuestionCandidateSelectionInput): TestQuestionCandidateSelectionInput {
  const candidateIds = normalizeStringList(input.candidateIds);
  if (candidateIds.length === 0) {
    throw new BadRequestException('请选择至少一个测试问法');
  }

  if (typeof input.selected !== 'boolean') {
    throw new BadRequestException('测试问法选择状态必须为布尔值');
  }

  return {
    themeId: input.themeId?.trim(),
    candidateIds,
    selected: input.selected
  };
}

function normalizeTestPlanInput(input: TestPlanInput): TestPlanInput {
  if (input.executionMethod && !testPlanExecutionMethods.includes(input.executionMethod)) {
    throw new BadRequestException('监测计划执行方式不支持');
  }

  const candidateIds = input.candidateIds ? normalizeStringList(input.candidateIds) : undefined;
  const platformCodes = input.platformCodes ? normalizeStringList(input.platformCodes) : undefined;
  const questions = input.questions?.map((question) => ({
    candidateId: question.candidateId?.trim(),
    promptId: question.promptId?.trim(),
    question: question.question.trim(),
    purposes: question.purposes.filter((purpose) => testQuestionPurposes.includes(purpose)),
    targetPlatforms: normalizeStringList(question.targetPlatforms)
  })).filter((question) => question.question && question.targetPlatforms.length > 0);

  if (input.questions && questions?.length === 0) {
    throw new BadRequestException('监测计划至少需要一个有效问题');
  }

  return {
    name: input.name?.trim(),
    candidateIds,
    questions,
    platformCodes,
    executionMethod: input.executionMethod
  };
}

function normalizeTestPlanTemplateApplicationInput(input: TestPlanTemplateApplicationInput): TestPlanTemplateApplicationInput {
  if (!input.templateId?.trim()) {
    throw new BadRequestException('请选择监测计划模板');
  }

  return {
    templateId: input.templateId.trim(),
    name: input.name?.trim()
  };
}

function normalizeTestPlanDuplicateInput(input: TestPlanDuplicateInput): TestPlanDuplicateInput {
  return {
    name: input.name?.trim(),
    retest: input.retest ?? false
  };
}

function normalizeManualTestAnswerBatchInput(planId: string, input: ManualTestAnswerBatchInput | ManualTestAnswerInput): ManualTestAnswerBatchInput {
  const answers = 'answers' in input && Array.isArray(input.answers) ? input.answers : [input as ManualTestAnswerInput];

  return {
    answers: answers.map((answer) => ({
      testPlanId: planId.trim(),
      question: answer.question?.trim() ?? '',
      platformCode: answer.platformCode?.trim() ?? '',
      rawText: answer.rawText?.trim() ?? '',
      citations: normalizeStringList(answer.citations),
      modelName: answer.modelName?.trim()
    }))
  };
}

function normalizeGrowthOptimizationPlanInput(input: GrowthOptimizationPlanInput): GrowthOptimizationPlanInput {
  const dueDate = input.dueDate?.trim();
  const retestAt = input.retestAt?.trim();
  const publishingPlatforms = normalizeStringList(input.publishingPlatforms);

  if (!dueDate) {
    throw new BadRequestException('优化计划需要填写截止时间');
  }
  if (!retestAt) {
    throw new BadRequestException('优化计划需要填写复测时间');
  }
  if (publishingPlatforms.length === 0) {
    throw new BadRequestException('优化计划需要至少一个发布平台');
  }

  return {
    sourceTestPlanId: input.sourceTestPlanId?.trim(),
    sourceRunIds: normalizeStringList(input.sourceRunIds),
    summary: input.summary?.trim(),
    reasons: input.reasons ?? [],
    priority: input.priority,
    ownerId: input.ownerId?.trim(),
    dueDate,
    publishingPlatforms,
    retestAt,
    contentRecommendations: input.contentRecommendations?.map((item) => ({
      ...item,
      title: item.title.trim(),
      targetPlatform: item.targetPlatform.trim(),
      targetKeywords: normalizeStringList(item.targetKeywords),
      reason: item.reason.trim(),
      sourceStrategyId: item.sourceStrategyId?.trim(),
      generationTaskId: item.generationTaskId?.trim()
    })).filter((item) => item.title && item.targetPlatform && item.reason)
  };
}

function normalizeGrowthOptimizationPlanConfirmInput(input: GrowthOptimizationPlanConfirmInput): GrowthOptimizationPlanConfirmInput {
  return {
    ownerId: input.ownerId?.trim(),
    dueDate: input.dueDate?.trim(),
    publishingPlatforms: input.publishingPlatforms ? normalizeStringList(input.publishingPlatforms) : undefined,
    retestAt: input.retestAt?.trim()
  };
}

function toTestPlanCreationResult(plan: TestPlan): TestPlanCreationResult {
  return {
    plan,
    questionCount: plan.questions.length,
    platformCount: plan.platformCodes.length,
    targetPlatforms: plan.platformCodes,
    estimatedDurationMinutes: plan.estimatedDurationMinutes,
    connectionSummary: plan.connectionSummary,
    confirmationItems: plan.confirmationItems
  };
}

const optimizationUnitTypes: OptimizationUnitType[] = ['brand', 'category', 'scenario', 'location', 'competitor'];
const optimizationUnitPriorities: OptimizationUnitPriority[] = ['high', 'medium', 'low'];
const testThemeTypes: TestThemeType[] = ['brand', 'category', 'location', 'age_group', 'pain_point', 'offering', 'competitor', 'buying_decision'];
const testQuestionPurposes: TestQuestionPurpose[] = ['brand_mentioned', 'rank_first', 'value_prop_accuracy', 'competitor_presence', 'risk_expression'];
const testPlanExecutionMethods: TestPlan['executionMethod'][] = ['api', 'browser', 'manual'];
const knowledgeSourceStatuses: KnowledgeSource['status'][] = ['pending', 'processing', 'completed', 'failed'];
const brandImportFieldKeys: BrandImportConfirmInput['fields'][number]['key'][] = [
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
];

function normalizeUserIntentInput(input: UserIntentInput): UserIntentInput {
  const normalized = normalizePartialUserIntentInput(input);

  if (!normalized.optimizationUnitId?.trim()) {
    throw new BadRequestException('请选择关联优化单元');
  }

  if (!normalized.category) {
    throw new BadRequestException('请选择意图分类');
  }

  if (!normalized.text) {
    throw new BadRequestException('用户意图不能为空');
  }

  if (!normalized.monitoringFrequency) {
    throw new BadRequestException('请选择监测频率');
  }

  return normalized as UserIntentInput;
}

function normalizePartialUserIntentInput(input: Partial<UserIntentInput>): Partial<UserIntentInput> {
  if (input.category && !userIntentCategories.includes(input.category)) {
    throw new BadRequestException('意图分类不支持');
  }

  if (input.monitoringFrequency && !monitoringFrequencies.includes(input.monitoringFrequency)) {
    throw new BadRequestException('监测频率不支持');
  }

  return {
    optimizationUnitId: input.optimizationUnitId?.trim(),
    category: input.category,
    text: input.text?.trim(),
    monitoringFrequency: input.monitoringFrequency,
    enabled: input.enabled
  };
}

function normalizePromptTemplateInput(input: PromptTemplateInput): PromptTemplateInput {
  if (!input.name?.trim()) {
    throw new BadRequestException('模板名称不能为空');
  }

  if (!input.text?.trim()) {
    throw new BadRequestException('Prompt 模板文本不能为空');
  }

  if (!input.category || !userIntentCategories.includes(input.category)) {
    throw new BadRequestException('模板分类不支持');
  }

  if (!input.frequency || !monitoringFrequencies.includes(input.frequency)) {
    throw new BadRequestException('监测频率不支持');
  }

  const platformCodes = normalizeStringList(input.platformCodes);
  if (platformCodes.length === 0) {
    throw new BadRequestException('Prompt 模板至少需要一个目标平台');
  }

  return {
    name: input.name.trim(),
    industry: input.industry?.trim(),
    category: input.category,
    text: input.text.trim(),
    targetKeywords: normalizeStringList(input.targetKeywords),
    platformCodes,
    frequency: input.frequency
  };
}

function normalizePartialBrandPromptInput(input: Partial<BrandPromptInput>): Partial<BrandPromptInput> {
  if (input.monitoringFrequency && !monitoringFrequencies.includes(input.monitoringFrequency)) {
    throw new BadRequestException('监测频率不支持');
  }

  const platformCodes = input.platformCodes ? normalizeStringList(input.platformCodes) : undefined;
  if (input.platformCodes && platformCodes?.length === 0) {
    throw new BadRequestException('品牌 Prompt 至少需要一个目标平台');
  }

  return {
    text: input.text?.trim(),
    targetKeywords: input.targetKeywords ? normalizeStringList(input.targetKeywords) : undefined,
    platformCodes,
    monitoringFrequency: input.monitoringFrequency,
    enabled: input.enabled
  };
}
