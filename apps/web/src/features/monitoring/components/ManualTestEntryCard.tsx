import { useEffect, useMemo, useState } from 'react';
import { Alert, Button, Card, Form, Input, Select, Space, Table, Tag, Typography, message } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { ManualTestAnswerBatchResult, ManualTestAnswerInput, TestPlan } from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { EmptyState, PageErrorAlert } from '../../../components/PageState';
import { getManualAnswerResultLabel, getManualTestRows, getMissingAnswerCount, parseManualAnswerBatch } from './manualTestDisplay';

type Props = {
  brandId: string;
};

type SingleAnswerFormValues = {
  rowKey: string;
  rawText: string;
  modelName?: string;
};

type BatchAnswerFormValues = {
  answersText: string;
};

export function ManualTestEntryCard({ brandId }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const [singleForm] = Form.useForm<SingleAnswerFormValues>();
  const [batchForm] = Form.useForm<BatchAnswerFormValues>();
  const queryClient = useQueryClient();
  const [selectedPlanId, setSelectedPlanId] = useState<string>();
  const [lastResult, setLastResult] = useState<ManualTestAnswerBatchResult | null>(null);
  const plansQuery = useQuery({
    queryKey: ['test-plans', brandId],
    queryFn: () => apiGet<TestPlan[]>(`/brands/${brandId}/test-plans`)
  });
  const plans = plansQuery.data?.success ? plansQuery.data.data : [];
  const selectedPlan = plans.find((plan) => plan.id === selectedPlanId);
  const rows = useMemo(() => getManualTestRows(selectedPlan), [selectedPlan]);

  useEffect(() => {
    if (!selectedPlanId && plans.length > 0) {
      setSelectedPlanId(plans[0].id);
    }
  }, [plans, selectedPlanId]);

  const submitManualAnswersMutation = useMutation({
    mutationFn: (answers: ManualTestAnswerInput[]) => {
      if (!selectedPlan) {
        throw new Error('请先选择监测计划');
      }

      return apiPost<ManualTestAnswerBatchResult>(`/brands/${brandId}/test-plans/${selectedPlan.id}/manual-answers`, { answers });
    },
    onSuccess: (response) => {
      if (response.success) {
        setLastResult(response.data);
        void queryClient.invalidateQueries({ queryKey: ['monitoring-runs', brandId] });
        void messageApi.success(`已录入 ${response.data.accepted.length} 条回答`);
      } else {
        void messageApi.error(response.error.message);
      }
    }
  });

  const copyQuestion = async (row: { question: string; platformCode: string }) => {
    await navigator.clipboard.writeText(row.question);
    void messageApi.success('监测问题已复制');
  };

  const submitSingleAnswer = (values: SingleAnswerFormValues) => {
    const row = rows.find((item) => item.key === values.rowKey);

    if (!selectedPlan || !row) {
      void messageApi.error('请先选择监测问题');
      return;
    }

    submitManualAnswersMutation.mutate([{
      testPlanId: selectedPlan.id,
      question: row.question,
      platformCode: row.platformCode,
      rawText: values.rawText,
      modelName: values.modelName
    }]);
  };

  const submitBatchAnswers = (values: BatchAnswerFormValues) => {
    if (!selectedPlan) {
      void messageApi.error('请先选择监测计划');
      return;
    }

    const drafts = parseManualAnswerBatch(values.answersText);

    if (drafts.length === 0) {
      void messageApi.error('没有识别到可提交的回答');
      return;
    }

    submitManualAnswersMutation.mutate(drafts.map((draft) => ({ ...draft, testPlanId: selectedPlan.id })));
  };

  const parsedBatchAnswers = parseManualAnswerBatch(Form.useWatch('answersText', batchForm) ?? '');
  const missingAnswerCount = getMissingAnswerCount(rows, parsedBatchAnswers);

  return (
    <Card id="manual-test-entry" title="手动录入真实 AI 回复">
      {contextHolder}
      <Space direction="vertical" size={16} className="page-stack">
        <PageErrorAlert response={plansQuery.data} />
        <Alert
          type="info"
          showIcon
          message="同一道题会分别发送到多个 AI 平台"
          description="这是为了比较豆包、Kimi、DeepSeek 等平台的真实回答差异。请按“题号 + 平台”逐条粘贴平台原始回复，系统会按监测计划、问题和平台匹配结果。"
        />
        <Select
          className="full-width"
          placeholder="选择监测计划"
          value={selectedPlanId}
          options={plans.map((plan) => ({ value: plan.id, label: `${plan.name}（${plan.questions.length} 个问题）` }))}
          onChange={(value) => {
            setSelectedPlanId(value);
            setLastResult(null);
            singleForm.resetFields();
            batchForm.resetFields();
          }}
        />
        <Table
          rowKey="key"
          size="small"
          loading={plansQuery.isLoading}
          dataSource={rows}
          pagination={{ pageSize: 6 }}
          locale={{ emptyText: <EmptyState title="还没有可手动录入的问题" description="已保存监测计划中的题号、平台和问题" reason="手动录入需要先有监测计划，系统才能把 AI 原始回复匹配到正确问题和平台。" nextStep="先保存监测计划，再回到这里录入真实 AI 回复。" /> }}
          columns={[
            { title: '题号', dataIndex: 'questionNumber', width: 72, render: (value: number) => <Tag color="blue">第 {value} 题</Tag> },
            { title: '目标平台', dataIndex: 'platformLabel', render: (value: string) => <Tag>{value}</Tag> },
            { title: '监测问题', dataIndex: 'question' },
            { title: '平台入口说明', render: (_, record) => <Typography.Text type="secondary">打开 {record.platformLabel}，粘贴该问题并复制 AI 原始回复。</Typography.Text> },
            { title: '操作', render: (_, record) => <Button type="link" onClick={() => void copyQuestion(record)}>复制问题</Button> }
          ]}
        />
        <Card size="small" title="单条粘贴">
          <Form form={singleForm} layout="vertical" onFinish={submitSingleAnswer}>
            <Form.Item name="rowKey" label="选择要录入的问题" rules={[{ required: true, message: '请选择监测问题' }]}>
              <Select options={rows.map((row) => ({ value: row.key, label: `第 ${row.questionNumber} 题｜${row.platformLabel}｜${row.question}` }))} />
            </Form.Item>
            <Form.Item name="rawText" label="AI 原始回复" rules={[{ required: true, message: '请粘贴 AI 原始回复' }]}>
              <Input.TextArea rows={5} />
            </Form.Item>
            <Form.Item name="modelName" label="模型名称">
              <Input placeholder="可选，例如 kimi-k2、deepseek-chat" />
            </Form.Item>
            <Button type="primary" htmlType="submit" loading={submitManualAnswersMutation.isPending}>提交单条回答</Button>
          </Form>
        </Card>
        <Card size="small" title="批量粘贴">
          <Form form={batchForm} layout="vertical" onFinish={submitBatchAnswers}>
            <Form.Item name="answersText" label="批量原始回复" extra="每条回复用空行分隔，格式：平台：豆包；问题：原监测问题；回答：AI 原文。可选：模型：模型名称。">
              <Input.TextArea rows={8} placeholder={'平台：豆包\n问题：贵阳哪里有适合 3-5 岁孩子的体能馆？\n回答：AI 原始回复\n模型：豆包网页端'} />
            </Form.Item>
            <Space wrap>
              <Tag color={parsedBatchAnswers.length > 0 ? 'blue' : 'default'}>已识别 {parsedBatchAnswers.length} 条</Tag>
              <Tag color={missingAnswerCount === 0 && rows.length > 0 ? 'green' : 'gold'}>缺少回答 {missingAnswerCount} 条</Tag>
              <Button htmlType="submit" loading={submitManualAnswersMutation.isPending}>提交批量回答</Button>
            </Space>
          </Form>
        </Card>
        {lastResult ? (
          <Alert
            type={lastResult.failed.length > 0 ? 'warning' : 'success'}
            showIcon
            message={`匹配成功 ${lastResult.accepted.length} 条，匹配失败 ${lastResult.failed.length} 条`}
            description={[...lastResult.accepted, ...lastResult.failed].map(getManualAnswerResultLabel).join('；')}
          />
        ) : null}
      </Space>
    </Card>
  );
}
