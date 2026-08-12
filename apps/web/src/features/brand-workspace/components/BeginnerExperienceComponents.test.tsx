import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BrandActionDashboard, BeginnerHomeDashboard, BrandDetail, CompetitorDashboard } from '@geo-platform/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { CompetitorProfileManagement } from '../../competitors/pages/CompetitorAnalysisPage';
import { PlatformConnectionCards, type PlatformCardItem } from '../../model-settings/pages/ModelSettingsPage';
import { BeginnerHomeContent } from './BeginnerHomePanel';
import { BrandPortfolioPanel, getBrandMoreActionItems } from './BrandPortfolioPanel';

function render(element: ReactElement) {
  return renderToStaticMarkup(element);
}

function renderBeginnerHome(dashboard: BrandActionDashboard) {
  return render(
    <BeginnerHomeContent
      dashboard={dashboard}
      brandId="brand_demo"
      brandName="追光小牛"
      onNavigate={() => undefined}
    />
  );
}

function createActionDashboard(overrides: Partial<BrandActionDashboard> = {}): BrandActionDashboard {
  const beginnerHome = overrides.beginnerHome ?? createDashboard();
  return {
    brandId: 'brand_demo',
    beginnerHome,
    currentStage: { code: 'profile_setup', label: '品牌资料准备', status: 'blocked' },
    primaryAction: {
      id: 'blocker:brand-profile',
      category: 'data_blocker',
      label: beginnerHome.nextAction.label,
      reason: beginnerHome.nextAction.reason,
      targetPath: '/brand-profile',
      context: {},
      expectedBusinessValue: 'high'
    },
    todos: [],
    periodEffect: { status: 'unavailable', validSampleCount: 0, evidenceCount: 0, summary: '完成首轮监测后可查看本周期效果' },
    sourceFailures: [],
    updatedAt: '2026-07-15T00:00:00.000Z',
    ...overrides
  };
}

describe('开始使用域组件', () => {
  it('首屏只突出一个主按钮并最多渲染三项待办', () => {
    const todos = Array.from({ length: 4 }, (_, index) => ({
      id: `task:${index}`,
      category: 'execution' as const,
      label: `待办 ${index + 1}`,
      reason: '等待处理',
      targetPath: '/tasks' as const,
      context: { taskId: `task-${index}` },
      expectedBusinessValue: 'medium' as const
    }));
    const markup = renderBeginnerHome(createActionDashboard({ todos }));

    expect(markup.match(/ant-btn-primary/g)).toHaveLength(1);
    expect(markup.match(/beginner-todo-row/g)).toHaveLength(3);
    expect(markup).toContain('待办 3');
    expect(markup).not.toContain('待办 4');
    expect(markup).toContain('快速接入向导');
    expect(markup.match(/ant-btn-primary/g)).toHaveLength(1);
  });

  it('展示阻断原因、影响范围和恢复动作', () => {
    const dashboard = createActionDashboard();
    dashboard.primaryAction.blocker = {
      reason: '品牌资料不完整',
      impactScope: '监测问题和内容生成',
      recoveryAction: '补齐品牌核心资料'
    };
    const markup = renderBeginnerHome(dashboard);

    for (const text of ['品牌资料不完整', '影响范围：监测问题和内容生成', '恢复动作：补齐品牌核心资料']) {
      expect(markup).toContain(text);
    }
  });

  it.each([
    ['complete', '证据完整'],
    ['partial', '部分证据'],
    ['pending', '持续观察'],
    ['unavailable', '等待首轮数据']
  ] as const)('渲染 %s 周期效果状态', (status, label) => {
    const markup = renderBeginnerHome(createActionDashboard({
      periodEffect: { status, validSampleCount: 2, evidenceCount: 1, summary: '效果摘要' }
    }));
    expect(markup).toContain(label);
    expect(markup).toContain('有效样本 2 条，效果证据 1 项');
  });

  it('部分来源失败时保留主行动、待办和响应式结构', () => {
    const markup = renderBeginnerHome(createActionDashboard({
      sourceFailures: ['reportDashboard'],
      todos: [{
        id: 'task:one',
        category: 'execution',
        label: '继续处理任务',
        reason: '已成功读取任务数据',
        targetPath: '/tasks',
        context: { taskId: 'task-one' },
        expectedBusinessValue: 'high'
      }]
    }));

    for (const text of ['部分数据仍在恢复', '补充品牌资料', '继续处理任务', 'beginner-home-layout', 'beginner-todo-row']) {
      expect(markup).toContain(text);
    }
  });

  it('品牌空状态与资产卡均只提供一个高频动作', () => {
    const emptyMarkup = render(<BrandPortfolioPanel {...portfolioProps} brands={[]} />);
    expect(emptyMarkup.match(/新建品牌/g)).toHaveLength(1);

    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
    const cardMarkup = render(
      <QueryClientProvider client={queryClient}>
        <BrandPortfolioPanel {...portfolioProps} brands={[createBrand()]} />
      </QueryClientProvider>
    );
    expect(cardMarkup).toContain('查看品牌资料');
    expect(cardMarkup).toContain('更 多');
    expect(getBrandMoreActionItems('active')).toEqual([
      { key: 'edit', label: '编辑品牌' },
      { key: 'status', label: '停用品牌' }
    ]);
    expect(cardMarkup.match(/新建品牌/g)).toHaveLength(1);
  });

  it('竞品资料空状态保留一个新增入口和地图发现动作', () => {
    const markup = render(
      <CompetitorProfileManagement
        dashboard={null}
        loading={false}
        failed={false}
        onCreate={() => undefined}
        onDiscover={() => undefined}
        onEdit={() => undefined}
        onDecide={() => undefined}
      />
    );

    expect(markup).toContain('还没有竞品档案');
    expect(markup.match(/新增竞品/g)).toHaveLength(1);
    expect(markup.match(/地图发现竞品/g)).toHaveLength(1);
  });

  it('竞品资料展示可追溯的候选生命周期和样本证据', () => {
    const dashboard: CompetitorDashboard = {
      brandId: 'brand_demo', competitors: [], mentionRate: 0, suppressionRate: 0, averageRankGap: 0, highRiskIntents: [], comparisons: [], questionOpportunities: [], topPlatformsByCompetitor: [],
      candidates: [{
        candidateId: 'candidate_1', runId: 'discovery_1', brandId: 'brand_demo', sourceProvider: 'amap', name: '候选体能馆', address: '贵阳', city: '贵阳',
        matchedKeywords: ['儿童体能'], score: 88, suggestedLabel: 'direct_competitor', matchReasons: ['同城同品类'], confidence: 'high', isCampusFocus: true,
        decisionStatus: 'pending', lifecycleStatus: 'sample_confirmed', evidenceSampleIds: ['run_1'], sampleConfirmedAt: '2026-08-03T01:00:00.000Z',
        createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T01:00:00.000Z'
      }]
    };
    const markup = render(<CompetitorProfileManagement dashboard={dashboard} loading={false} failed={false} onCreate={vi.fn()} onDiscover={vi.fn()} onEdit={vi.fn()} onDecide={vi.fn()} />);

    for (const text of ['竞品候选证据生命周期', '候选体能馆', '样本确认', '1 条 AI 样本', 'run_1', '按建议确认', '设为标杆', '排 除']) expect(markup).toContain(text);
  });

  it('平台卡片展示连接状态、监测方式和唯一管理动作', () => {
    const items: PlatformCardItem[] = [
      createPlatformCard({ platformCode: 'deepseek', displayName: 'DeepSeek', statusLabel: '已连接', configId: 'config-1' }),
      createPlatformCard({ platformCode: 'kimi', displayName: 'Kimi', statusLabel: '待确认', validationLabel: '尚未验证', methodLabels: ['浏览器辅助', '手动录入'] }),
      createPlatformCard({ platformCode: 'qianwen', displayName: '通义千问', statusLabel: '待配置', validationLabel: '最近验证失败，请重新检查' })
    ];
    const markup = render(<PlatformConnectionCards items={items} loading={false} onSetup={vi.fn()} />);

    for (const text of ['已连接', '待确认', '待配置', '自动 API 监测', '浏览器辅助', '最近验证失败，请重新检查']) {
      expect(markup).toContain(text);
    }
    expect(markup.match(/管理接入/g)).toHaveLength(1);
    expect(markup.match(/连接平台/g)).toHaveLength(2);
  });
});

