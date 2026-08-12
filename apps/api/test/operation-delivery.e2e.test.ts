import { describe, expect, it } from 'vitest';
import { OperationCycleService } from '../src/modules/reports/operation-cycle.service';
import { DeliveryBundleService } from '../src/modules/reports/delivery-bundle.service';
import { ClientPortalService } from '../src/modules/reports/client-portal.service';

describe('operation delivery workflow', () => {
  it('runs a recoverable cycle through a frozen delivery bundle and client read access', () => {
    const cycles = new OperationCycleService(); const bundles = new DeliveryBundleService(); const portal = new ClientPortalService();
    const cycle = cycles.create('brand-a', ['确认客户发布链接']); cycles.start(cycle.id); cycles.fail(cycle.id, 'monitoring_timeout'); cycles.resume(cycle.id);
    for (let index = 0; index < 5; index += 1) cycles.completeStep(cycle.id);
    const snapshot = { monitoring: ['run-a'], tasks: ['task-a'], publishing: ['https://example.test/article'], retest: ['run-b'], methodologyVersion: 'v1' };
    const bundle = bundles.create({ brandId: 'brand-a', cycleId: cycle.id, reportId: 'report-a', snapshot, methodologyVersion: 'v1', files: bundles.export(snapshot, 'customer-delivery') });
    portal.grant('brand-a', 'client-a', new Date(Date.now() + 60_000)); portal.assertReadAccess('brand-a', 'client-a');
    expect({ cycle, bundle }).toMatchObject({ cycle: { status: 'succeeded' }, bundle: { snapshot, manifest: expect.any(Array) } });
  });
});
