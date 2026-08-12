import { describe, expect, it } from 'vitest';
import { QuotaAdjustmentService } from '../src/modules/llm/quota-adjustment.service';

describe('QuotaAdjustmentService', () => {
  it('requires a reason before writing an adjustment', async () => {
    const service = new QuotaAdjustmentService();
    await expect(service.adjust('admin-a', 'organization', 'org-a', 10, '  ')).rejects.toMatchObject({ message: 'quota_adjustment_reason_required' });
  });

  it('writes the account update and append-only audit in one transaction', async () => {
    const audit = { id: 'audit-a' };
    const tx = {
      quotaAccount: { findUnique: async () => ({ limitAmount: 4 }), upsert: async () => ({ id: 'quota-a' }) },
      quotaAdjustmentAudit: { create: async ({ data }: any) => ({ ...audit, ...data }) }
    };
    const service = new QuotaAdjustmentService({ $transaction: async (callback: any) => callback(tx) } as never);
    await expect(service.adjust('admin-a', 'organization', 'org-a', 10, '季度配额调整')).resolves.toMatchObject({ audit: { actorId: 'admin-a', beforeAmount: 4, afterAmount: 10, deltaAmount: 6, reason: '季度配额调整' } });
  });

  it('P25: preserves actor, reason, and state transition for every adjustment', async () => {
    const audits: any[] = [];
    const tx = { quotaAccount: { findUnique: async () => ({ limitAmount: 1 }), upsert: async () => ({}) }, quotaAdjustmentAudit: { create: async ({ data }: any) => (audits.push(data), data) } };
    const service = new QuotaAdjustmentService({ $transaction: async (callback: any) => callback(tx) } as never);
    for (const amount of [2, 3, 7]) await service.adjust('admin-a', 'user', 'user-a', amount, `adjust-${amount}`);
    expect(audits).toHaveLength(3);
    expect(audits.every((audit) => audit.actorId === 'admin-a' && audit.reason && audit.beforeAmount === 1 && audit.afterAmount > 1)).toBe(true);
  });
});
