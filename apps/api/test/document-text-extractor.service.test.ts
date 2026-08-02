import { describe, expect, it } from 'vitest';
import JSZip from 'jszip';
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { BrandImportService } from '../src/modules/brands/brand-import.service';
import { DocumentTextExtractorService } from '../src/modules/brands/document-text-extractor.service';

describe('DocumentTextExtractorService', () => {
  const service = new DocumentTextExtractorService();

  it('extracts paragraph text from a real DOCX buffer', async () => {
    const buffer = await createDocxBuffer([
      '品牌名称：追光小牛',
      '行业：儿童运动教育',
      '品牌介绍',
      '追光小牛是贵阳儿童运动成长品牌。',
      '核心卖点',
      'ACE 成长体系'
    ]);

    expect(service.validateUpload('品牌资料.docx', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', buffer)).toBe('word');
    await expect(service.extract('word', buffer)).resolves.toContain('追光小牛是贵阳儿童运动成长品牌');
  });

  it('maps extracted DOCX paragraphs into a confirmable brand draft', async () => {
    const buffer = await createDocxBuffer([
      '品牌名称：追光小牛',
      '行业：儿童运动教育',
      '品牌介绍',
      '追光小牛是贵阳儿童运动成长品牌。',
      '核心卖点',
      'ACE 成长体系'
    ]);
    const uploadDir = join(process.cwd(), 'uploads', 'brand-imports');
    const fileName = `brand_demo-${Date.now()}-integration.docx`;
    mkdirSync(uploadDir, { recursive: true });
    writeFileSync(join(uploadDir, fileName), buffer);

    const draft = await new BrandImportService(service).parseKnowledgeSource('brand_demo', {
      id: 'source-docx',
      brandId: 'brand_demo',
      name: '品牌资料.docx',
      sourceType: 'file',
      fileRef: `uploads/brand-imports/${fileName}`,
      status: 'processing',
      createdAt: '2026-07-18T00:00:00.000Z',
      updatedAt: '2026-07-18T00:00:00.000Z'
    });

    expect(draft.status).toBe('ready_for_confirmation');
    expect(draft.fields.find((field) => field.key === 'industry')?.value).toBe('儿童运动教育');
    expect(draft.fields.find((field) => field.key === 'intro')?.value).toContain('贵阳儿童运动成长品牌');
    expect(draft.fields.find((field) => field.key === 'valueProps')?.value).toContain('ACE 成长体系');
  });

  it('extracts text and page count from a real text PDF buffer', async () => {
    const buffer = createPdfBuffer('Brand profile PDF text');

    expect(service.validateUpload('brand.pdf', 'application/pdf', buffer)).toBe('pdf');
    await expect(service.extract('pdf', buffer)).resolves.toContain('Brand profile PDF text');
  });

  it('rejects disguised, binary, and legacy document uploads', async () => {
    expect(() => service.validateUpload('brand.pdf', 'application/pdf', Buffer.from('plain text'))).toThrow('PDF 文件内容与扩展名不一致');
    expect(() => service.validateUpload('brand.md', 'text/markdown', Buffer.from([0, 1, 2]))).toThrow('Markdown 文件包含二进制内容');
    expect(() => service.validateUpload('brand.doc', 'application/msword', Buffer.from('legacy'))).toThrow('另存为 DOCX');
    await expect(service.extract('pdf', Buffer.from('%PDF-invalid'))).rejects.toThrow('PDF 文档无法解析');
  });
});

async function createDocxBuffer(paragraphs: string[]): Promise<Buffer> {
  const zip = new JSZip();
  zip.file('[Content_Types].xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">
      <Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>
      <Default Extension="xml" ContentType="application/xml"/>
      <Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/>
    </Types>`);
  zip.folder('_rels')?.file('.rels', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
      <Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/>
    </Relationships>`);
  zip.folder('word')?.file('document.xml', `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
    <w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>
      ${paragraphs.map((paragraph) => `<w:p><w:r><w:t>${escapeXml(paragraph)}</w:t></w:r></w:p>`).join('')}
      <w:sectPr/>
    </w:body></w:document>`);
  return zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' });
}

function createPdfBuffer(text: string): Buffer {
  const content = `BT /F1 12 Tf 72 720 Td (${escapePdf(text)}) Tj ET`;
  const objects = [
    '<< /Type /Catalog /Pages 2 0 R >>',
    '<< /Type /Pages /Kids [3 0 R] /Count 1 >>',
    '<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 5 0 R >> >> /Contents 4 0 R >>',
    `<< /Length ${Buffer.byteLength(content)} >>\nstream\n${content}\nendstream`,
    '<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>'
  ];
  let pdf = '%PDF-1.4\n';
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(pdf));
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xrefOffset = Buffer.byteLength(pdf);
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  pdf += offsets.slice(1).map((offset) => `${String(offset).padStart(10, '0')} 00000 n \n`).join('');
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefOffset}\n%%EOF`;
  return Buffer.from(pdf);
}

function escapeXml(value: string): string {
  return value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function escapePdf(value: string): string {
  return value.replace(/([\\()])/g, '\\$1');
}
