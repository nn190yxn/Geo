import { Injectable, Optional } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class ProviderSpendStageService {
  private readonly stages = new Map<string, { token: string; expiresAt: Date; incurredCost: number; completed: boolean }>();
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async acquire(taskKey: string, stepCode: string, attemptOrder: number, ttlMs = 60_000) {
    const key = `${taskKey}:${stepCode}:${attemptOrder}`;
    const now = new Date();
    const current = this.stages.get(key);
    if (current?.completed || (current && current.expiresAt > now)) return { acquired: false as const, stage: current };
    const stage = { token: randomUUID(), expiresAt: new Date(now.getTime() + ttlMs), incurredCost: current?.incurredCost ?? 0, completed: false };
    this.stages.set(key, stage);
    if (this.prisma) await this.prisma.providerSpendStage.upsert({ where: { taskKey_stepCode_attemptOrder: { taskKey, stepCode, attemptOrder } }, create: { taskKey, stepCode, attemptOrder, leaseToken: stage.token, leaseExpiresAt: stage.expiresAt }, update: { leaseToken: stage.token, leaseExpiresAt: stage.expiresAt } });
    return { acquired: true as const, stage };
  }

  async recordCost(taskKey: string, stepCode: string, attemptOrder: number, token: string, providerCode: string, cost: number) {
    const key = `${taskKey}:${stepCode}:${attemptOrder}`;
    const stage = this.stages.get(key);
    if (!stage || stage.token !== token) return null;
    stage.incurredCost += Math.max(0, cost);
    stage.completed = true;
    if (this.prisma) await this.prisma.providerSpendStage.update({ where: { taskKey_stepCode_attemptOrder: { taskKey, stepCode, attemptOrder } }, data: { providerCode, incurredCost: stage.incurredCost, completedAt: new Date() } });
    return stage;
  }
}
