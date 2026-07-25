import { useEffect, useState } from 'react';
import { Alert, Button, Card, Col, Form, Input, Modal, Progress, Radio, Row, Space, Table, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { BrandFaq, BrandProfile, BrandProfileInput, KnowledgeSource, KnowledgeSourceInput, KnowledgeSourceType } from '@geo-platform/shared-types';
import { apiGet, apiPatch, apiPost } from '../../../api/http';
import { getStatusDisplay } from '../../../utils/displayLabels';

type KnowledgeFormValues = Omit<BrandProfileInput, 'valueProps' | 'offerings' | 'proofPoints' | 'targetCustomers' | 'recommendedExpressions' | 'blockedExpressions' | 'contentRules' | 'competitors' | 'faqs'> & {
  valuePropsText?: string;
  offeringsText?: string;
  proofPointsText?: string;
  targetCustomersText?: string;
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

export function BrandKnowledgeCard({ brandId }: Props) {
  const [form] = Form.useForm<KnowledgeFormValues>();
  const [sourceForm] = Form.useForm<SourceFormValues>();
  const [sourceModalOpen, setSourceModalOpen] = useState(false);
  const [sourceType, setSourceType] = useState<KnowledgeSourceType>('file');
  const queryClient = useQueryClient();
  const profileQuery = useQuery({
    queryKey: ['brand-knowledge', brandId],
    queryFn: () => apiGet<BrandProfile>(`/brands/${brandId}/knowledge`)
  });
  const profile = profileQuery.data?.success ? profileQuery.data.data : null;
  const sourcesQuery = useQuery({
    queryKey: ['knowledge-sources', brandId],
    queryFn: () => apiGet<KnowledgeSource[]>(`/brands/${brandId}/knowledge-sources`)
  });
  const sources = sourcesQuery.data?.success ? sourcesQuery.data.data : [];
  const saveProfileMutation = useMutation({
    mutationFn: (values: KnowledgeFormValues) => apiPatch<BrandProfile>(`/brands/${brandId}/knowledge`, toProfilePayload(values)),
    onSuccess: (response) => {
      if (response.success) {
        form.setFieldsValue(toFormValues(response.data));
        void queryClient.invalidateQueries({ queryKey: ['brand-knowledge', brandId] });
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
        void queryClient.invalidateQueries({ queryKey: ['knowledge-sources', brandId] });
      }
    }
  });

  useEffect(() => {
    if (profile && !form.isFieldsTouched()) {
      form.setFieldsValue(toFormValues(profile));
    }
  }, [form, profile]);

  return (
    <Card
      title="品牌知识库"
      extra={(
        <Space>
          <Button onClick={() => setSourceModalOpen(true)}>上传知识库</Button>
          {profile ? <Progress type="circle" size={48} percent={profile.completenessScore} /> : null}
        </Space>
      )}
    >
      {profile?.missingFields.length ? (
        <Alert
          type="warning"
          showIcon
          className="page-alert"
          message="知识库资料仍有缺口"
          description={<Space wrap>{profile.missingFields.map((field) => <Tag key={field}>{field}</Tag>)}</Space>}
        />
      ) : null}
      <Form form={form} layout="vertical" onFinish={(values) => saveProfileMutation.mutate(values)}>
        <Form.Item name="intro" label="品牌介绍">
          <Input.TextArea rows={4} />
        </Form.Item>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="valuePropsText" label="核心卖点">
              <Input.TextArea rows={3} placeholder="一行一个卖点" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="offeringsText" label="课程或产品体系">
              <Input.TextArea rows={3} placeholder="一行一个产品或服务" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="proofPointsText" label="权威背书">
              <Input.TextArea rows={3} placeholder="一行一个背书材料" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="targetCustomersText" label="目标客户 / 用户画像">
              <Input.TextArea rows={3} placeholder="一行一个用户画像" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="recommendedExpressionsText" label="推荐表达">
              <Input.TextArea rows={3} placeholder="一行一个推荐说法" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="blockedExpressionsText" label="禁用表达">
              <Input.TextArea rows={3} placeholder="一行一个禁止说法" />
            </Form.Item>
          </Col>
        </Row>
        <Row gutter={16}>
          <Col span={12}>
            <Form.Item name="competitorsText" label="竞品">
              <Input.TextArea rows={3} placeholder="一行一个竞品" />
            </Form.Item>
          </Col>
          <Col span={12}>
            <Form.Item name="contentRulesText" label="内容规则">
              <Input.TextArea rows={3} placeholder="一行一条内容规则" />
            </Form.Item>
          </Col>
        </Row>
        <Form.Item name="faqsText" label="FAQ">
          <Input.TextArea rows={4} placeholder="每行一个 FAQ，格式：问题 | 答案" />
        </Form.Item>
        <Space>
          <Button type="primary" htmlType="submit" loading={saveProfileMutation.isPending}>保存知识库</Button>
          <Typography.Text type="secondary">完整度根据 8 个核心资料维度自动计算</Typography.Text>
        </Space>
      </Form>
      <Card title="导入记录" className="inner-section">
        <Table
          rowKey="id"
          loading={sourcesQuery.isLoading}
          dataSource={sources}
          pagination={false}
          columns={[
            { title: '素材名称', dataIndex: 'name' },
            { title: '类型', dataIndex: 'sourceType', render: (value: KnowledgeSourceType) => sourceTypeLabels[value] },
            { title: '来源', render: (_, record) => record.sourceUrl || record.fileRef || '-' },
            { title: '状态', dataIndex: 'status', render: (value: KnowledgeSource['status']) => <Tag>{getStatusDisplay(value)}</Tag> },
            { title: '创建时间', dataIndex: 'createdAt' }
          ]}
        />
      </Card>
      <Modal
        title="上传知识库"
        open={sourceModalOpen}
        okText="立即上传"
        cancelText="取消"
        confirmLoading={createSourceMutation.isPending}
        onCancel={() => setSourceModalOpen(false)}
        onOk={() => sourceForm.submit()}
      >
        <Alert type="info" showIcon className="page-alert" message="当前版本会记录资料来源和处理状态，文件保存和资料读取能力会继续完善。" />
        <Form
          form={sourceForm}
          layout="vertical"
          initialValues={{ sourceType }}
          onFinish={(values) => createSourceMutation.mutate({ ...values, sourceType })}
        >
          <Form.Item name="sourceType" label="知识库类型">
            <Radio.Group
              optionType="button"
              buttonStyle="solid"
              options={Object.entries(sourceTypeLabels).map(([value, label]) => ({ value, label }))}
              value={sourceType}
              onChange={(event) => setSourceType(event.target.value)}
            />
          </Form.Item>
          <Form.Item name="name" label="素材名称" rules={[{ required: true, message: '请输入素材名称' }]}>
            <Input />
          </Form.Item>
          {sourceType === 'file' ? (
            <Form.Item name="fileRef" label="文件引用" rules={[{ required: true, message: '请输入文件引用' }]}>
              <Input placeholder="例如：uploads/brand-intro.pdf" />
            </Form.Item>
          ) : (
            <Form.Item name="sourceUrl" label="来源链接" rules={[{ required: true, message: '请输入来源链接' }]}>
              <Input placeholder="https://example.com/article" />
            </Form.Item>
          )}
        </Form>
      </Modal>
    </Card>
  );
}

const sourceTypeLabels: Record<KnowledgeSourceType, string> = {
  file: '本地文件',
  webpage: '网页链接',
  wechat_article: '公众号素材',
  external_document: '外部文档'
};

function toFormValues(profile: BrandProfile): KnowledgeFormValues {
  return {
    intro: profile.intro,
    valuePropsText: joinList(profile.valueProps),
    offeringsText: joinList(profile.offerings),
    proofPointsText: joinList(profile.proofPoints),
    targetCustomersText: joinList(profile.targetCustomers),
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
    offerings: splitLines(values.offeringsText),
    proofPoints: splitLines(values.proofPointsText),
    targetCustomers: splitLines(values.targetCustomersText),
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

function splitFaqs(value?: string): BrandFaq[] {
  return splitLines(value).map((line) => {
    const [question = '', answer = ''] = line.split('|');

    return {
      question: question.trim(),
      answer: answer.trim()
    };
  });
}

function joinList(values: string[]): string {
  return values.join('\n');
}
