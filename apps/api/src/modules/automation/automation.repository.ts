import { Injectable } from '@nestjs/common';
import type {
  AutomationConfirmation,
  AutomationPackage,
  BrandId,
  PlatformRewriteVersion,
  TestQuestionPoolItem,
  TestQuestionSourceRecord
} from '@geo-platform/shared-types';
import type { AutomationRepositoryPort } from './automation.repository.port';

@Injectable()
export class AutomationRepository implements AutomationRepositoryPort {
  private readonly packages = new Map<string, AutomationPackage>();
  private readonly confirmations = new Map<string, AutomationConfirmation>();
  private readonly rewrites = new Map<string, PlatformRewriteVersion>();
  private readonly questionPoolItems = new Map<string, TestQuestionPoolItem>();
  private readonly questionSourceRecords = new Map<string, TestQuestionSourceRecord>();

  createPackage(input: AutomationPackage): AutomationPackage {
    this.packages.set(input.packageId, input);
    return input;
  }

  listPackages(brandId: BrandId): AutomationPackage[] {
    return Array.from(this.packages.values())
      .filter((item) => item.brandId === brandId)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }

  getPackage(brandId: BrandId, packageId: string): AutomationPackage | null {
    const item = this.packages.get(packageId);
    return item?.brandId === brandId ? item : null;
  }

  updatePackage(brandId: BrandId, packageId: string, input: AutomationPackage): AutomationPackage | null {
    if (!this.getPackage(brandId, packageId)) {
      return null;
    }

    this.packages.set(packageId, input);
    return input;
  }

  createConfirmation(input: AutomationConfirmation): AutomationConfirmation {
    this.confirmations.set(input.confirmationId, input);
    return input;
  }

  getConfirmation(brandId: BrandId, packageId: string, confirmationId: string): AutomationConfirmation | null {
    const item = this.confirmations.get(confirmationId);
    return item?.brandId === brandId && item.packageId === packageId ? item : null;
  }

  listConfirmations(brandId: BrandId, packageId: string): AutomationConfirmation[] {
    return Array.from(this.confirmations.values()).filter((item) => item.brandId === brandId && item.packageId === packageId);
  }

  updateConfirmation(brandId: BrandId, packageId: string, confirmationId: string, input: AutomationConfirmation): AutomationConfirmation | null {
    if (!this.getConfirmation(brandId, packageId, confirmationId)) {
      return null;
    }

    this.confirmations.set(confirmationId, input);
    return input;
  }

  createRewrite(input: PlatformRewriteVersion): PlatformRewriteVersion {
    this.rewrites.set(input.rewriteId, input);
    return input;
  }

  listRewrites(brandId: BrandId, contentVersionId?: string): PlatformRewriteVersion[] {
    return Array.from(this.rewrites.values()).filter((item) => item.brandId === brandId && (!contentVersionId || item.contentVersionId === contentVersionId));
  }

  createQuestionPoolItem(input: TestQuestionPoolItem): TestQuestionPoolItem {
    this.questionPoolItems.set(input.poolItemId, input);
    return input;
  }

  listQuestionPoolItems(brandId: BrandId): TestQuestionPoolItem[] {
    return Array.from(this.questionPoolItems.values())
      .filter((item) => item.brandId === brandId)
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }

  updateQuestionPoolItem(brandId: BrandId, poolItemId: string, input: TestQuestionPoolItem): TestQuestionPoolItem | null {
    const item = this.questionPoolItems.get(poolItemId);
    if (item?.brandId !== brandId) {
      return null;
    }

    this.questionPoolItems.set(poolItemId, input);
    return input;
  }

  createQuestionSourceRecord(input: TestQuestionSourceRecord): TestQuestionSourceRecord {
    this.questionSourceRecords.set(input.sourceRecordId, input);
    return input;
  }

  listQuestionSourceRecords(brandId: BrandId, poolItemId?: string): TestQuestionSourceRecord[] {
    return Array.from(this.questionSourceRecords.values())
      .filter((item) => item.brandId === brandId && (!poolItemId || item.poolItemId === poolItemId))
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }
}
