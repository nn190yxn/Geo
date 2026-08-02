import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { AnalysisFinding } from '@geo-platform/shared-types';
import { AnalysisFindingCards, getAnalysisFindingSeverityDisplay, getAnalysisFindingTypeLabel } from './AnalysisFindingCards';

describe('AnalysisFindingCards', () => {
  it('renders four diagnosis types, severity, evidence and task actions', () => {
    const findings: AnalysisFinding[] = [
      createFinding('competitor', 'high'),
      createFinding('evaluation', 'medium'),
      createFinding('citation', 'low'),
      createFinding('fact', 'high')
    ];
    const html = renderToStaticMarkup(<AnalysisFindingCards findings={findings} onAction={() => undefined} onOpenTask={() => undefined} />);

    expect(html).toContain('竞品差距');
    expect(html).toContain('评价表达');
    expect(html).toContain('信源覆盖');
    expect(html).toContain('事实准确性');
    expect(html).toContain('高风险');
    expect(html).toContain('真实回复证据');
    expect(html).toContain('生成内容任务');
    expect(html).toContain('查看关联任务');
  });

  it('exposes stable public labels for finding types and severities', () => {
    expect(getAnalysisFindingTypeLabel('fact')).toBe('事实准确性');
    expect(getAnalysisFindingSeverityDisplay('medium')).toEqual({ label: '中风险', color: 'gold' });
  });

  it('renders a clear empty diagnosis state', () => {
    const html = renderToStaticMarkup(<AnalysisFindingCards findings={[]} onAction={() => undefined} onOpenTask={() => undefined} />);
    expect(html).toContain('当前分析范围内没有诊断结论');
  });
});

function createFinding(type: AnalysisFinding['type'], severity: AnalysisFinding['severity']): AnalysisFinding {
  return {
    id: `finding-${type}`,
    brandId: 'brand_demo',
    type,
    title: `${getAnalysisFindingTypeLabel(type)}结论`,
    userIntent: '贵阳儿童运动机构怎么选？',
    platformCode: 'doubao',
    evidence: ['真实回复证据'],
    severity,
    recommendedActions: [{ actionType: 'generate_content', label: '生成内容任务' }],
    relatedTaskId: `task-${type}`
  };
}
