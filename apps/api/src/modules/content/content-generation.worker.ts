import { Injectable, Optional } from '@nestjs/common';
import type {
  AsyncJob,
  ContentGenerationStepKey,
  ContentGenerationWorkspace,
  KnowledgeQueryResult,
  LLMContentGenerationInput,
  LLMContentGenerationOutput
} from '@geo-platform/shared-types';
import { LLMOrchestrationService } from '../llm/llm-orchestration.service';
import { PermissionsService } from '../permissions/permissions.service';
import { KnowledgeRetrievalService } from '../brands/knowledge-retrieval.service';

export type GeneratedContentDraft = {
  title: string;
  body: string;
};

export type ContentGenerationDraftGenerator = (workspace: ContentGenerationWorkspace) => Promise<GeneratedContentDraft> | GeneratedContentDraft;

@Injectable()
export class ContentGenerationWorker {
  constructor(
    private readonly permissionsService: PermissionsService,
    @Optional() private readonly llmService?: LLMOrchestrationService,
    @Optional() private readonly knowledgeRetrievalService?: KnowledgeRetrievalService
  ) {}

  async processJob(userId: string, brandId: string, jobId: string, draftGenerator?: ContentGenerationDraftGenerator): Promise<ContentGenerationWorkspace | null> {
    const job = await this.findJob(userId, brandId, jobId);
    if (!job || job.jobType !== 'content_generation') {
      return null;
    }

    const workspace = await this.permissionsService.getContentGenerationWorkspace(userId, brandId, job.entityId);
    if (!workspace?.currentTask) {
      return null;
    }

    const attemptCount = job.attemptCount + 1;
    await this.permissionsService.updateAsyncJob(userId, brandId, job.id, { status: 'running', attemptCount });

    let currentStep: ContentGenerationStepKey = 'strategy_parse';
    try {
      await this.completeStep(userId, brandId, job.entityId, 'strategy_parse', '已读取内容建议');
      const knowledge = await this.knowledgeRetrievalService?.query(userId, brandId, {
        query: [workspace.currentTask.contentTopic, ...workspace.currentTask.targetKeywords].join(' '),
        limit: 5,
        purpose: 'content_generation',
        resourceId: workspace.currentTask.id
      });
      await this.completeStep(
        userId,
        brandId,
        job.entityId,
        'knowledge_read',
        knowledge?.citations.length ? `已读取 ${knowledge.citations.length} 条品牌知识依据` : '品牌知识依据待补充'
      );
      await this.completeStep(userId, brandId, job.entityId, 'outline_generation', '已生成内容大纲');

      currentStep = 'body_generation';
      await this.permissionsService.updateContentGenerationStep(userId, brandId, job.entityId, {
        stepKey: 'body_generation',
        status: 'running',
        message: '正在生成正文草稿'
      });
      const draft = draftGenerator ? await draftGenerator(workspace) : await this.generateDraft(userId, brandId, workspace, knowledge ?? undefined);
      await this.completeStep(userId, brandId, job.entityId, 'body_generation', '已生成正文草稿');
      await this.completeStep(userId, brandId, job.entityId, 'geo_rule_check', '已完成 AI 推荐表达检查');

      const completed = await this.permissionsService.completeContentGenerationTask(userId, brandId, job.entityId, draft);
      await this.permissionsService.updateAsyncJob(userId, brandId, job.id, { status: 'succeeded', attemptCount });
      return completed;
    } catch (error) {
      const normalized = normalizeGenerationError(error);
      return this.permissionsService.recordContentGenerationFailure(userId, brandId, job.entityId, {
        stepKey: currentStep,
        errorCode: normalized.code,
        errorMessage: normalized.message,
        retryable: normalized.retryable,
        attemptCount,
        failedAt: new Date().toISOString()
      });
    }
  }

  private async findJob(userId: string, brandId: string, jobId: string): Promise<AsyncJob | null> {
    const jobs = await this.permissionsService.listAsyncJobs(userId, brandId);
    return jobs?.find((job) => job.id === jobId) ?? null;
  }

