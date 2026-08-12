import { describe, expect, it } from 'vitest';
import { RuntimeOperationsService } from '../src/modules/llm/runtime-operations.service';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

describe('RuntimeOperationsService', () => {
  it('returns only the current brand operational state and delegates retry and cancellation', async () => {
    const permissions = {
      listAsyncJobs: async () => [
        { id: 'queued', status: 'queued' }, { id: 'failed', status: 'retry-exhausted' }
      ],
      getPublishingDashboard: async () => ({ accounts: [{ id: 'account-a', accountName: '公众号', authStatus: 'authorized' }] }),
      updateAsyncJob: async (_userId: string, _brandId: string, jobId: string, input: { status: string }) => ({ id: jobId, ...input })
    } as unknown as PermissionsService;
    const retries: string[] = [];
    const service = new RuntimeOperationsService(permissions, { list: async () => [{ providerId: 'provider-a', healthStatus: 'healthy' }] } as never, { summary: async () => [{ scope: 'organization', reserved: 1, consumed: 2 }] } as never, { retry: async (_userId: string, _brandId: string, jobId: string) => { retries.push(jobId); return { id: jobId, status: 'queued' }; } } as never);
    const dashboard = await service.dashboard('user-a', 'brand-a');
    expect(dashboard).toMatchObject({ queuedJobs: [{ id: 'queued' }], failedJobs: [{ id: 'failed' }], publishingAccounts: [{ name: '公众号' }] });
    await service.retry('user-a', 'brand-a', 'failed');
    await service.cancel('user-a', 'brand-a', 'queued');
    expect(retries).toEqual(['failed']);
  });
});
