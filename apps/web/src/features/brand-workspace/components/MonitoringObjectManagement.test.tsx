import { type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { BrandPrompt, OptimizationUnit, UserIntent } from '@geo-platform/shared-types';
import { filterOptimizationUnits, getOptimizationUnitWorkflowPaths, OptimizationUnitsCard } from './OptimizationUnitsCard';
import { filterUserIntents, getUserIntentWorkflowPaths, renderPromptRows, UserIntentPromptCard } from './UserIntentPromptCard';

describe('monitoring object management filters', () => {
  it('filters optimization units by keyword, type, priority, and status', () => {
    const units = [createUnit(), createUnit({ id: 'unit-2', name: '竞品比较', type: 'competitor', priority: 'low', enabled: false, targetKeywords: ['竞品口碑'] })];

    expect(filterOptimizationUnits(units, { keyword: '儿童', type: 'category', priority: 'high', status: 'enabled' })).toEqual([units[0]]);
    expect(filterOptimizationUnits(units, { keyword: '口碑', status: 'disabled' })).toEqual([units[1]]);
    expect(filterOptimizationUnits(units, { keyword: '缺失', status: 'all' })).toEqual([]);
  });

  it('filters user intents by text, related object, category, and status', () => {
    const intents = [createIntent(), createIntent({ id: 'intent-2', optimizationUnitId: 'unit-2', text: '哪家机构口碑更好', category: 'competitor_compare', enabled: false })];
    const unitNames = new Map([['unit-1', '儿童体能课程'], ['unit-2', '竞品比较']]);

    expect(filterUserIntents(intents, unitNames, { keyword: '儿童体能', category: 'category_recommendation', status: 'enabled' })).toEqual([intents[0]]);
    expect(filterUserIntents(intents, unitNames, { keyword: '口碑', status: 'disabled' })).toEqual([intents[1]]);
    expect(filterUserIntents(intents, unitNames, { keyword: '', status: 'all' })).toEqual(intents);
  });
});

describe('monitoring object management components', () => {
  it('connects optimization units and user intents to their workflow destinations', () => {
    expect(getOptimizationUnitWorkflowPaths('unit-1')).toEqual({
      createIntent: '/user-intents?optimizationUnitId=unit-1&action=create',
      startMonitoring: '/monitoring?optimizationUnitId=unit-1#test-question-candidate-card'
    });
    expect(getUserIntentWorkflowPaths(createIntent(), 'prompt-1')).toEqual({
      manualMonitoring: '/monitoring?optimizationUnitId=unit-1&intentId=intent-1&promptId=prompt-1&mode=manual#manual-test-entry',
      automaticMonitoring: '/monitoring?optimizationUnitId=unit-1&intentId=intent-1&promptId=prompt-1&mode=automatic#monitoring-runs-card',
      monitoringRecords: '/monitoring?optimizationUnitId=unit-1&intentId=intent-1&promptId=prompt-1&mode=records#monitoring-runs-card',
      generateContent: '/content-generation?optimizationUnitId=unit-1&intentId=intent-1&promptId=prompt-1',
      citations: '/citations?optimizationUnitId=unit-1&intentId=intent-1&promptId=prompt-1'
    });
  });

  it('shows an actionable beginner empty state for optimization units', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['optimization-units', 'brand-1'], { success: true, data: [] });
    const markup = renderWithClient(<OptimizationUnitsCard brandId="brand-1" />, queryClient);

    expect(markup).toContain('先创建一个优化单元');
    expect(markup).toContain('希望 AI 推荐的产品、服务或业务主题');
    expect(markup).toContain('用户意图、AI 回复监测、内容任务和分析诊断都没有关联对象');
    expect(markup).toContain('ant-btn-primary');
  });

  it('uses one create entry and keeps two optimization-unit row actions visible', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['optimization-units', 'brand-1'], { success: true, data: [createUnit()] });
    const markup = renderWithClient(<OptimizationUnitsCard brandId="brand-1" />, queryClient);

    expect(markup).toContain('management-list-page');
    expect(markup.match(/新增优化单元/g)).toHaveLength(1);
    expect(markup).toContain('搜索优化单元或关键词');
    expect(markup).toContain('品类词');
    expect(markup).toContain('推荐度待监测 / 平均排名待监测');
    expect(markup).toContain('创建用户意图');
    expect(markup).toContain('开始监测');
    expect(markup).toContain('更多');
    expect(markup).not.toContain('生成内容');
    expect(markup).not.toContain('查看分析');
  });

  it('uses one intent create entry and keeps two monitoring actions visible', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['optimization-units', 'brand-1'], { success: true, data: [createUnit()] });
    queryClient.setQueryData(['user-intents', 'brand-1'], { success: true, data: [createIntent()] });
    queryClient.setQueryData(['prompt-templates', 'brand-1'], { success: true, data: [] });
    queryClient.setQueryData(['brand-prompts', 'brand-1'], { success: true, data: [] });
    const markup = renderWithClient(<UserIntentPromptCard brandId="brand-1" />, queryClient);

    expect(markup).toContain('management-list-page');
    expect(markup.match(/创建用户意图/g)).toHaveLength(1);
    expect(markup).toContain('搜索用户意图或优化单元');
    expect(markup).toContain('手动检测');
    expect(markup).toContain('自动监测');
    expect(markup).toContain('更多');
    expect(markup).not.toContain('检测记录');
    expect(markup).not.toContain('引用来源');
  });

  it('explains how to generate monitoring questions for an empty expanded intent', () => {
    const markup = renderToStaticMarkup(renderPromptRows(createIntent(), [], () => undefined, () => undefined));

    expect(markup).toContain('当前用户意图尚未生成监测问题');
    expect(markup).toContain('自动监测、浏览器辅助监测或手动录入');
    expect(markup).toContain('生成监测问题');
  });

  it('shows platform performance and monitoring platforms with business labels', () => {
    const queryClient = new QueryClient();
    const intent = createIntent({
      platformMetrics: [
        { platformCode: 'doubao', promptText: '问题一', recommendationScore: 80, averageRank: 2, evaluation: '推荐', citationRate: 50, lastCheckedAt: '2026-07-16T08:00:00.000Z' },
        { platformCode: 'stepfun', promptText: '问题二', recommendationScore: 60, averageRank: 4, evaluation: '提及', citationRate: 30, lastCheckedAt: '2026-07-17T08:00:00.000Z' }
      ]
    });
    queryClient.setQueryData(['optimization-units', 'brand-1'], { success: true, data: [createUnit()] });
    queryClient.setQueryData(['user-intents', 'brand-1'], { success: true, data: [intent] });
    queryClient.setQueryData(['prompt-templates', 'brand-1'], { success: true, data: [] });
    queryClient.setQueryData(['brand-prompts', 'brand-1'], { success: true, data: [] });

    const intentMarkup = renderWithClient(<UserIntentPromptCard brandId="brand-1" />, queryClient);
    const promptMarkup = renderToStaticMarkup(renderPromptRows(intent, [createPrompt()], () => undefined, () => undefined));

    expect(intentMarkup).toContain('推荐度 70 / 平均排名 3.0');
    expect(intentMarkup).toContain('40%');
    expect(intentMarkup).toContain('2026-07-17T08:00:00.000Z');
    expect(promptMarkup).toContain('豆包、阶跃星辰、通义千问');
    expect(promptMarkup).not.toContain('doubao');
    expect(promptMarkup).not.toContain('stepfun');
    expect(promptMarkup).not.toContain('qianwen');
  });
});

