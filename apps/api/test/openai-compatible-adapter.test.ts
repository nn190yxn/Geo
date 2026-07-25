import type { PlatformConfig } from '@geo-platform/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { AIPlatformConfigurationError, AIPlatformProviderError, OpenAICompatibleAdapter } from '../src/modules/platforms/adapters/openai-compatible.adapter';

describe('OpenAICompatibleAdapter', () => {
  it('builds a chat completion request from platform config and prompt input', () => {
    const adapter = new OpenAICompatibleAdapter((credentialRef) => (credentialRef === 'OPENAI_TEST_KEY' ? 'test-token' : undefined));
    const request = adapter.buildRequest(createRunPromptInput(), createPlatformConfig());

    expect(request.url).toBe('https://api.openai.com/v1/chat/completions');
    expect(request.init.method).toBe('POST');
    expect(request.init.headers).toEqual(expect.objectContaining({ authorization: 'Bearer test-token' }));
    expect(JSON.parse(request.init.body as string)).toEqual(
      expect.objectContaining({
        model: 'gpt-test',
        messages: [{ role: 'user', content: '品牌在 AI 回答中如何被推荐？' }],
        metadata: {
          brandId: 'brand_demo',
          platformCode: 'openai'
        }
      })
    );
  });

  it('uses platform endpoint URL for OpenAI-compatible providers', () => {
    const adapter = new OpenAICompatibleAdapter(() => 'test-token');
    const request = adapter.buildRequest(createRunPromptInput(), createPlatformConfig({ endpointUrl: 'https://api.deepseek.com/chat/completions' }));

    expect(request.url).toBe('https://api.deepseek.com/chat/completions');
  });

  it('can be registered with a concrete supported platform code', () => {
    const adapter = new OpenAICompatibleAdapter('doubao', () => 'test-token');
    const request = adapter.buildRequest(
      { ...createRunPromptInput(), platformCode: 'doubao' },
      createPlatformConfig({ platformCode: 'doubao', name: '豆包', endpointUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions' })
    );

    expect(adapter.platformCode).toBe('doubao');
    expect(JSON.parse(request.init.body as string)).toEqual(expect.objectContaining({
      metadata: expect.objectContaining({ platformCode: 'doubao' })
    }));
  });

  it('normalizes provider response into RunPromptResult', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'gpt-4o-mini-2026',
        created: 1783075200,
        choices: [{ message: { content: '这是真实平台回答' } }]
      }),
      text: async () => ''
    });
    const adapter = new OpenAICompatibleAdapter(() => 'test-token', fetcher);

    await expect(adapter.runPrompt(createRunPromptInput(), createPlatformConfig())).resolves.toEqual({
      rawText: '这是真实平台回答',
      modelName: 'gpt-4o-mini-2026',
      respondedAt: '2026-07-03T10:40:00.000Z'
    });
  });

  it('builds a structured messages request with JSON response options', () => {
    const adapter = new OpenAICompatibleAdapter(() => 'test-token');
    const request = adapter.buildMessagesRequest(createRunMessagesInput(), createPlatformConfig());
    const body = JSON.parse(request.init.body as string);

    expect(body).toEqual(
      expect.objectContaining({
        model: 'gpt-test',
        messages: [
          { role: 'system', content: '只返回 JSON' },
          { role: 'developer', content: '按品牌安全规则输出' },
          { role: 'user', content: '生成监测问题' }
        ],
        response_format: { type: 'json_object' },
        temperature: 0.2,
        max_tokens: 800,
        metadata: {
          brandId: 'brand_demo',
          platformCode: 'openai'
        }
      })
    );
    expect(request.init.body).not.toContain('test-token');
  });

  it('merges developer instructions into system messages for StepFun compatibility', () => {
    const adapter = new OpenAICompatibleAdapter(() => 'test-token');
    const request = adapter.buildMessagesRequest(
      { ...createRunMessagesInput(), platformCode: 'stepfun' },
      createPlatformConfig({ platformCode: 'stepfun', name: '阶跃星辰', endpointUrl: 'https://api.stepfun.com/v1/chat/completions', modelName: 'step-3.7-flash' })
    );
    const body = JSON.parse(request.init.body as string);

    expect(body.messages).toEqual([
      { role: 'system', content: '只返回 JSON\n按品牌安全规则输出' },
      { role: 'user', content: '生成监测问题' }
    ]);
  });

  it('normalizes structured message responses with token usage', async () => {
    const fetcher = vi.fn().mockResolvedValue({
      ok: true,
      status: 200,
      json: async () => ({
        model: 'gpt-4o-mini-2026',
        created: 1783075200,
        usage: {
          prompt_tokens: 120,
          completion_tokens: 80,
          total_tokens: 200
        },
        choices: [{ message: { content: '{"themes":[],"candidates":[]}' } }]
      }),
      text: async () => ''
    });
    const adapter = new OpenAICompatibleAdapter(() => 'test-token', fetcher);

    await expect(adapter.runMessages(createRunMessagesInput(), createPlatformConfig())).resolves.toEqual({
      rawText: '{"themes":[],"candidates":[]}',
      modelName: 'gpt-4o-mini-2026',
      respondedAt: '2026-07-03T10:40:00.000Z',
      inputTokenCount: 120,
      outputTokenCount: 80
    });
  });

  it('validates api config fields without exposing secrets', async () => {
    const adapter = new OpenAICompatibleAdapter(() => undefined);

    await expect(adapter.validateConfig(createPlatformConfig({ credentialRef: 'OPENAI_TEST_KEY' }))).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        mode: 'api',
        message: '平台密钥未配置或不可用'
      })
    );
    await expect(adapter.validateConfig(createPlatformConfig({ endpointUrl: undefined }))).resolves.toEqual(
      expect.objectContaining({ ok: false, mode: 'api', message: 'API 接口地址未配置' })
    );
    await expect(adapter.validateConfig(createPlatformConfig({ modelName: undefined }))).resolves.toEqual(
      expect.objectContaining({ ok: false, mode: 'api', message: '模型名称未配置' })
    );
    expect(() => adapter.buildRequest(createRunPromptInput(), createPlatformConfig({ credentialRef: 'OPENAI_TEST_KEY' }))).toThrow(AIPlatformConfigurationError);
  });

  it('accepts a directly pasted API key while keeping env-var names strict', async () => {
    const adapter = new OpenAICompatibleAdapter('openai');

    await expect(adapter.validateConfig(createPlatformConfig({ credentialRef: 'sk-stepfun-test-token-1234567890' }))).resolves.toEqual(
      expect.objectContaining({ ok: true, mode: 'api', message: '标准 API 配置可用' })
    );
    await expect(adapter.validateConfig(createPlatformConfig({ credentialRef: 'STEPFUN_API_KEY' }))).resolves.toEqual(
      expect.objectContaining({ ok: false, mode: 'api', message: '平台密钥未配置或不可用' })
    );
  });

  it('classifies provider failures for retry handling', async () => {
    const rateLimitedAdapter = new OpenAICompatibleAdapter(() => 'test-token', vi.fn().mockResolvedValue(createFailedResponse(429, 'rate limited')));
    const badRequestAdapter = new OpenAICompatibleAdapter(() => 'test-token', vi.fn().mockResolvedValue(createFailedResponse(400, 'bad request')));

    await expect(rateLimitedAdapter.runPrompt(createRunPromptInput(), createPlatformConfig())).rejects.toEqual(
      expect.objectContaining({
        code: 'provider_rate_limited',
        retryable: true
      })
    );
    await expect(badRequestAdapter.runPrompt(createRunPromptInput(), createPlatformConfig())).rejects.toEqual(
      expect.objectContaining({
        code: 'provider_request_failed',
        retryable: false
      })
    );
  });

  it('classifies auth failures as non retryable provider errors', async () => {
    const adapter = new OpenAICompatibleAdapter(() => 'test-token', vi.fn().mockResolvedValue(createFailedResponse(401, 'unauthorized')));

    await expect(adapter.runMessages(createRunMessagesInput(), createPlatformConfig())).rejects.toEqual(
      expect.objectContaining({
        code: 'provider_auth_failed',
        retryable: false
      })
    );
  });

  it('returns structured errors for empty provider responses', async () => {
    const adapter = new OpenAICompatibleAdapter(
      () => 'test-token',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => ({ choices: [{ message: { content: '' } }] }),
        text: async () => ''
      })
    );

    await expect(adapter.runPrompt(createRunPromptInput(), createPlatformConfig())).rejects.toBeInstanceOf(AIPlatformProviderError);
  });

  it('returns structured errors for invalid provider JSON', async () => {
    const adapter = new OpenAICompatibleAdapter(
      () => 'test-token',
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        json: async () => {
          throw new Error('invalid json');
        },
        text: async () => ''
      })
    );

    await expect(adapter.runMessages(createRunMessagesInput(), createPlatformConfig())).rejects.toEqual(
      expect.objectContaining({
        code: 'provider_invalid_response',
        retryable: true
      })
    );
  });
});

