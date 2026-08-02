import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { UserGuideContent, guideStageDetails } from './UserGuideDrawer';
import { operationWorkflow } from './navigation';

describe('UserGuideDrawer', () => {
  it('keeps every guide stage aligned with the operation workflow', () => {
    expect(Object.keys(guideStageDetails)).toEqual(operationWorkflow.map((stage) => stage.key));
    expect(operationWorkflow).toHaveLength(8);
  });

  it('renders the complete first-use workflow and current-page state', () => {
    const markup = renderToStaticMarkup(
      <UserGuideContent currentPath="/monitoring" onNavigate={vi.fn()} />
    );

    expect(markup).toContain('第一次只跑一个小闭环');
    expect(markup).toContain('当前页面');
    expect(markup).toContain('八阶段 GEO 运营闭环');
    for (const stage of operationWorkflow) {
      expect(markup).toContain(stage.label);
      expect(markup).toContain(guideStageDetails[stage.key].done);
    }
  });
});
