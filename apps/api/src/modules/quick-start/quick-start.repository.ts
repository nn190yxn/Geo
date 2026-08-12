import { randomUUID } from 'node:crypto';
import { Injectable } from '@nestjs/common';
import type { QuickStartSession, QuickStartStep } from '@geo-platform/shared-types';
import {
  QuickStartVersionConflictError,
  type QuickStartRepositoryPort,
  type QuickStartSessionUpdate
} from './quick-start.repository.port';

@Injectable()
export class QuickStartRepository implements QuickStartRepositoryPort {
  private readonly sessions = new Map<string, QuickStartSession>();

  async findByBrandId(brandId: string): Promise<QuickStartSession | null> {
    const session = this.sessions.get(brandId);
    return session ? structuredClone(session) : null;
  }

  async create(brandId: string, currentStep: QuickStartStep = 'website'): Promise<QuickStartSession> {
    const existing = this.sessions.get(brandId);
    if (existing) return structuredClone(existing);

    const timestamp = new Date().toISOString();
    const session: QuickStartSession = {
      id: randomUUID(),
      brandId,
      currentStep,
      status: 'in_progress',
      draft: {},
      version: 1,
      startedAt: timestamp,
      updatedAt: timestamp
    };
    this.sessions.set(brandId, session);
    return structuredClone(session);
  }

  async update(brandId: string, expectedVersion: number, input: QuickStartSessionUpdate): Promise<QuickStartSession | null> {
    const existing = this.sessions.get(brandId);
    if (!existing) return null;
    if (existing.version !== expectedVersion) throw new QuickStartVersionConflictError();

    const updated: QuickStartSession = {
      ...existing,
      ...input,
      draft: structuredClone(input.draft),
      version: existing.version + 1,
      updatedAt: new Date().toISOString()
    };
    if (!input.completedAt) delete updated.completedAt;
    this.sessions.set(brandId, updated);
    return structuredClone(updated);
  }
}
