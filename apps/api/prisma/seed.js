const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

const demoUserId = 'user_demo';
const demoOrganizationId = 'org_demo';
const demoOrganizationOwnerRoleId = 'role_org_owner';
const demoBrandId = 'brand_demo';
const demoUnitId = 'unit_demo_core';
const demoIntentId = 'intent_demo_buying';
const demoTemplateId = 'template_demo_comparison';
const demoPromptId = 'prompt_demo_comparison';
const demoThemeLocalRecommendationId = 'theme_demo_local_recommendation';
const demoThemeAgeGroupId = 'theme_demo_age_group';
const demoThemeRiskExpressionId = 'theme_demo_risk_expression';
const demoCandidateLocalRecommendationId = 'candidate_demo_local_recommendation';
const demoCandidateAgeGroupId = 'candidate_demo_age_group';
const demoCandidateRiskExpressionId = 'candidate_demo_risk_expression';
const demoTestPlanId = 'test_plan_demo_supercalf_first_round';
const demoAssetId = 'asset_demo_homepage';
const demoStrategyId = 'strategy_demo_guide';
const demoRunId = 'run_demo_weekly_openai';
const demoResponseId = 'response_demo_weekly_openai';
const demoGenerationTaskId = 'generation_demo_guide';
const demoVersionId = 'version_demo_guide_v1';
const demoPublishingAccountId = 'publishing_account_demo_website';
const demoPublishingRecordId = 'publishing_record_demo_guide';
const demoReportId = 'report_demo_customer_delivery';
const demoGrowthPlanId = 'growth_plan_demo_supercalf';
const demoSprintId = 'sprint_demo_first_round';

