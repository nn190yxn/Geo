import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  NotFoundException
} from '@nestjs/common';
import type {
  CreateQuickStartSessionInput,
  KnowledgeSource,
  QuickStartDraft,
  QuickStartFactCandidate,
  QuickStartFactsStepInput,
  QuickStartQuestionCategory,
  QuickStartQuestionItem,
  QuickStartQuestionsDraft,
  QuickStartReadinessDraft,
  QuickStartReadinessStepInput,
  QuickStartSession,
  QuickStartStep,
  QuickStartStepUpdateInput,
  QuickStartWebsiteStepInput,
  SourcePagePlan,
  SourcePagePlanItem,
  SourcePageRole,
  PlatformConfig,
  PlatformConnectionSummary,
  TestPlanQuestion
} from '@geo-platform/shared-types';
import { PermissionsService } from '../permissions/permissions.service';
import { satisfiesRole } from '../../common/access-control/brand-access.policy';
import {
  QUICK_START_REPOSITORY,
  QuickStartVersionConflictError,
  type QuickStartRepositoryPort
} from './quick-start.repository.port';
import {
  WebsiteDiscoveryError,
  WebsiteDiscoveryService,
  type WebsiteDiscoveryResult
} from './website-discovery.service';

const steps: QuickStartStep[] = ['website', 'facts', 'questions', 'readiness'];
const factStatuses = new Set(['pending', 'confirmed', 'rejected', 'edited']);
const sourceTypes = new Set(['file', 'webpage', 'wechat_article', 'external_document']);
const questionCategories = new Set<QuickStartQuestionCategory>([
  'brand',
  'category',
  'location',
  'buying_decision',
  'competitor_comparison',
  'pain_point'
]);
const defaultPlatformCodes = ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'];
const platformNames: Record<string, string> = {
  doubao: '豆包',
  kimi: 'Kimi',
  deepseek: 'DeepSeek',
  qianwen: '通义千问',
  stepfun: '阶跃星辰'
};

@Injectable()
export class QuickStartService {
  constructor(
    @Inject(QUICK_START_REPOSITORY) private readonly repository: QuickStartRepositoryPort,
    private readonly permissionsService: PermissionsService,
    private readonly websiteDiscoveryService: WebsiteDiscoveryService
  ) {}

  async create(userId: string, brandId: string, input: CreateQuickStartSessionInput = {}): Promise<QuickStartSession> {
    await this.assertBrandAccess(userId, brandId, true);
    if (input.currentStep && !steps.includes(input.currentStep)) {
      throw validationError('QUICK_START_STEP_INVALID', '快速接入步骤无效');
    }
    return this.repository.create(brandId, input.currentStep);
  }

  async get(userId: string, brandId: string): Promise<QuickStartSession | null> {
    await this.assertBrandAccess(userId, brandId);
    return this.repository.findByBrandId(brandId);
  }

  async saveStep(
    userId: string,
    brandId: string,
    step: QuickStartStep,
    input: QuickStartStepUpdateInput
  ): Promise<QuickStartSession> {
    await this.assertBrandAccess(userId, brandId, true);
    if (!steps.includes(step)) throw validationError('QUICK_START_STEP_INVALID', '快速接入步骤无效');
    if (!Number.isInteger(input.version) || input.version < 1) {
      throw validationError('QUICK_START_VERSION_INVALID', 'version 必须是正整数');
    }

    const session = await this.repository.findByBrandId(brandId);
    if (!session) throw new NotFoundException('快速接入会话不存在');
    if (session.version !== input.version) throw versionConflict();

    const draft = structuredClone(session.draft);
    if (step === 'website') {
      const discovery = await this.saveWebsite(userId, brandId, input.data);
      draft.website = discovery.website;
      draft.facts = {
        candidates: mergeDiscoveredCandidates(draft.facts?.candidates ?? [], discovery.candidates)
      };
    }
    if (step === 'facts') {
      draft.facts = await this.saveFacts(userId, brandId, draft, input.data);
      if (!draft.questions?.items.length && hasConfirmedCriticalFacts(draft)) {
        draft.questions = { items: buildDefaultQuestions(draft) };
      }
    }
    if (step === 'questions') {
      draft.questions = normalizeQuestions(input.data);
      draft.readiness = await this.buildReadinessPreview(userId, brandId, draft.questions);
    }
    if (step === 'readiness') {
      draft.readiness = await this.saveReadiness(userId, brandId, draft, input.data);
    }

    const readinessCompleted = draft.readiness?.completed === true;
    try {
      const updated = await this.repository.update(brandId, input.version, {
        currentStep: maxStep(session.currentStep, nextStep(step)),
        status: readinessCompleted ? 'completed' : 'in_progress',
        draft,
        completedAt: readinessCompleted ? new Date().toISOString() : undefined
      });
      if (!updated) throw new NotFoundException('快速接入会话不存在');
      return updated;
    } catch (error) {
      if (error instanceof QuickStartVersionConflictError) throw versionConflict();
      throw error;
    }
  }

