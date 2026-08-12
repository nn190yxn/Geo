import { Injectable } from '@nestjs/common';
import type { SearchDemandCandidateStatus, SearchDemandSnapshot, SearchDemandSource } from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { DemandSnapshotRepositoryPort } from './demand-snapshot.repository.port';

type SnapshotRow = {
  id: string;
  brandId: string;
  seedTerm: string;
  source: string;
  market: string;
  capturedAt: Date;
  previousSnapshotId: string | null;
  createdAt: Date;
  candidates: CandidateRow[];
};

type CandidateRow = {
  id: string;
  snapshotId: string;
  brandId: string;
  question: string;
  normalizedQuestion: string;
  risingObservation: boolean;
  status: string;
  confirmedPoolItemId: string | null;
  confirmedAt: Date | null;
  createdAt: Date;
};

const snapshotInclude = { candidates: { orderBy: { createdAt: 'asc' as const } } };

@Injectable()
export class PrismaDemandSnapshotRepository implements DemandSnapshotRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(snapshot: SearchDemandSnapshot): Promise<SearchDemandSnapshot> {
    const row = await this.prisma.searchDemandSnapshot.create({
      data: {
        id: snapshot.id,
        brandId: snapshot.brandId,
        seedTerm: snapshot.seedTerm,
        source: snapshot.source,
        market: snapshot.market,
        capturedAt: new Date(snapshot.capturedAt),
        previousSnapshotId: snapshot.previousSnapshotId,
        createdAt: new Date(snapshot.createdAt),
        candidates: {
          create: snapshot.candidateQuestions.map((candidate) => ({
            id: candidate.id,
            brandId: candidate.brandId,
            question: candidate.question,
            normalizedQuestion: candidate.normalizedQuestion,
            risingObservation: candidate.risingObservation,
            status: candidate.status,
            confirmedPoolItemId: candidate.confirmedPoolItemId,
            confirmedAt: candidate.confirmedAt ? new Date(candidate.confirmedAt) : undefined,
            createdAt: new Date(candidate.createdAt)
          }))
        }
      },
      include: snapshotInclude
    });
    return toSnapshot(row);
  }

  async list(brandId: string): Promise<SearchDemandSnapshot[]> {
    const rows = await this.prisma.searchDemandSnapshot.findMany({
      where: { brandId },
      include: snapshotInclude,
      orderBy: [{ capturedAt: 'desc' }, { createdAt: 'desc' }]
    });
    return rows.map(toSnapshot);
  }

  async get(brandId: string, snapshotId: string): Promise<SearchDemandSnapshot | null> {
    const row = await this.prisma.searchDemandSnapshot.findFirst({ where: { id: snapshotId, brandId }, include: snapshotInclude });
    return row ? toSnapshot(row) : null;
  }

  async confirmCandidate(brandId: string, snapshotId: string, candidateId: string, poolItemId: string, confirmedAt: string): Promise<SearchDemandSnapshot | null> {
    const candidate = await this.prisma.searchDemandCandidate.findFirst({ where: { id: candidateId, snapshotId, brandId } });
    if (!candidate) return null;
    await this.prisma.searchDemandCandidate.update({
      where: { id: candidateId },
      data: { status: 'confirmed', confirmedPoolItemId: poolItemId, confirmedAt: new Date(confirmedAt) }
    });
    return this.get(brandId, snapshotId);
  }
}

function toSnapshot(row: SnapshotRow): SearchDemandSnapshot {
  return {
    id: row.id,
    brandId: row.brandId,
    seedTerm: row.seedTerm,
    source: row.source as SearchDemandSource,
    market: row.market,
    capturedAt: row.capturedAt.toISOString(),
    previousSnapshotId: row.previousSnapshotId ?? undefined,
    createdAt: row.createdAt.toISOString(),
    candidateQuestions: row.candidates.map((candidate) => ({
      id: candidate.id,
      snapshotId: candidate.snapshotId,
      brandId: candidate.brandId,
      question: candidate.question,
      normalizedQuestion: candidate.normalizedQuestion,
      risingObservation: candidate.risingObservation,
      status: candidate.status as SearchDemandCandidateStatus,
      confirmedPoolItemId: candidate.confirmedPoolItemId ?? undefined,
      confirmedAt: candidate.confirmedAt?.toISOString(),
      createdAt: candidate.createdAt.toISOString()
    }))
  };
}
