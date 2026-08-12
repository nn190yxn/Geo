import { describe, expect, it, vi } from 'vitest';
import { PublishingAdapterError } from '../src/modules/publishing/adapters/publishing.adapter';
import { WebhookPublishingAdapter } from '../src/modules/publishing/adapters/webhook-publishing.adapter';

const payload = { idempotencyKey: 'record-1', brandId: 'brand-1', accountId: 'account-1', accountName: '账号', platform: 'website', title: '标题', body: '正文' };

describe('PublishingAdapter contract', () => {
  it('preserves idempotency keys and real links across duplicate submissions', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ externalPlatformId: 'remote-1', publishedUrl: 'https://site.example/posts/1' }), { status: 200 }));
    const adapter = new WebhookPublishingAdapter({ website: { endpointUrl: 'https://site.example/hook', authorizationToken: 'secret' } }, request as typeof fetch);
    const first = await adapter.publish(payload);
    const repeated = await adapter.publish(payload);
    expect(first).toEqual(repeated);
    expect(request.mock.calls.every(([, init]) => (init?.headers as Record<string, string>)['idempotency-key'] === 'record-1')).toBe(true);
  });

  it.each([[401, 'authentication'], [429, 'rate_limited'], [500, 'platform']] as const)('maps HTTP %s to %s', async (status, failureCategory) => {
    const adapter = new WebhookPublishingAdapter({ website: { endpointUrl: 'https://site.example/hook' } }, (async () => new Response('', { status })) as typeof fetch);
    await expect(adapter.publish(payload)).rejects.toMatchObject<Partial<PublishingAdapterError>>({ failureCategory });
  });

  it('maps request timeouts to a recoverable timeout category', async () => {
    const adapter = new WebhookPublishingAdapter({ website: { endpointUrl: 'https://site.example/hook' } }, (async () => { throw new DOMException('timed out', 'TimeoutError'); }) as typeof fetch);
    await expect(adapter.publish(payload)).rejects.toMatchObject<Partial<PublishingAdapterError>>({ failureCategory: 'timeout' });
  });

  it('returns recoverable unknown status and never publishes authorization tokens', async () => {
    const adapter = new WebhookPublishingAdapter({ website: { endpointUrl: 'https://site.example/hook', authorizationToken: 'secret' } });
    await expect(adapter.getStatus('website', 'remote-1')).resolves.toEqual({ status: 'unknown' });
    expect(JSON.stringify(adapter.getCapability('website'))).not.toContain('secret');
  });
});
