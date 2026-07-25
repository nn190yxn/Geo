import type { PlatformConfig, PlatformValidationResult, RunPromptInput, RunPromptResult } from '@geo-platform/shared-types';
import type { AIPlatformAdapter } from './ai-platform.adapter';

export class ManualInputAdapter implements AIPlatformAdapter {
  platformCode = 'manual_input';

  async runPrompt(input: RunPromptInput): Promise<RunPromptResult> {
    return {
      rawText: `等待手动录入：${input.promptText}`,
      modelName: 'manual',
      respondedAt: new Date().toISOString()
    };
  }

  async validateConfig(config: PlatformConfig): Promise<PlatformValidationResult> {
    return {
      ok: config.mode === 'manual',
      mode: config.mode,
      checkedAt: new Date().toISOString(),
      message: config.mode === 'manual' ? '手动录入可用' : '当前平台请改用手动录入方式'
    };
  }
}
