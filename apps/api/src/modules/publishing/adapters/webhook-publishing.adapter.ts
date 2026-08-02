import type { PublishingAdapter, PublishingAdapterRequest, PublishingAdapterResult } from './publishing.adapter';

type WebhookPublishingConfig = {
  endpointUrl: string;
  authorizationToken?: string;
};

type WebhookPublishingConfigs = Record<string, WebhookPublishingConfig>;

export class WebhookPublishingAdapter implements PublishingAdapter {
  constructor(
    private readonly configs: WebhookPublishingConfigs,
    private readonly request: typeof fetch = globalThis.fetch
  ) {}

  supports(platform: string): boolean {
    return Boolean(this.configs[platform]);
  }

  async publish(payload: PublishingAdapterRequest): Promise<PublishingAdapterResult> {
    const config = this.configs[payload.platform];
    if (!config) {
      throw new Error(`平台 ${payload.platform} 尚未配置发布 Webhook`);
    }

    const response = await this.request(config.endpointUrl, {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'idempotency-key': payload.idempotencyKey,
        ...(config.authorizationToken ? { authorization: `Bearer ${config.authorizationToken}` } : {})
      },
      body: JSON.stringify(payload),
      signal: AbortSignal.timeout(15_000)
    });

    if (!response.ok) {
      throw new Error(`发布平台返回 HTTP ${response.status}`);
    }

    const result = await response.json() as Partial<PublishingAdapterResult>;
    if (!result.publishedUrl || !isHttpUrl(result.publishedUrl)) {
      throw new Error('发布平台未返回有效的 publishedUrl');
    }

    return {
      externalPlatformId: result.externalPlatformId?.trim() || undefined,
      publishedUrl: result.publishedUrl
    };
  }
}

export function readWebhookPublishingConfigs(value = process.env.GEO_PUBLISHING_WEBHOOKS): WebhookPublishingConfigs {
  if (!value) return {};

  try {
    const parsed = JSON.parse(value) as Record<string, Partial<WebhookPublishingConfig>>;
    return Object.fromEntries(Object.entries(parsed).flatMap(([platform, config]) => {
      if (!platform.trim() || !config.endpointUrl || !isHttpUrl(config.endpointUrl)) return [];
      return [[platform.trim(), { endpointUrl: config.endpointUrl, authorizationToken: config.authorizationToken }]];
    }));
  } catch {
    return {};
  }
}

function isHttpUrl(value: string): boolean {
  try {
    return ['http:', 'https:'].includes(new URL(value).protocol);
  } catch {
    return false;
  }
}
