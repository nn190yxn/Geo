import { describe, expect, it } from 'vitest';
import { PermissionsRepository } from '../src/modules/permissions/permissions.repository';

function createIsolatedBrand(repository: PermissionsRepository, name = '顾问测试品牌') {
  return repository.createBrand('user_demo', {
    name: `${name} ${Date.now()}_${Math.random()}`,
    industry: 'GEO',
    businessScope: 'GEO 测试',
    targetAudience: '品牌运营团队'
  }).brandId;
}

describe('advisor records repository', () => {
  it('creates diagnosis, service plan, review, delivery, training and rule update records for a brand', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const diagnosis = repository.createAdvisorRecord('user_demo', brandId, {
      type: 'diagnosis',
      title: '品牌 GEO 诊断',
      content: '当前品牌在核心场景中的推荐排序稳定，但引用来源仍需补强。',
      followUpItems: [{ title: '补充官网 FAQ 内容', status: 'todo', owner: '顾问' }]
    });
    repository.createAdvisorRecord('user_demo', brandId, {
      type: 'service_plan',
      title: '月度服务计划',
      content: '## 服务计划\n- 服务目标：提升品牌核心场景推荐排序\n- 负责人：顾问\n- 预期结果：核心场景推荐排序进入前三\n- 里程碑：完成 FAQ 补齐'
    });
    repository.createAdvisorRecord('user_demo', brandId, {
      type: 'review',
      title: '周度服务复盘',
      content: '## 复盘记录\n- 完成动作：发布官网 FAQ\n- 数据变化：官网引用率提升 12%\n- 下一步：复测核心 Prompt'
    });
    repository.createAdvisorRecord('user_demo', brandId, {
      type: 'delivery',
      title: '客户交付记录',
      content: '## 服务摘要\n- 已完成本期客户交付报告解读。'
    });
    repository.createAdvisorRecord('user_demo', brandId, {
      type: 'training',
      title: '运营培训',
      content: '培训客户团队使用报告中心和任务复测工作台。'
    });
    repository.createAdvisorRecord('user_demo', brandId, {
      type: 'rule_update',
      title: '行业规则更新',
      content: '本地生活服务类目推荐回答更重视服务半径和真实案例。'
    });
    const dashboard = repository.getAdvisorDashboard('user_demo', brandId);

    expect(dashboard?.records.map((item) => item.title)).toEqual(expect.arrayContaining(['品牌 GEO 诊断', '月度服务计划', '周度服务复盘', '客户交付记录', '运营培训', '行业规则更新']));
    expect(dashboard?.latestDiagnosis?.id).toBe(diagnosis?.id);
    expect(dashboard?.pendingFollowUps).toMatchObject([{ title: '补充官网 FAQ 内容', status: 'todo' }]);
    expect(dashboard?.records.find((item) => item.type === 'service_plan')?.content).toContain('预期结果：核心场景推荐排序进入前三');
    expect(dashboard?.records.find((item) => item.type === 'review')?.content).toContain('数据变化：官网引用率提升 12%');
  });

  it('links advisor record to a same brand report', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository);
    const report = repository.createReport('user_demo', brandId, {
      type: 'customer_delivery',
      title: '客户交付报告'
    });
    const record = repository.createAdvisorRecord('user_demo', brandId, {
      type: 'service',
      title: '报告解读服务',
      content: '向客户解释本期 GEO 指标和优化建议。',
      relatedReportId: report?.id
    });
    const dashboard = repository.getAdvisorDashboard('user_demo', brandId);

    expect(record?.relatedReport?.title).toBe('客户交付报告');
    expect(dashboard?.relatedReports.map((item) => item.id)).toContain(report?.id);
  });

  it('rejects report links from another brand and keeps brand isolation', () => {
    const repository = new PermissionsRepository();
    const brandId = createIsolatedBrand(repository, '主品牌');
    const otherBrandId = 'brand_child_fitness';
    const otherBrandReport = repository.createReport('user_demo', otherBrandId, {
      type: 'weekly',
      title: '其他品牌周报'
    });
    const record = repository.createAdvisorRecord('user_demo', brandId, {
      type: 'service',
      title: '跨品牌报告引用',
      content: '这条记录不应创建。',
      relatedReportId: otherBrandReport?.id
    });
    repository.createAdvisorRecord('user_demo', otherBrandId, {
      type: 'diagnosis',
      title: '儿童体适能诊断',
      content: '儿童体适能品牌服务记录。'
    });

    expect(record).toBeNull();
    expect(repository.getAdvisorDashboard('user_demo', brandId)?.records.map((item) => item.title)).not.toContain('跨品牌报告引用');
    expect(repository.getAdvisorDashboard('user_demo', otherBrandId)?.records.map((item) => item.title)).toContain('儿童体适能诊断');
  });
});
