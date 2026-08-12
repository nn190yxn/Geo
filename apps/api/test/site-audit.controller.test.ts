import { describe, expect, it, vi } from 'vitest';
import type { Request } from 'express';
import type { DiagnosticScoreSnapshot, SiteAuditAssessment, SiteAuditCheckerRule } from '@geo-platform/shared-types';
import { resolveBrandAccessPolicy } from '../src/common/access-control/brand-access.policy';
import { SiteAuditController } from '../src/modules/site-audit/site-audit.controller';

describe('SiteAuditController', () => {
  it('exposes a brand-scoped audit response', async () => {
    const assessment = result();
    const { controller, siteAuditService, diagnosticScorePolicyService } = harness(assessment);
    const response = await controller.audit(request(), 'brand-1', { websiteUrl: ' https://example.com ' });
    expect(response).toEqual({ success: true, data: { ...assessment, diagnosticScore: score() } });
    expect(siteAuditService.audit).toHaveBeenCalledWith('https://example.com');
    expect(diagnosticScorePolicyService.scoreAndSave).toHaveBeenCalledWith('brand-1', assessment);
  });

  it('delegates technical asset generation with user and brand context', async () => {
    const { controller, technicalAssetService } = harness(result());
    await controller.generateTechnicalAssets(request(), 'brand-1', { targetPage: 'https://example.com/' });
    expect(technicalAssetService.generate).toHaveBeenCalledWith('user-1', 'brand-1', { targetPage: 'https://example.com/' });
  });

  it('rejects a mismatched recheck path and rule', async () => {
    const { controller, acceptanceRuleService } = harness(result());
    await expect(controller.recheck(request(), 'brand-1', 'robots_txt', {
      websiteUrl: 'https://example.com',
      rule: rule('llms_txt')
    })).rejects.toMatchObject({ status: 400 });
    expect(acceptanceRuleService.execute).not.toHaveBeenCalled();
  });

  it('uses operator write permissions for audit, assets, and recheck routes', () => {
    expect(resolveBrandAccessPolicy('POST', '/api/v1/brands/brand-1/site-audit')).toEqual({ resource: 'monitoring', minimumRole: 'operator' });
    expect(resolveBrandAccessPolicy('POST', '/api/v1/brands/brand-1/site-audit/technical-assets')).toEqual({ resource: 'content', minimumRole: 'operator' });
    expect(resolveBrandAccessPolicy('POST', '/api/v1/brands/brand-1/site-audit/checks/noindex/recheck')).toEqual({ resource: 'retest', minimumRole: 'operator' });
  });

  it('persists a real checker result against its repair task', async () => {
    const { controller, acceptanceRuleService, acceptanceHistoryService } = harness(result());
    const acceptance = {
      rule: rule('robots_txt'),
      status: 'passed' as const,
      checkedAt: '2026-08-03T01:00:00.000Z',
      evidence: { targetUrl: 'https://example.com/', checkedAt: '2026-08-03T01:00:00.000Z', httpStatus: 200 },
      history: []
    };
    acceptanceRuleService.execute.mockResolvedValue(acceptance);
    acceptanceHistoryService.recordSiteAudit.mockResolvedValue({ history: { taskId: 'task-1' } });

    const response = await controller.recheck(request(), 'brand-1', 'robots_txt', {
      websiteUrl: 'https://example.com', rule: acceptance.rule, taskId: 'task-1'
    });

    expect(acceptanceHistoryService.recordSiteAudit).toHaveBeenCalledWith('user-1', 'brand-1', 'task-1', acceptance);
    expect(response.success && response.data.taskAcceptance).toEqual({ taskId: 'task-1' });
  });

  it('reproduces a stored diagnosis inside the requested brand', async () => {
    const { controller, diagnosticScorePolicyService } = harness(result());
    const response = await controller.reproduceDiagnosis(request(), 'brand-1', 'diagnosis-1');
    expect(response).toEqual({ success: true, data: score() });
    expect(diagnosticScorePolicyService.reproduce).toHaveBeenCalledWith('brand-1', 'diagnosis-1');
  });
});

function harness(assessment: SiteAuditAssessment) {
  const permissionsService = { listAccessibleBrands: vi.fn(() => [{ brandId: 'brand-1' }]) };
  const siteAuditService = { audit: vi.fn(async () => assessment) };
  const acceptanceRuleService = { execute: vi.fn() };
  const technicalAssetService = { generate: vi.fn(async () => []) };
  const diagnosticScorePolicyService = {
    scoreAndSave: vi.fn(async () => score()),
    reproduce: vi.fn(async () => score())
  };
  const acceptanceHistoryService = { recordSiteAudit: vi.fn() };
  const controller = new SiteAuditController(
    permissionsService as never,
    siteAuditService as never,
    acceptanceRuleService as never,
    technicalAssetService as never,
    diagnosticScorePolicyService as never,
    acceptanceHistoryService as never
  );
  return { controller, siteAuditService, acceptanceRuleService, technicalAssetService, diagnosticScorePolicyService, acceptanceHistoryService };
}

function request(): Request {
  return { context: { userId: 'user-1' } } as unknown as Request;
}

function rule(checkKey: SiteAuditCheckerRule['checkKey']): SiteAuditCheckerRule {
  return { id: `rule-${checkKey}`, checkKey, checkerType: 'text', targetUrl: 'https://example.com/', expectedStatus: 'pass', description: '检查规则' };
}

function result(): SiteAuditAssessment {
  return { websiteUrl: 'https://example.com/', auditedAt: '2026-08-03T00:00:00.000Z', checks: [], findings: [], recommendedTasks: [] };
}

function score(): DiagnosticScoreSnapshot {
  return {
    id: 'diagnosis-1', brandId: 'brand-1', websiteUrl: 'https://example.com/', rawChecks: [], dimensionScores: [],
    normalizedWeights: { schema: 0, meta: 0, content: 0, citation: 0 },
    policy: {
      version: 'site-diagnostic-v1', statusScores: { pass: 100, warning: 50, fail: 0, unavailable: null },
      dimensions: {
        schema: { configuredWeight: 0.3, checkKeys: ['structured_data'] },
        meta: { configuredWeight: 0.25, checkKeys: [] },
        content: { configuredWeight: 0.3, checkKeys: [] },
        citation: { configuredWeight: 0.15, checkKeys: [] }
      }
    },
    ruleVersion: 'site-diagnostic-v1', totalScore: 0, createdAt: '2026-08-03T00:00:00.000Z'
  };
}