  private async assertBrandAccess(userId: string, brandId: string, write = false): Promise<void> {
    const brands = await this.permissionsService.listAccessibleBrands(userId);
    const brand = brands.find((item) => item.brandId === brandId);
    if (!brand) {
      throw new NotFoundException('品牌不存在或当前用户无权访问');
    }
    if (write && !satisfiesRole(brand.role, 'operator')) {
      throw new ForbiddenException({
        code: 'BRAND_RESOURCE_FORBIDDEN',
        message: '当前角色缺少 quick_start 操作权限，请申请 operator 角色。',
        authorization: {
          resource: 'quick_start',
          currentRole: brand.role,
          requiredRole: 'operator',
          applicationPath: '/brands?permissionRequest=quick_start'
        }
      });
    }
  }

  private async saveWebsite(userId: string, brandId: string, data: unknown) {
    const website = normalizeWebsite(data);
    const brand = await this.permissionsService.updateBrand(userId, brandId, {
      name: website.brandName,
      website: website.websiteUrl,
      targetCities: website.targetMarkets
    });
    if (!brand) throw new NotFoundException('品牌不存在或当前用户无权访问');

    const sources = await this.permissionsService.listKnowledgeSources(userId, brandId);
    let source = sources?.find((item) =>
      item.sourceType === 'webpage' && item.sourceUrl && canonicalUrl(item.sourceUrl) === website.websiteUrl
    );
    if (!source) {
      source = await this.permissionsService.createKnowledgeSource(userId, brandId, {
        name: `${website.brandName} 官网`,
        sourceType: 'webpage',
        sourceUrl: website.websiteUrl,
        status: 'pending'
      }) ?? undefined;
    }
    if (!source) throw validationError('QUICK_START_WEBSITE_SOURCE_FAILED', '官网知识来源创建失败');

    source = await this.permissionsService.updateKnowledgeSourceStatus(
      userId,
      brandId,
      source.id,
      'processing'
    ) ?? source;

    let discovered: WebsiteDiscoveryResult | undefined;
    try {
      discovered = await this.websiteDiscoveryService.discover(website.websiteUrl);
      source = await this.permissionsService.updateKnowledgeSourceStatus(
        userId,
        brandId,
        source.id,
        'completed'
      ) ?? { ...source, status: 'completed' };
    } catch (error) {
      source = await this.permissionsService.updateKnowledgeSourceStatus(
        userId,
        brandId,
        source.id,
        'failed',
        discoveryFailureMessage(error)
      ) ?? { ...source, status: 'failed' };
    }

    const sourcePagePlan = website.sourcePagePlan
      ? normalizeSourcePagePlan(website.websiteUrl, website.sourcePagePlan.items, true)
      : buildSourcePagePlan(website.websiteUrl, discovered);
    return {
      website: { ...website, crawlStatus: source.status, knowledgeSourceId: source.id, sourcePagePlan },
      candidates: buildDiscoveredCandidates(website, source, discovered)
    };
  }

  private async saveFacts(userId: string, brandId: string, draft: QuickStartDraft, data: unknown) {
    if (!isRecord(data) || !Array.isArray(data.candidates)) {
      throw validationError('QUICK_START_FACTS_INVALID', 'facts.data.candidates 必须是数组');
    }
    const sourceList = await this.permissionsService.listKnowledgeSources(userId, brandId);
    const sources = new Map((sourceList ?? []).map((source) => [source.id, source]));
    const existing = new Map((draft.facts?.candidates ?? []).map((candidate) => [candidate.id, candidate]));
    const incomingIds = new Set<string>();
    const candidates = data.candidates.map((value) => {
      const candidate = normalizeFactCandidate(value, sources, existing.get(isRecord(value) ? String(value.id ?? '') : ''));
      if (incomingIds.has(candidate.id)) {
        throw validationError('QUICK_START_FACT_ID_DUPLICATE', `事实候选 ID 重复：${candidate.id}`);
      }
      incomingIds.add(candidate.id);
      return candidate;
    });
    for (const candidate of existing.values()) {
      if (!incomingIds.has(candidate.id)) candidates.push(candidate);
    }
    return { candidates } satisfies QuickStartFactsStepInput;
  }

