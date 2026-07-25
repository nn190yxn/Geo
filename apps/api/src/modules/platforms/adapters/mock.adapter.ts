import type { PlatformConfig, PlatformValidationResult, RunPromptInput, RunPromptResult } from '@geo-platform/shared-types';
import type { AIPlatformAdapter } from './ai-platform.adapter';

export class MockAdapter implements AIPlatformAdapter {
  platformCode = 'mock_ai';

  async runPrompt(input: RunPromptInput): Promise<RunPromptResult> {
    return {
      rawText: `演示回答（${input.platformCode}）：${input.promptText}`,
      modelName: 'mock-v1',
      respondedAt: new Date().toISOString()
    };
  }

  async validateConfig(config: PlatformConfig): Promise<PlatformValidationResult> {
    return {
      ok: config.mode === 'mock',
      mode: config.mode,
      checkedAt: new Date().toISOString(),
      message: config.mode === 'mock' ? '演示平台可用' : '当前配置无法使用演示平台'
    };
  }
}
