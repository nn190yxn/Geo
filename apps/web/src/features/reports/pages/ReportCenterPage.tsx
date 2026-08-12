import { Alert, Button, Card, Form, Input, Modal, Select, Space, Statistic, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { EffectEvidence, ReportDashboard, ReportInput, ReportRecord, ReportScopePreview, ReportStatus, ReportType } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { useBrandWriteCapability } from '../../../access-control/BrandCapabilityContext';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { EmptyState, GuidedEmptyState, PageErrorAlert, PageSkeleton, RegionErrorState } from '../../../components/PageState';
import { ManagementListPage, ManagementRowActions } from '../../../components/ManagementListPage';
import { ProductPageSection } from '../../../components/ProductPage';
import { UnifiedFilterBar } from '../../../components/UnifiedFilterBar';
import { EffectEvidencePanel } from '../../../components/EffectEvidencePanel';

const reportTypeLabels: Record<ReportRecord['type'], string> = {
  weekly: '单品牌周报',
  monthly: '单品牌月报',
  multi_brand: '多品牌对比',
  customer_delivery: '客户交付报告'
};

const statusLabels: Record<ReportRecord['status'], string> = {
  pending: '生成中',
  generated: '已生成',
  failed: '生成失败'
};

export function ReportCenterPage() {
  const reportCapability = useBrandWriteCapability('report');
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>();
  const [filters, setFilters] = useState<ReportFilters>(defaultReportFilters);
  const [previewInput, setPreviewInput] = useState<ReportInput>();
  const [form] = Form.useForm<ReportInput>();
  const dashboardQuery = useQuery({
    queryKey: ['report-dashboard', activeBrandId],
    queryFn: () => apiGet<ReportDashboard>(`/brands/${activeBrandId}/reports`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const reports = dashboard?.reports ?? [];
  const filteredReports = getFilteredReports(reports, filters);
  const selectedSummary = reports.find((report) => report.id === selectedReportId) ?? dashboard?.latest;
  const detailQuery = useQuery({
    queryKey: ['report-detail', activeBrandId, selectedSummary?.id],
    queryFn: () => apiGet<ReportRecord>(`/brands/${activeBrandId}/reports/${selectedSummary!.id}`),
    enabled: Boolean(selectedSummary)
  });
  const selectedReport = detailQuery.data?.success ? detailQuery.data.data : selectedSummary;
  const listState = dashboardQuery.isLoading
    ? 'loading'
    : dashboardQuery.isError || (dashboardQuery.data && !dashboardQuery.data.success)
      ? 'error'
      : reports.length === 0
        ? 'empty'
        : 'ready';
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['report-dashboard', activeBrandId] });
  const previewQuery = useQuery({
    queryKey: ['report-preview', activeBrandId, previewInput],
    queryFn: () => apiPost<ReportScopePreview[]>(`/brands/${activeBrandId}/reports/preview`, previewInput!),
    enabled: createOpen && Boolean(previewInput?.periodStart && previewInput?.periodEnd)
  });
  const previewScopes = previewQuery.data?.success ? previewQuery.data.data : [];
  const openCreate = () => {
    const period = getDefaultReportPeriod();
    const initialInput: ReportInput = { type: 'weekly', ...period };
    form.setFieldsValue(initialInput);
    setPreviewInput(initialInput);
    setCreateOpen(true);
  };
  const createMutation = useMutation({
    mutationFn: (values: ReportInput) => apiPost<ReportRecord>(`/brands/${activeBrandId}/reports`, values),
    onSuccess: (response) => {
      if (response.success) {
        setCreateOpen(false);
        setPreviewInput(undefined);
        form.resetFields();
        setSelectedReportId(response.data.id);
        void invalidate();
        void messageApi.success('报告已生成');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <ManagementListPage<ReportRecord>
        title="报告中心"
        description="统一管理品牌周报、月报、多品牌对比和客户交付报告，并在同一页面完成阅读、缺口确认与导出。"
        context={<Tag>当前品牌报告</Tag>}
        primaryAction={reports.length > 0 ? <Button type="primary" disabled={!reportCapability.canWrite} title={reportCapability.reason} onClick={openCreate}>生成报告</Button> : undefined}
        summary={(
          <Space size={24} wrap>
            <Statistic title="报告总数" value={reports.length} />
            <Statistic title="已生成" value={reports.filter((report) => report.status === 'generated').length} />
            <Statistic title="存在数据缺口" value={reports.filter((report) => report.dataGaps.length > 0).length} />
          </Space>
        )}
        filters={(
          <UnifiedFilterBar
            value={{ search: filters.search, platform: 'all', status: filters.status, from: filters.from, to: filters.to }}
            onChange={(value) => setFilters((current) => ({ ...current, search: value.search, status: value.status as ReportStatus | 'all', from: value.from, to: value.to }))}
            onClear={() => setFilters(defaultReportFilters)}
            statusOptions={reportStatusOptions}
            searchPlaceholder="搜索报告名称或类型"
            resultCount={filteredReports.length}
            totalCount={reports.length}
            showPlatform={false}
            hasAdditionalFilters={filters.type !== 'all'}
            extraFilters={<Select aria-label="报告类型筛选" value={filters.type} options={[{ value: 'all', label: '全部类型' }, ...reportTypeOptions]} onChange={(type) => setFilters((current) => ({ ...current, type }))} />}
          />
        )}
        state={listState}
        loadingState={<PageSkeleton rows={4} />}
        errorState={<RegionErrorState description="报告列表加载失败，请重新加载后继续管理。" onRetry={() => void dashboardQuery.refetch()} />}
        emptyState={<GuidedEmptyState title="还没有品牌报告" reason="当前品牌尚未生成可交付的统计报告。" impact="团队暂时缺少可复盘、分享和交付的统一结果。" benefit="生成后可集中阅读结论、确认数据缺口并导出 Markdown。" actionLabel="生成首份品牌报告" onAction={openCreate} />}
        tableTitle="报告列表"
        tableDescription="按报告类型、品牌、统计周期和生成状态查看已有交付记录。"
        tableAriaLabel="报告管理列表"
        tableProps={{
          rowKey: 'id',
          dataSource: filteredReports,
          pagination: filteredReports.length > 8 ? { pageSize: 8 } : false,
          locale: { emptyText: <EmptyState title="没有匹配的报告" description="当前筛选条件下的报告" reason="报告名称、类型、状态或时间范围未匹配已有记录。" nextStep="清空部分筛选后重新查看。" /> },
          columns: [
            { title: '报告名称', dataIndex: 'title', render: (value) => <Typography.Text strong>{value}</Typography.Text> },
            { title: '报告类型', render: (_, record) => reportTypeLabels[record.type] },
            { title: '品牌', render: () => <Typography.Text>当前品牌</Typography.Text> },
            { title: '统计周期', render: (_, record) => `${record.periodStart} 至 ${record.periodEnd}` },
            { title: '生成状态', render: (_, record) => <Tag color={statusColors[record.status]}>{statusLabels[record.status]}</Tag> },
            { title: '数据缺口', render: (_, record) => <Tag color={record.dataGaps.length > 0 ? 'orange' : 'green'}>{record.dataGaps.length > 0 ? `${record.dataGaps.length} 项缺口` : '数据完整'}</Tag> },
            { title: '创建时间', dataIndex: 'createdAt', render: (value) => formatReportDate(value) },
            { title: '操作', render: (_, record) => <ManagementRowActions primaryActions={[<Button key="read" size="small" onClick={() => setSelectedReportId(record.id)}>阅读报告</Button>]} /> }
          ]
        }}
      />

      {selectedReport ? (
        <ReportDetailArea report={selectedReport} onExport={() => exportReportMarkdown(selectedReport)} detailResponse={detailQuery.data} />
      ) : null}

      <Modal width={720} title="生成报告" open={createOpen} okText="生成" cancelText="取消" okButtonProps={{ disabled: !reportCapability.canWrite || previewQuery.isLoading, title: reportCapability.reason }} onCancel={() => { setCreateOpen(false); setPreviewInput(undefined); }} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" onValuesChange={() => {
          const values = form.getFieldsValue();
          setPreviewInput(values.periodStart && values.periodEnd ? values : undefined);
        }} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="type" label="报告类型" rules={[{ required: true, message: '请选择报告类型' }]}><Select options={reportTypeOptions} /></Form.Item>
          <Form.Item name="title" label="报告名称"><Input placeholder="留空时自动生成" /></Form.Item>
          <Form.Item name="periodStart" label="统计开始日期" rules={[{ required: true, message: '请输入统计开始日期' }]}><Input type="date" /></Form.Item>
          <Form.Item name="periodEnd" label="统计结束日期" rules={[{ required: true, message: '请输入统计结束日期' }]}><Input type="date" /></Form.Item>
        </Form>
        <ReportScopePreviewArea scopes={previewScopes} loading={previewQuery.isLoading} error={previewQuery.isError || Boolean(previewQuery.data && !previewQuery.data.success)} />
      </Modal>

    </Space>
  );
}

const reportTypeOptions = Object.entries(reportTypeLabels).map(([value, label]) => ({ value, label }));
const reportStatusOptions = Object.entries(statusLabels).map(([value, label]) => ({ value, label }));
const statusColors: Record<ReportStatus, string> = { pending: 'gold', generated: 'green', failed: 'red' };

export type ReportFilters = {
  search: string;
  type: ReportType | 'all';
  status: ReportStatus | 'all';
  from?: string;
  to?: string;
};

export const defaultReportFilters: ReportFilters = { search: '', type: 'all', status: 'all' };

export function getFilteredReports(reports: ReportRecord[], filters: ReportFilters): ReportRecord[] {
  const search = filters.search.trim().toLocaleLowerCase();

  return reports.filter((report) => {
    const searchableText = `${report.title} ${reportTypeLabels[report.type]}`.toLocaleLowerCase();
    const createdDate = report.createdAt.slice(0, 10);
    return (!search || searchableText.includes(search))
      && (filters.type === 'all' || report.type === filters.type)
      && (filters.status === 'all' || report.status === filters.status)
      && (!filters.from || createdDate >= filters.from)
      && (!filters.to || createdDate <= filters.to);
  });
}

export function ReportDetailArea({ report, onExport, detailResponse }: { report: ReportRecord; onExport: () => void; detailResponse?: Awaited<ReturnType<typeof apiGet<ReportRecord>>> }) {
  const scopes = getReportScopes(report);
  const effectEvidence = getReportEffectEvidence(report);
  return (
    <ProductPageSection
      title="报告详情"
      description="阅读完整报告正文，确认聚合过程中的数据缺口，并导出当前版本。"
      actions={<Button onClick={onExport}>导出 Markdown</Button>}
      className="report-detail-section"
    >
      <PageErrorAlert response={detailResponse} />
      <Space direction="vertical" size={16} className="page-stack">
        <Card size="small" title={report.title}>
          <Space wrap>
            <Tag>{reportTypeLabels[report.type]}</Tag>
            <Tag color={statusColors[report.status]}>{statusLabels[report.status]}</Tag>
            <Typography.Text>品牌：当前品牌</Typography.Text>
            <Typography.Text>统计周期：{report.periodStart} 至 {report.periodEnd}</Typography.Text>
            <Typography.Text>创建时间：{formatReportDate(report.createdAt)}</Typography.Text>
          </Space>
        </Card>
        <Card size="small" title={`数据缺口（${report.dataGaps.length}）`}>
          {report.dataGaps.length ? report.dataGaps.map((gap) => (
            <Alert key={`${gap.section}-${gap.reason}`} type="warning" showIcon message={`${gap.section}：${gap.reason}`} style={{ marginBottom: 8 }} />
          )) : <Alert type="success" showIcon message="当前报告暂无关键数据缺口" />}
        </Card>
        <ReportScopePreviewArea scopes={scopes} />
        <EffectEvidenceArea evidence={effectEvidence} periodStart={report.periodStart} periodEnd={report.periodEnd} dataGaps={report.dataGaps} />
        <Card size="small" title="报告正文">
          <Typography.Paragraph className="report-markdown-content">{report.content}</Typography.Paragraph>
        </Card>
      </Space>
    </ProductPageSection>
  );
}

export function ReportScopePreviewArea({ scopes, loading = false, error = false }: { scopes: ReportScopePreview[]; loading?: boolean; error?: boolean }) {
  if (loading) return <Card size="small" title="统计范围预览"><Typography.Text type="secondary">正在计算统计范围与有效样本...</Typography.Text></Card>;
  if (error) return <Alert type="error" showIcon message="统计范围预览失败，请检查日期后重试" />;
  if (!scopes.length) return null;

  const totals = scopes.reduce((result, scope) => ({
    monitoring: result.monitoring + scope.monitoringRunCount,
    samples: result.samples + scope.validSampleCount,
    content: result.content + scope.contentAssetCount,
    publishing: result.publishing + scope.publishingRecordCount,
    tasks: result.tasks + scope.taskChangeCount,
    retests: result.retests + scope.completedRetestCount
  }), { monitoring: 0, samples: 0, content: 0, publishing: 0, tasks: 0, retests: 0 });
  const gaps = scopes.flatMap((scope) => scope.dataGaps).filter((gap, index, all) => all.findIndex((item) => item.section === gap.section && item.reason === gap.reason) === index);

  return (
    <Card size="small" title="统计范围与有效样本">
      <Space direction="vertical" size={12} className="page-stack">
        <Typography.Text>统计周期：{scopes[0].periodStart} 至 {scopes[0].periodEnd}，覆盖 {scopes.length} 个品牌范围</Typography.Text>
        <Space size={20} wrap>
          <Statistic title="监测运行" value={totals.monitoring} />
          <Statistic title="有效样本" value={totals.samples} />
          <Statistic title="内容资产" value={totals.content} />
          <Statistic title="发布记录" value={totals.publishing} />
          <Statistic title="任务变化" value={totals.tasks} />
          <Statistic title="完成复测" value={totals.retests} />
        </Space>
        {gaps.length ? gaps.map((gap) => <Alert key={`${gap.section}-${gap.reason}`} type="warning" showIcon message={`${gap.section}：${gap.reason}`} />) : <Alert type="success" showIcon message="当前统计范围具备有效样本和效果证据" />}
      </Space>
    </Card>
  );
}

export function EffectEvidenceArea({ evidence, periodStart, periodEnd, dataGaps }: { evidence: EffectEvidence[]; periodStart?: string; periodEnd?: string; dataGaps?: ReportRecord['dataGaps'] }) {
  return <EffectEvidencePanel evidence={evidence} periodStart={periodStart} periodEnd={periodEnd} dataGaps={dataGaps} />;
}

export function getReportScopes(report: ReportRecord): ReportScopePreview[] {
  return 'scope' in report.snapshot ? [report.snapshot.scope] : report.snapshot.scopes;
}

export function getReportEffectEvidence(report: ReportRecord): EffectEvidence[] {
  return report.snapshot.effectEvidence;
}

export function getDefaultReportPeriod(now = new Date()): Pick<ReportInput, 'periodStart' | 'periodEnd'> {
  const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate()));
  const start = new Date(end.getTime() - 6 * 24 * 60 * 60 * 1000);
  return { periodStart: start.toISOString().slice(0, 10), periodEnd: end.toISOString().slice(0, 10) };
}

function formatEvidenceMetric(value?: number): string {
  return value === undefined ? '待补充' : `${value}%`;
}

export function getReportExportFilename(report: Pick<ReportRecord, 'title' | 'periodStart' | 'periodEnd'>): string {
  const safeTitle = report.title.trim().replace(/[\\/:*?"<>|]+/g, '-');
  return `${safeTitle || '品牌报告'}-${report.periodStart}-${report.periodEnd}.md`;
}

function exportReportMarkdown(report: ReportRecord) {
  const url = URL.createObjectURL(new Blob([report.content], { type: 'text/markdown;charset=utf-8' }));
  const link = document.createElement('a');
  link.href = url;
  link.download = getReportExportFilename(report);
  link.click();
  URL.revokeObjectURL(url);
}

function formatReportDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}
