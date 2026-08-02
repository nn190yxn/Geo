import { Body, Controller, Get, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, AutomationConfirmation, AutomationPackage, AutomationStepCode, RetestResultInput } from '@geo-platform/shared-types';
import { sanitizePublicResponse } from '../../common/public-response';
import { AutomationOrchestratorService, type CreateAutomationPackageInput } from './automation-orchestrator.service';
import { ConfirmationQueueService, type CreateConfirmationInput, type ResolveConfirmationInput } from './confirmation-queue.service';

@Controller('brands/:brandId/automation/packages')
export class AutomationController {
  constructor(
    private readonly automationService: AutomationOrchestratorService,
    private readonly confirmationQueue: ConfirmationQueueService
  ) {}

  @Get()
  listPackages(@Req() request: Request, @Param('brandId') brandId: string): ApiResponse<AutomationPackage[]> {
    return success(this.automationService.listPackages(request.context.userId, brandId));
  }

  @Post()
  createPackage(@Req() request: Request, @Param('brandId') brandId: string, @Body() body: CreateAutomationPackageInput): ApiResponse<AutomationPackage> {
    return success(this.automationService.createPackage(request.context.userId, brandId, body));
  }

  @Get(':packageId')
  getPackage(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string): ApiResponse<AutomationPackage> {
    return success(this.automationService.getPackage(request.context.userId, brandId, packageId));
  }

  @Post(':packageId/start')
  async startPackage(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string): Promise<ApiResponse<AutomationPackage>> {
    return success(await this.automationService.startPackage(request.context.userId, brandId, packageId));
  }

  @Post(':packageId/stop')
  stopPackage(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string): ApiResponse<AutomationPackage> {
    return success(this.automationService.stopPackage(request.context.userId, brandId, packageId));
  }

  @Post(':packageId/regenerate')
  regeneratePackage(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string, @Body() body: { reason?: string }): ApiResponse<AutomationPackage> {
    return success(this.automationService.requestRegeneration(request.context.userId, brandId, packageId, body?.reason));
  }

  @Post(':packageId/test-plan/execute')
  executeTestPlan(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string): ApiResponse<AutomationPackage> {
    return success(this.automationService.executeTestPlan(request.context.userId, brandId, packageId));
  }

  @Post(':packageId/answers/analyze')
  analyzeAnswers(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string): ApiResponse<AutomationPackage> {
    return success(this.automationService.analyzeAnswers(request.context.userId, brandId, packageId));
  }

  @Post(':packageId/content/generate')
  async generateContent(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string): Promise<ApiResponse<AutomationPackage>> {
    return success(await this.automationService.generateContent(request.context.userId, brandId, packageId));
  }

  @Post(':packageId/platform-rewrites/generate')
  generatePlatformRewrites(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string): ApiResponse<AutomationPackage> {
    return success(this.automationService.generatePlatformRewrites(request.context.userId, brandId, packageId));
  }

  @Post(':packageId/publishing-suggestions/generate')
  generatePublishingSuggestions(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string): ApiResponse<AutomationPackage> {
    return success(this.automationService.generatePublishingSuggestions(request.context.userId, brandId, packageId));
  }

  @Post(':packageId/publishing-suggestions/confirm')
  confirmPublishingSuggestions(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('packageId') packageId: string,
    @Body() body: { confirmationId: string; payload?: Record<string, unknown>; decision?: string }
  ): ApiResponse<AutomationPackage> {
    return success(this.automationService.confirmPublishingSuggestions(request.context.userId, brandId, packageId, body));
  }

  @Post(':packageId/retest-suggestions/generate')
  generateRetestSuggestions(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string): ApiResponse<AutomationPackage> {
    return success(this.automationService.generateRetestSuggestions(request.context.userId, brandId, packageId));
  }

  @Post(':packageId/retest-suggestions/:taskId/records/:recordId/complete')
  completeRetest(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('packageId') packageId: string,
    @Param('taskId') taskId: string,
    @Param('recordId') recordId: string,
    @Body() body: RetestResultInput
  ): ApiResponse<AutomationPackage> {
    return success(this.automationService.completeRetest(request.context.userId, brandId, packageId, taskId, recordId, body));
  }

  @Get(':packageId/confirmations')
  listConfirmations(@Req() request: Request, @Param('brandId') brandId: string, @Param('packageId') packageId: string): ApiResponse<AutomationConfirmation[]> {
    return success(this.automationService.getPackage(request.context.userId, brandId, packageId).confirmations);
  }

  @Post(':packageId/confirmations')
  createConfirmation(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('packageId') packageId: string,
    @Body() body: CreateConfirmationInput
  ): ApiResponse<AutomationConfirmation> {
    return success(this.confirmationQueue.createConfirmation(request.context.userId, brandId, packageId, body));
  }

  @Post(':packageId/confirmations/:confirmationId')
  resolveConfirmation(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('packageId') packageId: string,
    @Param('confirmationId') confirmationId: string,
    @Body() body: ResolveConfirmationInput
  ): ApiResponse<AutomationPackage> {
    return success(this.confirmationQueue.resolveConfirmation(request.context.userId, brandId, packageId, confirmationId, body));
  }

  @Post(':packageId/steps/:stepCode/fail')
  markStepFailed(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('packageId') packageId: string,
    @Param('stepCode') stepCode: AutomationStepCode,
    @Body() body: { errorMessage?: string }
  ): ApiResponse<AutomationPackage> {
    return success(this.automationService.markStepFailed(request.context.userId, brandId, packageId, stepCode, body?.errorMessage ?? '自动化步骤执行失败'));
  }
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data: sanitizePublicResponse(data) };
}
