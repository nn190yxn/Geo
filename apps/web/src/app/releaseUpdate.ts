export const githubReleaseApiUrl = 'https://api.github.com/repos/nn190yxn/Geo/releases/latest';
export const githubReleasesUrl = 'https://github.com/nn190yxn/Geo/releases';

export type ReleaseUpdate = {
  version: string;
  notes: string;
  url: string;
};

type GitHubRelease = {
  tag_name?: string;
  body?: string;
  html_url?: string;
  prerelease?: boolean;
};

export function parseReleaseVersion(value: string): number[] | null {
  const match = value.trim().match(/^v?(\d+)\.(\d+)\.(\d+)$/);
  return match ? match.slice(1).map(Number) : null;
}

export function isNewerRelease(latestVersion: string, currentVersion: string): boolean {
  const latest = parseReleaseVersion(latestVersion);
  const current = parseReleaseVersion(currentVersion);
  if (!latest || !current) return false;

  for (let index = 0; index < latest.length; index += 1) {
    if (latest[index] === current[index]) continue;
    return latest[index] > current[index];
  }

  return false;
}

export async function getReleaseUpdate(
  currentVersion: string,
  fetcher: typeof fetch = fetch
): Promise<ReleaseUpdate | null> {
  try {
    const response = await fetcher(githubReleaseApiUrl, { headers: { Accept: 'application/vnd.github+json' } });
    if (!response.ok) return null;
    const release = await response.json() as GitHubRelease;
    if (release.prerelease || !release.tag_name || !isNewerRelease(release.tag_name, currentVersion)) return null;

    return {
      version: release.tag_name.replace(/^v/, ''),
      notes: release.body?.trim() ?? '',
      url: release.html_url ?? githubReleasesUrl
    };
  } catch {
    return null;
  }
}
