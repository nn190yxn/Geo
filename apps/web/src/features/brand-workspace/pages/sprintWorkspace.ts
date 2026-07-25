import type { AutomationStepStatus, VisibilitySprint, VisibilitySprintStepCode, VisibilitySprintStatus } from '@geo-platform/shared-types';

export type SprintNextAction = {
  label: string;
  route: string;
  description: string;
};

export function getSprintStatusLabel(status: VisibilitySprintStatus): { label: string; color: string } {
  const labels: Record<VisibilitySprintStatus, { label: string; color: string }> = {
    draft: { label: '待启动', color: 'default' },
    running: { label: '进行中', color: 'blue' },
    waiting_confirmation: { label: '待确认', color: 'orange' },
    completed: { label: '已完成', color: 'green' },
    failed: { label: '需要处理', color: 'red' },
    stopped: { label: '已停止', color: 'default' }
  };

  return labels[status];
}

export function getSprintNextAction(sprint: VisibilitySprint | null): SprintNextAction {
  if (!sprint) {
    return {
      label: '查看监测地图',
      route: '/canvas',
      description: '先选择本轮要监测的高价值问题。'
    };
  }

  const actions: Record<VisibilitySprintStepCode, SprintNextAction> = {
    question_radar: { label: '筛选问题', route: '/canvas', description: '确认本轮要进入 AI 可见性运营的问题。' },
    ai_response_monitoring: { label: '录入真实回复', route: '/monitoring#manual-test-entry', description: '获取真实 AI 回复后再进入对照分析。' },
    standard_answer_alignment: { label: '查看对照分析', route: '/growth-optimization', description: '确认品牌标准答案与真实 AI 回复的差异。' },
    gap_diagnosis: { label: '生成优化计划', route: '/growth-optimization', description: '把内容缺口转成可执行的优化任务。' },
    content_asset_generation: { label: '写内容', route: '/content-generation', description: '生成可审稿的内容资产草稿。' },
    publishing_preparation: { label: '准备发布', route: '/publishing', description: '整理发布草稿和待人工发布清单。' },
    retest_and_trend: { label: '安排再次监测', route: '/tasks', description: '发布后建立复测任务并查看趋势变化。' },
    completed: { label: '导出报告', route: '/reports', description: '整理本轮结果、变化趋势和下一轮建议。' }
  };

  return actions[sprint.currentStep];
}

export function getSprintProgressPercent(sprint: VisibilitySprint | null): number {
  if (!sprint || sprint.steps.length === 0) {
    return 0;
  }

  const completed = sprint.steps.filter((step) => step.status === 'completed').length;
  return Math.round((completed / sprint.steps.length) * 100);
}

export function getSprintStepDisplayStatus(status: AutomationStepStatus): 'wait' | 'process' | 'finish' | 'error' {
  if (status === 'completed') return 'finish';
  if (status === 'running' || status === 'waiting_confirmation') return 'process';
  if (status === 'failed') return 'error';
  return 'wait';
}

export function getSprintMetricCards(sprint: VisibilitySprint | null) {
  const metrics = sprint?.metricSummary;
  return [
    { label: '样本', value: metrics?.sampleSize ?? 0, suffix: '' },
    { label: '提及率', value: metrics?.mentionRate ?? 0, suffix: '%' },
    { label: '推荐率', value: metrics?.recommendationRate ?? 0, suffix: '%' },
    { label: '引用命中率', value: metrics?.citationHitRate ?? 0, suffix: '%' },
    { label: '内容缺口', value: metrics?.contentGapCount ?? 0, suffix: '' },
    { label: '竞品压制', value: metrics?.competitorSuppressionCount ?? 0, suffix: '' }
  ];
}
