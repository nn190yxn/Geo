import { Alert, Button, Card, Form, Input, Modal, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ReportDashboard, ReportInput, ReportRecord } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';

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
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [createOpen, setCreateOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState<ReportRecord>();
  const [form] = Form.useForm<ReportInput>();
  const dashboardQuery = useQuery({
    queryKey: ['report-dashboard', activeBrandId],
    queryFn: () => apiGet<ReportDashboard>(`/brands/${activeBrandId}/reports`)
  });
  const dashboard = dashboardQuery.data?.success ? dashboardQuery.data.data : null;
  const invalidate = () => queryClient.invalidateQueries({ queryKey: ['report-dashboard', activeBrandId] });
  const createMutation = useMutation({
    mutationFn: (values: ReportInput) => apiPost<ReportRecord>(`/brands/${activeBrandId}/reports`, values),
    onSuccess: (response) => {
      if (response.success) {
        setCreateOpen(false);
        form.resetFields();
        setSelectedReport(response.data);
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
      <Card title="报告中心" extra={<Button type="primary" onClick={() => setCreateOpen(true)}>生成报告</Button>}>
        <Typography.Paragraph>
          生成单品牌周报、月报、多品牌对比和客户交付报告，报告内容聚合 AI 推荐表现、竞品、引用、评价、内容缺口和再次监测进度。
        </Typography.Paragraph>
        <Space size={24} wrap>
          <Typography.Text>已生成报告：{dashboard?.reports.length ?? 0}</Typography.Text>
          <Typography.Text>最新报告：{dashboard?.latest?.title ?? '暂无'}</Typography.Text>
        </Space>
      </Card>

      <PageErrorAlert response={dashboardQuery.data} />

      <Table
        rowKey="id"
        loading={dashboardQuery.isLoading}
        dataSource={dashboard?.reports ?? []}
        locale={{ emptyText: <EmptyState description="暂无报告，请先生成一份交付报告。" actionLabel="生成报告" onAction={() => setCreateOpen(true)} /> }}
        columns={[
          { title: '报告名称', dataIndex: 'title' },
          { title: '报告类型', render: (_, record) => reportTypeLabels[record.type] },
          { title: '关联品牌', render: () => '当前品牌' },
          { title: '统计周期', render: (_, record) => `${record.periodStart} 至 ${record.periodEnd}` },
          { title: '生成状态', render: (_, record) => <Tag color={record.status === 'generated' ? 'green' : record.status === 'failed' ? 'red' : 'gold'}>{statusLabels[record.status]}</Tag> },
          { title: '创建时间', dataIndex: 'createdAt' },
          { title: '操作', render: (_, record) => <Button size="small" onClick={() => setSelectedReport(record)}>查看</Button> }
        ]}
      />

      <Modal title="生成报告" open={createOpen} okText="生成" cancelText="取消" onCancel={() => setCreateOpen(false)} onOk={() => form.submit()} confirmLoading={createMutation.isPending}>
        <Form form={form} layout="vertical" initialValues={{ type: 'weekly' }} onFinish={(values) => createMutation.mutate(values)}>
          <Form.Item name="type" label="报告类型" rules={[{ required: true, message: '请选择报告类型' }]}><Select options={reportTypeOptions} /></Form.Item>
          <Form.Item name="title" label="报告名称"><Input placeholder="留空时自动生成" /></Form.Item>
          <Form.Item name="periodStart" label="统计开始日期" rules={[{ required: true, message: '请输入统计开始日期' }]}><Input placeholder="2026-07-01" /></Form.Item>
          <Form.Item name="periodEnd" label="统计结束日期" rules={[{ required: true, message: '请输入统计结束日期' }]}><Input placeholder="2026-07-07" /></Form.Item>
        </Form>
      </Modal>

      <Modal title={selectedReport?.title ?? '报告详情'} open={Boolean(selectedReport)} width={900} footer={null} onCancel={() => setSelectedReport(undefined)}>
        {selectedReport ? (
          <Space direction="vertical" size={16} className="page-stack">
            <Space wrap>
              <Tag>{reportTypeLabels[selectedReport.type]}</Tag>
              <Tag color="green">{statusLabels[selectedReport.status]}</Tag>
              <Typography.Text>{selectedReport.periodStart} 至 {selectedReport.periodEnd}</Typography.Text>
            </Space>
            <Card size="small" title="数据缺口">
              {selectedReport.dataGaps.length ? selectedReport.dataGaps.map((gap) => (
                <Alert key={`${gap.section}-${gap.reason}`} type="warning" showIcon message={`${gap.section}：${gap.reason}`} style={{ marginBottom: 8 }} />
              )) : <Alert type="success" showIcon message="暂无关键数据缺口" />}
            </Card>
            <Input.TextArea value={selectedReport.content} rows={18} readOnly />
          </Space>
        ) : null}
      </Modal>
    </Space>
  );
}

const reportTypeOptions = Object.entries(reportTypeLabels).map(([value, label]) => ({ value, label }));
