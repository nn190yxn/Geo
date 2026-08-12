import type {
  BrandAccessResource,
  BrandCapabilitySummary,
  BrandResourceCapability,
  UserBrandRole
} from '@geo-platform/shared-types';

export type BrandAccessPolicy = {
  resource: BrandAccessResource;
  minimumRole: UserBrandRole;
};

const roleWeight: Record<UserBrandRole, number> = {
  viewer: 1,
  analyst: 2,
  operator: 3,
  admin: 4,
  owner: 5
};

type ResourcePolicy = {
  resource: BrandAccessResource;
  readRole: UserBrandRole;
  writeRole: UserBrandRole;
};

type RoutePolicy = ResourcePolicy & { pattern: RegExp };

const resourcePolicies: Record<BrandAccessResource, ResourcePolicy> = {
  brand_workspace: { resource: 'brand_workspace', readRole: 'viewer', writeRole: 'operator' },
  quick_start: { resource: 'quick_start', readRole: 'viewer', writeRole: 'operator' },
  brand: { resource: 'brand', readRole: 'viewer', writeRole: 'admin' },
  brand_profile: { resource: 'brand_profile', readRole: 'viewer', writeRole: 'admin' },
  membership: { resource: 'membership', readRole: 'admin', writeRole: 'admin' },
  platform_config: { resource: 'platform_config', readRole: 'viewer', writeRole: 'admin' },
  monitoring: { resource: 'monitoring', readRole: 'viewer', writeRole: 'operator' },
  content: { resource: 'content', readRole: 'viewer', writeRole: 'operator' },
  publishing: { resource: 'publishing', readRole: 'viewer', writeRole: 'operator' },
  task: { resource: 'task', readRole: 'viewer', writeRole: 'operator' },
  retest: { resource: 'retest', readRole: 'viewer', writeRole: 'operator' },
  analysis: { resource: 'analysis', readRole: 'analyst', writeRole: 'analyst' },
  report: { resource: 'report', readRole: 'analyst', writeRole: 'operator' },
  organization: { resource: 'organization', readRole: 'admin', writeRole: 'owner' }
};

// Specific nested resources must precede the brand subject fallback.
const routePolicies: RoutePolicy[] = [
  { pattern: /^\/api\/v1\/brands\/[^/]+\/quick-start-session(?:\/|$)/, ...resourcePolicies.quick_start },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/site-audit\/technical-assets(?:\/|$)/, ...resourcePolicies.content },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/site-audit\/checks\/[^/]+\/recheck(?:\/|$)/, ...resourcePolicies.retest },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/site-audit(?:\/|$)/, ...resourcePolicies.monitoring },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/tasks\/[^/]+\/retest(?:\/|$)/, ...resourcePolicies.retest },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/(?:monitoring-runs|test-plans|test-plan-templates|test-themes|test-question-candidates|demand-snapshots|user-intents|optimization-units|prompts|growth-optimization|sprints|automation|llm)(?:\/|$)/, ...resourcePolicies.monitoring },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/(?:content|content-assets)(?:\/|$)/, ...resourcePolicies.content },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/(?:publishing|owned-media|media-platform-rules)(?:\/|$)/, ...resourcePolicies.publishing },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/tasks(?:\/|$)/, ...resourcePolicies.task },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/reports(?:\/|$)/, ...resourcePolicies.report },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/(?:analysis-diagnosis|competitors|citations|evaluations)(?:\/|$)/, ...resourcePolicies.analysis },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/(?:profile-library|profile|knowledge|knowledge-sources|media-assets|imports)(?:\/|$)/, ...resourcePolicies.brand_profile },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/(?:members|permissions)(?:\/|$)/, ...resourcePolicies.membership },
  { pattern: /^\/api\/v1\/brands\/[^/]+\/(?:dashboards|workspace)(?:\/|$)/, ...resourcePolicies.brand_workspace },
  { pattern: /^\/api\/v1\/brands\/[^/]+(?:\/|$)/, ...resourcePolicies.brand },
  { pattern: /^\/api\/v1\/platforms(?:\/|$)/, ...resourcePolicies.platform_config },
  { pattern: /^\/api\/v1\/monitoring-runs(?:\/|$)/, ...resourcePolicies.monitoring },
  { pattern: /^\/api\/v1\/content(?:\/|$)/, ...resourcePolicies.content },
  { pattern: /^\/api\/v1\/publishing(?:\/|$)/, ...resourcePolicies.publishing },
  { pattern: /^\/api\/v1\/tasks(?:\/|$)/, ...resourcePolicies.task },
  { pattern: /^\/api\/v1\/reports(?:\/|$)/, ...resourcePolicies.report },
  { pattern: /^\/api\/v1\/organizations(?:\/|$)/, ...resourcePolicies.organization },
  { pattern: /^\/api\/v1\/brands(?:\/|$)/, ...resourcePolicies.brand }
];

export function resolveBrandAccessPolicy(method: string, path: string): BrandAccessPolicy {
  const normalizedMethod = method.trim().toUpperCase();
  const normalizedPath = path.split('?')[0].replace(/\/+$/, '') || '/';
  const matchedPolicy = routePolicies.find((policy) => policy.pattern.test(normalizedPath));
  const policy = matchedPolicy ?? resourcePolicies.brand_workspace;
  const isRead = normalizedMethod === 'GET' || normalizedMethod === 'HEAD' || normalizedMethod === 'OPTIONS';

  return {
    resource: policy.resource,
    minimumRole: isRead ? policy.readRole : policy.writeRole
  };
}

export function satisfiesRole(actualRole: UserBrandRole, minimumRole: UserBrandRole): boolean {
  return roleWeight[actualRole] >= roleWeight[minimumRole];
}

export function buildBrandCapabilitySummary(role: UserBrandRole): BrandCapabilitySummary {
  const resources = Object.values(resourcePolicies).map<BrandResourceCapability>((policy) => ({
    resource: policy.resource,
    canRead: satisfiesRole(role, policy.readRole),
    canWrite: satisfiesRole(role, policy.writeRole),
    minimumReadRole: policy.readRole,
    minimumWriteRole: policy.writeRole
  }));

  return {
    role,
    applicationPath: '/brands?permissionRequest=1',
    resources
  };
}
