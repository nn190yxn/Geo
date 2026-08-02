import { Alert, Button, Card, Collapse, Descriptions, Drawer, Progress, Space, Steps, Tag, Typography, message } from 'antd';
import { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  AutomationConfirmation,
  AutomationPackage,
  AutomationPackageSource,
  AutomationPackageStatus,
  AutomationStepCode,
  AutomationStepStatus
} from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { GuidedEmptyState, PageSkeleton, PartialDataNotice, RegionErrorState } from '../../../components/PageState';
import { ProductPageSection } from '../../../components/ProductPage';
import { getPlatformDisplayName } from '../../../utils/displayLabels';

type AutomationPackageDetail = AutomationPackage & {
  confirmations?: AutomationConfirmation[];
  context?: {
    brandName?: string;
    completenessScore?: number;
    questionPoolSize: number;
    testPlanCount: number;
  };
};

type AutomationOperatorCardProps = {
  brandId: string;
  source: AutomationPackageSource;
  title?: string;
  compact?: boolean;
  secondaryAction?: boolean;
};

const defaultGoal = '让 AI 自动完成本轮测试、分析、内容生成、平台改写、发布建议和复测建议';

export function AutomationOperatorCard({ brandId, source, title = 'AI 自动运营', compact = false, secondaryAction = false }: AutomationOperatorCardProps) {
  const [messageApi, contextHolder] = message.useMessage();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const queryClient = useQueryClient();
  const packagesQuery = useQuery({
    queryKey: ['automation-packages', brandId],
    queryFn: () => apiGet<AutomationPackageDetail[]>(`/brands/${brandId}/automation/packages`)
  });
  const packages = packagesQuery.data?.success ? packagesQuery.data.data : [];
  const activePackage = useMemo(() => selectActivePackage(packages), [packages]);
  const pendingConfirmations = activePackage?.confirmations?.filter((item) => item.status === 'pending') ?? [];
  const capabilitySummary = activePackage ? getAutomationCapabilitySummary(activePackage, pendingConfirmations) : null;
  const progress = activePackage ? getAutomationProgress(activePackage.stepSummaries) : 0;
  const queryFailed = packagesQuery.isError || Boolean(packagesQuery.data && !packagesQuery.data.success);
  const activeStepMessage = activePackage?.stepSummaries.find((step) => step.code === activePackage.currentStep)?.message;

  const invalidateAutomation = () => queryClient.invalidateQueries({ queryKey: ['automation-packages', brandId] });
  const handleResponse = (successText: string) => (response: { success: boolean; error?: { message: string } }) => {
    if (response.success) {
      void invalidateAutomation();
      void messageApi.success(successText);
      return;
    }

    void messageApi.error(response.error?.message ?? '自动化操作失败');
  };

  const createMutation = useMutation({
    mutationFn: () => apiPost<AutomationPackageDetail>(`/brands/${brandId}/automation/packages`, { goal: defaultGoal, source }),
    onSuccess: handleResponse('自动化任务包已创建')
  });
  const startMutation = useMutation({
    mutationFn: (packageId: string) => apiPost<AutomationPackageDetail>(`/brands/${brandId}/automation/packages/${packageId}/start`, {}),
    onSuccess: handleResponse('AI 已开始准备本轮监测问题')
  });
  const continueMutation = useMutation({
    mutationFn: ({ packageId, stepCode }: { packageId: string; stepCode: AutomationStepCode }) => apiPost<AutomationPackageDetail>(`/brands/${brandId}/automation/packages/${packageId}/${getStepActionPath(stepCode)}`, {}),
    onSuccess: handleResponse('自动化流程已继续')
  });
  const resolveConfirmationMutation = useMutation({
    mutationFn: ({ packageId, confirmation }: { packageId: string; confirmation: AutomationConfirmation }) => {
      if (confirmation.type === 'publishing_suggestion') {
        return apiPost<AutomationPackageDetail>(`/brands/${brandId}/automation/packages/${packageId}/publishing-suggestions/confirm`, {
          confirmationId: confirmation.confirmationId,
          decision: '确认创建发布待办'
        });
      }

      return apiPost<AutomationPackageDetail>(`/brands/${brandId}/automation/packages/${packageId}/confirmations/${confirmation.confirmationId}`, {
        action: 'approve',
        decision: confirmation.type === 'manual_test_required' ? '已录入监测回答，继续分析' : '确认继续'
      });
    },
    onSuccess: handleResponse('确认事项已处理')
  });
  const primaryAction = activePackage ? getPrimaryAutomationAction(activePackage, pendingConfirmations.length) : null;
  const loading = createMutation.isPending || startMutation.isPending || continueMutation.isPending || resolveConfirmationMutation.isPending;

  return (
    <Card
      title={title}
      extra={(
        <Space wrap>
          {pendingConfirmations.length > 0 ? <Button onClick={() => setDrawerOpen(true)}>处理确认事项</Button> : null}
          {activePackage && activePackage.status !== 'failed' ? (
            <Button
              type={secondaryAction ? 'default' : 'primary'}
              disabled={!primaryAction?.enabled}
              loading={loading}
              onClick={() => handlePrimaryAction(activePackage, primaryAction, startMutation.mutate, continueMutation.mutate)}
            >
              {primaryAction?.label ?? '等待下一步'}
            </Button>
          ) : null}
        </Space>
      )}
    >
      {contextHolder}
      {packagesQuery.isLoading ? <PageSkeleton rows={4} /> : null}
      {queryFailed ? (
        <RegionErrorState
          title="自动化任务包加载失败"
          description={packagesQuery.data && !packagesQuery.data.success ? packagesQuery.data.error.message : '暂时无法读取自动化任务包，请重新加载。'}
          onRetry={() => void packagesQuery.refetch()}
        />
      ) : null}
      {!packagesQuery.isLoading && !queryFailed && !activePackage ? (
        <GuidedEmptyState
          title="还没有自动化任务包"
          reason="当前品牌尚未创建自动化运营任务。"
          impact="监测、分析、内容和发布建议仍需分别推进。"
          benefit="创建后，AI 会串联本轮运营步骤，并在高风险动作前集中确认。"
          actionLabel="让 AI 帮我跑一轮"
          onAction={() => createMutation.mutate()}
          supportingText="任务会先整理监测问题池，再等待你确认本轮问题。"
        />
      ) : null}
      {!packagesQuery.isLoading && !queryFailed && activePackage ? (
        <Space direction="vertical" size={12} className="page-stack">
          <ProductPageSection title="任务包状态" description="查看本轮目标、业务上下文和当前执行状态。">
            <Space direction="vertical" size={12} className="page-stack">
              <Space wrap>
                <Tag color={getPackageStatusColor(activePackage.status)}>{getPackageStatusLabel(activePackage.status)}</Tag>
                <Typography.Text type="secondary">当前步骤：{getStepLabel(activePackage.currentStep)}</Typography.Text>
                {pendingConfirmations.length > 0 ? <Tag color="gold">待确认 {pendingConfirmations.length}</Tag> : null}
              </Space>
              <Descriptions size="small" column={{ xs: 1, sm: 2, lg: 4 }}>
                <Descriptions.Item label="品牌">{activePackage.context?.brandName ?? '品牌信息暂不可用'}</Descriptions.Item>
                <Descriptions.Item label="档案完整度">{formatScore(activePackage.context?.completenessScore)}</Descriptions.Item>
                <Descriptions.Item label="问题池">{activePackage.context?.questionPoolSize ?? 0} 个</Descriptions.Item>
                <Descriptions.Item label="监测计划">{activePackage.context?.testPlanCount ?? 0} 个</Descriptions.Item>
              </Descriptions>
              {!activePackage.context ? <PartialDataNotice message="部分任务上下文暂不可用" description="任务仍可继续执行，品牌完整度、问题池和监测计划将在数据恢复后补齐。" /> : null}
              {capabilitySummary ? <AutomationCapabilityAlert summary={capabilitySummary} /> : null}
            </Space>
          </ProductPageSection>
          <ProductPageSection title="步骤进度" description="已完成和跳过的步骤均计入整体进度。">
            <Space direction="vertical" size={12} className="page-stack">
              <Progress percent={progress} size="small" />
              {!compact ? (
                <Steps
                  size="small"
                  current={Math.max(0, activePackage.stepSummaries.findIndex((step) => step.code === activePackage.currentStep))}
                  items={activePackage.stepSummaries.map((step) => ({
                    title: step.title,
                    description: step.message,
                    status: getAntStepStatus(step.status)
                  }))}
                />
              ) : null}
            </Space>
          </ProductPageSection>
          {activePackage.status === 'failed' ? (
            <RegionErrorState
              title="自动化任务未成功"
              description={`${activeStepMessage ? `${activeStepMessage} ` : ''}任务上下文和步骤进度已保留，可从“${getStepLabel(activePackage.currentStep)}”继续。`}
              retryLabel="重新执行当前步骤"
              onRetry={primaryAction?.enabled ? () => handlePrimaryAction(activePackage, primaryAction, startMutation.mutate, continueMutation.mutate) : undefined}
            />
          ) : null}
          {pendingConfirmations[0] ? (
            <ProductPageSection title="确认队列" description={`当前共有 ${pendingConfirmations.length} 项需要处理。`}>
              <AutomationConfirmationState confirmation={pendingConfirmations[0]} onOpen={() => setDrawerOpen(true)} />
            </ProductPageSection>
          ) : null}
        </Space>
      ) : null}
      <Drawer title="需要你确认" open={drawerOpen} width={560} onClose={() => setDrawerOpen(false)}>
        <Space direction="vertical" size={12} className="page-stack">
          {pendingConfirmations.length === 0 ? (
            <Alert
              type="success"
              showIcon
              message="暂无待确认事项"
              description={primaryAction?.enabled ? `下一步可以点击“${primaryAction.label}”。` : undefined}
            />
          ) : null}
          {pendingConfirmations.map((confirmation) => (
            <Card key={confirmation.confirmationId} size="small" title={confirmation.title}>
              <Space direction="vertical" size={8} className="page-stack">
                <Typography.Text>{confirmation.impact}</Typography.Text>
                <Typography.Text type="secondary">{confirmation.recommendation}</Typography.Text>
                <Alert type="info" showIcon message={confirmation.evidenceSummary} />
                <ConfirmationQuestionList confirmation={confirmation} />
                <ConfirmationBlockingStepList confirmation={confirmation} onGoToManualEntry={goToManualTestEntry} />
                <ConfirmationAnalysisReview confirmation={confirmation} />
                <ConfirmationRewriteList confirmation={confirmation} />
                <ConfirmationPublishingSuggestionList confirmation={confirmation} />
                <Button
                  type="primary"
                  loading={resolveConfirmationMutation.isPending}
                  onClick={() => activePackage && resolveConfirmationMutation.mutate({ packageId: activePackage.packageId, confirmation })}
                >
                  {confirmation.type === 'manual_test_required' ? '已录入回答，继续分析' : '确认继续'}
                </Button>
              </Space>
            </Card>
          ))}
        </Space>
      </Drawer>
    </Card>
  );
}

