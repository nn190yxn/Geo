import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Patch, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, BrowserConnectionSession, BrowserConnectionStartInput, BrowserConnectionStatusInput, PlatformConfig, PlatformConfigInput, PlatformValidationResult } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { platformModes } from '../permissions/permissions.repository';
import { AIPlatformAdapterRegistry, AIPlatformAdapterSelectionError } from './adapters/ai-platform-adapter.registry';
import { getMissingApiConfigMessage, getModeValidationMessage } from './platform-validation-message';

@Controller('platforms')
export class PlatformsController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly adapterRegistry: AIPlatformAdapterRegistry
  ) {}

  @Get()
  async listPlatformConfigs(@Req() request: Request): Promise<ApiResponse<PlatformConfig[]>> {
    const brandId = requireBrandId(request);
    const configs = await this.permissionsService.listPlatformConfigs(request.context.userId, brandId);

    if (!configs) {
      throw new NotFoundException('平台配置不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: configs
    };
  }

  @Get('browser-sessions')
  async listBrowserConnectionSessions(@Req() request: Request): Promise<ApiResponse<BrowserConnectionSession[]>> {
    const brandId = requireBrandId(request);
    const sessions = await this.permissionsService.listBrowserConnectionSessions(request.context.userId, brandId);

    if (!sessions) {
      throw new NotFoundException('浏览器连接会话不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: sessions
    };
  }

  @Post('browser-sessions')
  async startBrowserConnectionSession(
    @Req() request: Request,
    @Body() body: BrowserConnectionStartInput
  ): Promise<ApiResponse<BrowserConnectionSession>> {
    const brandId = requireBrandId(request);
    const session = await this.permissionsService.startBrowserConnectionSession(request.context.userId, brandId, normalizeBrowserConnectionStartInput(body));

    if (!session) {
      throw new BadRequestException('无法创建浏览器连接会话');
    }

    return {
      success: true,
      data: session
    };
  }

  @Patch('browser-sessions/:sessionId')
  async updateBrowserConnectionSession(
    @Req() request: Request,
    @Param('sessionId') sessionId: string,
    @Body() body: BrowserConnectionStatusInput
  ): Promise<ApiResponse<BrowserConnectionSession>> {
    const brandId = requireBrandId(request);
    const session = await this.permissionsService.updateBrowserConnectionSession(request.context.userId, brandId, sessionId, normalizeBrowserConnectionStatusInput(body));

    if (!session) {
      throw new NotFoundException('浏览器连接会话不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: session
    };
  }

  @Post()
  async createPlatformConfig(@Req() request: Request, @Body() body: PlatformConfigInput): Promise<ApiResponse<PlatformConfig>> {
    const brandId = requireBrandId(request);
    const config = await this.permissionsService.createPlatformConfig(request.context.userId, brandId, normalizePlatformConfigInput(body));

    if (!config) {
      throw new BadRequestException('平台配置已存在或当前用户无权访问');
    }

    return {
      success: true,
      data: config
    };
  }

  @Patch(':platformId')
  async updatePlatformConfig(
    @Req() request: Request,
    @Param('platformId') platformId: string,
    @Body() body: Partial<PlatformConfigInput>
  ): Promise<ApiResponse<PlatformConfig>> {
    const brandId = requireBrandId(request);
    const config = await this.permissionsService.updatePlatformConfig(
      request.context.userId,
      brandId,
      platformId,
      normalizePartialPlatformConfigInput(body)
    );

    if (!config) {
      throw new NotFoundException('平台配置不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: config
    };
  }

  @Post(':platformId/validate')
  async validatePlatformConfig(@Req() request: Request, @Param('platformId') platformId: string): Promise<ApiResponse<PlatformValidationResult>> {
    const brandId = requireBrandId(request);
    const config = await this.permissionsService.getPlatformRuntimeConfigById(request.context.userId, brandId, platformId);

    if (!config) {
      throw new NotFoundException('平台配置不存在或当前用户无权访问');
    }

    const result = await this.validateWithAdapter(config);
    await this.permissionsService.savePlatformValidationResult(request.context.userId, brandId, platformId, result);

    if (!result) {
      throw new NotFoundException('平台配置不存在或当前用户无权访问');
    }

    return {
      success: true,
      data: result
    };
  }

  private async validateWithAdapter(config: PlatformConfig): Promise<PlatformValidationResult> {
    if (config.mode !== 'api') {
      return {
        ok: true,
        mode: config.mode,
        checkedAt: new Date().toISOString(),
        message: getModeValidationMessage(config.mode)
      };
    }

    const apiFieldMessage = getMissingApiConfigMessage(config);

    if (apiFieldMessage) {
      return {
        ok: false,
        mode: config.mode,
        checkedAt: new Date().toISOString(),
        message: apiFieldMessage
      };
    }

    try {
      const adapter = this.adapterRegistry.requireAdapter(config);
      return adapter.validateConfig(config);
    } catch (error) {
      if (error instanceof AIPlatformAdapterSelectionError) {
        return {
          ok: false,
          mode: config.mode,
          checkedAt: new Date().toISOString(),
          message: '当前平台暂未接入自动监测，请改用浏览器辅助监测或手动录入回答。'
        };
      }

      throw error;
    }
  }
}

function requireBrandId(request: Request): string {
  if (!request.context.brandId) {
    throw new BadRequestException('缺少品牌上下文');
  }

  return request.context.brandId;
}

function normalizePlatformConfigInput(input: PlatformConfigInput): PlatformConfigInput {
  const normalized = normalizePartialPlatformConfigInput(input);

  if (!normalized.platformCode) {
    throw new BadRequestException('平台代码不能为空');
  }

  if (!normalized.name) {
    throw new BadRequestException('平台名称不能为空');
  }

  if (!normalized.mode) {
    throw new BadRequestException('请选择调用方式');
  }

  return normalized as PlatformConfigInput;
}

function normalizePartialPlatformConfigInput(input: Partial<PlatformConfigInput>): Partial<PlatformConfigInput> {
  if (input.mode && !platformModes.includes(input.mode)) {
    throw new BadRequestException('调用方式不支持');
  }

  if (input.rateLimitPerMinute !== undefined && input.rateLimitPerMinute < 0) {
    throw new BadRequestException('调用限制不能为负数');
  }

  return {
    platformCode: input.platformCode?.trim(),
    name: input.name?.trim(),
    mode: input.mode,
    endpointUrl: input.endpointUrl?.trim(),
    modelName: input.modelName?.trim(),
    rateLimitPerMinute: input.rateLimitPerMinute,
    credentialRef: input.credentialRef?.trim(),
    enabled: input.enabled
  };
}

function normalizeBrowserConnectionStartInput(input: BrowserConnectionStartInput): BrowserConnectionStartInput {
  const platformCode = input.platformCode?.trim();

  if (!platformCode) {
    throw new BadRequestException('平台代码不能为空');
  }

  return {
    platformCode,
    testPlanId: input.testPlanId?.trim()
  };
}

function normalizeBrowserConnectionStatusInput(input: BrowserConnectionStatusInput): BrowserConnectionStatusInput {
  if (!input.status) {
    throw new BadRequestException('浏览器连接状态不能为空');
  }

  return {
    status: input.status,
    loginDetected: input.loginDetected,
    lastOperation: input.lastOperation?.trim(),
    lastIssueType: input.lastIssueType,
    lastMessage: input.lastMessage?.trim(),
    lastAvailableAt: input.lastAvailableAt?.trim()
  };
}
