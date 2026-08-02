import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { buildMonitoringRecoveryItems, getMonitoringCollectionPaths, MonitoringRecoverySummary } from './MonitoringRecoverySummary';

describe('MonitoringRecoverySummary helpers', () => {
  it('maps missing samples, browser confirmation, manual input, configuration and failures to recovery actions', () => {
    const items = buildMonitoringRecoveryItems({
      realSampleCount: 0,
      platformScope: 'Kimi',
      plans: [{
        status: 'needs_confirmation',
        connectionSummary: [{
          platformCode: 'kimi',
          name: 'Kimi',
          methods: ['browser', 'manual'],
          status: 'needs_confirmation',
          hasCredential: false
        }]
      }],
      runs: [
        { status: 'review_required', response: undefined, retryStatus: 'not_retried' },
        { status: 'failed', response: undefined, retryStatus: 'retry_pending' }
      ],
      platforms: [{ platformCode: 'deepseek', enabled: true, connectionStatus: 'needs_configuration', availableMethods: ['api', 'manual'] }]
    });

    expect(items.map((item) => item.key)).toEqual([
      'sample_missing',
      'browser_confirmation',
      'manual_required',
      'platform_configuration',
      'run_failed'
    ]);
    expect(items[0]?.description).toContain('样本范围：Kimi');
    expect(items[0]?.impact).toContain('Top 3 推荐率');
    expect(items.map((item) => item.target)).toEqual(['questions', 'tools', 'execution', 'tools', 'responses']);
    expect(items[4]?.description).toContain('等待自动重试');
  });

  it('returns no recovery issue when real samples and connections are ready', () => {
    const items = buildMonitoringRecoveryItems({
      realSampleCount: 3,
      platformScope: '全部平台',
      plans: [],
      runs: [{ status: 'completed', response: { rawText: '真实回复' }, retryStatus: 'not_retried' }],
      platforms: [{ platformCode: 'doubao', enabled: true, connectionStatus: 'ready', availableMethods: ['api', 'manual'] }]
    } as unknown as Parameters<typeof buildMonitoringRecoveryItems>[0]);

    expect(items).toEqual([]);
  });

  it('keeps automatic, browser-assisted and manual collection paths visible', () => {
    const paths = getMonitoringCollectionPaths([
      { platformCode: 'doubao', enabled: true, connectionStatus: 'ready', availableMethods: ['api', 'manual'] },
      { platformCode: 'kimi', enabled: true, connectionStatus: 'browser_available', availableMethods: ['browser', 'manual'] }
    ]);

    expect(paths.map((path) => path.key)).toEqual(['automatic', 'browser', 'manual']);
    expect(paths.map((path) => path.available)).toEqual([true, true, true]);
    expect(paths[2]?.status).toBe('始终可用');
  });

  it('shows available fallbacks when automatic monitoring needs configuration', () => {
    const paths = getMonitoringCollectionPaths([
      { platformCode: 'kimi', enabled: true, connectionStatus: 'needs_configuration', availableMethods: ['browser', 'manual'] }
    ]);

    expect(paths[0]?.status).toBe('等待平台配置');
    expect(paths[1]?.available).toBe(true);
    expect(paths[2]?.available).toBe(true);
  });

  it('keeps partial real data visible while exposing failed-run recovery', () => {
    const items = buildMonitoringRecoveryItems({
      realSampleCount: 2,
      platformScope: '全部平台',
      plans: [],
      runs: [
        { status: 'completed', response: { rawText: '真实回复' }, retryStatus: 'not_retried' },
        { status: 'failed', response: undefined, retryStatus: 'retried' }
      ],
      platforms: []
    } as unknown as Parameters<typeof buildMonitoringRecoveryItems>[0]);

    expect(items.map((item) => item.key)).toEqual(['run_failed']);
    expect(items[0]?.impact).toContain('分析范围会缩小');
  });

  it('renders recovery actions together with all real-response collection paths', () => {
    const items = buildMonitoringRecoveryItems({
      realSampleCount: 0,
      platformScope: 'Kimi',
      plans: [],
      runs: [{ status: 'failed', response: undefined, retryStatus: 'retried' }],
      platforms: [{ platformCode: 'kimi', enabled: true, connectionStatus: 'browser_available', availableMethods: ['browser', 'manual'] }]
    } as unknown as Parameters<typeof buildMonitoringRecoveryItems>[0]);
    const markup = renderToStaticMarkup(createElement(MonitoringRecoverySummary, { items, platforms: [], onAction: () => undefined }));

    expect(markup).toContain('当前分析范围缺少真实回复');
    expect(markup).toContain('查看失败记录');
    expect(markup).toContain('自动监测');
    expect(markup).toContain('浏览器辅助监测');
    expect(markup).toContain('手动录入');
  });
});
