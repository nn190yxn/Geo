import { Empty, Typography } from 'antd';
import { useId, type ReactNode } from 'react';
import { PageSkeleton, PartialDataNotice, RegionErrorState } from './PageState';
import {
  getWorkspaceStateVisibility,
  type WorkspaceStateSlots,
  type WorkspaceViewState
} from './WorkspaceState';

export type CreationWorkspaceProps = WorkspaceStateSlots & {
  configuration: ReactNode;
  result: ReactNode;
  configurationTitle: ReactNode;
  configurationDescription?: ReactNode;
  resultTitle: ReactNode;
  resultDescription?: ReactNode;
  expectation?: ReactNode;
  state?: WorkspaceViewState;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
  resultHeaderExtra?: ReactNode;
  mobileOrder?: 'configuration-first' | 'result-first';
  configurationAriaLabel?: string;
  resultAriaLabel?: string;
  className?: string;
};

export function CreationWorkspace({
  configuration,
  result,
  configurationTitle,
  configurationDescription,
  resultTitle,
  resultDescription,
  expectation,
  state = 'ready',
  primaryAction,
  secondaryActions,
  resultHeaderExtra,
  loadingState,
  emptyState,
  partialState,
  errorState,
  mobileOrder = 'configuration-first',
  configurationAriaLabel = '内容配置',
  resultAriaLabel = '生成结果',
  className
}: CreationWorkspaceProps) {
  const configurationTitleId = useId();
  const resultTitleId = useId();
  const visibility = getWorkspaceStateVisibility(state);
  const rootClassName = [
    'creation-workspace',
    `creation-workspace-${mobileOrder}`,
    className
  ].filter(Boolean).join(' ');

  return (
    <div className={rootClassName}>
      <section className="creation-workspace-panel creation-workspace-configuration" aria-labelledby={configurationTitleId} aria-label={configurationAriaLabel}>
        <WorkspacePanelHeader title={configurationTitle} titleId={configurationTitleId} description={configurationDescription} />
        <div className="creation-workspace-configuration-content">{configuration}</div>
        {primaryAction || secondaryActions ? (
          <div className="creation-workspace-actions">
            {secondaryActions ? <div className="creation-workspace-secondary-actions">{secondaryActions}</div> : null}
            {primaryAction ? <div className="creation-workspace-primary-action">{primaryAction}</div> : null}
          </div>
        ) : null}
      </section>

      <section
        className="creation-workspace-panel creation-workspace-result"
        aria-busy={state === 'loading'}
        aria-labelledby={resultTitleId}
        aria-label={resultAriaLabel}
      >
        <WorkspacePanelHeader title={resultTitle} titleId={resultTitleId} description={resultDescription} extra={resultHeaderExtra} />
        {expectation ? <div className="creation-workspace-expectation">{expectation}</div> : null}
        <div className="creation-workspace-result-content" aria-live="polite">
          {visibility.showLoading ? loadingState ?? <PageSkeleton rows={4} /> : null}
          {visibility.showEmpty ? emptyState ?? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="完成左侧配置后，这里会展示结果预览" /> : null}
          {visibility.showError ? errorState ?? <RegionErrorState description="结果加载失败，请保留当前配置并重新尝试。" /> : null}
          {visibility.showPartial ? partialState ?? <PartialDataNotice description="部分结果已经可用，其余内容仍在准备中。" /> : null}
          {visibility.showContent ? result : null}
        </div>
      </section>
    </div>
  );
}

type WorkspacePanelHeaderProps = {
  title: ReactNode;
  titleId: string;
  description?: ReactNode;
  extra?: ReactNode;
};

function WorkspacePanelHeader({ title, titleId, description, extra }: WorkspacePanelHeaderProps) {
  return (
    <div className="creation-workspace-panel-header">
      <div className="creation-workspace-panel-copy">
        <Typography.Title level={2} id={titleId}>{title}</Typography.Title>
        {description ? <Typography.Paragraph type="secondary">{description}</Typography.Paragraph> : null}
      </div>
      {extra ? <div className="creation-workspace-panel-extra">{extra}</div> : null}
    </div>
  );
}
