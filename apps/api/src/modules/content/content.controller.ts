import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  ApiResponse,
  CitationSource,
  ContentAsset,
  ContentAssetFilter,
  ContentAssetInput,
  ContentAssetPageInput,
  ContentAssetPageItem,
  ContentReadinessInput,
  ContentReadinessResult,
  ContentAssetStatus,
  ContentCenterDashboard,
  ContentExportRecord,
  ContentGenerationTaskInput,
  ContentGenerationRetryInput,
  ContentGenerationWorkspace,
  ContentStrategy,
  ContentStrategyFilter,
  ContentStrategyPriority,
  ContentStrategyStatus,
  ContentStrategyType,
  ContentVersionInput,
  GrowthOptimizationContentTaskInput,
  OptimizationTask,
  PublishingEntryPayload,
  PublishingRecord
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { ContentReadinessService } from './content-readiness.service';
import { ProductEventRecorderService } from '../product-events/product-event-recorder.service';

@Controller('brands/:brandId/content')
export class ContentController {
  constructor(private readonly permissionsService: PermissionsService, private readonly productEventRecorder: ProductEventRecorderService) {}

  @Get()
  async getContentCenter(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<ContentCenterDashboard>> {
    const dashboard = await this.permissionsService.getContentCenterDashboard(request.context.userId, brandId);

    if (!dashboard) {
      throw new NotFoundException('内容中心不存在或当前用户无权访问');
    }

    return { success: true, data: dashboard };
  }

  @Get('assets')
  async listAssets(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Query() query: ContentAssetFilter
  ): Promise<ApiResponse<ContentAsset[]>> {
    const assets = await this.permissionsService.listContentAssets(request.context.userId, brandId, normalizeAssetFilter(query));

    if (!assets) {
      throw new NotFoundException('内容资产不存在或当前用户无权访问');
    }

    return { success: true, data: assets };
  }

  @Post('assets')
  async createAsset(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: ContentAssetInput
  ): Promise<ApiResponse<ContentAsset>> {
    const asset = await this.permissionsService.createContentAsset(request.context.userId, brandId, normalizeAssetInput(input, true));

    if (!asset) {
      throw new NotFoundException('内容资产关联对象不存在或当前用户无权访问');
    }
    await this.productEventRecorder.record({ actorUserId: request.context.userId, brandId, eventType: 'content_saved', entityType: 'content_asset', entityId: asset.id, idempotencyKey: `content-asset:${asset.id}`, metadata: { contentType: asset.type } });

    return { success: true, data: asset };
  }

  @Patch('assets/:assetId')
  async updateAsset(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('assetId') assetId: string,
    @Body() input: ContentAssetInput
  ): Promise<ApiResponse<ContentAsset>> {
    const asset = await this.permissionsService.updateContentAsset(request.context.userId, brandId, assetId, normalizeAssetInput(input, false));

    if (!asset) {
      throw new NotFoundException('内容资产不存在或当前用户无权访问');
    }

    return { success: true, data: asset };
  }

  @Get('strategies')
  async listStrategies(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Query() query: ContentStrategyFilter
  ): Promise<ApiResponse<ContentStrategy[]>> {
    const strategies = await this.permissionsService.listContentStrategies(request.context.userId, brandId, normalizeStrategyFilter(query));

    if (!strategies) {
      throw new NotFoundException('内容策略不存在或当前用户无权访问');
    }

    return { success: true, data: strategies };
  }

  @Post('strategies/generate')
  async generateStrategies(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<ContentStrategy[]>> {
    const strategies = await this.permissionsService.generateContentStrategies(request.context.userId, brandId);

    if (!strategies) {
      throw new NotFoundException('内容策略无法生成或当前用户无权访问');
    }

    return { success: true, data: strategies };
  }

  @Get('generation')
  async getGenerationWorkspace(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Query('taskId') taskId?: string
  ): Promise<ApiResponse<ContentGenerationWorkspace>> {
    const workspace = await this.permissionsService.getContentGenerationWorkspace(request.context.userId, brandId, taskId?.trim());

    if (!workspace) {
      throw new NotFoundException('内容生成工作台不存在或当前用户无权访问');
    }
    await this.productEventRecorder.record({ actorUserId: request.context.userId, brandId, eventType: 'content_saved', entityType: 'content_version', entityId: workspace.currentVersion?.id ?? taskId, idempotencyKey: `content-version:${taskId}:${workspace.currentVersion?.id ?? 'saved'}` });

    return { success: true, data: workspace };
  }

  @Post('generation/tasks')
  async createGenerationTask(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: ContentGenerationTaskInput
  ): Promise<ApiResponse<ContentGenerationWorkspace>> {
    const workspace = await this.permissionsService.createContentGenerationTask(request.context.userId, brandId, normalizeGenerationTaskInput(input));

    if (!workspace) {
      throw new NotFoundException('内容策略不存在或当前用户无权访问');
    }

    return { success: true, data: workspace };
  }

  @Post('generation/growth-optimization/tasks')
  async createGrowthOptimizationGenerationTasks(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: GrowthOptimizationContentTaskInput
  ): Promise<ApiResponse<ContentGenerationWorkspace>> {
    const workspace = await this.permissionsService.createContentGenerationTasksFromGrowthPlan(request.context.userId, brandId, normalizeGrowthOptimizationContentTaskInput(input));

    if (!workspace) {
      throw new NotFoundException('增长优化计划不存在、无内容建议或当前用户无权访问');
    }

    return { success: true, data: workspace };
  }


  @Post('generation/tasks/:taskId/versions')
  async saveVersion(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('taskId') taskId: string,
    @Body() input: ContentVersionInput
  ): Promise<ApiResponse<ContentGenerationWorkspace>> {
    const workspace = await this.permissionsService.saveContentVersion(request.context.userId, brandId, taskId, normalizeVersionInput(input));

    if (!workspace) {
      throw new NotFoundException('内容生成任务不存在或当前用户无权访问');
    }

    return { success: true, data: workspace };
  }

  @Post('generation/tasks/:taskId/retry')
  async retryGenerationTask(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('taskId') taskId: string,
    @Body() input: ContentGenerationRetryInput = {}
  ): Promise<ApiResponse<ContentGenerationWorkspace>> {
    const workspace = await this.permissionsService.retryContentGenerationTask(request.context.userId, brandId, taskId, input);

    if (!workspace) {
      throw new NotFoundException('内容生成任务不存在或当前用户无权访问');
    }

    return { success: true, data: workspace };
  }

  @Post('generation/tasks/:taskId/export')
  async exportMarkdown(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('taskId') taskId: string,
    @Body('versionId') versionId?: string
  ): Promise<ApiResponse<ContentExportRecord>> {
    const record = await this.permissionsService.exportContentMarkdown(request.context.userId, brandId, taskId, versionId?.trim());

    if (!record) {
      throw new NotFoundException('内容版本不存在或当前用户无权访问');
    }

    return { success: true, data: record };
  }

  @Post('generation/tasks/:taskId/publish-entry')
  async getPublishEntry(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('taskId') taskId: string,
    @Body('versionId') versionId?: string
  ): Promise<ApiResponse<PublishingEntryPayload>> {
    const payload = await this.permissionsService.getPublishingEntryPayload(request.context.userId, brandId, taskId, versionId?.trim());

    if (!payload) {
      throw new NotFoundException('内容版本不存在或当前用户无权访问');
    }

    return { success: true, data: payload };
  }
}

@Controller('brands/:brandId/content-assets')
export class ContentAssetsPageController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly contentReadinessService: ContentReadinessService
  ) {}

