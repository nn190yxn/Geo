import { Statistic, Table } from 'antd';
import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import { AnalysisScopeBar } from './AnalysisScopeBar';
import { AnalysisWorkbench } from './AnalysisWorkbench';

describe('AnalysisWorkbench', () => {
  it('renders the shared analysis hierarchy and scope controls', () => {
    const markup = renderToStaticMarkup(
      <AnalysisWorkbench
        title="统一分析"
        description="分析页面说明"
        findings={['优先结论', '第二项发现']}
        actions={['创建优化任务']}
        filters={(
          <AnalysisScopeBar
            value={{ search: 'FAQ', from: '2026-07-01', to: '2026-07-16', platform: 'kimi', status: 'open', optimizationUnitId: 'unit-1', intentId: 'intent-1' }}
            onChange={() => undefined}
            onClear={() => undefined}
            statusOptions={[{ value: 'open', label: '待处理' }]}
            optimizationUnitOptions={[{ value: 'unit-1', label: '品牌认知优化' }]}
            intentOptions={[{ value: 'intent-1', label: '品牌了解' }]}
            resultCount={1}
            totalCount={3}
          />
        )}
        trend={<Table rowKey="key" dataSource={[{ key: 'trend-1', value: '趋势证据' }]} pagination={false} columns={[{ title: '趋势', dataIndex: 'value' }]} />}
        distribution={<div>平台分布</div>}
        details={<div>真实回复证据</div>}
      >
        <Statistic title="提及率" value={60} suffix="%" />
      </AnalysisWorkbench>
    );

    for (const content of ['统一分析', '分析范围', '关键结论', '趋势与分布', '证据明细', '建议动作']) {
      expect(markup).toContain(content);
    }
    for (const control of ['搜索', '开始日期', '结束日期', '选择 AI 平台', '状态筛选', '优化单元筛选', '用户意图筛选']) {
      expect(markup).toContain(`aria-label="${control}"`);
    }
    expect(markup).toContain('Kimi');
    expect(markup).toContain('品牌认知优化');
    expect(markup).toContain('品牌了解');
    expect(markup).toContain('显示 1 条，共 3 条');
    const analysisScopeHeading = markup.indexOf('>分析范围</h2>');
    const insightHeading = markup.indexOf('>关键结论</span>');
    const trendHeading = markup.indexOf('>趋势与分布</h3>');
    const evidenceHeading = markup.indexOf('>证据明细</h3>');
    expect(analysisScopeHeading).toBeLessThan(insightHeading);
    expect(insightHeading).toBeLessThan(trendHeading);
    expect(trendHeading).toBeLessThan(evidenceHeading);
  });

  it('renders the observation state and omits missing detail regions', () => {
    const markup = renderToStaticMarkup(
      <AnalysisWorkbench title="空分析" description="等待样本" findings={[]} actions={['继续监测']}>
        <Statistic title="样本" value={0} />
      </AnalysisWorkbench>
    );

    expect(markup).toContain('当前没有需要立即处理的分析结论');
    expect(markup).toContain('持续观察');
    expect(markup).toContain('继续监测');
    expect(markup).not.toContain('趋势与分布');
    expect(markup).not.toContain('证据明细');
  });

  it('uses task components instead of default action strings', () => {
    const markup = renderToStaticMarkup(
      <AnalysisWorkbench
        title="任务化分析"
        description="处理风险"
        findings={['发现内容缺口']}
        actions={['默认建议动作']}
        tasks={<a href="/tasks?action=create">创建优化任务</a>}
      >
        <Statistic title="风险" value={1} />
      </AnalysisWorkbench>
    );

    expect(markup).toContain('创建优化任务');
    expect(markup).toContain('/tasks?action=create');
    expect(markup).not.toContain('默认建议动作');
  });

  it('replaces analysis content with the supplied recovery state', () => {
    const markup = renderToStaticMarkup(
      <AnalysisWorkbench
        title="恢复分析"
        description="请求失败"
        findings={['结论']}
        actions={['动作']}
        filters={<div>筛选仍可见</div>}
        contentState={<div>重新加载分析数据</div>}
      >
        <Statistic title="指标" value={1} />
      </AnalysisWorkbench>
    );

    expect(markup).toContain('恢复分析');
    expect(markup).toContain('分析范围');
    expect(markup).toContain('筛选仍可见');
    expect(markup).toContain('重新加载分析数据');
    expect(markup).not.toContain('关键结论');
  });
});
