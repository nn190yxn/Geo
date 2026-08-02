import { useEffect, useState } from 'react';
import type { ReactNode } from 'react';
import { Alert, Button, Card, Col, Form, Input, List, Modal, Radio, Row, Select, Space, Tag, Typography } from 'antd';
import type { FormInstance } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useLocation, useNavigate } from 'react-router';
import type { BrandMediaAsset, BrandProfile, BrandProfileInput, BrandProfileLibrary, KnowledgeSource, KnowledgeSourceInput, KnowledgeSourceType, UserIntent } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { AssetLibrary, type AssetLibraryCategory } from '../../../components/AssetLibrary';
import { EmptyState } from '../../../components/PageState';
import { getPlatformDisplayName } from '../../../utils/displayLabels';
import { BrandImportWorkspace } from './BrandImportWorkspace';
import { brandProfileLibraryGroups, getBrandProfileGroupMissingLabels, getBrandProfileGroupProgress, type BrandProfileLibraryCategoryKey } from './brandProfileLibrary';
import { buildFactKnowledgeAssets, buildMediaAssetListItems, filterLibraryAssets, getFaqSummary, getProductServiceStatus, splitFaqs, toAudienceProfileFormItems, toAudienceProfileStrings, toProductServiceFormItems, toProductServiceStrings, type AssetReviewFilter, type AudienceProfileFormItem, type FactKnowledgeGroupKey, type LibraryAssetListItem, type ProductServiceFormItem } from './brandProfileEditor';

type KnowledgeFormValues = Omit<BrandProfileInput, 'valueProps' | 'offerings' | 'proofPoints' | 'targetCustomers' | 'recommendedExpressions' | 'blockedExpressions' | 'contentRules' | 'competitors' | 'faqs'> & {
  valuePropsText?: string;
  offerings?: ProductServiceFormItem[];
  proofPointsText?: string;
  targetCustomers?: AudienceProfileFormItem[];
  recommendedExpressionsText?: string;
  blockedExpressionsText?: string;
  contentRulesText?: string;
  competitorsText?: string;
  faqsText?: string;
};

type Props = {
  brandId: string;
};

type SourceFormValues = KnowledgeSourceInput;
export type ProfileSaveFeedback = { before: number; after: number };

