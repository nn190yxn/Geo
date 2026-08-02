import { useEffect } from 'react';
import { Navigate, useLocation, useParams } from 'react-router';
import { useBrandContextStore } from '../stores/brandContextStore';
import { workspaceRouteAliases } from '../layouts/navigation';

export function WorkspaceRouteRedirect() {
  const { brandId, '*': workspacePath = 'dashboard' } = useParams();
  const location = useLocation();
  const setActiveBrandId = useBrandContextStore((state) => state.setActiveBrandId);
  const target = getWorkspaceRouteTarget(workspacePath, location.search, location.hash);

  useEffect(() => {
    if (brandId) {
      setActiveBrandId(brandId);
    }
  }, [brandId, setActiveBrandId]);

  return <Navigate to={target} replace />;
}

export function getWorkspaceRouteTarget(workspacePath: string, search = '', hash = '') {
  const pathname = workspaceRouteAliases[workspacePath] ?? '/brands';
  return `${pathname}${search}${hash}`;
}
