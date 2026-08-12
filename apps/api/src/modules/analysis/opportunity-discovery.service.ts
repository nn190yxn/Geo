import { Injectable } from '@nestjs/common';
import {
  hasRealMonitoringResponseSample,
  type BrandId,
  type CitationSourceType,
  type CompetitorCandidate,
  type ContentAsset,
  type MonitoringRunDetail,
  type OpportunityChannelRecommendation,
  type OpportunityCitedDomain,
  type OpportunityCompetitorTheme,
  type OpportunityContentItem,
  type OpportunityDiagnosticType,
  type OpportunityMap,
  type OpportunityPlatformDistribution,
  type QuestionDiscoveryDimension,
  type TestQuestionCandidate
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { getConfirmedCompetitorNames, isConfirmedCompetitorName } from '../competitors/competitor-confirmation';

const questionDimensions: QuestionDiscoveryDimension[] = [
  'brand',
  'category',
  'scenario',
  'audience',
  'pain_point',
  'location',
  'buying_decision',
  'competitor_comparison'
];

const diagnosticTypes: OpportunityDiagnosticType[] = ['brand_absent', 'competitor_dominant', 'content_gap', 'fact_inconsistent'];

const sourceTypeLabels: Record<CitationSourceType, string> = {
  official_site: '品牌官网与 FAQ',
  media: '行业媒体',
  social: '专业社媒账号',
  encyclopedia: '百科知识页',
  third_party: '垂直第三方平台'
};

@Injectable()
export class OpportunityDiscoveryService {
  constructor(private readonly permissionsService: PermissionsService) {}

  async getMap(userId: string, brandId: BrandId): Promise<OpportunityMap | null> {
    const [runs, candidates, contentAssets, competitors, competitorCandidates] = await Promise.all([
      Promise.resolve(this.permissionsService.listMonitoringRuns(userId, brandId)),
      Promise.resolve(this.permissionsService.listTestQuestionCandidates(userId, brandId)),
      Promise.resolve(this.permissionsService.listContentAssets(userId, brandId)),
      Promise.resolve(this.permissionsService.listCompetitors(userId, brandId)),
      Promise.resolve(this.permissionsService.listCompetitorCandidates(userId, brandId))
    ]);
    if (!runs || !candidates || !contentAssets || !competitors || !competitorCandidates) return null;

    const validRuns = runs.filter((run): run is MonitoringRunDetail & { response: NonNullable<MonitoringRunDetail['response']> } =>
      hasRealMonitoringResponseSample(run) && Boolean(run.response)
    );
    const confirmedNames = getConfirmedCompetitorNames(competitors, competitorCandidates as CompetitorCandidate[]);
    const contentOpportunities = buildContentOpportunities(validRuns, confirmedNames);
    const citedDomains = buildCitedDomains(validRuns, contentAssets);

    return {
      brandId,
      measurementStatus: validRuns.length === 0 ? 'unmeasured' : validRuns.length < 3 ? 'insufficient' : 'valid',
      sampleCount: validRuns.length,
      questionDimensions: buildQuestionDimensions(candidates),
      diagnosticTypes: diagnosticTypes.map((type) => ({
        type,
        opportunityCount: contentOpportunities.filter((item) => item.type === type).length
      })),
      competitorThemes: buildCompetitorThemes(validRuns, confirmedNames),
      citedDomains,
      channelRecommendations: buildChannelRecommendations(citedDomains),
      contentOpportunities,
      generationMethod: 'deterministic'
    };
  }
}

function buildQuestionDimensions(candidates: TestQuestionCandidate[]): OpportunityMap['questionDimensions'] {
  return questionDimensions.map((dimension) => ({
    dimension,
    questionCount: candidates.filter((candidate) => candidate.discoveryDimension === dimension).length
  }));
}

function buildCompetitorThemes(
  runs: Array<MonitoringRunDetail & { response: NonNullable<MonitoringRunDetail['response']> }>,
  confirmedNames: Set<string>
): OpportunityCompetitorTheme[] {
  const themes = new Map<string, {
    competitorName: string;
    theme: string;
    platforms: Map<string, number>;
    questions: Set<string>;
    runIds: Set<string>;
  }>();

  runs.forEach((run) => {
    run.analysis?.competitorMentions.filter((competitor) => isConfirmedCompetitorName(competitor.name, confirmedNames)).forEach((competitor) => {
      const theme = run.analysis?.recommendationReason.trim() || run.analysis?.rankingReason.trim() || `在“${run.promptText}”场景中获得推荐`;
      const key = `${normalizeText(competitor.name)}:${normalizeText(theme)}`;
      const current = themes.get(key) ?? {
        competitorName: competitor.name.trim(),
        theme,
        platforms: new Map<string, number>(),
        questions: new Set<string>(),
        runIds: new Set<string>()
      };
      current.platforms.set(run.response.platformCode, (current.platforms.get(run.response.platformCode) ?? 0) + 1);
      current.questions.add(run.promptText);
      current.runIds.add(run.id);
      themes.set(key, current);
    });
  });

  return [...themes.values()]
    .map((theme) => ({
      competitorName: theme.competitorName,
      theme: theme.theme,
      evidenceCount: theme.runIds.size,
      platformDistribution: toPlatformDistribution(theme.platforms),
      questionExamples: [...theme.questions].slice(0, 3),
      runIds: [...theme.runIds]
    }))
    .sort((left, right) => right.evidenceCount - left.evidenceCount || left.competitorName.localeCompare(right.competitorName));
}

function buildCitedDomains(
  runs: Array<MonitoringRunDetail & { response: NonNullable<MonitoringRunDetail['response']> }>,
  contentAssets: ContentAsset[]
): OpportunityCitedDomain[] {
  const contentAssetDomains = contentAssets.map((asset) => extractDomain(asset.url)).filter((domain): domain is string => Boolean(domain));
  const officialAssetDomains = contentAssets
    .filter((asset) => asset.platform === 'official_site')
    .map((asset) => extractDomain(asset.url))
    .filter((domain): domain is string => Boolean(domain));
  const domains = new Map<string, {
    domain: string;
    sourceType: CitationSourceType;
    citationCount: number;
    runIds: Set<string>;
    platforms: Map<string, number>;
    positions: OpportunityCitedDomain['positions'];
    contentAssetCovered: boolean;
  }>();

  runs.forEach((run) => {
    run.response.citations.forEach((url, index) => {
      const domain = extractDomain(url);
      if (!domain) return;
      const contentAssetCovered = contentAssetDomains.some((assetDomain) => domainsOverlap(domain, assetDomain));
      const current = domains.get(domain) ?? {
        domain,
        sourceType: classifySourceType(domain, officialAssetDomains.some((assetDomain) => domainsOverlap(domain, assetDomain))),
        citationCount: 0,
        runIds: new Set<string>(),
        platforms: new Map<string, number>(),
        positions: [],
        contentAssetCovered
      };
      current.citationCount += 1;
      current.runIds.add(run.id);
      current.platforms.set(run.response.platformCode, (current.platforms.get(run.response.platformCode) ?? 0) + 1);
      current.positions.push({
        runId: run.id,
        question: run.promptText,
        platformCode: run.response.platformCode,
        citationIndex: index + 1,
        label: `回答引用列表第 ${index + 1} 位`,
        url
      });
      domains.set(domain, current);
    });
  });

  return [...domains.values()]
    .map((domain) => ({
      domain: domain.domain,
      sourceType: domain.sourceType,
      citationCount: domain.citationCount,
      runCount: domain.runIds.size,
      platformDistribution: toPlatformDistribution(domain.platforms),
      positions: domain.positions,
      contentAssetCovered: domain.contentAssetCovered
    }))
    .sort((left, right) => right.citationCount - left.citationCount || left.domain.localeCompare(right.domain));
}

function buildContentOpportunities(runs: MonitoringRunDetail[], confirmedNames: Set<string>): OpportunityContentItem[] {
  const opportunities: OpportunityContentItem[] = [];
  runs.forEach((run) => {
    const analysis = run.analysis;
    if (!analysis) return;
    if (!analysis.brandMentioned) {
      opportunities.push(createContentOpportunity(run, 'brand_absent', '品牌在真实回答中缺席', 'high', [analysis.platformEvaluation]));
    }
    const confirmedMentions = analysis.competitorMentions.filter((item) => isConfirmedCompetitorName(item.name, confirmedNames));
    if (confirmedMentions.some((item) => item.rank !== null && (analysis.brandRank === null || item.rank < analysis.brandRank))) {
      opportunities.push(createContentOpportunity(run, 'competitor_dominant', '竞品在推荐顺序中占优', 'high', [analysis.rankingReason, ...confirmedMentions.map((item) => `${item.name} 排名 ${item.rank ?? '未知'}`)]));
    }
    if (analysis.citationScore < 60 || /缺|未覆盖|不完整/.test(analysis.expressionCompleteness)) {
      opportunities.push(createContentOpportunity(run, 'content_gap', '内容与引用覆盖不足', 'medium', [analysis.expressionCompleteness, `引用得分 ${analysis.citationScore}`]));
    }
    if (analysis.accuracyScore < 70 || /错误|不一致|偏差|冲突/.test(analysis.expressionDeviation)) {
      opportunities.push(createContentOpportunity(run, 'fact_inconsistent', '品牌事实表达需要校正', analysis.accuracyScore < 50 ? 'high' : 'medium', [analysis.expressionDeviation, `准确度 ${analysis.accuracyScore}`]));
    }
  });

  const merged = new Map<string, OpportunityContentItem>();
  opportunities.forEach((item) => {
    const key = `${item.type}:${normalizeText(item.question)}`;
    const current = merged.get(key);
    if (!current) {
      merged.set(key, item);
      return;
    }
    current.evidence = [...new Set([...current.evidence, ...item.evidence])];
    current.runIds = [...new Set([...current.runIds, ...item.runIds])];
    if (priorityScore(item.priority) > priorityScore(current.priority)) current.priority = item.priority;
  });
  return [...merged.values()]
    .sort((left, right) => diagnosticTypes.indexOf(left.type) - diagnosticTypes.indexOf(right.type) || priorityScore(right.priority) - priorityScore(left.priority));
}

function createContentOpportunity(
  run: MonitoringRunDetail,
  type: OpportunityDiagnosticType,
  title: string,
  priority: OpportunityContentItem['priority'],
  evidence: string[]
): OpportunityContentItem {
  return {
    id: `${type}-${run.id}`,
    type,
    priority,
    title,
    question: run.promptText,
    platformCode: run.response?.platformCode ?? run.platformCode,
    evidence: evidence.map((item) => item.trim()).filter(Boolean),
    runIds: [run.id]
  };
}

function buildChannelRecommendations(citedDomains: OpportunityCitedDomain[]): OpportunityChannelRecommendation[] {
  const recommendations: OpportunityChannelRecommendation[] = citedDomains.map((domain) => {
    return {
      id: `domain-${domain.domain}`,
      channel: sourceTypeLabels[domain.sourceType],
      domain: domain.domain,
      sourceType: domain.sourceType,
      basis: domain.contentAssetCovered ? 'brand_sample' : 'industry_sample',
      evidenceCount: domain.citationCount,
      platformDistribution: domain.platformDistribution,
      rationale: `${domain.domain} 在 ${domain.runCount} 条真实回答中被引用 ${domain.citationCount} 次，建议优先评估内容覆盖与分发可行性。`,
      priority: domain.citationCount >= 3 ? 'high' : 'medium'
    };
  });

  if (citedDomains.length < 3) {
    const observedTypes = new Set(citedDomains.map((domain) => domain.sourceType));
    (Object.keys(sourceTypeLabels) as CitationSourceType[]).forEach((sourceType) => {
      if (recommendations.length >= 3 || observedTypes.has(sourceType)) return;
      recommendations.push({
        id: `reference-${sourceType}`,
        channel: sourceTypeLabels[sourceType],
        sourceType,
        basis: 'industry_reference',
        evidenceCount: 0,
        platformDistribution: [],
        rationale: '当前真实引用样本较少，该渠道来自公共渠道分类参考，需通过后续真实样本验证。',
        priority: 'low'
      });
    });
  }

  return recommendations;
}

function toPlatformDistribution(platforms: Map<string, number>): OpportunityPlatformDistribution[] {
  return [...platforms.entries()]
    .map(([platformCode, sampleCount]) => ({ platformCode, sampleCount }))
    .sort((left, right) => right.sampleCount - left.sampleCount || left.platformCode.localeCompare(right.platformCode));
}

function extractDomain(value: string): string | undefined {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    return url.hostname.toLowerCase().replace(/^www\./, '');
  } catch {
    return undefined;
  }
}

function classifySourceType(domain: string, officialAssetCovered: boolean): CitationSourceType {
  if (officialAssetCovered) return 'official_site';
  if (/baike|wikipedia|wikimedia/.test(domain)) return 'encyclopedia';
  if (/weixin|weibo|xiaohongshu|douyin|bilibili/.test(domain)) return 'social';
  if (/people\.com|xinhuanet|36kr|sohu|sina|qq\.com|thepaper/.test(domain)) return 'media';
  return 'third_party';
}

function domainsOverlap(left: string, right: string): boolean {
  return left === right || left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s，。！？、,.!?；;：:“”"'（）()【】\[\]]+/g, '');
}

function priorityScore(priority: OpportunityContentItem['priority']): number {
  if (priority === 'high') return 3;
  if (priority === 'medium') return 2;
  return 1;
}
