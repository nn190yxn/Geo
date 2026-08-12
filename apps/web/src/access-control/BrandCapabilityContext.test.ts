import { describe, expect, it } from 'vitest';
import type { BrandCapabilitySummary } from '@geo-platform/shared-types';
import { getBrandWriteCapability } from './BrandCapabilityContext';

const operatorCapabilities: BrandCapabilitySummary = {
  role: 'operator',
  applicationPath: '/brands?permissionRequest=1',
  resources: [
    { resource: 'monitoring', canRead: true, canWrite: true, minimumReadRole: 'viewer', minimumWriteRole: 'operator' },
    { resource: 'brand', canRead: true, canWrite: false, minimumReadRole: 'viewer', minimumWriteRole: 'admin' }
  ]
};

describe('brand capability controls', () => {
  it('uses the server capability summary for write controls', () => {
    expect(getBrandWriteCapability(operatorCapabilities, 'monitoring')).toMatchObject({
      canWrite: true,
      minimumRole: 'operator'
    });
    expect(getBrandWriteCapability(operatorCapabilities, 'brand')).toMatchObject({
      canWrite: false,
      minimumRole: 'admin',
      applicationPath: '/brands?permissionRequest=1'
    });
  });

  it('keeps controls disabled while application capabilities are loading', () => {
    expect(getBrandWriteCapability(null, 'content')).toEqual({
      canWrite: false,
      minimumRole: undefined,
      reason: '品牌权限信息加载中。',
      applicationPath: undefined
    });
  });
});
