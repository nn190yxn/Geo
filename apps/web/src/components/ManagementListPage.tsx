import { Space, Table } from 'antd';
import type { ReactNode } from 'react';
import type { TableProps } from 'antd';
import { PartialDataNotice, RegionErrorState } from './PageState';
import { ProductPage, ProductPageSection } from './ProductPage';
import { getWorkspaceStateVisibility, type WorkspaceStateSlots, type WorkspaceViewState } from './WorkspaceState';

export type ManagementListPageProps<RecordType extends object> = WorkspaceStateSlots & {
  title: string;
  description: ReactNode;
  context?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  summary?: ReactNode;
  filters?: ReactNode;
  tableTitle?: string;
  tableDescription?: ReactNode;
  tableActions?: ReactNode;
  tableProps: TableProps<RecordType>;
  state?: WorkspaceViewState;
  tableAriaLabel?: string;
  className?: string;
  embedded?: boolean;
};

export type ManagementPrimaryActions =
  | readonly []
  | readonly [ReactNode]
  | readonly [ReactNode, ReactNode];

export type ManagementRowActionsProps = {
  primaryActions: ManagementPrimaryActions;
  moreAction?: ReactNode;
};

export function ManagementListPage<RecordType extends object>({
  title,
  description,
  context,
  primaryAction,
  secondaryActions,
  summary,
  filters,
  tableTitle = '数据列表',
  tableDescription,
  tableActions,
  tableProps,
  state = 'ready',
  tableAriaLabel = '管理列表',
  className,
  embedded = false,
  loadingState,
  emptyState,
  partialState,
  errorState
}: ManagementListPageProps<RecordType>) {
  const visibility = getWorkspaceStateVisibility(state);
  const tableScroll = { x: 'max-content' as const, ...tableProps.scroll };
  const resolvedPartialState = visibility.showPartial ? partialState ?? <PartialDataNotice description="部分列表数据已经可用，其余数据仍在加载或需要补充。" /> : undefined;
  const resolvedErrorState = visibility.showError ? errorState ?? <RegionErrorState description="当前列表暂时无法更新，请重新加载后继续管理。" /> : undefined;
  const pageContent = (
    <>
      {summary && visibility.showContent ? <div className="management-list-summary">{summary}</div> : null}
      {filters && !visibility.showLoading && !visibility.showError ? <div className="management-list-filters">{filters}</div> : null}
      {visibility.showContent || visibility.showEmpty || visibility.showLoading ? (
        <ProductPageSection title={tableTitle} description={tableDescription} actions={tableActions} className="management-list-table-section">
          <div className="management-list-table" role="region" aria-label={tableAriaLabel} tabIndex={0}>
            <Table<RecordType>
              {...tableProps}
              loading={visibility.showLoading ? tableProps.loading || true : tableProps.loading}
              locale={{ ...tableProps.locale, emptyText: emptyState ?? tableProps.locale?.emptyText }}
              scroll={tableScroll}
            />
          </div>
        </ProductPageSection>
      ) : null}
    </>
  );

  if (embedded) {
    return (
      <section className={className ? `management-list-page management-list-page-embedded ${className}` : 'management-list-page management-list-page-embedded'}>
        {primaryAction || secondaryActions ? <Space className="management-list-embedded-actions" wrap>{secondaryActions}{primaryAction}</Space> : null}
        {resolvedErrorState || resolvedPartialState ? <div className="product-page-status" aria-live="polite">{resolvedErrorState ?? resolvedPartialState}</div> : null}
        {pageContent}
      </section>
    );
  }

  return (
    <ProductPage
      className={className ? `management-list-page ${className}` : 'management-list-page'}
      title={title}
      description={description}
      context={context}
      primaryAction={primaryAction}
      secondaryActions={secondaryActions}
      loadingState={visibility.showLoading ? loadingState : undefined}
      partialState={resolvedPartialState}
      errorState={resolvedErrorState}
    >
      {pageContent}
    </ProductPage>
  );
}

export function ManagementRowActions({ primaryActions, moreAction }: ManagementRowActionsProps) {
  return (
    <Space className="management-row-actions" size={4} wrap>
      {primaryActions}
      {moreAction}
    </Space>
  );
}
