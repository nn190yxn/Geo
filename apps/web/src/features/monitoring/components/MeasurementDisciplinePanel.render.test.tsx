import { renderToStaticMarkup } from 'react-dom/server';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { MeasurementDisciplineResult, MeasurementMetric, MeasurementScope } from '@geo-platform/shared-types';
import { MeasurementDisciplinePanel } from './MeasurementDisciplinePanel';

describe('MeasurementDisciplinePanel prompt breakdown', () => {
  it('renders isolated discovery, brand-probe and client-surface series', () => {
    const queryClient = new QueryClient();
    queryClient.setQueryData(['measurement-discipline', 'brand-1'], { success: true, data: resultFixture() });

    const html = renderToStaticMarkup(
      <QueryClientProvider client={queryClient}>
        <MeasurementDisciplinePanel brandId="brand-1" canWrite={false} />
      </QueryClientProvider>
    );

    expect(html).toContain('无提示发现');
    expect(html).toContain('无提示提及率');
    expect(html).toContain('品牌探测');
    expect(html).toContain('品牌识别率');
    expect(html).toContain('自有域名引用率');
    expect(html).toContain('CN / API');
    expect(html).toContain('CN / Web');
    expect(html).toContain('指标完整性');
    expect(html).toContain('单期观察');
  });
});

function resultFixture(): MeasurementDisciplineResult {
  const apiScope = scope('api', 'api');
  const webScope = scope('web', 'browser');
  const discoveryMetrics = [metric('mention_rate', '无提示提及率'), metric('first_rate', '首位推荐率'), metric('top3_rate', 'Top 3 推荐率')];
  const probeMetrics = [metric('recognition_rate', '品牌识别率'), metric('fact_accuracy', '事实准确度'), metric('owned_domain_citation_rate', '自有域名引用率')];
  return {
    brandId: 'brand-1', measurementStatus: 'insufficient', conditionChanged: false, segments: [], currentMetrics: discoveryMetrics,
    compositeMetric: {
      metricState: 'insufficient', value: 100, normalizedWeights: { mention_rate: 1 },
      components: [{ code: 'mention_rate', label: '无提示提及率', measurementStatus: 'insufficient', value: 100, configuredWeight: 0.25 }]
    },
    platformComparisons: [{
      market: 'CN', metricCode: 'mention_rate', metricLabel: '无提示提及率', eligibility: 'insufficient_sample',
      reason: 'fewer_than_two_valid_platforms', platforms: [{ platformCode: 'doubao', value: 100, sampleCount: 3 }]
    }],
    metricTrends: [{
      metricCode: 'mention_rate', metricLabel: '无提示提及率', measurementScope: apiScope,
      trendState: 'single_period_observation', direction: 'up', consecutiveDirectionCount: 1,
      snapshots: [], runIds: ['run-1']
    }],
    promptBreakdown: {
      discovery: { promptKind: 'discovery', measurementStatus: 'insufficient', sampleCount: 1, runIds: ['run-1'], metrics: discoveryMetrics },
      brandProbe: { promptKind: 'brand_probe', measurementStatus: 'insufficient', sampleCount: 1, runIds: ['run-2'], metrics: probeMetrics },
      series: [
        { promptKind: 'discovery', measurementStatus: 'insufficient', sampleCount: 1, runIds: ['run-1'], metrics: discoveryMetrics, measurementScope: apiScope },
        { promptKind: 'brand_probe', measurementStatus: 'insufficient', sampleCount: 1, runIds: ['run-2'], metrics: probeMetrics, measurementScope: webScope }
      ]
    }
  };
}

function metric(code: MeasurementMetric['code'], label: string): MeasurementMetric {
  return { code, label, measurementStatus: 'insufficient', sampleCount: 1, value: 100 };
}

function scope(clientSurface: MeasurementScope['clientSurface'], collectionMethod: MeasurementScope['collectionMethod']): MeasurementScope {
  return {
    platformCode: 'doubao', modelName: 'model-v1', clientSurface, collectionMethod, searchEnabled: true,
    market: 'CN', language: 'zh-CN', evidenceLevel: clientSurface === 'api' ? 'reproducible_api' : 'manual_or_browser',
    manualConfirmed: null, baselineVersion: 'baseline-1'
  };
}
