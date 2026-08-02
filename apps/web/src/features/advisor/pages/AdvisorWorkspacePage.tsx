import { Alert, Button, Card, Descriptions, Form, Input, Modal, Select, Space, Statistic, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdvisorDashboard, AdvisorFollowUpItem, AdvisorRecord, AdvisorRecordInput, AdvisorRecordType } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { EmptyState, GuidedEmptyState, PageSkeleton, RegionErrorState } from '../../../components/PageState';
import { ManagementListPage, ManagementRowActions } from '../../../components/ManagementListPage';
import { ProductPageSection } from '../../../components/ProductPage';
import { UnifiedFilterBar } from '../../../components/UnifiedFilterBar';

const advisorTypeLabels: Record<AdvisorRecord['type'], string> = {
  diagnosis: '品牌诊断',
  service_plan: '服务计划',
  review: '服务复盘',
  delivery: '客户交付',
  service: '服务记录',
  training: '培训记录',
  rule_update: '规则更新',
  note: '顾问备注'
};

const followUpStatusLabels: Record<AdvisorRecord['followUpItems'][number]['status'], string> = {
  todo: '待处理',
  doing: '进行中',
  done: '已完成'
};

const serviceStatusLabels: Record<AdvisorServiceStatus, string> = {
  recorded: '已记录',
  todo: '待处理',
  doing: '进行中',
  done: '已完成'
};

const serviceStatusColors: Record<AdvisorServiceStatus, string> = {
  recorded: 'blue',
  todo: 'orange',
  doing: 'gold',
  done: 'green'
};

type AdvisorFormValues = AdvisorRecordInput & {
  issuesText?: string;
  recommendationsText?: string;
  serviceObjective?: string;
  milestonesText?: string;
  owner?: string;
  expectedOutcome?: string;
  completedActionsText?: string;
  dataChange?: string;
  nextStep?: string;
  followUpText?: string;
};

export type AdvisorRecordSection = {
  title: string;
  content: string[];
};

export type AdvisorServiceStatus = 'recorded' | AdvisorFollowUpItem['status'];

export type AdvisorServiceRow = {
  id: string;
  kind: 'record' | 'follow_up';
  recordType: AdvisorRecordType | 'follow_up';
  title: string;
  context: string;
  status: AdvisorServiceStatus;
  owner: string;
  serviceTime: string;
  nextStep: string;
  record: AdvisorRecord;
  followUp?: AdvisorFollowUpItem;
};

export type AdvisorServiceFilters = {
  search: string;
  type: AdvisorRecordType | 'follow_up' | 'all';
  status: AdvisorServiceStatus | 'all';
  from?: string;
  to?: string;
};

export function buildAdvisorRecordContent(values: AdvisorFormValues): string {
  const sections: AdvisorRecordSection[] = [];
  const baseContent = values.content?.trim();
  if (baseContent) sections.push({ title: '服务摘要', content: [baseContent] });
  if (values.issuesText?.trim()) sections.push({ title: '问题', content: toLines(values.issuesText) });
  if (values.recommendationsText?.trim()) sections.push({ title: '建议', content: toLines(values.recommendationsText) });
  if (values.serviceObjective?.trim() || values.milestonesText?.trim() || values.owner?.trim() || values.expectedOutcome?.trim()) {
    sections.push({
      title: '服务计划',
      content: [
        values.serviceObjective?.trim() ? `服务目标：${values.serviceObjective.trim()}` : '',
        values.owner?.trim() ? `负责人：${values.owner.trim()}` : '',
        values.expectedOutcome?.trim() ? `预期结果：${values.expectedOutcome.trim()}` : '',
        ...toLines(values.milestonesText).map((item) => `里程碑：${item}`)
      ].filter(Boolean)
    });
  }
  if (values.completedActionsText?.trim() || values.dataChange?.trim() || values.nextStep?.trim()) {
    sections.push({
      title: '复盘记录',
      content: [
        ...toLines(values.completedActionsText).map((item) => `完成动作：${item}`),
        values.dataChange?.trim() ? `数据变化：${values.dataChange.trim()}` : '',
        values.nextStep?.trim() ? `下一步：${values.nextStep.trim()}` : ''
      ].filter(Boolean)
    });
  }

  return sections.length ? sections.map((section) => `## ${section.title}\n${section.content.map((item) => `- ${item}`).join('\n')}`).join('\n\n') : '';
}

