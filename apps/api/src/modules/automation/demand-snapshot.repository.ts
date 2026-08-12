import { Injectable } from '@nestjs/common';
import type { SearchDemandSnapshot } from '@geo-platform/shared-types';
import type { DemandSnapshotRepositoryPort } from './demand-snapshot.repository.port';

@Injectable()
export class DemandSnapshotRepository implements DemandSnapshotRepositoryPort {
  private readonly snapshots = new Map<string, SearchDemandSnapshot>();

  async create(snapshot: SearchDemandSnapshot): Promise<SearchDemandSnapshot> {
    this.snapshots.set(snapshot.id, structuredClone(snapshot));
    return structuredClone(snapshot);
  }

  async list(brandId: string): Promise<SearchDemandSnapshot[]> {
    return Array.from(this.snapshots.values())
      .filter((snapshot) => snapshot.brandId === brandId)
      .sort((left, right) => right.capturedAt.localeCompare(left.capturedAt) || right.createdAt.localeCompare(left.createdAt))
      .map((snapshot) => structuredClone(snapshot));
  }

  async get(brandId: string, snapshotId: string): Promise<SearchDemandSnapshot | null> {
    const snapshot = this.snapshots.get(snapshotId);
    return snapshot?.brandId === brandId ? structuredClone(snapshot) : null;
  }

  async confirmCandidate(brandId: string, snapshotId: string, candidateId: string, poolItemId: string, confirmedAt: string): Promise<SearchDemandSnapshot | null> {
    const snapshot = await this.get(brandId, snapshotId);
    const candidate = snapshot?.candidateQuestions.find((item) => item.id === candidateId);
    if (!snapshot || !candidate) return null;
    candidate.status = 'confirmed';
    candidate.confirmedPoolItemId = poolItemId;
    candidate.confirmedAt = confirmedAt;
    this.snapshots.set(snapshot.id, structuredClone(snapshot));
    return structuredClone(snapshot);
  }
}