  private async buildReadinessPreview(
    userId: string,
    brandId: string,
    questions: QuickStartQuestionsDraft
  ): Promise<QuickStartReadinessDraft> {
    const selectedQuestions = questions.items.filter((item) => item.enabled);
    const targetPlatforms = uniqueQuestionPlatforms(selectedQuestions);
    const configs = await this.permissionsService.listPlatformConfigs(userId, brandId) ?? [];
    const connectionSummary = buildConnectionSummary(targetPlatforms, configs);
    return {
      completed: false,
      targetPlatforms,
      connectionSummary,
      estimatedSampleCount: selectedQuestions.length * targetPlatforms.length,
      estimatedDurationMinutes: Math.max(5, selectedQuestions.length * targetPlatforms.length * 2),
      executionMethod: inferExecutionMethod(connectionSummary),
      nextStep: getReadinessNextStep(connectionSummary)
    };
  }

  private async saveReadiness(
    userId: string,
    brandId: string,
    draft: QuickStartDraft,
    data: unknown
  ): Promise<QuickStartReadinessDraft> {
    const input = validateReadiness(draft, data);
    const preview = await this.buildReadinessPreview(userId, brandId, draft.questions!);
    if (!input.completed) return preview;

    const selectedQuestions = draft.questions!.items.filter((item) => item.enabled);
    const plan = await this.permissionsService.createTestPlan(userId, brandId, {
      name: '快速接入首轮 AI 回复监测计划',
      questions: selectedQuestions.map(toTestPlanQuestion),
      platformCodes: preview.targetPlatforms,
      executionMethod: preview.executionMethod
    });
    if (!plan) throw validationError('QUICK_START_TEST_PLAN_FAILED', '首轮监测计划创建失败');
    return {
      completed: true,
      targetPlatforms: plan.platformCodes,
      connectionSummary: plan.connectionSummary,
      estimatedSampleCount: plan.questions.length * plan.platformCodes.length,
      estimatedDurationMinutes: plan.estimatedDurationMinutes,
      executionMethod: plan.executionMethod,
      nextStep: '进入 AI 回复监测并开始执行计划',
      testPlanId: plan.id
    };
  }
}

function buildDiscoveredCandidates(
  website: QuickStartWebsiteStepInput,
  source: KnowledgeSource,
  discovered?: WebsiteDiscoveryResult
): QuickStartFactCandidate[] {
  const sourceTitle = discovered?.title ?? `${website.brandName} 官网`;
  const sourceExcerpt = discovered?.excerpt
    ?? discovered?.description
    ?? discovered?.title
    ?? `用户提交的官网首页：${website.websiteUrl}`;
  const common = {
    sourceId: source.id,
    sourceType: 'webpage' as const,
    url: website.websiteUrl,
    title: sourceTitle,
    excerpt: sourceExcerpt,
    status: 'pending' as const
  };
  const normalizedTitle = discovered?.title?.toLocaleLowerCase();
  const normalizedBrandName = website.brandName.toLocaleLowerCase();
  const candidates: QuickStartFactCandidate[] = [
    {
      ...common,
      id: 'quick_start_name',
      fieldKey: 'name',
      extractedValue: website.brandName,
      confidence: normalizedTitle?.includes(normalizedBrandName) ? 0.95 : discovered ? 0.75 : 0.6,
      isCritical: true
    },
    {
      ...common,
      id: 'quick_start_website',
      fieldKey: 'website',
      extractedValue: website.websiteUrl,
      confidence: 0.99,
      isCritical: true
    },
    {
      ...common,
      id: 'quick_start_target_markets',
      fieldKey: 'targetMarkets',
      extractedValue: website.targetMarkets.join('、'),
      confidence: 0.7,
      isCritical: true
    }
  ];
  if (discovered?.description) {
    candidates.push({
      ...common,
      id: 'quick_start_intro',
      fieldKey: 'intro',
      extractedValue: discovered.description,
      confidence: 0.85,
      isCritical: false
    });
  }
  return candidates;
}