function createRunPromptInput() {
  return {
    brandId: 'brand_demo',
    platformCode: 'openai',
    promptText: '品牌在 AI 回答中如何被推荐？'
  };
}

function createRunMessagesInput() {
  return {
    brandId: 'brand_demo',
    platformCode: 'openai',
    messages: [
      { role: 'system' as const, content: '只返回 JSON' },
      { role: 'developer' as const, content: '按品牌安全规则输出' },
      { role: 'user' as const, content: '生成监测问题' }
    ],
    responseFormat: 'json' as const,
    temperature: 0.2,
    maxTokens: 800
  };
}

function createPlatformConfig(input: Partial<PlatformConfig & { credentialRef: string }> = {}): PlatformConfig & { credentialRef: string } {
  return {
    id: 'platform_openai',
    brandId: 'brand_demo',
    platformCode: 'openai',
    name: 'OpenAI',
    mode: 'api',
    availableMethods: ['api'],
    connectionStatus: 'ready',
    connectionStatusLabel: '可自动监测',
    nextAction: '可直接加入自动监测计划。',
    endpointUrl: 'https://api.openai.com/v1/chat/completions',
    modelName: 'gpt-test',
    rateLimitPerMinute: 60,
    enabled: true,
    hasCredential: true,
    credentialRef: 'OPENAI_TEST_KEY',
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z',
    ...input
  };
}

function createFailedResponse(status: number, body: string) {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => body
  };
}
