import { BadRequestException, Injectable } from '@nestjs/common';
import mammoth from 'mammoth';
import { PDFParse, PasswordException } from 'pdf-parse';
import type { SupportedBrandImportFormat } from '@geo-platform/shared-types';

const maxExtractedTextLength = 500_000;
const maxPdfPages = 200;

@Injectable()
export class DocumentTextExtractorService {
  validateUpload(fileName: string, mimeType: string, buffer: Buffer): SupportedBrandImportFormat {
    const extension = fileName.slice(fileName.lastIndexOf('.')).toLowerCase();

    if (extension === '.md' || extension === '.markdown') {
      if (!['text/markdown', 'text/plain', 'application/octet-stream'].includes(mimeType)) {
        throw new BadRequestException('Markdown 文件类型与扩展名不一致');
      }
      decodeMarkdown(buffer);
      return 'markdown';
    }

    if (extension === '.doc') {
      throw new BadRequestException('旧版 Word 文档暂不支持，请另存为 DOCX 后上传');
    }

    if (extension === '.docx') {
      if (!['application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'application/octet-stream'].includes(mimeType) || !isZip(buffer)) {
        throw new BadRequestException('DOCX 文件内容与扩展名不一致');
      }
      return 'word';
    }

    if (extension === '.pdf') {
      if (!['application/pdf', 'application/octet-stream'].includes(mimeType) || !isPdf(buffer)) {
        throw new BadRequestException('PDF 文件内容与扩展名不一致');
      }
      return 'pdf';
    }

    throw new BadRequestException('仅支持 Markdown、DOCX 和文本型 PDF 品牌资料');
  }

  async extract(format: SupportedBrandImportFormat, buffer: Buffer): Promise<string> {
    let text: string;
    if (format === 'markdown') {
      text = decodeMarkdown(buffer);
    } else if (format === 'word') {
      text = await this.extractWord(buffer);
    } else {
      text = await this.extractPdf(buffer);
    }

    const normalized = normalizeExtractedText(text);
    if (!normalized) {
      throw new BadRequestException(format === 'pdf'
        ? 'PDF 中未检测到可复制正文，请上传文本型 PDF'
        : '文档中未检测到可解析正文');
    }
    if (normalized.length > maxExtractedTextLength) {
      throw new BadRequestException('文档正文超过 50 万字符，请拆分后重新上传');
    }
    return normalized;
  }

  private async extractWord(buffer: Buffer): Promise<string> {
    try {
      const result = await mammoth.extractRawText({ buffer });
      return result.value;
    } catch {
      throw new BadRequestException('DOCX 文档无法解析，请确认文件未损坏');
    }
  }

  private async extractPdf(buffer: Buffer): Promise<string> {
    if (!isPdf(buffer)) throw new BadRequestException('PDF 文件内容无效');
    const parser = new PDFParse({ data: new Uint8Array(buffer) });
    try {
      const result = await parser.getText();
      if (result.total > maxPdfPages) {
        throw new BadRequestException('PDF 超过 200 页，请拆分后重新上传');
      }
      return result.text;
    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      if (error instanceof PasswordException) {
        throw new BadRequestException('PDF 已加密，请移除密码后重新上传');
      }
      throw new BadRequestException('PDF 文档无法解析，请确认文件未损坏');
    } finally {
      await parser.destroy();
    }
  }
}

function decodeMarkdown(buffer: Buffer): string {
  if (buffer.includes(0)) throw new BadRequestException('Markdown 文件包含二进制内容');
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    throw new BadRequestException('Markdown 文件必须使用 UTF-8 编码');
  }
}

function normalizeExtractedText(text: string): string {
  return text
    .replace(/^\uFEFF/, '')
    .replace(/\r\n?/g, '\n')
    .replace(/\f/g, '\n')
    .replace(/[\t ]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function isPdf(buffer: Buffer): boolean {
  return buffer.subarray(0, 5).toString('ascii') === '%PDF-';
}

function isZip(buffer: Buffer): boolean {
  return buffer.length >= 4 && buffer[0] === 0x50 && buffer[1] === 0x4b && [0x03, 0x05, 0x07].includes(buffer[2] ?? -1) && [0x04, 0x06, 0x08].includes(buffer[3] ?? -1);
}
