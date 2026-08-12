import { describe, expect, it } from 'vitest';
import { PublishingAdapterRegistry } from '../src/modules/publishing/adapters/publishing-adapter.registry';
import { WebhookPublishingAdapter } from '../src/modules/publishing/adapters/webhook-publishing.adapter';

describe('PublishingAdapterRegistry', () => {
  it('仅返回脱敏的能力摘要和恢复动作', () => {
    const registry = new PublishingAdapterRegistry([new WebhookPublishingAdapter({ wordpress: { endpointUrl: 'https://publish.example.test/hook', authorizationToken: 'secret' } })]);

    expect(registry.listCapabilities(['wordpress', 'wechat_official'])).toEqual([
      expect.objectContaining({ platform: 'wordpress', connectionStatus: 'available', supportsDraftCreation: true, resultMode: 'published' }),
      expect.objectContaining({ platform: 'wechat_official', connectionStatus: 'unconfigured', resultMode: 'manual_handoff' })
    ]);
    expect(JSON.stringify(registry.listCapabilities(['wordpress']))).not.toContain('secret');
  });
});
