import { Controller, Get, NotFoundException, Param, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AnalysisFinding, AnalysisRecommendedAction, AnalysisWorkbenchDashboard, ApiResponse, CitationDashboard, CompetitorDashboard, EvaluationDashboard } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';

@Controller('brands/:brandId/analysis-diagnosis')
export class AnalysisController {
  constructor(private readonly permissionsService: PermissionsService) {}

  @Get()
  async getAnalysisDiagnosis(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<AnalysisWorkbenchDashboard>> {
    const [competitorDashboard, citationDashboard, evaluationDashboard] = await Promise.all([
      Promise.resolve(this.permissionsService.getCompetitorDashboard(request.context.userId, brandId)),
      Promise.resolve(this.permissionsService.getCitationDashboard(request.context.userId, brandId)),
      Promise.resolve(this.permissionsService.getEvaluationDashboard(request.context.userId, brandId))
    ]);

    if (!competitorDashboard || !citationDashboard || !evaluationDashboard) {
      throw new NotFoundException('分析诊断不存在或当前用户无权访问');
    }

    const findings = [
      ...buildCompetitorFindings(competitorDashboard),
      ...buildCitationFindings(citationDashboard),
      ...buildEvaluationFindings(evaluationDashboard),
      ...buildFactFindings(evaluationDashboard)
    ];

    return {
      success: true,
      data: {
        brandId,
        findings,
        recommendedActions: mergeRecommendedActions(findings)
      }
    };
  }
}

function buildCompetitorFindings(dashboard: CompetitorDashboard): AnalysisFinding[] {
  return dashboard.highRiskIntents.map((intent) => ({
    id: `competitor-${intent.intentId}`,
    brandId: dashboard.brandId,
    type: 'competitor',
    title: `竞品压制：${intent.text}`,
    userIntent: intent.text,
    evidence: [`被压制 ${intent.suppressionCount} 次`, `竞品压制率 ${dashboard.suppressionRate}%`],
    severity: intent.suppressionCount >= 3 ? 'high' : 'medium',
    recommendedActions: [
      { label: '创建竞品改进任务', actionType: 'create_task', targetId: intent.intentId },
      { label: '生成竞品回应内容', actionType: 'generate_content', targetId: intent.intentId }
    ]
  }));
}

function buildCitationFindings(dashboard: CitationDashboard): AnalysisFinding[] {
  return dashboard.sources.filter((source) => !source.contentAssetId).slice(0, 10).map((source) => ({
    id: `citation-${source.id}`,
    brandId: dashboard.brandId,
    type: 'citation',
    title: `信源未绑定内容资产：${source.title}`,
    userIntent: source.promptText,
    platformCode: source.platformCode,
    evidence: [`引用次数 ${source.citationCount}`, `来源类型 ${source.sourceType}`, source.url],
    severity: source.citationCount >= 3 ? 'high' : 'medium',
    recommendedActions: [
      { label: '绑定内容资产', actionType: 'update_knowledge', targetId: source.id },
      { label: '创建信源增强内容', actionType: 'generate_content', targetId: source.id }
    ]
  }));
}

function buildEvaluationFindings(dashboard: EvaluationDashboard): AnalysisFinding[] {
  return dashboard.issues.filter((issue) => issue.issueType === 'negative_expression' || issue.issueType === 'missing_selling_point').map((issue) => ({
    id: `evaluation-${issue.id}`,
    brandId: dashboard.brandId,
    type: 'evaluation',
    title: issue.issueType === 'negative_expression' ? '负向评价需要处理' : '卖点缺失需要补强',
    userIntent: issue.promptText,
    platformCode: issue.platformCode,
    evidence: [issue.rawFragment, issue.suggestedExpression],
    severity: issue.severity,
    recommendedActions: [
      { label: '创建修正内容策略', actionType: 'generate_content', targetId: issue.id },
      { label: '安排再次监测', actionType: 'schedule_retest', targetId: issue.id }
    ]
  }));
}

function buildFactFindings(dashboard: EvaluationDashboard): AnalysisFinding[] {
  return dashboard.issues.filter((issue) => issue.issueType === 'misinformation' || issue.issueType === 'low_accuracy').map((issue) => ({
    id: `fact-${issue.id}`,
    brandId: dashboard.brandId,
    type: 'fact',
    title: issue.issueType === 'misinformation' ? '事实冲突需要澄清' : '事实表达准确性偏低',
    userIntent: issue.promptText,
    platformCode: issue.platformCode,
    evidence: [issue.rawFragment, issue.suggestedExpression],
    severity: issue.severity,
    recommendedActions: [
      { label: '更新品牌资料', actionType: 'update_knowledge', targetId: issue.id },
      { label: '生成事实补强内容', actionType: 'generate_content', targetId: issue.id }
    ]
  }));
}

function mergeRecommendedActions(findings: AnalysisFinding[]): AnalysisRecommendedAction[] {
  const seen = new Set<string>();
  return findings.flatMap((finding) => finding.recommendedActions).filter((action) => {
    const key = `${action.actionType}-${action.label}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}