function goToManualTestEntry() {
  window.history.pushState(null, '', '/monitoring#manual-test-entry');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

function AutomationCapabilityAlert({ summary }: { summary: AutomationCapabilitySummary }) {
  return (
    <Alert
      type={summary.type}
      showIcon
      message="本轮能力状态"
      description={(
        <Space direction="vertical" size={2}>
          <Typography.Text>本轮还能测试：{summary.testableText}</Typography.Text>
          <Typography.Text>可准备发布：{summary.publishingText}</Typography.Text>
          <Typography.Text>需要补充配置：{summary.configurationText}</Typography.Text>
        </Space>
      )}
    />
  );
}

type AutomationCapabilitySummary = {
  type: 'info' | 'warning';
  testableText: string;
  publishingText: string;
  configurationText: string;
};

type AutomationCapabilityIssue = {
  platformCode: string;
  message?: string;
};

export function getAutomationCapabilitySummary(
  automationPackage: Pick<AutomationPackage, 'targetPlatforms' | 'targetPublishingPlatforms'>,
  pendingConfirmations: Array<Pick<AutomationConfirmation, 'type' | 'payload'>>
): AutomationCapabilitySummary {
  const configurationIssues = getAutomationConfigurationIssues(pendingConfirmations);
  const configurationText = configurationIssues.length > 0
    ? configurationIssues.map((issue) => formatCapabilityIssue(issue)).join('；')
    : '当前配置可继续推进';

  return {
    type: configurationIssues.length > 0 ? 'warning' : 'info',
    testableText: formatDisplayList(automationPackage.targetPlatforms.map(getPlatformDisplayName), '待选择 AI 平台'),
    publishingText: formatDisplayList(automationPackage.targetPublishingPlatforms.map(getPlatformDisplayName), '待选择发布平台'),
    configurationText
  };
}

function getAutomationConfigurationIssues(confirmations: Array<Pick<AutomationConfirmation, 'type' | 'payload'>>): AutomationCapabilityIssue[] {
  return confirmations.flatMap((confirmation) => {
    if (confirmation.type !== 'manual_test_required') return [];

    const blockingSteps = Array.isArray(confirmation.payload.blockingSteps) ? confirmation.payload.blockingSteps : [];
    const configurationItems = Array.isArray(confirmation.payload.configurationItems) ? confirmation.payload.configurationItems : [];
    return [...blockingSteps, ...configurationItems].flatMap((item) => {
      if (!isRecord(item)) return [];

      const platformCode = typeof item.platformCode === 'string' && item.platformCode.trim().length > 0 ? item.platformCode.trim() : '未知平台';
      const message = typeof item.message === 'string' && item.message.trim().length > 0 ? item.message.trim() : undefined;
      const method = typeof item.method === 'string' ? item.method : '';
      const status = typeof item.status === 'string' ? item.status : '';
      const needsConfiguration = confirmation.payload.configurationItems === configurationItems || method === 'configuration' || status === 'needs_configuration' || Boolean(message?.includes('配置'));

      return needsConfiguration ? [{ platformCode, message }] : [];
    });
  }).slice(0, 6);
}

function formatCapabilityIssue(issue: AutomationCapabilityIssue): string {
  const platform = getPlatformDisplayName(issue.platformCode);
  return issue.message ? `${platform}（${issue.message}）` : platform;
}

function formatDisplayList(values: string[], fallback: string): string {
  const normalized = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  return normalized.length > 0 ? normalized.join('、') : fallback;
}

export function AutomationConfirmationState({
  confirmation,
  onOpen = () => undefined,
  onGoToManualEntry = goToManualTestEntry
}: {
  confirmation: AutomationConfirmation;
  onOpen?: () => void;
  onGoToManualEntry?: () => void;
}) {
  if (confirmation.type === 'manual_test_required') {
    return (
      <GuidedEmptyState
        title="需要手动录入真实回答"
        reason={confirmation.evidenceSummary || '当前监测平台需要人工完成测试并录入回答。'}
        impact={confirmation.impact}
        benefit={confirmation.recommendation}
        actionLabel="去手动录入"
        onAction={onGoToManualEntry}
        supportingText={<Button type="link" onClick={onOpen}>查看确认要求</Button>}
      />
    );
  }

  return <ConfirmationAlert confirmation={confirmation} onOpen={onOpen} />;
}

function ConfirmationAlert({ confirmation, onOpen }: { confirmation: AutomationConfirmation; onOpen: () => void }) {
  return (
    <Alert
      type="warning"
      showIcon
      message="高风险动作等待确认"
      description={confirmation.evidenceSummary}
      action={<Button size="small" onClick={onOpen}>查看并确认</Button>}
    />
  );
}

function ConfirmationQuestionList({ confirmation }: { confirmation: AutomationConfirmation }) {
  const questions = getConfirmationQuestions(confirmation);

  if (questions.length === 0) return null;

  return (
    <Space direction="vertical" size={6} className="page-stack">
      <Typography.Text strong>本轮精选问题</Typography.Text>
      <ol className="automation-question-list">
        {questions.map((item, index) => (
          <li key={`${item.question}-${index}`}>
            <Typography.Text>{item.question}</Typography.Text>
            {item.targetPlatforms.length > 0 ? (
              <Typography.Text type="secondary"> · 平台：{item.targetPlatforms.map(getPlatformDisplayName).join('、')}</Typography.Text>
            ) : null}
          </li>
        ))}
      </ol>
    </Space>
  );
}

function ConfirmationPublishingSuggestionList({ confirmation }: { confirmation: AutomationConfirmation }) {
  const suggestions = getConfirmationPublishingSuggestions(confirmation);

  if (suggestions.length === 0) return null;

  return (
    <Space direction="vertical" size={6} className="page-stack">
      <Typography.Text strong>发布建议</Typography.Text>
      <ol className="automation-question-list">
        {suggestions.map((item, index) => (
          <li key={`${item.rewriteId}-${index}`}>
            <Typography.Text>{item.targetPlatformLabel}：{item.title}</Typography.Text>
            {item.complianceNotes.length > 0 ? <Typography.Text type="secondary"> · 合规：{item.complianceNotes.join('、')}</Typography.Text> : null}
          </li>
        ))}
      </ol>
    </Space>
  );
}

type ConfirmationPublishingSuggestion = {
  rewriteId: string;
  targetPlatformLabel: string;
  title: string;
  complianceNotes: string[];
};

export function getConfirmationPublishingSuggestions(confirmation: Pick<AutomationConfirmation, 'payload'>): ConfirmationPublishingSuggestion[] {
  const suggestions = Array.isArray(confirmation.payload.suggestions) ? confirmation.payload.suggestions : [];

  return suggestions.flatMap((item) => {
    if (!isRecord(item) || typeof item.rewriteId !== 'string' || typeof item.title !== 'string') return [];

    return [{
      rewriteId: item.rewriteId,
      targetPlatformLabel: typeof item.targetPlatformLabel === 'string' && item.targetPlatformLabel.trim().length > 0
        ? item.targetPlatformLabel
        : getPlatformDisplayName(typeof item.targetPlatform === 'string' ? item.targetPlatform : undefined),
      title: item.title,
      complianceNotes: Array.isArray(item.complianceNotes)
        ? item.complianceNotes.filter((note): note is string => typeof note === 'string' && note.trim().length > 0).slice(0, 2)
        : []
    }];
  }).slice(0, 10);
}

function ConfirmationRewriteList({ confirmation }: { confirmation: AutomationConfirmation }) {
  const rewrites = getConfirmationRewrites(confirmation);

  if (rewrites.length === 0) return null;

  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Typography.Text strong>平台改写版本</Typography.Text>
      <Collapse
        size="small"
        items={rewrites.map((item, index) => ({
          key: `${item.rewriteId}-${index}`,
          label: `${item.targetPlatformLabel}：${item.title}`,
          children: <ConfirmationRewriteDetail rewrite={item} />
        }))}
      />
    </Space>
  );
}

