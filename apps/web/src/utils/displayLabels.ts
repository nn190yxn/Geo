import type { BeginnerFriendlyPlatform, UserBrandRole } from '@geo-platform/shared-types';

export type BusinessTermKey =
  | 'optimizationUnit'
  | 'userIntent'
  | 'realAIResponse'
  | 'aiResponseMonitoring'
  | 'sourceAnalysis'
  | 'factAnalysis'
  | 'contentCitation'
  | 'browserAssistedMonitoring'
  | 'manualInput'
  | 'autoMonitoring';

export type AIPlatformFilterValue = 'all' | BeginnerFriendlyPlatform;

export const preferredAIPlatformOptions = [
  { value: 'doubao', label: '豆包', mark: '豆' },
  { value: 'kimi', label: 'Kimi', mark: 'K' },
  { value: 'deepseek', label: 'DeepSeek', mark: 'D' },
  { value: 'qianwen', label: '通义千问', mark: '通' },
  { value: 'stepfun', label: '阶跃星辰', mark: '阶' }
] as const satisfies ReadonlyArray<{
  value: BeginnerFriendlyPlatform;
  label: string;
  mark: string;
}>;

export const preferredAIPlatformNames = preferredAIPlatformOptions.map(({ label }) => label);

export const preferredAIPlatformSummary = preferredAIPlatformNames.join('、');

export function isPreferredAIPlatform(value?: string | null): value is BeginnerFriendlyPlatform {
  return preferredAIPlatformOptions.some((option) => option.value === value);
}

const platformLabels: Record<string, string> = {
  doubao: '豆包',
  kimi: 'Kimi',
  deepseek: 'DeepSeek',
  qianwen: '通义千问',
  stepfun: '阶跃星辰',
  manual_input: '手动录入',
  mock_ai: '示例回答（不计入指标）',
  wechat_official: '公众号',
  xiaohongshu: '小红书',
  zhihu: '知乎',
  baijiahao: '百家号',
  official_site: '官网',
  official_site_faq: '官网 FAQ',
  douyin: '短视频平台'
};

const businessTerms: Record<BusinessTermKey, { label: string; description: string }> = {
  optimizationUnit: {
    label: '优化单元',
    description: '希望 AI 推荐的产品、服务或业务主题'
  },
  userIntent: {
    label: '用户意图',
    description: '客户可能向 AI 提出的真实问题'
  },
  realAIResponse: {
    label: '真实 AI 回复',
    description: '来自自动监测、浏览器辅助监测或手动录入的真实回答'
  },
  aiResponseMonitoring: {
    label: 'AI 回复监测',
    description: '获取真实 AI 回复，并用于分析诊断和内容优化'
  },
  sourceAnalysis: {
    label: '信源分析',
    description: '分析 AI 回复引用了哪些网站、媒体、社媒或第三方来源'
  },
  factAnalysis: {
    label: '事实分析',
    description: '检查 AI 回复中的产品参数、服务范围、价格口径和事实偏差'
  },
  contentCitation: {
    label: '内容引用',
    description: '内容资产在 AI 回复或发布渠道中被引用和复用的情况'
  },
  browserAssistedMonitoring: {
    label: '浏览器辅助监测',
    description: '通过用户确认的浏览器会话获取平台真实回答'
  },
  manualInput: {
    label: '手动录入',
    description: '人工把平台真实回复粘贴进系统进行分析'
  },
  autoMonitoring: {
    label: '自动监测',
    description: '通过已配置平台连接自动获取真实回答'
  }
};

export function getPlatformDisplayName(value?: string): string {
  if (!value || value.trim().length === 0) return '未知平台';
  return platformLabels[value] ?? '自定义平台';
}

export function getPlatformDisplay(value?: string): string {
  return getPlatformDisplayName(value);
}

export function getContentTypeDisplay(value?: string): string {
  if (!value || value.trim().length === 0) return '内容';

  const labels: Record<string, string> = {
    wechat_article: '公众号推文',
    wechat_official: '公众号推文',
    xiaohongshu_note: '小红书图文',
    xiaohongshu_post: '小红书图文',
    website_faq: '官网 FAQ',
    short_video_script: '短视频脚本',
    platform_profile_copy: '平台介绍文案',
    image_creative_brief: '图片创意需求',
    generated_content: '生成内容',
    media_article: '媒体文章',
    article: '文章',
    post: '图文'
  };

  return labels[value] ?? '其他内容';
}

export function getStatusDisplay(value?: string): string {
  if (!value || value.trim().length === 0) return '未知状态';

  const labels: Record<string, string> = {
    draft: '草稿',
    pending: '待处理',
    published: '已发布',
    failed: '失败',
    active: '启用',
    inactive: '停用',
    completed: '已完成',
    processing: '处理中',
    uploaded: '已上传',
    parsed: '已解析',
    error: '异常'
  };

  return labels[value] ?? '未知状态';
}

export function getOwnerDisplayName(value?: string): string {
  if (!value || value.trim().length === 0) return '未分配';

  const labels: Record<string, string> = {
    user_demo: '内测负责人',
    advisor_demo: '服务顾问'
  };

  return labels[value] ?? '其他负责人';
}

export function getBrandRoleDisplay(value?: UserBrandRole): string {
  if (!value) return '未分配角色';

  const labels: Record<UserBrandRole, string> = {
    owner: '品牌负责人',
    admin: '管理员',
    operator: '运营人员',
    analyst: '分析人员',
    viewer: '只读成员'
  };

  return labels[value];
}

export function getBusinessTermLabel(key: BusinessTermKey): string {
  return businessTerms[key].label;
}

export function getBusinessTermDescription(key: BusinessTermKey): string {
  return businessTerms[key].description;
}

export function getBusinessTerm(key: BusinessTermKey): { label: string; description: string } {
  return businessTerms[key];
}
