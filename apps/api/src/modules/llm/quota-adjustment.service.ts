import { BadRequestException, Injectable, Optional } from '@nestjs/common';
import type { QuotaScope } from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';

@Injectable()
export class QuotaAdjustmentService {
  constructor(@Optional() private readonly prisma?: PrismaService) {}

  async adjust(actorId: string, scopeType: QuotaScope, scopeId: string, limitAmount: number | null, reason: string) {
    if (!reason.trim()) throw new BadRequestException('quota_adjustment_reason_required');
    if (limitAmount !== null && (!Number.isFinite(limitAmount) || limitAmount < 0)) throw new BadRequestException('invalid_quota_limit');
    if (!this.prisma) throw new BadRequestException('quota_adjustment_persistence_required');
    return this.prisma.$transaction(async (tx) => {
      const current = await tx.quotaAccount.findUnique({ where: { scopeType_scopeId: { scopeType, scopeId } } });
      const beforeAmount = current?.limitAmount ?? 0;
      const afterAmount = limitAmount ?? 0;
      const account = await tx.quotaAccount.upsert({
        where: { scopeType_scopeId: { scopeType, scopeId } },
        create: { scopeType, scopeId, limitAmount, reservedAmount: 0, consumedAmount: 0 },
        update: { limitAmount }
      });
      const audit = await tx.quotaAdjustmentAudit.create({ data: { actorId, scopeType, scopeId, reason: reason.trim(), beforeAmount, afterAmount, deltaAmount: Number(afterAmount) - Number(beforeAmount) } });
      return { account, audit };
    });
  }

  async list(filters: { scopeType?: QuotaScope; scopeId?: string; actorId?: string; from?: Date; to?: Date }) {
    if (!this.prisma) return [];
    return this.prisma.quotaAdjustmentAudit.findMany({ where: { ...(filters.scopeType ? { scopeType: filters.scopeType } : {}), ...(filters.scopeId ? { scopeId: filters.scopeId } : {}), ...(filters.actorId ? { actorId: filters.actorId } : {}), ...(filters.from || filters.to ? { createdAt: { ...(filters.from ? { gte: filters.from } : {}), ...(filters.to ? { lte: filters.to } : {}) } } : {}) }, orderBy: { createdAt: 'desc' } });
  }
}
