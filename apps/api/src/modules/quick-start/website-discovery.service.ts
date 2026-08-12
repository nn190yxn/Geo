import { Inject, Injectable } from '@nestjs/common';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const maxRedirects = 3;
const maxResponseBytes = 1024 * 1024;
const requestTimeoutMs = 8_000;

export type WebsiteDiscoveryResult = {
  url: string;
  title?: string;
  description?: string;
  excerpt?: string;
  candidatePages?: Array<{ url: string; title?: string }>;
};

export interface WebsiteDiscoveryAdapter {
  discover(url: string): Promise<WebsiteDiscoveryResult>;
}

export const WEBSITE_DISCOVERY_ADAPTER = Symbol('WEBSITE_DISCOVERY_ADAPTER');

export class WebsiteDiscoveryError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

@Injectable()
export class NodeFetchWebsiteDiscoveryAdapter implements WebsiteDiscoveryAdapter {
  async discover(value: string): Promise<WebsiteDiscoveryResult> {
    const initialUrl = parsePublicHttpUrl(value);
    const initialOrigin = initialUrl.origin;
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      let currentUrl = initialUrl;
      for (let redirectCount = 0; redirectCount <= maxRedirects; redirectCount += 1) {
        await assertPublicHostname(currentUrl.hostname);
        let response: Response;
        try {
          response = await fetch(currentUrl, {
            method: 'GET',
            redirect: 'manual',
            signal: controller.signal,
            headers: {
              accept: 'text/html,text/plain;q=0.8',
              'user-agent': 'GEO-Platform-WebsiteDiscovery/1.0'
            }
          });
        } catch (error) {
          if (controller.signal.aborted) {
            throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_TIMEOUT', '官网发现请求超时');
          }
          throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_FETCH_FAILED', '官网暂时无法访问');
        }

        if (isRedirect(response.status)) {
          if (redirectCount === maxRedirects) {
            throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_REDIRECT_LIMIT', '官网重定向次数超过限制');
          }
          const location = response.headers.get('location');
          if (!location) {
            throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_REDIRECT_INVALID', '官网返回了无效重定向');
          }
          const redirectUrl = parsePublicHttpUrl(new URL(location, currentUrl).toString());
          if (redirectUrl.origin !== initialOrigin) {
            throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_REDIRECT_ORIGIN', '官网重定向超出原始站点');
          }
          await response.body?.cancel().catch(() => undefined);
          currentUrl = redirectUrl;
          continue;
        }

        if (!response.ok) {
          throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_HTTP_ERROR', `官网返回 HTTP ${response.status}`);
        }
        const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
        const mediaType = contentType.split(';', 1)[0].trim();
        if (mediaType !== 'text/html' && mediaType !== 'text/plain') {
          throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_CONTENT_TYPE', '官网响应不是 HTML 或文本内容');
        }
        const bytes = await readLimitedBody(response, controller);
        const text = decodeBody(bytes, contentType);
        return parseWebsiteContent(currentUrl.toString(), text, mediaType === 'text/html');
      }
      throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_REDIRECT_LIMIT', '官网重定向次数超过限制');
    } catch (error) {
      if (error instanceof WebsiteDiscoveryError) throw error;
      if (controller.signal.aborted) {
        throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_TIMEOUT', '官网发现请求超时');
      }
      throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_PARSE_FAILED', '官网内容解析失败');
    } finally {
      clearTimeout(timeout);
    }
  }
}

@Injectable()
export class WebsiteDiscoveryService {
  constructor(@Inject(WEBSITE_DISCOVERY_ADAPTER) private readonly adapter: WebsiteDiscoveryAdapter) {}

  discover(url: string): Promise<WebsiteDiscoveryResult> {
    return this.adapter.discover(url);
  }
}

async function assertPublicHostname(hostname: string): Promise<void> {
  const normalizedHostname = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalizedHostname === 'localhost' || normalizedHostname.endsWith('.localhost')) {
    throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_ADDRESS_BLOCKED', '官网地址必须解析到公开网络');
  }

  const literalVersion = isIP(normalizedHostname);
  const addresses = literalVersion
    ? [{ address: normalizedHostname, family: literalVersion }]
    : await resolveHostname(normalizedHostname);
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_ADDRESS_BLOCKED', '官网地址必须解析到公开网络');
  }
}

