import { describe, expect, it } from 'vitest';
import type { BrowserConnectionSession, PlatformConfig } from '@geo-platform/shared-types';
import { advancedPlatformSettingFields, getBeginnerPlatformConfigs, getBrowserIssueLabel, getBrowserLoginUrl, getBrowserSessionStatusLabel, getLastAvailableLabel, getLatestBrowserSession, getConnectionGroupKey, getMethodPreview, groupPlatformConfigs } from './platformConfigDisplay';

describe('platform config display helpers', () => {
  it('keeps the first-round platforms in beginner-facing order', () => {
    const platforms = [
      createPlatform('mock_ai', 'ready', ['api']),
      createPlatform('qianwen', 'manual_available', ['manual']),
      createPlatform('stepfun', 'ready', ['api']),
      createPlatform('doubao', 'ready', ['api']),
      createPlatform('deepseek', 'needs_configuration', []),
      createPlatform('kimi', 'browser_available', ['browser'])
    ];

    expect(getBeginnerPlatformConfigs(platforms).map((platform) => platform.platformCode)).toEqual(['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']);
  });

  it('groups platforms by the action users can take next', () => {
    const grouped = groupPlatformConfigs([
      createPlatform('doubao', 'ready', ['api']),
      createPlatform('kimi', 'browser_available', ['browser']),
      createPlatform('deepseek', 'needs_configuration', []),
      createPlatform('qianwen', 'manual_available', ['manual']),
      createPlatform('stepfun', 'ready', ['api'])
    ]);

    expect(grouped.map((group) => [group.title, group.platforms.map((platform) => platform.platformCode)])).toEqual([
      ['可以自动监测', ['doubao', 'stepfun']],
      ['可以用浏览器辅助监测', ['kimi']],
      ['可以手动录入', ['qianwen']],
      ['需要补充信息', ['deepseek']]
    ]);
  });

  it('places confirmation-required browser platforms in the browser group', () => {
    expect(getConnectionGroupKey(createPlatform('kimi', 'needs_confirmation', ['browser', 'manual']))).toBe('browser');
  });

  it('formats available test methods', () => {
    expect(getMethodPreview(createPlatform('doubao', 'ready', ['api', 'manual']))).toBe('自动监测、手动录入');
    expect(getMethodPreview(createPlatform('deepseek', 'needs_configuration', []))).toBe('待补充');
  });

  it('keeps engineering fields inside advanced platform settings', () => {
    expect(advancedPlatformSettingFields).toEqual([
      { name: 'endpointUrl', label: '平台接口地址' },
      { name: 'modelName', label: '模型名称' },
      { name: 'rateLimitPerMinute', label: '每分钟监测次数上限' }
    ]);
  });

  it('shows browser connection session status and issues', () => {
    expect(getBrowserLoginUrl('kimi')).toBe('https://kimi.moonshot.cn/');
    expect(getBrowserSessionStatusLabel('ready')).toBe('已可用');
    expect(getBrowserIssueLabel('captcha')).toBe('遇到验证码，需要你手动处理');
  });

  it('gets the latest browser session for a platform', () => {
    const oldSession = createBrowserSession('doubao', '2026-07-05T00:00:00.000Z');
    const newSession = createBrowserSession('doubao', '2026-07-05T01:00:00.000Z');

    expect(getLatestBrowserSession('doubao', [oldSession, newSession])?.id).toBe(newSession.id);
    expect(getLastAvailableLabel(createBrowserSession('doubao', '2026-07-05T01:00:00.000Z', '2026-07-05T01:10:00.000Z'))).toContain('2026');
    expect(getLastAvailableLabel()).toBe('还没有可用记录');
  });
});

function createPlatform(platformCode: string, connectionStatus: PlatformConfig['connectionStatus'], availableMethods: PlatformConfig['availableMethods']): PlatformConfig {
  return {
    id: `platform_${platformCode}`,
    brandId: 'brand_demo',
    platformCode,
    name: platformCode,
    mode: availableMethods.includes('api') ? 'api' : 'semi_auto',
    availableMethods,
    connectionStatus,
    connectionStatusLabel: connectionStatus,
    nextAction: '继续配置',
    rateLimitPerMinute: 0,
    enabled: true,
    hasCredential: availableMethods.includes('api'),
    createdAt: '2026-07-05T00:00:00.000Z',
    updatedAt: '2026-07-05T00:00:00.000Z'
  };
}

function createBrowserSession(platformCode: string, updatedAt: string, lastAvailableAt?: string): BrowserConnectionSession {
  return {
    id: `session_${platformCode}_${updatedAt}`,
    brandId: 'brand_demo',
    platformCode,
    status: 'ready',
    loginDetected: true,
    authorizedScope: {
      brandId: 'brand_demo',
      testPlanIds: [],
      platformCodes: [platformCode]
    },
    lastAvailableAt,
    createdAt: updatedAt,
    updatedAt
  };
}
