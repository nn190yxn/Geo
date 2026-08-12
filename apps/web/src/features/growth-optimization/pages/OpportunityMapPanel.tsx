import { Alert, Card, Col, Empty, List, Row, Space, Statistic, Tag, Typography } from 'antd';
import type { OpportunityChannelBasis, OpportunityDiagnosticType, OpportunityMap } from '@geo-platform/shared-types';
import { getPlatformDisplay } from '../../../utils/displayLabels';

const diagnosticLabels: Record<OpportunityDiagnosticType, string> = {
  brand_absent: '品牌缺席',
  competitor_dominant: '竞品占优',
  content_gap: '内容缺失',
  fact_inconsistent: '事实不一致'
};

const basisLabels: Record<OpportunityChannelBasis, { label: string; color: string }> = {
  brand_sample: { label: '当前品牌真实样本', color: 'green' },
  industry_sample: { label: '行业真实样本', color: 'blue' },
  industry_reference: { label: '公共行业参考', color: 'default' }
};

const priorityColors = { high: 'red', medium: 'gold', low: 'default' } as const;

export function OpportunityMapPanel({ map, loading = false }: { map?: OpportunityMap | null; loading?: boolean }) {
  if (loading) return <Card title="竞品主题与真实信源渠道地图" loading />;
  if (!map) {
    return (
      <Card title="竞品主题与真实信源渠道地图">
        <Empty description="机会地图暂时无法加载" />
      </Card>
    );
  }

  const status = getMeasurementStatusDisplay(map);
  return (
    <Card title="竞品主题与真实信源渠道地图">
      <Space direction="vertical" size={16} className="page-stack">
        <Alert
          type={status.type}
          showIcon
          message={status.title}
          description={status.description}
        />
        <Space size={24} wrap>
          <Statistic title="有效真实回复" value={map.sampleCount} />
          <Statistic title="竞品优势主题" value={map.competitorThemes.length} />
          <Statistic title="实际引用域名" value={map.citedDomains.length} />
          <Statistic title="内容机会" value={map.contentOpportunities.length} />
        </Space>

        <Row gutter={[16, 16]}>
          <Col xs={24} xl={12}>
            <Card size="small" title="竞品优势主题">
              <List
                dataSource={map.competitorThemes}
                locale={{ emptyText: '真实回复中暂未识别到竞品优势主题' }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space wrap><Typography.Text strong>{item.competitorName}</Typography.Text><Tag>{item.evidenceCount} 条证据</Tag></Space>}
                      description={(
                        <Space direction="vertical" size={4}>
                          <Typography.Text>{item.theme}</Typography.Text>
                          <Typography.Text type="secondary">{formatPlatformDistribution(item.platformDistribution)}</Typography.Text>
                          <Typography.Text type="secondary">示例问题：{item.questionExamples[0] ?? '待补充'}</Typography.Text>
                        </Space>
                      )}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card size="small" title="真实引用域名与位置">
              <List
                dataSource={map.citedDomains}
                locale={{ emptyText: '有效真实回复中暂未发现引用域名' }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space wrap><Typography.Text strong>{item.domain}</Typography.Text><Tag>{item.citationCount} 次引用</Tag>{item.contentAssetCovered ? <Tag color="green">已有内容覆盖</Tag> : null}</Space>}
                      description={(
                        <Space direction="vertical" size={4}>
                          <Typography.Text type="secondary">{formatPlatformDistribution(item.platformDistribution)}</Typography.Text>
                          <Typography.Text type="secondary">{item.positions[0]?.label ?? '引用位置待补充'}：{item.positions[0]?.question ?? '待补充问题'}{item.positions.length > 1 ? `，共 ${item.positions.length} 处` : ''}</Typography.Text>
                        </Space>
                      )}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card size="small" title="渠道建议与依据">
              <List
                dataSource={map.channelRecommendations}
                locale={{ emptyText: '积累真实引用样本后生成渠道建议' }}
                renderItem={(item) => {
                  const basis = basisLabels[item.basis];
                  return (
                    <List.Item>
                      <List.Item.Meta
                        title={<Space wrap><Typography.Text strong>{item.channel}</Typography.Text><Tag color={basis.color}>{basis.label}</Tag><Tag color={priorityColors[item.priority]}>{item.priority === 'high' ? '高优先级' : item.priority === 'medium' ? '中优先级' : '待验证'}</Tag></Space>}
                        description={<Typography.Text type="secondary">{item.rationale}</Typography.Text>}
                      />
                    </List.Item>
                  );
                }}
              />
            </Card>
          </Col>
          <Col xs={24} xl={12}>
            <Card size="small" title="内容机会优先级">
              <List
                dataSource={map.contentOpportunities}
                locale={{ emptyText: '当前真实样本中暂未发现优先内容机会' }}
                renderItem={(item) => (
                  <List.Item>
                    <List.Item.Meta
                      title={<Space wrap><Tag color={priorityColors[item.priority]}>{diagnosticLabels[item.type]}</Tag><Typography.Text strong>{item.title}</Typography.Text></Space>}
                      description={(
                        <Space direction="vertical" size={4}>
                          <Typography.Text>{item.question}</Typography.Text>
                          <Typography.Text type="secondary">{getPlatformDisplay(item.platformCode)}：{item.evidence[0] ?? '等待补充证据'}</Typography.Text>
                        </Space>
                      )}
                    />
                  </List.Item>
                )}
              />
            </Card>
          </Col>
        </Row>
      </Space>
    </Card>
  );
}

export function getMeasurementStatusDisplay(map: Pick<OpportunityMap, 'measurementStatus' | 'sampleCount'>) {
  if (map.measurementStatus === 'unmeasured') {
    return { type: 'info' as const, title: '尚未形成真实样本机会地图', description: '完成真实 AI 回复监测后，这里会生成竞品主题、引用域名和渠道依据。' };
  }
  if (map.measurementStatus === 'insufficient') {
    return { type: 'warning' as const, title: `当前仅有 ${map.sampleCount} 条有效真实回复`, description: '现有发现可用于确定下一步验证方向，渠道中的公共行业参考需通过更多真实样本确认。' };
  }
  return { type: 'success' as const, title: `已基于 ${map.sampleCount} 条有效真实回复生成机会地图`, description: '竞品主题、引用域名和渠道建议均可追溯到当前样本证据。' };
}

function formatPlatformDistribution(items: OpportunityMap['citedDomains'][number]['platformDistribution']): string {
  if (items.length === 0) return '平台分布待真实样本验证';
  return items.map((item) => `${getPlatformDisplay(item.platformCode)} ${item.sampleCount} 条`).join('、');
}