function mergeDiscoveredCandidates(
  existing: QuickStartFactCandidate[],
  discovered: QuickStartFactCandidate[]
): QuickStartFactCandidate[] {
  const existingById = new Map(existing.map((candidate) => [candidate.id, candidate]));
  const discoveredIds = new Set(discovered.map((candidate) => candidate.id));
  return [
    ...discovered.map((candidate) => {
      const current = existingById.get(candidate.id);
      return current && current.status !== 'pending' ? current : candidate;
    }),
    ...existing.filter((candidate) => !discoveredIds.has(candidate.id))
  ];
}

function discoveryFailureMessage(error: unknown): string {
  return error instanceof WebsiteDiscoveryError
    ? `${error.message}，请人工确认或录入品牌事实`
    : '官网发现失败，请人工确认或录入品牌事实';
}

function normalizeWebsite(data: unknown): QuickStartWebsiteStepInput {
  if (!isRecord(data)) throw validationError('QUICK_START_WEBSITE_INVALID', 'website.data 必须是对象');
  const brandName = requiredString(data.brandName, 'brandName');
  const websiteUrl = requiredString(data.websiteUrl, 'websiteUrl');
  let parsedUrl: URL;
  try {
    parsedUrl = new URL(websiteUrl);
  } catch {
    throw validationError('QUICK_START_WEBSITE_URL_INVALID', 'websiteUrl 必须是有效的 HTTP(S) URL');
  }
  if (!['http:', 'https:'].includes(parsedUrl.protocol)) {
    throw validationError('QUICK_START_WEBSITE_URL_INVALID', 'websiteUrl 必须是有效的 HTTP(S) URL');
  }
  const targetMarkets = uniqueStrings(data.targetMarkets, 'targetMarkets');
  if (targetMarkets.length === 0) {
    throw validationError('QUICK_START_TARGET_MARKETS_REQUIRED', '至少需要一个目标市场');
  }
  const competitors = data.competitors === undefined ? undefined : uniqueStrings(data.competitors, 'competitors');
  const sourcePagePlan = data.sourcePagePlan === undefined
    ? undefined
    : normalizeSourcePagePlanInput(data.sourcePagePlan);
  return { brandName, websiteUrl: parsedUrl.toString(), targetMarkets, competitors, sourcePagePlan };
}

export function buildSourcePagePlan(websiteUrl: string, discovered?: WebsiteDiscoveryResult): SourcePagePlan {
  const homepage = new URL(websiteUrl);
  homepage.hash = '';
  const candidates = [
    { url: homepage.toString(), title: discovered?.title ?? '官网首页' },
    ...(discovered?.candidatePages ?? [])
  ];
  const meaningful = candidates.filter((candidate, index) => index === 0 || classifySourcePage(candidate.url, candidate.title) !== 'other');
  const selected = meaningful.length > 1 ? meaningful : [
    ...meaningful,
    ...deterministicSourcePageFallbacks(homepage)
  ];
  const uniqueCandidates = [...new Map(selected.map((candidate) => [canonicalSourcePageUrl(candidate.url), candidate])).values()];
  return normalizeSourcePagePlan(websiteUrl, uniqueCandidates.map((candidate, index) => {
    const sourceRole = classifySourcePage(candidate.url, candidate.title);
    return {
      id: sourcePageId(candidate.url),
      url: candidate.url,
      title: candidate.title ?? sourceRoleLabels[sourceRole],
      sourceRole,
      selectionReason: getSourcePageSelectionReason(sourceRole, index > 0 && !discovered?.candidatePages?.length),
      included: sourceRole === 'home' || Boolean(discovered?.candidatePages?.some((page) => page.url === candidate.url)),
      processingStatus: 'planned'
    };
  }), false);
}

function normalizeSourcePagePlanInput(value: unknown): Pick<SourcePagePlan, 'items'> {
  if (!isRecord(value) || !Array.isArray(value.items)) {
    throw validationError('QUICK_START_SOURCE_PAGE_PLAN_INVALID', 'sourcePagePlan.items 必须是数组');
  }
  return { items: value.items as SourcePagePlanItem[] };
}

