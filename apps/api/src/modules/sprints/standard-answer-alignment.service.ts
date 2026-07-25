import { Injectable } from '@nestjs/common';
import type {
  BrandId,
  BrandStandardAnswer,
  MonitoringRunDetail,
  StandardAnswerAlignmentDashboard,
  StandardAnswerAlignmentEvidence,
  StandardAnswerAlignmentItem,
  StandardAnswerAlignmentResponse,
  StandardAnswerAlignmentStatus,
  TestQuestionCandidate,
  VisibilitySprint
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class StandardAnswerAlignmentService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async getAlignmentDashboard(userId: string, brandId: BrandId, sprintId: string): Promise<StandardAnswerAlignmentDashboard | null> {
    const [sprint, runs, answers, candidates] = await Promise.all([
      this.permissionsService.getVisibilitySprint(userId, brandId, sprintId),
      this.permissionsService.listMonitoringRuns(userId, brandId),
      this.permissionsService.listBrandStandardAnswers(userId, brandId),
      this.permissionsService.listTestQuestionCandidates(userId, brandId)
    ]);
    if (!sprint || !runs || !answers || !candidates) {
      return null;
    }

    const relatedRuns = runs.filter((run) => sprint.relatedMonitoringRunIds.includes(run.id) && run.response?.rawText.trim());
    const approvedAnswers = answers.filter((answer) => answer.status === 'approved' && (sprint.relatedStandardAnswerIds.includes(answer.answerId) || sprint.relatedQuestionIds.includes(answer.questionId)));
    const items = this.buildItems(sprint, relatedRuns, approvedAnswers, candidates);

    return {
      brandId,
      sprintId,
      realAnswerCount: relatedRuns.length,
      approvedStandardAnswerCount: approvedAnswers.length,
      summary: buildSummary(items),
      items,
      updatedAt: new Date().toISOString()
    };
  }

  buildItems(sprint: VisibilitySprint, runs: MonitoringRunDetail[], answers: BrandStandardAnswer[], candidates: TestQuestionCandidate[]): StandardAnswerAlignmentItem[] {
    const answersByQuestionId = new Map(answers.map((answer) => [answer.questionId, answer]));
    const candidatesById = new Map(candidates.map((candidate) => [candidate.id, candidate]));
    const questionIds = unique([...sprint.relatedQuestionIds, ...answers.map((answer) => answer.questionId)]);

    return questionIds.map((questionId) => {
      const answer = answersByQuestionId.get(questionId);
      const question = answer?.question ?? candidatesById.get(questionId)?.question ?? questionId;
      const questionRuns = runs.filter((run) => run.promptId === questionId || normalizeText(run.promptText) === normalizeText(question));
      return this.buildItem(questionId, question, answer, questionRuns);
    });
  }

  private buildItem(questionId: string, question: string, answer: BrandStandardAnswer | undefined, runs: MonitoringRunDetail[]): StandardAnswerAlignmentItem {
    if (!answer) {
      return emptyItem(questionId, question, 'waiting_standard_answer', '请先生成并审核品牌标准答案，再进行真实回复对照。');
    }
    if (runs.length === 0) {
      return {
        ...emptyItem(questionId, question, 'waiting_real_answer', '请先获取或手动录入真实 AI 回复，再进行标准答案对照。'),
        standardAnswerId: answer.answerId
      };
    }

    const combinedText = normalizeText(runs.map((run) => run.response?.rawText ?? '').join(' '));
    const keyPoints = unique(answer.keyPoints);
    const keyPointsMatched = keyPoints.filter((point) => combinedText.includes(normalizeText(point)));
    const keyPointsMissing = keyPoints.filter((point) => !keyPointsMatched.includes(point));
    const coverageScore = keyPoints.length ? ratio(keyPointsMatched.length, keyPoints.length) : 100;
    const analyzedRuns = runs.filter((run) => run.analysis);
    const accuracyScore = analyzedRuns.length ? Math.round(average(analyzedRuns.map((run) => run.analysis?.accuracyScore ?? 0))) : coverageScore;
    const citationGap = runs.every((run) => (run.response?.citations.length ?? 0) === 0) || analyzedRuns.some((run) => (run.analysis?.citationScore ?? 0) < 50);
    const riskExpression = analyzedRuns.some((run) => Boolean(run.analysis?.reviewRequired) || run.analysis?.sentiment === 'negative' || Boolean(run.analysis?.expressionDeviation.trim()));
    const competitorSuppression = analyzedRuns.some((run) => run.analysis?.competitorMentions.some((competitor) => typeof competitor.rank === 'number' && (run.analysis?.brandRank === null || competitor.rank < (run.analysis?.brandRank ?? Number.MAX_SAFE_INTEGER))));
    const brandMissing = analyzedRuns.some((run) => run.analysis?.brandMentioned === false);
    const evidence = buildEvidence(answer, runs, { keyPointsMissing, citationGap, riskExpression, competitorSuppression, brandMissing, accuracyScore });
    const status: StandardAnswerAlignmentStatus = coverageScore >= 80 && accuracyScore >= 80 && !citationGap && !riskExpression && !competitorSuppression && !brandMissing ? 'aligned' : 'needs_attention';

    return {
      questionId,
      question,
      standardAnswerId: answer.answerId,
      status,
      coverageScore,
      accuracyScore,
      keyPointsMatched,
      keyPointsMissing,
      citationGap,
      riskExpression,
      competitorSuppression,
      recommendation: buildRecommendation(status, { keyPointsMissing, citationGap, riskExpression, competitorSuppression, brandMissing }),
      responses: runs.map(toAlignmentResponse),
      evidence
    };
  }
}