function renderWithClient(element: ReactElement, queryClient: QueryClient) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={['/optimization-units']}>
      <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
    </MemoryRouter>
  );
}

function createUnit(overrides: Partial<OptimizationUnit> = {}): OptimizationUnit {
  return {
    id: 'unit-1',
    brandId: 'brand-1',
    name: '儿童体能课程',
    type: 'category',
    targetKeywords: ['儿童体能', '少儿运动'],
    priority: 'high',
    enabled: true,
    relatedCounts: { userIntents: 1, prompts: 2, contentStrategies: 0, monitoringRuns: 3, tasks: 0 },
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...overrides
  };
}

function createIntent(overrides: Partial<UserIntent> = {}): UserIntent {
  return {
    id: 'intent-1',
    brandId: 'brand-1',
    optimizationUnitId: 'unit-1',
    category: 'category_recommendation',
    text: '贵阳儿童体能课程怎么选',
    monitoringFrequency: 'weekly',
    enabled: true,
    platformMetrics: [],
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...overrides
  };
}

function createPrompt(overrides: Partial<BrandPrompt> = {}): BrandPrompt {
  return {
    id: 'prompt-1',
    brandId: 'brand-1',
    optimizationUnitId: 'unit-1',
    intentId: 'intent-1',
    text: '贵阳儿童体能课程推荐',
    promptKind: 'discovery',
    category: 'category_recommendation',
    targetKeywords: ['儿童体能'],
    platformCodes: ['doubao', 'stepfun', 'qianwen'],
    monitoringFrequency: 'weekly',
    enabled: true,
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...overrides
  };
}
