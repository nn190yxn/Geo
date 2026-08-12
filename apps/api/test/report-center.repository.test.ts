import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function prepareReportScenario(repository: PermissionsRepository) {
  const unit = repository.createOptimizationUnit('user_demo', 'brand_demo', {
    name: `报告测试单元 ${Date.now()}_${Math.random()}`,
    type: 'brand',
    targetKeywords: ['报告中心', '客户交付'],
    priority: 'high'
  });
  const intent = repository.createUserIntent('user_demo', 'brand_demo', {
    optimizationUnitId: unit?.id ?? '',
    category: 'category_recommendation',
    text: '如何生成客户交付 GEO 报告',
    monitoringFrequency: 'manual'
  });
  const template = repository.createPromptTemplate({
    name: `报告模板 ${Date.now()}_${Math.random()}`,
    category: 'category_recommendation',
    text: '请说明{brandName}在{intent}中的表现。',
    targetKeywords: ['报告中心'],
    platformCodes: ['manual_input'],
    frequency: 'manual'
  });
  const prompt = repository.batchGenerateBrandPrompts('user_demo', 'brand_demo', {
    templateId: template.id,
    intentIds: [intent?.id ?? '']
  })?.[0];
  repository.createPlatformConfig('user_demo', 'brand_demo', {
    platformCode: 'manual_input',
    name: '人工录入',
    mode: 'manual',
    enabled: true
  });
  const run = repository.createMonitoringRun('user_demo', 'brand_demo', {
    promptId: prompt?.id ?? '',
    platformCode: 'manual_input'
  });
  repository.addManualResponse('user_demo', 'brand_demo', run?.id ?? '', {
    rawText: '示例品牌 GEO 在报告中心和客户交付场景中表现稳定，引用 https://example.com/report 。',
    citations: ['https://example.com/report'],
    modelName: 'manual'
  });
  repository.parseAnalysisResult('user_demo', 'brand_demo', run?.id ?? '');

  return { run };
}

describe('report center repository', () => {
  it('generates customer delivery report with full markdown sections and snapshot', () => {
    const repository = new PermissionsRepository();
    prepareReportScenario(repository);
    const report = repository.createReport('user_demo', 'brand_demo', {
      type: 'customer_delivery',
      title: '客户交付报告',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-07'
    });

    expect(report).toMatchObject({
      brandId: 'brand_demo',
      type: 'customer_delivery',
      status: 'generated',
      title: '客户交付报告',
      periodStart: '2026-07-01',
      periodEnd: '2026-07-07'
    });
    expect(report?.content).toContain('## GEO 总指数');
    expect(report?.content).toContain('```yaml');
    expect(report?.content).toContain('reportType: customer_delivery');
    expect(report?.content).toContain('brandId: brand_demo');
    expect(report?.content).toContain('## 指标解释');
    expect(report?.content).toContain('## 问题归因');
    expect(report?.content).toContain('## 行动建议');
    expect(report?.content).toContain('## 竞品与引用');
    expect(report?.content).toContain('报告版本：客户交付版');
    expect(report?.snapshot).toHaveProperty('metrics');
  });

  it('lists generated reports and reads report detail by id', () => {
    const repository = new PermissionsRepository();
    const report = repository.createReport('user_demo', 'brand_demo', {
      type: 'weekly',
      title: '单品牌周报'
    });
    const dashboard = repository.getReportDashboard('user_demo', 'brand_demo');
    const detail = repository.getReport('user_demo', 'brand_demo', report?.id ?? '');

    expect(dashboard?.reports.map((item) => item.id)).toContain(report?.id);
    expect(dashboard?.latest?.id).toBe(report?.id);
    expect(detail?.content).toContain('# 单品牌周报');
  });

  it('marks data gaps when report source data is incomplete', () => {
    const repository = new PermissionsRepository();
    const report = repository.createReport('user_demo', 'brand_child_fitness', {
      type: 'monthly'
    });

    expect(report?.dataGaps.length).toBeGreaterThan(0);
    expect(report?.content).toContain('## 数据缺口');
  });

  it('generates multi brand report with ranking and high priority issues', () => {
    const repository = new PermissionsRepository();
    repository.createOptimizationTask('user_demo', 'brand_demo', {
      title: '高优先级报告问题',
      type: 'monitoring_issue',
      priority: 'high'
    });
    const report = repository.createReport('user_demo', 'brand_demo', {
      type: 'multi_brand',
      title: '多品牌对比报告'
    });

    expect(report?.content).toContain('## 品牌排名');
    expect(report?.content).toContain('reportType: multi_brand');
    expect(report?.content).toContain('## 品牌对比');
    expect(report?.content).toContain('## 风险提示');
    expect(report?.content).toContain('## 交付进度');
    expect(report?.content).toContain('## 下一步动作');
    expect(report?.content).toContain('## 高优先级问题');
    expect(report?.snapshot).toHaveProperty('ranking');
  });

  it('keeps generated report content and snapshot stable after later business changes', () => {
    const repository = new PermissionsRepository();
    const report = repository.createReport('user_demo', 'brand_demo', { type: 'weekly' });
    const frozenContent = report?.content;
    const frozenSnapshot = JSON.stringify(report?.snapshot);

    repository.createOptimizationTask('user_demo', 'brand_demo', {
      title: `报告生成后的任务 ${Date.now()}`,
      type: 'manual',
      priority: 'high'
    });
    const detail = repository.getReport('user_demo', 'brand_demo', report?.id ?? '');

    expect(detail?.content).toBe(frozenContent);
    expect(JSON.stringify(detail?.snapshot)).toBe(frozenSnapshot);
  });
});
