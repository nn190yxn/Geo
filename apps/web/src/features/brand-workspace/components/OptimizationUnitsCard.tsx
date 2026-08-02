import { useMemo, useRef, useState } from 'react';
import { useNavigate } from 'react-router';
import { Button, Drawer, Form, Input, Select, Space, Switch, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  OptimizationUnit,
  OptimizationUnitInput,
  OptimizationUnitPriority,
  OptimizationUnitType
} from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { contentGenerationPath, growthOptimizationPath, monitoringPath, userIntentsPath } from '../../../app/routePaths';
import { BusinessEmptyState, RegionErrorState } from '../../../components/PageState';
import { ManagementListPage, ManagementRowActions } from '../../../components/ManagementListPage';
import { AccessibleDropdown } from '../../../components/AccessibleDropdown';
import { UnifiedFilterBar } from '../../../components/UnifiedFilterBar';

type Props = {
  brandId: string;
};

type UnitFormValues = Omit<OptimizationUnitInput, 'targetKeywords'> & {
  targetKeywordsText?: string;
};

export function OptimizationUnitsCard({ brandId }: Props) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<UnitFormValues>();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [editingUnitId, setEditingUnitId] = useState<string | null>(null);
  const [keyword, setKeyword] = useState('');
  const [typeFilter, setTypeFilter] = useState<OptimizationUnitType | undefined>();
  const [priorityFilter, setPriorityFilter] = useState<OptimizationUnitPriority | undefined>();
  const [statusFilter, setStatusFilter] = useState<'all' | 'enabled' | 'disabled'>('all');
  const drawerTriggerRef = useRef<HTMLElement | null>(null);
  const rowMenuTriggerRefs = useRef(new Map<string, HTMLElement>());
  const unitsQuery = useQuery({
    queryKey: ['optimization-units', brandId],
    queryFn: () => apiGet<OptimizationUnit[]>(`/brands/${brandId}/optimization-units`)
  });
  const units = unitsQuery.data?.success ? unitsQuery.data.data : [];
  const filteredUnits = useMemo(() => filterOptimizationUnits(units, { keyword, type: typeFilter, priority: priorityFilter, status: statusFilter }), [keyword, priorityFilter, statusFilter, typeFilter, units]);
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
    drawerTriggerRef.current = document.activeElement instanceof HTMLElement ? document.activeElement : null;
    setEditingUnitId(null);
    form.resetFields();
    form.setFieldsValue({ type: 'brand', priority: 'medium', enabled: true });
    setDrawerOpen(true);
  };

  const openEditDrawer = (unit: OptimizationUnit) => {
    drawerTriggerRef.current = rowMenuTriggerRefs.current.get(unit.id) ?? null;
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
    <>
      <ManagementListPage<OptimizationUnit>
        embedded
        title="优化单元"
        description="管理希望 AI 推荐的产品、服务或业务主题，并关联用户意图、监测问题、内容任务和再次监测。"
        primaryAction={units.length > 0 ? <Button type="primary" onClick={openCreateDrawer}>新增优化单元</Button> : undefined}
        filters={(
          <Space direction="vertical" size={12} className="page-stack">
            <UnifiedFilterBar
              value={{ search: keyword, platform: 'all', status: statusFilter }}
              onChange={(value) => {
                setKeyword(value.search);
                setStatusFilter(value.status as typeof statusFilter);
              }}
              onClear={() => {
                setKeyword('');
                setStatusFilter('all');
                setTypeFilter(undefined);
                setPriorityFilter(undefined);
              }}
              statusOptions={[{ value: 'enabled', label: '已启用' }, { value: 'disabled', label: '已停用' }]}
              searchPlaceholder="搜索优化单元或关键词"
              resultCount={filteredUnits.length}
              totalCount={units.length}
              showDateRange={false}
              showPlatform={false}
            />
            <Space wrap>
              <Select allowClear placeholder="类型" value={typeFilter} options={Object.entries(unitTypeLabels).map(([value, label]) => ({ value, label }))} style={{ width: 160 }} onChange={setTypeFilter} />
              <Select allowClear placeholder="优先级" value={priorityFilter} options={Object.entries(priorityLabels).map(([value, label]) => ({ value, label }))} style={{ width: 140 }} onChange={setPriorityFilter} />
            </Space>
          </Space>
        )}
        tableTitle="优化单元列表"
        tableDescription="每个对象汇总关联意图、监测问题、内容资产和真实回复。"
        tableAriaLabel="优化单元管理列表"
        state={unitsQuery.isLoading ? 'loading' : unitsQuery.data && !unitsQuery.data.success ? 'error' : units.length === 0 ? 'empty' : 'ready'}
        errorState={<RegionErrorState description="优化单元暂时无法加载，请重新加载后继续管理。" onRetry={() => void unitsQuery.refetch()} />}
        tableProps={{
          rowKey: 'id',
          dataSource: filteredUnits,
          pagination: false,
          locale: { emptyText: <BusinessEmptyState title="先创建一个优化单元" missing="希望 AI 推荐的产品、服务或业务主题" reason="缺少优化单元时，用户意图、AI 回复监测、内容任务和分析诊断都没有关联对象。" nextStep="新增优化单元，并填写目标关键词。" actionLabel="新增优化单元" onAction={openCreateDrawer} /> },
          scroll: { x: 980 },
          columns: [
          {
            title: '优化单元',
            render: (_, record) => (
              <Space direction="vertical" size={2}>
                <Typography.Text strong>{record.name}</Typography.Text>
                <Typography.Text type="secondary">{unitTypeLabels[record.type]}</Typography.Text>
              </Space>
            )
          },
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
                用户意图 {record.relatedCounts.userIntents} / 监测问题 {record.relatedCounts.prompts} / 内容资产 {record.relatedCounts.contentStrategies}
              </Typography.Text>
            )
          },
          {
            title: '监测表现',
            render: (_, record) => (
              <Space direction="vertical" size={2}>
                <Typography.Text>真实回复 {record.relatedCounts.monitoringRuns}</Typography.Text>
                <Typography.Text type="secondary">推荐度待监测 / 平均排名待监测</Typography.Text>
              </Space>
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
            fixed: 'right',
            render: (_, record) => (
              <ManagementRowActions
                primaryActions={[
                   <Button type="link" key="intent" onClick={() => navigate(getOptimizationUnitWorkflowPaths(record.id).createIntent)}>创建用户意图</Button>,
                   <Button type="link" key="monitor" onClick={() => navigate(getOptimizationUnitWorkflowPaths(record.id).startMonitoring)}>开始监测</Button>
                ]}
                moreAction={(
                  <AccessibleDropdown label={`优化单元“${record.name}”的更多操作`} menu={{ items: [
                    { key: 'content', label: '生成内容', onClick: () => navigate(contentGenerationPath({ optimizationUnitId: record.id })) },
                    { key: 'analysis', label: '查看分析', onClick: () => navigate(growthOptimizationPath({ optimizationUnitId: record.id })) },
                    { key: 'edit', label: '编辑', onClick: () => openEditDrawer(record) }
                  ] }}>
                    <Button
                      ref={(element) => {
                        if (element) rowMenuTriggerRefs.current.set(record.id, element);
                        else rowMenuTriggerRefs.current.delete(record.id);
                      }}
                      type="link"
                    >更多</Button>
                  </AccessibleDropdown>
                )}
              />
            )
          }
          ]
        }}
      />
      <Drawer
        afterOpenChange={(open) => {
          if (!open && drawerTriggerRef.current?.isConnected) drawerTriggerRef.current.focus({ preventScroll: true });
        }}
        title={editingUnitId ? '优化单元详情' : '新增优化单元'}
        open={drawerOpen}
        width={460}
        onClose={() => setDrawerOpen(false)}
        extra={<Button type="primary" loading={saveUnitMutation.isPending} onClick={() => form.submit()}>保存</Button>}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveUnitMutation.mutate(values)}>
          <Form.Item name="name" label="优化单元名称" rules={[{ required: true, message: '请输入优化单元名称' }]}>
            <Input placeholder="例如：儿童体适能品牌推荐" />
          </Form.Item>
          <Form.Item name="type" label="单元类型" rules={[{ required: true, message: '请选择单元类型' }]}>
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
    </>
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

export function filterOptimizationUnits(units: OptimizationUnit[], filters: { keyword: string; type?: OptimizationUnitType; priority?: OptimizationUnitPriority; status: 'all' | 'enabled' | 'disabled' }) {
  const normalizedKeyword = filters.keyword.trim().toLowerCase();
  return units.filter((unit) => {
    const matchesKeyword = normalizedKeyword.length === 0
      || unit.name.toLowerCase().includes(normalizedKeyword)
      || unit.targetKeywords.some((targetKeyword) => targetKeyword.toLowerCase().includes(normalizedKeyword));
    const matchesType = !filters.type || unit.type === filters.type;
    const matchesPriority = !filters.priority || unit.priority === filters.priority;
    const matchesStatus = filters.status === 'all' || unit.enabled === (filters.status === 'enabled');
    return matchesKeyword && matchesType && matchesPriority && matchesStatus;
  });
}

export function getOptimizationUnitWorkflowPaths(optimizationUnitId: string) {
  return {
    createIntent: userIntentsPath({ optimizationUnitId, action: 'create' }),
    startMonitoring: monitoringPath({ optimizationUnitId }, 'test-question-candidate-card')
  };
}

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