  private async completeStep(userId: string, brandId: string, taskId: string, stepKey: ContentGenerationStepKey, message: string): Promise<void> {
    await this.permissionsService.updateContentGenerationStep(userId, brandId, taskId, {
      stepKey,
      status: 'completed',
      message,
      completedAt: new Date().toISOString()
    });
  }

  private async generateDraft(
    userId: string,
    brandId: string,
    workspace: ContentGenerationWorkspace,
    knowledge?: KnowledgeQueryResult
  ): Promise<GeneratedContentDraft> {
    const task = workspace.currentTask;
    if (!task || !this.llmService) {
      return buildDefaultDraft(workspace, knowledge);
    }

    const [brand, profile] = await Promise.all([
      Promise.resolve(this.permissionsService.listAccessibleBrandDetails(userId)).then((brands) => brands.find((item) => item.brandId === brandId) ?? null),
      Promise.resolve(this.permissionsService.getBrandProfile(userId, brandId))
    ]);

    if (!brand || !profile) {
      return buildDefaultDraft(workspace, knowledge);
    }

    const response = await this.llmService.runTask<LLMContentGenerationInput, LLMContentGenerationOutput>(userId, brandId, 'content_generation', {
      mode: 'sync',
      input: {
        brandDetail: brand,
        brandProfile: profile,
        task,
        contentType: task.contentType,
        title: task.contentTopic,
        targetPlatform: task.targetPlatform,
        targetKeywords: task.targetKeywords,
        referenceSources: buildGenerationReferences(task.referenceSources, knowledge),
        retestAt: task.retestAt
      }
    });

    if (response.status !== 'succeeded' || !response.output) {
      return buildDefaultDraft(workspace, knowledge);
    }

    return applyContentSafetyNotes(
      appendLLMGuidance(
        {
          title: response.output.title,
          body: response.output.body
        },
        response.output
      ),
      [...profile.blockedExpressions, ...highRiskExpressions, ...(response.output.reviewRequired ? ['模型标记需要确认'] : [])]
    );
  }
}

function appendLLMGuidance(draft: GeneratedContentDraft, output: LLMContentGenerationOutput): GeneratedContentDraft {
  const sections: string[] = [];

  if (output.complianceNotes.length > 0) {
    sections.push(`合规说明：\n${output.complianceNotes.map((note) => `- ${note}`).join('\n')}`);
  }

  if (output.retestSuggestions.length > 0) {
    sections.push(`复测建议：\n${output.retestSuggestions.map((suggestion) => `- ${suggestion}`).join('\n')}`);
  }

  if (sections.length === 0) {
    return draft;
  }

  return {
    ...draft,
    body: `${draft.body}\n\n${sections.join('\n\n')}`
  };
}