function ConfirmationRewriteDetail({ rewrite }: { rewrite: ConfirmationRewrite }) {
  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Typography.Paragraph copyable={{ text: getRewriteCopyText(rewrite) }} strong>
        {rewrite.title}
      </Typography.Paragraph>
      {rewrite.body ? (
        <Typography.Paragraph copyable className="automation-rewrite-body">
          {rewrite.body}
        </Typography.Paragraph>
      ) : <Typography.Text type="secondary">暂无正文，请回到内容生成步骤重新生成。</Typography.Text>}
      {rewrite.tags.length > 0 ? <Typography.Text type="secondary">标签：{rewrite.tags.join('、')}</Typography.Text> : null}
      {rewrite.rewriteNotes.length > 0 ? <Typography.Text type="secondary">改写说明：{rewrite.rewriteNotes.join('、')}</Typography.Text> : null}
      {rewrite.complianceNotes.length > 0 ? <Typography.Text type="secondary">合规提示：{rewrite.complianceNotes.join('、')}</Typography.Text> : null}
    </Space>
  );
}

function getRewriteCopyText(rewrite: ConfirmationRewrite): string {
  return [rewrite.title, rewrite.body, rewrite.tags.length > 0 ? `标签：${rewrite.tags.join('、')}` : '']
    .filter((item) => item.trim().length > 0)
    .join('\n\n');
}

