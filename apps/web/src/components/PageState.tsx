import { Alert, Button, Empty } from 'antd';
import type { ReactNode } from 'react';
import type { ApiResponse } from '@geo-platform/shared-types';

type PageErrorAlertProps = {
  response?: ApiResponse<unknown>;
  fallback?: string;
  action?: ReactNode;
};

type EmptyStateProps = {
  description: string;
  actionLabel?: string;
  onAction?: () => void;
};

export function getApiErrorMessage(response?: ApiResponse<unknown>, fallback = '请求失败，请稍后重试。') {
  return response && !response.success ? response.error.message : fallback;
}

export function PageErrorAlert({ response, fallback, action }: PageErrorAlertProps) {
  if (!response || response.success) {
    return null;
  }

  return <Alert type="error" message={getApiErrorMessage(response, fallback)} showIcon action={action} className="page-alert" />;
}

export function EmptyState({ description, actionLabel, onAction }: EmptyStateProps) {
  return (
    <Empty description={description}>
      {actionLabel && onAction ? <Button type="primary" onClick={onAction}>{actionLabel}</Button> : null}
    </Empty>
  );
}
