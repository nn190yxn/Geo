import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { AutomationConfirmation, AutomationPackage } from '@geo-platform/shared-types';
import { AutomationConfirmationState, AutomationOperatorCard, getAutomationProgress } from './AutomationOperatorCard';

const brandId = 'brand_demo';

describe('AutomationOperatorCard view states', () => {
  it('renders an actionable empty task-package state', () => {
    const markup = renderCard([]);

    expect(markup).toContain('还没有自动化任务包');
    expect(markup).toContain('让 AI 帮我跑一轮');
    expect(markup).toContain('高风险动作前集中确认');
  });

  it('renders package summary, step progress and confirmation queue', () => {
    const automationPackage = createPackage({
      status: 'waiting_confirmation',
      confirmations: [createConfirmation()],
      stepSummaries: [createStep('context_collection', 'completed'), createStep('test_question_confirmation', 'waiting_confirmation')]
    });
    const markup = renderCard([automationPackage]);

    for (const text of ['任务包状态', '步骤进度', '等待确认', '当前步骤：确认监测问题', '待确认 1', '高风险动作等待确认', '查看并确认']) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain('50');
  });

  it('renders consistent manual-entry and failed-recovery states', () => {
    const confirmationMarkup = renderToStaticMarkup(<AutomationConfirmationState confirmation={createConfirmation({ type: 'manual_test_required' })} onOpen={() => undefined} onGoToManualEntry={() => undefined} />);
    expect(confirmationMarkup).toContain('需要手动录入真实回答');
    expect(confirmationMarkup).toContain('去手动录入');
    expect(confirmationMarkup).toContain('查看确认要求');

    const failedPackage = createPackage({ status: 'failed', currentStep: 'content_generation', stepSummaries: [createStep('content_generation', 'failed', '生成内容时缺少品牌资料。')] });
    const failedMarkup = renderCard([failedPackage]);
    expect(failedMarkup).toContain('自动化任务未成功');
    expect(failedMarkup).toContain('生成内容时缺少品牌资料');
    expect(failedMarkup).toContain('生成优化内容');
  });

  it('calculates bounded progress for empty, completed and skipped steps', () => {
    expect(getAutomationProgress([])).toBe(0);
    expect(getAutomationProgress([createStep('context_collection', 'completed'), createStep('question_pool_update', 'skipped'), createStep('question_selection', 'pending')])).toBe(67);
  });

  it('renders loading, partial-context and request-failure states', () => {
    const loadingMarkup = renderPage(<AutomationOperatorCard brandId={brandId} source="brand_workspace" />, createClient());
    const partialMarkup = renderCard([createPackage({ context: undefined })]);
    const partialVisibleText = getVisibleText(partialMarkup);
    const errorClient = createClient();
    errorClient.setQueryData(['automation-packages', brandId], { success: false as const, data: null, error: { code: 'test_error', message: '自动化服务暂时不可用' } });
    const errorMarkup = renderPage(<AutomationOperatorCard brandId={brandId} source="brand_workspace" />, errorClient);

    expect(loadingMarkup).toContain('页面内容加载中');
    expect(partialMarkup).toContain('部分任务上下文暂不可用');
    expect(partialMarkup).toContain('品牌信息暂不可用');
    expect(partialMarkup).toContain('任务包状态');
    expect(partialVisibleText).not.toContain(brandId);
    expect(partialVisibleText).not.toContain('package-1');
    expect(errorMarkup).toContain('自动化任务包加载失败');
    expect(errorMarkup).toContain('自动化服务暂时不可用');
    expect(errorMarkup).toContain('重新加载');
  });
});

type AutomationPackageView = AutomationPackage & {
  confirmations?: AutomationConfirmation[];
  context?: { brandName?: string; completenessScore?: number; questionPoolSize: number; testPlanCount: number };
};

function renderCard(packages: AutomationPackageView[]) {
  const queryClient = createClient();
  queryClient.setQueryData(['automation-packages', brandId], { success: true as const, data: packages });
  return renderPage(<AutomationOperatorCard brandId={brandId} source="brand_workspace" />, queryClient);
}

function createClient() {
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

function renderPage(element: ReactElement, queryClient: QueryClient) {
  return renderToStaticMarkup(<QueryClientProvider client={queryClient}>{element}</QueryClientProvider>);
}

function getVisibleText(markup: string) {
  return markup.replace(/<[^>]+>/g, ' ');
}

function createPackage(overrides: Partial<AutomationPackageView> = {}): AutomationPackageView {
  return {
    packageId: 'package-1',
    brandId,
    status: 'running',
    source: 'brand_workspace',
    goal: '完成本轮品牌自动运营',
    targetPlatforms: ['doubao'],
    targetPublishingPlatforms: ['wechat_official'],
    currentStep: 'test_question_confirmation',
    stepSummaries: [],
    relatedContentTaskIds: [],
    relatedPublishingRecordIds: [],
    createdBy: 'user-1',
    createdAt: '2026-07-16T08:00:00.000Z',
    updatedAt: '2026-07-17T08:00:00.000Z',
    context: { brandName: '示例品牌', completenessScore: 80, questionPoolSize: 12, testPlanCount: 1 },
    ...overrides
  };
}

function createStep(code: AutomationPackage['currentStep'], status: AutomationPackage['stepSummaries'][number]['status'], message = '步骤状态已更新。'): AutomationPackage['stepSummaries'][number] {
  return { code, status, title: stepTitles[code], message, relatedConfirmationIds: [], relatedEntityIds: [] };
}

function createConfirmation(overrides: Partial<AutomationConfirmation> = {}): AutomationConfirmation {
  return {
    confirmationId: 'confirmation-1',
    packageId: 'package-1',
    brandId,
    type: 'test_questions',
    status: 'pending',
    title: '确认本轮监测问题',
    impact: '确认后将开始真实监测。',
    recommendation: '优先覆盖高价值问题。',
    evidenceSummary: '本轮已筛选 8 个问题。',
    payload: {},
    ...overrides
  };
}

const stepTitles: Record<AutomationPackage['currentStep'], string> = {
  context_collection: '读取品牌资料',
  question_pool_update: '维护监测问题池',
  question_selection: '精选本轮问题',
  test_question_confirmation: '确认监测问题',
  test_plan_execution: '监测 AI 回复',
  answer_analysis: '分析监测结果',
  content_generation: '生成优化内容',
  platform_rewrite: '按平台改写',
  content_confirmation: '确认发布内容',
  publishing_suggestion: '生成发布建议',
  retest_suggestion: '安排复测',
  completed: '完成任务包'
};