function normalizeSourcePagePlan(websiteUrl: string, values: unknown[], confirmed: boolean): SourcePagePlan {
  if (values.length === 0 || values.length > 30) {
    throw validationError('QUICK_START_SOURCE_PAGE_PLAN_INVALID', '来源页面计划需要包含 1 至 30 个页面');
  }
  const website = new URL(websiteUrl);
  const urls = new Set<string>();
  const items = values.map((value) => {
    if (!isRecord(value)) throw validationError('QUICK_START_SOURCE_PAGE_INVALID', '来源页面必须是对象');
    let url: URL;
    try {
      url = new URL(requiredString(value.url, 'sourcePage.url'), website);
    } catch {
      throw validationError('QUICK_START_SOURCE_PAGE_URL_INVALID', '来源页面 URL 无效');
    }
    url = new URL(canonicalSourcePageUrl(url.toString()));
    if (!['http:', 'https:'].includes(url.protocol) || url.origin !== website.origin || url.username || url.password) {
      throw validationError('QUICK_START_SOURCE_PAGE_ORIGIN_INVALID', '来源页面必须使用官网同源 HTTP(S) URL');
    }
    const normalizedUrl = url.toString();
    if (urls.has(normalizedUrl)) throw validationError('QUICK_START_SOURCE_PAGE_DUPLICATE', `来源页面重复：${normalizedUrl}`);
    urls.add(normalizedUrl);
    const sourceRole = String(value.sourceRole ?? classifySourcePage(normalizedUrl, optionalString(value.title)));
    if (!sourcePageRoles.has(sourceRole as SourcePageRole)) {
      throw validationError('QUICK_START_SOURCE_PAGE_ROLE_INVALID', `来源页面角色无效：${sourceRole}`);
    }
    const processingStatus = String(value.processingStatus ?? 'planned');
    if (!sourcePageStatuses.has(processingStatus as SourcePagePlanItem['processingStatus'])) {
      throw validationError('QUICK_START_SOURCE_PAGE_STATUS_INVALID', `来源页面状态无效：${processingStatus}`);
    }
    return {
      id: optionalString(value.id) ?? sourcePageId(normalizedUrl),
      url: normalizedUrl,
      title: optionalString(value.title) ?? sourceRoleLabels[sourceRole as SourcePageRole],
      sourceRole: sourceRole as SourcePageRole,
      selectionReason: optionalString(value.selectionReason) ?? getSourcePageSelectionReason(sourceRole as SourcePageRole, false),
      included: value.included !== false,
      processingStatus: processingStatus as SourcePagePlanItem['processingStatus'],
      errorMessage: optionalString(value.errorMessage)
    };
  });
  if (!items.some((item) => item.included)) {
    throw validationError('QUICK_START_SOURCE_PAGE_SELECTION_REQUIRED', '至少需要纳入一个官网来源页面');
  }
  return { items, ...(confirmed ? { confirmedAt: new Date().toISOString() } : {}) };
}

const sourcePageRoles = new Set<SourcePageRole>(['home', 'product', 'about', 'faq', 'case', 'contact', 'policy', 'other']);
const sourcePageStatuses = new Set<SourcePagePlanItem['processingStatus']>(['planned', 'processing', 'completed', 'failed']);
const sourceRoleLabels: Record<SourcePageRole, string> = {
  home: '官网首页', product: '产品与服务', about: '关于品牌', faq: '常见问题', case: '客户案例', contact: '联系信息', policy: '政策说明', other: '其他资料'
};

function classifySourcePage(url: string, title?: string): SourcePageRole {
  const parsed = new URL(url);
  if (parsed.pathname === '/' || parsed.pathname === '') return 'home';
  const value = `${parsed.pathname} ${title ?? ''}`.toLowerCase();
  if (/(product|service|solution|shop|产品|服务|解决方案)/.test(value)) return 'product';
  if (/(about|company|brand|关于|公司|品牌)/.test(value)) return 'about';
  if (/(faq|help|question|常见问题|帮助)/.test(value)) return 'faq';
  if (/(case|customer|story|案例|客户)/.test(value)) return 'case';
  if (/(contact|location|store|联系|门店|地址)/.test(value)) return 'contact';
  if (/(privacy|policy|terms|legal|隐私|政策|条款)/.test(value)) return 'policy';
  return 'other';
}

