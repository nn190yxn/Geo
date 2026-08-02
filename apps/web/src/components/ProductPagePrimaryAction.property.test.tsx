import { Button } from 'antd';
import { Fragment, type ReactElement, type ReactNode } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AssetLibrary } from './AssetLibrary';
import { CreationWorkspace } from './CreationWorkspace';
import { ManagementListPage } from './ManagementListPage';
import { PageSkeleton, PartialDataNotice, RegionErrorState } from './PageState';
import { ProductPage } from './ProductPage';
import type { WorkspaceViewState } from './WorkspaceState';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

const templateNames = ['product-page', 'creation-workspace', 'asset-library', 'management-list'] as const;
const states: readonly WorkspaceViewState[] = ['ready', 'loading', 'empty', 'partial', 'error'];

type TemplateName = (typeof templateNames)[number];

type PrimaryActionScenario = {
  template: TemplateName;
  state: WorkspaceViewState;
  hasPrimaryAction: boolean;
  secondaryActionCount: number;
};

const scenarios: PrimaryActionScenario[] = templateNames.flatMap((template) =>
  states.flatMap((state) =>
    [false, true].flatMap((hasPrimaryAction) =>
      [0, 1, 2].map((secondaryActionCount) => ({
        template,
        state,
        hasPrimaryAction,
        secondaryActionCount
      }))
    )
  )
);

function buildActions(scenario: PrimaryActionScenario) {
  const primaryAction = scenario.hasPrimaryAction
    ? <Button type="primary">执行主任务</Button>
    : undefined;
  const secondaryActions = scenario.secondaryActionCount > 0
    ? (
        <Fragment>
          {Array.from({ length: scenario.secondaryActionCount }, (_, index) => (
            <Button key={index}>辅助操作 {index + 1}</Button>
          ))}
        </Fragment>
      )
    : undefined;

  return { primaryAction, secondaryActions };
}

function renderScenario(scenario: PrimaryActionScenario): ReactElement {
  const actions = buildActions(scenario);

  switch (scenario.template) {
    case 'product-page':
      return (
        <ProductPage
          title="共享页面"
          description="主操作属性测试"
          {...actions}
          {...getProductPageStateSlots(scenario.state)}
        >
          {scenario.state === 'empty' ? <div>暂无页面数据</div> : <div>页面内容</div>}
        </ProductPage>
      );
    case 'creation-workspace':
      return (
        <CreationWorkspace
          configuration="配置内容"
          configurationTitle="配置"
          result="生成结果"
          resultTitle="结果"
          state={scenario.state}
          {...actions}
        />
      );
    case 'asset-library':
      return (
        <AssetLibrary
          categories={[{ key: 'profile', label: '基础信息' }]}
          activeCategory="profile"
          onCategoryChange={() => undefined}
          editor="资产内容"
          state={scenario.state}
          {...actions}
        />
      );
    case 'management-list':
      return (
        <ManagementListPage
          title="管理列表"
          description="列表内容"
          state={scenario.state}
          tableProps={{
            columns: [{ title: '名称', dataIndex: 'name', key: 'name' }],
            dataSource: [{ key: 'item-1', name: '记录一' }],
            pagination: false
          }}
          {...actions}
        />
      );
  }
}

function getProductPageStateSlots(state: WorkspaceViewState): {
  loadingState?: ReactNode;
  partialState?: ReactNode;
  errorState?: ReactNode;
} {
  if (state === 'loading') return { loadingState: <PageSkeleton /> };
  if (state === 'partial') return { partialState: <PartialDataNotice description="部分数据可用" /> };
  if (state === 'error') return { errorState: <RegionErrorState description="页面加载失败" /> };
  return {};
}

function countSolidPrimaryButtons(markup: string) {
  return (markup.match(/<button\b[^>]*>/g) ?? []).filter((button) => {
    const usesLegacyPrimaryClass = button.includes('ant-btn-primary');
    const usesPrimaryColor = button.includes('ant-btn-color-primary');
    const usesSolidVariant = button.includes('ant-btn-variant-solid');
    return usesLegacyPrimaryClass || (usesPrimaryColor && usesSolidVariant);
  }).length;
}

describe(`Property P6: primary action uniqueness ${validatesCriteria(['1.1', '7.2'])}`, () => {
  it('keeps at most one solid primary button for every shared template scenario', () => {
    expect(scenarios).toHaveLength(120);

    for (const scenario of scenarios) {
      const markup = renderToStaticMarkup(renderScenario(scenario));
      const primaryButtonCount = countSolidPrimaryButtons(markup);

      if (primaryButtonCount > 1) {
        throw new Error(`P6 failed for ${JSON.stringify(scenario)}: found ${primaryButtonCount} solid primary buttons`);
      }
    }
  });
});
