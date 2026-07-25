import { Inject, Injectable, Optional } from '@nestjs/common';
import type { PlatformConfig, PlatformMode } from '@geo-platform/shared-types';
import type { AIPlatformAdapter } from './ai-platform.adapter';
import { ManualInputAdapter } from './manual-input.adapter';
import { MockAdapter } from './mock.adapter';
import { OpenAICompatibleAdapter } from './openai-compatible.adapter';

export const AI_PLATFORM_ADAPTERS = Symbol('AI_PLATFORM_ADAPTERS');

export class AIPlatformAdapterSelectionError extends Error {
  readonly code = 'adapter_not_registered';
  readonly platformCode: string;
  readonly mode: PlatformMode;

  constructor(platformCode: string, mode: PlatformMode) {
    super(`No AI platform adapter registered for ${platformCode} in ${mode} mode`);
    this.name = 'AIPlatformAdapterSelectionError';
    this.platformCode = platformCode;
    this.mode = mode;
  }
}

@Injectable()
export class AIPlatformAdapterRegistry {
  constructor(@Optional() @Inject(AI_PLATFORM_ADAPTERS) private readonly adapters: AIPlatformAdapter[] = []) {}

  listAdapters(): AIPlatformAdapter[] {
    return [...this.adapters];
  }

  selectAdapter(config: Pick<PlatformConfig, 'platformCode' | 'mode'> & Partial<Pick<PlatformConfig, 'endpointUrl'>>): AIPlatformAdapter | null {
    const directMatch = this.adapters.find((adapter) => adapter.platformCode === config.platformCode);

    if (directMatch) {
      return directMatch;
    }

    const fallbackCode = getFallbackPlatformCode(config.mode, config.endpointUrl);

    if (!fallbackCode) {
      return null;
    }

    return this.adapters.find((adapter) => adapter.platformCode === fallbackCode) ?? null;
  }

  requireAdapter(config: Pick<PlatformConfig, 'platformCode' | 'mode'> & Partial<Pick<PlatformConfig, 'endpointUrl'>>): AIPlatformAdapter {
    const adapter = this.selectAdapter(config);

    if (!adapter) {
      throw new AIPlatformAdapterSelectionError(config.platformCode, config.mode);
    }

    return adapter;
  }
}

export function createDefaultAIPlatformAdapters(): AIPlatformAdapter[] {
  return [
    new ManualInputAdapter(),
    new MockAdapter(),
    new OpenAICompatibleAdapter(),
    new OpenAICompatibleAdapter('doubao'),
    new OpenAICompatibleAdapter('kimi'),
    new OpenAICompatibleAdapter('deepseek'),
    new OpenAICompatibleAdapter('qianwen'),
    new OpenAICompatibleAdapter('stepfun')
  ];
}

function getFallbackPlatformCode(mode: PlatformMode, endpointUrl?: string): string | null {
  if (mode === 'mock') {
    return 'mock_ai';
  }

  if (mode === 'api' && endpointUrl) {
    return 'openai';
  }

  if (mode === 'manual' || mode === 'semi_auto') {
    return 'manual_input';
  }

  return null;
}
