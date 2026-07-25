import type { UserBrandRole } from '@geo-platform/shared-types';

export type BrandAccessPolicy = {
  resource: string;
  minimumRole: UserBrandRole;
};

const roleWeight: Record<UserBrandRole, number> = {
  viewer: 1,
  analyst: 2,
  operator: 3,
  admin: 4,
  owner: 5
};

const modulePolicies: Array<{ pattern: RegExp; resource: string; writeRole: UserBrandRole }> = [
  { pattern: /^\/api\/v1\/brands\b/, resource: 'brand', writeRole: 'admin' },
  { pattern: /^\/api\/v1\/platforms\b/, resource: 'platform_config', writeRole: 'admin' },
  { pattern: /^\/api\/v1\/monitoring-runs\b/, resource: 'monitoring', writeRole: 'operator' },
  { pattern: /^\/api\/v1\/content\b/, resource: 'content', writeRole: 'operator' },
  { pattern: /^\/api\/v1\/publishing\b/, resource: 'publishing', writeRole: 'operator' },
  { pattern: /^\/api\/v1\/reports\b/, resource: 'report', writeRole: 'operator' }
];

export function resolveBrandAccessPolicy(method: string, path: string): BrandAccessPolicy {
  const matchedPolicy = modulePolicies.find((policy) => policy.pattern.test(path));
  const minimumRole = method.toUpperCase() === 'GET' ? 'viewer' : matchedPolicy?.writeRole ?? 'operator';

  return {
    resource: matchedPolicy?.resource ?? 'brand_workspace',
    minimumRole
  };
}

export function satisfiesRole(actualRole: UserBrandRole, minimumRole: UserBrandRole): boolean {
  return roleWeight[actualRole] >= roleWeight[minimumRole];
}