export function BrandKnowledgeCard({ brandId }: Props) {
  const location = useLocation();
  const navigate = useNavigate();
  const [form] = Form.useForm<KnowledgeFormValues>();
  const [sourceForm] = Form.useForm<SourceFormValues>();
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceType, setSourceType] = useState<KnowledgeSourceType>('file');
  const [activeCategory, setActiveCategory] = useState<BrandProfileLibraryCategoryKey>('basic-info');
  const [workspaceMode, setWorkspaceMode] = useState<'category' | 'import'>(() => new URLSearchParams(location.search).get('brandImport') === '1' ? 'import' : 'category');
  const [saveFeedback, setSaveFeedback] = useState<ProfileSaveFeedback | null>(null);
  const queryClient = useQueryClient();
  const libraryQuery = useQuery({
    queryKey: ['brand-profile-library', brandId],
    queryFn: () => apiGet<BrandProfileLibrary>(`/brands/${brandId}/profile-library`)
  });
  const library = libraryQuery.data?.success ? libraryQuery.data.data : null;
  const profile = library?.profile ?? null;
  const sources = library?.knowledgeSources ?? [];
  const mediaAssets = library?.mediaAssets ?? [];
  const intentQuery = useQuery({
    queryKey: ['user-intents', brandId],
    queryFn: () => apiGet<UserIntent[]>(`/brands/${brandId}/intents`)
  });
  const highValueIntents = intentQuery.data?.success ? intentQuery.data.data.filter((intent) => intent.enabled) : [];
  const openSourceModal = (type: KnowledgeSourceType, initialValues?: Partial<SourceFormValues>) => {
    setSourceType(type);
    sourceForm.setFieldsValue({ sourceType: type, ...initialValues });
    setSourceModalOpen(true);
  };
  const saveProfileMutation = useMutation({
    mutationFn: (values: KnowledgeFormValues) => apiPatch<BrandProfileLibrary>(`/brands/${brandId}/profile-library`, { profile: toProfilePayload(values) }),
    onSuccess: (response) => {
      if (response.success) {
        setSaveFeedback({ before: profile?.completenessScore ?? 0, after: response.data.profile.completenessScore });
        form.setFieldsValue(toFormValues(response.data.profile));
        void queryClient.invalidateQueries({ queryKey: ['brand-profile-library', brandId] });
        void queryClient.invalidateQueries({ queryKey: ['brand-workspace', brandId] });
      }
    }
  });
  const createSourceMutation = useMutation({
    mutationFn: (values: SourceFormValues) => apiPost<KnowledgeSource>(`/brands/${brandId}/knowledge-sources`, values),
    onSuccess: (response) => {
      if (response.success) {
        setSourceModalOpen(false);
        sourceForm.resetFields();
        void queryClient.invalidateQueries({ queryKey: ['brand-profile-library', brandId] });
        void queryClient.invalidateQueries({ queryKey: ['knowledge-sources', brandId] });
      }
    }
  });

  useEffect(() => {
    if (profile && !form.isFieldsTouched()) {
      form.setFieldsValue(toFormValues(profile));
    }
  }, [form, profile]);

  useEffect(() => {
    setWorkspaceMode(new URLSearchParams(location.search).get('brandImport') === '1' ? 'import' : 'category');
  }, [location.search]);

  const setImportWorkspace = (open: boolean) => {
    const params = new URLSearchParams(location.search);
    if (open) params.set('brandImport', '1');
    else params.delete('brandImport');
    setWorkspaceMode(open ? 'import' : 'category');
    navigate({ pathname: location.pathname, search: params.toString(), hash: location.hash }, { replace: true });
  };
  const navigateToNextStep = (path: '/optimization-units' | '/monitoring') => {
    const params = new URLSearchParams(location.search);
    params.delete('brandImport');
    const query = params.toString();
    navigate(`${path}${query ? `?${query}` : ''}${location.hash}`);
  };

  const categories = getBrandProfileAssetCategories(profile, mediaAssets.length, sources.length);
  const viewState = libraryQuery.isLoading
    ? 'loading'
    : libraryQuery.data && !libraryQuery.data.success
      ? 'error'
      : profile?.missingFields.length
        ? 'partial'
        : 'ready';

  return (
    <>
      <AssetLibrary
        categories={categories}
        activeCategory={activeCategory}
        onCategoryChange={(category) => {
          setActiveCategory(category);
          if (workspaceMode === 'import') setImportWorkspace(false);
        }}
        title="品牌资料库"
        description="集中维护 AI 回复监测、标准答案和内容生成所需的品牌事实与素材。"
        completeness={profile?.completenessScore ?? 0}
        completenessDetails={profile?.missingFields.length ? `${profile.missingFields.length} 项核心资料待补充` : '核心资料已覆盖'}
        state={viewState}
        primaryAction={workspaceMode === 'category' ? <Button type="primary" loading={saveProfileMutation.isPending} onClick={() => form.submit()}>保存品牌资料</Button> : undefined}
        secondaryActions={workspaceMode === 'category' ? <Button onClick={() => setImportWorkspace(true)}>上传资料</Button> : <Button onClick={() => setImportWorkspace(false)}>返回分类编辑</Button>}
        navigationFooter={(
          <Space direction="vertical" size={8} className="page-stack">
            <Typography.Text type="secondary">已记录 {sources.length} 个资料来源，其中 {mediaAssets.length} 个可作为媒体素材。</Typography.Text>
            <Typography.Text type="secondary">资料完整度会影响监测问题、标准答案和内容生成质量。</Typography.Text>
          </Space>
        )}
        partialState={profile ? <ProfileCompletenessNotice profile={profile} /> : undefined}
        editor={(
          <Space direction="vertical" size={16} className="page-stack">
            {saveFeedback ? <ProfileSaveFeedbackNotice feedback={saveFeedback} onCreateMonitoringObject={() => navigateToNextStep('/optimization-units')} onStartMonitoring={() => navigateToNextStep('/monitoring')} /> : null}
            {workspaceMode === 'import' ? (
              <BrandImportWorkspace
                brandId={brandId}
                onConfirmed={(nextProfile) => setSaveFeedback({ before: profile?.completenessScore ?? 0, after: nextProfile.completenessScore })}
                onManualEntry={() => {
                  setActiveCategory('basic-info');
                  setImportWorkspace(false);
                }}
              />
            ) : (
              <Form form={form} layout="vertical" onFinish={(values) => saveProfileMutation.mutate(values)}>
                <BrandProfileCategoryEditor
                  activeCategory={activeCategory}
                  profile={profile}
                  mediaAssets={mediaAssets}
                  sources={sources}
                  highValueIntents={highValueIntents}
                  loading={libraryQuery.isLoading}
                  onUpload={() => setImportWorkspace(true)}
                  onManualSource={() => openSourceModal('webpage')}
                  onExampleSource={() => openSourceModal('external_document', { name: '示例：品牌事实或媒体素材' })}
                />
              </Form>
            )}
          </Space>
        )}
      />
      <SourceUploadModal
        form={sourceForm}
        open={sourceModalOpen}
        sourceType={sourceType}
        loading={createSourceMutation.isPending}
        onCancel={() => setSourceModalOpen(false)}
        onSourceTypeChange={setSourceType}
        onSubmit={(values) => createSourceMutation.mutate({ ...values, sourceType })}
      />
    </>
  );
}

