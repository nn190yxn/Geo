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
  TaskAcceptanceHistory,
  TaskBoardDashboard
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { RetestEvidenceService } from './retest-evidence.service';
import { AcceptanceHistoryService } from './acceptance-history.service';
import { ProductEventRecorderService } from '../product-events/product-event-recorder.service';

@Controller('brands/:brandId/tasks')
export class TasksController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly retestEvidenceService: RetestEvidenceService,
    private readonly acceptanceHistoryService: AcceptanceHistoryService,
    private readonly productEventRecorder: ProductEventRecorderService
  ) {}

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
    let task = await this.permissionsService.completeOptimizationTaskRetest(request.context.userId, brandId, taskId, recordId, normalizeRetestResultInput(input));
    if (!task) throw new NotFoundException('再次监测记录不存在或当前用户无权访问');
    const record = task.retestRecords.find((item) => item.id === recordId);
    if (record) {
      const acceptance = await this.acceptanceHistoryService.recordRetest(request.context.userId, brandId, task, record);
      if (acceptance) task = acceptance.task;
    }
    await this.productEventRecorder.record({ actorUserId: request.context.userId, brandId, eventType: 'retest_completed', entityType: 'retest_record', entityId: recordId, idempotencyKey: `retest-completed:${recordId}`, metadata: { status: task.status } });
    return { success: true, data: task };
  }

  @Get(':taskId/acceptance')
  async getAcceptanceHistory(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('taskId') taskId: string
  ): Promise<ApiResponse<TaskAcceptanceHistory>> {
    const history = await this.acceptanceHistoryService.get(request.context.userId, brandId, taskId);
    if (!history) throw new NotFoundException('验收历史不存在或当前用户无权访问');
    return { success: true, data: history };
  }

  @Post(':taskId/retest/:recordId/execute')
  async executeRetest(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('taskId') taskId: string,
    @Param('recordId') recordId: string
  ): Promise<ApiResponse<OptimizationTask>> {
    const task = await this.retestEvidenceService.execute(request.context.userId, brandId, taskId, recordId);
    if (!task) throw new NotFoundException('再次监测无法执行，请检查基线运行、监测问题和平台配置');
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
    plannedAt: input.plannedAt?.trim(),
    targetScore: input.targetScore,
    notes: input.notes?.trim()
  };
}

function normalizeRetestResultInput(input: RetestResultInput): RetestResultInput {
  return {
    targetScore: input.targetScore,
    notes: input.notes?.trim()
  };
}

const taskStatuses: OptimizationTaskStatus[] = ['todo', 'doing', 'review', 'retest', 'done', 'reopened'];
