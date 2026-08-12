import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import type {
  GenerateTechnicalAssetsInput,
  TechnicalAssetRecord,
  TechnicalAssetSourceFact,
  TechnicalAssetType
} from '@geo-platform/shared-types';
import { PERMISSIONS_REPOSITORY, type PermissionsRepositoryPort } from '../permissions/permissions.repository.port';
import { QUICK_START_REPOSITORY, type QuickStartRepositoryPort } from '../quick-start/quick-start.repository.port';

const allAssetTypes: TechnicalAssetType[] = [
  'llms_txt',
  'organization_jsonld',
  'faqpage_jsonld',
  'article_jsonld',
  'faq_content_block',
  'deployment_instructions'
];

@Injectable()
export class TechnicalAssetService {
  constructor(
    @Inject(QUICK_START_REPOSITORY) private readonly quickStartRepository: QuickStartRepositoryPort,
    @Inject(PERMISSIONS_REPOSITORY) private readonly permissionsRepository: PermissionsRepositoryPort
  ) {}

  async generate(userId: string, brandId: string, input: GenerateTechnicalAssetsInput): Promise<TechnicalAssetRecord[]> {
    const profile = await this.permissionsRepository.getBrandProfile(userId, brandId);
    if (!profile) throw new NotFoundException('品牌不存在或无权访问');

    const session = await this.quickStartRepository.findByBrandId(brandId);
    const sourceFacts = (session?.draft.facts?.candidates ?? []).flatMap<TechnicalAssetSourceFact>((candidate) => {
      if (candidate.status !== 'confirmed' && candidate.status !== 'edited') return [];
      const value = (candidate.editedValue ?? candidate.extractedValue).trim();
      if (!value) return [];
      return [{
        candidateId: candidate.id,
        fieldKey: candidate.fieldKey,
        value,
        status: candidate.status,
        sourceId: candidate.sourceId,
        url: candidate.url,
        title: candidate.title,
        excerpt: candidate.excerpt
      }];
    });
    if (!sourceFacts.length) throw validationError('TECHNICAL_ASSET_CONFIRMED_FACTS_REQUIRED', '请先确认品牌事实');

    const facts = new Map(sourceFacts.map((fact) => [fact.fieldKey, fact.value]));
    const name = firstFact(facts, 'name', 'brandName');
    const website = firstFact(facts, 'website', 'url');
    const intro = firstFact(facts, 'intro', 'description');
    if (!name || !website || !intro) {
      throw validationError('TECHNICAL_ASSET_CORE_FACTS_REQUIRED', '生成技术资产需要已确认的品牌名称、官网和介绍');
    }

    const targetPage = validateTargetPage(input.targetPage, website);
    const requestedTypes = normalizeTypes(input.assetTypes);
    const context = { name, website, intro, markets: splitFact(firstFact(facts, 'targetMarkets', 'targetMarket')), targetPage };
    const records: TechnicalAssetRecord[] = [];
    for (const type of requestedTypes) {
      const generated = renderAsset(type, context);
      const record = await this.permissionsRepository.createTechnicalContentAsset(userId, brandId, {
        title: generated.title,
        type,
        targetPage: type === 'llms_txt' ? new URL('/llms.txt', website).toString() : targetPage,
        body: generated.body,
        sourceFacts,
        reviewStatus: 'pending'
      });
      if (!record) throw new NotFoundException('技术资产保存失败');
      records.push(record);
    }
    return records;
  }
}

type RenderContext = { name: string; website: string; intro: string; markets: string[]; targetPage: string };

function renderAsset(type: TechnicalAssetType, context: RenderContext): { title: string; body: string } {
  const { name, website, intro, markets, targetPage } = context;
  if (type === 'llms_txt') return {
    title: `${name} llms.txt`,
    body: [`# ${name}`, `> ${intro}`, '', '## Official Website', `- ${website}`, ...(markets.length ? ['', '## Target Markets', ...markets.map((market) => `- ${market}`)] : [])].join('\n')
  };
  if (type === 'organization_jsonld') return jsonLd(`${name} Organization JSON-LD`, {
    '@context': 'https://schema.org', '@type': 'Organization', name, url: website, description: intro,
    ...(markets.length ? { areaServed: markets } : {})
  });
  if (type === 'faqpage_jsonld') return jsonLd(`${name} FAQPage JSON-LD`, {
    '@context': 'https://schema.org', '@type': 'FAQPage', mainEntity: [{
      '@type': 'Question', name: `${name}是什么？`, acceptedAnswer: { '@type': 'Answer', text: intro }
    }]
  });
  if (type === 'article_jsonld') return jsonLd(`${name} Article JSON-LD`, {
    '@context': 'https://schema.org', '@type': 'Article', headline: `关于${name}`, description: intro,
    mainEntityOfPage: targetPage, author: { '@type': 'Organization', name, url: website }
  });
  if (type === 'faq_content_block') return {
    title: `${name} FAQ 内容块`,
    body: `<section class="faq" aria-labelledby="faq-title">\n  <h2 id="faq-title">常见问题</h2>\n  <article>\n    <h3>${escapeHtml(name)}是什么？</h3>\n    <p>${escapeHtml(intro)}</p>\n  </article>\n</section>`
  };
  return {
    title: `${name} 技术资产部署说明`,
    body: [`# 部署说明`, '', `目标页面：${targetPage}`, '', '- 将 llms.txt 部署到站点根路径 `/llms.txt`。', '- 将 Organization JSON-LD 放入官网首页。', '- 将 FAQPage JSON-LD 与 FAQ 内容块部署到同一目标页面。', '- 将 Article JSON-LD 放入对应文章页面。', '- 部署后重新运行站点审计 checker，并保留响应证据。'].join('\n')
  };
}

function jsonLd(title: string, value: Record<string, unknown>): { title: string; body: string } {
  return { title, body: JSON.stringify(value, null, 2) };
}

function validateTargetPage(value: string, website: string): string {
  try {
    const target = new URL(value);
    const origin = new URL(website).origin;
    if (!['http:', 'https:'].includes(target.protocol) || target.origin !== origin || target.username || target.password) throw new Error();
    target.hash = '';
    return target.toString();
  } catch {
    throw validationError('TECHNICAL_ASSET_TARGET_INVALID', '目标页面必须是已确认官网的同源 HTTP(S) 地址');
  }
}

function normalizeTypes(types?: TechnicalAssetType[]): TechnicalAssetType[] {
  if (!types?.length) return allAssetTypes;
  const unique = [...new Set(types)];
  if (unique.some((type) => !allAssetTypes.includes(type))) {
    throw validationError('TECHNICAL_ASSET_TYPE_INVALID', '技术资产类型无效');
  }
  return unique;
}

function firstFact(facts: Map<string, string>, ...keys: string[]): string {
  for (const key of keys) {
    const value = facts.get(key)?.trim();
    if (value) return value;
  }
  return '';
}

function splitFact(value: string): string[] {
  return value.split(/[,，;；\n]/).map((item) => item.trim()).filter(Boolean);
}

function escapeHtml(value: string): string {
  return value.replace(/[&<>"']/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[character] ?? character);
}

function validationError(code: string, message: string): BadRequestException {
  return new BadRequestException({ code, message });
}
