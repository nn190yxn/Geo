import type {
  MeasurementMetric,
  MeasurementScope,
  MeasurementTrendSegment,
  MonitoringRunDetail,
  SampleEvidenceMeasurementStatus
} from '@geo-platform/shared-types';

const comparableFields = ['platformCode', 'modelName', 'clientSurface', 'collectionMethod', 'searchEnabled', 'market', 'language'] as const;

export function isComparableMeasurementScope(left: MeasurementScope, right: MeasurementScope): boolean {
  return comparableFields.every((field) => left[field] === right[field]);
}

export function resolveBaselineVersion(
  previousScopes: MeasurementScope[],
  scope: Omit<MeasurementScope, 'baselineVersion'>,
  createVersion: () => string
): string {
  const previous = previousScopes.find((item) => isComparableMeasurementScope(item, { ...scope, baselineVersion: item.baselineVersion }));
  return previous?.baselineVersion && previous.baselineVersion !== 'unknown' ? previous.baselineVersion : createVersion();
}

export function buildMeasurementTrendSegments(runs: MonitoringRunDetail[]): MeasurementTrendSegment[] {
  const realRuns = runs.filter((run): run is MonitoringRunDetail & { response: NonNullable<MonitoringRunDetail['response']> } => (
    run.platformCode !== 'mock_ai' && Boolean(run.response?.rawText.trim())
  ));
  const groups = new Map<string, typeof realRuns>();
  realRuns.forEach((run) => {
    const version = run.response.baselineVersion;
    const comparableScopeKey = JSON.stringify(comparableFields.map((field) => run.response[field]));
    const key = version === 'unknown' ? `${version}:${run.id}` : JSON.stringify([version, comparableScopeKey]);
    groups.set(key, [...(groups.get(key) ?? []), run]);
  });

  return Array.from(groups.values()).map((group) => {
    const ordered = [...group].sort((left, right) => left.response.respondedAt.localeCompare(right.response.respondedAt));
    return {
      baselineVersion: ordered[0].response.baselineVersion,
      measurementScope: pickScope(ordered[0].response),
      measurementStatus: measurementStatus(ordered.length),
      startedAt: ordered[0].response.respondedAt,
      endedAt: ordered.at(-1)?.response.respondedAt ?? ordered[0].response.respondedAt,
      runIds: ordered.map((run) => run.id),
      metrics: buildMeasurementMetrics(ordered)
    };
  }).sort((left, right) => left.endedAt.localeCompare(right.endedAt));
}

export function buildMeasurementMetrics(runs: MonitoringRunDetail[]): MeasurementMetric[] {
  const analyzed = runs.filter((run): run is MonitoringRunDetail & { analysis: NonNullable<MonitoringRunDetail['analysis']>; response: NonNullable<MonitoringRunDetail['response']> } => (
    Boolean(run.analysis && run.response?.rawText.trim())
  ));
  const status = measurementStatus(analyzed.length);
  const metric = (code: MeasurementMetric['code'], label: string, total: number, denominator = analyzed.length): MeasurementMetric => ({
    code,
    label,
    measurementStatus: denominator === 0 ? 'unmeasured' : measurementStatus(denominator),
    sampleCount: denominator,
    value: denominator === 0 ? null : Math.round((total / denominator) * 100)
  });
  const cited = analyzed.filter((run) => run.response.citations.length > 0);

  return [
    metric('mention_rate', '品牌提及率', analyzed.filter((run) => run.analysis.brandMentioned).length),
    metric('top3_rate', 'Top 3 推荐率', analyzed.filter((run) => run.analysis.brandRank !== null && run.analysis.brandRank <= 3).length),
    metric('fact_accuracy', '事实准确度', analyzed.reduce((sum, run) => sum + run.analysis.accuracyScore, 0) / 100),
    metric('citation_recall', '引用召回率', cited.length),
    {
      ...metric('citation_accuracy', '引用准确度', cited.reduce((sum, run) => sum + run.analysis.citationScore, 0) / 100, cited.length),
      measurementStatus: cited.length === 0 ? 'unmeasured' : measurementStatus(cited.length)
    }
  ].map((item) => ({ ...item, measurementStatus: item.measurementStatus === 'unmeasured' ? item.measurementStatus : status === 'unmeasured' ? status : item.measurementStatus }));
}

function measurementStatus(sampleCount: number): SampleEvidenceMeasurementStatus {
  if (sampleCount === 0) return 'unmeasured';
  return sampleCount < 3 ? 'insufficient' : 'valid';
}

function pickScope(scope: MeasurementScope): MeasurementScope {
  return {
    platformCode: scope.platformCode,
    modelName: scope.modelName,
    collectionMethod: scope.collectionMethod,
    clientSurface: scope.clientSurface,
    searchEnabled: scope.searchEnabled,
    market: scope.market,
    language: scope.language,
    evidenceLevel: scope.evidenceLevel,
    manualConfirmed: scope.manualConfirmed,
    baselineVersion: scope.baselineVersion
  };
}
