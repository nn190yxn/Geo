import { getBusinessTermDescription, getBusinessTermLabel, preferredAIPlatformSummary } from '../utils/displayLabels';
import { workflowStagePath, type FirstVersionRoutePath, type WorkflowRouteContext } from '../app/routePaths';

export type NavigationItem = {
  key: string;
  label: string;
  description: string;
  requiresBrand: boolean;
};

export type NavigationGroup = {
  label: string;
  items: NavigationItem[];
};

export const navigationGroups: NavigationGroup[] = [
  {
    label: '工作台',
    items: [
      { key: '/brands', label: '数据总览', description: '查看当前品牌的关键指标、起步任务、运营待办和推荐入口', requiresBrand: false },
      { key: '/canvas', label: '营销画布', description: `串联${getBusinessTermLabel('optimizationUnit')}、${getBusinessTermLabel('userIntent')}、监测问题、平台表现和内容任务`, requiresBrand: true },
      { key: '/model-settings', label: 'AI 平台管理', description: `管理${preferredAIPlatformSummary}配置状态`, requiresBrand: true },
      { key: '/feedback', label: '内测反馈', description: '记录产品体验问题、业务影响、处理状态和跟进结果', requiresBrand: true }
    ]
  },
  {
    label: '品牌信息',
    items: [
      { key: '/brand-profile', label: '品牌信息', description: '维护基础信息、产品服务、目标用户、品牌知识和资料完整度', requiresBrand: true },
      { key: '/competitor-profile', label: '竞品信息', description: '维护竞品档案、别名、官网、对比说明和确认标签', requiresBrand: true },
      { key: '/optimization-units', label: getBusinessTermLabel('optimizationUnit'), description: `维护${getBusinessTermDescription('optimizationUnit')}`, requiresBrand: true },
      { key: '/user-intents', label: getBusinessTermLabel('userIntent'), description: `管理${getBusinessTermDescription('userIntent')}和监测频率`, requiresBrand: true },
      { key: '/monitoring', label: getBusinessTermLabel('aiResponseMonitoring'), description: getBusinessTermDescription('aiResponseMonitoring'), requiresBrand: true }
    ]
  },
  {
    label: '内容中心',
    items: [
      { key: '/growth-optimization', label: '优化建议', description: '将监测发现转化为优先级、负责人、内容任务和再次监测计划', requiresBrand: true },
      { key: '/content-generation', label: '内容生成', description: '基于品牌资料、标准答案和监测缺口生成内容草稿', requiresBrand: true },
      { key: '/content-optimization', label: '内容优化', description: '优化现有内容的结构、事实依据、FAQ 和渠道适配', requiresBrand: true },
      { key: '/content', label: '内容策略', description: '根据关键词覆盖和内容缺口管理优化策略与执行建议', requiresBrand: true },
      { key: '/content-assets', label: '内容资产', description: '管理文章、FAQ、问答、对比页和媒体稿等可发布内容', requiresBrand: true },
      { key: '/advisor', label: '顾问服务', description: '管理品牌诊断、服务计划、复盘、客户交付和待跟进事项', requiresBrand: true }
    ]
  },
  {
    label: '发布中心',
    items: [
      { key: '/owned-media', label: '自有媒体', description: '管理官网、公众号、知乎、小红书、B 站等品牌可控账号', requiresBrand: true },
      { key: '/media-platforms', label: '媒体平台', description: '查看渠道规则、内容格式要求、适合意图和发布建议', requiresBrand: true },
      { key: '/publishing', label: '发布记录', description: '管理内容资产、发布账号、负责人、发布时间、真实结果和再次监测计划', requiresBrand: true },
      { key: '/tasks', label: '再次监测', description: '安排复测任务，查看发布后的 AI 可见性变化趋势', requiresBrand: true }
    ]
  },
  {
    label: '数据分析',
    items: [
      { key: '/competitors', label: '竞品分析', description: '查看竞品提及率、推荐排名、平台分布和差距主题', requiresBrand: true },
      { key: '/evaluations', label: '评价分析', description: '分析 AI 回复中的正向、中性、负向评价和处理建议', requiresBrand: true },
      { key: '/citations', label: getBusinessTermLabel('sourceAnalysis'), description: getBusinessTermDescription('sourceAnalysis'), requiresBrand: true },
      { key: '/facts', label: getBusinessTermLabel('factAnalysis'), description: getBusinessTermDescription('factAnalysis'), requiresBrand: true },
      { key: '/reports', label: '报告中心', description: '生成品牌周报、月报、多品牌对比和客户交付报告', requiresBrand: true }
    ]
  }
];

