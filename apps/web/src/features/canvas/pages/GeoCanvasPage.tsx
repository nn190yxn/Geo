import { useMemo, useState } from 'react';
import { Button, Card, Drawer, Empty, Form, Input, Modal, Select, Space, Statistic, Tag, Tooltip, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactFlow, { Background, Controls, MarkerType, MiniMap, type Edge, type Node } from 'reactflow';
import 'reactflow/dist/style.css';
import type {
  ContentStrategy,
  ContentStrategyInput,
  ContentStrategyPriority,
  ContentStrategyType,
  GeoCanvasNode,
  GeoCanvasWorkspace,
  OptimizationTask,
  OptimizationTaskInput,
  UserIntent,
  UserIntentCategory,
  UserIntentInput
} from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { useBrandContextStore } from '../../../stores/brandContextStore';

type IntentFormValues = UserIntentInput;
type StrategyFormValues = Omit<ContentStrategyInput, 'targetKeywords' | 'relatedPromptIds'> & {
  targetKeywordsText?: string;
  relatedPromptIds?: string[];
};
type TaskFormValues = OptimizationTaskInput;

export function GeoCanvasPage() {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [intentModalOpen, setIntentModalOpen] = useState(false);
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [intentForm] = Form.useForm<IntentFormValues>();
  const [strategyForm] = Form.useForm<StrategyFormValues>();
  const [taskForm] = Form.useForm<TaskFormValues>();
  const canvasQuery = useQuery({
    queryKey: ['geo-canvas', activeBrandId],
    queryFn: () => apiGet<GeoCanvasWorkspace>(`/brands/${activeBrandId}/canvas`)
  });
  const canvas = canvasQuery.data?.success ? canvasQuery.data.data : null;
  const selectedNode = canvas?.nodes.find((node) => node.id === selectedNodeId);
  const flowNodes = useMemo(() => canvas ? toFlowNodes(canvas.nodes) : [], [canvas]);
  const flowEdges = useMemo(() => canvas ? toFlowEdges(canvas.edges) : [], [canvas]);

  const createIntentMutation = useMutation({
    mutationFn: (values: IntentFormValues) => apiPost<UserIntent>(`/brands/${activeBrandId}/intents`, values),
    onSuccess: (response) => {
      if (response.success) {
        setIntentModalOpen(false);
        intentForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['geo-canvas', activeBrandId] });
        void messageApi.success('用户场景已创建');
      }
    }
  });
  const createStrategyMutation = useMutation({
    mutationFn: (values: StrategyFormValues) => apiPost<ContentStrategy>(`/brands/${activeBrandId}/canvas/content-strategies`, toStrategyPayload(values)),
    onSuccess: (response) => {
      if (response.success) {
        setStrategyModalOpen(false);
        strategyForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['geo-canvas', activeBrandId] });
        void messageApi.success('内容策略已创建');
      }
    }
  });
  const createTaskMutation = useMutation({
    mutationFn: (values: TaskFormValues) => apiPost<OptimizationTask>(`/brands/${activeBrandId}/canvas/tasks`, values),
    onSuccess: (response) => {
      if (response.success) {
        setTaskModalOpen(false);
        taskForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['geo-canvas', activeBrandId] });
        void messageApi.success('优化任务已创建');
      }
    }
  });

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <Card
        title="监测地图"
        extra={(
          <Space>
            <Button onClick={() => setIntentModalOpen(true)}>创建用户场景</Button>
            <Tooltip title="把监测发现的问题变成具体内容动作，比如写公众号推文、官网 FAQ 或小红书图文。">
              <Button onClick={() => setStrategyModalOpen(true)}>创建内容策略</Button>
            </Tooltip>
            <Button type="primary" onClick={() => setTaskModalOpen(true)}>创建优化任务</Button>
          </Space>
        )}
      >
        <Typography.Paragraph>
          这里用来决定第一轮 AI 要帮你监测什么：先选一个监测主题，再写一个家长会问 AI 的真实场景，后面 AI 回复监测就会围绕这些方向生成问题和优化建议。
        </Typography.Paragraph>
        <Space size={24} wrap>
          <Statistic title="监测主题" value={canvas?.optimizationUnits.length ?? 0} />
          <Statistic title="用户场景" value={canvas?.userIntents.length ?? 0} />
          <Statistic title="内容策略" value={canvas?.contentStrategies.length ?? 0} />
          <Statistic title="优化任务" value={canvas?.tasks.length ?? 0} />
          <Statistic title="综合表现分" value={canvas?.metrics.current.totalScore ?? 0} suffix="/100" />
        </Space>
      </Card>
      <Card loading={canvasQuery.isLoading} bodyStyle={{ padding: 0 }}>
        {canvas && flowNodes.length > 0 ? (
          <div className="geo-canvas-shell">
            <ReactFlow
              nodes={flowNodes}
              edges={flowEdges}
              fitView
              onNodeClick={(_, node) => setSelectedNodeId(node.id)}
            >
              <MiniMap pannable zoomable />
              <Controls />
              <Background gap={24} />
            </ReactFlow>
          </div>
        ) : (
          <Empty className="geo-canvas-empty" description="暂无画布节点，请先创建监测主题和用户场景" />
        )}
      </Card>
      <Drawer title="节点详情" open={Boolean(selectedNode)} width={420} onClose={() => setSelectedNodeId(undefined)}>
        {canvas && selectedNode ? renderNodeDetail(canvas, selectedNode) : null}
      </Drawer>
      <Modal
        title="创建用户场景"
        open={intentModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={createIntentMutation.isPending}
        onCancel={() => setIntentModalOpen(false)}
        onOk={() => intentForm.submit()}
      >
        <Form form={intentForm} layout="vertical" initialValues={{ category: 'category_recommendation', monitoringFrequency: 'weekly', enabled: true }} onFinish={(values) => createIntentMutation.mutate(values)}>
          <Form.Item name="optimizationUnitId" label="关联监测主题" rules={[{ required: true, message: '请选择监测主题' }]}>
            <Select options={(canvas?.optimizationUnits ?? []).map((unit) => ({ value: unit.id, label: unit.name }))} />
          </Form.Item>
          <Form.Item name="category" label="场景分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select options={Object.entries(intentCategoryLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="text" label="用户场景" rules={[{ required: true, message: '请输入用户场景' }]}>
            <Input.TextArea rows={3} placeholder="例如：贵阳 3-5 岁孩子体能课怎么选？" />
          </Form.Item>
          <Form.Item name="monitoringFrequency" label="监测频率">
            <Select options={frequencyOptions} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        title="创建内容策略"
        open={strategyModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={createStrategyMutation.isPending}
        onCancel={() => setStrategyModalOpen(false)}
        onOk={() => strategyForm.submit()}
      >
        <Form form={strategyForm} layout="vertical" initialValues={{ type: 'gap', priority: 'medium', targetPlatform: 'wechat' }} onFinish={(values) => createStrategyMutation.mutate(values)}>
          <Form.Item name="optimizationUnitId" label={<FieldLabel text="关联监测主题" help="选择这条内容策略要解决哪个监测方向，比如贵阳儿童运动、3 到 5 岁儿童体能。" />} rules={[{ required: true, message: '请选择监测主题' }]}>
            <Select options={(canvas?.optimizationUnits ?? []).map((unit) => ({ value: unit.id, label: unit.name }))} />
          </Form.Item>
          <Form.Item name="intentId" label={<FieldLabel text="关联用户场景" help="选择家长真实会问 AI 的问题场景，内容策略会围绕这个问题补资料。" />} rules={[{ required: true, message: '请选择用户场景' }]}>
            <Select options={(canvas?.userIntents ?? []).map((intent) => ({ value: intent.id, label: intent.text }))} />
          </Form.Item>
          <Form.Item name="type" label={<FieldLabel text="策略类型" help="选择这次内容要解决的问题：补缺口、修正错误说法、加强关键词、增加权威引用或回应竞品。" />}><Select options={strategyTypeOptions} /></Form.Item>
          <Form.Item name="priority" label={<FieldLabel text="优先级" help="高优先级代表马上影响 AI 是否推荐你，建议先处理高优先级内容。" />}><Select options={priorityOptions} /></Form.Item>
          <Form.Item name="suggestedTitle" label={<FieldLabel text="策略标题" help="给这条内容策略起一个能看懂的名字，比如：补齐贵阳 3-5 岁儿童体能课 FAQ。" />} rules={[{ required: true, message: '请输入策略标题' }]}><Input placeholder="例如：补齐贵阳 3-5 岁儿童体能课 FAQ" /></Form.Item>
          <Form.Item name="targetPlatform" label={<FieldLabel text="目标平台" help="填写这篇内容准备发到哪里，常用选项是公众号、小红书、官网 FAQ。" />} rules={[{ required: true, message: '请输入目标平台' }]}><Input placeholder="公众号 / 小红书 / 官网" /></Form.Item>
          <Form.Item name="targetKeywordsText" label={<FieldLabel text="目标关键词" help="填写希望 AI 后续能识别到的关键词，一行一个，比如追光小牛、贵阳儿童体能、快乐体操。" />}><Input.TextArea rows={3} placeholder="一行一个关键词" /></Form.Item>
        </Form>
      </Modal>
      <Modal
        title="创建优化任务"
        open={taskModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={createTaskMutation.isPending}
        onCancel={() => setTaskModalOpen(false)}
        onOk={() => taskForm.submit()}
      >
        <Form form={taskForm} layout="vertical" initialValues={{ type: 'content_strategy' }} onFinish={(values) => createTaskMutation.mutate(values)}>
          <Form.Item name="title" label="任务标题" rules={[{ required: true, message: '请输入任务标题' }]}><Input /></Form.Item>
          <Form.Item name="strategyId" label="关联内容策略">
            <Select allowClear options={(canvas?.contentStrategies ?? []).map((strategy) => ({ value: strategy.id, label: strategy.suggestedTitle }))} />
          </Form.Item>
          <Form.Item name="optimizationUnitId" label="关联监测主题">
            <Select allowClear options={(canvas?.optimizationUnits ?? []).map((unit) => ({ value: unit.id, label: unit.name }))} />
          </Form.Item>
          <Form.Item name="ownerId" label="负责人"><Input placeholder="负责人姓名" /></Form.Item>
          <Form.Item name="dueDate" label="截止日期"><Input placeholder="2026-07-10" /></Form.Item>
        </Form>
      </Modal>
    </Space>
  );
}

function FieldLabel({ text, help }: { text: string; help: string }) {
  return (
    <Space size={4}>
      <span>{text}</span>
      <Tooltip title={help}>
        <Typography.Text type="secondary" aria-label={`${text}说明`} style={{ cursor: 'help' }}>?</Typography.Text>
      </Tooltip>
    </Space>
  );
}

function toFlowNodes(nodes: GeoCanvasNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: { label: <CanvasNodeLabel node={node} /> },
    style: nodeStyles[node.type]
  }));
}

