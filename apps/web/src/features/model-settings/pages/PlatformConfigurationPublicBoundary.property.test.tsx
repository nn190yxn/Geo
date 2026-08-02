import { renderToStaticMarkup } from 'react-dom/server';
import type { AIConnectionStatus, PlatformConfig, PlatformMode, PlatformValidationResult } from '@geo-platform/shared-types';
import { describe, expect, it } from 'vitest';
import { getPlatformCardItems, PlatformConnectionCards } from './ModelSettingsPage';

const validatesCriteria = (criteria: readonly string[]) => `[Validates: ${criteria.join(', ')}]`;

const modes: readonly PlatformMode[] = ['api', 'manual', 'semi_auto', 'mock'];
const connectionStatuses: readonly AIConnectionStatus[] = ['ready', 'browser_available', 'manual_available', 'needs_configuration', 'needs_confirmation'];
const validationStates = ['none', 'success', 'failed'] as const;
const enabledStates = [true, false] as const;

type ValidationState = (typeof validationStates)[number];

type PublicBoundaryScenario = {
  mode: PlatformMode;
  connectionStatus: AIConnectionStatus;
  validationState: ValidationState;
  enabled: boolean;
};

const scenarios: PublicBoundaryScenario[] = modes.flatMap((mode) =>
  connectionStatuses.flatMap((connectionStatus) =>
    validationStates.flatMap((validationState) =>
      enabledStates.map((enabled) => ({ mode, connectionStatus, validationState, enabled }))
    )
  )
);

describe(`Property P2: platform configuration public boundary ${validatesCriteria(['6.4'])}`, () => {
  it('仅向任意公开平台卡片暴露脱敏状态和业务化原因', () => {
    expect(scenarios).toHaveLength(120);

    for (const [index, scenario] of scenarios.entries()) {
      const { config, forbiddenMarkers } = createConfigurationWithSensitivePayload(scenario, index);
      const cards = getPlatformCardItems([config]);
      const deepseekCard = cards.find((item) => item.platformCode === 'deepseek');
      const markup = renderToStaticMarkup(
        <PlatformConnectionCards items={cards} loading={false} onSetup={() => undefined} />
      );
      const publicOutput = `${JSON.stringify(deepseekCard)}\n${markup}`;

      expect(deepseekCard, `P2 missing card for ${JSON.stringify(scenario)}`).toBeDefined();
      expect(publicOutput).toContain(scenario.enabled ? expectedStatusLabel(scenario.connectionStatus) : '已停用');
      expect(publicOutput).toContain(expectedValidationLabel(scenario.validationState));

      for (const marker of forbiddenMarkers) {
        if (publicOutput.includes(marker)) {
          throw new Error(`P2 exposed ${marker} for ${JSON.stringify(scenario)}`);
        }
      }
    }
  });
});

function createConfigurationWithSensitivePayload(scenario: PublicBoundaryScenario, index: number): {
  config: PlatformConfig;
  forbiddenMarkers: string[];
} {
  const forbiddenMarkers = [
    `api-key-${index}`,
    `cookie-${index}`,
    `storage-state-${index}`,
    `/browser-profile-${index}`,
    `provider-payload-${index}`,
    `validation-payload-${index}`
  ];
  const lastValidation = createValidation(scenario, forbiddenMarkers[5]);
  const config: PlatformConfig & {
    credentialRef: string;
    cookies: Array<{ value: string }>;
    storageState: { token: string };
    browserProfilePath: string;
    providerPayload: { raw: string };
  } = {
    id: `platform-${index}`,
    brandId: 'brand_demo',
    platformCode: 'deepseek',
    name: 'DeepSeek',
    mode: scenario.mode,
    availableMethods: methodsForMode(scenario.mode),
    connectionStatus: scenario.connectionStatus,
    connectionStatusLabel: expectedStatusLabel(scenario.connectionStatus),
    nextAction: nextActionForStatus(scenario.connectionStatus),
    rateLimitPerMinute: 20,
    enabled: scenario.enabled,
    hasCredential: true,
    credentialRefMasked: '已配置',
    lastValidation,
    createdAt: '2026-07-15T00:00:00.000Z',
    updatedAt: '2026-07-15T00:00:00.000Z',
    credentialRef: forbiddenMarkers[0],
    cookies: [{ value: forbiddenMarkers[1] }],
    storageState: { token: forbiddenMarkers[2] },
    browserProfilePath: forbiddenMarkers[3],
    providerPayload: { raw: forbiddenMarkers[4] }
  };

  return { config, forbiddenMarkers };
}

function createValidation(scenario: PublicBoundaryScenario, sensitiveMessage: string): PlatformValidationResult | undefined {
  if (scenario.validationState === 'none') return undefined;
  return {
    ok: scenario.validationState === 'success',
    mode: scenario.mode,
    checkedAt: '2026-07-15T00:00:00.000Z',
    message: sensitiveMessage
  };
}

function methodsForMode(mode: PlatformMode): PlatformConfig['availableMethods'] {
  if (mode === 'semi_auto') return ['api', 'browser', 'manual'];
  if (mode === 'api') return ['api', 'manual'];
  return ['manual'];
}

function expectedStatusLabel(status: AIConnectionStatus): string {
  return {
    ready: '已连接',
    browser_available: '浏览器辅助可用',
    manual_available: '手动录入可用',
    needs_configuration: '待配置',
    needs_confirmation: '待确认'
  }[status];
}

function expectedValidationLabel(validationState: ValidationState): string {
  if (validationState === 'none') return '尚未验证';
  return validationState === 'success' ? '最近验证成功' : '最近验证失败，请重新检查';
}

function nextActionForStatus(status: AIConnectionStatus): string {
  return {
    ready: '开始真实回复监测',
    browser_available: '通过浏览器辅助完成监测',
    manual_available: '录入真实平台回复',
    needs_configuration: '补齐连接信息',
    needs_confirmation: '确认浏览器连接'
  }[status];
}
