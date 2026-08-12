import { Injectable } from '@nestjs/common';
import type { DiagnosticScoreSnapshot } from '@geo-platform/shared-types';
import { randomUUID } from 'node:crypto';
import type {
  DiagnosticScoreRepositoryPort,
  DiagnosticScoreSnapshotInput
} from './diagnostic-score.repository.port';

@Injectable()
export class DiagnosticScoreRepository implements DiagnosticScoreRepositoryPort {
  private readonly snapshots = new Map<string, DiagnosticScoreSnapshot>();

  async create(brandId: string, input: DiagnosticScoreSnapshotInput): Promise<DiagnosticScoreSnapshot> {
    const snapshot: DiagnosticScoreSnapshot = {
      ...structuredClone(input),
      id: `diagnostic_score_${randomUUID()}`,
      brandId,
      createdAt: new Date().toISOString()
    };
    this.snapshots.set(snapshot.id, snapshot);
    return structuredClone(snapshot);
  }

  async findById(brandId: string, id: string): Promise<DiagnosticScoreSnapshot | null> {
    const snapshot = this.snapshots.get(id);
    return snapshot?.brandId === brandId ? structuredClone(snapshot) : null;
  }
}
