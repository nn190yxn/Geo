import { Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AdvisorDashboard, AdvisorRecord, AdvisorRecordInput, ApiResponse } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('brands/:brandId/advisor-records')
export class AdvisorController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getAdvisorRecords(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<AdvisorDashboard>> {
    const dashboard = await this.permissionsService.getAdvisorDashboard(request.context.userId, brandId);
    if (!dashboard) throw new NotFoundException('顾问服务工作台不存在或当前用户无权访问');
    return { success: true, data: dashboard };
  }

  @Post()
  async createAdvisorRecord(@Req() request: Request, @Param('brandId') brandId: string, @Body() input: AdvisorRecordInput): Promise<ApiResponse<AdvisorRecord>> {
    const record = await this.permissionsService.createAdvisorRecord(request.context.userId, brandId, input);
    if (!record) throw new NotFoundException('顾问服务记录无法创建、关联报告不存在或当前用户无权访问');
    return { success: true, data: record };
  }
}
