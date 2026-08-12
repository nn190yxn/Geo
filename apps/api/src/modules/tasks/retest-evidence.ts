import type {
  AnalysisResult,
  MonitoringRunDetail,
  RetestExecutionStatus,
  RetestMetricDelta,
  RetestMetricSnapshot
} from '@geo-platform/shared-types';
import { hasRealMonitoringResponseSample } from '@geo-platform/shared-types';

export type RetestEvidenceEvaluation = {
  status: RetestExecutionStatus;
  evidenceGap?: 'historical_same_run' | 'missing_source_run' | 'missing_real_response' | 'missing_analysis';
  beforeMetrics?: RetestMetricSnapshot;
  afterMetrics?: RetestMetricSnapshot;
  metricDelta?: RetestMetricDelta;
  actualScore?: number;
  improved?: boolean;
};

export function evaluateRetestEvidence(
  sourceRun: MonitoringRunDetail | null,
  retestRun: MonitoringRunDetail | null
): RetestEvidenceEvaluation {
  if (!sourceRun) return { status: 'planned', evidenceGap: 'missing_source_run' };
  if (!retestRun) return { status: 'collecting', evidenceGap: 'missing_real_response' };
  if (sourceRun.id === retestRun.id) return { status: 'planned', evidenceGap: 'historical_same_run' };
  if (sourceRun.brandId !== retestRun.brandId || !hasRealMonitoringResponseSample(retestRun)) {
    return { status: 'collecting', evidenceGap: 'missing_real_response' };
  }
  if (!sourceRun.analysis || !retestRun.analysis) return { status: 'analyzing', evidenceGap: 'missing_analysis' };

  const beforeMetrics = toRetestMetricSnapshot(sourceRun.analysis);
  const afterMetrics = toRetestMetricSnapshot(retestRun.analysis);
  const sourceRank = beforeMetrics.brandRank ?? Number.MAX_SAFE_INTEGER;
  const retestRank = afterMetrics.brandRank ?? Number.MAX_SAFE_INTEGER;
  const metricDelta: RetestMetricDelta = {
    mentionRate: afterMetrics.mentionRate - beforeMetrics.mentionRate,
    rankImproved: retestRank < sourceRank,
    accuracyScore: afterMetrics.accuracyScore - beforeMetrics.accuracyScore,
    citationRate: afterMetrics.citationRate - beforeMetrics.citationRate
  };
  const actualScore = calculateRetestScore(afterMetrics);
  const beforeScore = calculateRetestScore(beforeMetrics);
  const status: RetestExecutionStatus = actualScore > beforeScore
    ? 'improved'
    : actualScore < beforeScore
      ? 'regressed'
      : 'unchanged';

  return {
    status,
    beforeMetrics,
    afterMetrics,
    metricDelta,
    actualScore,
    improved: status === 'improved'
  };
}

export function buildRetestNextSuggestion(evaluation: RetestEvidenceEvaluation): string {
  const suggestions: string[] = [];
  if (!evaluation.metricDelta || evaluation.metricDelta.mentionRate <= 0) suggestions.push('继续补充品牌名称、别名和高频问法内容');
  if (!evaluation.metricDelta?.rankImproved) suggestions.push('强化本地化证据、权威背书和竞品对比内容');
  if (!evaluation.metricDelta || evaluation.metricDelta.accuracyScore <= 0) suggestions.push('补齐标准表达、FAQ 和可引用事实');
  if (!evaluation.metricDelta || evaluation.metricDelta.citationRate <= 0) suggestions.push('增加官网和权威来源引用依据');
  return suggestions.join('；') || '继续补充可被 AI 引用的品牌内容，并在下一轮再次监测中观察变化。';
}

function toRetestMetricSnapshot(analysis: AnalysisResult): RetestMetricSnapshot {
  return {
    mentionRate: analysis.brandMentioned ? 100 : 0,
    brandRank: analysis.brandRank ?? null,
    accuracyScore: analysis.accuracyScore,
    citationRate: analysis.citationScore
  };
}

function calculateRetestScore(metrics: RetestMetricSnapshot): number {
  const rankScore = metrics.brandRank === null ? 0 : Math.max(0, 100 - (metrics.brandRank - 1) * 20);
  return Math.round((metrics.mentionRate + rankScore + metrics.accuracyScore + metrics.citationRate) / 4);
}
