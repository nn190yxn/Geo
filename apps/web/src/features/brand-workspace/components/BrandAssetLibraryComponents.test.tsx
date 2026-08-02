import { createElement, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { AssetLibrary, type AssetLibraryCategory } from '../../../components/AssetLibrary';
import { GuidedEmptyState } from '../../../components/PageState';
import { BrandImportWorkspace } from './BrandImportWorkspace';
import { ProfileSaveFeedbackNotice } from './BrandKnowledgeCard';
import type { BrandProfileLibraryCategoryKey } from './brandProfileLibrary';

const categories: AssetLibraryCategory<BrandProfileLibraryCategoryKey>[] = [
  { key: 'basic-info', label: '基础信息', count: 3, completeness: 67, status: 'partial' },
  { key: 'products', label: '产品服务', count: 2, completeness: 100, status: 'complete' },
  { key: 'audiences', label: '目标用户', count: 1, completeness: 50, status: 'partial' },
  { key: 'facts', label: '事实知识', count: 0, completeness: 0, status: 'empty' },
  { key: 'media-assets', label: '媒体素材', count: 0, completeness: 0, status: 'empty' }
];

describe('brand asset library component states', () => {
  it.each(categories)('marks $label as the selected editor category', ({ key, label }) => {
    const markup = renderLibrary(key);

    expect(markup.match(/aria-current="page"/g)).toHaveLength(1);
    expect(markup).toMatch(new RegExp(`<h3[^>]*>${label}</h3>`));
    expect(markup.match(/type="button"/g)).toHaveLength(8);
  });

  it('keeps desktop navigation before the editor and exposes mobile ordering', () => {
    const navigationFirst = renderLibrary('basic-info', 'navigation-first');
    const editorFirst = renderLibrary('basic-info', 'editor-first');

    expect(navigationFirst.indexOf('asset-library-navigation')).toBeLessThan(navigationFirst.indexOf('asset-library-editor'));
    expect(navigationFirst).toContain('asset-library-navigation-first');
    expect(editorFirst).toContain('asset-library-editor-first');
    expect(editorFirst).toContain('aria-label="品牌资料分类"');
    expect(editorFirst).toContain('aria-expanded="false"');
    const mobilePanelId = editorFirst.match(/aria-controls="([^"]+)"/)?.[1];
    expect(mobilePanelId).toBeTruthy();
    expect(editorFirst).toContain(`id="${mobilePanelId}"`);
    expect(editorFirst).toContain('当前分类');
    expect(editorFirst).toContain('基础信息');
  });

  it('renders completeness, category status, and an actionable empty category', () => {
    const markup = renderToStaticMarkup(
      <AssetLibrary
        categories={categories}
        activeCategory="facts"
        onCategoryChange={() => undefined}
        editor="事实知识编辑区"
        completeness={58}
        state="empty"
        emptyState={<GuidedEmptyState title="还没有事实知识" reason="尚未录入事实资料" impact="监测结论缺少事实依据" benefit="提高回答准确性" actionLabel="上传资料" onAction={() => undefined} />}
      />
    );

    expect(markup).toContain('58%');
    expect(markup).toContain('待补充');
    expect(markup).toContain('暂无资料');
    expect(markup).toContain('还没有事实知识');
    expect(markup.match(/上传资料/g)).toHaveLength(1);
    expect(markup).not.toContain('事实知识编辑区');
  });

  it('renders the import entry with supported formats and one initial primary action', () => {
    const queryClient = new QueryClient();
    const markup = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <BrandImportWorkspace brandId="brand-1" onConfirmed={() => undefined} onManualEntry={() => undefined} />
      </QueryClientProvider>
    );

    expect(markup).toContain('上传并确认品牌资料');
    expect(markup).toContain('Markdown');
    expect(markup).toContain('DOCX');
    expect(markup).toContain('文本型 PDF');
    expect(markup.match(/上传品牌资料/g)).toHaveLength(1);
    expect(markup.match(/ant-btn-primary/g)).toHaveLength(1);
  });

  it('renders save feedback with completeness impact and both next steps', () => {
    const markup = renderToStaticMarkup(
      <ProfileSaveFeedbackNotice feedback={{ before: 35, after: 80 }} onCreateMonitoringObject={() => undefined} onStartMonitoring={() => undefined} />
    );

    expect(markup).toContain('完整度 35% → 80%');
    expect(markup).toContain('提升 45 分');
    expect(markup).toContain('创建优化单元');
    expect(markup).toContain('开始 AI 回复监测');
  });
});

function renderLibrary(activeCategory: BrandProfileLibraryCategoryKey, mobileOrder: 'navigation-first' | 'editor-first' = 'navigation-first') {
  return renderToStaticMarkup(createElement(AssetLibrary<BrandProfileLibraryCategoryKey>, {
    categories,
    activeCategory,
    onCategoryChange: () => undefined,
    editor: createElement('div', null, '当前分类编辑内容'),
    completeness: 58,
    primaryAction: createElement('button', { type: 'button' }, '保存品牌资料'),
    secondaryActions: createElement('button', { type: 'button' }, '上传资料'),
    navigationAriaLabel: '品牌资料分类',
    mobileOrder
  }) as ReactElement);
}