async function resolveHostname(hostname: string): Promise<Array<{ address: string; family: number }>> {
  try {
    return await lookup(hostname, { all: true, verbatim: true });
  } catch {
    throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_DNS_FAILED', '官网域名解析失败');
  }
}

function parsePublicHttpUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_URL_INVALID', '官网地址无效');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_URL_INVALID', '官网地址必须是公开 HTTP(S) URL');
  }
  url.hash = '';
  return url;
}

function isPublicAddress(address: string): boolean {
  const version = isIP(address);
  if (version === 4) return isPublicIpv4(address);
  if (version === 6) return isPublicIpv6(address);
  return false;
}

function isPublicIpv4(address: string): boolean {
  const octets = address.split('.').map(Number);
  if (octets.length !== 4 || octets.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return false;
  const [first, second, third] = octets;
  if (first === 0 || first === 10 || first === 127 || first >= 224) return false;
  if (first === 100 && second >= 64 && second <= 127) return false;
  if (first === 169 && second === 254) return false;
  if (first === 172 && second >= 16 && second <= 31) return false;
  if (first === 192 && second === 168) return false;
  if (first === 192 && second === 0 && third === 0) return false;
  if (first === 192 && second === 0 && third === 2) return false;
  if (first === 192 && second === 88 && third === 99) return false;
  if (first === 198 && (second === 18 || second === 19)) return false;
  if (first === 198 && second === 51 && third === 100) return false;
  if (first === 203 && second === 0 && third === 113) return false;
  return true;
}

function isPublicIpv6(address: string): boolean {
  const bytes = parseIpv6(address);
  if (!bytes) return false;
  const allZero = bytes.every((part) => part === 0);
  const loopback = bytes.slice(0, 15).every((part) => part === 0) && bytes[15] === 1;
  if (allZero || loopback) return false;
  const ipv4Mapped = bytes.slice(0, 10).every((part) => part === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
  if (ipv4Mapped) return isPublicIpv4(bytes.slice(12).join('.'));
  if (bytes[0] === 0) return false;
  if (bytes[0] === 0x00 && bytes[1] === 0x64 && bytes[2] === 0xff && bytes[3] === 0x9b) return false;
  if (bytes[0] === 0x01 && bytes[1] === 0x00 && bytes.slice(2, 8).every((part) => part === 0)) return false;
  if ((bytes[0] & 0xfe) === 0xfc) return false;
  if (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80) return false;
  if (bytes[0] === 0xff) return false;
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] <= 0x01) return false;
  if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) return false;
  if (bytes[0] === 0x20 && bytes[1] === 0x02) return false;
  if (bytes[0] === 0x3f && (bytes[1] & 0xf0) === 0xf0) return false;
  if (bytes[0] === 0x5f) return false;
  return true;
}

function parseIpv6(address: string): number[] | null {
  const zoneIndex = address.indexOf('%');
  const normalized = (zoneIndex >= 0 ? address.slice(0, zoneIndex) : address).toLowerCase();
  const halves = normalized.split('::');
  if (halves.length > 2) return null;
  const left = parseIpv6Groups(halves[0]);
  const right = halves.length === 2 ? parseIpv6Groups(halves[1]) : [];
  if (!left || !right) return null;
  const missing = 8 - left.length - right.length;
  if ((halves.length === 1 && missing !== 0) || (halves.length === 2 && missing < 1)) return null;
  const groups = [...left, ...Array(missing).fill(0), ...right];
  return groups.flatMap((group) => [group >> 8, group & 0xff]);
}

