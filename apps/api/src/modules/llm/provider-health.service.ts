import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../common/prisma/prisma.service';
import { AIPlatformAdapterRegistry } from '../platforms/adapters/ai-platform-adapter.registry';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class ProviderHealthService {
  constructor(private readonly permissions: PermissionsService, private readonly prisma: PrismaService, private readonly adapters: AIPlatformAdapterRegistry) {}

  async check(userId: string, brandId: string, platformCode: string) {
    const organizationId = await this.permissions.getAccessibleBrandOrganizationId(userId, brandId);
    if (!organizationId) return null;
    const provider = await this.prisma.organizationProviderConfig.findFirst({ where: { organizationId, platformCode } });
    if (!provider || !provider.endpointUrl || !provider.credentialRef) return null;
    const startedAt = Date.now();
    try {
      const adapter = this.adapters.requireAdapter({ platformCode, mode: 'api', endpointUrl: provider.endpointUrl });
      const result = await adapter.validateConfig({ id: provider.id, brandId, platformCode, name: platformCode, mode: 'api', availableMethods: ['api'], connectionStatus: 'needs_configuration', connectionStatusLabel: '', nextAction: '', endpointUrl: provider.endpointUrl, modelName: provider.modelName, rateLimitPerMinute: 1, enabled: provider.enabled, hasCredential: true, createdAt: '', updatedAt: '', credentialRef: provider.credentialRef });
      return this.prisma.providerHealthCheck.create({ data: { providerConfigId: provider.id, status: result.ok ? 'healthy' : 'failed', latencyMs: Date.now() - startedAt, errorCategory: result.ok ? null : 'validation_failed', expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
    } catch {
      return this.prisma.providerHealthCheck.create({ data: { providerConfigId: provider.id, status: 'failed', latencyMs: Date.now() - startedAt, errorCategory: 'validation_failed', expiresAt: new Date(Date.now() + 15 * 60 * 1000) } });
    }
  }
}
