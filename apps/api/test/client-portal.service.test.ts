import { describe, expect, it } from 'vitest';
import { ClientPortalService } from '../src/modules/reports/client-portal.service';

describe('ClientPortalService', () => {
  it('limits client visibility to active brand grants', () => {
    const service = new ClientPortalService(); service.grant('brand-a', 'client-a', new Date(Date.now() + 60_000));
    expect(() => service.assertReadAccess('brand-a', 'client-a')).not.toThrow();
    expect(() => service.assertReadAccess('brand-b', 'client-a')).toThrow('client_read_access_denied');
  });
  it('allows cross-brand comparison only for matching period, methodology, and baseline', () => {
    const service = new ClientPortalService(); const report = { periodStart: '2026-08-01', periodEnd: '2026-08-07', methodologyVersion: 'v1', baselineVersion: 'baseline-a', snapshot: {} };
    expect(service.compare([{ ...report, brandId: 'brand-a' }, { ...report, brandId: 'brand-b' }])).toHaveLength(2);
    expect(() => service.compare([{ ...report, brandId: 'brand-a' }, { ...report, brandId: 'brand-b', baselineVersion: 'baseline-b' }])).toThrow('cross_brand_comparison_not_comparable');
  });
});
