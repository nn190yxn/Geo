import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type {
  QuickStartDraft,
  QuickStartSession,
  QuickStartSessionStatus,
  QuickStartStep
} from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import {
  QuickStartVersionConflictError,
  type QuickStartRepositoryPort,
  type QuickStartSessionUpdate
} from './quick-start.repository.port';

type QuickStartRow = {
  id: string;
  brandId: string;
  currentStep: string;
  status: string;
  draft: Prisma.JsonValue;
  version: number;
  startedAt: Date;
  completedAt: Date | null;
  updatedAt: Date;
};

@Injectable()
export class PrismaQuickStartRepository implements QuickStartRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async findByBrandId(brandId: string): Promise<QuickStartSession | null> {
    const row = await this.prisma.quickStartSession.findUnique({ where: { brandId } });
    return row ? toQuickStartSession(row) : null;
  }

  async create(brandId: string, currentStep: QuickStartStep = 'website'): Promise<QuickStartSession> {
    const row = await this.prisma.quickStartSession.upsert({
      where: { brandId },
      create: { brandId, currentStep },
      update: {}
    });
    return toQuickStartSession(row);
  }

  async update(brandId: string, expectedVersion: number, input: QuickStartSessionUpdate): Promise<QuickStartSession | null> {
    const result = await this.prisma.quickStartSession.updateMany({
      where: { brandId, version: expectedVersion },
      data: {
        currentStep: input.currentStep,
        status: input.status,
        draft: input.draft as Prisma.InputJsonValue,
        completedAt: input.completedAt ? new Date(input.completedAt) : null,
        version: { increment: 1 }
      }
    });
    if (result.count === 0) {
      const existing = await this.prisma.quickStartSession.findUnique({ where: { brandId }, select: { id: true } });
      if (existing) throw new QuickStartVersionConflictError();
      return null;
    }

    return this.findByBrandId(brandId);
  }
}

function toQuickStartSession(row: QuickStartRow): QuickStartSession {
  return {
    id: row.id,
    brandId: row.brandId,
    currentStep: row.currentStep as QuickStartStep,
    status: row.status as QuickStartSessionStatus,
    draft: row.draft as QuickStartDraft,
    version: row.version,
    startedAt: row.startedAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    completedAt: row.completedAt?.toISOString()
  };
}
