import { useEffect } from 'react';
import { Alert, Button, Card, Col, Form, Input, Row, Space, Statistic, Table, Tag, Typography } from 'antd';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type {
  MeasurementAttributionInput,
  MeasurementDisciplineResult,
  MeasurementExternalEvent,
  MetricTrendEvaluation,
  PlatformMetricComparison,
  PromptMeasurementSection,
  PromptMeasurementSeries
} from '@geo-platform/shared-types';
import { apiGet, apiPost } from '../../../api/http';
import { SampleEvidencePanel } from '../../../components/SampleEvidencePanel';

type AttributionFormValues = Omit<MeasurementAttributionInput, 'controlQuestions' | 'externalEvents'> & {
  controlQuestionsText: string;
  externalEventsText: string;
};

const statusLabel = { unmeasured: '未测', insufficient: '样本不足', valid: '有效样本' } as const;

export function MeasurementDisciplinePanel({ brandId, canWrite }: { brandId: string; canWrite: boolean }) {
  const [form] = Form.useForm<AttributionFormValues>();
  const queryClient = useQueryClient();
  const query = useQuery({
    queryKey: ['measurement-discipline', brandId],
    queryFn: () => apiGet<MeasurementDisciplineResult>(`/brands/${brandId}/analysis-diagnosis/measurement-discipline`)
  });
  const result = query.data?.success ? query.data.data : null;
  const mutation = useMutation({
    mutationFn: (values: AttributionFormValues) => apiPost(`/brands/${brandId}/analysis-diagnosis/measurement-attribution`, toAttributionInput(values)),
    onSuccess: (response) => {
      if (response.success) void queryClient.invalidateQueries({ queryKey: ['measurement-discipline', brandId] });
    }
  });

  useEffect(() => {
    if (!result?.attribution) return;
    form.setFieldsValue({
      ...result.attribution,
      baselineWindowStart: result.attribution.baselineWindowStart.slice(0, 10),
      baselineWindowEnd: result.attribution.baselineWindowEnd.slice(0, 10),
      observationWindowStart: result.attribution.observationWindowStart.slice(0, 10),
      observationWindowEnd: result.attribution.observationWindowEnd.slice(0, 10),
      controlQuestionsText: result.attribution.controlQuestions.join('\n'),
      externalEventsText: result.attribution.externalEvents.map((event) => `${event.date}|${event.category}|${event.title}`).join('\n')
    });
  }, [form, result?.attribution]);

  return (
    <Card title="可比基线与观察归因" loading={query.isLoading}>
      <Space direction="vertical" size={16} className="page-stack">
        {result?.conditionChanged ? <Alert type="warning" showIcon message="测量条件已变化，趋势已按基线版本分段" /> : null}
        <MetricSection title="无提示发现" section={result?.promptBreakdown.discovery} />
        <MetricSection title="品牌探测" section={result?.promptBreakdown.brandProbe} />
        <Typography.Text strong>指标完整性</Typography.Text>
        <Row gutter={[12, 12]}>
          <Col xs={24} md={8}>
            <Card size="small">
              <Statistic title="复合指标" value={result?.compositeMetric.value ?? '-'} suffix={result?.compositeMetric.value == null ? undefined : '%'} />
              <Tag>{statusLabel[result?.compositeMetric.metricState ?? 'unmeasured']}</Tag>
            </Card>
          </Col>
          <Col xs={24} md={16}>
            <Alert
              type="info"
              showIcon
              message="复合指标仅使用已测子指标"
              description={(result?.compositeMetric.components ?? []).map((component) => `${component.label} ${Math.round((result?.compositeMetric.normalizedWeights[component.code] ?? 0) * 100)}%`).join('；') || '完成首轮测量后生成归一权重'}
            />
          </Col>
        </Row>
        <Table<PlatformMetricComparison>
          rowKey={(comparison) => `${comparison.market}-${comparison.metricCode}`}
          size="small"
          pagination={false}
          dataSource={result?.platformComparisons ?? []}
          locale={{ emptyText: '当前还没有可比较的平台样本' }}
          columns={[
            { title: '市场', dataIndex: 'market' },
            { title: '指标', dataIndex: 'metricLabel' },
            { title: '平台结果', dataIndex: 'platforms', render: (platforms: PlatformMetricComparison['platforms']) => platforms.map((platform) => `${platform.platformCode} ${platform.value}%`).join('；') },
            { title: '比较资格', render: (_, comparison) => <Tag color={comparison.eligibility === 'eligible' ? 'green' : 'orange'}>{comparison.eligibility === 'eligible' ? `${comparison.strongestPlatformCode} 强于 ${comparison.weakestPlatformCode}` : platformComparisonReason(comparison.reason)}</Tag> }
          ]}
        />
        <Table<MetricTrendEvaluation>
          rowKey={(trend) => `${trend.metricCode}-${formatScope(trend.measurementScope)}`}
          size="small"
          pagination={false}
          dataSource={result?.metricTrends ?? []}
          locale={{ emptyText: '至少需要一个有效周期才能判断趋势' }}
          columns={[
            { title: '指标', dataIndex: 'metricLabel' },
            { title: '平台 / 市场', dataIndex: 'measurementScope', render: (scope) => `${scope.platformCode} / ${scope.market}` },
            { title: '趋势状态', dataIndex: 'trendState', render: (state) => <Tag>{trendStateLabel(state)}</Tag> },
            { title: '连续变化', dataIndex: 'consecutiveDirectionCount', render: (count) => `${count} 次` },
            { title: '证据', dataIndex: 'runIds', render: (runIds) => <SampleEvidencePanel runIds={runIds} buttonLabel="查看趋势样本" /> }
          ]}
        />
        <Typography.Text strong>独立采集条件序列</Typography.Text>
        <Table<PromptMeasurementSeries>
          rowKey={(series) => `${series.promptKind}-${formatScope(series.measurementScope)}`}
          size="small"
          pagination={false}
          dataSource={result?.promptBreakdown.series ?? []}
          locale={{ emptyText: '当前还没有可拆分的真实测量样本' }}
          columns={[
            { title: '问题类型', dataIndex: 'promptKind', render: (kind) => promptKindLabel(kind) },
            { title: '平台 / 模型', dataIndex: 'measurementScope', render: (scope) => `${scope.platformCode} / ${scope.modelName}` },
            { title: '市场 / 访问端', dataIndex: 'measurementScope', render: (scope) => `${scope.market} / ${clientSurfaceLabel(scope.clientSurface)}` },
            { title: '采集条件', dataIndex: 'measurementScope', render: (scope) => `${scope.collectionMethod} / ${scope.language} / 联网 ${formatBoolean(scope.searchEnabled)} / ${scope.baselineVersion}` },
            { title: '指标', dataIndex: 'metrics', render: (metrics: PromptMeasurementSeries['metrics']) => metrics.map((metric) => `${metric.label} ${metric.value ?? '-'}${metric.value === null ? '' : '%'}`).join('；') },
            { title: '证据', dataIndex: 'runIds', render: (runIds) => <SampleEvidencePanel runIds={runIds} buttonLabel="查看序列样本" /> }
          ]}
        />
        <Table
          rowKey={(segment) => `${segment.baselineVersion}-${segment.startedAt}`}
          size="small"
          pagination={false}
          dataSource={result?.segments ?? []}
          locale={{ emptyText: '当前还没有有效测量样本' }}
          columns={[
            { title: '基线版本', dataIndex: 'baselineVersion' },
            { title: '可比条件', dataIndex: 'measurementScope', render: (scope) => `${scope.platformCode} / ${scope.modelName} / ${scope.market} / ${scope.language}` },
            { title: '时间区间', render: (_, segment) => `${segment.startedAt.slice(0, 10)} 至 ${segment.endedAt.slice(0, 10)}` },
            { title: '状态', dataIndex: 'measurementStatus', render: (status) => <Tag>{statusLabel[status as keyof typeof statusLabel]}</Tag> },
            { title: '证据', dataIndex: 'runIds', render: (runIds) => <SampleEvidencePanel runIds={runIds} buttonLabel="查看区间样本" /> }
          ]}
        />
        <Typography.Text strong>归因记录固定使用“观察相关”结论</Typography.Text>
        <Form form={form} layout="vertical" onFinish={(values) => mutation.mutate(values)}>
          <Row gutter={12}>
            <Col xs={24} md={6}><Form.Item label="基线窗口开始" name="baselineWindowStart" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="基线窗口结束" name="baselineWindowEnd" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="观察窗口开始" name="observationWindowStart" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
            <Col xs={24} md={6}><Form.Item label="观察窗口结束" name="observationWindowEnd" rules={[{ required: true }]}><Input type="date" /></Form.Item></Col>
          </Row>
          <Form.Item label="对照问题" name="controlQuestionsText" extra="每行一个问题"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="外部事件" name="externalEventsText" extra="每行格式：日期|campaign、model_update、platform_rule 或 other|事件标题"><Input.TextArea rows={3} /></Form.Item>
          <Form.Item label="观察结论" name="conclusion"><Input.TextArea rows={2} placeholder="描述观察窗口与基线窗口之间的相关变化" /></Form.Item>
          <Button type="primary" htmlType="submit" disabled={!canWrite} loading={mutation.isPending}>保存观察归因</Button>
        </Form>
      </Space>
    </Card>
  );
}