export function getBrandProfileAssetCategories(profile: BrandProfile | null, mediaAssetCount: number, sourceCount: number): AssetLibraryCategory<BrandProfileLibraryCategoryKey>[] {
  return brandProfileLibraryGroups.map((group) => {
    const missingLabels = getBrandProfileGroupMissingLabels(group, profile);
    const completeness = group.key === 'media-assets' && mediaAssetCount > 0 ? 100 : getBrandProfileGroupProgress(group, profile);
    const hasMissingContent = group.key === 'media-assets' ? mediaAssetCount === 0 : missingLabels.length > 0;
    return {
      key: group.key,
      label: group.title,
      description: group.description,
      completeness,
      count: group.key === 'media-assets' ? mediaAssetCount : group.key === 'facts' ? sourceCount : undefined,
      status: !hasMissingContent && completeness === 100 ? 'complete' : completeness > 0 ? 'partial' : 'empty'
    };
  });
}

export function ProfileSaveFeedbackNotice({ feedback, onCreateMonitoringObject, onStartMonitoring }: { feedback: ProfileSaveFeedback; onCreateMonitoringObject: () => void; onStartMonitoring: () => void }) {
  const copy = getProfileSaveFeedbackCopy(feedback);
  return (
    <Alert
      type="success"
      showIcon
      message={copy.message}
      description={copy.description}
      action={(
        <Space wrap>
          <Button onClick={onCreateMonitoringObject}>创建优化单元</Button>
          <Button onClick={onStartMonitoring}>开始 AI 回复监测</Button>
        </Space>
      )}
    />
  );
}

export function getProfileSaveFeedbackCopy(feedback: ProfileSaveFeedback) {
  const change = feedback.after - feedback.before;
  const changeLabel = change > 0 ? `提升 ${change} 分` : change < 0 ? `变化 ${change} 分` : '保持不变';
  return {
    message: `品牌资料已保存，完整度 ${feedback.before}% → ${feedback.after}%`,
    description: `本次完整度${changeLabel}。最新资料会用于后续监测问题、标准答案和内容生成。`
  };
}

function ProfileCompletenessNotice({ profile }: { profile: BrandProfile }) {
  return (
    <Alert
      type="warning"
      showIcon
      className="page-alert"
      message="品牌资料仍有缺口"
      description={profile.completenessPrompts.length > 0 ? <MissingPromptList profile={profile} /> : <Space wrap>{profile.missingFields.map((field) => <Tag key={field}>{field}</Tag>)}</Space>}
    />
  );
}

function MissingPromptList({ profile }: { profile: BrandProfile }) {
  return (
    <List
      size="small"
      dataSource={profile.completenessPrompts.slice(0, 4)}
      renderItem={(item) => (
        <List.Item>
          <Space direction="vertical" size={2}>
            <Typography.Text strong>{item.label}</Typography.Text>
            <Typography.Text type="secondary">{item.impact} {item.prompt}</Typography.Text>
          </Space>
        </List.Item>
      )}
    />
  );
}

function BrandProfileCategoryEditor({
  activeCategory,
  profile,
  mediaAssets,
  sources,
  highValueIntents,
  loading,
  onUpload,
  onManualSource,
  onExampleSource
}: {
  activeCategory: BrandProfileLibraryCategoryKey;
  profile: BrandProfile | null;
  mediaAssets: BrandMediaAsset[];
  sources: KnowledgeSource[];
  highValueIntents: UserIntent[];
  loading: boolean;
  onUpload: () => void;
  onManualSource: () => void;
  onExampleSource: () => void;
}) {
  if (activeCategory === 'basic-info') return <BasicInfoFields />;
  if (activeCategory === 'products') return <ProductServiceFields />;
  if (activeCategory === 'audiences') return <AudienceFields highValueIntents={highValueIntents} />;
  if (activeCategory === 'facts') {
    return <FactKnowledgeManager profile={profile} sources={sources} loading={loading} onUpload={onUpload} />;
  }
  return <MediaAssetManager mediaAssets={mediaAssets} onUpload={onUpload} onManualSource={onManualSource} onExampleSource={onExampleSource} />;
}

