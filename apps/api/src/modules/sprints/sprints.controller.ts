import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, BrandStandardAnswer, QuestionRadarDashboard, SprintContentGapTaskResult, SprintContentTaskDashboard, SprintPublishingPreparationDashboard, SprintPublishingPreparationInput, SprintPublishingPreparationResult, SprintRetestPlanInput, SprintRetestPlanResult, SprintRetestTrendDashboard, StandardAnswerAlignmentDashboard, VisibilitySprint, VisibilitySprintStatus, VisibilitySprintStepCode } from '@geo-platform/shared-types';
import { sanitizePublicResponse } from '../../common/public-response';
import { PermissionsService } from '../permissions/permissions.service';
import type { VisibilitySprintCreateInput } from '../permissions/permissions.repository.port';
import { QuestionRadarService } from './question-radar.service';
import { SprintContentGapService } from './sprint-content-gap.service';
import { SprintMetricsService } from './sprint-metrics.service';
import { normalizeSprintPublishingPreparationInput, SprintPublishingService } from './sprint-publishing.service';
import { normalizeSprintRetestPlanInput, SprintRetestService } from './sprint-retest.service';
import { SprintStageService } from './sprint-stage.service';
import { StandardAnswerAlignmentService } from './standard-answer-alignment.service';
import { StandardAnswerService, type GenerateStandardAnswersInput } from './standard-answer.service';

