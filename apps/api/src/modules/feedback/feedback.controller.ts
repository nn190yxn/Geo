import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, InnerTestFeedback, InnerTestFeedbackDashboard, InnerTestFeedbackInput, InnerTestFeedbackSeverity, InnerTestFeedbackStatus, InnerTestFeedbackUpdateInput } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('brands/:brandId/inner-test-feedback')
export class FeedbackController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getFeedbackDashboard(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<InnerTestFeedbackDashboard>> {
    const dashboard = await this.permissionsService.getInnerTestFeedbackDashboard(request.context.userId, brandId);
    if (!dashboard) throw new NotFoundException('内测反馈列表不存在或当前用户无权访问');
    return { success: true, data: dashboard };
  }

  @Post()
  async createFeedback(@Req() request: Request, @Param('brandId') brandId: string, @Body() input: InnerTestFeedbackInput): Promise<ApiResponse<InnerTestFeedback>> {
    const feedback = await this.permissionsService.createInnerTestFeedback(request.context.userId, brandId, normalizeFeedbackInput(input));
    if (!feedback) throw new NotFoundException('内测反馈无法创建或当前用户无权访问');
    return { success: true, data: feedback };
  }

  @Patch(':feedbackId')
  async updateFeedback(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('feedbackId') feedbackId: string,
    @Body() input: InnerTestFeedbackUpdateInput
  ): Promise<ApiResponse<InnerTestFeedback>> {
    const feedback = await this.permissionsService.updateInnerTestFeedback(request.context.userId, brandId, feedbackId, normalizeFeedbackUpdateInput(input));
    if (!feedback) throw new NotFoundException('内测反馈不存在或当前用户无权访问');
    return { success: true, data: feedback };
  }
}

function normalizeFeedbackInput(input: InnerTestFeedbackInput): InnerTestFeedbackInput {
  if (!input.page?.trim()) throw new BadRequestException('页面不能为空');
  if (!input.module?.trim()) throw new BadRequestException('模块不能为空');
  if (!input.description?.trim()) throw new BadRequestException('问题描述不能为空');

  return {
    page: input.page.trim(),
    module: input.module.trim(),
    type: feedbackTypes.includes(input.type) ? input.type : 'other',
    severity: input.severity && feedbackSeverities.includes(input.severity) ? input.severity : 'medium',
    description: input.description.trim()
  };
}

function normalizeFeedbackUpdateInput(input: InnerTestFeedbackUpdateInput): InnerTestFeedbackUpdateInput {
  return {
    status: input.status && feedbackStatuses.includes(input.status) ? input.status : undefined,
    severity: input.severity && feedbackSeverities.includes(input.severity) ? input.severity : undefined,
    resolutionNote: input.resolutionNote?.trim()
  };
}

const feedbackTypes: InnerTestFeedback['type'][] = ['usability', 'bug', 'copy', 'data', 'workflow', 'configuration', 'other'];
const feedbackStatuses: InnerTestFeedbackStatus[] = ['open', 'triaged', 'in_progress', 'resolved'];
const feedbackSeverities: InnerTestFeedbackSeverity[] = ['high', 'medium', 'low'];