function SourceUploadModal({
  form,
  open,
  sourceType,
  loading,
  onCancel,
  onSourceTypeChange,
  onSubmit
}: {
  form: FormInstance<SourceFormValues>;
  open: boolean;
  sourceType: KnowledgeSourceType;
  loading: boolean;
  onCancel: () => void;
  onSourceTypeChange: (sourceType: KnowledgeSourceType) => void;
  onSubmit: (values: SourceFormValues) => void;
}) {
  return (
    <Modal
      title="上传品牌资料"
      open={open}
      okText="立即上传"
      cancelText="取消"
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={() => form.submit()}
    >
      <Alert type="info" showIcon className="page-alert" message="当前版本会记录资料来源、处理状态和可用于标准答案的资料基础。" />
      <Form form={form} layout="vertical" initialValues={{ sourceType }} onFinish={onSubmit}>
        <Form.Item name="sourceType" label="资料类型">
          <Radio.Group
            optionType="button"
            buttonStyle="solid"
            options={Object.entries(sourceTypeLabels).map(([value, label]) => ({ value, label }))}
            value={sourceType}
            onChange={(event) => onSourceTypeChange(event.target.value)}
          />
        </Form.Item>
        <Form.Item name="name" label="素材名称" rules={[{ required: true, message: '请输入素材名称' }]}>
          <Input />
        </Form.Item>
        {sourceType === 'file' ? (
          <Form.Item name="fileRef" label="文件名称" rules={[{ required: true, message: '请输入文件名称' }]}>
            <Input placeholder="例如：品牌介绍.pdf" />
          </Form.Item>
        ) : (
          <Form.Item name="sourceUrl" label="来源链接" rules={[{ required: true, message: '请输入来源链接' }]}>
            <Input placeholder="https://example.com/article" />
          </Form.Item>
        )}
      </Form>
    </Modal>
  );
}

function BasicInfoFields() {
  return (
    <div className="geo-workbench-grid">
      <Space direction="vertical" size={12} className="geo-workbench-main">
        <Card title="品牌定位" className="inner-section">
          <Form.Item name="intro" label="品牌介绍" extra="示例：追光小牛是一家服务 6 至 12 岁儿童的运动成长品牌，提供城市门店课程与家庭训练方案。">
            <Input.TextArea rows={4} showCount maxLength={300} placeholder="说明品牌是谁、服务什么人、服务范围和核心价值" />
          </Form.Item>
        </Card>
        <Card title="差异化与可信证明" className="inner-section">
          <Row gutter={16}>
            <Col xs={24} md={12}>
              <Form.Item name="valuePropsText" label="核心卖点" extra="每行一个卖点。示例：小班分龄训练；每月提供成长评估。">
                <Input.TextArea rows={5} showCount maxLength={600} placeholder="一行一个可被 AI 准确复述的卖点" />
              </Form.Item>
            </Col>
            <Col xs={24} md={12}>
              <Form.Item name="proofPointsText" label="权威背书" extra="每行一个事实。示例：国家体育总局认证教练团队；累计服务 3,000 个家庭。">
                <Input.TextArea rows={5} showCount maxLength={600} placeholder="一行一个可追溯的资质、案例、报道或奖项" />
              </Form.Item>
            </Col>
          </Row>
        </Card>
      </Space>
      <GuidancePanel title="基础信息检查项" items={['品牌是谁、服务什么人', '服务范围和城市明确', '核心卖点能直接支撑 AI 标准答案', '权威背书可被内容生成引用']} />
    </div>
  );
}

