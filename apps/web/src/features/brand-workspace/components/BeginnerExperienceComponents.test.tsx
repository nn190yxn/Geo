import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { BeginnerHomeDashboard, BrandDetail } from '@geo-platform/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { CompetitorProfileManagement } from '../../competitors/pages/CompetitorAnalysisPage';
import { PlatformConnectionCards, type PlatformCardItem } from '../../model-settings/pages/ModelSettingsPage';
import { BeginnerHomeContent } from './BeginnerHomePanel';
import { BrandPortfolioPanel, getBrandMoreActionItems } from './BrandPortfolioPanel';

function render(element: ReactElement) {
  return renderToStaticMarkup(element);
}

function renderBeginnerHome(dashboard: BeginnerHomeDashboard) {
  return render(
    <BeginnerHomeContent
      dashboard={dashboard}
      brandId="brand_demo"
      brandName="追光小牛"
      onNavigate={() => undefined}
    />
  );
}

describe('开始使用域组件', () => {
  it.each([
    {
      name: '未建档',
      dashboard: createDashboard(),
      expected: ['补充品牌资料', '当前完整度 0%']
    },
    {
      name: '待建优化单元',
      dashboard: createDashboard({
        profileCompleteness: { completenessScore: 100, missingFields: [] },
        nextAction: { actionType: 'create_monitoring_object', label: '创建优化单元', reason: '确定监测范围' }
      }),
      expected: ['创建优化单元', '品牌资料已完整']
    },
    {
      name: '待采集真实回复',
      dashboard: createDashboard({
        profileCompleteness: { completenessScore: 100, missingFields: [] },
        monitoringObjectCount: 2,
        nextAction: { actionType: 'collect_real_response', label: '获取真实回复', reason: '开始首轮监测' }
      }),
      expected: ['获取真实回复', '已创建 2 个优化单元']
    },
    {
      name: '已有结果',
      dashboard: createDashboard({
        realResponseStatus: { total: 3, collected: 3, pending: 0, reviewRequired: 0, failed: 0 },
        resultSummary: { recommendationRate: 67, averageRank: 2, citationHitRate: 33, pendingIssueCount: 0, sampleSize: 3, rankedSampleSize: 2 }
      }),
      expected: ['首轮监测结果', '推荐度', '平均排名', '引用率', 'AI 怎么评价我的品牌？']
    },
    {
      name: '存在风险',
      dashboard: createDashboard({
        realResponseStatus: { total: 3, collected: 3, pending: 0, reviewRequired: 2, failed: 0 },
        analysisRisk: { total: 2, high: 1, byType: { competitor: 1, evaluation: 1, citation: 0, fact: 0 } },
        resultSummary: { recommendationRate: 33, averageRank: 4, citationHitRate: 0, pendingIssueCount: 2, sampleSize: 3, rankedSampleSize: 1 },
        nextAction: { actionType: 'review_risk', label: '处理风险回答', reason: '存在高风险表达' }
      }),
      expected: ['待处理问题', '需要人工复核的真实回复', '哪些回答需要修正？']
    }
  ])('渲染$name首页状态', ({ dashboard, expected }) => {
    const markup = renderBeginnerHome(dashboard);
    for (const text of expected) expect(markup).toContain(text);
  });

  it('为有结果首页展示三个问题式入口', () => {
    const markup = renderBeginnerHome(createDashboard({
      resultSummary: { recommendationRate: 50, averageRank: 2, citationHitRate: 50, pendingIssueCount: 1, sampleSize: 2, rankedSampleSize: 2 }
    }));

    for (const question of ['AI 怎么评价我的品牌？', '哪些回答需要修正？', '下一篇内容写什么？']) {
      expect(markup).toContain(question);
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
      />
    );

    expect(markup).toContain('还没有竞品档案');
    expect(markup.match(/新增竞品/g)).toHaveLength(1);
    expect(markup.match(/地图发现竞品/g)).toHaveLength(1);
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
