import { Form } from 'antd';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { MediaPlatformRule, OwnedMediaAccount, PublishingRecord } from '@geo-platform/shared-types';
import {
  MediaPlatformRulesPage,
  OwnedMediaAccessPage,
  PublishingPreparationFields,
  PublishingRecordsWorkspacePage,
  PublishingResultFields,
  getPublishingRetestPath
} from './PublishingCenterPage';

const noOp = () => undefined;
const filters = { search: '', platform: 'all' as const, status: 'all' as const };

describe('publishing operations components', () => {
  it('renders owned media authorization states and their recovery actions', () => {
    const markup = renderToStaticMarkup(
      <OwnedMediaAccessPage
        accounts={[
          buildOwnedMediaAccount(),
          buildOwnedMediaAccount({ id: 'account-2', accountName: '品牌知乎', platform: 'zhihu', platformName: '知乎', authStatus: 'expired' })
        ]}
        totalCount={2}
        filters={filters}
        platformFilter="all"
        state="ready"
        managing={false}
        onFiltersChange={noOp}
        onPlatformFilterChange={noOp}
        onClearFilters={noOp}
        onConnect={noOp}
        onManage={noOp}
        onRetry={noOp}
      />
    );

    expect(markup).toContain('品牌公众号');
    expect(markup).toContain('已授权');
    expect(markup).toContain('品牌知乎');
    expect(markup).toContain('授权过期');
    expect(markup).toContain('重新授权');
  });

  it('renders an actionable empty state when no owned media account is connected', () => {
    const markup = renderToStaticMarkup(
      <OwnedMediaAccessPage
        accounts={[]}
        totalCount={0}
        filters={filters}
        platformFilter="all"
        state="empty"
        managing={false}
        onFiltersChange={noOp}
        onPlatformFilterChange={noOp}
        onClearFilters={noOp}
        onConnect={noOp}
        onManage={noOp}
        onRetry={noOp}
      />
    );

    expect(markup).toContain('还没有接入自有媒体');
    expect(markup).toContain('账号接入后才能确认发布渠道和授权可用性');
    expect(markup).toContain('接入第一个品牌自有媒体账号');
    expect(markup).toContain('接入账号');
  });

  it('renders persisted platform publishing rules', () => {
    const markup = renderToStaticMarkup(
      <MediaPlatformRulesPage
        rules={[buildMediaPlatformRule()]}
        totalCount={1}
        filters={filters}
        state="ready"
        onFiltersChange={noOp}
        onClearFilters={noOp}
        onRetry={noOp}
      />
    );

    for (const content of ['公众号', '长文', '品牌了解', '每周 2 篇', '2.35:1', '发布前检查事实来源']) {
      expect(markup).toContain(content);
    }
  });

  it('renders filtered publishing output, real status and retest entry', () => {
    const markup = renderToStaticMarkup(
      <PublishingRecordsWorkspacePage
        rows={[buildPublishingRecord()]}
        totalCount={3}
        filters={{ ...filters, search: 'FAQ', status: 'published' }}
        channelFilter="wechat"
        channels={[{ value: 'wechat', label: '公众号' }]}
        highlightedRecordId="record-1"
        state="ready"
        updating={false}
        onFiltersChange={noOp}
        onCreate={noOp}
        onOpenOwnedMedia={noOp}
        onOpenPlatformRules={noOp}
        onRecordResult={noOp}
        onScheduleRetest={noOp}
        onCopy={noOp}
        onSetPending={noOp}
        onSetFailed={noOp}
        onRetry={noOp}
      />
    );

    expect(markup).toContain('显示 1 条，共 3 条');
    expect(markup).toContain('品牌 FAQ');
    expect(markup).toContain('已发布');
    expect(markup).toContain('https://brand.example.com/article');
    expect(markup).toContain('更新发布结果');
    expect(markup).toContain('安排再次监测');
    expect(markup).toContain('已定位内容生成流程交接的发布记录');
  });

  it('renders true publishing URL entry and explicit status outcome', () => {
    const markup = renderToStaticMarkup(
      <Form initialValues={{ publishedUrl: 'https://brand.example.com/article', status: 'published' }}>
        <PublishingResultFields />
      </Form>
    );

    expect(markup).toContain('真实发布链接');
    expect(markup).toContain('https://brand.example.com/article');
    expect(markup).toContain('保存后发布状态将更新为已发布');
    expect(markup).toContain('可继续安排再次监测');
  });

  it('prompts for a connected account and every required publishing preparation field', () => {
    const markup = renderToStaticMarkup(
      <Form>
        <PublishingPreparationFields
          accounts={[buildOwnedMediaAccount({ authStatus: 'expired' })]}
          platformOptions={[{ value: 'wechat', label: '公众号' }]}
        />
      </Form>
    );

    expect(markup).toContain('还没有可用发布账号');
    expect(markup).toContain('请先在自有媒体中接入账号或恢复账号授权');
    expect(markup).toContain('请补齐发布账号、内容标题、内容正文和目标平台');
    for (const field of ['发布账号', '内容标题', '内容正文', '目标平台']) {
      expect(markup).toContain(field);
    }
  });

  it('renders a retry action when publishing operations fail to load', () => {
    const markup = renderToStaticMarkup(
      <PublishingRecordsWorkspacePage
        rows={[]}
        totalCount={0}
        filters={filters}
        channelFilter="all"
        channels={[]}
        state="error"
        updating={false}
        onFiltersChange={noOp}
        onCreate={noOp}
        onOpenOwnedMedia={noOp}
        onOpenPlatformRules={noOp}
        onRecordResult={noOp}
        onScheduleRetest={noOp}
        onCopy={noOp}
        onSetPending={noOp}
        onSetFailed={noOp}
        onRetry={noOp}
      />
    );

    expect(markup).toContain('发布记录和再次监测状态加载失败');
    expect(markup).toContain('重新加载');
  });

  it('preserves publishing context when creating a retest task', () => {
    const path = getPublishingRetestPath(buildPublishingRecord(), {
      optimizationUnitId: 'unit-1',
      intentId: 'intent-1',
      promptId: 'prompt-1',
      runId: 'run-1',
      planId: 'plan-1',
      versionId: 'version-1'
    });

    expect(path).toContain('/tasks?');
    for (const entry of ['publishingRecordId=record-1', 'generationTaskId=generation-1', 'versionId=version-1', 'runId=run-1', 'action=create']) {
      expect(path).toContain(entry);
    }
  });
});

