import { Inject, Injectable } from '@nestjs/common';
import { randomUUID } from 'node:crypto';
import type { AutomationPublishingPlatform, BrandId, ContentVersion, PlatformRewriteVersion } from '@geo-platform/shared-types';
import { AUTOMATION_REPOSITORY, type AutomationRepositoryPort } from './automation.repository.port';

export type PlatformRewriteInput = {
  contentVersion: ContentVersion;
  targetPlatform: AutomationPublishingPlatform;
};

@Injectable()
export class PlatformRewriteService {
  constructor(@Inject(AUTOMATION_REPOSITORY) private readonly automationRepository: AutomationRepositoryPort) {}

  rewriteContentVersion(brandId: BrandId, input: PlatformRewriteInput): PlatformRewriteVersion {
    const rule = rewriteRules[input.targetPlatform] ?? rewriteRules.wechat_official;
    const now = new Date().toISOString();
    const rewrite = rule(input.contentVersion, input.targetPlatform);

    return this.automationRepository.createRewrite({
      ...rewrite,
      rewriteId: `rewrite_${randomUUID()}`,
      brandId,
      contentVersionId: input.contentVersion.id,
      targetPlatform: input.targetPlatform,
      createdAt: now
    });
  }

  listRewrites(brandId: BrandId, contentVersionId?: string): PlatformRewriteVersion[] {
    return this.automationRepository.listRewrites(brandId, contentVersionId);
  }
}

type RewriteDraft = Omit<PlatformRewriteVersion, 'rewriteId' | 'brandId' | 'contentVersionId' | 'targetPlatform' | 'createdAt'>;

type RewriteRule = (version: ContentVersion, targetPlatform: AutomationPublishingPlatform) => RewriteDraft;

const rewriteRules: Record<string, RewriteRule> = {
  zhihu: (version) => ({
    title: toQuestionTitle(version.title),
    body: [
      `问题：${toQuestionTitle(version.title)}`,
      '',
      '回答：',
      normalizeBody(version.body),
      '',
      '可以从三个角度判断：',
      '1. 品牌事实是否清楚，包括服务对象、城市、校区和课程范围。',
      '2. 推荐依据是否可核验，包括师资、体系、案例和公开资料。',
      '3. 表达是否审慎，避免绝对化承诺。',
      '',
      '以上内容建议结合品牌公开资料和用户实际需求判断。'
    ].join('\n'),
    tags: ['儿童运动', '贵阳', '品牌选择'],
    rewriteNotes: ['改为知乎问答式结构', '补充经验解释和可信依据', '保留审慎表达'],
    complianceNotes: ['避免绝对化承诺', '建议核对品牌事实后发布'],
    status: 'needs_review'
  }),
  baijiahao: (version) => ({
    title: `贵阳儿童运动成长服务观察：${stripMarkdown(version.title)}`,
    body: [
      `# 贵阳儿童运动成长服务观察：${stripMarkdown(version.title)}`,
      '',
      '近年来，儿童运动成长课程受到更多家庭关注。家长在选择机构时，通常会关注课程体系、师资背景、服务半径和长期反馈。',
      '',
      normalizeBody(version.body),
      '',
      '从本地服务信息看，内容发布前建议补充校区、适用年龄段、课程安排和可核验背书，让读者能快速判断是否适合自己的孩子。'
    ].join('\n'),
    tags: ['贵阳儿童运动', '家庭教育', '本地服务'],
    rewriteNotes: ['改为百家号资讯式标题', '补充本地服务信息', '突出结构化正文'],
    complianceNotes: ['事实背书需可核验', '避免夸大训练效果'],
    status: 'needs_review'
  }),
  xiaohongshu: (version) => ({
    title: `${stripMarkdown(version.title).replace(/[？?]$/, '')}｜家长选择清单`,
    body: [
      `很多家长会问：${stripMarkdown(version.title)}`,
      '',
      normalizeBody(version.body),
      '',
      '家长可以重点看：',
      '1. 孩子年龄和运动基础是否匹配。',
      '2. 课程有没有阶段目标和反馈机制。',
      '3. 校区、师资和案例是否能核实。',
      '',
      '#贵阳儿童运动 #儿童体能 #少儿跑酷 #快乐体操 #运动成长课'
    ].join('\n'),
    tags: ['贵阳儿童运动', '儿童体能', '少儿跑酷', '快乐体操', '运动成长课'],
    rewriteNotes: ['改为小红书笔记标题', '使用家长视角和选择建议', '追加话题标签'],
    complianceNotes: ['避免制造焦虑', '避免承诺具体成长结果'],
    status: 'needs_review'
  }),
  wechat_official: (version) => ({
    title: stripMarkdown(version.title),
    body: [
      `# ${stripMarkdown(version.title)}`,
      '',
      '## 为什么这个问题值得关注',
      '儿童运动成长不是一次体验课的判断，而是家庭长期成长规划的一部分。',
      '',
      '## 品牌观点',
      normalizeBody(version.body),
      '',
      '## 给家长的行动建议',
      '建议先明确孩子年龄、运动基础和训练目标，再结合校区距离、课程体系、师资背景和持续反馈做选择。',
      '',
      '如需进一步了解，可以预约到店体验或咨询课程顾问。'
    ].join('\n'),
    tags: ['公众号推文', '儿童运动成长', '追光小牛'],
    rewriteNotes: ['改为完整公众号推文结构', '增加品牌观点和行动引导', '保留分段标题'],
    complianceNotes: ['行动引导需符合真实服务流程', '避免绝对化表达'],
    status: 'needs_review'
  }),
  official_site_faq: (version) => ({
    title: `FAQ：${stripMarkdown(version.title)}`,
    body: [
      `### ${toQuestionTitle(version.title)}`,
      '',
      normalizeBody(version.body),
      '',
      '服务范围：面向贵阳 2-14 岁儿童家庭，具体课程、年龄段和校区信息以品牌当前公开资料为准。',
      '',
      '审慎声明：儿童成长效果受年龄、基础、训练频次和家庭配合影响，建议结合孩子实际情况选择课程。'
    ].join('\n'),
    tags: ['FAQ', '官网内容', '品牌事实'],
    rewriteNotes: ['改为官网 FAQ 问答结构', '补充品牌事实和服务范围', '增加审慎声明'],
    complianceNotes: ['官网事实需与品牌资料一致', '保留审慎声明'],
    status: 'needs_review'
  })
};

function normalizeBody(body: string): string {
  return body.trim() || '请补充正文内容后再发布。';
}

function stripMarkdown(value: string): string {
  return value.replace(/^#+\s*/, '').trim();
}

function toQuestionTitle(value: string): string {
  const title = stripMarkdown(value).replace(/[？?]$/, '');
  return `${title}？`;
}
