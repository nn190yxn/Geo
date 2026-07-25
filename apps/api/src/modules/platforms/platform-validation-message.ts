import type { PlatformMode } from '@geo-platform/shared-types';

export function getModeValidationMessage(mode: PlatformMode): string {
  if (mode === 'manual') {
    return '当前平台已设置为手动录入，请复制监测问题到平台后录入回答。';
  }

  if (mode === 'semi_auto') {
    return '当前平台已设置为浏览器辅助监测，请通过打开浏览器完成登录和监测。';
  }

  if (mode === 'mock') {
    return '示例回答可用。';
  }

  return '平台连接检查通过';
}

export function getMissingApiConfigMessage(config: { endpointUrl?: string | null; modelName?: string | null; credentialRef?: string | null; hasCredential?: boolean }): string | null {
  if (!config.endpointUrl) return '请先填写平台接口地址';
  if (!config.modelName) return '请先填写模型名称';
  if (!config.credentialRef && !config.hasCredential) return '请先填写平台密钥';

  return null;
}
