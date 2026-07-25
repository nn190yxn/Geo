import type {
  AutomationConfirmation,
  AutomationPackage,
  BrandId,
  PlatformRewriteVersion,
  TestQuestionPoolItem,
  TestQuestionSourceRecord
} from '@geo-platform/shared-types';

export const AUTOMATION_REPOSITORY = Symbol('AUTOMATION_REPOSITORY');

export interface AutomationRepositoryPort {
  createPackage(input: AutomationPackage): AutomationPackage;
  listPackages(brandId: BrandId): AutomationPackage[];
  getPackage(brandId: BrandId, packageId: string): AutomationPackage | null;
  updatePackage(brandId: BrandId, packageId: string, input: AutomationPackage): AutomationPackage | null;
  createConfirmation(input: AutomationConfirmation): AutomationConfirmation;
  getConfirmation(brandId: BrandId, packageId: string, confirmationId: string): AutomationConfirmation | null;
  listConfirmations(brandId: BrandId, packageId: string): AutomationConfirmation[];
  updateConfirmation(brandId: BrandId, packageId: string, confirmationId: string, input: AutomationConfirmation): AutomationConfirmation | null;
  createRewrite(input: PlatformRewriteVersion): PlatformRewriteVersion;
  listRewrites(brandId: BrandId, contentVersionId?: string): PlatformRewriteVersion[];
  createQuestionPoolItem(input: TestQuestionPoolItem): TestQuestionPoolItem;
  listQuestionPoolItems(brandId: BrandId): TestQuestionPoolItem[];
  updateQuestionPoolItem(brandId: BrandId, poolItemId: string, input: TestQuestionPoolItem): TestQuestionPoolItem | null;
  createQuestionSourceRecord(input: TestQuestionSourceRecord): TestQuestionSourceRecord;
  listQuestionSourceRecords(brandId: BrandId, poolItemId?: string): TestQuestionSourceRecord[];
}
