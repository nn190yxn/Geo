import { useState } from 'react';
import { Alert, Button, Card, Divider, Input, Progress, Space, Tag, Typography, Upload, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { BrandFaq, BrandImportConfirmationResult, BrandImportDraft, BrandImportField, BrandProfile, KnowledgeSource } from '@geo-platform/shared-types';
import { apiPost, apiPostForm } from '../../../api/http';
import { getBrandImportCompletenessScore, getBrandImportDraftState, getImportFieldConfidenceState, getMissingFieldImpact, supportedBrandImportFormats } from '../pages/brandImportState';

export type ImportFieldEditorValues = Record<string, string>;

type Props = {
  brandId: string;
  onConfirmed: (profile: BrandProfile) => void;
  onManualEntry: () => void;
};

export function BrandImportWorkspace({ brandId, onConfirmed, onManualEntry }: Props) {
  const [messageApi, contextHolder] = message.useMessage();
  const queryClient = useQueryClient();
  const [draft, setDraft] = useState<BrandImportDraft | null>(null);
  const [fieldValues, setFieldValues] = useState<ImportFieldEditorValues>({});
  const [importError, setImportError] = useState<string | null>(null);
  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setImportError(null);
      setDraft(null);
      const formData = new FormData();
      formData.append('file', file);
      const uploadResponse = await apiPostForm<KnowledgeSource>(`/brands/${brandId}/knowledge-sources/upload`, formData);
      if (!uploadResponse.success) throw new Error(uploadResponse.error.message);

      const parseResponse = await apiPost<BrandImportDraft>(`/brands/${brandId}/knowledge-sources/${uploadResponse.data.id}/parse`, {});
      if (!parseResponse.success) throw new Error(parseResponse.error.message);
      return parseResponse.data;
    },
    onSuccess: (nextDraft) => {
      setDraft(nextDraft);
      setFieldValues(createImportFieldEditorValues(nextDraft.fields));
      void queryClient.invalidateQueries({ queryKey: ['brand-profile-library', brandId] });
      if (nextDraft.status === 'failed') {
        setImportError(nextDraft.errorMessage ?? '资料读取失败，请改用手动填写品牌信息。');
        void messageApi.warning('资料已上传，部分内容需要手动补充');
        return;
      }
      void messageApi.success('已读取品牌资料，请继续确认品牌档案');
    },
    onError: (error) => setImportError(error instanceof Error ? error.message : '资料上传失败，请重试或手动填写品牌信息。')
  });
  const confirmMutation = useMutation({
    mutationFn: async () => {
      if (!draft) throw new Error('请先上传并读取品牌资料。');
      const fields = draft.fields.map((field) => ({
        key: field.key,
        value: parseImportFieldEditorValue(field, fieldValues[field.key] ?? '')
      }));
      const response = await apiPost<BrandImportConfirmationResult>(`/brands/${brandId}/knowledge-sources/${draft.sourceId}/confirm`, { fields });
      if (!response.success) throw new Error(response.error.message);
      return response.data;
    },
    onSuccess: (result) => {
      if (draft) setDraft({ ...draft, status: 'confirmed' });
      void queryClient.invalidateQueries({ queryKey: ['brand-profile-library', brandId] });
      void queryClient.invalidateQueries({ queryKey: ['brand-workspace', brandId] });
      onConfirmed(result.profile);
      void messageApi.success('品牌档案已保存');
    },
    onError: (error) => void messageApi.error(error instanceof Error ? error.message : '品牌档案保存失败')
  });

  return (
    <Space direction="vertical" size={16} className="page-stack">
      {contextHolder}
      <Alert type="info" showIcon message="上传并确认品牌资料" description="上传 Markdown、DOCX 或可复制文字的 PDF，确认识别结果后再保存。" />
      <Card title="选择资料文件" className="inner-section">
        <Space direction="vertical" size={12} className="page-stack">
          <Upload
            accept=".md,.markdown,.docx,.pdf"
            maxCount={1}
            showUploadList={false}
            beforeUpload={(file) => {
              void uploadMutation.mutateAsync(file);
              return false;
            }}
          >
            <Button type={draft ? 'default' : 'primary'} loading={uploadMutation.isPending}>{draft ? '重新选择资料' : '上传品牌资料'}</Button>
          </Upload>
          <Space wrap>{supportedBrandImportFormats.map((format) => <Tag key={format}>{format}</Tag>)}</Space>
          {uploadMutation.isPending ? <Alert type="info" showIcon message="正在读取资料" description="读取完成后会在当前工作区展示待确认字段。" /> : null}
        </Space>
      </Card>
      {draft ? <BrandImportDraftSummary draft={draft} /> : null}
      {draft?.status === 'ready_for_confirmation' ? (
        <BrandImportConfirmationPanel
          draft={draft}
          values={fieldValues}
          saving={confirmMutation.isPending}
          onChange={(key, value) => setFieldValues((current) => ({ ...current, [key]: value }))}
          onConfirm={() => confirmMutation.mutate()}
        />
      ) : null}
      {importError ? <Alert type="warning" showIcon message="资料需要补充确认" description={importError} action={<Button onClick={onManualEntry}>手动填写品牌信息</Button>} /> : null}
    </Space>
  );
}

