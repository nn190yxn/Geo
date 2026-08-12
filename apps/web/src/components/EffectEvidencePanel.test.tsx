import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { EffectEvidenceDashboard } from '@geo-platform/shared-types';
import { EffectEvidencePanel } from './EffectEvidencePanel';

describe('EffectEvidencePanel', () => {
  it('renders complete attribution metrics and real publishing links', () => {
    const markup = renderToStaticMarkup(<EffectEvidencePanel dashboard={createDashboard()} />);

    for (const text of ['效果证据（1）', '证据完整', '冻结报告周期', '补强官网事实', '提及率：0% 至 100%', '品牌排名：5 至 2', '表达准确率：60% 至 90%', '引用率：0% 至 100%', '查看真实发布链接']) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain('href="https://example.com/evidence"');
  });

  it('shows evidence gaps without claiming an incomplete result', () => {
    const dashboard = createDashboard();
    dashboard.evidence[0].evidenceStatus = 'partial';
    dashboard.evidence[0].dataGaps = [{ section: '再次监测', reason: '缺少有效复测样本' }];
    dashboard.dataGaps = dashboard.evidence[0].dataGaps;

    const markup = renderToStaticMarkup(<EffectEvidencePanel dashboard={dashboard} compact />);

    expect(markup).toContain('证据待补充');
    expect(markup).toContain('再次监测：缺少有效复测样本');
  });
});

function createDashboard(): EffectEvidenceDashboard {
  return {
    brandId: 'brand-demo', periodStart: '2026-07-01', periodEnd: '2026-07-31', periodSource: 'latest_report', dataGaps: [], evidence: [{
      brandId: 'brand-demo', taskId: 'task-1', taskTitle: '补强官网事实', sourceRunId: 'run-before', retestRunId: 'run-after', contentAssetIds: ['asset-1'], publishingRecords: [{ id: 'publish-1', platform: '官网', publishedUrl: 'https://example.com/evidence', publishedAt: '2026-07-10T00:00:00.000Z' }], baselineMetrics: { mentionRate: 0, brandRank: 5, accuracyScore: 60, citationRate: 0 }, afterMetrics: { mentionRate: 100, brandRank: 2, accuracyScore: 90, citationRate: 100 }, metricDelta: { mentionRate: 100, rankImproved: true, accuracyScore: 30, citationRate: 100 }, sampleSummary: { baselineValid: true, retestValid: true }, evidenceStatus: 'complete', dataGaps: []
    }]
  };
}
