import { Alert, Button, Empty, Skeleton, Space, Typography } from 'antd';
import type { ReactNode } from 'react';
import type { ApiResponse } from '@geo-platform/shared-types';
import { getPublicApiErrorMessage } from '../api/http';

type PageErrorAlertProps = {
  response?: ApiResponse<unknown>;
  fallback?: string;
  action?: ReactNode;
};

type EmptyStateProps = {
  description: string;
  actionLabel?: string;
  onAction?: () => void;
  title?: string;
  reason?: string;
  nextStep?: string;
  benefit?: ReactNode;
  secondaryAction?: ReactNode;
};

type BusinessEmptyStateProps = {
  title: string;
  missing: string;
  reason: string;
  nextStep: string;
  benefit?: ReactNode;
  actionLabel?: string;
  onAction?: () => void;
  secondaryAction?: ReactNode;
};

export type GuidedEmptyStateProps = {
  title: string;
  reason: ReactNode;
  impact: ReactNode;
  benefit: ReactNode;
  actionLabel: string;
  onAction: () => void;
  supportingText?: ReactNode;
};

export type RegionErrorStateProps = {
  description: ReactNode;
  title?: string;
  retryLabel?: string;
  onRetry?: () => void;
};

export type PageSkeletonProps = {
  rows?: number;
  showTitle?: boolean;
};

export type PartialDataNoticeProps = {
  description: ReactNode;
  message?: string;
  action?: ReactNode;
};

export const pageStateActionMap = {
  retry: { label: '重新加载' },
  supplementBrandProfile: { label: '补充品牌资料', path: '/brand-profile' },
  startMonitoring: { label: '开始 AI 回复监测', path: '/monitoring' },
  createContent: { label: '创建内容草稿', path: '/content-generation' },
  recordPublishingResult: { label: '录入发布结果', path: '/publishing?tab=records' }
} as const;

export type PageStateActionKey = keyof typeof pageStateActionMap;

export function getApiErrorMessage(response?: ApiResponse<unknown>, fallback = '请求失败，请稍后重试。') {
  if (!response || response.success) return fallback;

  return getPublicApiErrorMessage(response.error.message, fallback);
}

export function PageErrorAlert({ response, fallback, action }: PageErrorAlertProps) {
  if (!response || response.success) {
    return null;
  }

  return <Alert type="error" message={getApiErrorMessage(response, fallback)} showIcon action={action} className="page-alert" />;
}

export function GuidedEmptyState({
  title,
  reason,
  impact,
  benefit,
  actionLabel,
  onAction,
  supportingText
}: GuidedEmptyStateProps) {
  return (
    <div className="guided-empty-state">
      <Space direction="vertical" size={8} className="page-stack">
        <Typography.Title level={4}>{title}</Typography.Title>
        <div className="guided-empty-state-details">
          <Typography.Text><strong>当前原因：</strong>{reason}</Typography.Text>
          <Typography.Text><strong>业务影响：</strong>{impact}</Typography.Text>
          <Typography.Text><strong>完成收益：</strong>{benefit}</Typography.Text>
        </div>
        <div className="guided-empty-state-action">
          <Button type="primary" onClick={onAction}>{actionLabel}</Button>
          {supportingText ? <Typography.Text type="secondary">{supportingText}</Typography.Text> : null}
        </div>
      </Space>
    </div>
  );
}

export function RegionErrorState({
  description,
  title = '当前区域加载失败',
  retryLabel = pageStateActionMap.retry.label,
  onRetry
}: RegionErrorStateProps) {
  return (
    <Alert
      className="region-error-state"
      type="error"
      showIcon
      message={title}
      description={description}
      action={onRetry ? <Button onClick={onRetry}>{retryLabel}</Button> : undefined}
    />
  );
}

export function PageSkeleton({ rows = 4, showTitle = true }: PageSkeletonProps) {
  return (
    <div className="page-skeleton-state" aria-label="页面内容加载中" aria-busy="true">
      <Skeleton active title={showTitle} paragraph={{ rows: Math.max(1, rows) }} />
    </div>
  );
}

export function PartialDataNotice({
  description,
  message = '部分数据暂未加载',
  action
}: PartialDataNoticeProps) {
  return (
    <Alert
      className="partial-data-notice"
      type="warning"
      showIcon
      message={message}
      description={description}
      action={action}
    />
  );
}

export function EmptyState({ description, actionLabel, onAction, title, reason, nextStep, benefit, secondaryAction }: EmptyStateProps) {
  if (title || reason || nextStep || secondaryAction) {
    return (
      <BusinessEmptyState
        title={title ?? description}
        missing={description}
        reason={reason ?? '补齐后可以继续推进当前业务流程。'}
        nextStep={nextStep ?? actionLabel ?? '继续补充必要信息'}
        benefit={benefit ?? '补齐后可继续推进当前业务流程。'}
        actionLabel={actionLabel}
        onAction={onAction}
        secondaryAction={secondaryAction}
      />
    );
  }

  return (
    <Empty description={description}>
      {actionLabel && onAction ? <Button type="primary" onClick={onAction}>{actionLabel}</Button> : null}
    </Empty>
  );
}

export function BusinessEmptyState({ title, missing, reason, nextStep, benefit, actionLabel, onAction, secondaryAction }: BusinessEmptyStateProps) {
  return (
    <div className="business-empty-state">
      <Space direction="vertical" size={8} className="page-stack">
        <Typography.Text strong>{title}</Typography.Text>
        <Typography.Text type="secondary">缺少内容：{missing}</Typography.Text>
        <Typography.Text type="secondary">影响范围：{reason}</Typography.Text>
        <Typography.Text>建议下一步：{nextStep}</Typography.Text>
        {benefit ? <Typography.Text>完成收益：{benefit}</Typography.Text> : null}
        {(actionLabel && onAction) || secondaryAction ? (
          <Space wrap>
            {actionLabel && onAction ? <Button type="primary" onClick={onAction}>{actionLabel}</Button> : null}
            {secondaryAction}
          </Space>
        ) : null}
      </Space>
    </div>
  );
}
