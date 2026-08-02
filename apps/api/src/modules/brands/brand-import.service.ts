import { BadRequestException, Injectable } from '@nestjs/common';
import { readFile } from 'node:fs/promises';
import { extname, relative, resolve, sep } from 'node:path';
import type {
  BrandFaq,
  BrandId,
  BrandImportConfirmInput,
  BrandImportDraft,
  BrandImportField,
  BrandImportFieldKey,
  BrandMutationInput,
  BrandProfileInput,
  KnowledgeSource,
  SupportedBrandImportFormat
} from '@geo-platform/shared-types';
import { DocumentTextExtractorService } from './document-text-extractor.service';

type FieldValue = BrandImportField['value'];

const importFieldLabels: Record<BrandImportFieldKey, string> = {
  name: '品牌名称',
  aliases: '品牌别名',
  industry: '行业',
  website: '官网',
  targetCities: '目标城市',
  businessScope: '业务范围',
  targetAudience: '目标客户',
  intro: '品牌介绍',
  valueProps: '核心卖点',
  offerings: '课程或产品',
  proofPoints: '权威背书',
  targetCustomers: '目标客户画像',
  recommendedExpressions: '推荐表达',
  blockedExpressions: '禁用表达',
  contentRules: '内容规则',
  competitors: '竞品',
  faqs: 'FAQ'
};

const listFields = new Set<BrandImportFieldKey>([
  'aliases',
  'targetCities',
  'valueProps',
  'offerings',
  'proofPoints',
  'targetCustomers',
  'recommendedExpressions',
  'blockedExpressions',
  'contentRules',
  'competitors'
]);

@Injectable()
export class BrandImportService {
  constructor(private readonly documentTextExtractor: DocumentTextExtractorService = new DocumentTextExtractorService()) {}

  validateUpload(fileName: string, mimeType: string, buffer: Buffer): SupportedBrandImportFormat {
    return this.documentTextExtractor.validateUpload(fileName, mimeType, buffer);
  }

  async parseKnowledgeSource(brandId: BrandId, source: KnowledgeSource): Promise<BrandImportDraft> {
    if (source.brandId !== brandId || source.sourceType !== 'file' || !source.fileRef) {
      throw new BadRequestException('请选择当前品牌下的上传资料文件');
    }

    const format = inferImportFormat(source.fileRef);
    if (!format) {
      throw new BadRequestException('第一版仅支持 Markdown、Word 和 PDF 品牌资料');
    }

    try {
      const filePath = resolveBrandImportFile(source.fileRef);
      const buffer = await readFile(filePath);
      this.documentTextExtractor.validateUpload(source.fileRef, mimeTypeForFormat(format), buffer);
      const text = await this.documentTextExtractor.extract(format, buffer);
      return this.parseText(brandId, source.id, source.name, format, prepareDocumentText(text, format));
    } catch (error) {
      const message = error instanceof BadRequestException
        ? error.message
        : isMissingFileError(error)
          ? '上传文件不存在，请重新上传品牌资料'
          : '文档解析失败，请重新上传或更换文件';
      return this.createFailedDraft(brandId, source, format, message);
    }
  }