@Controller('brands/:brandId/sprints')
export class SprintsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly questionRadarService: QuestionRadarService,
    private readonly standardAnswerService: StandardAnswerService,
    private readonly standardAnswerAlignmentService: StandardAnswerAlignmentService,
    private readonly sprintContentGapService: SprintContentGapService,
    private readonly sprintMetricsService: SprintMetricsService,
    private readonly sprintPublishingService: SprintPublishingService,
    private readonly sprintRetestService: SprintRetestService,
    private readonly sprintStageService: SprintStageService
  ) {}

  @Get()
  async listSprints(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<VisibilitySprint[]>> {
    const sprints = await this.permissionsService.listVisibilitySprints(request.context.userId, brandId);
    if (!sprints) {
      throw new NotFoundException('Sprint 不存在或当前用户无权访问');
    }

    return success(sprints);
  }

  @Get('current')
  async getCurrentSprint(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<VisibilitySprint>> {
    const sprint = await this.permissionsService.getCurrentVisibilitySprint(request.context.userId, brandId);
    if (!sprint) {
      throw new NotFoundException('当前 Sprint 不存在或当前用户无权访问');
    }

    return success(sprint);
  }

  @Post()
  async createSprint(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: VisibilitySprintCreateInput
  ): Promise<ApiResponse<VisibilitySprint>> {
    const sprint = await this.permissionsService.createVisibilitySprint(request.context.userId, brandId, normalizeCreateSprintInput(body));
    if (!sprint) {
      throw new NotFoundException('品牌不存在或当前用户无权访问');
    }

    return success(sprint);
  }

  @Get(':sprintId')
  async getSprint(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<VisibilitySprint>> {
    const sprint = await this.permissionsService.getVisibilitySprint(request.context.userId, brandId, sprintId);
    if (!sprint) {
      throw new NotFoundException('Sprint 不存在或当前用户无权访问');
    }

    return success(sprint);
  }

  @Post(':sprintId/start')
  async startSprint(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<VisibilitySprint>> {
    const sprint = await this.permissionsService.getVisibilitySprint(request.context.userId, brandId, sprintId);
    if (!sprint) {
      throw new NotFoundException('Sprint 不存在或当前用户无权访问');
    }

    const updated = await this.permissionsService.updateVisibilitySprintStep(request.context.userId, brandId, sprintId, {
      status: 'running',
      currentStep: sprint.currentStep,
      steps: sprint.steps
    });

    return success(updated ?? sprint);
  }

  @Get(':sprintId/question-radar')
  async getQuestionRadar(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<QuestionRadarDashboard>> {
    const dashboard = await this.questionRadarService.getQuestionRadar(request.context.userId, brandId, sprintId);
    if (!dashboard) {
      throw new NotFoundException('Sprint 问题雷达不存在或当前用户无权访问');
    }

    return success(dashboard);
  }

  @Post(':sprintId/stop')
  async stopSprint(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<VisibilitySprint>> {
    const sprint = await this.permissionsService.getVisibilitySprint(request.context.userId, brandId, sprintId);
    if (!sprint) {
      throw new NotFoundException('Sprint 不存在或当前用户无权访问');
    }

    const updated = await this.permissionsService.updateVisibilitySprintStep(request.context.userId, brandId, sprintId, {
      status: 'stopped',
      currentStep: sprint.currentStep,
      steps: sprint.steps
    });

    return success(updated ?? sprint);
  }

  @Get(':sprintId/standard-answers')
  async listStandardAnswers(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<BrandStandardAnswer[]>> {
    const answers = await this.standardAnswerService.listStandardAnswers(request.context.userId, brandId, sprintId);
    if (!answers) {
      throw new NotFoundException('Sprint 标准答案不存在或当前用户无权访问');
    }

    return success(answers);
  }

  @Post(':sprintId/standard-answers/generate')
  async generateStandardAnswers(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string,
    @Body() body: GenerateStandardAnswersInput
  ): Promise<ApiResponse<BrandStandardAnswer[]>> {
    const answers = await this.standardAnswerService.generateStandardAnswers(request.context.userId, brandId, sprintId, normalizeGenerateStandardAnswersInput(body ?? {}));
    if (!answers) {
      throw new NotFoundException('Sprint、品牌资料或问题不存在，或当前用户无权访问');
    }

    return success(answers);
  }

  @Post(':sprintId/standard-answers/:answerId/approve')
  async approveStandardAnswer(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string,
    @Param('answerId') answerId: string
  ): Promise<ApiResponse<BrandStandardAnswer>> {
    const answer = await this.standardAnswerService.approveStandardAnswer(request.context.userId, brandId, sprintId, answerId);
    if (!answer) {
      throw new NotFoundException('标准答案不存在或当前用户无权访问');
    }

    return success(answer);
  }

  @Get(':sprintId/alignment')
  async getAlignmentDashboard(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<StandardAnswerAlignmentDashboard>> {
    const dashboard = await this.standardAnswerAlignmentService.getAlignmentDashboard(request.context.userId, brandId, sprintId);
    if (!dashboard) {
      throw new NotFoundException('Sprint 对照分析不存在或当前用户无权访问');
    }

    return success(dashboard);
  }

  @Post(':sprintId/content-gaps/generate')
  async generateContentGapTasks(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<SprintContentGapTaskResult>> {
    const result = await this.sprintContentGapService.generateContentGapTasks(request.context.userId, brandId, sprintId);
    if (!result) {
      throw new NotFoundException('Sprint 内容缺口任务无法生成，或当前用户无权访问');
    }

    return success(result);
  }

  @Get(':sprintId/content-gaps/tasks')
  async getContentTaskDashboard(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<SprintContentTaskDashboard>> {
    const dashboard = await this.sprintContentGapService.getContentTaskDashboard(request.context.userId, brandId, sprintId);
    if (!dashboard) {
      throw new NotFoundException('Sprint 内容任务看板不存在或当前用户无权访问');
    }

    return success(dashboard);
  }

  @Post(':sprintId/metrics/refresh')
  async refreshMetrics(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<VisibilitySprint>> {
    const sprint = await this.sprintMetricsService.refreshSprintMetrics(request.context.userId, brandId, sprintId);
    if (!sprint) {
      throw new NotFoundException('Sprint 不存在、监测记录不存在或当前用户无权访问');
    }

    return success(sprint);
  }

  @Get(':sprintId/publishing-preparation')
  async getPublishingPreparationDashboard(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<SprintPublishingPreparationDashboard>> {
    const dashboard = await this.sprintPublishingService.getPublishingPreparationDashboard(request.context.userId, brandId, sprintId);
    if (!dashboard) {
      throw new NotFoundException('Sprint 发布准备看板不存在或当前用户无权访问');
    }

    return success(dashboard);
  }

  @Post(':sprintId/publishing-preparation/records')
  async preparePublishingRecords(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string,
    @Body() body: SprintPublishingPreparationInput
  ): Promise<ApiResponse<SprintPublishingPreparationResult>> {
    const result = await this.sprintPublishingService.preparePublishingRecords(request.context.userId, brandId, sprintId, normalizeSprintPublishingPreparationInput(body ?? {}));
    if (!result) {
      throw new NotFoundException('Sprint 发布准备记录无法创建，或当前用户无权访问');
    }

    return success(result);
  }

  @Post(':sprintId/advance')
  async advanceSprint(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<VisibilitySprint>> {
    const sprint = await this.sprintStageService.advanceSprint(request.context.userId, brandId, sprintId);
    if (!sprint) {
      throw new NotFoundException('Sprint 不存在、监测记录不存在或当前用户无权访问');
    }

    return success(sprint);
  }

  @Post(':sprintId/retest-plan')
  async createRetestPlan(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string,
    @Body() body: SprintRetestPlanInput
  ): Promise<ApiResponse<SprintRetestPlanResult>> {
    const result = await this.sprintRetestService.createRetestPlan(request.context.userId, brandId, sprintId, normalizeSprintRetestPlanInput(body ?? {}));
    if (!result) {
      throw new NotFoundException('Sprint 复测计划无法创建，或当前用户无权访问');
    }

    return success(result);
  }

  @Get(':sprintId/retest-trend')
  async getRetestTrendDashboard(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('sprintId') sprintId: string
  ): Promise<ApiResponse<SprintRetestTrendDashboard>> {
    const dashboard = await this.sprintRetestService.getRetestTrendDashboard(request.context.userId, brandId, sprintId);
    if (!dashboard) {
      throw new NotFoundException('Sprint 复测趋势看板不存在或当前用户无权访问');
    }

    return success(dashboard);
  }
}

function normalizeGenerateStandardAnswersInput(input: GenerateStandardAnswersInput): GenerateStandardAnswersInput {
  return {
    ...(input.questionIds ? { questionIds: input.questionIds.map((id) => id.trim()).filter(Boolean) } : {})
  };
}

function normalizeCreateSprintInput(input: VisibilitySprintCreateInput): VisibilitySprintCreateInput {
  const title = input.title?.trim();
  const goal = input.goal?.trim();
  if (!title) {
    throw new BadRequestException('Sprint 标题不能为空');
  }
  if (!goal) {
    throw new BadRequestException('Sprint 目标不能为空');
  }

  return {
    ...input,
    title,
    goal,
    ...(input.status ? { status: normalizeStatus(input.status) } : {}),
    ...(input.currentStep ? { currentStep: normalizeStep(input.currentStep) } : {})
  };
}

function normalizeStatus(status: VisibilitySprintStatus): VisibilitySprintStatus {
  const allowed: VisibilitySprintStatus[] = ['draft', 'running', 'waiting_confirmation', 'completed', 'failed', 'stopped'];
  if (!allowed.includes(status)) {
    throw new BadRequestException('Sprint 状态不合法');
  }

  return status;
}

function normalizeStep(step: VisibilitySprintStepCode): VisibilitySprintStepCode {
  const allowed: VisibilitySprintStepCode[] = [
    'question_radar',
    'ai_response_monitoring',
    'standard_answer_alignment',
    'gap_diagnosis',
    'content_asset_generation',
    'publishing_preparation',
    'retest_and_trend',
    'completed'
  ];
  if (!allowed.includes(step)) {
    throw new BadRequestException('Sprint 阶段不合法');
  }

  return step;
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data: sanitizePublicResponse(data) };
}
