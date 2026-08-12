import { Body, Controller, Get, NotFoundException, Param, Post, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { ApiResponse, OrganizationProviderConfigInput, ProviderGovernanceSummary } from '@geo-platform/shared-types';
import { ProviderGovernanceService } from './provider-governance.service';
import { ProviderHealthService } from './provider-health.service';

@Controller('brands/:brandId/providers')
export class ProviderGovernanceController {
  constructor(private readonly providerGovernanceService: ProviderGovernanceService, private readonly providerHealthService: ProviderHealthService) {}

  @Get()
  async list(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<ProviderGovernanceSummary[]>> {
    const providers = await this.providerGovernanceService.list(request.context.userId, brandId);
    if (!providers) throw new NotFoundException('Provider 配置不存在或当前用户无权访问');
    return { success: true, data: providers };
  }

  @Post()
  async upsert(@Req() request: Request, @Param('brandId') brandId: string, @Body() input: OrganizationProviderConfigInput): Promise<ApiResponse<ProviderGovernanceSummary>> {
    const provider = await this.providerGovernanceService.upsertOrganizationByok(request.context.userId, brandId, input);
    if (!provider) throw new NotFoundException('无法保存组织 Provider 配置');
    return { success: true, data: provider };
  }

  @Post(':platformCode/health')
  async checkHealth(@Req() request: Request, @Param('brandId') brandId: string, @Param('platformCode') platformCode: string): Promise<ApiResponse<{ status: string; latencyMs?: number; expiresAt: string }>> {
    const result = await this.providerHealthService.check(request.context.userId, brandId, platformCode);
    if (!result) throw new NotFoundException('Provider 缺少可验证的运行时配置');
    return { success: true, data: { status: result.status, latencyMs: result.latencyMs ?? undefined, expiresAt: result.expiresAt.toISOString() } };
  }
}