function getSourcePageSelectionReason(role: SourcePageRole, fallback: boolean): string {
  if (fallback) return `首页未发现明确链接，按常见官网结构生成${sourceRoleLabels[role]}候选，等待人工确认。`;
  const reasons: Record<SourcePageRole, string> = {
    home: '首页用于确认品牌主体、核心定位和主要业务。',
    product: '产品或服务页用于提取具体供给、卖点和适用场景。',
    about: '关于页面用于确认品牌背景、资质和可信证明。',
    faq: 'FAQ 页面用于补充用户问题、决策信息和标准表达。',
    case: '案例页面用于提取客户场景、结果和可验证证据。',
    contact: '联系页面用于确认服务地域、门店和官方联系方式。',
    policy: '政策页面用于识别服务边界、承诺和合规信息。',
    other: '该同源页面可能包含可补充的品牌资料。'
  };
  return reasons[role];
}

function deterministicSourcePageFallbacks(homepage: URL) {
  return [
    ['products', '产品与服务'], ['about', '关于品牌'], ['faq', '常见问题'], ['cases', '客户案例'], ['contact', '联系信息'], ['privacy', '政策说明']
  ].map(([path, title]) => ({ url: new URL(path, homepage).toString(), title }));
}

function sourcePageId(url: string): string {
  let hash = 0;
  for (const character of url) hash = ((hash * 31) + character.charCodeAt(0)) >>> 0;
  return `source_page_${hash.toString(36)}`;
}

function canonicalSourcePageUrl(value: string): string {
  const url = new URL(value);
  url.hash = '';
  for (const key of [...url.searchParams.keys()]) {
    if (/^(?:utm_.+|fbclid|gclid)$/i.test(key)) url.searchParams.delete(key);
  }
  url.searchParams.sort();
  if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
  return url.toString();
}

function normalizeFactCandidate(
  value: unknown,
  sources: Map<string, KnowledgeSource>,
  existing?: QuickStartFactCandidate
): QuickStartFactCandidate {
  if (!isRecord(value)) throw validationError('QUICK_START_FACT_INVALID', '事实候选必须是对象');
  const id = requiredString(value.id, 'candidate.id');
  const status = String(value.status ?? '');
  if (!factStatuses.has(status)) {
    throw validationError('QUICK_START_FACT_STATUS_INVALID', `事实候选 ${id} 的确认状态无效`);
  }
  const editedValue = optionalString(value.editedValue);
  if (status === 'edited' && !editedValue) {
    throw validationError('QUICK_START_FACT_EDIT_REQUIRED', `事实候选 ${id} 缺少 editedValue`);
  }
  if (existing) {
    return { ...existing, status: status as QuickStartFactCandidate['status'], editedValue };
  }

  const sourceId = requiredString(value.sourceId, 'candidate.sourceId');
  const sourceType = String(value.sourceType ?? '');
  const source = sources.get(sourceId);
  if (!source || source.sourceType !== sourceType || !sourceTypes.has(sourceType)) {
    throw validationError('QUICK_START_FACT_SOURCE_INVALID', `事实候选 ${id} 的来源无效`);
  }
  const confidence = Number(value.confidence);
  if (!Number.isFinite(confidence) || confidence < 0 || confidence > 1) {
    throw validationError('QUICK_START_FACT_CONFIDENCE_INVALID', `事实候选 ${id} 的 confidence 必须位于 0 到 1 之间`);
  }
  const url = optionalString(value.url);
  if (url && source.sourceUrl && canonicalUrl(url) !== canonicalUrl(source.sourceUrl)) {
    throw validationError('QUICK_START_FACT_SOURCE_INVALID', `事实候选 ${id} 的来源 URL 不匹配`);
  }
  if (typeof value.isCritical !== 'boolean') {
    throw validationError('QUICK_START_FACT_CRITICAL_FLAG_INVALID', `事实候选 ${id} 缺少 isCritical 标记`);
  }
  return {
    id,
    fieldKey: requiredString(value.fieldKey, 'candidate.fieldKey'),
    extractedValue: requiredString(value.extractedValue, 'candidate.extractedValue'),
    editedValue,
    confidence,
    status: status as QuickStartFactCandidate['status'],
    isCritical: value.isCritical,
    sourceId,
    sourceType: sourceType as QuickStartFactCandidate['sourceType'],
    url,
    title: optionalString(value.title),
    excerpt: requiredString(value.excerpt, 'candidate.excerpt')
  };
}

