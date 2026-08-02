import { describe, expect, it, vi } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';
import { PrismaPermissionsRepository } from '../src/modules/permissions/prisma-permissions.repository';

const now = new Date('2026-07-03T00:00:00.000Z');

const baseBrand = {
  id: 'brand_prisma',
  name: 'Prisma Brand',
  status: 'active',
  description: null,
  aliases: ['PB'],
  industry: 'Education',
  website: 'https://example.com',
  targetCities: ['Shanghai'],
  businessScope: 'Brand growth',
  targetAudience: 'Operators',
  deletedAt: null,
  createdAt: now,
  updatedAt: now
};

function pickMediaMapping(record: any) {
  return record && {
    title: record.title,
    assetType: record.assetType,
    applicablePlatforms: record.applicablePlatforms,
    contentUsage: record.contentUsage,
    source: record.source,
    reviewStatus: record.reviewStatus
  };
}

function pickFindingMapping(record: any) {
  return record && {
    type: record.type,
    title: record.title,
    userIntent: record.userIntent,
    evidence: record.evidence,
    severity: record.severity,
    recommendedActions: record.recommendedActions
  };
}

function createPrismaMock() {
  const deniedLogs: Array<{
    id: string;
    userId: string;
    brandId: string;
    reason: string;
    requestedAt: Date;
    createdAt: Date;
  }> = [];
  const profiles: Record<string, any> = {};
  const knowledgeSources: any[] = [];
  const optimizationUnits: any[] = [
    {
      id: 'unit_prisma',
      brandId: 'brand_prisma',
      name: 'Core Unit',
      type: 'brand',
      targetKeywords: ['geo'],
      priority: 'high',
      enabled: true,
      createdAt: now,
      updatedAt: now
    }
  ];
  const userIntents: any[] = [];
  const promptTemplates: any[] = [];
  const brandPrompts: any[] = [];
  const platformConfigs: any[] = [];
  const monitoringRuns: any[] = [];
  const asyncJobs: any[] = [];
  const aiResponses: any[] = [];
  const analysisResults: any[] = [];
  const analysisFindings: any[] = [];
  const contentAssets: any[] = [];
  const brandMediaAssets: any[] = [];
  const citationSources: any[] = [];
  const contentStrategies: any[] = [];
  const contentGenerationTasks: any[] = [];
  const contentVersions: any[] = [];
  const contentExportRecords: any[] = [];
  const publishingAccounts: any[] = [];
  const publishingRecords: any[] = [];
  const mediaPlatformRules: any[] = [];
  const visibilitySprints: any[] = [];
  const brandStandardAnswers: any[] = [];
  const competitors: any[] = [];
  const competitorDiscoveryRuns: any[] = [];
  const competitorCandidates: any[] = [];
  const optimizationTasks: any[] = [];
  const reports: any[] = [];
  const advisorRecords: any[] = [];
  const metricSnapshots: any[] = [
    {
      id: 'metric_1',
      brandId: 'brand_prisma',
      period: '2026-07',
      platformCode: null,
      optimizationUnitId: null,
      intentId: null,
      category: null,
      mentionScore: 80,
      rankingScore: 70,
      accuracyScore: 90,
      sentimentScore: 75,
      citationScore: 60,
      competitorScore: 65,
      knowledgeCompletenessScore: 85,
      totalScore: 78,
      sampleCount: 5,
      insufficientSample: false,
      calculatedAt: now
    }
  ];

  return {
    user: {
      findUnique: vi.fn().mockResolvedValue({
        id: 'user_demo',
        name: 'Demo User',
        email: 'demo@example.com',
        status: 'active',
        createdAt: now,
        updatedAt: now
      })
    },
    organizationMember: {
      findFirst: vi.fn().mockResolvedValue({
        id: 'member_1',
        organizationId: 'org_prisma',
        userId: 'user_demo',
        roleId: 'role_owner',
        status: 'active',
        createdAt: now,
        updatedAt: now,
        organization: { id: 'org_prisma', name: 'Prisma Org', status: 'active', createdAt: now, updatedAt: now },
        role: { id: 'role_owner', code: 'owner', name: 'Owner', scope: 'organization', permissions: ['*'], createdAt: now, updatedAt: now }
      }),
      findMany: vi.fn().mockResolvedValue([
        {
          id: 'member_1',
          organizationId: 'org_prisma',
          userId: 'user_demo',
          roleId: 'role_owner',
          status: 'active',
          createdAt: now,
          updatedAt: now,
          organization: { id: 'org_prisma', name: 'Prisma Org', status: 'active', createdAt: now, updatedAt: now },
          role: { id: 'role_owner', code: 'owner', name: 'Owner', scope: 'organization', permissions: ['*'], createdAt: now, updatedAt: now }
        }
      ])
    },
    userBrandPermission: {
      findMany: vi.fn().mockResolvedValue([{ id: 'permission_1', userId: 'user_demo', brandId: 'brand_prisma', role: 'owner', brand: baseBrand }]),
      findFirst: vi.fn().mockResolvedValue({ id: 'permission_1', userId: 'user_demo', brandId: 'brand_prisma', role: 'owner', brand: baseBrand }),
      create: vi.fn()
    },
    brand: {
      create: vi.fn().mockResolvedValue(baseBrand),
      update: vi.fn().mockResolvedValue({ ...baseBrand, name: 'Updated Brand', updatedAt: now })
    },
    brandProfile: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(profiles[where.brandId] ? 1 : 0)),
      findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve(profiles[where.brandId] ?? null)),
      upsert: vi.fn().mockImplementation(({ where, create, update }) => {
        profiles[where.brandId] = { ...(profiles[where.brandId] ?? create), ...update, brandId: where.brandId, updatedAt: now };
        return Promise.resolve(profiles[where.brandId]);
      })
    },
    knowledgeSource: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(knowledgeSources.filter((source) => source.brandId === where.brandId))),
      create: vi.fn().mockImplementation(({ data }) => {
        const source = { id: `source_${knowledgeSources.length + 1}`, ...data, errorMessage: null, createdAt: now, updatedAt: now };
        knowledgeSources.unshift(source);
        return Promise.resolve(source);
      })
    },
    brandMediaAsset: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(brandMediaAssets.filter((asset) => asset.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(brandMediaAssets.find((asset) => asset.id === where.id && asset.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const asset = { id: `media_${brandMediaAssets.length + 1}`, ...data, relatedContentTaskId: data.relatedContentTaskId ?? null, sourceUrl: data.sourceUrl ?? null, fileRef: data.fileRef ?? null, createdAt: now, updatedAt: now };
        brandMediaAssets.unshift(asset);
        return Promise.resolve(asset);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = brandMediaAssets.findIndex((asset) => asset.id === where.id);
        brandMediaAssets[index] = { ...brandMediaAssets[index], ...data, updatedAt: now };
        return Promise.resolve(brandMediaAssets[index]);
      })
    },
    optimizationUnit: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(optimizationUnits.filter((unit) => unit.brandId === where.brandId).length)),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(optimizationUnits.filter((unit) => unit.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(optimizationUnits.find((unit) => unit.id === where.id && unit.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const unit = { id: `unit_${optimizationUnits.length + 1}`, ...data, createdAt: now, updatedAt: now };
        optimizationUnits.unshift(unit);
        return Promise.resolve(unit);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = optimizationUnits.findIndex((unit) => unit.id === where.id);
        optimizationUnits[index] = { ...optimizationUnits[index], ...data, updatedAt: now };
        return Promise.resolve(optimizationUnits[index]);
      })
    },
    userIntent: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(userIntents.filter((intent) => intent.brandId === where.brandId || intent.optimizationUnitId === where.optimizationUnitId).length)),
      findMany: vi.fn().mockImplementation(({ where }) => {
        const ids = where.id?.in ? new Set(where.id.in) : null;
        return Promise.resolve(userIntents.filter((intent) => intent.brandId === where.brandId && (where.enabled === undefined || intent.enabled === where.enabled) && (!ids || ids.has(intent.id))));
      }),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(userIntents.find((intent) => intent.id === where.id && intent.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const intent = { id: `intent_${userIntents.length + 1}`, ...data, createdAt: now, updatedAt: now };
        userIntents.unshift(intent);
        return Promise.resolve(intent);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = userIntents.findIndex((intent) => intent.id === where.id);
        userIntents[index] = { ...userIntents[index], ...data, updatedAt: now };
        return Promise.resolve(userIntents[index]);
      })
    },
    promptTemplate: {
      findMany: vi.fn().mockResolvedValue(promptTemplates),
      findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve(promptTemplates.find((template) => template.id === where.id) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const template = { id: `template_${promptTemplates.length + 1}`, ...data, createdAt: now, updatedAt: now };
        promptTemplates.unshift(template);
        return Promise.resolve(template);
      })
    },
    brandPrompt: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(brandPrompts.filter((prompt) => prompt.brandId === where.brandId || prompt.optimizationUnitId === where.optimizationUnitId).length)),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(brandPrompts.filter((prompt) => prompt.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(brandPrompts.find((prompt) => prompt.id === where.id && prompt.brandId === where.brandId) ?? null)),
      findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve(brandPrompts.find((prompt) => prompt.id === where.id) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const prompt = { id: `prompt_${brandPrompts.length + 1}`, ...data, createdAt: now, updatedAt: now };
        brandPrompts.unshift(prompt);
        return Promise.resolve(prompt);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = brandPrompts.findIndex((prompt) => prompt.id === where.id);
        brandPrompts[index] = { ...brandPrompts[index], ...data, updatedAt: now };
        return Promise.resolve(brandPrompts[index]);
      })
    },
    competitor: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(competitors.filter((competitor) => competitor.brandId === where.brandId).length || 5)),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(competitors.filter((competitor) => competitor.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(competitors.find((competitor) => {
        if (competitor.brandId !== where.brandId) return false;
        if (where.id && competitor.id !== where.id) return false;
        if (where.OR) {
          return where.OR.some((condition: any) => (
            (condition.sourceCandidateId && competitor.sourceCandidateId === condition.sourceCandidateId) ||
            (condition.name && competitor.name === condition.name)
          ));
        }
        return true;
      }) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const competitor = { id: `competitor_${competitors.length + 1}`, ...data, createdAt: now, updatedAt: now };
        competitors.unshift(competitor);
        return Promise.resolve(competitor);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = competitors.findIndex((competitor) => competitor.id === where.id);
        competitors[index] = { ...competitors[index], ...data, updatedAt: now };
        return Promise.resolve(competitors[index]);
      })
    },
    competitorDiscoveryRun: {
      create: vi.fn().mockImplementation(({ data }) => {
        const run = { id: `discovery_run_${competitorDiscoveryRuns.length + 1}`, ...data, createdAt: now, completedAt: data.completedAt ?? null };
        competitorDiscoveryRuns.unshift(run);
        return Promise.resolve(run);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = competitorDiscoveryRuns.findIndex((run) => run.id === where.id);
        competitorDiscoveryRuns[index] = { ...competitorDiscoveryRuns[index], ...data };
        return Promise.resolve(competitorDiscoveryRuns[index]);
      }),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(competitorDiscoveryRuns.find((run) => run.id === where.id && run.brandId === where.brandId) ?? null))
    },
    competitorCandidate: {
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(competitorCandidates.find((candidate) => {
        return candidate.brandId === where.brandId &&
          (!where.runId || candidate.runId === where.runId) &&
          (!where.id || candidate.id === where.id) &&
          (!where.name || candidate.name === where.name) &&
          (!where.address || candidate.address === where.address);
      }) ?? null)),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(competitorCandidates.filter((candidate) => candidate.brandId === where.brandId && candidate.runId === where.runId))),
      create: vi.fn().mockImplementation(({ data }) => {
        const candidate = { ...data, createdAt: now, updatedAt: now };
        competitorCandidates.unshift(candidate);
        return Promise.resolve(candidate);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = competitorCandidates.findIndex((candidate) => candidate.id === where.id);
        competitorCandidates[index] = { ...competitorCandidates[index], ...data, updatedAt: now };
        return Promise.resolve(competitorCandidates[index]);
      })
    },
    contentAsset: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(contentAssets.filter((asset) => asset.brandId === where.brandId).length)),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(contentAssets.filter((asset) => asset.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(contentAssets.find((asset) => asset.id === where.id && asset.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const asset = { id: `asset_${contentAssets.length + 1}`, ...data, reuseOfAssetId: data.reuseOfAssetId ?? null, brandAdaptation: data.brandAdaptation ?? null, publishedAt: data.publishedAt ?? null, createdAt: now, updatedAt: now };
        contentAssets.unshift(asset);
        return Promise.resolve(asset);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = contentAssets.findIndex((asset) => asset.id === where.id);
        contentAssets[index] = { ...contentAssets[index], ...data, updatedAt: now };
        return Promise.resolve(contentAssets[index]);
      })
    },
    citationSource: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(citationSources.filter((source) => source.brandId === where.brandId)))
    },
    monitoringRun: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(where.optimizationUnitId ? monitoringRuns.filter((run) => run.optimizationUnitId === where.optimizationUnitId).length : 7)),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(monitoringRuns.filter((run) => run.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(monitoringRuns.find((run) => run.id === where.id && run.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const run = { id: `run_${monitoringRuns.length + 1}`, ...data, createdAt: now, updatedAt: now };
        monitoringRuns.unshift(run);
        return Promise.resolve(run);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = monitoringRuns.findIndex((run) => run.id === where.id);
        monitoringRuns[index] = { ...monitoringRuns[index], ...data, updatedAt: now };
        return Promise.resolve(monitoringRuns[index]);
      })
    },
    asyncJob: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(asyncJobs.filter((job) => job.brandId === where.brandId && (!where.status || job.status === where.status)))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(asyncJobs.find((job) => job.brandId === where.brandId && (where.id === undefined || job.id === where.id) && (where.jobType === undefined || job.jobType === where.jobType) && (where.entityId === undefined || job.entityId === where.entityId)) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const job = {
          id: `job_${asyncJobs.length + 1}`,
          ...data,
          attemptCount: data.attemptCount ?? 0,
          maxAttempts: data.maxAttempts ?? 3,
          lastErrorCode: data.lastErrorCode ?? null,
          lastErrorMessage: data.lastErrorMessage ?? null,
          createdAt: now,
          updatedAt: now
        };
        asyncJobs.unshift(job);
        return Promise.resolve(job);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = asyncJobs.findIndex((job) => job.id === where.id);
        asyncJobs[index] = { ...asyncJobs[index], ...data, updatedAt: now };
        return Promise.resolve(asyncJobs[index]);
      })
    },
    contentStrategy: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(contentStrategies.filter((strategy) => strategy.brandId === where.brandId || strategy.optimizationUnitId === where.optimizationUnitId).length)),
      findMany: vi.fn().mockImplementation(({ where }) => {
        const ids = where.id?.in ? new Set(where.id.in) : null;
        return Promise.resolve(contentStrategies.filter((strategy) => strategy.brandId === where.brandId && (!ids || ids.has(strategy.id))));
      }),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(contentStrategies.find((strategy) => strategy.id === where.id && strategy.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const strategy = { id: `strategy_${contentStrategies.length + 1}`, ...data, createdAt: now, updatedAt: now };
        contentStrategies.unshift(strategy);
        return Promise.resolve(strategy);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = contentStrategies.findIndex((strategy) => strategy.id === where.id);
        contentStrategies[index] = { ...contentStrategies[index], ...data, updatedAt: now };
        return Promise.resolve(contentStrategies[index]);
      })
    },
    contentGenerationTask: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(contentGenerationTasks.filter((task) => task.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(contentGenerationTasks.find((task) => task.id === where.id && task.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const task = { id: `generation_${contentGenerationTasks.length + 1}`, ...data, draftRef: null, errorMessage: null, createdAt: now, updatedAt: now };
        contentGenerationTasks.unshift(task);
        return Promise.resolve(task);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = contentGenerationTasks.findIndex((task) => task.id === where.id);
        contentGenerationTasks[index] = { ...contentGenerationTasks[index], ...data, updatedAt: now };
        return Promise.resolve(contentGenerationTasks[index]);
      })
    },
    contentVersion: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(contentVersions.filter((version) => version.brandId === where.brandId || version.generationTaskId === where.generationTaskId).sort((a, b) => b.version - a.version))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(contentVersions.find((version) => version.id === where.id && version.brandId === where.brandId && (!where.generationTaskId || version.generationTaskId === where.generationTaskId)) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const version = { id: `version_${contentVersions.length + 1}`, ...data, createdAt: now, updatedAt: now };
        contentVersions.unshift(version);
        return Promise.resolve(version);
      })
    },
    contentExportRecord: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(contentExportRecords.filter((record) => record.brandId === where.brandId && record.generationTaskId === where.generationTaskId))),
      create: vi.fn().mockImplementation(({ data }) => {
        const record = { id: `export_${contentExportRecords.length + 1}`, ...data, createdAt: now };
        contentExportRecords.unshift(record);
        return Promise.resolve(record);
      })
    },
    publishingAccount: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(publishingAccounts.filter((account) => account.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(publishingAccounts.find((account) => account.id === where.id && account.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const account = { id: `pub_account_${publishingAccounts.length + 1}`, ...data, errorMessage: data.errorMessage ?? null, lastAuthorizedAt: data.lastAuthorizedAt ?? null, createdAt: now, updatedAt: now };
        publishingAccounts.unshift(account);
        return Promise.resolve(account);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = publishingAccounts.findIndex((account) => account.id === where.id);
        publishingAccounts[index] = { ...publishingAccounts[index], ...data, updatedAt: now };
        return Promise.resolve(publishingAccounts[index]);
      })
    },
    publishingRecord: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(publishingRecords.filter((record) => record.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(publishingRecords.find((record) => record.id === where.id && record.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const record = { id: `pub_record_${publishingRecords.length + 1}`, ...data, body: data.body ?? '', publishedUrl: null, errorMessage: null, createdAt: now, updatedAt: now };
        publishingRecords.unshift(record);
        return Promise.resolve(record);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = publishingRecords.findIndex((record) => record.id === where.id);
        publishingRecords[index] = { ...publishingRecords[index], ...data, updatedAt: now };
        return Promise.resolve(publishingRecords[index]);
      })
    },
    mediaPlatformRule: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(mediaPlatformRules.filter((rule) => rule.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(mediaPlatformRules.find((rule) => rule.brandId === where.brandId && rule.platform === where.platform) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const rule = { id: `rule_${mediaPlatformRules.length + 1}`, ...data, createdAt: now, updatedAt: now };
        mediaPlatformRules.unshift(rule);
        return Promise.resolve(rule);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = mediaPlatformRules.findIndex((rule) => rule.id === where.id);
        mediaPlatformRules[index] = { ...mediaPlatformRules[index], ...data, updatedAt: now };
        return Promise.resolve(mediaPlatformRules[index]);
      })
    },
    visibilitySprint: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(visibilitySprints.filter((sprint) => sprint.brandId === where.brandId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()))),
      findFirst: vi.fn().mockImplementation(({ where }) => {
        const sprints = visibilitySprints
          .filter((sprint) => sprint.brandId === where.brandId && (!where.id || sprint.id === where.id) && (!where.status?.in || where.status.in.includes(sprint.status)))
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
        return Promise.resolve(sprints[0] ?? null);
      }),
      create: vi.fn().mockImplementation(({ data }) => {
        const sprint = { ...data, createdAt: now, updatedAt: now };
        visibilitySprints.unshift(sprint);
        return Promise.resolve(sprint);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = visibilitySprints.findIndex((sprint) => sprint.id === where.id);
        visibilitySprints[index] = { ...visibilitySprints[index], ...data, updatedAt: now };
        return Promise.resolve(visibilitySprints[index]);
      })
    },
    brandStandardAnswer: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(
        brandStandardAnswers
          .filter((answer) => answer.brandId === where.brandId && (!where.questionId || answer.questionId === where.questionId))
          .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime())
      )),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(brandStandardAnswers.find((answer) => answer.id === where.id && answer.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const answer = { ...data, reviewedBy: null, reviewedAt: null, createdAt: now, updatedAt: now };
        brandStandardAnswers.unshift(answer);
        return Promise.resolve(answer);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = brandStandardAnswers.findIndex((answer) => answer.id === where.id);
        brandStandardAnswers[index] = { ...brandStandardAnswers[index], ...data, updatedAt: now };
        return Promise.resolve(brandStandardAnswers[index]);
      })
    },
    optimizationTask: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(optimizationTasks.filter((task) => task.brandId === where.brandId || task.optimizationUnitId === where.optimizationUnitId).length)),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(optimizationTasks.filter((task) => task.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(optimizationTasks.find((task) => task.id === where.id && task.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const task = { id: `task_${optimizationTasks.length + 1}`, ...data, processingNote: null, contentLink: null, retestPlanAt: null, retestRunId: null, createdAt: now, updatedAt: now };
        optimizationTasks.unshift(task);
        return Promise.resolve(task);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = optimizationTasks.findIndex((task) => task.id === where.id);
        optimizationTasks[index] = { ...optimizationTasks[index], ...data, updatedAt: now };
        return Promise.resolve(optimizationTasks[index]);
      })
    },
    report: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(reports.filter((report) => report.brandId === where.brandId).length)),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(reports.filter((report) => report.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(reports.find((report) => report.id === where.id && report.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const report = { id: `report_${reports.length + 1}`, ...data, createdAt: now };
        reports.unshift(report);
        return Promise.resolve(report);
      })
    },
    advisorRecord: {
      count: vi.fn().mockImplementation(({ where }) => Promise.resolve(advisorRecords.filter((record) => record.brandId === where.brandId).length)),
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(advisorRecords.filter((record) => record.brandId === where.brandId))),
      create: vi.fn().mockImplementation(({ data }) => {
        const record = { id: `advisor_${advisorRecords.length + 1}`, ...data, relatedReportId: data.relatedReportId ?? null, createdAt: now };
        advisorRecords.unshift(record);
        return Promise.resolve(record);
      })
    },
    platformConfig: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(platformConfigs.filter((config) => config.brandId === where.brandId))),
      findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve(platformConfigs.find((config) => config.brandId === where.brandId_platformKey.brandId && config.platformKey === where.brandId_platformKey.platformKey) ?? null)),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(platformConfigs.find((config) => config.id === where.id && config.brandId === where.brandId || config.brandId === where.brandId && config.platformKey === where.platformKey && config.enabled === where.enabled) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const config = { id: `platform_${platformConfigs.length + 1}`, ...data, lastValidation: null, createdAt: now, updatedAt: now };
        platformConfigs.unshift(config);
        return Promise.resolve(config);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = platformConfigs.findIndex((config) => config.id === where.id);
        platformConfigs[index] = { ...platformConfigs[index], ...data, updatedAt: now };
        return Promise.resolve(platformConfigs[index]);
      })
    },
    aIResponse: {
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(aiResponses.find((response) => response.runId === where.runId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const response = { id: `response_${aiResponses.length + 1}`, ...data, createdAt: now };
        aiResponses.unshift(response);
        return Promise.resolve(response);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = aiResponses.findIndex((response) => response.id === where.id);
        aiResponses[index] = { ...aiResponses[index], ...data };
        return Promise.resolve(aiResponses[index]);
      })
    },
    analysisResult: {
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(analysisResults.find((result) => result.brandId === where.brandId && result.runId === where.runId) ?? null)),
      findUnique: vi.fn().mockImplementation(({ where }) => Promise.resolve(analysisResults.find((result) => result.responseId === where.responseId) ?? null)),
      upsert: vi.fn().mockImplementation(({ where, create, update }) => {
        const index = analysisResults.findIndex((result) => result.responseId === where.responseId);
        if (index >= 0) {
          analysisResults[index] = { ...analysisResults[index], ...update, updatedAt: now };
          return Promise.resolve(analysisResults[index]);
        }
        const result = { id: `analysis_${analysisResults.length + 1}`, ...create, updatedAt: now };
        analysisResults.unshift(result);
        return Promise.resolve(result);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = analysisResults.findIndex((result) => result.id === where.id);
        analysisResults[index] = { ...analysisResults[index], ...data, updatedAt: now };
        return Promise.resolve(analysisResults[index]);
      })
    },
    analysisFinding: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(analysisFindings.filter((finding) => finding.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(analysisFindings.find((finding) => finding.id === where.id && finding.brandId === where.brandId) ?? null)),
      create: vi.fn().mockImplementation(({ data }) => {
        const finding = { id: `finding_${analysisFindings.length + 1}`, ...data, optimizationUnitId: data.optimizationUnitId ?? null, userIntent: data.userIntent ?? null, platformCode: data.platformCode ?? null, relatedTaskId: data.relatedTaskId ?? null, createdAt: now, updatedAt: now };
        analysisFindings.unshift(finding);
        return Promise.resolve(finding);
      }),
      update: vi.fn().mockImplementation(({ where, data }) => {
        const index = analysisFindings.findIndex((finding) => finding.id === where.id);
        analysisFindings[index] = { ...analysisFindings[index], ...data, updatedAt: now };
        return Promise.resolve(analysisFindings[index]);
      })
    },
    gEOMetricSnapshot: {
      findMany: vi.fn().mockImplementation(({ where }) => Promise.resolve(metricSnapshots.filter((snapshot) => snapshot.brandId === where.brandId))),
      findFirst: vi.fn().mockImplementation(({ where }) => Promise.resolve(metricSnapshots.find((snapshot) => snapshot.brandId === where.brandId) ?? null))
    },
    deniedAccessLog: {
      create: vi.fn().mockImplementation(({ data }) => {
        deniedLogs.unshift({ id: 'denied_2', ...data, createdAt: now });
        return Promise.resolve(deniedLogs[0]);
      }),
      findMany: vi.fn().mockResolvedValue(deniedLogs)
    },
    $transaction: vi.fn((callbackOrQueries) =>
      Array.isArray(callbackOrQueries)
        ? Promise.all(callbackOrQueries)
        : callbackOrQueries({
        brand: {
          create: vi.fn().mockResolvedValue(baseBrand)
        },
        userBrandPermission: {
          create: vi.fn().mockResolvedValue({ id: 'permission_created' })
        },
        platformConfig: {
          create: vi.fn().mockImplementation(({ data }) => {
            const config = { id: `platform_${platformConfigs.length + 1}`, ...data, lastValidation: null, createdAt: now, updatedAt: now };
            platformConfigs.unshift(config);
            return Promise.resolve(config);
          })
        }
      })
    )
  };
}

