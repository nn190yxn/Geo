import { Injectable } from '@nestjs/common';
import type { BrandId, MonitoringRunDetail, VisibilitySprint, VisibilitySprintMetricSummary } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class SprintMetricsService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async refreshSprintMetrics(userId: string, brandId: BrandId, sprintId: string): Promise<VisibilitySprint | null> {
    const sprint = await this.permissionsService.getVisibilitySprint(userId, brandId, sprintId);
    if (!sprint) {
      return null;
    }

    const runs = await this.permissionsService.listMonitoringRuns(userId, brandId);
    if (!runs) {
      return null;
    }

    const metricSummary = this.calculateMetricSummary(sprint, runs);

    return this.permissionsService.updateVisibilitySprintMetrics(userId, brandId, sprintId, metricSummary);
  }

  calculateMetricSummary(sprint: VisibilitySprint, runs: MonitoringRunDetail[]): VisibilitySprintMetricSummary {
    const relatedRunIds = new Set(sprint.relatedMonitoringRunIds);
    const sprintRuns = runs.filter((run) => relatedRunIds.has(run.id) && run.response && run.analysis);
    const analyses = sprintRuns.flatMap((run) => run.analysis ? [{ run, analysis: run.analysis }] : []);
    const sampleSize = analyses.length;

    if (sampleSize === 0) {
      return { ...emptyMetricSummary(), updatedAt: new Date().toISOString() };
    }

    const mentioned = analyses.filter(({ analysis }) => analysis.brandMentioned).length;
    const recommended = analyses.filter(({ analysis }) => analysis.brandRank !== null).length;
    const firstRecommendation = analyses.filter(({ analysis }) => analysis.brandRank === 1).length;
    const topThree = analyses.filter(({ analysis }) => typeof analysis.brandRank === 'number' && analysis.brandRank <= 3).length;
    const citationHit = analyses.filter(({ run, analysis }) => (run.response?.citations.length ?? 0) > 0 || analysis.citationScore > 0).length;
    const accurate = analyses.filter(({ analysis }) => analysis.accuracyScore >= 80).length;
    const risks = analyses.filter(({ analysis }) => analysis.reviewRequired).length;
    const contentGaps = analyses.filter(({ run, analysis }) => analysis.accuracyScore < 80 || analysis.citationScore < 50 || (run.response?.citations.length ?? 0) === 0).length;
    const competitorSuppression = analyses.filter(({ analysis }) =>
      analysis.competitorMentions.some((competitor) => typeof competitor.rank === 'number' && (analysis.brandRank === null || competitor.rank < analysis.brandRank))
    ).length;

    return {
      questionCoverageRate: ratio(sampleSize, sprint.relatedQuestionIds.length),
      mentionRate: ratio(mentioned, sampleSize),
      recommendationRate: ratio(recommended, sampleSize),
      firstRecommendationRate: ratio(firstRecommendation, sampleSize),
      topThreeRate: ratio(topThree, sampleSize),
      citationHitRate: ratio(citationHit, sampleSize),
      expressionAccuracyRate: ratio(accurate, sampleSize),
      riskExpressionCount: risks,
      contentGapCount: contentGaps,
      competitorSuppressionCount: competitorSuppression,
      sampleSize,
      updatedAt: new Date().toISOString()
    };
  }
}

function emptyMetricSummary(): VisibilitySprintMetricSummary {
  return {
    questionCoverageRate: 0,
    mentionRate: 0,
    recommendationRate: 0,
    firstRecommendationRate: 0,
    topThreeRate: 0,
    citationHitRate: 0,
    expressionAccuracyRate: 0,
    riskExpressionCount: 0,
    contentGapCount: 0,
    competitorSuppressionCount: 0,
    sampleSize: 0
  };
}

function ratio(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 1000) / 10;
}
