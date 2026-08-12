import { describe, expect, it, vi } from 'vitest';
import { ProviderGovernanceService } from '../src/modules/llm/provider-governance.service';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('ProviderGovernanceService', () => {
  it('returns organization-isolated BYOK summaries without credential values', async () => {
    const service = new ProviderGovernanceService({
      getAccessibleBrandOrganizationId: async () => 'org-a',
      listPlatformConfigs: async () => [{ platformCode: 'stepfun', mode: 'api', enabled: true, hasCredential: true, modelName: 'step-3.7-flash' }, { platformCode: 'kimi', mode: 'api', enabled: false, hasCredential: false }]
    } as PermissionsService);

    await expect(service.list('user-a', 'brand-a')).resolves.toEqual([
      expect.objectContaining({ organizationId: 'org-a', platformCode: 'stepfun', credentialStatus: 'configured', credentialSource: 'organization_byok', priority: 1 }),
      expect.objectContaining({ organizationId: 'org-a', platformCode: 'kimi', credentialStatus: 'missing', healthStatus: 'unavailable', priority: 2 })
    ]);
  });

  it('persists BYOK configuration by organization and returns a sanitized summary', async () => {
    const upsert = vi.fn(async ({ create }: { create: { organizationId: string; platformCode: string; modelName: string; credentialRef?: string; enabled: boolean; priority: number; purpose: string } }) => ({ id: 'provider-1', ...create }));
    const service = new ProviderGovernanceService({
      getAccessibleBrandOrganizationId: async () => 'org-a'
    } as PermissionsService, { organizationProviderConfig: { upsert } } as never);

    const result = await service.upsertOrganizationByok('user-a', 'brand-a', { platformCode: 'deepseek', modelName: 'deepseek-chat', credentialRef: 'vault://org-a/deepseek', priority: 10 });

    expect(upsert).toHaveBeenCalledWith(expect.objectContaining({ where: { organizationId_platformCode_purpose: { organizationId: 'org-a', platformCode: 'deepseek', purpose: 'generation' } } }));
    expect(result).toMatchObject({ organizationId: 'org-a', platformCode: 'deepseek', credentialStatus: 'configured', credentialSource: 'organization_byok', priority: 10 });
    expect(JSON.stringify(result)).not.toContain('vault://');
  });

  it('orders enabled organization providers by priority for failover', async () => {
    const service = new ProviderGovernanceService({ getAccessibleBrandOrganizationId: async () => 'org-a' } as PermissionsService, {
      organizationProviderConfig: { findMany: async () => [
        { id: 'secondary', platformCode: 'kimi', modelName: 'moonshot-v1', purpose: 'generation', credentialRef: 'vault://secondary', enabled: true, priority: 20 },
        { id: 'primary', platformCode: 'deepseek', modelName: 'deepseek-chat', purpose: 'generation', credentialRef: 'vault://primary', enabled: true, priority: 10 }
      ] }
    } as never);
    await expect(service.list('user-a', 'brand-a')).resolves.toMatchObject([
      { providerId: 'primary', priority: 10, failoverOrder: 1 },
      { providerId: 'secondary', priority: 20, failoverOrder: 2 }
    ]);
  });

  it('marks expired health checks as requiring retest', async () => {
    const service = new ProviderGovernanceService({ getAccessibleBrandOrganizationId: async () => 'org-a' } as PermissionsService, {
      organizationProviderConfig: { findMany: async () => [{ id: 'provider-a', platformCode: 'deepseek', modelName: 'deepseek-chat', purpose: 'generation', credentialRef: 'vault://provider', enabled: true, priority: 1 }] },
      providerHealthCheck: { findFirst: async () => ({ status: 'healthy', expiresAt: new Date(Date.now() - 1) }) }
    } as never);
    await expect(service.list('user-a', 'brand-a')).resolves.toMatchObject([{ healthStatus: 'attention' }]);
  });
});
