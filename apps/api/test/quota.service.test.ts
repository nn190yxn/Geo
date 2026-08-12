import { describe, expect, it } from 'vitest';
import { QuotaService } from '../src/modules/llm/quota.service';
import type { PermissionsService } from '../src/modules/permissions/permissions.service';

function createService() {
  const service = new QuotaService({ getAccessibleBrandOrganizationId: async () => 'org-a' } as PermissionsService);
  return service;
}

describe('QuotaService', () => {
  it('rejects before execution when a user quota is exhausted', async () => {
    const service = createService();
    service.setQuota('user', 'user-a', 0.5);

    const result = await service.reserve('user-a', 'brand-a', 'content_generation', 'task-a', 1);

    expect(result.reservation).toBeUndefined();
    expect(result.rejection).toMatchObject({ reason: 'user_quota_exhausted', requestedCost: 1 });
  });

  it('returns a stable rejection for a frozen user', async () => {
    const service = createService();
    service.setQuota('user', 'user-a', 10);
    (service as any).accounts.get('user:user-a').frozen = true;
    await expect(service.reserve('user-a', 'brand-a', 'content_generation', 'task-frozen')).resolves.toMatchObject({ rejection: { reason: 'user_frozen', recoveryAction: expect.any(String) } });
  });

  it('checks organization and global budgets and settles actual usage', async () => {
    const service = createService();
    service.setQuota('organization', 'org-a', 2);
    service.setQuota('global', 'global', 10);

    const first = await service.reserve('user-a', 'brand-a', 'answer_analysis', 'task-a', 1);
    expect(first.reservation?.status).toBe('reserved');
    const settled = await service.settle(first.reservation!.id, 0.25, 'deepseek', 1);
    expect(settled).toMatchObject({ status: 'settled', settledCost: 0.25 });

    const second = await service.reserve('user-a', 'brand-a', 'answer_analysis', 'task-b', 2);
    expect(second.rejection?.reason).toBe('organization_quota_exhausted');
  });

  it('releases all scope reservations when execution fails', async () => {
    const service = createService();
    service.setQuota('user', 'user-a', 1);
    const result = await service.reserve('user-a', 'brand-a', 'question_generation', 'task-a', 1);
    const released = await service.release(result.reservation!.id);

    expect(released?.status).toBe('released');
    const retry = await service.reserve('user-a', 'brand-a', 'question_generation', 'task-b', 1);
    expect(retry.reservation?.status).toBe('reserved');
  });

  it('P16: settles or releases each accepted provider reservation exactly once', async () => {
    const service = createService();
    for (const [index, cost] of [0.1, 0.5, 1].entries()) {
      const reservation = (await service.reserve('user-a', 'brand-a', 'content_generation', `task-${index}`, 1)).reservation!;
      const result = index % 2 === 0 ? await service.settle(reservation.id, cost, 'deepseek', 1) : await service.release(reservation.id);
      expect(result).toMatchObject({ id: reservation.id, status: index % 2 === 0 ? 'settled' : 'released' });
      expect(await service.settle(reservation.id, cost)).toMatchObject({ status: result!.status });
    }
  });
});
