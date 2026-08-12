import { describe, expect, it, vi } from 'vitest';
import type { SearchDemandSnapshot } from '@geo-platform/shared-types';
import { PrismaDemandSnapshotRepository } from '../src/modules/automation/prisma-demand-snapshot.repository';

describe('PrismaDemandSnapshotRepository', () => {
  it('persists candidates and maps Prisma rows back to snapshots', async () => {
    const snapshot = createSnapshot();
    const row = toRow(snapshot);
    const prisma = {
      searchDemandSnapshot: {
        create: vi.fn().mockResolvedValue(row),
        findMany: vi.fn().mockResolvedValue([row]),
        findFirst: vi.fn().mockResolvedValue(row)
      },
      searchDemandCandidate: {
        findFirst: vi.fn().mockResolvedValue(row.candidates[0]),
        update: vi.fn().mockResolvedValue({ ...row.candidates[0], status: 'confirmed' })
      }
    };
    const repository = new PrismaDemandSnapshotRepository(prisma as never);

    await expect(repository.create(snapshot)).resolves.toEqual(snapshot);
    await expect(repository.list('brand-1')).resolves.toEqual([snapshot]);
    await expect(repository.get('brand-1', 'snapshot-1')).resolves.toEqual(snapshot);
    await expect(repository.confirmCandidate('brand-1', 'snapshot-1', 'candidate-1', 'pool-1', '2026-08-03T11:00:00.000Z')).resolves.toEqual(snapshot);
    expect(prisma.searchDemandSnapshot.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { brandId: 'brand-1' } }));
    expect(prisma.searchDemandCandidate.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'candidate-1' } }));
  });

  it('returns null when the candidate is outside the requested brand snapshot', async () => {
    const prisma = {
      searchDemandSnapshot: { create: vi.fn(), findMany: vi.fn(), findFirst: vi.fn() },
      searchDemandCandidate: { findFirst: vi.fn().mockResolvedValue(null), update: vi.fn() }
    };
    const repository = new PrismaDemandSnapshotRepository(prisma as never);

    await expect(repository.confirmCandidate('brand-1', 'snapshot-1', 'candidate-1', 'pool-1', new Date().toISOString())).resolves.toBeNull();
    expect(prisma.searchDemandCandidate.update).not.toHaveBeenCalled();
  });
});

function createSnapshot(): SearchDemandSnapshot {
  return {
    id: 'snapshot-1',
    brandId: 'brand-1',
    seedTerm: '儿童体能',
    source: 'manual',
    market: '贵阳',
    capturedAt: '2026-08-03T10:00:00.000Z',
    createdAt: '2026-08-03T10:00:00.000Z',
    candidateQuestions: [{
      id: 'candidate-1', snapshotId: 'snapshot-1', brandId: 'brand-1', question: '儿童体能训练怎么选',
      normalizedQuestion: '儿童体能训练怎么选', risingObservation: false, status: 'candidate', createdAt: '2026-08-03T10:00:00.000Z'
    }]
  };
}

function toRow(snapshot: SearchDemandSnapshot) {
  return {
    id: snapshot.id,
    brandId: snapshot.brandId,
    seedTerm: snapshot.seedTerm,
    source: snapshot.source,
    market: snapshot.market,
    capturedAt: new Date(snapshot.capturedAt),
    previousSnapshotId: null,
    createdAt: new Date(snapshot.createdAt),
    candidates: snapshot.candidateQuestions.map((candidate) => ({
      id: candidate.id,
      snapshotId: candidate.snapshotId,
      brandId: candidate.brandId,
      question: candidate.question,
      normalizedQuestion: candidate.normalizedQuestion,
      risingObservation: candidate.risingObservation,
      status: candidate.status,
      confirmedPoolItemId: null,
      confirmedAt: null,
      createdAt: new Date(candidate.createdAt)
    }))
  };
}
