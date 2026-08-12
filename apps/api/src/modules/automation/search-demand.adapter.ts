import { Injectable } from '@nestjs/common';
import type { SearchDemandSnapshotInput, SearchDemandSource } from '@geo-platform/shared-types';

export type SearchDemandCollectResult = {
  source: SearchDemandSource;
  candidateQuestions: string[];
};

export interface SearchDemandAdapter {
  supports(source: SearchDemandSource): boolean;
  collect(input: SearchDemandSnapshotInput): Promise<SearchDemandCollectResult>;
}

const responseLimitBytes = 256 * 1024;
const requestTimeoutMs = 5_000;

@Injectable()
export class BaiduSearchDemandAdapter implements SearchDemandAdapter {
  supports(source: SearchDemandSource): boolean {
    return source === 'baidu';
  }

  async collect(input: SearchDemandSnapshotInput): Promise<SearchDemandCollectResult> {
    const url = new URL('https://suggestion.baidu.com/su');
    url.searchParams.set('wd', input.seedTerm);
    url.searchParams.set('action', 'opensearch');
    const text = await fetchAutocompleteText(url);
    const start = text.indexOf('(');
    const end = text.lastIndexOf(')');
    const payload = JSON.parse(start >= 0 && end > start ? text.slice(start + 1, end) : text) as { s?: unknown };
    return { source: 'baidu', candidateQuestions: toStringList(payload.s) };
  }
}

@Injectable()
export class GoogleSearchDemandAdapter implements SearchDemandAdapter {
  supports(source: SearchDemandSource): boolean {
    return source === 'google';
  }

  async collect(input: SearchDemandSnapshotInput): Promise<SearchDemandCollectResult> {
    const url = new URL('https://suggestqueries.google.com/complete/search');
    url.searchParams.set('client', 'firefox');
    url.searchParams.set('hl', marketLanguage(input.market));
    url.searchParams.set('q', input.seedTerm);
    const payload = JSON.parse(await fetchAutocompleteText(url)) as unknown;
    const candidates = Array.isArray(payload) ? payload[1] : [];
    return { source: 'google', candidateQuestions: toStringList(candidates) };
  }
}

@Injectable()
export class ManualSearchDemandAdapter implements SearchDemandAdapter {
  supports(source: SearchDemandSource): boolean {
    return source === 'manual';
  }

  async collect(input: SearchDemandSnapshotInput): Promise<SearchDemandCollectResult> {
    return { source: 'manual', candidateQuestions: toStringList(input.candidateQuestions) };
  }
}

@Injectable()
export class SearchDemandAdapterRegistry {
  constructor(
    private readonly baidu: BaiduSearchDemandAdapter,
    private readonly google: GoogleSearchDemandAdapter,
    private readonly manual: ManualSearchDemandAdapter
  ) {}

  require(source: SearchDemandSource): SearchDemandAdapter {
    const adapter = [this.baidu, this.google, this.manual].find((candidate) => candidate.supports(source));
    if (!adapter) throw new Error(`SEARCH_DEMAND_SOURCE_UNSUPPORTED:${source}`);
    return adapter;
  }
}

async function fetchAutocompleteText(url: URL): Promise<string> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);
  try {
    const response = await fetch(url, { signal: controller.signal, headers: { accept: 'application/json,text/javascript' } });
    if (!response.ok) throw new Error(`SEARCH_DEMAND_SOURCE_HTTP_${response.status}`);
    const contentLength = Number(response.headers.get('content-length') ?? 0);
    if (contentLength > responseLimitBytes) throw new Error('SEARCH_DEMAND_SOURCE_RESPONSE_TOO_LARGE');
    const text = await response.text();
    if (Buffer.byteLength(text, 'utf8') > responseLimitBytes) throw new Error('SEARCH_DEMAND_SOURCE_RESPONSE_TOO_LARGE');
    return text;
  } finally {
    clearTimeout(timeout);
  }
}

function toStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && Boolean(item.trim())).map((item) => item.trim()) : [];
}

function marketLanguage(market: string): string {
  const normalized = market.trim().toLowerCase();
  if (normalized.startsWith('zh') || normalized.includes('中国')) return 'zh-CN';
  return 'en';
}
