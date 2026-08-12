import { Controller, Get, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  AnalysisDiagnosisDashboard,
  ApiResponse,
  BrandActionDashboard,
  BeginnerHomeDashboard,
  ContentOperationDashboard,
  MonitoringObjectDashboard,
  PublishingOperationDashboard,
} from '@geo-platform/shared-types';
import { sanitizePublicResponse } from '../../common/public-response';
import { DashboardsService } from './dashboards.service';

@Controller('brands/:brandId/dashboards')
export class DashboardsController {
  constructor(private readonly dashboardsService: DashboardsService) {}

  @Get('home')
  async getHome(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<BeginnerHomeDashboard>> {
    return success(await this.dashboardsService.getBeginnerHomeDashboard(request.context.userId, brandId));
  }

  @Get('actions')
  async getActions(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<BrandActionDashboard>> {
    return success(await this.dashboardsService.getBrandActionDashboard(request.context.userId, brandId));
  }

  @Get('monitoring-objects')
  async getMonitoringObjects(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<MonitoringObjectDashboard>> {
    return success(await this.dashboardsService.getMonitoringObjectDashboard(request.context.userId, brandId));
  }

  @Get('content-operation')
  async getContentOperation(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<ContentOperationDashboard>> {
    return success(await this.dashboardsService.getContentOperationDashboard(request.context.userId, brandId));
  }

  @Get('publishing-operation')
  async getPublishingOperation(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<PublishingOperationDashboard>> {
    return success(await this.dashboardsService.getPublishingOperationDashboard(request.context.userId, brandId));
  }

  @Get('analysis-diagnosis')
  async getAnalysisDiagnosis(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<AnalysisDiagnosisDashboard>> {
    return success(await this.dashboardsService.getAnalysisDiagnosisDashboard(request.context.userId, brandId));
  }
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data: sanitizePublicResponse(data) };
}
