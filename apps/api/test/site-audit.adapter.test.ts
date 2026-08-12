import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dnsLookup = vi.hoisted(() => vi.fn());

vi.mock('node:dns/promises', () => ({ lookup: dnsLookup }));

import {
  NodeFetchSiteAuditAdapter,
  SiteAuditAdapterError
} from '../src/modules/site-audit/site-audit.adapter';

describe('NodeFetchSiteAuditAdapter', () => {
  const fetchMock = vi.fn();

  beforeEach(() => {
    dnsLookup.mockReset();
    fetchMock.mockReset();
    dnsLookup.mockResolvedValue([{ address: '93.184.216.34', family: 4 }]);
    vi.stubGlobal('fetch', fetchMock);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.unstubAllGlobals();
  });

  it('audits the homepage and standard same-origin resources with fixed checks and evidence', async () => {
    fetchMock.mockImplementation((input: URL) => {
      if (input.pathname === '/robots.txt') {
        return Promise.resolve(textResponse('User-agent: *\nAllow: /'));
      }
      if (input.pathname === '/sitemap.xml') {
        return Promise.resolve(textResponse('<?xml version="1.0"?><urlset></urlset>', 'application/xml'));
      }
      if (input.pathname === '/llms.txt') {
        return Promise.resolve(textResponse('# Example Brand\nTrusted product information.'));
      }
      return Promise.resolve(textResponse(`
        <html><head>
          <title>Example</title>
          <script type="application/ld+json">{"@type":"Organization","name":"Example"}</script>
        </head><body><main><h1>Example Brand</h1><p>${'Useful public product details. '.repeat(8)}</p></main></body></html>
      `, 'text/html'));
    });

    const result = await new NodeFetchSiteAuditAdapter().audit('https://example.com/products#details');

    expect(result.websiteUrl).toBe('https://example.com/products');
    expect(result.checks.map((item) => item.key)).toEqual([
      'robots_txt', 'sitemap_xml', 'llms_txt', 'noindex', 'ai_bot_access', 'structured_data', 'extractable_content'
    ]);
    expect(result.checks.every((item) => item.status === 'pass')).toBe(true);
    expect(result.checks.every((item) => item.evidence.targetUrl.startsWith('https://example.com/'))).toBe(true);
    expect(result.checks.every((item) => item.evidence.checkedAt === result.auditedAt)).toBe(true);
    expect(fetchMock).toHaveBeenCalledTimes(4);
  });

  it('reports indexing, AI bot, structured data, content, and missing resource findings', async () => {
    fetchMock.mockImplementation((input: URL) => {
      if (input.pathname === '/robots.txt') {
        return Promise.resolve(textResponse('User-agent: GPTBot\nDisallow: /'));
      }
      if (input.pathname === '/sitemap.xml' || input.pathname === '/llms.txt') {
        return Promise.resolve(textResponse('missing', 'text/plain', 404));
      }
      return Promise.resolve(textResponse(`
        <html><head><meta content="noindex, nofollow" name="robots">
        <script type="application/ld+json">invalid</script></head><body><div>Short page</div></body></html>
      `, 'text/html'));
    });

    const result = await new NodeFetchSiteAuditAdapter().audit('https://example.com');
    const status = Object.fromEntries(result.checks.map((item) => [item.key, item.status]));

    expect(status).toEqual({
      robots_txt: 'pass',
      sitemap_xml: 'warning',
      llms_txt: 'warning',
      noindex: 'fail',
      ai_bot_access: 'fail',
      structured_data: 'warning',
      extractable_content: 'warning'
    });
    expect(result.checks.find((item) => item.key === 'ai_bot_access')?.summary).toContain('gptbot');
  });

  it('reports malformed standard documents without discarding completed checks', async () => {
    fetchMock.mockImplementation((input: URL) => {
      if (input.pathname === '/robots.txt') return Promise.resolve(textResponse('Allow: /\nDisallow: /private'));
      if (input.pathname === '/sitemap.xml') return Promise.resolve(textResponse('<html>not a sitemap</html>', 'application/xml'));
      if (input.pathname === '/llms.txt') return Promise.resolve(textResponse('Brand facts without a title'));
      return Promise.resolve(textResponse(`
        <html><head><script type="application/ld+json">{invalid}</script></head>
        <body><main><h1>Example</h1><p>${'Useful content. '.repeat(12)}</p></main></body></html>
      `, 'text/html'));
    });

    const result = await new NodeFetchSiteAuditAdapter().audit('https://example.com');
    const status = Object.fromEntries(result.checks.map((item) => [item.key, item.status]));

    expect(status).toMatchObject({
      robots_txt: 'warning', sitemap_xml: 'warning', llms_txt: 'warning', structured_data: 'warning'
    });
    expect(status.noindex).toBe('pass');
    expect(status.extractable_content).toBe('pass');
  });

  it('keeps successful resource checks when one resource request fails', async () => {
    fetchMock.mockImplementation((input: URL) => {
      if (input.pathname === '/robots.txt') return Promise.resolve(textResponse('User-agent: *\nAllow: /'));
      if (input.pathname === '/sitemap.xml') return Promise.reject(new Error('connection reset'));
      if (input.pathname === '/llms.txt') return Promise.resolve(textResponse('# Example Brand'));
      return Promise.resolve(textResponse(`<main><h1>Example</h1><p>${'Useful content. '.repeat(12)}</p></main>`, 'text/html'));
    });

    const result = await new NodeFetchSiteAuditAdapter().audit('https://example.com');
    const checks = Object.fromEntries(result.checks.map((item) => [item.key, item]));

    expect(checks.sitemap_xml).toMatchObject({ status: 'unavailable', evidence: { errorCode: 'SITE_AUDIT_FETCH_FAILED' } });
    expect(checks.robots_txt.status).toBe('pass');
    expect(checks.llms_txt.status).toBe('pass');
    expect(checks.noindex.status).toBe('pass');
    expect(checks.extractable_content.status).toBe('pass');
  });

  it.each([
    ['private IPv4', '10.0.0.8'],
    ['loopback IPv4', '127.0.0.1'],
    ['IPv4-mapped loopback IPv6', '::ffff:127.0.0.1'],
    ['link-local IPv6', 'fe80::1']
  ])('rejects %s before any site request', async (_label, address) => {
    dnsLookup.mockResolvedValue([{ address, family: address.includes(':') ? 6 : 4 }]);

    await expect(new NodeFetchSiteAuditAdapter().audit('https://example.com')).rejects.toMatchObject({
      code: 'SITE_AUDIT_ADDRESS_BLOCKED'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('records cross-origin redirects as unavailable evidence', async () => {
    fetchMock.mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'https://other.example.com/resource' }
    }));

    const result = await new NodeFetchSiteAuditAdapter().audit('https://example.com');

    expect(result.checks.every((item) => item.status === 'unavailable')).toBe(true);
    expect(result.checks.every((item) => item.evidence.errorCode === 'SITE_AUDIT_REDIRECT_ORIGIN')).toBe(true);
  });

  it('stops after the bounded number of same-origin redirects', async () => {
    fetchMock.mockImplementation((input: URL) => Promise.resolve(new Response(null, {
      status: 302,
      headers: { location: `${input.pathname}?redirected=1` }
    })));

    const result = await new NodeFetchSiteAuditAdapter().audit('https://example.com');

    expect(fetchMock).toHaveBeenCalledTimes(16);
    expect(result.checks.every((item) => item.status === 'unavailable')).toBe(true);
    expect(result.checks.every((item) => item.evidence.errorCode === 'SITE_AUDIT_REDIRECT_LIMIT')).toBe(true);
  });

  it('records oversized responses without exposing response content', async () => {
    fetchMock.mockResolvedValue(new Response('secret response', {
      headers: {
        'content-type': 'text/html',
        'content-length': String(1024 * 1024 + 1)
      }
    }));

    const result = await new NodeFetchSiteAuditAdapter().audit('https://example.com');

    expect(result.checks.every((item) => item.status === 'unavailable')).toBe(true);
    expect(result.checks.every((item) => item.evidence.errorCode === 'SITE_AUDIT_RESPONSE_TOO_LARGE')).toBe(true);
    expect(result.checks.every((item) => item.evidence.excerpt === undefined)).toBe(true);
  });

  it('applies one bounded execution timeout to the complete audit', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_input: URL, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));

    const audit = new NodeFetchSiteAuditAdapter().audit('https://example.com');
    await vi.advanceTimersByTimeAsync(0);
    expect(fetchMock).toHaveBeenCalledTimes(4);
    await vi.advanceTimersByTimeAsync(10_001);
    const result = await audit;

    expect(result.checks.every((item) => item.status === 'unavailable')).toBe(true);
    expect(result.checks.every((item) => item.evidence.errorCode === 'SITE_AUDIT_TIMEOUT')).toBe(true);
  });

  it('rejects invalid protocols with a stable business error', async () => {
    await expect(new NodeFetchSiteAuditAdapter().audit('file:///etc/passwd'))
      .rejects.toEqual(expect.any(SiteAuditAdapterError));
    await expect(new NodeFetchSiteAuditAdapter().audit('file:///etc/passwd')).rejects.toMatchObject({
      code: 'SITE_AUDIT_URL_INVALID'
    });
  });
});

function textResponse(body: string, contentType = 'text/plain', status = 200): Response {
  return new Response(body, { status, headers: { 'content-type': `${contentType}; charset=utf-8` } });
}