function normalizeQuestions(data: unknown): QuickStartQuestionsDraft {
  if (!isRecord(data) || !Array.isArray(data.items)) {
    throw validationError('QUICK_START_QUESTIONS_INVALID', 'questions.data.items 必须是数组');
  }
  const ids = new Set<string>();
  const items = data.items.map((value) => {
    if (!isRecord(value)) throw validationError('QUICK_START_QUESTION_INVALID', '问题项必须是对象');
    const id = requiredString(value.id, 'question.id');
    if (ids.has(id)) throw validationError('QUICK_START_QUESTION_ID_DUPLICATE', `问题 ID 重复：${id}`);
    ids.add(id);
    const category = String(value.category ?? '');
    if (!questionCategories.has(category as QuickStartQuestionCategory)) {
      throw validationError('QUICK_START_QUESTION_CATEGORY_INVALID', `问题 ${id} 的类别无效`);
    }
    const targetPlatforms = uniqueStrings(value.targetPlatforms, `question.${id}.targetPlatforms`);
    if (targetPlatforms.length === 0) {
      throw validationError('QUICK_START_QUESTION_PLATFORMS_REQUIRED', `问题 ${id} 至少需要一个目标平台`);
    }
    return {
      id,
      category: category as QuickStartQuestionCategory,
      question: requiredString(value.question, 'question.question'),
      enabled: value.enabled !== false,
      targetPlatforms
    };
  });
  if (items.filter((item) => item.enabled).length === 0) {
    throw validationError('QUICK_START_QUESTION_SELECTION_REQUIRED', '至少需要选择一个高价值问题');
  }
  return { items, metadata: normalizeMetadata(data.metadata) };
}

function validateReadiness(draft: QuickStartDraft, data: unknown): QuickStartReadinessStepInput {
  if (!isRecord(data) || typeof data.completed !== 'boolean') {
    throw validationError('QUICK_START_READINESS_INVALID', 'readiness.data.completed 必须是布尔值');
  }
  if (data.completed) {
    const criticalFacts = draft.facts?.candidates.filter((candidate) => candidate.isCritical) ?? [];
    const pending = criticalFacts.filter((candidate) => !['confirmed', 'edited'].includes(candidate.status));
    if (criticalFacts.length === 0 || pending.length > 0) {
      throw validationError(
        'QUICK_START_READINESS_BLOCKED',
        pending.length > 0
          ? `仍有未确认的关键事实：${pending.map((candidate) => candidate.id).join(', ')}`
          : '至少需要确认一个关键事实后才能完成监测准备'
      );
    }
    if (!draft.questions?.items.some((item) => item.enabled)) {
      throw validationError('QUICK_START_QUESTION_SELECTION_REQUIRED', '至少需要选择一个高价值问题');
    }
  }
  return { completed: data.completed };
}

function hasConfirmedCriticalFacts(draft: QuickStartDraft): boolean {
  const criticalFacts = draft.facts?.candidates.filter((candidate) => candidate.isCritical) ?? [];
  return criticalFacts.length > 0 && criticalFacts.every((candidate) => ['confirmed', 'edited'].includes(candidate.status));
}

function buildDefaultQuestions(draft: QuickStartDraft): QuickStartQuestionItem[] {
  const brandName = factValue(draft, ['name']) ?? draft.website?.brandName ?? '当前品牌';
  const targetMarket = factValue(draft, ['targetMarkets']) ?? draft.website?.targetMarkets[0] ?? '目标市场';
  const offering = factValue(draft, ['offerings']) ?? '相关产品或服务';
  const competitor = draft.website?.competitors?.[0] ?? '同类品牌';
  const questions: Array<[QuickStartQuestionCategory, string]> = [
    ['brand', `${brandName}是什么品牌，主要提供哪些产品或服务？`],
    ['category', `${targetMarket}有哪些值得推荐的${offering}？`],
    ['location', `在${targetMarket}选择${offering}时，${brandName}是否值得推荐？`],
    ['buying_decision', `购买或选择${offering}时，最应该关注哪些因素？`],
    ['competitor_comparison', `${brandName}与${competitor}相比有哪些差异，分别适合哪些需求？`],
    ['pain_point', `用户在选择${offering}时常见痛点有哪些，${brandName}如何解决？`]
  ];
  return questions.map(([category, question]) => ({
    id: `quick_start_question_${category}`,
    category,
    question,
    enabled: true,
    targetPlatforms: [...defaultPlatformCodes]
  }));
}

function factValue(draft: QuickStartDraft, fieldKeys: string[]): string | undefined {
  const candidate = draft.facts?.candidates.find((item) => (
    fieldKeys.includes(item.fieldKey) && ['confirmed', 'edited'].includes(item.status)
  ));
  return candidate ? candidate.editedValue ?? candidate.extractedValue : undefined;
}

