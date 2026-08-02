import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { AdvisorDashboard, AdvisorRecord } from '@geo-platform/shared-types';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { AdvisorServiceDetail, AdvisorWorkspacePage, buildAdvisorServiceRows, getFilteredAdvisorServiceRows } from './AdvisorWorkspacePage';

const brandId = 'brand_demo';

describe('AdvisorWorkspacePage view', () => {
  it('renders the unified service task list and selected detail', () => {
    const record = createRecord();
    const markup = renderPage(<AdvisorWorkspacePage />, createClient(createDashboard([record])));

    for (const text of ['顾问服务', '新增服务记录', '服务任务与记录', '服务类型筛选', '月度服务计划', '补齐官网 FAQ', '进行中', '顾问 A', '完成并记录处理结果', '客户交付周报', '服务详情', '服务目标：提升核心场景推荐排序']) {
      expect(markup).toContain(text);
    }
  });

  it('renders the single actionable empty state', () => {
    const markup = renderPage(<AdvisorWorkspacePage />, createClient(createDashboard([])));

    expect(markup).toContain('还没有顾问服务记录');
    expect(markup).toContain('新增首条服务记录');
    expect(markup).toContain('创建后可统一管理服务任务、关联报告和下一步行动');
  });

  it('maps records and follow-ups to filterable service rows', () => {
    const rows = buildAdvisorServiceRows([createRecord()]);

    expect(rows).toHaveLength(2);
    expect(rows[0]).toMatchObject({ kind: 'record', status: 'doing', owner: '顾问 A', nextStep: '安排官网 FAQ 发布' });
    expect(rows[1]).toMatchObject({ kind: 'follow_up', status: 'doing', owner: '顾问 A', serviceTime: '2026-07-20', nextStep: '完成并记录处理结果' });
    expect(getFilteredAdvisorServiceRows(rows, { search: 'FAQ', type: 'follow_up', status: 'doing', from: '2026-07-20', to: '2026-07-20' })).toEqual([rows[1]]);
  });

  it('shows missing report and completed follow-up states in detail', () => {
    const record = createRecord({ relatedReport: undefined, relatedReportId: undefined, followUpItems: [{ id: 'follow-1', title: '确认客户反馈', status: 'done' }] });
    const row = buildAdvisorServiceRows([record])[1]!;
    const markup = renderToStaticMarkup(<AdvisorServiceDetail row={row} />);

    expect(markup).toContain('已完成');
    expect(markup).toContain('查看关联服务记录');
    expect(markup).toContain('当前服务记录尚未关联报告');
  });

  it('renders loading and request-failure recovery states', () => {
    const loadingMarkup = renderPage(<AdvisorWorkspacePage />, createPendingClient());
    const errorClient = createPendingClient();
    errorClient.setQueryData(['advisor-dashboard', brandId], { success: false as const, data: null, error: { code: 'test_error', message: '顾问服务暂时不可用' } });
    const errorMarkup = renderPage(<AdvisorWorkspacePage />, errorClient);

    expect(loadingMarkup).toContain('页面内容加载中');
    expect(errorMarkup).toContain('顾问服务记录加载失败');
    expect(errorMarkup).toContain('重新加载');
  });
});

function createClient(dashboard: AdvisorDashboard) {
  const queryClient = createPendingClient();
  queryClient.setQueryData(['advisor-dashboard', brandId], { success: true as const, data: dashboard });
  return queryClient;
}

function createPendingClient() {
  useBrandContextStore.setState({ activeBrandId: brandId });
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

function renderPage(element: ReactElement, queryClient: QueryClient) {
  return renderToStaticMarkup(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

function createDashboard(records: AdvisorRecord[]): AdvisorDashboard {
  return {
    brandId,
    records,
    latestDiagnosis: records.find((record) => record.type === 'diagnosis'),
    pendingFollowUps: records.flatMap((record) => record.followUpItems).filter((item) => item.status !== 'done'),
    relatedReports: records.flatMap((record) => record.relatedReport ? [record.relatedReport] : [])
  };
}

function createRecord(overrides: Partial<AdvisorRecord> = {}): AdvisorRecord {
  return {
    id: 'advisor-1',
    brandId,
    type: 'service_plan',
    title: '月度服务计划',
    content: '## 服务计划\n- 服务目标：提升核心场景推荐排序\n- 负责人：顾问 A\n- 下一步：安排官网 FAQ 发布',
    relatedReportId: 'report-1',
    relatedReport: { id: 'report-1', title: '客户交付周报', type: 'customer_delivery', periodStart: '2026-07-01', periodEnd: '2026-07-07' },
    followUpItems: [{ id: 'follow-1', title: '补齐官网 FAQ', owner: '顾问 A', dueDate: '2026-07-20', status: 'doing' }],
    createdBy: '顾问 A',
    createdAt: '2026-07-16T08:00:00.000Z',
    ...overrides
  };
}
