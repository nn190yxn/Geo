import type { ReactNode } from 'react';
import type { ApiResponse } from '@geo-platform/shared-types';

export type WorkspaceViewState = 'ready' | 'loading' | 'empty' | 'partial' | 'error';

export type WorkspaceStateSlots = {
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  partialState?: ReactNode;
  errorState?: ReactNode;
};

export type WorkspaceStateVisibility = {
  showContent: boolean;
  showLoading: boolean;
  showEmpty: boolean;
  showPartial: boolean;
  showError: boolean;
};

export type QueryWorkspaceResource = {
  isLoading: boolean;
  response?: ApiResponse<unknown>;
};

export function getWorkspaceStateVisibility(state: WorkspaceViewState): WorkspaceStateVisibility {
  return {
    showContent: state === 'ready' || state === 'partial',
    showLoading: state === 'loading',
    showEmpty: state === 'empty',
    showPartial: state === 'partial',
    showError: state === 'error'
  };
}

export function normalizeCompleteness(value?: number): number | undefined {
  if (value === undefined || !Number.isFinite(value)) return undefined;
  return Math.min(100, Math.max(0, Math.round(value)));
}

export function getQueryGroupWorkspaceState(resources: readonly QueryWorkspaceResource[], hasContent: boolean): WorkspaceViewState {
  const successfulCount = resources.filter((resource) => resource.response?.success).length;
  const failedCount = resources.filter((resource) => resource.response && !resource.response.success).length;
  const loadingCount = resources.filter((resource) => resource.isLoading && !resource.response).length;

  if (successfulCount === 0 && loadingCount > 0) return 'loading';
  if (successfulCount === 0 && failedCount > 0) return 'error';
  if (successfulCount > 0 && (failedCount > 0 || loadingCount > 0)) return 'partial';
  return hasContent ? 'ready' : 'empty';
}
