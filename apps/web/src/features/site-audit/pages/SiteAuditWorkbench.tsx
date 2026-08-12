import { Alert, Button, Card, Form, Input, List, Space, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type {
  ApiResponse,
  OptimizationTask,
  SiteAuditAcceptanceRecord,
  SiteAuditAcceptanceResult,
  SiteAuditAssessment,
  SiteAuditCheckKey,
  SiteAuditFinding,
  TechnicalAssetRecord
} from '@geo-platform/shared-types';
import { apiPost } from '../../../api/http';
import { useBrandWriteCapability } from '../../../access-control/BrandCapabilityContext';
import { PartialDataNotice } from '../../../components/PageState';
import { ProductPage, ProductPageSection } from '../../../components/ProductPage';
import { useBrandContextStore } from '../../../stores/brandContextStore';

const statusDisplay = {
  pass: { label: '通过', color: 'green' },
  warning: { label: '需优化', color: 'gold' },
  fail: { label: '未通过', color: 'red' },
  unavailable: { label: '无法访问', color: 'orange' }
} as const;

const impactLabels = { low: '低影响', medium: '中影响', high: '高影响', critical: '严重影响' } as const;

export function SiteAuditWorkbench() {
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const queryClient = useQueryClient();
  const [websiteUrl, setWebsiteUrl] = useState('');
  const [assessment, setAssessment] = useState<SiteAuditAssessment>();
  const [acceptanceHistory, setAcceptanceHistory] = useState<Partial<Record<SiteAuditCheckKey, SiteAuditAcceptanceRecord[]>>>({});
  const [taskIds, setTaskIds] = useState<Partial<Record<SiteAuditCheckKey, string>>>({});
  const [generatedAssets, setGeneratedAssets] = useState<TechnicalAssetRecord[]>([]);
  const monitoringCapability = useBrandWriteCapability('monitoring');
  const taskCapability = useBrandWriteCapability('task');
  const contentCapability = useBrandWriteCapability('content');
  const retestCapability = useBrandWriteCapability('retest');

  const auditMutation = useMutation({
    mutationFn: () => apiPost<SiteAuditAssessment>(`/brands/${encodeURIComponent(activeBrandId)}/site-audit`, { websiteUrl }),
    onSuccess: (response) => {
      if (!response.success) return void message.error(response.error.message);
      setAssessment(response.data);
      setAcceptanceHistory({});
      setTaskIds({});
      setGeneratedAssets([]);
    }
  });
  const taskMutation = useMutation({
    mutationFn: (finding: SiteAuditFinding) => apiPost<OptimizationTask>(`/brands/${encodeURIComponent(activeBrandId)}/tasks`, finding.taskTemplate),
    onSuccess: (response, finding) => {
      if (!response.success) return void message.error(response.error.message);
      setTaskIds((current) => ({ ...current, [finding.check.key]: response.data.id }));
      void queryClient.invalidateQueries({ queryKey: ['task-board', activeBrandId] });
      void message.success('修复任务已创建');
    }
  });
  const assetMutation = useMutation({
    mutationFn: () => apiPost<TechnicalAssetRecord[]>(`/brands/${encodeURIComponent(activeBrandId)}/site-audit/technical-assets`, { targetPage: websiteUrl }),
    onSuccess: (response) => {
      if (!response.success) return void message.error(response.error.message);
      setGeneratedAssets(response.data);
      void queryClient.invalidateQueries({ queryKey: ['content-assets', activeBrandId] });
      void message.success(`已生成 ${response.data.length} 份技术资产`);
    }
  });
  const recheckMutation = useMutation({
    mutationFn: (finding: SiteAuditFinding) => apiPost<SiteAuditAcceptanceResult>(
      `/brands/${encodeURIComponent(activeBrandId)}/site-audit/checks/${finding.check.key}/recheck`,
      {
        websiteUrl,
        rule: finding.acceptanceRule,
        history: acceptanceHistory[finding.check.key] ?? [],
        taskId: taskIds[finding.check.key]
      }
    ),
    onSuccess: (response) => {
      if (!response.success) return void message.error(response.error.message);
      setAcceptanceHistory((current) => ({ ...current, [response.data.rule.checkKey]: response.data.history }));
      setAssessment((current) => current ? applyAcceptanceResult(current, response.data) : current);
    }
  });

  return (
    <SiteAuditWorkbenchView
      websiteUrl={websiteUrl}
      assessment={assessment}
      acceptanceHistory={acceptanceHistory}
      generatedAssets={generatedAssets}
      loading={auditMutation.isPending}
      canAudit={monitoringCapability.canWrite}
      canCreateTask={taskCapability.canWrite}
      canGenerateAssets={contentCapability.canWrite}
      canRecheck={retestCapability.canWrite}
      onWebsiteUrlChange={setWebsiteUrl}
      onAudit={() => auditMutation.mutate()}
      onCreateTask={(finding) => taskMutation.mutate(finding)}
      onGenerateAssets={() => assetMutation.mutate()}
      onRecheck={(finding) => recheckMutation.mutate(finding)}
    />
  );
}

export type SiteAuditWorkbenchViewProps = {
  websiteUrl: string;
  assessment?: SiteAuditAssessment;
  acceptanceHistory: Partial<Record<SiteAuditCheckKey, SiteAuditAcceptanceRecord[]>>;
  generatedAssets: TechnicalAssetRecord[];
  loading: boolean;
  canAudit: boolean;
  canCreateTask: boolean;
  canGenerateAssets: boolean;
  canRecheck: boolean;
  onWebsiteUrlChange: (value: string) => void;
  onAudit: () => void;
  onCreateTask: (finding: SiteAuditFinding) => void;
  onGenerateAssets: () => void;
  onRecheck: (finding: SiteAuditFinding) => void;
};

export function SiteAuditWorkbenchView(props: SiteAuditWorkbenchViewProps) {
  const unavailable = props.assessment?.findings.some(({ check }) => check.status === 'unavailable');
  return (
    <ProductPage
      title="站点审计"
      description="检查官网抓取、索引、结构化数据和正文基础，并把问题转成修复任务与可部署资产。"
      partialState={unavailable ? <PartialDataNotice description="部分目标暂时无法访问，已完成的检查和证据继续保留，可对失败项定向重试。" /> : undefined}
    >
      <ProductPageSection title="审计目标" description="仅访问你提交的公开官网及同源固定资源。">
        <Form layout="vertical" onFinish={props.onAudit}>
          <Form.Item label="官网地址" required>
            <Input value={props.websiteUrl} onChange={(event) => props.onWebsiteUrlChange(event.target.value)} placeholder="https://example.com" />
          </Form.Item>
          <Button type="primary" htmlType="submit" loading={props.loading} disabled={!props.canAudit || !props.websiteUrl.trim()}>开始审计</Button>
        </Form>
      </ProductPageSection>

      {props.assessment ? (
        <>
          {unavailable ? <PartialDataNotice description="访问失败项保留原任务状态和错误证据，站点恢复后可单项重新验收。" /> : null}
          <ProductPageSection
            title="检查结果与修复动作"
            description={`最近检查：${new Date(props.assessment.auditedAt).toLocaleString()}`}
            actions={<Button onClick={props.onGenerateAssets} disabled={!props.canGenerateAssets}>生成全部技术资产</Button>}
          >
            <List
              grid={{ gutter: 16, xs: 1, md: 2 }}
              dataSource={props.assessment.findings}
              renderItem={(finding) => {
                const display = statusDisplay[finding.check.status];
                const history = props.acceptanceHistory[finding.check.key] ?? [];
                return <List.Item><Card title={<Space wrap><Typography.Text strong>{finding.taskTemplate.title}</Typography.Text><Tag color={display.color}>{display.label}</Tag><Tag>{impactLabels[finding.impactLevel]}</Tag></Space>}>
                  <Space direction="vertical" size={8} className="page-stack">
                    <Typography.Text>{finding.check.summary}</Typography.Text>
                    <Typography.Text type="secondary">影响：{finding.impactDescription}</Typography.Text>
                    <Typography.Text>修复：{finding.remediation}</Typography.Text>
                    <Typography.Text code>{finding.check.evidence.targetUrl}</Typography.Text>
                    {finding.check.evidence.errorCode ? <Alert type="warning" showIcon message={finding.check.evidence.errorCode} /> : null}
                    {finding.check.evidence.excerpt ? <Typography.Paragraph ellipsis={{ rows: 3 }}>{finding.check.evidence.excerpt}</Typography.Paragraph> : null}
                    {history.length ? <Typography.Text type="secondary">验收记录 {history.length} 次，最近结果：{history.at(-1)?.status}</Typography.Text> : null}
                    <Space wrap>
                      {finding.check.status !== 'pass' ? <Button onClick={() => props.onCreateTask(finding)} disabled={!props.canCreateTask}>创建修复任务</Button> : null}
                      <Button onClick={() => props.onRecheck(finding)} disabled={!props.canRecheck}>重新验收</Button>
                    </Space>
                  </Space>
                </Card></List.Item>;
              }}
            />
          </ProductPageSection>

          {props.generatedAssets.length ? <ProductPageSection title="已生成技术资产" description="资产已进入内容资产体系，当前状态为待审核草稿。">
            <List dataSource={props.generatedAssets} renderItem={({ asset, version }) => <List.Item><List.Item.Meta title={asset.title} description={`${asset.url} · 版本 ${version.version} · ${asset.reviewStatus ?? 'pending'}`} /></List.Item>} />
          </ProductPageSection> : null}
        </>
      ) : <ProductPageSection><Alert type="info" showIcon message="提交官网后，这里会展示原始证据、影响、修复任务和技术资产入口。" /></ProductPageSection>}
    </ProductPage>
  );
}

export function applyAcceptanceResult(assessment: SiteAuditAssessment, result: SiteAuditAcceptanceResult): SiteAuditAssessment {
  return {
    ...assessment,
    findings: assessment.findings.map((finding) => finding.check.key === result.rule.checkKey ? {
      ...finding,
      check: {
        ...finding.check,
        status: result.status === 'passed' ? 'pass' : result.status === 'failed' ? 'fail' : 'unavailable',
        evidence: result.evidence
      }
    } : finding)
  };
}

export function unwrapAuditResponse(response: ApiResponse<SiteAuditAssessment>): SiteAuditAssessment | undefined {
  return response.success ? response.data : undefined;
}
