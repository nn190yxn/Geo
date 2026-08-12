import { useState } from 'react';
import { Alert, Button, Card, Col, Collapse, Form, Input, Modal, Progress, Row, Select, Space, Statistic, Steps, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import type { BrandDetail, BrandMutationInput, BrandWorkspaceSnapshot, BrandWorkspaceSummary, VisibilitySprint } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { monitoringPath, userIntentsPath } from '../../../app/routePaths';
import { useBrandContextStore } from '../../../stores/brandContextStore';
import { getBrandRoleDisplay } from '../../../utils/displayLabels';
import { operationWorkflow } from '../../../layouts/navigation';
import { EmptyState, PageSkeleton, PartialDataNotice, RegionErrorState } from '../../../components/PageState';
import { ProductPage } from '../../../components/ProductPage';
import { getQueryGroupWorkspaceState, type QueryWorkspaceResource } from '../../../components/WorkspaceState';
import { AutomationOperatorCard } from '../../automation/components/AutomationOperatorCard';
import { BeginnerHomePanel } from '../components/BeginnerHomePanel';
import { QuickStartWizard } from '../components/QuickStartWizard';
import { BrandPortfolioPanel } from '../components/BrandPortfolioPanel';
import { BrandKnowledgeCard } from '../components/BrandKnowledgeCard';
import { OptimizationUnitsCard } from '../components/OptimizationUnitsCard';
import { UserIntentPromptCard } from '../components/UserIntentPromptCard';
import { firstRoundSteps, getFirstRoundCurrentStep, getFirstRoundStepStatus } from './firstRoundWorkflow';
import { getSprintMetricCards, getSprintNextAction, getSprintProgressPercent, getSprintStatusLabel, getSprintStepDisplayStatus } from './sprintWorkspace';
import { getWorkspaceModuleMetric, workspaceModules, type WorkspaceModule } from './workspaceModules';

type BrandFormValues = Omit<BrandMutationInput, 'aliases' | 'targetCities'> & {
  aliasesText?: string;
  targetCitiesText?: string;
};

export function BrandWorkspacePage() {
  const [messageApi, contextHolder] = message.useMessage();
  const activeBrandId = useBrandContextStore((state) => state.activeBrandId);
  const setActiveBrandId = useBrandContextStore((state) => state.setActiveBrandId);
  const navigate = useNavigate();
  const location = useLocation();
  const queryClient = useQueryClient();
  const [form] = Form.useForm<BrandFormValues>();
  const [editingBrandId, setEditingBrandId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedGuideKey, setSelectedGuideKey] = useState(firstRoundSteps[0].key);
  const pageMode = getBrandWorkspacePageMode(location.pathname);
  const quickStartMode = isQuickStartMode(location.search) && !pageMode.focusModule;
  const activeBrandQuery = useQuery({
    queryKey: ['active-brand', activeBrandId],
    queryFn: () => apiGet<BrandWorkspaceSummary>('/brands/active')
  });
  const brandsQuery = useQuery({
    queryKey: ['brand-details'],
    queryFn: () => apiGet<BrandDetail[]>('/brands/details'),
    enabled: !pageMode.focusModule && !quickStartMode
  });
  const workspaceQuery = useQuery({
    queryKey: ['brand-workspace', activeBrandId],
    queryFn: () => apiGet<BrandWorkspaceSnapshot>(`/brands/${activeBrandId}/workspace`),
    enabled: !pageMode.focusModule && !quickStartMode
  });
  const currentSprintQuery = useQuery({
    queryKey: ['visibility-sprint-current', activeBrandId],
    queryFn: () => apiGet<VisibilitySprint>(`/brands/${activeBrandId}/sprints/current`),
    enabled: !pageMode.focusModule && !quickStartMode
  });
  const activeBrand = activeBrandQuery.data?.success ? activeBrandQuery.data.data : null;
  const brands = brandsQuery.data?.success ? brandsQuery.data.data : [];
  const workspace = workspaceQuery.data?.success ? workspaceQuery.data.data : null;
  const currentSprint = currentSprintQuery.data?.success ? currentSprintQuery.data.data : null;
  const pageResources: QueryWorkspaceResource[] = [
    { isLoading: activeBrandQuery.isLoading, response: activeBrandQuery.data }
  ];
  if (!pageMode.focusModule) {
    pageResources.push(
      { isLoading: brandsQuery.isLoading, response: brandsQuery.data },
      { isLoading: workspaceQuery.isLoading, response: workspaceQuery.data },
      { isLoading: currentSprintQuery.isLoading, response: currentSprintQuery.data }
    );
  }
  const pageState = getQueryGroupWorkspaceState(pageResources, true);
  const retryPageQueries = () => Promise.all([
    activeBrandQuery.refetch(),
    ...(!pageMode.focusModule ? [brandsQuery.refetch(), workspaceQuery.refetch(), currentSprintQuery.refetch()] : [])
  ]);
  const currentFirstRoundStep = getFirstRoundCurrentStep(workspace, null);
  const selectedGuide = firstRoundSteps.find((step) => step.key === selectedGuideKey) ?? firstRoundSteps[currentFirstRoundStep];
  const openBrandProfile = (importMode = false) => {
    const params = new URLSearchParams(location.search);
    if (importMode) params.set('brandImport', '1');
    else params.delete('brandImport');
    navigate({ pathname: '/brand-profile', search: params.toString(), hash: location.hash });
  };
  const saveBrandMutation = useMutation({
    mutationFn: (values: BrandFormValues) => {
      const payload = toBrandPayload(values);
      return editingBrandId
        ? apiPatch<BrandDetail>(`/brands/${editingBrandId}`, payload)
        : apiPost<BrandDetail>('/brands', payload);
    },
    onSuccess: (response) => {
      if (response.success) {
        setActiveBrandId(response.data.brandId);
        setModalOpen(false);
        form.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['accessible-brands'] });
        void queryClient.invalidateQueries({ queryKey: ['brand-details'] });
        void queryClient.invalidateQueries({ queryKey: ['active-brand'] });
        void queryClient.invalidateQueries({ queryKey: ['brand-workspace'] });
        void messageApi.success(editingBrandId ? '品牌信息已更新' : '品牌已创建');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const statusMutation = useMutation({
    mutationFn: ({ brandId, status }: { brandId: string; status: BrandDetail['status'] }) =>
      apiPatch<BrandDetail>(`/brands/${brandId}/status`, { status }),
    onSuccess: (response) => {
      void queryClient.invalidateQueries({ queryKey: ['accessible-brands'] });
      void queryClient.invalidateQueries({ queryKey: ['brand-details'] });
      void queryClient.invalidateQueries({ queryKey: ['active-brand'] });
      void queryClient.invalidateQueries({ queryKey: ['brand-workspace'] });
      if (response.success) {
        void messageApi.success('品牌状态已更新');
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });
  const openCreateModal = () => {
    setEditingBrandId(null);
    form.resetFields();
    form.setFieldsValue({ status: 'active' });
    setModalOpen(true);
  };

  const openEditModal = (brand: BrandDetail) => {
    setEditingBrandId(brand.brandId);
    form.setFieldsValue({
      name: brand.name,
      aliasesText: brand.aliases.join('、'),
      industry: brand.industry,
      website: brand.website,
      targetCitiesText: brand.targetCities.join('、'),
      businessScope: brand.businessScope,
      targetAudience: brand.targetAudience,
      status: brand.status
    });
    setModalOpen(true);
  };

  const pagePresentation = getBrandWorkspacePagePresentation(pageMode.focusModule);

  if (quickStartMode) {
    return (
      <QuickStartWizard
        key={activeBrandId}
        brandId={activeBrandId}
        brandName={activeBrand?.name}
        onExit={() => navigate('/brands')}
        onViewMoreQuestions={() => navigate(userIntentsPath())}
        onStartMonitoring={(planId) => navigate(getQuickStartMonitoringPath(planId))}
      />
    );
  }

  return (
    <ProductPage
      title={pagePresentation.title}
      description={pagePresentation.description}
      context={(
        <Space wrap>
          <Tag color="blue">{activeBrand?.name ?? (activeBrandQuery.isLoading ? '品牌信息加载中' : '当前品牌')}</Tag>
          {activeBrand?.role ? <Typography.Text type="secondary">当前角色：{getBrandRoleDisplay(activeBrand.role)}</Typography.Text> : null}
        </Space>
      )}
      state={pageState}
      loadingState={<PageSkeleton rows={6} />}
      partialState={(
        <PartialDataNotice
          message="部分品牌工作区数据暂时缺失"
          description="已保留可用模块和当前操作；重新加载可补齐品牌、工作区或 Sprint 信息。"
          action={<Button onClick={() => void retryPageQueries()}>重新加载缺失数据</Button>}
        />
      )}
      errorState={(
        <RegionErrorState
          title="品牌工作区暂时无法加载"
          description="当前页面数据均未成功返回，请重新加载。"
          onRetry={() => void retryPageQueries()}
        />
      )}
    >
      <Space direction="vertical" size={16} className="page-stack">
        {contextHolder}
        {pageMode.focusModule ? (
          <FocusedWorkspaceModule mode={pageMode.focusModule} brandId={activeBrandId} />
        ) : (
          <>
            <BeginnerHomePanel brandId={activeBrandId} brandName={activeBrand?.name} onNavigate={(route) => navigate(route)} />
            <Collapse
              className="brand-workspace-secondary"
              items={[{
                key: 'advanced-workspace',
                label: '更多运营与管理工具',
                children: (
                  <Space direction="vertical" size={16} className="page-stack">
      <Card title="AI 可见性运营工作台">
        <Space direction="vertical" size={16} className="page-stack">
          <Typography.Paragraph>
            按品牌资料准备、创建优化单元、整理用户意图、AI 回复监测、分析诊断、内容生成与优化、发布准备、再次监测的顺序推进运营闭环。
          </Typography.Paragraph>
          <Space wrap>
            {operationWorkflow.map((step, index) => (
              <Button key={step.key} onClick={() => navigate(step.key)}>
                {index + 1}. {step.label}
              </Button>
            ))}
          </Space>
          <WorkspaceModuleGrid workspace={workspace} onNavigate={(route) => navigate(route)} />
        </Space>
      </Card>
      <SprintWorkspaceEntry sprint={currentSprint} loading={currentSprintQuery.isLoading} onNavigate={(route) => navigate(route)} />
      <AutomationOperatorCard brandId={activeBrandId} source="brand_workspace" title="让 AI 帮我跑一轮" secondaryAction />
      <Card title="完成首轮监测">
        <Space direction="vertical" size={16} className="page-stack">
          <Steps
            size="small"
            current={currentFirstRoundStep}
            items={firstRoundSteps.map((step, index) => ({
              title: step.title,
              description: step.description,
              status: getFirstRoundStepStatus(index, currentFirstRoundStep)
            }))}
          />
          <Alert
            type="info"
            showIcon
            message={selectedGuide.title}
            description={selectedGuide.guide}
            action={<Button size="small" onClick={() => navigate(selectedGuide.route)}>{selectedGuide.actionLabel}</Button>}
          />
          <Alert
            type="success"
            showIcon
            message="首轮监测后的下一步"
            description="监测完成后，先补齐缺失的品牌资料，确认 AI 平台能正常监测，再生成优化计划、内容任务和下一次监测安排。"
          />
          <Space wrap>
            {firstRoundSteps.map((step) => (
              <Button key={step.key} aria-pressed={selectedGuide.key === step.key} onClick={() => setSelectedGuideKey(step.key)}>
                {step.title}
              </Button>
            ))}
          </Space>
        </Space>
      </Card>
      <Card title="创建或补充品牌资料">
        <Space direction="vertical" size={12} className="page-stack">
          <Typography.Paragraph>
            品牌资料页集中处理分类编辑、Markdown、Word、PDF 导入和字段确认，保存后会展示完整度变化及监测下一步。
          </Typography.Paragraph>
          <Space wrap>
            <Button type="primary" onClick={() => openBrandProfile(true)}>上传并导入品牌资料</Button>
            <Button onClick={() => openBrandProfile()}>手动填写品牌信息</Button>
          </Space>
        </Space>
      </Card>
      <Row gutter={16}>
        <Col xs={12} sm={8} lg={6} xl={4}><Card><Statistic title="档案" value={workspace?.relatedCounts.profile ?? 0} /></Card></Col>
        <Col xs={12} sm={8} lg={6} xl={4}><Card><Statistic title="优化单元" value={workspace?.relatedCounts.optimizationUnits ?? 0} /></Card></Col>
        <Col xs={12} sm={8} lg={6} xl={4}><Card><Statistic title="用户意图" value={workspace?.relatedCounts.intents ?? 0} /></Card></Col>
        <Col xs={12} sm={8} lg={6} xl={4}><Card><Statistic title="内容资产" value={workspace?.relatedCounts.contentAssets ?? 0} /></Card></Col>
        <Col xs={12} sm={8} lg={6} xl={4}><Card><Statistic title="AI 回复记录" value={workspace?.relatedCounts.monitoringRuns ?? 0} /></Card></Col>
        <Col xs={12} sm={8} lg={6} xl={4}><Card><Statistic title="报告" value={workspace?.relatedCounts.reports ?? 0} /></Card></Col>
        <Col xs={12} sm={8} lg={6} xl={4}><Card><Statistic title="顾问记录" value={workspace?.relatedCounts.advisorRecords ?? 0} /></Card></Col>
      </Row>
      <BrandPortfolioPanel
        brands={brands}
        activeBrandId={activeBrandId}
        loading={brandsQuery.isLoading}
        onCreate={openCreateModal}
        onEdit={openEditModal}
        onStatusChange={(brand) => statusMutation.mutate({ brandId: brand.brandId, status: brand.status === 'active' ? 'inactive' : 'active' })}
        onSelect={(brand) => setActiveBrandId(brand.brandId)}
        onOpenActive={() => navigate('/brand-profile')}
      />
      <OptimizationUnitsCard brandId={activeBrandId} />
      <UserIntentPromptCard brandId={activeBrandId} />
      <BrandKnowledgeCard brandId={activeBrandId} />
                  </Space>
                )
              }]}
            />
          </>
        )}
      <Modal
        title={editingBrandId ? '编辑品牌' : '新增品牌'}
        open={modalOpen}
        okText="保存"
        cancelText="取消"
        confirmLoading={saveBrandMutation.isPending}
        onCancel={() => setModalOpen(false)}
        onOk={() => form.submit()}
      >
        <Form form={form} layout="vertical" onFinish={(values) => saveBrandMutation.mutate(values)}>
          <Form.Item name="name" label="品牌名称" rules={[{ required: true, message: '请输入品牌名称' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="aliasesText" label="品牌别名">
            <Input placeholder="多个别名用顿号或逗号分隔" />
          </Form.Item>
          <Form.Item name="industry" label="行业" rules={[{ required: true, message: '请输入行业' }]}>
            <Input />
          </Form.Item>
          <Form.Item name="website" label="官网">
            <Input />
          </Form.Item>
          <Form.Item name="targetCitiesText" label="目标城市">
            <Input placeholder="多个城市用顿号或逗号分隔" />
          </Form.Item>
          <Form.Item name="businessScope" label="业务范围" rules={[{ required: true, message: '请输入业务范围' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="targetAudience" label="目标用户" rules={[{ required: true, message: '请输入目标用户' }]}>
            <Input.TextArea rows={3} />
          </Form.Item>
          <Form.Item name="status" label="品牌状态" initialValue="active">
            <Select options={[{ value: 'active', label: '启用' }, { value: 'inactive', label: '停用' }]} />
          </Form.Item>
        </Form>
      </Modal>
      </Space>
    </ProductPage>
  );
}

function WorkspaceModuleGrid({ workspace, onNavigate }: { workspace: BrandWorkspaceSnapshot | null; onNavigate: (route: string) => void }) {
  return (
    <Row gutter={[16, 16]}>
      {workspaceModules.map((module) => (
        <Col key={module.title} xs={24} md={12} xl={6}>
          <Card
            size="small"
            title={module.title}
            extra={<Tag color={getModuleStageColor(module.stage)}>{module.stage}</Tag>}
          >
            <Space direction="vertical" size={12} className="page-stack">
              <Typography.Text type="secondary">{module.description}</Typography.Text>
              <Space className="page-heading" align="center">
                <Typography.Text strong>{getWorkspaceModuleMetric(module, workspace)}</Typography.Text>
                <Button size="small" onClick={() => onNavigate(module.route)}>{module.actionLabel}</Button>
              </Space>
            </Space>
          </Card>
        </Col>
      ))}
    </Row>
  );
}

type BrandWorkspaceFocusModule = 'brand-profile' | 'user-intents' | 'optimization-units';

export function getBrandWorkspacePageMode(pathname: string): { focusModule?: BrandWorkspaceFocusModule } {
  if (pathname === '/brand-profile') return { focusModule: 'brand-profile' };
  if (pathname === '/user-intents') return { focusModule: 'user-intents' };
  if (pathname === '/optimization-units') return { focusModule: 'optimization-units' };
  return {};
}

export function isQuickStartMode(search: string): boolean {
  return new URLSearchParams(search).get('quickStart') === '1';
}

export function getQuickStartMonitoringPath(planId: string) {
  return monitoringPath({ planId }, 'test-question-candidate-card');
}

export function getBrandWorkspacePagePresentation(focusModule?: BrandWorkspaceFocusModule) {
  if (focusModule === 'brand-profile') {
    return { title: '品牌信息', description: '维护品牌事实、产品服务和目标用户，为监测与内容生成提供可靠依据。' };
  }
  if (focusModule === 'user-intents') {
    return { title: '用户意图', description: '整理客户可能向 AI 提出的真实问题，并生成可持续监测的问法。' };
  }
  if (focusModule === 'optimization-units') {
    return { title: '优化单元', description: '确定希望 AI 推荐的产品、服务或业务场景，建立首轮监测范围。' };
  }
  return { title: '数据总览', description: '查看品牌关键指标、运营待办和推荐下一步，持续推进 AI 可见性运营。' };
}

function FocusedWorkspaceModule({ mode, brandId }: { mode: BrandWorkspaceFocusModule; brandId: string }) {
  if (mode === 'brand-profile') return <BrandKnowledgeCard brandId={brandId} />;
  if (mode === 'user-intents') return <UserIntentPromptCard brandId={brandId} />;
  return <OptimizationUnitsCard brandId={brandId} />;
}

function getModuleStageColor(stage: WorkspaceModule['stage']) {
  const colorMap: Record<WorkspaceModule['stage'], string> = {
    资料准备: 'blue',
    规划监测: 'purple',
    内容发布: 'green',
    分析诊断: 'orange',
    系统配置: 'default'
  };

  return colorMap[stage];
}

function SprintWorkspaceEntry({ sprint, loading, onNavigate }: { sprint: VisibilitySprint | null; loading: boolean; onNavigate: (route: string) => void }) {
  const status = getSprintStatusLabel(sprint?.status ?? 'draft');
  const nextAction = getSprintNextAction(sprint);
  const metricCards = getSprintMetricCards(sprint);
  const progress = getSprintProgressPercent(sprint);

  return (
    <Card
      title="AI 可见性运营 Sprint"
      loading={loading}
      extra={<Button onClick={() => onNavigate(nextAction.route)}>{nextAction.label}</Button>}
    >
      <Space direction="vertical" size={16} className="page-stack">
        <Row gutter={16} align="middle">
          <Col xs={24} lg={10}>
            <Space direction="vertical" size={8} className="page-stack">
              <Space wrap>
                <Tag color={status.color}>{status.label}</Tag>
                <Typography.Text strong>{sprint?.title ?? '首轮 AI 可见性运营'}</Typography.Text>
              </Space>
              <Typography.Text type="secondary">{sprint?.goal ?? '围绕高价值问题完成真实回复监测、标准答案对照、内容补强、发布和复测。'}</Typography.Text>
              <Alert type="info" showIcon message={nextAction.description} action={<Button size="small" onClick={() => onNavigate(nextAction.route)}>{nextAction.label}</Button>} />
            </Space>
          </Col>
          <Col xs={24} lg={14}>
            <Steps
              size="small"
              current={Math.max(0, sprint?.steps.findIndex((step) => step.code === sprint.currentStep) ?? 0)}
              items={(sprint?.steps ?? []).map((step) => ({ title: step.title, description: step.message, status: getSprintStepDisplayStatus(step.status) }))}
            />
            {sprint?.steps.length ? <Progress percent={progress} size="small" /> : null}
          </Col>
        </Row>
        <Row gutter={12}>
          {metricCards.map((item) => (
            <Col key={item.label} xs={12} md={4}>
              <Statistic title={item.label} value={item.value} suffix={item.suffix} />
            </Col>
          ))}
        </Row>
      </Space>
    </Card>
  );
}

function toBrandPayload(values: BrandFormValues): BrandMutationInput {
  return {
    name: values.name,
    aliases: splitList(values.aliasesText),
    industry: values.industry,
    website: values.website,
    targetCities: splitList(values.targetCitiesText),
    businessScope: values.businessScope,
    targetAudience: values.targetAudience,
    status: values.status
  };
}

function splitList(value?: string): string[] {
  return (value ?? '')
    .split(/[、,，]/)
    .map((item) => item.trim())
    .filter(Boolean);
}
