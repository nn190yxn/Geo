import type { BeginnerHomeDashboard, DashboardNextAction } from '@geo-platform/shared-types';
import { brandGrowthOptimizationPath, brandMonitoringPath } from '../../../app/routePaths';

export type BeginnerJourneyStage = {
  key: 'profile' | 'monitoring-object' | 'real-response';
  title: string;
  description: string;
  status: 'finish' | 'process' | 'wait';
};

export type BeginnerHomeQuestion = {
  key: 'recommendation' | 'ranking' | 'issues';
  label: string;
  route: string;
};

const actionRoutes: Record<DashboardNextAction['actionType'], string> = {
  complete_profile: '/brand-profile',
  create_monitoring_object: '/optimization-units',
  collect_real_response: '/monitoring',
  prepare_content: '/content-generation',
  publish_content: '/publishing',
  review_risk: '/growth-optimization',
  schedule_retest: '/tasks',
  review_results: '/monitoring'
};

export function getBeginnerActionRoute(action: DashboardNextAction): string {
  return actionRoutes[action.actionType];
}

export function getBeginnerHomeQuestions(brandId: string): BeginnerHomeQuestion[] {
  const recommendationQuestion = 'AI 怎么评价我的品牌？';
  const correctionQuestion = '哪些回答需要修正？';
  const contentQuestion = '下一篇内容写什么？';

  return [
    {
      key: 'recommendation',
      label: recommendationQuestion,
      route: brandMonitoringPath(brandId, { question: recommendationQuestion }, 'monitoring-runs-card')
    },
    {
      key: 'issues',
      label: correctionQuestion,
      route: brandGrowthOptimizationPath(brandId, { question: correctionQuestion }, 'standard-answer-diagnosis')
    },
    {
      key: 'ranking',
      label: contentQuestion,
      route: brandGrowthOptimizationPath(brandId, { question: contentQuestion }, 'optimization-plans')
    }
  ];
}

export function getBeginnerJourneyStages(dashboard: BeginnerHomeDashboard): BeginnerJourneyStage[] {
  const completed = [
    dashboard.profileCompleteness.completenessScore >= 100,
    dashboard.monitoringObjectCount > 0,
    dashboard.realResponseStatus.collected > 0
  ];
  const currentIndex = completed.findIndex((isComplete) => !isComplete);

  const stages: Array<Omit<BeginnerJourneyStage, 'status'>> = [
    {
      key: 'profile',
      title: '准备品牌资料',
      description: completed[0] ? '品牌资料已完整' : `当前完整度 ${dashboard.profileCompleteness.completenessScore}%`
    },
    {
      key: 'monitoring-object',
      title: '创建优化单元',
      description: completed[1] ? `已创建 ${dashboard.monitoringObjectCount} 个优化单元` : '确定要观察的产品、场景或竞品'
    },
    {
      key: 'real-response',
      title: '获取真实回复',
      description: completed[2] ? `已采集 ${dashboard.realResponseStatus.collected} 条回复` : '完成首轮真实 AI 回复监测'
    }
  ];

  return stages.map((stage, index) => ({
    ...stage,
    status: completed[index] ? 'finish' : index === currentIndex ? 'process' : 'wait'
  }));
}
