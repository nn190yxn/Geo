import { renderToStaticMarkup } from 'react-dom/server';
import type { ApiResponse, QuickStartFactCandidate, QuickStartSession } from '@geo-platform/shared-types';
import { describe, expect, it, vi } from 'vitest';
import { getOrCreateQuickStartSession, QuickStartWizardView } from './QuickStartWizard';
import { restoreQuickStartEditorState } from './quickStartState';

describe('QuickStartWizard', () => {
  it('loads first and creates a session only when none exists', async () => {
    const session = createSession();
    const get = vi.fn(async () => failure<QuickStartSession>('REQUEST_ERROR', '快速接入会话不存在'));
    const post = vi.fn(async () => success(session));

    await expect(getOrCreateQuickStartSession('brand_demo', get, post)).resolves.toEqual(success(session));
    expect(get).toHaveBeenCalledWith('/brands/brand_demo/quick-start-session');
    expect(post).toHaveBeenCalledWith('/brands/brand_demo/quick-start-session', {});

    get.mockResolvedValueOnce(failure('API_UNAVAILABLE', '服务不可用'));
    await getOrCreateQuickStartSession('brand_demo', get, post);
    expect(post).toHaveBeenCalledTimes(1);
  });

  it('renders four steps, source evidence, confidence, status, and responsive structure', () => {
    const session = createSession();
    const editor = { ...restoreQuickStartEditorState(session), activeStep: 'facts' as const };
    const markup = renderView(session, editor);

    for (const text of ['官网信息', '事实确认', '问题选择', '执行准备', '品牌与业务介绍', '原始值', '关于追光小牛', '来源 URL：https://example.com/about', '专注 3 至 12 岁儿童运动成长', '置信度 91%', '待确认']) {
      expect(markup).toContain(text);
    }
    expect(markup).toContain('quick-start-shell');
    expect(markup).toContain('desktop-sidebar mobile-stack');
    expect(markup).toContain('quick-start-fact-grid');
  });

  it('shows empty-question guidance and readiness gate', () => {
    const session = createSession();
    const restored = restoreQuickStartEditorState({ ...session, draft: { ...session.draft, questions: { items: [] } } });
    const questionsMarkup = renderView(session, { ...restored, activeStep: 'questions' });
    expect(questionsMarkup).toContain('当前还没有推荐问题');
    expect(questionsMarkup).toContain('请先确认关键品牌事实');

    const blockedMarkup = renderView(session, { ...restored, activeStep: 'readiness' });
    expect(blockedMarkup).toContain('暂时无法完成执行准备');
    expect(blockedMarkup).toContain('disabled');

    const confirmed = { ...session, draft: { ...session.draft, facts: { candidates: [createFact({ status: 'confirmed' })] } } };
    const readyMarkup = renderView(confirmed, { ...restoreQuickStartEditorState(confirmed), activeStep: 'readiness' });
    for (const text of ['关键事实已确认', '目标平台', '预计样本', '平台连接与执行方式', '豆包：可自动监测', '创建计划并开始首轮监测']) {
      expect(readyMarkup).toContain(text);
    }
    expect(readyMarkup).not.toMatch(/<button[^>]*disabled[^>]*>.*创建计划并开始首轮监测/s);
  });

  it('keeps manual confirmation available after website discovery fails', () => {
    const session = createSession();
    const failedSession: QuickStartSession = {
      ...session,
      currentStep: 'website',
      draft: {
        ...session.draft,
        website: { ...session.draft.website!, crawlStatus: 'failed' }
      }
    };

    const websiteMarkup = renderView(failedSession, { ...restoreQuickStartEditorState(failedSession), activeStep: 'website' });
    expect(websiteMarkup).toContain('官网发现：发现失败');
    expect(websiteMarkup).toContain('仍可继续人工确认基础事实并完成接入');

    const factsMarkup = renderView(failedSession, { ...restoreQuickStartEditorState(failedSession), activeStep: 'facts' });
    expect(factsMarkup).toContain('事实确认');
    expect(factsMarkup).toContain('确认原始值');
  });

  it('shows the explainable source page plan before deep collection', () => {
    const session = createSession();
    const markup = renderView(session, { ...restoreQuickStartEditorState(session), activeStep: 'website' });

    for (const text of [
      '官网来源页面计划',
      '等待确认',
      'https://example.com/',
      '首页用于确认品牌主体、核心定位和主要业务',
      '产品与服务',
      '待处理',
      '移除页面',
      '同源页面 URL',
      '添加页面',
      '确认来源范围并继续'
    ]) {
      expect(markup).toContain(text);
    }
  });

  it('preserves completed pages and offers a targeted retry for failed pages', () => {
    const session = createSession();
    const items = session.draft.website!.sourcePagePlan!.items;
    const partialSession: QuickStartSession = {
      ...session,
      draft: {
        ...session.draft,
        website: {
          ...session.draft.website!,
          sourcePagePlan: {
            items: [
              { ...items[0], processingStatus: 'completed' },
              { ...items[1], processingStatus: 'failed', errorMessage: '页面暂时不可访问' }
            ]
          }
        }
      }
    };

    const markup = renderView(partialSession, { ...restoreQuickStartEditorState(partialSession), activeStep: 'website' });
    expect(markup).toContain('已完成');
    expect(markup).toContain('处理失败');
    expect(markup).toContain('页面暂时不可访问');
    expect(markup).toContain('重试此页面');
  });
});

