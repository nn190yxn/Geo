import { describe, expect, it } from 'vitest';
import { buildAdvisorRecordContent, getAdvisorRecordSections } from './AdvisorWorkspacePage';

describe('AdvisorWorkspacePage helpers', () => {
  it('builds structured service plan content', () => {
    const content = buildAdvisorRecordContent({
      type: 'service_plan',
      title: '月度服务计划',
      content: '围绕客户交付建立本月服务目标。',
      serviceObjective: '提升核心场景推荐排序',
      milestonesText: '补齐官网 FAQ\n完成客户交付报告解读',
      owner: '顾问',
      expectedOutcome: '核心场景推荐排序进入前三',
      followUpItems: []
    });

    expect(content).toContain('## 服务摘要');
    expect(content).toContain('## 服务计划');
    expect(content).toContain('服务目标：提升核心场景推荐排序');
    expect(content).toContain('负责人：顾问');
    expect(content).toContain('预期结果：核心场景推荐排序进入前三');
    expect(content).toContain('里程碑：补齐官网 FAQ');
  });

  it('parses review sections for detail display', () => {
    const sections = getAdvisorRecordSections('## 复盘记录\n- 完成动作：发布官网 FAQ\n- 数据变化：官网引用率提升 12%\n- 下一步：复测核心 Prompt');

    expect(sections).toEqual([
      {
        title: '复盘记录',
        content: ['完成动作：发布官网 FAQ', '数据变化：官网引用率提升 12%', '下一步：复测核心 Prompt']
      }
    ]);
  });

  it('keeps legacy plain text records visible as a summary section', () => {
    expect(getAdvisorRecordSections('复盘本周内容策略与任务复测结果。')).toEqual([
      {
        title: '服务摘要',
        content: ['复盘本周内容策略与任务复测结果。']
      }
    ]);
  });
});
