import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it, vi } from 'vitest';
import type { SiteAuditAssessment, SiteAuditAcceptanceResult } from '@geo-platform/shared-types';
import { applyAcceptanceResult, SiteAuditWorkbenchView } from './SiteAuditWorkbench';

describe('SiteAuditWorkbench', () => {
  it('keeps successful findings visible while exposing targeted retry for unavailable checks', () => {
    const html = renderToStaticMarkup(<SiteAuditWorkbenchView
      websiteUrl="https://example.com/"
      assessment={assessment()}
      acceptanceHistory={{}}
      generatedAssets={[]}
      loading={false}
      canAudit
      canCreateTask
      canGenerateAssets
      canRecheck
      onWebsiteUrlChange={vi.fn()}
      onAudit={vi.fn()}
      onCreateTask={vi.fn()}
      onGenerateAssets={vi.fn()}
      onRecheck={vi.fn()}
    />);

    expect(html).toContain('部分目标暂时无法访问');
    expect(html).toContain('robots.txt 可访问');
    expect(html).toContain('SITE_AUDIT_FETCH_FAILED');
    expect(html).toContain('创建修复任务');
    expect(html).toContain('重新验收');
  });

  it('merges a live acceptance result into only the matching finding', () => {
    const original = assessment();
    const result: SiteAuditAcceptanceResult = {
      rule: original.findings[1].acceptanceRule,
      status: 'passed',
      checkedAt: '2026-08-03T01:00:00.000Z',
      evidence: { targetUrl: 'https://example.com/llms.txt', checkedAt: '2026-08-03T01:00:00.000Z', httpStatus: 200 },
      history: []
    };
    const updated = applyAcceptanceResult(original, result);
    expect(updated.findings.map(({ check }) => check.status)).toEqual(['pass', 'pass']);
    expect(updated.findings[1].check.evidence.httpStatus).toBe(200);
  });
});

function assessment(): SiteAuditAssessment {
  const base = {
    websiteUrl: 'https://example.com/',
    auditedAt: '2026-08-03T00:00:00.000Z',
    recommendedTasks: [{ title: '生成并部署 llms.txt', type: 'manual' as const, priority: 'low' as const }]
  };
  const checks = [
    { key: 'robots_txt' as const, status: 'pass' as const, summary: 'robots.txt 可访问', evidence: { targetUrl: 'https://example.com/robots.txt', checkedAt: base.auditedAt, httpStatus: 200 } },
    { key: 'llms_txt' as const, status: 'unavailable' as const, summary: 'llms.txt 无法访问', evidence: { targetUrl: 'https://example.com/llms.txt', checkedAt: base.auditedAt, errorCode: 'SITE_AUDIT_FETCH_FAILED' } }
  ];
  return {
    ...base,
    checks,
    findings: checks.map((check) => ({
      check,
      impactLevel: check.status === 'pass' ? 'low' as const : 'high' as const,
      impactDescription: '影响说明',
      remediation: '修复说明',
      taskTemplate: { title: check.key === 'robots_txt' ? '补充 robots.txt' : '生成并部署 llms.txt', type: 'manual', priority: 'low' },
      acceptanceRule: { id: `rule-${check.key}`, checkKey: check.key, checkerType: 'text', targetUrl: check.evidence.targetUrl, expectedStatus: 'pass', description: '重新检查' }
    }))
  };
}
