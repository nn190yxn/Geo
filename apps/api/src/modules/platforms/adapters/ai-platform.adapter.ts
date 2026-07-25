import type { PlatformConfig, PlatformValidationResult, RunPromptInput, RunPromptResult } from '@geo-platform/shared-types';

export type AIPlatformRuntimeConfig = PlatformConfig & {
  credentialRef?: string;
};

export type LLMMessageRole = 'system' | 'developer' | 'user' | 'assistant';

export type LLMMessage = {
  role: LLMMessageRole;
  content: string;
};

export type RunLLMInput = {
  brandId: string;
  platformCode: string;
  messages: LLMMessage[];
  responseFormat?: 'json' | 'text';
  temperature?: number;
  maxTokens?: number;
};

export type RunLLMResult = RunPromptResult & {
  inputTokenCount?: number;
  outputTokenCount?: number;
};

export interface AIPlatformAdapter {
  platformCode: string;
  runPrompt(input: RunPromptInput, config?: AIPlatformRuntimeConfig): Promise<RunPromptResult>;
  runMessages?(input: RunLLMInput, config?: AIPlatformRuntimeConfig): Promise<RunLLMResult>;
  validateConfig(config: AIPlatformRuntimeConfig): Promise<PlatformValidationResult>;
}
