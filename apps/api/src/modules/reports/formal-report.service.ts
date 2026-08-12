import { Injectable } from '@nestjs/common';

export type FormalReportKind = 'diagnostic' | 'optimization' | 'execution';
export type FormalReport = { kind: FormalReportKind; title: string; snapshotId: string; methodologyVersion: string; manifestId: string; periodStart: string; periodEnd: string; content: string };

@Injectable()
export class FormalReportService {
  create(kind: FormalReportKind, shared: Omit<FormalReport, 'kind' | 'title' | 'content'>): FormalReport {
    const copy = structuredClone(shared);
    const content = kind === 'diagnostic' ? '现状与证据' : kind === 'optimization' ? '目标与机会' : '负责人、排期和验收标准';
    return { kind, title: `${kind}-report`, ...copy, content };
  }
}
