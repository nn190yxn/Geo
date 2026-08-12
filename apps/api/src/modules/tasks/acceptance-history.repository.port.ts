import type { TaskAcceptanceRecordInput, TaskAcceptanceSnapshot } from '@geo-platform/shared-types';

export const ACCEPTANCE_HISTORY_REPOSITORY = Symbol('ACCEPTANCE_HISTORY_REPOSITORY');

export interface AcceptanceHistoryRepositoryPort {
  create(brandId: string, taskId: string, input: TaskAcceptanceRecordInput): Promise<TaskAcceptanceSnapshot>;
  list(brandId: string, taskId: string): Promise<TaskAcceptanceSnapshot[]>;
}
