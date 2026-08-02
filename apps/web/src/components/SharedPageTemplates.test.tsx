import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AssetLibrary } from './AssetLibrary';
import { CreationWorkspace } from './CreationWorkspace';
import { ManagementListPage, ManagementRowActions } from './ManagementListPage';
import { EmptyState, GuidedEmptyState } from './PageState';
import { PlatformSwitch } from './PlatformSwitch';
import { ProductPage, ProductPageSection } from './ProductPage';
import { UnifiedFilterBar } from './UnifiedFilterBar';
import type { WorkspaceViewState } from './WorkspaceState';

function render(element: ReactElement) {
  return renderToStaticMarkup(element);
}

describe('shared page templates', () => {
  it('renders the page title, one primary action, and content without optional regions', () => {
    const markup = render(
      <ProductPage
        title="AI 回复监测"
        description="查看品牌在真实 AI 回复中的表现"
        primaryAction={<button type="button">开始监测</button>}
      >
        <ProductPageSection>监测内容</ProductPageSection>
      </ProductPage>
    );

    expect(markup).toContain('<h1');
    expect(markup).toContain('AI 回复监测');
    expect(markup).toContain('product-page-primary-action');
    expect(markup.match(/开始监测/g)).toHaveLength(1);
    expect(markup).toContain('监测内容');
    expect(markup).not.toContain('product-page-context');
    expect(markup).not.toContain('product-page-status');
    expect(markup).not.toContain('product-page-section-header');
  });

  it('renders an actionable empty state with reason, impact, benefit, and one action', () => {
    const markup = render(
      <GuidedEmptyState
        title="还没有监测样本"
        reason="尚未完成首轮监测"
        impact="暂时无法形成趋势"
        benefit="获得真实平台表现"
        actionLabel="开始首轮监测"
        onAction={() => undefined}
      />
    );

    expect(markup).toContain('当前原因：');
    expect(markup).toContain('尚未完成首轮监测');
    expect(markup).toContain('业务影响：');
    expect(markup).toContain('完成收益：');
    expect(markup.match(/开始首轮监测/g)).toHaveLength(1);
  });

  it('keeps business empty states actionable and explains the completion benefit', () => {
    const markup = render(
      <EmptyState
        title="还没有监测结果"
        description="真实 AI 回复"
        reason="当前指标缺少计算样本。"
        nextStep="完成首轮监测。"
        benefit="获得平台表现和优化建议。"
        actionLabel="开始监测"
        onAction={() => undefined}
      />
    );

    for (const text of ['缺少内容：真实 AI 回复', '影响范围：当前指标缺少计算样本', '建议下一步：完成首轮监测', '完成收益：获得平台表现和优化建议']) {
      expect(markup).toContain(text);
    }
    expect(markup.match(/开始监测/g)).toHaveLength(1);
  });

  it('renders one exclusive page state and hides misleading content for blocking states', () => {
    const errorMarkup = render(
      <ProductPage
        title="分析页"
        description="分析状态"
        state="error"
        loadingState={<div>正在加载</div>}
        partialState={<div>部分可用</div>}
        errorState={<div>重新加载分析</div>}
      >
        <div>零指标和业务空态</div>
      </ProductPage>
    );

    expect(errorMarkup).toContain('重新加载分析');
    expect(errorMarkup).not.toContain('正在加载');
    expect(errorMarkup).not.toContain('部分可用');
    expect(errorMarkup).not.toContain('零指标和业务空态');
  });

  it('renders search, date, status, result count, and every supported platform', () => {
    const markup = render(
      <UnifiedFilterBar
        value={{ search: '品牌', from: '2026-07-01', to: '2026-07-15', platform: 'all', status: 'ready' }}
        onChange={() => undefined}
        statusOptions={[{ value: 'ready', label: '已完成' }]}
        resultCount={3}
        totalCount={8}
      />
    );

    expect(markup).toContain('aria-label="搜索"');
    expect(markup).toContain('aria-label="开始日期"');
    expect(markup).toContain('aria-label="结束日期"');
    expect(markup).toContain('aria-label="状态筛选"');
    expect(markup).toContain('显示 3 条，共 8 条');
    for (const label of ['全部平台', '豆包', 'Kimi', 'DeepSeek', '通义千问', '阶跃星辰']) {
      expect(markup).toContain(label);
    }
  });

  it('supports a platform switch without the all-platform option', () => {
    const markup = render(
      <PlatformSwitch value="doubao" onChange={() => undefined} includeAll={false} />
    );

    expect(markup).not.toContain('全部平台');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('豆包');
  });

  it.each<WorkspaceViewState>(['ready', 'loading', 'empty', 'partial', 'error'])(
    'keeps configuration visible and renders the %s result state',
    (state) => {
      const markup = render(
        <CreationWorkspace
          configuration="配置表单"
          configurationTitle="生成配置"
          result="生成结果正文"
          resultTitle="结果预览"
          state={state}
          mobileOrder="result-first"
        />
      );

      expect(markup).toContain('配置表单');
      expect(markup).toContain('creation-workspace-result-first');
      expect(markup.includes('生成结果正文')).toBe(state === 'ready' || state === 'partial');

      const stateText: Partial<Record<WorkspaceViewState, string>> = {
        loading: '页面内容加载中',
        empty: '完成左侧配置后，这里会展示结果预览',
        partial: '部分结果已经可用，其余内容仍在准备中。',
        error: '结果加载失败，请保留当前配置并重新尝试。'
      };
      if (stateText[state]) expect(markup).toContain(stateText[state]);
    }
  );

  it('keeps asset navigation visible while rendering a partial editor state', () => {
    const markup = render(
      <AssetLibrary
        categories={[{ key: 'profile', label: '基础信息', completeness: 40, status: 'partial' }]}
        activeCategory="profile"
        onCategoryChange={() => undefined}
        editor="资料表单"
        completeness={140.4}
        state="partial"
        mobileOrder="editor-first"
      />
    );

    expect(markup).toContain('asset-library-editor-first');
    expect(markup).toContain('基础信息');
    expect(markup).toContain('40%');
    expect(markup).toContain('待补充');
    expect(markup).toContain('100%');
    expect(markup).toContain('当前分类有部分资料可用');
    expect(markup).toContain('资料表单');
  });

  it('renders a management table and keeps low-frequency row actions separate', () => {
    const markup = render(
      <ManagementListPage
        title="发布记录"
        description="管理内容发布结果"
        tableProps={{
          columns: [
            { title: '内容', dataIndex: 'title', key: 'title' },
            {
              title: '操作',
              key: 'actions',
              render: () => (
                <ManagementRowActions
                  primaryActions={[<button type="button" key="record">录入结果</button>]}
                  moreAction={<button type="button">更多</button>}
                />
              )
            }
          ],
          dataSource: [{ key: 'record-1', title: '儿童运动选课指南' }],
          pagination: false
        }}
      />
    );

    expect(markup).toContain('发布记录');
    expect(markup).toContain('儿童运动选课指南');
    expect(markup).toContain('录入结果');
    expect(markup).toContain('更多');
    expect(markup).toContain('management-row-actions');
    expect(markup).not.toContain('management-list-summary');
    expect(markup).not.toContain('management-list-filters');
  });

  it('keeps successful management data visible when supplemental data is partial', () => {
    const markup = render(
      <ManagementListPage
        title="内容资产"
        description="管理内容资产"
        state="partial"
        partialState={<div>部分策略数据暂时缺失</div>}
        tableProps={{
          columns: [{ title: '标题', dataIndex: 'title' }],
          dataSource: [{ key: 'asset-1', title: '已保存的内容资产' }],
          pagination: false
        }}
      />
    );

    expect(markup).toContain('部分策略数据暂时缺失');
    expect(markup).toContain('已保存的内容资产');
  });

  it('shows one recovery state and hides misleading management data when all data fails', () => {
    const markup = render(
      <ManagementListPage
        title="发布准备"
        description="管理发布记录"
        state="error"
        errorState={<div>重新加载发布记录</div>}
        tableProps={{
          columns: [{ title: '标题', dataIndex: 'title' }],
          dataSource: [{ key: 'record-1', title: '不应展示的占位记录' }],
          pagination: false
        }}
      />
    );

    expect(markup.match(/重新加载发布记录/g)).toHaveLength(1);
    expect(markup).not.toContain('不应展示的占位记录');
  });

  it('accepts custom state slots while optional headers and actions stay absent', () => {
    const markup = render(
      createElement(CreationWorkspace, {
        configuration: '最小配置',
        configurationTitle: '配置',
        result: '结果',
        resultTitle: '预览',
        state: 'empty',
        emptyState: createElement('p', null, '自定义空态')
      })
    );

    expect(markup).toContain('自定义空态');
    expect(markup).not.toContain('creation-workspace-actions');
    expect(markup).not.toContain('creation-workspace-expectation');
    expect(markup).not.toContain('creation-workspace-panel-extra');
  });
});
