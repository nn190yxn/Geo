import { describe, expect, it } from 'vitest';
import type { DiagnosticScorePolicy, SiteAuditCheck, SiteAuditResult } from '@geo-platform/shared-types';
import {
  defaultDiagnosticScorePolicy,
  DiagnosticScorePolicyError,
  DiagnosticScorePolicyService
} from '../src/modules/site-audit/diagnostic-score-policy.service';
import { DiagnosticScoreRepository } from '../src/modules/site-audit/diagnostic-score.repository';

describe('DiagnosticScorePolicyService', () => {
  it('freezes raw checks, four dimension scores, normalized weights, policy version, and total score', async () => {
    const service = new DiagnosticScorePolicyService(new DiagnosticScoreRepository());
    const snapshot = await service.scoreAndSave('brand-1', audit([
      check('robots_txt', 'pass'),
      check('sitemap_xml', 'warning'),
      check('llms_txt', 'warning'),
      check('noindex', 'pass'),
      check('ai_bot_access', 'fail'),
      check('structured_data', 'pass'),
      check('extractable_content', 'pass')
    ]));

    expect(snapshot.ruleVersion).toBe('site-diagnostic-v1');
    expect(snapshot.policy).toEqual(defaultDiagnosticScorePolicy);
    expect(snapshot.rawChecks).toHaveLength(7);
    expect(snapshot.dimensionScores.map(({ dimension, score }) => [dimension, score])).toEqual([
      ['schema', 100], ['meta', 62.5], ['content', 75], ['citation', null]
    ]);
    expect(snapshot.normalizedWeights).toEqual({
      schema: 0.352941, meta: 0.294118, content: 0.352941, citation: 0
    });
    expect(Object.values(snapshot.normalizedWeights).reduce((sum, value) => sum + value, 0)).toBeCloseTo(1, 5);
    expect(snapshot.totalScore).toBe(80.14);
  });

  it('excludes unavailable and unmeasured dimensions before normalizing weights', async () => {
    const service = new DiagnosticScorePolicyService(new DiagnosticScoreRepository());
    const snapshot = await service.scoreAndSave('brand-1', audit([
      check('robots_txt', 'pass'),
      check('sitemap_xml', 'pass'),
      check('llms_txt', 'unavailable'),
      check('noindex', 'pass'),
      check('ai_bot_access', 'pass'),
      check('structured_data', 'warning'),
      check('extractable_content', 'unavailable')
    ]));

    expect(snapshot.dimensionScores.find(({ dimension }) => dimension === 'content')?.score).toBeNull();
    expect(snapshot.dimensionScores.find(({ dimension }) => dimension === 'citation')?.rawChecks).toEqual([]);
    expect(snapshot.normalizedWeights).toEqual({ schema: 0.545455, meta: 0.454545, content: 0, citation: 0 });
    expect(snapshot.totalScore).toBe(72.72);
  });

  it('reproduces an old diagnosis with its frozen policy after the current policy changes', async () => {
    const repository = new DiagnosticScoreRepository();
    const oldService = new DiagnosticScorePolicyService(repository);
    const oldSnapshot = await oldService.scoreAndSave('brand-1', audit([
      check('structured_data', 'warning'), check('robots_txt', 'pass'), check('llms_txt', 'pass')
    ]));
    const changedPolicy: DiagnosticScorePolicy = {
      ...structuredClone(defaultDiagnosticScorePolicy),
      version: 'site-diagnostic-v2',
      statusScores: { ...defaultDiagnosticScorePolicy.statusScores, warning: 10 },
      dimensions: {
        ...structuredClone(defaultDiagnosticScorePolicy.dimensions),
        schema: { ...defaultDiagnosticScorePolicy.dimensions.schema, configuredWeight: 0.6 },
        meta: { ...defaultDiagnosticScorePolicy.dimensions.meta, configuredWeight: 0.1 }
      }
    };
    const currentService = new DiagnosticScorePolicyService(repository, changedPolicy);
    const currentSnapshot = await currentService.scoreAndSave('brand-1', audit([
      check('structured_data', 'warning'), check('robots_txt', 'pass'), check('llms_txt', 'pass')
    ]));
    const reproduced = await currentService.reproduce('brand-1', oldSnapshot.id);

    expect(currentSnapshot.ruleVersion).toBe('site-diagnostic-v2');
    expect(currentSnapshot.totalScore).not.toBe(oldSnapshot.totalScore);
    expect(reproduced).toEqual(oldSnapshot);
  });

  it('rejects illegal policy weights before scoring', () => {
    const invalid = structuredClone(defaultDiagnosticScorePolicy);
    invalid.dimensions.schema.configuredWeight = -1;
    expect(() => new DiagnosticScorePolicyService(new DiagnosticScoreRepository(), invalid))
      .toThrowError(DiagnosticScorePolicyError);
  });
});

function audit(checks: SiteAuditCheck[]): SiteAuditResult {
  return { websiteUrl: 'https://example.com/', auditedAt: '2026-08-03T00:00:00.000Z', checks };
}

function check(key: SiteAuditCheck['key'], status: SiteAuditCheck['status']): SiteAuditCheck {
  return {
    key,
    status,
    summary: `${key}: ${status}`,
    evidence: { targetUrl: `https://example.com/${key}`, checkedAt: '2026-08-03T00:00:00.000Z', httpStatus: 200 }
  };
}
