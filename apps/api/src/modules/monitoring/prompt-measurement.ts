import type {
  BrandDetail,
  MeasurementMetric,
  MeasurementScope,
  MonitoringRunDetail,
  PromptKind,
  PromptMeasurementBreakdown,
  PromptMeasurementSection,
  SampleEvidenceMeasurementStatus
} from '@geo-platform/shared-types';

const seriesScopeFields = [
  'platformCode',
  'modelName',
  'clientSurface',
  'collectionMethod',
  'searchEnabled',
  'market',
  'language',
  'baselineVersion'
] as const;

export function classifyPromptKind(question: string, brand: Pick<BrandDetail, 'name' | 'aliases' | 'website'>): PromptKind {
  const normalizedQuestion = normalizeText(question);
  const names = [brand.name, ...brand.aliases].map(normalizeText).filter(Boolean);
  if (names.some((name) => includesBrandTerm(normalizedQuestion, name))) return 'brand_probe';

  const ownedHost = normalizeHostname(brand.website);
  return ownedHost && includesHostname(normalizedQuestion, ownedHost) ? 'brand_probe' : 'discovery';
}

export function isOwnedDomainCitation(citation: string, website?: string): boolean {
  const ownedHost = normalizeHostname(website);
  const citationHost = normalizeHostname(citation);
  return Boolean(ownedHost && citationHost && (citationHost === ownedHost || citationHost.endsWith(`.${ownedHost}`)));
}

export function buildPromptMeasurementBreakdown(
  runs: MonitoringRunDetail[],
  brand: Pick<BrandDetail, 'name' | 'aliases' | 'website'>
): PromptMeasurementBreakdown {
  const analyzed = runs.filter((run): run is MonitoringRunDetail & {
    analysis: NonNullable<MonitoringRunDetail['analysis']>;
    response: NonNullable<MonitoringRunDetail['response']>;
  } => run.platformCode !== 'mock_ai' && Boolean(run.analysis && run.response?.rawText.trim()));
  const byKind = (kind: PromptKind) => analyzed.filter((run) => resolveRunPromptKind(run, brand) === kind);
  const discoveryRuns = byKind('discovery');
  const brandProbeRuns = byKind('brand_probe');
  const seriesGroups = new Map<string, typeof analyzed>();

  analyzed.forEach((run) => {
    const kind = resolveRunPromptKind(run, brand);
    const key = JSON.stringify([kind, ...seriesScopeFields.map((field) => run.response[field])]);
    seriesGroups.set(key, [...(seriesGroups.get(key) ?? []), run]);
  });

  return {
    discovery: buildSection('discovery', discoveryRuns, brand.website),
    brandProbe: buildSection('brand_probe', brandProbeRuns, brand.website),
    series: Array.from(seriesGroups.values()).map((group) => ({
      ...buildSection(resolveRunPromptKind(group[0], brand), group, brand.website),
      measurementScope: pickScope(group[0].response)
    }))
  };
}

function buildSection(
  promptKind: PromptKind,
  runs: Array<MonitoringRunDetail & { analysis: NonNullable<MonitoringRunDetail['analysis']>; response: NonNullable<MonitoringRunDetail['response']> }>,
  website?: string
): PromptMeasurementSection {
  const metric = (code: MeasurementMetric['code'], label: string, total: number): MeasurementMetric => ({
    code,
    label,
    measurementStatus: measurementStatus(runs.length),
    sampleCount: runs.length,
    value: runs.length === 0 ? null : Math.round((total / runs.length) * 100)
  });
  const metrics = promptKind === 'discovery'
    ? [
        metric('mention_rate', '无提示提及率', runs.filter((run) => run.analysis.brandMentioned).length),
        metric('first_rate', '首位推荐率', runs.filter((run) => run.analysis.brandRank === 1).length),
        metric('top3_rate', 'Top 3 推荐率', runs.filter((run) => run.analysis.brandRank !== null && run.analysis.brandRank <= 3).length)
      ]
    : [
        metric('recognition_rate', '品牌识别率', runs.filter((run) => run.analysis.brandMentioned).length),
        metric('fact_accuracy', '事实准确度', runs.reduce((sum, run) => sum + run.analysis.accuracyScore, 0) / 100),
        metric('owned_domain_citation_rate', '自有域名引用率', runs.filter((run) => run.response.citations.some((citation) => isOwnedDomainCitation(citation, website))).length)
      ];

  return { promptKind, measurementStatus: measurementStatus(runs.length), sampleCount: runs.length, runIds: runs.map((run) => run.id), metrics };
}

function resolveRunPromptKind(run: MonitoringRunDetail, brand: Pick<BrandDetail, 'name' | 'aliases' | 'website'>): PromptKind {
  const classified = classifyPromptKind(run.promptText, brand);
  return classified === 'brand_probe' ? classified : run.promptKind ?? classified;
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

function normalizeText(value?: string): string {
  return value?.normalize('NFKC').toLocaleLowerCase().replace(/\s+/g, ' ').trim() ?? '';
}

function includesBrandTerm(question: string, term: string): boolean {
  if (!term) return false;
  if (/[^\p{Script=Latin}\p{Number}\s._-]/u.test(term)) return question.includes(term);
  const escaped = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&').replace(/\s+/g, '\\s+');
  return new RegExp(`(^|[^\\p{L}\\p{N}])${escaped}($|[^\\p{L}\\p{N}])`, 'u').test(question);
}

function includesHostname(question: string, hostname: string): boolean {
  const escaped = hostname.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  return new RegExp(`(^|[^a-z0-9.-])(?:[a-z0-9-]+\\.)*${escaped}($|[^a-z0-9.-])`, 'i').test(question);
}

function normalizeHostname(value?: string): string {
  if (!value?.trim()) return '';
  try {
    const url = new URL(value.includes('://') ? value : `https://${value}`);
    return url.hostname.toLocaleLowerCase().replace(/^www\./, '').replace(/\.$/, '');
  } catch {
    return '';
  }
}
