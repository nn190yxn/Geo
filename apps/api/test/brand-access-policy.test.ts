import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';
import type { Request, Response } from 'express';
import { buildBrandCapabilitySummary, resolveBrandAccessPolicy, satisfiesRole } from '../src/common/access-control/brand-access.policy';
import { BrandAccessMiddleware } from '../src/common/middleware/brand-access.middleware';
import type { PermissionsRepositoryPort } from '../src/modules/permissions/permissions.repository.port';
import { PermissionsService } from '../src/modules/permissions/permissions.service';

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
  const routeMatrix = [
    ['brand', '/api/v1/brands/brand_demo'],
    ['quick_start', '/api/v1/brands/brand_demo/quick-start-session'],
    ['brand_profile', '/api/v1/brands/brand_demo/profile-library'],
    ['membership', '/api/v1/brands/brand_demo/members'],
    ['platform_config', '/api/v1/platforms'],
    ['monitoring', '/api/v1/brands/brand_demo/monitoring-runs'],
    ['content', '/api/v1/brands/brand_demo/content/generation/tasks'],
    ['publishing', '/api/v1/brands/brand_demo/publishing/records'],
    ['task', '/api/v1/brands/brand_demo/tasks'],
    ['retest', '/api/v1/brands/brand_demo/tasks/task_1/retest'],
    ['analysis', '/api/v1/brands/brand_demo/evaluations'],
    ['report', '/api/v1/brands/brand_demo/reports'],
    ['organization', '/api/v1/organizations/org_demo']
  ] as const;

  it('resolves read and write policies from request method and module path', () => {
    expect(resolveBrandAccessPolicy('GET', '/api/v1/content/assets')).toEqual({ resource: 'content', minimumRole: 'viewer' });
    expect(resolveBrandAccessPolicy('POST', '/api/v1/platforms')).toEqual({ resource: 'platform_config', minimumRole: 'admin' });
    expect(resolveBrandAccessPolicy('POST', '/api/v1/monitoring-runs')).toEqual({ resource: 'monitoring', minimumRole: 'operator' });
    expect(resolveBrandAccessPolicy('POST', '/api/v1/brands/brand_demo/content/generation/tasks')).toEqual({ resource: 'content', minimumRole: 'operator' });
    expect(resolveBrandAccessPolicy('POST', '/api/v1/brands/brand_demo/tasks/task_1/retest')).toEqual({ resource: 'retest', minimumRole: 'operator' });
    expect(resolveBrandAccessPolicy('POST', '/api/v1/brands/brand_demo/demand-snapshots')).toEqual({ resource: 'monitoring', minimumRole: 'operator' });
    expect(resolveBrandAccessPolicy('PATCH', '/api/v1/brands/brand_demo')).toEqual({ resource: 'brand', minimumRole: 'admin' });
    expect(resolveBrandAccessPolicy('PATCH', '/api/v1/brands/brand_demo/quick-start-session/steps/facts')).toEqual({ resource: 'quick_start', minimumRole: 'operator' });
  });

  it.each([
    ['viewer', false, false, false],
    ['analyst', false, false, false],
    ['operator', true, true, true],
    ['admin', true, true, true],
    ['owner', true, true, true]
  ] as const)('applies the operator write matrix for %s', (role, monitoring, content, publishing) => {
    expect(satisfiesRole(role, resolveBrandAccessPolicy('POST', '/api/v1/brands/brand_demo/monitoring-runs').minimumRole)).toBe(monitoring);
    expect(satisfiesRole(role, resolveBrandAccessPolicy('POST', '/api/v1/brands/brand_demo/content/generation/tasks').minimumRole)).toBe(content);
    expect(satisfiesRole(role, resolveBrandAccessPolicy('POST', '/api/v1/brands/brand_demo/publishing/records').minimumRole)).toBe(publishing);
  });

  it.each([
    ['viewer', false],
    ['analyst', false],
    ['operator', false],
    ['admin', true],
    ['owner', true]
  ] as const)('restricts brand and platform configuration writes for %s', (role, allowed) => {
    expect(satisfiesRole(role, resolveBrandAccessPolicy('PATCH', '/api/v1/brands/brand_demo').minimumRole)).toBe(allowed);
    expect(satisfiesRole(role, resolveBrandAccessPolicy('POST', '/api/v1/platforms').minimumRole)).toBe(allowed);
  });

  it('builds frontend capabilities from the same resource matrix', () => {
    const operator = buildBrandCapabilitySummary('operator');
    const admin = buildBrandCapabilitySummary('admin');

    expect(operator.resources.find((item) => item.resource === 'monitoring')).toMatchObject({ canWrite: true, minimumWriteRole: 'operator' });
    expect(operator.resources.find((item) => item.resource === 'quick_start')).toMatchObject({ canWrite: true, minimumWriteRole: 'operator' });
    expect(operator.resources.find((item) => item.resource === 'brand')).toMatchObject({ canWrite: false, minimumWriteRole: 'admin' });
    expect(admin.resources.find((item) => item.resource === 'platform_config')).toMatchObject({ canWrite: true, minimumWriteRole: 'admin' });
  });

  it('builds capabilities when the repository loads brands asynchronously', async () => {
    const service = new PermissionsService(createRepository('owner'));

    await expect(service.listAccessibleBrands('user_demo')).resolves.toEqual([
      expect.objectContaining({
        brandId: 'brand_demo',
        role: 'owner',
        capabilities: expect.objectContaining({ resources: expect.any(Array) })
      })
    ]);
  });

  it('Property P8 keeps every public capability consistent with route authorization', () => {
    const roles = ['viewer', 'analyst', 'operator', 'admin', 'owner'] as const;

    for (const role of roles) {
      const summary = buildBrandCapabilitySummary(role);
      for (const [resource, path] of routeMatrix) {
        const capability = summary.resources.find((item) => item.resource === resource);
        expect(capability, `${role} ${resource} capability`).toBeDefined();
        expect(capability?.canRead).toBe(satisfiesRole(role, resolveBrandAccessPolicy('GET', path).minimumRole));
        expect(capability?.canWrite).toBe(satisfiesRole(role, resolveBrandAccessPolicy('POST', path).minimumRole));
      }
    }
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

    const deniedRequest = middleware.use(createRequest('POST', '/api/v1/platforms'), {} as Response, vi.fn());
    await expect(deniedRequest).rejects.toMatchObject({
      response: {
        authorization: {
          resource: 'platform_config',
          currentRole: 'viewer',
          requiredRole: 'admin',
          applicationPath: '/brands?permissionRequest=platform_config'
        }
      }
    });
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

  it('continues when no brand context is required', async () => {
    const repository = createRepository('viewer');
    const middleware = new BrandAccessMiddleware(repository);
    const next = vi.fn();

    await middleware.use(createRequest('GET', '/api/v1/brands', ''), {} as Response, next);

    expect(next).toHaveBeenCalledTimes(1);
    expect(repository.listAccessibleBrands).not.toHaveBeenCalled();
  });
});
