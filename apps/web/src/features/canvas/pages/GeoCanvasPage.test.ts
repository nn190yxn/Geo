import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { GeoCanvasNode, GeoCanvasWorkspace } from '@geo-platform/shared-types';
import { buildNodeWorkflowPaths, GeoCanvasPage, getCanvasNodeDescription, getCanvasRelationshipDescriptions } from './GeoCanvasPage';

describe('buildNodeWorkflowPaths', () => {
  it('carries optimization-unit context into response and content workflows', () => {
    const paths = buildNodeWorkflowPaths(canvas, nodes.optimizationUnit, { runId: 'run-1', platformCode: 'kimi' });

    expect(paths.responses).toBe('/monitoring?optimizationUnitId=unit-1&runId=run-1&platformCode=kimi#monitoring-runs-card');
    expect(paths.content).toBe('/content-generation?optimizationUnitId=unit-1&runId=run-1');
    expect(paths.retest).toBe('/tasks?runId=run-1&platformCode=kimi&action=create');
  });

  it('adds the selected intent question and identifiers to downstream workflows', () => {
    const paths = buildNodeWorkflowPaths(canvas, nodes.intent);

    expect(paths.responses).toBe('/monitoring?question=%E8%B4%B5%E9%98%B3%E5%84%BF%E7%AB%A5%E4%BD%93%E8%83%BD%E8%AF%BE%E6%80%8E%E4%B9%88%E9%80%89&optimizationUnitId=unit-1&intentId=intent-1#monitoring-runs-card');
    expect(paths.content).toBe('/content-generation?optimizationUnitId=unit-1&intentId=intent-1');
  });

  it('uses strategy relationships and preserves existing workflow context', () => {
    const paths = buildNodeWorkflowPaths(canvas, nodes.strategy, { promptId: 'prompt-1', taskId: 'task-1' });

    expect(paths.responses).toContain('optimizationUnitId=unit-1');
    expect(paths.responses).toContain('intentId=intent-1');
    expect(paths.responses).toContain('promptId=prompt-1');
    expect(paths.content).toContain('taskId=task-1');
    expect(paths.retest).toBe('/tasks?taskId=task-1&promptId=prompt-1&action=create');
  });
});

describe('GeoCanvasPage component', () => {
  it('renders the advanced-canvas guide, legend, positioning tools and selected-node workflows', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['geo-canvas', 'brand_demo'], { success: true, data: canvas });

    const markup = renderWithClient(createElement(GeoCanvasPage), queryClient);

    expect(markup).toContain('营销画布');
    expect(markup).toContain('高级分析工具');
    expect(markup).toContain('从左到右检查关系链路');
    expect(markup).toContain('图例');
    expect(markup).toContain('优化对象');
    expect(markup).toContain('用户意图');
    expect(markup).toContain('平台表现');
    expect(markup).toContain('内容策略');
    expect(markup).toMatch(/缩\s*小/);
    expect(markup).toMatch(/放\s*大/);
    expect(markup).toContain('定位全部');
    expect(markup).toContain('查看真实回复');
    expect(markup).toContain('生成内容');
    expect(markup).toContain('再次监测');
    expect(markup).toContain('关系图文字数据');
    expect(markup).toContain('aria-label="关系图节点清单"');
    expect(markup).toContain('aria-label="关系图连接清单"');
  });
});

describe('canvas accessible descriptions', () => {
  it('describes node type, title and status without relying on color', () => {
    expect(getCanvasNodeDescription(nodes.intent)).toBe('用户意图：intent-node，状态：可执行');
  });

  it('describes every directed relationship and handles missing labels', () => {
    const descriptions = getCanvasRelationshipDescriptions({
      nodes: [nodes.optimizationUnit, nodes.intent, nodes.strategy],
      edges: [
        { id: 'edge-1', source: nodes.optimizationUnit.id, target: nodes.intent.id, label: '包含' },
        { id: 'edge-2', source: nodes.intent.id, target: nodes.strategy.id, label: '' }
      ]
    });

    expect(descriptions).toEqual([
      'optimization-unit-node 通过“包含”连接到 intent-node',
      'intent-node 通过“关联”连接到 strategy-node'
    ]);
  });

  it('returns an empty relationship list for a graph without edges', () => {
    expect(getCanvasRelationshipDescriptions({ nodes: [nodes.intent], edges: [] })).toEqual([]);
  });
});

const nodes = {
  optimizationUnit: createNode('optimization-unit-node', 'optimization_unit', 'unit-1'),
  intent: createNode('intent-node', 'user_intent', 'intent-1'),
  strategy: createNode('strategy-node', 'content_strategy', 'strategy-1')
};

const canvas = {
  brandId: 'brand_demo',
  nodes: Object.values(nodes),
  edges: [{ id: 'edge-1', source: nodes.optimizationUnit.id, target: nodes.intent.id, label: '包含' }],
  optimizationUnits: [{
    id: 'unit-1',
    name: '儿童体能课程',
    type: 'category',
    targetKeywords: ['儿童体能'],
    enabled: true,
    relatedCounts: { userIntents: 1, contentStrategies: 1 }
  }],
  userIntents: [{ id: 'intent-1', optimizationUnitId: 'unit-1', text: '贵阳儿童体能课怎么选' }],
  contentStrategies: [{ id: 'strategy-1', optimizationUnitId: 'unit-1', intentId: 'intent-1' }],
  tasks: [],
  metrics: { current: { totalScore: 72 } }
} as unknown as GeoCanvasWorkspace;

function createNode(id: string, type: GeoCanvasNode['type'], sourceId: string): GeoCanvasNode {
  return { id, type, sourceId, title: id, subtitle: '', status: 'ready', position: { x: 0, y: 0 } };
}

function renderWithClient(element: ReactElement, queryClient: QueryClient) {
  return renderToStaticMarkup(
    createElement(
      MemoryRouter,
      { initialEntries: ['/canvas?runId=run-1'] },
      createElement(QueryClientProvider, { client: queryClient }, element)
    )
  );
}
