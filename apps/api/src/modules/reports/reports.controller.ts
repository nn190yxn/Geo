import { Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, ReportDashboard, ReportInput, ReportRecord } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('brands/:brandId/reports')
export class ReportsController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getReports(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<ReportDashboard>> {
    const dashboard = await this.permissionsService.getReportDashboard(request.context.userId, brandId);
    if (!dashboard) throw new NotFoundException('报告中心不存在或当前用户无权访问');
    return { success: true, data: dashboard };
  }

  @Post()
  async createReport(@Req() request: Request, @Param('brandId') brandId: string, @Body() input: ReportInput): Promise<ApiResponse<ReportRecord>> {
    const report = await this.permissionsService.createReport(request.context.userId, brandId, input);
    if (!report) throw new NotFoundException('报告无法生成或当前用户无权访问');
    return { success: true, data: report };
  }

  @Get(':reportId')
  async getReport(@Req() request: Request, @Param('brandId') brandId: string, @Param('reportId') reportId: string): Promise<ApiResponse<ReportRecord>> {
    const report = await this.permissionsService.getReport(request.context.userId, brandId, reportId);
    if (!report) throw new NotFoundException('报告不存在或当前用户无权访问');
    return { success: true, data: report };
  }
}
