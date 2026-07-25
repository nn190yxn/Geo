import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  ApiResponse,
  PublishingAccount,
  PublishingAccountInput,
  PublishingAuthStatus,
  PublishingDashboard,
  PublishingRecord,
  PublishingRecordInput,
  PublishingRecordStatus,
  PublishingStatusInput
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('brands/:brandId/publishing')
export class PublishingController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getDashboard(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<PublishingDashboard>> {
    const dashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);

    if (!dashboard) {
      throw new NotFoundException('发布中心不存在或当前用户无权访问');
    }

    return { success: true, data: dashboard };
  }

  @Post('accounts')
  async connectAccount(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: PublishingAccountInput
  ): Promise<ApiResponse<PublishingAccount>> {
    const account = await this.permissionsService.connectPublishingAccount(request.context.userId, brandId, normalizeAccountInput(input, true));

    if (!account) {
      throw new NotFoundException('发布账号无法接入或当前用户无权访问');
    }

    return { success: true, data: account };
  }

  @Post('accounts/:accountId/reauthorize')
  async reauthorizeAccount(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('accountId') accountId: string
  ): Promise<ApiResponse<PublishingAccount>> {
    const account = await this.permissionsService.reauthorizePublishingAccount(request.context.userId, brandId, accountId);

    if (!account) {
      throw new NotFoundException('发布账号不存在或当前用户无权访问');
    }

    return { success: true, data: account };
  }

  @Patch('accounts/:accountId/status')
  async updateAccountStatus(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('accountId') accountId: string,
    @Body() input: Pick<PublishingAccountInput, 'authStatus' | 'errorMessage'>
  ): Promise<ApiResponse<PublishingAccount>> {
    const account = await this.permissionsService.updatePublishingAccountStatus(request.context.userId, brandId, accountId, normalizeAccountStatusInput(input));

    if (!account) {
      throw new NotFoundException('发布账号不存在或当前用户无权访问');
    }

    return { success: true, data: account };
  }

  @Post('records')
  async createRecord(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: PublishingRecordInput
  ): Promise<ApiResponse<PublishingRecord>> {
    const record = await this.permissionsService.createPublishingRecord(request.context.userId, brandId, normalizeRecordInput(input));

    if (!record) {
      throw new NotFoundException('发布记录无法创建或关联对象不存在');
    }

    return { success: true, data: record };
  }

  @Patch('records/:recordId/status')
  async updateRecordStatus(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('recordId') recordId: string,
    @Body() input: PublishingStatusInput
  ): Promise<ApiResponse<PublishingRecord>> {
    const record = await this.permissionsService.updatePublishingRecordStatus(request.context.userId, brandId, recordId, normalizeRecordStatusInput(input));

    if (!record) {
      throw new NotFoundException('发布记录不存在或当前用户无权访问');
    }

    return { success: true, data: record };
  }
}

function normalizeAccountInput(input: PublishingAccountInput, required: boolean): PublishingAccountInput {
  if (required) {
    if (!input.platform?.trim()) throw new BadRequestException('发布平台不能为空');
    if (!input.accountName?.trim()) throw new BadRequestException('账号名称不能为空');
  }

  return {
    platform: input.platform?.trim(),
    accountName: input.accountName?.trim(),
    loginMode: input.loginMode && loginModes.includes(input.loginMode) ? input.loginMode : undefined,
    authStatus: input.authStatus && authStatuses.includes(input.authStatus) ? input.authStatus : undefined,
    errorMessage: input.errorMessage?.trim()
  };
}

function normalizeAccountStatusInput(input: Pick<PublishingAccountInput, 'authStatus' | 'errorMessage'>): Pick<PublishingAccountInput, 'authStatus' | 'errorMessage'> {
  if (!input.authStatus || !authStatuses.includes(input.authStatus)) throw new BadRequestException('授权状态无效');
  return { authStatus: input.authStatus, errorMessage: input.errorMessage?.trim() };
}

function normalizeRecordInput(input: PublishingRecordInput): PublishingRecordInput {
  return {
    ...input,
    accountId: input.accountId?.trim(),
    contentAssetId: input.contentAssetId?.trim(),
    generationTaskId: input.generationTaskId?.trim(),
    versionId: input.versionId?.trim(),
    title: input.title?.trim(),
    body: input.body?.trim(),
    targetPlatform: input.targetPlatform?.trim(),
    contentType: input.contentType?.trim(),
    targetKeywords: input.targetKeywords?.map((keyword) => keyword.trim()).filter(Boolean),
    status: input.status && recordStatuses.includes(input.status) ? input.status : undefined
  };
}

function normalizeRecordStatusInput(input: PublishingStatusInput): PublishingStatusInput {
  if (!recordStatuses.includes(input.status)) throw new BadRequestException('发布状态无效');
  return {
    status: input.status,
    publishedUrl: input.publishedUrl?.trim(),
    errorMessage: input.errorMessage?.trim()
  };
}

const loginModes: PublishingAccountInput['loginMode'][] = ['oauth', 'manual', 'cookie'];
const authStatuses: PublishingAuthStatus[] = ['connected', 'expired', 'error', 'disconnected'];
const recordStatuses: PublishingRecordStatus[] = ['draft', 'pending', 'published', 'failed'];
