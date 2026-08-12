import { Inject, Injectable, Optional } from '@nestjs/common';
import type {
  ContentReadinessCheck,
  ContentReadinessCheckStatus,
  ContentReadinessFactMapping,
  ContentReadinessInput,
  ContentReadinessResult,
  QuickStartFactCandidate
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { QUICK_START_REPOSITORY, type QuickStartRepositoryPort } from '../quick-start/quick-start.repository.port';
import { KnowledgeRetrievalService } from '../brands/knowledge-retrieval.service';

const CONTENT_RULE_VERSION = '2026-08-content-quality-v1';

@Injectable()
export class ContentReadinessService {
  constructor(
    private readonly permissionsService: PermissionsService,
    @Inject(QUICK_START_REPOSITORY) private readonly quickStartRepository: QuickStartRepositoryPort,
    @Optional() private readonly knowledgeRetrievalService?: KnowledgeRetrievalService
  ) {}

  async inspect(userId: string, brandId: string, assetId: string, input: ContentReadinessInput): Promise<ContentReadinessResult | null> {
    const [assets, profile, session, platformRules] = await Promise.all([
      this.permissionsService.listContentAssets(userId, brandId, {}),
      Promise.resolve(this.permissionsService.getBrandProfile(userId, brandId)),
      this.quickStartRepository.findByBrandId(brandId),
      this.permissionsService.listMediaPlatformRules(userId, brandId)
    ]);
    const asset = assets?.find((item) => item.id === assetId);
    if (!asset || !profile || !platformRules) return null;

    const body = input.body.trim();
    if (body) {
      await this.knowledgeRetrievalService?.query(userId, brandId, {
        query: body.slice(0, 500),
        limit: 10,
        purpose: 'fact_analysis',
        resourceId: assetId
      });
    }
    const platform = input.targetPlatform?.trim() || asset.platform;
    const rule = platformRules.find((item) => item.platform.toLowerCase() === platform.toLowerCase());
    const correctionRoot = `/brands/${brandId}/content-assets/${assetId}/edit`;
    const contentType = input.contentType?.trim() || asset.type;
    const candidates = session?.draft.facts?.candidates ?? [];
    const paragraphs = splitParagraphs(body);
    const factMappings = buildFactMappings(body, candidates, session?.updatedAt, correctionRoot);
    const riskParagraphs = paragraphs.flatMap((text, paragraphIndex) => {
      const mappings = buildFactMappings(text, candidates, session?.updatedAt, correctionRoot);
      const unsupportedNumbers = extractContentNumbers(text).filter((claim) => !factMappings.some((mapping) => mapping.source && extractNumbers(mapping.claim).includes(claim)));
      const blockedExpressions = profile.blockedExpressions.filter((expression) => expression && includesText(text, expression));
      const pendingMappings = mappings.filter((mapping) => mapping.source && mapping.confirmationStatus === 'pending');
      const reasons = [
        pendingMappings.length ? '段落包含待确认事实' : '',
        unsupportedNumbers.length ? `段落包含无来源数字：${unsupportedNumbers.join('、')}` : '',
        blockedExpressions.length ? `段落包含超出品牌资料的表达：${blockedExpressions.join('、')}` : ''
      ].filter(Boolean);
      return reasons.length ? [{
        paragraphIndex,
        text,
        reason: reasons.join('；'),
        correctionPath: `${correctionRoot}?section=paragraph&index=${paragraphIndex}`,
        factMappings: mappings
      }] : [];
    });

    const checks: ContentReadinessCheck[] = [
      check('definition_block', hasDefinitionBlock(body), '定义块', `${correctionRoot}?section=structure`),
      check('faq', hasFaq(body), 'FAQ', `${correctionRoot}?section=faq`),
      check('steps', hasSteps(body), '步骤说明', `${correctionRoot}?section=steps`),
      check('comparison_table', hasComparisonTable(body), '比较表', `${correctionRoot}?section=comparison`),
      riskCheck('numeric_basis', !riskParagraphs.some((item) => item.reason.includes('无来源数字')), '数字依据', `${correctionRoot}?section=sources`),
      check('author', Boolean(input.author?.trim()), '作者信息', `${correctionRoot}?section=metadata`),
      check('updated_at', isValidDate(input.updatedAt), '更新时间', `${correctionRoot}?section=metadata`),
      check('external_references', hasExternalReference(body), '外部引用', `${correctionRoot}?section=sources`),
      structuredDataCheck(input.structuredData, correctionRoot),
      channelCheck(Boolean(rule), platform, rule?.contentFormats ?? [], correctionRoot),
      ...contentTypeChecks(body, contentType, correctionRoot)
    ];
    const hasFailure = checks.some((item) => item.status === 'fail');
    const hasWarning = checks.some((item) => item.status === 'warning');

    return {
      brandId,
      assetId,
      targetPlatform: platform,
      checkedAt: new Date().toISOString(),
      ruleVersion: CONTENT_RULE_VERSION,
      status: hasFailure ? 'blocked' : hasWarning ? 'needs_review' : 'ready',
      checks,
      factMappings,
      riskParagraphs,
      channelRequirements: {
        formats: rule?.contentFormats ?? [],
        characterCount: Array.from(body).length,
        coverRatio: rule?.coverRatio,
        publishingNote: rule?.publishingNote,
        requiredLinks: true,
        requiredReview: true,
        requiresRetestPlan: true
      }
    };
  }
}

function splitParagraphs(body: string): string[] {
  return body.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean);
}

