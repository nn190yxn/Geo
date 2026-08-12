import type {
  QuickStartDraft,
  QuickStartSession,
  QuickStartSessionStatus,
  QuickStartStep
} from '@geo-platform/shared-types';

export const QUICK_START_REPOSITORY = Symbol('QUICK_START_REPOSITORY');

export type QuickStartSessionUpdate = {
  currentStep: QuickStartStep;
  status: QuickStartSessionStatus;
  draft: QuickStartDraft;
  completedAt?: string;
};

export class QuickStartVersionConflictError extends Error {
  constructor() {
    super('Quick-start session version conflict');
  }
}

export interface QuickStartRepositoryPort {
  findByBrandId(brandId: string): Promise<QuickStartSession | null>;
  create(brandId: string, currentStep?: QuickStartStep): Promise<QuickStartSession>;
  update(brandId: string, expectedVersion: number, input: QuickStartSessionUpdate): Promise<QuickStartSession | null>;
}
