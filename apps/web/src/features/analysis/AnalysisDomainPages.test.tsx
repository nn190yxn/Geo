import type { ReactElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { MemoryRouter } from 'react-router';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { describe, expect, it } from 'vitest';
import type { AnalysisDiagnosisDashboard, CitationDashboard, CitationSource, CompetitorComparisonItem, CompetitorDashboard, EvaluationDashboard, EvaluationIssue, GrowthOptimizationPlan, GrowthOptimizationWorkspace, OpportunityMap } from '@geo-platform/shared-types';
import { useBrandContextStore } from '../../stores/brandContextStore';
import { CitationAnalysisPage } from '../citations/pages/CitationAnalysisPage';
import { CompetitorAnalysisPage } from '../competitors/pages/CompetitorAnalysisPage';
import { EvaluationAnalysisPage, getEvaluationIssueActions } from '../evaluations/pages/EvaluationAnalysisPage';
import { GrowthOptimizationPage } from '../growth-optimization/pages/GrowthOptimizationPage';

const brandId = 'brand_demo';

describe('analysis domain pages', () => {
  it('renders competitor conclusions, trend, matrix, scoped evidence and actions', () => {
    const queryClient = createClient();
    queryClient.setQueryData(['competitor-dashboard', brandId], success(createCompetitorDashboard()));
    const markup = renderPage(<CompetitorAnalysisPage />, '/competitors?platform=kimi&runId=run-context', queryClient);

    assertInOrder(markup, ['>关键结论</span>', '>趋势与分布</h3>', '>证据明细</h3>', '>建议动作</h3>']);
    for (const text of ['竞品分析', '竞品趋势', 'AI 平台矩阵', '问题机会', '竞品失守', '创建内容任务', '已确认竞品的前三可比平台', 'Kimi 80%', '高风险用户意图', '竞品 A', '生成对比内容', '创建竞品改进任务', '管理竞品资料']) {
      expect(markup).toContain(text);
    }
    expect(markup).not.toContain('豆包竞品');
  });

  it('renders evaluation and fact-specific evidence with task entries', () => {
    const evaluationClient = createClient();
    evaluationClient.setQueryData(['evaluation-dashboard', brandId], success(createEvaluationDashboard()));
    const evaluationMarkup = renderPage(<EvaluationAnalysisPage />, '/evaluations?platform=kimi', evaluationClient);

    for (const text of ['评价分析', '正向表达率', '评价趋势', '表达问题分布', 'Kimi 评价证据', '更新标准答案', '生成事实补强内容']) {
      expect(evaluationMarkup).toContain(text);
    }
    expect(evaluationMarkup).not.toContain('豆包负向评价');

    const factClient = createClient();
    factClient.setQueryData(['evaluation-dashboard', brandId], success(createEvaluationDashboard()));
    const factMarkup = renderPage(<EvaluationAnalysisPage />, '/facts', factClient);
    for (const text of ['事实分析', '事实风险', '失真信息', '证据', '用户意图', '可执行修正建议', 'Kimi 评价证据']) {
      expect(factMarkup).toContain(text);
    }
    expect(factMarkup).not.toContain('豆包负向评价');
  });

  it('renders citation metrics, distribution, trend, scoped evidence and actions', () => {
    const queryClient = createClient();
    queryClient.setQueryData(['citation-dashboard', brandId], success(createCitationDashboard()));
    const markup = renderPage(<CitationAnalysisPage />, '/citations?platform=kimi', queryClient);

    for (const text of ['信源分析', '引用率', '官网引用率', '权威来源占比', '来源类型', '真实回复', 'Kimi 官网来源', '绑定内容资产', '创建信源优化任务']) {
      expect(markup).toContain(text);
    }
    expect(markup).not.toContain('豆包媒体来源');
  });

  it('renders actionable empty states for evaluation and citation samples', () => {
    const evaluationClient = createClient();
    evaluationClient.setQueryData(['evaluation-dashboard', brandId], success({ ...createEvaluationDashboard(), sampleCount: 0, issues: [] }));
    const evaluationMarkup = renderPage(<EvaluationAnalysisPage />, '/evaluations?runId=run-1', evaluationClient);
    expect(evaluationMarkup).toContain('还没有可分析的评价样本');
    expect(evaluationMarkup).toContain('开始 AI 回复监测');

    const citationClient = createClient();
    citationClient.setQueryData(['citation-dashboard', brandId], success({ ...createCitationDashboard(), sampleCount: 0, sources: [] }));
    const citationMarkup = renderPage(<CitationAnalysisPage />, '/citations?runId=run-1', citationClient);
    expect(citationMarkup).toContain('还没有可分析的真实引用样本');
    expect(citationMarkup).toContain('开始 AI 回复监测');
  });

  it('renders unified findings and the five growth plan sections', () => {
    const queryClient = createClient();
    const plan = createGrowthPlan();
    queryClient.setQueryData(['growth-optimization', brandId], success(createGrowthWorkspace(plan)));
    queryClient.setQueryData(['analysis-diagnosis-dashboard', brandId], success(createDiagnosisDashboard()));
    queryClient.setQueryData(['opportunity-map', brandId], success(createOpportunityMap()));
    queryClient.setQueryData(['visibility-sprint-current', brandId], success(null));
    const markup = renderPage(<GrowthOptimizationPage />, '/growth-optimization?platform=kimi&runId=run-1', queryClient);

    for (const text of ['优化建议', '统一诊断结论', '竞品差距', '竞品与渠道机会', '实际引用域名', '优先问题', '原因证据', '推荐动作', '关联内容', '复测状态', '确认计划', '生成内容任务', '更新标准答案', '安排发布', '安排再次监测']) {
      expect(markup).toContain(text);
    }
  });

  it('renders unidentified sources, missing fact evidence, negative evaluation actions, and competitor suppression', () => {
    const citationClient = createClient();
    citationClient.setQueryData(['citation-dashboard', brandId], success({
      ...createCitationDashboard(),
      sources: [createCitationSource({ title: '', url: '' })]
    }));
    const citationMarkup = renderPage(<CitationAnalysisPage />, '/citations?platform=kimi', citationClient);
    expect(citationMarkup).toContain('未识别来源');
    expect(citationMarkup).toContain('来源地址待补充');
    expect(citationMarkup).toContain('绑定资产');

    const factClient = createClient();
    factClient.setQueryData(['evaluation-dashboard', brandId], success({
      ...createEvaluationDashboard(),
      issues: [createIssue({ promptText: '', userIntent: undefined, suggestedExpression: '' })]
    }));
    const factMarkup = renderPage(<EvaluationAnalysisPage />, '/facts?platform=kimi', factClient);
    expect(factMarkup).toContain('事实依据缺失，请补充品牌资料或可信来源');
    expect(factMarkup).toContain('补充事实依据后人工确认修正表达');
    expect(factMarkup).toContain('更新标准答案');

    const evaluationClient = createClient();
    evaluationClient.setQueryData(['evaluation-dashboard', brandId], success({
      ...createEvaluationDashboard(),
      issues: [createIssue({ issueType: 'negative_expression', rawFragment: '服务体验不稳定' })]
    }));
    const evaluationMarkup = renderPage(<EvaluationAnalysisPage />, '/evaluations?platform=kimi', evaluationClient);
    for (const text of ['负向表达', '服务体验不稳定', '事实澄清策略', 'FAQ 补充']) {
      expect(evaluationMarkup).toContain(text);
    }
    expect(getEvaluationIssueActions({ issueType: 'negative_expression' }).map((action) => action.label)).toContain('复测任务');

    const competitorClient = createClient();
    competitorClient.setQueryData(['competitor-dashboard', brandId], success(createCompetitorDashboard()));
    const competitorMarkup = renderPage(<CompetitorAnalysisPage />, '/competitors?platform=kimi', competitorClient);
    expect(competitorMarkup).toContain('竞品压制风险 100%');
    expect(competitorMarkup).toContain('竞品资料更完整');
    expect(competitorMarkup).toContain('创建竞品改进任务');
  });
});

function createClient() {
  useBrandContextStore.setState({ activeBrandId: brandId });
  return new QueryClient({ defaultOptions: { queries: { retry: false, staleTime: Infinity } } });
}

function createOpportunityMap(): OpportunityMap {
  return {
    brandId, measurementStatus: 'valid', sampleCount: 3, questionDimensions: [], diagnosticTypes: [], competitorThemes: [],
    citedDomains: [], channelRecommendations: [], contentOpportunities: [], generationMethod: 'deterministic'
  };
}

function renderPage(element: ReactElement, route: string, queryClient: QueryClient) {
  return renderToStaticMarkup(
    <MemoryRouter initialEntries={[route]}>
      <QueryClientProvider client={queryClient}>{element}</QueryClientProvider>
    </MemoryRouter>
  );
}

function success<T>(data: T) {
  return { success: true as const, data };
}

function assertInOrder(markup: string, labels: string[]) {
  for (let index = 1; index < labels.length; index += 1) {
    expect(markup.indexOf(labels[index - 1]!)).toBeLessThan(markup.indexOf(labels[index]!));
  }
}

function createCompetitorDashboard(): CompetitorDashboard {
  return {
    brandId, competitors: [], mentionRate: 45, suppressionRate: 50, averageRankGap: 1, highRiskIntents: [],
    comparisons: [createComparison(), createComparison({ runId: 'run-2', platformCode: 'doubao', promptText: '豆包竞品证据', competitorName: '豆包竞品' })], candidates: [],
    questionOpportunities: [{ promptId: 'prompt-1', promptText: '儿童运动机构怎么选？', optimizationUnitId: 'unit-1', intentId: 'intent-1', type: 'competitor_loss', sampleCount: 2, brandMentionRate: 0, confirmedCompetitorNames: ['竞品 A'], evidenceRunIds: ['run-1'] }],
    topPlatformsByCompetitor: [{ competitorName: '竞品 A', market: 'CN', platforms: [{ platformCode: 'kimi', mentionSampleCount: 4, comparableSampleCount: 5, mentionRate: 80 }] }]
  };
}

function createComparison(overrides: Partial<CompetitorComparisonItem> = {}): CompetitorComparisonItem {
  return { competitorName: '竞品 A', promptId: 'prompt-1', promptText: 'Kimi 竞品证据', platformCode: 'kimi', optimizationUnitId: 'unit-1', intentId: 'intent-1', intentText: '儿童运动机构选择', brandRank: 2, competitorRank: 1, rankGap: 1, suppressed: true, recommendationReason: '竞品资料更完整', citationSources: [], runId: 'run-1', capturedAt: '2026-07-16T00:00:00.000Z', ...overrides };
}

function createEvaluationDashboard(): EvaluationDashboard {
  const factIssue = createIssue();
  const evaluationIssue = createIssue({ id: 'issue-2', platformCode: 'doubao', issueType: 'negative_expression', rawFragment: '豆包负向评价' });
  return { brandId, sampleCount: 8, positiveRate: 62, neutralRate: 25, negativeRate: 13, accurateRate: 81, trend: [{ date: '2026-07-16', sampleCount: 8, positiveRate: 62, neutralRate: 25, negativeRate: 13, accurateRate: 81 }], issueTypeBreakdown: [], issues: [factIssue, evaluationIssue] };
}

function createIssue(overrides: Partial<EvaluationIssue> = {}): EvaluationIssue {
  return { id: 'issue-1', brandId, responseId: 'response-1', runId: 'run-1', promptId: 'prompt-1', promptText: '课程有哪些？', userIntent: '了解课程事实', platformCode: 'kimi', issueType: 'misinformation', rawFragment: 'Kimi 评价证据', suggestedExpression: '以品牌课程资料为准', severity: 'high', status: 'open', createdAt: '2026-07-16T00:00:00.000Z', updatedAt: '2026-07-16T00:00:00.000Z', ...overrides };
}

function createCitationDashboard(): CitationDashboard {
  return { brandId, sampleCount: 8, citedSampleCount: 5, citationRate: 63, totalCitations: 9, contentCitationRate: 44, officialCitationRate: 38, authoritySourceRate: 56, sourceTypeBreakdown: [{ sourceType: 'official_site', citationCount: 5, rate: 56 }], trend: [{ date: '2026-07-16', sampleCount: 8, citedSampleCount: 5, citationRate: 63, citationCount: 9, contentCitationRate: 44 }], sources: [createCitationSource(), createCitationSource({ id: 'source-2', platformCode: 'doubao', title: '豆包媒体来源', sourceType: 'media' })], contentAssets: [] };
}

function createCitationSource(overrides: Partial<CitationSource> = {}): CitationSource {
  return { id: 'source-1', brandId, responseId: 'response-1', runId: 'run-1', promptId: 'prompt-1', promptText: '课程有哪些？', platformCode: 'kimi', title: 'Kimi 官网来源', url: 'https://example.com/course', sourceType: 'official_site', authorityLevel: 'high', citationCount: 4, citedAt: '2026-07-16T00:00:00.000Z', createdAt: '2026-07-16T00:00:00.000Z', ...overrides };
}

function createGrowthPlan(): GrowthOptimizationPlan {
  return { id: 'plan-1', brandId, sourceRunIds: ['run-1'], summary: '提升品牌推荐率', reasons: [{ type: 'content_gap', title: '缺少课程 FAQ', evidence: '真实回复未覆盖课程差异', relatedRunIds: ['run-1'], relatedPromptIds: ['prompt-1'] }], priority: 'high', dueDate: '2026-07-20', publishingPlatforms: ['official_site'], retestAt: '2026-07-27', contentRecommendations: [{ contentType: 'website_faq', title: '课程 FAQ', targetPlatform: 'official_site', targetKeywords: ['儿童课程'], reason: '补齐真实回复缺口' }], taskIds: [], status: 'draft', createdAt: '2026-07-16', updatedAt: '2026-07-16' };
}

function createGrowthWorkspace(plan: GrowthOptimizationPlan): GrowthOptimizationWorkspace {
  return { brandId, plans: [plan], currentPlan: plan, relatedStrategies: [], relatedTasks: [], relatedPublishingRecords: [] };
}

function createDiagnosisDashboard(): AnalysisDiagnosisDashboard {
  const finding = { id: 'finding-1', brandId, type: 'competitor' as const, title: '竞品内容更完整', platformCode: 'kimi', evidence: ['竞品在真实回复中排名更高'], severity: 'high' as const, recommendedActions: [{ actionType: 'generate_content' as const, label: '生成对比内容' }] };
  return { brandId, findings: [finding], findingGroups: { competitor: [finding], evaluation: [], citation: [], fact: [] }, recommendedActions: finding.recommendedActions };
}
