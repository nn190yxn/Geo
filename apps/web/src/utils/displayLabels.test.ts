import { describe, expect, it } from 'vitest';
import {
  getBusinessTermDescription,
  getBusinessTermLabel,
  getBrandRoleDisplay,
  getContentTypeDisplay,
  getOwnerDisplayName,
  getPlatformDisplayName,
  getStatusDisplay,
  isPreferredAIPlatform,
  preferredAIPlatformNames,
  preferredAIPlatformOptions,
  preferredAIPlatformSummary
} from './displayLabels';

describe('display label helpers', () => {
  it('uses the preferred AI platform names for operator facing UI', () => {
    expect(preferredAIPlatformNames).toEqual(['豆包', 'Kimi', 'DeepSeek', '通义千问', '阶跃星辰']);
    expect(preferredAIPlatformSummary).toBe('豆包、Kimi、DeepSeek、通义千问、阶跃星辰');
    expect(preferredAIPlatformOptions.map(({ value }) => value)).toEqual(['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']);
    expect(getPlatformDisplayName('doubao')).toBe('豆包');
    expect(getPlatformDisplayName('stepfun')).toBe('阶跃星辰');
    expect(isPreferredAIPlatform('qianwen')).toBe(true);
    expect(isPreferredAIPlatform('manual_input')).toBe(false);
  });

  it('keeps internal and unknown platform codes out of operator labels', () => {
    expect(getPlatformDisplayName('manual_input')).toBe('手动录入');
    expect(getPlatformDisplayName('mock_ai')).toBe('示例回答（不计入指标）');
    expect(getPlatformDisplayName('new_provider')).toBe('自定义平台');
  });

  it('explains GEO business terms in plain language', () => {
    expect(getBusinessTermLabel('optimizationUnit')).toBe('优化单元');
    expect(getBusinessTermDescription('optimizationUnit')).toBe('希望 AI 推荐的产品、服务或业务主题');
    expect(getBusinessTermLabel('realAIResponse')).toBe('真实 AI 回复');
    expect(getBusinessTermDescription('realAIResponse')).toContain('自动监测');
    expect(getBusinessTermLabel('sourceAnalysis')).toBe('信源分析');
    expect(getBusinessTermDescription('factAnalysis')).toContain('事实偏差');
  });

  it('uses business labels and a safe fallback for public statuses', () => {
    expect(getStatusDisplay('processing')).toBe('处理中');
    expect(getStatusDisplay('completed')).toBe('已完成');
    expect(getStatusDisplay()).toBe('未知状态');
    expect(getStatusDisplay('provider_internal_pending')).toBe('未知状态');
  });

  it('keeps internal roles, owner ids and content codes out of public labels', () => {
    expect(getBrandRoleDisplay('owner')).toBe('品牌负责人');
    expect(getBrandRoleDisplay('viewer')).toBe('只读成员');
    expect(getOwnerDisplayName('user_8291')).toBe('其他负责人');
    expect(getContentTypeDisplay('media_article')).toBe('媒体文章');
    expect(getContentTypeDisplay('internal_content_code')).toBe('其他内容');
  });
});
