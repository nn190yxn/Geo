import type { BrandImportDraft, BrandWorkspaceSnapshot } from '@geo-platform/shared-types';

export type FirstRoundStepKey = 'upload' | 'questions' | 'connect' | 'test' | 'review' | 'optimize' | 'retest';

export type FirstRoundStep = {
  key: FirstRoundStepKey;
  title: string;
  description: string;
  actionLabel: string;
  route: string;
  guide: string;
};

export const firstRoundSteps: FirstRoundStep[] = [
  {
    key: 'upload',
    title: '上传资料',
    description: '上传品牌资料或手动填写基础信息。',
    actionLabel: '补充品牌资料',
    route: '/brands',
    guide: '先把品牌介绍、课程或产品、目标客户、卖点、FAQ 和竞品资料放进系统，后面的监测问题会更准确。'
  },
  {
    key: 'questions',
    title: '选择监测问题',
    description: '查看系统推荐的高价值提问。',
    actionLabel: '去选监测问题',
    route: '/monitoring',
    guide: '监测问题对应用户在 AI 平台里的真实提问，优先选择品牌推荐、地域推荐、年龄段需求和竞品对比问题。'
  },
  {
    key: 'connect',
    title: '连接 AI 平台',
    description: '确认豆包、Kimi、DeepSeek、通义千问和阶跃星辰的回复获取方式。',
    actionLabel: '去连接平台',
    route: '/monitoring',
    guide: '平台密钥已填写的平台会自动获取回复；暂时没有密钥的平台可以用浏览器或手动粘贴真实回复完成首轮监测。'
  },
  {
    key: 'test',
    title: '开始监测',
    description: '发起首轮回复监测并等待回答分析。',
    actionLabel: '开始首轮监测',
    route: '/monitoring',
    guide: '开始监测后，系统会记录每个平台的真实回复，并自动分析有没有出现品牌、排第几、说得准不准和竞品表现。'
  },
  {
    key: 'review',
    title: '查看建议',
    description: '看懂推荐率、排名和表达准确性。',
    actionLabel: '查看回复解读',
    route: '/monitoring',
    guide: '重点看品牌是否被提到、是否排在第一、核心卖点是否准确，以及有没有需要你确认的风险表达。'
  },
  {
    key: 'optimize',
    title: '处理优化',
    description: '生成内容任务、发布计划和负责人跟进。',
    actionLabel: '处理优化动作',
    route: '/content-generation',
    guide: '根据回复解读补齐官网 FAQ、公众号推文、小红书图文、短视频脚本和平台介绍文案，再安排发布和负责人。'
  },
  {
    key: 'retest',
    title: '再次监测',
    description: '再次监测推荐率、排名和表达准确性变化。',
    actionLabel: '安排再次监测',
    route: '/tasks',
    guide: '优化动作完成后，用同一批监测问题再测一次，比较优化前后的推荐率、排名和表达准确性。'
  }
];

export function getFirstRoundCurrentStep(workspace: BrandWorkspaceSnapshot | null, draft: Pick<BrandImportDraft, 'status'> | null): number {
  if (draft?.status === 'ready_for_confirmation') {
    return 0;
  }

  if (!workspace || workspace.relatedCounts.profile === 0) {
    return 0;
  }

  if (workspace.relatedCounts.prompts === 0) {
    return 1;
  }

  if (workspace.relatedCounts.monitoringRuns === 0) {
    return 3;
  }

  if (workspace.relatedCounts.contentAssets === 0) {
    return 5;
  }

  return 6;
}

export function getFirstRoundStepStatus(index: number, current: number): 'finish' | 'process' | 'wait' {
  if (index < current) {
    return 'finish';
  }

  if (index === current) {
    return 'process';
  }

  return 'wait';
}