function parseIpv6Groups(value: string): number[] | null {
  if (!value) return [];
  const parts = value.split(':');
  const groups: number[] = [];
  for (const part of parts) {
    if (part.includes('.')) {
      if (part !== parts[parts.length - 1] || !isIP(part)) return null;
      const octets = part.split('.').map(Number);
      groups.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    groups.push(Number.parseInt(part, 16));
  }
  return groups;
}

async function readLimitedBody(response: Response, controller: AbortController): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
    controller.abort();
    throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_RESPONSE_TOO_LARGE', '官网响应超过大小限制');
  }
  if (!response.body) return new Uint8Array();

  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > maxResponseBytes) {
      controller.abort();
      await reader.cancel().catch(() => undefined);
      throw new WebsiteDiscoveryError('WEBSITE_DISCOVERY_RESPONSE_TOO_LARGE', '官网响应超过大小限制');
    }
    chunks.push(value);
  }
  const body = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    body.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return body;
}

function decodeBody(bytes: Uint8Array, contentType: string): string {
  const charset = contentType.match(/charset\s*=\s*["']?([^;"'\s]+)/i)?.[1] ?? 'utf-8';
  try {
    return new TextDecoder(charset).decode(bytes);
  } catch {
    return new TextDecoder('utf-8').decode(bytes);
  }
}

function parseWebsiteContent(url: string, content: string, html: boolean): WebsiteDiscoveryResult {
  if (!html) {
    const excerpt = compactText(content).slice(0, 600) || undefined;
    return { url, excerpt };
  }
  const title = cleanExtractedText(content.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]);
  const description = extractMetaDescription(content);
  const visibleText = compactText(
    content
      .replace(/<!--[\s\S]*?-->/g, ' ')
      .replace(/<(script|style|noscript|svg|template)\b[^>]*>[\s\S]*?<\/\1>/gi, ' ')
      .replace(/<[^>]+>/g, ' ')
  ).slice(0, 600) || undefined;
  const candidatePages = extractCandidatePages(url, content);
  return {
    url,
    title,
    description,
    excerpt: description ?? visibleText,
    ...(candidatePages.length > 0 ? { candidatePages } : {})
  };
}

function extractCandidatePages(baseUrl: string, content: string): Array<{ url: string; title?: string }> {
  const base = new URL(baseUrl);
  const pages = new Map<string, { url: string; title?: string }>();
  for (const match of content.matchAll(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi)) {
    const attributes = parseAttributes(match[1]);
    if (!attributes.href) continue;
    let candidate: URL;
    try {
      candidate = new URL(attributes.href, base);
    } catch {
      continue;
    }
    if (candidate.origin !== base.origin || !['http:', 'https:'].includes(candidate.protocol)) continue;
    normalizeSourcePageUrl(candidate);
    if (/\.(?:jpe?g|png|gif|svg|webp|pdf|zip|xml)(?:$|\?)/i.test(candidate.pathname)) continue;
    const normalized = candidate.toString();
    if (normalized === base.toString() || pages.has(normalized)) continue;
    pages.set(normalized, { url: normalized, title: cleanExtractedText(match[2]) });
    if (pages.size >= 30) break;
  }
  return [...pages.values()];
}

function normalizeSourcePageUrl(url: URL): void {
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_.+|fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
}

function extractMetaDescription(content: string): string | undefined {
  for (const match of content.matchAll(/<meta\b[^>]*>/gi)) {
    const attributes = parseAttributes(match[0]);
    const key = (attributes.name ?? attributes.property ?? '').toLowerCase();
    if (key === 'description' || key === 'og:description') {
      const description = cleanExtractedText(attributes.content);
      if (description) return description;
    }
  }
  return undefined;
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}

function cleanExtractedText(value?: string): string | undefined {
  const text = value ? compactText(value.replace(/<[^>]+>/g, ' ')) : '';
  return text || undefined;
}

function compactText(value: string): string {
  return decodeHtmlEntities(value).replace(/\s+/g, ' ').trim();
}

function decodeHtmlEntities(value: string): string {
  const named: Record<string, string> = { amp: '&', lt: '<', gt: '>', quot: '"', apos: "'", nbsp: ' ' };
  return value.replace(/&(#x[0-9a-f]+|#\d+|amp|lt|gt|quot|apos|nbsp);/gi, (entity, key: string) => {
    if (key.startsWith('#x')) return String.fromCodePoint(Number.parseInt(key.slice(2), 16));
    if (key.startsWith('#')) return String.fromCodePoint(Number.parseInt(key.slice(1), 10));
    return named[key.toLowerCase()] ?? entity;
  });
}

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}
