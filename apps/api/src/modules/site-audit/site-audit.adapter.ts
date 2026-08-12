import { Injectable } from '@nestjs/common';
import type {
  SiteAuditCheck,
  SiteAuditCheckKey,
  SiteAuditCheckStatus,
  SiteAuditEvidence,
  SiteAuditResult
} from '@geo-platform/shared-types';
import { lookup } from 'node:dns/promises';
import { isIP } from 'node:net';

const requestTimeoutMs = 10_000;
const maxRedirects = 3;
const maxResponseBytes = 1024 * 1024;
const aiBotNames = new Set(['gptbot', 'chatgpt-user', 'claudebot', 'perplexitybot', 'google-extended']);

export const SITE_AUDIT_ADAPTER = Symbol('SITE_AUDIT_ADAPTER');

export interface SiteAuditAdapter {
  audit(websiteUrl: string): Promise<SiteAuditResult>;
}

export class SiteAuditAdapterError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

type SiteResource = {
  requestedUrl: string;
  finalUrl: string;
  status: number;
  contentType: string;
  headers: Headers;
  body: string;
};

type ResourceOutcome = { targetUrl: string; resource?: SiteResource; error?: SiteAuditAdapterError };

@Injectable()
export class NodeFetchSiteAuditAdapter implements SiteAuditAdapter {
  async audit(value: string): Promise<SiteAuditResult> {
    const website = parsePublicHttpUrl(value);
    await assertPublicHostname(website.hostname);
    const origin = website.origin;
    const targets = {
      homepage: website,
      robots: new URL('/robots.txt', origin),
      sitemap: new URL('/sitemap.xml', origin),
      llms: new URL('/llms.txt', origin)
    };
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), requestTimeoutMs);

    try {
      const [homepage, robots, sitemap, llms] = await Promise.all([
        captureResource(targets.homepage, origin, controller),
        captureResource(targets.robots, origin, controller),
        captureResource(targets.sitemap, origin, controller),
        captureResource(targets.llms, origin, controller)
      ]);
      const auditedAt = new Date().toISOString();
      return {
        websiteUrl: website.toString(),
        auditedAt,
        checks: [
          resourceFileCheck('robots_txt', robots, auditedAt, 'robots.txt 可访问且包含有效规则。', '未发现有效 robots.txt。', isValidRobotsTxt),
          resourceFileCheck('sitemap_xml', sitemap, auditedAt, 'sitemap.xml 可访问且结构有效。', '未发现有效 sitemap.xml。', isValidSitemapXml),
          resourceFileCheck('llms_txt', llms, auditedAt, 'llms.txt 可访问且结构有效。', '未发现有效 llms.txt。', isValidLlmsTxt),
          noindexCheck(homepage, auditedAt),
          aiBotAccessCheck(robots, auditedAt),
          structuredDataCheck(homepage, auditedAt),
          extractableContentCheck(homepage, auditedAt)
        ]
      };
    } finally {
      clearTimeout(timeout);
    }
  }
}

async function captureResource(url: URL, origin: string, controller: AbortController): Promise<ResourceOutcome> {
  try {
    return { targetUrl: url.toString(), resource: await fetchResource(url, origin, controller) };
  } catch (error) {
    return {
      targetUrl: url.toString(),
      error: error instanceof SiteAuditAdapterError
        ? error
        : new SiteAuditAdapterError('SITE_AUDIT_FETCH_FAILED', '站点资源暂时无法访问')
    };
  }
}

async function fetchResource(initialUrl: URL, origin: string, controller: AbortController): Promise<SiteResource> {
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
          accept: 'text/html,text/plain,application/xml,text/xml;q=0.9,*/*;q=0.1',
          'user-agent': 'GEO-Platform-SiteAudit/1.0'
        }
      });
    } catch {
      throw controller.signal.aborted
        ? new SiteAuditAdapterError('SITE_AUDIT_TIMEOUT', '站点审计请求超时')
        : new SiteAuditAdapterError('SITE_AUDIT_FETCH_FAILED', '站点资源暂时无法访问');
    }
    if (isRedirect(response.status)) {
      if (redirectCount === maxRedirects) {
        throw new SiteAuditAdapterError('SITE_AUDIT_REDIRECT_LIMIT', '站点资源重定向次数超过限制');
      }
      const location = response.headers.get('location');
      if (!location) throw new SiteAuditAdapterError('SITE_AUDIT_REDIRECT_INVALID', '站点资源返回无效重定向');
      const redirected = parsePublicHttpUrl(new URL(location, currentUrl).toString());
      if (redirected.origin !== origin) {
        throw new SiteAuditAdapterError('SITE_AUDIT_REDIRECT_ORIGIN', '站点资源重定向超出原始站点');
      }
      await response.body?.cancel().catch(() => undefined);
      currentUrl = redirected;
      continue;
    }
    const bytes = await readLimitedBody(response, controller);
    const contentType = response.headers.get('content-type')?.toLowerCase() ?? '';
    return {
      requestedUrl: initialUrl.toString(),
      finalUrl: currentUrl.toString(),
      status: response.status,
      contentType,
      headers: response.headers,
      body: decodeBody(bytes, contentType)
    };
  }
  throw new SiteAuditAdapterError('SITE_AUDIT_REDIRECT_LIMIT', '站点资源重定向次数超过限制');
}

