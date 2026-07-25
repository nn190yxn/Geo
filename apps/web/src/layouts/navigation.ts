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
    label: '总览',
    items: [
      { key: '/brands', label: '品牌总览', description: '查看所有品牌，并进入单个品牌的运营页面', requiresBrand: false }
    ]
  },
  {
    label: '发现机会',
    items: [
      { key: '/canvas', label: '监测地图', description: '把监测主题、用户场景、内容建议和监测结果串起来看', requiresBrand: true },
      { key: '/monitoring', label: 'AI 回复监测', description: '用真实问题记录 AI 如何回答和是否推荐你的品牌', requiresBrand: true },
      { key: '/growth-optimization', label: '优化计划', description: '把监测结果变成要写什么、发到哪里、何时再测', requiresBrand: true }
    ]
  },
  {
    label: '数据分析',
    items: [
      { key: '/competitors', label: '竞品对比', description: '查看哪些竞品更常被 AI 提到，以及差距在哪里', requiresBrand: true },
      { key: '/citations', label: '引用来源', description: '查看 AI 引用了哪些资料，判断内容是否够可信', requiresBrand: true },
      { key: '/evaluations', label: '表达检查', description: '查看 AI 说得是否准确，找出需要修正的说法', requiresBrand: true }
    ]
  },
  {
    label: '内容运营',
    items: [
      { key: '/content', label: '内容机会', description: '查看缺哪些内容、哪些资料可以继续复用', requiresBrand: true },
      { key: '/content-generation', label: '写内容', description: '按优化建议生成草稿、修改版本并导出', requiresBrand: true },
      { key: '/publishing', label: '发布记录', description: '记录内容发到了哪个账号、哪个平台和当前进度', requiresBrand: true }
    ]
  },
  {
    label: '系统设置',
    items: [
      { key: '/model-settings', label: '模型设置', description: '接入 DeepSeek、小米模型或其他大模型 API', requiresBrand: true }
    ]
  },
  {
    label: '运营闭环',
    items: [
      { key: '/tasks', label: '任务跟进', description: '跟踪谁负责、做到哪一步、什么时候再测', requiresBrand: true },
      { key: '/feedback', label: '内测反馈', description: '记录内测页面问题、模块问题和处理状态', requiresBrand: true },
      { key: '/advisor', label: '顾问跟进', description: '记录诊断结论、服务动作和给客户看的说明', requiresBrand: true },
      { key: '/reports', label: '报告导出', description: '生成单品牌、多品牌和客户交付报告', requiresBrand: true }
    ]
  }
];

export const operationWorkflow = [
  { key: '/brands', label: '品牌初始化' },
  { key: '/canvas', label: '监测地图' },
  { key: '/monitoring', label: '监测 AI 回复' },
  { key: '/growth-optimization', label: '定优化计划' },
  { key: '/content', label: '找内容机会' },
  { key: '/content-generation', label: '写内容' },
  { key: '/publishing', label: '发布记录' },
  { key: '/model-settings', label: '模型设置' },
  { key: '/tasks', label: '再次监测' },
  { key: '/feedback', label: '内测反馈' },
  { key: '/advisor', label: '顾问跟进' },
  { key: '/reports', label: '报告导出' }
];

export const workspaceRouteAliases: Record<string, string> = {
  dashboard: '/brands',
  canvas: '/canvas',
  knowledge: '/brands',
  'optimization-units': '/brands',
  intents: '/brands',
  monitoring: '/monitoring',
  'growth-optimization': '/growth-optimization',
  competitors: '/competitors',
  citations: '/citations',
  evaluations: '/evaluations',
  'content/assets': '/content',
  'content/strategies': '/content',
  'content/generation': '/content-generation',
  publishing: '/publishing',
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

export function getWorkflowIndex(pathname: string): number {
  return operationWorkflow.findIndex((item) => item.key === pathname);
}
