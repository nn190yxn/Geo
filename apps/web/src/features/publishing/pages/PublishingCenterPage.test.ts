import { describe, expect, it } from 'vitest';
import { getPublishingPlatformLabel, getPublishingRecordStatusColor, getPublishingUrlDisplay, recordStatusLabels } from './PublishingCenterPage';

describe('PublishingCenterPage helpers', () => {
  it('shows website platform account aggregation in the platform list', () => {
    expect(getPublishingPlatformLabel({
      platform: 'website',
      name: '官网',
      loginMode: 'manual',
      accountCount: 1,
      hasAuthError: false
    })).toBe('官网 · 1 个账号');
  });

  it('marks publishing platforms with auth errors', () => {
    expect(getPublishingPlatformLabel({
      platform: 'wechat',
      name: '公众号',
      loginMode: 'oauth',
      accountCount: 2,
      hasAuthError: true
    })).toBe('公众号 · 2 个账号 · 异常');
  });

  it('uses business labels for publishing record statuses', () => {
    expect(recordStatusLabels).toMatchObject({
      draft: '草稿',
      pending: '待人工发布',
      published: '已发布'
    });
    expect(getPublishingRecordStatusColor('pending')).toBe('orange');
  });

  it('shows publishing URL display without fake links', () => {
    expect(getPublishingUrlDisplay({ status: 'draft', publishedUrl: undefined })).toBe('草稿，暂未发布');
    expect(getPublishingUrlDisplay({ status: 'pending', publishedUrl: undefined })).toBe('等待人工发布');
    expect(getPublishingUrlDisplay({ status: 'published', publishedUrl: undefined })).toBe('已发布，待补充链接');
    expect(getPublishingUrlDisplay({ status: 'published', publishedUrl: 'https://brand.example.com/post' })).toBe('https://brand.example.com/post');
  });
});
