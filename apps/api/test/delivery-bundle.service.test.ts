import { describe, expect, it } from 'vitest';
import { DeliveryBundleService } from '../src/modules/reports/delivery-bundle.service';

describe('DeliveryBundleService', () => {
  it('P17: freezes a snapshot and manifests every successful export', () => {
    const service = new DeliveryBundleService(); const snapshot = { metrics: { visibility: 0.8 }, tasks: ['task-a'] }; const files = service.export(snapshot, 'weekly-report');
    const bundle = service.create({ brandId: 'brand-a', reportId: 'report-a', snapshot, methodologyVersion: 'v1', files }); snapshot.metrics.visibility = 0;
    expect(bundle.snapshot).toMatchObject({ metrics: { visibility: 0.8 } });
    expect(bundle.manifest).toEqual(expect.arrayContaining([expect.objectContaining({ format: 'html' }), expect.objectContaining({ format: 'pdf' }), expect.objectContaining({ format: 'markdown' }), expect.objectContaining({ format: 'csv' })]));
  });
  it('rejects a delivery bundle with a failed export', () => {
    const service = new DeliveryBundleService();
    expect(() => service.create({ brandId: 'brand-a', reportId: 'report-a', snapshot: {}, methodologyVersion: 'v1', files: [{ format: 'html', name: 'a.html', content: '', status: 'failed' }] })).toThrow('delivery_bundle_incomplete');
  });
});
