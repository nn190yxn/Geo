import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  ApiResponse,
  ContentStrategy,
  ContentStrategyInput,
  ContentStrategyPriority,
  ContentStrategyType,
  GeoCanvasWorkspace,
  OptimizationTask,
  OptimizationTaskInput
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('brands/:brandId/canvas')
export class CanvasController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getCanvas(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<GeoCanvasWorkspace>> {
    const canvas = await this.permissionsService.getGeoCanvasWorkspace(request.context.userId, brandId);

    if (!canvas) {
      throw new NotFoundException('GEO 画布不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: canvas
    };
  }

  @Post('content-strategies')
  async createContentStrategy(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: ContentStrategyInput
  ): Promise<ApiResponse<ContentStrategy>> {
    const strategy = await this.permissionsService.createContentStrategy(
      request.context.userId,
      brandId,
      normalizeContentStrategyInput(body)
    );

    if (!strategy) {
      throw new NotFoundException('优化单元、用户意图或当前品牌不存在');
    }

    return {
      success: true,
      data: strategy
    };
  }

  @Post('tasks')
  async createOptimizationTask(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: OptimizationTaskInput
  ): Promise<ApiResponse<OptimizationTask>> {
    const task = await this.permissionsService.createOptimizationTask(
      request.context.userId,
      brandId,
      normalizeOptimizationTaskInput(body)
    );

    if (!task) {
      throw new NotFoundException('优化任务关联对象不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: task
    };
  }
}

function normalizeContentStrategyInput(input: ContentStrategyInput): ContentStrategyInput {
  const type = input.type;
  const priority = input.priority;
  if (!input.optimizationUnitId?.trim()) throw new BadRequestException('请选择优化单元');
  if (!input.intentId?.trim()) throw new BadRequestException('请选择用户意图');
  if (!contentStrategyTypes.includes(type)) throw new BadRequestException('内容策略类型不支持');
  if (!contentStrategyPriorities.includes(priority)) throw new BadRequestException('内容策略优先级不支持');
  if (!input.suggestedTitle?.trim()) throw new BadRequestException('策略标题不能为空');
  if (!input.targetPlatform?.trim()) throw new BadRequestException('目标平台不能为空');

  return {
    optimizationUnitId: input.optimizationUnitId.trim(),
    intentId: input.intentId.trim(),
    type,
    priority,
    suggestedTitle: input.suggestedTitle.trim(),
    targetPlatform: input.targetPlatform.trim(),
    targetKeywords: normalizeStringList(input.targetKeywords),
    relatedPromptIds: normalizeStringList(input.relatedPromptIds)
  };
}

function normalizeOptimizationTaskInput(input: OptimizationTaskInput): OptimizationTaskInput {
  if (!input.title?.trim()) throw new BadRequestException('任务标题不能为空');

  return {
    title: input.title.trim(),
    type: input.type ?? 'manual',
    ownerId: input.ownerId?.trim(),
    optimizationUnitId: input.optimizationUnitId?.trim(),
    relatedPromptId: input.relatedPromptId?.trim(),
    relatedPlatformCode: input.relatedPlatformCode?.trim(),
    strategyId: input.strategyId?.trim(),
    dueDate: input.dueDate?.trim()
  };
}

function normalizeStringList(values: string[] = []): string[] {
  return values.map((value) => value.trim()).filter(Boolean);
}

const contentStrategyTypes: ContentStrategyType[] = ['gap', 'correction', 'enhancement', 'authority_citation', 'competitor_response'];
const contentStrategyPriorities: ContentStrategyPriority[] = ['high', 'medium', 'low'];
