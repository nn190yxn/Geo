import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

describe('operation workflow repository integration', () => {
  it('connects brand setup, monitoring, strategy, content, publishing, retest and report export', () => {
    const repository = new PermissionsRepository();
    const brand = repository.createBrand('user_demo', {
      name: `运营闭环品牌 ${Date.now()}_${Math.random()}`,
      aliases: ['闭环品牌'],
      industry: '本地服务',
      website: 'https://workflow.example.com',
      targetCities: ['深圳'],
      businessScope: 'GEO 运营闭环测试',
      targetAudience: '运营负责人',
      status: 'active'
    });
    const profile = repository.saveBrandProfile('user_demo', brand.brandId, {
      intro: '运营闭环品牌提供 GEO 监测、内容策略和复测服务。',
      valueProps: ['多品牌管理', '监测闭环'],
      offerings: ['GEO 诊断', '内容优化'],
      proofPoints: ['服务案例充足'],
      targetCustomers: ['品牌运营团队'],
      recommendedExpressions: ['AI 搜索可见度提升'],
      blockedExpressions: ['夸大承诺'],
      contentRules: ['引用真实来源'],
      competitors: ['竞品闭环'],
      faqs: [{ question: '如何开始 GEO 运营', answer: '先建立品牌知识库并创建监测 Prompt。' }]
    });
    const unit = repository.createOptimizationUnit('user_demo', brand.brandId, {
      name: '品牌可见度',
      type: 'brand',
      targetKeywords: ['GEO 运营', 'AI 搜索'],
      priority: 'high'
    });
    const intent = repository.createUserIntent('user_demo', brand.brandId, {
      optimizationUnitId: unit?.id ?? '',
      category: 'category_recommendation',
      text: '如何选择 GEO 运营服务',
      monitoringFrequency: 'manual'
    });
    const template = repository.createPromptTemplate({
      name: `运营闭环模板 ${Date.now()}_${Math.random()}`,
      industry: '本地服务',
      category: 'category_recommendation',
      text: '请说明{brandName}是否适合{intent}。',
      targetKeywords: ['GEO 运营'],
      platformCodes: ['manual_input'],
      frequency: 'manual'
    });
    const prompt = repository.batchGenerateBrandPrompts('user_demo', brand.brandId, {
      templateId: template.id,
      intentIds: [intent?.id ?? '']
    })?.[0];
    repository.createPlatformConfig('user_demo', brand.brandId, {
      platformCode: 'manual_input',
      name: '人工录入',
      mode: 'manual',
      enabled: true
    });
    const run = repository.createMonitoringRun('user_demo', brand.brandId, {
      promptId: prompt?.id ?? '',
      platformCode: 'manual_input'
    });
    const completedRun = repository.addManualResponse('user_demo', brand.brandId, run?.id ?? '', {
      rawText: `${brand.name}适合需要 GEO 运营闭环的团队，引用 https://workflow.example.com/case 。`,
      citations: ['https://workflow.example.com/case'],
      modelName: 'manual'
    });
    const analysis = repository.parseAnalysisResult('user_demo', brand.brandId, run?.id ?? '');
    const strategy = repository.createContentStrategy('user_demo', brand.brandId, {
      optimizationUnitId: unit?.id ?? '',
      intentId: intent?.id ?? '',
      type: 'enhancement',
      priority: 'high',
      suggestedTitle: 'GEO 运营闭环服务说明',
      targetPlatform: 'wechat',
      targetKeywords: ['GEO 运营闭环'],
      relatedPromptIds: [prompt?.id ?? '']
    });
    const generation = repository.createContentGenerationTask('user_demo', brand.brandId, {
      strategyId: strategy?.id ?? '',
      targetPlatform: 'wechat',
      contentType: 'wechat_article'
    });
    const exportRecord = repository.exportContentMarkdown('user_demo', brand.brandId, generation?.currentTask?.id ?? '', generation?.currentVersion?.id);
    const account = repository.connectPublishingAccount('user_demo', brand.brandId, {
      platform: 'wechat',
      accountName: '运营闭环公众号'
    });
    const publishing = repository.createPublishingRecord('user_demo', brand.brandId, {
      ...generation?.publishPayload,
      accountId: account?.id,
      status: 'pending'
    });
    const task = repository.createOptimizationTask('user_demo', brand.brandId, {
      title: '根据首轮监测优化内容表达',
      type: 'monitoring_issue',
      optimizationUnitId: unit?.id,
      relatedPromptId: prompt?.id,
      relatedPlatformCode: 'manual_input',
      sourceRunId: run?.id,
      priority: 'high'
    });
    const planned = repository.planOptimizationTaskRetest('user_demo', brand.brandId, task?.id ?? '', {
      sourceRunId: run?.id,
      retestRunId: run?.id,
      targetScore: 80
    });
    const completedTask = repository.completeOptimizationTaskRetest('user_demo', brand.brandId, task?.id ?? '', planned?.retestRecords[0]?.id ?? '', {
      actualScore: 88,
      targetScore: 80
    });
    const report = repository.createReport('user_demo', brand.brandId, {
      type: 'customer_delivery',
      title: '运营闭环客户交付报告'
    });
    const advisor = repository.createAdvisorRecord('user_demo', brand.brandId, {
      type: 'diagnosis',
      title: '运营闭环诊断',
      content: '已完成首轮监测、内容生产、发布记录、任务复测和报告交付。',
      relatedReportId: report?.id
    });
    const workspace = repository.getBrandWorkspaceSnapshot('user_demo', brand.brandId);

    expect(profile?.completenessScore).toBeGreaterThan(80);
    expect(completedRun?.status).toBe('completed');
    expect(analysis?.brandMentioned).toBe(true);
    expect(exportRecord?.content).toContain('GEO 运营闭环服务说明');
    expect(publishing).toMatchObject({ accountId: account?.id, status: 'pending' });
    expect(completedTask).toMatchObject({ status: 'done', sourceRunId: run?.id });
    expect(report?.content).toContain('## 任务进度');
    expect(advisor?.relatedReport?.id).toBe(report?.id);
    expect(workspace?.relatedCounts).toMatchObject({
      profile: 1,
      optimizationUnits: 1,
      intents: 1,
      prompts: 1,
      monitoringRuns: 1,
      reports: 1,
      advisorRecords: 1
    });
  });
});