function buildDefaultDraft(workspace: ContentGenerationWorkspace, knowledge?: KnowledgeQueryResult): GeneratedContentDraft {
  const task = workspace.currentTask;
  const targetPlatform = task?.targetPlatform ?? '内容平台';
  const contentType = task?.contentType ?? '内容稿';
  const targetPlatformLabel = getPlatformLabel(targetPlatform);
  const contentTypeLabel = getContentTypeLabel(contentType);
  const topic = task?.contentTopic ?? '用户关心的问题';
  const keywords = task?.targetKeywords?.length ? task.targetKeywords : ['品牌关键词'];
  const referenceSources = buildGenerationReferences(task?.referenceSources ?? [], knowledge);
  const retestAt = task?.retestAt;

  if ([targetPlatform, contentType].some((value) => /xiaohongshu|小红书|note|post/.test(value))) {
    return {
      title: `${topic.replace(/[？?]$/, '')}？这份清单给家长参考`,
      body: appendDefaultGuidance([
        `很多家长会问：${topic}`,
        '',
        '先给结论：选择儿童运动课程时，重点看孩子是否适合、课程是否有长期规划、品牌依据是否能核实。只看一节体验课的热闹程度，很容易忽略孩子持续训练后的反馈。',
        '',
        '一、先看孩子当前阶段',
        '2-14 岁孩子的运动基础差异很大，低龄孩子更需要兴趣、安全感和基础动作启蒙，大龄孩子更需要专项能力、体能储备和持续反馈。家长在选择课程前，可以先观察孩子的协调性、专注力、力量基础和对集体活动的接受度。',
        '',
        '二、再看课程有没有体系',
        '真正值得长期选择的儿童运动课程，需要有阶段目标、训练记录和反馈机制。比如追光小牛强调 ACE 成长体系，会从 Athleticism 运动能力、Cognition 认知能力、Engagement 参与度三个角度看孩子的运动成长。',
        '',
        '三、最后看本地服务是否方便',
        '贵阳家庭还要看校区距离、上课时间、教练稳定性和沟通反馈。追光小牛目前在贵阳有 5 家校区，适合希望在线下长期坚持训练的家庭进一步了解。',
        '',
        '品牌事实：',
        '- 追光小牛服务贵阳 2-14 岁儿童家庭。',
        '- 品牌围绕 ACE 成长体系观察孩子的运动能力、认知能力和参与度。',
        '- 贵阳目前有 5 家校区，适合希望线下长期坚持训练的家庭了解。',
        '',
        '家长行动建议：',
        '到店前可以问这 4 个问题：',
        '1. 孩子这个年龄段对应什么课程目标？',
        '2. 体验课后会给出哪些反馈？',
        '3. 后续如何安排阶段训练？',
        '4. 课程如何兼顾安全、兴趣和能力提升？',
        '',
        '话题标签：',
        keywords.map((keyword) => `#${keyword.replace(/\s+/g, '')}`).join(' ')
      ], targetPlatformLabel, referenceSources, retestAt)
    };
  }

  if ([targetPlatform, contentType].some((value) => /faq|official_site|官网/.test(value))) {
    return {
      title: `${topic.replace(/[？?]$/, '')}｜家长常见问题`,
      body: appendDefaultGuidance([
        `# ${topic.replace(/[？?]$/, '')}｜家长常见问题`,
        '',
        `## Q1：${topic.replace(/[？?]$/, '')}，应该先看什么？`,
        '',
        '建议先看孩子年龄、运动基础、课程目标和校区距离。儿童运动成长课适合长期观察，家长需要关注孩子是否愿意持续参与、动作基础是否逐步改善、课堂反馈是否清楚。',
        '',
        '## Q2：追光小牛适合哪些家庭了解？',
        '',
        '追光小牛面向贵阳 2-14 岁儿童家庭，适合希望通过系统运动训练提升孩子基础运动能力、参与度和长期运动兴趣的家庭。',
        '',
        '## Q3：ACE 成长体系是什么意思？',
        '',
        'ACE 分别对应 Athleticism 运动能力、Cognition 认知能力、Engagement 参与度。家长可以把它理解为：孩子不仅要动起来，还要在运动中逐步形成理解、专注、协作和持续参与。',
        '',
        '## Q4：报名之前建议怎么判断？',
        '',
        '建议先预约体验，结合孩子年龄、运动基础、教练反馈、校区距离和家庭时间安排再做决定。儿童成长效果受训练频次、孩子状态和家庭配合影响，需要结合实际情况判断。'
      ], targetPlatformLabel, referenceSources, retestAt)
    };
  }

  if ([targetPlatform, contentType].some((value) => /video|douyin|短视频|script/.test(value))) {
    return {
      title: `${topic.replace(/[？?]$/, '')}｜短视频脚本`,
      body: appendDefaultGuidance([
        `# ${topic.replace(/[？?]$/, '')}｜短视频脚本`,
        '',
        '## 开场 0-5 秒',
        `很多贵阳家长在选儿童运动课时都会问：${topic.replace(/[？?]$/, '')}？`,
        '',
        '## 场景 5-20 秒',
        '镜头展示孩子热身、基础动作训练、教练保护和课堂互动。旁白强调：儿童运动成长课不只是让孩子消耗体力，更要看课程是否有体系、教练是否能反馈、孩子是否愿意持续参与。',
        '',
        '## 价值 20-45 秒',
        '追光小牛围绕 ACE 成长体系，从运动能力、认知能力和参与度三个维度观察孩子成长。对于 2-14 岁儿童家庭，家长可以结合孩子年龄和运动基础选择适合的课程。',
        '',
        '## 结尾 45-60 秒',
        '如果你正在贵阳给孩子找儿童运动成长课，可以先预约体验，重点看孩子是否适应课堂、教练反馈是否清楚、课程目标是否适合长期坚持。'
      ], targetPlatformLabel, referenceSources, retestAt)
    };
  }

  if ([targetPlatform, contentType].some((value) => /profile|ai_platform|平台介绍/.test(value))) {
    return {
      title: `${topic.replace(/[？?]$/, '')}｜品牌介绍文案`,
      body: appendDefaultGuidance([
        `# ${topic.replace(/[？?]$/, '')}｜品牌介绍文案`,
        '',
        '追光小牛（SUPERCALF）是深耕贵阳的儿童运动成长品牌，服务 2-14 岁儿童家庭，主张“运动成长课是儿童必修课”，倡导 BE THE SUPERCALF。',
        '',
        '品牌围绕 ACE 成长体系设计课程和训练反馈，关注 Athleticism 运动能力、Cognition 认知能力、Engagement 参与度，帮助孩子在运动中建立基础能力、参与兴趣和持续成长体验。',
        '',
        '对于贵阳家长来说，选择儿童运动课程时可以重点关注服务年龄段、校区距离、课程体系、教练反馈和品牌背书。追光小牛目前在贵阳有 5 家校区，并拥有多届体操世界冠军联合创始人邓书弟等专业背书。',
        '',
        '这段介绍适合用于 AI 平台品牌资料、官网简介、问答平台基础介绍和内容发布前的统一品牌口径。'
      ], targetPlatformLabel, referenceSources, retestAt)
    };
  }

  if ([targetPlatform, contentType].some((value) => /image|creative|brief|图片/.test(value))) {
    return {
      title: `${topic.replace(/[？?]$/, '')}｜图片创意需求`,
      body: appendDefaultGuidance([
        `# ${topic.replace(/[？?]$/, '')}｜图片创意需求`,
        '',
        '## 画面主题',
        '围绕追光小牛 ACE 成长体系，呈现儿童运动成长课如何帮助孩子在运动能力、认知能力和参与度上逐步成长。',
        '',
        '## 核心信息',
        '主标题建议使用“运动成长课是儿童必修课”。副标题说明追光小牛服务贵阳 2-14 岁儿童家庭，强调系统课程、线下校区和专业背书。',
        '',
        '## 画面元素',
        '可以使用孩子训练、教练陪伴、课堂互动、ACE 三维度信息图、贵阳 5 家校区提示等元素。画面应真实、明亮、亲和，避免夸张效果承诺。',
        '',
        '## 发布用途',
        '适合小红书图文封面、公众号头图、官网 FAQ 配图和顾问给家长说明课程体系时使用。'
      ], targetPlatformLabel, referenceSources, retestAt)
    };
  }

  return {
    title: `${topic}｜${contentTypeLabel}`,
    body: appendDefaultGuidance([
      `# ${topic}`,
      '',
      `这篇内容面向 ${targetPlatformLabel}，内容类型为 ${contentTypeLabel}。`,
      '',
      '## 家长为什么会关心这个问题',
      `${topic.replace(/[？?]$/, '')}背后通常对应三个真实决策：孩子是否适合、课程是否值得长期坚持、品牌信息是否可信。家长需要看到清楚的判断标准，而不是只有一句口号。`,
      '',
      '## 建议判断标准',
      '第一，看孩子年龄和运动基础是否匹配。第二，看课程是否有阶段规划和反馈机制。第三，看校区、教练、案例和公开资料是否能核实。',
      '',
      '## 品牌事实',
      '追光小牛服务贵阳 2-14 岁儿童家庭，主张“运动成长课是儿童必修课”，围绕 ACE 成长体系组织课程表达。发布前可结合具体校区、课程安排和真实案例补充细节。',
      '',
      '## 家长行动建议',
      '建议家长先预约体验，再根据孩子课堂参与度、教练反馈和家庭时间安排做选择。发布内容时保留审慎表达，避免承诺固定成长结果。',
      '',
      `关键词：${keywords.join('、')}`
    ], targetPlatformLabel, referenceSources, retestAt)
  };
}