function buildOwnedMediaAccount(overrides: Partial<OwnedMediaAccount> = {}): OwnedMediaAccount {
  return {
    id: 'account-1',
    brandId: 'brand-1',
    platform: 'wechat',
    platformName: '公众号',
    accountName: '品牌公众号',
    loginMode: 'oauth',
    authStatus: 'connected',
    lastAuthorizedAt: '2026-07-16T00:00:00.000Z',
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
    stats: {
      brandId: 'brand-1',
      platform: 'wechat',
      totalRecords: 2,
      draftRecords: 0,
      pendingRecords: 0,
      publishedRecords: 2,
      failedRecords: 0
    },
    ...overrides
  };
}

function buildMediaPlatformRule(): MediaPlatformRule {
  return {
    brandId: 'brand-1',
    platform: 'wechat',
    name: '公众号',
    contentFormats: ['长文', 'FAQ'],
    intentFit: '品牌了解',
    recommendedFrequency: '每周 2 篇',
    coverRatio: '2.35:1',
    publishingNote: '发布前检查事实来源'
  };
}

function buildPublishingRecord(): PublishingRecord {
  return {
    id: 'record-1',
    brandId: 'brand-1',
    contentAssetId: 'asset-1',
    generationTaskId: 'generation-1',
    versionId: 'version-1',
    title: '品牌 FAQ',
    body: '品牌 FAQ 正文',
    platform: 'wechat',
    accountName: '品牌公众号',
    status: 'published',
    publishedUrl: 'https://brand.example.com/article',
    createdAt: '2026-07-14T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z'
  };
}
