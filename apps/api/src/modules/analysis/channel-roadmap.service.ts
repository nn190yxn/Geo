import { Injectable } from '@nestjs/common';
import type {
  BrandId,
  ChannelRoadmap,
  ChannelRoadmapItem,
  CitationSourceType,
  ContentAsset,
  MediaPlatformRule,
  OpportunityChannelRecommendation,
  OpportunityMap,
  OptimizationUnitPriority
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { OpportunityDiscoveryService } from './opportunity-discovery.service';

const sourceDefaults: Record<CitationSourceType, { formats: string[]; cadence: string; ownerRole: string }> = {
  official_site: { formats: ['官网 FAQ', '产品页', '案例页'], cadence: '每月更新 2-4 次', ownerRole: '品牌内容负责人' },
  media: { formats: ['行业观点', '案例报道', '数据解读'], cadence: '每月发布 2 篇', ownerRole: '媒体渠道负责人' },
  social: { formats: ['专业短内容', '问答合集', '用户案例'], cadence: '每周发布 2-3 次', ownerRole: '社媒运营负责人' },
  encyclopedia: { formats: ['品牌词条', '产品知识', '事实资料'], cadence: '每月核验 1 次', ownerRole: '品牌资料负责人' },
  third_party: { formats: ['专业问答', '评测对比', '行业案例'], cadence: '每月发布 2-3 篇', ownerRole: '渠道运营负责人' }
};

const windowByPriority = {
  high: '0_30_days',
  medium: '30_60_days',
  low: '60_90_days'
} as const;

@Injectable()
export class ChannelRoadmapService {
  constructor(
    private readonly opportunityDiscoveryService: OpportunityDiscoveryService,
    private readonly permissionsService: PermissionsService
  ) {}

  async getRoadmap(userId: string, brandId: BrandId): Promise<ChannelRoadmap | null> {
    const [map, contentAssets, platformRules] = await Promise.all([
      this.opportunityDiscoveryService.getMap(userId, brandId),
      Promise.resolve(this.permissionsService.listContentAssets(userId, brandId)),
      this.permissionsService.listMediaPlatformRules(userId, brandId)
    ]);
    if (!map || !contentAssets || !platformRules) return null;

    return {
      brandId,
      measurementStatus: map.measurementStatus,
      sampleCount: map.sampleCount,
      items: map.channelRecommendations.map((recommendation) => buildRoadmapItem(recommendation, map, contentAssets, platformRules)),
      generatedAt: new Date().toISOString(),
      generationMethod: 'deterministic'
    };
  }
}

function buildRoadmapItem(
  recommendation: OpportunityChannelRecommendation,
  map: OpportunityMap,
  contentAssets: ContentAsset[],
  platformRules: MediaPlatformRule[]
): ChannelRoadmapItem {
  const defaults = sourceDefaults[recommendation.sourceType];
  const matchingRule = findMatchingRule(recommendation, platformRules);
  const matchingAssets = contentAssets.filter((asset) => assetMatchesRecommendation(asset, recommendation));
  const gapCount = map.contentOpportunities.filter((item) => item.priority === recommendation.priority).length;
  const targetQuantity = quantityForPriority(recommendation.priority) + Math.min(gapCount, 2);
  const targetDomain = recommendation.domain;
  const sampleCovered = Boolean(targetDomain && map.citedDomains.some((item) => domainsOverlap(item.domain, targetDomain)));

  return {
    id: `roadmap-${recommendation.id}`,
    channelCode: recommendation.domain ?? recommendation.sourceType,
    channelName: matchingRule?.name ?? recommendation.channel,
    domain: recommendation.domain,
    contentFormats: matchingRule?.contentFormats.length ? matchingRule.contentFormats : defaults.formats,
    recommendedQuantity: Math.max(1, targetQuantity - matchingAssets.length),
    cadence: matchingRule?.recommendedFrequency || defaults.cadence,
    ownerRole: defaults.ownerRole,
    priority: recommendation.priority,
    evidence: buildEvidence(recommendation, matchingAssets.length, gapCount),
    window: windowByPriority[recommendation.priority],
    coverageStatus: sampleCovered ? 'sample_covered' : 'planned'
  };
}

function findMatchingRule(recommendation: OpportunityChannelRecommendation, rules: MediaPlatformRule[]): MediaPlatformRule | undefined {
  const terms = [recommendation.channel, recommendation.domain, recommendation.sourceType === 'official_site' ? '官网' : undefined]
    .filter((item): item is string => Boolean(item))
    .map(normalizeText);
  return rules.find((rule) => terms.some((term) => normalizeText(`${rule.platform}${rule.name}`).includes(term) || term.includes(normalizeText(rule.name))));
}

function assetMatchesRecommendation(asset: ContentAsset, recommendation: OpportunityChannelRecommendation): boolean {
  const assetDomain = extractDomain(asset.url);
  if (recommendation.domain && assetDomain && domainsOverlap(assetDomain, recommendation.domain)) return true;
  if (recommendation.sourceType === 'official_site') return asset.platform === 'official_site' || asset.platform === 'website';
  return normalizeText(asset.platform).includes(normalizeText(recommendation.channel));
}

function buildEvidence(recommendation: OpportunityChannelRecommendation, assetCount: number, gapCount: number): string[] {
  const evidence = [recommendation.rationale];
  if (recommendation.evidenceCount > 0) evidence.push(`${recommendation.evidenceCount} 次真实样本引用`);
  if (assetCount > 0) evidence.push(`已有 ${assetCount} 项渠道内容资产`);
  if (gapCount > 0) evidence.push(`${gapCount} 项同优先级内容缺口待补强`);
  return evidence;
}

function quantityForPriority(priority: OptimizationUnitPriority): number {
  if (priority === 'high') return 4;
  if (priority === 'medium') return 3;
  return 2;
}

function extractDomain(value: string): string | undefined {
  try {
    const url = new URL(value);
    return ['http:', 'https:'].includes(url.protocol) ? url.hostname.toLowerCase().replace(/^www\./, '') : undefined;
  } catch {
    return undefined;
  }
}

export function domainsOverlap(left: string, right: string): boolean {
  const normalizedLeft = normalizeDomain(left);
  const normalizedRight = normalizeDomain(right);
  return Boolean(normalizedLeft && normalizedRight && (
    normalizedLeft === normalizedRight
    || normalizedLeft.endsWith(`.${normalizedRight}`)
    || normalizedRight.endsWith(`.${normalizedLeft}`)
  ));
}

function normalizeDomain(value: string): string | undefined {
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    return url.hostname.toLocaleLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  } catch {
    return undefined;
  }
}

function normalizeText(value: string): string {
  return value.trim().toLocaleLowerCase().replace(/[\s_-]+/g, '');
}
