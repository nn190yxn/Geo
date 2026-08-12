import { ForbiddenException, Inject, Injectable, NestMiddleware } from '@nestjs/common';
import type { NextFunction, Request, Response } from 'express';
import { resolveBrandAccessPolicy, satisfiesRole } from '../access-control/brand-access.policy';
import { PERMISSIONS_REPOSITORY, type PermissionsRepositoryPort } from '../../modules/permissions/permissions.repository.port';

@Injectable()
export class BrandAccessMiddleware implements NestMiddleware {
  constructor(@Inject(PERMISSIONS_REPOSITORY) private readonly permissionsRepository: PermissionsRepositoryPort) {}

  async use(req: Request, _res: Response, next: NextFunction) {
    const brandId = req.context.brandId;

    if (!brandId) {
      next();
      return;
    }

    const policy = resolveBrandAccessPolicy(req.method, req.path);
    const accessibleBrands = await this.permissionsRepository.listAccessibleBrands(req.context.userId);
    const accessibleBrand = accessibleBrands.find((brand) => brand.brandId === brandId);

    if (accessibleBrand && satisfiesRole(accessibleBrand.role, policy.minimumRole)) {
      next();
      return;
    }

    this.permissionsRepository.recordDeniedAccess({
      userId: req.context.userId,
      brandId,
      reason: accessibleBrand ? `ROLE_${policy.minimumRole.toUpperCase()}_REQUIRED` : 'USER_BRAND_PERMISSION_MISSING',
      requestedAt: new Date().toISOString()
    });

    await this.permissionsRepository.createAuditLog(req.context.userId, {
      brandId,
      actorUserId: req.context.userId,
      action: 'brand_access.check',
      resourceType: policy.resource,
      resourceId: brandId,
      result: 'denied',
      errorCode: accessibleBrand ? 'role_insufficient' : 'brand_permission_missing',
      metadata: { requiredRole: policy.minimumRole, actualRole: accessibleBrand?.role ?? null, path: req.path }
    });

    throw new ForbiddenException({
      code: 'BRAND_RESOURCE_FORBIDDEN',
      message: accessibleBrand
        ? `当前角色缺少${policy.resource}操作权限，请申请${policy.minimumRole}角色。`
        : '当前用户无权访问该品牌工作区',
      authorization: {
        resource: policy.resource,
        currentRole: accessibleBrand?.role ?? null,
        requiredRole: policy.minimumRole,
        applicationPath: `/brands?permissionRequest=${policy.resource}`
      }
    });
  }
}