function buildFactMappings(body: string, candidates: QuickStartFactCandidate[], verifiedAt: string | undefined, correctionRoot: string): ContentReadinessFactMapping[] {
  const mappings: ContentReadinessFactMapping[] = candidates.flatMap((candidate): ContentReadinessFactMapping[] => {
    if (candidate.status === 'rejected') return [];
    const claim = candidate.status === 'edited' ? candidate.editedValue?.trim() : candidate.extractedValue.trim();
    if (!claim || !includesText(body, claim)) return [];
    const confirmationStatus: ContentReadinessFactMapping['confirmationStatus'] = candidate.status === 'pending' ? 'pending' : candidate.status;
    return [{
      claim,
      kind: extractNumbers(claim).length ? 'number' as const : 'brand_fact' as const,
      source: {
        sourceId: candidate.sourceId,
        url: candidate.url,
        title: candidate.title,
        excerpt: candidate.excerpt,
        verifiedAt: verifiedAt ?? '',
        confirmationStatus
      },
      confirmationStatus,
      correctionPath: `${correctionRoot}?section=sources&factId=${candidate.id}`
    }];
  });
  const mappedNumbers = new Set(mappings.flatMap((mapping) => extractNumbers(mapping.claim)));
  for (const claim of extractContentNumbers(body)) {
    if (!mappedNumbers.has(claim)) mappings.push({
      claim,
      kind: 'number',
      confirmationStatus: 'pending',
      correctionPath: `${correctionRoot}?section=sources`
    });
  }
  return mappings;
}

function extractNumbers(value: string): string[] {
  return [...new Set(value.match(/(?:\d[\d,.]*)(?:%|％|万|亿|年|月|日|个|家|次|元)?/g) ?? [])];
}

function extractContentNumbers(value: string): string[] {
  const prose = value
    .replace(/https?:\/\/[^\s)]+/gi, '')
    .replace(/^\s*\d+[.、)]\s*/gm, '');
  return extractNumbers(prose);
}

function includesText(body: string, value: string): boolean {
  return body.toLocaleLowerCase().includes(value.toLocaleLowerCase());
}

function check(key: ContentReadinessCheck['key'], passed: boolean, label: string, correctionPath: string): ContentReadinessCheck {
  return { key, status: passed ? 'pass' : 'warning', summary: passed ? `已包含${label}` : `建议补充${label}`, correctionPath };
}

function riskCheck(key: ContentReadinessCheck['key'], passed: boolean, label: string, correctionPath: string): ContentReadinessCheck {
  return { key, status: passed ? 'pass' : 'fail', summary: passed ? `${label}已核验` : `${label}存在未解决风险`, correctionPath };
}

function hasDefinitionBlock(body: string): boolean {
  return /(?:^|\n)(?:#{1,6}\s*)?(?:定义|什么是|Definition)\b/i.test(body) || /\*\*[^*]+\*\*\s*[：:]/.test(body);
}

function hasFaq(body: string): boolean {
  return /(?:^|\n)#{1,6}\s*(?:FAQ|常见问题)/i.test(body) || /(?:^|\n)(?:Q|问)[：:]/i.test(body);
}

function hasSteps(body: string): boolean {
  return /(?:^|\n)\s*(?:1[.、]|第一步)[\s\S]*\n\s*(?:2[.、]|第二步)/.test(body);
}

function hasComparisonTable(body: string): boolean {
  return /\|[^\n]+\|\n\s*\|?\s*:?-{3,}/.test(body);
}

function hasExternalReference(body: string): boolean {
  return /https?:\/\/[^\s)]+/i.test(body) || /\[[^\]]+\]\([^)]+\)/.test(body);
}