function MetricSection({ title, section }: { title: string; section?: PromptMeasurementSection }) {
  return (
    <Space direction="vertical" size={8} className="page-stack">
      <Typography.Text strong>{title}</Typography.Text>
      <Row gutter={[12, 12]}>
        {(section?.metrics ?? []).map((metric) => (
          <Col xs={24} sm={12} lg={8} key={metric.code}>
            <Card size="small">
              <Statistic title={metric.label} value={metric.value ?? '-'} suffix={metric.value === null ? undefined : '%'} />
              <Tag>{statusLabel[metric.measurementStatus]} · {metric.sampleCount} 条</Tag>
            </Card>
          </Col>
        ))}
      </Row>
    </Space>
  );
}

function promptKindLabel(kind: PromptMeasurementSeries['promptKind']): string {
  return kind === 'brand_probe' ? '品牌探测' : '无提示发现';
}

function clientSurfaceLabel(surface: PromptMeasurementSeries['measurementScope']['clientSurface']): string {
  if (surface === 'api') return 'API';
  if (surface === 'web') return 'Web';
  if (surface === 'app') return 'App';
  return '未知';
}

function platformComparisonReason(reason?: PlatformMetricComparison['reason']): string {
  return reason === 'all_platforms_equal' ? '平台结果无差异' : '有效平台不足两个';
}