type ConfirmationRewrite = {
  rewriteId: string;
  targetPlatform: string;
  targetPlatformLabel: string;
  title: string;
  body: string;
  tags: string[];
  rewriteNotes: string[];
  complianceNotes: string[];
};

export function getConfirmationRewrites(confirmation: Pick<AutomationConfirmation, 'payload'>): ConfirmationRewrite[] {
  const rewrites = Array.isArray(confirmation.payload.rewrites) ? confirmation.payload.rewrites : [];

  return rewrites.flatMap((item) => {
    if (!isRecord(item) || typeof item.rewriteId !== 'string' || typeof item.title !== 'string') return [];

    return [{
      rewriteId: item.rewriteId,
      targetPlatform: typeof item.targetPlatform === 'string' && item.targetPlatform.trim().length > 0 ? item.targetPlatform : '未知平台',
      targetPlatformLabel: getPublishingPlatformLabel(typeof item.targetPlatform === 'string' ? item.targetPlatform : undefined),
      title: item.title,
      body: typeof item.body === 'string' ? item.body.trim() : '',
      tags: getStringList(item.tags),
      rewriteNotes: getStringList(item.rewriteNotes),
      complianceNotes: getStringList(item.complianceNotes)
    }];
  }).slice(0, 20);
}

function getPublishingPlatformLabel(platform?: string): string {
  if (!platform || platform.trim().length === 0) return '未知平台';

  const labels: Record<string, string> = {
    zhihu: '知乎',
    baijiahao: '百家号',
    xiaohongshu: '小红书',
    wechat_official: '公众号',
    official_site_faq: '官网 FAQ'
  };
  return labels[platform] ?? platform;
}

