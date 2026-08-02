import { describe, expect, it } from 'vitest';
import { getFilteredMediaPlatformRules, getFilteredOwnedMediaAccounts, getFilteredPublishingOperationRows, getMediaPlatformGuidance, getOwnedMediaAccountAction, getOwnedMediaAccountCoverage, getOwnedMediaAccountStatusMessage, getPublishingAccessPageState, getPublishingAccountPlatformOptions, getPublishingBodySummary, getPublishingChannelStats, getPublishingOperationRows, getPublishingPageMode, getPublishingPlatformDetail, getPublishingPlatformLabel, getPublishingRecordFilterSearch, getPublishingRecordStatusColor, getPublishingRetestPath, getPublishingRetestStatusLabel, getPublishingUrlDisplay, ownedMediaPlatformOptions, readPublishingRecordFilters, recordStatusLabels } from './PublishingCenterPage';

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

  it('switches page copy between owned media and media platforms', () => {
    expect(getPublishingPageMode('/publishing')).toMatchObject({
      title: '发布记录',
      defaultTab: 'records'
    });
    expect(getPublishingPageMode('/owned-media')).toMatchObject({
      title: '自有媒体',
      defaultTab: 'accounts'
    });
    expect(getPublishingPageMode('/media-platforms')).toMatchObject({
      title: '媒体平台',
      defaultTab: 'platform-guidance'
    });
  });

  it('provides channel rules and fallback guidance for media platforms', () => {
    expect(getMediaPlatformGuidance('xiaohongshu')).toMatchObject({
      name: '小红书',
      contentFormats: ['小红书图文', '场景 FAQ', '对比笔记'],
      coverRatio: '3:4',
      retestAction: '发布后记录高频评论并补充到监测问题'
    });
    expect(getMediaPlatformGuidance('custom_channel', '自定义渠道')).toMatchObject({
      name: '自定义渠道',
      frequency: '按内容策略排期发布',
      publishingNote: '发布账号、内容格式、素材和链接发布前确认'
    });
  });

  it('tracks standard owned media account coverage', () => {
    expect(ownedMediaPlatformOptions.map((item) => item.name)).toEqual(['官网', '博客', '公众号', '知乎', '小红书', 'B 站', '视频号', '其他账号']);
    expect(getOwnedMediaAccountCoverage([
      {
        id: 'account-1',
        brandId: 'brand-1',
        platform: 'wechat',
        accountName: '品牌公众号',
        loginMode: 'oauth',
        authStatus: 'connected',
        createdAt: '2026-07-14T00:00:00.000Z',
        updatedAt: '2026-07-14T00:00:00.000Z'
      }
    ])).toEqual(expect.arrayContaining([
      expect.objectContaining({ platform: 'wechat', connected: true }),
      expect.objectContaining({ platform: 'website', connected: false })
    ]));
  });

  it('filters owned media accounts by search, platform and authorization status', () => {
    const accounts = [
      buildOwnedMediaAccount({ id: 'account-1', platform: 'wechat', platformName: '公众号', accountName: '品牌主账号', authStatus: 'connected' }),
      buildOwnedMediaAccount({ id: 'account-2', platform: 'zhihu', platformName: '知乎', accountName: '品牌知识号', authStatus: 'expired' })
    ];

    expect(getFilteredOwnedMediaAccounts(accounts, { search: '知识', platform: 'all', status: 'expired' }, 'zhihu'))
      .toEqual([expect.objectContaining({ id: 'account-2' })]);
    expect(getFilteredOwnedMediaAccounts(accounts, { search: '', platform: 'all', status: 'expired' }, 'wechat')).toEqual([]);
  });

  it('maps account states to one executable management action', () => {
    expect(getOwnedMediaAccountAction({ authStatus: 'connected' })).toEqual({ kind: 'publish', label: '进入发布准备' });
    expect(getOwnedMediaAccountAction({ authStatus: 'expired' })).toEqual({ kind: 'reauthorize', label: '重新授权' });
    expect(getOwnedMediaAccountStatusMessage({ authStatus: 'error' })).toBe('授权异常，请检查后重新授权');
    expect(getOwnedMediaAccountStatusMessage({ authStatus: 'disconnected' })).toBe('账号尚未完成授权');
  });

  it('searches persisted media platform rules across publishing fields', () => {
    const rules = [
      {
        brandId: 'brand-1',
        platform: 'wechat',
        name: '公众号',
        contentFormats: ['长文', 'FAQ'],
        intentFit: '品牌了解',
        recommendedFrequency: '每周 2 篇',
        coverRatio: '2.35:1',
        publishingNote: '发布前检查事实来源'
      },
      {
        brandId: 'brand-1',
        platform: 'xiaohongshu',
        name: '小红书',
        contentFormats: ['图文'],
        intentFit: '场景咨询',
        recommendedFrequency: '每周 3 篇',
        coverRatio: '3:4',
        publishingNote: '检查首图'
      }
    ];

    expect(getFilteredMediaPlatformRules(rules, '事实来源')).toEqual([expect.objectContaining({ platform: 'wechat' })]);
    expect(getFilteredMediaPlatformRules(rules, '场景咨询')).toEqual([expect.objectContaining({ platform: 'xiaohongshu' })]);
  });

  it('derives loading, error, empty and ready states for access pages', () => {
    expect(getPublishingAccessPageState(true, false, 0)).toBe('loading');
    expect(getPublishingAccessPageState(false, true, 2)).toBe('error');
    expect(getPublishingAccessPageState(false, false, 0)).toBe('empty');
    expect(getPublishingAccessPageState(false, false, 2)).toBe('ready');
  });

  it('builds account platform options from persisted rules and standard channels', () => {
    const options = getPublishingAccountPlatformOptions(null, {
      brandId: 'brand-1',
      accounts: [],
      platformRules: [{
        brandId: 'brand-1',
        platform: 'custom-channel',
        name: '行业媒体',
        contentFormats: ['文章'],
        intentFit: '行业了解',
        recommendedFrequency: '每月 1 篇',
        coverRatio: '16:9',
        publishingNote: '检查来源'
      }],
      records: [],
      citations: [],
      performance: [],
      channelStats: [],
      pendingRetestItems: []
    });

    expect(options).toEqual(expect.arrayContaining([
      { value: 'custom-channel', label: '行业媒体' },
      { value: 'wechat', label: '公众号' }
    ]));
  });

  it('merges publishing records with real performance aggregation', () => {
    const record = buildPublishingRecord({ id: 'record-1', status: 'published' });
    const rows = getPublishingOperationRows({
      brandId: 'brand-1',
      accounts: [],
      platformRules: [],
      records: [record],
      citations: [],
      performance: [{
        brandId: 'brand-1',
        recordId: 'record-1',
        contentAssetId: 'asset-1',
        sourceStatus: 'linked',
        citationCount: 2,
        relatedIntentCount: 1,
        retestStatus: 'planned',
        nextSuggestion: '按计划完成再次监测'
      }],
      channelStats: [],
      pendingRetestItems: []
    });

    expect(rows).toEqual([
      expect.objectContaining({
        id: 'record-1',
        performance: expect.objectContaining({ citationCount: 2, retestStatus: 'planned' })
      })
    ]);
  });

  it('filters publishing records by search, status and publishing channel', () => {
    const rows = [
      buildPublishingRecord({ id: 'record-1', title: '品牌 FAQ', platform: 'website', status: 'published', accountName: '品牌官网' }),
      buildPublishingRecord({ id: 'record-2', title: '场景笔记', platform: 'xiaohongshu', status: 'pending', accountName: '品牌小红书' })
    ];

    expect(getFilteredPublishingOperationRows(rows, { search: '品牌官网', platform: 'all', status: 'published' }, 'website'))
      .toEqual([expect.objectContaining({ id: 'record-1' })]);
    expect(getFilteredPublishingOperationRows(rows, { search: '', platform: 'all', status: 'failed' }, 'all')).toEqual([]);
  });

  it('preserves workflow context while updating publishing filters', () => {
    const search = getPublishingRecordFilterSearch(
      '?generationTaskId=task-1&versionId=version-1&publishingRecordId=record-1&runId=run-1&promptId=prompt-1&platform=deepseek',
      { search: 'FAQ', platform: 'all', status: 'pending' },
      'wechat'
    );
    const params = new URLSearchParams(search);

    expect(params.get('generationTaskId')).toBe('task-1');
    expect(params.get('versionId')).toBe('version-1');
    expect(params.get('publishingRecordId')).toBe('record-1');
    expect(params.get('runId')).toBe('run-1');
    expect(params.get('promptId')).toBe('prompt-1');
    expect(params.get('platform')).toBe('deepseek');
    expect(params.get('q')).toBe('FAQ');
    expect(params.get('status')).toBe('pending');
    expect(params.get('channel')).toBe('wechat');
    expect(readPublishingRecordFilters(search)).toMatchObject({ search: 'FAQ', status: 'pending', platform: 'all' });
  });

  it('creates concise content summaries without inventing missing text', () => {
    expect(getPublishingBodySummary('  第一段\n第二段  ')).toBe('第一段 第二段');
    expect(getPublishingBodySummary('abcdef', 4)).toBe('abcd…');
    expect(getPublishingBodySummary('   ')).toBe('正文待补充');
  });

  it('uses business labels for publishing retest states', () => {
    expect(getPublishingRetestStatusLabel()).toBe('待安排');
    expect(getPublishingRetestStatusLabel('planned')).toBe('已安排');
    expect(getPublishingRetestStatusLabel('improved')).toBe('已改善');
    expect(getPublishingRetestStatusLabel('not_improved')).toBe('待继续优化');
  });

  it('preserves upstream workflow context when scheduling publishing retest', () => {
    const path = getPublishingRetestPath(
      { id: 'record-1', generationTaskId: 'generation-1' },
      { optimizationUnitId: 'unit-1', intentId: 'intent-1', promptId: 'prompt-1', runId: 'run-1', planId: 'plan-1', versionId: 'version-1' }
    );
    const params = new URLSearchParams(path.split('?')[1]);

    expect(path.startsWith('/tasks?')).toBe(true);
    expect(params.get('optimizationUnitId')).toBe('unit-1');
    expect(params.get('intentId')).toBe('intent-1');
    expect(params.get('promptId')).toBe('prompt-1');
    expect(params.get('runId')).toBe('run-1');
    expect(params.get('planId')).toBe('plan-1');
    expect(params.get('generationTaskId')).toBe('generation-1');
    expect(params.get('versionId')).toBe('version-1');
    expect(params.get('publishingRecordId')).toBe('record-1');
    expect(params.get('action')).toBe('create');
  });

  it('summarizes publishing channel stats from records', () => {
    const stats = getPublishingChannelStats([
      buildPublishingRecord({ id: 'record-0', platform: 'wechat', status: 'draft', contentAssetId: 'asset-1' }),
      buildPublishingRecord({ id: 'record-1', platform: 'wechat', status: 'pending', contentAssetId: 'asset-1' }),
      buildPublishingRecord({ id: 'record-2', platform: 'wechat', status: 'published', contentAssetId: 'asset-2' }),
      buildPublishingRecord({ id: 'record-3', platform: 'xiaohongshu', status: 'failed', contentAssetId: 'asset-3' })
    ]);

    expect(stats).toEqual(expect.arrayContaining([
      expect.objectContaining({ platform: 'wechat', totalRecords: 3, pendingRecords: 1, publishedRecords: 1, failedRecords: 0, relatedIntentCount: 2, retestStatus: '建议再次监测', nextAction: '继续发布' }),
      expect.objectContaining({ platform: 'xiaohongshu', totalRecords: 1, pendingRecords: 0, publishedRecords: 0, failedRecords: 1, relatedIntentCount: 1, retestStatus: '发布后安排', nextAction: '处理失败' }),
      expect.objectContaining({ platform: 'website', totalRecords: 0, pendingRecords: 0, publishedRecords: 0, failedRecords: 0 })
    ]));
  });

  it('builds publishing platform detail for selected channel', () => {
    expect(getPublishingPlatformDetail('wechat', [
      buildPublishingRecord({ id: 'record-1', platform: 'wechat', status: 'published', updatedAt: '2026-07-13T00:00:00.000Z' }),
      buildPublishingRecord({ id: 'record-2', platform: 'wechat', status: 'pending', updatedAt: '2026-07-14T00:00:00.000Z' })
    ], [
      {
        id: 'account-1',
        brandId: 'brand-1',
        platform: 'wechat',
        accountName: '品牌公众号',
        loginMode: 'oauth',
        authStatus: 'connected',
        createdAt: '2026-07-14T00:00:00.000Z',
        updatedAt: '2026-07-14T00:00:00.000Z'
      }
    ])).toMatchObject({
      platform: 'wechat',
      accountCount: 1,
      latestPublishedAt: '2026-07-13T00:00:00.000Z',
      nextAction: '继续发布待处理内容',
      records: expect.arrayContaining([expect.objectContaining({ id: 'record-1' })])
    });
  });
});

function buildPublishingRecord(overrides = {}) {
  return {
    id: 'record-1',
    brandId: 'brand-1',
    contentAssetId: 'asset-1',
    title: '内容标题',
    body: '内容正文',
    platform: 'wechat',
    status: 'draft',
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    ...overrides
  } as const;
}

function buildOwnedMediaAccount(overrides = {}) {
  return {
    id: 'account-1',
    brandId: 'brand-1',
    platform: 'wechat',
    platformName: '公众号',
    accountName: '品牌公众号',
    loginMode: 'oauth',
    authStatus: 'connected',
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-14T00:00:00.000Z',
    stats: {
      brandId: 'brand-1',
      platform: 'wechat',
      totalRecords: 1,
      draftRecords: 0,
      pendingRecords: 0,
      publishedRecords: 1,
      failedRecords: 0
    },
    ...overrides
  } as const;
}
