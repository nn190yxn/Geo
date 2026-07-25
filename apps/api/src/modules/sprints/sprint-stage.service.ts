import { Injectable } from '@nestjs/common';
import type { BrandId, MonitoringRunDetail, VisibilitySprint, VisibilitySprintStatus, VisibilitySprintStep, VisibilitySprintStepCode } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Injectable()
export class SprintStageService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async advanceSprint(userId: string, brandId: BrandId, sprintId: string): Promise<VisibilitySprint | null> {
    const sprint = await this.permissionsService.getVisibilitySprint(userId, brandId, sprintId);
    if (!sprint) {
      return null;
    }

    const runs = await this.permissionsService.listMonitoringRuns(userId, brandId);
    if (!runs) {
      return null;
    }

    const nextState = this.resolveNextState(sprint, runs);

    return this.permissionsService.updateVisibilitySprintStep(userId, brandId, sprintId, nextState);
  }

  resolveNextState(sprint: VisibilitySprint, runs: MonitoringRunDetail[]): { status: VisibilitySprintStatus; currentStep: VisibilitySprintStepCode; steps: VisibilitySprintStep[] } {
    const relatedRunIds = new Set(sprint.relatedMonitoringRunIds);
    const realAnswerCount = runs.filter((run) => relatedRunIds.has(run.id) && run.response?.rawText.trim()).length;

    if (sprint.relatedQuestionIds.length === 0) {
      return buildStepState('running', 'question_radar');
    }
    if (sprint.relatedMonitoringRunIds.length === 0 || realAnswerCount === 0) {
      return buildStepState('waiting_confirmation', 'ai_response_monitoring');
    }
    if (sprint.relatedStandardAnswerIds.length === 0) {
      return buildStepState('waiting_confirmation', 'standard_answer_alignment');
    }
    if (!sprint.metricSummary.updatedAt) {
      return buildStepState('running', 'gap_diagnosis');
    }
    if (sprint.relatedContentTaskIds.length === 0) {
      return buildStepState('running', 'content_asset_generation');
    }
    if (sprint.relatedPublishingRecordIds.length === 0) {
      return buildStepState('running', 'publishing_preparation');
    }
    if (sprint.relatedRetestTaskIds.length === 0) {
      return buildStepState('running', 'retest_and_trend');
    }

    return buildStepState('completed', 'completed');
  }
}

const stepDefinitions: Array<Pick<VisibilitySprintStep, 'code' | 'title' | 'message'>> = [
  { code: 'question_radar', title: '问题意图雷达', message: '从品牌资料、竞品和用户真实搜索意图中筛出本轮高价值问题。' },
  { code: 'ai_response_monitoring', title: 'AI 回复监测', message: '获取真实 AI 平台回答，记录品牌是否被提及、推荐和引用。' },
  { code: 'standard_answer_alignment', title: '品牌标准答案对照', message: '用品牌确认过的标准答案校验 AI 回复是否准确完整。' },
  { code: 'gap_diagnosis', title: '内容缺口诊断', message: '识别 AI 误解、竞品压制、引用缺口和表达风险。' },
  { code: 'content_asset_generation', title: '内容资产生成', message: '把缺口转化为可审稿的文章、问答、门店页和平台内容草稿。' },
  { code: 'publishing_preparation', title: '发布准备', message: '按平台要求整理标题、正文、标签和人工发布清单。' },
  { code: 'retest_and_trend', title: '复测和趋势', message: '在内容分发后安排复测，追踪 AI 可见性指标变化。' }
];

function buildStepState(status: VisibilitySprintStatus, currentStep: VisibilitySprintStepCode): { status: VisibilitySprintStatus; currentStep: VisibilitySprintStepCode; steps: VisibilitySprintStep[] } {
  if (currentStep === 'completed') {
    return {
      status,
      currentStep,
      steps: stepDefinitions.map((step) => ({ ...step, status: 'completed', relatedEntityIds: [] }))
    };
  }

  const currentIndex = stepDefinitions.findIndex((step) => step.code === currentStep);

  return {
    status,
    currentStep,
    steps: stepDefinitions.map((step, index) => ({
      ...step,
      status: index < currentIndex ? 'completed' : index === currentIndex ? statusToStepStatus(status) : 'pending',
      relatedEntityIds: []
    }))
  };
}

function statusToStepStatus(status: VisibilitySprintStatus): VisibilitySprintStep['status'] {
  if (status === 'waiting_confirmation') {
    return 'waiting_confirmation';
  }
  if (status === 'failed' || status === 'stopped') {
    return 'failed';
  }
  if (status === 'completed') {
    return 'completed';
  }

  return 'running';
}