function isValidDate(value?: string): boolean {
  return Boolean(value && !Number.isNaN(Date.parse(value)));
}

function structuredDataCheck(value: string | undefined, correctionRoot: string): ContentReadinessCheck {
  let status: ContentReadinessCheckStatus = 'warning';
  if (value?.trim()) {
    try {
      const parsed = JSON.parse(value) as Record<string, unknown>;
      status = parsed['@context'] && parsed['@type'] ? 'pass' : 'fail';
    } catch {
      status = 'fail';
    }
  }
  return {
    key: 'structured_data',
    status,
    summary: status === 'pass' ? '结构化数据有效' : status === 'fail' ? '结构化数据格式无效' : '建议补充结构化数据',
    correctionPath: `${correctionRoot}?section=structured-data`
  };
}

function channelCheck(hasRule: boolean, platform: string, formats: string[], correctionRoot: string): ContentReadinessCheck {
  return {
    key: 'channel_format',
    status: hasRule ? 'pass' : 'warning',
    summary: hasRule ? `${platform} 支持格式：${formats.join('、')}` : `尚未配置 ${platform} 渠道规则`,
    correctionPath: `${correctionRoot}?section=channel`
  };
}

function contentTypeChecks(body: string, contentType: string, correctionRoot: string): ContentReadinessCheck[] {
  const normalizedType = contentType.toLocaleLowerCase();
  const checks: ContentReadinessCheck[] = [];

  if (/(comparison|compare|对比|竞品)/i.test(normalizedType)) {
    checks.push(
      check('comparison_dimensions', /(?:同(?:一|口径)|比较维度|对比维度|评估维度|评价维度)/i.test(body), '同口径比较维度', contentRulePath(correctionRoot, 'comparison-dimensions')),
      check('comparison_limitations', /(?:自身(?:局限|限制)|局限(?:性)?|限制说明|不适用(?:场景)?)/i.test(body), '自身局限说明', contentRulePath(correctionRoot, 'comparison-limitations')),
      check('comparison_verified_at', /(?:核验日期|最后核验|数据截至|数据更新于|截至\s*\d{4}[-/.年])/i.test(body), '核验日期', contentRulePath(correctionRoot, 'comparison-verified-at'))
    );
  }

  if (/(ranking|rank|list|榜单|推荐)/i.test(normalizedType)) {
    checks.push(
      check('ranking_methodology', /(?:评选方法|排名方法|评估方法|入选标准|推荐标准)/i.test(body), '评选方法', contentRulePath(correctionRoot, 'ranking-methodology')),
      check('ranking_data_sources', /(?:数据来源|数据依据|来源[：:]|根据.{0,24}数据)/i.test(body), '数据来源', contentRulePath(correctionRoot, 'ranking-data-sources')),
      check('ranking_disclosure', /(?:利益(?:关系|披露)|商业合作|赞助(?:关系|说明)?|广告(?:合作|声明)?|推广(?:关系|说明)?|佣金)/i.test(body), '利益关系披露', contentRulePath(correctionRoot, 'ranking-disclosure'))
    );
  }

  const faqAnswers = extractFaqAnswers(body);
  if (hasFaq(body) || faqAnswers.length > 0) {
    checks.push(check(
      'faq_direct_answer',
      faqAnswers.length > 0 && faqAnswers.every(isDirectConclusion),
      'FAQ 首句直接结论',
      contentRulePath(correctionRoot, 'faq-direct-answer')
    ));
  }

  return checks;
}

function contentRulePath(correctionRoot: string, rule: string): string {
  return `${correctionRoot}?section=content-rules&rule=${rule}`;
}

function extractFaqAnswers(body: string): string[] {
  return [...body.matchAll(/(?:^|\n)\s*(?:A|答)[：:]\s*([^\n]+)/gim)].map((match) => match[1].trim()).filter(Boolean);
}

function isDirectConclusion(answer: string): boolean {
  const firstSentence = answer.split(/[。！？!?]/, 1)[0].trim();
  if (!firstSentence || /^(?:这个问题|关于这个|首先|一般来说|通常|很多人|需要根据|视.+而定|取决于)/.test(firstSentence)) return false;
  return true;
}