function toFlowEdges(edges: GeoCanvasWorkspace['edges']): Edge[] {
  return edges.map((edge) => ({
    ...edge,
    markerEnd: { type: MarkerType.ArrowClosed },
    animated: edge.label === '内容策略'
  }));
}

function CanvasNodeLabel({ node }: { node: GeoCanvasNode }) {
  return (
    <Space direction="vertical" size={4} className="canvas-node-label">
      <Typography.Text strong>{node.title}</Typography.Text>
      <Typography.Text type="secondary">{node.subtitle}</Typography.Text>
      <Space>
        <Tag>{nodeTypeLabels[node.type]}</Tag>
        <Tag color={statusColor(node.status)}>{node.status}</Tag>
      </Space>
    </Space>
  );
}

function renderNodeDetail(canvas: GeoCanvasWorkspace, node: GeoCanvasNode) {
  if (node.type === 'optimization_unit') {
    const unit = canvas.optimizationUnits.find((item) => item.id === node.sourceId);
    return unit ? <Space direction="vertical"><Typography.Text strong>{unit.name}</Typography.Text><Typography.Text>关键词：{unit.targetKeywords.join('、') || '-'}</Typography.Text><Typography.Text>关联用户场景：{unit.relatedCounts.userIntents}</Typography.Text><Typography.Text>内容策略：{unit.relatedCounts.contentStrategies}</Typography.Text></Space> : null;
  }
  if (node.type === 'user_intent') {
    const intent = canvas.userIntents.find((item) => item.id === node.sourceId);
    return intent ? <Space direction="vertical"><Typography.Text strong>{intent.text}</Typography.Text><Typography.Text>分类：{intentCategoryLabels[intent.category]}</Typography.Text><Typography.Text>监测频率：{intent.monitoringFrequency}</Typography.Text><Typography.Text>平台表现：{intent.platformMetrics.length} 条</Typography.Text></Space> : null;
  }
  if (node.type === 'metric') {
    return <Space direction="vertical"><Statistic title="推荐表现" value={node.metric?.totalScore ?? 0} suffix="/100" /><Typography.Text>样本数：{node.metric?.sampleCount ?? 0}</Typography.Text><Typography.Text>{node.metric?.insufficientSample ? '样本不足，需要继续监测' : '样本已满足当前统计要求'}</Typography.Text></Space>;
  }
  const strategy = canvas.contentStrategies.find((item) => item.id === node.sourceId);
  return strategy ? <Space direction="vertical"><Typography.Text strong>{strategy.suggestedTitle}</Typography.Text><Typography.Text>平台：{strategy.targetPlatform}</Typography.Text><Typography.Text>关键词：{strategy.targetKeywords.join('、') || '-'}</Typography.Text><Typography.Text>状态：{strategy.status}</Typography.Text></Space> : null;
}