function trendStateLabel(state: MetricTrendEvaluation['trendState']): string {
  if (state === 'upward_trend') return '上升趋势';
  if (state === 'downward_trend') return '下降趋势';
  if (state === 'single_period_observation') return '单期观察';
  if (state === 'stable') return '持平';
  return '未测';
}

function formatBoolean(value: boolean | null): string {
  if (value === null) return '未知';
  return value ? '是' : '否';
}

function formatScope(scope: PromptMeasurementSeries['measurementScope']): string {
  return [scope.platformCode, scope.modelName, scope.market, scope.clientSurface, scope.collectionMethod, scope.language, String(scope.searchEnabled), scope.baselineVersion].join('|');
}

export function toAttributionInput(values: AttributionFormValues): MeasurementAttributionInput {
  return {
    baselineWindowStart: values.baselineWindowStart,
    baselineWindowEnd: values.baselineWindowEnd,
    observationWindowStart: values.observationWindowStart,
    observationWindowEnd: values.observationWindowEnd,
    controlQuestions: values.controlQuestionsText?.split('\n').map((item) => item.trim()).filter(Boolean) ?? [],
    externalEvents: parseExternalEvents(values.externalEventsText),
    conclusion: values.conclusion
  };
}

export function parseExternalEvents(value = ''): MeasurementExternalEvent[] {
  return value.split('\n').map((line) => {
    const [date = '', category = 'other', ...title] = line.split('|');
    const normalizedCategory = ['campaign', 'model_update', 'platform_rule', 'other'].includes(category) ? category as MeasurementExternalEvent['category'] : 'other';
    return { date: date.trim(), category: normalizedCategory, title: title.join('|').trim() };
  }).filter((event) => event.date && event.title);
}
