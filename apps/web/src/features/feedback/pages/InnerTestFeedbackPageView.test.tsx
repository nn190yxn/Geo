import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { InnerTestFeedback, InnerTestFeedbackDashboard } from '@geo-platform/shared-types';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getFilteredFeedbackRecords, InnerTestFeedbackPage } from './InnerTestFeedbackPage';

const brandId = 'brand_demo';

describe('InnerTestFeedbackPage view', () => {
  it('renders unified filters and feedback handling records', () => {
    const markup = renderPage(<InnerTestFeedbackPage />, createClient([createFeedback()]));

    for (const text of ['内测反馈', '记录反馈', '反馈处理记录', '反馈类型筛选', '严重程度筛选', '页面筛选', '功能异常', '严重', '处理中', '已定位列表状态同步问题', '更新处理记录']) {
      expect(markup).toContain(text);
    }
  });

  it('renders the actionable first-feedback empty state', () => {
    const markup = renderPage(<InnerTestFeedbackPage />, createClient([]));

    expect(markup).toContain('还没有内测反馈');
    expect(markup).toContain('记录第一条反馈');
    expect(markup).toContain('记录后可按严重程度分级并持续跟进解决状态');
  });

  it('filters by search, page, type, severity, status and date', () => {
    const high = createFeedback();
    const low = createFeedback({ id: 'feedback-2', page: '写内容', type: 'copy', severity: 'low', status: 'resolved', createdAt: '2026-06-30T08:00:00.000Z' });

    expect(getFilteredFeedbackRecords([high, low], { search: '状态同步', page: 'AI 回复监测', type: 'bug', severity: 'high', status: 'in_progress', from: '2026-07-01', to: '2026-07-31' })).toEqual([high]);
  });

  it('renders loading and request-failure recovery states', () => {
    const loadingMarkup = renderPage(<InnerTestFeedbackPage />, createPendingClient());
    const errorClient = createPendingClient();
    errorClient.setQueryData(['inner-test-feedback', brandId], { success: false as const, data: null, error: { code: 'test_error', message: '反馈服务暂时不可用' } });
    const errorMarkup = renderPage(<InnerTestFeedbackPage />, errorClient);

    expect(loadingMarkup).toContain('页面内容加载中');
    expect(errorMarkup).toContain('内测反馈加载失败');
    expect(errorMarkup).toContain('重新加载');
  });
});

function createClient(records: InnerTestFeedback[]) {
  useBrandContextStore.setState({ activeBrandId: brandId });
  const dashboard: InnerTestFeedbackDashboard = {
    brandId,
    records,
    statusCounts: {
      open: records.filter((record) => record.status === 'open').length,
      triaged: records.filter((record) => record.status === 'triaged').length,
      in_progress: records.filter((record) => record.status === 'in_progress').length,
      resolved: records.filter((record) => record.status === 'resolved').length
    }
  };
  const queryClient = createPendingClient();
  queryClient.setQueryData(['inner-test-feedback', brandId], { success: true as const, data: dashboard });
  return queryClient;
}

function createPendingClient() {
  useBrandContextStore.setState({ activeBrandId: brandId });
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

function renderPage(element: ReactElement, queryClient: QueryClient) {
  return renderToStaticMarkup(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

function createFeedback(overrides: Partial<InnerTestFeedback> = {}): InnerTestFeedback {
  return {
    id: 'feedback-1',
    brandId,
    page: 'AI 回复监测',
    module: '监测记录',
    type: 'bug',
    severity: 'high',
    description: '列表状态同步异常。',
    status: 'in_progress',
    reporterId: 'user-1',
    resolutionNote: '已定位列表状态同步问题。',
    createdAt: '2026-07-16T08:00:00.000Z',
    updatedAt: '2026-07-17T08:00:00.000Z',
    ...overrides
  };
}
