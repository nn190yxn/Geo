import { Injectable, Optional } from '@nestjs/common';
import type { BrandId, LLMTaskType, QuotaRejectionReason, QuotaReservation, QuotaReservationResult, QuotaScope } from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import { PermissionsService } from '../permissions/permissions.service';

type Account = { limit: number | null; reserved: number; consumed: number; enabled: boolean; frozen: boolean };

@Injectable()
export class QuotaService {
  private readonly accounts = new Map<string, Account>();
  private readonly reservations = new Map<string, QuotaReservation>();

  constructor(private readonly permissionsService: PermissionsService, @Optional() private readonly prisma?: PrismaService) {}

  async reserve(userId: string, brandId: BrandId, taskType: LLMTaskType, taskKey: string, requestedCost = 1): Promise<QuotaReservationResult> {
    const organizationId = await this.permissionsService.getAccessibleBrandOrganizationId(userId, brandId);
    if (!organizationId || requestedCost <= 0 || !Number.isFinite(requestedCost)) return { rejection: rejected('global_budget_exhausted', requestedCost) };
    const existing = this.reservations.get(taskKey);
    if (existing) return existing.status === 'rejected' ? { rejection: { reason: existing.rejectionReason!, requestedCost, recoveryAction: '请调整额度后重试' } } : { reservation: existing };

    const scopes: Array<[QuotaScope, string]> = [['user', userId], ['organization', organizationId], ['global', 'global']];
    for (const [scopeType, scopeId] of scopes) {
      const account = await this.getAccount(scopeType, scopeId);
      if (scopeType === 'user' && account?.frozen) return { rejection: rejected('user_frozen', requestedCost) };
      if (account && account.enabled && account.limit !== null && account.consumed + account.reserved + requestedCost > account.limit) {
        const reason = `${scopeType}_quota_exhausted` as QuotaRejectionReason;
        const reservation = makeReservation(taskKey, userId, organizationId, brandId, taskType, requestedCost, 'rejected', reason);
        this.reservations.set(taskKey, reservation);
        if (this.prisma) await this.prisma.usageReservation.create({ data: { taskKey, userId, organizationId, brandId, taskType, requestedCost, status: 'rejected', rejectionReason: reason } });
        return { rejection: { reason, requestedCost, remainingCost: Math.max(0, account.limit - account.consumed - account.reserved), recoveryAction: '请调整额度或降低任务范围后重试' } };
      }
    }
    for (const [scopeType, scopeId] of scopes) await this.changeAccount(scopeType, scopeId, requestedCost, 0);
    const reservation = makeReservation(taskKey, userId, organizationId, brandId, taskType, requestedCost, 'reserved');
    this.reservations.set(taskKey, reservation);
    if (this.prisma) await this.prisma.usageReservation.create({ data: { taskKey, userId, organizationId, brandId, taskType, requestedCost, status: 'reserved' } });
    return { reservation };
  }

  async settle(reservationId: string, actualCost: number, providerCode?: string, attemptOrder?: number): Promise<QuotaReservation | null> {
    const reservation = [...this.reservations.values()].find((item) => item.id === reservationId);
    if (!reservation || reservation.status === 'settled') return reservation ?? null;
    if (reservation.status !== 'reserved') return reservation;
    const cost = Math.max(0, Number.isFinite(actualCost) ? actualCost : 0);
    const difference = reservation.requestedCost - cost;
    for (const [scopeType, scopeId] of [['user', reservation.userId], ['organization', reservation.organizationId], ['global', 'global'] ] as Array<[QuotaScope, string]>) await this.changeAccount(scopeType, scopeId, difference, cost);
    const settled = { ...reservation, settledCost: cost, status: 'settled' as const };
    this.reservations.set(reservation.taskKey, settled);
    if (this.prisma) {
      await this.prisma.usageReservation.update({ where: { taskKey: reservation.taskKey }, data: { settledCost: cost, status: 'settled' } });
      await this.prisma.usageLedgerEntry.create({ data: { reservationId, eventType: 'settled', amount: cost, providerCode, attemptOrder } });
    }
    return settled;
  }

