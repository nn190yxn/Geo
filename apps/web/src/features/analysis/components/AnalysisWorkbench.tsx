import type { ReactNode } from 'react';
import { Tag, Typography } from 'antd';
import { InsightDetailSection, InsightOverview, type InsightTone } from '../../../components/InsightOverview';
import { PageSkeleton, PartialDataNotice, RegionErrorState } from '../../../components/PageState';
import { ProductPage, ProductPageSection } from '../../../components/ProductPage';
import type { WorkspaceViewState } from '../../../components/WorkspaceState';

export type AnalysisWorkbenchProps = {
  title: string;
  description: string;
  findings: string[];
  actions: string[];
  filters?: ReactNode;
  scopeDescription?: ReactNode;
  trend?: ReactNode;
  distribution?: ReactNode;
  details?: ReactNode;
  tasks?: ReactNode;
  extra?: ReactNode;
  notice?: ReactNode;
  contentState?: ReactNode;
  loading?: boolean;
  state?: WorkspaceViewState;
  onRetry?: () => void;
  loadingState?: ReactNode;
  partialState?: ReactNode;
  errorState?: ReactNode;
  children: ReactNode;
};

export function AnalysisWorkbench({ title, description, findings, actions, filters, scopeDescription, trend, distribution, details, tasks, extra, notice, contentState, loading = false, state = 'ready', onRetry, loadingState, partialState, errorState, children }: AnalysisWorkbenchProps) {
  const risk = getAnalysisRiskLevel(findings);

  return (
    <ProductPage
      title={title}
      description={description}
      secondaryActions={extra}
      className="analysis-workbench"
      state={state}
      loadingState={loadingState ?? <PageSkeleton rows={8} />}
      partialState={partialState ?? <PartialDataNotice description="部分分析数据暂时无法更新，当前页面继续展示已成功加载的结论和证据。" />}
      errorState={errorState ?? <RegionErrorState description="分析数据暂时无法加载，请重新加载后继续查看。" onRetry={onRetry} />}
    >
      <ProductPageSection title="分析范围" description={scopeDescription ?? '当前结论、趋势和证据使用同一组筛选范围。'} className="analysis-scope-section">
        {filters ?? <Typography.Text type="secondary">当前展示全部平台与全部真实回复样本。</Typography.Text>}
      </ProductPageSection>

      {notice}
      {contentState ?? (
        <>
      <InsightOverview
        title={findings[0] ?? '当前没有需要立即处理的分析结论'}
        description={findings.length > 0 ? '优先处理下列发现，再通过趋势和证据明细确认影响范围。' : '保持监测节奏，等待新的真实回复样本进入分析。'}
        findings={findings.slice(1)}
        tone={getInsightTone(risk)}
        toneLabel={risk.label}
      >
        <div className="analysis-metric-summary" aria-busy={loading}>{children}</div>
      </InsightOverview>

      {trend || distribution ? (
        <InsightDetailSection title="趋势与分布" description="查看指标随时间变化及当前样本构成。">
          <div className="analysis-trend-distribution-grid">
            {trend}
            {distribution}
          </div>
        </InsightDetailSection>
      ) : null}

      {details ? (
        <InsightDetailSection title="证据明细" description="查看形成当前结论的真实回复、问题和来源记录。">
          {details}
        </InsightDetailSection>
      ) : null}

      <InsightDetailSection title="建议动作" description="从高优先级分析发现继续创建内容、资料或再次监测任务。">
        <div className="geo-publish-checklist">
          {(tasks ? [tasks] : actions).map((action) => typeof action === 'string'
            ? <div className="geo-next-action" key={action}><Typography.Text>{action}</Typography.Text><Tag color="blue">建议动作</Tag></div>
            : action)}
        </div>
      </InsightDetailSection>
        </>
      )}
    </ProductPage>
  );
}

export function getAnalysisRiskLevel(findings: string[]): { label: string; color: string; alertType: 'info' | 'warning' | 'error' } {
  const text = findings.join(' ');
  if (/高风险|失败|异常|压制|负向|错误|缺口/.test(text)) return { label: '需要处理', color: 'orange', alertType: 'warning' };
  if (findings.length === 0) return { label: '持续观察', color: 'blue', alertType: 'info' };
  return { label: '可执行', color: 'green', alertType: 'info' };
}

function getInsightTone(risk: ReturnType<typeof getAnalysisRiskLevel>): InsightTone {
  if (risk.alertType === 'error') return 'danger';
  if (risk.alertType === 'warning') return 'warning';
  return risk.label === '可执行' ? 'success' : 'neutral';
}
