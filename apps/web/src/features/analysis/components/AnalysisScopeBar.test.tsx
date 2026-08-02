import { Children, type ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import { PlatformSwitch } from '../../../components/PlatformSwitch';
import { mergeAnalysisScopeQuery, type AnalysisScopeValue } from '../analysisScopeQuery';
import { AnalysisScopeBar } from './AnalysisScopeBar';

describe('AnalysisScopeBar', () => {
  it('renders the fixed platform set and exposes the selected platform', () => {
    const markup = renderToStaticMarkup(
      <AnalysisScopeBar
        value={{ search: '', platform: 'kimi', status: 'all' }}
        onChange={() => undefined}
        onClear={() => undefined}
        resultCount={2}
      />
    );

    for (const label of ['全部平台', '豆包', 'Kimi', 'DeepSeek', '通义千问', '阶跃星辰']) {
      expect(markup).toContain(label);
    }
    expect(markup).toMatch(/aria-pressed="true"[^>]*><span[^>]*>K<\/span><span>Kimi<\/span>/);
  });

  it('emits a platform selection and preserves workflow query while merging scope', () => {
    const onChange = vi.fn();
    const switchElement = PlatformSwitch({ value: 'all', onChange });
    const buttons = Children.toArray(switchElement.props.children) as ReactElement<{ onClick: () => void }>[];
    buttons[2]?.props.onClick();

    expect(onChange).toHaveBeenCalledWith('kimi');
    const nextScope: AnalysisScopeValue = { search: 'FAQ', platform: 'kimi', status: 'open', optimizationUnitId: 'unit-1', intentId: 'intent-1' };
    expect(mergeAnalysisScopeQuery('?runId=run-1&planId=plan-1', nextScope)).toContain('runId=run-1');
    expect(mergeAnalysisScopeQuery('?runId=run-1&planId=plan-1', nextScope)).toContain('planId=plan-1');
    expect(mergeAnalysisScopeQuery('?runId=run-1&planId=plan-1', nextScope)).toContain('platform=kimi');
  });

  it('keeps unknown deep-linked optimization and intent scopes visible', () => {
    const markup = renderToStaticMarkup(
      <AnalysisScopeBar
        value={{ search: '', platform: 'all', status: 'all', optimizationUnitId: 'missing-unit', intentId: 'missing-intent' }}
        onChange={() => undefined}
        onClear={() => undefined}
        resultCount={0}
      />
    );

    expect(markup).toContain('当前优化单元');
    expect(markup).toContain('当前用户意图');
  });
});
