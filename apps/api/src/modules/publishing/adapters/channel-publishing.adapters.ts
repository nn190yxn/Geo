import type { PublishingAdapterCapability } from '@geo-platform/shared-types';
import { PublishingAdapterError, type PublishingAdapter, type PublishingAdapterConnectionResult, type PublishingAdapterRequest, type PublishingAdapterResult, type PublishingAdapterStatusResult } from './publishing.adapter';

type ChannelConfig = { endpointUrl: string; authorizationToken: string };
type ChannelConfigs = Record<string, ChannelConfig>;

abstract class HttpPublishingAdapter implements PublishingAdapter {
  protected abstract readonly platform: string;
  protected abstract readonly resultMode: PublishingAdapterCapability['resultMode'];

  constructor(protected readonly configs: ChannelConfigs, protected readonly request: typeof fetch = globalThis.fetch) {}

  supports(platform: string): boolean {
    return platform === this.platform && Boolean(this.configs[platform]);
  }

  getCapability(platform: string): PublishingAdapterCapability {
    const configured = this.supports(platform);
    return { platform, connectionStatus: configured ? 'available' : 'unconfigured', supportsConnectionValidation: configured, supportsDraftCreation: configured, supportsStatusQuery: false, resultMode: this.resultMode, recoveryAction: configured ? '确认账号授权后执行发布' : '在服务端配置渠道凭据后重试' };
  }

  async validateConnection(platform: string): Promise<PublishingAdapterConnectionResult> {
    return this.supports(platform) ? { status: 'connected' } : { status: 'failed', failureCategory: 'authentication' };
  }

  async createDraft(request: PublishingAdapterRequest): Promise<PublishingAdapterResult> {
    return this.send(request, 'draft');
  }

  async publish(request: PublishingAdapterRequest): Promise<PublishingAdapterResult> {
    return this.send(request, 'publish');
  }

  async getStatus(_platform: string, _externalPlatformId: string): Promise<PublishingAdapterStatusResult> {
    return { status: 'unknown' };
  }

  protected abstract send(request: PublishingAdapterRequest, status: 'draft' | 'publish'): Promise<PublishingAdapterResult>;

  protected async post(config: ChannelConfig, payload: unknown): Promise<Record<string, unknown>> {
    const response = await this.request(config.endpointUrl, { method: 'POST', headers: { authorization: `Bearer ${config.authorizationToken}`, 'content-type': 'application/json' }, body: JSON.stringify(payload), signal: AbortSignal.timeout(15_000) });
    if (!response.ok) throw new PublishingAdapterError(`发布平台返回 HTTP ${response.status}`, response.status === 401 || response.status === 403 ? 'authentication' : response.status === 429 ? 'rate_limited' : 'platform');
    return await response.json() as Record<string, unknown>;
  }
}

export class WordPressPublishingAdapter extends HttpPublishingAdapter {
  protected readonly platform = 'wordpress';
  protected readonly resultMode = 'draft' as const;

  protected async send(request: PublishingAdapterRequest, status: 'draft' | 'publish'): Promise<PublishingAdapterResult> {
    const result = await this.post(this.configs.wordpress, { title: request.title, content: request.body, status, idempotencyKey: request.idempotencyKey });
    const publishedUrl = typeof result.link === 'string' ? result.link : undefined;
    if (!publishedUrl) throw new Error('WordPress 未返回真实链接');
    return { externalPlatformId: String(result.id ?? ''), publishedUrl };
  }
}

export class GitHubContentsPublishingAdapter extends HttpPublishingAdapter {
  protected readonly platform = 'github_contents';
  protected readonly resultMode = 'published' as const;

  protected async send(request: PublishingAdapterRequest, _status: 'draft' | 'publish'): Promise<PublishingAdapterResult> {
    const result = await this.post(this.configs.github_contents, { message: request.title, content: Buffer.from(request.body).toString('base64'), idempotencyKey: request.idempotencyKey });
    const content = result.content as { sha?: string; html_url?: string } | undefined;
    if (!content?.html_url) throw new Error('GitHub Contents 未返回真实链接');
    return { externalPlatformId: content.sha, publishedUrl: content.html_url };
  }
}

export class WeChatOfficialPublishingAdapter implements PublishingAdapter {
  supports(platform: string): boolean { return platform === 'wechat' || platform === 'wechat_official'; }
  getCapability(platform: string): PublishingAdapterCapability { return { platform, connectionStatus: 'unconfigured', supportsConnectionValidation: false, supportsDraftCreation: true, supportsStatusQuery: false, resultMode: 'manual_handoff', recoveryAction: '在公众号后台创建草稿并回填真实链接' }; }
  async validateConnection(): Promise<PublishingAdapterConnectionResult> { return { status: 'failed', failureCategory: 'platform' }; }
  async createDraft(): Promise<PublishingAdapterResult> { throw new Error('微信公众号需要在渠道后台确认草稿'); }
  async publish(): Promise<PublishingAdapterResult> { throw new Error('微信公众号需要在渠道后台确认草稿'); }
  async getStatus(): Promise<PublishingAdapterStatusResult> { return { status: 'unknown' }; }
}

export function readChannelConfigs(value?: string): ChannelConfigs {
  if (!value) return {};
  try {
    const parsed = JSON.parse(value) as Record<string, Partial<ChannelConfig>>;
    return Object.fromEntries(Object.entries(parsed).flatMap(([platform, config]) => platform && config.endpointUrl && config.authorizationToken ? [[platform, { endpointUrl: config.endpointUrl, authorizationToken: config.authorizationToken }]] : []));
  } catch { return {}; }
}
