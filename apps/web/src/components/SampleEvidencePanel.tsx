import { useState } from 'react';
import { Alert, Button, Descriptions, Drawer, Empty, Space, Tag, Typography } from 'antd';
import { useQuery } from '@tanstack/react-query';
import type { SampleEvidenceMeasurementStatus, SampleEvidenceResult } from '@geo-platform/shared-types';
import { apiGet } from '../api/http';
import { useBrandContextStore } from '../stores/brandContextStore';
import { getPlatformDisplay } from '../utils/displayLabels';

const statusDisplay: Record<SampleEvidenceMeasurementStatus, { label: string; color: string }> = {
  unmeasured: { label: '未测', color: 'default' },
  insufficient: { label: '样本不足', color: 'gold' },
  valid: { label: '有效样本', color: 'green' }
};

export type SampleEvidencePanelProps = {
  runIds: string[];
  buttonLabel?: string;
  buttonSize?: 'small' | 'middle' | 'large';
};

export function SampleEvidencePanel({ runIds, buttonLabel = '查看原始样本', buttonSize = 'small' }: SampleEvidencePanelProps) {
  const [open, setOpen] = useState(false);
  const brandId = useBrandContextStore((state) => state.activeBrandId);
  const normalizedRunIds = [...new Set(runIds.filter(Boolean))];
  const query = useQuery({
    queryKey: ['sample-evidence', brandId, normalizedRunIds],
    queryFn: () => apiGet<SampleEvidenceResult>(`/brands/${brandId}/analysis-diagnosis/sample-evidence?runIds=${encodeURIComponent(normalizedRunIds.join(','))}`),
    enabled: open
  });
  const result = query.data?.success ? query.data.data : null;
  const status = statusDisplay[result?.measurementStatus ?? 'unmeasured'];

  return (
    <>
      <Button size={buttonSize} onClick={() => setOpen(true)}>{buttonLabel}</Button>
      <Drawer title="原始样本证据" width={720} open={open} onClose={() => setOpen(false)}>
        <Space direction="vertical" size={16} className="page-stack">
          {query.isLoading ? <Typography.Text type="secondary">正在加载样本证据...</Typography.Text> : null}
          {query.data && !query.data.success ? <Alert type="error" showIcon message={query.data.error.message} /> : null}
          {result ? <Space wrap><Tag color={status.color}>{status.label}</Tag><Typography.Text type="secondary">共 {result.items.length} 条原始回答</Typography.Text></Space> : null}
          {result?.missingRunIds.length ? <Alert type="warning" showIcon message="部分样本引用已失效" description={`缺少 ${result.missingRunIds.length} 条关联运行记录。`} /> : null}
          {result?.items.length === 0 ? <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description="当前范围没有可回放的真实回答" /> : null}
          {result?.items.map((item) => (
            <section key={item.runId} aria-label={`样本：${item.question}`}>
              <Descriptions bordered size="small" column={1} title={item.question}>
                <Descriptions.Item label="问题类型">{getPromptKindLabel(item.promptKind)}</Descriptions.Item>
                <Descriptions.Item label="平台 / 模型">{getPlatformDisplay(item.platformCode)} / {item.modelName}</Descriptions.Item>
                <Descriptions.Item label="访问端">{formatClientSurface(item.measurementScope.clientSurface)}</Descriptions.Item>
                <Descriptions.Item label="采集方式 / 时间">{item.measurementScope.collectionMethod} / {item.collectedAt}</Descriptions.Item>
                <Descriptions.Item label="测量条件">{item.measurementScope.market} · {item.measurementScope.language} · 联网 {formatBoolean(item.measurementScope.searchEnabled)} · 基线 {item.measurementScope.baselineVersion}</Descriptions.Item>
                <Descriptions.Item label="证据等级">{item.measurementScope.evidenceLevel} · 人工确认 {formatBoolean(item.measurementScope.manualConfirmed)}</Descriptions.Item>
                <Descriptions.Item label="原始回答"><Typography.Paragraph style={{ whiteSpace: 'pre-wrap' }}>{item.rawAnswer}</Typography.Paragraph></Descriptions.Item>
                <Descriptions.Item label="引用来源">{item.citations.length ? item.citations.join('；') : '未识别引用来源'}</Descriptions.Item>
                <Descriptions.Item label="分析结果">{item.analysis ? `品牌${item.analysis.brandMentioned ? '已出现' : '未出现'}，排名 ${item.analysis.brandRank ?? '未识别'}，准确度 ${item.analysis.accuracyScore}，引用分 ${item.analysis.citationScore}` : '等待分析'}</Descriptions.Item>
              </Descriptions>
            </section>
          ))}
        </Space>
      </Drawer>
    </>
  );
}

function formatBoolean(value: boolean | null): string {
  if (value === null) return '未知';
  return value ? '是' : '否';
}

export function getPromptKindLabel(value: SampleEvidenceResult['items'][number]['promptKind']): string {
  return value === 'brand_probe' ? '品牌探测' : '无提示发现';
}

export function formatClientSurface(value: SampleEvidenceResult['items'][number]['measurementScope']['clientSurface']): string {
  if (value === 'api') return 'API';
  if (value === 'web') return 'Web';
  if (value === 'app') return 'App';
  return '未知';
}