const portfolioProps = {
  activeBrandId: 'brand_demo',
  loading: false,
  onCreate: () => undefined,
  onEdit: () => undefined,
  onStatusChange: () => undefined,
  onSelect: () => undefined,
  onOpenActive: () => undefined
};

function createDashboard(overrides: Partial<BeginnerHomeDashboard> = {}): BeginnerHomeDashboard {
  return {
    brandId: 'brand_demo',
    profileCompleteness: { completenessScore: 0, missingFields: [] },
    monitoringObjectCount: 0,
    realResponseStatus: { total: 0, collected: 0, pending: 0, reviewRequired: 0, failed: 0 },
    contentTaskStatus: { pending: 0, running: 0, completed: 0, failed: 0 },
    publishingStatus: { totalRecords: 0, publishedRecords: 0, failedRecords: 0, citationCount: 0, pendingRetestCount: 0 },
    analysisRisk: { total: 0, high: 0, byType: { competitor: 0, evaluation: 0, citation: 0, fact: 0 } },
    resultSummary: { recommendationRate: 0, averageRank: null, citationHitRate: 0, pendingIssueCount: 0, sampleSize: 0, rankedSampleSize: 0 },
    nextAction: { actionType: 'complete_profile', label: '补充品牌资料', reason: '补齐资料' },
    ...overrides
  };
}

function createBrand(): BrandDetail {
  return {
    brandId: 'brand_demo',
    name: '追光小牛',
    status: 'active',
    aliases: [],
    industry: '儿童运动',
    targetCities: ['贵阳'],
    businessScope: '儿童运动成长中心',
    targetAudience: '3-12 岁儿童家庭',
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z'
  };
}

function createPlatformCard(overrides: Partial<PlatformCardItem>): PlatformCardItem {
  return {
    platformCode: 'doubao',
    displayName: '豆包',
    statusLabel: '未接入',
    statusColor: 'default',
    methodLabels: ['自动 API 监测', '手动录入'],
    validationLabel: '连接后可验证',
    nextAction: '连接后开始真实回复监测',
    ...overrides
  };
}
