import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  AnalysisResult,
  AnalysisResultInput,
  AnalysisSentiment,
  AnswerAnalysisInput,
  ApiResponse,
  ManualResponseInput,
  MonitoringRunDetail,
  MonitoringRunInput
} from '@geo-platform/shared-types';
import { LLMOrchestrationService } from '../llm/llm-orchestration.service';
import { PermissionsService } from '../permissions/permissions.service';
import { applyAnalysisRuleGuard } from './llm-analysis-guard';
import { ProductEventRecorderService } from '../product-events/product-event-recorder.service';

@Controller('brands/:brandId/monitoring-runs')
export class MonitoringController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly llmService: LLMOrchestrationService,
    private readonly productEventRecorder?: ProductEventRecorderService
  ) {}

  @Get()
  async listMonitoringRuns(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<MonitoringRunDetail[]>> {
    const runs = await this.permissionsService.listMonitoringRuns(request.context.userId, brandId);

    if (!runs) {
      throw new NotFoundException('监测记录不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: runs
    };
  }

  @Get(':runId')
  async getMonitoringRun(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('runId') runId: string
  ): Promise<ApiResponse<MonitoringRunDetail>> {
    const run = await this.permissionsService.getMonitoringRun(request.context.userId, brandId, runId);

    if (!run) {
      throw new NotFoundException('监测记录不存在或当前用户无权访问');
    }
    return {
      success: true,
      data: run
    };
  }

  @Post()
  async createMonitoringRun(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: MonitoringRunInput
  ): Promise<ApiResponse<MonitoringRunDetail>> {
    const run = await this.permissionsService.createMonitoringRun(request.context.userId, brandId, normalizeMonitoringRunInput(body));

    if (!run) {
      throw new BadRequestException('Prompt、平台配置不存在，或当前用户无权访问');
    }

    return {
      success: true,
      data: run
    };
  }

  @Post(':runId/manual-response')
  async addManualResponse(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('runId') runId: string,
    @Body() body: ManualResponseInput
  ): Promise<ApiResponse<MonitoringRunDetail>> {
    const run = await this.permissionsService.addManualResponse(request.context.userId, brandId, runId, normalizeManualResponseInput(body));

    if (!run) {
      throw new NotFoundException('监测记录不存在或当前用户无权访问');
    }
    await this.productEventRecorder?.record({
      actorUserId: request.context.userId,
      brandId,
      eventType: 'first_monitoring_completed',
      entityType: 'monitoring_run',
      entityId: runId,
      idempotencyKey: 'first-monitoring-completed',
      metadata: { collectionMethod: body.collectionMethod ?? 'manual' }
    });

    return {
      success: true,
      data: run
    };
  }

  @Get(':runId/analysis')
  async getAnalysisResult(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('runId') runId: string
  ): Promise<ApiResponse<AnalysisResult>> {
    const result = await this.permissionsService.getAnalysisResult(request.context.userId, brandId, runId);

    if (!result) {
      throw new NotFoundException('解析结果不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: result
    };
  }

  @Post(':runId/analysis/parse')
  async parseAnalysisResult(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('runId') runId: string
  ): Promise<ApiResponse<AnalysisResult>> {
    const result = await this.permissionsService.parseAnalysisResult(request.context.userId, brandId, runId);

    if (!result) {
      throw new NotFoundException('原始回答不存在或当前用户无权访问');
    }

    const llmResult = await this.parseAnalysisResultWithLLM(request.context.userId, brandId, runId, result);

    return {
      success: true,
      data: llmResult ?? result
    };
  }

  @Patch(':runId/analysis')
  async updateAnalysisResult(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('runId') runId: string,
    @Body() body: AnalysisResultInput
  ): Promise<ApiResponse<AnalysisResult>> {
    const result = await this.permissionsService.updateAnalysisResult(request.context.userId, brandId, runId, normalizeAnalysisResultInput(body));

    if (!result) {
      throw new NotFoundException('解析结果不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: result
    };
  }

  private async parseAnalysisResultWithLLM(userId: string, brandId: string, runId: string, ruleResult: AnalysisResult): Promise<AnalysisResult | null> {
    const [run, brand, profile] = await Promise.all([
      this.permissionsService.getMonitoringRun(userId, brandId, runId),
      Promise.resolve(this.permissionsService.listAccessibleBrandDetails(userId)).then((brands) => brands.find((item) => item.brandId === brandId) ?? null),
      Promise.resolve(this.permissionsService.getBrandProfile(userId, brandId))
    ]);

    if (!run?.response || !brand || !profile) {
      return null;
    }

    const response = await this.llmService.runTask<AnswerAnalysisInput, AnalysisResultInput>(userId, brandId, 'answer_analysis', {
      mode: 'sync',
      input: {
        brandDetail: brand,
        brandProfile: profile,
        promptText: run.promptText,
        rawAnswer: run.response.rawText,
        platformCode: run.platformCode,
        modelName: run.response.modelName,
        respondedAt: run.response.respondedAt,
        sourceRunId: run.id
      }
    });

    if (response.status !== 'succeeded' || !response.output) {
      return null;
    }

    return this.permissionsService.updateAnalysisResult(userId, brandId, runId, applyAnalysisRuleGuard(response.output, ruleResult));
  }
}

function normalizeMonitoringRunInput(input: MonitoringRunInput): MonitoringRunInput {
  if (!input.promptId?.trim()) {
    throw new BadRequestException('请选择 Prompt');
  }

  if (!input.platformCode?.trim()) {
    throw new BadRequestException('请选择 AI 平台');
  }
  if (input.collectionMethod && !monitoringCollectionMethods.includes(input.collectionMethod)) {
    throw new BadRequestException('采集方式不合法');
  }
  if (input.evidenceLevel && !monitoringEvidenceLevels.includes(input.evidenceLevel)) {
    throw new BadRequestException('证据等级不合法');
  }
  if (input.clientSurface && !monitoringClientSurfaces.includes(input.clientSurface)) {
    throw new BadRequestException('访问端不合法');
  }

  return {
    promptId: input.promptId.trim(),
    platformCode: input.platformCode.trim(),
    modelName: input.modelName?.trim(),
    collectionMethod: input.collectionMethod,
    clientSurface: input.clientSurface,
    searchEnabled: input.searchEnabled ?? null,
    market: input.market?.trim(),
    language: input.language?.trim(),
    evidenceLevel: input.evidenceLevel,
    manualConfirmed: input.manualConfirmed ?? null,
    baselineVersion: input.baselineVersion?.trim()
  };
}

function normalizeManualResponseInput(input: ManualResponseInput): ManualResponseInput {
  if (!input.rawText?.trim()) {
    throw new BadRequestException('原始回答不能为空');
  }
  if (input.clientSurface && !monitoringClientSurfaces.includes(input.clientSurface)) {
    throw new BadRequestException('访问端不合法');
  }

  return {
    rawText: input.rawText.trim(),
    citations: input.citations ?? [],
    modelName: input.modelName?.trim(),
    collectionMethod: 'manual',
    clientSurface: input.clientSurface,
    searchEnabled: input.searchEnabled ?? null,
    market: input.market?.trim(),
    language: input.language?.trim(),
    evidenceLevel: 'manual_or_browser',
    manualConfirmed: input.manualConfirmed ?? null,
    baselineVersion: input.baselineVersion?.trim()
  };
}

function normalizeAnalysisResultInput(input: AnalysisResultInput): AnalysisResultInput {
  if (input.sentiment !== undefined && !analysisSentiments.includes(input.sentiment)) {
    throw new BadRequestException('情绪倾向不合法');
  }

  return {
    brandMentioned: input.brandMentioned,
    brandRank: Object.hasOwn(input, 'brandRank') ? input.brandRank ?? null : undefined,
    sentiment: input.sentiment,
    accuracyScore: input.accuracyScore,
    citationScore: input.citationScore,
    platformEvaluation: input.platformEvaluation?.trim(),
    recommendationReason: input.recommendationReason?.trim(),
    rankingReason: input.rankingReason?.trim(),
    expressionCompleteness: input.expressionCompleteness?.trim(),
    expressionDeviation: input.expressionDeviation?.trim(),
    competitorMentions: Object.hasOwn(input, 'competitorMentions') ? input.competitorMentions ?? [] : undefined,
    reviewRequired: input.reviewRequired
  };
}

const analysisSentiments: AnalysisSentiment[] = ['positive', 'neutral', 'negative', 'unknown'];
const monitoringCollectionMethods = ['api', 'browser', 'manual', 'mock', 'unknown'] as const;
const monitoringEvidenceLevels = ['manual_or_browser', 'reproducible_api', 'demo', 'unknown'] as const;
const monitoringClientSurfaces = ['api', 'web', 'app', 'unknown'] as const;
