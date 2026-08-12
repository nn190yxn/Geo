import { describe, expect, it, vi } from 'vitest';
import type { SiteAuditCheck, SiteAuditResult } from '@geo-platform/shared-types';
import type { SiteAuditAdapter } from '../src/modules/site-audit/site-audit.adapter';
import { AcceptanceRuleService, SiteAuditService } from '../src/modules/site-audit/site-audit.service';

describe('SiteAuditService', () => {
  it('maps every check to impact, remediation, task template, and checker rule', async () => {
    const adapter = adapterReturning(auditResult([
      check('robots_txt', 'pass', 'https://example.com/robots.txt'),
      check('sitemap_xml', 'warning', 'https://example.com/sitemap.xml'),
      check('llms_txt', 'warning', 'https://example.com/llms.txt'),
      check('noindex', 'fail', 'https://example.com/'),
      check('ai_bot_access', 'pass', 'https://example.com/robots.txt'),
      check('structured_data', 'warning', 'https://example.com/'),
      check('extractable_content', 'unavailable', 'https://example.com/')
    ]));

    const result = await new SiteAuditService(adapter).audit('https://example.com');

    expect(result.findings).toHaveLength(7);
    expect(result.findings.every((finding) => finding.impactDescription && finding.remediation)).toBe(true);
    expect(result.findings.map((finding) => finding.acceptanceRule.checkerType)).toEqual([
      'text', 'link', 'text', 'response_header', 'text', 'structure', 'structure'
    ]);
    expect(result.recommendedTasks).toHaveLength(5);
    expect(result.recommendedTasks).toContainEqual({ title: '解除首页 noindex 限制', type: 'manual', priority: 'high' });
  });
});

describe('AcceptanceRuleService', () => {
  it('fetches the live target for each recheck and appends real evidence history', async () => {
    const adapter: SiteAuditAdapter = {
      audit: vi.fn()
        .mockResolvedValueOnce(auditResult([check('noindex', 'fail', 'https://example.com/')]))
        .mockResolvedValueOnce(auditResult([check('noindex', 'pass', 'https://example.com/')]))
    };
    const service = new AcceptanceRuleService(adapter);
    const rule = {
      id: 'site_checker_noindex',
      checkKey: 'noindex' as const,
      checkerType: 'response_header' as const,
      targetUrl: 'https://example.com/',
      expectedStatus: 'pass' as const,
      description: '重新检查 noindex。'
    };

    const failed = await service.execute('https://example.com', rule);
    const passed = await service.execute('https://example.com', rule, failed.history);

    expect(adapter.audit).toHaveBeenCalledTimes(2);
    expect(failed.status).toBe('failed');
    expect(passed.status).toBe('passed');
    expect(passed.history).toHaveLength(2);
    expect(passed.history.map((item) => item.status)).toEqual(['failed', 'passed']);
    expect(passed.history.every((item) => item.evidence.httpStatus === 200)).toBe(true);
  });

  it('records unavailable evidence when the requested check is absent', async () => {
    const service = new AcceptanceRuleService(adapterReturning(auditResult([])));
    const result = await service.execute('https://example.com', {
      id: 'site_checker_llms_txt',
      checkKey: 'llms_txt',
      checkerType: 'text',
      targetUrl: 'https://example.com/llms.txt',
      expectedStatus: 'pass',
      description: '重新检查 llms.txt。'
    });

    expect(result.status).toBe('unavailable');
    expect(result.evidence).toMatchObject({
      targetUrl: 'https://example.com/llms.txt',
      errorCode: 'SITE_AUDIT_CHECK_MISSING'
    });
  });

  it('rejects a passing check returned for a different real target', async () => {
    const service = new AcceptanceRuleService(adapterReturning(auditResult([
      check('llms_txt', 'pass', 'https://example.com/other-llms.txt')
    ])));
    const result = await service.execute('https://example.com', {
      id: 'site_checker_llms_txt',
      checkKey: 'llms_txt',
      checkerType: 'text',
      targetUrl: 'https://example.com/llms.txt',
      expectedStatus: 'pass',
      description: '重新检查 llms.txt。'
    });

    expect(result.status).toBe('unavailable');
    expect(result.evidence).toMatchObject({
      targetUrl: 'https://example.com/llms.txt',
      errorCode: 'SITE_AUDIT_TARGET_MISMATCH'
    });
    expect(result.history).toHaveLength(1);
  });
});

function adapterReturning(result: SiteAuditResult): SiteAuditAdapter {
  return { audit: vi.fn(async () => result) };
}

function auditResult(checks: SiteAuditCheck[]): SiteAuditResult {
  return { websiteUrl: 'https://example.com/', auditedAt: '2026-08-03T00:00:00.000Z', checks };
}

function check(key: SiteAuditCheck['key'], status: SiteAuditCheck['status'], targetUrl: string): SiteAuditCheck {
  return {
    key,
    status,
    summary: `${key}: ${status}`,
    evidence: {
      targetUrl,
      checkedAt: '2026-08-03T00:00:00.000Z',
      httpStatus: 200,
      contentType: 'text/html'
    }
  };
}