export const operationWorkflow: Array<{ key: FirstVersionRoutePath; label: string }> = [
  { key: '/brand-profile', label: '品牌信息准备' },
  { key: '/optimization-units', label: '创建优化单元' },
  { key: '/user-intents', label: '整理用户意图' },
  { key: '/monitoring', label: 'AI 回复监测' },
  { key: '/growth-optimization', label: '优化建议' },
  { key: '/content-generation', label: '内容生成与优化' },
  { key: '/publishing', label: '发布记录' },
  { key: '/tasks', label: '再次监测' }
];

export type ContextualWorkflowStep = (typeof operationWorkflow)[number] & {
  href: string;
  position: 'previous' | 'current' | 'next';
};

export const workspaceRouteAliases: Record<string, string> = {
  dashboard: '/brands',
  canvas: '/canvas',
  knowledge: '/brand-profile',
  profile: '/brand-profile',
  'brand-profile': '/brand-profile',
  'optimization-units': '/optimization-units',
  intents: '/user-intents',
  'user-intents': '/user-intents',
  monitoring: '/monitoring',
  'growth-optimization': '/growth-optimization',
  analysis: '/growth-optimization',
  competitors: '/competitors',
  'competitor-profile': '/competitor-profile',
  citations: '/citations',
  sources: '/citations',
  evaluations: '/evaluations',
  reviews: '/evaluations',
  facts: '/facts',
  'content/assets': '/content-assets',
  'content/strategies': '/content',
  'content/generation': '/content-generation',
  'content/optimization': '/content-optimization',
  publishing: '/publishing',
  'owned-media': '/owned-media',
  'media-platforms': '/media-platforms',
  'model-settings': '/model-settings',
  tasks: '/tasks',
  feedback: '/feedback',
  reports: '/reports',
  advisor: '/advisor'
};

export function flattenNavigationItems() {
  return navigationGroups.flatMap((group) => group.items);
}

export function getNavigationItem(pathname: string): NavigationItem | undefined {
  return flattenNavigationItems().find((item) => item.key === pathname);
}

export function getNavigationGroup(pathname: string): NavigationGroup | undefined {
  return navigationGroups.find((group) => group.items.some((item) => item.key === pathname));
}

export function getLatestNavigationOpenKeys(currentKeys: string[], nextKeys: string[]): string[] {
  const latestKey = nextKeys.find((key) => !currentKeys.includes(key));
  return latestKey ? [latestKey] : [];
}

export function getWorkflowIndex(pathname: string): number {
  return operationWorkflow.findIndex((item) => item.key === pathname);
}

export function getContextualWorkflowSteps(pathname: string, context: WorkflowRouteContext = {}): ContextualWorkflowStep[] {
  const currentIndex = getWorkflowIndex(pathname);
  if (currentIndex < 0) return [];

  return operationWorkflow
    .slice(Math.max(0, currentIndex - 1), currentIndex + 2)
    .map((step) => {
      const stepIndex = getWorkflowIndex(step.key);
      return {
        ...step,
        href: workflowStagePath(step.key, context),
        position: stepIndex < currentIndex ? 'previous' : stepIndex > currentIndex ? 'next' : 'current'
      };
    });
}
