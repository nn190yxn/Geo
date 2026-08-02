import type { ReactElement } from 'react';
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
const layouts = [
  { name: 'desktop', width: 1440 },
  { name: 'mobile', width: 390 }
] as const;

type TemplateName = (typeof templateNames)[number];
type Layout = (typeof layouts)[number];

type ResponsivePrimaryTaskScenario = {
  template: TemplateName;
  state: WorkspaceViewState;
};

type PrimaryTaskIdentity = {
  label: string;
  target: string;
  accessibleName: string;
};

const scenarios: ResponsivePrimaryTaskScenario[] = templateNames.flatMap((template) =>
  states.map((state) => ({ template, state }))
);

const templateLabels: Record<TemplateName, string> = {
  'product-page': '页面',
  'creation-workspace': '创建',
  'asset-library': '资料',
  'management-list': '列表'
};

function getPrimaryTask(scenario: ResponsivePrimaryTaskScenario): PrimaryTaskIdentity {
  const label = `执行${templateLabels[scenario.template]}主任务`;

  return {
    label,
    target: `/workflow/${scenario.template}?state=${scenario.state}#primary-task`,
    accessibleName: `${label}，当前状态${scenario.state}`
  };
}

function renderPrimaryTask(task: PrimaryTaskIdentity) {
  return (
    <a
      data-primary-task="true"
      href={task.target}
      aria-label={task.accessibleName}
    >
      {task.label}
    </a>
  );
}

function renderScenario(scenario: ResponsivePrimaryTaskScenario, layout: Layout): ReactElement {
  const primaryAction = renderPrimaryTask(getPrimaryTask(scenario));
  const content = renderTemplate(scenario, layout, primaryAction);

  return (
    <div data-layout={layout.name} data-viewport-width={layout.width}>
      {content}
    </div>
  );
}

function renderTemplate(
  scenario: ResponsivePrimaryTaskScenario,
  layout: Layout,
  primaryAction: ReactElement
): ReactElement {
  switch (scenario.template) {
    case 'product-page':
      return (
        <ProductPage
          title="共享页面"
          description="响应式主任务属性测试"
          primaryAction={primaryAction}
          state={scenario.state}
          {...getProductPageStateSlots(scenario.state)}
        >
          <div>页面内容</div>
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
          primaryAction={primaryAction}
          mobileOrder={layout.name === 'mobile' ? 'configuration-first' : 'result-first'}
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
          primaryAction={primaryAction}
          mobileOrder={layout.name === 'mobile' ? 'navigation-first' : 'editor-first'}
        />
      );
    case 'management-list':
      return (
        <ManagementListPage
          title="管理列表"
          description="列表内容"
          state={scenario.state}
          primaryAction={primaryAction}
          tableProps={{
            columns: [{ title: '名称', dataIndex: 'name', key: 'name' }],
            dataSource: [{ key: 'item-1', name: '记录一' }],
            pagination: false
          }}
        />
      );
  }
}

function getProductPageStateSlots(state: WorkspaceViewState) {
  if (state === 'loading') return { loadingState: <PageSkeleton /> };
  if (state === 'partial') return { partialState: <PartialDataNotice description="部分数据可用" /> };
  if (state === 'error') return { errorState: <RegionErrorState description="页面加载失败" /> };
  return {};
}

function readPrimaryTask(markup: string): PrimaryTaskIdentity {
  const openingTag = markup.match(/<a\b[^>]*data-primary-task="true"[^>]*>/)?.[0];
  const label = markup.match(/<a\b[^>]*data-primary-task="true"[^>]*>([^<]+)<\/a>/)?.[1];
  const target = openingTag?.match(/href="([^"]+)"/)?.[1];
  const accessibleName = openingTag?.match(/aria-label="([^"]+)"/)?.[1];

  if (!label || !target || !accessibleName) {
    throw new Error('Primary task identity is incomplete');
  }

  return { label, target, accessibleName };
}

describe(`Property P5: responsive primary task consistency ${validatesCriteria(['1.4', '8.4'])}`, () => {
  it('keeps the same primary task in desktop and mobile layouts for every template and state', () => {
    expect(scenarios).toHaveLength(20);

    for (const scenario of scenarios) {
      const renderedLayouts = layouts.map((layout) => {
        const markup = renderToStaticMarkup(renderScenario(scenario, layout));
        expect(markup).toContain(`data-layout="${layout.name}"`);
        expect(markup).toContain(`data-viewport-width="${layout.width}"`);
        return { layout, markup, task: readPrimaryTask(markup) };
      });
      const [desktop, mobile] = renderedLayouts;
      const expectedTask = getPrimaryTask(scenario);

      expect(desktop.task, `desktop task for ${JSON.stringify(scenario)}`).toEqual(expectedTask);
      expect(mobile.task, `mobile task for ${JSON.stringify(scenario)}`).toEqual(expectedTask);
      expect(mobile.task, `responsive task for ${JSON.stringify(scenario)}`).toEqual(desktop.task);

      if (scenario.template === 'creation-workspace') {
        expect(desktop.markup).toContain('creation-workspace-result-first');
        expect(mobile.markup).toContain('creation-workspace-configuration-first');
      }
      if (scenario.template === 'asset-library') {
        expect(desktop.markup).toContain('asset-library-editor-first');
        expect(mobile.markup).toContain('asset-library-navigation-first');
      }
    }
  });
});
