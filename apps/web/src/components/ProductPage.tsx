import { Typography } from 'antd';
import type { ReactNode } from 'react';
import { getWorkspaceStateVisibility, type WorkspaceViewState } from './WorkspaceState';

export type ProductPageHeaderProps = {
  title: string;
  description: ReactNode;
  context?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
};

export type ProductPageStatusSlots = {
  loadingState?: ReactNode;
  emptyState?: ReactNode;
  partialState?: ReactNode;
  errorState?: ReactNode;
};

export type ProductPageProps = ProductPageHeaderProps & ProductPageStatusSlots & {
  children: ReactNode;
  className?: string;
  state?: WorkspaceViewState;
};

export type ProductPageSectionProps = {
  children: ReactNode;
  title?: string;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
};

export function ProductPageHeader({
  title,
  description,
  context,
  primaryAction,
  secondaryActions
}: ProductPageHeaderProps) {
  const hasActions = primaryAction || secondaryActions;

  return (
    <header className="product-page-header">
      {context ? <div className="product-page-context">{context}</div> : null}
      <div className="product-page-header-row">
        <div className="product-page-heading-copy">
          <Typography.Title level={1}>{title}</Typography.Title>
          <Typography.Paragraph type="secondary">{description}</Typography.Paragraph>
        </div>
        {hasActions ? (
          <div className="product-page-actions">
            {secondaryActions ? <div className="product-page-secondary-actions">{secondaryActions}</div> : null}
            {primaryAction ? <div className="product-page-primary-action">{primaryAction}</div> : null}
          </div>
        ) : null}
      </div>
    </header>
  );
}

export function ProductPage({
  title,
  description,
  context,
  primaryAction,
  secondaryActions,
  loadingState,
  emptyState,
  partialState,
  errorState,
  children,
  className,
  state
}: ProductPageProps) {
  const visibility = state ? getWorkspaceStateVisibility(state) : null;
  const visibleStatus = visibility
    ? visibility.showLoading ? loadingState
      : visibility.showEmpty ? emptyState
        : visibility.showPartial ? partialState
          : visibility.showError ? errorState
            : undefined
    : errorState ?? partialState ?? loadingState ?? emptyState;
  const showContent = visibility ? visibility.showContent : true;

  return (
    <div className={className ? `product-page ${className}` : 'product-page'}>
      <ProductPageHeader
        title={title}
        description={description}
        context={context}
        primaryAction={primaryAction}
        secondaryActions={secondaryActions}
      />
      {visibleStatus ? (
        <div className="product-page-status" aria-live="polite">
          {visibleStatus}
        </div>
      ) : null}
      {showContent ? <div className="product-page-content">{children}</div> : null}
    </div>
  );
}

export function ProductPageSection({
  children,
  title,
  description,
  actions,
  className
}: ProductPageSectionProps) {
  const hasHeading = title || description || actions;

  return (
    <section className={className ? `product-page-section ${className}` : 'product-page-section'}>
      {hasHeading ? (
        <div className="product-page-section-header">
          <div className="product-page-section-copy">
            {title ? <Typography.Title level={2}>{title}</Typography.Title> : null}
            {description ? <Typography.Paragraph type="secondary">{description}</Typography.Paragraph> : null}
          </div>
          {actions ? <div className="product-page-section-actions">{actions}</div> : null}
        </div>
      ) : null}
      <div className="product-page-section-content">{children}</div>
    </section>
  );
}
