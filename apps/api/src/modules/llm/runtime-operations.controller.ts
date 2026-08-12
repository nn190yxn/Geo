import { Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, AsyncJob, RuntimeOperationsDashboard } from '@geo-platform/shared-types';
import { RuntimeOperationsService } from './runtime-operations.service';

@Controller('brands/:brandId/runtime-operations')
export class RuntimeOperationsController {
  constructor(private readonly operations: RuntimeOperationsService) {}
  @Get()
  async dashboard(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<RuntimeOperationsDashboard>> {
    const result = await this.operations.dashboard(request.context.userId, brandId);
    if (!result) throw new NotFoundException('运行中心不可访问');
    return { success: true, data: result };
  }
  @Post('jobs/:jobId/retry')
  async retry(@Req() request: Request, @Param('brandId') brandId: string, @Param('jobId') jobId: string): Promise<ApiResponse<AsyncJob>> {
    const result = await this.operations.retry(request.context.userId, brandId, jobId);
    if (!result) throw new NotFoundException('任务不存在或不可访问');
    return { success: true, data: result };
  }
  @Post('jobs/:jobId/cancel')
  async cancel(@Req() request: Request, @Param('brandId') brandId: string, @Param('jobId') jobId: string): Promise<ApiResponse<AsyncJob>> {
    const result = await this.operations.cancel(request.context.userId, brandId, jobId);
    if (!result) throw new NotFoundException('任务不存在或不可访问');
    return { success: true, data: result };
  }
}
