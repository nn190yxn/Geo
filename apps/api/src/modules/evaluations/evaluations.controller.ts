import { Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, BrandProfile, ContentStrategy, EvaluationDashboard } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('brands/:brandId/evaluations')
export class EvaluationsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getEvaluationDashboard(
    @Req() request: Request,
    @Param('brandId') brandId: string
  ): Promise<ApiResponse<EvaluationDashboard>> {
    const dashboard = await this.permissionsService.getEvaluationDashboard(request.context.userId, brandId);

    if (!dashboard) {
      throw new NotFoundException('评价分析不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: dashboard
    };
  }

  @Post(':issueId/correction-strategy')
  async createCorrectionStrategy(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('issueId') issueId: string
  ): Promise<ApiResponse<ContentStrategy>> {
    const strategy = await this.permissionsService.createEvaluationCorrectionStrategy(request.context.userId, brandId, issueId);

    if (!strategy) {
      throw new NotFoundException('表达问题不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: strategy
    };
  }

  @Post(':issueId/knowledge')
  async updateKnowledge(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('issueId') issueId: string
  ): Promise<ApiResponse<BrandProfile>> {
    const profile = await this.permissionsService.updateBrandKnowledgeFromEvaluationIssue(request.context.userId, brandId, issueId);

    if (!profile) {
      throw new NotFoundException('表达问题不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: profile
    };
  }
}