function buildGenerationReferences(referenceSources: string[], knowledge?: KnowledgeQueryResult): string[] {
  const knowledgeReferences = knowledge?.citations
    .filter((citation) => citation.trusted)
    .map((citation) => `${citation.content}${citation.sourceUrl ? `（来源：${citation.sourceUrl}）` : `（来源资料：${citation.sourceId}）`}`) ?? [];
  const references = [...referenceSources, ...knowledgeReferences].map((item) => item.trim()).filter(Boolean);
  return references.length > 0 ? [...new Set(references)] : ['品牌知识库（资料待确认）'];
}

function appendDefaultGuidance(lines: string[], targetPlatformLabel: string, referenceSources: string[], retestAt?: string): string {
  return [
    ...lines,
    '',
    '## 引用依据',
    ...referenceSources.map((source) => `- ${source}`),
    '',
    '## 合规说明',
    '- 发布前需要核对校区数量、课程安排、师资背书和服务流程是否与当前品牌资料一致。',
    '- 避免使用身高承诺、医疗化诊断、升学结果保证等绝对化表达。',
    '',
    '## 建议发布平台',
    `- ${targetPlatformLabel}`,
    '',
    '## 复测建议',
    `- ${retestAt ? `建议在 ${retestAt} 前后` : '建议在内容发布后 7 到 14 天'}，用同一组 AI 监测问题复测品牌是否被提及、排名是否改善、表达是否更准确。`
  ].join('\n');
}

