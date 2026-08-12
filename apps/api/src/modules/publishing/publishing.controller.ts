import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type {
  ApiResponse,
  MediaPlatformRule,
  OwnedMediaAccount,
  PublishingAccount,
  PublishingAccountInput,
  PublishingAuthStatus,
  PublishingDashboard,
  PublishingExecutionResult,
  PublishingExecutionConfirmationInput,
  PublishingMode,
  PublishingModeInput,
  PublishingRecord,
  PublishingRecordConfirmationInput,
  PublishingRecordPerformance,
  PublishingRecordInput,
  PublishingRecordStatus,
  PublishingStatusInput
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { buildPublishingRecordPerformance } from './publishing-record-performance.mapper';
import { PublishingExecutionError, PublishingExecutionService } from './publishing-execution.service';
import { PublishingAdapterRegistry } from './adapters/publishing-adapter.registry';
import type { PublishingAdapterCapability } from '@geo-platform/shared-types';

@Controller('brands/:brandId/publishing')
export class PublishingController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly publishingExecutionService: PublishingExecutionService,
    private readonly adapterRegistry: PublishingAdapterRegistry
  ) {}

  @Get()
  async getDashboard(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<PublishingDashboard>> {
    const dashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);

    if (!dashboard) {
      throw new NotFoundException('发布中心不存在或当前用户无权访问');
    }

    return { success: true, data: dashboard };
  }

  @Get('adapter-capabilities')
  async getAdapterCapabilities(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<PublishingAdapterCapability[]>> {
    const dashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);
    if (!dashboard) throw new NotFoundException('发布中心不存在或当前用户无权访问');
    return { success: true, data: this.adapterRegistry.listCapabilities(dashboard.platforms.map((platform) => platform.platform)) };
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

  @Patch('accounts/:accountId/mode')
  async updateAccountMode(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('accountId') accountId: string,
    @Body() input: PublishingModeInput
  ): Promise<ApiResponse<PublishingAccount>> {
    if (!publishingModes.includes(input.publishingMode)) throw new BadRequestException('发布模式无效');
    const account = await this.permissionsService.updatePublishingAccountMode(request.context.userId, brandId, accountId, input);
    if (!account) throw new NotFoundException('发布账号不存在或当前用户无权访问');
    return { success: true, data: account };
  }

  @Post('records')
  async createRecord(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: PublishingRecordInput
  ): Promise<ApiResponse<PublishingRecord>> {
    const normalizedInput = normalizeRecordInput(input);
    const dashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);
    if (!dashboard) throw new NotFoundException('发布中心不存在或当前用户无权访问');
    const account = normalizedInput.accountId
      ? dashboard.accounts.find((item) => item.id === normalizedInput.accountId)
      : undefined;
    const requiresConfirmation = normalizedInput.status === 'pending' || account?.publishingMode === 'automatic' || Boolean(normalizedInput.confirmation);
    if (requiresConfirmation) validatePublishingConfirmation(normalizedInput, account);

    const record = await this.permissionsService.createPublishingRecord(request.context.userId, brandId, normalizedInput);

    if (!record) {
      throw new NotFoundException('发布记录无法创建或关联对象不存在');
    }

    if (record.publishingMode === 'automatic') {
      const result = await this.publishingExecutionService.execute(request.context.userId, brandId, record.id);
      return { success: true, data: result.record };
    }

    return { success: true, data: record };
  }

  @Post('records/:recordId/execute')
  async executeRecord(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('recordId') recordId: string,
    @Body() confirmation: PublishingExecutionConfirmationInput
  ): Promise<ApiResponse<PublishingExecutionResult>> {
    try {
      await this.assertExecutionConfirmed(request.context.userId, brandId, recordId, confirmation);
      const result = await this.publishingExecutionService.execute(request.context.userId, brandId, recordId);
      return { success: true, data: result };
    } catch (error) {
      if (error instanceof PublishingExecutionError && error.kind === 'not_found') {
        throw new NotFoundException(error.message);
      }
      if (error instanceof PublishingExecutionError) {
        throw new BadRequestException(error.message);
      }
      throw error;
    }
  }

  private async assertExecutionConfirmed(userId: string, brandId: string, recordId: string, confirmation: PublishingExecutionConfirmationInput): Promise<void> {
    const dashboard = await this.permissionsService.getPublishingDashboard(userId, brandId);
    const record = dashboard?.records.find((item) => item.id === recordId);
    if (!record) throw new NotFoundException('发布记录不存在或当前用户无权访问');
    if (!confirmation?.confirmed) throw new BadRequestException('请确认本次发布的账号、内容版本和目标渠道');
    if (confirmation.accountId?.trim() !== record.accountId || confirmation.contentVersion?.trim() !== record.contentVersion || confirmation.targetPlatform?.trim() !== record.platform) {
      throw new BadRequestException('发布对象已发生变化，请重新确认账号、内容版本和目标渠道');
    }
  }

  @Patch('records/:recordId/confirmation')
  async confirmRecord(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('recordId') recordId: string,
    @Body() input: PublishingRecordConfirmationInput
  ): Promise<ApiResponse<PublishingRecord>> {
    const dashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);
    const currentRecord = dashboard?.records.find((record) => record.id === recordId);
    const account = dashboard?.accounts.find((item) => item.id === input.accountId?.trim());
    if (!currentRecord) throw new NotFoundException('发布记录不存在或当前用户无权访问');
    const normalizedInput: PublishingRecordConfirmationInput = {
      accountId: input.accountId?.trim(),
      publishingMode: input.publishingMode,
      contentVersionLabel: input.contentVersionLabel?.trim(),
      materialRequirementsConfirmed: input.materialRequirementsConfirmed === true,
      retestPlanAt: input.retestPlanAt?.trim()
    };
    validatePublishingConfirmation({
      accountId: normalizedInput.accountId,
      versionId: currentRecord.versionId,
      targetPlatform: account?.platform,
      confirmation: normalizedInput
    }, account);
    const record = await this.permissionsService.confirmPublishingRecord(request.context.userId, brandId, recordId, normalizedInput);
    if (!record) throw new NotFoundException('发布记录确认失败或关联账号不存在');
    return { success: true, data: record };
  }

  @Patch('records/:recordId/status')
  async updateRecordStatus(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Param('recordId') recordId: string,
    @Body() input: PublishingStatusInput
  ): Promise<ApiResponse<PublishingRecord>> {
    const normalizedInput = normalizeRecordStatusInput(input);
    if (normalizedInput.status === 'pending' || normalizedInput.status === 'published') {
      const dashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);
      const currentRecord = dashboard?.records.find((record) => record.id === recordId);
      if (!currentRecord) throw new NotFoundException('发布记录不存在或当前用户无权访问');
      assertPublishingRecordConfirmed(currentRecord);
      const account = dashboard?.accounts.find((item) => item.id === currentRecord.accountId);
      if (!account || account.publishingMode !== currentRecord.publishingMode) {
        throw new BadRequestException('发布账号或发布方式已发生变化，请重新确认');
      }
    }
    const record = await this.permissionsService.updatePublishingRecordStatus(request.context.userId, brandId, recordId, normalizedInput);

    if (!record) {
      throw new NotFoundException('发布记录不存在或当前用户无权访问');
    }

    return { success: true, data: record };
  }

  @Get('record-performance')
  async listRecordPerformance(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<PublishingRecordPerformance[]>> {
    const publishingDashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);
    const citationDashboard = await this.permissionsService.getCitationDashboard(request.context.userId, brandId);
    const growthWorkspace = await this.permissionsService.getGrowthOptimizationWorkspace(request.context.userId, brandId);

    if (!publishingDashboard || !citationDashboard || !growthWorkspace) {
      throw new NotFoundException('发布表现不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: buildPublishingRecordPerformance(publishingDashboard.records, citationDashboard.sources, growthWorkspace.relatedTasks)
    };
  }
}

