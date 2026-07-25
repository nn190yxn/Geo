import type { AnalysisResult, MonitoringRunDetail } from '@geo-platform/shared-types';

export type MonitoringResultLine = {
  label: string;
  value: string;
  tone: 'success' | 'warning' | 'danger' | 'muted';
};

export type MonitoringResultSummary = {
  title: string;
  lines: MonitoringResultLine[];
  nextAction: string;
};

export type ConfirmationReviewItem = {
  label: string;
  value: string;
  action: string;
};

export function getMonitoringResultSummary(run: MonitoringRunDetail): MonitoringResultSummary {
  if (run.analysis) {
    return getAnalysisSummary(run.analysis);
  }

  if (run.status === 'failed') {
    return {
      title: '测试没成功，需要手动补录',
      lines: [
        { label: '原因', value: run.errorMessage ?? 'AI 平台暂时没有返回回答', tone: 'danger' },
        { label: '影响', value: '本次测试暂时没有可解读的回答', tone: 'warning' }
      ],
      nextAction: '点击手动补录，粘贴 AI 平台返回的回答。'
    };
  }

  if (run.status === 'review_required') {
    return {
      title: '需要录入平台回答',
      lines: [
        { label: '原因', value: '当前测试需要手动粘贴 AI 回答', tone: 'warning' },
        { label: '影响', value: '录入后才能判断品牌是否出现和表达是否准确', tone: 'muted' }
      ],
      nextAction: '点击录入回答，粘贴 AI 平台原文。'
    };
  }

  if (run.response) {
    return {
      title: '已有回答，等待解读',
      lines: [
        { label: '原因', value: 'AI 回答已保存', tone: 'success' },
        { label: '影响', value: '解读后会看到排名、竞品和表达准确性判断', tone: 'muted' }
      ],
      nextAction: '点击解读，生成监测结果说明。'
    };
  }

  return {
    title: '等待监测结果',
    lines: [
      { label: '原因', value: '测试尚未完成或还没有回答', tone: 'muted' },
      { label: '影响', value: '暂时无法判断这次测试表现', tone: 'muted' }
    ],
    nextAction: '等待平台返回，或使用手动录入补齐回答。'
  };
}

export function getConfirmationReviewItems(analysis?: AnalysisResult): ConfirmationReviewItem[] {
  if (!analysis?.reviewRequired) {
    return [];
  }

  const items: ConfirmationReviewItem[] = [];

  if (analysis.expressionDeviation) {
    items.push({
      label: '风险表达',
      value: analysis.expressionDeviation,
      action: getSuggestedRewrite(analysis.expressionDeviation)
    });
  }

  if (!analysis.brandRank) {
    items.push({
      label: '无法判断项',
      value: '没有识别到明确排名',
      action: '请检查 AI 回答里是否有推荐顺序；确认后可手动填写“排第几”。'
    });
  }

  if (analysis.sentiment === 'unknown') {
    items.push({
      label: '无法判断项',
      value: '没有识别到明确情绪倾向',
      action: '请按原始回答语气选择正向、中性或负向。'
    });
  }

  if (items.length === 0) {
    items.push({
      label: '需要你确认',
      value: '存在需要人工判断的表达或字段',
      action: '请核对 AI 回答，并在下方修正解读结果。'
    });
  }

  return items;
}

function getAnalysisSummary(analysis: AnalysisResult): MonitoringResultSummary {
  const lines: MonitoringResultLine[] = [
    { label: '有没有出现', value: analysis.brandMentioned ? '出现了品牌' : '没有出现品牌', tone: analysis.brandMentioned ? 'success' : 'danger' },
    { label: '排第几', value: analysis.brandRank ? `第 ${analysis.brandRank} 位` : '未识别到明确排名', tone: analysis.brandRank ? 'success' : 'warning' },
    { label: '说得准不准', value: `${analysis.accuracyScore} 分，${analysis.expressionCompleteness || '需要补充表达完整度判断'}`, tone: getScoreTone(analysis.accuracyScore) },
    { label: '竞品表现', value: getCompetitorSummary(analysis), tone: analysis.competitorMentions.length > 0 ? 'warning' : 'success' },
    { label: '需要补什么内容', value: analysis.rankingReason || analysis.recommendationReason || '暂无补强建议', tone: 'muted' }
  ];

  if (analysis.reviewRequired) {
    lines.push({ label: '需要你确认', value: analysis.expressionDeviation || '存在无法判断项或风险表达', tone: 'warning' });
  }

  return {
    title: analysis.reviewRequired ? '结果需要你确认' : '监测结果已解读',
    lines,
    nextAction: analysis.reviewRequired ? '点击查看解读，确认风险表达和无法判断项。' : '根据补强建议生成内容和再次监测计划。'
  };
}

function getScoreTone(score: number): MonitoringResultLine['tone'] {
  if (score >= 80) return 'success';
  if (score >= 60) return 'warning';
  return 'danger';
}

function getCompetitorSummary(analysis: AnalysisResult): string {
  if (analysis.competitorMentions.length === 0) {
    return '没有识别到明显竞品压制';
  }

  return analysis.competitorMentions
    .map((item) => `${item.name}${item.rank ? `第 ${item.rank} 位` : '被提及'}`)
    .join('、');
}

function getSuggestedRewrite(value: string): string {
  if (value.includes('保证') || value.includes('一定') || value.includes('承诺')) {
    return '建议改为“在科学运动和规律训练基础上，帮助孩子改善体态、促进身体发育”。';
  }

  return '请确认这段表达是否符合品牌资料；如有夸大、绝对化或无法证明内容，请改成更稳妥的描述。';
}