function BrandImportDraftSummary({ draft }: { draft: BrandImportDraft }) {
  const state = getBrandImportDraftState(draft);
  const completenessScore = getBrandImportCompletenessScore(draft);
  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Alert
        type={state.alertType}
        showIcon
        message={<Space><Tag color={state.color}>{state.label}</Tag><span>{state.message}</span></Space>}
        description={draft.errorMessage ?? `已识别 ${draft.confidenceSummary.high} 个高置信字段，${draft.confidenceSummary.needsConfirmation} 个字段需要确认。`}
      />
      <Progress percent={completenessScore} size="small" status={draft.status === 'failed' ? 'exception' : 'active'} />
    </Space>
  );
}

function BrandImportConfirmationPanel({ draft, values, saving, onChange, onConfirm }: { draft: BrandImportDraft; values: ImportFieldEditorValues; saving: boolean; onChange: (key: string, value: string) => void; onConfirm: () => void }) {
  const visibleFields = draft.fields.filter((field) => field.value !== null || field.confirmationRequired);
  return (
    <Card title="确认品牌档案" className="inner-section">
      <Space direction="vertical" size={12} className="page-stack">
        <Typography.Text type="secondary">检查系统识别字段，高置信字段可直接保存，待确认字段建议先补充或修正。</Typography.Text>
        {visibleFields.map((field) => {
          const confidence = getImportFieldConfidenceState(field.confidence);
          return (
            <div key={field.key}>
              <Space wrap>
                <Typography.Text strong>{field.label}</Typography.Text>
                <Tag color={confidence.color}>{confidence.label}</Tag>
                {field.confirmationRequired ? <Tag color="red">待确认</Tag> : null}
              </Space>
              {field.sourceExcerpt ? <Typography.Paragraph type="secondary">来源片段：{field.sourceExcerpt}</Typography.Paragraph> : null}
              <Input.TextArea rows={Array.isArray(field.value) ? 3 : 2} value={values[field.key] ?? ''} onChange={(event) => onChange(field.key, event.target.value)} />
            </div>
          );
        })}
        {draft.missingFields.length > 0 ? <Alert type="warning" showIcon message="还缺这些关键信息" description={draft.missingFields.map((field) => getMissingFieldImpact(field)).join(' ')} /> : null}
        <Divider />
        <Button type="primary" loading={saving} onClick={onConfirm}>确认并保存品牌档案</Button>
      </Space>
    </Card>
  );
}

export function createImportFieldEditorValues(fields: BrandImportField[]): ImportFieldEditorValues {
  return Object.fromEntries(fields.map((field) => [field.key, formatImportFieldValue(field.value)]));
}

function formatImportFieldValue(value: BrandImportField['value']): string {
  if (value === null) return '';
  if (Array.isArray(value)) {
    if (isFaqList(value)) return value.map((item) => `${item.question}\n${item.answer}`).join('\n\n');
    return value.join('\n');
  }
  return value;
}

export function parseImportFieldEditorValue(field: BrandImportField, value: string): BrandImportField['value'] {
  if (Array.isArray(field.value)) {
    if (isFaqList(field.value)) {
      return value.split(/\n\s*\n/).map((item) => item.trim()).filter(Boolean).map((item) => {
        const [question = '', ...answerParts] = item.split('\n');
        return { question: question.trim(), answer: answerParts.join('\n').trim() };
      }).filter((item) => item.question || item.answer);
    }
    return splitImportList(value);
  }
  if (field.value === null && listFieldKeys.has(field.key)) return splitImportList(value);
  return value.trim();
}

function splitImportList(value: string): string[] {
  return value.split(/\n|、|,|，/).map((item) => item.trim()).filter(Boolean);
}

function isFaqList(value: string[] | BrandFaq[]): value is BrandFaq[] {
  return value.length > 0 && typeof value[0] === 'object' && 'question' in value[0];
}

const listFieldKeys = new Set(['aliases', 'targetCities', 'valueProps', 'offerings', 'proofPoints', 'targetCustomers', 'recommendedExpressions', 'blockedExpressions', 'contentRules', 'competitors']);