@Controller('brands/:brandId')
export class OwnedMediaController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get('owned-media')
  async listOwnedMedia(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<OwnedMediaAccount[]>> {
    const dashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);

    if (!dashboard) {
      throw new NotFoundException('自有媒体不存在或当前用户无权访问');
    }

    return { success: true, data: buildOwnedMediaAccounts(dashboard.accounts, dashboard.records) };
  }

  @Post('owned-media')
  async createOwnedMedia(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() input: PublishingAccountInput
  ): Promise<ApiResponse<OwnedMediaAccount>> {
    const account = await this.permissionsService.connectPublishingAccount(request.context.userId, brandId, normalizeAccountInput(input, true));
    const dashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);

    if (!account || !dashboard) {
      throw new NotFoundException('自有媒体账号无法接入或当前用户无权访问');
    }

    return { success: true, data: buildOwnedMediaAccount(account, dashboard.records) };
  }

  @Get('media-platform-rules')
  async listMediaPlatformRules(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<MediaPlatformRule[]>> {
    const dashboard = await this.permissionsService.getPublishingDashboard(request.context.userId, brandId);

    if (!dashboard) {
      throw new NotFoundException('媒体平台规则不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: mediaPlatformRules.map((rule) => ({ ...rule, brandId }))
    };
  }
}

function buildOwnedMediaAccounts(accounts: PublishingAccount[], records: PublishingRecord[]): OwnedMediaAccount[] {
  return accounts.map((account) => buildOwnedMediaAccount(account, records));
}

function buildOwnedMediaAccount(account: PublishingAccount, records: PublishingRecord[]): OwnedMediaAccount {
  const platformRecords = records.filter((record) => record.platform === account.platform || record.accountId === account.id);

  return {
    ...account,
    platformName: getOwnedMediaPlatformName(account.platform),
    stats: {
      brandId: account.brandId,
      platform: account.platform,
      totalRecords: platformRecords.length,
      draftRecords: platformRecords.filter((record) => record.status === 'draft').length,
      pendingRecords: platformRecords.filter((record) => ['pending', 'queued', 'publishing'].includes(record.status)).length,
      publishedRecords: platformRecords.filter((record) => record.status === 'published').length,
      failedRecords: platformRecords.filter((record) => record.status === 'failed').length
    }
  };
}

function getOwnedMediaPlatformName(platform: string): string {
  return mediaPlatformRules.find((rule) => rule.platform === platform)?.name ?? platform;
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
    publishingMode: input.publishingMode && publishingModes.includes(input.publishingMode) ? input.publishingMode : undefined,
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
    confirmation: input.confirmation ? {
      publishingMode: input.confirmation.publishingMode,
      contentVersionLabel: input.confirmation.contentVersionLabel?.trim(),
      materialRequirementsConfirmed: input.confirmation.materialRequirementsConfirmed === true,
      retestPlanAt: input.confirmation.retestPlanAt?.trim() ?? ''
    } : undefined,
    status: input.status && recordCreationStatuses.includes(input.status) ? input.status : undefined
  };
}

