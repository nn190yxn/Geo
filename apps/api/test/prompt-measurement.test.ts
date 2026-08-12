import type { MonitoringRunDetail, PromptKind } from '@geo-platform/shared-types';
import { describe, expect, it } from 'vitest';
import { buildPromptMeasurementBreakdown, classifyPromptKind, isOwnedDomainCitation } from '../src/modules/monitoring/prompt-measurement';

const brand = {
  name: '追光小牛',
  aliases: ['Super Calf'],
  website: 'https://www.supercalf.cn'
};

describe('prompt measurement', () => {
  it('classifies canonical names, aliases and owned domains deterministically', () => {
    expect(classifyPromptKind('追光小牛适合几岁孩子？', brand)).toBe('brand_probe');
    expect(classifyPromptKind('SUPER   CALF 的课程怎么样？', brand)).toBe('brand_probe');
    expect(classifyPromptKind('请分析 academy.supercalf.cn 的课程', brand)).toBe('brand_probe');
    expect(classifyPromptKind('贵阳儿童体能机构怎么选？', brand)).toBe('discovery');
    expect(classifyPromptKind('supercalf.cn.example.com 是否可信？', brand)).toBe('discovery');
  });

  it('matches owned citations only on the hostname boundary', () => {
    expect(isOwnedDomainCitation('https://news.supercalf.cn/article', brand.website)).toBe(true);
    expect(isOwnedDomainCitation('https://supercalf.cn.example.com/article', brand.website)).toBe(false);
  });

  it('isolates discovery and brand-probe metrics and splits client surfaces', () => {
    const breakdown = buildPromptMeasurementBreakdown([
      createRun('discovery-api', 'discovery', 'api', true, 1, 90),
      createRun('discovery-web', 'discovery', 'web', false, null, 70),
      createRun('probe-api', 'brand_probe', 'api', true, 1, 80, ['https://docs.supercalf.cn/facts'])
    ], brand);

    expect(breakdown.discovery.runIds).toEqual(['run-discovery-api', 'run-discovery-web']);
    expect(breakdown.discovery.metrics.map((metric) => metric.value)).toEqual([50, 50, 50]);
    expect(breakdown.brandProbe.runIds).toEqual(['run-probe-api']);
    expect(breakdown.brandProbe.metrics.map((metric) => metric.value)).toEqual([100, 80, 100]);
    expect(breakdown.series.map((series) => series.measurementScope.clientSurface).sort()).toEqual(['api', 'api', 'web']);
  });
});

function createRun(
  id: string,
  promptKind: PromptKind,
  clientSurface: 'api' | 'web',
  brandMentioned: boolean,
  brandRank: number | null,
  accuracyScore: number,
  citations: string[] = []
): MonitoringRunDetail {
  const scope = {
    platformCode: 'doubao', modelName: 'model-v1', collectionMethod: clientSurface === 'api' ? 'api' as const : 'browser' as const,
    clientSurface, searchEnabled: true, market: 'CN', language: 'zh-CN', evidenceLevel: clientSurface === 'api' ? 'reproducible_api' as const : 'manual_or_browser' as const,
    manualConfirmed: null, baselineVersion: 'baseline-1'
  };
  return {
    id: `run-${id}`, brandId: 'brand-demo', optimizationUnitId: 'unit-1', intentId: 'intent-1', promptId: `prompt-${id}`,
    promptKind, promptText: promptKind === 'brand_probe' ? '追光小牛怎么样？' : '儿童体能机构怎么选？', ...scope,
    status: 'completed', retryStatus: 'not_retried', createdAt: '2026-08-03T00:00:00.000Z', updatedAt: '2026-08-03T00:00:00.000Z',
    response: {
      id: `response-${id}`, runId: `run-${id}`, brandId: 'brand-demo', rawText: '真实回答', citations, ...scope,
      respondedAt: '2026-08-03T00:00:00.000Z', parseStatus: 'parsed', createdAt: '2026-08-03T00:00:00.000Z'
    },
    analysis: {
      id: `analysis-${id}`, responseId: `response-${id}`, runId: `run-${id}`, brandId: 'brand-demo', brandMentioned, brandRank,
      sentiment: 'neutral', accuracyScore, citationScore: 0, platformEvaluation: '', recommendationReason: '', rankingReason: '',
      expressionCompleteness: '', expressionDeviation: '', competitorMentions: [], reviewRequired: false, updatedAt: '2026-08-03T00:00:00.000Z'
    }
  };
}
