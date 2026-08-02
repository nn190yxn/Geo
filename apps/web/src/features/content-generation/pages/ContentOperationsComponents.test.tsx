import { renderToStaticMarkup } from 'react-dom/server';
import { describe, expect, it } from 'vitest';
import type { ContentGenerationTask, PublishingEntryPayload } from '@geo-platform/shared-types';
import { readWorkflowRouteContext } from '../../../app/routePaths';
import { CreationWorkspace } from '../../../components/CreationWorkspace';
import {
  ContentDraftActions,
  ContentDraftEmptyState,
  ContentOptimizationSuggestionPanel,
  ContentResultExpectation,
  ContentTemplatePicker,
  DraftWorkflowStatePanel,
  contentTemplateOptions,
  getContentDraftPanelState,
  getContentOptimizationSuggestions,
  getContentPublishPreparationPath,
  getContentTemplateFormPreset,
  getContentTaskConfigurationIssues,
  getDraftQualityCheck
} from './ContentGenerationPage';

describe('content operations components', () => {
  it('renders the selected channel template and its complete usage guidance', () => {
    const markup = renderToStaticMarkup(
      <ContentTemplatePicker selectedKey="xiaohongshu_seed" onSelect={() => undefined} />
    );

    expect(markup).toContain('小红书种草模板');
    expect(markup).toContain('content-template-card-selected');
    expect(markup).toContain('aria-pressed="true"');
    expect(markup).toContain('aria-label="选择小红书种草模板"');
    expect(markup).toContain('已选');
    expect(markup).toContain('预计结构：场景痛点 -&gt; 体验亮点 -&gt; 话题标签');
    expect(markup).toContain('素材要求：封面图、场景图、话题标签');
  });

  it('defines complete material, citation, channel, and retest rules for all twelve templates', () => {
    expect(contentTemplateOptions).toHaveLength(12);
    expect(new Set(contentTemplateOptions.map((template) => template.key))).toHaveLength(12);

    for (const template of contentTemplateOptions) {
      expect(template.applicablePlatforms, `${template.key} platforms`).not.toHaveLength(0);
      expect(template.recommendedLength, `${template.key} length`).toBeTruthy();
      expect(template.materialRequirements, `${template.key} materials`).not.toHaveLength(0);
      expect(template.citationRequirement, `${template.key} citation`).toBeTruthy();
      expect(template.retestSuggestion, `${template.key} retest`).toBeTruthy();
      expect(getContentTemplateFormPreset(template)).toEqual({
        contentType: template.contentType,
        targetPlatform: template.targetPlatform
      });
    }
  });

  it('keeps optimization configuration visible beside the guided empty result', () => {
    const template = contentTemplateOptions.find((item) => item.key === 'faq_answer')!;
    const markup = renderToStaticMarkup(
      <CreationWorkspace
        configuration="优化目标配置"
        configurationTitle="配置内容"
        result="优化结果"
        resultTitle="结果与发布准备"
        state="empty"
        expectation={<ContentResultExpectation template={template} modeKind="optimization" />}
        emptyState={<ContentDraftEmptyState modeKind="optimization" />}
      />
    );

    expect(markup).toContain('creation-workspace creation-workspace-configuration-first');
    expect(markup).toContain('优化目标配置');
    expect(markup).toContain('预计获得一份可审阅的内容优化稿');
    expect(markup).toContain('等待生成优化建议');
  });

  it('reports every missing optimization requirement and accepts a complete source', () => {
    expect(getContentTaskConfigurationIssues({}, 'optimization')).toEqual([
      '请选择内容策略',
      '请选择现有内容或粘贴需要优化的原文',
      '请选择至少一个优化目标'
    ]);
    expect(getContentTaskConfigurationIssues({
      strategyId: 'strategy-1',
      sourceContent: '现有 FAQ 正文',
      optimizationGoals: ['FAQ 补充']
    }, 'optimization')).toEqual([]);
  });

  it('renders generation failure recovery without losing the task state', () => {
    const task = buildTask({ status: 'failed', errorMessage: '正文生成服务暂时不可用' });
    const state = getContentDraftPanelState(task, undefined, getDraftQualityCheck(undefined, task.contentType));
    const markup = renderToStaticMarkup(
      <DraftWorkflowStatePanel state={state} onRetry={() => undefined} retrying={false} />
    );

    expect(markup).toContain('生成失败');
    expect(markup).toContain('正文生成服务暂时不可用');
    expect(markup).toContain('重新生成');
  });

  it('renders the complete draft handoff action sequence', () => {
    const markup = renderToStaticMarkup(
      <ContentDraftActions
        onExport={() => undefined}
        onCopy={() => undefined}
        onSave={() => undefined}
        onPublishPrepare={() => undefined}
      />
    );

    for (const action of ['导 出', '复制内容', '保存草稿', '进入发布准备']) {
      expect(markup).toContain(action);
    }
    expect(markup.match(/ant-btn-primary/g)).toHaveLength(1);
  });

  it('renders all five optimization recommendation groups', () => {
    const suggestions = getContentOptimizationSuggestions('普通正文', {
      referenceSources: [],
      targetPlatform: 'official_site'
    });
    const markup = renderToStaticMarkup(<ContentOptimizationSuggestionPanel suggestions={suggestions} />);

    for (const label of ['结构建议', '事实补强', 'FAQ 补充', '引用补强', '渠道适配']) {
      expect(markup).toContain(label);
    }
  });

  it('preserves upstream workflow query when handing a task to publishing preparation', () => {
    const sourceContext = readWorkflowRouteContext('?optimizationUnitId=unit-1&intentId=intent-1&runId=run-1&planId=plan-1&taskId=task-1');
    const path = getContentPublishPreparationPath(sourceContext, buildPublishPayload(), 'record-1');
    const targetContext = readWorkflowRouteContext(new URL(path, 'https://example.com').search);

    expect(targetContext).toMatchObject({
      optimizationUnitId: 'unit-1',
      intentId: 'intent-1',
      runId: 'run-1',
      planId: 'plan-1',
      taskId: 'task-1',
      generationTaskId: 'task-1',
      versionId: 'version-1',
      publishingRecordId: 'record-1',
      tab: 'records'
    });
  });
});

function buildTask(overrides: Partial<ContentGenerationTask> = {}): ContentGenerationTask {
  return {
    id: 'task-1',
    brandId: 'brand-1',
    strategyId: 'strategy-1',
    targetPlatform: 'official_site',
    contentType: 'website_faq',
    targetKeywords: ['儿童体能'],
    referenceSources: ['品牌资料'],
    status: 'completed',
    steps: [],
    createdAt: '2026-07-16T00:00:00.000Z',
    updatedAt: '2026-07-16T00:00:00.000Z',
    ...overrides
  };
}

function buildPublishPayload(): PublishingEntryPayload {
  return {
    brandId: 'brand-1',
    strategyId: 'strategy-1',
    generationTaskId: 'task-1',
    versionId: 'version-1',
    title: '儿童体能 FAQ',
    body: 'FAQ 正文',
    targetPlatform: 'official_site',
    contentType: 'website_faq',
    targetKeywords: ['儿童体能']
  };
}
