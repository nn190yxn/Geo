import type { BeginnerFriendlyPlatform, BrowserConnectionIssueType, BrowserConnectionSession, BrowserConnectionStatus, PlatformConfig } from '@geo-platform/shared-types';

export type PlatformConnectionGroupKey = 'auto' | 'browser' | 'manual' | 'configuration';

export type PlatformConnectionGroup = {
  key: PlatformConnectionGroupKey;
  title: string;
  description: string;
  color: string;
  platforms: PlatformConfig[];
};

export const advancedPlatformSettingFields = [
  { name: 'endpointUrl', label: '平台接口地址' },
  { name: 'modelName', label: '模型名称' },
  { name: 'rateLimitPerMinute', label: '每分钟监测次数上限' }
] as const;

const beginnerPlatformOrder: BeginnerFriendlyPlatform[] = ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'];

const groups: Array<Omit<PlatformConnectionGroup, 'platforms'>> = [
  { key: 'auto', title: '可以自动监测', description: '平台密钥和模型已经准备好，开始监测后系统会自动提问并保存结果。', color: 'green' },
  { key: 'browser', title: '可以用浏览器辅助监测', description: '你登录平台后，系统在授权范围内辅助提交监测问题。', color: 'gold' },
  { key: 'manual', title: '可以手动录入', description: '把问题复制到 AI 平台，再把回答粘贴回来。', color: 'blue' },
  { key: 'configuration', title: '需要补充信息', description: '补充平台密钥、浏览器登录或手动录入入口后再开始。', color: 'red' }
];

export function getBeginnerPlatformConfigs(platforms: PlatformConfig[]): PlatformConfig[] {
  return platforms
    .filter((platform) => beginnerPlatformOrder.includes(platform.platformCode as BeginnerFriendlyPlatform))
    .sort((a, b) => getPlatformOrder(a.platformCode) - getPlatformOrder(b.platformCode));
}

export function groupPlatformConfigs(platforms: PlatformConfig[]): PlatformConnectionGroup[] {
  const beginnerPlatforms = getBeginnerPlatformConfigs(platforms);
  const grouped = new Map<PlatformConnectionGroupKey, PlatformConfig[]>(groups.map((group) => [group.key, []]));

  beginnerPlatforms.forEach((platform) => {
    grouped.get(getConnectionGroupKey(platform))?.push(platform);
  });

  return groups.map((group) => ({ ...group, platforms: grouped.get(group.key) ?? [] }));
}

export function getConnectionGroupKey(platform: PlatformConfig): PlatformConnectionGroupKey {
  if (!platform.enabled || platform.connectionStatus === 'needs_configuration') {
    return 'configuration';
  }

  if (platform.connectionStatus === 'ready') {
    return 'auto';
  }

  if (platform.connectionStatus === 'browser_available' || platform.availableMethods.includes('browser')) {
    return 'browser';
  }

  if (platform.connectionStatus === 'manual_available' || platform.availableMethods.includes('manual')) {
    return 'manual';
  }

  return 'configuration';
}

export function getMethodPreview(platform: PlatformConfig): string {
  return platform.availableMethods.map((method) => methodLabels[method]).join('、') || '待补充';
}

export function getLatestBrowserSession(platformCode: string, sessions: BrowserConnectionSession[]): BrowserConnectionSession | undefined {
  return sessions
    .filter((session) => session.platformCode === platformCode)
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))[0];
}

export function getBrowserLoginUrl(platformCode: string): string {
  return browserLoginUrls[platformCode as BeginnerFriendlyPlatform] ?? 'https://www.google.com/search?q=AI+platform+login';
}

export function getBrowserSessionStatusLabel(status: BrowserConnectionStatus): string {
  return browserStatusLabels[status];
}

export function getBrowserSessionStatusColor(status: BrowserConnectionStatus): string {
  return browserStatusColors[status];
}

export function getBrowserIssueLabel(issueType?: BrowserConnectionIssueType): string {
  return issueType ? browserIssueLabels[issueType] : '等待用户确认';
}

export function getLastAvailableLabel(session?: BrowserConnectionSession): string {
  if (!session?.lastAvailableAt) {
    return '还没有可用记录';
  }

  return new Date(session.lastAvailableAt).toLocaleString('zh-CN');
}

function getPlatformOrder(platformCode: string): number {
  const index = beginnerPlatformOrder.indexOf(platformCode as BeginnerFriendlyPlatform);

  return index === -1 ? beginnerPlatformOrder.length : index;
}

const methodLabels = {
  api: '自动监测',
  browser: '浏览器辅助监测',
  manual: '手动录入'
} as const;

const browserLoginUrls: Record<BeginnerFriendlyPlatform, string> = {
  doubao: 'https://www.doubao.com/chat/',
  kimi: 'https://kimi.moonshot.cn/',
  deepseek: 'https://chat.deepseek.com/',
  qianwen: 'https://tongyi.aliyun.com/qianwen/',
  stepfun: 'https://platform.stepfun.com/'
};

const browserStatusLabels: Record<BrowserConnectionStatus, string> = {
  not_started: '未开始',
  opening: '正在打开登录页',
  login_required: '等待登录',
  ready: '已可用',
  needs_confirmation: '需要你确认',
  expired: '登录已失效',
  failed: '连接没成功',
  stopped: '已停止'
};

const browserStatusColors: Record<BrowserConnectionStatus, string> = {
  not_started: 'default',
  opening: 'processing',
  login_required: 'gold',
  ready: 'green',
  needs_confirmation: 'orange',
  expired: 'red',
  failed: 'red',
  stopped: 'default'
};

const browserIssueLabels: Record<BrowserConnectionIssueType, string> = {
  captcha: '遇到验证码，需要你手动处理',
  risk_control: '遇到平台风控，需要你确认',
  login_expired: '登录已失效，需要重新登录',
  platform_limit: '平台暂时限制监测，建议先手动录入',
  page_changed: '页面有变化，需要你确认一下',
  unknown: '原因还需要确认'
};