function getStringList(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.trim().length > 0) : [];
}

function ConfirmationAnalysisReview({ confirmation }: { confirmation: AutomationConfirmation }) {
  const review = getConfirmationAnalysisReview(confirmation);

  if (!review) return null;

  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Typography.Text strong>本轮测试判断</Typography.Text>
      <Descriptions size="small" column={2}>
        <Descriptions.Item label="样本数">{review.summary.sampleCount}</Descriptions.Item>
        <Descriptions.Item label="推荐率">{review.summary.recommendationRate}%</Descriptions.Item>
        <Descriptions.Item label="第一推荐率">{review.summary.topOneRate}%</Descriptions.Item>
        <Descriptions.Item label="平均准确度">{review.summary.averageAccuracyScore}</Descriptions.Item>
        <Descriptions.Item label="引用缺口">{review.summary.citationGapCount}</Descriptions.Item>
        <Descriptions.Item label="需确认">{review.summary.riskReviewCount}</Descriptions.Item>
      </Descriptions>
      {review.nextRecommendations.length > 0 ? (
        <Space direction="vertical" size={4} className="page-stack">
          <Typography.Text strong>下一步建议</Typography.Text>
          <ul className="automation-question-list">
            {review.nextRecommendations.map((item, index) => <li key={`${item}-${index}`}>{item}</li>)}
          </ul>
        </Space>
      ) : null}
      {review.reviewItems.length > 0 ? (
        <Space direction="vertical" size={4} className="page-stack">
          <Typography.Text strong>代表性判断</Typography.Text>
          <ol className="automation-question-list">
            {review.reviewItems.map((item, index) => (
              <li key={`${item.runId}-${index}`}>
                <Typography.Text>{getPlatformDisplayName(item.platformCode)}：{item.platformEvaluation}</Typography.Text>
                {item.suggestedAction ? <Typography.Text type="secondary"> · {item.suggestedAction}</Typography.Text> : null}
              </li>
            ))}
          </ol>
        </Space>
      ) : null}
    </Space>
  );
}