function renderView(session: QuickStartSession, editor: ReturnType<typeof restoreQuickStartEditorState>) {
  return renderToStaticMarkup(
    <QuickStartWizardView
      session={session}
      editor={editor}
      loading={false}
      saving={false}
      onExit={() => undefined}
      onViewMoreQuestions={() => undefined}
      onRetry={() => undefined}
      onStepChange={() => undefined}
      onWebsiteChange={() => undefined}
      onFactsChange={() => undefined}
      onQuestionsChange={() => undefined}
      onSave={() => undefined}
    />
  );
}

function createSession(): QuickStartSession {
  return {
    id: 'session-1',
    brandId: 'brand_demo',
    currentStep: 'readiness',
    status: 'in_progress',
    version: 4,
    startedAt: '2026-08-03T00:00:00.000Z',
    updatedAt: '2026-08-03T00:10:00.000Z',
    draft: {
      website: {
        brandName: '追光小牛',
        websiteUrl: 'https://example.com/',
        targetMarkets: ['贵阳'],
        competitors: [],
        crawlStatus: 'completed',
        knowledgeSourceId: 'source-1',
        sourcePagePlan: {
          items: [
            {
              id: 'source-page-home',
              url: 'https://example.com/',
              title: '官网首页',
              sourceRole: 'home',
              selectionReason: '首页用于确认品牌主体、核心定位和主要业务。',
              included: true,
              processingStatus: 'planned'
            },
            {
              id: 'source-page-products',
              url: 'https://example.com/products',
              title: '课程产品',
              sourceRole: 'product',
              selectionReason: '产品或服务页用于提取具体供给、卖点和适用场景。',
              included: true,
              processingStatus: 'planned'
            }
          ]
        }
      },
      facts: { candidates: [createFact()] },
      questions: { items: [{ id: 'question-1', category: 'category', question: '贵阳儿童运动品牌怎么选？', enabled: true, targetPlatforms: ['doubao', 'kimi'] }] },
      readiness: {
        completed: false,
        targetPlatforms: ['doubao', 'kimi'],
        connectionSummary: [
          { platformCode: 'doubao', name: '豆包', methods: ['api'], status: 'ready', hasCredential: true },
          { platformCode: 'kimi', name: 'Kimi', methods: ['browser', 'manual'], status: 'browser_available', hasCredential: false }
        ],
        estimatedSampleCount: 2,
        estimatedDurationMinutes: 5,
        executionMethod: 'api',
        nextStep: '确认问题后开始自动监测'
      }
    }
  };
}

function createFact(overrides: Partial<QuickStartFactCandidate> = {}): QuickStartFactCandidate {
  return {
    id: 'fact-1',
    fieldKey: 'intro',
    extractedValue: '儿童运动成长中心',
    confidence: 0.91,
    status: 'pending',
    isCritical: true,
    sourceId: 'source-1',
    sourceType: 'webpage',
    url: 'https://example.com/about',
    title: '关于追光小牛',
    excerpt: '专注 3 至 12 岁儿童运动成长。',
    ...overrides
  };
}

function success<T>(data: T): ApiResponse<T> {
  return { success: true, data };
}

function failure<T>(code: string, message: string): ApiResponse<T> {
  return { success: false, data: null, error: { code, message } };
}
