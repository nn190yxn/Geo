import { Empty, Progress, Tag, Typography } from 'antd';
import { useId, useState, type ReactNode } from 'react';
import { PageSkeleton, PartialDataNotice, RegionErrorState } from './PageState';
import {
  getWorkspaceStateVisibility,
  normalizeCompleteness,
  type WorkspaceStateSlots,
  type WorkspaceViewState
} from './WorkspaceState';

export type AssetLibraryCategoryStatus = 'complete' | 'partial' | 'empty' | 'error';

export type AssetLibraryCategory<Key extends string = string> = {
  key: Key;
  label: ReactNode;
  description?: ReactNode;
  count?: number;
  completeness?: number;
  status?: AssetLibraryCategoryStatus;
  disabled?: boolean;
};

export type AssetLibraryProps<Key extends string = string> = WorkspaceStateSlots & {
  categories: readonly AssetLibraryCategory<Key>[];
  activeCategory: Key;
  onCategoryChange: (key: Key) => void;
  editor: ReactNode;
  state?: WorkspaceViewState;
  title?: ReactNode;
  description?: ReactNode;
  completeness?: number;
  completenessLabel?: ReactNode;
  completenessDetails?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  navigationFooter?: ReactNode;
  editorHeaderExtra?: ReactNode;
  navigationAriaLabel?: string;
  editorAriaLabel?: string;
  mobileOrder?: 'navigation-first' | 'editor-first';
  className?: string;
};

const categoryStatusLabels: Record<AssetLibraryCategoryStatus, { label: string; color?: string }> = {
  complete: { label: '完整', color: 'green' },
  partial: { label: '待补充', color: 'orange' },
  empty: { label: '暂无资料' },
  error: { label: '需要处理', color: 'red' }
};