function ProductServiceFields() {
  const offerings = Form.useWatch('offerings') ?? [];
  const faqSummary = getFaqSummary(Form.useWatch('faqsText'));

  return (
    <div className="geo-workbench-grid">
      <Space direction="vertical" size={12} className="geo-workbench-main">
        <Form.List name="offerings">
          {(fields, { add, remove }) => (
            <Space direction="vertical" size={12} className="page-stack">
              {fields.length === 0 ? <EmptyState title="还没有产品或服务" description="按产品、课程或服务方案分别建立条目" reason="独立条目便于 AI 准确理解适用人群、优势和限制。" nextStep="新增第一个产品服务条目。" /> : null}
              {fields.map((field, index) => (
                <Card
                  key={field.key}
                  title={`产品服务 ${index + 1}`}
                  className="inner-section"
                  extra={<Tag color={getProductServiceStatus(offerings[index]) === 'ready' ? 'green' : 'gold'}>{getProductServiceStatus(offerings[index]) === 'ready' ? '资料可用' : '待补充'}</Tag>}
                  actions={[<Button key="remove" type="text" danger onClick={() => remove(field.name)}>删除条目</Button>]}
                >
                  <Form.Item name={[field.name, 'description']} label="产品或服务说明" rules={[{ required: true, message: '请填写产品或服务说明' }]} extra="示例：城市门店少儿体能小班课｜6 至 9 岁｜改善协调性与体能基础｜每班不超过 8 人。">
                    <Input.TextArea rows={4} showCount maxLength={300} placeholder="写清名称、适用人群、使用场景、优势和限制" />
                  </Form.Item>
                </Card>
              ))}
              <Button onClick={() => add({ description: '' })}>新增产品服务</Button>
            </Space>
          )}
        </Form.List>
        <Card title="常见问题" className="inner-section" extra={<Tag>{faqSummary.count} 条 FAQ</Tag>}>
          <Form.Item name="faqsText" label="FAQ 内容" extra="每行一个 FAQ，使用“问题 | 答案”格式。">
            <Input.TextArea rows={6} showCount maxLength={1200} placeholder="课程适合零基础儿童吗？ | 适合，教练会按首次评估结果分龄分组。" />
          </Form.Item>
          {faqSummary.questions.length > 0 ? <List size="small" header="FAQ 摘要" dataSource={faqSummary.questions} renderItem={(question) => <List.Item>{question}</List.Item>} /> : null}
        </Card>
      </Space>
      <GuidancePanel title="产品服务检查项" items={['每个服务有明确适用人群', '价格和限制使用统一口径', 'FAQ 覆盖购买前高频问题', '内容生成能直接引用产品服务描述']} />
    </div>
  );
}

function AudienceFields({ highValueIntents }: { highValueIntents: UserIntent[] }) {
  return (
    <div className="geo-workbench-grid">
      <Form.List name="targetCustomers">
        {(fields, { add, remove }) => (
          <Space direction="vertical" size={12} className="geo-workbench-main">
            {fields.length === 0 ? <EmptyState title="还没有目标用户画像" description="按购买角色和决策场景分别建立画像" reason="画像会用于生成用户意图、监测问题和内容主题。" nextStep="新增第一个用户画像。" /> : null}
            {fields.map((field, index) => (
              <Card
                key={field.key}
                title={`用户画像 ${index + 1}`}
                className="inner-section"
                actions={[<Button key="remove" type="text" danger onClick={() => remove(field.name)}>删除画像</Button>]}
              >
                <Row gutter={16}>
                  <Col xs={24} md={12}>
                    <Form.Item name={[field.name, 'name']} label="画像名称" rules={[{ required: true, message: '请填写画像名称' }]}>
                      <Input showCount maxLength={40} placeholder="例如：首次为孩子选择体能课的家长" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name={[field.name, 'decisionStage']} label="决策阶段">
                      <Select allowClear placeholder="选择当前决策阶段" options={audienceDecisionStageOptions} />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name={[field.name, 'concerns']} label="关注问题">
                      <Input.TextArea rows={3} showCount maxLength={160} placeholder="例如：安全性、教练资质、孩子能否坚持" />
                    </Form.Item>
                  </Col>
                  <Col xs={24} md={12}>
                    <Form.Item name={[field.name, 'expressions']} label="常见表达">
                      <Input.TextArea rows={3} showCount maxLength={160} placeholder="例如：附近靠谱的儿童体能课怎么选" />
                    </Form.Item>
                  </Col>
                </Row>
                <Form.Item name={[field.name, 'linkedIntent']} label="关联高价值意图" extra="关联后可让画像与现有监测问题保持同一业务语境。">
                  <Select
                    allowClear
                    showSearch
                    optionFilterProp="label"
                    placeholder={highValueIntents.length > 0 ? '选择一个已启用的用户意图' : '暂无已启用意图，可先补充画像'}
                    options={highValueIntents.map((intent) => ({ value: intent.text, label: intent.text }))}
                  />
                </Form.Item>
              </Card>
            ))}
            <Button onClick={() => add({ name: '', decisionStage: '', concerns: '', expressions: '', linkedIntent: '' })}>新增用户画像</Button>
          </Space>
        )}
      </Form.List>
      <GuidancePanel title="目标用户检查项" items={['用户类型能对应真实购买场景', '包含决策阶段和关注问题', '记录反对理由和顾虑', '可转成用户意图和监测问题']} />
    </div>
  );
}

