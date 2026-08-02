import { describe, expect, it } from 'vitest';
import type { MonitoringRunDetail } from '@geo-platform/shared-types';
import { hasRealMonitoringResponse } from '../src/modules/monitoring/real-monitoring-response';
import { buildBeginnerHomeResultSummary } from '../src/modules/dashboards/dashboard.mapper';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

describe(`Property P3: beginner home metrics use real responses only ${validatesCriteria(['4.5'])}`, () => {
  it('与监测摘要共享真实样本边界并排除示例、空回复、标准答案和内容草稿', () => {
    for (let mask = 0; mask < 2 ** candidates.length; mask += 1) {
      const selected = candidates.filter((_, index) => (mask & (1 << index)) !== 0);
      const realRuns = selected
        .flatMap((item) => item.run ? [item.run] : [])
        .filter(hasRealMonitoringResponse);
      const summary = buildBeginnerHomeResultSummary(realRuns);
      const expectedRanked = realRuns.filter((run) => typeof run.analysis?.brandRank === 'number').length;
      const expectedCited = realRuns.filter((run) => (run.response?.citations.length ?? 0) > 0).length;

      expect(summary.sampleSize, `P3 home sample mismatch for mask ${mask}`).toBe(realRuns.length);
      expect(summary.rankedSampleSize, `P3 home rank mismatch for mask ${mask}`).toBe(expectedRanked);
      expect(summary.recommendationRate).toBe(toRate(expectedRanked, realRuns.length));
      expect(summary.citationHitRate).toBe(toRate(expectedCited, realRuns.length));
    }
  });
});

describe(`Property P4: non-response objects never affect beginner home metrics ${validatesCriteria(['4.5'])}`, () => {
  it('keeps the real-response baseline for every combination of standard answers, content drafts, mock samples, and empty replies', () => {
    const baselineRuns = candidates
      .flatMap((item) => item.run ? [item.run] : [])
      .filter(hasRealMonitoringResponse);
    const baselineSummary = buildBeginnerHomeResultSummary(baselineRuns);
    const excludedCandidates = candidates.filter((item) => !item.run || !hasRealMonitoringResponse(item.run));

    for (let mask = 0; mask < 2 ** excludedCandidates.length; mask += 1) {
      const selectedRuns = excludedCandidates
        .filter((_, index) => (mask & (1 << index)) !== 0)
        .flatMap((item) => item.run ? [item.run] : [])
        .filter(hasRealMonitoringResponse);
      const summary = buildBeginnerHomeResultSummary([...baselineRuns, ...selectedRuns]);

      expect(summary, `P4 home metric mismatch for mask ${mask}`).toEqual(baselineSummary);
    }
  });
});

const candidates: Array<{ kind: string; run?: MonitoringRunDetail; payload?: unknown }> = [
  { kind: 'api', run: createRun('api', 'doubao', 'API 真实回复', 1, ['https://example.com/api']) },
  { kind: 'browser', run: createRun('browser', 'kimi', '浏览器辅助真实回复', null, []) },
  { kind: 'manual', run: createRun('manual', 'manual_input', '手动录入真实回复', 2, []) },
  { kind: 'mock', run: createRun('mock', 'mock_ai', '示例回答', 1, ['https://sample.invalid']) },
  { kind: 'empty', run: createRun('empty', 'deepseek', '   ', 1, ['https://empty.invalid']) },
  { kind: 'standard_answer', payload: { question: '标准问题', answer: '品牌标准答案' } },
  { kind: 'content_draft', payload: { title: '内容草稿', markdown: '# 草稿' } }
];

function createRun(id: string, platformCode: string, rawText: string, brandRank: number | null, citations: string[]) {
  return {
    id: `run-${id}`,
    brandId: 'brand-demo',
    optimizationUnitId: 'unit-1',
    intentId: 'intent-1',
    promptId: 'prompt-1',
    promptText: '推荐儿童体能课程',
    platformCode,
    status: 'completed',
    createdAt: '2026-07-16T00:00:00.000Z',
    response: { rawText, citations },
    analysis: { brandRank, citationScore: citations.length > 0 ? 100 : 0, reviewRequired: false }
  } as MonitoringRunDetail;
}

function toRate(count: number, total: number) {
  return total > 0 ? Math.round((count / total) * 100) : 0;
}