export function AssetLibrary<Key extends string = string>({
  categories,
  activeCategory,
  onCategoryChange,
  editor,
  state = 'ready',
  title = '资料资产库',
  description,
  completeness,
  completenessLabel = '资料完整度',
  completenessDetails,
  primaryAction,
  secondaryActions,
  navigationFooter,
  editorHeaderExtra,
  navigationAriaLabel = '资料分类',
  editorAriaLabel = '资料编辑区',
  mobileOrder = 'navigation-first',
  className,
  loadingState,
  emptyState,
  partialState,
  errorState
}: AssetLibraryProps<Key>) {
  const editorTitleId = useId();
  const mobileNavigationId = useId();
  const [mobileNavigationOpen, setMobileNavigationOpen] = useState(false);
  const visibility = getWorkspaceStateVisibility(state);
  const normalizedCompleteness = normalizeCompleteness(completeness);
  const activeItem = categories.find((category) => category.key === activeCategory);
  const rootClassName = [
    'asset-library',
    `asset-library-${mobileOrder}`,
    className
  ].filter(Boolean).join(' ');
  const handleCategoryChange = (key: Key) => {
    onCategoryChange(key);
    setMobileNavigationOpen(false);
  };

  return (
    <section className={rootClassName}>
      <div className="asset-library-header">
        <div className="asset-library-heading-copy">
          <Typography.Title level={2}>{title}</Typography.Title>
          {description ? <Typography.Paragraph type="secondary">{description}</Typography.Paragraph> : null}
        </div>
        {primaryAction || secondaryActions ? (
          <div className="asset-library-actions">
            {secondaryActions ? <div className="asset-library-secondary-actions">{secondaryActions}</div> : null}
            {primaryAction ? <div className="asset-library-primary-action">{primaryAction}</div> : null}
          </div>
        ) : null}
      </div>

      <div className="asset-library-grid">
        <nav className="asset-library-navigation" aria-label={navigationAriaLabel}>
          {normalizedCompleteness !== undefined ? (
            <div className="asset-library-completeness">
              <div className="asset-library-completeness-heading">
                <Typography.Text strong>{completenessLabel}</Typography.Text>
                <Typography.Text>{normalizedCompleteness}%</Typography.Text>
              </div>
              <Progress percent={normalizedCompleteness} showInfo={false} size="small" />
              {completenessDetails ? <Typography.Text type="secondary">{completenessDetails}</Typography.Text> : null}
            </div>
          ) : null}
          <button
            type="button"
            className="asset-library-mobile-trigger"
            aria-expanded={mobileNavigationOpen}
            aria-controls={mobileNavigationId}
            onClick={() => setMobileNavigationOpen((open) => !open)}
          >
            <span><Typography.Text type="secondary">当前分类</Typography.Text><Typography.Text strong>{activeItem?.label ?? '选择资料分类'}</Typography.Text></span>
            <span aria-hidden="true">{mobileNavigationOpen ? '收起' : '展开'}</span>
          </button>
          <div id={mobileNavigationId} className={mobileNavigationOpen ? 'asset-library-mobile-panel asset-library-mobile-panel-open' : 'asset-library-mobile-panel'}>
            <div className="asset-library-category-list">
              {categories.map((category) => <AssetLibraryCategoryButton category={category} active={category.key === activeCategory} onSelect={handleCategoryChange} key={category.key} />)}
            </div>
            {navigationFooter ? <div className="asset-library-navigation-footer">{navigationFooter}</div> : null}
          </div>
        </nav>

        <section className="asset-library-editor" aria-busy={state === 'loading'} aria-labelledby={editorTitleId} aria-label={editorAriaLabel}>
          <div className="asset-library-editor-header">
            <div className="asset-library-editor-copy">
              <Typography.Title level={3} id={editorTitleId}>{activeItem?.label ?? '资料内容'}</Typography.Title>
              {activeItem?.description ? <Typography.Paragraph type="secondary">{activeItem.description}</Typography.Paragraph> : null}
            </div>
            {editorHeaderExtra ? <div className="asset-library-editor-extra">{editorHeaderExtra}</div> : null}
          </div>
          <div className="asset-library-editor-content" aria-live="polite">
            {visibility.showLoading ? loadingState ?? <PageSkeleton rows={4} /> : null}
            {visibility.showEmpty ? emptyState ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前分类还没有资料" /> : null}
            {visibility.showError ? errorState ?? <RegionErrorState description="当前分类加载失败，请稍后重新尝试。" /> : null}
            {visibility.showPartial ? partialState ?? <PartialDataNotice description="当前分类有部分资料可用，缺失内容仍可继续补充。" /> : null}
            {visibility.showContent ? editor : null}
          </div>
        </section>
      </div>
    </section>
  );
}

type AssetLibraryCategoryButtonProps<Key extends string> = {
  category: AssetLibraryCategory<Key>;
  active: boolean;
  onSelect: (key: Key) => void;
};

function AssetLibraryCategoryButton<Key extends string>({ category, active, onSelect }: AssetLibraryCategoryButtonProps<Key>) {
  const status = category.status ? categoryStatusLabels[category.status] : undefined;
  const completeness = normalizeCompleteness(category.completeness);

  return (
    <button
      aria-current={active ? 'page' : undefined}
      className={active ? 'asset-library-category asset-library-category-active' : 'asset-library-category'}
      disabled={category.disabled}
      onClick={() => onSelect(category.key)}
      type="button"
    >
      <span className="asset-library-category-copy">
        <Typography.Text strong>{category.label}</Typography.Text>
        {category.description ? <Typography.Text type="secondary">{category.description}</Typography.Text> : null}
      </span>
      <span className="asset-library-category-meta">
        {category.count !== undefined ? <Typography.Text type="secondary">{category.count} 项</Typography.Text> : null}
        {completeness !== undefined ? <Typography.Text type="secondary">{completeness}%</Typography.Text> : null}
        {status ? <Tag color={status.color}>{status.label}</Tag> : null}
      </span>
    </button>
  );
}