  parseText(brandId: BrandId, sourceId: string, fileName: string, format: SupportedBrandImportFormat, text: string): BrandImportDraft {
    const sections = parseMarkdownSections(text);
    const fieldMap = buildFieldMap(text, sections);
    const fields = createImportFields(fieldMap);
    const missingFields = fields.filter((field) => field.value === null).map((field) => field.key);
    const confidenceSummary = fields.reduce(
      (summary, field) => {
        if (field.confidence === 'needs_confirmation') {
          summary.needsConfirmation += 1;
          return summary;
        }

        summary[field.confidence] += 1;
        return summary;
      },
      { high: 0, medium: 0, low: 0, needsConfirmation: 0 }
    );

    return {
      id: `brand_import_${sourceId}`,
      brandId,
      sourceId,
      fileName,
      format,
      status: 'ready_for_confirmation',
      fields,
      confidenceSummary,
      missingFields,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }

  buildConfirmationPayload(input: BrandImportConfirmInput): {
    brand: Partial<BrandMutationInput>;
    profile: BrandProfileInput;
  } {
    const fields = new Map(input.fields.map((field) => [field.key, field.value]));

    return {
      brand: {
        name: getStringField(fields, 'name'),
        aliases: getStringListField(fields, 'aliases'),
        industry: getStringField(fields, 'industry'),
        website: getStringField(fields, 'website'),
        targetCities: getStringListField(fields, 'targetCities'),
        businessScope: getStringField(fields, 'businessScope'),
        targetAudience: getStringField(fields, 'targetAudience')
      },
      profile: {
        intro: getStringField(fields, 'intro') ?? '',
        valueProps: getStringListField(fields, 'valueProps'),
        offerings: getStringListField(fields, 'offerings'),
        proofPoints: getStringListField(fields, 'proofPoints'),
        targetCustomers: getStringListField(fields, 'targetCustomers'),
        recommendedExpressions: getStringListField(fields, 'recommendedExpressions'),
        blockedExpressions: getStringListField(fields, 'blockedExpressions'),
        contentRules: getStringListField(fields, 'contentRules'),
        competitors: getStringListField(fields, 'competitors'),
        faqs: getFaqField(fields, 'faqs')
      }
    };
  }

  private createFailedDraft(brandId: BrandId, source: KnowledgeSource, format: SupportedBrandImportFormat, errorMessage: string): BrandImportDraft {
    const fields = createImportFields(new Map());

    return {
      id: `brand_import_${source.id}`,
      brandId,
      sourceId: source.id,
      fileName: source.name,
      format,
      status: 'failed',
      fields,
      confidenceSummary: { high: 0, medium: 0, low: 0, needsConfirmation: fields.length },
      missingFields: fields.map((field) => field.key),
      errorMessage,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
  }
}

function inferImportFormat(fileRef: string): SupportedBrandImportFormat | null {
  const extension = extname(fileRef).toLowerCase();

  if (extension === '.md' || extension === '.markdown') {
    return 'markdown';
  }

  if (extension === '.docx') {
    return 'word';
  }

  if (extension === '.pdf') {
    return 'pdf';
  }

  return null;
}

function resolveBrandImportFile(fileRef: string): string {
  const uploadRoot = resolve(process.cwd(), 'uploads', 'brand-imports');
  const filePath = resolve(process.cwd(), fileRef);
  const relativePath = relative(uploadRoot, filePath);
  if (!relativePath || relativePath.startsWith(`..${sep}`) || relativePath === '..' || relativePath.includes(sep)) {
    throw new BadRequestException('上传文件路径无效，请重新上传品牌资料');
  }
  return filePath;
}

function mimeTypeForFormat(format: SupportedBrandImportFormat): string {
  if (format === 'markdown') return 'text/markdown';
  if (format === 'word') return 'application/vnd.openxmlformats-officedocument.wordprocessingml.document';
  return 'application/pdf';
}

function isMissingFileError(error: unknown): boolean {
  return error instanceof Error && 'code' in error && error.code === 'ENOENT';
}

function prepareDocumentText(text: string, format: SupportedBrandImportFormat): string {
  if (format === 'markdown') return text;
  const sectionHeadings = ['品牌介绍', '品牌简介', '核心卖点', '课程体系', '产品', '服务', '权威背书', '目标客户画像', '推荐表达', '禁用表达', '内容规则', '竞品', '常见问题', 'FAQ'];
  return text.split('\n').map((line) => sectionHeadings.includes(line.trim()) ? `## ${line.trim()}` : line).join('\n');
}

function parseMarkdownSections(text: string): Map<string, string> {
  const sections = new Map<string, string>();
  const lines = text.split(/\r?\n/);
  let currentHeading = '全文';
  let currentLines: string[] = [];

  for (const line of lines) {
    const heading = line.match(/^#{1,6}\s+(.+)$/);
    if (heading) {
      sections.set(currentHeading, currentLines.join('\n').trim());
      currentHeading = heading[1]?.trim() ?? currentHeading;
      currentLines = [];
      continue;
    }

    currentLines.push(line);
  }

  sections.set(currentHeading, currentLines.join('\n').trim());
  return sections;
}

function buildFieldMap(text: string, sections: Map<string, string>): Map<BrandImportFieldKey, { value: FieldValue; excerpt: string; highConfidence: boolean }> {
  const values = new Map<BrandImportFieldKey, { value: FieldValue; excerpt: string; highConfidence: boolean }>();

  const h1 = text.match(/^#\s+(.+)$/m)?.[1]?.trim();
  setField(values, 'name', findInlineValue(text, ['品牌名称', '品牌名', '名称']) ?? h1 ?? null, text, Boolean(h1));
  setField(values, 'aliases', splitValue(findInlineValue(text, ['品牌别名', '别名', '英文名'])), text, false);
  setField(values, 'industry', findInlineValue(text, ['行业', '所属行业', '业务领域']), text, false);
  setField(values, 'website', findInlineValue(text, ['官网', '网站', '网址']), text, false);
  setField(values, 'targetCities', splitValue(findInlineValue(text, ['目标城市', '服务城市', '深耕城市', '城市'])), text, false);
  setField(values, 'businessScope', findInlineValue(text, ['业务范围', '服务范围', '主营业务']), text, false);
  setField(values, 'targetAudience', findInlineValue(text, ['目标客户', '目标用户', '服务对象']), text, false);

  for (const [heading, content] of sections.entries()) {
    const normalizedHeading = heading.toLowerCase();
    const lines = extractListItems(content);

    if (matchesAny(normalizedHeading, ['品牌介绍', '品牌简介', 'intro'])) {
      setField(values, 'intro', toParagraph(content), content, true);
    } else if (matchesAny(normalizedHeading, ['卖点', '价值', '优势', '定位'])) {
      setField(values, 'valueProps', lines, content, true);
    } else if (matchesAny(normalizedHeading, ['课程', '产品', '服务'])) {
      setField(values, 'offerings', lines, content, true);
    } else if (matchesAny(normalizedHeading, ['背书', '案例', '资质', '数据', '荣誉'])) {
      setField(values, 'proofPoints', lines, content, true);
    } else if (matchesAny(normalizedHeading, ['客户', '用户', '人群', '年龄'])) {
      setField(values, 'targetCustomers', lines, content, true);
    } else if (matchesAny(normalizedHeading, ['推荐表达', '标准表达'])) {
      setField(values, 'recommendedExpressions', lines, content, true);
    } else if (matchesAny(normalizedHeading, ['禁用表达', '风险表达', '避免'])) {
      setField(values, 'blockedExpressions', lines, content, true);
    } else if (matchesAny(normalizedHeading, ['内容规则', '内容要求', '表达规则'])) {
      setField(values, 'contentRules', lines, content, true);
    } else if (matchesAny(normalizedHeading, ['竞品', '竞争'])) {
      setField(values, 'competitors', lines, content, true);
    } else if (matchesAny(normalizedHeading, ['faq', '常见问题', '问答'])) {
      setField(values, 'faqs', extractFaqs(content), content, true);
    }
  }

  return values;
}

function createImportFields(fieldMap: Map<BrandImportFieldKey, { value: FieldValue; excerpt: string; highConfidence: boolean }>): BrandImportField[] {
  return (Object.keys(importFieldLabels) as BrandImportFieldKey[]).map((key) => {
    const result = fieldMap.get(key);
    const normalizedValue = normalizeFieldValue(key, result?.value ?? null);
    const hasValue = Array.isArray(normalizedValue) ? normalizedValue.length > 0 : Boolean(normalizedValue);

    return {
      key,
      label: importFieldLabels[key],
      value: hasValue ? normalizedValue : null,
      confidence: hasValue ? (result?.highConfidence ? 'high' : 'medium') : 'needs_confirmation',
      sourceExcerpt: hasValue ? result?.excerpt.slice(0, 240) : undefined,
      confirmationRequired: !hasValue || !result?.highConfidence
    };
  });
}

function setField(
  values: Map<BrandImportFieldKey, { value: FieldValue; excerpt: string; highConfidence: boolean }>,
  key: BrandImportFieldKey,
  value: FieldValue | undefined,
  excerpt: string,
  highConfidence: boolean
): void {
  if (value === undefined || value === null || values.has(key)) {
    return;
  }

  values.set(key, { value, excerpt, highConfidence });
}

function normalizeFieldValue(key: BrandImportFieldKey, value: FieldValue): FieldValue {
  if (value === null) {
    return null;
  }

  if (key === 'faqs') {
    return Array.isArray(value) ? value.filter((item): item is BrandFaq => typeof item === 'object' && item !== null && 'question' in item && 'answer' in item) : [];
  }

  if (listFields.has(key)) {
    return Array.isArray(value) ? value.map(String).map((item) => item.trim()).filter(Boolean) : splitValue(String(value));
  }

  return Array.isArray(value) ? value.map(String).join('，') : String(value).trim();
}

function findInlineValue(text: string, labels: string[]): string | null {
  for (const label of labels) {
    const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const match = text.match(new RegExp(`${escaped}\\s*[:：]\\s*(.+)`, 'i'));
    const value = match?.[1]?.trim();
    if (value) {
      return value.replace(/^[-*]\s*/, '');
    }
  }

  return null;
}

function extractListItems(text: string): string[] {
  const items = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*\d.、]+\s*/, '').trim())
    .filter(Boolean);

  return items.length > 0 ? items : splitValue(text);
}

function splitValue(value: string | null | undefined): string[] {
  if (!value) {
    return [];
  }

  return value
    .split(/[、,，;；\n]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function toParagraph(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.replace(/^\s*[-*]\s*/, '').trim())
    .filter(Boolean)
    .join('\n');
}

function extractFaqs(text: string): BrandFaq[] {
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const faqs: BrandFaq[] = [];
  let currentQuestion = '';

  for (const line of lines) {
    const question = line.match(/^(?:Q|问|问题)[:：]\s*(.+)$/i)?.[1]?.trim();
    const answer = line.match(/^(?:A|答|回答)[:：]\s*(.+)$/i)?.[1]?.trim();

    if (question) {
      currentQuestion = question;
      continue;
    }

    if (answer && currentQuestion) {
      faqs.push({ question: currentQuestion, answer });
      currentQuestion = '';
    }
  }

  return faqs;
}

function matchesAny(value: string, keywords: string[]): boolean {
  return keywords.some((keyword) => value.includes(keyword.toLowerCase()));
}

function getStringField(fields: Map<BrandImportFieldKey, FieldValue>, key: BrandImportFieldKey): string | undefined {
  const value = fields.get(key);
  if (value === null || value === undefined) {
    return undefined;
  }

  if (Array.isArray(value)) {
    return value.map(String).join('，').trim() || undefined;
  }

  return String(value).trim() || undefined;
}

function getStringListField(fields: Map<BrandImportFieldKey, FieldValue>, key: BrandImportFieldKey): string[] {
  const value = fields.get(key);
  if (value === null || value === undefined) {
    return [];
  }

  if (Array.isArray(value)) {
    return value.map(String).map((item) => item.trim()).filter(Boolean);
  }

  return splitValue(String(value));
}

function getFaqField(fields: Map<BrandImportFieldKey, FieldValue>, key: BrandImportFieldKey): BrandFaq[] {
  const value = fields.get(key);
  if (!Array.isArray(value)) {
    return [];
  }

  return value
    .filter((item): item is BrandFaq => typeof item === 'object' && item !== null && 'question' in item && 'answer' in item)
    .map((item) => ({ question: item.question.trim(), answer: item.answer.trim() }))
    .filter((item) => item.question || item.answer);
}