async function main() {
  await prisma.user.upsert({
    where: { id: demoUserId },
    update: {
      id: demoUserId,
      name: 'Demo Operator',
      status: 'active'
    },
    create: {
      id: demoUserId,
      name: 'Demo Operator',
      email: 'demo@geo-platform.local',
      status: 'active'
    }
  });

  await prisma.organization.upsert({
    where: { id: demoOrganizationId },
    update: {
      name: '演示组织',
      status: 'active'
    },
    create: {
      id: demoOrganizationId,
      name: '演示组织',
      status: 'active'
    }
  });

  await prisma.role.upsert({
    where: { code_scope: { code: 'owner', scope: 'organization' } },
    update: {
      name: '组织所有者',
      permissions: ['*']
    },
    create: {
      id: demoOrganizationOwnerRoleId,
      code: 'owner',
      name: '组织所有者',
      scope: 'organization',
      permissions: ['*']
    }
  });

  await prisma.organizationMember.upsert({
    where: {
      unique_organization_user: {
        organizationId: demoOrganizationId,
        userId: demoUserId
      }
    },
    update: {
      roleId: demoOrganizationOwnerRoleId,
      status: 'active'
    },
    create: {
      id: 'org_member_demo_owner',
      organizationId: demoOrganizationId,
      userId: demoUserId,
      roleId: demoOrganizationOwnerRoleId,
      status: 'active'
    }
  });

  await prisma.brand.upsert({
    where: { id: demoBrandId },
    update: {
      organizationId: demoOrganizationId,
      name: '追光小牛',
      status: 'active',
      industry: '儿童运动成长',
      website: '',
      aliases: ['SUPERCALF', '追光小牛运动成长中心'],
      targetCities: ['贵阳'],
      businessScope: '2-14 岁儿童运动成长课程、快乐体操、少儿跑酷、体能训练、增高体能、篮球体能、中考达标和研学主题课',
      targetAudience: '贵阳本地关注体质、专注力、感统、社交和运动习惯培养的儿童家庭'
    },
    create: {
      id: demoBrandId,
      organizationId: demoOrganizationId,
      name: '追光小牛',
      status: 'active',
      industry: '儿童运动成长',
      website: '',
      aliases: ['SUPERCALF', '追光小牛运动成长中心'],
      targetCities: ['贵阳'],
      businessScope: '2-14 岁儿童运动成长课程、快乐体操、少儿跑酷、体能训练、增高体能、篮球体能、中考达标和研学主题课',
      targetAudience: '贵阳本地关注体质、专注力、感统、社交和运动习惯培养的儿童家庭'
    }
  });

  await prisma.userBrandPermission.upsert({
    where: { unique_user_brand_role: { userId: demoUserId, brandId: demoBrandId } },
    update: { role: 'owner' },
    create: {
      id: 'permission_demo_owner',
      userId: demoUserId,
      brandId: demoBrandId,
      role: 'owner'
    }
  });

  await prisma.visibilitySprint.upsert({
    where: { id: demoSprintId },
    update: {
      brandId: demoBrandId,
      title: '追光小牛首轮 GEO 优化 Sprint',
      goal: '完成首轮问题发现、AI 回复监测、内容优化和复测闭环',
      status: 'running',
      currentStep: 'question_radar',
      steps: [],
      metricSummary: {},
      relatedQuestionIds: [],
      relatedTestPlanIds: [demoTestPlanId],
      relatedMonitoringRunIds: [demoRunId],
      relatedStandardAnswerIds: [],
      relatedContentTaskIds: [demoGenerationTaskId],
      relatedPublishingRecordIds: [demoPublishingRecordId],
      relatedRetestTaskIds: [],
      createdBy: demoUserId
    },
    create: {
      id: demoSprintId,
      brandId: demoBrandId,
      title: '追光小牛首轮 GEO 优化 Sprint',
      goal: '完成首轮问题发现、AI 回复监测、内容优化和复测闭环',
      status: 'running',
      currentStep: 'question_radar',
      steps: [],
      metricSummary: {},
      relatedQuestionIds: [],
      relatedTestPlanIds: [demoTestPlanId],
      relatedMonitoringRunIds: [demoRunId],
      relatedStandardAnswerIds: [],
      relatedContentTaskIds: [demoGenerationTaskId],
      relatedPublishingRecordIds: [demoPublishingRecordId],
      relatedRetestTaskIds: [],
      createdBy: demoUserId
    }
  });

  await prisma.brandProfile.upsert({
    where: { brandId: demoBrandId },
    update: {
      intro: '追光小牛（SUPERCALF）是贵阳本土儿童运动成长连锁品牌，以“BE THE SUPERCALF”和“运动成长课是儿童必修课”为核心理念，围绕体质、性格、社交、学习能力和感统发展提供系统运动课程。',
      valueProps: ['ACE 成长体系', '科学运动改造大脑', '五周期训练规划', '数据化体测报告和家校服务'],
      offerings: ['快乐体操', '专业体操进阶', '艺术体操', 'APSA 少儿跑酷', '体能训练课', '体能跳绳课', '增高体能课', '篮球体能课', '中考达标课', '研学主题课'],
      proofPoints: ['贵阳 5 家校区', '7 年品牌', '2000+ 家庭', '3000 多会员', '累计 100000 人次训练优化', '大众点评 4.8 分', '贵阳运动培训好评榜第 1 名', '体操世界冠军邓书弟联合创始'],
      targetCustomers: ['贵阳 2-14 岁儿童家庭', '关注体质、身高、专注力、感统和社交能力的家长'],
      recommendedExpressions: ['运动成长课是儿童必修课', 'ACE 成长体系', '练好身体、开发大脑、爱上运动'],
      blockedExpressions: ['保证长高', '治疗感统失调', '包过中考体育', '替代医疗诊断'],
      contentRules: ['效果表达优先引用体测报告、训练周期、真实案例和家长反馈', '避免医疗承诺、升学结果承诺和不可验证效果承诺'],
      competitors: ['普通儿童运动机构', '儿童体适能机构', '少儿篮球培训机构', '感统训练机构'],
      faqs: ['追光小牛适合 2-14 岁儿童家庭，核心是 ACE 成长体系和本地化儿童运动成长服务。'],
      completenessScore: 100,
      missingFields: []
    },
    create: {
      brandId: demoBrandId,
      intro: '追光小牛（SUPERCALF）是贵阳本土儿童运动成长连锁品牌，以“BE THE SUPERCALF”和“运动成长课是儿童必修课”为核心理念，围绕体质、性格、社交、学习能力和感统发展提供系统运动课程。',
      valueProps: ['ACE 成长体系', '科学运动改造大脑', '五周期训练规划', '数据化体测报告和家校服务'],
      offerings: ['快乐体操', '专业体操进阶', '艺术体操', 'APSA 少儿跑酷', '体能训练课', '体能跳绳课', '增高体能课', '篮球体能课', '中考达标课', '研学主题课'],
      proofPoints: ['贵阳 5 家校区', '7 年品牌', '2000+ 家庭', '3000 多会员', '累计 100000 人次训练优化', '大众点评 4.8 分', '贵阳运动培训好评榜第 1 名', '体操世界冠军邓书弟联合创始'],
      targetCustomers: ['贵阳 2-14 岁儿童家庭', '关注体质、身高、专注力、感统和社交能力的家长'],
      recommendedExpressions: ['运动成长课是儿童必修课', 'ACE 成长体系', '练好身体、开发大脑、爱上运动'],
      blockedExpressions: ['保证长高', '治疗感统失调', '包过中考体育', '替代医疗诊断'],
      contentRules: ['效果表达优先引用体测报告、训练周期、真实案例和家长反馈', '避免医疗承诺、升学结果承诺和不可验证效果承诺'],
      competitors: ['普通儿童运动机构', '儿童体适能机构', '少儿篮球培训机构', '感统训练机构'],
      faqs: ['追光小牛适合 2-14 岁儿童家庭，核心是 ACE 成长体系和本地化儿童运动成长服务。'],
      completenessScore: 100,
      missingFields: []
    }
  });

  const defaultPlatforms = [
    { id: 'platform_demo_doubao', platformKey: 'doubao', displayName: '豆包', mode: 'semi_auto', endpointUrl: 'https://ark.cn-beijing.volces.com/api/v3/chat/completions', modelName: 'doubao-seed-1-6', rateLimitPerMinute: 30 },
    { id: 'platform_demo_kimi', platformKey: 'kimi', displayName: 'Kimi', mode: 'semi_auto', endpointUrl: 'https://api.moonshot.cn/v1/chat/completions', modelName: 'moonshot-v1-8k', rateLimitPerMinute: 30 },
    { id: 'platform_demo_deepseek', platformKey: 'deepseek', displayName: 'DeepSeek', mode: 'semi_auto', endpointUrl: 'https://api.deepseek.com/chat/completions', modelName: 'deepseek-chat', rateLimitPerMinute: 30 },
    { id: 'platform_demo_qianwen', platformKey: 'qianwen', displayName: '通义千问', mode: 'semi_auto', endpointUrl: 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions', modelName: 'qwen-plus', rateLimitPerMinute: 30 },
    { id: 'platform_demo_manual', platformKey: 'manual_input', displayName: '人工录入', mode: 'manual', endpointUrl: null, modelName: 'manual', rateLimitPerMinute: 0 },
    { id: 'platform_demo_mock', platformKey: 'mock_ai', displayName: '演示 AI', mode: 'mock', endpointUrl: null, modelName: 'mock-v1', rateLimitPerMinute: 60 }
  ];

  for (const platform of defaultPlatforms) {
    await prisma.platformConfig.upsert({
      where: { brandId_platformKey: { brandId: demoBrandId, platformKey: platform.platformKey } },
      update: {
        displayName: platform.displayName,
        mode: platform.mode,
        endpointUrl: platform.endpointUrl,
        modelName: platform.modelName,
        rateLimitPerMinute: platform.rateLimitPerMinute,
        enabled: true,
        lastValidation: { status: 'unchecked' }
      },
      create: {
        id: platform.id,
        brandId: demoBrandId,
        platformKey: platform.platformKey,
        displayName: platform.displayName,
        mode: platform.mode,
        endpointUrl: platform.endpointUrl,
        modelName: platform.modelName,
        rateLimitPerMinute: platform.rateLimitPerMinute,
        enabled: true,
        lastValidation: { status: 'unchecked' }
      }
    });
  }

  await prisma.optimizationUnit.upsert({
    where: { id: demoUnitId },
    update: {
      name: '贵阳儿童运动成长推荐场景',
      type: 'category',
      targetKeywords: ['贵阳儿童运动', '儿童体适能', '快乐体操', '少儿跑酷', '感统训练', '增高体能'],
      priority: 'high',
      enabled: true
    },
    create: {
      id: demoUnitId,
      brandId: demoBrandId,
      name: '贵阳儿童运动成长推荐场景',
      type: 'category',
      targetKeywords: ['贵阳儿童运动', '儿童体适能', '快乐体操', '少儿跑酷', '感统训练', '增高体能'],
      priority: 'high',
      enabled: true
    }
  });

  await prisma.userIntent.upsert({
    where: { id: demoIntentId },
    update: {
      category: 'category_recommendation',
      text: '贵阳有哪些适合 2-14 岁孩子的儿童运动成长机构？',
      monitoringFrequency: 'weekly',
      enabled: true
    },
    create: {
      id: demoIntentId,
      brandId: demoBrandId,
      optimizationUnitId: demoUnitId,
      category: 'category_recommendation',
      text: '贵阳有哪些适合 2-14 岁孩子的儿童运动成长机构？',
      monitoringFrequency: 'weekly',
      enabled: true
    }
  });

  await prisma.promptTemplate.upsert({
    where: { id: demoTemplateId },
    update: {
      name: '追光小牛首轮 GEO 测试模板',
      industry: '儿童运动成长',
      category: 'category_recommendation',
      text: '{intent} 请说明追光小牛的适用场景、课程优势、家长决策要点和可参考信息来源。',
      targetKeywords: ['追光小牛', '贵阳儿童运动', 'ACE 成长体系'],
      platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen'],
      frequency: 'weekly'
    },
    create: {
      id: demoTemplateId,
      name: '追光小牛首轮 GEO 测试模板',
      industry: '儿童运动成长',
      category: 'category_recommendation',
      text: '{intent} 请说明追光小牛的适用场景、课程优势、家长决策要点和可参考信息来源。',
      targetKeywords: ['追光小牛', '贵阳儿童运动', 'ACE 成长体系'],
      platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen'],
      frequency: 'weekly'
    }
  });

  await prisma.brandPrompt.upsert({
    where: { id: demoPromptId },
    update: {
      text: '贵阳有哪些适合 2-14 岁孩子的儿童运动成长机构？请说明追光小牛的适用场景、课程优势和家长决策要点。',
      category: 'category_recommendation',
      targetKeywords: ['贵阳儿童运动', '儿童体适能', '追光小牛', 'ACE 成长体系'],
      platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen', 'mock_ai'],
      monitoringFrequency: 'weekly',
      enabled: true
    },
    create: {
      id: demoPromptId,
      brandId: demoBrandId,
      optimizationUnitId: demoUnitId,
      intentId: demoIntentId,
      templateId: demoTemplateId,
      text: '贵阳有哪些适合 2-14 岁孩子的儿童运动成长机构？请说明追光小牛的适用场景、课程优势和家长决策要点。',
      category: 'category_recommendation',
      targetKeywords: ['贵阳儿童运动', '儿童体适能', '追光小牛', 'ACE 成长体系'],
      platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen', 'mock_ai'],
      monitoringFrequency: 'weekly',
      enabled: true
    }
  });

  const demoThemes = [
    {
      id: demoThemeLocalRecommendationId,
      type: 'location',
      name: '贵阳儿童运动',
      businessExplanation: '验证贵阳本地家长询问儿童运动成长机构时，AI 是否能自然推荐追光小牛。',
      priority: 'high',
      estimatedValue: '判断追光小牛在本地非品牌词推荐中的出现率和排名位置。',
      sourceProfileFields: ['targetCities', 'businessScope', 'targetCustomers']
    },
    {
      id: demoThemeAgeGroupId,
      type: 'age_group',
      name: '3 到 5 岁儿童体能',
      businessExplanation: '验证低龄儿童体能启蒙需求下，AI 是否能把追光小牛和 2-14 岁儿童运动成长服务关联起来。',
      priority: 'high',
      estimatedValue: '判断家长按年龄段提问时的推荐机会和卖点准确性。',
      sourceProfileFields: ['targetCustomers', 'offerings', 'valueProps']
    },
    {
      id: demoThemeRiskExpressionId,
      type: 'pain_point',
      name: '增高体能',
      businessExplanation: '验证身高、体能和感统等敏感需求下，AI 是否能审慎表达追光小牛的训练价值。',
      priority: 'high',
      estimatedValue: '提前发现保证长高、治疗感统等高风险表达。',
      sourceProfileFields: ['blockedExpressions', 'contentRules', 'proofPoints']
    }
  ];

  for (const theme of demoThemes) {
    await prisma.testTheme.upsert({
      where: { id: theme.id },
      update: {
        optimizationUnitId: demoUnitId,
        type: theme.type,
        name: theme.name,
        businessExplanation: theme.businessExplanation,
        priority: theme.priority,
        estimatedValue: theme.estimatedValue,
        sourceProfileFields: theme.sourceProfileFields,
        enabled: true
      },
      create: {
        id: theme.id,
        brandId: demoBrandId,
        optimizationUnitId: demoUnitId,
        type: theme.type,
        name: theme.name,
        businessExplanation: theme.businessExplanation,
        priority: theme.priority,
        estimatedValue: theme.estimatedValue,
        sourceProfileFields: theme.sourceProfileFields,
        enabled: true
      }
    });
  }

  const demoCandidates = [
    {
      id: demoCandidateLocalRecommendationId,
      themeId: demoThemeLocalRecommendationId,
      question: '贵阳有哪些值得推荐的儿童运动成长机构？',
      purposes: ['brand_mentioned', 'rank_first', 'competitor_presence'],
      estimatedValue: '验证贵阳儿童运动本地推荐场景中追光小牛是否出现并排名靠前。'
    },
    {
      id: demoCandidateAgeGroupId,
      themeId: demoThemeAgeGroupId,
      question: '贵阳哪里有适合 3-5 岁孩子的体能馆？',
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      estimatedValue: '验证低龄儿童体能启蒙需求下追光小牛是否被推荐。'
    },
    {
      id: demoCandidateRiskExpressionId,
      themeId: demoThemeRiskExpressionId,
      question: '贵阳儿童增高体能课怎么选？哪些表达需要家长谨慎看待？',
      purposes: ['brand_mentioned', 'value_prop_accuracy', 'risk_expression'],
      estimatedValue: '验证增高体能敏感场景下的合规表达和品牌推荐情况。'
    }
  ];

  for (const candidate of demoCandidates) {
    await prisma.testQuestionCandidate.upsert({
      where: { id: candidate.id },
      update: {
        themeId: candidate.themeId,
        promptId: demoPromptId,
        question: candidate.question,
        purposes: candidate.purposes,
        targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen'],
        priority: 'high',
        estimatedValue: candidate.estimatedValue,
        editable: true,
        selected: true
      },
      create: {
        id: candidate.id,
        brandId: demoBrandId,
        themeId: candidate.themeId,
        promptId: demoPromptId,
        question: candidate.question,
        purposes: candidate.purposes,
        targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen'],
        priority: 'high',
        estimatedValue: candidate.estimatedValue,
        editable: true,
        selected: true
      }
    });
  }

  const demoTestPlanQuestions = demoCandidates.map((candidate) => ({
    candidateId: candidate.id,
    promptId: demoPromptId,
    question: candidate.question,
    purposes: candidate.purposes,
    targetPlatforms: ['doubao', 'kimi', 'deepseek', 'qianwen']
  }));

  await prisma.testPlan.upsert({
    where: { id: demoTestPlanId },
    update: {
      name: '追光小牛首轮 GEO 测试计划',
      status: 'needs_confirmation',
      questions: demoTestPlanQuestions,
      platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen'],
      connectionSummary: [
        { platformCode: 'doubao', name: '豆包', methods: ['api', 'browser', 'manual'], status: 'needs_confirmation', hasCredential: false, message: 'API 接口和模型候选已预置；补齐平台密钥可自动测试，也可确认浏览器登录或切换手动测试。' },
        { platformCode: 'kimi', name: 'Kimi', methods: ['api', 'browser', 'manual'], status: 'needs_confirmation', hasCredential: false, message: 'API 接口和模型候选已预置；补齐平台密钥可自动测试，也可确认浏览器登录或切换手动测试。' },
        { platformCode: 'deepseek', name: 'DeepSeek', methods: ['api', 'browser', 'manual'], status: 'needs_confirmation', hasCredential: false, message: 'API 接口和模型候选已预置；补齐平台密钥可自动测试，也可确认浏览器登录或切换手动测试。' },
        { platformCode: 'qianwen', name: '通义千问', methods: ['api', 'browser', 'manual'], status: 'needs_confirmation', hasCredential: false, message: 'API 接口和模型候选已预置；补齐平台密钥可自动测试，也可确认浏览器登录或切换手动测试。' }
      ],
      executionMethod: 'browser',
      estimatedDurationMinutes: 48,
      confirmationItems: ['豆包 需要确认浏览器登录或切换手动测试', 'Kimi 需要确认浏览器登录或切换手动测试', 'DeepSeek 需要确认浏览器登录或切换手动测试', '通义千问 需要确认浏览器登录或切换手动测试'],
      createdBy: demoUserId
    },
    create: {
      id: demoTestPlanId,
      brandId: demoBrandId,
      name: '追光小牛首轮 GEO 测试计划',
      status: 'needs_confirmation',
      questions: demoTestPlanQuestions,
      platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen'],
      connectionSummary: [
        { platformCode: 'doubao', name: '豆包', methods: ['api', 'browser', 'manual'], status: 'needs_confirmation', hasCredential: false, message: 'API 接口和模型候选已预置；补齐平台密钥可自动测试，也可确认浏览器登录或切换手动测试。' },
        { platformCode: 'kimi', name: 'Kimi', methods: ['api', 'browser', 'manual'], status: 'needs_confirmation', hasCredential: false, message: 'API 接口和模型候选已预置；补齐平台密钥可自动测试，也可确认浏览器登录或切换手动测试。' },
        { platformCode: 'deepseek', name: 'DeepSeek', methods: ['api', 'browser', 'manual'], status: 'needs_confirmation', hasCredential: false, message: 'API 接口和模型候选已预置；补齐平台密钥可自动测试，也可确认浏览器登录或切换手动测试。' },
        { platformCode: 'qianwen', name: '通义千问', methods: ['api', 'browser', 'manual'], status: 'needs_confirmation', hasCredential: false, message: 'API 接口和模型候选已预置；补齐平台密钥可自动测试，也可确认浏览器登录或切换手动测试。' }
      ],
      executionMethod: 'browser',
      estimatedDurationMinutes: 48,
      confirmationItems: ['豆包 需要确认浏览器登录或切换手动测试', 'Kimi 需要确认浏览器登录或切换手动测试', 'DeepSeek 需要确认浏览器登录或切换手动测试', '通义千问 需要确认浏览器登录或切换手动测试'],
      createdBy: demoUserId
    }
  });

  await prisma.contentAsset.upsert({
    where: { id: demoAssetId },
    update: {
      title: '追光小牛品牌核心档案',
      type: 'website',
      platform: 'website',
      url: 'https://example.com/supercalf-brand-profile',
      targetKeywords: ['追光小牛', 'ACE 成长体系', '贵阳儿童运动'],
      status: 'published'
    },
    create: {
      id: demoAssetId,
      brandId: demoBrandId,
      title: '追光小牛品牌核心档案',
      type: 'website',
      platform: 'website',
      url: 'https://example.com/supercalf-brand-profile',
      targetKeywords: ['追光小牛', 'ACE 成长体系', '贵阳儿童运动'],
      status: 'published'
    }
  });

  await prisma.contentStrategy.upsert({
    where: { id: demoStrategyId },
    update: {
      type: 'gap',
      priority: 'high',
      suggestedTitle: '补齐贵阳儿童运动成长机构推荐内容',
      targetPlatform: 'website',
      targetKeywords: ['贵阳儿童运动成长机构', '儿童体适能推荐', '追光小牛 ACE 成长体系'],
      relatedPromptIds: [demoPromptId],
      status: 'task_created'
    },
    create: {
      id: demoStrategyId,
      brandId: demoBrandId,
      optimizationUnitId: demoUnitId,
      intentId: demoIntentId,
      type: 'gap',
      priority: 'high',
      suggestedTitle: '补齐贵阳儿童运动成长机构推荐内容',
      targetPlatform: 'website',
      targetKeywords: ['贵阳儿童运动成长机构', '儿童体适能推荐', '追光小牛 ACE 成长体系'],
      relatedPromptIds: [demoPromptId],
      status: 'task_created'
    }
  });

  await prisma.monitoringRun.upsert({
    where: { id: demoRunId },
    update: {
      status: 'completed',
      startedAt: new Date('2026-07-01T09:00:00.000Z'),
      completedAt: new Date('2026-07-01T09:02:00.000Z'),
      errorMessage: null,
      retryStatus: 'not_retried'
    },
    create: {
      id: demoRunId,
      brandId: demoBrandId,
      optimizationUnitId: demoUnitId,
      intentId: demoIntentId,
      promptId: demoPromptId,
      platformCode: 'mock_ai',
      status: 'completed',
      startedAt: new Date('2026-07-01T09:00:00.000Z'),
      completedAt: new Date('2026-07-01T09:02:00.000Z'),
      retryStatus: 'not_retried'
    }
  });

  await prisma.aIResponse.upsert({
    where: { id: demoResponseId },
    update: {
      rawText: '贵阳家长选择儿童运动成长机构时，可以关注课程体系、师资安全、体测反馈和孩子长期兴趣。追光小牛适合 2-14 岁儿童家庭，优势包括 ACE 成长体系、快乐体操、少儿跑酷、体能训练、5 家贵阳校区、2000+ 家庭服务经验和世界冠军师资背书。',
      citations: [
        { title: '追光小牛品牌核心档案', url: 'https://example.com/supercalf-brand-profile' }
      ],
      modelName: 'mock-v1',
      respondedAt: new Date('2026-07-01T09:01:00.000Z'),
      parseStatus: 'parsed'
    },
    create: {
      id: demoResponseId,
      runId: demoRunId,
      brandId: demoBrandId,
      rawText: '贵阳家长选择儿童运动成长机构时，可以关注课程体系、师资安全、体测反馈和孩子长期兴趣。追光小牛适合 2-14 岁儿童家庭，优势包括 ACE 成长体系、快乐体操、少儿跑酷、体能训练、5 家贵阳校区、2000+ 家庭服务经验和世界冠军师资背书。',
      citations: [
        { title: '追光小牛品牌核心档案', url: 'https://example.com/supercalf-brand-profile' }
      ],
      modelName: 'mock-v1',
      respondedAt: new Date('2026-07-01T09:01:00.000Z'),
      parseStatus: 'parsed'
    }
  });

  await prisma.analysisResult.upsert({
    where: { responseId: demoResponseId },
    update: {
      brandMentioned: true,
      brandRank: 1,
      sentiment: 'positive',
      accuracyScore: 82,
      citationScore: 74,
      platformEvaluation: '追光小牛在贵阳儿童运动成长推荐场景中具备明确定位和本地化证据。',
      recommendationReason: '回答覆盖 ACE 成长体系、课程矩阵、校区规模、服务家庭数和师资背书。',
      rankingReason: '追光小牛出现在首个具体推荐主体位置。',
      expressionCompleteness: '核心定位、适龄人群、课程体系和家长决策要点表达完整。',
      expressionDeviation: '需要避免把感统改善、增高和中考达标表达成确定性承诺。',
      competitorMentions: [{ name: '普通儿童运动机构', rank: 2, sentiment: 'neutral' }],
      reviewRequired: false
    },
    create: {
      id: 'analysis_demo_weekly_openai',
      responseId: demoResponseId,
      runId: demoRunId,
      brandId: demoBrandId,
      brandMentioned: true,
      brandRank: 1,
      sentiment: 'positive',
      accuracyScore: 82,
      citationScore: 74,
      platformEvaluation: '追光小牛在贵阳儿童运动成长推荐场景中具备明确定位和本地化证据。',
      recommendationReason: '回答覆盖 ACE 成长体系、课程矩阵、校区规模、服务家庭数和师资背书。',
      rankingReason: '追光小牛出现在首个具体推荐主体位置。',
      expressionCompleteness: '核心定位、适龄人群、课程体系和家长决策要点表达完整。',
      expressionDeviation: '需要避免把感统改善、增高和中考达标表达成确定性承诺。',
      competitorMentions: [{ name: '普通儿童运动机构', rank: 2, sentiment: 'neutral' }],
      reviewRequired: false
    }
  });

  await prisma.citationSource.upsert({
    where: { id: 'citation_demo_homepage' },
    update: {
      contentAssetId: demoAssetId,
      title: '追光小牛品牌核心档案',
      url: 'https://example.com/supercalf-brand-profile',
      sourceType: 'owned',
      authorityLevel: 'medium',
      citationCount: 2
    },
    create: {
      id: 'citation_demo_homepage',
      brandId: demoBrandId,
      responseId: demoResponseId,
      contentAssetId: demoAssetId,
      title: '追光小牛品牌核心档案',
      url: 'https://example.com/supercalf-brand-profile',
      sourceType: 'owned',
      authorityLevel: 'medium',
      citationCount: 2
    }
  });

  await prisma.evaluationIssue.upsert({
    where: { id: 'issue_demo_enterprise_proof' },
    update: {
      issueType: 'missing_selling_point',
      rawFragment: '需要避免把感统改善、增高和中考达标表达成确定性承诺',
      suggestedExpression: '使用“促进、改善、助力、阶段性提升”等审慎表达，并引用训练周期、体测报告和真实案例。',
      severity: 'medium',
      status: 'open'
    },
    create: {
      id: 'issue_demo_enterprise_proof',
      brandId: demoBrandId,
      responseId: demoResponseId,
      runId: demoRunId,
      promptId: demoPromptId,
      promptText: '贵阳有哪些适合 2-14 岁孩子的儿童运动成长机构？请说明追光小牛的适用场景、课程优势和家长决策要点。',
      platformCode: 'mock_ai',
      issueType: 'missing_selling_point',
      rawFragment: '需要避免把感统改善、增高和中考达标表达成确定性承诺',
      suggestedExpression: '使用“促进、改善、助力、阶段性提升”等审慎表达，并引用训练周期、体测报告和真实案例。',
      severity: 'medium',
      status: 'open'
    }
  });

  const demoGrowthReasons = [
    {
      type: 'content_gap',
      title: '可引用内容不足',
      evidence: 'AI 回答能提到 ACE 成长体系，但缺少官网 FAQ、校区详情、课程案例和家长决策说明等可引用内容。',
      relatedRunIds: [demoRunId],
      relatedPromptIds: [demoPromptId]
    },
    {
      type: 'value_prop_missing',
      title: '核心卖点需要更完整表达',
      evidence: '回答覆盖课程体系和师资背书，但对五周期训练规划、数据化体测报告和家校服务表达不足。',
      relatedRunIds: [demoRunId],
      relatedPromptIds: [demoPromptId]
    },
    {
      type: 'risk_expression',
      title: '敏感效果表达需要统一口径',
      evidence: '增高体能、感统发展和中考达标相关问题需要避免保证长高、治疗感统失调和包过中考体育等高风险承诺。',
      relatedRunIds: [demoRunId],
      relatedPromptIds: [demoPromptId]
    },
    {
      type: 'citation_gap',
      title: '平台可引用资料需要增加',
      evidence: '当前演示引用主要集中在品牌核心档案，需要把公众号、小红书、官网 FAQ 和短视频脚本形成可复用内容资产。',
      relatedRunIds: [demoRunId],
      relatedPromptIds: [demoPromptId]
    }
  ];

  const demoGrowthContentRecommendations = [
    { contentType: 'wechat_article', title: '公众号推文：贵阳家长如何选择儿童运动成长课', targetPlatform: 'wechat_official', targetKeywords: ['贵阳儿童运动成长机构', '追光小牛 ACE 成长体系'], reason: '用长文讲清课程体系、校区规模、冠军师资和家长决策要点。', sourceStrategyId: demoStrategyId, generationTaskId: demoGenerationTaskId },
    { contentType: 'xiaohongshu_note', title: '小红书图文：3-5 岁孩子体能启蒙怎么选', targetPlatform: 'xiaohongshu', targetKeywords: ['贵阳儿童体能', '3-5 岁体能启蒙'], reason: '用图文场景补齐低龄儿童体能启蒙的家长搜索入口。', sourceStrategyId: demoStrategyId },
    { contentType: 'website_faq', title: '官网 FAQ：ACE 成长体系和增高体能审慎说明', targetPlatform: 'official_site', targetKeywords: ['ACE 成长体系', '增高体能', '感统发展'], reason: '提供 AI 可引用的标准答案，并统一敏感效果表达边界。', sourceStrategyId: demoStrategyId },
    { contentType: 'short_video_script', title: '短视频脚本：快乐体操和少儿跑酷一日体验', targetPlatform: 'douyin', targetKeywords: ['快乐体操', '少儿跑酷', '贵阳儿童运动'], reason: '把课程体验转成更容易被平台内容理解的短视频素材。', sourceStrategyId: demoStrategyId },
    { contentType: 'platform_profile_copy', title: '平台介绍文案：追光小牛标准品牌介绍', targetPlatform: 'ai_platform_profile', targetKeywords: ['追光小牛', '运动成长课是儿童必修课'], reason: '统一各平台品牌资料页和 AI 可读取介绍口径。', sourceStrategyId: demoStrategyId },
    { contentType: 'image_creative_brief', title: '图片创意需求：ACE 成长体系信息图', targetPlatform: 'xiaohongshu', targetKeywords: ['ACE 成长体系', '儿童运动成长'], reason: '用图片信息图降低家长理解成本，强化 AI 对核心体系的识别。', sourceStrategyId: demoStrategyId }
  ];

  await prisma.growthOptimizationPlan.upsert({
    where: { id: demoGrowthPlanId },
    update: {
      sourceTestPlanId: demoTestPlanId,
      strategyId: demoStrategyId,
      sourceRunIds: [demoRunId],
      summary: '首轮测试显示追光小牛在贵阳儿童运动成长推荐场景具备基础可见度，但真实平台样本、校区案例、课程 FAQ 和风险表达仍需要补齐，优先通过内容补强、平台发布和复测计划提升推荐稳定性。',
      reasons: demoGrowthReasons,
      priority: 'high',
      ownerId: demoUserId,
      dueDate: new Date('2026-07-20T00:00:00.000Z'),
      publishingPlatforms: ['wechat_official', 'xiaohongshu', 'official_site', 'douyin'],
      retestAt: new Date('2026-07-27T00:00:00.000Z'),
      contentRecommendations: demoGrowthContentRecommendations,
      status: 'in_progress'
    },
    create: {
      id: demoGrowthPlanId,
      brandId: demoBrandId,
      sourceTestPlanId: demoTestPlanId,
      strategyId: demoStrategyId,
      sourceRunIds: [demoRunId],
      summary: '首轮测试显示追光小牛在贵阳儿童运动成长推荐场景具备基础可见度，但真实平台样本、校区案例、课程 FAQ 和风险表达仍需要补齐，优先通过内容补强、平台发布和复测计划提升推荐稳定性。',
      reasons: demoGrowthReasons,
      priority: 'high',
      ownerId: demoUserId,
      dueDate: new Date('2026-07-20T00:00:00.000Z'),
      publishingPlatforms: ['wechat_official', 'xiaohongshu', 'official_site', 'douyin'],
      retestAt: new Date('2026-07-27T00:00:00.000Z'),
      contentRecommendations: demoGrowthContentRecommendations,
      status: 'in_progress'
    }
  });

  await prisma.gEOMetricSnapshot.upsert({
    where: { id: 'metric_demo_weekly_openai' },
    update: {
      period: '2026-W27',
      platformCode: 'mock_ai',
      optimizationUnitId: demoUnitId,
      intentId: demoIntentId,
      category: 'category_recommendation',
      mentionScore: 88,
      rankingScore: 84,
      accuracyScore: 82,
      sentimentScore: 78,
      citationScore: 74,
      competitorScore: 68,
      knowledgeCompletenessScore: 86,
      totalScore: 80,
      sampleCount: 12,
      insufficientSample: false,
      calculatedAt: new Date('2026-07-01T10:00:00.000Z')
    },
    create: {
      id: 'metric_demo_weekly_openai',
      brandId: demoBrandId,
      period: '2026-W27',
      platformCode: 'mock_ai',
      optimizationUnitId: demoUnitId,
      intentId: demoIntentId,
      category: 'category_recommendation',
      mentionScore: 88,
      rankingScore: 84,
      accuracyScore: 82,
      sentimentScore: 78,
      citationScore: 74,
      competitorScore: 68,
      knowledgeCompletenessScore: 86,
      totalScore: 80,
      sampleCount: 12,
      insufficientSample: false,
      calculatedAt: new Date('2026-07-01T10:00:00.000Z')
    }
  });

  await prisma.contentGenerationTask.upsert({
    where: { id: demoGenerationTaskId },
    update: {
      growthOptimizationPlanId: demoGrowthPlanId,
      targetPlatform: 'wechat_official',
      contentType: 'wechat_article',
      contentTopic: '公众号推文：贵阳家长如何选择儿童运动成长课',
      targetKeywords: ['贵阳儿童运动成长机构', '儿童体适能推荐', '追光小牛 ACE 成长体系'],
      referenceSources: ['增长优化计划：可引用内容不足', '追光小牛品牌档案', '首轮 GEO 测试样例'],
      retestAt: new Date('2026-07-27T00:00:00.000Z'),
      status: 'completed',
      steps: [
        { id: 'brief', title: '生成内容简报', status: 'completed' },
        { id: 'draft', title: '生成初稿', status: 'completed' },
        { id: 'review', title: '人工复核', status: 'completed' }
      ],
      draftRef: 'demo://content-generation/guide-v1',
      errorMessage: null
    },
    create: {
      id: demoGenerationTaskId,
      brandId: demoBrandId,
      strategyId: demoStrategyId,
      growthOptimizationPlanId: demoGrowthPlanId,
      targetPlatform: 'wechat_official',
      contentType: 'wechat_article',
      contentTopic: '公众号推文：贵阳家长如何选择儿童运动成长课',
      targetKeywords: ['贵阳儿童运动成长机构', '儿童体适能推荐', '追光小牛 ACE 成长体系'],
      referenceSources: ['增长优化计划：可引用内容不足', '追光小牛品牌档案', '首轮 GEO 测试样例'],
      retestAt: new Date('2026-07-27T00:00:00.000Z'),
      status: 'completed',
      steps: [
        { id: 'brief', title: '生成内容简报', status: 'completed' },
        { id: 'draft', title: '生成初稿', status: 'completed' },
        { id: 'review', title: '人工复核', status: 'completed' }
      ],
      draftRef: 'demo://content-generation/guide-v1'
    }
  });

  await prisma.contentVersion.upsert({
    where: { id: demoVersionId },
    update: {
      title: '贵阳家长如何选择儿童运动成长课',
      body: '# 贵阳家长如何选择儿童运动成长课\n\n追光小牛围绕 ACE 成长体系，帮助 2-14 岁儿童家庭从体质、专注力、感统、社交和长期运动兴趣等维度判断课程价值。\n\n## 推荐下一步\n\n补齐贵阳校区、课程案例、官网 FAQ 和家长决策场景内容。',
      version: 1,
      exportFormat: 'markdown'
    },
    create: {
      id: demoVersionId,
      brandId: demoBrandId,
      generationTaskId: demoGenerationTaskId,
      title: '贵阳家长如何选择儿童运动成长课',
      body: '# 贵阳家长如何选择儿童运动成长课\n\n追光小牛围绕 ACE 成长体系，帮助 2-14 岁儿童家庭从体质、专注力、感统、社交和长期运动兴趣等维度判断课程价值。\n\n## 推荐下一步\n\n补齐贵阳校区、课程案例、官网 FAQ 和家长决策场景内容。',
      version: 1,
      exportFormat: 'markdown'
    }
  });

  await prisma.contentExportRecord.upsert({
    where: { id: 'export_demo_guide_markdown' },
    update: {
      exportFormat: 'markdown',
      fileName: 'supercalf-geo-test-guide.md',
      content: '# 贵阳家长如何选择儿童运动成长课\n\n追光小牛内测 GEO 内容草稿，用于验证 AI 平台是否准确理解品牌定位、ACE 体系、课程矩阵和真实背书。',
      createdBy: demoUserId
    },
    create: {
      id: 'export_demo_guide_markdown',
      brandId: demoBrandId,
      generationTaskId: demoGenerationTaskId,
      versionId: demoVersionId,
      exportFormat: 'markdown',
      fileName: 'supercalf-geo-test-guide.md',
      content: '# 贵阳家长如何选择儿童运动成长课\n\n追光小牛内测 GEO 内容草稿，用于验证 AI 平台是否准确理解品牌定位、ACE 体系、课程矩阵和真实背书。',
      createdBy: demoUserId
    }
  });

  await prisma.publishingAccount.upsert({
    where: { id: demoPublishingAccountId },
    update: {
      platform: 'wechat_official',
      accountName: '追光小牛公众号',
      loginMode: 'manual',
      authStatus: 'connected',
      errorMessage: null,
      lastAuthorizedAt: new Date('2026-07-01T08:30:00.000Z')
    },
    create: {
      id: demoPublishingAccountId,
      brandId: demoBrandId,
      platform: 'wechat_official',
      accountName: '追光小牛公众号',
      loginMode: 'manual',
      authStatus: 'connected',
      lastAuthorizedAt: new Date('2026-07-01T08:30:00.000Z')
    }
  });

  await prisma.publishingRecord.upsert({
    where: { id: demoPublishingRecordId },
    update: {
      accountId: demoPublishingAccountId,
      generationTaskId: demoGenerationTaskId,
      versionId: demoVersionId,
      title: '贵阳家长如何选择儿童运动成长课',
      platform: 'wechat_official',
      accountName: '追光小牛公众号',
      status: 'published',
      publishedUrl: 'https://example.com/supercalf/wechat/children-sports-guide',
      errorMessage: null
    },
    create: {
      id: demoPublishingRecordId,
      brandId: demoBrandId,
      contentAssetId: demoAssetId,
      accountId: demoPublishingAccountId,
      generationTaskId: demoGenerationTaskId,
      versionId: demoVersionId,
      title: '贵阳家长如何选择儿童运动成长课',
      platform: 'wechat_official',
      accountName: '追光小牛公众号',
      status: 'published',
      publishedUrl: 'https://example.com/supercalf/wechat/children-sports-guide'
    }
  });

  await prisma.report.upsert({
    where: { id: demoReportId },
    update: {
      type: 'customer_delivery',
      title: '追光小牛 GEO 内测交付报告',
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-07T23:59:59.000Z'),
      status: 'generated',
      content: '---\nreportType: customer_delivery\nbrandId: brand_demo\nperiodStart: 2026-07-01\nperiodEnd: 2026-07-07\n---\n\n# 追光小牛 GEO 内测交付报告\n\n## 执行摘要\n\n追光小牛在贵阳儿童运动成长推荐样本中达到 80 GEO 指数，品牌提及、推荐排序和知识完整度信号较好。\n\n## 交付进度\n\n- 已完成首轮监测样本\n- 已生成内容草稿并导出\n- 已完成官网发布记录演示\n\n## 关键发现\n\n- AI 回答能识别 ACE 成长体系和本地化背书\n- 感统、增高和中考达标表达需要保持审慎\n\n## 下一步\n\n- 补充真实平台 API 样本\n- 复测豆包、Kimi、DeepSeek 和通义千问的回答表现',
      dataGaps: ['真实平台样本仍需补充', '校区详情和课程案例需要客户确认后发布'],
      snapshot: {
        totalScore: 80,
        mentionScore: 88,
        rankingScore: 84,
        citationScore: 74,
        completedTasks: 1,
        publishedRecords: 1
      },
      createdBy: demoUserId
    },
    create: {
      id: demoReportId,
      brandId: demoBrandId,
      type: 'customer_delivery',
      title: '追光小牛 GEO 内测交付报告',
      periodStart: new Date('2026-07-01T00:00:00.000Z'),
      periodEnd: new Date('2026-07-07T23:59:59.000Z'),
      status: 'generated',
      content: '---\nreportType: customer_delivery\nbrandId: brand_demo\nperiodStart: 2026-07-01\nperiodEnd: 2026-07-07\n---\n\n# 追光小牛 GEO 内测交付报告\n\n## 执行摘要\n\n追光小牛在贵阳儿童运动成长推荐样本中达到 80 GEO 指数，品牌提及、推荐排序和知识完整度信号较好。\n\n## 交付进度\n\n- 已完成首轮监测样本\n- 已生成内容草稿并导出\n- 已完成官网发布记录演示\n\n## 关键发现\n\n- AI 回答能识别 ACE 成长体系和本地化背书\n- 感统、增高和中考达标表达需要保持审慎\n\n## 下一步\n\n- 补充真实平台 API 样本\n- 复测豆包、Kimi、DeepSeek 和通义千问的回答表现',
      dataGaps: ['真实平台样本仍需补充', '校区详情和课程案例需要客户确认后发布'],
      snapshot: {
        totalScore: 80,
        mentionScore: 88,
        rankingScore: 84,
        citationScore: 74,
        completedTasks: 1,
        publishedRecords: 1
      },
      createdBy: demoUserId
    }
  });

  await prisma.advisorRecord.upsert({
    where: { id: 'advisor_demo_service_plan' },
    update: {
      type: 'service_plan',
      title: '追光小牛内测服务计划',
      content: '## 服务摘要\n- 已将追光小牛品牌档案作为默认内测品牌。\n\n## 问题\n- 真实平台 API 样本仍需补充，部分课程证明材料需要确认后发布。\n\n## 建议\n- 先补齐豆包、Kimi、DeepSeek 和通义千问平台密钥，再扩大首轮测试问题样本。\n\n## 服务计划\n- 服务目标：验证 AI 平台是否准确理解追光小牛的品牌定位、ACE 体系和课程优势。\n- 负责人：Demo Operator\n- 预期结果：形成可用于内测复盘的 GEO 指数、问题清单和内容优化任务。\n- 里程碑：补齐真实平台 API 配置\n- 里程碑：运行首轮真实平台复测',
      relatedReportId: demoReportId,
      followUpItems: [
        { id: 'follow_demo_content_refresh', title: '补齐贵阳校区和课程案例内容', status: 'doing', owner: 'Demo Operator', dueDate: '2026-07-10' },
        { id: 'follow_demo_retest', title: '配置真实平台 API 后运行首轮复测', status: 'todo', owner: 'Demo Operator', dueDate: '2026-07-12' }
      ],
      createdBy: demoUserId
    },
    create: {
      id: 'advisor_demo_service_plan',
      brandId: demoBrandId,
      type: 'service_plan',
      title: '追光小牛内测服务计划',
      content: '## 服务摘要\n- 已将追光小牛品牌档案作为默认内测品牌。\n\n## 问题\n- 真实平台 API 样本仍需补充，部分课程证明材料需要确认后发布。\n\n## 建议\n- 先补齐豆包、Kimi、DeepSeek 和通义千问平台密钥，再扩大首轮测试问题样本。\n\n## 服务计划\n- 服务目标：验证 AI 平台是否准确理解追光小牛的品牌定位、ACE 体系和课程优势。\n- 负责人：Demo Operator\n- 预期结果：形成可用于内测复盘的 GEO 指数、问题清单和内容优化任务。\n- 里程碑：补齐真实平台 API 配置\n- 里程碑：运行首轮真实平台复测',
      relatedReportId: demoReportId,
      followUpItems: [
        { id: 'follow_demo_content_refresh', title: '补齐贵阳校区和课程案例内容', status: 'doing', owner: 'Demo Operator', dueDate: '2026-07-10' },
        { id: 'follow_demo_retest', title: '配置真实平台 API 后运行首轮复测', status: 'todo', owner: 'Demo Operator', dueDate: '2026-07-12' }
      ],
      createdBy: demoUserId
    }
  });

  await prisma.advisorRecord.upsert({
    where: { id: 'advisor_demo_delivery_review' },
    update: {
      type: 'delivery',
      title: '追光小牛内测交付复盘',
      content: '## 服务摘要\n- 已完成追光小牛内测交付报告准备。\n\n## 复盘记录\n- 完成动作：生成客户交付报告\n- 完成动作：创建官网内容发布记录\n- 数据变化：GEO 总分达到 80，引用分为 74\n- 下一步：收集内测反馈并转入候选需求',
      relatedReportId: demoReportId,
      followUpItems: [
        { id: 'follow_demo_feedback', title: '将追光小牛内测反馈转入候选需求', status: 'todo', owner: 'Product Lead', dueDate: '2026-07-15' }
      ],
      createdBy: demoUserId
    },
    create: {
      id: 'advisor_demo_delivery_review',
      brandId: demoBrandId,
      type: 'delivery',
      title: '追光小牛内测交付复盘',
      content: '## 服务摘要\n- 已完成追光小牛内测交付报告准备。\n\n## 复盘记录\n- 完成动作：生成客户交付报告\n- 完成动作：创建官网内容发布记录\n- 数据变化：GEO 总分达到 80，引用分为 74\n- 下一步：收集内测反馈并转入候选需求',
      relatedReportId: demoReportId,
      followUpItems: [
        { id: 'follow_demo_feedback', title: '将追光小牛内测反馈转入候选需求', status: 'todo', owner: 'Product Lead', dueDate: '2026-07-15' }
      ],
      createdBy: demoUserId
    }
  });

  await prisma.optimizationTask.upsert({
    where: { id: 'task_demo_content_refresh' },
    update: {
      title: '补齐追光小牛贵阳儿童运动推荐内容',
      type: 'content_strategy',
      status: 'doing',
      priority: 'high',
      growthOptimizationPlanId: demoGrowthPlanId,
      sourceRunId: demoRunId,
      contentLink: 'https://example.com/supercalf/wechat/children-sports-guide',
      reviewStatus: 'pending',
      retestPlanAt: new Date('2026-07-27T00:00:00.000Z'),
      dueDate: new Date('2026-07-20T00:00:00.000Z'),
      processingNote: '使用追光小牛品牌档案、ACE 体系、校区信息和首轮监测样本作为内容依据。'
    },
    create: {
      id: 'task_demo_content_refresh',
      brandId: demoBrandId,
      title: '补齐追光小牛贵阳儿童运动推荐内容',
      type: 'content_strategy',
      status: 'doing',
      priority: 'high',
      optimizationUnitId: demoUnitId,
      relatedPromptId: demoPromptId,
      strategyId: demoStrategyId,
      growthOptimizationPlanId: demoGrowthPlanId,
      sourceRunId: demoRunId,
      contentLink: 'https://example.com/supercalf/wechat/children-sports-guide',
      reviewStatus: 'pending',
      retestPlanAt: new Date('2026-07-27T00:00:00.000Z'),
      dueDate: new Date('2026-07-20T00:00:00.000Z'),
      processingNote: '使用追光小牛品牌档案、ACE 体系、校区信息和首轮监测样本作为内容依据。'
    }
  });

  const demoGrowthTasks = [
    {
      id: 'task_demo_growth_publish',
      title: '发布优化内容到公众号、小红书、官网和短视频平台',
      type: 'content_strategy',
      status: 'todo',
      relatedPlatformCode: 'wechat_official',
      dueDate: new Date('2026-07-22T00:00:00.000Z'),
      priority: 'high',
      reviewStatus: 'pending'
    },
    {
      id: 'task_demo_growth_profile',
      title: '补充校区案例、课程 FAQ 和审慎表达资料',
      type: 'manual',
      status: 'todo',
      relatedPlatformCode: null,
      dueDate: new Date('2026-07-18T00:00:00.000Z'),
      priority: 'high',
      reviewStatus: 'pending'
    },
    {
      id: 'task_demo_growth_retest',
      title: '按原测试问题安排 7 月 27 日复测',
      type: 'monitoring_issue',
      status: 'retest',
      relatedPlatformCode: 'doubao',
      dueDate: new Date('2026-07-27T00:00:00.000Z'),
      priority: 'high',
      reviewStatus: 'approved',
      retestPlanAt: new Date('2026-07-27T00:00:00.000Z'),
      retestRecords: [{ id: 'retest_demo_growth_plan', taskId: 'task_demo_growth_retest', sourceRunId: demoRunId, retestRunId: '', plannedAt: '2026-07-27T00:00:00.000Z', targetScore: 85, createdAt: '2026-07-06T00:00:00.000Z', updatedAt: '2026-07-06T00:00:00.000Z' }]
    },
    {
      id: 'task_demo_growth_owner',
      title: '跟进增长计划负责人和完成状态',
      type: 'manual',
      status: 'todo',
      relatedPlatformCode: null,
      dueDate: new Date('2026-07-20T00:00:00.000Z'),
      priority: 'medium',
      reviewStatus: 'pending'
    }
  ];

  for (const task of demoGrowthTasks) {
    await prisma.optimizationTask.upsert({
      where: { id: task.id },
      update: {
        title: task.title,
        type: task.type,
        status: task.status,
        ownerId: demoUserId,
        optimizationUnitId: demoUnitId,
        relatedPromptId: demoPromptId,
        relatedPlatformCode: task.relatedPlatformCode,
        strategyId: demoStrategyId,
        growthOptimizationPlanId: demoGrowthPlanId,
        sourceRunId: demoRunId,
        dueDate: task.dueDate,
        priority: task.priority,
        reviewStatus: task.reviewStatus,
        retestPlanAt: task.retestPlanAt ?? null,
        retestRecords: task.retestRecords ?? []
      },
      create: {
        id: task.id,
        brandId: demoBrandId,
        title: task.title,
        type: task.type,
        status: task.status,
        ownerId: demoUserId,
        optimizationUnitId: demoUnitId,
        relatedPromptId: demoPromptId,
        relatedPlatformCode: task.relatedPlatformCode,
        strategyId: demoStrategyId,
        growthOptimizationPlanId: demoGrowthPlanId,
        sourceRunId: demoRunId,
        dueDate: task.dueDate,
        priority: task.priority,
        reviewStatus: task.reviewStatus,
        retestPlanAt: task.retestPlanAt ?? null,
        retestRecords: task.retestRecords ?? []
      }
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