  @Get()
  async listContentAssetsPage(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<ContentAssetPageItem[]>> {
    const assets = await this.permissionsService.listContentAssets(request.context.userId, brandId, {});
    const citationDashboard = await this.permissionsService.getCitationDashboard(request.context.userId, brandId);
    const publishingDashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);
    const growthWorkspace = await this.permissionsService.getGrowthOptimizationWorkspace(request.context.userId, brandId);

    if (!assets || !citationDashboard || !publishingDashboard || !growthWorkspace) {
      throw new NotFoundException('内容资产不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: buildContentAssetPageItems(assets, citationDashboard.sources, publishingDashboard.records, growthWorkspace.relatedTasks)
    };
  }

  @Post()
  async createContentAssetPageItem(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: ContentAssetPageInput
  ): Promise<ApiResponse<ContentAssetPageItem>> {
    const normalized = normalizeContentAssetPageInput(input);
    const asset = await this.permissionsService.createContentAsset(request.context.userId, brandId, normalizeAssetInput(normalized, true));

    if (!asset) {
      throw new NotFoundException('内容资产关联对象不存在或当前用户无权访问');
    }

    const citationDashboard = await this.permissionsService.getCitationDashboard(request.context.userId, brandId);
    const publishingDashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);
    const growthWorkspace = await this.permissionsService.getGrowthOptimizationWorkspace(request.context.userId, brandId);

    return {
      success: true,
      data: buildContentAssetPageItem(asset, citationDashboard?.sources ?? [], publishingDashboard?.records ?? [], growthWorkspace?.relatedTasks ?? [])
    };
  }

