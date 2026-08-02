import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { ReportDashboard, ReportRecord } from '@geo-platform/shared-types';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getFilteredReports, getReportExportFilename, ReportCenterPage, ReportDetailArea } from './ReportCenterPage';

const brandId = 'brand_demo';

describe('ReportCenterPage', () => {
  it('renders the unified report list and independent detail reader', () => {
    const report = createReport();
    const queryClient = createClient({ brandId, reports: [report], latest: report });
    const markup = renderPage(<ReportCenterPage />, queryClient);
    const visibleText = getVisibleText(markup);

    for (const text of ['报告中心', '搜索报告名称或类型', '报告类型筛选', '报告列表', '单品牌周报', '当前品牌', '2026-07-01 至 2026-07-07', '已生成', '1 项缺口', '报告详情', '数据缺口（1）', '报告正文', '导出 Markdown']) {
      expect(markup).toContain(text);
    }
    expect(visibleText).not.toContain(brandId);
    expect(visibleText).not.toContain(report.id);
  });

  it('renders the actionable first-report empty state', () => {
    const markup = renderPage(<ReportCenterPage />, createClient({ brandId, reports: [] }));

    expect(markup).toContain('还没有品牌报告');
    expect(markup).toContain('生成首份品牌报告');
    expect(markup).toContain('生成后可集中阅读结论、确认数据缺口并导出 Markdown');
  });

  it('filters reports by search, type, status and creation date', () => {
    const weekly = createReport();
    const monthly = createReport({ id: 'report-2', title: '六月品牌月报', type: 'monthly', status: 'failed', createdAt: '2026-06-30T08:00:00.000Z' });

    expect(getFilteredReports([weekly, monthly], { search: '周报', type: 'weekly', status: 'generated', from: '2026-07-01', to: '2026-07-31' })).toEqual([weekly]);
    expect(getFilteredReports([weekly, monthly], { search: '品牌', type: 'all', status: 'all' })).toHaveLength(2);
  });

  it('shows complete data status and creates a safe markdown filename', () => {
    const report = createReport({ title: '客户/交付:报告', dataGaps: [] });
    const markup = renderToStaticMarkup(<ReportDetailArea report={report} onExport={() => undefined} />);

    expect(markup).toContain('当前报告暂无关键数据缺口');
    expect(markup).toContain('# 本周品牌表现');
    expect(getReportExportFilename(report)).toBe('客户-交付-报告-2026-07-01-2026-07-07.md');
  });

  it('renders loading, list failure and detail partial-failure states', () => {
    const loadingMarkup = renderPage(<ReportCenterPage />, createPendingClient());
    const errorMarkup = renderPage(<ReportCenterPage />, createResponseClient(['report-dashboard', brandId], failure('报告服务暂时不可用')));
    const report = createReport();
    const partialMarkup = renderToStaticMarkup(<ReportDetailArea report={report} onExport={() => undefined} detailResponse={failure('报告详情刷新失败')} />);

    expect(loadingMarkup).toContain('页面内容加载中');
    expect(errorMarkup).toContain('报告列表加载失败');
    expect(errorMarkup).toContain('重新加载');
    expect(partialMarkup).toContain('报告详情刷新失败');
    expect(partialMarkup).toContain('# 本周品牌表现');
  });
});

function createClient(dashboard: ReportDashboard) {
  useBrandContextStore.setState({ activeBrandId: brandId });
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
  queryClient.setQueryData(['report-dashboard', brandId], success(dashboard));
  if (dashboard.latest) {
    queryClient.setQueryData(['report-detail', brandId, dashboard.latest.id], success(dashboard.latest));
  }
  return queryClient;
}

function createPendingClient() {
  useBrandContextStore.setState({ activeBrandId: brandId });
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

function createResponseClient(queryKey: readonly unknown[], response: ReturnType<typeof failure>) {
  const queryClient = createPendingClient();
  queryClient.setQueryData(queryKey, response);
  return queryClient;
}

function renderPage(element: ReactElement, queryClient: QueryClient) {
  return renderToStaticMarkup(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

function getVisibleText(markup: string) {
  return markup.replace(/<[^>]+>/g, ' ');
}

function success<T>(data: T) {
  return { success: true as const, data };
}

function failure(message: string) {
  return { success: false as const, data: null, error: { code: 'test_error', message } };
}

function createReport(overrides: Partial<ReportRecord> = {}): ReportRecord {
  return {
    id: 'report-1',
    brandId,
    type: 'weekly',
    title: '品牌周报',
    periodStart: '2026-07-01',
    periodEnd: '2026-07-07',
    status: 'generated',
    content: '# 本周品牌表现\n\n推荐率持续提升。',
    dataGaps: [{ section: '引用来源', reason: '部分平台尚未返回引用链接' }],
    createdBy: 'user-1',
    createdAt: '2026-07-16T08:00:00.000Z',
    snapshot: { ranking: [], strongestPlatforms: [], weakScenarios: [], highPriorityIssues: [] },
    ...overrides
  };
}
