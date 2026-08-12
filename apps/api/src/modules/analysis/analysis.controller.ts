import { BadRequestException, Body, Controller, Get, NotFoundException, Param, Post, Query, Req } from '@nestjs/common';
import type { Request } from 'express';
import type { AnalysisFinding, AnalysisRecommendedAction, AnalysisWorkbenchDashboard, ApiResponse, ChannelRoadmap, CitationDashboard, CompetitorDashboard, EvaluationDashboard, MeasurementAttributionInput, MeasurementAttributionRecord, MeasurementDisciplineResult, OpportunityMap, SampleEvidenceResult } from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { SampleEvidenceService } from './sample-evidence.service';
import { MeasurementDisciplineService } from './measurement-discipline.service';
import { OpportunityDiscoveryService } from './opportunity-discovery.service';
import { ChannelRoadmapService } from './channel-roadmap.service';

@Controller('brands/:brandId/analysis-diagnosis')
export class AnalysisController {
  constructor(
    private readonly permissionsService: PermissionsService,
    private readonly sampleEvidenceService: SampleEvidenceService,
    private readonly measurementDisciplineService: MeasurementDisciplineService,
    private readonly opportunityDiscoveryService: OpportunityDiscoveryService,
    private readonly channelRoadmapService: ChannelRoadmapService
  ) {}

  @Get('sample-evidence')
  async getSampleEvidence(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Query('runIds') runIds = ''
  ): Promise<ApiResponse<SampleEvidenceResult>> {
    const evidence = await this.sampleEvidenceService.getEvidence(request.context.userId, brandId, runIds.split(','));
    if (!evidence) throw new NotFoundException('样本证据不存在或当前用户无权访问');
    return { success: true, data: evidence };
  }

  @Get('measurement-discipline')
  async getMeasurementDiscipline(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<MeasurementDisciplineResult>> {
    const result = await this.measurementDisciplineService.getResult(request.context.userId, brandId);
    if (!result) throw new NotFoundException('测量基线不存在或当前用户无权访问');
    return { success: true, data: result };
  }

  @Post('measurement-attribution')
  async saveMeasurementAttribution(
    @Req() request: Request,
    @Param('brandId') brandId: string,
    @Body() body: MeasurementAttributionInput
  ): Promise<ApiResponse<MeasurementAttributionRecord>> {
    const input = normalizeMeasurementAttributionInput(body);
    const result = await this.measurementDisciplineService.saveAttribution(request.context.userId, brandId, input);
    if (!result) throw new NotFoundException('当前品牌不存在或当前用户无权访问');
    return { success: true, data: result };
  }

  @Get('opportunity-map')
  async getOpportunityMap(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<OpportunityMap>> {
    const map = await this.opportunityDiscoveryService.getMap(request.context.userId, brandId);
    if (!map) throw new NotFoundException('机会地图不存在或当前用户无权访问');
    return { success: true, data: map };
  }

  @Get('channel-roadmap')
  async getChannelRoadmap(@Req() request: Request, @Param('brandId') brandId: string): Promise<ApiResponse<ChannelRoadmap>> {
    const roadmap = await this.channelRoadmapService.getRoadmap(request.context.userId, brandId);
    if (!roadmap) throw new NotFoundException('渠道建设路线图不存在或当前用户无权访问');
    return { success: true, data: roadmap };
  }

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

function normalizeMeasurementAttributionInput(input: MeasurementAttributionInput): MeasurementAttributionInput {
  const dates = [input.baselineWindowStart, input.baselineWindowEnd, input.observationWindowStart, input.observationWindowEnd];
  if (dates.some((value) => !value || Number.isNaN(Date.parse(value)))) throw new BadRequestException('请填写有效的基线窗口和观察窗口');
  if (Date.parse(input.baselineWindowStart) > Date.parse(input.baselineWindowEnd) || Date.parse(input.observationWindowStart) > Date.parse(input.observationWindowEnd)) {
    throw new BadRequestException('窗口开始时间不能晚于结束时间');
  }
  return {
    ...input,
    controlQuestions: [...new Set((input.controlQuestions ?? []).map((item) => item.trim()).filter(Boolean))],
    externalEvents: (input.externalEvents ?? []).map((event) => ({ ...event, title: event.title.trim() })).filter((event) => event.title),
    conclusion: input.conclusion?.trim()
  };
}

function buildCompetitorFindings(dashboard: CompetitorDashboard): AnalysisFinding[] {
  return dashboard.highRiskIntents.map((intent) => ({
    id: `competitor-${intent.intentId}`,
    brandId: dashboard.brandId,
    type: 'competitor',
    title: `竞品压制：${intent.text}`,
    userIntent: intent.text,
    relatedRunIds: [...new Set(dashboard.comparisons.filter((item) => item.intentId === intent.intentId).map((item) => item.runId))],
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
    relatedRunIds: [source.runId],
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
    relatedRunIds: [issue.runId],
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
    relatedRunIds: [issue.runId],
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