  async release(reservationId: string): Promise<QuotaReservation | null> {
    const reservation = [...this.reservations.values()].find((item) => item.id === reservationId);
    if (!reservation || reservation.status !== 'reserved') return reservation ?? null;
    for (const [scopeType, scopeId] of [['user', reservation.userId], ['organization', reservation.organizationId], ['global', 'global'] ] as Array<[QuotaScope, string]>) await this.changeAccount(scopeType, scopeId, -reservation.requestedCost, 0);
    const released = { ...reservation, status: 'released' as const };
    this.reservations.set(reservation.taskKey, released);
    if (this.prisma) {
      await this.prisma.usageReservation.update({ where: { taskKey: reservation.taskKey }, data: { status: 'released' } });
      await this.prisma.usageLedgerEntry.create({ data: { reservationId, eventType: 'released', amount: 0 } });
    }
    return released;
  }

  async releaseByTaskKey(taskKey: string): Promise<QuotaReservation | null> {
    const reservation = this.reservations.get(taskKey);
    return reservation ? this.release(reservation.id) : null;
  }

  setQuota(scopeType: QuotaScope, scopeId: string, limit: number | null): void {
    this.accounts.set(key(scopeType, scopeId), { limit, reserved: 0, consumed: 0, enabled: true, frozen: false });
  }

  async summary(userId: string, brandId: BrandId): Promise<Array<{ scope: QuotaScope; limit?: number; reserved: number; consumed: number }> | null> {
    const organizationId = await this.permissionsService.getAccessibleBrandOrganizationId(userId, brandId);
    if (!organizationId) return null;
    const scopes: Array<[QuotaScope, string]> = [['user', userId], ['organization', organizationId], ['global', 'global']];
    return Promise.all(scopes.map(async ([scope, scopeId]) => {
      const account = await this.getAccount(scope, scopeId);
      return { scope, limit: account?.limit ?? undefined, reserved: account?.reserved ?? 0, consumed: account?.consumed ?? 0 };
    }));
  }

  private async getAccount(scopeType: QuotaScope, scopeId: string): Promise<Account | undefined> {
    const memory = this.accounts.get(key(scopeType, scopeId));
    if (memory || !this.prisma) return memory;
    const row = await this.prisma.quotaAccount.findUnique({ where: { scopeType_scopeId: { scopeType, scopeId } } });
    if (!row) return undefined;
    const account = { limit: row.limitAmount === null ? null : Number(row.limitAmount), reserved: Number(row.reservedAmount), consumed: Number(row.consumedAmount), enabled: row.enabled, frozen: row.frozen };
    this.accounts.set(key(scopeType, scopeId), account);
    return account;
  }

  private async changeAccount(scopeType: QuotaScope, scopeId: string, reservedDelta: number, consumedDelta: number): Promise<void> {
    const account = (await this.getAccount(scopeType, scopeId)) ?? { limit: null, reserved: 0, consumed: 0, enabled: true, frozen: false };
    account.reserved = Math.max(0, account.reserved + reservedDelta);
    account.consumed += consumedDelta;
    this.accounts.set(key(scopeType, scopeId), account);
    if (this.prisma) await this.prisma.quotaAccount.upsert({ where: { scopeType_scopeId: { scopeType, scopeId } }, create: { scopeType, scopeId, limitAmount: account.limit, reservedAmount: account.reserved, consumedAmount: account.consumed }, update: { reservedAmount: account.reserved, consumedAmount: account.consumed } });
  }
}

function key(scopeType: QuotaScope, scopeId: string): string { return `${scopeType}:${scopeId}`; }
function makeReservation(taskKey: string, userId: string, organizationId: string, brandId: BrandId, taskType: LLMTaskType, requestedCost: number, status: QuotaReservation['status'], rejectionReason?: QuotaRejectionReason): QuotaReservation {
  return { id: `reservation:${taskKey}`, taskKey, userId, organizationId, brandId, taskType, requestedCost, settledCost: 0, status, rejectionReason };
}
function rejected(reason: QuotaRejectionReason, requestedCost: number): QuotaReservationResult['rejection'] { return { reason, requestedCost, recoveryAction: '请调整额度或降低任务范围后重试' }; }