  @Post(':assetId/readiness')
  async inspectReadiness(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('assetId') assetId: string,
    @Body() input: ContentReadinessInput
  ): Promise<ApiResponse<ContentReadinessResult>> {
    if (!input.body?.trim()) throw new BadRequestException('待检查正文不能为空');
    const result = await this.contentReadinessService.inspect(request.context.userId, brandId, assetId, input);
    if (!result) throw new NotFoundException('内容资产不存在或当前用户无权访问');
    return { success: true, data: result };
  }
}

function buildContentAssetPageItems(assets: ContentAsset[], citations: CitationSource[], publishingRecords: PublishingRecord[], tasks: OptimizationTask[]): ContentAssetPageItem[] {
  return assets.map((asset) => buildContentAssetPageItem(asset, citations, publishingRecords, tasks));
}

function buildContentAssetPageItem(asset: ContentAsset, citations: CitationSource[], publishingRecords: PublishingRecord[], tasks: OptimizationTask[]): ContentAssetPageItem {
  const assetCitations = citations.filter((citation) => citation.contentAssetId === asset.id);
  const assetPublishingRecords = publishingRecords.filter((record) => record.contentAssetId === asset.id);
  const relatedTask = tasks.find((task) => task.contentLink === asset.url || task.contentLink === asset.id);
  const publishedRecords = assetPublishingRecords.filter((record) => record.status === 'published').length;
  const failedRecords = assetPublishingRecords.filter((record) => record.status === 'failed').length;

  return {
    ...asset,
    optimizationUnitId: relatedTask?.optimizationUnitId,
    userIntent: relatedTask?.relatedPromptId,
    sourceReferences: assetCitations.length > 0
      ? assetCitations.map((citation) => ({ type: 'citation', title: citation.title, url: citation.url }))
      : [{ type: 'manual', title: asset.brandAdaptation || '手动补充内容来源', url: asset.url }],
    reviewStatus: asset.status === 'archived' ? 'needs_revision' : asset.status === 'published' ? 'approved' : 'pending',
    publishStatus: getContentAssetPublishStatus(assetPublishingRecords, asset.status),
    retestPlanId: relatedTask?.retestRecords[0]?.id,
    publishingStats: {
      brandId: asset.brandId,
      totalRecords: assetPublishingRecords.length,
      publishedRecords,
      failedRecords,
      citationCount: assetCitations.reduce((total, citation) => total + citation.citationCount, 0),
      relatedIntentCount: new Set(assetCitations.map((citation) => citation.promptId)).size
    }
  };
}

function getContentAssetPublishStatus(records: PublishingRecord[], assetStatus: ContentAssetStatus): ContentAssetPageItem['publishStatus'] {
  if (records.some((record) => record.status === 'failed')) return 'failed';
  if (records.some((record) => record.status === 'published') || assetStatus === 'published') return 'published';
  if (records.some((record) => record.status === 'pending')) return 'pending';
  if (records.some((record) => record.status === 'draft')) return 'draft';
  return 'not_started';
}