type ConfirmationAnalysisReview = {
  summary: {
    sampleCount: number;
    recommendationRate: number;
    topOneRate: number;
    averageAccuracyScore: number;
    citationGapCount: number;
    riskReviewCount: number;
  };
  nextRecommendations: string[];
  reviewItems: Array<{
    runId: string;
    platformCode: string;
    platformEvaluation: string;
    suggestedAction?: string;
  }>;
};

export function getConfirmationAnalysisReview(confirmation: Pick<AutomationConfirmation, 'payload'>): ConfirmationAnalysisReview | null {
  const summary = isRecord(confirmation.payload.summary) ? confirmation.payload.summary : null;
  if (!summary) return null;

  const reviewItems = Array.isArray(confirmation.payload.reviewItems) ? confirmation.payload.reviewItems : [];

  return {
    summary: {
      sampleCount: toNumber(summary.sampleCount),
      recommendationRate: toNumber(summary.recommendationRate),
      topOneRate: toNumber(summary.topOneRate),
      averageAccuracyScore: toNumber(summary.averageAccuracyScore),
      citationGapCount: toNumber(summary.citationGapCount),
      riskReviewCount: toNumber(summary.riskReviewCount)
    },
    nextRecommendations: Array.isArray(summary.nextRecommendations)
      ? summary.nextRecommendations.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 5)
      : [],
    reviewItems: reviewItems.flatMap((item) => {
      if (!isRecord(item) || typeof item.runId !== 'string' || typeof item.platformEvaluation !== 'string') return [];

      return [{
        runId: item.runId,
        platformCode: typeof item.platformCode === 'string' && item.platformCode.trim().length > 0 ? item.platformCode : '未知平台',
        platformEvaluation: item.platformEvaluation,
        suggestedAction: typeof item.suggestedAction === 'string' && item.suggestedAction.trim().length > 0 ? item.suggestedAction : undefined
      }];
    }).slice(0, 6)
  };
}