export function getAdvisorRecordSections(content: string): AdvisorRecordSection[] {
  if (!content.includes('## ')) {
    const trimmed = content.trim();
    return trimmed ? [{ title: '服务摘要', content: [trimmed] }] : [];
  }

  return content.split(/\n(?=## )/).map((block) => {
    const [heading, ...lines] = block.trim().split('\n');
    return {
      title: heading.replace(/^##\s*/, '').trim(),
      content: lines.map((line) => line.replace(/^-\s*/, '').trim()).filter(Boolean)
    };
  }).filter((section) => section.title && section.content.length);
}

export function AdvisorWorkspacePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedRowId, setSelectedRowId] = useState<string>();
  const [filters, setFilters] = useState<AdvisorServiceFilters>(defaultAdvisorServiceFilters);
  const [form] = Form.useForm<AdvisorFormValues>();
  const dashboardQuery = useQuery({
    queryKey: ['advisor-dashboard', activeBrandId],
    queryFn: () => apiGet<AdvisorDashboard>(`/brands/${activeBrandId}/advisor-records`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const rows = buildAdvisorServiceRows(dashboard?.records ?? []);
  const filteredRows = getFilteredAdvisorServiceRows(rows, filters);
  const selectedRow = rows.find((row) => row.id === selectedRowId) ?? rows[0];
  const listState = dashboardQuery.isLoading
    ? 'loading'
    : dashboardQuery.isError || (dashboardQuery.data && !dashboardQuery.data.success)
      ? 'error'
      : rows.length === 0
        ? 'empty'
        : 'ready';
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['advisor-dashboard', activeBrandId] });
  const createMutation = useMutation({
    mutationFn: (values: AdvisorRecordInput) => apiPost<AdvisorRecord>(`/brands/${activeBrandId}/advisor-records`, values),
    onSuccess: (response) => {
      if (response.success) {
        setCreateOpen(false);
        form.resetFields();
        setSelectedRowId(`record:${response.data.id}`);
        void invalidate();
        void messageApi.success('顾问服务记录已创建');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const openCreateModal = (type: AdvisorRecord['type']) => {
    form.resetFields();
    form.setFieldsValue({ type });
    setCreateOpen(true);
  };

  const handleSubmit = (values: AdvisorFormValues) => {
    const content = buildAdvisorRecordContent(values);
    createMutation.mutate({
      type: values.type,
      title: values.title,
      content,
      relatedReportId: values.relatedReportId,
      followUpItems: values.followUpText
        ? values.followUpText.split('\n').map((title) => title.trim()).filter(Boolean).map((title) => ({ title, status: 'todo' }))
        : []
    });
  };

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <ManagementListPage<AdvisorServiceRow>
        title="顾问服务"
        description="统一管理品牌诊断、服务计划、复盘、客户交付、培训和跟进事项，形成连续可追踪的服务履约记录。"
        context={<Tag>当前品牌：{activeBrandId}</Tag>}
        primaryAction={rows.length > 0 ? <Button type="primary" onClick={() => openCreateModal('service')}>新增服务记录</Button> : undefined}
        summary={(
          <Space size={24} wrap>
            <Statistic title="服务记录" value={dashboard?.records.length ?? 0} />
            <Statistic title="待跟进事项" value={dashboard?.pendingFollowUps.length ?? 0} />
            <Statistic title="可引用报告" value={dashboard?.relatedReports.length ?? 0} />
            <Statistic title="最新诊断" value={dashboard?.latestDiagnosis?.title ?? '暂无'} />
          </Space>
        )}
        filters={(
          <UnifiedFilterBar
            value={{ search: filters.search, platform: 'all', status: filters.status, from: filters.from, to: filters.to }}
            onChange={(value) => setFilters((current) => ({ ...current, search: value.search, status: value.status as AdvisorServiceStatus | 'all', from: value.from, to: value.to }))}
            onClear={() => setFilters(defaultAdvisorServiceFilters)}
            statusOptions={advisorServiceStatusOptions}
            searchPlaceholder="搜索服务标题、负责人或下一步"
            resultCount={filteredRows.length}
            totalCount={rows.length}
            showPlatform={false}
            hasAdditionalFilters={filters.type !== 'all'}
            extraFilters={<Select aria-label="服务类型筛选" value={filters.type} options={advisorServiceTypeOptions} onChange={(type) => setFilters((current) => ({ ...current, type }))} />}
          />
        )}
        state={listState}
        loadingState={<PageSkeleton rows={4} />}
        errorState={<RegionErrorState description="顾问服务记录加载失败，请重新加载后继续管理。" onRetry={() => void dashboardQuery.refetch()} />}
        emptyState={<GuidedEmptyState title="还没有顾问服务记录" reason="当前品牌尚未建立诊断、计划或服务跟进记录。" impact="团队缺少可持续跟踪的服务目标、责任人与交付依据。" benefit="创建后可统一管理服务任务、关联报告和下一步行动。" actionLabel="新增首条服务记录" onAction={() => openCreateModal('service')} />}
        tableTitle="服务任务与记录"
        tableDescription="服务记录与跟进事项按统一状态、负责人、时间和下一步进行管理。"
        tableAriaLabel="顾问服务任务与记录列表"
        tableProps={{
          rowKey: 'id',
          dataSource: filteredRows,
          pagination: filteredRows.length > 8 ? { pageSize: 8 } : false,
          locale: { emptyText: <EmptyState title="没有匹配的服务任务" description="当前筛选条件下的顾问服务记录" reason="服务类型、状态、时间或搜索内容未匹配已有记录。" nextStep="清空部分筛选后重新查看。" /> },
          columns: [
            { title: '服务任务', render: (_, row) => <Space direction="vertical" size={2}><Typography.Text strong>{row.title}</Typography.Text><Typography.Text type="secondary">{row.context}</Typography.Text></Space> },
            { title: '类型', render: (_, row) => <Tag>{row.recordType === 'follow_up' ? '跟进事项' : advisorTypeLabels[row.recordType]}</Tag> },
            { title: '状态', render: (_, row) => <Tag color={serviceStatusColors[row.status]}>{serviceStatusLabels[row.status]}</Tag> },
            { title: '负责人', dataIndex: 'owner' },
            { title: '服务时间', dataIndex: 'serviceTime', render: (value) => formatAdvisorDate(value) },
            { title: '下一步', dataIndex: 'nextStep' },
            { title: '关联报告', render: (_, row) => row.record.relatedReport?.title ?? '待关联' },
            { title: '操作', render: (_, row) => <ManagementRowActions primaryActions={[<Button key="detail" size="small" onClick={() => setSelectedRowId(row.id)}>查看详情</Button>]} /> }
          ]
        }}
      />

      {selectedRow ? <AdvisorServiceDetail row={selectedRow} /> : null}

      <Modal title="新增顾问服务记录" open={createOpen} okText="保存" cancelText="取消" onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" initialValues={{ type: 'service' }} onFinish={handleSubmit}>
          <Form.Item name="type" label="服务类型" rules={[{ required: true, message: '请选择服务类型' }]}><Select options={advisorTypeOptions} /></Form.Item>
          <Form.Item name="title" label="标题" rules={[{ required: true, message: '请输入标题' }]}><Input /></Form.Item>
          <Form.Item name="content" label="服务摘要" rules={[{ required: true, message: '请输入服务摘要' }]}><Input.TextArea rows={3} /></Form.Item>
          <Form.Item name="issuesText" label="问题"><Input.TextArea rows={3} placeholder="每行一个问题" /></Form.Item>
          <Form.Item name="recommendationsText" label="建议"><Input.TextArea rows={3} placeholder="每行一条建议" /></Form.Item>
          <Form.Item name="serviceObjective" label="服务目标"><Input /></Form.Item>
          <Form.Item name="milestonesText" label="里程碑"><Input.TextArea rows={3} placeholder="每行一个里程碑" /></Form.Item>
          <Form.Item name="owner" label="负责人"><Input /></Form.Item>
          <Form.Item name="expectedOutcome" label="预期结果"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="completedActionsText" label="完成动作"><Input.TextArea rows={3} placeholder="每行一个完成动作" /></Form.Item>
          <Form.Item name="dataChange" label="数据变化"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="nextStep" label="下一步"><Input.TextArea rows={2} /></Form.Item>
          <Form.Item name="relatedReportId" label="关联报告"><Select allowClear options={(dashboard?.relatedReports ?? []).map((report) => ({ value: report.id, label: report.title }))} /></Form.Item>
          <Form.Item name="followUpText" label="跟进事项"><Input.TextArea rows={3} placeholder="每行一条跟进事项" /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

const advisorTypeOptions = Object.entries(advisorTypeLabels).map(([value, label]) => ({ value, label }));
const advisorServiceStatusOptions = Object.entries(serviceStatusLabels).map(([value, label]) => ({ value, label }));
const advisorServiceTypeOptions = [{ value: 'all', label: '全部类型' }, ...advisorTypeOptions, { value: 'follow_up', label: '跟进事项' }];
export const defaultAdvisorServiceFilters: AdvisorServiceFilters = { search: '', type: 'all', status: 'all' };

export function buildAdvisorServiceRows(records: AdvisorRecord[]): AdvisorServiceRow[] {
  return records.flatMap((record) => {
    const sections = getAdvisorRecordSections(record.content);
    const owner = getSectionValue(sections, '负责人') || record.createdBy;
    const pendingFollowUp = record.followUpItems.find((item) => item.status !== 'done');
    const nextStep = getSectionValue(sections, '下一步') || pendingFollowUp?.title || '查看服务记录并确认后续安排';
    const recordRow: AdvisorServiceRow = {
      id: `record:${record.id}`,
      kind: 'record',
      recordType: record.type,
      title: record.title,
      context: advisorTypeLabels[record.type],
      status: getAdvisorRecordStatus(record.followUpItems),
      owner,
      serviceTime: record.createdAt,
      nextStep,
      record
    };
    const followUpRows = record.followUpItems.map<AdvisorServiceRow>((followUp) => ({
      id: `follow-up:${followUp.id}`,
      kind: 'follow_up',
      recordType: 'follow_up',
      title: followUp.title,
      context: `${record.title} · 跟进事项`,
      status: followUp.status,
      owner: followUp.owner || owner,
      serviceTime: followUp.dueDate || record.createdAt,
      nextStep: getFollowUpNextStep(followUp.status),
      record,
      followUp
    }));
    return [recordRow, ...followUpRows];
  });
}

export function getFilteredAdvisorServiceRows(rows: AdvisorServiceRow[], filters: AdvisorServiceFilters): AdvisorServiceRow[] {
  const search = filters.search.trim().toLocaleLowerCase();
  return rows.filter((row) => {
    const searchableText = `${row.title} ${row.context} ${row.owner} ${row.nextStep} ${row.record.relatedReport?.title ?? ''}`.toLocaleLowerCase();
    const serviceDate = row.serviceTime.slice(0, 10);
    return (!search || searchableText.includes(search))
      && (filters.type === 'all' || row.recordType === filters.type)
      && (filters.status === 'all' || row.status === filters.status)
      && (!filters.from || serviceDate >= filters.from)
      && (!filters.to || serviceDate <= filters.to);
  });
}

export function AdvisorServiceDetail({ row }: { row: AdvisorServiceRow }) {
  const sections = getAdvisorRecordSections(row.record.content);
  return (
    <ProductPageSection title="服务详情" description="查看当前服务记录的状态、责任人、关联报告和连续行动。" className="advisor-service-detail">
      <Space direction="vertical" size={16} className="page-stack">
        <Card size="small" title={row.title}>
          <Descriptions
            size="small"
            column={{ xs: 1, sm: 2, lg: 3 }}
            items={[
              { key: 'type', label: '类型', children: row.recordType === 'follow_up' ? '跟进事项' : advisorTypeLabels[row.recordType] },
              { key: 'status', label: '状态', children: <Tag color={serviceStatusColors[row.status]}>{serviceStatusLabels[row.status]}</Tag> },
              { key: 'owner', label: '负责人', children: row.owner },
              { key: 'time', label: row.followUp?.dueDate ? '截止时间' : '服务时间', children: formatAdvisorDate(row.serviceTime) },
              { key: 'next-step', label: '下一步', children: row.nextStep },
              { key: 'brand', label: '品牌', children: row.record.brandId }
            ]}
          />
        </Card>
        <Card size="small" title="关联报告">
          {row.record.relatedReport
            ? `${row.record.relatedReport.title}（${row.record.relatedReport.periodStart} 至 ${row.record.relatedReport.periodEnd}）`
            : <Alert type="info" showIcon message="当前服务记录尚未关联报告" />}
        </Card>
        <Card size="small" title="服务记录">
          {sections.length
            ? <Descriptions size="small" column={1} bordered items={sections.map((section) => ({ key: section.title, label: section.title, children: section.content.join('；') }))} />
            : <EmptyState description="当前记录暂无服务正文。" />}
        </Card>
        <Card size="small" title={`跟进事项（${row.record.followUpItems.length}）`}>
          {row.record.followUpItems.length ? row.record.followUpItems.map((item) => (
            <Alert key={item.id} type={item.status === 'done' ? 'success' : item.status === 'doing' ? 'warning' : 'info'} message={item.title} description={[`状态：${followUpStatusLabels[item.status]}`, item.owner ? `负责人：${item.owner}` : '', item.dueDate ? `截止：${item.dueDate}` : ''].filter(Boolean).join(' / ')} style={{ marginBottom: 8 }} />
          )) : <Alert type="success" showIcon message="当前服务记录暂无待跟进事项" />}
        </Card>
      </Space>
    </ProductPageSection>
  );
}

function getAdvisorRecordStatus(items: AdvisorFollowUpItem[]): AdvisorServiceStatus {
  if (items.some((item) => item.status === 'doing')) return 'doing';
  if (items.some((item) => item.status === 'todo')) return 'todo';
  if (items.length > 0) return 'done';
  return 'recorded';
}

function getSectionValue(sections: AdvisorRecordSection[], prefix: string): string {
  const item = sections.flatMap((section) => section.content).find((content) => content.startsWith(`${prefix}：`));
  return item?.slice(prefix.length + 1).trim() ?? '';
}

function getFollowUpNextStep(status: AdvisorFollowUpItem['status']): string {
  if (status === 'todo') return '开始处理该跟进事项';
  if (status === 'doing') return '完成并记录处理结果';
  return '查看关联服务记录';
}

function formatAdvisorDate(value: string): string {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString('zh-CN', { hour12: false });
}

function toLines(value?: string): string[] {
  return value?.split('\n').map((item) => item.trim()).filter(Boolean) ?? [];
}
