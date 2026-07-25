import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { resolveBrandAccessPolicy, satisfiesRole } from '../src/common/access-control/brand-access.policy';
import { BrandAccessMiddleware } from '../src/common/middleware/brand-access.middleware';
import type { PermissionsRepositoryPort } from '../src/modules/permissions/permissions.repository.port';

function createRequest(method: string, path: string, brandId = 'brand_demo'): Request {
  return {
    method,
    path,
    context: {
      brandId,
      userId: 'user_demo',
      requestId: 'request_1'
    }
  } as Request;
}

function createRepository(role: 'owner' | 'admin' | 'operator' | 'analyst' | 'viewer' | null): PermissionsRepositoryPort {
  return {
    listAccessibleBrands: vi.fn().mockResolvedValue(role ? [{ brandId: 'brand_demo', name: 'Demo Brand', status: 'active', role }] : []),
    recordDeniedAccess: vi.fn(),
    createAuditLog: vi.fn().mockResolvedValue({ id: 'audit_1' })
  } as unknown as PermissionsRepositoryPort;
}

describe('brand access policy', () => {
  it('resolves read and write policies from request method and module path', () => {
    expect(resolveBrandAccessPolicy('GET', '/api/v1/content/assets')).toEqual({ resource: 'content', minimumRole: 'viewer' });
    expect(resolveBrandAccessPolicy('POST', '/api/v1/platforms')).toEqual({ resource: 'platform_config', minimumRole: 'admin' });
    expect(resolveBrandAccessPolicy('POST', '/api/v1/monitoring-runs')).toEqual({ resource: 'monitoring', minimumRole: 'operator' });
  });

  it('checks role hierarchy against minimum role', () => {
    expect(satisfiesRole('owner', 'admin')).toBe(true);
    expect(satisfiesRole('operator', 'viewer')).toBe(true);
    expect(satisfiesRole('viewer', 'operator')).toBe(false);
  });

  it('allows requests when the user role satisfies the policy', async () => {
    const repository = createRepository('operator');
    const middleware = new BrandAccessMiddleware(repository);
    const next = vi.fn();

    await middleware.use(createRequest('POST', '/api/v1/monitoring-runs'), {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(repository.recordDeniedAccess).not.toHaveBeenCalled();
  });

  it('records denied access and audit log when role is insufficient', async () => {
    const repository = createRepository('viewer');
    const middleware = new BrandAccessMiddleware(repository);

    await expect(middleware.use(createRequest('POST', '/api/v1/platforms'), {} as Response, vi.fn())).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.recordDeniedAccess).toHaveBeenCalledWith(expect.objectContaining({ reason: 'ROLE_ADMIN_REQUIRED' }));
    expect(repository.createAuditLog).toHaveBeenCalledWith('user_demo', expect.objectContaining({ result: 'denied', errorCode: 'role_insufficient' }));
  });

  it('records missing permission when brand is inaccessible', async () => {
    const repository = createRepository(null);
    const middleware = new BrandAccessMiddleware(repository);

    await expect(middleware.use(createRequest('GET', '/api/v1/content'), {} as Response, vi.fn())).rejects.toBeInstanceOf(ForbiddenException);
    expect(repository.recordDeniedAccess).toHaveBeenCalledWith(expect.objectContaining({ reason: 'USER_BRAND_PERMISSION_MISSING' }));
    expect(repository.createAuditLog).toHaveBeenCalledWith('user_demo', expect.objectContaining({ errorCode: 'brand_permission_missing' }));
  });
});
