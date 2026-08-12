import { Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { TaskAcceptanceRecordInput, TaskAcceptanceSnapshot } from '@geo-platform/shared-types';
import type { AcceptanceHistoryRepositoryPort } from './acceptance-history.repository.port';

@Injectable()
export class AcceptanceHistoryRepository implements AcceptanceHistoryRepositoryPort {
  private readonly snapshots: TaskAcceptanceSnapshot[] = [];

  async create(brandId: string, taskId: string, input: TaskAcceptanceRecordInput): Promise<TaskAcceptanceSnapshot> {
    const snapshot: TaskAcceptanceSnapshot = {
      id: `acceptance_${randomUUID()}`,
      brandId,
      taskId,
      ...structuredClone(input),
      createdAt: new Date().toISOString()
    };
    this.snapshots.push(snapshot);
    return structuredClone(snapshot);
  }

  async list(brandId: string, taskId: string): Promise<TaskAcceptanceSnapshot[]> {
    return this.snapshots
      .filter((snapshot) => snapshot.brandId === brandId && snapshot.taskId === taskId)
      .sort((left, right) => left.checkedAt.localeCompare(right.checkedAt) || left.createdAt.localeCompare(right.createdAt))
      .map((snapshot) => structuredClone(snapshot));
  }
}
