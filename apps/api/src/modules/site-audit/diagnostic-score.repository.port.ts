import type { DiagnosticScoreSnapshot } from '@geo-platform/shared-types';

export const DIAGNOSTIC_SCORE_REPOSITORY = Symbol('DIAGNOSTIC_SCORE_REPOSITORY');

export type DiagnosticScoreSnapshotInput = Omit<DiagnosticScoreSnapshot, 'id' | 'brandId' | 'createdAt'>;

export interface DiagnosticScoreRepositoryPort {
  create(brandId: string, input: DiagnosticScoreSnapshotInput): Promise<DiagnosticScoreSnapshot>;
  findById(brandId: string, id: string): Promise<DiagnosticScoreSnapshot | null>;
}
