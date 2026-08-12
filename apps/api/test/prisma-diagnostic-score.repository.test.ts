import { describe, expect, it, vi } from 'vitest';
import type { DiagnosticScoreSnapshot } from '@geo-platform/shared-types';
import { PrismaDiagnosticScoreRepository } from '../src/modules/site-audit/prisma-diagnostic-score.repository';

const createdAt = new Date('2026-08-03T12:00:00.000Z');

describe('PrismaDiagnosticScoreRepository', () => {
  it('persists the complete frozen score input and maps the stored row', async () => {
    const row = persistedRow();
    const prisma = {
      diagnosticScoreSnapshot: {
        create: vi.fn().mockResolvedValue(row),
        findFirst: vi.fn().mockResolvedValue(row)
      }
    };
    const repository = new PrismaDiagnosticScoreRepository(prisma as any);
    const input = {
      websiteUrl: row.websiteUrl,
      rawChecks: row.rawChecks as DiagnosticScoreSnapshot['rawChecks'],
      dimensionScores: row.dimensionScores as DiagnosticScoreSnapshot['dimensionScores'],
      normalizedWeights: row.normalizedWeights as DiagnosticScoreSnapshot['normalizedWeights'],
      policy: row.policy as DiagnosticScoreSnapshot['policy'],
      ruleVersion: row.ruleVersion,
      totalScore: row.totalScore
    };

    const created = await repository.create('brand-1', input);
    const found = await repository.findById('brand-1', 'diagnosis-1');

    expect(prisma.diagnosticScoreSnapshot.create).toHaveBeenCalledWith({ data: { brandId: 'brand-1', ...input } });
    expect(prisma.diagnosticScoreSnapshot.findFirst).toHaveBeenCalledWith({ where: { id: 'diagnosis-1', brandId: 'brand-1' } });
    expect(created).toEqual(found);
    expect(created.createdAt).toBe(createdAt.toISOString());
  });
});

function persistedRow() {
  const policy = {
    version: 'site-diagnostic-v1',
    statusScores: { pass: 100, warning: 50, fail: 0, unavailable: null },
    dimensions: {
      schema: { configuredWeight: 1, checkKeys: ['structured_data'] },
      meta: { configuredWeight: 0, checkKeys: [] },
      content: { configuredWeight: 0, checkKeys: [] },
      citation: { configuredWeight: 0, checkKeys: [] }
    }
  };
  return {
    id: 'diagnosis-1', brandId: 'brand-1', websiteUrl: 'https://example.com/', rawChecks: [],
    dimensionScores: [], normalizedWeights: { schema: 1, meta: 0, content: 0, citation: 0 },
    policy, ruleVersion: policy.version, totalScore: 100, createdAt
  };
}