function FactKnowledgeManager({ profile, sources, loading, onUpload }: { profile: BrandProfile | null; sources: KnowledgeSource[]; loading: boolean; onUpload: () => void }) {
  const form = Form.useFormInstance<KnowledgeFormValues>();
  const [activeGroup, setActiveGroup] = useState<FactKnowledgeGroupKey>('recommended');
  const [query, setQuery] = useState('');
  const [reviewStatus, setReviewStatus] = useState<AssetReviewFilter>('all');
  const [editorVisible, setEditorVisible] = useState(false);
  const allItems = profile ? buildFactKnowledgeAssets(profile, sources) : [];
  const groupItems = allItems.filter((item) => item.group === activeGroup);
  const filteredItems = filterLibraryAssets(groupItems, query, reviewStatus);
  const editorConfig = factEditorConfigs[activeGroup];

  const selectGroup = (group: FactKnowledgeGroupKey) => {
    setActiveGroup(group);
    setQuery('');
    setReviewStatus('all');
    setEditorVisible(false);
  };

  const useExample = () => {
    if (!editorConfig) return;
    form.setFieldValue(editorConfig.field, editorConfig.example);
    setEditorVisible(true);
  };

  return (
    <Row gutter={[16, 16]}>
      <Col xs={24} md={7} lg={6}>
        <Card title="事实分组" className="inner-section">
          <Space direction="vertical" size={8} className="page-stack">
            {factKnowledgeGroups.map((group) => {
              const count = allItems.filter((item) => item.group === group.key).length;
              return (
                <Button key={group.key} type={activeGroup === group.key ? 'default' : 'text'} block onClick={() => selectGroup(group.key)}>
                  {group.label} ({count})
                </Button>
              );
            })}
          </Space>
        </Card>
      </Col>
      <Col xs={24} md={17} lg={18}>
        <Space direction="vertical" size={12} className="page-stack">
          <AssetListFilters query={query} reviewStatus={reviewStatus} onQueryChange={setQuery} onReviewStatusChange={setReviewStatus} />
          {groupItems.length === 0 ? (
            <AssetCategoryEmpty
              title={`${factKnowledgeGroups.find((group) => group.key === activeGroup)?.label ?? '事实知识'}为空`}
              description="当前分组还没有可用于监测和内容生成的事实条目。"
              actions={(
                <>
                  <Button onClick={onUpload}>上传资料</Button>
                  {editorConfig ? <Button onClick={() => setEditorVisible(true)}>手动录入</Button> : null}
                  {editorConfig ? <Button onClick={useExample}>使用示例结构</Button> : null}
                </>
              )}
            />
          ) : (
            <LibraryAssetList items={filteredItems} loading={loading} emptyDescription="没有符合当前搜索和审核状态的事实条目" />
          )}
          {editorConfig && (editorVisible || groupItems.length > 0) ? (
            <Card title={`手动维护${editorConfig.label}`} className="inner-section" extra={!editorVisible && groupItems.length > 0 ? <Button type="link" onClick={() => setEditorVisible(true)}>编辑当前分组</Button> : null}>
              {editorVisible ? (
                <Form.Item name={editorConfig.field} label={editorConfig.label} extra="每行一条，保存品牌资料后会更新审核状态和更新时间。">
                  <Input.TextArea rows={7} showCount maxLength={1600} placeholder={editorConfig.placeholder} />
                </Form.Item>
              ) : <Typography.Text type="secondary">当前分组已有 {groupItems.length} 条事实，点击编辑可批量维护。</Typography.Text>}
            </Card>
          ) : null}
        </Space>
      </Col>
    </Row>
  );
}

function MediaAssetManager({ mediaAssets, onUpload, onManualSource, onExampleSource }: { mediaAssets: BrandMediaAsset[]; onUpload: () => void; onManualSource: () => void; onExampleSource: () => void }) {
  const [query, setQuery] = useState('');
  const [reviewStatus, setReviewStatus] = useState<AssetReviewFilter>('all');
  const items = buildMediaAssetListItems(mediaAssets);
  const filteredItems = filterLibraryAssets(items, query, reviewStatus);

  return (
    <Space direction="vertical" size={16} className="page-stack">
      <Alert type="info" showIcon message="媒体素材与事实知识使用同一审核状态" description="列表统一展示素材类型、适用平台、关联内容、来源和更新时间，便于内容生成与发布准备选择可靠素材。" />
      <AssetListFilters query={query} reviewStatus={reviewStatus} onQueryChange={setQuery} onReviewStatusChange={setReviewStatus} />
      {items.length === 0 ? (
        <AssetCategoryEmpty
          title="媒体素材为空"
          description="当前还没有门店、产品、案例、证书、活动图或内容资产。"
          actions={(
            <>
              <Button onClick={onUpload}>上传素材</Button>
              <Button onClick={onManualSource}>手动录入来源</Button>
              <Button onClick={onExampleSource}>使用示例结构</Button>
            </>
          )}
        />
      ) : <LibraryAssetList items={filteredItems} emptyDescription="没有符合当前搜索和审核状态的媒体素材" />}
      <OwnedMediaFields />
    </Space>
  );
}