function toNumber(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function ConfirmationBlockingStepList({ confirmation, onGoToManualEntry }: { confirmation: AutomationConfirmation; onGoToManualEntry: () => void }) {
  const blockingSteps = getConfirmationBlockingSteps(confirmation);

  if (blockingSteps.length === 0) return null;

  return (
    <Space direction="vertical" size={6} className="page-stack">
      <Typography.Text strong>需要人工处理的监测项</Typography.Text>
      {confirmation.type === 'manual_test_required' ? (
        <Alert
          type="info"
          showIcon
          message="先录入真实 AI 回答，再继续分析"
          description="当前浏览器自动执行没有真实回答回填。请到 AI 回复监测页面复制问题、粘贴平台真实回答；录入完成后再回到这里继续分析。"
          action={<Button size="small" onClick={onGoToManualEntry}>去录入真实回复</Button>}
        />
      ) : null}
      <ol className="automation-question-list">
        {blockingSteps.map((item, index) => (
          <li key={`${item.question}-${item.platformCode}-${index}`}>
            <Typography.Text>{item.question}</Typography.Text>
            <Typography.Text type="secondary"> · 平台：{getPlatformDisplayName(item.platformCode)}</Typography.Text>
            {item.message ? <Typography.Text type="secondary"> · {item.message}</Typography.Text> : null}
          </li>
        ))}
      </ol>
    </Space>
  );
}

type ConfirmationQuestion = {
  question: string;
  targetPlatforms: string[];
};

type ConfirmationBlockingStep = {
  question: string;
  platformCode: string;
  message?: string;
};

export function getConfirmationQuestions(confirmation: Pick<AutomationConfirmation, 'payload'>): ConfirmationQuestion[] {
  const selectedQuestions = Array.isArray(confirmation.payload.selectedQuestions) ? confirmation.payload.selectedQuestions : [];

  return selectedQuestions.flatMap((item) => {
    if (!isRecord(item) || typeof item.question !== 'string' || item.question.trim().length === 0) return [];

    return [{
      question: item.question.trim(),
      targetPlatforms: Array.isArray(item.targetPlatforms)
        ? item.targetPlatforms.filter((platform): platform is string => typeof platform === 'string' && platform.trim().length > 0).map(getPlatformDisplayName)
        : []
    }];
  });
}

export function getConfirmationBlockingSteps(confirmation: Pick<AutomationConfirmation, 'payload'>): ConfirmationBlockingStep[] {
  const blockingSteps = Array.isArray(confirmation.payload.blockingSteps) ? confirmation.payload.blockingSteps : [];

  return blockingSteps.flatMap((item) => {
    if (!isRecord(item) || typeof item.question !== 'string' || item.question.trim().length === 0) return [];

    return [{
      question: item.question.trim(),
      platformCode: typeof item.platformCode === 'string' && item.platformCode.trim().length > 0 ? item.platformCode.trim() : '未知平台',
      message: typeof item.message === 'string' && item.message.trim().length > 0 ? item.message.trim() : undefined
    }];
  });
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function handlePrimaryAction(
  automationPackage: AutomationPackageDetail,
  action: AutomationPrimaryAction | null,
  start: (packageId: string) => void,
  next: (input: { packageId: string; stepCode: AutomationStepCode }) => void
) {
  if (!action?.enabled) return;
  if (action.kind === 'start') {
    start(automationPackage.packageId);
    return;
  }

  next({ packageId: automationPackage.packageId, stepCode: action.stepCode ?? automationPackage.currentStep });
}

type AutomationPrimaryAction = {
  kind: 'start' | 'continue' | 'blocked' | 'done';
  label: string;
  enabled: boolean;
  stepCode?: AutomationStepCode;
};

export function getPrimaryAutomationAction(automationPackage: Pick<AutomationPackage, 'status' | 'currentStep' | 'stepSummaries'>, pendingConfirmationCount: number): AutomationPrimaryAction {
  if (pendingConfirmationCount > 0 || automationPackage.status === 'waiting_confirmation') {
    return { kind: 'blocked', label: '先处理确认事项', enabled: false };
  }

  if (automationPackage.status === 'draft') {
    return { kind: 'start', label: '开始本轮自动运营', enabled: true };
  }

  if (automationPackage.status === 'completed') {
    return { kind: 'done', label: '本轮已完成', enabled: false };
  }

  if (isWaitingForBrowserQueue(automationPackage)) {
    return { kind: 'continue', label: '检查监测结果', enabled: true, stepCode: 'answer_analysis' };
  }

  const actionLabel = stepActionLabels[automationPackage.currentStep];
  return actionLabel
    ? { kind: 'continue', label: actionLabel, enabled: true }
    : { kind: 'blocked', label: '等待下一步', enabled: false };
}

function isWaitingForBrowserQueue(automationPackage: Pick<AutomationPackage, 'currentStep' | 'stepSummaries'>): boolean {
  if (automationPackage.currentStep !== 'test_plan_execution') return false;

  const executionStep = automationPackage.stepSummaries.find((step) => step.code === 'test_plan_execution');
  return executionStep?.status === 'running' && Boolean(executionStep.message?.includes('等待浏览器队列执行完成'));
}

export function selectActivePackage(packages: AutomationPackageDetail[]): AutomationPackageDetail | undefined {
  return [...packages].sort((first, second) => second.updatedAt.localeCompare(first.updatedAt))[0];
}

export function getAutomationProgress(stepSummaries: AutomationPackage['stepSummaries']): number {
  if (stepSummaries.length === 0) return 0;
  const completedStepCount = stepSummaries.filter((step) => step.status === 'completed' || step.status === 'skipped').length;
  return Math.round((completedStepCount / stepSummaries.length) * 100);
}

function getStepActionPath(stepCode: AutomationStepCode): string {
  return stepActionPaths[stepCode] ?? 'start';
}

function getStepLabel(stepCode: AutomationStepCode): string {
  return stepLabels[stepCode] ?? stepCode;
}

function getPackageStatusLabel(status: AutomationPackageStatus): string {
  return packageStatusLabels[status] ?? status;
}

function getPackageStatusColor(status: AutomationPackageStatus): string {
  return packageStatusColors[status] ?? 'default';
}

function getAntStepStatus(status: AutomationStepStatus): 'wait' | 'process' | 'finish' | 'error' {
  if (status === 'completed') return 'finish';
  if (status === 'failed') return 'error';
  if (status === 'running' || status === 'waiting_confirmation') return 'process';
  return 'wait';
}

function formatScore(value?: number): string {
  return typeof value === 'number' ? `${value}%` : '-';
}

const stepActionPaths: Partial<Record<AutomationStepCode, string>> = {
  test_plan_execution: 'test-plan/execute',
  answer_analysis: 'answers/analyze',
  content_generation: 'content/generate',
  platform_rewrite: 'platform-rewrites/generate',
  publishing_suggestion: 'publishing-suggestions/generate',
  retest_suggestion: 'retest-suggestions/generate'
};

const stepActionLabels: Partial<Record<AutomationStepCode, string>> = {
  test_plan_execution: '监测 AI 回复',
  answer_analysis: '分析监测结果',
  content_generation: '生成优化内容',
  platform_rewrite: '生成平台改写',
  publishing_suggestion: '生成发布建议',
  retest_suggestion: '安排发布后复测'
};

const stepLabels: Record<AutomationStepCode, string> = {
  context_collection: '读取品牌资料',
  question_pool_update: '维护监测问题池',
  question_selection: '精选本轮问题',
  test_question_confirmation: '确认监测问题',
  test_plan_execution: '监测 AI 回复',
  answer_analysis: '分析监测结果',
  content_generation: '生成优化内容',
  platform_rewrite: '按平台改写',
  content_confirmation: '确认发布内容',
  publishing_suggestion: '生成发布建议',
  retest_suggestion: '安排复测',
  completed: '完成任务包'
};

const packageStatusLabels: Record<AutomationPackageStatus, string> = {
  draft: '待开始',
  waiting_confirmation: '等待确认',
  running: '进行中',
  completed: '已完成',
  failed: '未成功',
  stopped: '已停止'
};

const packageStatusColors: Record<AutomationPackageStatus, string> = {
  draft: 'default',
  waiting_confirmation: 'gold',
  running: 'blue',
  completed: 'green',
  failed: 'red',
  stopped: 'default'
};