export function normalizeContentAssetPageInput(input: ContentAssetPageInput): ContentAssetPageInput {
  const normalized = {
    ...normalizeAssetInput(input, true),
    optimizationUnitId: input.optimizationUnitId?.trim(),
    userIntent: input.userIntent?.trim(),
    sourceReferences: input.sourceReferences?.map((source) => ({
      type: source.type,
      title: source.title.trim(),
      url: source.url?.trim()
    })).filter((source) => source.title)
  };
  const hasContext = Boolean(normalized.optimizationUnitId || normalized.userIntent || normalized.sourceReferences?.length);

  if (!hasContext) {
    throw new BadRequestException('内容资产需要关联来源资料、优化单元或用户意图');
  }

  return normalized;
}

function normalizeAssetInput(input: ContentAssetInput, required: boolean): ContentAssetInput {
  if (required) {
    if (!input.title?.trim()) throw new BadRequestException('内容标题不能为空');
    if (!input.type?.trim()) throw new BadRequestException('内容类型不能为空');
    if (!input.platform?.trim()) throw new BadRequestException('发布平台不能为空');
    if (!input.url?.trim()) throw new BadRequestException('内容链接不能为空');
  }

  return {
    title: input.title?.trim(),
    type: input.type?.trim(),
    platform: input.platform?.trim(),
    url: input.url?.trim(),
    targetKeywords: normalizeStringList(input.targetKeywords),
    reuseOfAssetId: input.reuseOfAssetId?.trim(),
    brandAdaptation: input.brandAdaptation?.trim(),
    status: input.status,
    publishedAt: input.publishedAt?.trim()
  };
}

function normalizeAssetFilter(query: ContentAssetFilter): ContentAssetFilter {
  return {
    type: query.type?.trim(),
    platform: query.platform?.trim(),
    status: query.status && contentAssetStatuses.includes(query.status) ? query.status : undefined,
    keyword: query.keyword?.trim()
  };
}

function normalizeStrategyFilter(query: ContentStrategyFilter): ContentStrategyFilter {
  return {
    type: query.type && contentStrategyTypes.includes(query.type) ? query.type : undefined,
    priority: query.priority && contentStrategyPriorities.includes(query.priority) ? query.priority : undefined,
    platform: query.platform?.trim(),
    status: query.status && contentStrategyStatuses.includes(query.status) ? query.status : undefined
  };
}

function normalizeStringList(values: string[] = []): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

function normalizeGenerationTaskInput(input: ContentGenerationTaskInput): ContentGenerationTaskInput {
  if (!input.strategyId?.trim()) throw new BadRequestException('内容策略不能为空');

  return {
    strategyId: input.strategyId.trim(),
    growthOptimizationPlanId: input.growthOptimizationPlanId?.trim(),
    targetPlatform: input.targetPlatform?.trim(),
    contentType: input.contentType?.trim(),
    contentTopic: input.contentTopic?.trim(),
    targetKeywords: normalizeStringList(input.targetKeywords),
    referenceSources: normalizeStringList(input.referenceSources),
    retestAt: input.retestAt?.trim()
  };
}

function normalizeGrowthOptimizationContentTaskInput(input: GrowthOptimizationContentTaskInput): GrowthOptimizationContentTaskInput {
  if (!input.planId?.trim()) throw new BadRequestException('增长优化计划不能为空');

  return {
    planId: input.planId.trim(),
    recommendationIndexes: input.recommendationIndexes?.map((index) => Number(index)).filter((index) => Number.isInteger(index) && index >= 0)
  };
}

function normalizeVersionInput(input: ContentVersionInput): ContentVersionInput {
  if (!input.title?.trim()) throw new BadRequestException('内容标题不能为空');
  if (!input.body?.trim()) throw new BadRequestException('内容正文不能为空');

  return {
    title: input.title.trim(),
    body: input.body.trim(),
    exportFormat: 'markdown'
  };
}

const contentAssetStatuses: ContentAssetStatus[] = ['draft', 'published', 'archived'];
const contentStrategyTypes: ContentStrategyType[] = ['gap', 'correction', 'enhancement', 'authority_citation', 'competitor_response'];
const contentStrategyPriorities: ContentStrategyPriority[] = ['high', 'medium', 'low'];
const contentStrategyStatuses: ContentStrategyStatus[] = ['draft', 'task_created', 'completed'];
