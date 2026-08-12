import { describe, expect, it } from 'vitest';
import { buildSourcePagePlan } from '../src/modules/quick-start/quick-start.service';

describe('source page planning', () => {
  it('classifies discovered same-origin pages and explains why they were selected', () => {
    const plan = buildSourcePagePlan('https://example.com/', {
      url: 'https://example.com/',
      title: 'Example',
      candidatePages: [
        { url: 'https://example.com/products', title: '产品' },
        { url: 'https://example.com/about', title: '关于我们' },
        { url: 'https://example.com/faq', title: 'FAQ' },
        { url: 'https://example.com/cases', title: '客户案例' },
        { url: 'https://example.com/contact', title: '联系我们' },
        { url: 'https://example.com/privacy', title: '隐私政策' }
      ]
    });

    expect(plan.items.map((item) => item.sourceRole)).toEqual([
      'home', 'product', 'about', 'faq', 'case', 'contact', 'policy'
    ]);
    expect(plan.items.every((item) => item.selectionReason.length > 0)).toBe(true);
    expect(plan.items.every((item) => item.included)).toBe(true);
    expect(plan.confirmedAt).toBeUndefined();
  });

  it('creates explainable deterministic candidates when link discovery is unavailable', () => {
    const first = buildSourcePagePlan('https://example.com/');
    const second = buildSourcePagePlan('https://example.com/');

    expect(second).toEqual(first);
    expect(first.items.map((item) => item.sourceRole)).toEqual([
      'home', 'product', 'about', 'faq', 'case', 'contact', 'policy'
    ]);
    expect(first.items.filter((item) => item.included).map((item) => item.sourceRole)).toEqual(['home']);
    expect(first.items.slice(1).every((item) => item.selectionReason.includes('等待人工确认'))).toBe(true);
  });

  it('normalizes discovered URL variants to one stable page', () => {
    const plan = buildSourcePagePlan('https://example.com/', {
      url: 'https://example.com/',
      candidatePages: [
        { url: 'https://example.com/about/#team', title: 'About' },
        { url: 'https://example.com/about?utm_source=menu', title: 'About duplicate' }
      ]
    });

    expect(plan.items.filter((item) => item.sourceRole === 'about')).toHaveLength(1);
    expect(plan.items.find((item) => item.sourceRole === 'about')?.url).toBe('https://example.com/about');
  });
});
