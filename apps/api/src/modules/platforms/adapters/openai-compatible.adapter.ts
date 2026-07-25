import type { PlatformValidationResult, RunPromptInput, RunPromptResult } from '@geo-platform/shared-types';
import type { AIPlatformAdapter, AIPlatformRuntimeConfig, RunLLMInput, RunLLMResult } from './ai-platform.adapter';

type CredentialResolver = (credentialRef: string) => string | undefined;
type FetchLike = (url: string, init: RequestInit) => Promise<Pick<Response, 'ok' | 'status' | 'json' | 'text'>>;

type ChatCompletionResponse = {
  model?: string;
  created?: number;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
  choices?: Array<{
    message?: {
      content?: string | null;
    };
    text?: string | null;
  }>;
};

type ProviderRequestOptions = {
  responseFormat?: 'json' | 'text';
  temperature?: number;
  maxTokens?: number;
};

export class OpenAICompatibleAdapter implements AIPlatformAdapter {
  readonly platformCode: string;
  private readonly credentialResolver: CredentialResolver;
  private readonly fetcher: FetchLike;

  constructor(
    platformCodeOrCredentialResolver: string | CredentialResolver = 'openai',
    credentialResolverOrFetcher?: CredentialResolver | FetchLike,
    fetcher: FetchLike = fetch
  ) {
    if (typeof platformCodeOrCredentialResolver === 'function') {
      this.platformCode = 'openai';
      this.credentialResolver = platformCodeOrCredentialResolver;
      this.fetcher = (credentialResolverOrFetcher as FetchLike | undefined) ?? fetch;
      return;
    }

    this.platformCode = platformCodeOrCredentialResolver;
    this.credentialResolver = (credentialResolverOrFetcher as CredentialResolver | undefined) ?? resolveCredentialFromEnvironment;
    this.fetcher = fetcher;
  }

  buildRequest(input: RunPromptInput, config: AIPlatformRuntimeConfig): { url: string; init: RequestInit } {
    return this.buildChatCompletionRequest(
      {
        brandId: input.brandId,
        platformCode: input.platformCode,
        messages: [
          {
            role: 'user',
            content: input.promptText
          }
        ]
      },
      config
    );
  }

  buildMessagesRequest(input: RunLLMInput, config: AIPlatformRuntimeConfig): { url: string; init: RequestInit } {
    return this.buildChatCompletionRequest(input, config, {
      responseFormat: input.responseFormat,
      temperature: input.temperature,
      maxTokens: input.maxTokens
    });
  }

  private buildChatCompletionRequest(input: RunLLMInput, config: AIPlatformRuntimeConfig, options: ProviderRequestOptions = {}): { url: string; init: RequestInit } {
    const credential = this.resolveCredential(config);
    const body: Record<string, unknown> = {
      model: config.modelName ?? 'gpt-4o-mini',
      messages: normalizeMessagesForProvider(input.messages, config.platformCode),
      metadata: {
        brandId: input.brandId,
        platformCode: input.platformCode
      }
    };

    if (options.responseFormat === 'json') {
      body.response_format = { type: 'json_object' };
    }

    if (typeof options.temperature === 'number') {
      body.temperature = options.temperature;
    }

    if (typeof options.maxTokens === 'number') {
      body.max_tokens = options.maxTokens;
    }

    return {
      url: config.endpointUrl ?? 'https://api.openai.com/v1/chat/completions',
      init: {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          authorization: `Bearer ${credential}`
        },
        body: JSON.stringify(body)
      }
    };
  }

  async runPrompt(input: RunPromptInput, config?: AIPlatformRuntimeConfig): Promise<RunPromptResult> {
    if (!config) {
      throw new AIPlatformConfigurationError('platform_config_missing', '缺少平台运行配置', false);
    }

    const request = this.buildRequest(input, config);
    const response = await this.fetcher(request.url, request.init);

    if (!response.ok) {
      throw await normalizeProviderError(response);
    }

    const result = await this.parseChatCompletionResponse(response, config);

    return {
      rawText: result.rawText,
      modelName: result.modelName,
      respondedAt: result.respondedAt
    };
  }

  async runMessages(input: RunLLMInput, config?: AIPlatformRuntimeConfig): Promise<RunLLMResult> {
    if (!config) {
      throw new AIPlatformConfigurationError('platform_config_missing', '缺少平台运行配置', false);
    }

    if (input.messages.length === 0) {
      throw new AIPlatformConfigurationError('messages_missing', '缺少要发送给 AI 平台的消息', false);
    }

    const request = this.buildMessagesRequest(input, config);
    const response = await this.fetcher(request.url, request.init);

    if (!response.ok) {
      throw await normalizeProviderError(response);
    }

    return this.parseChatCompletionResponse(response, config);
  }

  private async parseChatCompletionResponse(response: Pick<Response, 'json'>, config: AIPlatformRuntimeConfig): Promise<RunLLMResult> {
    let payload: ChatCompletionResponse;

    try {
      payload = (await response.json()) as ChatCompletionResponse;
    } catch {
      throw new AIPlatformProviderError('provider_invalid_response', 'AI 平台返回格式无法解析', true);
    }

    const rawText = payload.choices?.[0]?.message?.content ?? payload.choices?.[0]?.text ?? '';

    if (!rawText.trim()) {
      throw new AIPlatformProviderError('provider_empty_response', 'AI 平台返回内容为空', true);
    }

    return {
      rawText,
      modelName: payload.model ?? config.modelName,
      respondedAt: payload.created ? new Date(payload.created * 1000).toISOString() : new Date().toISOString(),
      inputTokenCount: payload.usage?.prompt_tokens,
      outputTokenCount: payload.usage?.completion_tokens
    };
  }

  async validateConfig(config: AIPlatformRuntimeConfig): Promise<PlatformValidationResult> {
    const checkedAt = new Date().toISOString();

    if (config.mode !== 'api') {
      return {
        ok: false,
        mode: config.mode,
        checkedAt,
        message: '当前配置无法使用自动监测，请改用浏览器辅助监测或手动录入回答'
      };
    }

    if (!config.endpointUrl) {
      return {
        ok: false,
        mode: config.mode,
        checkedAt,
        message: 'API 接口地址未配置'
      };
    }

    if (!config.modelName) {
      return {
        ok: false,
        mode: config.mode,
        checkedAt,
        message: '模型名称未配置'
      };
    }

    if (!config.credentialRef || !this.credentialResolver(config.credentialRef)) {
      return {
        ok: false,
        mode: config.mode,
        checkedAt,
        message: '平台密钥未配置或不可用'
      };
    }

    return {
      ok: true,
      mode: config.mode,
      checkedAt,
      message: '标准 API 配置可用'
    };
  }

  private resolveCredential(config: AIPlatformRuntimeConfig): string {
    if (!config.credentialRef) {
      throw new AIPlatformConfigurationError('credential_missing', '请先填写平台密钥', false);
    }

    const credential = this.credentialResolver(config.credentialRef);

    if (!credential) {
      throw new AIPlatformConfigurationError('credential_missing', '平台密钥不可用，请重新检查', false);
    }

    return credential;
  }
}