function uniqueQuestionPlatforms(items: QuickStartQuestionItem[]): string[] {
  return [...new Set(items.flatMap((item) => item.targetPlatforms).map((item) => item.trim()).filter(Boolean))];
}

function buildConnectionSummary(platformCodes: string[], configs: PlatformConfig[]): PlatformConnectionSummary[] {
  return platformCodes.map((platformCode) => {
    const config = configs.find((item) => item.platformCode === platformCode && item.enabled);
    if (config) {
      return {
        platformCode,
        name: config.name,
        methods: config.availableMethods,
        status: config.connectionStatus,
        hasCredential: config.hasCredential,
        message: config.nextAction
      };
    }
    return {
      platformCode,
      name: platformNames[platformCode] ?? platformCode,
      methods: ['browser', 'manual'],
      status: 'browser_available',
      hasCredential: false,
      message: '可先使用浏览器辅助或手动录入完成首轮监测。'
    };
  });
}

function inferExecutionMethod(connectionSummary: PlatformConnectionSummary[]): QuickStartReadinessDraft['executionMethod'] {
  if (connectionSummary.some((item) => item.status === 'ready' && item.methods.includes('api'))) return 'api';
  if (connectionSummary.some((item) => item.methods.includes('browser'))) return 'browser';
  return 'manual';
}

function getReadinessNextStep(connectionSummary: PlatformConnectionSummary[]): string {
  if (connectionSummary.some((item) => item.status === 'ready' && item.methods.includes('api'))) {
    return '确认问题后开始自动监测';
  }
  if (connectionSummary.some((item) => item.methods.includes('browser'))) {
    return '进入 AI 回复监测，按提示完成浏览器辅助采集';
  }
  return '进入 AI 回复监测并粘贴真实回答';
}

function toTestPlanQuestion(item: QuickStartQuestionItem): TestPlanQuestion {
  const purposeMap: Record<QuickStartQuestionCategory, TestPlanQuestion['purposes']> = {
    brand: ['brand_mentioned', 'value_prop_accuracy'],
    category: ['rank_first', 'value_prop_accuracy'],
    location: ['rank_first', 'brand_mentioned'],
    buying_decision: ['value_prop_accuracy', 'rank_first'],
    competitor_comparison: ['competitor_presence', 'rank_first'],
    pain_point: ['value_prop_accuracy', 'risk_expression']
  };
  return {
    question: item.question,
    purposes: purposeMap[item.category],
    targetPlatforms: item.targetPlatforms
  };
}

function nextStep(step: QuickStartStep): QuickStartStep {
  return steps[Math.min(steps.indexOf(step) + 1, steps.length - 1)];
}

function maxStep(left: QuickStartStep, right: QuickStartStep): QuickStartStep {
  return steps[Math.max(steps.indexOf(left), steps.indexOf(right))];
}

function requiredString(value: unknown, field: string): string {
  if (typeof value !== 'string' || !value.trim()) {
    throw validationError('QUICK_START_FIELD_REQUIRED', `${field} 不能为空`);
  }
  return value.trim();
}

function optionalString(value: unknown): string | undefined {
  return typeof value === 'string' && value.trim() ? value.trim() : undefined;
}

function canonicalUrl(value: string): string {
  try {
    return new URL(value).toString();
  } catch {
    return value.trim();
  }
}

function uniqueStrings(value: unknown, field: string): string[] {
  if (!Array.isArray(value) || value.some((item) => typeof item !== 'string')) {
    throw validationError('QUICK_START_FIELD_INVALID', `${field} 必须是字符串数组`);
  }
  return [...new Set(value.map((item) => item.trim()).filter(Boolean))];
}

function normalizeMetadata(value: unknown): Record<string, string | number | boolean | null> | undefined {
  if (value === undefined) return undefined;
  if (!isRecord(value) || Object.values(value).some((item) => item !== null && !['string', 'number', 'boolean'].includes(typeof item))) {
    throw validationError('QUICK_START_METADATA_INVALID', 'metadata 仅支持字符串、数值、布尔值和 null');
  }
  return value as Record<string, string | number | boolean | null>;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function validationError(code: string, message: string): BadRequestException {
  return new BadRequestException({ code, message });
}

function versionConflict(): ConflictException {
  return new ConflictException({
    code: 'QUICK_START_VERSION_CONFLICT',
    message: '快速接入会话已被更新，请重新获取最新版本后再保存'
  });
}
