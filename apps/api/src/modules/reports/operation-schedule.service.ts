import { Injectable } from '@nestjs/common';

export type SamplingFrequency = 'weekly' | 'biweekly' | 'monthly';
export type SamplingPlan = { siteAudit: SamplingFrequency; answerSampling: SamplingFrequency; questionCount: number; platformCount: number; rounds: number; estimatedCost: number; trendImpact: string };

@Injectable()
export class OperationScheduleService {
  defaultPlan(): SamplingPlan { return { siteAudit: 'weekly', answerSampling: 'biweekly', questionCount: 0, platformCount: 0, rounds: 1, estimatedCost: 0, trendImpact: '默认节奏支持连续可比趋势' }; }
  preview(plan: Omit<SamplingPlan, 'estimatedCost' | 'trendImpact'>): SamplingPlan { const estimatedCost = plan.questionCount * plan.platformCount * plan.rounds; return { ...plan, estimatedCost, trendImpact: plan.answerSampling === 'weekly' ? '更高频率提高成本并缩短趋势观察窗口' : '保持较低频率以控制成本并维持趋势可解释性' }; }
}