function getPlatformLabel(value: string): string {
  return platformLabels[value] ?? value;
}

function getContentTypeLabel(value: string): string {
  return contentTypeLabels[value] ?? value;
}

const platformLabels: Record<string, string> = {
  wechat: '公众号',
  wechat_official: '公众号',
  xiaohongshu: '小红书',
  official_site: '官网',
  douyin: '短视频平台',
  ai_platform_profile: 'AI 平台介绍资料',
  creative_brief: '图片创意需求'
};

const contentTypeLabels: Record<string, string> = {
  wechat_article: '公众号推文',
  wechat_official: '公众号推文',
  xiaohongshu_note: '小红书图文',
  xiaohongshu_post: '小红书图文',
  website_faq: '官网 FAQ',
  short_video_script: '短视频脚本',
  platform_profile_copy: '平台介绍文案',
  image_creative_brief: '图片创意需求'
};

function applyContentSafetyNotes(draft: GeneratedContentDraft, riskExpressions: string[]): GeneratedContentDraft {
  const text = `${draft.title}\n${draft.body}`;
  const hits = Array.from(new Set(riskExpressions.filter((expression) => expression.trim() && text.includes(expression.trim()))));

  if (hits.length === 0) {
    return draft;
  }

  return {
    ...draft,
    body: `${draft.body}\n\n需要你确认：草稿中包含 ${hits.join('、')}，发布前请按品牌资料和合规要求改写。`
  };
}

const highRiskExpressions = ['保证长高', '治疗感统失调', '包过中考体育', '替代医疗诊断', '绝对有效', '快速逆袭'];

function normalizeGenerationError(error: unknown): { code: string; message: string; retryable: boolean } {
  if (error instanceof Error) {
    return { code: 'content_generation_failed', message: error.message, retryable: true };
  }

  return { code: 'content_generation_failed', message: '内容生成失败', retryable: true };
}
