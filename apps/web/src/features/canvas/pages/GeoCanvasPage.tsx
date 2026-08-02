import { useMemo, useRef, useState } from 'react';
import { useLocation, useNavigate } from 'react-router';
import { Alert, Button, Card, Col, Form, Input, List, Modal, Row, Select, Space, Statistic, Tag, Tooltip, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import ReactFlow, { Background, Controls, MarkerType, MiniMap, type Edge, type Node, type ReactFlowInstance } from 'reactflow';
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
  OptimizationUnitType,
  UserIntent,
  UserIntentCategory,
  UserIntentInput
} from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { contentGenerationPath, monitoringPath, readWorkflowRouteContext, tasksPath, type WorkflowRouteContext } from '../../../app/routePaths';
import { AccessibleDropdown } from '../../../components/AccessibleDropdown';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
import { ProductPage } from '../../../components/ProductPage';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getPlatformDisplay } from '../../../utils/displayLabels';

type IntentFormValues = UserIntentInput;
type StrategyFormValues = Omit<ContentStrategyInput, 'targetKeywords' | 'relatedPromptIds'> & {
  targetKeywordsText?: string;
  relatedPromptIds?: string[];
};
type TaskFormValues = OptimizationTaskInput;

export function GeoCanvasPage() {
  const navigate = useNavigate();
  const location = useLocation();
  const routeContext = readWorkflowRouteContext(location.search);
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const [selectedNodeId, setSelectedNodeId] = useState<string>();
  const [intentModalOpen, setIntentModalOpen] = useState(false);
  const [strategyModalOpen, setStrategyModalOpen] = useState(false);
  const [taskModalOpen, setTaskModalOpen] = useState(false);
  const [showGuide, setShowGuide] = useState(true);
  const [flowInstance, setFlowInstance] = useState<ReactFlowInstance>();
  const createMenuTriggerRef = useRef<HTMLButtonElement>(null);
  const dialogTriggerRef = useRef<HTMLElement | null>(null);
  const [intentForm] = Form.useForm<IntentFormValues>();
  const [strategyForm] = Form.useForm<StrategyFormValues>();
  const [taskForm] = Form.useForm<TaskFormValues>();
  const canvasQuery = useQuery({
    queryKey: ['geo-canvas', activeBrandId],
    queryFn: () => apiGet<GeoCanvasWorkspace>(`/brands/${activeBrandId}/canvas`)
  });
  const canvas = canvasQuery.data?.success ? canvasQuery.data.data : null;
  const selectedNode = canvas?.nodes.find((node) => node.id === selectedNodeId) ?? canvas?.nodes[0];
  const flowNodes = useMemo(() => canvas ? toFlowNodes(canvas.nodes) : [], [canvas]);
  const flowEdges = useMemo(() => canvas ? toFlowEdges(canvas.edges, canvas.nodes) : [], [canvas]);
  const relationshipDescriptions = useMemo(() => canvas ? getCanvasRelationshipDescriptions(canvas) : [], [canvas]);

  const openDialog = (dialog: 'intent' | 'strategy' | 'task', trigger?: HTMLElement | null) => {
    dialogTriggerRef.current = trigger ?? (document.activeElement instanceof HTMLElement ? document.activeElement : null);
    if (dialog === 'intent') setIntentModalOpen(true);
    if (dialog === 'strategy') setStrategyModalOpen(true);
    if (dialog === 'task') setTaskModalOpen(true);
  };
  const restoreDialogFocus = () => {
    const trigger = dialogTriggerRef.current;
    const fallback = document.getElementById('app-main-content');
    (trigger?.isConnected ? trigger : fallback)?.focus({ preventScroll: true });
  };

  const createIntentMutation = useMutation({
    mutationFn: (values: IntentFormValues) => apiPost<UserIntent>(`/brands/${activeBrandId}/intents`, values),
    onSuccess: (response) => {
      if (response.success) {
        setIntentModalOpen(false);
        intentForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['geo-canvas', activeBrandId] });
        void messageApi.success('用户意图已创建');
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

  const selectedNodeType = selectedNode ? nodeTypeLabels[selectedNode.type] : '等待选择';

  return (
    <ProductPage
      title="营销画布"
      description="沿着优化对象、用户意图、平台表现和内容策略检查 GEO 链路，定位缺失节点并继续处理。"
      context={<Tag color="purple">高级分析工具</Tag>}
      secondaryActions={(
        <Space wrap>
          <Button onClick={() => setShowGuide((current) => !current)}>{showGuide ? '收起使用说明' : '查看使用说明'}</Button>
          <AccessibleDropdown
            label="新建关联对象菜单"
            menu={{
              items: [
                { key: 'intent', label: '创建用户意图', onClick: () => openDialog('intent', createMenuTriggerRef.current) },
                { key: 'strategy', label: '创建内容策略', onClick: () => openDialog('strategy', createMenuTriggerRef.current) },
                { key: 'task', label: '创建优化任务', onClick: () => openDialog('task', createMenuTriggerRef.current) }
              ]
            }}
          >
            <Button ref={createMenuTriggerRef}>新建关联对象</Button>
          </AccessibleDropdown>
        </Space>
      )}
      errorState={<PageErrorAlert response={canvasQuery.data} />}
    >
      {contextHolder}
      {showGuide ? (
        <Alert
          showIcon
          closable={{ 'aria-label': '关闭关系图使用说明', onClose: () => setShowGuide(false) }}
          type="info"
          message="从左到右检查关系链路"
          description="先在左侧选择优化对象，再在中央查看它与用户意图、平台表现和内容策略的连接，最后从右侧节点详情进入真实回复、内容生成或再次监测。"
        />
      ) : null}
      <Card className="geo-canvas-summary">
        <Space size={24} wrap>
          <Statistic title="优化单元" value={canvas?.optimizationUnits.length ?? 0} />
          <Statistic title="用户意图" value={canvas?.userIntents.length ?? 0} />
          <Statistic title="内容策略" value={canvas?.contentStrategies.length ?? 0} />
          <Statistic title="优化任务" value={canvas?.tasks.length ?? 0} />
          <Statistic title="综合表现分" value={canvas?.metrics.current.totalScore ?? 0} suffix="/100" />
        </Space>
      </Card>
      <Card size="small" className="geo-canvas-toolbar">
        <div className="geo-canvas-toolbar-row">
          <Space wrap size={[8, 8]} aria-label="关系图图例">
            <Typography.Text strong>图例</Typography.Text>
            {nodeLegend.map((item) => <Tag key={item.type} color={item.color}>{item.label}</Tag>)}
          </Space>
          <Space wrap>
            <Typography.Text type="secondary">当前节点：{selectedNode ? `${selectedNodeType} · ${selectedNode.title}` : selectedNodeType}</Typography.Text>
            <Button size="small" disabled={!flowInstance} onClick={() => flowInstance?.zoomOut()}>缩小</Button>
            <Button size="small" disabled={!flowInstance} onClick={() => flowInstance?.zoomIn()}>放大</Button>
            <Button size="small" disabled={!flowInstance} onClick={() => flowInstance?.fitView({ padding: 0.18 })}>定位全部</Button>
          </Space>
        </div>
      </Card>
      <Row gutter={[16, 16]} align="stretch">
        <Col xs={24} lg={6}>
          <Card title="分析对象" extra={<Tag>{canvas?.optimizationUnits.length ?? 0} 个</Tag>} loading={canvasQuery.isLoading} className="geo-canvas-panel">
            {canvas?.optimizationUnits.length ? (
              <List
                dataSource={canvas.optimizationUnits}
                renderItem={(unit) => {
                  const unitNode = canvas.nodes.find((node) => node.type === 'optimization_unit' && node.sourceId === unit.id);
                  const selected = selectedNode?.type === 'optimization_unit' && selectedNode.sourceId === unit.id;

                  return (
                    <List.Item className={selected ? 'geo-canvas-list-item geo-canvas-list-item-active' : 'geo-canvas-list-item'}>
                      <button className="geo-canvas-object-button" type="button" aria-pressed={selected} onClick={() => setSelectedNodeId(unitNode?.id)}>
                        <Space direction="vertical" size={4} className="page-stack">
                          <Typography.Text strong>{unit.name}</Typography.Text>
                          <Typography.Text type="secondary">{unit.targetKeywords.join('、') || '待补充关键词'}</Typography.Text>
                          <Space wrap>
                            <Tag>{unitTypeLabels[unit.type]}</Tag>
                            <Tag color={unit.enabled ? 'green' : 'default'}>{unit.enabled ? '启用' : '停用'}</Tag>
                            {selected ? <Tag color="blue">已选择</Tag> : null}
                          </Space>
                        </Space>
                      </button>
                    </List.Item>
                  );
                }}
              />
            ) : <EmptyState title="关系视图缺少优化单元" description="希望 AI 推荐的产品、服务或业务主题" reason="没有优化单元时，关系图无法串联用户意图、监测问题和内容任务。" nextStep="先到对象列表创建优化单元。" />}
          </Card>
        </Col>
        <Col xs={24} lg={12}>
          <Card title="关系链路" extra={<Typography.Text type="secondary">单击节点查看详情</Typography.Text>} loading={canvasQuery.isLoading} styles={{ body: { padding: 0 } }} className="geo-canvas-panel">
            {canvas && flowNodes.length > 0 ? (
              <div className="geo-canvas-shell">
                <ReactFlow
                  nodes={flowNodes}
                  edges={flowEdges}
                  fitView
                  onInit={setFlowInstance}
                  onNodeClick={(_, node) => setSelectedNodeId(node.id)}
                >
                  <MiniMap pannable zoomable aria-label="关系图缩略概览" />
                  <Controls showInteractive={false} />
                  <Background gap={24} />
                </ReactFlow>
              </div>
            ) : (
              <div className="geo-canvas-empty"><EmptyState title="还没有关系节点" description="优化单元、用户意图和监测问题" reason="关系节点用于检查监测、内容和复测链路是否完整。" nextStep="先创建优化单元，再补用户意图和监测问题。" /></div>
            )}
          </Card>
        </Col>
        <Col xs={24} lg={6}>
          <Card title="节点详情与下一步" loading={canvasQuery.isLoading} className="geo-canvas-panel">
            {canvas && selectedNode ? (
              <NodeDetailPanel
                canvas={canvas}
                node={selectedNode}
                 onCreateIntent={() => openDialog('intent')}
                 onCreateStrategy={() => openDialog('strategy')}
                 onCreateTask={() => openDialog('task')}
                onNavigate={navigate}
                routeContext={routeContext}
              />
            ) : <EmptyState title="选择一个节点" description="当前未选中关系节点" reason="节点详情会展示关联对象、可执行动作和后续任务入口。" nextStep="在左侧列表或中间关系图选择节点。" />}
          </Card>
        </Col>
      </Row>
      <Card size="small">
        <section aria-labelledby="geo-canvas-data-title">
          <Typography.Title level={3} id="geo-canvas-data-title">关系图文字数据</Typography.Title>
          <Typography.Paragraph type="secondary">以下清单与关系图使用同一组节点和连接数据，可用于逐项理解完整链路。</Typography.Paragraph>
          <Typography.Text strong>节点</Typography.Text>
          <ul aria-label="关系图节点清单">
            {(canvas?.nodes ?? []).map((node) => <li key={node.id}>{getCanvasNodeDescription(node)}</li>)}
          </ul>
          <Typography.Text strong>连接关系</Typography.Text>
          {relationshipDescriptions.length > 0 ? (
            <ul aria-label="关系图连接清单">
              {relationshipDescriptions.map((description, index) => <li key={`${description}-${index}`}>{description}</li>)}
            </ul>
          ) : <Typography.Paragraph type="secondary">当前还没有连接关系。</Typography.Paragraph>}
        </section>
      </Card>
      <Modal
        afterClose={restoreDialogFocus}
        title="创建用户意图"
        open={intentModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={createIntentMutation.isPending}
        onCancel={() => setIntentModalOpen(false)}
        onOk={() => intentForm.submit()}
      >
        <Form form={intentForm} layout="vertical" initialValues={{ category: 'category_recommendation', monitoringFrequency: 'weekly', enabled: true }} onFinish={(values) => createIntentMutation.mutate(values)}>
          <Form.Item name="optimizationUnitId" label="关联优化单元" rules={[{ required: true, message: '请选择优化单元' }]}>
            <Select options={(canvas?.optimizationUnits ?? []).map((unit) => ({ value: unit.id, label: unit.name }))} />
          </Form.Item>
          <Form.Item name="category" label="意图分类" rules={[{ required: true, message: '请选择分类' }]}>
            <Select options={Object.entries(intentCategoryLabels).map(([value, label]) => ({ value, label }))} />
          </Form.Item>
          <Form.Item name="text" label="用户意图" rules={[{ required: true, message: '请输入用户意图' }]}>
            <Input.TextArea rows={3} placeholder="例如：贵阳 3-5 岁孩子体能课怎么选？" />
          </Form.Item>
          <Form.Item name="monitoringFrequency" label="监测频率">
            <Select options={frequencyOptions} />
          </Form.Item>
        </Form>
      </Modal>
      <Modal
        afterClose={restoreDialogFocus}
        title="创建内容策略"
        open={strategyModalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={createStrategyMutation.isPending}
        onCancel={() => setStrategyModalOpen(false)}
        onOk={() => strategyForm.submit()}
      >
        <Form form={strategyForm} layout="vertical" initialValues={{ type: 'gap', priority: 'medium', targetPlatform: 'wechat' }} onFinish={(values) => createStrategyMutation.mutate(values)}>
          <Form.Item name="optimizationUnitId" label={<FieldLabel text="关联优化单元" help="选择这条内容策略要解决哪个优化方向，比如贵阳儿童运动、3 到 5 岁儿童体能。" />} rules={[{ required: true, message: '请选择优化单元' }]}>
            <Select options={(canvas?.optimizationUnits ?? []).map((unit) => ({ value: unit.id, label: unit.name }))} />
          </Form.Item>
          <Form.Item name="intentId" label={<FieldLabel text="关联用户意图" help="选择用户真实会问 AI 的问题意图，内容策略会围绕这个问题补资料。" />} rules={[{ required: true, message: '请选择用户意图' }]}>
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
        afterClose={restoreDialogFocus}
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
          <Form.Item name="optimizationUnitId" label="关联优化单元">
            <Select allowClear options={(canvas?.optimizationUnits ?? []).map((unit) => ({ value: unit.id, label: unit.name }))} />
          </Form.Item>
          <Form.Item name="ownerId" label="负责人"><Input placeholder="负责人姓名" /></Form.Item>
          <Form.Item name="dueDate" label="截止日期"><Input placeholder="2026-07-10" /></Form.Item>
        </Form>
      </Modal>
    </ProductPage>
  );
}

function FieldLabel({ text, help }: { text: string; help: string }) {
  return (
    <Space size={4}>
      <span>{text}</span>
      <Tooltip title={help}>
        <button type="button" className="field-help-button" aria-label={`查看${text}说明`}>?</button>
      </Tooltip>
    </Space>
  );
}

function toFlowNodes(nodes: GeoCanvasNode[]): Node[] {
  return nodes.map((node) => ({
    id: node.id,
    position: node.position,
    data: { label: <CanvasNodeLabel node={node} /> },
    ariaLabel: getCanvasNodeDescription(node),
    focusable: true,
    style: nodeStyles[node.type]
  }));
}

function toFlowEdges(edges: GeoCanvasWorkspace['edges'], nodes: GeoCanvasNode[]): Edge[] {
  const nodeMap = new Map(nodes.map((node) => [node.id, node]));
  return edges.map((edge) => ({
    ...edge,
    ariaLabel: getCanvasRelationshipDescription(edge, nodeMap),
    focusable: true,
    markerEnd: { type: MarkerType.ArrowClosed },
    animated: edge.label === '内容策略'
  }));
}

export function getCanvasNodeDescription(node: GeoCanvasNode): string {
  return `${nodeTypeLabels[node.type]}：${node.title}，状态：${getCanvasStatusLabel(node.status)}`;
}

export function getCanvasRelationshipDescriptions(canvas: Pick<GeoCanvasWorkspace, 'nodes' | 'edges'>): string[] {
  const nodeMap = new Map(canvas.nodes.map((node) => [node.id, node]));
  return canvas.edges.map((edge) => getCanvasRelationshipDescription(edge, nodeMap));
}

function getCanvasRelationshipDescription(edge: GeoCanvasWorkspace['edges'][number], nodeMap: Map<string, GeoCanvasNode>): string {
  const sourceTitle = nodeMap.get(edge.source)?.title ?? '未知来源节点';
  const targetTitle = nodeMap.get(edge.target)?.title ?? '未知目标节点';
  const relationship = typeof edge.label === 'string' && edge.label.trim() ? edge.label : '关联';
  return `${sourceTitle} 通过“${relationship}”连接到 ${targetTitle}`;
}

function CanvasNodeLabel({ node }: { node: GeoCanvasNode }) {
  return (
    <Space direction="vertical" size={4} className="canvas-node-label">
      <Typography.Text strong>{node.title}</Typography.Text>
      <Typography.Text type="secondary">{node.subtitle}</Typography.Text>
      <Space>
        <Tag>{nodeTypeLabels[node.type]}</Tag>
        <Tag color={statusColor(node.status)}>{getCanvasStatusLabel(node.status)}</Tag>
      </Space>
    </Space>
  );
}

function NodeDetailPanel({
  canvas,
  node,
  onCreateIntent,
  onCreateStrategy,
  onCreateTask,
  onNavigate,
  routeContext
}: {
  canvas: GeoCanvasWorkspace;
  node: GeoCanvasNode;
  onCreateIntent: () => void;
  onCreateStrategy: () => void;
  onCreateTask: () => void;
  onNavigate: (route: string) => void;
  routeContext: WorkflowRouteContext;
}) {
  const workflowPaths = buildNodeWorkflowPaths(canvas, node, routeContext);

  if (node.type === 'optimization_unit') {
    const unit = canvas.optimizationUnits.find((item) => item.id === node.sourceId);
    return unit ? (
      <Space direction="vertical" size={12} className="page-stack">
        <Typography.Text strong>{unit.name}</Typography.Text>
        <Typography.Text>关键词：{unit.targetKeywords.join('、') || '待补充'}</Typography.Text>
        <Typography.Text>关联用户意图：{unit.relatedCounts.userIntents}</Typography.Text>
        <Typography.Text>内容策略：{unit.relatedCounts.contentStrategies}</Typography.Text>
        <NodeWorkflowActions
          onViewResponses={() => onNavigate(workflowPaths.responses)}
          onGenerateContent={() => onNavigate(workflowPaths.content)}
          onMonitorAgain={() => onNavigate(workflowPaths.retest)}
        />
        <Button type="link" size="small" className="geo-canvas-detail-link" onClick={onCreateIntent}>补充用户意图</Button>
      </Space>
    ) : null;
  }
  if (node.type === 'user_intent') {
    const intent = canvas.userIntents.find((item) => item.id === node.sourceId);
    return intent ? (
      <Space direction="vertical" size={12} className="page-stack">
        <Typography.Text strong>{intent.text}</Typography.Text>
        <Typography.Text>分类：{intentCategoryLabels[intent.category]}</Typography.Text>
        <Typography.Text>监测频率：{frequencyLabels[intent.monitoringFrequency] ?? intent.monitoringFrequency}</Typography.Text>
        <Typography.Text>平台表现：{intent.platformMetrics.length} 条</Typography.Text>
        <NodeWorkflowActions
          onViewResponses={() => onNavigate(workflowPaths.responses)}
          onGenerateContent={() => onNavigate(workflowPaths.content)}
          onMonitorAgain={() => onNavigate(workflowPaths.retest)}
        />
        <Space wrap size={4}>
          <Button type="link" size="small" className="geo-canvas-detail-link" onClick={onCreateStrategy}>补充内容策略</Button>
          <Button type="link" size="small" className="geo-canvas-detail-link" onClick={onCreateTask}>创建优化任务</Button>
        </Space>
      </Space>
    ) : null;
  }
  if (node.type === 'metric') {
    return (
      <Space direction="vertical" size={12} className="page-stack">
        <Statistic title="平台表现" value={node.metric?.totalScore ?? 0} suffix="/100" />
        <Typography.Text>真实回复样本：{node.metric?.sampleCount ?? 0}</Typography.Text>
        <Typography.Text>{node.metric?.insufficientSample ? '缺少真实回复，需要进入待补充队列。' : '样本已满足当前统计要求。'}</Typography.Text>
        <NodeWorkflowActions
          onViewResponses={() => onNavigate(workflowPaths.responses)}
          onGenerateContent={() => onNavigate(workflowPaths.content)}
          onMonitorAgain={() => onNavigate(workflowPaths.retest)}
        />
      </Space>
    );
  }
  const strategy = canvas.contentStrategies.find((item) => item.id === node.sourceId);
  return strategy ? (
    <Space direction="vertical" size={12} className="page-stack">
      <Typography.Text strong>{strategy.suggestedTitle}</Typography.Text>
      <Typography.Text>发布渠道：{getPlatformDisplay(strategy.targetPlatform)}</Typography.Text>
      <Typography.Text>关键词：{strategy.targetKeywords.join('、') || '待补充'}</Typography.Text>
      <Typography.Text>状态：{getCanvasStatusLabel(strategy.status)}</Typography.Text>
      <NodeWorkflowActions
        onViewResponses={() => onNavigate(workflowPaths.responses)}
        onGenerateContent={() => onNavigate(workflowPaths.content)}
        onMonitorAgain={() => onNavigate(workflowPaths.retest)}
      />
      <Button type="link" size="small" className="geo-canvas-detail-link" onClick={onCreateTask}>创建优化任务</Button>
    </Space>
  ) : null;
}

export function buildNodeWorkflowPaths(
  canvas: GeoCanvasWorkspace,
  node: GeoCanvasNode,
  routeContext: WorkflowRouteContext = {}
) {
  const unit = node.type === 'optimization_unit'
    ? canvas.optimizationUnits.find((item) => item.id === node.sourceId)
    : undefined;
  const intent = node.type === 'user_intent'
    ? canvas.userIntents.find((item) => item.id === node.sourceId)
    : undefined;
  const strategy = node.type === 'content_strategy'
    ? canvas.contentStrategies.find((item) => item.id === node.sourceId)
    : undefined;
  const optimizationUnitId = unit?.id ?? intent?.optimizationUnitId ?? strategy?.optimizationUnitId ?? routeContext.optimizationUnitId;
  const intentId = intent?.id ?? strategy?.intentId ?? routeContext.intentId;

  return {
    responses: monitoringPath({
      question: intent?.text ?? routeContext.question,
      optimizationUnitId,
      intentId,
      promptId: routeContext.promptId,
      runId: routeContext.runId,
      taskId: routeContext.taskId,
      platformCode: routeContext.platformCode,
      mode: routeContext.mode
    }, 'monitoring-runs-card'),
    content: contentGenerationPath({
      optimizationUnitId,
      intentId,
      runId: routeContext.runId,
      planId: routeContext.planId,
      taskId: routeContext.taskId
    }),
    retest: tasksPath({
      taskId: routeContext.taskId,
      generationTaskId: routeContext.generationTaskId,
      publishingRecordId: routeContext.publishingRecordId,
      promptId: routeContext.promptId,
      runId: routeContext.runId,
      platformCode: routeContext.platformCode,
      action: 'create'
    })
  };
}

function NodeWorkflowActions({
  onViewResponses,
  onGenerateContent,
  onMonitorAgain
}: {
  onViewResponses: () => void;
  onGenerateContent: () => void;
  onMonitorAgain: () => void;
}) {
  return (
    <Space direction="vertical" size={8} className="page-stack geo-canvas-next-actions">
      <Button block onClick={onViewResponses}>查看真实回复</Button>
      <Button block onClick={onGenerateContent}>生成内容</Button>
      <Button block type="primary" onClick={onMonitorAgain}>再次监测</Button>
    </Space>
  );
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

const nodeLegend: Array<{ type: GeoCanvasNode['type']; label: string; color: string }> = [
  { type: 'optimization_unit', label: '优化对象', color: 'blue' },
  { type: 'user_intent', label: '用户意图', color: 'green' },
  { type: 'metric', label: '平台表现', color: 'orange' },
  { type: 'content_strategy', label: '内容策略', color: 'purple' }
];

const nodeTypeLabels: Record<GeoCanvasNode['type'], string> = {
  optimization_unit: '优化单元',
  user_intent: '用户意图',
  metric: '平台表现',
  content_strategy: '内容策略'
};

const unitTypeLabels: Record<OptimizationUnitType, string> = {
  brand: '品牌词',
  category: '品类词',
  scenario: '场景词',
  location: '地域词',
  competitor: '竞品词'
};

const canvasStatusLabels: Record<string, string> = {
  high: '重点关注',
  insufficient_sample: '待补充真实回复',
  disabled: '已停用',
  task_created: '已创建任务',
  ready: '可执行',
  enabled: '已启用',
  draft: '草稿',
  pending: '待处理',
  completed: '已完成'
};

function getCanvasStatusLabel(status: string) {
  return canvasStatusLabels[status] ?? status;
}

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

const frequencyLabels = Object.fromEntries(frequencyOptions.map((item) => [item.value, item.label]));

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
