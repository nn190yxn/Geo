import { ForbiddenException, Injectable } from '@nestjs/common';

export type ComparableReport = { brandId: string; periodStart: string; periodEnd: string; methodologyVersion: string; baselineVersion: string; snapshot: Record<string, unknown> };

@Injectable()
export class ClientPortalService {
  private readonly grants = new Map<string, Date>();
  grant(brandId: string, clientId: string, expiresAt: Date) { this.grants.set(`${brandId}:${clientId}`, expiresAt); }
  assertReadAccess(brandId: string, clientId: string) { const expiresAt = this.grants.get(`${brandId}:${clientId}`); if (!expiresAt || expiresAt <= new Date()) throw new ForbiddenException('client_read_access_denied'); }
  compare(reports: ComparableReport[]) {
    if (reports.length < 2) return reports;
    const reference = reports[0];
    if (reports.some((report) => report.periodStart !== reference.periodStart || report.periodEnd !== reference.periodEnd || report.methodologyVersion !== reference.methodologyVersion || report.baselineVersion !== reference.baselineVersion)) throw new ForbiddenException('cross_brand_comparison_not_comparable');
    return reports;
  }
}
