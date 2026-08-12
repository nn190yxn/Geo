import { createContext, useContext, type ReactNode } from 'react';
import type { BrandAccessResource, BrandCapabilitySummary, UserBrandRole } from '@geo-platform/shared-types';

type BrandCapabilityContextValue = BrandCapabilitySummary | null | undefined;

const BrandCapabilityContext = createContext<BrandCapabilityContextValue>(undefined);

export type BrandWriteCapability = {
  canWrite: boolean;
  minimumRole?: UserBrandRole;
  reason?: string;
  applicationPath?: string;
};

export function BrandCapabilityProvider({ capabilities, children }: { capabilities: BrandCapabilitySummary | null; children: ReactNode }) {
  return <BrandCapabilityContext.Provider value={capabilities}>{children}</BrandCapabilityContext.Provider>;
}

export function getBrandWriteCapability(
  capabilities: BrandCapabilityContextValue,
  resource: BrandAccessResource
): BrandWriteCapability {
  // Standalone component tests and previews have no application-level provider.
  if (capabilities === undefined) return { canWrite: true };

  const resourceCapability = capabilities?.resources.find((item) => item.resource === resource);
  if (resourceCapability?.canWrite) {
    return {
      canWrite: true,
      minimumRole: resourceCapability.minimumWriteRole,
      applicationPath: capabilities?.applicationPath
    };
  }

  const minimumRole = resourceCapability?.minimumWriteRole;
  return {
    canWrite: false,
    minimumRole,
    reason: minimumRole ? `当前角色缺少操作权限，请申请 ${minimumRole} 角色。` : '品牌权限信息加载中。',
    applicationPath: capabilities?.applicationPath
  };
}

export function useBrandWriteCapability(resource: BrandAccessResource): BrandWriteCapability {
  return getBrandWriteCapability(useContext(BrandCapabilityContext), resource);
}