export class AIPlatformConfigurationError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = 'AIPlatformConfigurationError';
  }
}

export class AIPlatformProviderError extends Error {
  constructor(
    readonly code: string,
    message: string,
    readonly retryable: boolean
  ) {
    super(message);
    this.name = 'AIPlatformProviderError';
  }
}

async function normalizeProviderError(response: Pick<Response, 'status' | 'text'>): Promise<AIPlatformProviderError> {
  const bodyText = await response.text();
  const statusCode = response.status;

  if (statusCode === 429) {
    return new AIPlatformProviderError('provider_rate_limited', 'AI 平台请求达到限流', true);
  }

  if (statusCode === 401 || statusCode === 403) {
    return new AIPlatformProviderError('provider_auth_failed', 'AI 平台密钥无效或权限不足，请检查平台连接信息', false);
  }

  if (statusCode >= 500) {
    return new AIPlatformProviderError('provider_unavailable', 'AI 平台暂时不可用', true);
  }

  return new AIPlatformProviderError('provider_request_failed', `AI 平台请求失败：HTTP ${statusCode}${bodyText ? ` ${bodyText}` : ''}`, false);
}

function resolveCredentialFromEnvironment(credentialRef: string): string | undefined {
  return process.env[credentialRef] ?? resolveInlineCredential(credentialRef);
}

function normalizeMessagesForProvider(messages: RunLLMInput['messages'], platformCode: string): RunLLMInput['messages'] {
  if (platformCode !== 'stepfun') {
    return messages;
  }

  const developerMessages = messages.filter((message) => message.role === 'developer');

  if (developerMessages.length === 0) {
    return messages;
  }

  const developerContent = developerMessages.map((message) => message.content).join('\n');
  const normalizedMessages = messages.filter((message) => message.role !== 'developer');
  const systemIndex = normalizedMessages.findIndex((message) => message.role === 'system');

  if (systemIndex >= 0) {
    return normalizedMessages.map((message, index) => index === systemIndex
      ? { ...message, content: `${message.content}\n${developerContent}` }
      : message);
  }

  return [{ role: 'system', content: developerContent }, ...normalizedMessages];
}

function resolveInlineCredential(credentialRef: string): string | undefined {
  const value = credentialRef.trim();

  if (!value || /\s/.test(value)) {
    return undefined;
  }

  if (/^[A-Z][A-Z0-9_]{2,}$/.test(value)) {
    return undefined;
  }

  if (value.length >= 20 || /^sk-[\w-]+/i.test(value)) {
    return value;
  }

  return undefined;
}
