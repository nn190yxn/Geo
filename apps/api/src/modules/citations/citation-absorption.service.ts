import { Inject, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';
import type { CitationAbsorptionEvidence, CitationAbsorptionOutcome, CitationSource } from '@geo-platform/shared-types';
import { PERMISSIONS_REPOSITORY, type PermissionsRepositoryPort } from '../permissions/permissions.repository.port';

const maxResponseBytes = 256 * 1024;
const maxRedirects = 3;
const requestTimeoutMs = 8_000;

export const CITATION_SOURCE_FETCHER = Symbol('CITATION_SOURCE_FETCHER');

export interface CitationSourceFetcher {
  fetchText(url: string): Promise<string>;
}

@Injectable()
export class NodeFetchCitationSourceFetcher implements CitationSourceFetcher {
  async fetchText(value: string): Promise<string> {
    let currentUrl = parsePublicHttpUrl(value);
    const initialOrigin = currentUrl.origin;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
    try {
      for (let redirects = 0; redirects <= maxRedirects; redirects += 1) {
        await assertPublicHostname(currentUrl.hostname);
        const response = await fetch(currentUrl, {
          method: 'GET', redirect: 'manual', signal: controller.signal,
          headers: { accept: 'text/html,text/plain;q=0.8', 'user-agent': 'GEO-Platform-CitationEvidence/1.0' }
        });
        if ([301, 302, 303, 307, 308].includes(response.status)) {
          const location = response.headers.get('location');
          if (!location || redirects === maxRedirects) throw new Error('引用页面重定向不可用');
          const redirected = parsePublicHttpUrl(new URL(location, currentUrl).toString());
          if (redirected.origin !== initialOrigin) throw new Error('引用页面重定向超出原始站点');
          await response.body?.cancel().catch(() => undefined);
          currentUrl = redirected;
          continue;
        }
        if (!response.ok) throw new Error('引用页面暂时无法访问');
        const type = response.headers.get('content-type')?.toLowerCase() ?? '';
        if (!type.startsWith('text/html') && !type.startsWith('text/plain')) throw new Error('引用页面不是可分析的文本内容');
        return stripHtml(await readLimitedText(response));
      }
      throw new Error('引用页面重定向不可用');
    } finally {
      clearTimeout(timeout);
    }
  }
}

@Injectable()
export class CitationAbsorptionService {
  constructor(
    @Inject(PERMISSIONS_REPOSITORY) private readonly repository: PermissionsRepositoryPort,
    @Inject(CITATION_SOURCE_FETCHER) private readonly fetcher: CitationSourceFetcher
  ) {}

  async analyze(userId: string, brandId: string, citationId: string): Promise<CitationSource | null> {
    const dashboard = await this.repository.getCitationDashboard(userId, brandId);
    const source = await this.repository.getCitationSource?.(userId, brandId, citationId)
      ?? dashboard?.sources.find((item) => item.id === citationId);
    if (!source || !this.repository.saveCitationAbsorptionEvidence) return null;
    let evidence: CitationAbsorptionEvidence[];
    try {
      const answer = await this.repository.getMonitoringRun(userId, brandId, source.runId);
      evidence = matchCitationAbsorption(source, await this.fetcher.fetchText(source.url), answer?.response?.rawText ?? '');
    } catch {
      evidence = unavailableEvidence(source);
    }
    return this.repository.saveCitationAbsorptionEvidence(userId, brandId, citationId, evidence);
  }

  async review(userId: string, brandId: string, citationId: string, evidenceId: string): Promise<CitationSource | null> {
    return this.repository.reviewCitationAbsorptionEvidence?.(userId, brandId, citationId, evidenceId) ?? null;
  }
}

export function matchCitationAbsorption(source: Pick<CitationSource, 'id' | 'responseId'>, sourceText: string, answerText = ''): CitationAbsorptionEvidence[] {
  const sentences = splitAuditableSentences(answerText);
  const fragments = splitSourceFragments(sourceText);
  return sentences.map((answerSentence, answerSentenceIndex) => {
    const best = fragments.map((fragment) => ({ fragment, score: overlap(answerSentence.text, fragment.text) }))
      .sort((left, right) => right.score - left.score)[0];
    const outcome: CitationAbsorptionOutcome = !best || best.score === 0 ? 'conflicts' : best.score < 0.6 ? 'partial' : 'supports';
    const confidence = Math.round((best?.score ?? 0) * 100);
    return {
      id: `${source.id}:${answerSentenceIndex}`,
      answerSentence: answerSentence.text,
      answerSentenceIndex,
      sourceFragment: best?.fragment.text ?? '',
      sourceStartOffset: best?.fragment.startOffset ?? 0,
      sourceEndOffset: best?.fragment.endOffset ?? 0,
      outcome,
      supportScope: confidence,
      confidence,
      reviewStatus: outcome === 'conflicts' || confidence < 70 ? 'pending_review' : 'not_required'
    };
  });
}

export function splitAuditableSentences(value: string): Array<{ text: string; startOffset: number; endOffset: number }> {
  return collectSegments(value, /[^。！？.!?]+[。！？.!?]?/g);
}

export function splitSourceFragments(value: string): Array<{ text: string; startOffset: number; endOffset: number }> {
  return collectSegments(value, /[^。！？.!?]+[。！？.!?]?/g).filter((item) => item.text.length >= 12);
}

function unavailableEvidence(source: Pick<CitationSource, 'id'>): CitationAbsorptionEvidence[] {
  return [{ id: `${source.id}:unavailable`, answerSentence: '引用页面不可访问', answerSentenceIndex: 0, sourceFragment: '', sourceStartOffset: 0, sourceEndOffset: 0, outcome: 'unavailable', supportScope: 0, confidence: 0, reviewStatus: 'pending_review' }];
}

function collectSegments(value: string, pattern: RegExp) {
  return Array.from(value.matchAll(pattern)).map((match) => ({ text: match[0].trim(), startOffset: match.index ?? 0, endOffset: (match.index ?? 0) + match[0].length })).filter((item) => item.text.length > 0);
}

function overlap(answer: string, fragment: string): number {
  const words = new Set(answer.toLowerCase().match(/[\p{L}\p{N}]{2,}/gu) ?? []);
  if (!words.size) return 0;
  const matched = [...words].filter((word) => fragment.toLowerCase().includes(word)).length;
  return matched / words.size;
}

function stripHtml(value: string): string { return value.replace(/<script[\s\S]*?<\/script>|<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim(); }
function parsePublicHttpUrl(value: string): URL { const url = new URL(value); if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) throw new Error('引用地址必须是公开 HTTP(S) URL'); url.hash = ''; return url; }
async function assertPublicHostname(hostname: string) { const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase(); if (normalized === 'localhost' || normalized.endsWith('.localhost')) throw new Error('引用地址必须解析到公开网络'); const version = isIP(normalized); const addresses = version ? [{ address: normalized }] : await lookup(normalized, { all: true, verbatim: true }); if (!addresses.length || addresses.some(({ address }) => !isPublicAddress(address))) throw new Error('引用地址必须解析到公开网络'); }
function isPublicAddress(address: string) { if (isIP(address) !== 4) return false; const [first, second] = address.split('.').map(Number); return first > 0 && first < 224 && first !== 10 && first !== 127 && !(first === 169 && second === 254) && !(first === 172 && second >= 16 && second <= 31) && !(first === 192 && second === 168); }
async function readLimitedText(response: Response) { const size = Number(response.headers.get('content-length')); if (Number.isFinite(size) && size > maxResponseBytes) throw new Error('引用页面响应超过大小限制'); const reader = response.body?.getReader(); if (!reader) return ''; const chunks: Uint8Array[] = []; let total = 0; while (true) { const { done, value } = await reader.read(); if (done) break; total += value.byteLength; if (total > maxResponseBytes) { await reader.cancel(); throw new Error('引用页面响应超过大小限制'); } chunks.push(value); } const body = new Uint8Array(total); let offset = 0; for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.byteLength; } return new TextDecoder().decode(body); }
