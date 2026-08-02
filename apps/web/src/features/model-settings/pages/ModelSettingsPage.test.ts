import { describe, expect, it } from 'vitest';
import type { PlatformConfig } from '@geo-platform/shared-types';
import { getModelSetupGuide, getPlatformCardItems, getPlatformConnectionDisplay, getPlatformMethodLabels, getPlatformValidationLabel, modelSetupGuides } from './ModelSettingsPage';

describe('ModelSettingsPage helpers', () => {
  it('provides beginner-facing setup guides for first version model providers', () => {
    expect(modelSetupGuides.map((guide) => guide.platformCode)).toEqual(expect.arrayContaining(['doubao', 'deepseek', 'kimi', 'qianwen', 'stepfun']));
    expect(modelSetupGuides[0]).toEqual(expect.objectContaining({ platformCode: 'stepfun', modelName: 'step-3.7-flash' }));
    expect(getModelSetupGuide(' DeepSeek ')?.displayName).toBe('DeepSeek');
    expect(getModelSetupGuide('qianwen')?.endpointUrl).toContain('dashscope');
    expect(getModelSetupGuide('stepfun')?.modelName).toBe('step-3.7-flash');
  });

  it('returns no guide for unknown providers', () => {
    expect(getModelSetupGuide('custom_ai')).toBeUndefined();
  });

  it('将公开平台配置映射为脱敏卡片状态', () => {
    const config = createPlatformConfig();
    const deepseek = getPlatformCardItems([config]).find((item) => item.platformCode === 'deepseek');

    expect(deepseek).toMatchObject({
      displayName: 'DeepSeek',
      statusLabel: '已连接',
      methodLabels: ['自动 API 监测', '手动录入'],
      validationLabel: '最近验证成功'
    });
    expect(JSON.stringify(deepseek)).not.toContain('credentialRefMasked');
    expect(JSON.stringify(deepseek)).not.toContain('provider raw message');
    expect(getPlatformConnectionDisplay({ ...config, enabled: false })).toEqual({ label: '已停用', color: 'default' });
    expect(getPlatformMethodLabels(undefined)).toEqual(['自动 API 监测', '浏览器辅助', '手动录入']);
    expect(getPlatformValidationLabel({ ...config, lastValidation: { ...config.lastValidation!, ok: false } })).toBe('最近验证失败，请重新检查');
  });
});

function createPlatformConfig(): PlatformConfig {
  return {
    id: 'platform-1',
    brandId: 'brand_demo',
    platformCode: 'deepseek',
    name: 'DeepSeek',
    mode: 'api',
    availableMethods: ['api', 'manual'],
    connectionStatus: 'ready',
    connectionStatusLabel: '已连接',
    nextAction: '开始真实回复监测',
    rateLimitPerMinute: 20,
    enabled: true,
    hasCredential: true,
    credentialRefMasked: '已配置',
    lastValidation: { ok: true, mode: 'api', checkedAt: '2026-07-15T00:00:00.000Z', message: 'provider raw message' },
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z'
  };
}
