import type { BrandWorkspaceSnapshot } from '@geo-platform/shared-types';
import { getBusinessTermDescription, getBusinessTermLabel, preferredAIPlatformSummary } from '../../../utils/displayLabels';

type CountKey = keyof BrandWorkspaceSnapshot['relatedCounts'];

export type WorkspaceModule = {
  title: string;
  description: string;
  route: string;
  actionLabel: string;
  stage: '资料准备' | '规划监测' | '内容发布' | '分析诊断' | '系统配置';
  countKey?: CountKey;
  fallbackMetric: string;
};

export type BeginnerStartAction = {
  title: string;
  description: string;
  route: string;
  actionLabel: string;
  metricKey?: CountKey;
};

export type BeginnerQuestionEntry = {
  question: string;
  route: string;
  actionLabel: string;
};

export type BeginnerTodo = {
  title: string;
  description: string;
  route: string;
  actionLabel: string;
  done: boolean;
};

export type BeginnerMetric = {
  label: string;
  value: number;
  suffix?: string;
};

export const beginnerStartActions: BeginnerStartAction[] = [
  {
    title: '先补齐品牌资料',
    description: '让系统知道品牌是谁、卖什么、适合谁，后续监测和内容生成才有判断依据。',
    route: '/brand-profile',
    actionLabel: '补资料',
    metricKey: 'profile'
  },
  {
    title: '再创建优化单元',
    description: `${getBusinessTermLabel('optimizationUnit')}是${getBusinessTermDescription('optimizationUnit')}，${getBusinessTermLabel('userIntent')}是${getBusinessTermDescription('userIntent')}。`,
    route: '/optimization-units',
    actionLabel: '建对象',
    metricKey: 'optimizationUnits'
  },
  {
    title: '然后获取真实回复',
    description: `${getBusinessTermDescription('realAIResponse')}，再进入分析和内容优化。`,
    route: '/monitoring',
    actionLabel: '开始监测',
    metricKey: 'monitoringRuns'
  }
];

export const beginnerQuestionEntries: BeginnerQuestionEntry[] = [
  {
    question: '我想知道品牌在 AI 回答里有没有被推荐',
    route: '/monitoring',
    actionLabel: '做 AI 回复监测'
  },
  {
    question: '我想知道应该让 AI 推荐哪些产品或服务',
    route: '/optimization-units',
    actionLabel: '创建优化单元'
  },
  {
    question: '我想根据监测结果生成能发布的内容',
    route: '/content-generation',
    actionLabel: '进入内容生成'
  }
];

export const workspaceModules: WorkspaceModule[] = [
  {
    title: '品牌信息',
    description: '补齐基础信息、产品服务、目标用户和品牌知识，作为标准答案与内容生成依据。',
    route: '/brand-profile',
    actionLabel: '维护资料',
    stage: '资料准备',
    countKey: 'profile',
    fallbackMetric: '待补充'
  },
  {
    title: '营销画布',
    description: '把优化单元、用户意图、监测问题、平台表现、内容任务和再次监测串联起来。',
    route: '/canvas',
    actionLabel: '打开画布',
    stage: '规划监测',
    countKey: 'optimizationUnits',
    fallbackMetric: '待规划'
  },
  {
    title: getBusinessTermLabel('userIntent'),
    description: '沉淀用户决策阶段、常见问题、反对理由和高价值监测问法。',
    route: '/user-intents',
    actionLabel: '管理意图',
    stage: '资料准备',
    countKey: 'intents',
    fallbackMetric: '待创建'
  },
  {
    title: getBusinessTermLabel('aiResponseMonitoring'),
    description: getBusinessTermDescription('aiResponseMonitoring'),
    route: '/monitoring',
    actionLabel: '开始监测',
    stage: '规划监测',
    countKey: 'monitoringRuns',
    fallbackMetric: '待补充真实回复'
  },
  {
    title: '内容生成',
    description: '基于品牌资料、品牌标准答案、监测缺口和信源建议生成内容草稿。',
    route: '/content-generation',
    actionLabel: '进入创作台',
    stage: '内容发布',
    countKey: 'contentAssets',
    fallbackMetric: '待生成'
  },
  {
    title: '内容优化',
    description: '优化已有内容的事实依据、结构、FAQ、引用依据和渠道适配。',
    route: '/content-optimization',
    actionLabel: '优化内容',
    stage: '内容发布',
    fallbackMetric: '待处理'
  },
  {
    title: '内容资产',
    description: '管理文章、FAQ、问答、对比页、媒体稿和后续再次监测计划。',
    route: '/content-assets',
    actionLabel: '查看资产',
    stage: '内容发布',
    countKey: 'contentAssets',
    fallbackMetric: '待沉淀'
  },
  {
    title: '自有媒体',
    description: '维护官网、博客、公众号、小红书、知乎、B 站等品牌可控发布账号。',
    route: '/owned-media',
    actionLabel: '管理账号',
    stage: '内容发布',
    fallbackMetric: '待配置'
  },
  {
    title: '媒体平台',
    description: '查看平台内容格式、适合用户意图、发布频率和渠道适配建议。',
    route: '/media-platforms',
    actionLabel: '查看规则',
    stage: '内容发布',
    fallbackMetric: '待梳理'
  },
  {
    title: '竞品分析',
    description: '查看竞品提及率、推荐排名、优势表达、引用来源和差距主题。',
    route: '/competitors',
    actionLabel: '分析竞品',
    stage: '分析诊断',
    countKey: 'competitors',
    fallbackMetric: '待维护'
  },
  {
    title: '评价分析',
    description: '识别 AI 回复中的正向、中性、负向评价和需要澄清的表达。',
    route: '/evaluations',
    actionLabel: '查看评价',
    stage: '分析诊断',
    fallbackMetric: '待诊断'
  },
  {
    title: getBusinessTermLabel('sourceAnalysis'),
    description: getBusinessTermDescription('sourceAnalysis'),
    route: '/citations',
    actionLabel: '查看信源',
    stage: '分析诊断',
    fallbackMetric: '待识别'
  },
  {
    title: getBusinessTermLabel('factAnalysis'),
    description: getBusinessTermDescription('factAnalysis'),
    route: '/facts',
    actionLabel: '检查事实',
    stage: '分析诊断',
    fallbackMetric: '待核对'
  },
  {
    title: 'AI 平台管理',
    description: `查看${preferredAIPlatformSummary}的配置状态。`,
    route: '/model-settings',
    actionLabel: '管理平台',
    stage: '系统配置',
    fallbackMetric: '待检查'
  }
];

