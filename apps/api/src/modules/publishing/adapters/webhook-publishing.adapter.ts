import { PublishingAdapterError, type PublishingAdapter, type PublishingAdapterConnectionResult, type PublishingAdapterRequest, type PublishingAdapterResult, type PublishingAdapterStatusResult } from './publishing.adapter';
import type { PublishingAdapterCapability } from '@geo-platform/shared-types';

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

  getCapability(platform: string): PublishingAdapterCapability {
    return {
      platform,
      connectionStatus: this.supports(platform) ? 'available' : 'unconfigured',
      supportsConnectionValidation: this.supports(platform),
      supportsDraftCreation: this.supports(platform),
      supportsStatusQuery: false,
      resultMode: 'published',
      recoveryAction: this.supports(platform) ? '确认账号授权后执行发布' : '配置渠道 Webhook 后重试'
    };
  }

  async validateConnection(platform: string): Promise<PublishingAdapterConnectionResult> {
    return this.supports(platform) ? { status: 'connected' } : { status: 'failed', failureCategory: 'platform' };
  }

  async createDraft(payload: PublishingAdapterRequest): Promise<PublishingAdapterResult> {
    return this.publish(payload);
  }

  async publish(payload: PublishingAdapterRequest): Promise<PublishingAdapterResult> {
    const config = this.configs[payload.platform];
    if (!config) {
      throw new PublishingAdapterError(`平台 ${payload.platform} 尚未配置发布 Webhook`, 'platform');
    }

    let response: Response;
    try {
      response = await this.request(config.endpointUrl, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          'idempotency-key': payload.idempotencyKey,
          ...(config.authorizationToken ? { authorization: `Bearer ${config.authorizationToken}` } : {})
        },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(15_000)
      });
    } catch (error) {
      throw new PublishingAdapterError('发布平台请求超时或网络不可用', error instanceof DOMException && error.name === 'TimeoutError' ? 'timeout' : 'unknown');
    }

    if (!response.ok) throw new PublishingAdapterError(`发布平台返回 HTTP ${response.status}`, response.status === 401 || response.status === 403 ? 'authentication' : response.status === 429 ? 'rate_limited' : 'platform');

    const result = await response.json() as Partial<PublishingAdapterResult>;
    if (!result.publishedUrl || !isHttpUrl(result.publishedUrl)) {
      throw new PublishingAdapterError('发布平台未返回有效的 publishedUrl', 'platform');
    }

    return {
      externalPlatformId: result.externalPlatformId?.trim() || undefined,
      publishedUrl: result.publishedUrl
    };
  }

  async getStatus(_platform: string, _externalPlatformId: string): Promise<PublishingAdapterStatusResult> {
    return { status: 'unknown' };
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
