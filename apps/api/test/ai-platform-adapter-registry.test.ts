import type { PlatformConfig, RunPromptInput, RunPromptResult } from '@geo-platform/shared-types';
import { describe, expect, it } from 'vitest';
import type { AIPlatformAdapter } from '../src/modules/platforms/adapters/ai-platform.adapter';
import {
  AIPlatformAdapterRegistry,
  AIPlatformAdapterSelectionError,
  createDefaultAIPlatformAdapters
} from '../src/modules/platforms/adapters/ai-platform-adapter.registry';

describe('AIPlatformAdapterRegistry', () => {
  it('selects a direct adapter by platform code', () => {
    const customAdapter = createFakeAdapter('openai');
    const registry = new AIPlatformAdapterRegistry([customAdapter, ...createDefaultAIPlatformAdapters()]);

    expect(registry.selectAdapter(createPlatformConfig({ platformCode: 'openai', mode: 'api' }))).toBe(customAdapter);
  });

  it('falls back to the mock adapter for mock mode', () => {
    const registry = new AIPlatformAdapterRegistry(createDefaultAIPlatformAdapters());
    const adapter = registry.requireAdapter(createPlatformConfig({ platformCode: 'unregistered_mock', mode: 'mock' }));

    expect(adapter.platformCode).toBe('mock_ai');
  });

  it('falls back to the manual adapter for manual modes', () => {
    const registry = new AIPlatformAdapterRegistry(createDefaultAIPlatformAdapters());

    expect(registry.requireAdapter(createPlatformConfig({ platformCode: 'manual_vendor', mode: 'manual' })).platformCode).toBe('manual_input');
    expect(registry.requireAdapter(createPlatformConfig({ platformCode: 'semi_vendor', mode: 'semi_auto' })).platformCode).toBe('manual_input');
  });

  it('raises a typed selection error when no adapter can handle api mode', () => {
    const registry = new AIPlatformAdapterRegistry(createDefaultAIPlatformAdapters());
    const config = createPlatformConfig({ platformCode: 'missing_api', mode: 'api' });

    expect(() => registry.requireAdapter(config)).toThrow(AIPlatformAdapterSelectionError);
    expect(registry.selectAdapter(config)).toBeNull();
  });

  it('uses the OpenAI-compatible adapter for api configs with endpoint URLs', () => {
    const registry = new AIPlatformAdapterRegistry(createDefaultAIPlatformAdapters());
    const adapter = registry.requireAdapter(createPlatformConfig({ platformCode: 'deepseek', mode: 'api', endpointUrl: 'https://api.deepseek.com/chat/completions' }));

    expect(adapter.platformCode).toBe('deepseek');
  });

  it('registers direct API adapters for the first supported platforms', () => {
    const registry = new AIPlatformAdapterRegistry(createDefaultAIPlatformAdapters());

    expect(['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'].map((platformCode) => (
      registry.requireAdapter(createPlatformConfig({ platformCode, mode: 'api', endpointUrl: `https://api.example.com/${platformCode}` })).platformCode
    ))).toEqual(['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']);
  });

  it('keeps selection errors structured for configuration failures', () => {
    const registry = new AIPlatformAdapterRegistry(createDefaultAIPlatformAdapters());
    const config = createPlatformConfig({ platformCode: 'missing_api', mode: 'api' });

    try {
      registry.requireAdapter(config);
      throw new Error('Expected adapter selection to fail');
    } catch (error) {
      expect(error).toBeInstanceOf(AIPlatformAdapterSelectionError);
      expect(error).toEqual(
        expect.objectContaining({
          code: 'adapter_not_registered',
          platformCode: 'missing_api',
          mode: 'api'
        })
      );
    }
  });

  it('surfaces missing credential validation through the adapter contract', async () => {
    const credentialAdapter = createCredentialCheckingAdapter('openai');
    const config = createPlatformConfig({ platformCode: 'openai', mode: 'api', hasCredential: false });

    await expect(credentialAdapter.validateConfig(config)).resolves.toEqual(
      expect.objectContaining({
        ok: false,
        mode: 'api',
        message: 'API credential reference is missing'
      })
    );
  });
});

function createPlatformConfig(input: Pick<PlatformConfig, 'platformCode' | 'mode'> & Partial<Pick<PlatformConfig, 'hasCredential' | 'endpointUrl'>>): PlatformConfig {
  return {
    id: `platform_${input.platformCode}`,
    brandId: 'brand_demo',
    platformCode: input.platformCode,
    name: input.platformCode,
    mode: input.mode,
    availableMethods: input.mode === 'api' ? ['api'] : ['manual'],
    connectionStatus: input.mode === 'api' ? 'ready' : 'manual_available',
    connectionStatusLabel: input.mode === 'api' ? '可自动监测' : '可手动录入',
    nextAction: input.mode === 'api' ? '可直接加入自动监测计划。' : '复制问题到平台后录入回答。',
    endpointUrl: input.endpointUrl,
    rateLimitPerMinute: 60,
    enabled: true,
    hasCredential: input.hasCredential ?? input.mode === 'api',
    createdAt: '2026-07-03T00:00:00.000Z',
    updatedAt: '2026-07-03T00:00:00.000Z'
  };
}

function createCredentialCheckingAdapter(platformCode: string): AIPlatformAdapter {
  return {
    ...createFakeAdapter(platformCode),
    async validateConfig(config: PlatformConfig) {
      return {
        ok: config.hasCredential,
        mode: config.mode,
        checkedAt: '2026-07-03T00:00:00.000Z',
        message: config.hasCredential ? 'credential available' : 'API credential reference is missing'
      };
    }
  };
}

function createFakeAdapter(platformCode: string): AIPlatformAdapter {
  return {
    platformCode,
    async runPrompt(input: RunPromptInput): Promise<RunPromptResult> {
      return {
        rawText: input.promptText,
        modelName: 'fake-model',
        respondedAt: '2026-07-03T00:00:00.000Z'
      };
    },
    async validateConfig(config: PlatformConfig) {
      return {
        ok: true,
        mode: config.mode,
        checkedAt: '2026-07-03T00:00:00.000Z',
        message: 'fake adapter valid'
      };
    }
  };
}
