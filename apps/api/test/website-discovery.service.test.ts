import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

const dnsLookup = vi.hoisted(() => vi.fn());

vi.mock('node:dns/promises', () => ({ lookup: dnsLookup }));

import {
  NodeFetchWebsiteDiscoveryAdapter,
  WebsiteDiscoveryError
} from '../src/modules/quick-start/website-discovery.service';

describe('NodeFetchWebsiteDiscoveryAdapter', () => {
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

  it('discovers title, description, and bounded visible text from a public homepage', async () => {
    fetchMock.mockResolvedValue(new Response(`
      <!doctype html>
      <html>
        <head>
          <title>Example &amp; Brand</title>
          <meta content="Trusted local services" name="description">
          <style>.hidden { display: none }</style>
        </head>
        <body>
          <h1>Example Brand</h1><p>Visible homepage summary.</p>
          <a href="/products">Products</a>
          <a href="https://example.com/about#team">About us</a>
          <a href="/about/?utm_source=navigation">About duplicate</a>
          <a href="https://other.example.com/contact">External contact</a>
          <script>secret()</script>
        </body>
      </html>
    `, { headers: { 'content-type': 'text/html; charset=utf-8' } }));

    const result = await new NodeFetchWebsiteDiscoveryAdapter().discover('https://example.com');

    expect(dnsLookup).toHaveBeenCalledWith('example.com', { all: true, verbatim: true });
    expect(fetchMock).toHaveBeenCalledWith(new URL('https://example.com/'), expect.objectContaining({
      redirect: 'manual',
      signal: expect.any(AbortSignal)
    }));
    expect(result).toEqual({
      url: 'https://example.com/',
      title: 'Example & Brand',
      description: 'Trusted local services',
      excerpt: 'Trusted local services',
      candidatePages: [
        { url: 'https://example.com/products', title: 'Products' },
        { url: 'https://example.com/about', title: 'About us' }
      ]
    });
  });

  it('normalizes duplicate links while preserving meaningful query parameters', async () => {
    fetchMock.mockResolvedValue(new Response(`
      <a href="/faq/?utm_source=nav#top">FAQ tracked</a>
      <a href="https://example.com/faq">FAQ duplicate</a>
      <a href="/search?page=2&sort=recent">Search page</a>
      <a href="/search?sort=recent&page=2">Search duplicate</a>
    `, { headers: { 'content-type': 'text/html' } }));

    const result = await new NodeFetchWebsiteDiscoveryAdapter().discover('https://example.com');

    expect(result.candidatePages).toEqual([
      { url: 'https://example.com/faq', title: 'FAQ tracked' },
      { url: 'https://example.com/search?page=2&sort=recent', title: 'Search page' }
    ]);
  });

  it.each([
    ['private IPv4', 'service.example.com', '10.0.0.8'],
    ['loopback IPv4', 'service.example.com', '127.0.0.1'],
    ['link-local IPv6', 'service.example.com', 'fe80::1']
  ])('rejects %s DNS results before fetch', async (_label, hostname, address) => {
    dnsLookup.mockResolvedValue([{ address, family: address.includes(':') ? 6 : 4 }]);

    await expect(new NodeFetchWebsiteDiscoveryAdapter().discover(`https://${hostname}`)).rejects.toMatchObject({
      code: 'WEBSITE_DISCOVERY_ADDRESS_BLOCKED'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects localhost before fetch', async () => {
    await expect(new NodeFetchWebsiteDiscoveryAdapter().discover('http://localhost')).rejects.toMatchObject({
      code: 'WEBSITE_DISCOVERY_ADDRESS_BLOCKED'
    });
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('rejects redirects to another origin', async () => {
    fetchMock.mockResolvedValue(new Response(null, {
      status: 302,
      headers: { location: 'https://other.example.com/' }
    }));

    await expect(new NodeFetchWebsiteDiscoveryAdapter().discover('https://example.com')).rejects.toMatchObject({
      code: 'WEBSITE_DISCOVERY_REDIRECT_ORIGIN'
    });
    expect(fetchMock).toHaveBeenCalledTimes(1);
  });

  it('stops streaming responses above one MiB', async () => {
    fetchMock.mockResolvedValue(new Response('oversized', {
      headers: {
        'content-type': 'text/html',
        'content-length': String(1024 * 1024 + 1)
      }
    }));

    await expect(new NodeFetchWebsiteDiscoveryAdapter().discover('https://example.com')).rejects.toMatchObject({
      code: 'WEBSITE_DISCOVERY_RESPONSE_TOO_LARGE'
    });
  });

  it('aborts a stalled fetch after the discovery timeout', async () => {
    vi.useFakeTimers();
    fetchMock.mockImplementation((_url, init: RequestInit) => new Promise((_resolve, reject) => {
      init.signal?.addEventListener('abort', () => reject(new DOMException('Aborted', 'AbortError')));
    }));

    const rejection = expect(new NodeFetchWebsiteDiscoveryAdapter().discover('https://example.com'))
      .rejects.toEqual(expect.objectContaining({
        code: 'WEBSITE_DISCOVERY_TIMEOUT',
        message: '官网发现请求超时'
      }));
    await vi.advanceTimersByTimeAsync(8_001);
    await rejection;
  });

  it('wraps fetch failures in a stable business error', async () => {
    fetchMock.mockRejectedValue(new Error('socket details'));

    await expect(new NodeFetchWebsiteDiscoveryAdapter().discover('https://example.com'))
      .rejects.toEqual(expect.any(WebsiteDiscoveryError));
    await expect(new NodeFetchWebsiteDiscoveryAdapter().discover('https://example.com')).rejects.toMatchObject({
      code: 'WEBSITE_DISCOVERY_FETCH_FAILED',
      message: '官网暂时无法访问'
    });
  });
});
