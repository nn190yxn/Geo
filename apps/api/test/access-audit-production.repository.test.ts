import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('access audit production permissions model', () => {
  it('lists active organization memberships for the current user', () => {
    const repository = new PermissionsRepository();

    expect(repository.listOrganizationMemberships('user_demo')).toEqual([
      expect.objectContaining({
        organizationId: 'org_demo',
        userId: 'user_demo',
        status: 'active',
        organization: expect.objectContaining({ status: 'active' }),
        role: expect.objectContaining({ code: 'owner', scope: 'organization' })
      })
    ]);
  });

  it('allows brand access when user and organization membership are active', () => {
    const repository = new PermissionsRepository();

    expect(repository.canAccessBrand('user_demo', 'brand_demo')).toBe(true);
    expect(repository.listAccessibleBrands('user_demo')).toContainEqual(
      expect.objectContaining({ brandId: 'brand_demo', role: 'owner' })
    );
  });

  it('denies brand access without an active organization membership', () => {
    const repository = new PermissionsRepository();

    expect(repository.listOrganizationMemberships('missing_user')).toEqual([]);
    expect(repository.canAccessBrand('missing_user', 'brand_demo')).toBe(false);
    expect(repository.listAccessibleBrands('missing_user')).toEqual([]);
  });

  it('denies brand access for suspended users', () => {
    const repository = new PermissionsRepository();

    expect(repository.listOrganizationMemberships('user_suspended')).toHaveLength(1);
    expect(repository.canAccessBrand('user_suspended', 'brand_demo')).toBe(false);
    expect(repository.listAccessibleBrands('user_suspended')).toEqual([]);
  });

  it('creates and filters audit logs with sensitive metadata redacted', () => {
    const repository = new PermissionsRepository();

    const successLog = repository.createAuditLog('user_demo', {
      brandId: 'brand_demo',
      organizationId: 'org_demo',
      actorUserId: 'user_demo',
      action: 'platform_config.validate',
      resourceType: 'platform_config',
      resourceId: 'platform_demo',
      result: 'success',
      errorCode: null,
      metadata: { credentialRef: 'secret-ref', requestId: 'req_1' },
      createdAt: '2026-07-04T00:00:00.000Z'
    });

    repository.createAuditLog('user_demo', {
      brandId: 'brand_child_fitness',
      organizationId: 'org_demo',
      actorUserId: 'user_demo',
      action: 'content.publish',
      resourceType: 'publishing_record',
      resourceId: 'publishing_1',
      result: 'failure',
      errorCode: 'account_expired',
      metadata: { token: 'token-value' },
      createdAt: '2026-07-04T01:00:00.000Z'
    });

    expect(successLog.metadata).toEqual({ credentialRef: '[REDACTED]', requestId: 'req_1' });
    expect(repository.listAuditLogs('user_demo', { brandId: 'brand_demo', result: 'success' })).toEqual([successLog]);
    expect(repository.listAuditLogs('user_demo', { resourceType: 'publishing_record' })).toHaveLength(1);
    expect(repository.listAuditLogs('user_demo', { action: 'missing.action' })).toEqual([]);
  });
});
