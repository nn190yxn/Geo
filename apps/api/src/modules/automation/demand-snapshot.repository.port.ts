import type { SearchDemandSnapshot } from '@geo-platform/shared-types';

export const DEMAND_SNAPSHOT_REPOSITORY = Symbol('DEMAND_SNAPSHOT_REPOSITORY');

export interface DemandSnapshotRepositoryPort {
  create(snapshot: SearchDemandSnapshot): Promise<SearchDemandSnapshot>;
  list(brandId: string): Promise<SearchDemandSnapshot[]>;
  get(brandId: string, snapshotId: string): Promise<SearchDemandSnapshot | null>;
  confirmCandidate(brandId: string, snapshotId: string, candidateId: string, poolItemId: string, confirmedAt: string): Promise<SearchDemandSnapshot | null>;
}
