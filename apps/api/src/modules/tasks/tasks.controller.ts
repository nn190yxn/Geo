import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  ApiResponse,
  OptimizationTask,
  OptimizationTaskInput,
  OptimizationTaskStatus,
  OptimizationTaskUpdateInput,
  RetestPlanInput,
  RetestResultInput,
  TaskBoardDashboard
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('brands/:brandId/tasks')
export class TasksController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getTaskBoard(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<TaskBoardDashboard>> {
    const board = await this.permissionsService.getTaskBoard(request.context.userId, brandId);
    if (!board) throw new NotFoundException('任务看板不存在或当前用户无权访问');
    return { success: true, data: board };
  }

  @Post()
  async createTask(@Req() request: Request, @Param('brandId') brandId: string, @Body() input: OptimizationTaskInput): Promise<ApiResponse<OptimizationTask>> {
    const task = await this.permissionsService.createOptimizationTask(request.context.userId, brandId, normalizeTaskInput(input));
    if (!task) throw new NotFoundException('优化任务关联对象不存在或当前用户无权访问');
    return { success: true, data: task };
  }

  @Patch(':taskId')
  async updateTask(@Req() request: Request, @Param('brandId') brandId: string, @Param('taskId') taskId: string, @Body() input: OptimizationTaskUpdateInput): Promise<ApiResponse<OptimizationTask>> {
    const task = await this.permissionsService.updateOptimizationTask(request.context.userId, brandId, taskId, normalizeTaskUpdateInput(input));
    if (!task) throw new NotFoundException('优化任务不存在或当前用户无权访问');
    return { success: true, data: task };
  }

  @Post(':taskId/retest')
  async planRetest(@Req() request: Request, @Param('brandId') brandId: string, @Param('taskId') taskId: string, @Body() input: RetestPlanInput): Promise<ApiResponse<OptimizationTask>> {
    const task = await this.permissionsService.planOptimizationTaskRetest(request.context.userId, brandId, taskId, normalizeRetestPlanInput(input));
    if (!task) throw new NotFoundException('再次监测计划无法创建或关联监测记录不存在');
    return { success: true, data: task };
  }

  @Patch(':taskId/retest/:recordId')
  async completeRetest(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('taskId') taskId: string,
    @Param('recordId') recordId: string,
    @Body() input: RetestResultInput
  ): Promise<ApiResponse<OptimizationTask>> {
    const task = await this.permissionsService.completeOptimizationTaskRetest(request.context.userId, brandId, taskId, recordId, normalizeRetestResultInput(input));
    if (!task) throw new NotFoundException('再次监测记录不存在或当前用户无权访问');
    return { success: true, data: task };
  }
}

function normalizeTaskInput(input: OptimizationTaskInput): OptimizationTaskInput {
  if (!input.title?.trim()) throw new BadRequestException('任务标题不能为空');
  return {
    title: input.title.trim(),
    type: input.type ?? 'manual',
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

function normalizeTaskUpdateInput(input: OptimizationTaskUpdateInput): OptimizationTaskUpdateInput {
  return {
    status: input.status && taskStatuses.includes(input.status) ? input.status : undefined,
    ownerId: input.ownerId?.trim(),
    dueDate: input.dueDate?.trim(),
    processingNote: input.processingNote?.trim(),
    contentLink: input.contentLink?.trim(),
    reviewStatus: input.reviewStatus
  };
}

function normalizeRetestPlanInput(input: RetestPlanInput): RetestPlanInput {
  return {
    sourceRunId: input.sourceRunId?.trim(),
    retestRunId: input.retestRunId?.trim(),
    plannedAt: input.plannedAt?.trim(),
    targetScore: input.targetScore,
    notes: input.notes?.trim()
  };
}

function normalizeRetestResultInput(input: RetestResultInput): RetestResultInput {
  if (input.actualScore === undefined) throw new BadRequestException('复测实际分不能为空');
  return {
    actualScore: input.actualScore,
    targetScore: input.targetScore,
    notes: input.notes?.trim()
  };
}

const taskStatuses: OptimizationTaskStatus[] = ['todo', 'doing', 'review', 'retest', 'done', 'reopened'];
