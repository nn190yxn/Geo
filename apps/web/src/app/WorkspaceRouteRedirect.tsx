import { useEffect } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { useBrandContextStore } from '../stores/brandContextStore';
import { workspaceRouteAliases } from '../layouts/navigation';

export function WorkspaceRouteRedirect() {
  const { brandId, '*': workspacePath = 'dashboard' } = useParams();
  const setActiveBrandId = useBrandContextStore((state) => state.setActiveBrandId);
  const target = workspaceRouteAliases[workspacePath] ?? '/brands';

  useEffect(() => {
    if (brandId) {
      setActiveBrandId(brandId);
    }
  }, [brandId, setActiveBrandId]);

  return <Navigate to={target} replace />;
}
