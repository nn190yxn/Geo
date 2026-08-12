import { afterEach, describe, expect, it, vi } from 'vitest';
import { BaiduSearchDemandAdapter, GoogleSearchDemandAdapter, ManualSearchDemandAdapter } from '../src/modules/automation/search-demand.adapter';

afterEach(() => vi.unstubAllGlobals());

describe('search demand adapters', () => {
  it('parses Baidu JSONP suggestions from the fixed autocomplete endpoint', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('window.baidu.sug({"q":"儿童体能","s":["儿童体能训练","儿童体能课怎么选"]});'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new BaiduSearchDemandAdapter().collect({ seedTerm: '儿童体能', source: 'baidu', market: '中国' });

    expect(result.candidateQuestions).toEqual(['儿童体能训练', '儿童体能课怎么选']);
    expect(String(fetchMock.mock.calls[0][0])).toContain('suggestion.baidu.com/su');
    expect(String(fetchMock.mock.calls[0][0])).toContain('%E5%84%BF%E7%AB%A5%E4%BD%93%E8%83%BD');
  });

  it('parses Google suggestions and maps Chinese markets to zh-CN', async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response('["儿童体能",["儿童体能训练机构","儿童体能课适合几岁"]]'));
    vi.stubGlobal('fetch', fetchMock);

    const result = await new GoogleSearchDemandAdapter().collect({ seedTerm: '儿童体能', source: 'google', market: '贵阳，中国' });

    expect(result.candidateQuestions).toHaveLength(2);
    expect(String(fetchMock.mock.calls[0][0])).toContain('suggestqueries.google.com/complete/search');
    expect(String(fetchMock.mock.calls[0][0])).toContain('hl=zh-CN');
  });

  it('keeps manually entered questions inside the adapter boundary', async () => {
    const result = await new ManualSearchDemandAdapter().collect({
      seedTerm: '儿童体能',
      source: 'manual',
      market: '贵阳',
      candidateQuestions: [' 儿童体能课怎么选？ ', '', '适合几岁']
    });
    expect(result.candidateQuestions).toEqual(['儿童体能课怎么选？', '适合几岁']);
  });
});
