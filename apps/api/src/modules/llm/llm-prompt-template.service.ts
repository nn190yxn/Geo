import { Injectable } from '@nestjs/common';
import type { LLMTaskType } from '@geo-platform/shared-types';
import type { LLMMessage } from '../platforms/adapters/ai-platform.adapter';

@Injectable()
export class LLMPromptTemplateService {
  buildMessages(taskType: LLMTaskType, input: unknown): LLMMessage[] {
    return [
      {
        role: 'system',
        content: '你是 AI 推荐管理平台的大模型任务助手。只输出合法 JSON，不输出解释性前后缀，不使用 Markdown。'
      },
      {
        role: 'developer',
        content: buildDeveloperInstruction(taskType)
      },
      {
        role: 'user',
        content: JSON.stringify({ taskType, input })
      }
    ];
  }
}

function buildDeveloperInstruction(taskType: LLMTaskType): string {
  const sharedRules = [
    `任务类型：${taskType}`,
    '严格遵守输入中的品牌事实，不能编造资质、效果承诺、销量、排名或平台数据。',
    '遇到医疗、升学、增高、治疗、包过等高风险表达时，必须标记为需要人工确认或写入合规说明。',
    '所有数组字段必须返回数组，缺少内容时返回空数组。',
    '所有文本面向品牌方小白用户，避免内部工程术语。'
  ];

  if (taskType === 'question_generation') {
    return [
      ...sharedRules,
      '输出字段必须为 themes、candidates、missingProfileFields、generationNotes。',
      'themes 每项包含 type、name、businessExplanation、priority、estimatedValue、enabled、sourceProfileFields。',
      'candidates 每项包含 themeId、question、purposes、targetPlatforms、priority、estimatedValue、editable、selected。',
      '问题要像真实用户提问，覆盖品牌直问、品类推荐、地域推荐、人群年龄段、痛点、课程、竞品对比和购买决策。'
    ].join('\n');
  }

  if (taskType === 'answer_analysis') {
    return [
      ...sharedRules,
      '输出字段必须可映射到 AnalysisResultInput。',
      '必须包含 brandMentioned、brandRank、sentiment、accuracyScore、citationScore、platformEvaluation、recommendationReason、rankingReason、expressionCompleteness、expressionDeviation、competitorMentions、reviewRequired。',
      'sentiment 只能返回 positive、neutral、negative 或 unknown。priority、purpose 等枚举字段必须使用接口定义的英文值。',
      'accuracyScore 和 citationScore 使用 0 到 100 分。无法判断排名时 brandRank 返回 null。',
      'rankingReason、expressionCompleteness 和 expressionDeviation 必须返回非空中文说明，不能返回 null、数字或空字符串。',
      'competitorMentions 每项包含 name、rank、context。'
    ].join('\n');
  }

  if (taskType === 'content_generation') {
    return [
      ...sharedRules,
      '输出字段必须为 title、body、exportFormat、complianceNotes、retestSuggestions、reviewRequired。',
      'body 使用 Markdown 正文，适配公众号推文、小红书图文、官网 FAQ、短视频脚本、平台介绍文案或图片创意需求。',
      'exportFormat 固定为 markdown。',
      'complianceNotes 写出事实不确定项、风险表达和人工确认点。'
    ].join('\n');
  }

  return [
    ...sharedRules,
    '输出字段必须为 plan、contentTasks、retestQuestions、generationNotes。',
    'plan 必须包含 dueDate、publishingPlatforms、retestAt，可包含 summary、reasons、priority、sourceRunIds、contentRecommendations。',
    'contentTasks 每项至少包含 strategyId，可包含 targetPlatform、contentType、targetKeywords、referenceSources。',
    'retestQuestions 每项使用 TestQuestionCandidateInput 结构。',
    '优化计划必须聚焦未出现、排名低、卖点缺失、竞品更强、风险表达、内容缺口和引用缺口。'
  ].join('\n');
}
