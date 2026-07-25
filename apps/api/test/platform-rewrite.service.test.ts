import { describe, expect, it } from 'vitest';
import type { ContentVersion } from '@geo-platform/shared-types';
import { AutomationRepository } from '../src/modules/automation/automation.repository';
import { PlatformRewriteService } from '../src/modules/automation/platform-rewrite.service';

describe('PlatformRewriteService', () => {
  it('rewrites one content version for five publishing platforms', () => {
    const repository = new AutomationRepository();
    const service = new PlatformRewriteService(repository);
    const version = createContentVersion();
    const platforms = ['zhihu', 'baijiahao', 'xiaohongshu', 'wechat_official', 'official_site_faq'] as const;

    const rewrites = platforms.map((targetPlatform) => service.rewriteContentVersion('brand_demo', { contentVersion: version, targetPlatform }));

    expect(rewrites).toHaveLength(5);
    expect(rewrites.map((rewrite) => rewrite.targetPlatform)).toEqual([...platforms]);
    expect(rewrites.every((rewrite) => rewrite.contentVersionId === version.id)).toBe(true);
    expect(rewrites.every((rewrite) => rewrite.status === 'needs_review')).toBe(true);
    expect(rewrites.every((rewrite) => rewrite.rewriteNotes.length > 0 && rewrite.complianceNotes.length > 0)).toBe(true);
    expect(rewrites.find((rewrite) => rewrite.targetPlatform === 'zhihu')?.body).toContain('问题：');
    expect(rewrites.find((rewrite) => rewrite.targetPlatform === 'baijiahao')?.title).toContain('服务观察');
    expect(rewrites.find((rewrite) => rewrite.targetPlatform === 'xiaohongshu')?.body).toContain('#贵阳儿童运动');
    expect(rewrites.find((rewrite) => rewrite.targetPlatform === 'wechat_official')?.body).toContain('## 品牌观点');
    expect(rewrites.find((rewrite) => rewrite.targetPlatform === 'official_site_faq')?.body).toContain('审慎声明');
    expect(repository.listRewrites('brand_demo', version.id)).toHaveLength(5);
  });
});

function createContentVersion(): ContentVersion {
  return {
    id: 'version_automation_1',
    brandId: 'brand_demo',
    generationTaskId: 'generation_automation_1',
    title: '追光小牛为什么适合贵阳儿童运动成长？',
    body: '# 追光小牛为什么适合贵阳儿童运动成长？\n\n追光小牛面向贵阳 2-14 岁儿童家庭，提供儿童运动成长课。',
    version: 1,
    exportFormat: 'markdown',
    createdAt: '2026-07-07T00:00:00.000Z',
    updatedAt: '2026-07-07T00:00:00.000Z'
  };
}
