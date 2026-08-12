import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { DiagnosticScoreSnapshot } from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type {
  DiagnosticScoreRepositoryPort,
  DiagnosticScoreSnapshotInput
} from './diagnostic-score.repository.port';

type DiagnosticScoreRow = {
  id: string;
  brandId: string;
  websiteUrl: string;
  rawChecks: Prisma.JsonValue;
  dimensionScores: Prisma.JsonValue;
  normalizedWeights: Prisma.JsonValue;
  policy: Prisma.JsonValue;
  ruleVersion: string;
  totalScore: number;
  createdAt: Date;
};

@Injectable()
export class PrismaDiagnosticScoreRepository implements DiagnosticScoreRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(brandId: string, input: DiagnosticScoreSnapshotInput): Promise<DiagnosticScoreSnapshot> {
    const row = await this.prisma.diagnosticScoreSnapshot.create({
      data: {
        brandId,
        websiteUrl: input.websiteUrl,
        rawChecks: input.rawChecks as unknown as Prisma.InputJsonValue,
        dimensionScores: input.dimensionScores as unknown as Prisma.InputJsonValue,
        normalizedWeights: input.normalizedWeights as unknown as Prisma.InputJsonValue,
        policy: input.policy as unknown as Prisma.InputJsonValue,
        ruleVersion: input.ruleVersion,
        totalScore: input.totalScore
      }
    });
    return toSnapshot(row);
  }

  async findById(brandId: string, id: string): Promise<DiagnosticScoreSnapshot | null> {
    const row = await this.prisma.diagnosticScoreSnapshot.findFirst({ where: { id, brandId } });
    return row ? toSnapshot(row) : null;
  }
}

function toSnapshot(row: DiagnosticScoreRow): DiagnosticScoreSnapshot {
  return {
    id: row.id,
    brandId: row.brandId,
    websiteUrl: row.websiteUrl,
    rawChecks: row.rawChecks as DiagnosticScoreSnapshot['rawChecks'],
    dimensionScores: row.dimensionScores as DiagnosticScoreSnapshot['dimensionScores'],
    normalizedWeights: row.normalizedWeights as DiagnosticScoreSnapshot['normalizedWeights'],
    policy: row.policy as DiagnosticScoreSnapshot['policy'],
    ruleVersion: row.ruleVersion,
    totalScore: row.totalScore,
    createdAt: row.createdAt.toISOString()
  };
}
