import { describe, expect, it, vi } from 'vitest';
import { readWebhookPublishingConfigs, WebhookPublishingAdapter } from '../src/modules/publishing/adapters/webhook-publishing.adapter';

const payload = {
  idempotencyKey: 'record_1',
  brandId: 'brand_1',
  accountId: 'account_1',
  accountName: '品牌官网',
  platform: 'website',
  title: '品牌内容',
  body: '正文'
};

describe('WebhookPublishingAdapter', () => {
  it('sends authorization and idempotency headers to the configured platform endpoint', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({
      externalPlatformId: 'external_1',
      publishedUrl: 'https://example.com/articles/1'
    }), { status: 200, headers: { 'content-type': 'application/json' } }));
    const adapter = new WebhookPublishingAdapter({
      website: { endpointUrl: 'https://publisher.example.com/publish', authorizationToken: 'secret-token' }
    }, request as typeof fetch);

    await expect(adapter.publish(payload)).resolves.toEqual({
      externalPlatformId: 'external_1',
      publishedUrl: 'https://example.com/articles/1'
    });
    expect(request).toHaveBeenCalledWith('https://publisher.example.com/publish', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ authorization: 'Bearer secret-token', 'idempotency-key': 'record_1' })
    }));
  });

  it('rejects successful responses without a verifiable published URL', async () => {
    const request = vi.fn(async () => new Response(JSON.stringify({ externalPlatformId: 'external_1' }), { status: 200 }));
    const adapter = new WebhookPublishingAdapter({ website: { endpointUrl: 'https://publisher.example.com/publish' } }, request as typeof fetch);

    await expect(adapter.publish(payload)).rejects.toThrow('publishedUrl');
  });

  it('ignores malformed and unsupported webhook configuration', () => {
    expect(readWebhookPublishingConfigs('{invalid')).toEqual({});
    expect(readWebhookPublishingConfigs(JSON.stringify({ website: { endpointUrl: 'file:///tmp/publish' } }))).toEqual({});
  });
});
