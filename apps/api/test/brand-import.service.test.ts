import { describe, expect, it } from 'vitest';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BrandImportService } from '../src/modules/brands/brand-import.service';

describe('BrandImportService', () => {
  it('extracts high-confidence brand fields from markdown sections', () => {
    const service = new BrandImportService();
    const draft = service.parseText(
      'brand_demo',
      'source_demo',
      '追光小牛品牌资料.md',
      'markdown',
      `# 追光小牛
行业：儿童运动教育
深耕城市：贵阳
服务对象：2-14 岁儿童家庭

## 品牌介绍
追光小牛是贵州本土儿童运动连锁品牌。

## 核心卖点
- ACE 成长体系
- 贵阳五家校区

## 课程体系
- 快乐体操
- 少儿跑酷

## 权威背书
- 多届体操世界冠军联合创始

## 禁用表达
- 保证长高

## FAQ
Q: 适合几岁孩子？
A: 适合 2-14 岁儿童。`
    );

    expect(draft.status).toBe('ready_for_confirmation');
    expect(fieldValue(draft, 'name')).toBe('追光小牛');
    expect(fieldValue(draft, 'industry')).toBe('儿童运动教育');
    expect(fieldValue(draft, 'targetCities')).toEqual(['贵阳']);
    expect(fieldValue(draft, 'offerings')).toContain('快乐体操');
    expect(fieldValue(draft, 'blockedExpressions')).toContain('保证长高');
    expect(draft.confidenceSummary.high).toBeGreaterThan(0);
  });

  it('marks missing fields as needing confirmation', () => {
    const service = new BrandImportService();
    const draft = service.parseText('brand_demo', 'source_empty', 'empty.md', 'markdown', '# 追光小牛');

    expect(draft.missingFields).toContain('industry');
    expect(draft.fields.find((field) => field.key === 'industry')?.confidence).toBe('needs_confirmation');
  });

  it('parses uploaded markdown sources from knowledge source files', async () => {
    const service = new BrandImportService();
    const fileRef = writeFixtureFile(
      'brand-import-success.md',
      `# 追光小牛
行业：儿童运动教育

## 品牌介绍
追光小牛是贵阳儿童运动成长品牌。

## 核心卖点
- ACE 成长体系`
    );
    const draft = await service.parseKnowledgeSource('brand_demo', {
      id: 'source_markdown_success',
      brandId: 'brand_demo',
      name: '追光小牛.md',
      sourceType: 'file',
      fileRef,
      status: 'processing',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    expect(draft.status).toBe('ready_for_confirmation');
    expect(fieldValue(draft, 'industry')).toBe('儿童运动教育');
    expect(fieldValue(draft, 'valueProps')).toContain('ACE 成长体系');
  });

  it('returns user-readable failed drafts for damaged word and pdf files', async () => {
    const service = new BrandImportService();
    const wordRef = writeFixtureFile('brand-import.docx', 'word placeholder');
    const pdfRef = writeFixtureFile('brand-import.pdf', 'pdf placeholder');

    const wordDraft = await service.parseKnowledgeSource('brand_demo', createFileSource('source_word', 'brand.docx', wordRef));
    const pdfDraft = await service.parseKnowledgeSource('brand_demo', createFileSource('source_pdf', 'brand.pdf', pdfRef));

    expect(wordDraft.status).toBe('failed');
    expect(wordDraft.errorMessage).toContain('DOCX');
    expect(pdfDraft.status).toBe('failed');
    expect(pdfDraft.missingFields).toContain('intro');
  });

  it('rejects unsupported import file formats', async () => {
    const service = new BrandImportService();

    await expect(service.parseKnowledgeSource('brand_demo', createFileSource('source_txt', 'brand.txt', 'uploads/brand.txt'))).rejects.toThrow(
      '第一版仅支持 Markdown、Word 和 PDF 品牌资料'
    );
  });

  it('builds brand and profile payloads from confirmed fields', () => {
    const service = new BrandImportService();
    const payload = service.buildConfirmationPayload({
      fields: [
        { key: 'name', value: '追光小牛' },
        { key: 'aliases', value: ['SUPERCALF'] },
        { key: 'industry', value: '儿童运动教育' },
        { key: 'targetCities', value: ['贵阳'] },
        { key: 'businessScope', value: '儿童运动成长课' },
        { key: 'targetAudience', value: '2-14 岁儿童家庭' },
        { key: 'intro', value: '贵州本土儿童运动连锁品牌' },
        { key: 'valueProps', value: ['ACE 成长体系'] },
        { key: 'offerings', value: ['快乐体操', '少儿跑酷'] },
        { key: 'blockedExpressions', value: ['保证长高'] },
        { key: 'faqs', value: [{ question: '适合几岁？', answer: '2-14 岁。' }] }
      ]
    });

    expect(payload.brand.name).toBe('追光小牛');
    expect(payload.brand.targetCities).toEqual(['贵阳']);
    expect(payload.profile.valueProps).toEqual(['ACE 成长体系']);
    expect(payload.profile.faqs[0]).toEqual({ question: '适合几岁？', answer: '2-14 岁。' });
  });
});

function fieldValue(draft: ReturnType<BrandImportService['parseText']>, key: string) {
  return draft.fields.find((field) => field.key === key)?.value;
}

function writeFixtureFile(fileName: string, content: string) {
  const dir = join(process.cwd(), 'uploads', 'brand-imports');
  mkdirSync(dir, { recursive: true });
  const filePath = join(dir, `${Date.now()}-${fileName}`);
  writeFileSync(filePath, content, 'utf8');
  return `uploads/brand-imports/${filePath.slice(filePath.lastIndexOf('/') + 1)}`;
}

function createFileSource(id: string, name: string, fileRef: string) {
  return {
    id,
    brandId: 'brand_demo',
    name,
    sourceType: 'file' as const,
    fileRef,
    status: 'processing' as const,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
}
