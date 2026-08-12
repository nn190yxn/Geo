import { Injectable } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import type { TaskAcceptanceRecordInput, TaskAcceptanceSnapshot, TaskAcceptanceStatus } from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AcceptanceHistoryRepositoryPort } from './acceptance-history.repository.port';

type AcceptanceSnapshotRow = {
  id: string;
  brandId: string;
  taskId: string;
  checkerId: string;
  status: string;
  progressValue: number;
  targetValue: number;
  evidence: Prisma.JsonValue;
  checkedAt: Date;
  createdAt: Date;
};

@Injectable()
export class PrismaAcceptanceHistoryRepository implements AcceptanceHistoryRepositoryPort {
  constructor(private readonly prisma: PrismaService) {}

  async create(brandId: string, taskId: string, input: TaskAcceptanceRecordInput): Promise<TaskAcceptanceSnapshot> {
    const row = await this.prisma.taskAcceptanceSnapshot.create({
      data: {
        brandId,
        taskId,
        checkerId: input.checkerId,
        status: input.status,
        progressValue: input.progressValue,
        targetValue: input.targetValue,
        evidence: input.evidence as Prisma.InputJsonValue,
        checkedAt: new Date(input.checkedAt)
      }
    });
    return toSnapshot(row);
  }

  async list(brandId: string, taskId: string): Promise<TaskAcceptanceSnapshot[]> {
    const rows = await this.prisma.taskAcceptanceSnapshot.findMany({
      where: { brandId, taskId },
      orderBy: [{ checkedAt: 'asc' }, { createdAt: 'asc' }]
    });
    return rows.map(toSnapshot);
  }
}

function toSnapshot(row: AcceptanceSnapshotRow): TaskAcceptanceSnapshot {
  return {
    id: row.id,
    brandId: row.brandId,
    taskId: row.taskId,
    checkerId: row.checkerId,
    status: row.status as TaskAcceptanceStatus,
    progressValue: row.progressValue,
    targetValue: row.targetValue,
    evidence: row.evidence as Record<string, unknown>,
    checkedAt: row.checkedAt.toISOString(),
    createdAt: row.createdAt.toISOString()
  };
}
