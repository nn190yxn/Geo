import type { SprintContentTaskDashboard, StandardAnswerAlignmentDashboard, StandardAnswerAlignmentEvidenceType, StandardAnswerAlignmentItem, StandardAnswerAlignmentStatus } from '@geo-platform/shared-types';

export type SprintDiagnosisRow = {
  questionId: string;
  question: string;
  statusLabel: string;
  statusColor: string;
  realAnswerLabel: string;
  standardAnswerLabel: string;
  contentAssetLabel: string;
  gapLabels: string[];
  recommendation: string;
};

export function getAlignmentStatusDisplay(status: StandardAnswerAlignmentStatus): { label: string; color: string } {
  const labels: Record<StandardAnswerAlignmentStatus, { label: string; color: string }> = {
    waiting_real_answer: { label: '待真实回复', color: 'orange' },
    waiting_standard_answer: { label: '待标准答案', color: 'gold' },
    aligned: { label: '已对齐', color: 'green' },
    needs_attention: { label: '需要补强', color: 'red' }
  };

  return labels[status];
}

export function getGapTypeLabel(type: StandardAnswerAlignmentEvidenceType): string {
  const labels: Record<StandardAnswerAlignmentEvidenceType, string> = {
    coverage: '要点覆盖',
    accuracy: '表达准确性',
    risk_expression: '风险表达',
    citation_gap: '引用缺口',
    competitor_suppression: '竞品压制'
  };

  return labels[type];
}

export function buildSprintDiagnosisRows(alignment: StandardAnswerAlignmentDashboard | null, contentTasks: SprintContentTaskDashboard | null): SprintDiagnosisRow[] {
  if (!alignment) return [];

  const contentTaskByQuestion = new Map(
    (contentTasks?.items ?? [])
      .filter((item) => item.gapContext.questionId)
      .map((item) => [item.gapContext.questionId, item])
  );

  return alignment.items.map((item) => {
    const status = getAlignmentStatusDisplay(item.status);
    const contentTask = contentTaskByQuestion.get(item.questionId);
    const gapTypes = getRowGapTypes(item, contentTask?.gapContext.gapTypes ?? []);

    return {
      questionId: item.questionId,
      question: item.question,
      statusLabel: status.label,
      statusColor: status.color,
      realAnswerLabel: item.responses.length > 0 ? `${item.responses.length} 条真实回复` : '待录入真实回复',
      standardAnswerLabel: item.standardAnswerId ? '已确认标准答案' : '待确认标准答案',
      contentAssetLabel: contentTask ? contentTask.draftReadiness.message : '待生成内容资产',
      gapLabels: gapTypes.map(getGapTypeLabel),
      recommendation: item.recommendation
    };
  });
}

function getRowGapTypes(item: StandardAnswerAlignmentItem, contentGapTypes: StandardAnswerAlignmentEvidenceType[]): StandardAnswerAlignmentEvidenceType[] {
  const evidenceTypes = item.evidence.map((evidence) => evidence.type);
  const directTypes: StandardAnswerAlignmentEvidenceType[] = [
    item.citationGap ? 'citation_gap' : undefined,
    item.riskExpression ? 'risk_expression' : undefined,
    item.competitorSuppression ? 'competitor_suppression' : undefined,
    item.keyPointsMissing.length > 0 ? 'coverage' : undefined,
    item.accuracyScore < 80 ? 'accuracy' : undefined
  ].filter((value): value is StandardAnswerAlignmentEvidenceType => Boolean(value));

  return Array.from(new Set([...contentGapTypes, ...evidenceTypes, ...directTypes]));
}