function toStrategyPayload(values: StrategyFormValues): ContentStrategyInput {
  return {
    ...values,
    targetKeywords: splitLines(values.targetKeywordsText),
    relatedPromptIds: values.relatedPromptIds ?? []
  };
}

function splitLines(value?: string): string[] {
  return (value ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function statusColor(status: string) {
  if (status === 'high' || status === 'insufficient_sample') return 'orange';
  if (status === 'disabled') return 'default';
  if (status === 'task_created' || status === 'ready' || status === 'enabled') return 'green';
  return 'blue';
}

const nodeStyles = {
  optimization_unit: { border: '1px solid #1677ff', borderRadius: 8, width: 250 },
  user_intent: { border: '1px solid #52c41a', borderRadius: 8, width: 250 },
  metric: { border: '1px solid #faad14', borderRadius: 8, width: 250 },
  content_strategy: { border: '1px solid #722ed1', borderRadius: 8, width: 250 }
};

const nodeTypeLabels: Record<GeoCanvasNode['type'], string> = {
  optimization_unit: '监测主题',
  user_intent: '用户场景',
  metric: '数据表现',
  content_strategy: '内容策略'
};

const intentCategoryLabels: Record<UserIntentCategory, string> = {
  brand_awareness: '品牌认知',
  category_recommendation: '品类推荐',
  pain_solution: '痛点解决',
  local_decision: '本地决策',
  competitor_compare: '竞品对比',
  price_decision: '价格决策'
};

const frequencyOptions = [
  { value: 'daily', label: '每日' },
  { value: 'weekly', label: '每周' },
  { value: 'monthly', label: '每月' },
  { value: 'manual', label: '手动' }
];

const strategyTypeOptions: Array<{ value: ContentStrategyType; label: string }> = [
  { value: 'gap', label: '内容缺口' },
  { value: 'correction', label: '信息修正' },
  { value: 'enhancement', label: '关键词增强' },
  { value: 'authority_citation', label: '权威引用' },
  { value: 'competitor_response', label: '竞品回应' }
];

const priorityOptions: Array<{ value: ContentStrategyPriority; label: string }> = [
  { value: 'high', label: '高' },
  { value: 'medium', label: '中' },
  { value: 'low', label: '低' }
];