function emptyItem(questionId: string, question: string, status: StandardAnswerAlignmentStatus, recommendation: string): StandardAnswerAlignmentItem {
  return {
    questionId,
    question,
    status,
    coverageScore: 0,
    accuracyScore: 0,
    keyPointsMatched: [],
    keyPointsMissing: [],
    citationGap: false,
    riskExpression: false,
    competitorSuppression: false,
    recommendation,
    responses: [],
    evidence: []
  };
}

function toAlignmentResponse(run: MonitoringRunDetail): StandardAnswerAlignmentResponse {
  return {
    runId: run.id,
    responseId: run.response?.id,
    platformCode: run.platformCode,
    promptText: run.promptText,
    rawExcerpt: excerpt(run.response?.rawText ?? ''),
    citations: run.response?.citations ?? [],
    brandMentioned: run.analysis?.brandMentioned ?? false,
    brandRank: run.analysis?.brandRank ?? null,
    competitorMentions: run.analysis?.competitorMentions ?? []
  };
}

function buildEvidence(
  answer: BrandStandardAnswer,
  runs: MonitoringRunDetail[],
  flags: { keyPointsMissing: string[]; citationGap: boolean; riskExpression: boolean; competitorSuppression: boolean; brandMissing: boolean; accuracyScore: number }
): StandardAnswerAlignmentEvidence[] {
  const evidence: StandardAnswerAlignmentEvidence[] = [];
  if (flags.brandMissing) {
    evidence.push({ type: 'coverage', severity: 'high', label: '品牌未被稳定提及', excerpt: '至少一个真实 AI 回复没有提及品牌。' });
  }
  if (flags.keyPointsMissing.length) {
    evidence.push({ type: 'coverage', severity: flags.keyPointsMissing.length >= 2 ? 'high' : 'medium', label: '标准答案要点缺失', excerpt: flags.keyPointsMissing.join('、') });
  }
  if (flags.accuracyScore < 80) {
    const deviation = runs.map((run) => run.analysis?.expressionDeviation.trim()).find(Boolean) ?? '真实回复与品牌标准答案存在表达偏差。';
    evidence.push({ type: 'accuracy', severity: 'high', label: '表达准确性不足', excerpt: deviation });
  }
  if (flags.riskExpression) {
    const risk = runs.map((run) => run.analysis?.platformEvaluation.trim()).find(Boolean) ?? '真实回复存在需要人工复核的风险表达。';
    evidence.push({ type: 'risk_expression', severity: 'high', label: '风险表达需要复核', excerpt: risk });
  }
  if (flags.citationGap) {
    const standardEvidence = answer.evidence.map((item) => item.label).join('、') || '品牌资料证据';
    evidence.push({ type: 'citation_gap', severity: 'medium', label: '引用证据不足', excerpt: `真实回复缺少可追溯引用，标准答案已有证据：${standardEvidence}` });
  }
  if (flags.competitorSuppression) {
    const competitor = runs.flatMap((run) => run.analysis?.competitorMentions ?? []).find((item) => typeof item.rank === 'number');
    evidence.push({ type: 'competitor_suppression', severity: 'high', label: '竞品压制', excerpt: competitor ? `${competitor.name} 在真实回复中排名更靠前。` : '真实回复中存在竞品压制。' });
  }

  return evidence;
}

function buildRecommendation(
  status: StandardAnswerAlignmentStatus,
  flags: { keyPointsMissing: string[]; citationGap: boolean; riskExpression: boolean; competitorSuppression: boolean; brandMissing: boolean }
): string {
  if (status === 'aligned') {
    return '真实 AI 回复已覆盖本题标准答案，建议纳入趋势跟踪并安排后续复测。';
  }

  const actions: string[] = [];
  if (flags.brandMissing) actions.push('补强品牌基础介绍和本地推荐信源');
  if (flags.keyPointsMissing.length) actions.push(`围绕“${flags.keyPointsMissing.slice(0, 3).join('、')}”补充内容资产`);
  if (flags.citationGap) actions.push('发布可引用的品牌资料页或问答内容');
  if (flags.riskExpression) actions.push('修正容易被 AI 误读的表达');
  if (flags.competitorSuppression) actions.push('增加与竞品对比时的差异化证据');

  return actions.length ? actions.join('；') : '请补充真实回复解析结果后继续诊断。';
}

function buildSummary(items: StandardAnswerAlignmentItem[]): StandardAnswerAlignmentDashboard['summary'] {
  return {
    totalQuestionCount: items.length,
    alignedCount: items.filter((item) => item.status === 'aligned').length,
    needsAttentionCount: items.filter((item) => item.status === 'needs_attention').length,
    waitingRealAnswerCount: items.filter((item) => item.status === 'waiting_real_answer').length,
    waitingStandardAnswerCount: items.filter((item) => item.status === 'waiting_standard_answer').length,
    citationGapCount: items.filter((item) => item.citationGap).length,
    riskExpressionCount: items.filter((item) => item.riskExpression).length,
    competitorSuppressionCount: items.filter((item) => item.competitorSuppression).length
  };
}

function normalizeText(value: string): string {
  return value.toLowerCase().replace(/[\s\p{P}\p{S}]+/gu, '');
}

function excerpt(value: string): string {
  const trimmed = value.trim();
  return trimmed.length > 180 ? `${trimmed.slice(0, 180)}...` : trimmed;
}

function ratio(value: number, total: number): number {
  if (total <= 0) {
    return 0;
  }

  return Math.round((value / total) * 1000) / 10;
}

function average(values: number[]): number {
  if (values.length === 0) {
    return 0;
  }

  return values.reduce((sum, value) => sum + value, 0) / values.length;
}

function unique(values: string[]): string[] {
  return Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
}
