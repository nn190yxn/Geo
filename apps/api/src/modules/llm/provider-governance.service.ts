import { Injectable, Optional } from '@nestjs/common';
import type { BrandId, OrganizationProviderConfigInput, ProviderGovernanceSummary } from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class ProviderGovernanceService {
  constructor(private readonly permissionsService: PermissionsService, @Optional() private readonly prisma?: PrismaService) {}

  async list(userId: string, brandId: BrandId): Promise<ProviderGovernanceSummary[] | null> {
    const organizationId = await this.permissionsService.getAccessibleBrandOrganizationId(userId, brandId);
    if (!organizationId) return null;
    const organizationConfigs = this.prisma ? await this.prisma.organizationProviderConfig.findMany({ where: { organizationId }, orderBy: [{ priority: 'asc' }, { platformCode: 'asc' }] }) : [];
    if (organizationConfigs.length > 0) return Promise.all(organizationConfigs
      .slice()
      .sort((left, right) => left.priority - right.priority || left.platformCode.localeCompare(right.platformCode))
      .map(async (config, index) => summarize(organizationId, config, index, this.prisma?.providerHealthCheck ? await this.prisma.providerHealthCheck.findFirst({ where: { providerConfigId: config.id }, orderBy: { checkedAt: 'desc' } }) : null)));
    const configs = await this.permissionsService.listPlatformConfigs(userId, brandId);
    if (!configs) return null;
    return configs
      .filter((config) => config.mode === 'api')
      .sort((left, right) => Number(right.enabled) - Number(left.enabled) || left.platformCode.localeCompare(right.platformCode))
      .map((config, index) => ({
        organizationId,
        providerId: `provider:${organizationId}:${config.platformCode}`,
        purpose: 'generation',
        platformCode: config.platformCode,
        modelName: config.modelName ?? '待配置模型',
        healthStatus: config.enabled && config.hasCredential ? 'healthy' : config.hasCredential ? 'attention' : 'unavailable',
        priority: index + 1,
        failoverOrder: index + 1,
        credentialStatus: config.hasCredential ? 'configured' : 'missing',
        credentialSource: config.hasCredential ? 'organization_byok' : 'platform_managed'
      }));
  }

  async upsertOrganizationByok(userId: string, brandId: BrandId, input: OrganizationProviderConfigInput): Promise<ProviderGovernanceSummary | null> {
    const organizationId = await this.permissionsService.getAccessibleBrandOrganizationId(userId, brandId);
    if (!organizationId || !this.prisma || !input.platformCode?.trim() || !input.modelName?.trim()) return null;
    const config = await this.prisma.organizationProviderConfig.upsert({
      where: { organizationId_platformCode_purpose: { organizationId, platformCode: input.platformCode.trim(), purpose: input.purpose ?? 'generation' } },
      create: { organizationId, platformCode: input.platformCode.trim(), modelName: input.modelName.trim(), endpointUrl: input.endpointUrl?.trim(), purpose: input.purpose ?? 'generation', credentialRef: input.credentialRef?.trim(), enabled: input.enabled ?? true, priority: input.priority ?? 100 },
      update: { modelName: input.modelName.trim(), endpointUrl: input.endpointUrl?.trim(), credentialRef: input.credentialRef?.trim(), enabled: input.enabled ?? true, priority: input.priority ?? 100 }
    });
    return summarize(organizationId, config, 0);
  }
}

function summarize(organizationId: string, config: { id: string; platformCode: string; modelName: string; purpose: string; credentialRef: string | null; enabled: boolean; priority: number }, index: number, health?: { status: string; expiresAt: Date } | null): ProviderGovernanceSummary {
  const hasCredential = Boolean(config.credentialRef);
  const healthStatus = !config.enabled || !hasCredential ? 'unavailable' : !health || health.expiresAt <= new Date() ? 'attention' : health.status === 'healthy' ? 'healthy' : 'attention';
  return { organizationId, providerId: config.id, purpose: config.purpose === 'monitoring' ? 'monitoring' : 'generation', platformCode: config.platformCode, modelName: config.modelName, healthStatus, priority: config.priority, failoverOrder: index + 1, credentialStatus: hasCredential ? 'configured' : 'missing', credentialSource: hasCredential ? 'organization_byok' : 'platform_managed' };
}
