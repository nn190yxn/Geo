import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import { formatClientSurface, getPromptKindLabel, SampleEvidencePanel } from './SampleEvidencePanel';

describe('SampleEvidencePanel', () => {
  it('renders an on-demand evidence trigger without exposing run identifiers', () => {
    const html = renderToStaticMarkup(
      <QueryClientProvider client={new QueryClient()}>
        <SampleEvidencePanel runIds={['run_internal_1']} buttonLabel="查看指标样本" />
      </QueryClientProvider>
    );

    expect(html).toContain('查看指标样本');
    expect(html).not.toContain('run_internal_1');
  });

  it('formats prompt kinds and client surfaces for evidence details', () => {
    expect(getPromptKindLabel('discovery')).toBe('无提示发现');
    expect(getPromptKindLabel('brand_probe')).toBe('品牌探测');
    expect(formatClientSurface('api')).toBe('API');
    expect(formatClientSurface('web')).toBe('Web');
    expect(formatClientSurface('app')).toBe('App');
  });
});
