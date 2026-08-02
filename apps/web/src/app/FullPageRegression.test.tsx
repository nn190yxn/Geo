import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AssetLibrary } from '../components/AssetLibrary';
import { CreationWorkspace } from '../components/CreationWorkspace';
import { ManagementListPage } from '../components/ManagementListPage';
import { ProductPage } from '../components/ProductPage';
import type { WorkspaceStateSlots, WorkspaceViewState } from '../components/WorkspaceState';
import { getAppShellGutter, getAppShellMode } from '../layouts/AppShellState';
import { flattenNavigationItems, workspaceRouteAliases } from '../layouts/navigation';
import { firstVersionRoutePaths } from './routePaths';
import { firstVersionRoutes } from './routes';
import routesSource from './routes.tsx?raw';
import { getWorkspaceRouteTarget } from './WorkspaceRouteRedirect';

const pageSources = import.meta.glob('../features/**/pages/*Page.tsx', {
  eager: true,
  query: '?raw',
  import: 'default'
}) as Record<string, string>;

const templateNames = ['product-page', 'creation-workspace', 'asset-library', 'management-list'] as const;
const visualStates: readonly WorkspaceViewState[] = ['loading', 'empty', 'partial', 'ready', 'error'];

type TemplateName = (typeof templateNames)[number];

const expectedVisibleStates: Record<WorkspaceViewState, readonly string[]> = {
  loading: ['loading'],
  empty: ['empty'],
  partial: ['partial', 'ready'],
  ready: ['ready'],
  error: ['error']
};

describe('full-page route regression', () => {
  it('keeps every navigation route registered and backed by a shared page template', () => {
    const navigationPaths = flattenNavigationItems().map((item) => item.key);

    expect(firstVersionRoutePaths).toHaveLength(24);
    expect(firstVersionRoutes.map((route) => route.path)).toEqual(firstVersionRoutePaths);
    expect(navigationPaths).toEqual(expect.arrayContaining([...firstVersionRoutePaths]));
    expect(navigationPaths).toHaveLength(firstVersionRoutePaths.length);
    expect(Object.keys(pageSources)).toHaveLength(15);

    Object.entries(pageSources).forEach(([path, source]) => {
      expect(routesSource, path).toContain(`import('${path.slice(0, -4)}')`);
      expect(source, path).toMatch(/<(?:ProductPage|ManagementListPage|CreationWorkspace|AnalysisWorkbench)\b/);
    });
  });

  it('preserves representative workflow query and hash across every brand alias', () => {
    const search = '?question=%E5%93%81%E7%89%8C%E5%A6%82%E4%BD%95&optimizationUnitId=unit-1&intentId=intent-1&promptId=prompt-1&runId=run-1&generationTaskId=generation-1&publishingRecordId=record-1';
    const hash = '#workflow-section';

    expect(Object.keys(workspaceRouteAliases)).toHaveLength(30);
    Object.entries(workspaceRouteAliases).forEach(([alias, target]) => {
      expect(getWorkspaceRouteTarget(alias, search, hash), alias).toBe(`${target}${search}${hash}`);
    });
  });
});

describe('full-page visual state regression', () => {
  it('keeps the primary task and correct visual regions for every template and state', () => {
    expect(templateNames.length * visualStates.length).toBe(20);

    templateNames.forEach((template) => {
      visualStates.forEach((state) => {
        const markup = renderToStaticMarkup(renderTemplateState(template, state));
        const visibleStates = [...markup.matchAll(/data-visual-state="([^"]+)"/g)].map((match) => match[1]);

        expect(markup, `${template}/${state}`).toContain('data-main-task="true"');
        expect(markup, `${template}/${state}`).toContain('aria-label="开始当前主任务"');
        expect([...new Set(visibleStates)].sort(), `${template}/${state}`).toEqual([...expectedVisibleStates[state]].sort());
      });
    });
  });

  it('keeps key structures, states and primary tasks at desktop, tablet and mobile widths', () => {
    const viewportContracts = [
      { width: 1440, mode: 'desktop', gutter: 'desktop' },
      { width: 1024, mode: 'desktop', gutter: 'tablet' },
      { width: 390, mode: 'mobile', gutter: 'mobile' }
    ] as const;

    viewportContracts.forEach(({ width, mode, gutter }) => {
      expect(getAppShellMode(width)).toBe(mode);
      expect(getAppShellGutter(width)).toBe(gutter);

      templateNames.forEach((template) => {
        visualStates.forEach((state) => {
          const markup = renderToStaticMarkup(
            <div data-viewport-width={width} data-shell-mode={mode} data-page-gutter={gutter}>
              {renderTemplateState(template, state, width)}
            </div>
          );

          expect(markup, `${width}px/${template}/${state}`).toContain(`data-viewport-width="${width}"`);
          expect(markup, `${width}px/${template}/${state}`).toContain('data-main-task="true"');
          expect(markup, `${width}px/${template}/${state}`).toContain(getTemplateStructureClass(template, width));
        });
      });
    });
  });
});

function renderTemplateState(template: TemplateName, state: WorkspaceViewState, viewportWidth = 1440): ReactElement {
  const primaryAction = <a data-main-task="true" href="/monitoring" aria-label="开始当前主任务">开始当前主任务</a>;
  const slots: WorkspaceStateSlots = {
    loadingState: <VisualState name="loading" />,
    emptyState: <VisualState name="empty" />,
    partialState: <VisualState name="partial" />,
    errorState: <VisualState name="error" />
  };

  switch (template) {
    case 'product-page':
      return (
        <ProductPage title="页面" description="页面说明" state={state} primaryAction={primaryAction} {...slots}>
          <VisualState name="ready" />
        </ProductPage>
      );
    case 'creation-workspace':
      return (
        <CreationWorkspace
          configuration="配置"
          configurationTitle="配置"
          result={<VisualState name="ready" />}
          resultTitle="结果"
          state={state}
          primaryAction={primaryAction}
          mobileOrder={viewportWidth < 1200 ? 'configuration-first' : 'result-first'}
          {...slots}
        />
      );
    case 'asset-library':
      return (
        <AssetLibrary
          categories={[{ key: 'profile', label: '基础信息' }]}
          activeCategory="profile"
          onCategoryChange={() => undefined}
          editor={<VisualState name="ready" />}
          state={state}
          primaryAction={primaryAction}
          mobileOrder={viewportWidth < 992 ? 'navigation-first' : 'editor-first'}
          {...slots}
        />
      );
    case 'management-list':
      return (
        <ManagementListPage
          title="列表"
          description="列表说明"
          state={state}
          primaryAction={primaryAction}
          summary={<VisualState name="ready" />}
          tableProps={{
            columns: [{ title: '名称', dataIndex: 'name', key: 'name' }],
            dataSource: state === 'empty' ? [] : [{ key: 'item-1', name: '记录一' }],
            pagination: false
          }}
          {...slots}
        />
      );
  }
}

function VisualState({ name }: { name: WorkspaceViewState }) {
  return <div data-visual-state={name}>{name}</div>;
}

function getTemplateStructureClass(template: TemplateName, viewportWidth: number) {
  switch (template) {
    case 'product-page':
      return 'product-page-header-row';
    case 'creation-workspace':
      return viewportWidth < 1200
        ? 'creation-workspace-configuration-first'
        : 'creation-workspace-result-first';
    case 'asset-library':
      return viewportWidth < 992
        ? 'asset-library-navigation-first'
        : 'asset-library-editor-first';
    case 'management-list':
      return 'management-list-page';
  }
}
