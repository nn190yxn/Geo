import { Alert, Button, Card, Descriptions, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdvisorDashboard, AdvisorRecord, AdvisorRecordInput } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';

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
  const [selectedRecord, setSelectedRecord] = useState<AdvisorRecord>();
  const [form] = Form.useForm<AdvisorFormValues>();
  const dashboardQuery = useQuery({
    queryKey: ['advisor-dashboard', activeBrandId],
    queryFn: () => apiGet<AdvisorDashboard>(`/brands/${activeBrandId}/advisor-records`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['advisor-dashboard', activeBrandId] });
  const createMutation = useMutation({
    mutationFn: (values: AdvisorRecordInput) => apiPost<AdvisorRecord>(`/brands/${activeBrandId}/advisor-records`, values),
    onSuccess: (response) => {
      if (response.success) {
        setCreateOpen(false);
        form.resetFields();
        setSelectedRecord(response.data);
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
      <PageErrorAlert response={dashboardQuery.data} />
      <Card title="顾问服务" extra={<Space><Button onClick={() => openCreateModal('diagnosis')}>新增诊断</Button><Button onClick={() => openCreateModal('service_plan')}>新增服务计划</Button><Button type="primary" onClick={() => openCreateModal('review')}>新增复盘</Button></Space>}>
        <Typography.Paragraph>
          汇总品牌诊断、服务计划、培训记录、行业规则更新和顾问备注，并关联客户交付报告形成服务履约记录。
        </Typography.Paragraph>
        <Space size={24} wrap>
          <Typography.Text>服务记录：{dashboard?.records.length ?? 0}</Typography.Text>
          <Typography.Text>待跟进事项：{dashboard?.pendingFollowUps.length ?? 0}</Typography.Text>
          <Typography.Text>可引用报告：{dashboard?.relatedReports.length ?? 0}</Typography.Text>
          <Typography.Text>最新诊断：{dashboard?.latestDiagnosis?.title ?? '暂无'}</Typography.Text>
        </Space>
      </Card>

      <Card title="待跟进事项">
        {(dashboard?.pendingFollowUps.length ?? 0) > 0 ? (
          <Space direction="vertical" size={8} className="page-stack">
            {dashboard?.pendingFollowUps.map((item) => (
              <Alert key={item.id} type={item.status === 'doing' ? 'warning' : 'info'} message={item.title} description={[item.owner ? `负责人：${item.owner}` : '', item.dueDate ? `截止：${item.dueDate}` : '', `状态：${followUpStatusLabels[item.status]}`].filter(Boolean).join(' / ')} />
            ))}
          </Space>
        ) : <EmptyState description="暂无待跟进事项。" />}
      </Card>

      <Space align="start" size={16} className="page-stack" wrap>
        <Card title="品牌服务列表" style={{ flex: 2, minWidth: 720 }}>
          <Table
            rowKey="id"
            loading={dashboardQuery.isLoading}
            dataSource={dashboard?.records ?? []}
            locale={{ emptyText: <EmptyState description="暂无顾问服务记录，请先新增诊断或服务记录。" actionLabel="新增服务记录" onAction={() => openCreateModal('service_plan')} /> }}
            columns={[
              { title: '服务类型', render: (_, record) => <Tag>{advisorTypeLabels[record.type]}</Tag> },
              { title: '标题', dataIndex: 'title' },
              { title: '关联品牌', render: () => '当前品牌' },
              { title: '服务时间', dataIndex: 'createdAt' },
              { title: '跟进事项', render: (_, record) => record.followUpItems.length },
              { title: '关联报告', render: (_, record) => record.relatedReport?.title ?? '暂无' },
              { title: '操作', render: (_, record) => <Button size="small" onClick={() => setSelectedRecord(record)}>查看</Button> }
            ]}
          />
        </Card>

        <Card title="服务详情" style={{ flex: 1, minWidth: 360 }}>
          {selectedRecord ? (
            <Space direction="vertical" size={12} className="page-stack">
              <Space wrap><Tag>{advisorTypeLabels[selectedRecord.type]}</Tag><Typography.Text>顾问记录</Typography.Text></Space>
              <Typography.Title level={5}>{selectedRecord.title}</Typography.Title>
              <Descriptions size="small" column={1} bordered items={getAdvisorRecordSections(selectedRecord.content).map((section) => ({ key: section.title, label: section.title, children: section.content.join('；') }))} />
              <Card size="small" title="关联报告">
                {selectedRecord.relatedReport ? `${selectedRecord.relatedReport.title}（${selectedRecord.relatedReport.periodStart} 至 ${selectedRecord.relatedReport.periodEnd}）` : '暂无关联报告'}
              </Card>
              <Card size="small" title="跟进事项">
                {selectedRecord.followUpItems.length ? selectedRecord.followUpItems.map((item) => (
                  <Alert key={item.id} type={item.status === 'done' ? 'success' : 'info'} message={`${item.title}：${followUpStatusLabels[item.status]}`} style={{ marginBottom: 8 }} />
                )) : <Alert type="success" message="暂无待跟进事项" />}
              </Card>
            </Space>
          ) : <EmptyState description="请选择一条服务记录查看详情。" />}
        </Card>
      </Space>

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

function toLines(value?: string): string[] {
  return value?.split('\n').map((item) => item.trim()).filter(Boolean) ?? [];
}
