import { useState } from 'react';
import { Button, Card, Drawer, Form, Input, Select, Space, Switch, Table, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  OptimizationUnit,
  OptimizationUnitInput,
  OptimizationUnitPriority,
  OptimizationUnitType
} from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';

type Props = {
  brandId: string;
};

type UnitFormValues = Omit<OptimizationUnitInput, 'targetKeywords'> & {
  targetKeywordsText?: string;
};

export function OptimizationUnitsCard({ brandId }: Props) {
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UnitFormValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const unitsQuery = useQuery({
    queryKey: ['optimization-units', brandId],
    queryFn: () => apiGet<OptimizationUnit[]>(`/brands/${brandId}/optimization-units`)
  });
  const units = unitsQuery.data?.success ? unitsQuery.data.data : [];
  const saveUnitMutation = useMutation({
    mutationFn: (values: UnitFormValues) => {
      const payload = toUnitPayload(values);
      return editingUnitId
        ? apiPatch<OptimizationUnit>(`/brands/${brandId}/optimization-units/${editingUnitId}`, payload)
        : apiPost<OptimizationUnit>(`/brands/${brandId}/optimization-units`, payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        setDrawerOpen(false);
        form.resetFields();
        setEditingUnitId(null);
        void queryClient.invalidateQueries({ queryKey: ['optimization-units', brandId] });
        void queryClient.invalidateQueries({ queryKey: ['brand-workspace', brandId] });
      }
    }
  });
  const statusMutation = useMutation({
    mutationFn: ({ unitId, enabled }: { unitId: string; enabled: boolean }) =>
      apiPatch<OptimizationUnit>(`/brands/${brandId}/optimization-units/${unitId}`, { enabled }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ['optimization-units', brandId] });
      void queryClient.invalidateQueries({ queryKey: ['brand-workspace', brandId] });
    }
  });

  const openCreateDrawer = () => {
    setEditingUnitId(null);
    form.resetFields();
    form.setFieldsValue({ type: 'brand', priority: 'medium', enabled: true });
    setDrawerOpen(true);
  };

  const openEditDrawer = (unit: OptimizationUnit) => {
    setEditingUnitId(unit.id);
    form.setFieldsValue({
      name: unit.name,
      type: unit.type,
      targetKeywordsText: unit.targetKeywords.join('\n'),
      priority: unit.priority,
      enabled: unit.enabled
    });
    setDrawerOpen(true);
  };

  return (
    <Card
      title="监测主题"
      extra={<Button type="primary" onClick={openCreateDrawer}>新增监测主题</Button>}
    >
      <Table
        rowKey="id"
        loading={unitsQuery.isLoading}
        dataSource={units}
        pagination={false}
        columns={[
          { title: '名称', dataIndex: 'name' },
          { title: '类型', dataIndex: 'type', render: (value: OptimizationUnitType) => unitTypeLabels[value] },
          {
            title: '目标关键词',
            render: (_, record) => <Space wrap>{record.targetKeywords.map((keyword) => <Tag key={keyword}>{keyword}</Tag>)}</Space>
          },
          {
            title: '优先级',
            dataIndex: 'priority',
            render: (value: OptimizationUnitPriority) => <Tag color={priorityColors[value]}>{priorityLabels[value]}</Tag>
          },
          {
            title: '关联对象',
            render: (_, record) => (
              <Typography.Text type="secondary">
                监测场景 {record.relatedCounts.userIntents} / 监测问题 {record.relatedCounts.prompts} / 内容策略 {record.relatedCounts.contentStrategies}
              </Typography.Text>
            )
          },
          {
            title: '状态',
            render: (_, record) => (
              <Switch
                checked={record.enabled}
                checkedChildren="启用"
                unCheckedChildren="停用"
                onChange={(enabled) => statusMutation.mutate({ unitId: record.id, enabled })}
              />
            )
          },
          {
            title: '操作',
            render: (_, record) => <Button type="link" onClick={() => openEditDrawer(record)}>详情</Button>
          }
        ]}
      />
      <Drawer
        title={editingUnitId ? '监测主题详情' : '新增监测主题'}
        open={drawerOpen}
        width={460}
        onClose={() => setDrawerOpen(false)}
        extra={<Button type="primary" loading={saveUnitMutation.isPending} onClick={() => form.submit()}>保存</Button>}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveUnitMutation.mutate(values)}>
          <Form.Item name="name" label="监测主题名称" rules={[{ required: true, message: '请输入监测主题名称' }]}>
            <Input placeholder="例如：儿童体适能品牌推荐" />
          </Form.Item>
          <Form.Item name="type" label="主题类型" rules={[{ required: true, message: '请选择主题类型' }]}>
            <Select options={Object.entries(unitTypeLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="targetKeywordsText" label="目标关键词">
            <Input.TextArea rows={5} placeholder="一行一个关键词" />
          </Form.Item>
          <Form.Item name="priority" label="优先级" rules={[{ required: true, message: '请选择优先级' }]}>
            <Select options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="enabled" label="启用状态" valuePropName="checked">
            <Switch checkedChildren="启用" unCheckedChildren="停用" />
          </Form.Item>
        </Form>
      </Drawer>
    </Card>
  );
}

const unitTypeLabels: Record<OptimizationUnitType, string> = {
  brand: '品牌词',
  category: '品类词',
  scenario: '场景词',
  location: '地域词',
  competitor: '竞品词'
};

const priorityLabels: Record<OptimizationUnitPriority, string> = {
  high: '高',
  medium: '中',
  low: '低'
};

const priorityColors: Record<OptimizationUnitPriority, string> = {
  high: 'red',
  medium: 'gold',
  low: 'default'
};

function toUnitPayload(values: UnitFormValues): OptimizationUnitInput {
  return {
    name: values.name,
    type: values.type,
    targetKeywords: splitLines(values.targetKeywordsText),
    priority: values.priority,
    enabled: values.enabled ?? true
  };
}

function splitLines(value?: string): string[] {
  return (value ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
}
