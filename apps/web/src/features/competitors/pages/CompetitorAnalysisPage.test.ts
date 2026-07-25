import { describe, expect, it } from 'vitest';
import { getCompetitorLabelColor, getProviderStatusDescription, splitKeywordText, toDiscoveryPayload } from './CompetitorAnalysisPage';

describe('CompetitorAnalysisPage helpers', () => {
  it('splits competitor discovery keywords from Chinese and English separators', () => {
    expect(splitKeywordText('儿童体能、少儿跑酷, 快乐体操\n篮球培训')).toEqual(['儿童体能', '少儿跑酷', '快乐体操', '篮球培训']);
  });

  it('builds competitor discovery payload from form values', () => {
    expect(toDiscoveryPayload({
      city: ' 贵阳 ',
      campusRadiusKm: 5,
      keywordsText: '儿童运动、体适能',
      forceRefresh: true
    })).toEqual({
      city: '贵阳',
      campusRadiusKm: 5,
      keywords: ['儿童运动', '体适能'],
      forceRefresh: true
    });
  });

  it('explains provider status in operator friendly text', () => {
    expect(getProviderStatusDescription({ providerStatus: 'configured', cacheHit: false, sourceProvider: 'amap' })).toContain('真实地图数据');
    expect(getProviderStatusDescription({ providerStatus: 'configured', cacheHit: true, sourceProvider: 'amap' })).toContain('重新从地图拉取');
    expect(getProviderStatusDescription({ providerStatus: 'fallback', cacheHit: false, sourceProvider: 'amap' })).toContain('内测候选源');
    expect(getProviderStatusDescription({ providerStatus: 'disabled', cacheHit: false, sourceProvider: 'amap' })).toContain('已停用');
  });

  it('uses clear colors for competitor confirmation labels', () => {
    expect(getCompetitorLabelColor('direct_competitor')).toBe('red');
    expect(getCompetitorLabelColor('national_benchmark')).toBe('blue');
    expect(getCompetitorLabelColor('excluded')).toBe('default');
  });
});
