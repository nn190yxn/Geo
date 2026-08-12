import { Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, EffectEvidenceDashboard, ReportDashboard, ReportInput, ReportRecord, ReportScopePreview } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { EffectAttributionService } from './effect-attribution.service';
import { ProductEventRecorderService } from '../product-events/product-event-recorder.service';

@Controller('brands/:brandId/reports')
export class ReportsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly effectAttributionService: EffectAttributionService,
    private readonly productEventRecorder: ProductEventRecorderService
  ) {}

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
    await this.productEventRecorder.record({ actorUserId: request.context.userId, brandId, eventType: 'report_generated', entityType: 'report', entityId: report.id, idempotencyKey: `report-generated:${report.id}`, metadata: { reportType: report.type } });
    return { success: true, data: report };
  }

  @Post('preview')
  async previewReport(@Req() request: Request, @Param('brandId') brandId: string, @Body() input: ReportInput): Promise<ApiResponse<ReportScopePreview[]>> {
    const preview = await this.permissionsService.previewReport(request.context.userId, brandId, input);
    if (!preview) throw new NotFoundException('报告范围无法预览或当前用户无权访问');
    return { success: true, data: preview };
  }

  @Get('effect-evidence')
  async getEffectEvidence(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<EffectEvidenceDashboard>> {
    const dashboard = await this.effectAttributionService.getDashboard(request.context.userId, brandId);
    if (!dashboard) throw new NotFoundException('效果证据不存在或当前用户无权访问');
    return { success: true, data: dashboard };
  }

  @Get(':reportId')
  async getReport(@Req() request: Request, @Param('brandId') brandId: string, @Param('reportId') reportId: string): Promise<ApiResponse<ReportRecord>> {
    const report = await this.permissionsService.getReport(request.context.userId, brandId, reportId);
    if (!report) throw new NotFoundException('报告不存在或当前用户无权访问');
    return { success: true, data: report };
  }
}
