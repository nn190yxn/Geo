import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('test plan repository', () => {
  it('provides Supercalf default test themes, questions and first-round plan', () => {
    const repository = new PermissionsRepository();

    const themes = repository.listTestThemes('user_demo', 'brand_demo');
    const candidates = repository.listTestQuestionCandidates('user_demo', 'brand_demo', { selected: true });
    const plans = repository.listTestPlans('user_demo', 'brand_demo');

    expect(themes?.map((theme) => theme.name)).toEqual(expect.arrayContaining(['贵阳儿童运动', '3 到 5 岁儿童体能', '增高体能']));
    expect(candidates?.map((candidate) => candidate.question)).toEqual(expect.arrayContaining([
      '贵阳有哪些值得推荐的儿童运动成长机构？',
      '贵阳哪里有适合 3-5 岁孩子的体能馆？',
      '贵阳儿童增高体能课怎么选？哪些表达需要家长谨慎看待？'
    ]));
    expect(candidates?.every((candidate) => candidate.promptId === 'prompt_demo_comparison')).toBe(true);
    expect(plans).toContainEqual(expect.objectContaining({
      id: 'test_plan_demo_supercalf_first_round',
      name: '追光小牛首轮 AI 回复监测计划',
      status: 'needs_confirmation',
      platformCodes: ['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun'],
      executionMethod: 'browser',
      estimatedDurationMinutes: 48
    }));
  });

  it('creates a test plan from chosen question candidates', () => {
    const repository = new PermissionsRepository();
    const theme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'location',
      name: '贵阳儿童运动计划',
      businessExplanation: '验证贵阳儿童运动推荐',
      priority: 'high',
      estimatedValue: '判断本地推荐表现'
    });
    const selected = repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: theme?.id ?? '',
      question: '贵阳哪里有适合 3-5 岁孩子的体能馆？',
      purposes: ['brand_mentioned', 'rank_first', 'value_prop_accuracy'],
      targetPlatforms: ['doubao', 'unconfigured_ai'],
      priority: 'high',
      estimatedValue: '验证低龄儿童体能启蒙需求',
      selected: true
    });
    repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: theme?.id ?? '',
      question: '贵阳儿童运动馆怎么选？',
      purposes: ['brand_mentioned'],
      targetPlatforms: ['doubao'],
      priority: 'medium',
      estimatedValue: '验证未选择问题',
      selected: false
    });

    const plan = repository.createTestPlan('user_demo', 'brand_demo', { candidateIds: [selected?.id ?? ''] });

    expect(plan).toMatchObject({
      brandId: 'brand_demo',
      name: '追光小牛首轮 AI 回复监测计划',
      status: 'needs_configuration',
      executionMethod: 'browser',
      estimatedDurationMinutes: 5,
      createdBy: 'user_demo'
    });
    expect(plan?.questions).toEqual([
      expect.objectContaining({ candidateId: selected?.id, question: '贵阳哪里有适合 3-5 岁孩子的体能馆？' })
    ]);
    expect(plan?.platformCodes).toEqual(['doubao', 'unconfigured_ai']);
    expect(plan?.connectionSummary).toEqual(expect.arrayContaining([
      expect.objectContaining({ platformCode: 'doubao', status: 'needs_confirmation', methods: ['api', 'browser', 'manual'] }),
      expect.objectContaining({ platformCode: 'unconfigured_ai', status: 'needs_configuration' })
    ]));
    expect(plan?.confirmationItems).toEqual(expect.arrayContaining(['豆包 需要确认浏览器登录或切换手动录入', 'unconfigured_ai 需要先补充平台连接信息']));
    expect(repository.listTestPlans('user_demo', 'brand_demo')).toContainEqual(plan);
  });

  it('creates a test plan from explicit candidate ids and platform overrides', () => {
    const repository = new PermissionsRepository();
    const theme = repository.createTestTheme('user_demo', 'brand_demo', {
      type: 'brand',
      name: '品牌认知计划',
      businessExplanation: '验证品牌认知',
      priority: 'high',
      estimatedValue: '判断品牌认知'
    });
    const candidate = repository.createTestQuestionCandidate('user_demo', 'brand_demo', {
      themeId: theme?.id ?? '',
      question: '追光小牛是做什么的？',
      purposes: ['brand_mentioned'],
      targetPlatforms: ['doubao'],
      priority: 'high',
      estimatedValue: '验证品牌认知',
      selected: false
    });

    const plan = repository.createTestPlan('user_demo', 'brand_demo', {
      name: '自定义监测计划',
      candidateIds: [candidate?.id ?? ''],
      platformCodes: ['mock_ai']
    });

    expect(plan).toMatchObject({ name: '自定义监测计划', status: 'ready', executionMethod: 'api' });
    expect(plan?.platformCodes).toEqual(['mock_ai']);
    expect(plan?.connectionSummary).toEqual([expect.objectContaining({ platformCode: 'mock_ai', status: 'ready' })]);
  });

  it('rejects empty plans and inaccessible brands', () => {
    const repository = new PermissionsRepository();
    const emptyBrand = repository.createBrand('user_demo', {
      name: '空计划测试品牌',
      aliases: [],
      industry: '测试行业',
      website: '',
      targetCities: [],
      businessScope: '测试业务',
      targetAudience: '测试用户',
      status: 'active'
    });

    expect(repository.createTestPlan('user_demo', emptyBrand.brandId, {})).toBeNull();
    expect(repository.listTestPlans('other_user', 'brand_demo')).toBeNull();
  });

  it('orchestrates API, browser, manual and configuration execution paths', () => {
    const repository = new PermissionsRepository();
    const plan = repository.createTestPlan('user_demo', 'brand_demo', {
      name: '执行编排计划',
      questions: [
        {
          promptId: 'prompt_demo_comparison',
          question: '贵阳有哪些适合儿童的运动成长机构？',
          purposes: ['brand_mentioned', 'rank_first'],
          targetPlatforms: ['mock_ai', 'doubao', 'manual_input', 'unconfigured_ai']
        }
      ]
    });

    const result = repository.executeTestPlan('user_demo', 'brand_demo', plan?.id ?? '');

    expect(result).toMatchObject({ status: 'running' });
    expect(result?.apiRuns).toHaveLength(1);
    expect(result?.apiRuns[0]).toMatchObject({ promptId: 'prompt_demo_comparison', platformCode: 'mock_ai', status: 'completed' });
    expect(result?.browserSteps).toEqual([expect.objectContaining({
      platformCode: 'doubao',
      method: 'browser',
      status: 'needs_confirmation',
      question: '贵阳有哪些适合儿童的运动成长机构？',
      message: expect.stringContaining('尚未接入真实回答回填')
    })]);
    expect(result?.browserSteps[0]?.runId).toBeUndefined();
    expect(result?.manualSteps).toEqual([expect.objectContaining({ platformCode: 'manual_input', method: 'manual', status: 'manual_required' })]);
    expect(result?.configurationItems).toEqual([expect.objectContaining({ platformCode: 'unconfigured_ai', status: 'needs_configuration' })]);
    expect(result?.plan.monitoringRunIds).toEqual([result?.apiRuns[0]?.id]);
    expect(repository.listTestPlans('user_demo', 'brand_demo')?.find((item) => item.id === plan?.id)).toMatchObject({ status: 'running' });
  });

  it('executes configured API platforms and writes response analysis and audit records', () => {
    const repository = new PermissionsRepository();
    const platform = repository.createPlatformConfig('user_demo', 'brand_demo', {
      platformCode: 'api_exec_test',
      name: 'API 执行测试平台',
      mode: 'api',
      endpointUrl: 'https://api.example.com/chat/completions',
      modelName: 'api-exec-model',
      credentialRef: 'API_EXEC_TEST_KEY'
    });
    const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
      name: 'API 执行测试对象',
      type: 'brand',
      priority: 'high'
    });
    const intent = repository.createUserIntent('user_demo', 'brand_demo', {
      optimizationUnitId: unit?.id ?? '',
      category: 'category_recommendation',
      text: '儿童运动成长机构选择',
      monitoringFrequency: 'manual'
    });
    const template = repository.createPromptTemplate({
      name: 'API 执行测试模板',
      category: 'category_recommendation',
      text: '请回答{intent}，并说明是否推荐{brandName}。',
      platformCodes: [platform?.platformCode ?? ''],
      frequency: 'manual'
    });
    const prompts = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
      templateId: template.id,
      intentIds: [intent?.id ?? '']
    });
    const plan = repository.createTestPlan('user_demo', 'brand_demo', {
      name: 'API 执行计划',
      questions: [
        {
          promptId: prompts?.[0]?.id,
          question: '贵阳有哪些适合儿童的运动成长机构？',
          purposes: ['brand_mentioned', 'rank_first'],
          targetPlatforms: [platform?.platformCode ?? '']
        }
      ]
    });

    const result = repository.executeTestPlan('user_demo', 'brand_demo', plan?.id ?? '');
    const run = result?.apiRuns[0];

    expect(result).toMatchObject({ status: 'running' });
    expect(run).toMatchObject({ platformCode: 'api_exec_test', status: 'completed' });
    expect(run?.response).toEqual(expect.objectContaining({ rawText: expect.stringContaining('API response for api_exec_test'), modelName: 'api-exec-model' }));
    expect(run?.analysis).toEqual(expect.objectContaining({ brandId: 'brand_demo' }));
    expect(repository.listAIPlatformCallAudits('user_demo', 'brand_demo')).toContainEqual(
      expect.objectContaining({ platformCode: 'api_exec_test', status: 'succeeded', modelName: 'api-exec-model' })
    );
    expect(repository.listAsyncJobs('user_demo', 'brand_demo', 'succeeded')).toContainEqual(
      expect.objectContaining({ jobType: 'monitoring', entityId: run?.id })
    );
  });

  it('keeps browser execution in confirmation flow when the question has no prompt', () => {
    const repository = new PermissionsRepository();
    const plan = repository.createTestPlan('user_demo', 'brand_demo', {
      name: '无 Prompt 浏览器计划',
      questions: [
        {
          question: '贵阳儿童运动机构怎么选？',
          purposes: ['brand_mentioned'],
          targetPlatforms: ['doubao']
        }
      ]
    });

    const result = repository.executeTestPlan('user_demo', 'brand_demo', plan?.id ?? '');

    expect(result).toMatchObject({ status: 'needs_confirmation', apiRuns: [] });
    expect(result?.browserSteps).toEqual([
      expect.objectContaining({ platformCode: 'doubao', method: 'browser', status: 'needs_confirmation' })
    ]);
    expect(result?.browserSteps[0]?.runId).toBeUndefined();
    expect(result?.confirmationItems).toEqual(expect.arrayContaining(['该问题尚未关联 Prompt，需要先确认问题或切换为手动录入。']));
  });

  it('matches manual batch answers by test question and platform', () => {
    const repository = new PermissionsRepository();
    const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
      name: '手动录入测试对象',
      type: 'brand',
      priority: 'high'
    });
    const intent = repository.createUserIntent('user_demo', 'brand_demo', {
      optimizationUnitId: unit?.id ?? '',
      category: 'category_recommendation',
      text: '儿童运动机构选择',
      monitoringFrequency: 'manual'
    });
    const template = repository.createPromptTemplate({
      name: '手动录入模板',
      category: 'category_recommendation',
      text: '请回答{intent}，并说明是否推荐{brandName}。',
      platformCodes: ['manual_input'],
      frequency: 'manual'
    });
    const prompts = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
      templateId: template.id,
      intentIds: [intent?.id ?? '']
    });
    const plan = repository.createTestPlan('user_demo', 'brand_demo', {
      name: '手动批量录入计划',
      questions: [
        {
          promptId: prompts?.[0]?.id,
          question: '贵阳儿童运动机构怎么选？',
          purposes: ['brand_mentioned'],
          targetPlatforms: ['manual_input']
        }
      ]
    });

    const result = repository.submitManualTestAnswers('user_demo', 'brand_demo', {
      answers: [
        {
          testPlanId: plan?.id ?? '',
          question: '贵阳儿童运动机构怎么选？',
          platformCode: 'manual_input',
          rawText: '追光小牛适合关注儿童运动成长的家庭。',
          citations: ['https://supercalf.example.com'],
          modelName: 'manual-test'
        },
        {
          testPlanId: plan?.id ?? '',
          question: '贵阳儿童运动机构怎么选？',
          platformCode: 'manual_input',
          rawText: '   '
        },
        {
          testPlanId: plan?.id ?? '',
          question: '未在计划中的问题',
          platformCode: 'manual_input',
          rawText: '无法匹配的问题回答'
        }
      ]
    });

    expect(result?.accepted).toHaveLength(1);
    expect(result?.accepted[0]).toMatchObject({ status: 'accepted', platformCode: 'manual_input' });
    expect(result?.accepted[0]?.run).toMatchObject({
      status: 'completed',
      response: expect.objectContaining({ rawText: '追光小牛适合关注儿童运动成长的家庭。', citations: ['https://supercalf.example.com'] }),
      analysis: expect.objectContaining({ brandId: 'brand_demo' })
    });
    expect(result?.failed).toEqual([
      expect.objectContaining({ status: 'failed', message: '粘贴内容为空，请补充平台回答。' }),
      expect.objectContaining({ status: 'failed', message: '未匹配到对应监测问题和平台，请重新选择对应问题。' })
    ]);
    expect(repository.listTestPlans('user_demo', 'brand_demo')?.find((item) => item.id === plan?.id)?.monitoringRunIds).toContain(result?.accepted[0]?.run?.id);
  });

  it('returns configuration guidance when every target platform is unavailable', () => {
    const repository = new PermissionsRepository();
    const plan = repository.createTestPlan('user_demo', 'brand_demo', {
      questions: [
        {
          question: '贵阳儿童运动机构怎么选？',
          purposes: ['brand_mentioned'],
          targetPlatforms: ['unconfigured_ai']
        }
      ]
    });

    const result = repository.executeTestPlan('user_demo', 'brand_demo', plan?.id ?? '');

    expect(result).toMatchObject({ status: 'needs_configuration', apiRuns: [], browserSteps: [], manualSteps: [] });
    expect(result?.configurationItems).toEqual([expect.objectContaining({ platformCode: 'unconfigured_ai', status: 'needs_configuration' })]);
  });

  it('recommends industry templates and applies template plans', () => {
    const repository = new PermissionsRepository();

    const templates = repository.listTestPlanTemplates('user_demo', 'brand_demo');
    expect(templates?.[0]).toMatchObject({ id: 'children_sports_local_growth', recommended: true });

    const plan = repository.applyTestPlanTemplate('user_demo', 'brand_demo', { templateId: 'children_sports_local_growth' });

    expect(plan).toMatchObject({ name: '追光小牛儿童运动本地增长模板', executionMethod: 'browser' });
    expect(plan?.questions.map((question) => question.question)).toEqual(expect.arrayContaining([
      '贵阳有哪些值得推荐的儿童运动成长机构？',
      '贵阳哪里有适合 3-5 岁孩子的体能馆？'
    ]));
    expect(plan?.platformCodes).toEqual(['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun']);
  });

  it('falls back to the generic template when no industry template matches', () => {
    const repository = new PermissionsRepository();
    const brand = repository.createBrand('user_demo', {
      name: '本地咖啡品牌',
      aliases: [],
      industry: '餐饮咖啡',
      website: '',
      targetCities: ['成都'],
      businessScope: '精品咖啡门店',
      targetAudience: '本地咖啡消费者',
      status: 'active'
    });

    const templates = repository.listTestPlanTemplates('user_demo', brand.brandId);

    expect(templates?.[0]).toMatchObject({ id: 'generic_brand_first_round', recommended: true });
  });

  it('duplicates existing plans and supports retest naming', () => {
    const repository = new PermissionsRepository();
    const source = repository.createTestPlan('user_demo', 'brand_demo', {
      name: '首轮监测计划',
      questions: [
        {
          question: '追光小牛是做什么的？',
          purposes: ['brand_mentioned'],
          targetPlatforms: ['doubao']
        }
      ]
    });

    const copy = repository.duplicateTestPlan('user_demo', 'brand_demo', source?.id ?? '', { retest: true });

    expect(copy).toMatchObject({ name: '首轮监测计划复测' });
    expect(copy?.id).not.toBe(source?.id);
    expect(copy?.questions).toEqual(source?.questions);
    expect(copy?.platformCodes).toEqual(source?.platformCodes);
  });
});
