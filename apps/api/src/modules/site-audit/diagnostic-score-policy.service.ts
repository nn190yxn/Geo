import { Inject, Injectable, NotFoundException, Optional } from '@nestjs/common';
import type {
  DiagnosticDimensionScore,
  DiagnosticScoreDimension,
  DiagnosticScorePolicy,
  DiagnosticScoreSnapshot,
  SiteAuditCheck,
  SiteAuditResult
} from '@geo-platform/shared-types';
import {
  DIAGNOSTIC_SCORE_REPOSITORY,
  type DiagnosticScoreRepositoryPort,
  type DiagnosticScoreSnapshotInput
} from './diagnostic-score.repository.port';

export const DIAGNOSTIC_SCORE_POLICY = Symbol('DIAGNOSTIC_SCORE_POLICY');

export const defaultDiagnosticScorePolicy: DiagnosticScorePolicy = {
  version: 'site-diagnostic-v1',
  statusScores: { pass: 100, warning: 50, fail: 0, unavailable: null },
  dimensions: {
    schema: { configuredWeight: 0.3, checkKeys: ['structured_data'] },
    meta: { configuredWeight: 0.25, checkKeys: ['robots_txt', 'sitemap_xml', 'noindex', 'ai_bot_access'] },
    content: { configuredWeight: 0.3, checkKeys: ['llms_txt', 'extractable_content'] },
    citation: { configuredWeight: 0.15, checkKeys: [] }
  }
};

export class DiagnosticScorePolicyError extends Error {
  constructor(readonly code: string, message: string) {
    super(message);
  }
}

@Injectable()
export class DiagnosticScorePolicyService {
  private readonly policy: DiagnosticScorePolicy;

  constructor(
    @Inject(DIAGNOSTIC_SCORE_REPOSITORY) private readonly repository: DiagnosticScoreRepositoryPort,
    @Optional() @Inject(DIAGNOSTIC_SCORE_POLICY) policy?: DiagnosticScorePolicy
  ) {
    this.policy = structuredClone(policy ?? defaultDiagnosticScorePolicy);
    validatePolicy(this.policy);
  }

  async scoreAndSave(brandId: string, audit: SiteAuditResult): Promise<DiagnosticScoreSnapshot> {
    return this.repository.create(brandId, calculateSnapshot(audit, this.policy));
  }

  async reproduce(brandId: string, snapshotId: string): Promise<DiagnosticScoreSnapshot> {
    const snapshot = await this.repository.findById(brandId, snapshotId);
    if (!snapshot) throw new NotFoundException('诊断评分快照不存在或无权访问');
    const reproduced = calculateSnapshot({
      websiteUrl: snapshot.websiteUrl,
      auditedAt: snapshot.createdAt,
      checks: snapshot.rawChecks
    }, snapshot.policy);
    return { ...snapshot, ...reproduced, id: snapshot.id, brandId: snapshot.brandId, createdAt: snapshot.createdAt };
  }
}

function calculateSnapshot(audit: SiteAuditResult, policy: DiagnosticScorePolicy): DiagnosticScoreSnapshotInput {
  validatePolicy(policy);
  const dimensions = diagnosticDimensions().map((dimension) => scoreDimension(dimension, audit.checks, policy));
  const measuredWeight = dimensions.reduce((sum, item) => sum + (item.score === null ? 0 : item.configuredWeight), 0);
  if (dimensions.some((item) => item.score !== null) && measuredWeight <= 0) {
    throw new DiagnosticScorePolicyError('DIAGNOSTIC_SCORE_WEIGHT_INVALID', '已测诊断维度的配置权重总和必须大于 0');
  }
  const dimensionScores = dimensions.map((item): DiagnosticDimensionScore => {
    const normalizedWeight = item.score === null || measuredWeight === 0 ? 0 : item.configuredWeight / measuredWeight;
    return {
      ...item,
      normalizedWeight: round(normalizedWeight, 6),
      weightedScore: round((item.score ?? 0) * normalizedWeight, 2)
    };
  });
  const normalizedWeights = Object.fromEntries(
    dimensionScores.map((item) => [item.dimension, item.normalizedWeight])
  ) as Record<DiagnosticScoreDimension, number>;
  return {
    websiteUrl: audit.websiteUrl,
    rawChecks: structuredClone(audit.checks),
    dimensionScores,
    normalizedWeights,
    policy: structuredClone(policy),
    ruleVersion: policy.version,
    totalScore: round(dimensionScores.reduce((sum, item) => sum + item.weightedScore, 0), 2)
  };
}

function scoreDimension(
  dimension: DiagnosticScoreDimension,
  checks: SiteAuditCheck[],
  policy: DiagnosticScorePolicy
): Omit<DiagnosticDimensionScore, 'normalizedWeight' | 'weightedScore'> {
  const definition = policy.dimensions[dimension];
  const rawChecks = checks.filter((check) => definition.checkKeys.includes(check.key));
  const scores = rawChecks.flatMap((check) => {
    const score = policy.statusScores[check.status];
    return score === null ? [] : [score];
  });
  return {
    dimension,
    rawChecks: structuredClone(rawChecks),
    score: scores.length ? round(scores.reduce((sum, score) => sum + score, 0) / scores.length, 2) : null,
    configuredWeight: definition.configuredWeight
  };
}

function validatePolicy(policy: DiagnosticScorePolicy): void {
  if (!policy.version.trim()) throw new DiagnosticScorePolicyError('DIAGNOSTIC_SCORE_VERSION_INVALID', '评分规则版本不能为空');
  for (const score of Object.values(policy.statusScores)) {
    if (score !== null && (!Number.isFinite(score) || score < 0 || score > 100)) {
      throw new DiagnosticScorePolicyError('DIAGNOSTIC_SCORE_STATUS_SCORE_INVALID', '检查状态分数必须位于 0 到 100');
    }
  }
  const assignedChecks = new Set<string>();
  for (const dimension of diagnosticDimensions()) {
    const definition = policy.dimensions[dimension];
    if (!Number.isFinite(definition.configuredWeight) || definition.configuredWeight < 0) {
      throw new DiagnosticScorePolicyError('DIAGNOSTIC_SCORE_WEIGHT_INVALID', '诊断维度权重必须是非负有限数');
    }
    for (const checkKey of definition.checkKeys) {
      if (assignedChecks.has(checkKey)) {
        throw new DiagnosticScorePolicyError('DIAGNOSTIC_SCORE_CHECK_DUPLICATED', '同一检查不能重复计入多个诊断维度');
      }
      assignedChecks.add(checkKey);
    }
  }
  if (diagnosticDimensions().every((dimension) => policy.dimensions[dimension].configuredWeight === 0)) {
    throw new DiagnosticScorePolicyError('DIAGNOSTIC_SCORE_WEIGHT_INVALID', '诊断维度权重总和必须大于 0');
  }
}

function diagnosticDimensions(): DiagnosticScoreDimension[] {
  return ['schema', 'meta', 'content', 'citation'];
}

function round(value: number, precision: number): number {
  const factor = 10 ** precision;
  return Math.round((value + Number.EPSILON) * factor) / factor;
}