function AssetListFilters({ query, reviewStatus, onQueryChange, onReviewStatusChange }: { query: string; reviewStatus: AssetReviewFilter; onQueryChange: (value: string) => void; onReviewStatusChange: (value: AssetReviewFilter) => void }) {
  return (
    <Row gutter={[12, 12]}>
      <Col xs={24} md={16}>
        <Input.Search allowClear value={query} onChange={(event) => onQueryChange(event.target.value)} placeholder="搜索名称、来源、类型、平台或关联内容" />
      </Col>
      <Col xs={24} md={8}>
        <Select value={reviewStatus} onChange={onReviewStatusChange} options={assetReviewFilterOptions} className="page-stack" aria-label="审核状态筛选" />
      </Col>
    </Row>
  );
}

function LibraryAssetList({ items, loading = false, emptyDescription }: { items: LibraryAssetListItem[]; loading?: boolean; emptyDescription: string }) {
  return (
    <List
      loading={loading}
      dataSource={items}
      locale={{ emptyText: <EmptyState description={emptyDescription} /> }}
      renderItem={(item) => (
        <List.Item>
          <List.Item.Meta
            title={<Space wrap><Typography.Text strong>{item.title}</Typography.Text><Tag color={assetReviewStatusColors[item.reviewStatus]}>{mediaAssetReviewStatusLabels[item.reviewStatus]}</Tag></Space>}
            description={(
              <Space direction="vertical" size={4} className="page-stack">
                <Typography.Text type="secondary">{item.description}</Typography.Text>
                <Space wrap>{item.tags.map((tag) => <Tag key={tag}>{getAssetTagDisplay(tag)}</Tag>)}</Space>
                <Typography.Text type="secondary">来源：{item.source} · 更新时间：{formatAssetUpdatedAt(item.updatedAt)}</Typography.Text>
              </Space>
            )}
          />
        </List.Item>
      )}
    />
  );
}

function AssetCategoryEmpty({ title, description, actions }: { title: string; description: string; actions: ReactNode }) {
  return (
    <Card className="inner-section">
      <Space direction="vertical" size={8} className="page-stack">
        <Typography.Text strong>{title}</Typography.Text>
        <Typography.Text type="secondary">{description}</Typography.Text>
        <Typography.Text>补充后可用于真实回复监测、标准答案和内容生成。</Typography.Text>
        <Space wrap>{actions}</Space>
      </Space>
    </Card>
  );
}

function OwnedMediaFields() {
  return (
    <div className="geo-workbench-grid">
      <Alert
        type="info"
        showIcon
        className="geo-workbench-main"
        message="自有媒体账号在发布运营中维护"
        description="在发布准备中连接官网、公众号、小红书、知乎和百家号等发布账号。"
      />
      <GuidancePanel title="自有媒体检查项" items={['账号名称和平台明确', '授权状态可被发布准备读取', '内容格式和发布频率清晰', '发布后能安排再次监测']} />
    </div>
  );
}


function GuidancePanel({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="geo-detail-panel">
      <Space direction="vertical" size={8} className="page-stack">
        <Typography.Text strong>{title}</Typography.Text>
        {items.map((item) => (
          <div key={item} className="geo-checklist-item">
            <Typography.Text>{item}</Typography.Text>
          </div>
        ))}
      </Space>
    </div>
  );
}

const sourceTypeLabels: Record<KnowledgeSourceType, string> = {
  file: '本地文件',
  webpage: '网页链接',
  wechat_article: '公众号素材',
  external_document: '外部文档'
};

const mediaAssetTypeLabels: Record<BrandMediaAsset['assetType'], string> = {
  image: '图片素材',
  document: '文档素材',
  webpage: '网页素材',
  content_asset: '内容资产'
};

const mediaAssetReviewStatusLabels: Record<BrandMediaAsset['reviewStatus'], string> = {
  pending: '待处理',
  approved: '已确认',
  rejected: '异常',
  needs_review: '待确认'
};