function validatePublishingConfirmation(input: PublishingRecordInput, account: PublishingAccount | undefined): void {
  const confirmation = input.confirmation;
  if (!account) throw new BadRequestException('创建发布任务前必须选择目标账号');
  if (account.authStatus !== 'connected') throw new BadRequestException('目标发布账号尚未连接');
  if (!confirmation || confirmation.publishingMode !== account.publishingMode) throw new BadRequestException('请确认账号当前使用的发布方式');
  if (!input.versionId && !confirmation.contentVersionLabel) throw new BadRequestException('创建发布任务前必须确认内容版本');
  if (!confirmation.materialRequirementsConfirmed) throw new BadRequestException('创建发布任务前必须确认素材要求');
  if (!confirmation.retestPlanAt || Number.isNaN(Date.parse(confirmation.retestPlanAt))) throw new BadRequestException('创建发布任务前必须设置有效的再次监测计划');
  const platform = input.targetPlatform?.trim() || account.platform;
  if (platform !== account.platform) throw new BadRequestException('目标平台与发布账号不一致');
}

function assertPublishingRecordConfirmed(record: PublishingRecord): void {
  if (!record.confirmedAt || !record.contentVersion || !record.materialRequirementsConfirmed || !record.retestPlanAt) {
    throw new BadRequestException('请先确认账号、内容版本、发布方式、素材要求和再次监测计划');
  }
}