describe('PrismaPermissionsRepository', () => {
  it('maps persisted users and accessible brands to shared API contracts', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    await expect(repository.findUser('user_demo')).resolves.toMatchObject({ userId: 'user_demo', status: 'active' });
    await expect(repository.listAccessibleBrands('user_demo')).resolves.toEqual([
      { brandId: 'brand_prisma', name: 'Prisma Brand', status: 'active', role: 'owner' }
    ]);
    await expect(repository.listAccessibleBrandDetails('user_demo')).resolves.toMatchObject([
      { brandId: 'brand_prisma', aliases: ['PB'], targetCities: ['Shanghai'], role: 'owner' }
    ]);
  });

  it('creates and updates brands through Prisma while preserving permission checks', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    await expect(
      repository.createBrand('user_demo', {
        name: ' Prisma Brand ',
        aliases: ['PB'],
        industry: ' Education ',
        website: 'https://example.com',
        targetCities: ['Shanghai'],
        businessScope: ' Brand growth ',
        targetAudience: ' Operators '
      })
    ).resolves.toMatchObject({ brandId: 'brand_prisma', role: 'owner' });

    await expect(repository.updateBrand('user_demo', 'brand_prisma', { name: ' Updated Brand ' })).resolves.toMatchObject({
      name: 'Updated Brand'
    });
    await expect(repository.listPlatformConfigs('user_demo', 'brand_prisma')).resolves.toEqual(
      expect.arrayContaining([
        expect.objectContaining({ platformCode: 'doubao', name: '豆包' }),
        expect.objectContaining({ platformCode: 'deepseek', name: 'DeepSeek' }),
        expect.objectContaining({ platformCode: 'qianwen', name: '通义千问', endpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', modelName: 'qwen-plus' }),
        expect.objectContaining({ platformCode: 'stepfun', name: '阶跃星辰', endpointUrl: 'https://api.stepfun.com/v1/chat/completions', modelName: 'step-3.7-flash' })
      ])
    );
  });

  it('stores STEPFUN_API_KEY as the default StepFun credential reference when available', async () => {
    const originalStepfunApiKey = process.env.STEPFUN_API_KEY;
    process.env.STEPFUN_API_KEY = 'test-stepfun-env-value';
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    try {
      await repository.createBrand('user_demo', {
        name: ' Prisma Brand ',
        aliases: ['PB'],
        industry: ' Education ',
        website: 'https://example.com',
        targetCities: ['Shanghai'],
        businessScope: ' Brand growth ',
        targetAudience: ' Operators '
      });

      await expect(repository.listPlatformConfigs('user_demo', 'brand_prisma')).resolves.toEqual(expect.arrayContaining([
        expect.objectContaining({
          platformCode: 'stepfun',
          hasCredential: true,
          credentialRefMasked: '***',
          connectionStatus: 'ready'
        })
      ]));
      await expect(repository.getPlatformRuntimeConfig('user_demo', 'brand_prisma', 'stepfun')).resolves.toMatchObject({ credentialRef: 'STEPFUN_API_KEY' });
    } finally {
      if (originalStepfunApiKey === undefined) {
        delete process.env.STEPFUN_API_KEY;
      } else {
        process.env.STEPFUN_API_KEY = originalStepfunApiKey;
      }
    }
  });

  it('returns workspace counts and stores denied access logs', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    await expect(repository.getBrandWorkspaceSnapshot('user_demo', 'brand_prisma')).resolves.toMatchObject({
      relatedCounts: {
        profile: 0,
        optimizationUnits: 1,
        intents: 0,
        prompts: 0,
        advisorRecords: 0
      }
    });

    await repository.recordDeniedAccess({
      userId: 'user_demo',
      brandId: 'missing_brand',
      reason: 'USER_BRAND_PERMISSION_MISSING',
      requestedAt: now.toISOString()
    });

    await expect(repository.listDeniedAccessLogs('user_demo')).resolves.toEqual([
      {
        userId: 'user_demo',
        brandId: 'missing_brand',
        reason: 'USER_BRAND_PERMISSION_MISSING',
        requestedAt: now.toISOString()
      }
    ]);
  });

  it('persists brand profile and knowledge sources with normalized fields', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    await expect(repository.getBrandProfile('user_demo', 'brand_prisma')).resolves.toMatchObject({
      brandId: 'brand_prisma',
      completenessScore: 0
    });

    await expect(
      repository.saveBrandProfile('user_demo', 'brand_prisma', {
        intro: ' Brand intro ',
        valueProps: [' Fast growth '],
        offerings: [],
        proofPoints: [' Case study '],
        targetCustomers: [' Operator '],
        recommendedExpressions: [' GEO visibility '],
        blockedExpressions: [' Old claim '],
        contentRules: [' Use evidence '],
        competitors: ['Competitor'],
        faqs: [{ question: ' Why? ', answer: ' Because. ' }]
      })
    ).resolves.toMatchObject({ intro: 'Brand intro', valueProps: ['Fast growth'], completenessScore: 100 });

    await expect(
      repository.createKnowledgeSource('user_demo', 'brand_prisma', {
        name: ' Source ',
        sourceType: 'webpage',
        sourceUrl: ' https://example.com/source '
      })
    ).resolves.toMatchObject({ name: 'Source', status: 'pending' });
    await expect(repository.listKnowledgeSources('user_demo', 'brand_prisma')).resolves.toHaveLength(1);
  });

  it('persists optimization units, intents, templates and generated prompts', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    const unit = await repository.createOptimizationUnit('user_demo', 'brand_prisma', {
      name: ' Unit ',
      type: 'scenario',
      targetKeywords: [' geo ', ' visibility '],
      priority: 'high'
    });
    expect(unit).toMatchObject({ name: 'Unit', targetKeywords: ['geo', 'visibility'], enabled: true });

    const intent = await repository.createUserIntent('user_demo', 'brand_prisma', {
      optimizationUnitId: unit?.id ?? '',
      category: 'brand_awareness',
      text: ' How visible is the brand? ',
      monitoringFrequency: 'weekly'
    });
    expect(intent).toMatchObject({ text: 'How visible is the brand?', platformMetrics: [] });

    const template = await repository.createPromptTemplate({
      name: ' Template ',
      industry: ' Education ',
      category: 'brand_awareness',
      text: 'Evaluate {{brandName}} for {{intent}}',
      targetKeywords: [' ranking '],
      platformCodes: [' chatgpt '],
      frequency: 'weekly'
    });

    await expect(repository.batchGenerateBrandPrompts('user_demo', 'brand_prisma', { templateId: template.id })).resolves.toMatchObject([
      {
        brandId: 'brand_prisma',
        intentId: intent?.id,
        targetKeywords: ['ranking', 'geo', 'visibility'],
        platformCodes: ['chatgpt']
      }
    ]);
    await expect(repository.listBrandPrompts('user_demo', 'brand_prisma')).resolves.toHaveLength(1);
  });

  it('persists platform configs without exposing credential refs', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    const config = await repository.createPlatformConfig('user_demo', 'brand_prisma', {
      platformCode: 'mock_ai',
      name: ' 示例回答 ',
      mode: 'api',
      endpointUrl: ' https://api.example.com/chat/completions ',
      modelName: ' mock-v1 ',
      credentialRef: 'secret-ref'
    });

    expect(config).toMatchObject({ platformCode: 'mock_ai', name: '示例回答', hasCredential: true, credentialRefMasked: '***' });
    expect(config).not.toHaveProperty('credentialRef');
    await expect(repository.validatePlatformConfig('user_demo', 'brand_prisma', config?.id ?? '')).resolves.toMatchObject({ ok: true, mode: 'api' });
    await expect(repository.listPlatformConfigs('user_demo', 'brand_prisma')).resolves.toMatchObject([
      { platformCode: 'mock_ai', hasCredential: true, credentialRefMasked: '***' }
    ]);
  });

  it('persists visibility sprints with aggregate metrics and related entity ids', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    const sprint = await repository.createVisibilitySprint('user_demo', 'brand_prisma', {
      title: ' 首轮 AI 可见性运营 ',
      goal: '打通问题到复测闭环',
      status: 'running',
      currentStep: 'ai_response_monitoring',
      metricSummary: { mentionRate: 42, sampleSize: 12 },
      relatedQuestionIds: ['question_1'],
      relatedTestPlanIds: ['plan_1']
    });

    expect(sprint).toMatchObject({
      brandId: 'brand_prisma',
      title: '首轮 AI 可见性运营',
      status: 'running',
      currentStep: 'ai_response_monitoring',
      relatedQuestionIds: ['question_1'],
      relatedTestPlanIds: ['plan_1'],
      metricSummary: expect.objectContaining({ mentionRate: 42, sampleSize: 12 })
    });
    expect(sprint?.steps.find((step) => step.code === 'ai_response_monitoring')).toMatchObject({ status: 'running' });

    await expect(repository.listVisibilitySprints('user_demo', 'brand_prisma')).resolves.toHaveLength(1);
    await expect(repository.getCurrentVisibilitySprint('user_demo', 'brand_prisma')).resolves.toMatchObject({ sprintId: sprint?.sprintId });

    await expect(
      repository.updateVisibilitySprintStep('user_demo', 'brand_prisma', sprint?.sprintId ?? '', {
        status: 'waiting_confirmation',
        currentStep: 'gap_diagnosis'
      })
    ).resolves.toMatchObject({ status: 'waiting_confirmation', currentStep: 'gap_diagnosis' });

    await expect(
      repository.updateVisibilitySprintMetrics('user_demo', 'brand_prisma', sprint?.sprintId ?? '', {
        recommendationRate: 30,
        contentGapCount: 4
      })
    ).resolves.toMatchObject({
      metricSummary: expect.objectContaining({ mentionRate: 42, recommendationRate: 30, contentGapCount: 4 })
    });

    await expect(
      repository.updateVisibilitySprintRelations('user_demo', 'brand_prisma', sprint?.sprintId ?? '', {
        relatedMonitoringRunIds: ['run_1'],
        relatedContentTaskIds: ['generation_1'],
        relatedPublishingRecordIds: ['publish_1']
      })
    ).resolves.toMatchObject({
      relatedMonitoringRunIds: ['run_1'],
      relatedContentTaskIds: ['generation_1'],
      relatedPublishingRecordIds: ['publish_1']
    });
  });

  it('persists brand standard answers independently from monitoring runs', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    const answer = await repository.createBrandStandardAnswer('user_demo', 'brand_prisma', {
      questionId: 'question_prisma',
      question: ' 贵阳儿童运动训练机构推荐哪家？ ',
      answer: ' 推荐优先看课程体系、教练经验和校区覆盖。 ',
      keyPoints: [' 课程体系 ', ''],
      evidence: [{ label: ' 品牌档案 ', sourceType: 'brand_profile', sourceId: 'brand_prisma', excerpt: ' 贵阳 5 家校区。 ' }],
      status: 'ready_for_review'
    });

    expect(answer).toMatchObject({
      brandId: 'brand_prisma',
      questionId: 'question_prisma',
      question: '贵阳儿童运动训练机构推荐哪家？',
      answer: '推荐优先看课程体系、教练经验和校区覆盖。',
      keyPoints: ['课程体系'],
      status: 'ready_for_review'
    });
    expect(answer?.evidence).toEqual([expect.objectContaining({ label: '品牌档案', sourceType: 'brand_profile', excerpt: '贵阳 5 家校区。' })]);

    await expect(repository.listBrandStandardAnswers('user_demo', 'brand_prisma', 'question_prisma')).resolves.toHaveLength(1);
    await expect(repository.getBrandStandardAnswer('user_demo', 'brand_prisma', answer?.answerId ?? '')).resolves.toMatchObject({ questionId: 'question_prisma' });

    await expect(
      repository.updateBrandStandardAnswer('user_demo', 'brand_prisma', answer?.answerId ?? '', {
        status: 'approved',
        reviewedBy: 'user_demo',
        reviewedAt: '2026-07-11T00:00:00.000Z'
      })
    ).resolves.toMatchObject({ status: 'approved', reviewedBy: 'user_demo' });
    await expect(repository.listBrandStandardAnswers('user_demo', 'brand_missing', 'question_prisma')).resolves.toEqual([]);
  });

  it('uses configured Amap POI provider without exposing server API keys', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);
    const apiKey = 'amap-secret-for-test';
    vi.stubEnv('GEO_AMAP_API_KEY', apiKey);
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: '1',
        pois: [
          {
            id: 'amap_real_001',
            name: '真实地图儿童体能馆',
            address: '贵阳市观山湖区儿童运动中心',
            cityname: '贵阳',
            type: '儿童体适能',
            location: '106.640,26.650'
          },
          {
            id: 'amap_unrelated_001',
            name: 'XDS喜德盛自行车',
            address: '金朱东路190号',
            cityname: '贵阳',
            type: '购物服务;专卖店;自行车专卖店',
            location: '106.637,26.655'
          },
          {
            id: 'amap_unrelated_002',
            name: '大米和小米儿童成长中心',
            address: '飞山街祥源大厦',
            cityname: '贵阳',
            type: '科教文化服务;科教文化场所',
            location: '106.706,26.579'
          }
        ]
      })
    }));

    try {
      const run = await repository.createCompetitorDiscoveryRun('user_demo', 'brand_prisma', {
        city: '贵阳',
        keywords: ['儿童体能'],
        forceRefresh: true
      });
      const candidates = await repository.listCompetitorDiscoveryCandidates('user_demo', 'brand_prisma', run?.runId ?? '');
      const publicPayload = JSON.stringify({ run, candidates });

      expect(run).toMatchObject({ providerStatus: 'configured', candidateCount: 1 });
      expect(candidates).toMatchObject([
        expect.objectContaining({ sourcePoiId: 'amap_real_001', name: '真实地图儿童体能馆', distanceToNearestCampusKm: 0 })
      ]);
      expect(candidates?.some((candidate) => candidate.sourcePoiId === 'amap_unrelated_001')).toBe(false);
      expect(candidates?.some((candidate) => candidate.sourcePoiId === 'amap_unrelated_002')).toBe(false);
      expect(publicPayload).not.toContain(apiKey);
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });

  it('reuses Prisma discovery cache with candidates attached to each run', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);
    vi.stubEnv('GEO_AMAP_API_KEY', 'amap-cache-test-key');
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({
        status: '1',
        pois: [
          {
            id: 'amap_cache_001',
            name: '缓存地图儿童体能馆',
            address: '贵阳市观山湖区缓存运动中心',
            cityname: '贵阳',
            type: '儿童体适能',
            location: '106.640,26.650'
          }
        ]
      })
    }));

    try {
      const firstRun = await repository.createCompetitorDiscoveryRun('user_demo', 'brand_prisma', {
        city: '贵阳',
        keywords: ['缓存儿童体能'],
        forceRefresh: true
      });
      const secondRun = await repository.createCompetitorDiscoveryRun('user_demo', 'brand_prisma', {
        city: '贵阳',
        keywords: ['缓存儿童体能']
      });
      const firstCandidates = await repository.listCompetitorDiscoveryCandidates('user_demo', 'brand_prisma', firstRun?.runId ?? '');
      const secondCandidates = await repository.listCompetitorDiscoveryCandidates('user_demo', 'brand_prisma', secondRun?.runId ?? '');

      expect(firstRun).toMatchObject({ providerStatus: 'configured', cacheHit: false, candidateCount: 1 });
      expect(secondRun).toMatchObject({ providerStatus: 'configured', cacheHit: true, candidateCount: 1 });
      expect(firstCandidates).toHaveLength(firstRun?.candidateCount ?? 0);
      expect(secondCandidates).toHaveLength(secondRun?.candidateCount ?? 0);
      expect(secondCandidates?.[0]).toMatchObject({ name: '缓存地图儿童体能馆', runId: secondRun?.runId });
      expect(fetch).toHaveBeenCalledTimes(1);
    } finally {
      vi.unstubAllEnvs();
      vi.unstubAllGlobals();
    }
  });

  it('persists monitoring runs, manual responses and analysis updates', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    const unit = await repository.createOptimizationUnit('user_demo', 'brand_prisma', {
      name: 'Monitoring Unit',
      type: 'brand',
      priority: 'high'
    });
    const intent = await repository.createUserIntent('user_demo', 'brand_prisma', {
      optimizationUnitId: unit?.id ?? '',
      category: 'brand_awareness',
      text: 'Recommend Prisma Brand',
      monitoringFrequency: 'weekly'
    });
    const template = await repository.createPromptTemplate({
      name: 'Monitoring Template',
      category: 'brand_awareness',
      text: 'Evaluate {{brandName}}',
      platformCodes: ['manual_input'],
      frequency: 'weekly'
    });
    const [prompt] = (await repository.batchGenerateBrandPrompts('user_demo', 'brand_prisma', { templateId: template.id, intentIds: [intent?.id ?? ''] })) ?? [];
    await repository.createPlatformConfig('user_demo', 'brand_prisma', {
      platformCode: 'manual_input',
      name: 'Manual Input',
      mode: 'manual'
    });

    const run = await repository.createMonitoringRun('user_demo', 'brand_prisma', { promptId: prompt.id, platformCode: 'manual_input' });
    expect(run).toMatchObject({ status: 'review_required', promptText: prompt.text });
    await expect(repository.listAsyncJobs('user_demo', 'brand_prisma', 'succeeded')).resolves.toContainEqual(
      expect.objectContaining({ jobType: 'monitoring', entityId: run?.id })
    );

    const completed = await repository.addManualResponse('user_demo', 'brand_prisma', run?.id ?? '', {
      rawText: 'Prisma Brand is recommended by operators.',
      citations: [' https://example.com '],
      modelName: 'manual'
    });
    expect(completed).toMatchObject({ status: 'completed', response: { citations: ['https://example.com'] } });

    const parsed = await repository.parseAnalysisResult('user_demo', 'brand_prisma', run?.id ?? '');
    expect(parsed).toMatchObject({ responseId: completed?.response?.id, runId: run?.id });

    await expect(repository.updateAnalysisResult('user_demo', 'brand_prisma', run?.id ?? '', { accuracyScore: 101, sentiment: 'positive' })).resolves.toMatchObject({
      accuracyScore: 100,
      sentiment: 'positive'
    });
  });

  it('reads GEO metric dashboard and brand ranking from snapshots', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    await expect(repository.getBrandMetricDashboard('user_demo', 'brand_prisma')).resolves.toMatchObject({
      current: { totalScore: 78, sampleCount: 5 },
      trend: [{ totalScore: 78 }]
    });
    await expect(repository.listBrandMetricRanking('user_demo')).resolves.toMatchObject([
      { brandId: 'brand_prisma', totalScore: 78, mentionRate: 80, sampleCount: 5 }
    ]);
  });

  it('persists content assets, strategies, generation tasks, versions and exports', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    const asset = await repository.createContentAsset('user_demo', 'brand_prisma', {
      title: ' GEO Guide ',
      type: 'article',
      platform: 'wechat_official',
      url: ' https://example.com/geo ',
      targetKeywords: [' visibility '],
      status: 'published'
    });
    expect(asset).toMatchObject({ title: 'GEO Guide', targetKeywords: ['visibility'], status: 'published' });
    await expect(repository.listContentAssets('user_demo', 'brand_prisma', { keyword: 'vis' })).resolves.toHaveLength(1);

    const unit = await repository.createOptimizationUnit('user_demo', 'brand_prisma', { name: 'Content Unit', type: 'brand', priority: 'high', targetKeywords: ['geo'] });
    const intent = await repository.createUserIntent('user_demo', 'brand_prisma', { optimizationUnitId: unit?.id ?? '', category: 'brand_awareness', text: 'Explain GEO', monitoringFrequency: 'weekly' });
    const template = await repository.createPromptTemplate({ name: 'Content Template', category: 'brand_awareness', text: 'Write {{brandName}}', platformCodes: ['wechat_official'], frequency: 'weekly' });
    const [prompt] = (await repository.batchGenerateBrandPrompts('user_demo', 'brand_prisma', { templateId: template.id, intentIds: [intent?.id ?? ''] })) ?? [];

    const strategy = await repository.createContentStrategy('user_demo', 'brand_prisma', {
      optimizationUnitId: unit?.id ?? '',
      intentId: intent?.id ?? '',
      type: 'gap',
      priority: 'high',
      suggestedTitle: ' GEO Visibility Plan ',
      targetPlatform: 'wechat_official',
      targetKeywords: ['geo'],
      relatedPromptIds: [prompt.id]
    });
    expect(strategy).toMatchObject({ suggestedTitle: 'GEO Visibility Plan', relatedPromptIds: [prompt.id], status: 'draft' });

    const workspace = await repository.createContentGenerationTask('user_demo', 'brand_prisma', { strategyId: strategy?.id ?? '' });
    expect(workspace).toMatchObject({ currentTask: { status: 'completed' }, currentVersion: { version: 1 } });
    await expect(repository.listAsyncJobs('user_demo', 'brand_prisma', 'succeeded')).resolves.toContainEqual(
      expect.objectContaining({ jobType: 'content_generation', entityId: workspace?.currentTask?.id })
    );
    await expect(
      repository.updateContentGenerationStep('user_demo', 'brand_prisma', workspace?.currentTask?.id ?? '', {
        stepKey: 'outline_generation',
        status: 'running',
        message: '正在生成内容提纲'
      })
    ).resolves.toMatchObject({
      currentTask: {
        status: 'running',
        steps: expect.arrayContaining([expect.objectContaining({ key: 'outline_generation', status: 'running', message: '正在生成内容提纲' })])
      }
    });
    const completed = await repository.completeContentGenerationTask('user_demo', 'brand_prisma', workspace?.currentTask?.id ?? '', {
      title: 'Generated GEO Draft',
      body: 'Generated Body',
      completedAt: '2026-07-03T10:00:00.000Z'
    });
    expect(completed).toMatchObject({
      currentTask: {
        status: 'completed',
        steps: expect.arrayContaining([expect.objectContaining({ key: 'outline_generation', status: 'completed' })])
      },
      currentVersion: { title: 'Generated GEO Draft', body: 'Generated Body', version: 2 },
      publishPayload: { generationTaskId: workspace?.currentTask?.id, title: 'Generated GEO Draft' }
    });
    const failed = await repository.recordContentGenerationFailure('user_demo', 'brand_prisma', workspace?.currentTask?.id ?? '', {
      stepKey: 'geo_rule_check',
      errorCode: 'rule_check_failed',
      errorMessage: 'Rule check failed',
      retryable: true,
      failedAt: '2026-07-03T11:00:00.000Z'
    });
    expect(failed).toMatchObject({
      currentTask: {
        status: 'failed',
        errorMessage: 'Rule check failed',
        steps: expect.arrayContaining([expect.objectContaining({ key: 'geo_rule_check', status: 'failed', message: 'Rule check failed' })])
      }
    });
    await expect(repository.listAsyncJobs('user_demo', 'brand_prisma', 'failed')).resolves.toContainEqual(
      expect.objectContaining({ jobType: 'content_generation', entityId: workspace?.currentTask?.id, attemptCount: 2, lastErrorCode: 'rule_check_failed' })
    );
    const retried = await repository.retryContentGenerationTask('user_demo', 'brand_prisma', workspace?.currentTask?.id ?? '', { nextRunAt: '2026-07-03T11:05:00.000Z' });
    expect(retried).toMatchObject({
      currentTask: {
        status: 'pending',
        steps: expect.arrayContaining([expect.objectContaining({ key: 'geo_rule_check', status: 'pending' })])
      }
    });
    await expect(repository.listAsyncJobs('user_demo', 'brand_prisma', 'queued')).resolves.toContainEqual(
      expect.objectContaining({ jobType: 'content_generation', entityId: workspace?.currentTask?.id, lastErrorCode: undefined, lastErrorMessage: undefined })
    );
    const saved = await repository.saveContentVersion('user_demo', 'brand_prisma', workspace?.currentTask?.id ?? '', { title: 'Final GEO Guide', body: 'Body' });
    expect(saved?.currentVersion).toMatchObject({ title: 'Final GEO Guide', version: 3 });
    await expect(repository.exportContentMarkdown('user_demo', 'brand_prisma', saved?.currentTask?.id ?? '')).resolves.toMatchObject({ exportFormat: 'markdown', content: '# Final GEO Guide\n\nBody' });
  });

  it('persists publishing accounts and records from generated content payloads', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    const account = await repository.connectPublishingAccount('user_demo', 'brand_prisma', {
      platform: 'wechat_official',
      accountName: ' Brand Account '
    });
    expect(account).toMatchObject({ accountName: 'Brand Account', authStatus: 'connected' });

    const record = await repository.createPublishingRecord('user_demo', 'brand_prisma', {
      accountId: account?.id,
      title: ' Publish Title ',
      body: 'Publish Body',
      targetPlatform: 'wechat_official',
      contentType: 'article',
      targetKeywords: ['geo']
    });
    expect(record).toMatchObject({ title: 'Publish Title', body: 'Publish Body', accountName: 'Brand Account', status: 'draft' });
    await expect(repository.updatePublishingRecordStatus('user_demo', 'brand_prisma', record?.id ?? '', { status: 'published', publishedUrl: ' https://example.com/published ' })).resolves.toMatchObject({
      status: 'published',
      publishedUrl: 'https://example.com/published',
      publishedAt: expect.any(String)
    });
    await expect(repository.getPublishingDashboard('user_demo', 'brand_prisma')).resolves.toMatchObject({ accounts: [{ id: account?.id }], records: [{ id: record?.id, body: 'Publish Body' }] });
  });

  it('persists page aggregation data and derives brand-scoped library and publishing views', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    await repository.saveBrandProfileLibrary('user_demo', 'brand_prisma', {
      profile: {
        intro: ' Brand library intro ',
        valueProps: [' Trusted growth '],
        offerings: [' GEO service '],
        proofPoints: [' Customer case '],
        targetCustomers: [' Operators '],
        recommendedExpressions: [' Evidence based '],
        blockedExpressions: [],
        contentRules: [' Cite sources '],
        competitors: [],
        faqs: []
      }
    });
    await repository.createKnowledgeSource('user_demo', 'brand_prisma', {
      name: ' Official Guide ',
      sourceType: 'webpage',
      sourceUrl: 'https://example.com/guide'
    });
    const media = await repository.createBrandMediaAsset('user_demo', 'brand_prisma', {
      title: ' Product Image ',
      assetType: 'image',
      applicablePlatforms: [' wechat_official ', 'wechat_official'],
      contentUsage: ' Article cover ',
      source: ' Brand team '
    });
    expect(media).toMatchObject({ title: 'Product Image', applicablePlatforms: ['wechat_official'], reviewStatus: 'pending' });
    await expect(repository.updateBrandMediaAsset('user_demo', 'brand_prisma', media?.id ?? '', {
      reviewStatus: 'approved'
    })).resolves.toMatchObject({ reviewStatus: 'approved' });

    const account = await repository.connectPublishingAccount('user_demo', 'brand_prisma', {
      platform: 'wechat_official',
      accountName: 'Brand Account'
    });
    const asset = await repository.createContentAsset('user_demo', 'brand_prisma', {
      title: 'GEO Guide',
      type: 'article',
      platform: 'wechat_official',
      url: 'https://example.com/geo',
      targetKeywords: ['geo'],
      status: 'published'
    });
    const record = await repository.createPublishingRecord('user_demo', 'brand_prisma', {
      accountId: account?.id,
      contentAssetId: asset?.id,
      title: 'GEO Guide',
      body: 'Published body',
      targetPlatform: 'wechat_official'
    });
    await repository.updatePublishingRecordStatus('user_demo', 'brand_prisma', record?.id ?? '', { status: 'published' });

    await expect(repository.getBrandProfileLibrary('user_demo', 'brand_prisma')).resolves.toMatchObject({
      brandId: 'brand_prisma',
      knowledgeSources: [{ name: 'Official Guide' }],
      mediaAssets: [{ id: media?.id, reviewStatus: 'approved' }],
      publishingAccounts: [{ id: account?.id }]
    });
    await expect(repository.listOwnedMediaAccounts('user_demo', 'brand_prisma')).resolves.toMatchObject([
      { id: account?.id, platformName: '公众号', stats: { totalRecords: 1, publishedRecords: 1 } }
    ]);
    await expect(repository.listContentAssetPageItems('user_demo', 'brand_prisma')).resolves.toMatchObject([
      { id: asset?.id, publishStatus: 'published', publishingStats: { totalRecords: 1, publishedRecords: 1 } }
    ]);
    prisma.userBrandPermission.findFirst.mockResolvedValueOnce(null);
    await expect(repository.getBrandProfileLibrary('user_demo', 'other_brand')).resolves.toBeNull();
  });

  it('persists platform rules and analysis findings with JSON mapping and relation checks', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    const rule = await repository.createMediaPlatformRule('user_demo', 'brand_prisma', {
      platform: ' wechat_official ',
      name: ' 公众号 ',
      contentFormats: [' article ', 'article'],
      intentFit: '品牌认知',
      recommendedFrequency: '每周一次',
      coverRatio: '2.35:1',
      publishingNote: '发布前复核引用'
    });
    expect(rule).toMatchObject({ platform: 'wechat_official', name: '公众号', contentFormats: ['article'] });
    await expect(repository.createMediaPlatformRule('user_demo', 'brand_prisma', {
      platform: 'wechat_official',
      name: '重复规则',
      contentFormats: [],
      intentFit: '',
      recommendedFrequency: '',
      coverRatio: '',
      publishingNote: ''
    })).resolves.toBeNull();
    await expect(repository.updateMediaPlatformRule('user_demo', 'brand_prisma', 'wechat_official', {
      publishingNote: ' 发布后安排复测 '
    })).resolves.toMatchObject({ publishingNote: '发布后安排复测' });

    const finding = await repository.createAnalysisFinding('user_demo', 'brand_prisma', {
      type: 'citation',
      title: ' 权威引用不足 ',
      optimizationUnitId: 'unit_prisma',
      userIntent: ' 了解品牌可信度 ',
      evidence: [' 官网引用偏少 ', '官网引用偏少'],
      severity: 'high',
      recommendedActions: [
        { label: ' 补充官网内容 ', actionType: 'generate_content', targetId: ' unit_prisma ' }
      ]
    });
    expect(finding).toMatchObject({
      title: '权威引用不足',
      evidence: ['官网引用偏少'],
      recommendedActions: [{ label: '补充官网内容', targetId: 'unit_prisma' }]
    });
    await expect(repository.createAnalysisFinding('user_demo', 'brand_prisma', {
      type: 'fact',
      title: '无效关联',
      optimizationUnitId: 'missing_unit',
      evidence: [],
      severity: 'medium',
      recommendedActions: []
    })).resolves.toBeNull();
    await expect(repository.getAnalysisWorkbenchDashboard('user_demo', 'brand_prisma')).resolves.toMatchObject({
      findings: [{ id: finding?.id }],
      recommendedActions: [{ label: '补充官网内容', actionType: 'generate_content' }]
    });
    prisma.userBrandPermission.findFirst.mockResolvedValueOnce(null);
    await expect(repository.listMediaPlatformRules('user_demo', 'other_brand')).resolves.toBeNull();
  });

  it('keeps memory and Prisma aggregation record mappings consistent', async () => {
    const memoryRepository = new PermissionsRepository();
    const memoryBrand = memoryRepository.createBrand('user_demo', {
      name: 'Repository Consistency Brand',
      industry: 'Enterprise Services',
      businessScope: 'Brand operations',
      targetAudience: 'Operators'
    });
    const prismaRepository = new PrismaPermissionsRepository(createPrismaMock() as never);
    const mediaInput = {
      title: ' Product Image ',
      assetType: 'image' as const,
      applicablePlatforms: [' wechat_official ', 'wechat_official'],
      contentUsage: ' Article cover ',
      source: ' Brand team '
    };
    const findingInput = {
      type: 'citation' as const,
      title: ' Authority citation gap ',
      userIntent: ' Learn brand trust ',
      evidence: [' Official source missing ', 'Official source missing'],
      severity: 'high' as const,
      recommendedActions: [{ label: ' Add official content ', actionType: 'generate_content' as const }]
    };

    const memoryMedia = memoryRepository.createBrandMediaAsset('user_demo', memoryBrand.brandId, mediaInput);
    const prismaMedia = await prismaRepository.createBrandMediaAsset('user_demo', 'brand_prisma', mediaInput);
    const memoryFinding = memoryRepository.createAnalysisFinding('user_demo', memoryBrand.brandId, findingInput);
    const prismaFinding = await prismaRepository.createAnalysisFinding('user_demo', 'brand_prisma', findingInput);

    expect(pickMediaMapping(prismaMedia)).toEqual(pickMediaMapping(memoryMedia));
    expect(pickFindingMapping(prismaFinding)).toEqual(pickFindingMapping(memoryFinding));
  });

  it('persists optimization tasks, reports and advisor records', async () => {
    const prisma = createPrismaMock();
    const repository = new PrismaPermissionsRepository(prisma as never);

    const task = await repository.createOptimizationTask('user_demo', 'brand_prisma', {
      title: ' Improve citation quality ',
      type: 'manual',
      priority: 'medium'
    });
    expect(task).toMatchObject({ title: 'Improve citation quality', status: 'todo', reviewStatus: 'pending' });
    await expect(repository.updateOptimizationTask('user_demo', 'brand_prisma', task?.id ?? '', { status: 'doing', processingNote: ' Start ' })).resolves.toMatchObject({
      status: 'doing',
      processingNote: 'Start'
    });
    await expect(repository.getTaskBoard('user_demo', 'brand_prisma')).resolves.toMatchObject({ statusCounts: { doing: 1 } });

    const report = await repository.createReport('user_demo', 'brand_prisma', { type: 'weekly', title: ' Weekly GEO Report ', periodStart: '2026-07-01', periodEnd: '2026-07-03' });
    expect(report).toMatchObject({ title: 'Weekly GEO Report', status: 'generated', createdBy: 'user_demo' });
    expect(report?.content).toContain('```yaml');
    expect(report?.content).toContain('reportType: single_brand');
    expect(report?.content).toContain('brandId: brand_prisma');
    expect(report?.content).toContain('## 指标解释');
    expect(report?.content).toContain('## 问题归因');
    expect(report?.content).toContain('## 行动建议');

    const multiBrandReport = await repository.createReport('user_demo', 'brand_prisma', { type: 'multi_brand', title: ' Multi Brand Report ' });
    expect(multiBrandReport?.content).toContain('reportType: multi_brand');
    expect(multiBrandReport?.content).toContain('## 品牌对比');
    expect(multiBrandReport?.content).toContain('## 风险提示');
    expect(multiBrandReport?.content).toContain('## 交付进度');

    const advisor = await repository.createAdvisorRecord('user_demo', 'brand_prisma', {
      type: 'diagnosis',
      title: ' Advisor Diagnosis ',
      content: 'Need more authoritative content.',
      relatedReportId: report?.id,
      followUpItems: [{ title: 'Publish official guide', status: 'todo' }]
    });
    expect(advisor).toMatchObject({ title: 'Advisor Diagnosis', relatedReport: { id: report?.id }, followUpItems: [{ status: 'todo' }] });
    const servicePlan = await repository.createAdvisorRecord('user_demo', 'brand_prisma', {
      type: 'service_plan',
      title: ' Service Plan ',
      content: '## 服务计划\n- 服务目标：Improve citation quality\n- 负责人：Advisor\n- 预期结果：Higher official citation rate',
      followUpItems: [{ title: 'Schedule milestone review', status: 'doing' }]
    });
    expect(servicePlan).toMatchObject({ type: 'service_plan', title: 'Service Plan', followUpItems: [{ status: 'doing' }] });
    const advisorDashboard = await repository.getAdvisorDashboard('user_demo', 'brand_prisma');
    expect(advisorDashboard?.latestDiagnosis?.id).toBe(advisor?.id);
    expect(advisorDashboard?.pendingFollowUps.map((item) => item.title)).toEqual(expect.arrayContaining(['Publish official guide', 'Schedule milestone review']));
  });
});
