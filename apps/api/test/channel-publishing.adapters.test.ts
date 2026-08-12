import { describe, expect, it, vi } from 'vitest';
import { GitHubContentsPublishingAdapter, WeChatOfficialPublishingAdapter, WordPressPublishingAdapter } from '../src/modules/publishing/adapters/channel-publishing.adapters';

const request = { idempotencyKey: 'record-1', brandId: 'brand-1', accountId: 'account-1', accountName: '账号', platform: 'wordpress', title: '标题', body: '正文' };

describe('channel publishing adapters', () => {
  it('maps WordPress and GitHub responses to persistent external identifiers and links', async () => {
    const wordpressFetch = vi.fn(async () => new Response(JSON.stringify({ id: 12, link: 'https://site.example/posts/12' }), { status: 201 }));
    const githubFetch = vi.fn(async () => new Response(JSON.stringify({ content: { sha: 'sha-1', html_url: 'https://github.com/org/repo/blob/main/article.md' } }), { status: 201 }));
    const wordpress = new WordPressPublishingAdapter({ wordpress: { endpointUrl: 'https://site.example/wp-json/wp/v2/posts', authorizationToken: 'token' } }, wordpressFetch as typeof fetch);
    const github = new GitHubContentsPublishingAdapter({ github_contents: { endpointUrl: 'https://api.github.example/contents/article.md', authorizationToken: 'token' } }, githubFetch as typeof fetch);

    await expect(wordpress.publish(request)).resolves.toEqual({ externalPlatformId: '12', publishedUrl: 'https://site.example/posts/12' });
    await expect(github.publish({ ...request, platform: 'github_contents' })).resolves.toEqual({ externalPlatformId: 'sha-1', publishedUrl: 'https://github.com/org/repo/blob/main/article.md' });
    expect(JSON.stringify(wordpress.getCapability('wordpress'))).not.toContain('token');
  });

  it('marks WeChat Official as an explicit manual handoff channel', async () => {
    const adapter = new WeChatOfficialPublishingAdapter();
    expect(adapter.getCapability('wechat')).toMatchObject({ resultMode: 'manual_handoff', supportsDraftCreation: true });
    await expect(adapter.publish(request)).rejects.toThrow('渠道后台确认草稿');
  });
});
