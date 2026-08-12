import { describe, expect, it } from 'vitest';
import { getReleaseUpdate, isNewerRelease, parseReleaseVersion } from './releaseUpdate';

describe('release update checks', () => {
  it('parses release tags and compares semantic versions', () => {
    expect(parseReleaseVersion('v1.2.3')).toEqual([1, 2, 3]);
    expect(parseReleaseVersion('1.2')).toBeNull();
    expect(isNewerRelease('v1.2.0', '1.1.9')).toBe(true);
    expect(isNewerRelease('v1.0.0', '1.0.0')).toBe(false);
    expect(isNewerRelease('v0.9.9', '1.0.0')).toBe(false);
    expect(isNewerRelease('v1.9.0', '2.0.0')).toBe(false);
  });

  it('returns a stable newer GitHub release', async () => {
    const update = await getReleaseUpdate('1.0.0', async () => new Response(JSON.stringify({
      tag_name: 'v1.0.1',
      body: '修复问题',
      html_url: 'https://github.com/nn190yxn/Geo/releases/tag/v1.0.1'
    }), { status: 200 }));

    expect(update).toMatchObject({ version: '1.0.1', notes: '修复问题' });
  });

  it('hides prerelease and unavailable releases', async () => {
    const prerelease = await getReleaseUpdate('1.0.0', async () => new Response(JSON.stringify({
      tag_name: 'v1.1.0', prerelease: true
    }), { status: 200 }));
    const unavailable = await getReleaseUpdate('1.0.0', async () => new Response('', { status: 503 }));

    expect(prerelease).toBeNull();
    expect(unavailable).toBeNull();
  });
});