function resourceFileCheck(
  key: SiteAuditCheckKey,
  outcome: ResourceOutcome,
  checkedAt: string,
  passSummary: string,
  missingSummary: string,
  validate: (resource: SiteResource) => boolean
): SiteAuditCheck {
  if (!outcome.resource) return unavailableCheck(key, outcome, checkedAt);
  const available = outcome.resource.status >= 200 && outcome.resource.status < 300 && validate(outcome.resource);
  return check(key, available ? 'pass' : 'warning', available ? passSummary : missingSummary, evidence(outcome, checkedAt));
}

function isValidRobotsTxt(resource: SiteResource): boolean {
  return resource.body.split(/\r?\n/).some((line) => /^\s*user-agent\s*:\s*\S+/i.test(line.replace(/#.*$/, '')));
}

function isValidSitemapXml(resource: SiteResource): boolean {
  const body = resource.body.trim();
  return /<(?:[\w-]+:)?(?:urlset|sitemapindex)\b[^>]*>/i.test(body)
    && /<\/(?:[\w-]+:)?(?:urlset|sitemapindex)\s*>\s*$/i.test(body);
}

function isValidLlmsTxt(resource: SiteResource): boolean {
  return resource.body.split(/\r?\n/).some((line) => /^#\s+\S/.test(line.trim()));
}

function noindexCheck(outcome: ResourceOutcome, checkedAt: string): SiteAuditCheck {
  if (!outcome.resource) return unavailableCheck('noindex', outcome, checkedAt);
  if (!isSuccessfulHtml(outcome.resource)) {
    return check('noindex', 'unavailable', '首页 HTML 不可用，无法检查 noindex。', evidence(outcome, checkedAt));
  }
  const blocked = [...outcome.resource.body.matchAll(/<meta\b[^>]*>/gi)].some((match) => {
    const attributes = parseAttributes(match[0]);
    const directive = (attributes.name ?? attributes['http-equiv'] ?? '').toLowerCase();
    return ['robots', 'x-robots-tag'].includes(directive) && /(?:^|[,\s])noindex(?:[,\s]|$)/i.test(attributes.content ?? '');
  })
    || /(?:^|[,\s])noindex(?:[,\s]|$)/i.test(outcome.resource.headers.get('x-robots-tag') ?? '');
  return check('noindex', blocked ? 'fail' : 'pass', blocked ? '首页声明了 noindex。' : '首页允许搜索索引。', evidence(outcome, checkedAt));
}

function aiBotAccessCheck(outcome: ResourceOutcome, checkedAt: string): SiteAuditCheck {
  if (!outcome.resource) return unavailableCheck('ai_bot_access', outcome, checkedAt);
  if (outcome.resource.status === 404) {
    return check('ai_bot_access', 'pass', '未发现 robots.txt，未检测到 AI Bot 禁止规则。', evidence(outcome, checkedAt));
  }
  if (outcome.resource.status < 200 || outcome.resource.status >= 300) {
    return check('ai_bot_access', 'unavailable', 'robots.txt 不可用，无法检查 AI Bot 访问规则。', evidence(outcome, checkedAt));
  }
  const blockedAgents = findBlockedAiBots(outcome.resource.body);
  return check(
    'ai_bot_access',
    blockedAgents.length > 0 ? 'fail' : 'pass',
    blockedAgents.length > 0 ? `robots.txt 禁止 ${blockedAgents.join('、')} 访问。` : '未检测到 AI Bot 全站禁止规则。',
    evidence(outcome, checkedAt)
  );
}

function structuredDataCheck(outcome: ResourceOutcome, checkedAt: string): SiteAuditCheck {
  if (!outcome.resource) return unavailableCheck('structured_data', outcome, checkedAt);
  if (!isSuccessfulHtml(outcome.resource)) {
    return check('structured_data', 'unavailable', '首页 HTML 不可用，无法检查结构化数据。', evidence(outcome, checkedAt));
  }
  const scripts = [...outcome.resource.body.matchAll(/<script\b[^>]*type\s*=\s*["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi)];
  const valid = scripts.some((match) => {
    try {
      return Boolean(JSON.parse(match[1]));
    } catch {
      return false;
    }
  });
  return check('structured_data', valid ? 'pass' : 'warning', valid ? '首页包含可解析的 JSON-LD。' : '首页缺少可解析的 JSON-LD。', evidence(outcome, checkedAt));
}

function extractableContentCheck(outcome: ResourceOutcome, checkedAt: string): SiteAuditCheck {
  if (!outcome.resource) return unavailableCheck('extractable_content', outcome, checkedAt);
  if (!isSuccessfulHtml(outcome.resource)) {
    return check('extractable_content', 'unavailable', '首页 HTML 不可用，无法检查内容结构。', evidence(outcome, checkedAt));
  }
  const html = outcome.resource.body;
  const visibleText = html
    .replace(/<!--[^]*?-->/g, ' ')
    .replace(/<(script|style|noscript|svg|template)\b[^>]*>[^]*?<\/\1>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  const structured = /<(?:main|article|h1|h2|p)\b/i.test(html) && visibleText.length >= 120;
  return check('extractable_content', structured ? 'pass' : 'warning', structured ? '首页包含可抽取的正文结构。' : '首页可抽取正文结构较弱。', evidence(outcome, checkedAt));
}

function findBlockedAiBots(content: string): string[] {
  const blocked = new Set<string>();
  let agents: string[] = [];
  let hasDirectives = false;
  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.replace(/#.*$/, '').trim();
    if (!line) continue;
    const separator = line.indexOf(':');
    if (separator < 0) continue;
    const field = line.slice(0, separator).trim().toLowerCase();
    const value = line.slice(separator + 1).trim().toLowerCase();
    if (field === 'user-agent') {
      if (hasDirectives) agents = [];
      agents.push(value);
      hasDirectives = false;
      continue;
    }
    hasDirectives = true;
    if (field === 'disallow' && value === '/') {
      for (const agent of agents) {
        if (agent === '*') blocked.add('全部爬虫');
        else if (aiBotNames.has(agent)) blocked.add(agent);
      }
    }
  }
  return [...blocked];
}

function unavailableCheck(key: SiteAuditCheckKey, outcome: ResourceOutcome, checkedAt: string): SiteAuditCheck {
  return check(key, 'unavailable', '目标资源暂时无法访问，已保留失败证据。', evidence(outcome, checkedAt));
}

function check(
  key: SiteAuditCheckKey,
  status: SiteAuditCheckStatus,
  summary: string,
  auditEvidence: SiteAuditEvidence
): SiteAuditCheck {
  return { key, status, summary, evidence: auditEvidence };
}

function evidence(outcome: ResourceOutcome, checkedAt: string): SiteAuditEvidence {
  if (!outcome.resource) {
    return { targetUrl: outcome.targetUrl, checkedAt, errorCode: outcome.error?.code ?? 'SITE_AUDIT_FETCH_FAILED' };
  }
  const excerpt = outcome.resource.body.replace(/\s+/g, ' ').trim().slice(0, 500) || undefined;
  return {
    targetUrl: outcome.resource.finalUrl,
    checkedAt,
    httpStatus: outcome.resource.status,
    contentType: outcome.resource.contentType || undefined,
    excerpt
  };
}

function isSuccessfulHtml(resource: SiteResource): boolean {
  return resource.status >= 200 && resource.status < 300 && resource.contentType.split(';', 1)[0].trim() === 'text/html';
}

function parsePublicHttpUrl(value: string): URL {
  let url: URL;
  try {
    url = new URL(value);
  } catch {
    throw new SiteAuditAdapterError('SITE_AUDIT_URL_INVALID', '站点地址无效');
  }
  if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) {
    throw new SiteAuditAdapterError('SITE_AUDIT_URL_INVALID', '站点地址必须是公开 HTTP(S) URL');
  }
  url.hash = '';
  return url;
}

async function assertPublicHostname(hostname: string): Promise<void> {
  const normalized = hostname.replace(/^\[|\]$/g, '').toLowerCase();
  if (normalized === 'localhost' || normalized.endsWith('.localhost')) {
    throw new SiteAuditAdapterError('SITE_AUDIT_ADDRESS_BLOCKED', '站点地址必须解析到公开网络');
  }
  const literalVersion = isIP(normalized);
  let addresses: Array<{ address: string; family: number }>;
  try {
    addresses = literalVersion ? [{ address: normalized, family: literalVersion }] : await lookup(normalized, { all: true, verbatim: true });
  } catch {
    throw new SiteAuditAdapterError('SITE_AUDIT_DNS_FAILED', '站点域名解析失败');
  }
  if (addresses.length === 0 || addresses.some(({ address }) => !isPublicAddress(address))) {
    throw new SiteAuditAdapterError('SITE_AUDIT_ADDRESS_BLOCKED', '站点地址必须解析到公开网络');
  }
}

function isPublicAddress(address: string): boolean {
  if (isIP(address) === 4) {
    const [first, second, third] = address.split('.').map(Number);
    return !(first === 0 || first === 10 || first === 127 || first >= 224
      || (first === 100 && second >= 64 && second <= 127)
      || (first === 169 && second === 254)
      || (first === 172 && second >= 16 && second <= 31)
      || (first === 192 && second === 168)
      || (first === 192 && second === 0 && third === 0)
      || (first === 192 && second === 0 && third === 2)
      || (first === 192 && second === 88 && third === 99)
      || (first === 198 && (second === 18 || second === 19))
      || (first === 198 && second === 51 && third === 100)
      || (first === 203 && second === 0 && third === 113));
  }
  if (isIP(address) === 6) {
    const bytes = parseIpv6(address);
    if (!bytes) return false;
    const allZero = bytes.every((part) => part === 0);
    const loopback = bytes.slice(0, 15).every((part) => part === 0) && bytes[15] === 1;
    if (allZero || loopback) return false;
    const ipv4Mapped = bytes.slice(0, 10).every((part) => part === 0) && bytes[10] === 0xff && bytes[11] === 0xff;
    if (ipv4Mapped) return isPublicAddress(bytes.slice(12).join('.'));
    if (bytes[0] === 0 || (bytes[0] & 0xfe) === 0xfc || (bytes[0] === 0xfe && (bytes[1] & 0xc0) === 0x80)) return false;
    if (bytes[0] === 0xff || (bytes[0] === 0x20 && bytes[1] === 0x02)) return false;
    if (bytes[0] === 0x20 && bytes[1] === 0x01 && bytes[2] === 0x0d && bytes[3] === 0xb8) return false;
    if (bytes[0] === 0x3f && (bytes[1] & 0xf0) === 0xf0) return false;
    return true;
  }
  return false;
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
  return [...left, ...Array(missing).fill(0), ...right].flatMap((group) => [group >> 8, group & 0xff]);
}

function parseIpv6Groups(value: string): number[] | null {
  if (!value) return [];
  const parts = value.split(':');
  const groups: number[] = [];
  for (const part of parts) {
    if (part.includes('.')) {
      if (part !== parts[parts.length - 1] || isIP(part) !== 4) return null;
      const octets = part.split('.').map(Number);
      groups.push((octets[0] << 8) | octets[1], (octets[2] << 8) | octets[3]);
      continue;
    }
    if (!/^[0-9a-f]{1,4}$/.test(part)) return null;
    groups.push(Number.parseInt(part, 16));
  }
  return groups;
}

function parseAttributes(tag: string): Record<string, string> {
  const attributes: Record<string, string> = {};
  for (const match of tag.matchAll(/([:\w-]+)\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s"'=<>`]+))/g)) {
    attributes[match[1].toLowerCase()] = match[2] ?? match[3] ?? match[4] ?? '';
  }
  return attributes;
}

async function readLimitedBody(response: Response, controller: AbortController): Promise<Uint8Array> {
  const declaredLength = Number(response.headers.get('content-length'));
  if (Number.isFinite(declaredLength) && declaredLength > maxResponseBytes) {
    await response.body?.cancel().catch(() => undefined);
    throw new SiteAuditAdapterError('SITE_AUDIT_RESPONSE_TOO_LARGE', '站点资源响应超过大小限制');
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
      await reader.cancel().catch(() => undefined);
      throw new SiteAuditAdapterError('SITE_AUDIT_RESPONSE_TOO_LARGE', '站点资源响应超过大小限制');
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

function isRedirect(status: number): boolean {
  return [301, 302, 303, 307, 308].includes(status);
}
