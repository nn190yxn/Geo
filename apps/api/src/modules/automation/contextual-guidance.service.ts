import { Injectable } from '@nestjs/common';

export type BrandGuideState = { hasProfile: boolean; hasMonitoring: boolean; hasContent: boolean; hasPublishing: boolean; needsRetest: boolean };
export type ContextualGuidance = { goal: string; completionCriteria: string; example: string; nextStep: string; metricDefinition: string; dataSource: string; boundary: string; commonMisread: string };

@Injectable()
export class ContextualGuidanceService {
  forState(state: BrandGuideState): ContextualGuidance {
    if (!state.hasProfile) return guide('补齐品牌资料', '关键事实已确认', '确认官网、产品与目标用户', '进入快速接入', '资料完整度', '已确认品牌资料', '资料未确认时不生成结论', '完整度不代表监测表现');
    if (!state.hasMonitoring) return guide('完成首轮 AI 回复监测', '至少一条真实回复已保存', '选择一个问题和平台执行', '开始监测', '真实回复数', 'API、浏览器辅助或手动回复', '示例回答不计入指标', '单条样本不构成趋势');
    if (!state.hasContent) return guide('把诊断转为内容动作', '内容任务通过审核', '针对一个缺口创建 FAQ 草稿', '生成内容', '内容任务完成率', '内容任务与审核记录', '草稿尚未代表发布', '内容完成不等于可见度改善');
    if (!state.hasPublishing) return guide('记录真实发布证据', '保存可访问发布链接', '确认频道和内容版本后发布', '进入发布准备', '发布记录数', '发布账号与真实链接', '草稿需要渠道确认', '发布不等于已被 AI 引用');
    if (state.needsRetest) return guide('验证优化效果', '同条件再次监测完成', '使用原问题和可比配置复测', '开始再次监测', '可比样本变化', '基线与再次监测运行', '条件变化会切断趋势', '单期变化属于观察');
    return guide('查看高级分析', '证据与结论可追溯', '按平台查看引用证据', '进入数据分析', '可见度指标', '冻结报告快照', '样本不足时不比较平台', '汇总分数不替代原始证据');
  }
}
function guide(goal: string, completionCriteria: string, example: string, nextStep: string, metricDefinition: string, dataSource: string, boundary: string, commonMisread: string): ContextualGuidance { return { goal, completionCriteria, example, nextStep, metricDefinition, dataSource, boundary, commonMisread }; }
