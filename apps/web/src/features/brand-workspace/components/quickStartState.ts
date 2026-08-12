import type {
  QuickStartFactCandidate,
  QuickStartQuestionItem,
  QuickStartSession,
  QuickStartStep,
  QuickStartWebsiteStepInput
} from '@geo-platform/shared-types';

export const quickStartSteps: Array<{ key: QuickStartStep; title: string }> = [
  { key: 'website', title: '官网信息' },
  { key: 'facts', title: '事实确认' },
  { key: 'questions', title: '问题选择' },
  { key: 'readiness', title: '执行准备' }
];

export type QuickStartEditorState = {
  activeStep: QuickStartStep;
  website: QuickStartWebsiteStepInput;
  facts: QuickStartFactCandidate[];
  questions: QuickStartQuestionItem[];
};

export function createQuickStartEditorState(brandName = ''): QuickStartEditorState {
  return {
    activeStep: 'website',
    website: { brandName, websiteUrl: '', targetMarkets: [], competitors: [] },
    facts: [],
    questions: []
  };
}

export function restoreQuickStartEditorState(session: QuickStartSession, fallbackBrandName = ''): QuickStartEditorState {
  const website = session.draft.website;
  return {
    activeStep: session.currentStep,
    website: website
      ? {
          brandName: website.brandName,
          websiteUrl: website.websiteUrl,
          targetMarkets: [...website.targetMarkets],
          competitors: website.competitors ? [...website.competitors] : [],
          sourcePagePlan: website.sourcePagePlan
            ? { items: website.sourcePagePlan.items.map((item) => ({ ...item })) }
            : undefined
        }
      : createQuickStartEditorState(fallbackBrandName).website,
    facts: session.draft.facts?.candidates.map((candidate) => ({ ...candidate })) ?? [],
    questions: session.draft.questions?.items.map((item) => ({ ...item })) ?? []
  };
}

export function updateQuickStartFact(
  candidates: QuickStartFactCandidate[],
  candidateId: string,
  update: Pick<QuickStartFactCandidate, 'status'> & { editedValue?: string }
): QuickStartFactCandidate[] {
  return candidates.map((candidate) => candidate.id === candidateId
    ? { ...candidate, status: update.status, editedValue: update.editedValue }
    : candidate);
}

export function getQuickStartReadiness(candidates: QuickStartFactCandidate[]) {
  const criticalFacts = candidates.filter((candidate) => candidate.isCritical);
  const unresolvedCriticalFacts = criticalFacts.filter((candidate) => !['confirmed', 'edited'].includes(candidate.status));
  const confirmedCount = candidates.filter((candidate) => ['confirmed', 'edited'].includes(candidate.status)).length;
  return {
    confirmedCount,
    criticalCount: criticalFacts.length,
    unresolvedCriticalFacts,
    canComplete: criticalFacts.length > 0 && unresolvedCriticalFacts.length === 0
  };
}

export function getNextQuickStartStep(step: QuickStartStep): QuickStartStep {
  const index = quickStartSteps.findIndex((item) => item.key === step);
  return quickStartSteps[Math.min(index + 1, quickStartSteps.length - 1)].key;
}

export function getQuickStartStepIndex(step: QuickStartStep): number {
  return Math.max(quickStartSteps.findIndex((item) => item.key === step), 0);
}

export function getQuickStartFieldLabel(fieldKey: string): string {
  const labels: Record<string, string> = {
    name: '品牌名称',
    website: '官方网站',
    targetMarkets: '目标市场',
    intro: '品牌与业务介绍',
    offerings: '产品与服务',
    targetCustomers: '目标用户',
    competitors: '主要竞品',
    'brand.positioning': '品牌定位'
  };
  return labels[fieldKey] ?? '品牌事实';
}

export function isQuickStartVersionConflict(code: string): boolean {
  return code === 'QUICK_START_VERSION_CONFLICT';
}