const factKnowledgeGroups: Array<{ key: FactKnowledgeGroupKey; label: string }> = [
  { key: 'recommended', label: '推荐表达' },
  { key: 'blocked', label: '禁用表达' },
  { key: 'rules', label: '内容规则' },
  { key: 'competitors', label: '竞品信息' },
  { key: 'sources', label: '资料来源' }
];

const factEditorConfigs: Partial<Record<FactKnowledgeGroupKey, { field: 'recommendedExpressionsText' | 'blockedExpressionsText' | 'contentRulesText' | 'competitorsText'; label: string; placeholder: string; example: string }>> = {
  recommended: {
    field: 'recommendedExpressionsText',
    label: '推荐表达',
    placeholder: '一行一个推荐说法',
    example: '专业教练提供分龄小班训练\n每月提供可追踪的成长评估'
  },
  blocked: {
    field: 'blockedExpressionsText',
    label: '禁用表达',
    placeholder: '一行一个禁止说法',
    example: '保证快速长高\n百分之百改善体质'
  },
  rules: {
    field: 'contentRulesText',
    label: '内容规则',
    placeholder: '一行一条内容规则',
    example: '所有效果描述必须标注适用条件\n引用资质时保留完整机构名称'
  },
  competitors: {
    field: 'competitorsText',
    label: '竞品信息',
    placeholder: '一行一个竞品、替代选择、对比口径或需要关注的差距',
    example: '本地综合体育馆｜课程种类丰富｜缺少分龄成长评估'
  }
};

const assetReviewFilterOptions: Array<{ value: AssetReviewFilter; label: string }> = [
  { value: 'all', label: '全部审核状态' },
  { value: 'approved', label: '已确认' },
  { value: 'needs_review', label: '待确认' },
  { value: 'pending', label: '待处理' },
  { value: 'rejected', label: '异常' }
];

const assetReviewStatusColors: Record<BrandMediaAsset['reviewStatus'], string> = {
  pending: 'gold',
  approved: 'green',
  rejected: 'red',
  needs_review: 'blue'
};

function getAssetTagDisplay(value: string): string {
  if (value in mediaAssetTypeLabels) return mediaAssetTypeLabels[value as BrandMediaAsset['assetType']];
  if (value in sourceTypeLabels) return sourceTypeLabels[value as KnowledgeSourceType];
  if (['doubao', 'kimi', 'deepseek', 'qianwen', 'stepfun', 'wechat_official', 'xiaohongshu', 'zhihu', 'baijiahao', 'official_site', 'official_site_faq', 'douyin'].includes(value)) return getPlatformDisplayName(value);
  return value;
}

function formatAssetUpdatedAt(value: string): string {
  return value.slice(0, 16).replace('T', ' ');
}

function toFormValues(profile: BrandProfile): KnowledgeFormValues {
  return {
    intro: profile.intro,
    valuePropsText: joinList(profile.valueProps),
    offerings: toProductServiceFormItems(profile.offerings),
    proofPointsText: joinList(profile.proofPoints),
    targetCustomers: toAudienceProfileFormItems(profile.targetCustomers),
    recommendedExpressionsText: joinList(profile.recommendedExpressions),
    blockedExpressionsText: joinList(profile.blockedExpressions),
    contentRulesText: joinList(profile.contentRules),
    competitorsText: joinList(profile.competitors),
    faqsText: profile.faqs.map((faq) => `${faq.question} | ${faq.answer}`).join('\n')
  };
}

function toProfilePayload(values: KnowledgeFormValues): BrandProfileInput {
  return {
    intro: values.intro ?? '',
    valueProps: splitLines(values.valuePropsText),
    offerings: toProductServiceStrings(values.offerings),
    proofPoints: splitLines(values.proofPointsText),
    targetCustomers: toAudienceProfileStrings(values.targetCustomers),
    recommendedExpressions: splitLines(values.recommendedExpressionsText),
    blockedExpressions: splitLines(values.blockedExpressionsText),
    contentRules: splitLines(values.contentRulesText),
    competitors: splitLines(values.competitorsText),
    faqs: splitFaqs(values.faqsText)
  };
}

function splitLines(value?: string): string[] {
  return (value ?? '').split('\n').map((item) => item.trim()).filter(Boolean);
}

function joinList(values: string[]): string {
  return values.join('\n');
}

const audienceDecisionStageOptions = [
  { value: '需求识别', label: '需求识别' },
  { value: '方案比较', label: '方案比较' },
  { value: '购买决策', label: '购买决策' },
  { value: '使用与复购', label: '使用与复购' }
];
