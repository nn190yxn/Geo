import { Injectable } from '@nestjs/common';
import type { Prisma } from '@prisma/client';
import type {
  AutomationConfirmation,
  AutomationPackage,
  AutomationPackageSource,
  AutomationPackageStatus,
  AutomationStepCode,
  AutomationStepSummary,
  AutomationConfirmationStatus,
  AutomationConfirmationType,
  BrandId,
  PlatformRewriteStatus,
  PlatformRewriteVersion,
  TestQuestionPoolAngle,
  TestQuestionPoolItem,
  TestQuestionPoolSource,
  TestQuestionPoolStatus,
  TestQuestionSourceRecord
} from '@geo-platform/shared-types';
import { PrismaService } from '../../common/prisma/prisma.service';
import type { AutomationRepositoryPort } from './automation.repository.port';

type PrismaAutomationPackage = {
  id: string;
  brandId: string;
  status: string;
  source: string;
  goal: string;
  targetPlatforms: unknown;
  targetPublishingPlatforms: unknown;
  currentStep: string;
  stepSummaries: unknown;
  relatedTestPlanId: string | null;
  relatedGrowthPlanId: string | null;
  relatedContentTaskIds: unknown;
  relatedPublishingRecordIds: unknown;
  createdBy: string;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaAutomationConfirmation = {
  id: string;
  packageId: string;
  brandId: string;
  type: string;
  status: string;
  title: string;
  impact: string;
  recommendation: string;
  evidenceSummary: string;
  payload: unknown;
  decision: string | null;
  decidedBy: string | null;
  decidedAt: Date | null;
};

type PrismaPlatformRewriteVersion = {
  id: string;
  brandId: string;
  contentVersionId: string;
  targetPlatform: string;
  title: string;
  body: string;
  tags: unknown;
  rewriteNotes: unknown;
  complianceNotes: unknown;
  status: string;
  createdAt: Date;
};

type PrismaTestQuestionPoolItem = {
  id: string;
  brandId: string;
  candidateId: string | null;
  question: string;
  angle: string;
  purposes: unknown;
  targetPlatforms: unknown;
  priority: string;
  estimatedValue: string;
  source: string;
  status: string;
  lastTestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

type PrismaTestQuestionSourceRecord = {
  id: string;
  poolItemId: string;
  brandId: string;
  sourceType: string;
  sourceId: string | null;
  summary: string;
  createdAt: Date;
};

@Injectable()
export class PrismaAutomationRepository implements AutomationRepositoryPort {
  private readonly packages = new Map<string, AutomationPackage>();
  private readonly confirmations = new Map<string, AutomationConfirmation>();
  private readonly rewrites = new Map<string, PlatformRewriteVersion>();
  private readonly questionPoolItems = new Map<string, TestQuestionPoolItem>();
  private readonly questionSourceRecords = new Map<string, TestQuestionSourceRecord>();

  constructor(private readonly prisma: PrismaService) {}

  createPackage(input: AutomationPackage): AutomationPackage {
    this.packages.set(input.packageId, input);
    this.persist(this.prisma.automationPackage.upsert({
      where: { id: input.packageId },
      create: toPackageData(input),
      update: toPackageData(input)
    }));
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
    this.persist(this.prisma.automationPackage.update({ where: { id: input.packageId }, data: toPackageData(input) }));
    return input;
  }

  createConfirmation(input: AutomationConfirmation): AutomationConfirmation {
    this.confirmations.set(input.confirmationId, input);
    this.persist(this.prisma.automationConfirmation.upsert({
      where: { id: input.confirmationId },
      create: toConfirmationData(input),
      update: toConfirmationData(input)
    }));
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
    this.persist(this.prisma.automationConfirmation.update({ where: { id: input.confirmationId }, data: toConfirmationData(input) }));
    return input;
  }

  createRewrite(input: PlatformRewriteVersion): PlatformRewriteVersion {
    this.rewrites.set(input.rewriteId, input);
    this.persist(this.prisma.platformRewriteVersion.upsert({
      where: { id: input.rewriteId },
      create: toRewriteData(input),
      update: toRewriteData(input)
    }));
    return input;
  }

  listRewrites(brandId: BrandId, contentVersionId?: string): PlatformRewriteVersion[] {
    return Array.from(this.rewrites.values()).filter((item) => item.brandId === brandId && (!contentVersionId || item.contentVersionId === contentVersionId));
  }

  createQuestionPoolItem(input: TestQuestionPoolItem): TestQuestionPoolItem {
    this.questionPoolItems.set(input.poolItemId, input);
    this.persist(this.prisma.testQuestionPoolItem.upsert({
      where: { id: input.poolItemId },
      create: toQuestionPoolItemData(input),
      update: toQuestionPoolItemData(input)
    }));
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
    this.persist(this.prisma.testQuestionPoolItem.update({ where: { id: input.poolItemId }, data: toQuestionPoolItemData(input) }));
    return input;
  }

  createQuestionSourceRecord(input: TestQuestionSourceRecord): TestQuestionSourceRecord {
    this.questionSourceRecords.set(input.sourceRecordId, input);
    this.persist(this.prisma.testQuestionSourceRecord.upsert({
      where: { id: input.sourceRecordId },
      create: toQuestionSourceRecordData(input),
      update: toQuestionSourceRecordData(input)
    }));
    return input;
  }

  listQuestionSourceRecords(brandId: BrandId, poolItemId?: string): TestQuestionSourceRecord[] {
    return Array.from(this.questionSourceRecords.values())
      .filter((item) => item.brandId === brandId && (!poolItemId || item.poolItemId === poolItemId))
      .sort((first, second) => second.createdAt.localeCompare(first.createdAt));
  }

  private persist(operation: Promise<unknown>): void {
    void operation.catch(() => undefined);
  }
}

function toPackageData(input: AutomationPackage) {
  return {
    id: input.packageId,
    brandId: input.brandId,
    status: input.status,
    source: input.source,
    goal: input.goal,
    targetPlatforms: input.targetPlatforms as Prisma.InputJsonValue,
    targetPublishingPlatforms: input.targetPublishingPlatforms as Prisma.InputJsonValue,
    currentStep: input.currentStep,
    stepSummaries: input.stepSummaries as unknown as Prisma.InputJsonValue,
    relatedTestPlanId: input.relatedTestPlanId ?? null,
    relatedGrowthPlanId: input.relatedGrowthPlanId ?? null,
    relatedContentTaskIds: input.relatedContentTaskIds as Prisma.InputJsonValue,
    relatedPublishingRecordIds: input.relatedPublishingRecordIds as Prisma.InputJsonValue,
    createdBy: input.createdBy,
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt)
  };
}

function toConfirmationData(input: AutomationConfirmation) {
  return {
    id: input.confirmationId,
    packageId: input.packageId,
    brandId: input.brandId,
    type: input.type,
    status: input.status,
    title: input.title,
    impact: input.impact,
    recommendation: input.recommendation,
    evidenceSummary: input.evidenceSummary,
    payload: input.payload as Prisma.InputJsonValue,
    decision: input.decision ?? null,
    decidedBy: input.decidedBy ?? null,
    decidedAt: input.decidedAt ? new Date(input.decidedAt) : null
  };
}

function toRewriteData(input: PlatformRewriteVersion) {
  return {
    id: input.rewriteId,
    brandId: input.brandId,
    contentVersionId: input.contentVersionId,
    targetPlatform: input.targetPlatform,
    title: input.title,
    body: input.body,
    tags: input.tags as Prisma.InputJsonValue,
    rewriteNotes: input.rewriteNotes as Prisma.InputJsonValue,
    complianceNotes: input.complianceNotes as Prisma.InputJsonValue,
    status: input.status,
    createdAt: new Date(input.createdAt)
  };
}

function toQuestionPoolItemData(input: TestQuestionPoolItem) {
  return {
    id: input.poolItemId,
    brandId: input.brandId,
    candidateId: input.candidateId ?? null,
    question: input.question,
    angle: input.angle,
    purposes: input.purposes as Prisma.InputJsonValue,
    targetPlatforms: input.targetPlatforms as Prisma.InputJsonValue,
    priority: input.priority,
    estimatedValue: input.estimatedValue,
    source: input.source,
    status: input.status,
    lastTestedAt: input.lastTestedAt ? new Date(input.lastTestedAt) : null,
    createdAt: new Date(input.createdAt),
    updatedAt: new Date(input.updatedAt)
  };
}

function toQuestionSourceRecordData(input: TestQuestionSourceRecord) {
  return {
    id: input.sourceRecordId,
    poolItemId: input.poolItemId,
    brandId: input.brandId,
    sourceType: input.sourceType,
    sourceId: input.sourceId ?? null,
    summary: input.summary,
    createdAt: new Date(input.createdAt)
  };
}

export function toAutomationPackage(item: PrismaAutomationPackage): AutomationPackage {
  return {
    packageId: item.id,
    brandId: item.brandId,
    status: item.status as AutomationPackageStatus,
    source: item.source as AutomationPackageSource,
    goal: item.goal,
    targetPlatforms: toStringArray(item.targetPlatforms),
    targetPublishingPlatforms: toStringArray(item.targetPublishingPlatforms),
    currentStep: item.currentStep as AutomationStepCode,
    stepSummaries: toStepSummaries(item.stepSummaries),
    relatedTestPlanId: item.relatedTestPlanId ?? undefined,
    relatedGrowthPlanId: item.relatedGrowthPlanId ?? undefined,
    relatedContentTaskIds: toStringArray(item.relatedContentTaskIds),
    relatedPublishingRecordIds: toStringArray(item.relatedPublishingRecordIds),
    createdBy: item.createdBy,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function toAutomationConfirmation(item: PrismaAutomationConfirmation): AutomationConfirmation {
  return {
    confirmationId: item.id,
    packageId: item.packageId,
    brandId: item.brandId,
    type: item.type as AutomationConfirmationType,
    status: item.status as AutomationConfirmationStatus,
    title: item.title,
    impact: item.impact,
    recommendation: item.recommendation,
    evidenceSummary: item.evidenceSummary,
    payload: toRecord(item.payload),
    decision: item.decision ?? undefined,
    decidedBy: item.decidedBy ?? undefined,
    decidedAt: item.decidedAt?.toISOString()
  };
}

export function toPlatformRewriteVersion(item: PrismaPlatformRewriteVersion): PlatformRewriteVersion {
  return {
    rewriteId: item.id,
    brandId: item.brandId,
    contentVersionId: item.contentVersionId,
    targetPlatform: item.targetPlatform,
    title: item.title,
    body: item.body,
    tags: toStringArray(item.tags),
    rewriteNotes: toStringArray(item.rewriteNotes),
    complianceNotes: toStringArray(item.complianceNotes),
    status: item.status as PlatformRewriteStatus,
    createdAt: item.createdAt.toISOString()
  };
}

export function toTestQuestionPoolItem(item: PrismaTestQuestionPoolItem): TestQuestionPoolItem {
  return {
    poolItemId: item.id,
    brandId: item.brandId,
    question: item.question,
    angle: item.angle as TestQuestionPoolAngle,
    purposes: toStringArray(item.purposes),
    targetPlatforms: toStringArray(item.targetPlatforms),
    priority: item.priority as TestQuestionPoolItem['priority'],
    estimatedValue: item.estimatedValue,
    source: item.source as TestQuestionPoolSource,
    status: item.status as TestQuestionPoolStatus,
    candidateId: item.candidateId ?? undefined,
    lastTestedAt: item.lastTestedAt?.toISOString(),
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString()
  };
}

export function toTestQuestionSourceRecord(item: PrismaTestQuestionSourceRecord): TestQuestionSourceRecord {
  return {
    sourceRecordId: item.id,
    poolItemId: item.poolItemId,
    brandId: item.brandId,
    sourceType: item.sourceType as TestQuestionSourceRecord['sourceType'],
    sourceId: item.sourceId ?? undefined,
    summary: item.summary,
    createdAt: item.createdAt.toISOString()
  };
}

function toStepSummaries(value: unknown): AutomationStepSummary[] {
  return Array.isArray(value) ? value as AutomationStepSummary[] : [];
}

function toStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string') : [];
}

function toRecord(value: unknown): Record<string, unknown> {
  return value && typeof value === 'object' && !Array.isArray(value) ? value as Record<string, unknown> : {};
}