export function getWorkspaceModuleMetric(module: WorkspaceModule, workspace: BrandWorkspaceSnapshot | null): string {
  if (!module.countKey || !workspace) {
    return module.fallbackMetric;
  }

  const value = workspace.relatedCounts[module.countKey];
  return value > 0 ? `${value} 项` : module.fallbackMetric;
}

export function getBeginnerActionState(action: BeginnerStartAction, workspace: BrandWorkspaceSnapshot | null): string {
  if (!action.metricKey || !workspace) {
    return '待开始';
  }

  const value = workspace.relatedCounts[action.metricKey];
  return value > 0 ? `已完成 ${value} 项` : '待开始';
}

export function getBeginnerTodos(workspace: BrandWorkspaceSnapshot | null): BeginnerTodo[] {
  const counts = workspace?.relatedCounts;

  return [
    {
      title: '补齐品牌资料',
      description: '先让系统知道品牌、产品服务、目标用户和可信资料。',
      route: '/brand-profile',
      actionLabel: '补资料',
      done: (counts?.profile ?? 0) > 0
    },
    {
      title: '创建优化单元',
      description: '把希望 AI 推荐的产品、服务或业务主题整理成优化单元。',
      route: '/optimization-units',
      actionLabel: '建对象',
      done: (counts?.optimizationUnits ?? 0) > 0
    },
    {
      title: '整理用户意图',
      description: '把客户可能向 AI 提出的真实问题沉淀下来。',
      route: '/user-intents',
      actionLabel: '建意图',
      done: (counts?.intents ?? 0) > 0
    },
    {
      title: '获取真实 AI 回复',
      description: getBusinessTermDescription('realAIResponse'),
      route: '/monitoring',
      actionLabel: '开始监测',
      done: (counts?.monitoringRuns ?? 0) > 0
    },
    {
      title: '准备可发布内容',
      description: '把监测缺口转成文章、FAQ、问答、媒体稿或社媒内容。',
      route: '/content-generation',
      actionLabel: '生成内容',
      done: (counts?.contentAssets ?? 0) > 0
    }
  ];
}

export function getBeginnerMetrics(workspace: BrandWorkspaceSnapshot | null): BeginnerMetric[] {
  const counts = workspace?.relatedCounts;

  return [
    { label: '品牌资料', value: counts?.profile ?? 0 },
    { label: getBusinessTermLabel('optimizationUnit'), value: counts?.optimizationUnits ?? 0 },
    { label: getBusinessTermLabel('userIntent'), value: counts?.intents ?? 0 },
    { label: '真实回复', value: counts?.monitoringRuns ?? 0 },
    { label: '内容资产', value: counts?.contentAssets ?? 0 }
  ];
}

export function getNextBeginnerTodo(workspace: BrandWorkspaceSnapshot | null): BeginnerTodo {
  return getBeginnerTodos(workspace).find((todo) => !todo.done) ?? {
    title: '查看分析诊断',
    description: '基础闭环已经建立，可以查看竞品、评价、信源和事实分析。',
    route: '/competitors',
    actionLabel: '看诊断',
    done: false
  };
}
