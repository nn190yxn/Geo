import { Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  ApiResponse,
  CreateQuickStartSessionInput,
  QuickStartSession,
  QuickStartStep,
  QuickStartStepUpdateInput
} from '@geo-platform/shared-types';
import { QuickStartService } from './quick-start.service';

@Controller('brands/:brandId/quick-start-session')
export class QuickStartController {
  constructor(private readonly quickStartService: QuickStartService) {}

  @Post()
  async create(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: CreateQuickStartSessionInput = {}
  ): Promise<ApiResponse<QuickStartSession>> {
    return { success: true, data: await this.quickStartService.create(request.context.userId, brandId, body) };
  }

  @Get()
  async get(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<QuickStartSession>> {
    const session = await this.quickStartService.get(request.context.userId, brandId);
    if (!session) throw new NotFoundException('快速接入会话不存在');
    return { success: true, data: session };
  }

  @Patch('steps/:step')
  async saveStep(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('step') step: QuickStartStep,
    @Body() body: QuickStartStepUpdateInput
  ): Promise<ApiResponse<QuickStartSession>> {
    return {
      success: true,
      data: await this.quickStartService.saveStep(request.context.userId, brandId, step, body)
    };
  }
}