function normalizeRecordStatusInput(input: PublishingStatusInput): PublishingStatusInput {
  if (!recordUpdateStatuses.includes(input.status)) throw new BadRequestException('发布状态无效');
  const publishedUrl = input.publishedUrl?.trim();
  if (input.status === 'published' && (!publishedUrl || !isHttpUrl(publishedUrl))) {
    throw new BadRequestException('已发布状态必须提供完整的真实发布链接');
  }
  return {
    status: input.status,
    publishedUrl,
    errorMessage: input.errorMessage?.trim()
  };
}

const loginModes: PublishingAccountInput['loginMode'][] = ['oauth', 'manual', 'cookie'];
const publishingModes: PublishingMode[] = ['manual', 'assisted', 'automatic'];
const authStatuses: PublishingAuthStatus[] = ['connected', 'expired', 'error', 'disconnected'];
const recordCreationStatuses: PublishingRecordStatus[] = ['draft', 'pending'];
const recordUpdateStatuses: PublishingRecordStatus[] = ['draft', 'pending', 'published', 'failed'];

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}

const mediaPlatformRules: Array<Omit<MediaPlatformRule, 'brandId'>> = [
  {
    platform: 'website',
    name: '官网',
    contentFormats: ['官网 FAQ', '产品页', '方案页'],
    intentFit: '品牌确认、产品了解、售前答疑',
    recommendedFrequency: '按资料变更及时更新',
    coverRatio: '按页面模板',
    publishingNote: 'URL、标题、结构化标题和更新时间发布前确认'
  },
  {
    platform: 'blog',
    name: '博客',
    contentFormats: ['教程文章', '案例复盘', '观点文章'],
    intentFit: '深度了解、操作学习、长期搜索',
    recommendedFrequency: '每周 1-2 篇',
    coverRatio: '16:9',
    publishingNote: '分类、摘要、内链和图片版权发布前确认'
  },
  {
    platform: 'wechat',
    name: '公众号',
    contentFormats: ['公众号推文', 'FAQ 合集', '案例文章'],
    intentFit: '品牌了解、方案比较、购买前确认',
    recommendedFrequency: '每周 1-3 篇',
    coverRatio: '2.35:1 或 1:1',
    publishingNote: '标题、摘要、封面和跳转入口发布前逐项确认'
  },
  {
    platform: 'zhihu',
    name: '知乎',
    contentFormats: ['问答', '专栏文章', '对比说明'],
    intentFit: '专业判断、方案选择、竞品比较',
    recommendedFrequency: '每周 1-2 篇',
    coverRatio: '无强制封面',
    publishingNote: '回答结构、事实来源和利益相关说明发布前确认'
  },
  {
    platform: 'xiaohongshu',
    name: '小红书',
    contentFormats: ['小红书图文', '场景 FAQ', '对比笔记'],
    intentFit: '场景咨询、口碑比较、体验问题',
    recommendedFrequency: '每周 2-5 篇',
    coverRatio: '3:4',
    publishingNote: '首图、标题、话题标签和合规表达需统一检查'
  },
  {
    platform: 'bilibili',
    name: 'B 站',
    contentFormats: ['视频脚本', '知识科普', '案例拆解'],
    intentFit: '学习了解、案例判断、复杂问题解释',
    recommendedFrequency: '每周 1 篇',
    coverRatio: '16:9',
    publishingNote: '封面、分区、简介和字幕发布前确认'
  },
  {
    platform: 'video_channel',
    name: '视频号',
    contentFormats: ['短视频脚本', '活动预告', '服务说明'],
    intentFit: '快速了解、活动触达、服务确认',
    recommendedFrequency: '每周 2-4 条',
    coverRatio: '9:16 或 1:1',
    publishingNote: '封面、字幕、话题和引导语发布前确认'
  },
  {
    platform: 'other',
    name: '其他账号',
    contentFormats: ['文章', 'FAQ', '图文'],
    intentFit: '品牌了解、问题解答、方案比较',
    recommendedFrequency: '按内容策略排期发布',
    coverRatio: '按平台要求',
    publishingNote: '发布账号、内容格式、素材和链接发布前确认'
  }
];
